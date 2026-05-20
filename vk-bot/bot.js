import { VK, Keyboard, SessionManager } from 'vk-io';
import Order from './models/Order.js';
import { logInfo, logError } from './logger.js';

const botToken = process.env.BOT_TOKEN;
const adminIds = (process.env.ADMIN_IDS || '')
  .split(',')
  .map((id) => Number(id.trim()))
  .filter(Boolean);

if (!botToken) {
  throw new Error('BOT_TOKEN не задан в .env');
}

const vk = new VK({ token: botToken });
const session = new SessionManager({ storage: new Map() });
vk.updates.use(session.middleware);

const keyboardOrder = Keyboard.builder()
  .textButton({ label: '🪴 Оформить заказ', payload: { command: 'order' }, color: 'positive' })
  .inline();

const keyboardCancel = Keyboard.builder()
  .textButton({ label: 'Отмена', payload: { command: 'cancel' }, color: 'negative' })
  .inline();

const keyboardPlantType = Keyboard.builder()
  .textButton({ label: 'Овощи', payload: { plantType: 'Овощи' }, color: 'primary' })
  .textButton({ label: 'Зелень', payload: { plantType: 'Зелень' }, color: 'primary' })
  .row()
  .textButton({ label: 'Травы', payload: { plantType: 'Травы' }, color: 'primary' })
  .textButton({ label: 'Цветы', payload: { plantType: 'Цветы' }, color: 'primary' })
  .row()
  .textButton({ label: 'Другое', payload: { plantType: 'Другое' }, color: 'secondary' })
  .row()
  .textButton({ label: 'Отмена', payload: { command: 'cancel' }, color: 'negative' })
  .inline();

const keyboardConfirm = Keyboard.builder()
  .textButton({ label: 'Подтвердить заказ', payload: { action: 'confirm' }, color: 'positive' })
  .textButton({ label: 'Изменить данные', payload: { action: 'edit' }, color: 'secondary' })
  .row()
  .textButton({ label: 'Отмена', payload: { command: 'cancel' }, color: 'negative' })
  .inline();

const ORDER_STATES = {
  IDLE: 'idle',
  NAME: 'collect_name',
  PHONE: 'collect_phone',
  EMAIL: 'collect_email',
  QUANTITY: 'collect_quantity',
  TYPE: 'collect_plant_type',
  SPECIFIC: 'collect_specific',
  DEADLINE: 'collect_deadline',
  COMMENTS: 'collect_comments',
  CONFIRM: 'confirm'
};

function formatDate(date) {
  if (!date) return 'не указан';
  return new Date(date).toLocaleDateString('ru-RU');
}

function buildOrderSummary(order) {
  return [
    `📌 Заказ #${order._id}`,
    `Имя: ${order.fullName || 'не указано'}`,
    `Телефон: ${order.phone || 'не указан'}`,
    `Email: ${order.email || 'не указан'}`,
    `Количество: ${order.quantity || 'не указано'}`,
    `Тип растения: ${order.plantType || 'не указан'}`,
    `Конкретное растение: ${order.specificPlant || 'не указано'}`,
    `Срок готовности: ${order.deadline ? formatDate(order.deadline) : 'не указан'}`,
    `Комментарий: ${order.comments || 'нет'}
`,
    `Статус заказа: ${order.status}`
  ].join('\n');
}

async function createDraftOrder(ctx) {
  const order = await Order.create({
    vkUserId: ctx.senderId,
    vkPeerId: ctx.peerId,
    status: 'draft',
    source: 'vk_bot'
  });
  ctx.session.orderId = order._id.toString();
  ctx.session.state = ORDER_STATES.NAME;
  return order;
}

async function getDraftOrder(ctx) {
  if (!ctx.session.orderId) {
    return null;
  }
  return Order.findById(ctx.session.orderId);
}

async function updateDraftOrder(ctx, updates) {
  const order = await getDraftOrder(ctx);
  if (!order) {
    throw new Error('Черновик заказа не найден');
  }
  Object.assign(order, updates);
  await order.save();
  return order;
}

async function notifyAdmins(message) {
  if (!adminIds.length) {
    return;
  }

  for (const adminId of adminIds) {
    try {
      await vk.api.messages.send({
        peer_id: adminId,
        message,
        random_id: Date.now() + Math.floor(Math.random() * 1000)
      });
    } catch (error) {
      logError(`Не удалось отправить уведомление администратору ${adminId}`, error);
    }
  }
}

