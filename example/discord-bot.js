const SorionLib = require('../src');

// Create Discord bot instance
const bot = new SorionLib.Discord({
    prefix: '!'
});

// Register commands
bot.command('ping', (message) => {
    message.reply('🏓 Pong!');
});

bot.command('user', (message) => {
    const embed = bot.embeds
        .title('User Information')
        .description(`Hello ${message.author.username}!`)
        .addField('User ID', message.author.id)
        .addField('Account Created', message.author.createdAt.toDateString())
        .color('#0099ff')
        .build();
    
    message.channel.send(embed);
});

bot.command('info', (message) => {
    const embed = bot.embeds
        .success(`SorionLib v${SorionLib.version} - Powerful Discord Utilities`)
        .addField('Commands', 'ping, user, info')
        .addField('Uptime', `${Math.round(process.uptime())}s`)
        .build();
    
    message.channel.send(embed);
});

// Start the bot
bot.login('YOUR_BOT_TOKEN_HERE')
    .then(() => console.log('SorionLib Discord bot is starting...'))
    .catch(console.error);