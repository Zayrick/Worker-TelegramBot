/**
 * Telegram Bot on Cloudflare Worker
 * 主入口文件
 */

// 导入工具模块
import { GanZhi } from './utils/ganzhi.js';
import { generateHexagram } from './utils/hexagram.js';
import { escapeHtml } from './utils/text.js';

// 环境变量配置
const CONFIG = {
  BOT_TOKEN: null, // 从环境变量获取
  BOT_SECRET: null,
  AI_API_ENDPOINT: null,
  AI_MODEL_NAME: 'gpt-3.5-turbo',
  AI_API_KEY: null,
  AI_SYSTEM_PROMPT: '',
  USER_WHITELIST: [],
  GROUP_WHITELIST: [],
  WEBHOOK_PATH: '/endpoint',
};

// 初始化配置
function initConfig(env) {
  CONFIG.BOT_TOKEN = env.BOT_TOKEN || '';
  CONFIG.BOT_SECRET = env.BOT_SECRET || '';
  CONFIG.AI_API_ENDPOINT = env.AI_API_ENDPOINT || '';
  CONFIG.AI_MODEL_NAME = env.AI_MODEL_NAME || 'gpt-3.5-turbo';
  CONFIG.AI_API_KEY = env.AI_API_KEY || '';
  CONFIG.AI_SYSTEM_PROMPT = env.AI_SYSTEM_PROMPT || '';

  // 解析白名单
  CONFIG.USER_WHITELIST = parseIdList(env.USER_WHITELIST || '');
  CONFIG.GROUP_WHITELIST = parseIdList(env.GROUP_WHITELIST || '');
}

// 解析ID列表（逗号或空格分隔）
function parseIdList(raw) {
  if (!raw || !raw.trim()) return [];
  return raw.split(/[\s,]+/).filter(id => id).map(id => parseInt(id, 10));
}

// Telegram API 基础 URL
function apiUrl(method) {
  return `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/${method}`;
}

