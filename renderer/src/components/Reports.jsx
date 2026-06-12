// renderer/src/components/Reports.jsx
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PersianDatePicker from './PersianDatePicker';
import Select from 'react-select';
import PersianNumberInput from './PersianNumberInput';
import { toPersianDigits, toEnglishDigits } from '../utils/numberUtils';


const Reports = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [phonebook, setPhonebook] = useState([]);
  const [reportType, setReportType] = useState('class');
  const [filters, setFilters] = useState({
    teacherId: '',
    startDate: '',
    endDate: '',
    paymentType: '',
    classDay: '',
    expenseSubject: '',
    phonebookSearch: '',
      descriptionSearch: '' ,
        studentCount: ''  
  });
  const [filteredData, setFilteredData] = useState([]);
  // ---------- state مرتب‌سازی (sort) ----------
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });

  // بارگذاری داده‌ها
  useEffect(() => {
    Promise.all([
      window.api.getClassrooms(),
      window.api.getPayments(),
      window.api.getExpenses?.(),
      window.api.getTeachers(),
      window.api.getPhonebook?.()
    ]).then(([cls, pay, exp, tch, pb]) => {
      setClassrooms(cls || []);
      setPayments(pay || []);
      setExpenses(exp || []);
      setTeachers(tch || []);
      setPhonebook(pb || []);
    }).catch(err => console.error('Error loading data:', err));
  }, []);

  // پاک کردن نتایج هنگام تغییر نوع گزارش
  useEffect(() => {
    setFilteredData([]);
  }, [reportType]);

  const applyFilters = () => {
    let data = [];
    if (reportType === 'class') data = [...classrooms];
    else if (reportType === 'payment') data = [...payments];
    else if (reportType === 'expense') data = [...expenses];
    else if (reportType === 'phonebook') data = [...phonebook];

    if (reportType !== 'phonebook') {
      if (filters.startDate) data = data.filter(item => item.date >= filters.startDate);
      if (filters.endDate) data = data.filter(item => item.date <= filters.endDate);
    }

    if (reportType === 'class') {
      if (filters.teacherId) data = data.filter(item => item.teacher_name === filters.teacherId);
      if (filters.classDay) data = data.filter(item => item.day === filters.classDay);
     if (filters.studentCount !== '') {
  const count = parseInt(toEnglishDigits(filters.studentCount), 10);
  if (!isNaN(count)) {
    data = data.filter(item => item.student_count === count);
  }
}
    } else if (reportType === 'payment') {
      if (filters.paymentType) data = data.filter(item => item.payment_type === filters.paymentType);
    } else if (reportType === 'expense') {
      if (filters.expenseSubject) data = data.filter(item => item.subject === filters.expenseSubject);
      if (filters.paymentType) data = data.filter(item => item.payment_type === filters.paymentType);
    } else if (reportType === 'phonebook') {
      if (filters.phonebookSearch) {
        const term = filters.phonebookSearch.toLowerCase();
        data = data.filter(item =>
          item.first_name?.toLowerCase().includes(term) ||
          item.last_name?.toLowerCase().includes(term) ||
          item.mobile?.includes(term)
        );
      }
    }
    if (filters.descriptionSearch) {
  const term = filters.descriptionSearch.toLowerCase();
  data = data.filter(item =>
    item.description && item.description.toLowerCase().includes(term)
  );
}

    setFilteredData(data);
  };

  const getSummary = () => {
    if (filteredData.length === 0) return null;
    if (reportType === 'class') {
      const getHoursDiff = (start, end) => {
        if (!start || !end) return 0;
        const [sH, sM] = start.split(':').map(Number);
        const [eH, eM] = end.split(':').map(Number);
        return (eH + eM / 60) - (sH + sM / 60);
      };
      const totalHours = filteredData.reduce((sum, c) => sum + getHoursDiff(c.start_time, c.end_time), 0);
      return { count: filteredData.length, totalHours: totalHours.toFixed(1) };
    } else if (reportType === 'payment' || reportType === 'expense') {
      const totalAmount = filteredData.reduce((sum, item) => sum + (item.amount || 0), 0);
      return { count: filteredData.length, totalAmount };
    } else if (reportType === 'phonebook') {
      return { count: filteredData.length };
    }
    return null;
  };

  // ---------- توابع مرتب‌سازی ----------
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽';
    }
    return '';
  };

  const getSortedData = () => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (aVal === undefined || bVal === undefined) return 0;
      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  };

  const sortedData = getSortedData();

  // ---------- خروجی Excel ----------
  const exportToExcel = () => {
    if (filteredData.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');
    let headers, rows;
    if (reportType === 'class') {
      headers = ['نام استاد', 'روز', 'تاریخ', 'ساعت شروع', 'ساعت پایان', 'تعداد دانشجو', 'توضیحات'];
      rows = filteredData.map(c => [c.teacher_name, c.day, c.date, c.start_time, c.end_time, toPersianDigits(c.student_count), c.description || '']);
    } else if (reportType === 'payment') {
      headers = ['پرداخت کننده', 'روز', 'تاریخ', 'مبلغ (تومان)', 'بابت', 'نوع پرداخت', 'توضیحات'];
      rows = filteredData.map(p => [p.payer_name, p.day, p.date, toPersianDigits((p.amount || 0).toLocaleString()), p.for_what, p.payment_type, p.description || '']);
    } else if (reportType === 'expense') {
      headers = ['دریافت کننده', 'روز', 'تاریخ', 'مبلغ (تومان)', 'موضوع', 'نوع پرداخت', 'توضیحات'];
      rows = filteredData.map(e => [e.receiver_name, e.day, e.date, toPersianDigits((e.amount || 0).toLocaleString()), e.subject, e.payment_type, e.description || '']);
    } else { // phonebook
      headers = ['ردیف', 'نام', 'نام خانوادگی', 'موبایل', 'موبایل فضای مجازی', 'تلفن ثابت', 'توضیحات'];
      rows = filteredData.map((item, idx) => [
        idx + 1,
        item.first_name,
        item.last_name,
        toPersianDigits(item.mobile || ''),
        toPersianDigits(item.virtual_mobile || ''),
        toPersianDigits(item.landline || ''),
        item.description || ''
      ]);
    }
    const summary = getSummary();
    if (summary && reportType !== 'phonebook') {
      rows.push(['', '', '', '', '', '', '']);
      if (reportType === 'class') {
        rows.push(['جمع کل', '', '', '', '', `تعداد کلاس‌ها: ${summary.count}`, `مجموع ساعات: ${summary.totalHours} ساعت`]);
      } else {
        rows.push(['جمع کل', '', '', `${toPersianDigits((summary.totalAmount || 0).toLocaleString())} تومان`, `تعداد تراکنش: ${summary.count}`, '', '']);
      }
    } else if (summary && reportType === 'phonebook') {
      rows.push(['', '', '', '', '', '', '']);
      rows.push(['جمع کل', '', '', '', `تعداد کل مخاطبین: ${summary.count}`, '', '']);
    }
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, reportType === 'class' ? 'کلاس‌ها' : (reportType === 'payment' ? 'پرداخت‌ها' : (reportType === 'expense' ? 'هزینه‌ها' : 'دفتر تلفن')));
    XLSX.writeFile(wb, `${reportType}_report.xlsx`);
  };

  const exportToPDF = async () => {
    if (filteredData.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');
    const tempDiv = document.createElement('div');
    tempDiv.style.direction = 'rtl';
    tempDiv.style.fontFamily = 'Vazir, "Segoe UI", Tahoma, sans-serif';
    tempDiv.style.padding = '20px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.width = '1100px';
    tempDiv.style.position = 'absolute';
    tempDiv.style.top = '-9999px';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    const title = 
      reportType === 'class' ? 'گزارش کلاس‌های درس' :
      reportType === 'payment' ? 'گزارش پرداخت‌ها (شهریه)' :
      reportType === 'expense' ? 'گزارش هزینه‌ها' :
      'دفتر تلفن';

    let htmlContent = `
      <h2 style="text-align:center; margin-bottom:8px;">${title}</h2>
      <p style="text-align:center; color:#555; margin-bottom:20px;">تاریخ تهیه: ${new Date().toLocaleDateString('fa-IR')}</p>
      <table style="width:100%; border-collapse:collapse; direction:rtl; font-family:inherit;">
        <thead>
          <tr>
    `;

    if (reportType === 'class') {
      htmlContent += `
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">نام استاد</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">روز</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">تاریخ</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">ساعت شروع</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">ساعت پایان</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">تعداد دانشجو</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">توضیحات</th>
      `;
    } else if (reportType === 'payment') {
      htmlContent += `
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">پرداخت کننده</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">روز</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">تاریخ</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">مبلغ (تومان)</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">بابت</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">نوع پرداخت</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">توضیحات</th>
      `;
    } else if (reportType === 'expense') {
      htmlContent += `
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">دریافت کننده</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">روز</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">تاریخ</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">مبلغ (تومان)</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">موضوع</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">نوع پرداخت</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">توضیحات</th>
      `;
    } else {
      htmlContent += `
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">#</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">نام</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">نام خانوادگی</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">موبایل</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">موبایل مجازی</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">تلفن ثابت</th>
        <th style="background-color:#3498db; color:white; padding:10px; border:1px solid #ccc; text-align:center;">توضیحات</th>
      `;
    }
    htmlContent += `</thead><tbody>`;

    filteredData.forEach((item, idx) => {
      htmlContent += '<tr>';
      if (reportType === 'class') {
        htmlContent += `
          <td style="padding:8px; border:1px solid #ddd; text-align:right;">${item.teacher_name}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.day}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.date}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.start_time}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.end_time}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">${toPersianDigits(item.student_count)}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:right;">${item.description || ''}</td>
        `;
      } else if (reportType === 'payment') {
        htmlContent += `
          <td style="padding:8px; border:1px solid #ddd; text-align:right;">${item.payer_name}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.day}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.date}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:left;">${toPersianDigits((item.amount || 0).toLocaleString())}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:right;">${item.for_what}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.payment_type}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:right;">${item.description || ''}</td>
        `;
      } else if (reportType === 'expense') {
        htmlContent += `
          <td style="padding:8px; border:1px solid #ddd; text-align:right;">${item.receiver_name}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.day}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.date}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:left;">${toPersianDigits((item.amount || 0).toLocaleString())}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:right;">${item.subject}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.payment_type}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:right;">${item.description || ''}</td>
        `;
      } else {
        htmlContent += `
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">${toPersianDigits(idx + 1)}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:right;">${item.first_name}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:right;">${item.last_name}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:left;">${toPersianDigits(item.mobile || '')}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:left;">${toPersianDigits(item.virtual_mobile || '')}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:left;">${toPersianDigits(item.landline || '')}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:right;">${item.description || '-'}</td>
        `;
      }
      htmlContent += '</tr>';
    });

    const summary = getSummary();
    if (summary) {
      htmlContent += '<tr style="background-color:#f0f0f0; font-weight:bold;">';
      if (reportType === 'class') {
        htmlContent += `
          <td colspan="5" style="padding:8px; border:1px solid #ddd; text-align:left;">جمع کل</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">تعداد کلاس‌ها: ${summary.count}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">مجموع ساعات: ${summary.totalHours} ساعت</td>
        `;
      } else if (reportType === 'payment' || reportType === 'expense') {
        htmlContent += `
          <td colspan="3" style="padding:8px; border:1px solid #ddd; text-align:left;">جمع کل</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:right;">${toPersianDigits((summary.totalAmount || 0).toLocaleString())} تومان</td>
          <td colspan="3" style="padding:8px; border:1px solid #ddd; text-align:center;">تعداد تراکنش: ${summary.count}</td>
        `;
      } else {
        htmlContent += `
          <td colspan="6" style="padding:8px; border:1px solid #ddd; text-align:left;">جمع کل</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">تعداد مخاطبین: ${summary.count}</td>
        `;
      }
      htmlContent += '</tr>';
    }
    htmlContent += `</tbody></table>`;
    tempDiv.innerHTML = htmlContent;

    try {
      const canvas = await html2canvas(tempDiv, { scale: 2, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const imgWidth = 280;
      const pageHeight = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`${reportType}_report.pdf`);
    } catch (error) {
      console.error('PDF error:', error);
      alert('خطا در ایجاد PDF');
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const exportToCSV = () => {
    if (filteredData.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');
    let headers, rows;
    if (reportType === 'class') {
      headers = ['نام استاد', 'روز', 'تاریخ', 'ساعت شروع', 'ساعت پایان', 'تعداد دانشجو', 'توضیحات'];
      rows = filteredData.map(c => [c.teacher_name, c.day, c.date, c.start_time, c.end_time, toPersianDigits(c.student_count), c.description || '']);
    } else if (reportType === 'payment') {
      headers = ['پرداخت کننده', 'روز', 'تاریخ', 'مبلغ', 'بابت', 'نوع پرداخت', 'توضیحات'];
      rows = filteredData.map(p => [p.payer_name, p.day, p.date, toPersianDigits((p.amount || 0).toLocaleString()), p.for_what, p.payment_type, p.description || '']);
    } else if (reportType === 'expense') {
      headers = ['دریافت کننده', 'روز', 'تاریخ', 'مبلغ', 'موضوع', 'نوع پرداخت', 'توضیحات'];
      rows = filteredData.map(e => [e.receiver_name, e.day, e.date, toPersianDigits((e.amount || 0).toLocaleString()), e.subject, e.payment_type, e.description || '']);
    } else {
      headers = ['ردیف', 'نام', 'نام خانوادگی', 'موبایل', 'موبایل فضای مجازی', 'تلفن ثابت', 'توضیحات'];
      rows = filteredData.map((item, idx) => [idx + 1, item.first_name, item.last_name, toPersianDigits(item.mobile || ''), toPersianDigits(item.virtual_mobile || ''), toPersianDigits(item.landline || ''), item.description || '']);
    }
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `${reportType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="form-section">
      <h2>📊 گزارش‌گیری پیشرفته</h2>
      <div className="form-row">
        <div className="form-group">
          <label>نوع گزارش</label>
          <select value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="class">کلاس‌های درس</option>
            <option value="payment">پرداخت‌ها (شهریه)</option>
            <option value="expense">هزینه‌ها</option>
            <option value="phonebook">دفتر تلفن</option>
          </select>
        </div>
      </div>

      {reportType !== 'phonebook' && (
        <div className="form-row">
          <div className="form-group"><label>از تاریخ</label><PersianDatePicker value={filters.startDate} onChange={(val) => setFilters({ ...filters, startDate: val })} /></div>
          <div className="form-group"><label>تا تاریخ</label><PersianDatePicker value={filters.endDate} onChange={(val) => setFilters({ ...filters, endDate: val })} /></div>
        </div>
      )}

      {reportType === 'class' && (
        <>
          <div className="form-group"><label>نام استاد</label><Select   options={teachers.map(t => ({ value: `${t.first_name} ${t.last_name}`, label: `${t.first_name} ${t.last_name}` }))} onChange={(selected) => setFilters({ ...filters, teacherId: selected?.value || '' })} isClearable isSearchable placeholder="همه اساتید" /></div>
          <div className="form-group"><label>روز هفته</label><select value={filters.classDay} onChange={e => setFilters({ ...filters, classDay: e.target.value })}><option value="">همه روزها</option><option>شنبه</option><option>یکشنبه</option><option>دوشنبه</option><option>سه‌شنبه</option><option>چهارشنبه</option><option>پنجشنبه</option><option>جمعه</option></select></div>
          <div className="form-group">
  <label>تعداد دانشجو (دقیق)</label>
  <PersianNumberInput
    value={filters.studentCount}
    onChange={(val) => setFilters({ ...filters, studentCount: val })}
    placeholder="مثال: ۵"
  />
</div>
        </>
      )}
      {reportType === 'payment' && (
        <div className="form-group"><label>نوع پرداخت</label><select value={filters.paymentType} onChange={e => setFilters({ ...filters, paymentType: e.target.value })}><option value="">همه</option><option value="نقدی">نقدی</option><option value="پوز">پوز</option><option value="انتقال">انتقال</option></select></div>
      )}
      {reportType === 'expense' && (
        <>
          <div className="form-group"><label>موضوع هزینه</label><select value={filters.expenseSubject} onChange={e => setFilters({ ...filters, expenseSubject: e.target.value })}><option value="">همه موضوعات</option><option value="حقوق">حقوق</option><option value="هزینه های جاری">هزینه های جاری</option><option value="امکانات">امکانات</option><option value="قبض">قبض</option></select></div>
          <div className="form-group"><label>نوع پرداخت</label><select value={filters.paymentType} onChange={e => setFilters({ ...filters, paymentType: e.target.value })}><option value="">همه</option><option value="نقدی">نقدی</option><option value="چک">چک</option><option value="انتقال">انتقال</option></select></div>
        </>
      )}
      {reportType === 'phonebook' && (
        <div className="form-group"><label>جستجو (نام، نام خانوادگی، موبایل)</label><input type="text" value={filters.phonebookSearch} onChange={e => setFilters({ ...filters, phonebookSearch: e.target.value })} placeholder="متن مورد نظر..." className="w-full px-3 py-2 border rounded-lg" /></div>
      )}

       <div className="form-row">
        <div className="form-group">
          <label>جستجو در توضیحات</label>
          <input
            type="text"
            value={filters.descriptionSearch}
            onChange={e => setFilters({ ...filters, descriptionSearch: e.target.value })}
            placeholder="متن مورد نظر..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      <div className="form-row mt-2">
        <button className="btn submit" onClick={applyFilters}>اعمال فیلتر</button>
        <button className="btn backup" onClick={exportToExcel}>📎 خروجی Excel</button>
        <button className="btn restore" onClick={exportToPDF}>📄 خروجی PDF</button>
        <button className="btn" onClick={exportToCSV}>📄 خروجی CSV</button>
      </div>

      {filteredData.length > 0 && (
        <div className="list-section">
          <h3>نتایج ({toPersianDigits(filteredData.length)} رکورد)</h3>
          <div className="data-table" style={{ overflowX: 'auto' }}>
            <table className="results-table">
              <thead>
                <tr>
                  {reportType === 'class' && (
                    <>
                      <th style={{ width: '5%', cursor: 'pointer' }} onClick={() => requestSort('id')}>
                        # {getSortIndicator('id')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('teacher_name')}>
                        نام استاد {getSortIndicator('teacher_name')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('day')}>
                        روز {getSortIndicator('day')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('date')}>
                        تاریخ {getSortIndicator('date')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('start_time')}>
                        ساعت شروع {getSortIndicator('start_time')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('end_time')}>
                        ساعت پایان {getSortIndicator('end_time')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('student_count')}>
                        تعداد دانشجو {getSortIndicator('student_count')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('description')}>
                        توضیحات {getSortIndicator('description')}
                      </th>
                    </>
                  )}
                  {reportType === 'payment' && (
                    <>
                      <th style={{ width: '5%', cursor: 'pointer' }} onClick={() => requestSort('id')}>
                        # {getSortIndicator('id')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('payer_name')}>
                        پرداخت کننده {getSortIndicator('payer_name')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('day')}>
                        روز {getSortIndicator('day')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('date')}>
                        تاریخ {getSortIndicator('date')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('amount')}>
                        مبلغ (تومان) {getSortIndicator('amount')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('for_what')}>
                        بابت {getSortIndicator('for_what')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('payment_type')}>
                        نوع پرداخت {getSortIndicator('payment_type')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('description')}>
                        توضیحات {getSortIndicator('description')}
                      </th>
                    </>
                  )}
                  {reportType === 'expense' && (
                    <>
                      <th style={{ width: '5%', cursor: 'pointer' }} onClick={() => requestSort('id')}>
                        # {getSortIndicator('id')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('receiver_name')}>
                        دریافت کننده {getSortIndicator('receiver_name')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('day')}>
                        روز {getSortIndicator('day')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('date')}>
                        تاریخ {getSortIndicator('date')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('amount')}>
                        مبلغ (تومان) {getSortIndicator('amount')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('subject')}>
                        موضوع {getSortIndicator('subject')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('payment_type')}>
                        نوع پرداخت {getSortIndicator('payment_type')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('description')}>
                        توضیحات {getSortIndicator('description')}
                      </th>
                    </>
                  )}
                  {reportType === 'phonebook' && (
                    <>
                      <th style={{ width: '5%', cursor: 'pointer' }} onClick={() => requestSort('id')}>
                        # {getSortIndicator('id')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('first_name')}>
                        نام {getSortIndicator('first_name')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('last_name')}>
                        نام خانوادگی {getSortIndicator('last_name')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('mobile')}>
                        موبایل {getSortIndicator('mobile')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('virtual_mobile')}>
                        موبایل مجازی {getSortIndicator('virtual_mobile')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('landline')}>
                        تلفن ثابت {getSortIndicator('landline')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('description')}>
                        توضیحات {getSortIndicator('description')}
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item, idx) => (
                  <tr key={idx}>
                    {reportType === 'class' && (
                      <>
<td style={{ textAlign: 'center' }}>{toPersianDigits(idx + 1)}</td>
                        <td>{item.teacher_name}</td>
                        <td>{item.day}</td>
                        <td>{item.date}</td>
                        <td>{item.start_time}</td>
                        <td>{item.end_time}</td>
                        <td>{toPersianDigits(item.student_count)}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {reportType === 'payment' && (
                      <>
<td style={{ textAlign: 'center' }}>{toPersianDigits(idx + 1)}</td>
                        <td>{item.payer_name}</td>
                        <td>{item.day}</td>
                        <td>{item.date}</td>
                        <td>{toPersianDigits((item.amount || 0).toLocaleString())}</td>
                        <td>{item.for_what}</td>
                        <td>{item.payment_type}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {reportType === 'expense' && (
                      <>
<td style={{ textAlign: 'center' }}>{toPersianDigits(idx + 1)}</td>
                        <td>{item.receiver_name}</td>
                        <td>{item.day}</td>
                        <td>{item.date}</td>
                        <td>{toPersianDigits((item.amount || 0).toLocaleString())}</td>
                        <td>{item.subject}</td>
                        <td>{item.payment_type}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {reportType === 'phonebook' && (
                      <>
                        <td style={{ textAlign: 'center' }}>{toPersianDigits(item.id) || toPersianDigits(idx + 1)}</td>
                        <td>{item.first_name}</td>
                        <td>{item.last_name}</td>
                        <td>{toPersianDigits(item.mobile)}</td>
                        <td>{toPersianDigits(item.virtual_mobile)}</td>
                        <td>{toPersianDigits(item.landline)}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(() => {
            const summary = getSummary();
            if (!summary) return null;
            return (
              <div className="summary-card">
                {reportType === 'class' && <p>📊 جمع گزارش: {summary.count} کلاس | مجموع ساعات: {summary.totalHours} ساعت</p>}
                {(reportType === 'payment' || reportType === 'expense') && <p>💰 جمع مبلغ: {toPersianDigits((summary.totalAmount || 0).toLocaleString())} تومان | تعداد تراکنش: {summary.count}</p>}
                {reportType === 'phonebook' && <p>📞 جمع کل مخاطبین: {summary.count} نفر</p>}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default Reports;