import React, { useState, useEffect } from 'react';
import PersianNumberInput from './PersianNumberInput';
import { toPersianDigits, toEnglishDigits } from '../utils/numberUtils';
import PersianDatePicker from './PersianDatePicker';
import { isValidJalaliDate } from '../utils/dateUtils';
import Select from 'react-select';
import { getWeekdayFromJalali } from '../utils/dateUtils';


const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    receiver_name: '', day: '', date: '', amount: '', subject: '', payment_type: '', description: ''
  });
  const [editId, setEditId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });

  const load = async () => {
    const [expData, teacherData] = await Promise.all([
      window.api.getExpenses(),
      window.api.getTeachers()
    ]);
    setExpenses(expData);
    setTeachers(teacherData);
  };


 useEffect(() => {
    if (form.date) {
      const day = getWeekdayFromJalali(form.date);
      setForm(prev => ({ ...prev, day }));
    }
  }, [form.date]);


  useEffect(() => {
  console.log('teachers loaded:', teachers);
}, [teachers]);

  useEffect(() => { load(); }, []);

  const teacherOptions = teachers.map(t => ({ value: `${t.first_name} ${t.last_name}`, label: `${t.first_name} ${t.last_name}` }));

  const validateForm = () => {
    if (!form.receiver_name) { alert('لطفاً دریافت کننده را انتخاب کنید'); return false; }
    if (!form.day) { alert('روز را انتخاب کنید'); return false; }
    if (!form.date || !isValidJalaliDate(form.date)) { alert('تاریخ شمسی معتبر نیست'); return false; }
    if (!form.amount || parseFloat(form.amount) <= 0) { alert('مبلغ باید بیشتر از صفر باشد'); return false; }
    if (!form.subject) { alert('موضوع پرداخت را انتخاب کنید'); return false; }
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'amount') {
      const englishValue = toEnglishDigits(value);
      if (englishValue === '' || /^\d*\.?\d*$/.test(englishValue)) {
        setForm({ ...form, amount: englishValue });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const dataToSend = { ...form, amount: parseFloat(form.amount) || 0 };
    if (editId) {
      await window.api.updateExpense(editId, dataToSend);
      setEditId(null);
    } else {
      await window.api.addExpense(dataToSend);
    }
    setForm({ receiver_name: '', day: '', date: '', amount: '', subject: '', payment_type: '', description: '' });
    load();
  };

  const handleEdit = (item) => {
    setForm({
      receiver_name: item.receiver_name,
      day: item.day,
      date: item.date,
      amount: item.amount.toString(),
      subject: item.subject,
      payment_type: item.payment_type,
      description: item.description || ''
    });
    setEditId(item.id);
  };

  const handleDelete = async (id) => {
    if (confirm('حذف شود؟')) {
      await window.api.deleteExpense(id);
      load();
    }
  };

  // مرتب‌سازی و فیلتر
  const sortedExpenses = [...expenses].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    if (sortConfig.key === 'amount') return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    if (sortConfig.key === 'date') return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    if (typeof aVal === 'string') return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return 0;
  });

  const filteredExpenses = sortedExpenses.filter(item =>
    Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };
  const getSortIndicator = (key) => sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : '';

  return (
    <div>
      <div className="form-section">
        <h2>ثبت هزینه جدید</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>نام دریافت کننده</label>
              <Select required
                options={teacherOptions}
                value={teacherOptions.find(opt => opt.value === form.receiver_name)}
                onChange={(selected) => setForm({ ...form, receiver_name: selected?.value || '' })}
                placeholder="جستجو و انتخاب استاد..."
                isClearable
                isSearchable
                noOptionsMessage={() => "استادی یافت نشد"}
                
              />
            </div>
         
            <div className="form-group">
              <label>تاریخ</label>
              <PersianDatePicker value={form.date} onChange={(val) => setForm({ ...form, date: val })} />
            </div>
                 <div className="form-group">
          <label>روز </label>
          <input placeholder='باید تاریخ را انتخاب کنید' type="text" value={form.day} disabled  />
        </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>مبلغ (تومان)</label>
              <PersianNumberInput value={form.amount} onChange={(val) => setForm({ ...form, amount: val })} />
            </div>
            <div className="form-group">
              <label>موضوع هزینه</label>
              <select name="subject" value={form.subject} onChange={handleChange} required>
                <option value="">انتخاب کنید</option>
                <option value="حقوق">حقوق</option>
                <option value="هزینه های جاری">هزینه های جاری</option>
                <option value="امکانات">امکانات</option>
                <option value="قبض">قبض</option>
              </select>
            </div>
          <div className="form-group">
  <label>نوع پرداخت</label>
  <select name="payment_type" value={form.payment_type} onChange={handleChange} required>
    <option value="" disabled>انتخاب کنید</option>
   <option value="انتقال">انتقال</option>
    <option value="پوز">پوز</option>
    <option value="نقدی">نقدی</option>
    <option value="چک">چک</option>
  </select>
</div>
          </div>
          <div className="form-group"><label>توضیحات</label><textarea name="description" value={form.description} onChange={handleChange} rows="2"></textarea></div>
          <button type="submit" className="btn submit">{editId ? 'ویرایش' : 'ثبت'}</button>
          {editId && <button type="button" className="btn" onClick={() => { setEditId(null); setForm({ receiver_name: '', day: '', date: '', amount: '', subject: '', payment_type: '', description: '' }); }}>لغو</button>}
        </form>
      </div>

      <div className="list-section">
        <h2>لیست هزینه‌ها</h2>
        <input
          type="text"
          placeholder="🔍 جستجو در جدول..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: '100%', marginBottom: '15px', padding: '8px', borderRadius: '8px', border: '1px solid #ddd' }}
        />
        {filteredExpenses.length === 0 && <div className="empty-message">هزینه‌ای ثبت نشده است.</div>}
        {filteredExpenses.length > 0 && (
          <div className="data-table" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                      <th style={{ width: '5%', textAlign: 'center' }}>#</th>
                  <th onClick={() => requestSort('receiver_name')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>دریافت کننده {getSortIndicator('receiver_name')}</th>
                  <th onClick={() => requestSort('day')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>روز {getSortIndicator('day')}</th>
                  <th onClick={() => requestSort('date')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>تاریخ {getSortIndicator('date')}</th>
                  <th onClick={() => requestSort('amount')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>مبلغ (تومان) {getSortIndicator('amount')}</th>
                  <th onClick={() => requestSort('subject')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>موضوع {getSortIndicator('subject')}</th>
                  <th onClick={() => requestSort('payment_type')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>نوع پرداخت {getSortIndicator('payment_type')}</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>توضیحات</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((item,idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ textAlign: 'center' }}>{toPersianDigits(idx + 1)}</td>

                    <td style={{ padding: '10px' }}>{item.receiver_name}</td>
                    <td style={{ padding: '10px' }}>{item.day}</td>
                    <td style={{ padding: '10px' }}>{item.date}</td>
                    <td style={{ padding: '10px' }}>{toPersianDigits(item.amount.toLocaleString())}</td>
                    <td style={{ padding: '10px' }}>{item.subject}</td>
                    <td style={{ padding: '10px' }}>{item.payment_type}</td>
                    <td style={{ padding: '10px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description || '-'}</td>
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

export default Expenses;