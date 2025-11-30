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
    MentionableSelectMenuBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');

/**
 * @typedef {Object} ButtonConfig
 * @property {string} id - Button custom ID
 * @property {string} label - Button label
 * @property {ButtonStyle} style - Button style
 * @property {string} [emoji] - Button emoji
 * @property {boolean} [disabled] - Whether button is disabled
 * @property {string} [url] - URL for link buttons
 */

/**
 * @typedef {Object} SelectMenuConfig
 * @property {string} customId - Select menu custom ID
 * @property {string} placeholder - Placeholder text
 * @property {number} [minValues] - Minimum selected values
 * @property {number} [maxValues] - Maximum selected values
 * @property {boolean} [disabled] - Whether menu is disabled
 * @property {Array} [options] - Options for string select
 */

/**
 * @typedef {Object} ContainerOptions
 * @property {string} [accentColor] - Container accent color
 * @property {boolean} [autoSeparate] - Auto-add separators between sections
 * @property {number} [maxComponents] - Maximum components limit
 * @property {string} [defaultStyle] - Default button style
 */

class ContainerBuilder {
    /**
     * @param {ContainerOptions} options - Container options
     */
    constructor(options = {}) {
        this.container = new DiscordContainerBuilder();
        this.options = {
            autoSeparate: true,
            maxComponents: 50,
            defaultStyle: ButtonStyle.Primary,
            ...options
        };
        
        this.componentCount = 0;
        this.lastComponentType = null;
        this.sections = [];
        
        if (options.accentColor) {
            this.setAccentColor(options.accentColor);
        }
    }
    
    // ==================== CORE CONFIGURATION ====================
    
    /**
     * Set container accent color
     * @param {string|number} color - Color value
     * @returns {ContainerBuilder}
     */
    setAccentColor(color) {
        this.container.setAccentColor(color);
        return this;
    }
    
    /**
     * Set container title (if supported)
     * @param {string} title - Container title
     * @returns {ContainerBuilder}
     */
    setTitle(title) {
        if (this.container.setTitle) {
            this.container.setTitle(title);
        }
        return this;
    }
    
    // ==================== TEXT COMPONENTS ====================
    
    /**
     * Add text display component
     * @param {string|Function} content - Text content or builder callback
     * @param {Function} [callback] - Additional builder callback
     * @returns {ContainerBuilder}
     */
    addTextDisplay(content, callback = null) {
        this._checkComponentLimit();
        
        this.container.addTextDisplayComponents((textDisplay) => {
            if (typeof content === 'string') {
                textDisplay.setContent(content);
            } else if (typeof content === 'function') {
                content(textDisplay);
            }
            
            if (typeof callback === 'function') {
                callback(textDisplay);
            }
            
            this._updateComponentState('text');
        });
        
        return this;
    }
    
    /**
     * Add multiple text displays
     * @param {...string} contents - Text contents
     * @returns {ContainerBuilder}
     */
    addTextDisplays(...contents) {
        contents.forEach(content => {
            this.addTextDisplay(content);
        });
        return this;
    }
    
    /**
     * Add formatted text with markdown support
     * @param {string} content - Text content
     * @param {Object} [options] - Formatting options
     * @returns {ContainerBuilder}
     */
    addFormattedText(content, options = {}) {
        return this.addTextDisplay((textDisplay) => {
            let formattedContent = content;
            
            if (options.bold) formattedContent = `**${formattedContent}**`;
            if (options.italic) formattedContent = `*${formattedContent}*`;
            if (options.underline) formattedContent = `__${formattedContent}__`;
            if (options.code) formattedContent = `\`${formattedContent}\``;
            if (options.block) formattedContent = `\`\`\`${formattedContent}\`\`\``;
            
            textDisplay.setContent(formattedContent);
        });
    }
    
    // ==================== ACTION ROWS ====================
    
    /**
     * Add action row with components
     * @param {Function} callback - Action row builder callback
     * @returns {ContainerBuilder}
     */
    addActionRow(callback) {
        this._checkComponentLimit();
        
        this.container.addActionRowComponents((actionRow) => {
            if (typeof callback === 'function') {
                callback(actionRow);
            }
            this._updateComponentState('actionRow');
        });
        
        return this;
    }
    
