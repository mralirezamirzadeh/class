// renderer/src/utils/numberUtils.js

// تبدیل اعداد انگلیسی به فارسی
export const toPersianDigits = (str) => {
    if (str === undefined || str === null) return '';
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    return String(str).replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
  };
  
  // تبدیل اعداد فارسی به انگلیسی (برای ذخیره در دیتابیس)
  export const toEnglishDigits = (str) => {
    if (str === undefined || str === null) return '';
    const persianDigitsRegex = /[۰-۹]/g;
    const map = {
      '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
      '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
    };
    return String(str).replace(persianDigitsRegex, (digit) => map[digit]);
  };