const { REST, Routes } = require('discord.js');

class SlashCommandHandler {
    constructor(bot) {
        this.bot = bot;
        this.commands = new Map();
        this.rest = new REST({ version: '10' }).setToken(bot.token);
    }
    
    // Slash Command registrieren
    register(commandData, callback) {
        this.commands.set(commandData.name, {
            data: commandData,
            execute: callback
        });
        return this;
    }
    
    // Commands bei Discord registrieren
    async deployCommands(clientId, guildId = null) {
        const commands = Array.from(this.commands.values()).map(cmd => cmd.data);
        
        try {
            console.log('🔄 Deploying slash commands...');
            
            if (guildId) {
                // Guild-specific commands (schneller)
                await this.rest.put(
                    Routes.applicationGuildCommands(clientId, guildId),
                    { body: commands }
                );
            } else {
                // Global commands (kann bis zu 1 Stunde dauern)
                await this.rest.put(
                    Routes.applicationCommands(clientId),
                    { body: commands }
                );
            }
            
            console.log(`✅ Successfully deployed ${commands.length} slash commands!`);
        } catch (error) {
            console.error('❌ Error deploying commands:', error);
        }
    }
    
    // Slash Command handling
    handleInteraction(interaction) {
        if (!interaction.isChatInputCommand()) return;
        
        const command = this.commands.get(interaction.commandName);
        if (!command) return;
        
        try {
            command.execute(interaction);
        } catch (error) {
            console.error('Slash command error:', error);
            interaction.reply({ 
                content: '❌ There was an error executing this command!', 
                ephemeral: true 
            });
        }
    }
}

module.exports = SlashCommandHandler;