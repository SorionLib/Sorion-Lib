class CommandHandler {
    constructor(bot) {
        this.bot = bot;
        this.commands = new Map();
        this.cooldowns = new Map();
    }
    
    register(name, callback, options = {}) {
        this.commands.set(name.toLowerCase(), {
            callback,
            cooldown: options.cooldown || 0,
            permissions: options.permissions || []
        });
    }
    
    handleMessage(message) {
        const { prefix } = this.bot;
        
        if (!message.content.startsWith(prefix)) return;
        
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = this.commands.get(commandName);
        if (!command) return;
        
        // Cooldown check
        if (this.isOnCooldown(message.author.id, commandName, command.cooldown)) {
            return message.reply(`⏰ Please wait ${command.cooldown/1000} seconds before using this command again.`);
        }
        
        // Execute command
        try {
            command.callback(message, args);
            this.setCooldown(message.author.id, commandName, command.cooldown);
        } catch (error) {
            console.error('Command error:', error);
            message.reply('❌ An error occurred while executing this command.');
        }
    }
    
    isOnCooldown(userId, commandName, cooldown) {
        if (cooldown === 0) return false;
        
        const key = `${userId}-${commandName}`;
        const lastUsed = this.cooldowns.get(key);
        
        if (!lastUsed) return false;
        return (Date.now() - lastUsed) < cooldown;
    }
    
    setCooldown(userId, commandName, cooldown) {
        if (cooldown === 0) return;
        
        const key = `${userId}-${commandName}`;
        this.cooldowns.set(key, Date.now());
        
        setTimeout(() => {
            this.cooldowns.delete(key);
        }, cooldown);
    }
}

module.exports = CommandHandler;