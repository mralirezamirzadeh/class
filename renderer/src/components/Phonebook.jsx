import React, { useState, useEffect } from 'react';
import { toPersianDigits, toEnglishDigits } from '../utils/numberUtils';
import PersianNumberInput from './PersianNumberInput';

const Phonebook = () => {
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    first_name: '', last_name: '', mobile: '', virtual_mobile: '', landline: '', description: ''
  });
  const [editId, setEditId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'last_name', direction: 'asc' });

  const load = async () => {
    const data = await window.api.getPhonebook();
    setContacts(data);
  };

  useEffect(() => { load(); }, []);

  // اعتبارسنجی
  const validateForm = () => {
    if (!form.first_name.trim()) { alert('نام را وارد کنید'); return false; }
    if (!form.last_name.trim()) { alert('نام خانوادگی را وارد کنید'); return false; }
    if (form.mobile && !/^09\d{9}$/.test(form.mobile)) {
      alert('شماره موبایل باید با 09 شروع و 11 رقم باشد');
      return false;
    }
      if (form.virtual_mobile && !/^09\d{9}$/.test(form.virtual_mobile)) {
      alert('شماره  فضای مجازی باید با 09 شروع و 11 رقم باشد');
      return false;
    }
  
    if (form.landline && !/^\d{8,11}$/.test(form.landline)) {
      alert('شماره تلفن ثابت باید بین 8 تا 11 رقم باشد');
      return false;
    }
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    if (name === 'mobile') {
      let val = toEnglishDigits(value).replace(/\D/g, '');
      if (val.length > 11) val = val.slice(0, 11);
      processedValue = val;
    } else if (name === 'virtual_mobile') {
      let val = toEnglishDigits(value).replace(/\D/g, '');
      if (val.length > 11) val = val.slice(0, 11);
      processedValue = val;
    } else if (name === 'landline') {
      let val = toEnglishDigits(value).replace(/\D/g, '');
      if (val.length > 11) val = val.slice(0, 11);
      processedValue = val;
    }
    setForm({ ...form, [name]: processedValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const dataToSend = { ...form };
    if (editId) {
      await window.api.updatePhonebook(editId, dataToSend);
      setEditId(null);
    } else {
      await window.api.addPhonebook(dataToSend);
    }
    setForm({ first_name: '', last_name: '', mobile: '', virtual_mobile: '', landline: '', description: '' });
    load();
  };

  const handleEdit = (item) => {
    setForm(item);
    setEditId(item.id);
  };

  const handleDelete = async (id) => {
    if (confirm('حذف شود؟')) {
      await window.api.deletePhonebook(id);
      load();
    }
  };

  const sortedContacts = [...contacts].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    if (typeof aVal === 'string') return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return 0;
  });

  const filteredContacts = sortedContacts.filter(item =>
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
        <h2>ثبت مخاطب جدید</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>نام</label><input name="first_name" value={form.first_name} onChange={handleChange} required /></div>
            <div className="form-group"><label>نام خانوادگی</label><input name="last_name" value={form.last_name} onChange={handleChange} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>موبایل</label><input name="mobile" value={toPersianDigits(form.mobile)} onChange={handleChange} placeholder="09xxxxxxxxx" /></div>
            <div className="form-group"><label>موبایل فضای مجازی</label><input name="virtual_mobile" value={toPersianDigits(form.virtual_mobile)} onChange={handleChange} placeholder=" 09xxxxxxxxx" /></div>
            <div className="form-group"><label>تلفن ثابت</label><input name="landline" value={toPersianDigits(form.landline)} onChange={handleChange} placeholder="تلفن ثابت" /></div>
          </div>
          <div className="form-group"><label>توضیحات</label><textarea name="description" value={form.description} onChange={handleChange} rows="2"></textarea></div>
          <button type="submit" className="btn submit">{editId ? 'ویرایش' : 'ثبت'}</button>
          {editId && <button type="button" className="btn" onClick={() => { setEditId(null); setForm({ first_name: '', last_name: '', mobile: '', virtual_mobile: '', landline: '', description: '' }); }}>لغو</button>}
        </form>
      </div>

      <div className="list-section">
        <h2>دفتر تلفن</h2>
        <input
          type="text"
          placeholder="🔍 جستجو..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: '100%', marginBottom: '15px', padding: '8px', borderRadius: '8px', border: '1px solid #ddd' }}
        />
        {filteredContacts.length === 0 && <div className="empty-message">مخاطبی ثبت نشده است.</div>}
        {filteredContacts.length > 0 && (
          <div className="data-table" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                        <th style={{ width: '5%', textAlign: 'center' }}>#</th>
                  <th onClick={() => requestSort('first_name')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>نام {getSortIndicator('first_name')}</th>
                  <th onClick={() => requestSort('last_name')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>نام خانوادگی {getSortIndicator('last_name')}</th>
                  <th onClick={() => requestSort('mobile')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>موبایل {getSortIndicator('mobile')}</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>موبایل مجازی</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>تلفن ثابت</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>توضیحات</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((item,idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ textAlign: 'center' }}>{toPersianDigits(idx + 1)}</td>

                    <td style={{ padding: '10px' }}>{item.first_name}</td>
                    <td style={{ padding: '10px' }}>{item.last_name}</td>
                    <td style={{ padding: '10px' }}>{toPersianDigits(item.mobile)}</td>
                    <td style={{ padding: '10px' }}>{toPersianDigits(item.virtual_mobile)}</td>
                    <td style={{ padding: '10px' }}>{toPersianDigits(item.landline)}</td>
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

export default Phonebook;