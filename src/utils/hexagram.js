/**
 * @file hexagram.js
 * @brief 小六壬卦象生成工具函数。
 * @details 根据三个输入数字推算"小六壬"卦象词组，算法来源于原 functions/divination.js。
 *
 * @author AI
 * @date 2025-06-16
 */

/**
 * @brief 根据三个数字生成卦象。
 * @param {number[]} numbers - 长度为 3 的正整数数组。
 * @return {string} 卦象词语组合（如 "大安 小吉 空亡"）。
 */
export function generateHexagram(numbers) {
  const words = ["大安", "留连", "速喜", "赤口", "小吉", "空亡"];
  if (!Array.isArray(numbers) || numbers.length !== 3) {
    throw new Error("numbers 参数必须为长度为 3 的数组");
  }
  // 第一爻
  const firstIndex = numbers[0] % 6 || 6;
  // 第二爻
  const secondIndex = (numbers[0] + numbers[1] - 1) % 6 || 6;
  // 第三爻
  const thirdIndex = (numbers[0] + numbers[1] + numbers[2] - 2) % 6 || 6;

  return `${words[firstIndex - 1]} ${words[secondIndex - 1]} ${words[thirdIndex - 1]}`;
} 