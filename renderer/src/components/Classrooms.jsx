// renderer/src/components/Classrooms.jsx
import React, { useState, useEffect } from 'react';
import PersianNumberInput from './PersianNumberInput';
import PersianDatePicker from './PersianDatePicker';
import { toPersianDigits, toEnglishDigits } from '../utils/numberUtils';
import { isValidJalaliDate } from '../utils/dateUtils';
import PersianTimePicker from './PersianTimePicker';
import Select from 'react-select';
import { getWeekdayFromJalali } from '../utils/dateUtils';

const Classrooms = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [form, setForm] = useState({
    teacher_name: '', day: '', date: '', start_time: '', end_time: '',
    student_count: '', description: '',
    lesson: '', grade: '', gender: '', class_number: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [editId, setEditId] = useState(null);
  // const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;



  const load = async () => {
    const [classData, teacherData] = await Promise.all([
      window.api.getClassrooms(),
      window.api.getTeachers()
    ]);
    setClassrooms(classData);
    setTeachers(teacherData);
  };

  const teacherOptions = teachers.map(t => ({
    value: `${t.first_name} ${t.last_name}`,
    label: `${t.first_name} ${t.last_name}`
  }));

  useEffect(() => {
  if (form.date) {
    const day = getWeekdayFromJalali(form.date);
    setForm(prev => ({ ...prev, day }));
  }
}, [form.date]);

  const validateForm = () => {
    if (!form.day) { alert('لطفاً روز را انتخاب کنید'); return false; }
    if (!form.date || !isValidJalaliDate(form.date)) { alert('تاریخ شمسی معتبر نیست (فرمت: ۱۴۰۳-۰۲-۰۵)'); return false; }
    if (!form.teacher_name) { alert('لطفاً استاد را انتخاب کنید'); return false; }
    if (!form.start_time) { alert('ساعت شروع را وارد کنید'); return false; }
    if (!form.end_time) { alert('ساعت پایان را وارد کنید'); return false; }
    if (form.start_time >= form.end_time) { alert('ساعت پایان باید بعد از ساعت شروع باشد'); return false; }
    // const studentCount = parseInt(form.student_count);
    // if (isNaN(studentCount) || studentCount < 0) { alert('تعداد دانشجویان باید عددی مثبت باشد'); return false; }
    return true;
  };

  useEffect(() => { load(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'student_count') {
      const englishValue = toEnglishDigits(value);
      if (englishValue === '' || /^\d*$/.test(englishValue)) {
        setForm({ ...form, student_count: englishValue });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const resetForm = () => {
    setForm({
      teacher_name: '', day: '', date: '', start_time: '', end_time: '',
      student_count: '', description: '',
      lesson: '', grade: '', gender: '', class_number: ''
    });
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (teachers.length === 0) {
      alert('لطفاً ابتدا در بخش "مدرسان و کارکنان" یک استاد ثبت کنید.');
      return;
    }
    if (!form.teacher_name) {
      alert('لطفاً یک استاد انتخاب کنید.');
      return;
    }
    const dataToSend = {
      ...form,
      student_count: parseInt(form.student_count) || 0
    };
    if (editId) {
      await window.api.updateClassroom(editId, dataToSend);
    } else {
      await window.api.addClassroom(dataToSend);
    }
    resetForm();
    load();
  };

  const handleEdit = (item) => {
    setForm({
      teacher_name: item.teacher_name,
      day: item.day,
      date: item.date,
      start_time: item.start_time,
      end_time: item.end_time,
      student_count: item.student_count.toString(),
      description: item.description || '',
      lesson: item.lesson || '',
      grade: item.grade || '',
      gender: item.gender || '',
      class_number: item.class_number || ''
    });
    setEditId(item.id);
  };

  const handleDelete = async (id) => {
    if (confirm('حذف شود؟')) {
      await window.api.deleteClassroom(id);
      load();
    }
  };

  // مرتب‌سازی
// مرتب‌سازی
const sortedClassrooms = [...classrooms].sort((a, b) => {
  let aVal = a[sortConfig.key];
  let bVal = b[sortConfig.key];
  
  // اگر کلید مرتب‌سازی 'date' است، ابتدا تاریخ و سپس ساعت شروع را مقایسه کن
  if (sortConfig.key === 'date') {
    const aDate = a.date;
    const bDate = b.date;
    if (aDate !== bDate) {
      return sortConfig.direction === 'asc' ? aDate.localeCompare(bDate) : bDate.localeCompare(aDate);
    } else {
      // تاریخ‌ها برابرند → مقایسه بر اساس ساعت شروع
      const aTime = a.start_time || '00:00';
      const bTime = b.start_time || '00:00';
      return sortConfig.direction === 'asc' ? aTime.localeCompare(bTime) : bTime.localeCompare(aTime);
    }
  }
  
  if (sortConfig.key === 'start_time' || sortConfig.key === 'end_time') {
    return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  }
  if (sortConfig.key === 'student_count') {
    return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
  }
  if (typeof aVal === 'string') {
    return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  }
  return 0;
});

  // فیلتر بر اساس جستجو
  const filteredClassrooms = sortedClassrooms.filter(item =>
    Object.values(item).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );


  const totalPages = Math.ceil(filteredClassrooms.length / itemsPerPage);
    const paginatedClassrooms = filteredClassrooms.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );


  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => (sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : '');

  

  return (
    <div>
      <div className="form-section">
        <h2>ثبت کلاس درس جدید</h2>
        {teachers.length === 0 && (
          <div style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
            ⚠️ هیچ استادی ثبت نشده است. لطفاً ابتدا از بخش «مدرسان و کارکنان» یک استاد اضافه کنید.
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
           
            <div className="form-group">
              <label>تاریخ</label>
              <PersianDatePicker
                value={form.date}
                onChange={(val) => setForm({ ...form, date: val })}
                placeholder="سال/ماه/روز"
              />
            </div>
             <div className="form-group">
          <label>روز </label>
          <input placeholder='باید تاریخ را انتخاب کنید' type="text" value={form.day} disabled  />
        </div>
            <div className="form-group">
              <label>نام استاد</label>
            <Select
  classNamePrefix="react-select"
  options={teacherOptions}
  value={teacherOptions.find(opt => opt.value === form.teacher_name)}
  onChange={(selected) => setForm({ ...form, teacher_name: selected?.value || '' })}
  placeholder="جستجو و انتخاب استاد..."
  isClearable
  isSearchable
  noOptionsMessage={() => "استادی یافت نشد"}
  styles={{
    control: (base, state) => ({
      ...base,
      minHeight: '42px',
      borderRadius: '8px',
      borderColor: state.isFocused ? '#3498db' : 'var(--border-color, #ddd)',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(52,152,219,0.2)' : 'none',
      backgroundColor: 'var(--input-bg, white)',
      '&:hover': {
        borderColor: '#3498db'
      },
      cursor: 'pointer'
    }),
    option: (base, { isFocused, isSelected }) => ({
      ...base,
      backgroundColor: isSelected ? '#3498db' : isFocused ? 'var(--hover-bg, #e2e8f0)' : 'var(--popup-bg, white)',
      color: isSelected ? 'white' : 'var(--input-text, #2c3e50)',
      padding: '8px 12px',
      cursor: 'pointer'
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'var(--popup-bg, white)',
      borderRadius: '8px',
      overflow: 'hidden',
      zIndex: 9999
    }),
    input: (base) => ({
      ...base,
      direction: 'rtl',
      textAlign: 'right',
      color: 'var(--input-text, #333)'
    }),
    placeholder: (base) => ({
      ...base,
      color: 'var(--placeholder-color, #aaa)',
      fontSize: '14px'
    }),
    singleValue: (base) => ({
      ...base,
      color: 'var(--input-text, #2c3e50)'
    }),
    clearIndicator: (base) => ({
      ...base,
      cursor: 'pointer',
      color: 'var(--input-text, #666)'
    }),
    dropdownIndicator: (base) => ({
      ...base,
      cursor: 'pointer',
      color: 'var(--input-text, #666)'
    })
  }}
/>
            </div>
            
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>ساعت شروع</label>
              <PersianTimePicker
                value={form.start_time}
                onChange={(val) => setForm({ ...form, start_time: val })}
                placeholder="ساعت شروع"
              />
            </div>
            <div className="form-group">
              <label>ساعت پایان</label>
              <PersianTimePicker
                value={form.end_time}
                onChange={(val) => setForm({ ...form, end_time: val })}
                placeholder="ساعت پایان"
              />
            </div>
            <div className="form-group">
              <label>تعداد دانشجویان</label>
              <PersianNumberInput
                value={form.student_count}
                onChange={(val) => setForm({ ...form, student_count: val })}
                placeholder="تعداد"
              />
            </div>
          </div>

          {/* فیلدهای جدید */}
          <div className="form-row">
            <div className="form-group">
              <label>درس</label>
              <input name="lesson" value={form.lesson} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>مقطع</label>
              <select name="grade" value={form.grade} onChange={handleChange}>
                <option value="">انتخاب کنید</option>
                <option value="دبستان">دبستان</option>
                <option value="متوسطه1">متوسطه1</option>
                <option value="متوسطه2">متوسطه2</option>
                <option value="دانشگاه">دانشگاه</option>
                <option value="کودک">کودک</option>
                <option value="آزاد">آزاد</option>
              </select>
            </div>
            <div className="form-group">
              <label>جنسیت</label>
              <select name="gender" value={form.gender} onChange={handleChange}>
                <option value="">انتخاب کنید</option>
                <option value="مرد">مرد</option>
                <option value="زن">زن</option>
                <option value="مختلط">مختلط</option>
              </select>
            </div>
                   <div className="form-group">
  <label>شماره کلاس</label>
  <select name="class_number" value={form.class_number} onChange={handleChange}>
    <option value="">انتخاب کنید</option>
    {[1,2,3,4,5,6,7,8,9].map(num => (
      <option key={num} value={num}>{toPersianDigits(num)}</option>
    ))}
  </select>
</div>
          </div>

          <div className="form-group">
            <label>توضیحات</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows="2"></textarea>
          </div>

          <button type="submit" className="btn submit" disabled={teachers.length === 0}>
            {editId ? 'ویرایش' : 'ثبت'}
          </button>
          {editId && (
            <button type="button" className="btn" onClick={resetForm}>
              لغو
            </button>
          )}
        </form>
      </div>

      <div className="list-section">
        <h2>لیست کلاس‌ها</h2>
        <input
          type="text"
          placeholder="🔍 جستجو در جدول (نام استاد، روز، تاریخ، ...)"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: '100%', marginBottom: '15px', padding: '8px', borderRadius: '8px', border: '1px solid #ddd' }}
        />
        {filteredClassrooms.length === 0 && <div className="empty-message">کلاسی ثبت نشده است.</div>}
        {filteredClassrooms.length > 0 && (
          <div className="data-table" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
             <thead>
  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
    <th style={{ width: '5%', textAlign: 'center' }}>#</th>
    <th onClick={() => requestSort('day')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>روز {getSortIndicator('day')}</th>
    <th onClick={() => requestSort('date')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>تاریخ {getSortIndicator('date')}</th>
    <th onClick={() => requestSort('teacher_name')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>استاد {getSortIndicator('teacher_name')}</th>
    <th onClick={() => requestSort('lesson')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>درس {getSortIndicator('lesson')}</th>
    <th onClick={() => requestSort('grade')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>مقطع {getSortIndicator('grade')}</th>
    <th onClick={() => requestSort('gender')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>جنسیت {getSortIndicator('gender')}</th>
    <th onClick={() => requestSort('class_number')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>شماره کلاس {getSortIndicator('class_number')}</th>
    <th onClick={() => requestSort('start_time')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>ساعت شروع {getSortIndicator('start_time')}</th>
    <th onClick={() => requestSort('end_time')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>ساعت پایان {getSortIndicator('end_time')}</th>
    <th onClick={() => requestSort('student_count')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>تعداد {getSortIndicator('student_count')}</th>
    <th style={{ padding: '10px', textAlign: 'right' }}>عملیات</th>
  </tr>
</thead>
              <tbody>
                {paginatedClassrooms.map((item,idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ textAlign: 'center' }}>{toPersianDigits(idx + 1)}</td>

                    <td style={{ padding: '10px' }}>{item.day}</td>
                    <td style={{ padding: '10px' }}>{toPersianDigits(item.date)}</td>
                    <td style={{ padding: '10px' }}>{item.teacher_name}</td>
                    <td style={{ padding: '10px' }}>{item.lesson || '-'}</td>
                    <td style={{ padding: '10px' }}>{item.grade || '-'}</td>
                    <td style={{ padding: '10px' }}>{item.gender || '-'}</td>
<td style={{ padding: '10px' }}>{item.class_number ? toPersianDigits(item.class_number) : '-'}</td>
                    <td style={{ padding: '10px' }}>{toPersianDigits(item.start_time)}</td>
                    <td style={{ padding: '10px' }}>{toPersianDigits(item.end_time)}</td>
                    <td style={{ padding: '10px' }}>{toPersianDigits(item.student_count)}</td>
        
                    <td style={{ padding: '10px' }}>
                      <button className="btn edit" onClick={() => handleEdit(item)}>ویرایش</button>
                      <button className="btn delete" onClick={() => handleDelete(item.id)} style={{ marginRight: '5px' }}>حذف

                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
       <div style={{ 
  display: 'flex', 
  justifyContent: 'center', 
  alignItems: 'center', 
  gap: '15px', 
  marginTop: '25px',
  direction: 'ltr' 
}}>

  <button
    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
    disabled={currentPage === totalPages}
    style={{
      padding: '6px 14px',
      backgroundColor: currentPage === totalPages ? '#f3f4f6' : '#ffffff',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
      color: currentPage === totalPages ? '#9ca3af' : '#374151',
      fontSize: '14px',
      transition: 'all 0.2s'
    }}
  >
    بعدی
  </button>
 
  
  <span style={{ fontSize: '14px', color: '#4b5563' }}>
    صفحه {currentPage} از {totalPages}
  </span>
  
  

   <button
    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
    disabled={currentPage === 1}
    style={{
      padding: '6px 14px',
      backgroundColor: currentPage === 1 ? '#f3f4f6' : '#ffffff',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
      color: currentPage === 1 ? '#9ca3af' : '#374151',
      fontSize: '14px',
      transition: 'all 0.2s'
    }}
  >
    قبلی
  </button>
</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Classrooms;

