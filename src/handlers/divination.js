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
    const argsText = messageText.split(' ').slice(1).join(' ').trim() // 占卜问题 XXXX
    let question = argsText
    let quotedContent = ''
    let referencedMessage = null

    if (message.reply_to_message) {
      referencedMessage = message.reply_to_message
      quotedContent = extractTextFromMessage(referencedMessage)

      // 如果引用内容只是 @机器人 的提及，则不算有效引用
      const botMention = BOT_USERNAME ? `@${BOT_USERNAME}` : ''
      if (quotedContent && botMention && quotedContent.trim().toLowerCase() === botMention) {
        quotedContent = ''
        referencedMessage = null
      }
    }

    // 同时缺少问题与引用内容时，提示用法
    if (!question && !quotedContent) {
      return sendPlainText(
        chatId,
        '使用方法：\n1. 直接发送 /sm 问题，例如：/sm 今天运势如何？\n2. 群聊中可先引用消息后发送 /sm 问题，对引用内容与问题进行占卜。',
        message.message_id
      )
    }

    return processDivination({ question, quotedContent }, chatId, message.message_id, referencedMessage)
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
  let quotedContent = ''
  let referencedMessage = null
  if (message.reply_to_message) {
    referencedMessage = message.reply_to_message
    quotedContent = extractTextFromMessage(referencedMessage)
    if (quotedContent) {
      // 私聊中默认把引用内容作为问题
      question = quotedContent
    }
  }
  if (!question) {
    return sendPlainText(chatId, '请输入您想要占卜的问题内容。', message.message_id)
  }
  return processDivination({ question, quotedContent }, chatId, message.message_id, referencedMessage)
}

// 占卜核心流程
async function processDivination ({ question, quotedContent }, chatId, replyToMessageId, referencedMessage) {
  const nowUTC = new Date()
  const beijingTime = new Date(nowUTC.getTime() + 8 * 60 * 60 * 1000)
  const ganzhi = getFullBazi(beijingTime)
  const randomArray = crypto.getRandomValues(new Uint32Array(3))
  const hexagram = generateHexagram(Array.from(randomArray, n => (n % 6) + 1))
  const timeStr = `${beijingTime.getFullYear()}年${beijingTime.getMonth() + 1}月${beijingTime.getDate()}日 ` +
                  `${beijingTime.getHours().toString().padStart(2, '0')}:${beijingTime.getMinutes().toString().padStart(2, '0')}`
  // 占卜内容
  const divinationPrompt = `所问之事：${question}\n所得之卦：${hexagram}\n所占之时：${ganzhi}\n所测之刻：${timeStr}`

  // 组装多条用户消息
  const userMessages = []
  if (quotedContent) userMessages.push({ role: 'user', content: quotedContent })
  userMessages.push({ role: 'user', content: divinationPrompt })
  const replyToId = referencedMessage ? referencedMessage.message_id : replyToMessageId
  const placeholderResp = await sendPlainText(chatId, '🔮', replyToId)
  const placeholderMsgId = placeholderResp?.result?.message_id
  const aiReply = await callAI(userMessages)
  if (placeholderMsgId) {
    await editPlainText(chatId, placeholderMsgId, aiReply)
    return placeholderResp
  }
  return sendPlainText(chatId, aiReply, replyToId)
}
