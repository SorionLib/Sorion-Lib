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
        
        // Auto-deploy settings
        this.autoDeploy = options.autoDeploy !== false;
        this.deployGuildId = options.deployGuildId; // Optional: specific guild
        
        // Token sofort setzen falls verfügbar
        if (this.token) {
            this.slash.setToken(this.token);
        }
    }
    
    async login(token = this.token) {
        if (!token) throw new Error('No Discord token provided');
        
        this.token = token;
        this.slash.setToken(token); // Token für Slash Commands setzen
        
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
        
        // Slash Commands automatisch deployen NACH dem Login
        if (this.autoDeploy) {
            this.setupSlashCommands();
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
        
        // Slash Command & Component Handling
        this.client.on('interactionCreate', (interaction) => {
            this.slash.handleInteraction(interaction);
            this.components.handleInteraction(interaction);
        });
    }
    
    // Slash Commands setup (separate Funktion)
    async setupSlashCommands() {
        // Warte bis client ready ist
        if (!this.client.user) {
            setTimeout(() => this.setupSlashCommands(), 1000);
            return;
        }
        
        console.log('🚀 Setting up slash commands...');
        await this.slash.deployCommands(this.client.user.id, this.deployGuildId);
    }
    
    // MANUELLES Deploy falls gewünscht
    async deploySlashCommands(guildId = null) {
        if (!this.client.user) {
            throw new Error('Client not ready. Call this after bot login.');
        }
        await this.slash.deployCommands(this.client.user.id, guildId);
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