function isAdmin(ctx) {
  return adminIds.includes(ctx.senderId);
}

async function resetSession(ctx, text = 'Если хотите, нажмите кнопку ниже, чтобы оформить новый заказ.') {
  ctx.session.orderId = null;
  ctx.session.state = ORDER_STATES.IDLE;
  await ctx.reply(text, { keyboard: keyboardOrder });
}

async function startOrder(ctx) {
  await createDraftOrder(ctx);
  await ctx.reply('Отлично! Давайте начнем заказ. Введите ваше имя.', {
    keyboard: keyboardCancel
  });
}

async function sendWelcome(ctx) {
  await ctx.reply(
    'Привет! Я бот Вегетария АСХТ. Я помогу оформить заказ на растения в удобном диалоге.',
    { keyboard: keyboardOrder }
  );
  ctx.session.state = ORDER_STATES.IDLE;
}

async function handleOrdersCommand(ctx) {
  if (!isAdmin(ctx)) {
    return ctx.reply('У вас нет прав на выполнение этой команды.');
  }

  const orders = await Order.find().sort({ createdAt: -1 }).limit(10);
  if (!orders.length) {
    return ctx.reply('Заказов пока нет.');
  }

  const lines = orders.map((order) => {
    return `#${order._id} • ${order.fullName || '—'} • ${order.phone || '—'} • ${order.plantType || '—'} • ${order.status} • ${formatDate(order.createdAt)}`;
  });

  await ctx.reply(`Последние заказы:\n${lines.join('\n')}`);
}

async function handleOrderDetails(ctx, id) {
  if (!isAdmin(ctx)) {
    return ctx.reply('У вас нет прав на просмотр деталей заказа.');
  }

  if (!id) {
    return ctx.reply('Укажите идентификатор заказа, например: /order 643d2f...');
  }

  const order = await Order.findById(id.trim());
  if (!order) {
    return ctx.reply('Заказ не найден. Проверьте ID и попробуйте снова.');
  }

  await ctx.reply(buildOrderSummary(order));
}

async function handleCurrentStage(ctx) {
  const text = ctx.text?.trim();
  const payload = ctx.messagePayload || {};
  const order = await getDraftOrder(ctx);

  if (!order) {
    return resetSession(ctx, 'Ошибка: черновик заказа потерян. Начните заново.');
  }

  switch (ctx.session.state) {
    case ORDER_STATES.NAME: {
      if (!text) {
        return ctx.reply('Введите ваше имя, пожалуйста.', { keyboard: keyboardCancel });
      }
      await updateDraftOrder(ctx, { fullName: text });
      ctx.session.state = ORDER_STATES.PHONE;
      return ctx.reply('Отлично! Теперь введите номер телефона, например +7 900 000 00 00.', { keyboard: keyboardCancel });
    }

    case ORDER_STATES.PHONE: {
      const cleanPhone = text?.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        return ctx.reply('Неверный номер. Укажите настоящий номер телефона без букв.', { keyboard: keyboardCancel });
      }
      await updateDraftOrder(ctx, { phone: `+${cleanPhone}` });
      ctx.session.state = ORDER_STATES.EMAIL;
      return ctx.reply('Хорошо. Введите ваш email для связи.', { keyboard: keyboardCancel });
    }

    case ORDER_STATES.EMAIL: {
      const email = text?.toLowerCase();
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!email || !emailValid) {
        return ctx.reply('Пожалуйста, укажите корректный email.', { keyboard: keyboardCancel });
      }
      await updateDraftOrder(ctx, { email });
      ctx.session.state = ORDER_STATES.QUANTITY;
      return ctx.reply('Сколько растений нужно заказать? Укажите число.', { keyboard: keyboardCancel });
    }

    case ORDER_STATES.QUANTITY: {
      const quantity = Number(text);
      if (!quantity || quantity < 1) {
        return ctx.reply('Укажите количество растений числом, минимум 1.', { keyboard: keyboardCancel });
      }
      await updateDraftOrder(ctx, { quantity });
      ctx.session.state = ORDER_STATES.TYPE;
      return ctx.reply('Выберите тип растения.', { keyboard: keyboardPlantType });
    }

    case ORDER_STATES.TYPE: {
      const selectedType = payload.plantType || text;
      if (!selectedType) {
        return ctx.reply('Выберите тип растения кнопкой или введите текст.', { keyboard: keyboardPlantType });
      }
      await updateDraftOrder(ctx, { plantType: selectedType });
      ctx.session.state = ORDER_STATES.SPECIFIC;
      return ctx.reply('Укажите, если известно, конкретное растение. Можно написать «Не важно».', {
        keyboard: keyboardCancel
      });
    }

    case ORDER_STATES.SPECIFIC: {
      const specificPlant = text || 'не указано';
      await updateDraftOrder(ctx, { specificPlant });
      ctx.session.state = ORDER_STATES.DEADLINE;
      return ctx.reply('Укажите желаемый срок готовности. Можно написать дату или «Не важно».', {
        keyboard: keyboardCancel
      });
    }

    case ORDER_STATES.DEADLINE: {
      let deadline = null;
      if (text && !/^\s*не важно\s*$/i.test(text)) {
        const parsed = Date.parse(text);
        if (!Number.isNaN(parsed)) {
          deadline = new Date(parsed);
        }
      }
      await updateDraftOrder(ctx, { deadline });
      ctx.session.state = ORDER_STATES.COMMENTS;
      return ctx.reply('Добавьте дополнительные пожелания или напишите «Нет».', { keyboard: keyboardCancel });
    }

    case ORDER_STATES.COMMENTS: {
      const comments = text || 'нет';
      await updateDraftOrder(ctx, { comments });
      ctx.session.state = ORDER_STATES.CONFIRM;
      const readyOrder = await getDraftOrder(ctx);
      return ctx.reply(`Проверьте информацию:\n${buildOrderSummary(readyOrder)}\n\nЕсли все верно, нажмите «Подтвердить заказ».`, {
        keyboard: keyboardConfirm
      });
    }

    case ORDER_STATES.CONFIRM: {
      return ctx.reply('Нажмите кнопку для подтверждения или изменения заказа.', {
        keyboard: keyboardConfirm
      });
    }

    default: {
      return sendWelcome(ctx);
    }
  }
}

