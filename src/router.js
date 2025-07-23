import {
  WEBHOOK,
  REGISTER_WEBHOOK_PATH,
  UNREGISTER_WEBHOOK_PATH,
  SECRET
} from './config.js'
import { onMessage, onInlineQuery, onChosenInlineResult } from './handlers/divination.js'
import { apiUrl } from './services/telegram.js'

// 主入口，供 index.js 调用
export function handleRequest (event) {
  const url = new URL(event.request.url)
  if (url.pathname === WEBHOOK) {
    return handleWebhook(event)
  }
  if (url.pathname === REGISTER_WEBHOOK_PATH) {
    return registerWebhook(event, url)
  }
  if (url.pathname === UNREGISTER_WEBHOOK_PATH) {
    return unRegisterWebhook(event)
  }
  return new Response(null, { status: 404 })
}

// 处理 Telegram Webhook 请求
async function handleWebhook (event) {
  if (event.request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET) {
    return new Response('Unauthorized', { status: 403 })
  }
  const update = await event.request.json()
  event.waitUntil(onUpdate(update))
  return new Response('Ok')
}

// Update 分派
async function onUpdate (update) {
  if (update.message) {
    await onMessage(update.message)
  } else if (update.inline_query) {
    await onInlineQuery(update.inline_query)
  } else if (update.chosen_inline_result) {
    await onChosenInlineResult(update.chosen_inline_result)
  }
}

// 设置 Webhook
async function registerWebhook (event, requestUrl) {
  const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${WEBHOOK}`
  const r = await (await fetch(apiUrl('setWebhook', { url: webhookUrl, secret_token: SECRET }))).json()
  return new Response(r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

// 删除 Webhook
async function unRegisterWebhook () {
  const r = await (await fetch(apiUrl('setWebhook', { url: '' }))).json()
  return new Response(r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}
