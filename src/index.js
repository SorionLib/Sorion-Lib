const { Client, GatewayIntentBits, Collection } = require('discord.js');
const EventManager = require('./managers/EventManager');
const ContainerBuilder = require('./builders/ContainerBuilder');
const CommandManager = require('./managers/CommandManager');
const DatabaseManager = require('./managers/DatabaseManager');
const Logger = require('./utils/Logger');
class SorionLib {
    /**
     * @param {Object} options
     * @param {string} options.token 
     * @param {string[]} options.intents 
     * @param {Object} options.database
     * @param {boolean} options.debug 
     * @param {Object} options.eventManager 
     */
    constructor(options = {}) {
        this.options = this._validateOptions(options);
        this.client = this._createClient();
        
        // Manager initialisieren
        this.logger = new Logger({ debug: this.options.debug });
        this.eventManager = new EventManager(this, this.options.eventManager);
        this.commands = new CommandManager(this);
        this.database = new DatabaseManager(this, this.options.database);
        this.containers = new Collection();
        
        this._initialized = false;
        this._startupTime = Date.now();
        
        this.logger.info('SorionLib initialisiert');
    }
    
    /**
     * Optionen validieren
     * @private
     */
    _validateOptions(options) {
        const defaultOptions = {
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers
            ],
            debug: false,
            eventManager: {
                metrics: true,
                autoCleanup: true,
                maxEvents: 500
            },
            database: {
                enabled: false,
                type: 'json' // json, mongodb, mysql
            }
        };
        
        const merged = { ...defaultOptions, ...options };
        
        if (!merged.token) {
            throw new Error('Discord Bot Token ist erforderlich');
        }
        
