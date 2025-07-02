/**
 * @file index.js
 * @brief Telegram Cloudflare Worker 入口文件，负责路由分发与业务处理。
 *
 * 本文件按照以下顺序组织代码，提高可读性与可维护性：
 * 1. 常量与配置
 * 2. 工具函数（URL 构造、Markdown 转义）
 * 3. Telegram API 包装函数
 * 4. 业务函数（发送示例消息、按钮等）
 * 5. Update 处理器（消息、回调查询）
 * 6. Webhook 路由处理器
 * 7. Cloudflare Worker 事件监听器
 */

// ================================
// 1. 常量与配置
// ================================
const TOKEN = ENV_BOT_TOKEN
const SECRET = ENV_BOT_SECRET
const WEBHOOK_PATH = '/endpoint'

/**
 * @brief 构造 Telegram Bot API URL。
 * @param {string} methodName - Telegram API 方法名
 * @param {Object<string,string>=} params - 需附加的查询参数
 * @return {string} 拼接后的完整请求 URL
 */
function apiUrl (methodName, params = null) {
  let query = ''
  if (params) {
    query = '?' + new URLSearchParams(params).toString()
  }
  return `https://api.telegram.org/bot${TOKEN}/${methodName}${query}`
}

/**
 * @brief 转义字符串以符合 MarkdownV2 语法要求。
 * @param {string} str - 待转义原始字符串
 * @param {string} [except=''] - 不进行转义的字符集合
 * @return {string} 已转义字符串
 * @see https://core.telegram.org/bots/api#markdownv2-style
 */
function escapeMarkdown (str, except = '') {
  const all = '_*[]()~`>#+-=|{}.!\\'.split('').filter(c => !except.includes(c))
  const regExSpecial = '^$*+?.()|{}[]\\'
  const regEx = new RegExp('[' + all.map(c => (regExSpecial.includes(c) ? '\\' + c : c)).join('') + ']', 'gim')
  return str.replace(regEx, '\\$&')
}

/**
 * @brief 发送纯文本消息。
 * @param {number|string} chatId - 聊天 ID
 * @param {string} text - 消息文本
 * @return {Promise<Object>} Telegram API 响应
 */
async function sendPlainText (chatId, text) {
  return (await fetch(apiUrl('sendMessage', { chat_id: chatId, text }))).json()
}

/**
 * @brief 发送 MarkdownV2 格式文本消息。
 * @param {number|string} chatId - 聊天 ID
 * @param {string} text - MarkdownV2 格式文本
 * @return {Promise<Object>} Telegram API 响应
 */
async function sendMarkdownV2Text (chatId, text) {
  return (await fetch(apiUrl('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'MarkdownV2'
  }))).json()
}

/**
 * @brief 发送带单个内联按钮的消息。
 * @param {number|string} chatId - 聊天 ID
 * @param {string} text - 消息文本
 * @param {{text:string,callback_data:string}} button - 按钮对象
 * @return {Promise<Object>} Telegram API 响应
 */
async function sendInlineButton (chatId, text, button) {
  return sendInlineButtonRow(chatId, text, [button])
}

/**
 * @brief 发送带一行多个按钮的消息。
 * @param {number|string} chatId - 聊天 ID
 * @param {string} text - 消息文本
 * @param {Array<{text:string,callback_data:string}>} buttonRow - 按钮行
 * @return {Promise<Object>} Telegram API 响应
 */
async function sendInlineButtonRow (chatId, text, buttonRow) {
  return sendInlineButtons(chatId, text, [buttonRow])
}

/**
 * @brief 发送带多行按钮的消息。
 * @param {number|string} chatId - 聊天 ID
 * @param {string} text - 消息文本
 * @param {Array<Array<{text:string,callback_data:string}>>} buttons - 多行按钮
 * @return {Promise<Object>} Telegram API 响应
 */
async function sendInlineButtons (chatId, text, buttons) {
  return (await fetch(apiUrl('sendMessage', {
    chat_id: chatId,
    reply_markup: JSON.stringify({ inline_keyboard: buttons }),
    text
  }))).json()
}

/**
 * @brief 回答 callback_query（按钮点击）。
 * @param {string} callbackQueryId - 回调查询 ID
 * @param {string|null} [text=null] - 可选提示文本
 * @return {Promise<Object>} Telegram API 响应
 */
async function answerCallbackQuery (callbackQueryId, text = null) {
  const data = { callback_query_id: callbackQueryId }
  if (text) data.text = text
  return (await fetch(apiUrl('answerCallbackQuery', data))).json()
}

/**
 * @brief 发送两按钮示例消息。
 * @param {number|string} chatId - 聊天 ID
 */
function sendTwoButtons (chatId) {
  return sendInlineButtonRow(chatId, '请点击下方任意按钮', [
    { text: '按钮一', callback_data: 'data_1' },
    { text: '按钮二', callback_data: 'data_2' }
  ])
}

/**
 * @brief 发送四按钮示例消息。
 * @param {number|string} chatId - 聊天 ID
 */