    /**
     * Add buttons in an action row
     * @param {...ButtonConfig} buttons - Button configurations
     * @returns {ContainerBuilder}
     */
    addButtons(...buttons) {
        return this.addActionRow((actionRow) => {
            buttons.forEach(buttonConfig => {
                if (buttonConfig.url) {
                    actionRow.addLinkButtonComponents((button) => {
                        button.setLabel(buttonConfig.label)
                              .setUrl(buttonConfig.url);
                        
                        if (buttonConfig.emoji) button.setEmoji(buttonConfig.emoji);
                        if (buttonConfig.disabled) button.setDisabled(buttonConfig.disabled);
                    });
                } else {
                    actionRow.addButtonComponents((button) => {
                        button.setCustomId(buttonConfig.id)
                              .setLabel(buttonConfig.label)
                              .setStyle(buttonConfig.style || this.options.defaultStyle);
                        
                        if (buttonConfig.emoji) button.setEmoji(buttonConfig.emoji);
                        if (buttonConfig.disabled) button.setDisabled(buttonConfig.disabled);
                    });
                }
                this.componentCount++;
            });
        });
    }
    
    // ==================== SELECT MENUS ====================
    
    /**
     * Add string select menu
     * @param {SelectMenuConfig} config - Select menu configuration
     * @param {Function} [callback] - Additional builder callback
     * @returns {ContainerBuilder}
     */
    addStringSelect(config, callback = null) {
        return this.addActionRow((actionRow) => {
            actionRow.addStringSelectMenuComponents((selectMenu) => {
                selectMenu.setCustomId(config.customId)
                         .setPlaceholder(config.placeholder);
                
                if (config.minValues !== undefined) selectMenu.setMinValues(config.minValues);
                if (config.maxValues !== undefined) selectMenu.setMaxValues(config.maxValues);
                if (config.disabled) selectMenu.setDisabled(config.disabled);
                
                if (config.options && Array.isArray(config.options)) {
                    config.options.forEach(option => {
                        selectMenu.addOptions((opt) => {
                            opt.setLabel(option.label)
                               .setValue(option.value);
                            
                            if (option.description) opt.setDescription(option.description);
                            if (option.emoji) opt.setEmoji(option.emoji);
                            if (option.default) opt.setDefault(option.default);
                        });
                    });
                }
                
                if (typeof callback === 'function') {
                    callback(selectMenu);
                }
                
                this.componentCount++;
            });
        });
    }
    
    /**
     * Add user select menu
     * @param {SelectMenuConfig} config - Select menu configuration
     * @returns {ContainerBuilder}
     */
    addUserSelect(config) {
        return this._addSelectMenu(UserSelectMenuBuilder, config);
    }
    
    /**
     * Add role select menu
     * @param {SelectMenuConfig} config - Select menu configuration
     * @returns {ContainerBuilder}
     */
    addRoleSelect(config) {
        return this._addSelectMenu(RoleSelectMenuBuilder, config);
    }
    
    /**
     * Add channel select menu
     * @param {SelectMenuConfig} config - Select menu configuration
     * @returns {ContainerBuilder}
     */
    addChannelSelect(config) {
        return this._addSelectMenu(ChannelSelectMenuBuilder, config);
    }
    
    /**
     * Add mentionable select menu
     * @param {SelectMenuConfig} config - Select menu configuration
     * @returns {ContainerBuilder}
     */
    addMentionableSelect(config) {
        return this._addSelectMenu(MentionableSelectMenuBuilder, config);
    }
    
    // ==================== SECTIONS ====================
    
    /**
     * Add section component
     * @param {Function} callback - Section builder callback
     * @returns {ContainerBuilder}
     */
    addSection(callback) {
        this._checkComponentLimit();
        
        if (this.options.autoSeparate && this.lastComponentType === 'section') {
            this.addSeparator();
        }
        
        this.container.addSectionComponents((section) => {
            if (typeof callback === 'function') {
                callback(section);
            }
            this.sections.push(section);
            this._updateComponentState('section');
        });
        
        return this;
    }
    