async function confirmOrder(ctx) {
  const order = await getDraftOrder(ctx);
  if (!order) {
    return resetSession(ctx, 'Заказ не найден. Начните заново, пожалуйста.');
  }

  order.status = 'new';
  await order.save();

  await ctx.reply(
    '✅ Спасибо! Ваш заказ принят. Мы свяжемся с вами в ближайшее время для уточнения деталей.',
    { keyboard: keyboardOrder }
  );

  await notifyAdmins(`Новый заказ из VK:\n${buildOrderSummary(order)}`);
  ctx.session.state = ORDER_STATES.IDLE;
  ctx.session.orderId = null;
}

async function cancelOrder(ctx) {
  if (ctx.session.orderId) {
    const order = await getDraftOrder(ctx);
    if (order && order.status === 'draft') {
      order.status = 'cancelled';
      await order.save();
    }
  }
  await resetSession(ctx, 'Оформление заказа отменено. Если хотите, начните заново.');
}

async function editOrder(ctx) {
  const order = await getDraftOrder(ctx);
  if (!order) {
    return resetSession(ctx, 'Черновик заказа не найден. Начните заново.');
  }
  ctx.session.state = ORDER_STATES.NAME;
  await ctx.reply('Хорошо, давайте исправим данные. Введите ваше имя.', {
    keyboard: keyboardCancel
  });
}

vk.updates.on('message_new', async (ctx) => {
  try {
    if (!ctx.is('message') || ctx.isOutbox) {
      return;
    }

    const text = ctx.text?.trim();
    const payload = ctx.messagePayload || {};
    const command = payload.command || text?.toLowerCase();

    if (payload?.action === 'confirm') {
      return confirmOrder(ctx);
    }

    if (payload?.action === 'edit') {
      return editOrder(ctx);
    }

    if (payload?.command === 'cancel') {
      return cancelOrder(ctx);
    }

    if (command === '/start' || command === 'начать заказ' || command === 'order' || command === 'оформить заказ') {
      return startOrder(ctx);
    }

    if (text?.startsWith('/orders')) {
      return handleOrdersCommand(ctx);
    }

    if (text?.startsWith('/order')) {
      const id = text.split(' ')[1];
      return handleOrderDetails(ctx, id);
    }

    if (ctx.session.state && ctx.session.state !== ORDER_STATES.IDLE) {
      return handleCurrentStage(ctx);
    }

    return sendWelcome(ctx);
  } catch (error) {
    logError('Ошибка при обработке сообщения', error);
    await ctx.reply('Произошла ошибка. Попробуйте, пожалуйста, еще раз.');
  }
});

export async function startBot() {
  await vk.updates.start();
}