function sendFourButtons (chatId) {
  return sendInlineButtons(chatId, '请选择一个按钮', [
    [
      { text: '左上按钮', callback_data: 'Utah' },
      { text: '右上按钮', callback_data: 'Colorado' }
    ],
    [
      { text: '左下按钮', callback_data: 'Arizona' },
      { text: '右下按钮', callback_data: 'New Mexico' }
    ]
  ])
}

/**
 * @brief 发送 Markdown 示例消息。
 * @param {number|string} chatId - 聊天 ID
 */
async function sendMarkdownExample (chatId) {
  await sendMarkdownV2Text(chatId, '这是 *粗体*，这是 _斜体_')
  await sendMarkdownV2Text(chatId, escapeMarkdown('你可以这样写：*粗体* 和 _斜体_'))
  return sendMarkdownV2Text(chatId, escapeMarkdown('但用户可能会写 ** 与 __，例如 `**粗体**` 和 `__斜体__`', '`'))
}

/**
 * @brief 统一入口：处理 Update 对象。
 * @param {Object} update - Telegram Update 对象
 */
async function onUpdate (update) {
  if ('message' in update) await onMessage(update.message)
  if ('callback_query' in update) await onCallbackQuery(update.callback_query)
}

/**
 * @brief 处理文本消息。
 * @param {Object} message - Telegram Message 对象
 */
function onMessage (message) {
  if (message.text.startsWith('/start') || message.text.startsWith('/help')) {
    return sendMarkdownV2Text(message.chat.id, '*功能列表:*\n' +
      escapeMarkdown(
        '`/help` - 查看此帮助信息\n' +
        '/button2 - 发送含两个按钮的消息\n' +
        '/button4 - 发送含四个按钮的消息\n' +
        '/markdown - 发送 MarkdownV2 示例\n' +
        '/id - 返回用户或群组 ID\n',
        '`'))
  }

  if (message.text.startsWith('/button2')) return sendTwoButtons(message.chat.id)
  if (message.text.startsWith('/button4')) return sendFourButtons(message.chat.id)
  if (message.text.startsWith('/markdown')) return sendMarkdownExample(message.chat.id)

  /**
   * @brief 处理 /id 指令，根据聊天类型返回用户 ID 或群组 ID。
   *  - 在私聊（private）中返回当前用户 ID。
   *  - 在群组（group/supergroup）中返回当前群组 ID。
   */
  // /id 命令
  if (message.text.startsWith('/id') || message.text.startsWith('/ID')) {
    const chatId = message.chat.id
    const prefix = message.chat.type === 'private' ? '你的用户 ID: ' : '本群组 ID: '
    return sendMarkdownV2Text(chatId, escapeMarkdown(`${prefix}\`${chatId}\``, '`'))
  }

  return sendMarkdownV2Text(message.chat.id, escapeMarkdown('*未知命令:* `' + message.text + '`\n' +
    '使用 /help 查看可用命令。', '*`'))
}

/**
 * @brief 处理回调查询（按钮点击）。
 * @param {Object} callbackQuery - Telegram CallbackQuery 对象
 */
async function onCallbackQuery (callbackQuery) {
  await sendMarkdownV2Text(callbackQuery.message.chat.id,
    escapeMarkdown(`你点击了按钮，数据=\`${callbackQuery.data}\``, '`'))
  return answerCallbackQuery(callbackQuery.id, '收到按钮点击！')
}

/**
 * @brief 处理来自 Telegram 的 Webhook 请求。
 * @param {FetchEvent} event - Cloudflare FetchEvent
 * @return {Promise<Response>} HTTP 响应
 */
async function handleWebhook (event) {
  // 验证 Secret Token
  if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET) {
    return new Response('Unauthorized', { status: 403 })
  }

  // 读取 Update 对象并异步处理
  const update = await event.request.json()
  event.waitUntil(onUpdate(update))

  return new Response('Ok')
}

/**
 * @brief 向 Telegram 注册 Webhook。
 * @param {FetchEvent} _event - Cloudflare FetchEvent（未使用）
 * @param {URL} requestUrl - 当前请求 URL
 * @param {string} suffix - Webhook 路径后缀
 * @param {string} secret - Secret Token
 * @return {Promise<Response>} HTTP 响应
 */
async function registerWebhook (_event, requestUrl, suffix, secret) {
  const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${suffix}`
  const r = await (await fetch(apiUrl('setWebhook', {
    url: webhookUrl,
    secret_token: secret
  }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

/**
 * @brief 删除 Telegram Webhook。
 * @param {FetchEvent} _event - Cloudflare FetchEvent（未使用）
 * @return {Promise<Response>} HTTP 响应
 */
async function unRegisterWebhook (_event) {
  const r = await (await fetch(apiUrl('setWebhook', { url: '' }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

/**
 * @brief Worker 入口：监听 fetch 事件并路由到对应处理器。
 */
addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  if (url.pathname === WEBHOOK_PATH) {
    event.respondWith(handleWebhook(event))
  } else if (url.pathname === '/registerWebhook') {
    event.respondWith(registerWebhook(event, url, WEBHOOK_PATH, SECRET))
  } else if (url.pathname === '/unRegisterWebhook') {
    event.respondWith(unRegisterWebhook(event))
  } else {
    event.respondWith(new Response('No handler for this request'))
  }
})