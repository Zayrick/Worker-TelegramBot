/**
 * @file index.js
 * @brief 基于 Cloudflare Worker 的 Telegram 机器人后端服务。
 * @author Zayrick
 * @version 3.0
 * @date 2025-07-01
 *
 * @description
 * 该文件实现了 Telegram 机器人的完整后端逻辑。它包含以下功能：
 * 1. 接收并处理 Telegram Webhook 推送的更新。
 * 2. 通过 GET 请求管理 Webhook (设置、获取、删除)。
 * 3. 定义和实现机器人的具体命令，如 /ping, /toss, /chatInfo。
 * 4. 封装了对 Telegram Bot API 的调用方法。
 * 5. 使用单个 Handler 类来处理所有传入请求，并路由到相应的机器人逻辑。
 *
 * @repository 原始仓库: https://github.com/Zayrick/Worker-TelegramBot
 */

//================================================================================
// 环境配置 (Environment Variables)
//================================================================================

/**
 * @description Cloudflare Worker 环境变量。
 * 这些变量需要在 Cloudflare 的控制台中进行设置。
 *
 * @property {string} ENV_BOT_HOST_FQDN - Cloudflare Worker 的完整访问域名 (FQDN)。
 *   例如: "https://your-worker-name.your-domain.workers.dev/"
 * @property {string} ENV_BOT_TOKEN - 你的 Telegram 机器人令牌 (Token)。
 *   从 BotFather 获取。
 */
// ENV_BOT_HOST_FQDN = https://bot.example.com/ (The FQDN of your Cloudflare Worker)
// ENV_BOT_TOKEN = ••••• (Your Telegram Bot Token)



//================================================================================
// 机器人核心配置 (Bot Configurations)
//================================================================================

/**
 * @description 命令列表对象，将命令字符串映射到具体的处理函数。
 * 这种设计使得添加新命令变得简单，只需在此处添加映射即可。
 * @type {Object.<string, function(TelegramBot, object, string[]): Promise<void>>}
 */
const commands = {
	'chatInfo': async (bot, req, args) => await bot.getChatInfo(req, args),
	'ping': async (bot, req, args) => await bot.ping(req, args),
	'toss': async (bot, req, args) => await bot.toss(req, args)
  }

  /**
   * @description 单个机器人的核心配置文件。
   * @type {{bot_name: string, token: string, commands: Object.<string, function>}}
   */
  const bot_config = {
	  // 机器人名称，主要用于日志输出识别
	  'bot_name': 'telegram_bot',
	  // 机器人的访问令牌，从环境变量中读取
	  'token': ENV_BOT_TOKEN,
	  // 该机器人支持的命令及其对应的处理函数
	  'commands': {
		'/chatInfo': commands.chatInfo,
		'/ping': commands.ping,
		'/toss': commands.toss
	  }
	}




//================================================================================
// Webhook 管理类
//================================================================================

/**
 * @class Webhook
 * @brief 负责管理 Telegram Bot 的 Webhook 设置，包括设置、获取和删除。
 */
class Webhook {
	/**
	 * @brief Webhook 类的构造函数。
	 * @param {string} url - Telegram Bot API 的基础 URL (包含 token)。
	 * @param {string} token - 机器人的令牌，用于生成访问密钥。
	 */
	constructor(url, token) {
	  this.url = url
	  this.token = token
	}

	/**
	 * @brief 调用 Telegram API 的 getMe 方法。
	 * @description 用于测试机器人的 token 是否有效。
	 * @returns {Promise<Response>} 返回包含机器人信息的 JSON 响应。
	 */
	async getMe() {
	  return await this.execute(this.url + '/getMe')
	}

	/**
	 * @brief 设置 Webhook。
	 * @description 将机器人的更新通知指向当前 Worker 的特定 URL。
	 * URL 包含一个基于 token 生成的 SHA-256 哈希值作为访问密钥，以确保安全。
	 * @returns {Promise<Response>} 返回设置 Webhook 的 API 响应。
	 */
	async set() {
	  const access_key = await sha256(this.token)
	  return await this.execute(this.url + '/setWebhook?url=' + ENV_BOT_HOST_FQDN + access_key)
	}

