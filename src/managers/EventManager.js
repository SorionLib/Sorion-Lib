const EventEmitter = require('events');
const { performance } = require('perf_hooks');

/**
 * @typedef {Object} EventOptions
 * @property {boolean} [once=false] - Whether the event should only be executed once
 * @property {boolean} [overwrite=false] - Whether to overwrite existing event
 * @property {boolean} [throwOnError=false] - Whether to throw errors
 * @property {number} [timeout=0] - Execution timeout in ms
 * @property {number} [priority=0] - Execution priority (higher = earlier)
 * @property {string} [category='default'] - Event category for organization
 * @property {boolean} [enabled=true] - Whether the event is enabled
 * @property {Function} [beforeExecute] - Hook before execution
 * @property {Function} [afterExecute] - Hook after execution
 */

/**
 * @typedef {Object} EventMetrics
 * @property {number} totalExecutions - Total number of executions
 * @property {number} totalErrors - Total number of errors
 * @property {number} averageExecutionTime - Average execution time in ms
 * @property {number} lastExecutionTime - Last execution time in ms
 * @property {Date} lastExecuted - Timestamp of last execution
 */

class EventManager extends EventEmitter {
    constructor(bot, options = {}) {
        super();
        this.bot = bot;
        this.options = {
            maxEvents: options.maxEvents || 1000,
            autoCleanup: options.autoCleanup !== false,
            metrics: options.metrics !== false,
            debug: options.debug || false,
            defaultTimeout: options.defaultTimeout || 30000,
            ...options
        };
        
        this.customEvents = new Map();
        this.discordEvents = new Map();
        this.eventMetrics = new Map();
        this.middlewares = new Map();
        this.eventCategories = new Map();
        this.executionQueue = new Map();
        
        this._stats = {
            totalEventsRegistered: 0,
            totalEventsExecuted: 0,
            totalErrors: 0,
            startupTime: Date.now()
        };
        
        this._setupInternalHandlers();
        this._startCleanupInterval();
    }
    
    // ==================== INTERNAL METHODS ====================
    
    _setupInternalHandlers() {
        this.on('error', (error, eventName) => {
            this._stats.totalErrors++;
            console.error(`[EventManager] Error in event '${eventName}':`, error);
        });
        
        this.on('debug', (message, data) => {
            if (this.options.debug) {
                console.log(`[EventManager] ${message}`, data || '');
            }
        });
        
        process.on('beforeExit', () => this.destroy());
    }
    
    _startCleanupInterval() {
        if (this.options.autoCleanup) {
            this.cleanupInterval = setInterval(() => {
                this._cleanupOldMetrics();
            }, 300000); // 5 minutes
        }
    }
    
    _cleanupOldMetrics() {
        const now = Date.now();
        for (const [eventName, metrics] of this.eventMetrics) {
            if (now - metrics.lastExecuted > 86400000) { // 24 hours
                this.eventMetrics.delete(eventName);
            }
        }
    }
    
    _updateMetrics(eventName, executionTime, success = true) {
        if (!this.options.metrics) return;
        
        let metrics = this.eventMetrics.get(eventName) || {
            totalExecutions: 0,
            totalErrors: 0,
            totalExecutionTime: 0,
            lastExecutionTime: 0,
            lastExecuted: new Date(),
            executions: []
        };
        
        metrics.totalExecutions++;
        metrics.totalExecutionTime += executionTime;
        metrics.averageExecutionTime = metrics.totalExecutionTime / metrics.totalExecutions;
        metrics.lastExecutionTime = executionTime;
        metrics.lastExecuted = new Date();
        
        if (!success) metrics.totalErrors++;
        
        // Keep only last 100 executions for rolling average
        metrics.executions.push({ time: executionTime, timestamp: Date.now() });
        if (metrics.executions.length > 100) {
            metrics.executions.shift();
        }
        
        this.eventMetrics.set(eventName, metrics);
        this._stats.totalEventsExecuted++;
    }
    
    _validateEventName(eventName) {
        if (typeof eventName !== 'string' || !eventName.trim()) {
            throw new Error('Event name must be a non-empty string');
        }
        if (eventName.length > 100) {
            throw new Error('Event name too long (max 100 chars)');
        }
        if (this.customEvents.size >= this.options.maxEvents) {
            throw new Error(`Maximum event limit reached: ${this.options.maxEvents}`);
        }
    }
    
    _validateHandler(handler) {
        if (typeof handler !== 'function') {
            throw new Error('Event handler must be a function');
        }
        if (handler.constructor.name === 'AsyncFunction' && handler.length > 4) {
            console.warn('[EventManager] Async handler with many parameters may indicate issues');
        }
    }
    
