class EmbedBuilder {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.embed = {
            color: 0x0099ff,
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Powered by SorionLib'
            }
        };
        return this;
    }
    
    title(text) {
        this.embed.title = text;
        return this;
    }
    
    description(text) {
        this.embed.description = text;
        return this;
    }
    
    color(hexColor) {
        this.embed.color = parseInt(hexColor.replace('#', ''), 16);
        return this;
    }
    
    addField(name, value, inline = false) {
        if (!this.embed.fields) this.embed.fields = [];
        this.embed.fields.push({ name, value, inline });
        return this;
    }
    
    author(name, iconURL, url) {
        this.embed.author = { name, icon_url: iconURL, url };
        return this;
    }
    
    thumbnail(url) {
        this.embed.thumbnail = { url };
        return this;
    }
    
    image(url) {
        this.embed.image = { url };
        return this;
    }
    
    footer(text, iconURL) {
        this.embed.footer = { text, icon_url: iconURL };
        return this;
    }
    
    timestamp(time = new Date()) {
        this.embed.timestamp = time.toISOString();
        return this;
    }
    
    // Quick preset embeds
    success(message) {
        return this.reset()
                   .title('✅ Success')
                   .color('#00ff00')
                   .description(message);
    }
    
    error(message) {
        return this.reset()
                   .title('❌ Error')
                   .color('#ff0000')
                   .description(message);
    }
    
    info(message) {
        return this.reset()
                   .title('ℹ️ Information')
                   .color('#0099ff')
                   .description(message);
    }
    
    build() {
        const builtEmbed = { embeds: [this.embed] };
        this.reset();
        return builtEmbed;
    }
}

module.exports = EmbedBuilder;