	/**
	 * @brief 获取当前 Webhook 的信息。
	 * @returns {Promise<Response>} 返回包含 Webhook 信息的 JSON 响应。
	 */
	async get() {
	  return await this.execute(this.url + '/getWebhookInfo')
	}

	/**
	 * @brief 删除已设置的 Webhook。
	 * @returns {Promise<Response>} 返回删除 Webhook 的 API 响应。
	 */
	async delete() {
	  return await this.execute(this.url + '/deleteWebhook')
	}

	/**
	 * @brief 执行一个 fetch 请求并返回 JSON 响应。
	 * @param {string} url - 要请求的完整 URL。
	 * @returns {Promise<Response>} 返回 API 响应的 JSONResponse 封装。
	 */
	async execute(url) {
	  const response = await fetch(url)
	  const result = await response.json()
	  return JSONResponse(result)
	}

	/**
	 * @brief 处理来自 GET 请求的 Webhook 管理命令。
	 * @description 解析 URL 中的 'command' 参数，并执行相应的操作。
	 * @param {URL} url - 包含查询参数的 URL 对象。
	 * @returns {Promise<Response>} 根据命令返回相应的处理结果或错误信息。
	 */
	async process(url) {
	  const command = url.searchParams.get('command')
	  if (command == undefined) {
		return this.error("未找到 'command' 参数", 404)
	  }

	  // 根据 command 参数值选择执行不同的 Webhook 操作
	  switch (command) {
		case 'setWebhook':
		  return await this.set()
		case 'getWebhook':
		  return await this.get()
		case 'delWebhook':
		  return await this.delete()
		case 'getMe':
		  return await this.getMe()
		case '':
		  return this.error("'command' 参数值为空", 404)
		default:
		  return this.error("无效的 'command' 参数值", 400)

	  }
	}

	/**
	 * @brief 生成一个标准的 JSON 错误响应。
	 * @param {string} message - 错误信息。
	 * @param {number} [status=403] - HTTP 状态码，默认为 403。
	 * @returns {Response} 返回一个包含错误信息的 Response 对象。
	 */
	error(message, status = 403) {
	  return JSONResponse({
		error: message
	  }, status)
	}

  }



