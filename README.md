# Telegram 占卜机器人

这是一个基于 Cloudflare Workers 的 Telegram 占卜机器人，集成了 AI 聊天功能，可以进行小六壬占卜预测。

## 功能特性

- 🔮 **小六壬占卜**：基于时辰、干支四柱生成卦象，结合 AI 提供专业占卜解读
- 🤖 **AI 智能解读**：集成多种 AI 模型，提供准确的占卜结果分析
- 🛡️ **白名单控制**：支持用户白名单和群组白名单，确保使用权限管理
- 💬 **命令触发**：通过 `/sm` 命令触发占卜，避免误触发
- 🔗 **消息引用**：支持引用他人消息进行占卜分析
- 📊 **ID 查询**：通过 `/id` 命令查看用户和群组ID，便于设置白名单

## 使用说明

### 基本命令

1. **占卜命令**：`/sm 您的问题`
   - 例如：`/sm 今天的运势如何？`
   - 例如：`/sm 这次投资会成功吗？`

2. **查看ID**：`/id`
   - 显示当前用户ID和聊天ID，用于配置白名单

3. **引用占卜**：回复某条消息并发送 `/sm`
   - 机器人会对被引用的消息内容进行占卜分析
   - 回复时会引用原消息

### 使用场景

- **私聊**：必须使用 `/sm` 命令才能触发占卜
- **群聊**：只有使用 `/sm` 命令才会响应，避免干扰群聊
- **引用占卜**：在群聊中引用他人消息，然后发送 `/sm` 进行分析

### 1. 获取机器人 TOKEN 和 SECRET

1. **从 BotFather 获取 Token：**
   - 在 Telegram 中搜索 `@BotFather`。
   - 开始对话并发送 `/newbot` 命令。
   - 按照提示为你的机器人命名和设置用户名。
   - BotFather 将提供一个形如 `123456:ABC-DEF1234ghIkl-zyx57W2v1u123er1` 的 TOKEN。请妥善保管此 TOKEN。

2. **生成 Secret Token：**
   - `SECRET` 是一个自定义的字符串，用于验证 Telegram 发送给你的 Webhook 请求。它可以是任何字母、数字、下划线和连字符的组合。
   - 建议使用一个随机且足够长的字符串作为 `SECRET`，例如 `your-super-secret-token-123`。

### 2. 配置环境变量

你需要配置以下环境变量（通过 `wrangler secret put` 命令设置）：

#### 必需变量：
- `ENV_BOT_TOKEN`: 从 BotFather 获取的机器人 TOKEN
- `ENV_BOT_SECRET`: 自定义的 Webhook 验证密钥
- `ENV_AI_API_ENDPOINT`: AI API 地址（如 `https://openrouter.ai/api/v1/chat/completions`）
- `ENV_AI_API_KEY`: AI API 密钥

#### 可选变量：
- `ENV_USER_WHITELIST`: 用户白名单，用逗号分隔的用户ID（如 `123456,789012`）
- `ENV_GROUP_WHITELIST`: 群组白名单，用逗号分隔的群组ID（如 `-1001234567,-1009876543`）

#### 设置环境变量示例：

```bash
# 设置必需变量
wrangler secret put ENV_BOT_TOKEN
wrangler secret put ENV_BOT_SECRET
wrangler secret put ENV_AI_API_ENDPOINT
wrangler secret put ENV_AI_API_KEY

# 设置可选的白名单变量
wrangler secret put ENV_USER_WHITELIST
wrangler secret put ENV_GROUP_WHITELIST
```

### 3. 白名单配置

#### 获取ID信息：
1. 将机器人添加到群组或私聊
2. 发送 `/id` 命令查看用户ID和聊天ID
3. 将需要的ID添加到相应的白名单环境变量中

#### 白名单规则：
- 如果未设置白名单，机器人对所有用户开放
- 用户白名单：允许指定用户在任何地方使用机器人
- 群组白名单：允许在指定群组中使用机器人（群组ID通常为负数）
- 用户在白名单中的用户可以在私聊中使用，群组在白名单中的可以在该群组中使用

### 4. 部署 Cloudflare Worker

本项目使用 `wrangler` 工具进行部署。请确保你已安装 `npm` 和 `wrangler`。

1. **安装依赖：**
   ```bash
   npm install
   ```

2. **部署 Worker：**
   ```bash
   npx wrangler deploy
   ```
   `wrangler` 会根据 `wrangler.jsonc` 文件中的配置将 Worker 部署到你的 Cloudflare 账户。

### 5. 注册 Webhook

部署成功后，你需要将 Telegram 机器人的 Webhook 地址设置为你的 Worker URL。你可以通过访问 Worker 的特定路径来完成此操作。

打开你的浏览器，访问以下 URL：

```
https://YOUR_WORKER_URL/registerWebhook
```

将 `YOUR_WORKER_URL` 替换为你的 Cloudflare Worker 的实际 URL。例如，如果你的 Worker URL 是 `https://my-bot.your-username.workers.dev`，那么访问：

```
https://my-bot.your-username.workers.dev/registerWebhook
```

如果一切顺利，页面将显示 "Ok"。这表示 Webhook 已成功注册。

### 6. 测试机器人

现在，你的 Telegram 占卜机器人应该已经可以正常工作了！

#### 测试步骤：
1. 在 Telegram 中找到你的机器人
2. 发送 `/id` 查看ID信息
3. 发送 `/sm 今天运势如何？` 进行占卜测试
4. 在群聊中测试引用消息占卜功能

### 7. （可选）取消注册 Webhook

如果你需要取消注册 Webhook，可以访问以下 URL：

```
https://YOUR_WORKER_URL/unRegisterWebhook
```

将 `YOUR_WORKER_URL` 替换为你的 Cloudflare Worker 的实际 URL。

## 技术架构

- **后端**：Cloudflare Workers（无服务器）
- **占卜算法**：基于干支历法和小六壬系统
- **AI 集成**：支持 OpenAI 兼容的 API 接口
- **消息处理**：Telegram Bot API Webhook 模式

## 注意事项

1. **API 费用**：使用 AI 接口可能产生费用，请合理控制使用量
2. **白名单管理**：建议设置白名单避免滥用
3. **隐私保护**：机器人不会存储用户消息，但会发送给 AI 服务商
4. **群组使用**：在群组中使用时请确保符合群组规则
