// PersianNumberInput.jsx
import React from 'react';
import { toPersianDigits, toEnglishDigits } from '../utils/numberUtils';

const PersianNumberInput = ({ value, onChange, placeholder, className, ...rest }) => {
  const handleChange = (e) => {
    const englishValue = toEnglishDigits(e.target.value);
    if (englishValue === '' || /^\d*$/.test(englishValue)) {
      onChange(englishValue);
    }
  };

  return (
    <input
      type="text"
      value={toPersianDigits(value)}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      {...rest}
    />
  );
};

export default PersianNumberInput;