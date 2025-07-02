# Telegram Bot on Cloudflare Worker

这是一个运行在 Cloudflare Worker 上的 Telegram Bot，支持算命功能。

## 功能特点

- 🔮 支持 `/算命` 命令，结合八字和卦象进行占卜
- 🤖 集成 AI 对话功能（支持 OpenAI 兼容的 API）
- 🔐 支持用户和群组白名单
- ⚡ 基于 Cloudflare Worker，无服务器架构
- 🌏 自动计算东八区时间的八字

## 部署步骤

### 1. 前置要求

- 安装 [Node.js](https://nodejs.org/) (v16 或更高版本)
- 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- 拥有 Cloudflare 账号
- 已创建 Telegram Bot（通过 [@BotFather](https://t.me/botfather)）

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

使用 Wrangler 设置敏感信息：

```bash
# 必需的环境变量
wrangler secret put BOT_TOKEN          # Telegram Bot Token
wrangler secret put BOT_SECRET         # Webhook 验证密钥（自定义）
wrangler secret put AI_API_ENDPOINT    # AI API 地址，如 https://openrouter.ai/api/v1/chat/completions
wrangler secret put AI_API_KEY         # AI API Key

# 可选的环境变量
wrangler secret put USER_WHITELIST     # 用户白名单，多个ID用逗号分隔，如 "123456,789012"
wrangler secret put GROUP_WHITELIST    # 群组白名单，多个ID用逗号分隔，如 "-123456,-789012"
wrangler secret put AI_SYSTEM_PROMPT   # AI 系统提示词（可选）
```

### 4. 部署到 Cloudflare

```bash
# 部署到生产环境
wrangler deploy

# 或者先在本地测试
wrangler dev
```

### 5. 注册 Webhook

部署成功后，访问以下 URL 注册 Webhook：

```
https://your-worker-name.workers.dev/registerWebhook
```

## 使用方法

### 算命功能

1. **直接使用**：发送 `/算命 你的问题`
2. **回复使用**：回复任意消息，然后发送 `/算命`

Bot 会根据当前时间计算八字，生成卦象，并通过 AI 进行解读。

### 白名单配置

- 如果不设置白名单，所有用户都可以使用
- 设置 `USER_WHITELIST` 后，只有列表中的用户可以私聊使用
- 设置 `GROUP_WHITELIST` 后，只有列表中的群组可以使用

获取 ID 的方法：
1. 使用 [@userinfobot](https://t.me/userinfobot) 获取用户 ID
2. 将 Bot 加入群组后，查看 Webhook 日志获取群组 ID（通常为负数）

## 项目结构

```
├── src/
│   ├── index.js           # 主入口文件
│   └── utils/
│       ├── ganzhi.js      # 八字计算模块
│       ├── hexagram.js    # 卦象生成模块
│       └── text.js        # 文本处理工具
├── wrangler.jsonc         # Cloudflare Worker 配置
└── package.json           # 项目配置
```

## 开发说明

### 本地开发

```bash
# 启动本地开发服务器
wrangler dev

# 使用 ngrok 或类似工具暴露本地端口用于测试 Webhook
ngrok http 8787
```

### 查看日志

```bash
# 实时查看日志
wrangler tail
```

### 更新 Webhook

如需更改 Webhook URL，先取消注册旧的：

```
https://your-worker-name.workers.dev/unRegisterWebhook
```

然后重新注册新的。

## 注意事项

1. **API 限制**：Cloudflare Worker 有请求时间限制（免费版 10ms CPU 时间），AI 请求可能会超时
2. **环境变量**：敏感信息必须使用 `wrangler secret` 设置，不要硬编码在代码中
3. **时区处理**：Bot 自动使用东八区时间计算八字
4. **群组使用**：在群组中使用时，需要 @ Bot 或回复 Bot 的消息

## 故障排除

1. **Webhook 注册失败**
   - 检查 BOT_TOKEN 是否正确
   - 确保 Worker 已正确部署

2. **AI 请求失败**
   - 检查 AI_API_ENDPOINT 和 AI_API_KEY 是否正确
   - 确认 API 余额充足
   - 考虑增加超时时间

3. **权限问题**
   - 检查白名单配置是否正确
   - 用户/群组 ID 必须是数字

## 许可证

MIT
