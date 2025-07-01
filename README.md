# 基于 Cloudflare Worker 的 Telegram 机器人

> 一个零服务器成本、极速部署的 Telegram Bot 后端解决方案，仅依赖 Cloudflare Worker 与 Wrangler。

---

## 📑 目录

1. [项目简介](#项目简介)
2. [核心特性](#核心特性)
3. [快速开始](#快速开始)
4. [环境变量配置](#环境变量配置)
5. [本地开发与调试](#本地开发与调试)
6. [生产部署](#生产部署)
7. [命令与功能说明](#命令与功能说明)
8. [目录结构说明](#目录结构说明)
9. [单元测试](#单元测试)
10. [故障排查](#故障排查)
11. [许可证](#许可证)

---

## 项目简介

本项目旨在借助 **Cloudflare Worker** 的无服务器架构，为 Telegram Bot 提供一个高可用、低延迟且易于扩展的后端。相比传统的 VPS 部署方式，Worker 具备以下优势：

* **全球边缘节点**：请求自动就近接入，降低延迟。
* **按量计费**：大幅降低闲置资源浪费。
* **零服务器维护成本**：无需关注系统运维与安全更新。

当前版本简化为**单一机器人 + Worker 原生日志**，去除了多余的日志机器人，使整体架构更加清晰。

---

## 核心特性

| 功能 | 描述 |
| ---- | ---- |
| ☁️ Cloudflare Worker | 基于边缘计算的无服务器部署方案 |
| 🔒 安全访问密钥 | 使用机器人 `TOKEN` 的 `SHA-256` 哈希作为 Webhook 路由路径，防止恶意扫描 |
| 🛠️ 灵活命令系统 | 采用映射表方式管理命令，新增指令仅需在同一文件中注册 |
| ⏱️ 极速部署 | `wrangler publish` 一键上线，无需额外 CI/CD |
| 🧪 单元测试 | 使用 **Vitest** 对关键函数进行测试，确保稳定性 |

---

## 快速开始

> 以下指令均在 **PowerShell 7** 环境下测试通过，其他 Shell 请自行等价替换。

```powershell
# 1. 克隆仓库
git clone https://github.com/Zayrick/Worker-TelegramBot.git
cd Worker-TelegramBot

# 2. 安装依赖
npm ci  # 或 npm install

# 3. 配置环境变量（Wrangler 本地文件）
cp wrangler.example.toml wrangler.toml
# 编辑 wrangler.toml，填写 BOT_TOKEN / BOT_HOST_FQDN 等变量

# 4. 本地启动（默认 http://127.0.0.1:8787 ）
npx wrangler dev

# 5. 设置 Telegram Webhook（一次性操作）
# 访问下列 URL 即可完成：
# https://<BOT_HOST_FQDN>/<ACCESS_KEY>?command=setWebhook
```

> **注意**：`<ACCESS_KEY>` 为 `TOKEN` 的 `SHA-256` 哈希值，启动 Worker 后会在终端日志中输出访问链接，拷贝即可。

---

## 环境变量配置

| 变量名 | 必填 | 说明 |
| ------ | ---- | ---- |
| `ENV_BOT_TOKEN` | ✅ | Telegram 机器人 Token（从 @BotFather 获取） |
| `ENV_BOT_HOST_FQDN` | ✅ | Worker 公网可访问域名，需以 `/` 结尾 |

环境变量可通过两种方式填入：

1. **Wrangler Dashboard**：进入 **Worker → Settings → Variables**，添加对应键值。
2. **`wrangler.toml`**：在文件中新增 `vars` 节点，示例见 `wrangler.example.toml`。

---

## 本地开发与调试

```powershell
# Watch 模式下实时编译并刷新
npx wrangler dev --watch
```

调试技巧：

* 使用 `console.log()` 直接在 Cloudflare DevTools 或本地终端查看日志。
* Worker 内部抛出的异常会在终端中高亮显示，便于快速定位问题。

---

## 生产部署

```powershell
# 一键发布到 Cloudflare
npx wrangler publish
```

发布完成后，登录 Cloudflare Dashboard 可查看到新版脚本与日志。

---

## 命令与功能说明

| 命令 | 参数 | 示例 | 功能描述 |
| ---- | ---- | ---- | -------- |
| `/ping` | `[text]` | `/ping Hello` | 无参返回 `pong`；有参原样回传文本 |
| `/toss` | 无 | `/toss` | 随机抛硬币，返回 `正面` 或 `反面` |
| `/chatInfo` | 无 | `/chatInfo` | 以 JSON 形式返回当前聊天信息 |

---

## 目录结构说明

```text
telegram-worker-bot/
├─ src/               # 主源码目录
│  └─ index.js        # Worker 入口 & 机器人逻辑
├─ test/              # Vitest 单元测试
├─ wrangler.jsonc     # Wrangler 配置（JSONC 格式）
├─ package.json       # 项目依赖与脚本
└─ README.md          # 项目说明文档
```

---

## 单元测试

使用 **Vitest** 进行测试：

```powershell
npm run test   # 等价于 npx vitest run
```

测试文件位于 `test/` 目录，可根据业务需求自行扩充覆盖率。

---

## 故障排查

| 现象 | 可能原因 | 处理建议 |
| ---- | -------- | -------- |
| `403 Invalid access key` | Webhook 路径不正确 | 确认已使用终端日志输出的 **访问链接** 设置 Webhook |
| `500 Internal Error` | 代码运行异常 | 查看 Cloudflare Worker 日志，参考堆栈信息修复 |
| 机器人无响应 | Worker 未部署或 Webhook 未正确设置 | 确认 `wrangler publish` 成功且 Telegram Webhook 指向正确 |

---

## 许可证

本项目采用 **MIT License**，详见 `LICENSE` 文件。
