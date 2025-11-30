const Discord = require('./discord/DiscordBot');

const Utilities = require('./core/Utilities');

const SorionLib = {
    Discord: Discord,
    
    Utilities: Utilities,
    
    version: '0.1.0'
};

module.exports = SorionLib;

module.exports.Discord = Discord;
module.exports.Utilities = Utilities;
module.exports.SorionLib = SorionLib;