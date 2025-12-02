/**
 * Logger utility for Sorion-Lib
 * Provides colorful console logging with different levels
 */

class Logger {
  constructor(prefix = 'Sorion-Lib') {
    this.prefix = prefix;
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      dim: '\x1b[2m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      gray: '\x1b[90m'
    };
  }

  /**
   * Get formatted timestamp
   * @returns {string} Formatted timestamp
   */
  getTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Format log message with color and prefix
   * @param {string} level - Log level
   * @param {string} color - ANSI color code
   * @param {string} message - Log message
   */
  formatMessage(level, color, message) {
    const timestamp = this.colors.gray + this.getTimestamp() + this.colors.reset;
    const prefix = this.colors.bright + this.colors.cyan + `[${this.prefix}]` + this.colors.reset;
    const levelTag = color + `[${level}]` + this.colors.reset;
    return `${timestamp} ${prefix} ${levelTag} ${message}`;
  }

  /**
   * Log info message
   * @param {string} message - Message to log
   */
  info(message) {
    console.log(this.formatMessage('INFO', this.colors.blue, message));
  }

  /**
   * Log success message
   * @param {string} message - Message to log
   */
  success(message) {
    console.log(this.formatMessage('SUCCESS', this.colors.green, message));
  }

  /**
   * Log warning message
   * @param {string} message - Message to log
   */
  warn(message) {
    console.warn(this.formatMessage('WARN', this.colors.yellow, message));
  }

  /**
   * Log error message
   * @param {string} message - Message to log
   * @param {Error} [error] - Optional error object
   */
  error(message, error = null) {
    console.error(this.formatMessage('ERROR', this.colors.red, message));
    if (error && error.stack) {
      console.error(this.colors.red + error.stack + this.colors.reset);
    }
  }

  /**
   * Log debug message (only if DEBUG env variable is set)
   * @param {string} message - Message to log
   */
  debug(message) {
    if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('DEBUG', this.colors.magenta, message));
    }
  }

  /**
   * Log command execution
   * @param {string} commandName - Name of the command
   * @param {string} userId - User ID who executed the command
   */
  command(commandName, userId) {
    const message = `Command "${commandName}" executed by user ${userId}`;
    console.log(this.formatMessage('CMD', this.colors.cyan, message));
  }

  /**
   * Log event
   * @param {string} eventName - Name of the event
   * @param {string} details - Event details
   */
  event(eventName, details = '') {
    const message = `Event "${eventName}"${details ? ': ' + details : ''}`;
    console.log(this.formatMessage('EVENT', this.colors.magenta, message));
  }

  /**
   * Create a custom logger with a different prefix
   * @param {string} prefix - Custom prefix
   * @returns {Logger} New logger instance
   */
  createChild(prefix) {
    return new Logger(`${this.prefix}:${prefix}`);
  }
}

// Export singleton instance
const logger = new Logger();

module.exports = logger;
module.exports.Logger = Logger;