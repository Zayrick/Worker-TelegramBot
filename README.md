# Cloudflare Worker Telegram 机器人

> 基于 **Cloudflare Worker** 与 **Wrangler** 的零服务器、低时延 Telegram Bot 后端示例。

---

## 📖 目录

1. [项目简介](#项目简介)
2. [功能亮点](#功能亮点)
3. [运行前准备](#运行前准备)
4. [快速开始](#快速开始)
5. [环境变量](#环境变量)
6. [Webhook 管理](#webhook-管理)
7. [可用命令](#可用命令)
8. [目录结构](#目录结构)
9. [本地开发与调试](#本地开发与调试)
10. [单元测试](#单元测试)
11. [故障排查](#故障排查)
12. [许可证](#许可证)

---

## 项目简介

本仓库演示如何使用 **Cloudflare Worker** 部署一个 Telegram 机器人，无需购买或维护任何云服务器即可实现全球边缘加速。核心逻辑均位于 `src/index.js`，代码清晰、易于扩展，适合作为个人或团队快速启动 Bot 项目的脚手架。

---

## 功能亮点

| 🚀 特性 | 描述 |
| ------ | ---- |
| ✨ 零服务器 | 全量运行于 Cloudflare 边缘节点，省去运维烦恼 |
| 🔒 双重安全 | 使用固定 Webhook 路由 + Header `X-Telegram-Bot-Api-Secret-Token` 防御恶意请求 |
| 🧩 命令即代码 | 所有指令逻辑集中在单文件，阅读成本极低，新增命令只需几行代码 |
| 🕹️ 交互示例 | 内置两键、四键与 Markdown 消息示例，上手即用 |
| 🧪 单元测试 | 通过 **Vitest** 保证核心工具函数行为稳定 |

---

## 运行前准备

1. 拥有一个 Telegram Bot Token（向 @BotFather 获取）。
2. 拥有一个可用的 Cloudflare 账号并创建 **Worker**。
3. 本地安装 **Node.js ≥ 18** 与 **npm**。

---

## 快速开始

```bash
# 1. 克隆项目
$ git clone https://github.com/your-name/Worker-TelegramBot.git
$ cd Worker-TelegramBot

# 2. 安装依赖
$ npm ci  # 或 npm install

# 3. 配置 Wrangler（首次运行自动生成 wrangler.toml）
$ npx wrangler init --no-git --yes

# 4. 在 wrangler.toml 或 Dashboard 中填写环境变量
#    ENV_BOT_TOKEN / ENV_BOT_SECRET

# 5. 本地启动（默认 http://127.0.0.1:8787 ）
$ npx wrangler dev
```

> 本地启动后即可在终端看到 `registerWebhook`、`unRegisterWebhook` 等路由信息，后续步骤中将使用到。

---

## 环境变量

| 变量名 | 是否必填 | 含义 |
| ------ | ------ | ---- |
| `ENV_BOT_TOKEN` | ✅ | Telegram 机器人 Token |
| `ENV_BOT_SECRET` | ✅ | 自定义的 Secret Token，用于验证 Webhook 请求 Header |

可在 **wrangler.toml** 中添加：

```toml
[vars]
ENV_BOT_TOKEN = "123456:ABC-DEF..."
ENV_BOT_SECRET = "your_super_secret"
```

或在 Cloudflare Dashboard → *Workers* → *KV & Environment Variables* 中添加。

---

## Webhook 管理

机器人提供以下三个与部署域名同级的 HTTP 路由：

| 路径 | 方法 | 描述 |
| ---- | ---- | ---- |
| `/registerWebhook`   | GET | 调用 Telegram `setWebhook`，将 Webhook 指向当前 Worker，并携带 `ENV_BOT_SECRET` 作为验证 Header |
| `/unRegisterWebhook` | GET | 调用 Telegram `setWebhook` 解除绑定 |
| `/endpoint`          | POST| Telegram 向此路径推送 Update，所有业务逻辑处理入口 |

### 一键注册 Webhook

在 Worker 启动后访问：

```
https://<YOUR_WORKER_DOMAIN>/registerWebhook
```

若返回 `Ok`，说明 Webhook 已成功绑定。

> Telegram 会在每次请求 `/endpoint` 时自动携带 `X-Telegram-Bot-Api-Secret-Token`，Worker 会校验该 Header 与 `ENV_BOT_SECRET` 一致性，拒绝非法访问。

---

## 可用命令

| 指令 | 说明 |
| ---- | ---- |
| `/start` / `/help` | 查看功能列表 |
| `/button2` | 发送包含「按钮一 / 按钮二」的两键消息 |
| `/button4` | 发送包含 4 个按钮（2×2）的多键消息 |
| `/markdown` | 发送 MarkdownV2 渲染示例 |

任何未知指令都会被机器人识别并以 Markdown 格式提示「未知命令」。

---

## 目录结构

```text
Worker-TelegramBot/
├─ src/
│  └─ index.js       # Worker 入口 & Bot 逻辑
├─ test/             # Vitest 单元测试
├─ wrangler.jsonc    # Wrangler 配置（JSONC，可注释）
├─ package.json      # 依赖与脚本
└─ README.md         # 项目说明
```

---

## 本地开发与调试

```bash
# 热更新模式启动
$ npx wrangler dev --watch
```

调试建议：

* 使用 `console.log()` 在终端或 Cloudflare Dashboard → *Logs* 中查看实时日志。
* 通过 `event.waitUntil()` 延迟处理异步逻辑，避免超时。
* 在本地可直接向 `http://127.0.0.1:8787/registerWebhook` 发送请求，测试注册流程。

---

## 单元测试

项目使用 **Vitest**：

```bash
$ npm run test      # 等价于 npx vitest run
```

测试文件位于 `test/`，目前包含基础单元测试示例，可按需扩展覆盖率。

---

## 故障排查

| 现象 | 可能原因 | 解决方案 |
| ---- | -------- | -------- |
| Worker 返回 403 | Header `X-Telegram-Bot-Api-Secret-Token` 与 `ENV_BOT_SECRET` 不匹配 | 确认填写一致，重新调用 `/registerWebhook` |
| Worker 返回 500 | 代码运行异常 | 查看 Cloudflare 日志，定位堆栈并修复 |
| 机器人无响应 | Webhook 未注册或已失效 | 重新访问 `/registerWebhook` 并确认 Telegram `setWebhook` 返回 `ok true` |

---

## 许可证

本项目基于 **MIT License** 发行，详情见 `LICENSE` 文件。
