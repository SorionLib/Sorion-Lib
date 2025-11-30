const { REST, Routes } = require('discord.js');

class SlashCommandHandler {
    constructor(bot) {
        this.bot = bot;
        this.commands = new Map();
        this.rest = null; // Wird später gesetzt
    }
    
    // Token setzen wenn verfügbar
    setToken(token) {
        if (token && !this.rest) {
            this.rest = new REST({ version: '10' }).setToken(token);
        }
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
        // Stelle sicher dass Token gesetzt ist
        if (!this.rest) {
            console.log('❌ Cannot deploy commands: No token set');
            return;
        }
        
        const commands = Array.from(this.commands.values()).map(cmd => cmd.data);
        
        if (commands.length === 0) {
            console.log('ℹ️ No slash commands to deploy');
            return;
        }
        
        try {
            console.log(`🔄 Deploying ${commands.length} slash command(s)...`);
            
            let data;
            if (guildId) {
                // Guild-specific commands (schneller)
                data = await this.rest.put(
                    Routes.applicationGuildCommands(clientId, guildId),
                    { body: commands }
                );
                console.log(`✅ Deployed ${data.length} command(s) to guild ${guildId}`);
            } else {
                // Global commands (kann bis zu 1 Stunde dauern)
                data = await this.rest.put(
                    Routes.applicationCommands(clientId),
                    { body: commands }
                );
                console.log(`✅ Deployed ${data.length} command(s) globally`);
            }
        } catch (error) {
            console.error('❌ Error deploying commands:', error.message);
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
            if (interaction.replied || interaction.deferred) {
                interaction.followUp({ 
                    content: '❌ There was an error executing this command!', 
                    ephemeral: true 
                });
            } else {
                interaction.reply({ 
                    content: '❌ There was an error executing this command!', 
                    ephemeral: true 
                });
            }
        }
    }
}

module.exports = SlashCommandHandler;