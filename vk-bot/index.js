import dotenv from 'dotenv';
import { initDatabase } from './config/db.js';
import { startBot } from './bot.js';
import { logInfo } from './logger.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error('MONGODB_URI не задан в .env');
}

await initDatabase(mongoUri);
await startBot();
logInfo('VK бот запущен и готов к приему заказов.');
