/**
 * 文本处理工具
 */

/**
 * 转义 HTML 特殊字符
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的文本
 */
export function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * 转义 Markdown V2 特殊字符
 * @param {string} text - 需要转义的文本
 * @param {string} exceptChars - 不需要转义的字符
 * @returns {string} 转义后的文本
 */
export function escapeMarkdownV2(text, exceptChars = '') {
  const specialChars = '_*[]()~`>#+-=|{}.!\\';
  const charsToEscape = specialChars.split('').filter(char => !exceptChars.includes(char));

  let result = text;
  for (const char of charsToEscape) {
    result = result.replace(new RegExp(`\\${char}`, 'g'), `\\${char}`);
  }

  return result;
}
