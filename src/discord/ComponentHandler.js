class ComponentHandler {
    constructor(bot) {
        this.bot = bot;
        this.buttons = new Map();
        this.selectMenus = new Map();
        this.modals = new Map();
    }
    
    // Button registrieren
    button(customId, callback) {
        this.buttons.set(customId, callback);
        return this;
    }
    
    // Select Menu registrieren
    selectMenu(customId, callback) {
        this.selectMenus.set(customId, callback);
        return this;
    }
    
    // Modal registrieren
    modal(customId, callback) {
        this.modals.set(customId, callback);
        return this;
    }
    
    // Component interactions handeln
    handleInteraction(interaction) {
        if (interaction.isButton()) {
            const handler = this.buttons.get(interaction.customId);
            if (handler) handler(interaction);
        } 
        else if (interaction.isStringSelectMenu()) {
            const handler = this.selectMenus.get(interaction.customId);
            if (handler) handler(interaction);
        }
        else if (interaction.isModalSubmit()) {
            const handler = this.modals.get(interaction.customId);
            if (handler) handler(interaction);
        }
    }
}

module.exports = ComponentHandler;