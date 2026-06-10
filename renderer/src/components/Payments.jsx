// renderer/src/components/Payments.jsx
import React, { useState, useEffect } from 'react';
import PersianNumberInput from './PersianNumberInput';
import { toPersianDigits, toEnglishDigits } from '../utils/numberUtils';
import PersianDatePicker from './PersianDatePicker';
import { isValidJalaliDate } from '../utils/dateUtils';
import { getWeekdayFromJalali } from '../utils/dateUtils';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');    // ← جستجوی زنده
  const [form, setForm] = useState({
    payer_name: '', day: '', date: '', amount: '', for_what: '', payment_type: '', description: ''
  });
  const [editId, setEditId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });

  const load = async () => {
    const data = await window.api.getPayments();
    setPayments(data);
  };

  useEffect(() => { load(); }, []);

   useEffect(() => {
    if (form.date) {
      const day = getWeekdayFromJalali(form.date);
      setForm(prev => ({ ...prev, day }));
    }
  }, [form.date]);

  // اعتبارسنجی فرم
  const validateForm = () => {
    if (!form.payer_name.trim()) { alert('لطفاً نام پرداخت کننده را وارد کنید'); return false; }
    if (!form.day) { alert('لطفاً روز را انتخاب کنید'); return false; }
    if (!form.date || !isValidJalaliDate(form.date)) { alert('تاریخ شمسی معتبر نیست (فرمت: ۱۴۰۳-۰۲-۰۵)'); return false; }
    if (!form.amount || parseFloat(form.amount) <= 0) { alert('مبلغ باید بیشتر از صفر باشد'); return false; }
    if (!form.for_what.trim()) { alert('لطفاً «بابت» را وارد کنید'); return false; }
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
    if (!validateForm()) return;   // ← اعتبارسنجی قبل از ارسال
    const dataToSend = {
      ...form,
      amount: parseFloat(form.amount) || 0
    };
    if (editId) {
      await window.api.updatePayment(editId, dataToSend);
      setEditId(null);
    } else {
      await window.api.addPayment(dataToSend);
    }
    setForm({ payer_name: '', day: '', date: '', amount: '', for_what: '', payment_type: 'نقدی', description: '' });
    load();
  };

  const handleEdit = (item) => {
    setForm({
      payer_name: item.payer_name,
      day: item.day,
      date: item.date,
      amount: item.amount.toString(),
      for_what: item.for_what,
      payment_type: item.payment_type,
      description: item.description || ''
    });
    setEditId(item.id);
  };

  const handleDelete = async (id) => {
    if (confirm('حذف شود؟')) {
      await window.api.deletePayment(id);
      load();
    }
  };

  // مرتب‌سازی
  const sortedPayments = [...payments].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    if (sortConfig.key === 'amount') {
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    }
    if (sortConfig.key === 'date') {
      return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (typeof aVal === 'string') {
      return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return 0;
  });

  // فیلتر با جستجو
  const filteredPayments = sortedPayments.filter(item =>
    Object.values(item).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
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
        <h2>ثبت پرداخت شهریه</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>نام پرداخت کننده</label><input name="payer_name" value={form.payer_name} onChange={handleChange} required /></div>
            
            <div className="form-group"><label>تاریخ </label>
              <PersianDatePicker value={form.date} onChange={(val) => setForm({ ...form, date: val })} />
            </div>

             <div className="form-group">
          <label>روز </label>
          <input placeholder='باید تاریخ را انتخاب کنید' type="text" value={form.day} disabled  />
        </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>مبلغ (تومان)</label>
              <PersianNumberInput value={form.amount} onChange={(val) => setForm({ ...form, amount: val })} placeholder="مبلغ" />
            </div>
            <div className="form-group"><label>موضوع پرداخت</label>
<input name="for_what" value={form.for_what} onChange={handleChange} required /></div>
           <div className="form-group">
  <label>نوع پرداخت</label>
  <select name="payment_type" value={form.payment_type} onChange={handleChange} required>
    <option value="" disabled>انتخاب کنید</option>
    <option value="پوز">پوز</option>
    <option value="نقدی">نقدی</option>
    <option value="انتقال">انتقال</option>
  </select>
</div>
          </div>
          <div className="form-group"><label>توضیحات</label><textarea name="description" value={form.description} onChange={handleChange} rows="2"></textarea></div>
          <button type="submit" className="btn submit">{editId ? 'ویرایش' : 'ثبت'}</button>
          {editId && <button type="button" className="btn" onClick={() => { setEditId(null); setForm({ payer_name: '', day: '', date: '', amount: '', for_what: '', payment_type: '', description: '' }); }}>لغو</button>}
        </form>
      </div>

      <div className="list-section">
        <h2>لیست پرداخت‌ها</h2>
        {/* نوار جستجو */}
        <input
          type="text"
          placeholder="🔍 جستجو در جدول (پرداخت کننده، روز، تاریخ، بابت، ...)"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: '100%', marginBottom: '15px', padding: '8px', borderRadius: '8px', border: '1px solid #ddd' }}
        />
        {filteredPayments.length === 0 && <div className="empty-message">پرداختی ثبت نشده است.</div>}
        {filteredPayments.length > 0 && (
          <div className="data-table" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                      <th style={{ width: '5%', textAlign: 'center' }}>#</th>
                  <th onClick={() => requestSort('payer_name')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>پرداخت کننده {getSortIndicator('payer_name')}</th>
                  <th onClick={() => requestSort('day')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>روز {getSortIndicator('day')}</th>
                  <th onClick={() => requestSort('date')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>تاریخ {getSortIndicator('date')}</th>
                  <th onClick={() => requestSort('amount')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>مبلغ (تومان) {getSortIndicator('amount')}</th>
                  <th onClick={() => requestSort('for_what')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>بابت {getSortIndicator('for_what')}</th>
                  <th onClick={() => requestSort('payment_type')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>نوع پرداخت {getSortIndicator('payment_type')}</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>توضیحات</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((item,idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ textAlign: 'center' }}>{toPersianDigits(idx + 1)}</td>

                    <td style={{ padding: '10px' }}>{item.payer_name}</td>
                    <td style={{ padding: '10px' }}>{item.day}</td>
                    <td style={{ padding: '10px' }}>{toPersianDigits(item.date)}</td>
                    <td style={{ padding: '10px' }}>{toPersianDigits(item.amount.toLocaleString())}</td>
                    <td style={{ padding: '10px' }}>{item.for_what}</td>
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

export default Payments;