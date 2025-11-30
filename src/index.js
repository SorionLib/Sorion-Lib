// SorionLib - Modern Discord Library with Components V2
const Discord = require('./discord/DiscordBot');
const Utilities = require('./core/Utilities');

// Main export object
const SorionLib = {
    // Discord features
    Discord: Discord,
    
    // Core utilities  
    Utilities: Utilities,
    
    // Version
    version: '0.1.7'
};

// Default export for convenience
module.exports = SorionLib;

// Named exports for ESM compatibility
module.exports.Discord = Discord;
module.exports.Utilities = Utilities;
module.exports.SorionLib = SorionLib;