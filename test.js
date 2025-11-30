// test-debug.js
console.log('🔧 Debugging SorionLib...');

try {
    console.log('1. Testing EventManager import...');
    const EventManager = require('./src/discord/EventManager');
    console.log('✅ EventManager loaded:', typeof EventManager);
    
    console.log('2. Testing DiscordBot import...');
    const DiscordBot = require('./src/discord/DiscordBot');
    console.log('✅ DiscordBot loaded:', typeof DiscordBot);
    
    console.log('3. Testing instance creation...');
    const bot = new DiscordBot({ prefix: '!' });
    console.log('✅ Bot instance created successfully!');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
}