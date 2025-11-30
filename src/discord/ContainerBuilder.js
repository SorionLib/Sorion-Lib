const { 
    ContainerBuilder: DiscordContainerBuilder, 
    TextDisplayBuilder, 
    ActionRowBuilder, 
    SeparatorBuilder, 
    SectionBuilder, 
    ButtonBuilder,
    UserSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    StringSelectMenuBuilder,
    MentionableSelectMenuBuilder
} = require('discord.js');

class ContainerBuilder {
    constructor() {
        this.container = new DiscordContainerBuilder();
    }
    
    setAccentColor(color) {
        this.container.setAccentColor(color);
        return this;
    }
    
    // Text Display Component
    addTextDisplay(content, callback = null) {
        this.container.addTextDisplayComponents((textDisplay) => {
            if (typeof content === 'string') {
                textDisplay.setContent(content);
            }
            if (callback && typeof callback === 'function') {
                callback(textDisplay);
            }
        });
        return this;
    }
    
    // Multiple Text Displays
    addTextDisplays(...contents) {
        contents.forEach(content => {
            this.addTextDisplay(content);
        });
        return this;
    }
    
    // Action Row mit Components
    addActionRow(callback) {
        this.container.addActionRowComponents((actionRow) => {
            if (callback && typeof callback === 'function') {
                callback(actionRow);
            }
        });
        return this;
    }
    
    // Separator
    addSeparator() {
        this.container.addSeparatorComponents((separator) => separator);
        return this;
    }
    
    // Section mit Text und Accessories
    addSection(callback) {
        this.container.addSectionComponents((section) => {
            if (callback && typeof callback === 'function') {
                callback(section);
            }
        });
        return this;
    }
    
    // Quick Section mit Text und Buttons
    addQuickSection(textContent, buttons = []) {
        this.container.addSectionComponents((section) => {
            section.addTextDisplayComponents((textDisplay) => {
                textDisplay.setContent(textContent);
            });
            
            buttons.forEach(buttonConfig => {
                section.setButtonAccessory((button) => {
                    button.setCustomId(buttonConfig.id)
                         .setLabel(buttonConfig.label)
                         .setStyle(buttonConfig.style);
                    
                    if (buttonConfig.emoji) button.setEmoji(buttonConfig.emoji);
                    if (buttonConfig.disabled) button.setDisabled(buttonConfig.disabled);
                });
            });
        });
        return this;
    }
    
    // Build-Methode
    build() {
        return this.container;
    }
    
    // Utility Methods
    static create() {
        return new ContainerBuilder();
    }
}

module.exports = ContainerBuilder;