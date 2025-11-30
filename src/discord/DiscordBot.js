const CommandHandler = require('./CommandHandler');
const SlashCommandHandler = require('./SlashCommandHandler');
const ComponentHandler = require('./ComponentHandler');
const EmbedBuilder = require('./EmbedBuilder');
const EventEmitter = require('events');

class DiscordBot extends EventEmitter {
    constructor(options = {}) {
        super();
        this.token = options.token;
        this.prefix = options.prefix || '!';
        this.client = null;
        
        // Handler
        this.commands = new CommandHandler(this);
        this.slash = new SlashCommandHandler(this);
        this.components = new ComponentHandler(this);
        this.embeds = new EmbedBuilder();
        
        // Auto-deploy slash commands
        this.autoDeploy = options.autoDeploy !== false;
    }
    
    async login(token = this.token) {
        if (!token) throw new Error('No Discord token provided');
        
        const { Client, GatewayIntentBits } = require('discord.js');
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });
        
        this.setupEventHandlers();
        await this.client.login(token);
        
        // Slash Commands automatisch deployen
        if (this.autoDeploy && this.client.user) {
            setTimeout(() => {
                this.slash.deployCommands(this.client.user.id);
            }, 2000);
        }
        
        return this;
    }
    
    setupEventHandlers() {
        this.client.on('clientReady', () => {
            console.log(`✅ ${this.client.user.tag} is online!`);
            this.emit('clientReady', this.client);
        });
        
        this.client.on('messageCreate', (message) => {
            if (message.author.bot) return;
            this.commands.handleMessage(message);
        });
        
        // Slash Command Handling
        this.client.on('interactionCreate', (interaction) => {
            this.slash.handleInteraction(interaction);
            this.components.handleInteraction(interaction);
        });
    }
    
    // Prefix Commands (legacy)
    command(name, callback, options = {}) {
        this.commands.register(name, callback, options);
        return this;
    }
    
    // Slash Commands (modern)
    slashCommand(commandData, callback) {
        this.slash.register(commandData, callback);
        return this;
    }
    
    // Components
    button(customId, callback) {
        this.components.button(customId, callback);
        return this;
    }
    
    selectMenu(customId, callback) {
        this.components.selectMenu(customId, callback);
        return this;
    }
    
    modal(customId, callback) {
        this.components.modal(customId, callback);
        return this;
    }
    
    get user() {
        return this.client?.user;
    }
}

module.exports = DiscordBot;