        return merged;
    }
    
    /**
     * Discord Client erstellen
     * @private
     */
    _createClient() {
        return new Client({
            intents: this.options.intents,
            presence: this.options.presence
        });
    }
    
    /**
     * Library initialisieren und starten
     */
    async initialize() {
        if (this._initialized) {
            throw new Error('SorionLib wurde bereits initialisiert');
        }
        
        try {
            this.logger.info('Starte SorionLib Initialisierung...');
            
            // Datenbank verbinden
            if (this.options.database.enabled) {
                await this.database.connect();
            }
            
            // Commands laden
            await this.commands.loadCommands();
            
            // Event Manager mit Discord verbinden
            this.eventManager.initializeDiscordEvents();
            
            // Standard Events registrieren
            this._registerCoreEvents();
            
            // Bot einloggen
            await this.client.login(this.options.token);
            
            this._initialized = true;
            this.logger.success(`SorionLib erfolgreich gestartet in ${Date.now() - this._startupTime}ms`);
            
        } catch (error) {
            this.logger.error('Fehler bei der Initialisierung:', error);
            throw error;
        }
    }
    
    /**
     * Core Events registrieren
     * @private
     */
    _registerCoreEvents() {
        // Ready Event
        this.eventManager.registerEvent('ready', (client) => {
            this.logger.success(`Bot eingeloggt als ${client.user.tag}`);
            this.logger.info(`Aktiv auf ${client.guilds.cache.size} Servern`);
            
            // Bot Status setzen
            client.user.setPresence({
                activities: [{ 
                    name: `${client.guilds.cache.size} Servern | /help`, 
                    type: 3 
                }],
                status: 'online'
            });
        }, { category: 'core' });
        
        // Interaction Handling
        this.eventManager.registerEvent('interactionCreate', async (interaction) => {
            if (!interaction.isChatInputCommand()) return;
            
            try {
                await this.commands.execute(interaction);
            } catch (error) {
                this.logger.error('Fehler bei Command Ausführung:', error);
                
                const errorMessage = {
                    content: '❌ Ein Fehler ist beim Ausführen des Befehls aufgetreten!',
                    ephemeral: true
                };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }, { category: 'core', timeout: 30000 });
        
        // Message Event mit Container Support
        this.eventManager.registerEvent('messageCreate', async (message) => {
            if (message.author.bot) return;
            
            // Container Response Handling
            if (message.content.startsWith('!container')) {
                await this._handleContainerCommand(message);
            }
            
            // Custom Message Handling
            this.emit('message', message);
        }, { category: 'core' });
        
        // Error Handling
        this.eventManager.registerEvent('error', (error) => {
            this.logger.error('Discord Client Error:', error);
        }, { category: 'core' });
        
        // Debug Events
        if (this.options.debug) {
            this.eventManager.registerEvent('debug', (info) => {
                this.logger.debug(info);
            }, { category: 'debug' });
        }
    }
    
    /**
     * Container Command Handler
     * @private
     */
    async _handleContainerCommand(message) {
        const args = message.content.split(' ').slice(1);
        const command = args[0];
        
        switch (command) {
            case 'demo':
                await this._sendDemoContainer(message);
                break;
            case 'buttons':
                await this._sendButtonDemo(message);
                break;
            case 'select':
                await this._sendSelectDemo(message);
                break;
            default:
                await message.reply('Verfügbare Container Demos: `demo`, `buttons`, `select`');
        }
    }
    
    /**
     * Demo Container erstellen
     * @private
     */
    async _sendDemoContainer(message) {
        const container = ContainerBuilder.create()
            .setAccentColor('#5865F2')
            .addFormattedText('**🎉 Willkommen bei SorionLib!**', { bold: true })
            .addTextDisplay('Dies ist ein Demo-Container mit allen Features der Library.')
            .addSeparator()
            .addQuickSection('Schnellaktionen', [
                {
                    id: 'btn_info',
                    label: 'ℹ️ Informationen',
                    style: 1 // Primary
                },
                {
                    id: 'btn_settings',
                    label: '⚙️ Einstellungen', 
                    style: 2 // Secondary
                },
                {
                    url: 'https://github.com/SorionLib/Sorion-Lib',
                    label: '🌐 GitHub',
                    style: 5 // Link
                }
            ])
            .addSeparator()
            .addStringSelect({
                customId: 'demo_select',
                placeholder: 'Wähle eine Option...',
                minValues: 1,
                maxValues: 2,
                options: [
                    { label: 'Feature 1', value: 'feature1', description: 'Erstes Feature' },
                    { label: 'Feature 2', value: 'feature2', description: 'Zweites Feature' },
                    { label: 'Feature 3', value: 'feature3', description: 'Drittes Feature' }
                ]
            })
            .build();
        
        await message.reply({ 
            content: '**Demo Container:**',
            components: [container] 
        });
    }
    
    /**
     * Button Demo Container
     * @private
     */
    async _sendButtonDemo(message) {
        const container = ContainerBuilder.createButtonGrid([
            [
                { id: 'btn_success', label: '✅ Success', style: 3 },
                { id: 'btn_danger', label: '❌ Danger', style: 4 }
            ],
            [
                { id: 'btn_primary', label: '🔵 Primary', style: 1 },
                { id: 'btn_secondary', label: '⚪ Secondary', style: 2 }
            ]
        ], { separateRows: true });
        
        await message.reply({
            content: '**Button Grid Demo:**',
            components: [container.build()]
        });
    }
    
    /**
     * Select Menu Demo
     * @private
     */
    async _sendSelectDemo(message) {
        const container = ContainerBuilder.createForm([
            {
                type: 'text',
                content: '**Benutzerauswahl:**'
            },
            {
                type: 'select',
                config: {
                    customId: 'user_select',
                    placeholder: 'Wähle Benutzer...',
                    minValues: 1,
                    maxValues: 5
                }
            },
            {
                type: 'text', 
                content: '**Rollenauswahl:**',
                separator: true
            },
            {
                type: 'select',
                config: {
                    customId: 'role_select',
                    placeholder: 'Wähle Rollen...',
                    minValues: 0,
                    maxValues: 10
                }
            }
        ]);
        
        await message.reply({
            content: '**Select Menu Demo:**',
            components: [container.build()]
        });
    }
    
    // ==================== PUBLIC API ====================
    
    /**
     * Container erstellen
     * @param {string} name - Container Name
     * @param {Function} builderFn - Builder Funktion
     */
    createContainer(name, builderFn) {
        if (typeof builderFn !== 'function') {
            throw new Error('Builder muss eine Funktion sein');
        }
        
        const container = builderFn(ContainerBuilder);
        this.containers.set(name, container);
        return container;
    }
    
    /**
     * Vordefinierten Container abrufen
     * @param {string} name - Container Name
     */
    getContainer(name) {
        return this.containers.get(name);
    }
    
    /**
     * Event registrieren
     * @param {string} eventName - Event Name
     * @param {Function} handler - Event Handler
     * @param {Object} options - Event Optionen
     */
    registerEvent(eventName, handler, options = {}) {
        return this.eventManager.registerEvent(eventName, handler, options);
    }
    
    /**
     * Command registrieren
     * @param {Object} command - Command Objekt
     */
    registerCommand(command) {
        return this.commands.register(command);
    }
    
    /**
     * Command ausführen
     * @param {string} name - Command Name
     * @param {Object} context - Ausführungskontext
     */
    async executeCommand(name, context) {
        return await this.commands.executeCommand(name, context);
    }
    
    /**
     * Event Metrics abrufen
     */
    getEventMetrics() {
        return this.eventManager.getMetrics();
    }
    
    /**
     * Library Statistiken
     */
    getStats() {
        return {
            uptime: Date.now() - this._startupTime,
            events: this.eventManager.getEventCount(),
            commands: this.commands.getCommandCount(),
            containers: this.containers.size,
            guilds: this.client.guilds?.cache.size || 0,
            users: this.client.users?.cache.size || 0
        };
    }
    
    /**
     * Library sicher herunterfahren
     */
    async destroy() {
        this.logger.info('SorionLib wird heruntergefahren...');
        
        try {
            // Event Manager cleanup
            this.eventManager.destroy();
            
            // Datenbankverbindung schließen
            if (this.database.isConnected()) {
                await this.database.disconnect();
            }
            
            // Discord Client ausloggen
            if (this.client.isReady()) {
                this.client.destroy();
            }
            
            this.logger.success('SorionLib erfolgreich heruntergefahren');
        } catch (error) {
            this.logger.error('Fehler beim Herunterfahren:', error);
            throw error;
        }
    }
    
    /**
     * Utility Methoden für einfachen Zugriff
     */
    static get Builders() {
        return {
            Container: ContainerBuilder
        };
    }
    
    static get Constants() {
        return {
            ButtonStyles: {
                Primary: 1,
                Secondary: 2, 
                Success: 3,
                Danger: 4,
                Link: 5
            }
        };
    }
}

// Utility Funktionen exportieren
function createBot(options) {
    return new SorionLib(options);
}

function createContainer(builderFn) {
    return ContainerBuilder.fromTemplate(builderFn);
}

// Haupt Export
module.exports = {
    SorionLib,
    createBot,
    createContainer,
    Builders: SorionLib.Builders,
    Constants: SorionLib.Constants
};