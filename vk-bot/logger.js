import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`)
  ),
  transports: [
    new winston.transports.Console()
  ]
});

export const logInfo = (message) => logger.info(message);
export const logError = (message, error) => logger.error(`${message}${error ? ' - ' + (error.stack || error.message || error) : ''}`);
