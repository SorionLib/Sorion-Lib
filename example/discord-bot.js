const SorionLib = require('sorionlib');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const bot = new SorionLib.Discord({
    prefix: '!', // Fallback für legacy commands
    autoDeploy: true // Slash commands automatisch registrieren
});

// ========================
// SLASH COMMANDS (MODERN)
// ========================

bot.slashCommand({
    name: 'ping',
    description: 'Check bot latency'
}, async (interaction) => {
    await interaction.reply('🏓 Pong!');
});

bot.slashCommand({
    name: 'userinfo',
    description: 'Get user information',
    options: [
        {
            name: 'user',
            type: 6, // USER type
            description: 'The user to get info about',
            required: false
        }
    ]
}, async (interaction) => {
    const user = interaction.options.getUser('user') || interaction.user;
    
    const embed = bot.embeds
        .title('👤 User Information')
        .description(`Info about **${user.username}**`)
        .addField('ID', user.id, true)
        .addField('Account Created', `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, true)
        .thumbnail(user.displayAvatarURL())
        .color('#5865F2')
        .build();
    
    await interaction.reply(embed);
});

bot.slashCommand({
    name: 'buttons',
    description: 'Test interactive buttons'
}, async (interaction) => {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('primary-button')
                .setLabel('Primary')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('success-button')
                .setLabel('Success')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('danger-button')
                .setLabel('Danger')
                .setStyle(ButtonStyle.Danger)
        );
    
    await interaction.reply({
        content: 'Here are some buttons:',
        components: [row]
    });
});

// ========================
// COMPONENT HANDLERS
// ========================

bot.button('primary-button', async (interaction) => {
    await interaction.reply({ 
        content: 'You clicked the primary button!', 
        ephemeral: true 
    });
});

bot.button('success-button', async (interaction) => {
    await interaction.update({
        content: '✅ Success button clicked!',
        components: []
    });
});

bot.button('danger-button', async (interaction) => {
    await interaction.reply({ 
        content: '🚨 Danger button clicked!', 
        ephemeral: true 
    });
});

// ========================
// LEGACY PREFIX COMMANDS
// ========================

bot.command('legacy', (message) => {
    message.reply('This is a legacy prefix command. Use `/commands` for modern slash commands!');
});

// ========================
// EVENTS
// ========================

bot.on('clientReady', (client) => {
    console.log(`✅ ${client.user.tag} ready with modern features!`);
    client.user.setActivity('/help | SorionLib v2');
});

bot.login('YOUR_BOT_TOKEN');