    _isDiscordEvent(eventName) {
        const discordEvents = new Set([
            'ready', 'messageCreate', 'interactionCreate', 'guildCreate',
            'guildDelete', 'channelCreate', 'channelDelete', 'roleCreate',
            'roleDelete', 'messageDelete', 'messageUpdate', 'guildMemberAdd',
            'guildMemberRemove', 'guildMemberUpdate', 'voiceStateUpdate',
            'presenceUpdate', 'typingStart', 'webhookUpdate', 'emojiCreate',
            'emojiDelete', 'stickerCreate', 'stickerDelete', 'threadCreate',
            'threadDelete', 'threadUpdate', 'stageInstanceCreate', 'stageInstanceDelete'
        ]);
        return discordEvents.has(eventName);
    }
    
    _wrapHandler(eventName, handler, options) {
        const wrappedHandler = async (...args) => {
            if (!options.enabled) return;
            
            const startTime = performance.now();
            let success = true;
            
            try {
                // Execute before hook
                if (options.beforeExecute) {
                    await options.beforeExecute(...args);
                }
                
                // Execute middlewares
                for (const middleware of this.middlewares.values()) {
                    await middleware.before(eventName, args);
                }
                
                // Set timeout if specified
                if (options.timeout > 0) {
                    await Promise.race([
                        handler(...args),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error(`Event timeout after ${options.timeout}ms`)), options.timeout)
                        )
                    ]);
                } else {
                    await handler(...args);
                }
                
                // Execute after hook
                if (options.afterExecute) {
                    await options.afterExecute(...args);
                }
                
