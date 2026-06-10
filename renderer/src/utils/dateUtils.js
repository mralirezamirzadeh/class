// renderer/src/utils/dateUtils.js

import moment from 'moment-jalaali';

// تبدیل تاریخ شمسی (jYYYY-jMM-jDD) به نام روز هفته به فارسی
export const getWeekdayFromJalali = (jalaliDate) => {
  if (!jalaliDate) return '';
  const m = moment(jalaliDate, 'jYYYY-jMM-jDD');
  if (!m.isValid()) return '';
  // weekday در moment-jalaali: 0=شنبه؟ باید بررسی کنیم
  // در moment-jalaali روز 0 = شنبه (آزمایش کنید)
  const weekdays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  return weekdays[m.weekday()];
};


export const isLeapJalali = (year) => {
    return (year % 33 === 1 || year % 33 === 5 || year % 33 === 9 || year % 33 === 13 ||
            year % 33 === 17 || year % 33 === 22 || year % 33 === 26 || year % 33 === 30);
  };
  
  export const isValidJalaliDate = (dateStr) => {
    const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return false;
    const [_, year, month, day] = match;
    const y = parseInt(year), m = parseInt(month), d = parseInt(day);
    if (y < 1300 || y > 1500) return false;
    if (m < 1 || m > 12) return false;
    let maxDay;
    if (m <= 6) maxDay = 31;
    else if (m <= 11) maxDay = 30;
    else maxDay = isLeapJalali(y) ? 30 : 29;
    return (d >= 1 && d <= maxDay);
  };