//================================================================================
// 机器人模型基类 (BotModel)
//================================================================================

  /**
   * @class BotModel
   * @brief 定义了 Telegram 机器人的基础功能和属性，作为具体机器人类的父类。
   *        封装了所有通用的 Telegram API 调用方法。
   */
  class BotModel {
	/**
	 * @brief BotModel 类的构造函数。
	 * @param {object} config - 包含机器人 token 和 commands 的配置对象。
	 */
	constructor(config) {
	  this.token = config.token
	  this.commands = config.commands
	  this.url = 'https://api.telegram.org/bot' + config.token
	  this.webhook = new Webhook(this.url, config.token)
	}

	/**
	 * @brief 处理来自 Telegram 的核心更新 (update) 请求。
	 * @description 当机器人收到消息、回调等事件时，此方法被调用。
	 *              它会判断消息类型并分发到不同的处理逻辑。
	 * @param {object} request - 经过处理的请求对象，包含解析后的消息内容。
	 * @returns {Promise<Response>} 成功处理后返回 HTTP 200 状态，告知 Telegram 服务器已收到更新。
	 */
	async update(request) {
	  try {
		this.message = request.content.message
		/**
		 * @note 无论收到何种类型消息，均记录日志以满足审计要求。
		 *       使用 ISO 时间戳便于后续日志检索和对齐。
		 */
		console.log(`[${new Date().toISOString()}] 收到消息:`, this.message)
		// 判断消息体中是否包含文本
		if (this.message.hasOwnProperty('text')) {

		  // 尝试将文本作为命令执行
		  if (!(await this.executeCommand(request))) {
			// 如果不是一个已定义的命令，则回复默认消息
			await this.sendMessage(this.message.chat.id, "抱歉，这是一个无效的命令。")
		  }
		}
		// 此处可以添加对其他消息类型（如图片、视频、文件等）的处理逻辑
		else if (this.message.hasOwnProperty('photo')) {
		  // 处理图片消息
		  console.log(this.message.photo)
		} else if (this.message.hasOwnProperty('video')) {
		  // 处理视频消息
		  console.log(this.message.video)
		} else if (this.message.hasOwnProperty('animation')) {
		  // 处理动图消息
		  console.log(this.message.animation)
		} else if (this.message.hasOwnProperty('locaiton')) {
		  // 处理位置消息
		  console.log(this.message.locaiton)
		} else if (this.message.hasOwnProperty('poll')) {
		  // 处理投票消息
		  console.log(this.message.poll)
		} else if (this.message.hasOwnProperty('contact')) {
		  // 处理联系人消息
		  console.log(this.message.contact)
		} else if (this.message.hasOwnProperty('dice')) {
		  // 处理骰子消息
		  console.log(this.message.dice)
		} else if (this.message.hasOwnProperty('sticker')) {
		  // 处理贴纸消息
		  console.log(this.message.sticker)
		} else if (this.message.hasOwnProperty('reply_to_message')) {
		  // 处理回复消息
		  console.log(this.message.reply_to_message)
		} else {
		  // 处理未知类型的消息
		  console.log(this.message)
		}

	  } catch (error) {
		// 记录错误并返回错误信息
		console.error(error)
		return JSONResponse(error.message)
	  }
	  // 向 Telegram 服务器返回 200 OK 响应，表示已成功接收更新，避免重试
	  return new Response('True', {
		status: 200
	  })
	}

	/**
	 * @brief 解析并执行消息文本中的命令。
	 * @param {object} req - 包含消息的请求对象。
	 * @returns {Promise<boolean>} 如果文本是已定义的命令并成功触发，返回 true；否则返回 false。
	 */
	async executeCommand(req) {
	  // 将消息文本按空格分割，第一部分为命令，其余为参数
	  let cmdArray = this.message.text.split(' ')
	  const command = cmdArray.shift()
	  // 检查命令是否在配置的命令列表中
	  const isCommand = Object.keys(this.commands).includes(command)
	  if (isCommand) {
		// 如果是有效命令，则调用对应的处理函数
		await this.commands[command](this, req, cmdArray)
		return true
	  }
	  return false
	}

	/**
	 * @brief 调用 Telegram API 的 sendMessage 方法。
	 * @param {number|string} chat_id - 目标聊天的 ID。
	 * @param {string} text - 要发送的文本内容。
	 * @param {string} [parse_mode=''] - 消息解析模式 (Markdown, HTML)。
	 * @param {boolean} [disable_web_page_preview=false] - 是否禁用链接预览。
	 * @param {boolean} [disable_notification=false] - 是否静默发送。
	 * @param {number} [reply_to_message_id=0] - 如果是回复，则为被回复消息的 ID。
	 * @returns {Promise<void>}
	 */
	async sendMessage(chat_id, text,
	  parse_mode = '',
	  disable_web_page_preview = false,
	  disable_notification = false,
	  reply_to_message_id = 0) {

	  let url = this.url + '/sendMessage?chat_id=' + chat_id + '&text=' + encodeURIComponent(text)

	  url = addURLOptions(url, {
		"parse_mode": parse_mode,
		"disable_web_page_preview": disable_web_page_preview,
		"disable_notification": disable_notification,
		"reply_to_message_id": reply_to_message_id
	  })

	  await fetch(url)
	}

	/**
	 * @brief 调用 Telegram API 的 forwardMessage 方法。
	 * @param {number|string} chat_id - 目标聊天的 ID。
	 * @param {number|string} from_chat_id - 消息来源聊天的 ID。
	 * @param {boolean} [disable_notification=false] - 是否静默发送。
	 * @param {number} message_id - 要转发的消息 ID。
	 * @returns {Promise<void>}
	 */
	async forwardMessage(chat_id, from_chat_id, disable_notification = false, message_id) {

	  let url = this.url + '/sendMessage?chat_id=' + chat_id +
		'&from_chat_id=' + from_chat_id +
		'&message_id=' + message_id

	  url = addURLOptions(url, {
		"disable_notification": disable_notification
	  })

	  await fetch(url)
	}

	/**
	 * @brief 调用 Telegram API 的 sendPhoto 方法。
	 * @param {number|string} chat_id - 目标聊天的 ID。
	 * @param {string} photo - 照片的 file_id 或 URL。
	 * @param {string} [caption=''] - 照片的标题。
	 * @param {string} [parse_mode=''] - 标题的解析模式。
	 * @param {boolean} [disable_notification=false] - 是否静默发送。
	 * @param {number} [reply_to_message_id=0] - 回复消息的 ID。
	 * @returns {Promise<void>}
	 */
	async sendPhoto(chat_id, photo,
	  caption = '',
	  parse_mode = '',
	  disable_notification = false,
	  reply_to_message_id = 0) {

	  let url = this.url + '/sendPhoto?chat_id=' + chat_id + '&photo=' + photo

	  url = addURLOptions(url, {
		"caption": caption,
		"parse_mode": parse_mode,
		"disable_notification": disable_notification,
		"reply_to_message_id": reply_to_message_id
	  })

	  await fetch(url)
	}

	/**
	 * @brief 调用 Telegram API 的 sendVideo 方法。
	 * @param {number|string} chat_id - 目标聊天的 ID。
	 * @param {string} video - 视频的 file_id 或 URL。
	 * @param {number} [duration=0] - 视频时长 (秒)。
	 * @param {number} [width=0] - 视频宽度。
	 * @param {number} [height=0] - 视频高度。
	 * @param {string} [thumb=''] - 缩略图的 file_id 或 URL。
	 * @param {string} [caption=''] - 视频标题。
	 * @param {string} [parse_mode=''] - 标题解析模式。
	 * @param {boolean} [supports_streaming=false] - 是否支持流式传输。
	 * @param {boolean} [disable_notification=false] - 是否静默发送。
	 * @param {number} [reply_to_message_id=0] - 回复消息的 ID。
	 * @returns {Promise<void>}
	 */
	async sendVideo(chat_id, video,
	  duration = 0,
	  width = 0,
	  height = 0,
	  thumb = '',
	  caption = '',
	  parse_mode = '',
	  supports_streaming = false,
	  disable_notification = false,
	  reply_to_message_id = 0) {

	  let url = this.url + '/sendVideo?chat_id=' + chat_id + '&video=' + video

	  url = addURLOptions(url, {
		"duration": duration,
		"width": width,
		"height": height,
		"thumb": thumb,
		"caption": caption,
		"parse_mode": parse_mode,
		"supports_streaming": supports_streaming,
		"disable_notification": disable_notification,
		"reply_to_message_id": reply_to_message_id
	  })

	  await fetch(url)
	}

	/**
	 * @brief 调用 Telegram API 的 sendAnimation 方法。
	 * @param {number|string} chat_id - 目标聊天的 ID。
	 * @param {string} animation - 动画的 file_id 或 URL。
	 * @param {number} [duration=0] - 动画时长 (秒)。
	 * @param {number} [width=0] - 动画宽度。
	 * @param {number} [height=0] - 动画高度。
	 * @param {string} [thumb=''] - 缩略图的 file_id 或 URL。
	 * @param {string} [caption=''] - 动画标题。
	 * @param {string} [parse_mode=''] - 标题解析模式。
	 * @param {boolean} [disable_notification=false] - 是否静默发送。
	 * @param {number} [reply_to_message_id=0] - 回复消息的 ID。
	 * @returns {Promise<void>}
	 */
	async sendAnimation(chat_id, animation,
	  duration = 0,
	  width = 0,
	  height = 0,
	  thumb = '',
	  caption = '',
	  parse_mode = '',
	  disable_notification = false,
	  reply_to_message_id = 0) {

	  let url = this.url + '/sendAnimation?chat_id=' + chat_id + '&animation=' + animation

	  url = addURLOptions(url, {
		"duration": duration,
		"width": width,
		"height": height,
		"thumb": thumb,
		"caption": caption,
		"parse_mode": parse_mode,
		"disable_notification": disable_notification,
		"reply_to_message_id": reply_to_message_id
	  })

	  await fetch(url)
	}

	/**
	 * @brief 调用 Telegram API 的 sendLocation 方法。
	 * @param {number|string} chat_id - 目标聊天的 ID。
	 * @param {number} latitude - 纬度。
	 * @param {number} longitude - 经度。
	 * @param {number} [live_period=0] - 实时位置的有效时间 (秒)。
	 * @param {boolean} [disable_notification=false] - 是否静默发送。
	 * @param {number} [reply_to_message_id=0] - 回复消息的 ID。
	 * @returns {Promise<void>}
	 */
	async sendLocation(chat_id, latitude, longitude,
	  live_period = 0,
	  disable_notification = false,
	  reply_to_message_id = 0) {

	  let url = this.url + '/sendLocation?chat_id=' + chat_id + '&latitude=' + latitude + '&longitude=' + longitude

	  url = addURLOptions(url, {
		"live_period": live_period,
		"disable_notification": disable_notification,
		"reply_to_message_id": reply_to_message_id
	  })

	  await fetch(url)
	}

	/**
	 * @brief 调用 Telegram API 的 sendPoll 方法。
	 * @param {number|string} chat_id - 目标聊天的 ID。
	 * @param {string} question - 问题。
	 * @param {string[]} options - 选项数组 (JSON 字符串格式)。
	 * @param {boolean} [is_anonymous=''] - 是否匿名投票。
	 * @param {string} [type=''] - 投票类型 (quiz 或 regular)。
	 * @param {boolean} [allows_multiple_answers=false] - 是否允许多选。
	 * @param {number} [correct_option_id=0] - 正确选项的 ID (用于 quiz 类型)。
	 * @param {string} [explanation=''] - 答案解析。
	 * @param {string} [explanation_parse_mode=''] - 解析的格式。
	 * @param {number} [open_period=0] - 投票开放时间 (秒)。
	 * @param {number} [close_date=0] - 投票关闭的 Unix 时间戳。
	 * @param {boolean} [is_closed=false] - 是否发送一个已关闭的投票。
	 * @param {boolean} [disable_notification=false] - 是否静默发送。
	 * @param {number} [reply_to_message_id=0] - 回复消息的 ID。
	 * @returns {Promise<void>}
	 */
	async sendPoll(chat_id, question, options,
	  is_anonymous = '',
	  type = '',
	  allows_multiple_answers = false,
	  correct_option_id = 0,
	  explanation = '',
	  explanation_parse_mode = '',
	  open_period = 0,
	  close_date = 0,
	  is_closed = false,
	  disable_notification = false,
	  reply_to_message_id = 0) {

	  let url = this.url + '/sendPoll?chat_id=' + chat_id + '&question=' + question + '&options=' + options

	  url = addURLOptions(url, {
		"is_anonymous": is_anonymous,
		"type": type,
		"allows_multiple_answers": allows_multiple_answers,
		"correct_option_id": correct_option_id,
		"explanation": explanation,
		"explanation_parse_mode": explanation_parse_mode,
		"open_period": open_period,
		"close_date": close_date,
		"is_closed": is_closed,
		"disable_notification": disable_notification,
		"reply_to_message_id": reply_to_message_id
	  })

	  await fetch(url)
	}

	/**
	 * @brief 调用 Telegram API 的 sendDice 方法。
	 * @param {number|string} chat_id - 目标聊天的 ID。
	 * @param {string} [emoji=''] - 骰子表情 (🎲, 🎯, 🏀, ⚽, 🎳, or 🎰)。
	 * @param {boolean} [disable_notification=false] - 是否静默发送。
	 * @param {number} [reply_to_message_id=0] - 回复消息的 ID。
	 * @returns {Promise<void>}
	 */
	async sendDice(chat_id,
	  emoji = '',
	  disable_notification = false,
	  reply_to_message_id = 0) {

	  let url = this.url + '/sendDice?chat_id=' + chat_id

	  url = addURLOptions(url, {
		"emoji": emoji,
		"disable_notification": disable_notification,
		"reply_to_message_id": reply_to_message_id
	  })

	  await fetch(url)
	}

	/**
	 * @brief 调用 Telegram API 的 getUserProfilePhotos 方法。
	 * @param {number} user_id - 目标用户的 ID。
	 * @param {number} [offset=0] - 起始照片索引。
	 * @param {number} [limit=0] - 返回照片数量的限制 (1-100)。
	 * @returns {Promise<object[]>} 返回一个包含用户头像照片信息的数组。
	 */
	async getUserProfilePhotos(user_id,
	  offset = 0,
	  limit = 0) {

	  let url = this.url + '/getUserProfilePhotos?user_id=' + user_id

	  url = addURLOptions(url, {
		"offset": offset,
		"limit": limit
	  })

	  const response = await fetch(url)
	  const result = await response.json()
	  return result.result.photos
	}
  }



