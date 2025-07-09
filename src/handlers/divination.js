import { Lunar } from 'lunar-javascript'
import { generateHexagram } from '../utils/hexagram.js'
import { sendPlainText, editPlainText } from '../services/telegram.js'
import { callAI } from '../services/ai.js'
import { BOT_USERNAME, USER_WHITELIST, GROUP_WHITELIST } from '../config.js'

// 提取消息中的文本（兼容 text 与 caption）
function extractTextFromMessage (msg) {
  if (!msg) return ''
  return (msg.text ?? msg.caption ?? '').trim()
}

// 计算四柱八字
function getFullBazi (date = new Date()) {
  const lunar = Lunar.fromDate(date)
  return `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日 ${lunar.getTimeInGanZhi()}时`
}

// 检查白名单
function isWhitelisted (userId, chatId) {
  if (USER_WHITELIST.length === 0 && GROUP_WHITELIST.length === 0) return true
  if (USER_WHITELIST.includes(userId)) return true
  if (chatId < 0 && GROUP_WHITELIST.includes(chatId)) return true
  return false
}

// 主消息处理函数
export async function onMessage (message) {
  const userId = message.from.id
  const chatId = message.chat.id
  const messageText = (message.text || '').trim()
  const isCommand = messageText.startsWith('/')

  // 解析 Telegram 命令格式 /cmd@BotName 参数...
  let commandBaseLower = ''
  if (isCommand) {
    const [commandWithMention] = messageText.split(' ')
    const [commandBase, mentionedBot] = commandWithMention.split('@')
    commandBaseLower = commandBase.toLowerCase()
    if (mentionedBot && BOT_USERNAME && mentionedBot.toLowerCase() !== BOT_USERNAME) return
  }

  // 白名单检查
  if (!isWhitelisted(userId, chatId)) return

  const isGroup = chatId < 0

  // /id 命令
  if (isCommand && commandBaseLower === '/id') {
    const idInfo = (userId === chatId)
      ? `用户ID: <code>${userId}</code>`
      : `用户ID: <code>${userId}</code>\n群组ID: <code>${chatId}</code>`
    return sendPlainText(chatId, idInfo, message.message_id)
  }

  // /sm 或 /算命
  if (isCommand && (commandBaseLower === '/sm' || commandBaseLower === '/算命')) {
    // 提取命令后的文本内容
    const questionFull = messageText.split(' ').slice(1).join(' ')
    let question = questionFull.trim()

    // 处理引用消息（如果有）
    let referencedTextForAI = null
    if (message.reply_to_message) {
      const refText = extractTextFromMessage(message.reply_to_message)

      // 判断是否存在额外问题文本（非空且不是仅提及机器人）
      const mentionSelf = BOT_USERNAME ? `@${BOT_USERNAME}` : ''
      const hasExtraQuestion = question.length > 0 && (!mentionSelf || question.toLowerCase() !== mentionSelf)

      if (hasExtraQuestion) {
        // 同时存在引用与额外问题文本：引用内容作为额外 user 消息传给 AI
        referencedTextForAI = refText || null
      } else {
        // 仅有引用，无额外文本（或仅提及机器人）：沿用旧逻辑，将引用内容视为问题
        question = refText
      }
    }

    if (!question) {
      return sendPlainText(
        chatId,
        '使用方法：\n1. 直接发送 /sm 问题，例如：/sm 今天运势如何？\n2. 群聊中可先引用消息后发送 /sm，对引用内容进行占卜。',
        message.message_id
      )
    }

    return processDivination(question, chatId, message.message_id, referencedTextForAI)
  }

  // 未知指令
  // 群聊中仅响应已注册指令，忽略其他命令；私聊仍提示未知指令
  if (isCommand) {
    if (isGroup) return // 群聊忽略未注册指令
    return sendPlainText(
      chatId,
      '未知指令，请检查后重试。\n当前支持的指令：/sm（/算命）、/id',
      message.message_id
    )
  }

  // 非命令消息
  if (isGroup) return // 群聊中忽略非命令消息

  // 私聊直接视为占卜问题
  let question = messageText
  let replyTargetId = message.message_id
  if (message.reply_to_message) {
    const refText = extractTextFromMessage(message.reply_to_message)
    if (refText) question = refText
    replyTargetId = message.reply_to_message.message_id
  }
  if (!question) {
    return sendPlainText(chatId, '请输入您想要占卜的问题内容。', message.message_id)
  }
  return processDivination(question, chatId, replyTargetId)
}

// 占卜核心流程
async function processDivination (question, chatId, replyToMessageId, referencedTextForAI = null) {
  const nowUTC = new Date()
  const beijingTime = new Date(nowUTC.getTime() + 8 * 60 * 60 * 1000)
  const ganzhi = getFullBazi(beijingTime)
  const randomArray = crypto.getRandomValues(new Uint32Array(3))
  const hexagram = generateHexagram(Array.from(randomArray, n => (n % 6) + 1))
  const timeStr = `${beijingTime.getFullYear()}年${beijingTime.getMonth() + 1}月${beijingTime.getDate()}日 ` +
                  `${beijingTime.getHours().toString().padStart(2, '0')}:${beijingTime.getMinutes().toString().padStart(2, '0')}`
  const userPrompt = `所问之事：${question}\n所得之卦：${hexagram}\n所占之时：${ganzhi}\n所测之刻：${timeStr}`
  const replyToId = replyToMessageId
  const placeholderResp = await sendPlainText(chatId, '🔮', replyToId)
  const placeholderMsgId = placeholderResp?.result?.message_id
  const aiReply = await callAI(userPrompt, referencedTextForAI)
  if (placeholderMsgId) {
    await editPlainText(chatId, placeholderMsgId, aiReply)
    return placeholderResp
  }
  return sendPlainText(chatId, aiReply, replyToId)
}
