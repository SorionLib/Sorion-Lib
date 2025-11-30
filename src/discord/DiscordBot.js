const CommandHandler = require('./CommandHandler');
const EmbedBuilder = require('./EmbedBuilder');
const EventManager = require('./EventManager');

class DiscordBot {
    constructor(options = {}) {
        this.token = options.token;
        this.prefix = options.prefix || '!';
        this.client = null;
        
        this.commands = new CommandHandler(this);
        this.embeds = new EmbedBuilder();
        this.events = new EventManager(this);
    }
    
    // Initialize and login
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
        return this;
    }
    
    setupEventHandlers() {
        this.client.on('ready', () => {
            console.log(`✅ ${this.client.user.tag} is online!`);
            this.events.emit('ready', this.client);
        });
        
        this.client.on('messageCreate', (message) => {
            if (message.author.bot) return;
            this.commands.handleMessage(message);
        });
    }
    
    // Quick command registration
    command(name, callback, options = {}) {
        this.commands.register(name, callback, options);
        return this;
    }
    
    // Quick event registration
    on(event, callback) {
        this.events.on(event, callback);
        return this;
    }
    
    // Get bot user
    get user() {
        return this.client?.user;
    }
}

module.exports = DiscordBot;