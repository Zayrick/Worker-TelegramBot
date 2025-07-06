/**
 * Cloudflare Worker Telegram 占卜机器人入口。
 * 仅负责将请求委托给 router。
 */

import { handleRequest } from './router.js'

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
}) 