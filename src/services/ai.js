import { AI_API_ENDPOINT, AI_API_KEY, AI_MODEL_NAME, AI_SYSTEM_PROMPT } from '../config.js'

// 调用 AI 聊天接口
// messages 参数可以是字符串，也可以是形如 [{ role: 'user', content: '...' }, ...] 的数组。
// 这样可在一次调用中按需插入多条用户角色内容。
export async function callAI (messages) {
  // 如果传入的是字符串，则转换为包含单条用户内容的数组
  const userMessages = Array.isArray(messages)
    ? messages
    : [{ role: 'user', content: messages }]

  const payload = {
    model: AI_MODEL_NAME,
    messages: [
      { role: 'system', content: AI_SYSTEM_PROMPT },
      ...userMessages
    ],
    stream: false
  }

  const response = await fetch(AI_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    return '抱歉，AI 服务暂时不可用，请稍后再试。'
  }

  const data = await response.json()
  if (data.choices?.length && data.choices[0].message) {
    return `<blockquote>${data.choices[0].message.content.trim()}</blockquote>`
  }
  return '抱歉，AI 未能给出有效回复。'
}
