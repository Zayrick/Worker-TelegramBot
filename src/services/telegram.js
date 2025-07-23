import { TOKEN } from '../config.js'
import { generateHexagram } from '../utils/hexagram.js'
import { Lunar } from 'lunar-javascript'

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

// 计算四柱八字
function getFullBazi (date = new Date()) {
  const lunar = Lunar.fromDate(date)
  return `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日 ${lunar.getTimeInGanZhi()}时`
}

// 回答内联查询 - 占卜查询
export async function answerInlineQueryDivination (inlineQueryId, query) {
  // 预先生成占卜信息以显示完整格式
  const nowUTC = new Date()
  const beijingTime = new Date(nowUTC.getTime() + 8 * 60 * 60 * 1000)
  const ganzhi = getFullBazi(beijingTime)
  const randomArray = crypto.getRandomValues(new Uint32Array(3))
  const hexagram = generateHexagram(Array.from(randomArray, n => (n % 6) + 1))
  const timeStr = `${beijingTime.getFullYear()}年${beijingTime.getMonth() + 1}月${beijingTime.getDate()}日 ` +
                  `${beijingTime.getHours().toString().padStart(2, '0')}:${beijingTime.getMinutes().toString().padStart(2, '0')}`

  const results = [
    {
      type: 'article',
      id: 'divination_query',
      title: '🔮 占卜查询',
      description: `对"${query}"进行占卜`,
      input_message_content: {
        message_text: `<blockquote>所问之事：${query}\n所得之卦：${hexagram}\n所占之时：${ganzhi}</blockquote>`,
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