    /**
     * Add quick section with text and buttons
     * @param {string} textContent - Section text content
     * @param {ButtonConfig[]} buttons - Button configurations
     * @param {Object} [options] - Section options
     * @returns {ContainerBuilder}
     */
    addQuickSection(textContent, buttons = [], options = {}) {
        return this.addSection((section) => {
            // Add text
            section.addTextDisplayComponents((textDisplay) => {
                textDisplay.setContent(textContent);
                
                if (options.textCallback && typeof options.textCallback === 'function') {
                    options.textCallback(textDisplay);
                }
            });
            
            // Add buttons if provided
            if (buttons.length > 0) {
                buttons.forEach(buttonConfig => {
                    section.setButtonAccessory((button) => {
                        if (buttonConfig.url) {
                            button.setLabel(buttonConfig.label)
                                  .setUrl(buttonConfig.url);
                        } else {
                            button.setCustomId(buttonConfig.id)
                                  .setLabel(buttonConfig.label)
                                  .setStyle(buttonConfig.style || this.options.defaultStyle);
                        }
                        
                        if (buttonConfig.emoji) button.setEmoji(buttonConfig.emoji);
                        if (buttonConfig.disabled) button.setDisabled(buttonConfig.disabled);
                        
                        this.componentCount++;
                    });
                });
            }
        });
    }
    
    // ==================== LAYOUT & SEPARATORS ====================
    
    /**
     * Add separator component
     * @returns {ContainerBuilder}
     */
    addSeparator() {
        this._checkComponentLimit();
        
        this.container.addSeparatorComponents((separator) => {
            this._updateComponentState('separator');
        });
        
        return this;
    }
    
    /**
     * Add multiple separators
     * @param {number} count - Number of separators to add
     * @returns {ContainerBuilder}
     */
    addSeparators(count = 1) {
        for (let i = 0; i < count; i++) {
            this.addSeparator();
        }
        return this;
    }
    
    // ==================== UTILITY METHODS ====================
    
    /**
     * Check component limit
     * @private
     */
    _checkComponentLimit() {
        if (this.componentCount >= this.options.maxComponents) {
            throw new Error(`Component limit reached: ${this.options.maxComponents}`);
        }
    }
    
    /**
     * Update component state
     * @param {string} type - Component type
     * @private
     */
    _updateComponentState(type) {
        this.lastComponentType = type;
        this.componentCount++;
    }
    
    /**
     * Internal method for select menus
     * @param {Class} BuilderClass - Select menu builder class
     * @param {SelectMenuConfig} config - Configuration
     * @returns {ContainerBuilder}
     * @private
     */
    _addSelectMenu(BuilderClass, config) {
        return this.addActionRow((actionRow) => {
            actionRow.addComponents((selectMenu) => {
                if (!(selectMenu instanceof BuilderClass)) return;
                
                selectMenu.setCustomId(config.customId)
                         .setPlaceholder(config.placeholder);
                
                if (config.minValues !== undefined) selectMenu.setMinValues(config.minValues);
                if (config.maxValues !== undefined) selectMenu.setMaxValues(config.maxValues);
                if (config.disabled) selectMenu.setDisabled(config.disabled);
                
                this.componentCount++;
            });
        });
    }
    
    /**
     * Get current component count
     * @returns {number}
     */
    getComponentCount() {
        return this.componentCount;
    }
    
    /**
     * Get section count
     * @returns {number}
     */
    getSectionCount() {
        return this.sections.length;
    }
    
    /**
     * Build the container
     * @returns {DiscordContainerBuilder}
     */
    build() {
        this.emit('containerBuilt', {
            componentCount: this.componentCount,
            sectionCount: this.sections.length
        });
        
        return this.container;
    }
    
    /**
     * Create container from template
     * @param {Function} templateFn - Template function
     * @returns {ContainerBuilder}
     */
    static fromTemplate(templateFn) {
        const builder = new ContainerBuilder();
        return templateFn(builder);
    }
    
    /**
     * Create quick button grid
     * @param {ButtonConfig[][]} buttonGrid - 2D array of button configurations
     * @param {Object} [options] - Grid options
     * @returns {ContainerBuilder}
     */
    static createButtonGrid(buttonGrid, options = {}) {
        const builder = new ContainerBuilder(options);
        
        buttonGrid.forEach(row => {
            if (row.length > 0) {
                builder.addButtons(...row);
                if (options.separateRows) {
                    builder.addSeparator();
                }
            }
        });
        
        return builder;
    }
    
    /**
     * Create form container
     * @param {Array} fields - Form fields configuration
     * @returns {ContainerBuilder}
     */
    static createForm(fields) {
        const builder = new ContainerBuilder();
        
        fields.forEach(field => {
            if (field.type === 'text') {
                builder.addTextDisplay(field.content);
            } else if (field.type === 'select') {
                builder.addStringSelect(field.config);
            } else if (field.type === 'buttons') {
                builder.addButtons(...field.buttons);
            }
            
            if (field.separator) {
                builder.addSeparator();
            }
        });
        
        return builder;
    }
}

module.exports = ContainerBuilder;