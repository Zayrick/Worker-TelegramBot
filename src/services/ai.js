import { AI_API_ENDPOINT, AI_API_KEY, AI_MODEL_NAME, AI_SYSTEM_PROMPT } from '../config.js'

// 调用 AI 聊天接口
export async function callAI (userMessages) {
  // 兼容单字符串与字符串数组两种调用方式
  const userMsgsArray = Array.isArray(userMessages) ? userMessages : [userMessages]

  const payload = {
    model: AI_MODEL_NAME,
    messages: [
      { role: 'system', content: AI_SYSTEM_PROMPT },
      ...userMsgsArray.map(content => ({ role: 'user', content }))
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
