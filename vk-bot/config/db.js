import mongoose from 'mongoose';
import { logInfo, logError } from '../logger.js';

export async function initDatabase(uri) {
  try {
    await mongoose.connect(uri, {
      autoIndex: true
    });
    logInfo('MongoDB подключена успешно');
  } catch (error) {
    logError('Ошибка подключения к MongoDB', error);
    process.exit(1);
  }
}
