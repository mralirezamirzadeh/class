// renderer/src/components/PersianDatePicker.jsx
import React, { useMemo } from 'react';
import { PersianDatePicker as DP } from 'persian-date-kit';
import 'persian-date-kit/styles.css';
import moment from 'moment-jalaali';

moment.loadPersian({ dialect: 'persian-modern', usePersianDigits: false });

const monthLabels = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];
const weekdays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

const PersianDatePicker = ({ value, onChange, placeholder = 'انتخاب تاریخ',start = '1404-01-01' }) => {
  // تبدیل رشته شمسی (jYYYY-jMM-jDD) به Date میلادی برای کتابخانه
  const toGregorian = (jalaliStr) => {
    if (!jalaliStr) return null;
    const m = moment(jalaliStr, 'jYYYY-jMM-jDD');
    return m.isValid() ? m.toDate() : null;
  };

  // تبدیل Date میلادی به رشته شمسی برای ذخیره
  const toJalali = (gregorianDate) => {
    if (!gregorianDate) return '';
    return moment(gregorianDate).format('jYYYY-jMM-jDD');
  };

  // محدودیت سال‌ها (از ۱۴۰۴ تا ۱۴۳۰)
  const minDate = useMemo(() => moment(start, 'jYYYY-jMM-jDD').toDate(), []);
  const maxDate = useMemo(() => moment('1430-12-29', 'jYYYY-jMM-jDD').toDate(), []);
  console.log(minDate);
  

  const handleChange = (date) => {
    // date از نوع Date (میلادی) یا null است
    onChange(toJalali(date));
  };

  return (
    <DP
      className='w-full'
      value={toGregorian(value)}
      onChange={handleChange}
      placeholder={placeholder}
      minDate={minDate}
      maxDate={maxDate}
      monthLabels={monthLabels}
      weekdays={weekdays}
      mode="popover"
      theme="light"
      formatValue={(date) => moment(date).format('jYYYY/jMM/jDD')}
    />
  );
};

export default PersianDatePicker;