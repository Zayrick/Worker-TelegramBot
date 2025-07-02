/**
 * 干支与八字运算核心模块 (JavaScript 版)
 * 转换自 Python 版本，算法保持一致
 */

const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

export class GanZhi {
  // 阴历数据（用于月干支计算中的农历年份获取）
  static _LUNAR_MONTH_DAY = [
    0x4AE0, 0xA570, 0x5268, 0xD260, 0xD950, 0x6AA8, 0x56A0, 0x9AD0, 0x4AE8, 0x4AE0,
    0xA4D8, 0xA4D0, 0xD250, 0xD548, 0xB550, 0x56A0, 0x96D0, 0x95B0, 0x49B8, 0x49B0,
    0xA4B0, 0xB258, 0x6A50, 0x6D40, 0xADA8, 0x2B60, 0x9570, 0x4978, 0x4970, 0x64B0,
    0xD4A0, 0xEA50, 0x6D48, 0x5AD0, 0x2B60, 0x9370, 0x92E0, 0xC968, 0xC950, 0xD4A0,
    0xDA50, 0xB550, 0x56A0, 0xAAD8, 0x25D0, 0x92D0, 0xC958, 0xA950, 0xB4A8, 0x6CA0,
    0xB550, 0x55A8, 0x4DA0, 0xA5B0, 0x52B8, 0x52B0, 0xA950, 0xE950, 0x6AA0, 0xAD50,
    0xAB50, 0x4B60, 0xA570, 0xA570, 0x5260, 0xE930, 0xD950, 0x5AA8, 0x56A0, 0x96D0,
    0x4AE8, 0x4AD0, 0xA4D0, 0xD268, 0xD250, 0xD528, 0xB540, 0xB6A0, 0x96D0, 0x95B0,
    0x49B0, 0xA4B8, 0xA4B0, 0xB258, 0x6A50, 0x6D40, 0xADA0, 0xAB60, 0x9370, 0x4978,
    0x4970, 0x64B0, 0x6A50, 0xEA50, 0x6B28, 0x5AC0, 0xAB60, 0x9368, 0x92E0, 0xC960,
    0xD4A8, 0xD4A0, 0xDA50, 0x5AA8, 0x56A0, 0xAAD8, 0x25D0, 0x92D0, 0xC958, 0xA950,
    0xB4A0, 0xB550, 0xB550, 0x55A8, 0x4BA0, 0xA5B0, 0x52B8, 0x52B0, 0xA930, 0x74A8,
    0x6AA0, 0xAD50, 0x4DA8, 0x4B60, 0x9570, 0xA4E0, 0xD260, 0xE930, 0xD530, 0x5AA0,
    0x6B50, 0x96D0, 0x4AE8, 0x4AD0, 0xA4D0, 0xD258, 0xD250, 0xD520, 0xDAA0, 0xB5A0,
    0x56D0, 0x4AD8, 0x49B0, 0xA4B8, 0xA4B0, 0xAA50, 0xB528, 0x6D20, 0xADA0, 0x55B0,
  ];

  // 闰月数据
  static _LUNAR_MONTH = [
    0x00, 0x50, 0x04, 0x00, 0x20,
    0x60, 0x05, 0x00, 0x20, 0x70,
    0x05, 0x00, 0x40, 0x02, 0x06,
    0x00, 0x50, 0x03, 0x07, 0x00,
    0x60, 0x04, 0x00, 0x20, 0x70,
    0x05, 0x00, 0x30, 0x80, 0x06,
    0x00, 0x40, 0x03, 0x07, 0x00,
    0x50, 0x04, 0x08, 0x00, 0x60,
    0x04, 0x0A, 0x00, 0x60, 0x05,
    0x00, 0x30, 0x80, 0x05, 0x00,
    0x40, 0x02, 0x07, 0x00, 0x50,
    0x04, 0x09, 0x00, 0x60, 0x04,
    0x00, 0x20, 0x60, 0x05, 0x00,
    0x30, 0xB0, 0x06, 0x00, 0x50,
    0x02, 0x07, 0x00, 0x50, 0x03,
  ];

  static START_YEAR = 1901;

