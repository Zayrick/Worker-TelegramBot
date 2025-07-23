import { Lunar } from 'lunar-javascript'
import { generateHexagram } from '../utils/hexagram.js'
import { sendPlainText, editPlainText, answerInlineQueryEmpty, answerInlineQueryDivination, editInlineMessageText } from '../services/telegram.js'
import { callAI } from '../services/ai.js'
import { BOT_USERNAME, USER_WHITELIST, GROUP_WHITELIST, USER_BLACKLIST } from '../config.js'

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

// 检查权限：先排除黑名单，再判断白名单
function isWhitelisted (userId, chatId) {
  // 若用户在黑名单，直接拒绝
  if (USER_BLACKLIST && USER_BLACKLIST.includes(userId)) return false

  // 若未配置任何白名单，默认放行（除非在黑名单）
  if (USER_WHITELIST.length === 0 && GROUP_WHITELIST.length === 0) return true

  // 用户或群组在各自白名单中则放行
  if (USER_WHITELIST.includes(userId)) return true
  if (chatId < 0 && GROUP_WHITELIST.includes(chatId)) return true

  // 其他情况拒绝
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
    const replyToId = message.reply_to_message ? message.reply_to_message.message_id : message.message_id
    return sendPlainText(chatId, idInfo, replyToId)
  }

  // /sm 或 /算命
  if (isCommand && (commandBaseLower === '/sm' || commandBaseLower === '/算命')) {
    const questionFull = messageText.split(' ').slice(1).join(' ')
    let question = questionFull.trim()
    let referencedMessage = null
    let useSpecialFormat = false

    // 检查是否有引用消息
    if (message.reply_to_message) {
      referencedMessage = message.reply_to_message
      const refText = extractTextFromMessage(referencedMessage)

      // 检查是否符合特殊格式的条件：
      // 1. 有引用内容
      // 2. 有命令参数（question不为空）
      // 3. 参数不是@机器人ID
      if (refText && question && !question.startsWith('@')) {
        // 符合特殊格式条件，使用引用内容+用户问题的组合格式
        useSpecialFormat = true
        // question保持原样，refText将在processDivination中处理
      } else if (refText && !question) {
        // 只有引用没有参数，按原逻辑处理
        question = refText
      } else if (refText && question.startsWith('@')) {
        // 引用后接@机器人ID，按原逻辑处理
        question = refText
      }
    }

    if (!question) {
      return sendPlainText(
        chatId,
        '使用方法：\n1. 直接发送 /sm 问题，例如：/sm 今天运势如何？\n2. 群聊中可先引用消息后发送 /sm，对引用内容进行占卜。\n3. 引用消息后发送 /sm 问题，可同时分析引用内容和你的问题。',
        message.message_id
      )
    }

    return processDivination(question, chatId, message.message_id, referencedMessage, useSpecialFormat)
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
  let referencedMessage = null
  let useSpecialFormat = false

  if (message.reply_to_message) {
    referencedMessage = message.reply_to_message
    const refText = extractTextFromMessage(referencedMessage)

    // 检查是否符合特殊格式的条件：
    // 1. 有引用内容
    // 2. 有用户输入的问题（messageText不为空）
    // 3. 输入不是@机器人ID
    if (refText && messageText && !messageText.startsWith('@')) {
      // 符合特殊格式条件，使用引用内容+用户问题的组合格式
      useSpecialFormat = true
      // question保持原样（messageText），refText将在processDivination中处理
    } else if (refText && !messageText) {
      // 只有引用没有输入，按原逻辑处理
      question = refText
    } else if (refText && messageText.startsWith('@')) {
      // 引用后接@机器人ID，按原逻辑处理
      question = refText
    }
  }

  if (!question) {
    return sendPlainText(chatId, '请输入您想要占卜的问题内容。', message.message_id)
  }
  return processDivination(question, chatId, message.message_id, referencedMessage, useSpecialFormat)
}