                // Execute middlewares after
                for (const middleware of this.middlewares.values()) {
                    await middleware.after(eventName, args);
                }
                
            } catch (error) {
                success = false;
                this.emit('error', error, eventName);
                if (options.throwOnError) throw error;
            } finally {
                const executionTime = performance.now() - startTime;
                this._updateMetrics(eventName, executionTime, success);
                this.emit('eventExecuted', eventName, executionTime, success, args);
            }
        };
        
        return wrappedHandler;
    }
    
    _addToCategory(eventName, category) {
        if (!this.eventCategories.has(category)) {
            this.eventCategories.set(category, new Set());
        }
        this.eventCategories.get(category).add(eventName);
    }
    
    _removeFromCategory(eventName) {
        for (const [category, events] of this.eventCategories) {
            events.delete(eventName);
            if (events.size === 0) {
                this.eventCategories.delete(category);
            }
        }
    }
    
    // ==================== PUBLIC METHODS ====================
    
    /**
     * Register a new event handler
     * @param {string} eventName - Name of the event
     * @param {Function} handler - Event handler function
     * @param {EventOptions} options - Event options
     * @returns {EventManager}
     */
    registerEvent(eventName, handler, options = {}) {
        this._validateEventName(eventName);
        this._validateHandler(handler);
        
        const mergedOptions = {
            once: false,
            overwrite: false,
            throwOnError: false,
            timeout: this.options.defaultTimeout,
            priority: 0,
            category: 'default',
            enabled: true,
            ...options
        };
        
        if (this.customEvents.has(eventName) && !mergedOptions.overwrite) {
            throw new Error(`Event '${eventName}' already registered. Use overwrite: true to replace.`);
        }
        
        // Remove existing event if overwriting
        if (this.customEvents.has(eventName)) {
            this.removeEvent(eventName);
        }
        
        const wrappedHandler = this._wrapHandler(eventName, handler, mergedOptions);
        
        this.customEvents.set(eventName, {
            original: handler,
            wrapped: wrappedHandler,
            options: mergedOptions
        });
        
        this._addToCategory(eventName, mergedOptions.category);
        
        // Register with Discord.js if applicable
        if (this.bot.client && this._isDiscordEvent(eventName)) {
            if (mergedOptions.once) {
                this.bot.client.once(eventName, wrappedHandler);
            } else {
                this.bot.client.on(eventName, wrappedHandler);
            }
            this.discordEvents.set(eventName, wrappedHandler);
        }
        
        this._stats.totalEventsRegistered++;
        this.emit('eventRegistered', eventName, mergedOptions);
        this.emit('debug', `Event registered: ${eventName}`, mergedOptions);
        
        return this;
    }
    
    /**
     * Register multiple events at once
     * @param {Object} events - Object with event names as keys and handlers as values
     * @param {EventOptions} defaultOptions - Default options for all events
     * @returns {EventManager}
     */
    registerEvents(events, defaultOptions = {}) {
        for (const [eventName, handler] of Object.entries(events)) {
            const options = typeof handler === 'function' ? defaultOptions : { ...defaultOptions, ...handler.options };
            const actualHandler = typeof handler === 'function' ? handler : handler.handler;
            
            this.registerEvent(eventName, actualHandler, options);
        }
        return this;
    }
    
    /**
     * Remove an event handler
     * @param {string} eventName - Name of the event to remove
     * @returns {boolean} Success status
     */
    removeEvent(eventName) {
        const eventData = this.customEvents.get(eventName);
        
        if (!eventData) return false;
        
        // Remove from Discord.js
        if (this.bot.client && this.discordEvents.has(eventName)) {
            this.bot.client.off(eventName, eventData.wrapped);
            this.discordEvents.delete(eventName);
        }
        
        this.customEvents.delete(eventName);
        this._removeFromCategory(eventName);
        this.eventMetrics.delete(eventName);
        
        this.emit('eventRemoved', eventName);
        this.emit('debug', `Event removed: ${eventName}`);
        
        return true;
    }
    
    /**
     * Remove all events
     * @param {string} category - Optional category to filter by
     * @returns {EventManager}
     */
    removeAllEvents(category = null) {
        const eventsToRemove = category 
            ? Array.from(this.eventCategories.get(category) || [])
            : Array.from(this.customEvents.keys());
            
        for (const eventName of eventsToRemove) {
            this.removeEvent(eventName);
        }
        
        this.emit('debug', `All events removed${category ? ` from category: ${category}` : ''}`);
        return this;
    }
    
    /**
     * Add middleware for event processing
     * @param {string} name - Middleware name
     * @param {Object} middleware - Middleware object with before/after methods
     * @returns {EventManager}
     */
    addMiddleware(name, middleware) {
        this.middlewares.set(name, middleware);
        return this;
    }
    
    /**
     * Remove middleware
     * @param {string} name - Middleware name
     * @returns {boolean} Success status
     */
    removeMiddleware(name) {
        return this.middlewares.delete(name);
    }
    
    /**
     * Enable/disable an event
     * @param {string} eventName - Event name
     * @param {boolean} enabled - Enable state
     * @returns {boolean} Success status
     */
    setEventEnabled(eventName, enabled = true) {
        const eventData = this.customEvents.get(eventName);
        if (!eventData) return false;
        
        eventData.options.enabled = enabled;
        this.emit('debug', `Event ${eventName} ${enabled ? 'enabled' : 'disabled'}`);
        return true;
    }
    
    /**
     * Execute an event manually
     * @param {string} eventName - Event name
     * @param {...any} args - Arguments to pass to handler
     * @returns {Promise<any>} Handler result
     */
    async emitEvent(eventName, ...args) {
        const eventData = this.customEvents.get(eventName);
        if (!eventData || !eventData.options.enabled) {
            throw new Error(`Event '${eventName}' not found or disabled`);
        }
        
        return await eventData.wrapped(...args);
    }
    
    /**
     * Get event metrics
     * @param {string} eventName - Specific event name or all if undefined
     * @returns {EventMetrics|Object}
     */
    getMetrics(eventName = null) {
        if (eventName) {
            return this.eventMetrics.get(eventName) || null;
        }
        return {
            events: Object.fromEntries(this.eventMetrics),
            stats: this._stats,
            uptime: Date.now() - this._stats.startupTime
        };
    }
    
    /**
     * Get all events in a category
     * @param {string} category - Category name
     * @returns {string[]} Event names
     */
    getEventsByCategory(category) {
        return Array.from(this.eventCategories.get(category) || []);
    }
    
    /**
     * Get all categories
     * @returns {string[]} Category names
     */
    getCategories() {
        return Array.from(this.eventCategories.keys());
    }
    
    /**
     * Initialize Discord events (call when client is ready)
     * @returns {EventManager}
     */
    initializeDiscordEvents() {
        if (!this.bot.client) {
            throw new Error('Bot client not available');
        }
        
        for (const [eventName, eventData] of this.customEvents) {
            if (this._isDiscordEvent(eventName) && !this.discordEvents.has(eventName)) {
                if (eventData.options.once) {
                    this.bot.client.once(eventName, eventData.wrapped);
                } else {
                    this.bot.client.on(eventName, eventData.wrapped);
                }
                this.discordEvents.set(eventName, eventData.wrapped);
            }
        }
        
        this.emit('discordEventsInitialized');
        return this;
    }
    
    /**
     * Cleanup and destroy the event manager
     */
    destroy() {
        this.removeAllEvents();
        this.middlewares.clear();
        this.eventMetrics.clear();
        this.eventCategories.clear();
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        this.removeAllListeners();
        this.emit('destroyed');
    }
}

module.exports = EventManager;