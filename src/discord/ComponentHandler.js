class ComponentHandler {
    constructor(bot) {
        this.bot = bot;
        this.buttons = new Map();
        this.selectMenus = new Map();
        this.modals = new Map();
    }
    
    button(customId, callback) {
        this.buttons.set(customId, callback);
        return this;
    }
    
    selectMenu(customId, callback) {
        this.selectMenus.set(customId, callback);
        return this;
    }
    
    modal(customId, callback) {
        this.modals.set(customId, callback);
        return this;
    }
    
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
        else if (interaction.isUserSelectMenu()) {
            const handler = this.selectMenus.get(interaction.customId);
            if (handler) handler(interaction);
        }
        else if (interaction.isRoleSelectMenu()) {
            const handler = this.selectMenus.get(interaction.customId);
            if (handler) handler(interaction);
        }
        else if (interaction.isChannelSelectMenu()) {
            const handler = this.selectMenus.get(interaction.customId);
            if (handler) handler(interaction);
        }
    }
}

module.exports = ComponentHandler;