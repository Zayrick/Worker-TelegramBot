/**
 * @file ganzhi.js
 * @brief 干支与八字运算核心模块。
 *        提供天干地支常量、GanZhi 类，以及年/月/日/时柱计算工具函数。
 * @details 该模块从原 functions/divination.js 中抽离而来，用于降低单文件复杂度，
 *          满足企业级代码规范，对外暴露易于复用的 API。
 *
 * @author AI
 * @date 2025-06-16
 */

// **************************** 常量定义 ****************************
/** 天干数组 */
export const GAN = [
    "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"
  ];
  /** 地支数组 */
  export const ZHI = [
    "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"
  ];
  
  // **************************** 干支计算类 ****************************
  /**
   * @class GanZhi
   * @brief 干支计算核心类，提供年、月、日、时柱推算。
   * @note 该实现与原 Python 版 (2.py) 完全一致，已按 JS 语法调整。
   */
  export class GanZhi {
    /**
     * @param {Date|null} [date=null] – 参与计算的公历时间，默认取当前时间。
     */
    constructor(date = null) {
      /**
       * @brief 阴历数据（用于月干支计算中的农历年份获取）。
       * @private
       */
      this.gLunarMonthDay = [
        0x4ae0, 0xa570, 0x5268, 0xd260, 0xd950, 0x6aa8, 0x56a0, 0x9ad0, 0x4ae8, 0x4ae0,  // 1910
        0xa4d8, 0xa4d0, 0xd250, 0xd548, 0xb550, 0x56a0, 0x96d0, 0x95b0, 0x49b8, 0x49b0,  // 1920
        0xa4b0, 0xb258, 0x6a50, 0x6d40, 0xada8, 0x2b60, 0x9570, 0x4978, 0x4970, 0x64b0,  // 1930
        0xd4a0, 0xea50, 0x6d48, 0x5ad0, 0x2b60, 0x9370, 0x92e0, 0xc968, 0xc950, 0xd4a0,  // 1940
        0xda50, 0xb550, 0x56a0, 0xaad8, 0x25d0, 0x92d0, 0xc958, 0xa950, 0xb4a8, 0x6ca0,  // 1950
        0xb550, 0x55a8, 0x4da0, 0xa5b0, 0x52b8, 0x52b0, 0xa950, 0xe950, 0x6aa0, 0xad50,  // 1960
        0xab50, 0x4b60, 0xa570, 0xa570, 0x5260, 0xe930, 0xd950, 0x5aa8, 0x56a0, 0x96d0,  // 1970
        0x4ae8, 0x4ad0, 0xa4d0, 0xd268, 0xd250, 0xd528, 0xb540, 0xb6a0, 0x96d0, 0x95b0,  // 1980
        0x49b0, 0xa4b8, 0xa4b0, 0xb258, 0x6a50, 0x6d40, 0xada0, 0xab60, 0x9370, 0x4978,  // 1990
        0x4970, 0x64b0, 0x6a50, 0xea50, 0x6b28, 0x5ac0, 0xab60, 0x9368, 0x92e0, 0xc960,  // 2000
        0xd4a8, 0xd4a0, 0xda50, 0x5aa8, 0x56a0, 0xaad8, 0x25d0, 0x92d0, 0xc958, 0xa950,  // 2010
        0xb4a0, 0xb550, 0xb550, 0x55a8, 0x4ba0, 0xa5b0, 0x52b8, 0x52b0, 0xa930, 0x74a8,  // 2020
        0x6aa0, 0xad50, 0x4da8, 0x4b60, 0x9570, 0xa4e0, 0xd260, 0xe930, 0xd530, 0x5aa0,  // 2030
        0x6b50, 0x96d0, 0x4ae8, 0x4ad0, 0xa4d0, 0xd258, 0xd250, 0xd520, 0xdaa0, 0xb5a0,  // 2040
        0x56d0, 0x4ad8, 0x49b0, 0xa4b8, 0xa4b0, 0xaa50, 0xb528, 0x6d20, 0xada0, 0x55b0,  // 2050
      ];
  
      /**
       * @brief 闰月数据 (节选)。
       * @private
       */
      this.gLunarMonth = [
        0x00, 0x50, 0x04, 0x00, 0x20,  // 1910
        0x60, 0x05, 0x00, 0x20, 0x70,  // 1920
        0x05, 0x00, 0x40, 0x02, 0x06,  // 1930
        0x00, 0x50, 0x03, 0x07, 0x00,  // 1940
        0x60, 0x04, 0x00, 0x20, 0x70,  // 1950
        0x05, 0x00, 0x30, 0x80, 0x06,  // 1960
        0x00, 0x40, 0x03, 0x07, 0x00,  // 1970
        0x50, 0x04, 0x08, 0x00, 0x60,  // 1980
        0x04, 0x0a, 0x00, 0x60, 0x05,  // 1990
        0x00, 0x30, 0x80, 0x05, 0x00,  // 2000
        0x40, 0x02, 0x07, 0x00, 0x50,  // 2010
        0x04, 0x09, 0x00, 0x60, 0x04,  // 2020
        0x00, 0x20, 0x60, 0x05, 0x00,  // 2030
        0x30, 0xb0, 0x06, 0x00, 0x50,  // 2040
        0x02, 0x07, 0x00, 0x50, 0x03   // 2050
      ];
  
      /** 起始年份 (公历) */
      this.START_YEAR = 1901;
  
      // 节气
      this.jie = '小寒大寒立春雨水惊蛰春分清明谷雨立夏小满芒种夏至小暑大暑立秋处暑白露秋分寒露霜降立冬小雪大雪冬至';
      // 用于节气划分农历干支月
      this.jieQiOdd = "立春惊蛰清明立夏芒种小暑立秋白露寒露立冬大雪小寒";
      // 节气对应农历干支月
      this.jieQiMonth = {
        "立春": [0, "寅"],
        "惊蛰": [1, "卯"],
        "清明": [2, "辰"],
        "立夏": [3, "巳"],
        "芒种": [4, "午"],
        "小暑": [5, "未"],
        "立秋": [6, "申"],
        "白露": [7, "酉"],
        "寒露": [8, "戌"],
        "立冬": [9, "亥"],
        "大雪": [10, "子"],
        "小寒": [11, "丑"],
      };
  
      /** 业务使用的本地时间 */
      this.localtime = date || new Date();
      /**@private*/
      this.gzYearValue = "";
    }
  
    // ==================== 公有方法 ====================
    /**
     * @brief 计算干支纪年。
     * @return {string} 结果示例："甲子"。
     */
    gzYear() {
      const year = this.lnYear() - 3 - 1;  // 农历年份减 3（补减 1）
      const G = year % 10;                // 天干序号
      const Z = year % 12;                // 地支序号
      this.gzYearValue = GAN[G] + ZHI[Z];
      return this.gzYearValue;
    }
  
    /**
     * @brief 计算干支纪月。
     * @return {string} 结果示例："丙寅"。
     */
    gzMonth() {
      const ct = this.localtime;
      const jieQi = this.lnJie();
      const nlMonthVal = this.lnMonth();
  
      let nlYear = "";
      let nlMonth = 0;
  
      if (jieQi.length > 0 && this.jieQiOdd.includes(jieQi)) {  // 若当日恰为节气
        if (this.jieQiMonth[jieQi][0] === 0 && nlMonthVal === 12) {
          const year = this.lnYear() - 3;  // 腊月且已立春，年 +1
          const G = year % 10;
          const Z = year % 12;
          nlYear = GAN[G] + ZHI[Z];
          nlMonth = 0;
        } else {
          nlYear = this.gzYearValue;
          nlMonth = this.jieQiMonth[jieQi][0];
        }
      } else {  // 非节气日，回溯分月节气
        nlYear = this.gzYearValue;
        nlMonth = 0;
        for (let i = -1; i >= -40; i--) {
          const varDays = new Date(ct.getTime() + i * 24 * 60 * 60 * 1000);
          const jieQiCheck = this.nlJie(varDays);
          if (jieQiCheck.length > 0 && this.jieQiOdd.includes(jieQiCheck)) {
            if (this.jieQiMonth[jieQiCheck][0] > 0) {
              nlMonth = this.jieQiMonth[jieQiCheck][0];
            } else if (this.jieQiMonth[jieQiCheck][0] === 0 && nlMonthVal === 12) {
              const year = this.lnYear() - 3;
              const G = year % 10;
              const Z = year % 12;
              nlYear = GAN[G] + ZHI[Z];
              nlMonth = 0;
            } else {
              nlMonth = 0;
            }
            break;
          }
        }
      }
  
      const ganStr = GAN.join('');
      const monthNum = (ganStr.indexOf(nlYear[0]) + 1) * 2 + nlMonth + 1;
      let M = monthNum % 10;
      if (M === 0) M = 10;
  
      // 查找对应地支
      let monthZhi = "寅"; // 默认寅月（立春）
      for (const [jieQiName, [monthIndex, zhi]] of Object.entries(this.jieQiMonth)) {
        if (monthIndex === nlMonth) {
          monthZhi = zhi;
          break;
        }
      }
      return GAN[M - 1] + monthZhi;
    }
  
    /**
     * @brief 计算干支纪日。
     * @return {string} 结果示例："戊申"。
     */
    gzDay() {
      const ct = this.localtime;
      const C = Math.floor(ct.getFullYear() / 100);      // 世纪数
      let y = ct.getFullYear() % 100;                    // 年份后两位
      y = (ct.getMonth() <= 1) ? y - 1 : y;
      let M = ct.getMonth() + 1;                         // 月份 (1-12)
      M = (ct.getMonth() <= 1) ? M + 12 : M;
      const d = ct.getDate();                            // 日
      const i = (ct.getMonth() + 1) % 2 === 1 ? 0 : 6;   // 奇偶月修正值
  
      // 天干
      let G = 4 * C + Math.floor(C / 4) + 5 * y + Math.floor(y / 4) + Math.floor(3 * (M + 1) / 5) + d - 3 - 1;
      G %= 10;
      // 地支
      let Z = 8 * C + Math.floor(C / 4) + 5 * y + Math.floor(y / 4) + Math.floor(3 * (M + 1) / 5) + d + 7 + i - 1;
      Z %= 12;
      return GAN[G] + ZHI[Z];
    }
  
    /**
     * @brief 计算干支纪时（时柱）。
     * @return {string} 结果示例："壬子"。
     */
    gzHour() {
      const ct = this.localtime;
      // 地支序号
      const Z = Math.round((ct.getHours() / 2) + 0.1) % 12;
      // 依赖日干序号计算天干
      const gzDayValue = this.gzDay();
      const gzDayNum = GAN.indexOf(gzDayValue[0]) + 1;
      let gzDayYu = gzDayNum % 5;
      const hourNum = Z + 1;
      if (gzDayYu === 0) gzDayYu = 5;
      let gzHourNum = (gzDayYu * 2 - 1 + hourNum - 1) % 10;
      if (gzHourNum === 0) gzHourNum = 10;
      return GAN[gzHourNum - 1] + ZHI[Z];
    }
  
    // ==================== 辅助公有方法 ====================
  
    /**
     * @brief 获取农历年份。
     * @return {number}
     */
    lnYear() { return this.lnDate()[0]; }
  
    /**
     * @brief 获取农历月份。
     * @return {number}
     */
    lnMonth() { return this.lnDate()[1]; }
  
    /**
     * @brief 获取农历日期数组 [年, 月, 日]。
     * @return {number[]}
     */
    lnDate() {
      let deltaDays = this.dateDiff();
  
      // 阳历 1901/02/19 => 阴历 1901/01/01；期间天数 49
      if (deltaDays < 49) {
        const year = this.START_YEAR - 1;
        if (deltaDays < 19) {
          return [year, 11, 11 + deltaDays];
        }
        return [year, 12, deltaDays - 18];
      }
  
      // 从 1901 阴历正月初一开始计算
      deltaDays -= 49;
      let year = this.START_YEAR;
      let month = 1;
      let day = 1;
  
      // 计算年份
      let tmp = this.lunarYearDays(year);
      while (deltaDays >= tmp) {
        deltaDays -= tmp;
        year += 1;
        tmp = this.lunarYearDays(year);
      }
  
      // 计算月份
      let [foo, tmp2] = this.lunarMonthDays(year, month);
      while (deltaDays >= tmp2) {
        deltaDays -= tmp2;
        if (month === this.getLeapMonth(year)) {
          [tmp2, foo] = this.lunarMonthDays(year, month);
          if (deltaDays < tmp2) return [0, 0, 0];
          deltaDays -= tmp2;
        }
        month += 1;
        [foo, tmp2] = this.lunarMonthDays(year, month);
      }
  
      // 计算日
      day += deltaDays;
      return [year, month, day];
    }
  
    /**
     * @brief 获取当前日期所在节气。
     * @return {string}
     */
    lnJie() {
      const ct = this.localtime;
      const year = ct.getFullYear();
      for (let i = 0; i < 24; i++) {
        const delta = this.julianDay() - this.julianDayOfLnJie(year, i);
        if (delta >= -0.5 && delta <= 0.5) {
          return this.jie.slice(i * 2, (i + 1) * 2);
        }
      }
      return '';
    }
  
    /**
     * @brief 获取指定日期所在节气。
     * @param {Date} dt
     * @return {string}
     */
    nlJie(dt) {
      const year = dt.getFullYear();
      for (let i = 0; i < 24; i++) {
        const delta = this.rulianDay(dt) - this.julianDayOfLnJie(year, i);
        if (delta >= -0.5 && delta <= 0.5) {
          return this.jie.slice(i * 2, (i + 1) * 2);
        }
      }
      return '';
    }
  
    // ==================== 私有方法 ====================
    /** 计算与 1901/01/01 的天数差 */
    dateDiff() {
      const baseDate = new Date(1901, 0, 1);
      return Math.floor((this.localtime - baseDate) / 86400000);
    }
  
    /**
     * 获取指定农历年份的闰月
     * @private
     */
    getLeapMonth(lunarYear) {
      const flag = this.gLunarMonth[Math.floor((lunarYear - this.START_YEAR) / 2)];
      return ((lunarYear - this.START_YEAR) % 2) ? (flag & 0x0f) : (flag >> 4);
    }
  
    /** 计算农历月份天数 */
    lunarMonthDays(lunarYear, lunarMonth) {
      if (lunarYear < this.START_YEAR) return [0, 30];
  
      let high = 0;
      let low = 29;
      let iBit = 16 - lunarMonth;
  
      if (lunarMonth > this.getLeapMonth(lunarYear) && this.getLeapMonth(lunarYear)) {
        iBit -= 1;
      }
  
      if (this.gLunarMonthDay[lunarYear - this.START_YEAR] & (1 << iBit)) {
        low += 1;
      }
  
      if (lunarMonth === this.getLeapMonth(lunarYear)) {
        if (this.gLunarMonthDay[lunarYear - this.START_YEAR] & (1 << (iBit - 1))) {
          high = 30;
        } else {
          high = 29;
        }
      }
      return [high, low];
    }
  
    /** 计算农历年总天数 */
    lunarYearDays(year) {
      let days = 0;
      for (let i = 1; i <= 12; i++) {
        const [high, low] = this.lunarMonthDays(year, i);
        days += high + low;
      }
      return days;
    }
  
    /** 计算当前日期儒略日 */
    julianDay() {
      const ct = this.localtime;
      let year = ct.getFullYear();
      let month = ct.getMonth() + 1;
      const day = ct.getDate();
      if (month <= 2) { month += 12; year -= 1; }
      let B = Math.floor(year / 100);
      B = 2 - B + Math.floor(year / 400);
      const dd = day + 0.5000115740;
      return Math.floor(365.25 * (year + 4716) + 0.01) + Math.floor(30.60001 * (month + 1)) + dd + B - 1524.5;
    }
  
    /** 计算指定日期儒略日 */
    rulianDay(dt) {
      let year = dt.getFullYear();
      let month = dt.getMonth() + 1;
      const day = dt.getDate();
      if (month <= 2) { month += 12; year -= 1; }
      let B = Math.floor(year / 100);
      B = 2 - B + Math.floor(year / 400);
      const dd = day + 0.5000115740;
      return Math.floor(365.25 * (year + 4716) + 0.01) + Math.floor(30.60001 * (month + 1)) + dd + B - 1524.5;
    }
  
    /** 计算指定节气的儒略日 */
    julianDayOfLnJie(year, st) {
      if (st < 0 || st > 24) return 0.0;
      const sStAccInfo = [
        0.00, 1272494.40, 2548020.60, 3830143.80, 5120226.60, 6420865.80,
        7732018.80, 9055272.60, 10388958.00, 11733065.40, 13084292.40, 14441592.00,
        15800560.80, 17159347.20, 18513766.20, 19862002.20, 21201005.40, 22529659.80,
        23846845.20, 25152606.00, 26447687.40, 27733451.40, 29011921.20, 30285477.60
      ];
      const base1900SlightColdJD = 2415025.5868055555;
      const stJd = 365.24219878 * (year - 1900) + sStAccInfo[st] / 86400.0;
      return base1900SlightColdJD + stJd;
    }
  } // GanZhi
  
  // **************************** 干支计算辅助函数 ****************************
  
  /**
   * @brief 高效计算并格式化完整的四柱八字。
   * @details 此函数仅创建一次 GanZhi 实例，并按正确顺序调用内部方法，
   *          返回格式化的完整八字字符串，取代原有的四个独立导出函数。
   * @param {Date} date - JS Date 对象。
   * @return {string} 格式化后的四柱八字，例如："甲子年 丙寅月 戊申日 壬子时"。
   */
  export function getFullBazi(date) {
    const gz = new GanZhi(date);
    const year = gz.gzYear();   // 必须先算年，为月柱计算提供依赖
    const month = gz.gzMonth();
    const day = gz.gzDay();     // 必须先算日，为时柱计算提供依赖
    const hour = gz.gzHour();
    return `${year}年 ${month}月 ${day}日 ${hour}时`;
  }
  