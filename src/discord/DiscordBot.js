const CommandHandler = require('./CommandHandler');
const EmbedBuilder = require('./EmbedBuilder');
const EventEmitter = require('events');

class DiscordBot extends EventEmitter {
    constructor(options = {}) {
        super();
        this.token = options.token;
        this.prefix = options.prefix || '!';
        this.client = null;
        
        this.commands = new CommandHandler(this);
        this.embeds = new EmbedBuilder();
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
    }
    
    command(name, callback, options = {}) {
        this.commands.register(name, callback, options);
        return this;
    }
    
    on(event, callback) {
        super.on(event, callback);
        return this;
    }
    
    get user() {
        return this.client?.user;
    }
}

module.exports = DiscordBot;