//================================================================================
// 核心业务逻辑机器人 (TelegramBot)
//================================================================================

  /**
   * @class TelegramBot
   * @brief 继承自 BotModel，并实现了所有具体的机器人业务命令逻辑。
   * @extends BotModel
   */
  class TelegramBot extends BotModel {
	/**
	 * @brief TelegramBot 类的构造函数。
	 * @param {object} config - 机器人配置对象。
	 */
	constructor(config) {
	  // 调用父类的构造函数
	  super(config)
	}

	/**
	 * @brief 实现 /toss 命令，模拟抛硬币。
	 * @param {object} req - 原始请求对象 (未使用)。
	 * @param {string[]} args - 命令后跟的参数 (未使用)。
	 * @returns {Promise<void>}
	 */
	async toss(req, args) {
	  const outcome = (Math.floor(Math.random() * 2) == 0) ? '正面' : '反面'
	  await this.sendMessage(this.message.chat.id, outcome)
	}

	/**
	 * @brief 实现 /ping 命令，用于测试机器人连通性。
	 * @param {object} req - 原始请求对象 (未使用)。
	 * @param {string[]} args - 命令后跟的参数，会作为响应内容的一部分返回。
	 * @returns {Promise<void>}
	 */
	async ping(req, args) {
	  const text = (args.length < 1) ? 'pong' : args.join(' ')
	  await this.sendMessage(this.message.chat.id, text)
	}

	/**
	 * @brief 实现 /chatInfo 命令，返回当前聊天的详细信息。
	 * @description 将 message.chat 对象格式化为 JSON 字符串并以 HTML <pre> 标签包裹后发送。
	 * @param {object} req - 原始请求对象 (未使用)。
	 * @param {string[]} args - 命令后跟的参数 (未使用)。
	 * @returns {Promise<void>}
	 */
	async getChatInfo(req, args) {
	  await this.sendMessage(
		this.message.chat.id,
		logJSONinHTML(this.message.chat),
		'HTML')
	}

	/**
	 * @brief 获取并发送指定用户的所有头像。
	 * @param {number|string} chat_id - 接收头像的目标聊天 ID。
	 * @param {number} user_id - 要获取头像的用户 ID。
	 * @returns {Promise<void>}
	 */
	async sendAllProfilePhotos(chat_id, user_id) {
	  const profilePhotos = await this.getUserProfilePhotos(user_id)
	  for (const item of profilePhotos) {
		// 发送最大尺寸的头像
		await this.sendPhoto(chat_id, item[0].file_id)
	  }
	}
  }



