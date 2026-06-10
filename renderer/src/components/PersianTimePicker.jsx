// renderer/src/components/PersianTimePicker.jsx
import React, { useState, useRef, useEffect } from 'react';
import { toPersianDigits, toEnglishDigits } from '../utils/numberUtils';

const PersianTimePicker = ({ value, onChange, placeholder = 'ساعت' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const parseTime = (timeStr) => {
    if (!timeStr) return { hour: '', minute: '' };
    const parts = timeStr.split(':');
    return { hour: parts[0] || '', minute: parts[1] || '' };
  };

  const { hour: hourEng, minute: minuteEng } = parseTime(value);
  const hourFa = hourEng ? toPersianDigits(hourEng) : '';
  const minuteFa = minuteEng ? toPersianDigits(minuteEng) : '';

  const handleHourChange = (e) => {
    const h = e.target.value;
    if (h === '' || (parseInt(h) >= 0 && parseInt(h) <= 23)) {
      const newTime = `${h.padStart(2, '0')}:${minuteEng.padStart(2, '0') || '00'}`;
      onChange(newTime);
    }
  };

  const handleMinuteChange = (e) => {
    const m = e.target.value;
    if (m === '' || (parseInt(m) >= 0 && parseInt(m) <= 59)) {
      const newTime = `${hourEng.padStart(2, '0') || '00'}:${m.padStart(2, '0')}`;
      onChange(newTime);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={hourFa ? `${hourFa}:${minuteFa}` : ''}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        readOnly
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid var(--border-color, #ddd)',
          borderRadius: '8px',
          cursor: 'pointer',
          backgroundColor: 'var(--input-bg, white)',
          color: 'var(--input-text, #333)',
          fontFamily: 'inherit',
          textAlign: 'center'
        }}
      />
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            zIndex: 1000,
            backgroundColor: 'var(--popup-bg, white)',
            border: '1px solid var(--border-color, #ccc)',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            gap: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            marginTop: '4px'
          }}
        >
          <select
            value={hourEng}
            onChange={handleHourChange}
            style={{
              padding: '5px',
              borderRadius: '4px',
              backgroundColor: 'var(--select-bg, white)',
              color: 'var(--select-text, #333)',
              border: '1px solid var(--border-color, #ccc)'
            }}
          >
            <option value="">ساعت</option>
            {hours.map(h => <option key={h} value={h}>{toPersianDigits(h)}</option>)}
          </select>
          <span style={{ fontSize: '1.2rem', color: 'var(--text-color, #333)' }}>:</span>
          <select
            value={minuteEng}
            onChange={handleMinuteChange}
            style={{
              padding: '5px',
              borderRadius: '4px',
              backgroundColor: 'var(--select-bg, white)',
              color: 'var(--select-text, #333)',
              border: '1px solid var(--border-color, #ccc)'
            }}
          >
            <option value="">دقیقه</option>
            {minutes.map(m => <option key={m} value={m}>{toPersianDigits(m)}</option>)}
          </select>
        </div>
        
      )}
    </div>
  );
};

export default PersianTimePicker;