  // 节气相关
  static _JIE = "小寒大寒立春雨水惊蛰春分清明谷雨立夏小满芒种夏至小暑大暑立秋处暑白露秋分寒露霜降立冬小雪大雪冬至";
  static _JIE_QI_ODD = "立春惊蛰清明立夏芒种小暑立秋白露寒露立冬大雪小寒";
  static _JIE_QI_MONTH = {
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

  constructor(date = null) {
    this.localtime = date || new Date();
    this._gz_year_value = "";
  }

  // 干支纪年
  gzYear() {
    const year = this.lnYear() - 3 - 1;
    const g = year % 10;
    const z = year % 12;
    this._gz_year_value = GAN[g] + ZHI[z];
    return this._gz_year_value;
  }

  // 干支纪月
  gzMonth() {
    const ct = this.localtime;
    const jieQi = this.lnJie();
    const nlMonthVal = this.lnMonth();

    let nlYear = "";
    let nlMonth = 0;

    if (jieQi && GanZhi._JIE_QI_ODD.includes(jieQi)) {
      if (GanZhi._JIE_QI_MONTH[jieQi][0] === 0 && nlMonthVal === 12) {
        const year = this.lnYear() - 3;
        const g = year % 10;
        const z = year % 12;
        nlYear = GAN[g] + ZHI[z];
        nlMonth = 0;
      } else {
        nlYear = this._gz_year_value;
        nlMonth = GanZhi._JIE_QI_MONTH[jieQi][0];
      }
    } else {
      nlYear = this._gz_year_value;
      nlMonth = 0;
      for (let i = -1; i >= -40; i--) {
        const varDays = new Date(ct.getTime() + i * 24 * 60 * 60 * 1000);
        const jieQiCheck = this.nlJie(varDays);
        if (jieQiCheck && GanZhi._JIE_QI_ODD.includes(jieQiCheck)) {
          const idx = GanZhi._JIE_QI_MONTH[jieQiCheck][0];
          if (idx > 0) {
            nlMonth = idx;
          } else if (idx === 0 && nlMonthVal === 12) {
            const year = this.lnYear() - 3;
            const g = year % 10;
            const z = year % 12;
            nlYear = GAN[g] + ZHI[z];
            nlMonth = 0;
          } else {
            nlMonth = 0;
          }
          break;
        }
      }
    }

    const ganStr = GAN.join("");
    const monthNum = (ganStr.indexOf(nlYear[0]) + 1) * 2 + nlMonth + 1;
    const m = monthNum % 10 || 10;

    // 确定地支
    let monthZhi = "寅";
    for (const [jieName, [monthIndex, zhiVal]] of Object.entries(GanZhi._JIE_QI_MONTH)) {
      if (monthIndex === nlMonth) {
        monthZhi = zhiVal;
        break;
      }
    }

    return GAN[m - 1] + monthZhi;
  }

  // 干支纪日
  gzDay() {
    const ct = this.localtime;
    const C = Math.floor(ct.getFullYear() / 100);
    let y = ct.getFullYear() % 100;
    if (ct.getMonth() + 1 <= 2) {
      y -= 1;
    }
    let M = ct.getMonth() + 1;
    if (M <= 2) {
      M += 12;
    }
    const d = ct.getDate();
    const iVal = (ct.getMonth() + 1) % 2 === 1 ? 0 : 6;

    const g = (4 * C + Math.floor(C / 4) + 5 * y + Math.floor(y / 4) + Math.floor(3 * (M + 1) / 5) + d - 3 - 1) % 10;
    const z = (8 * C + Math.floor(C / 4) + 5 * y + Math.floor(y / 4) + Math.floor(3 * (M + 1) / 5) + d + 7 + iVal - 1) % 12;
    return GAN[g] + ZHI[z];
  }

  // 干支纪时
  gzHour() {
    const ct = this.localtime;
    const Z = Math.round(ct.getHours() / 2 + 0.1) % 12;
    const gzDayValue = this.gzDay();
    const gzDayNum = GAN.indexOf(gzDayValue[0]) + 1;
    const gzDayYu = gzDayNum % 5 || 5;
    const hourNum = Z + 1;
    const gzHourNum = (gzDayYu * 2 - 1 + hourNum - 1) % 10 || 10;
    return GAN[gzHourNum - 1] + ZHI[Z];
  }

  // 农历年
  lnYear() {
    return this._lnDate()[0];
  }

  // 农历月
  lnMonth() {
    return this._lnDate()[1];
  }

  // 计算农历日期
  _lnDate() {
    let deltaDays = this._dateDiff();

    if (deltaDays < 49) {
      const year = GanZhi.START_YEAR - 1;
      if (deltaDays < 19) {
        return [year, 11, 11 + deltaDays];
      }
      return [year, 12, deltaDays - 18];
    }

    deltaDays -= 49;
    let year = GanZhi.START_YEAR;
    let month = 1;
    let day = 1;

    let tmp = this._lunarYearDays(year);
    while (deltaDays >= tmp) {
      deltaDays -= tmp;
      year += 1;
      tmp = this._lunarYearDays(year);
    }

    let [foo, tmp2] = this._lunarMonthDays(year, month);
    while (deltaDays >= tmp2) {
      deltaDays -= tmp2;
      if (month === this._getLeapMonth(year)) {
        [tmp2, foo] = this._lunarMonthDays(year, month);
        if (deltaDays < tmp2) {
          return [0, 0, 0];
        }
        deltaDays -= tmp2;
      }
      month += 1;
      [foo, tmp2] = this._lunarMonthDays(year, month);
    }

    day += deltaDays;
    return [year, month, day];
  }

  // 获取节气
  lnJie() {
    const ct = this.localtime;
    const year = ct.getFullYear();
    for (let i = 0; i < 24; i++) {
      const delta = this._julianDay() - this._julianDayOfLnJie(year, i);
      if (delta >= -0.5 && delta <= 0.5) {
        return GanZhi._JIE.substring(i * 2, (i + 1) * 2);
      }
    }
    return "";
  }

  // 获取指定日期的节气
  nlJie(dt) {
    const year = dt.getFullYear();
    for (let i = 0; i < 24; i++) {
      const delta = this._rulianDay(dt) - this._julianDayOfLnJie(year, i);
      if (delta >= -0.5 && delta <= 0.5) {
        return GanZhi._JIE.substring(i * 2, (i + 1) * 2);
      }
    }
    return "";
  }

  // 私有方法
  _dateDiff() {
    const baseDate = new Date(1901, 0, 1);
    return Math.floor((this.localtime - baseDate) / (24 * 60 * 60 * 1000));
  }

  _getLeapMonth(lunarYear) {
    const flag = GanZhi._LUNAR_MONTH[Math.floor((lunarYear - GanZhi.START_YEAR) / 2)];
    return ((lunarYear - GanZhi.START_YEAR) % 2) ? (flag & 0x0F) : (flag >> 4);
  }

  _lunarMonthDays(lunarYear, lunarMonth) {
    if (lunarYear < GanZhi.START_YEAR) {
      return [0, 30];
    }
    let high = 0;
    let low = 29;
    let iBit = 16 - lunarMonth;
    const leapMonth = this._getLeapMonth(lunarYear);
    if (lunarMonth > leapMonth && leapMonth) {
      iBit -= 1;
    }
    if (GanZhi._LUNAR_MONTH_DAY[lunarYear - GanZhi.START_YEAR] & (1 << iBit)) {
      low += 1;
    }
    if (lunarMonth === leapMonth) {
      if (GanZhi._LUNAR_MONTH_DAY[lunarYear - GanZhi.START_YEAR] & (1 << (iBit - 1))) {
        high = 30;
      } else {
        high = 29;
      }
    }
    return [high, low];
  }

  _lunarYearDays(year) {
    let days = 0;
    for (let i = 1; i <= 12; i++) {
      const [high, low] = this._lunarMonthDays(year, i);
      days += high + low;
    }
    return days;
  }

  _julianDay() {
    const ct = this.localtime;
    let year = ct.getFullYear();
    let month = ct.getMonth() + 1;
    const day = ct.getDate();
    if (month <= 2) {
      year -= 1;
      month += 12;
    }
    let B = Math.floor(year / 100);
    B = 2 - B + Math.floor(year / 400);
    const dd = day + 0.5000115740;
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.60001 * (month + 1)) + dd + B - 1524.5;
  }

  _rulianDay(dt) {
    let year = dt.getFullYear();
    let month = dt.getMonth() + 1;
    const day = dt.getDate();
    if (month <= 2) {
      year -= 1;
      month += 12;
    }
    let B = Math.floor(year / 100);
    B = 2 - B + Math.floor(year / 400);
    const dd = day + 0.5000115740;
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.60001 * (month + 1)) + dd + B - 1524.5;
  }

  _julianDayOfLnJie(year, st) {
    if (st < 0 || st > 24) {
      return 0.0;
    }
    const sStAccInfo = [
      0.00, 1272494.40, 2548020.60, 3830143.80, 5120226.60, 6420865.80,
      7732018.80, 9055272.60, 10388958.00, 11733065.40, 13084292.40, 14441592.00,
      15800560.80, 17159347.20, 18513766.20, 19862002.20, 21201005.40, 22529659.80,
      23846845.20, 25152606.00, 26447687.40, 27733451.40, 29011921.20, 30285477.60,
    ];
    const base1900SlightColdJd = 2415025.5868055555;
    const stJd = 365.24219878 * (year - 1900) + sStAccInfo[st] / 86400.0;
    return base1900SlightColdJd + stJd;
  }
}