//================================================================================
// 请求处理器 (Request Handler)
//================================================================================

  /**
   * @class Handler
   * @brief Cloudflare Worker 的主请求处理器。
   *        负责验证、解析和路由所有传入的 HTTP 请求。
   */
  class Handler {
	/**
	 * @brief Handler 类的构造函数。
	 * @param {object} config - 单个机器人的配置对象。
	 */
	constructor(config) {
	  this.bot_name = config.bot_name
	  this.token = config.token
	  this.commands = config.commands
	  this.response = new Response()
	}

	/**
	 * @brief Worker 的入口处理函数，负责处理所有传入的 fetch 事件。
	 * @param {Request} request - Cloudflare Worker 接收到的原始 HTTP 请求。
	 * @returns {Promise<Response>} 返回给客户端的最终响应。
	 */
	async handle(request) {

	  const url = new URL(request.url)
	  // 从 URL 路径中提取访问密钥
	  const url_key = url.pathname.substring(1).replace(/\/$/, "")

	  // 计算正确的访问密钥以进行校验
	  this.access_key = await sha256(this.token)

	  // 校验 URL 中的密钥是否与机器人的令牌哈希匹配
	  if (url_key === this.access_key) {
		// 解析请求体
		this.request = await this.processRequest(request)

		// 实例化机器人
		this.bot = new TelegramBot({
		  'token': this.token,
		  'commands': this.commands
		})

		// 根据请求类型进行路由
		if (request.method === 'POST' && this.request.type.includes('application/json') && this.request.size > 6 && this.request.content.message) {
		  // 处理来自 Telegram 的 Webhook 更新
		  this.response = await this.bot.update(this.request)
		} else if (request.method === 'GET') {
		  // 处理用于管理 Webhook 的 GET 请求
		  this.response = await this.bot.webhook.process(url)
		} else {
		  // 处理无效的请求
		  this.response = this.error(this.request.content.error || "无效的请求")
		}

	  } else {
		// 访问密钥无效，返回错误
		this.response = this.error("无效的访问密钥")
	  }

	  // 在 Worker 日志中打印出正确的 Webhook 访问链接，方便调试
	  console.log(this.bot_name,'访问链接 -',ENV_BOT_HOST_FQDN+this.access_key)

	  return this.response
	}

	/**
	 * @brief 解析和处理原始请求，以提取其内容和元数据。
	 * @param {Request} req - 原始 HTTP 请求。
	 * @returns {Promise<object>} 返回一个包含请求内容、大小、类型等信息的对象。
	 */
	async processRequest(req) {
	  let request = req
	  request.size = parseInt(request.headers.get('content-length')) || 0
	  request.type = request.headers.get('content-type') || ''

	  if (request.size && request.type) {
		request.content = await this.getContent(request)
	  } else if (request.method == 'GET') {
		request.content = {
		  message: '正在访问 Webhook 端点'
		}
	  } else {
		request.content = {
		  message: '',
		  error: '无效的内容类型或请求体'
		}
	  }

	  // 在日志中记录原始请求信息，用于调试
	  console.log(req)
	  return request
	}

	/**
	 * @brief 根据请求的 'Content-Type' 헤더提取请求体内容。
	 * @param {Request} request - 原始 HTTP 请求。
	 * @returns {Promise<object|string|null>} 返回解析后的请求体内容。
	 */
	async getContent(request) {
	  try {
		if (request.type.includes('application/json')) {
		  return await request.json()
		} else if (request.type.includes('text/')) {
		  return await request.text()
		} else if (request.type.includes('form')) {
		  const formData = await request.formData()
		  const body = {}
		  for (const entry of formData.entries()) {
			body[entry[0]] = entry[1]
		  }
		  return body
		} else {
		  // 对于其他类型，如二进制文件，暂不处理
		  return null;
		}
	  } catch (error) {
		console.error(error.message)
		return {
		  message: '',
		  error: '无效的内容或内容类型'
		}
	  }
	}

	/**
	 * @brief 生成一个标准的 JSON 错误响应。
	 * @param {string} message - 错误信息。
	 * @param {number} [status=403] - HTTP 状态码，默认为 403。
	 * @returns {Response} 返回一个包含错误信息的 Response 对象。
	 */
	error(message, status = 403) {
	  return JSONResponse({
		error: message
	  }, status)
	}
  }



