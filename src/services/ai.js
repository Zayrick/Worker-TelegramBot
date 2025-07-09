import { AI_API_ENDPOINT, AI_API_KEY, AI_MODEL_NAME, AI_SYSTEM_PROMPT } from '../config.js'

// 调用 AI 聊天接口
export async function callAI (userPrompt, referencedContent = null) {
  // 构造对话消息数组：始终包含系统提示词；当传入引用内容时，先附加引用内容，再附加占卜内容
  const messages = [
    { role: 'system', content: AI_SYSTEM_PROMPT }
  ]
  if (referencedContent) {
    messages.push({ role: 'user', content: referencedContent })
  }
  messages.push({ role: 'user', content: userPrompt })

  const payload = {
    model: AI_MODEL_NAME,
    messages,
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