// 发送消息到 Telegram
async function sendMessage(chatId, text, options = {}) {
  const payload = {
    chat_id: chatId,
    text: text,
    ...options
  };

  const response = await fetch(apiUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return response.json();
}

// 编辑消息
async function editMessageText(chatId, messageId, text, options = {}) {
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    ...options
  };

  const response = await fetch(apiUrl('editMessageText'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return response.json();
}

// 回复回调查询
async function answerCallbackQuery(callbackQueryId, text) {
  const payload = {
    callback_query_id: callbackQueryId,
    text: text,
  };

  const response = await fetch(apiUrl('answerCallbackQuery'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return response.json();
}

// 权限检查
function isAuthorized(chatId, chatType) {
  if (chatType === 'private') {
    return CONFIG.USER_WHITELIST.length === 0 || CONFIG.USER_WHITELIST.includes(chatId);
  }
  if (chatType === 'group' || chatType === 'supergroup') {
    return CONFIG.GROUP_WHITELIST.length === 0 || CONFIG.GROUP_WHITELIST.includes(chatId);
  }
  return true;
}

// 调用 AI API
async function queryAI(prompt, systemPrompt = null) {
  if (!CONFIG.AI_API_ENDPOINT || !CONFIG.AI_API_KEY) {
    throw new Error('AI 接口未配置');
  }

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(CONFIG.AI_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.AI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CONFIG.AI_MODEL_NAME,
      messages: messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API 响应错误: ${response.status}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || JSON.stringify(result);
}

// 处理算命命令
async function handleFortuneCommand(message, commandText) {
  const chatId = message.chat.id;
  let prompt = commandText.trim();

  // 如果没有输入内容且回复了消息，使用被回复消息的内容
  if (!prompt && message.reply_to_message) {
    prompt = message.reply_to_message.text || message.reply_to_message.caption || '';
    prompt = prompt.trim();
  }

  if (!prompt) {
    await sendMessage(chatId, '请在 /算命 命令后输入问题，或回复一条消息后仅发送 /算命。');
    return;
  }

  // 获取东八区当前时间
  const now = new Date();
  // 注意：这里使用UTC时间加8小时来模拟东八区时间
  const cstTime = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000 + 8 * 60 * 60 * 1000);

  // 计算四柱八字
  const ganZhi = new GanZhi(cstTime);
  const baziText = `${ganZhi.gzYear()}年 ${ganZhi.gzMonth()}月 ${ganZhi.gzDay()}日 ${ganZhi.gzHour()}时`;

  // 随机生成三个数字并计算卦象
  const randNumbers = [
    Math.floor(Math.random() * 9999) + 1,
    Math.floor(Math.random() * 9999) + 1,
    Math.floor(Math.random() * 9999) + 1,
  ];
  const hexagramText = generateHexagram(randNumbers);

  // 构造发送给 AI 的提示
  const formattedPrompt = `
所问之事：${prompt}
所得之卦：${hexagramText}
所占之时：${baziText}
${cstTime.getFullYear()}年${String(cstTime.getMonth() + 1).padStart(2, '0')}月${String(cstTime.getDate()).padStart(2, '0')}日 ${String(cstTime.getHours()).padStart(2, '0')}:${String(cstTime.getMinutes()).padStart(2, '0')}`;

  // 确定回复的目标消息
  const targetMessageId = message.reply_to_message?.message_id || message.message_id;

  // 发送占位符
  const placeholderResp = await sendMessage(chatId, '🔮', {
    reply_to_message_id: targetMessageId,
  });
  const placeholderMessageId = placeholderResp.result?.message_id;

  try {
    // 向 AI 请求
    const aiAnswer = await queryAI(formattedPrompt, CONFIG.AI_SYSTEM_PROMPT || null);
    const htmlAnswer = `<blockquote>${escapeHtml(aiAnswer)}</blockquote>`;

    // 替换占位符
    if (placeholderMessageId) {
      await editMessageText(chatId, placeholderMessageId, htmlAnswer, {
        parse_mode: 'HTML',
      });
    } else {
      await sendMessage(chatId, htmlAnswer, {
        parse_mode: 'HTML',
        reply_to_message_id: targetMessageId,
      });
    }
  } catch (error) {
    console.error('AI 请求失败:', error);
    const errorText = `AI 请求失败: ${error.message}`;

    if (placeholderMessageId) {
      await editMessageText(chatId, placeholderMessageId, errorText);
    } else {
      await sendMessage(chatId, errorText, {
        reply_to_message_id: targetMessageId,
      });
    }
  }
}

// 处理消息
async function handleMessage(message) {
  const chatId = message.chat.id;
  const chatType = message.chat.type;
  // 如果不是文本／带 caption 的消息则忽略
  if (!('text' in message) || message.text == null) {
    return;
  }
  const text = message.text;

  console.log(`收到消息: chatId=${chatId}, chatType=${chatType}, text="${text}"`);

  // 权限检查
  if (!isAuthorized(chatId, chatType)) {
    if (chatType === 'private') {
      await sendMessage(chatId, '您暂无权限使用此 Bot，请联系管理员。');
    }
    return;
  }

  // 处理算命命令
  if (text.match(/^\/算命(?:@\w+)?\s*/i)) {
    const commandText = text.replace(/^\/算命(?:@\w+)?\s*/i, '');
    await handleFortuneCommand(message, commandText);
    return;
  }

  // 群组消息处理
  if ((chatType === 'group' || chatType === 'supergroup') && !text.startsWith('/')) {
    return;
  }

  // 未知命令提示（私聊）
  if (chatType === 'private' && text.startsWith('/')) {
    await sendMessage(chatId, `未知命令: ${text}\n仅支持 /算命 命令。`);
  }
}

// 处理回调查询
async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message?.chat?.id;
  const chatType = callbackQuery.message?.chat?.type;
  const callbackData = callbackQuery.data;
  const callbackQueryId = callbackQuery.id;

  // chatId 为空（例如来自 inline 模式）时跳过权限校验
  if (chatId && !isAuthorized(chatId, chatType)) {
    await answerCallbackQuery(callbackQueryId, '无权限。');
    return;
  }

  if (chatId) {
    await sendMessage(chatId, `你点击了按钮，数据=${callbackData}`);
  }
  await answerCallbackQuery(callbackQueryId, '收到按钮点击！');
}

// 处理 Telegram Update
async function handleUpdate(update) {
  if (update.message) {
    await handleMessage(update.message);
  }
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
  }
}

/**
 * 处理来自 Telegram 的 Webhook 请求。
 *
 * @param {Request} request  Cloudflare Worker 的请求对象
 * @param {Record<string, any>} env    环境变量集合
 * @param {ExecutionContext} ctx       Worker 执行上下文，用于延长生命周期
 * @returns {Response} HTTP 响应对象
 */
async function handleWebhook(request, env, ctx) {
  // 验证密钥
  const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (secretHeader !== CONFIG.BOT_SECRET) {
    console.warn('收到未经授权的 Webhook 请求');
    return new Response('Unauthorized', { status: 403 });
  }

  // JSON 解析过程加入 try/catch，避免畸形请求导致 500
  let update;
  try {
    update = await request.json();
  } catch (err) {
    console.warn('Webhook JSON 解析失败:', err);
    return new Response('Bad Request', { status: 400 });
  }
  console.log('收到 Telegram Update:', update.update_id);

  // 异步处理更新，使用 ctx.waitUntil 保证任务在响应后继续执行
  ctx.waitUntil((async () => {
    try {
      await handleUpdate(update);
    } catch (error) {
      console.error('处理更新时出错:', error);
    }
  })());

  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// 注册 Webhook
async function registerWebhook(request) {
  const url = new URL(request.url);
  // 确保 webhookPath 没有结尾斜杠，便于与 host 拼接
  const webhookPath = CONFIG.WEBHOOK_PATH.replace(/\/$/, '');
  const webhookUrl = `${url.protocol}//${url.host}${webhookPath}`;

  const response = await fetch(apiUrl('setWebhook'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: CONFIG.BOT_SECRET,
    }),
  });

  const result = await response.json();

  if (result.ok) {
    console.log('Webhook 注册成功:', webhookUrl);
    return new Response(JSON.stringify({
      status: 'success',
      webhook_url: webhookUrl,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.error('Webhook 注册失败:', result);
  return new Response(JSON.stringify({
    status: 'error',
    result: result,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// 取消注册 Webhook
async function unregisterWebhook() {
  const response = await fetch(apiUrl('setWebhook'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: '' }),
  });

  const result = await response.json();

  if (result.ok) {
    console.log('Webhook 已成功删除');
    return new Response(JSON.stringify({
      status: 'success',
      message: 'Webhook removed',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.error('Webhook 删除失败:', result);
  return new Response(JSON.stringify({
    status: 'error',
    result: result,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// Worker 主入口
export default {
  async fetch(request, env, ctx) {
    // 初始化配置
    initConfig(env);

    const url = new URL(request.url);
    // 移除右侧多余的斜杠，确保 /endpoint 与 /endpoint/ 均可命中
    const path = url.pathname.replace(/\/$/, '');

    // 路由处理
    switch (path) {
      case CONFIG.WEBHOOK_PATH:
        if (request.method === 'POST') {
          // 传递 ctx 以便在 handleWebhook 中调用 ctx.waitUntil
          return handleWebhook(request, env, ctx);
        }
        break;

      case '/registerWebhook':
        if (request.method === 'GET') {
          return registerWebhook(request);
        }
        break;

      case '/unRegisterWebhook':
        if (request.method === 'GET') {
          return unregisterWebhook();
        }
        break;

      case '/':
        return new Response(JSON.stringify({
          message: 'Telegram Bot Server is running'
        }), {
          headers: { 'Content-Type': 'application/json' },
        });

      case '/health':
        return new Response(JSON.stringify({
          status: 'healthy',
          bot_token_configured: Boolean(CONFIG.BOT_TOKEN),
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response('Not Found', { status: 404 });
  },
};