//================================================================================
// Worker 初始化 (Initializer)
//================================================================================

  /**
   * @description 初始化请求处理器。
   * 使用之前定义的机器人配置来创建一个 Handler 实例。
   */
  const handler = new Handler(bot_config)

  /**
   * @description 监听 Cloudflare Worker 的 'fetch' 事件。
   * 这是 Worker 的主入口点，所有对 Worker 的 HTTP 请求都会触发此事件。
   * event.respondWith() 方法会拦截请求并返回我们自定义的响应。
   */
  addEventListener('fetch', event => {
	event.respondWith(handler.handle(event.request))
  })



//================================================================================
// 工具函数 (Utility Functions)
//================================================================================

  /**
   * @brief 生成一个标准化的 JSON 响应。
   * @param {object} data - 要序列化为 JSON 的数据。
   * @param {number} [status=200] - HTTP 响应状态码。
   * @returns {Response} 返回一个配置好 header 的 Response 对象。
   */
  function JSONResponse(data, status = 200) {
	const init = {
	  status: status,
	  headers: {
		'content-type': 'application/json;charset=UTF-8'
	  }
	}
	return new Response(JSON.stringify(data, null, 2), init)
  }

  /**
   * @brief 使用 Web Crypto API 计算字符串的 SHA-256 哈希值。
   * @description 用于生成安全的 Webhook 访问密钥。
   * @param {string} message - 需要计算哈希的原始字符串。
   * @returns {Promise<string>} 返回 64 个字符的十六进制哈希字符串。
   */
  async function sha256(message) {
	// 将消息编码为 UTF-8
	const msgBuffer = new TextEncoder().encode(message)
	// 使用 crypto.subtle 计算哈希
	const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
	// 将 ArrayBuffer 转换为字节数组
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	// 将字节数组转换为十六进制字符串
	const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('')
	return hashHex
  }

  /**
   * @brief 将 JSON 对象格式化为适合在 HTML 中显示的字符串。
   * @description 先将 JSON 对象美化（缩进为2个空格），然后用 <pre> 标签包裹。
   * @param {object} data - 需要格式化的 JSON 对象。
   * @returns {string} 返回包裹了 <pre> 标签的 HTML 字符串。
   */
  function logJSONinHTML(data) {
	return preTagString(JSON.stringify(data, null, 2))
  }

  /**
   * @brief 将字符串用 HTML 的 <pre> 标签包裹。
   * @param {string} str - 需要包裹的字符串。
   * @returns {string} 返回包裹后的字符串。
   */
  function preTagString(str) {
	return '<pre>' + str + '</pre>'
  }

  /**
   * @brief 向 URL 字符串安全地添加查询参数。
   * @description 遍历 options 对象，将所有值为真（truthy）的键值对附加到 URL 后。
   * @param {string} urlstr - 原始 URL 字符串。
   * @param {object} [options={}] - 包含查询参数的键值对对象。
   * @returns {string} 返回附加了新参数的 URL 字符串。
   */
  function addURLOptions(urlstr, options = {}) {
	let url = urlstr
	for (const key of Object.keys(options)) {
	  // 仅当选项值有效时才添加
	  if (options[key]) {
		url += '&' + key + '=' + encodeURIComponent(options[key])
	  }
	}
	return url
  }