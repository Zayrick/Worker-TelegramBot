/**
 * 小六壬卦象生成工具 (JavaScript 版)
 * 转换自 Python 版本
 */

const WORDS = ["大安", "留连", "速喜", "赤口", "小吉", "空亡"];

/**
 * 根据三个正整数生成卦象字符串
 * @param {number[]} numbers - 长度为 3 的正整数数组
 * @returns {string} 形如 "大安 小吉 空亡" 的卦象词组
 */
export function generateHexagram(numbers) {
  if (!Array.isArray(numbers) || numbers.length !== 3) {
    throw new Error("numbers 参数必须为长度为 3 的数组");
  }

  const firstIndex = numbers[0] % 6 || 6;
  const secondIndex = (numbers[0] + numbers[1] - 1) % 6 || 6;
  const thirdIndex = (numbers[0] + numbers[1] + numbers[2] - 2) % 6 || 6;

  return `${WORDS[firstIndex - 1]} ${WORDS[secondIndex - 1]} ${WORDS[thirdIndex - 1]}`;
}
