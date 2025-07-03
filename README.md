# Telegram 工作机器人

这是一个基于 Cloudflare Workers 的 Telegram 机器人，实现了基本的 webhook 消息处理和回显功能。

## 使用说明

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

你需要将获取到的 `TOKEN` 和 `SECRET` 配置为 Cloudflare Worker 的环境变量。

1. 登录 Cloudflare 控制台。
2. 导航到你的 Workers & Pages 项目。
3. 选择你的 Worker 应用程序。
4. 进入 "设置" -> "变量" 页面。
5. 添加两个环境变量：
   - `ENV_BOT_TOKEN`: 值为你从 BotFather 获取的机器人 TOKEN。
   - `ENV_BOT_SECRET`: 值为你自定义的 Secret Token。

### 3. 部署 Cloudflare Worker

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

### 4. 注册 Webhook

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

### 5. 测试机器人

现在，你的 Telegram 机器人应该已经可以正常工作了！

在 Telegram 中向你的机器人发送任何消息，它将回复你发送的内容（回显功能）。

### 6. （可选）取消注册 Webhook

如果你需要取消注册 Webhook，可以访问以下 URL：

```
https://YOUR_WORKER_URL/unRegisterWebhook
```

将 `YOUR_WORKER_URL` 替换为你的 Cloudflare Worker 的实际 URL。
