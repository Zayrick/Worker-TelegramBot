/**
 * https://github.com/cvzi/telegram-bot-cloudflare
 */

import { getFullBazi } from './utils/ganzhi.js'
import { generateHexagram } from './utils/hexagram.js'

const TOKEN = ENV_BOT_TOKEN // Get it from @BotFather https://core.telegram.org/bots#6-botfather
const WEBHOOK = '/endpoint'
const SECRET = ENV_BOT_SECRET // A-Z, a-z, 0-9, _ and -

/**
 * AI 接口配置（来自环境变量）
 */
const AI_API_ENDPOINT = ENV_AI_API_ENDPOINT // AI API 地址，如 https://openrouter.ai/api/v1/chat/completions
const AI_MODEL_NAME   = ENV_AI_MODEL_NAME   // 模型名称，如 deepseek/deepseek-chat-v3-0324:nitro
const AI_SYSTEM_PROMPT = ENV_AI_SYSTEM_PROMPT // 系统提示词，用于指导 AI 输出格式
const AI_API_KEY      = ENV_AI_API_KEY      // AI API Key，用于鉴权

/**
 * 白名单配置（来自环境变量）
 */
const USER_WHITELIST = ENV_USER_WHITELIST ? ENV_USER_WHITELIST.split(',').map(id => parseInt(id.trim())) : [] // 用户白名单，用逗号分隔的用户ID
const GROUP_WHITELIST = ENV_GROUP_WHITELIST ? ENV_GROUP_WHITELIST.split(',').map(id => parseInt(id.trim())) : [] // 群组白名单，用逗号分隔的群组ID

/**
 * Wait for requests to the worker
 */
addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.pathname === WEBHOOK) {
    event.respondWith(handleWebhook(event))
  } else if (url.pathname === '/registerWebhook') {
    event.respondWith(registerWebhook(event, url, WEBHOOK, SECRET))
  } else if (url.pathname === '/unRegisterWebhook') {
    event.respondWith(unRegisterWebhook(event))
  } else {
    event.respondWith(new Response('No handler for this request'))
  }
})

/**
 * Handle requests to WEBHOOK
 * https://core.telegram.org/bots/api#update
 */
async function handleWebhook (event) {
  // Check secret
  if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET) {
    return new Response('Unauthorized', { status: 403 })
  }

  // Read request body synchronously
  const update = await event.request.json()
  // Deal with response asynchronously
  event.waitUntil(onUpdate(update))

  return new Response('Ok')
}

/**
 * Handle incoming Update
 * https://core.telegram.org/bots/api#update
 */
async function onUpdate (update) {
  if ('message' in update) {
    await onMessage(update.message)
  }
}

/**
 * @brief 检查用户和群组是否在白名单中
 * @param {number} userId 用户ID
 * @param {number} chatId 聊天ID（用户私聊时等于用户ID，群聊时为群组ID）
 * @return {boolean} 是否通过白名单检查
 */
function isWhitelisted(userId, chatId) {
  // 如果白名单为空，则允许所有用户
  if (USER_WHITELIST.length === 0 && GROUP_WHITELIST.length === 0) {
    return true
  }

  // 检查用户白名单
  if (USER_WHITELIST.includes(userId)) {
    return true
  }

  // 检查群组白名单（仅对群聊有效）
  if (chatId < 0 && GROUP_WHITELIST.includes(chatId)) {
    return true
  }

  return false
}

/**
 * @brief 处理用户文本消息，并返回占卜信息。
 * @details 步骤说明：
 *  1. 检查白名单权限；
 *  2. 解析命令和参数；
 *  3. 处理不同的命令类型；
 *  4. 记录用户问题；
 *  5. 获取当前 UTC 时间并转换到东八区；
 *  6. 通过 getFullBazi 计算干支四柱；
 *  7. 随机生成三爻卦象；
 *  8. 组合文本并发送。
 * @param {object} message Telegram Message 对象
 * @return {Promise<object>} Telegram API 返回 JSON
 */
async function onMessage (message) {
  const userId = message.from.id
  const chatId = message.chat.id
  const messageText = message.text || ''

  // 1. 检查白名单权限
  if (!isWhitelisted(userId, chatId)) {
    return // 不在白名单中，直接忽略
  }

  // 2. 解析命令
  const isGroup = chatId < 0 // 负数表示群聊

  // 处理 /id 命令
  if (messageText.startsWith('/id')) {
    const idInfo = `用户ID: <code>${userId}</code>\n聊天ID: <code>${chatId}</code>`
    return sendPlainText(chatId, idInfo, message.message_id)
  }

  // 处理 /sm 命令
  if (messageText.startsWith('/sm')) {
    // 提取命令后的问题内容
    let question = messageText.substring(3).trim()

    // 检查是否有引用消息
    let referencedMessage = null
    if (message.reply_to_message) {
      referencedMessage = message.reply_to_message
      // 如果有引用消息，使用引用消息的内容作为问题
      if (referencedMessage.text) {
        question = referencedMessage.text
      }
    }

    // 如果没有问题内容，提示用户
    if (!question) {
      return sendPlainText(chatId, '请在命令后输入您的问题，例如：/sm 今天运势如何？', message.message_id)
    }

    // 进行占卜处理
    return await processDivination(question, chatId, message.message_id, referencedMessage)
  }

  // 对于群聊，如果不是 /sm 命令，则忽略
  if (isGroup) {
    return
  }

  // 对于私聊，如果不是命令，提示用户使用正确命令
  if (!messageText.startsWith('/')) {
    return sendPlainText(chatId, '请使用 /sm 命令来进行占卜，例如：/sm 今天运势如何？\n使用 /id 查看您的用户ID', message.message_id)
  }
}

