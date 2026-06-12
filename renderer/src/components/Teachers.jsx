// renderer/src/components/Teachers.jsx
import React, { useState, useEffect } from 'react';
import { toPersianDigits, toEnglishDigits } from '../utils/numberUtils';
import PersianDatePicker from './PersianDatePicker';
import { isValidJalaliDate } from '../utils/dateUtils';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    first_name: '', last_name: '', national_code: '', father_name: '', birth_date: '',
    birth_place_issue: '', birth_place: '', mobile: '', virtual_space: '', degree: '',
    field_of_study: '', home_address: '', work_address: '', work_experience: '',
    bank_account: '', bank_card: ''
  });
  const [editId, setEditId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'last_name', direction: 'asc' });

  const load = async () => {
    const data = await window.api.getTeachers();
    setTeachers(data);
  };

  useEffect(() => { load(); }, []);

  // بررسی یکتایی کد ملی
  const isNationalCodeUnique = async (code, currentId) => {
    const all = await window.api.getTeachers();
    return !all.some(t => t.national_code === code && t.id !== currentId);
  };

  // همگام‌سازی با دفتر تلفن (ثبت/به‌روزرسانی مخاطب بر اساس شماره موبایل)
const syncToPhonebook = async () => {
  // اگر حداقل یکی از شماره‌ها وجود نداشته باشد، همگام‌سازی را انجام نده
  if (!form.mobile && !form.virtual_space) return;

  try {
    const phonebook = await window.api.getPhonebook();
    // اولویت جستجو با شماره موبایل است (به عنوان کلید اصلی)
    let existing = null;
    if (form.mobile) {
      existing = phonebook.find(contact => contact.mobile === form.mobile);
    }

    const newEntry = {
      first_name: form.first_name,
      last_name: form.last_name,
      mobile: form.mobile || '',
      virtual_mobile: form.virtual_space || '',
      landline: '',
      description: 'ثبت خودکار از اطلاعات استاد'
    };

    if (existing) {
      // به‌روزرسانی مخاطب موجود (نام، نام خانوادگی و virtual_mobile)
      const updated = {
        ...existing,
        first_name: form.first_name,
        last_name: form.last_name,
        virtual_mobile: form.virtual_space || existing.virtual_mobile
      };
      await window.api.updatePhonebook(existing.id, updated);
    } else {
      // ایجاد مخاطب جدید
      await window.api.addPhonebook(newEntry);
    }
  } catch (err) {
    console.error('خطا در همگام‌سازی با دفتر تلفن:', err);
  }
};
  // اعتبارسنجی فرم
  const validateForm = async () => {
    if (!form.first_name.trim()) { alert('نام را وارد کنید'); return false; }
    if (!form.last_name.trim()) { alert('نام خانوادگی را وارد کنید'); return false; }
    const mobileEng = toEnglishDigits(form.mobile);
    if (mobileEng && !/^09\d{9}$/.test(mobileEng)) {
      alert('شماره موبایل باید با 09 شروع و 11 رقم باشد');
      return false;
    }
    const virtualEng = toEnglishDigits(form.virtual_space);
    if (virtualEng && !/^09\d{9}$/.test(virtualEng)) {
      alert('شماره فضای مجازی باید با 09 شروع و 11 رقم باشد');
      return false;
    }
    if (form.national_code && form.national_code.length !== 10) {
      alert('کد ملی باید ۱۰ رقم باشد');
      return false;
    }
    if (form.national_code && !(await isNationalCodeUnique(form.national_code, editId))) {
      alert('این کد ملی قبلاً ثبت شده است');
      return false;
    }
    if (form.bank_card && !/^\d{16}$/.test(form.bank_card)) {
      alert('شماره کارت باید 16 رقم باشد');
      return false;
    }
    if (form.birth_date && !isValidJalaliDate(form.birth_date)) {
      alert('تاریخ تولد شمسی معتبر نیست');
      return false;
    }
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === 'national_code') {
      let val = toEnglishDigits(value).replace(/\D/g, '');
      if (val.length > 10) val = val.slice(0, 10);
      setForm({ ...form, national_code: val });
      return;
    }
    if (name === 'mobile') {
      let val = toEnglishDigits(value).replace(/\D/g, '');
      if (val.length > 11) val = val.slice(0, 11);
      setForm({ ...form, mobile: val });
      return;
    }
    if (name === 'virtual_space') {
      let val = toEnglishDigits(value).replace(/\D/g, '');
      if (val.length > 11) val = val.slice(0, 11);
      setForm({ ...form, virtual_space: val });
      return;
    }
    if (['bank_account', 'bank_card'].includes(name)) {
      processedValue = toEnglishDigits(value).replace(/\D/g, '');
      setForm({ ...form, [name]: processedValue });
      return;
    }
    setForm({ ...form, [name]: processedValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!(await validateForm())) return;

    if (editId) {
      await window.api.updateTeacher(editId, form);
    } else {
      await window.api.addTeacher(form);
    }

    // همگام‌سازی با دفتر تلفن (بعد از موفقیت در ثبت/ویرایش)
    await syncToPhonebook();

    setForm({
      first_name: '', last_name: '', national_code: '', father_name: '', birth_date: '',
      birth_place_issue: '', birth_place: '', mobile: '', virtual_space: '', degree: '',
      field_of_study: '', home_address: '', work_address: '', work_experience: '',
      bank_account: '', bank_card: ''
    });
    setEditId(null);
    load();
  };

  const handleEdit = (item) => {
    setForm(item);
    setEditId(item.id);
  };

  const handleDelete = async (id) => {
    if (confirm('حذف شود؟')) {
      await window.api.deleteTeacher(id);
      // (اختیاری) مخاطب دفتر تلفن هم حذف شود؟ بنا به درخواست کارفرما، فعلاً نه.
      load();
    }
  };

  // مرتب‌سازی جدول
  const sortedTeachers = [...teachers].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    if (sortConfig.key === 'national_code' || sortConfig.key === 'mobile') {
      return sortConfig.direction === 'asc' ? (aVal || '').localeCompare(bVal || '') : (bVal || '').localeCompare(aVal || '');
    }
    if (typeof aVal === 'string') {
      return sortConfig.direction === 'asc' ? (aVal || '').localeCompare(bVal || '') : (bVal || '').localeCompare(aVal || '');
    }
    return 0;
  });

  // فیلتر با جستجو
  const filteredTeachers = sortedTeachers.filter(item =>
    Object.values(item).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
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
        <h2>ثبت اطلاعات مدرس / کارمند</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>نام</label><input name="first_name" value={form.first_name} onChange={handleChange} required /></div>
            <div className="form-group"><label>نام خانوادگی</label><input name="last_name" value={form.last_name} onChange={handleChange} required /></div>
            <div className="form-group"><label>کد ملی</label><input name="national_code" value={toPersianDigits(form.national_code)} onChange={handleChange} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>نام پدر</label><input name="father_name" value={form.father_name} onChange={handleChange} /></div>
            <div className="form-group"><label>تاریخ تولد</label>
              <PersianDatePicker value={form.birth_date} onChange={(val) => setForm({ ...form, birth_date: val })} start={"1300-01-01"} />
            </div>
            <div className="form-group"><label>محل صدور</label><input name="birth_place_issue" value={form.birth_place_issue} onChange={handleChange} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>محل تولد</label><input name="birth_place" value={form.birth_place} onChange={handleChange} /></div>
            <div className="form-group"><label>موبایل</label><input name="mobile" value={toPersianDigits(form.mobile)} onChange={handleChange} /></div>
            <div className="form-group"><label>شماره فضای مجازی</label><input name="virtual_space" value={toPersianDigits(form.virtual_space)} onChange={handleChange} /></div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>مدرک تحصیلی</label>
              <select name="degree" value={form.degree} onChange={handleChange}>
                <option value="">انتخاب کنید</option>
                <option value="دیپلم">دیپلم</option>
                <option value="فوق دیپلم">فوق دیپلم</option>
                <option value="لیسانس">لیسانس</option>
                <option value="فوق لیسانس">فوق لیسانس</option>
                <option value="دکتری">دکتری</option>
                <option value="حوزوی">حوزوی</option>
              </select>
            </div>
            <div className="form-group"><label>رشته تحصیلی</label><input name="field_of_study" value={form.field_of_study} onChange={handleChange} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>شماره حساب بانکی</label><input name="bank_account" value={toPersianDigits(form.bank_account)} onChange={handleChange} /></div>
            <div className="form-group"><label>شماره کارت بانکی</label><input name="bank_card" value={toPersianDigits(form.bank_card)} onChange={handleChange} /></div>
          </div>
          <div className="form-group"><label>آدرس منزل</label><textarea name="home_address" value={form.home_address} onChange={handleChange} rows="2"></textarea></div>
          <div className="form-group"><label>آدرس محل کار</label><textarea name="work_address" value={form.work_address} onChange={handleChange} rows="2"></textarea></div>
          <div className="form-group"><label>سوابق کاری</label><textarea name="work_experience" value={form.work_experience} onChange={handleChange} rows="3"></textarea></div>
          <button type="submit" className="btn submit">{editId ? 'ویرایش' : 'ثبت'}</button>
          {editId && <button type="button" className="btn" onClick={() => { setEditId(null); setForm({ first_name: '', last_name: '', national_code: '', father_name: '', birth_date: '', birth_place_issue: '', birth_place: '', mobile: '', virtual_space: '', degree: '', field_of_study: '', home_address: '', work_address: '', work_experience: '', bank_account: '', bank_card: '' }); }}>لغو</button>}
        </form>
      </div>

      <div className="list-section">
        <h2>لیست اساتید و کارکنان</h2>
        <input
          type="text"
          placeholder="🔍 جستجو در جدول (نام، نام خانوادگی، کد ملی، موبایل، ...)"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: '100%', marginBottom: '15px', padding: '8px', borderRadius: '8px', border: '1px solid #ddd' }}
        />
        {filteredTeachers.length === 0 && <div className="empty-message">مدرسی ثبت نشده است.</div>}
        {filteredTeachers.length > 0 && (
          <div className="data-table" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                  <th style={{ width: '5%', textAlign: 'center' }}>#</th>
                  <th onClick={() => requestSort('first_name')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>نام {getSortIndicator('first_name')}</th>
                  <th onClick={() => requestSort('last_name')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>نام خانوادگی {getSortIndicator('last_name')}</th>
                  <th onClick={() => requestSort('national_code')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>کد ملی {getSortIndicator('national_code')}</th>
                  <th onClick={() => requestSort('mobile')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>موبایل {getSortIndicator('mobile')}</th>
                  <th onClick={() => requestSort('degree')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>مدرک {getSortIndicator('degree')}</th>
                  <th onClick={() => requestSort('field_of_study')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>رشته {getSortIndicator('field_of_study')}</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>شماره حساب</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>شماره کارت</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ textAlign: 'center' }}>{toPersianDigits(idx + 1)}</td>
                    <td style={{ padding: '10px' }}>{item.first_name}</td>
                    <td style={{ padding: '10px' }}>{item.last_name}</td>
                    <td style={{ padding: '10px' }}>{toPersianDigits(item.national_code)}</td>
                    <td style={{ padding: '10px' }}>{toPersianDigits(item.mobile)}</td>
                    <td style={{ padding: '10px' }}>{item.degree || '-'}</td>
                    <td style={{ padding: '10px' }}>{item.field_of_study || '-'}</td>
                    <td style={{ padding: '10px' }}>{toPersianDigits(item.bank_account)}</td>
                    <td style={{ padding: '10px' }}>{toPersianDigits(item.bank_card)}</td>
                    <td style={{ padding: '10px' }}>
                      <button className="btn edit" onClick={() => handleEdit(item)}>ویرایش</button>
                      <button className="btn delete" onClick={() => handleDelete(item.id)} style={{ marginRight: '5px' }}>حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Teachers;