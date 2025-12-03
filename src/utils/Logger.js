class Logger {
  constructor(client, options = {}) {
    this.client = client;
    this.defaultChannel = options.defaultChannel || null;
}

  async error(message, channelId = null) {
    const targetChannel = channelId || this.defaultChannel;

    console.error(`[ERROR] ${message}`);

    if (!targetChannel) return;
    try {
      const channel = await this.client.channels.fetch(targetChannel);
      if (!channel) return;

      await channel.send({
        embeds: [
          {
            title: '❌ Error',
            description: message,
            color: 0xFF0000,
            timestamp: new Date().toISOString()
          }
        ]
      });
    } catch (err) {
      console.error(`[Logger] Failed to send error message to channel ${targetChannel}:`, err);
    }
  }

  async info(message) {
    console.warn(`[WARN] ${message}`);
  }
}

module.exports = Logger;