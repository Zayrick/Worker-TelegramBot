// 配置层：统一读取并导出所有环境变量及衍生常量

// Telegram Bot 基础配置
export const TOKEN = ENV_BOT_TOKEN // From @BotFather
export const BOT_USERNAME = (typeof ENV_BOT_USERNAME !== 'undefined' && ENV_BOT_USERNAME)
  ? ENV_BOT_USERNAME.trim().toLowerCase()
  : ''

// AI 服务配置
export const AI_API_ENDPOINT = ENV_AI_API_ENDPOINT
export const AI_MODEL_NAME   = ENV_AI_MODEL_NAME
export const AI_SYSTEM_PROMPT = ENV_AI_SYSTEM_PROMPT
export const AI_API_KEY      = ENV_AI_API_KEY

// 白名单配置
export const USER_WHITELIST  = ENV_USER_WHITELIST  ? ENV_USER_WHITELIST.split(',').map(id => parseInt(id.trim())) : []
export const GROUP_WHITELIST = ENV_GROUP_WHITELIST ? ENV_GROUP_WHITELIST.split(',').map(id => parseInt(id.trim())) : []

// 安全路径配置
const SAFE_PATH_INPUT = ENV_SAFE_PATH || ''
export const SAFE_PATH = SAFE_PATH_INPUT
  ? `/${SAFE_PATH_INPUT.replace(/^\/+/g, '').replace(/\/+$/g, '')}`
  : ''

// 路由路径常量
export const WEBHOOK               = `${SAFE_PATH}/endpoint`
export const REGISTER_WEBHOOK_PATH = `${SAFE_PATH}/registerWebhook`
export const UNREGISTER_WEBHOOK_PATH = `${SAFE_PATH}/unRegisterWebhook`

export const SECRET = ENV_BOT_SECRET 