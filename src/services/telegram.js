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

// 回答内联查询 - 空查询时返回空结果
export async function answerInlineQueryEmpty (inlineQueryId) {
  const params = {
    inline_query_id: inlineQueryId,
    results: JSON.stringify([]),
    cache_time: 60
  }

  return (await fetch(apiUrl('answerInlineQuery', params))).json()
}

// 回答内联查询 - 占卜查询
export async function answerInlineQueryDivination (inlineQueryId, query) {
  const results = [
    {
      type: 'article',
      id: 'divination_query',
      title: '🔮 占卜查询',
      description: `对"${query}"进行占卜`,
      input_message_content: {
        message_text: `🔮 正在为您解读【${query}】的占卜结果...`,
        parse_mode: 'HTML'
      },
      reply_markup: {
        inline_keyboard: [[
          {
            text: '✅ 确认占卜',
            callback_data: query
          }
        ]]
      }
    }
  ]

  const params = {
    inline_query_id: inlineQueryId,
    results: JSON.stringify(results),
    cache_time: 0
  }

  return (await fetch(apiUrl('answerInlineQuery', params))).json()
}

// 编辑内联消息文本
export async function editInlineMessageText (inlineMessageId, text) {
  const params = {
    inline_message_id: inlineMessageId,
    text,
    parse_mode: 'HTML'
  }
  return (await fetch(apiUrl('editMessageText', params))).json()
}
