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
 * @brief 处理用户文本消息，并返回占卜信息。
 * @details 步骤说明：
 *  1. 记录用户问题；
 *  2. 获取当前 UTC 时间并转换到东八区；
 *  3. 通过 getFullBazi 计算干支四柱；
 *  4. 随机生成三爻卦象；
 *  5. 组合文本并发送。
 * @param {object} message Telegram Message 对象
 * @return {Promise<object>} Telegram API 返回 JSON
 */
async function onMessage (message) {
  // 1. 记录问题
  const question = message.text || ''

  // 2. 获取东八区时间（UTC+8）
  const nowUTC = new Date()
  const beijingTime = new Date(nowUTC.getTime() + 8 * 60 * 60 * 1000)

  // 3. 计算干支四柱
  const ganzhi = getFullBazi(beijingTime)

  // 4. 随机生成卦象（三个词语）
  const hexagram = generateHexagram([
    Math.floor(Math.random() * 100) + 1,
    Math.floor(Math.random() * 100) + 1,
    Math.floor(Math.random() * 100) + 1
  ])

  // 5. 格式化东八区时间字符串
  const timeStr = `${beijingTime.getFullYear()}年${beijingTime.getMonth() + 1}月${beijingTime.getDate()}日 ` +
                  `${beijingTime.getHours().toString().padStart(2, '0')}:${beijingTime.getMinutes().toString().padStart(2, '0')}`

  // 6. 组装发给 AI 的提示词
  const userPrompt = `所问之事：${question}\n所得之卦：${hexagram}\n所占之时：${ganzhi}\n所测之刻：${timeStr}`

  // 7. 调用 AI 接口获取解析
  const aiReply = await callAI(userPrompt)

  // 8. 将 AI 的回复发送给用户
  return sendPlainText(message.chat.id, aiReply)
}

/**
 * Send plain text message
 * https://core.telegram.org/bots/api#sendmessage
 */
async function sendPlainText (chatId, text) {
  return (await fetch(apiUrl('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  }))).json()
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
