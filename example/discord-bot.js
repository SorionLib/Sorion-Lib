require('dotenv').config();
const SorionLib = require('../src');
const { ButtonStyle, MessageFlags, UserSelectMenuBuilder, RoleSelectMenuBuilder, StringSelectMenuBuilder } = require('discord.js');

const bot = new SorionLib.Discord({
    token: process.env.DISCORD_TOKEN,
    prefix: process.env.BOT_PREFIX || '!',
    autoDeploy: true,
    deployGuildId: process.env.GUILD_ID || null
});

// ========================
// EMBED HELPER FUNKTION
// ========================

function createEmbed() {
    return bot.embeds.reset();
}

function getEmbed(embedBuilder) {
    return { embeds: [embedBuilder.embed] };
}

// ========================
// COMPONENTS V2 COMMANDS
// ========================

// Modern Help Command mit Components v2
bot.slashCommand({
    name: 'help',
    description: 'Get help with modern components'
}, async (interaction) => {
    const container = bot.createContainer()
        .setAccentColor(0x5865F2)
        .addTextDisplay(
            '**🆘 Bot Help Menu**\n\n' +
            'Welcome to the modern help system! Select options below to explore commands.'
        )
        .addSeparator()
        .addActionRow((actionRow) =>
            actionRow.setComponents(
                new UserSelectMenuBuilder()
                    .setCustomId('help_user_select')
                    .setPlaceholder('Select users for info')
                    .setMaxValues(5)
                    .setMinValues(1)
            )
        )
        .addSeparator()
        .addSection((section) =>
            section
                .addTextDisplayComponents(
                    (textDisplay) => textDisplay.setContent('**🎯 General Commands**\n`/ping` - Check latency\n`/user` - User info\n`/server` - Server info'),
                    (textDisplay) => textDisplay.setContent('**🎪 Fun Commands**\n`/coinflip` - Flip coin\n`/roll` - Roll dice')
                )
                .setButtonAccessory((button) =>
                    button.setCustomId('help_show_more')
                        .setLabel('Show More')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔍')
                )
        );

    await interaction.reply({
        components: [container.build()],
        flags: MessageFlags.IsComponentsV2
    });
});

// User Management mit Components v2
bot.slashCommand({
    name: 'manage',
    description: 'User management with modern components'
}, async (interaction) => {
    const container = bot.createContainer()
        .setAccentColor(0x57F287)
        .addTextDisplay(
            '**👥 User Management**\n\n' +
            'Manage users with the modern component system below.'
        )
        .addSeparator()
        .addActionRow((actionRow) =>
            actionRow.setComponents(
                new UserSelectMenuBuilder()
                    .setCustomId('manage_user_select')
                    .setPlaceholder('Select users to manage')
                    .setMaxValues(10)
            )
        )
        .addSeparator()
        .addSection((section) =>
            section
                .addTextDisplayComponents(
                    (textDisplay) => textDisplay.setContent('**User Actions**\nSelect users first, then choose actions')
                )
                .setButtonAccessory((button) =>
                    button.setCustomId('manage_roles')
                        .setLabel('Manage Roles')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🎭')
                )
        )
        .addSection((section) =>
            section
                .addTextDisplayComponents(
                    (textDisplay) => textDisplay.setContent('**Moderation**\nQuick moderation actions')
                )
                .setButtonAccessory((button) =>
                    button.setCustomId('manage_kick')
                        .setLabel('Kick User')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('👢')
                )
                .setButtonAccessory((button) =>
                    button.setCustomId('manage_ban')
                        .setLabel('Ban User')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔨')
                )
        );

    await interaction.reply({
        components: [container.build()],
        flags: MessageFlags.IsComponentsV2
    });
});

// ========================
// TRADITIONELLE COMMANDS
// ========================

bot.slashCommand({
    name: 'ping',
    description: 'Check bot latency'
}, async (interaction) => {
    const embed = createEmbed()
        .title('🏓 Pong!')
        .addField('📡 API Latency', `${Math.round(bot.client.ws.ping)}ms`, true)
        .addField('⏰ Response Time', `${Date.now() - interaction.createdTimestamp}ms`, true)
        .color('#5865F2');
    await interaction.reply(getEmbed(embed));
});

bot.slashCommand({
    name: 'user',
    description: 'Get user info',
    options: [{
        name: 'user',
        type: 6,
        description: 'The user to get info about',
        required: false
    }]
}, async (interaction) => {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = createEmbed()
        .title(`👤 ${user.username}`)
        .addField('ID', user.id, true)
        .addField('Bot', user.bot ? 'Yes' : 'No', true)
        .addField('Created', `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, true)
        .color('#57F287');
    await interaction.reply(getEmbed(embed));
});

// ========================
// COMPONENTS V2 HANDLERS
// ========================

bot.selectMenu('help_user_select', async (interaction) => {
    const selectedUsers = interaction.values;
    const userList = selectedUsers.map(id => `<@${id}>`).join(', ');
    
    const container = bot.createContainer()
        .setAccentColor(0x5865F2)
        .addTextDisplay(
            `**Selected Users:** ${userList}\n\n` +
            'What would you like to do with these users?'
        )
        .addSeparator()
        .addSection((section) =>
            section
                .addTextDisplayComponents(
                    (textDisplay) => textDisplay.setContent('**User Actions**')
                )
                .setButtonAccessory((button) =>
                    button.setCustomId(`user_info_${selectedUsers[0]}`)
                        .setLabel('Get Info')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('👤')
                )
        );

    await interaction.update({
        components: [container.build()],
        flags: MessageFlags.IsComponentsV2
    });
});

// ========================
// BOT EVENTS
// ========================

bot.on('clientReady', (client) => {
    console.log(`✅ ${client.user.tag} is online with Components V2!`);
    console.log(`🎯 Serving ${client.guilds.cache.size} servers`);
    client.user.setActivity('/help | Modern UI');
});

bot.on('error', (error) => {
    console.error('❌ Bot error:', error);
});

// ========================
// BOT START
// ========================

console.log('🚀 Starting SorionLib Bot with Components V2...');

bot.login()
    .then(() => {
        console.log('✅ Bot started successfully!');
    })
    .catch(error => {
        console.error('❌ Failed to start bot:', error);
        process.exit(1);
    });

// Graceful Shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down bot...');
    bot.client.destroy();
    process.exit(0);
});