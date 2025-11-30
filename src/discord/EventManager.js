const EventEmitter = require('events');

class EventManager extends EventEmitter {
    constructor(bot) {
        super();
        this.bot = bot;
        this.customEvents = new Map();
    }
    
    // Register custom event handlers
    registerEvent(eventName, handler) {
        this.customEvents.set(eventName, handler);
        
        if (this.bot.client) {
            this.bot.client.on(eventName, handler);
        }
    }
    
    // Remove event handler
    removeEvent(eventName) {
        const handler = this.customEvents.get(eventName);
        if (handler && this.bot.client) {
            this.bot.client.off(eventName, handler);
            this.customEvents.delete(eventName);
        }
    }
}

// WICHTIG: Korrekter Export - nur die Klasse exportieren
module.exports = EventManager;