// 占卜核心流程
async function processDivination (question, chatId, replyToMessageId, referencedMessage, useSpecialFormat = false) {
  const nowUTC = new Date()
  const beijingTime = new Date(nowUTC.getTime() + 8 * 60 * 60 * 1000)
  const ganzhi = getFullBazi(beijingTime)
  const randomArray = crypto.getRandomValues(new Uint32Array(3))
  const hexagram = generateHexagram(Array.from(randomArray, n => (n % 6) + 1))
  const timeStr = `${beijingTime.getFullYear()}年${beijingTime.getMonth() + 1}月${beijingTime.getDate()}日 ` +
                  `${beijingTime.getHours().toString().padStart(2, '0')}:${beijingTime.getMinutes().toString().padStart(2, '0')}`

  let userPrompt
  if (useSpecialFormat && referencedMessage) {
    // 使用特殊格式：引用内容 + 所问之事 + 剩余内容
    const refText = extractTextFromMessage(referencedMessage)
    userPrompt = `${refText}\n所问之事：${question}\n所得之卦：${hexagram}\n所占之时：${ganzhi}\n所测之刻：${timeStr}`
  } else {
    // 使用原始格式
    userPrompt = `所问之事：${question}\n所得之卦：${hexagram}\n所占之时：${ganzhi}\n所测之刻：${timeStr}`
  }

  const replyToId = referencedMessage ? referencedMessage.message_id : replyToMessageId
  const placeholderResp = await sendPlainText(chatId, '🔮', replyToId)
  const placeholderMsgId = placeholderResp?.result?.message_id
  const aiReply = await callAI(userPrompt)

  // 构建最终回复：占卜信息 + AI结果
  const divinationInfo = `<blockquote>所问之事：${question}\n所得之卦：${hexagram}\n所占之时：${ganzhi}</blockquote>`
  const finalReply = `${divinationInfo}\n\n<blockquote>${aiReply}</blockquote>`

  if (placeholderMsgId) {
    await editPlainText(chatId, placeholderMsgId, finalReply)
    return placeholderResp
  }
  return sendPlainText(chatId, finalReply, replyToId)
}

// 处理内联查询
export async function onInlineQuery (inlineQuery) {
  const userId = inlineQuery.from.id
  const query = (inlineQuery.query || '').trim()

  // 白名单检查
  if (!isWhitelisted(userId, userId)) {
    return answerInlineQueryEmpty(inlineQuery.id)
  }

  // 空查询返回预设选项
  if (!query) {
    return answerInlineQueryEmpty(inlineQuery.id)
  }

  // 非空查询返回占卜选项
  return answerInlineQueryDivination(inlineQuery.id, query)
}

// 处理回调查询（用户点击内联键盘按钮）
export async function onCallbackQuery (callbackQuery) {
  const userId = callbackQuery.from.id
  const inlineMessageId = callbackQuery.inline_message_id
  const query = (callbackQuery.data || '').trim()

  // 白名单检查
  if (!isWhitelisted(userId, userId)) return

  // 验证查询内容
  if (!query || !inlineMessageId) return

  // 生成占卜结果（复用现有的占卜逻辑）
  const aiReply = await generateDivinationAnswer(query)

  // 编辑内联消息，显示占卜结果
  if (aiReply) {
    await editInlineMessageText(inlineMessageId, aiReply)
  }
}

// 生成占卜答案的辅助函数（提取公共逻辑）
async function generateDivinationAnswer (question) {
  const nowUTC = new Date()
  const beijingTime = new Date(nowUTC.getTime() + 8 * 60 * 60 * 1000)
  const ganzhi = getFullBazi(beijingTime)
  const randomArray = crypto.getRandomValues(new Uint32Array(3))
  const hexagram = generateHexagram(Array.from(randomArray, n => (n % 6) + 1))
  const timeStr = `${beijingTime.getFullYear()}年${beijingTime.getMonth() + 1}月${beijingTime.getDate()}日 ` +
                  `${beijingTime.getHours().toString().padStart(2, '0')}:${beijingTime.getMinutes().toString().padStart(2, '0')}`

  const userPrompt = `所问之事：${question}\n所得之卦：${hexagram}\n所占之时：${ganzhi}\n所测之刻：${timeStr}`
  const aiReply = await callAI(userPrompt)

  // 构建最终回复：占卜信息 + AI结果
  const divinationInfo = `<blockquote>所问之事：${question}\n所得之卦：${hexagram}\n所占之时：${ganzhi}</blockquote>`
  return `${divinationInfo}\n\n<blockquote>${aiReply}</blockquote>`
}


