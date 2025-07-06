import { TOKEN } from '../config.js'

// 构造 Telegram Bot API 调用 URL
export function apiUrl (methodName, params = null) {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  return `https://api.telegram.org/bot${TOKEN}/${methodName}${query}`
}

// 发送纯文本消息
export async function sendPlainText (chatId, text, replyToMessageId = null) {
  const params = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  }
  if (replyToMessageId) params.reply_to_message_id = replyToMessageId
  return (await fetch(apiUrl('sendMessage', params))).json()
}

// 编辑纯文本消息
export async function editPlainText (chatId, messageId, text) {
  const params = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML'
  }
  return (await fetch(apiUrl('editMessageText', params))).json()
} 