/**
 * @brief 处理占卜逻辑
 * @param {string} question 占卜问题
 * @param {number} chatId 聊天ID
 * @param {number} replyToMessageId 要回复的消息ID
 * @param {object} referencedMessage 引用的消息对象
 * @return {Promise<object>} Telegram API 返回 JSON
 */
async function processDivination(question, chatId, replyToMessageId, referencedMessage) {
  // 1. 获取东八区时间（UTC+8）
  const nowUTC = new Date()
  const beijingTime = new Date(nowUTC.getTime() + 8 * 60 * 60 * 1000)

  // 2. 计算干支四柱
  const ganzhi = getFullBazi(beijingTime)

  // 3. 随机生成卦象（三个词语）
  const hexagram = generateHexagram([
    Math.floor(Math.random() * 100) + 1,
    Math.floor(Math.random() * 100) + 1,
    Math.floor(Math.random() * 100) + 1
  ])

  // 4. 格式化东八区时间字符串
  const timeStr = `${beijingTime.getFullYear()}年${beijingTime.getMonth() + 1}月${beijingTime.getDate()}日 ` +
                  `${beijingTime.getHours().toString().padStart(2, '0')}:${beijingTime.getMinutes().toString().padStart(2, '0')}`

  // 5. 组装发给 AI 的提示词
  const userPrompt = `所问之事：${question}\n所得之卦：${hexagram}\n所占之时：${ganzhi}\n所测之刻：${timeStr}`

  // 6. 调用 AI 接口获取解析
  const aiReply = await callAI(userPrompt)

  // 7. 发送回复（如果有引用消息，则回复引用消息）
  const replyToId = referencedMessage ? referencedMessage.message_id : replyToMessageId
  return sendPlainText(chatId, aiReply, replyToId)
}

/**
 * Send plain text message
 * https://core.telegram.org/bots/api#sendmessage
 */
async function sendPlainText (chatId, text, replyToMessageId = null) {
  const params = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  }

  // 如果指定了要回复的消息ID，则添加回复参数
  if (replyToMessageId) {
    params.reply_to_message_id = replyToMessageId
  }

  return (await fetch(apiUrl('sendMessage', params))).json()
}

/**
 * Set webhook to this worker's url
 * https://core.telegram.org/bots/api#setwebhook
 */
async function registerWebhook (event, requestUrl, suffix, secret) {
  // https://core.telegram.org/bots/api#setwebhook
  const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${suffix}`
  const r = await (await fetch(apiUrl('setWebhook', { url: webhookUrl, secret_token: secret }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

/**
 * Remove webhook
 * https://core.telegram.org/bots/api#setwebhook
 */
async function unRegisterWebhook (event) {
  const r = await (await fetch(apiUrl('setWebhook', { url: '' }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

/**
 * Return url to telegram api, optionally with parameters added
 */
function apiUrl (methodName, params = null) {
  let query = ''
  if (params) {
    query = '?' + new URLSearchParams(params).toString()
  }
  return `https://api.telegram.org/bot${TOKEN}/${methodName}${query}`
}

/**
 * @brief 调用 AI 聊天接口，获取对占卜信息的专业解析。
 * @param {string} userPrompt 用户提示词（占卜原始信息）。
 * @return {Promise<string>} AI 回复的文本内容。
 */
async function callAI (userPrompt) {
  /**
   * 按 OpenAI / OpenRouter Chat Completion 标准接口发送请求。
   * 目前默认关闭流式响应，直接一次性获取完整结果。
   */
  const payload = {
    model: AI_MODEL_NAME,
    messages: [
      { role: 'system', content: AI_SYSTEM_PROMPT },
      { role: 'user',   content: userPrompt }
    ],
    stream: false
  }

  const response = await fetch(AI_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // OpenRouter / OpenAI 风格的鉴权头部
      'Authorization': `Bearer ${AI_API_KEY}`
    },
    body: JSON.stringify(payload)
  })

  // 若接口异常，返回兜底提示
  if (!response.ok) {
    return '抱歉，AI 服务暂时不可用，请稍后再试。'
  }

  const data = await response.json()

  // 按 OpenAI 兼容格式解析
  if (data.choices && data.choices.length > 0 && data.choices[0].message) {
    const aiContent = data.choices[0].message.content.trim()
    // 使用 HTML 格式化 AI 返回的内容
    return `<blockquote>${aiContent}</blockquote>`
  }

  return '抱歉，AI 未能给出有效回复。'
}
