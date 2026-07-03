// renderer/src/components/Reports.jsx
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import html2pdf from 'html2pdf.js';
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
    descriptionSearch: '',
    studentCount: ''
  });
  const [filteredData, setFilteredData] = useState([]);
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

  // ========== خروجی Excel با ستون شماره ردیف ==========
  const exportToExcel = () => {
    if (filteredData.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');
    let headers, rows;

    if (reportType === 'class') {
      headers = ['#', 'نام استاد', 'روز', 'تاریخ', 'ساعت شروع', 'ساعت پایان', 'تعداد دانشجو', 'توضیحات'];
      rows = filteredData.map((c, idx) => [
        idx + 1,
        c.teacher_name,
        c.day,
        c.date,
        c.start_time,
        c.end_time,
        toPersianDigits(c.student_count),
        c.description || ''
      ]);
    } else if (reportType === 'payment') {
      headers = ['#', 'پرداخت کننده', 'روز', 'تاریخ', 'مبلغ (تومان)', 'بابت', 'نوع پرداخت', 'توضیحات'];
      rows = filteredData.map((p, idx) => [
        idx + 1,
        p.payer_name,
        p.day,
        p.date,
        toPersianDigits((p.amount || 0).toLocaleString()),
        p.for_what,
        p.payment_type,
        p.description || ''
      ]);
    } else if (reportType === 'expense') {
      headers = ['#', 'دریافت کننده', 'روز', 'تاریخ', 'مبلغ (تومان)', 'موضوع', 'نوع پرداخت', 'توضیحات'];
      rows = filteredData.map((e, idx) => [
        idx + 1,
        e.receiver_name,
        e.day,
        e.date,
        toPersianDigits((e.amount || 0).toLocaleString()),
        e.subject,
        e.payment_type,
        e.description || ''
      ]);
    } else { // phonebook
      headers = ['#', 'نام', 'نام خانوادگی', 'موبایل', 'موبایل فضای مجازی', 'تلفن ثابت', 'توضیحات'];
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

  // ========== خروجی PDF (با html2pdf.js برای صفحه‌بندی اصولی) ==========
// ========== خروجی PDF با کیفیت بالا و نمایش کامل توضیحات ==========
// ========== خروجی PDF با کیفیت بالا و نمایش کامل توضیحات ==========
// ========== خروجی PDF با کیفیت بالا و نمایش کامل توضیحات ==========
// ========== خروجی PDF با کیفیت بالا و نمایش کامل توضیحات ==========
// ========== خروجی PDF با کیفیت بالا و نمایش کامل توضیحات ==========
const exportToPDF = () => {
  if (sortedData.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.'); // ← استفاده از sortedData

  const tempDiv = document.createElement('div');
  tempDiv.style.direction = 'rtl';
  tempDiv.style.fontFamily = 'Vazir, "Segoe UI", Tahoma, sans-serif';
  tempDiv.style.padding = '15px 15px 25px 15px';
  tempDiv.style.backgroundColor = 'white';
  tempDiv.style.width = '1100px';  // افزایش عرض
  tempDiv.style.fontSize = '12px';
  tempDiv.style.overflow = 'visible';
  document.body.appendChild(tempDiv);

  const title =
    reportType === 'class' ? 'گزارش کلاس‌های درس' :
    reportType === 'payment' ? 'گزارش پرداخت‌ها (شهریه)' :
    reportType === 'expense' ? 'گزارش هزینه‌ها' :
    'دفتر تلفن';

  let htmlContent = `
    <h2 style="text-align:center; margin-bottom:6px; font-size:16px;">${title}</h2>
    <p style="text-align:center; color:#555; margin-bottom:15px; font-size:12px;">تاریخ تهیه: ${new Date().toLocaleDateString('fa-IR')}</p>
    <table style="width:100%; border-collapse:collapse; direction:rtl; font-size:11px; table-layout:auto;">
      <thead>
        <tr>
  `;

  // ========== هدرها ==========
  if (reportType === 'class') {
    htmlContent += `
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:5%;">#</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:14%;">نام استاد</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:8%;">روز</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:10%;">تاریخ</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:8%;">ساعت شروع</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:8%;">ساعت پایان</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:8%;">تعداد</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:39%;">توضیحات</th>
    `;
  } else if (reportType === 'payment') {
    htmlContent += `
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:5%;">#</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:14%;">پرداخت کننده</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:8%;">روز</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:10%;">تاریخ</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:12%;">مبلغ (تومان)</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:10%;">بابت</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:10%;">نوع پرداخت</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:31%;">توضیحات</th>
    `;
  } else if (reportType === 'expense') {
    htmlContent += `
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:5%;">#</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:14%;">دریافت کننده</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:8%;">روز</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:10%;">تاریخ</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:12%;">مبلغ (تومان)</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:10%;">موضوع</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:10%;">نوع پرداخت</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:31%;">توضیحات</th>
    `;
  } else { // phonebook
    htmlContent += `
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:5%;">#</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:14%;">نام</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:14%;">نام خانوادگی</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:11%;">موبایل</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:11%;">موبایل مجازی</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:11%;">تلفن ثابت</th>
      <th style="background-color:#3498db; color:white; padding:6px 8px; border:1px solid #ccc; text-align:center; width:34%;">توضیحات</th>
    `;
  }
  htmlContent += `</thead><tbody>`;

  // ========== ردیف‌های داده ==========
  sortedData.forEach((item, idx) => {
    htmlContent += '<tr>';
    if (reportType === 'class') {
      htmlContent += `
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:center; font-size:10px;">${toPersianDigits(idx + 1)}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:right; font-size:10px;">${item.teacher_name}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:center; font-size:10px;">${item.day}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:center; font-size:10px; white-space:nowrap;">${item.date}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:center; font-size:10px;">${item.start_time}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:center; font-size:10px;">${item.end_time}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:center; font-size:10px;">${toPersianDigits(item.student_count)}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:right; font-size:10px; word-break:break-word; white-space:normal; min-height:25px; line-height:1.4;">${item.description || ''}</td>
      `;
    } else if (reportType === 'payment') {
      htmlContent += `
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:center; font-size:10px;">${toPersianDigits(idx + 1)}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:right; font-size:10px;">${item.payer_name}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:center; font-size:10px;">${item.day}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:center; font-size:10px; white-space:nowrap;">${item.date}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:right; font-size:10px;">${toPersianDigits((item.amount || 0).toLocaleString())}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:right; font-size:10px;">${item.for_what}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:center; font-size:10px;">${item.payment_type}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:right; font-size:10px; word-break:break-word; white-space:normal; min-height:25px; line-height:1.4;">${item.description || ''}</td>
      `;
    } else if (reportType === 'expense') {
      htmlContent += `
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:center; font-size:10px;">${toPersianDigits(idx + 1)}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:right; font-size:10px;">${item.receiver_name}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:center; font-size:10px;">${item.day}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:center; font-size:10px; white-space:nowrap;">${item.date}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:right; font-size:10px;">${toPersianDigits((item.amount || 0).toLocaleString())}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:right; font-size:10px;">${item.subject}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:center; font-size:10px;">${item.payment_type}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:right; font-size:10px; word-break:break-word; white-space:normal; min-height:25px; line-height:1.4;">${item.description || ''}</td>
      `;
    } else { // phonebook
      htmlContent += `
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:center; font-size:10px;">${toPersianDigits(idx + 1)}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:right; font-size:10px;">${item.first_name}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:right; font-size:10px;">${item.last_name}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:left; font-size:10px;">${toPersianDigits(item.mobile || '')}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:left; font-size:10px;">${toPersianDigits(item.virtual_mobile || '')}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:left; font-size:10px;">${toPersianDigits(item.landline || '')}</td>
        <td style="padding:5px 6px; border:1px solid #ddd; text-align:right; font-size:10px; word-break:break-word; white-space:normal; min-height:25px; line-height:1.4;">${item.description || '-'}</td>
      `;
    }
    htmlContent += '</tr>';
  });

  // ========== ردیف جمع ==========
  const summary = getSummary();
  if (summary) {
    htmlContent += '<tr style="background-color:#f0f0f0; font-weight:bold;">';
    if (reportType === 'class') {
      htmlContent += `
        <td colspan="6" style="padding:6px 8px; border:1px solid #ddd; text-align:left; font-size:10px;">جمع کل</td>
        <td style="padding:6px 8px; border:1px solid #ddd; text-align:center; font-size:10px;">تعداد: ${summary.count}</td>
        <td style="padding:6px 8px; border:1px solid #ddd; text-align:center; font-size:10px;">ساعات: ${summary.totalHours}</td>
      `;
    } else if (reportType === 'payment' || reportType === 'expense') {
      htmlContent += `
        <td colspan="4" style="padding:6px 8px; border:1px solid #ddd; text-align:left; font-size:10px;">جمع کل</td>
        <td style="padding:6px 8px; border:1px solid #ddd; text-align:right; font-size:10px;">${toPersianDigits((summary.totalAmount || 0).toLocaleString())} تومان</td>
        <td colspan="3" style="padding:6px 8px; border:1px solid #ddd; text-align:center; font-size:10px;">تعداد: ${summary.count}</td>
      `;
    } else {
      htmlContent += `
        <td colspan="6" style="padding:6px 8px; border:1px solid #ddd; text-align:left; font-size:10px;">جمع کل</td>
        <td colspan="2" style="padding:6px 8px; border:1px solid #ddd; text-align:center; font-size:10px;">تعداد: ${summary.count}</td>
      `;
    }
    htmlContent += '</tr>';
  }
  htmlContent += `</tbody></table>`;
  tempDiv.innerHTML = htmlContent;

  // ========== تنظیمات html2pdf ==========
  const opt = {
    margin: [8, 8, 20, 8],
    filename: `${reportType}_report.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: {
      scale: 2,
      logging: false,
      useCORS: true,
      letterRendering: true
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy']
    }
  };

  html2pdf()
    .set(opt)
    .from(tempDiv)
    .save()
    .then(() => {
      document.body.removeChild(tempDiv);
    })
    .catch((err) => {
      console.error('PDF error:', err);
      alert('خطا در ایجاد PDF');
      document.body.removeChild(tempDiv);
    });
};
  // ========== خروجی CSV با شماره ردیف ==========
  const exportToCSV = () => {
    if (filteredData.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');
    let headers, rows;

    if (reportType === 'class') {
      headers = ['#', 'نام استاد', 'روز', 'تاریخ', 'ساعت شروع', 'ساعت پایان', 'تعداد دانشجو', 'توضیحات'];
      rows = filteredData.map((c, idx) => [
        idx + 1,
        c.teacher_name,
        c.day,
        c.date,
        c.start_time,
        c.end_time,
        toPersianDigits(c.student_count),
        c.description || ''
      ]);
    } else if (reportType === 'payment') {
      headers = ['#', 'پرداخت کننده', 'روز', 'تاریخ', 'مبلغ', 'بابت', 'نوع پرداخت', 'توضیحات'];
      rows = filteredData.map((p, idx) => [
        idx + 1,
        p.payer_name,
        p.day,
        p.date,
        toPersianDigits((p.amount || 0).toLocaleString()),
        p.for_what,
        p.payment_type,
        p.description || ''
      ]);
    } else if (reportType === 'expense') {
      headers = ['#', 'دریافت کننده', 'روز', 'تاریخ', 'مبلغ', 'موضوع', 'نوع پرداخت', 'توضیحات'];
      rows = filteredData.map((e, idx) => [
        idx + 1,
        e.receiver_name,
        e.day,
        e.date,
        toPersianDigits((e.amount || 0).toLocaleString()),
        e.subject,
        e.payment_type,
        e.description || ''
      ]);
    } else { // phonebook
      headers = ['#', 'نام', 'نام خانوادگی', 'موبایل', 'موبایل فضای مجازی', 'تلفن ثابت', 'توضیحات'];
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
          <div className="form-group"><label>نام استاد</label><Select options={teachers.map(t => ({ value: `${t.first_name} ${t.last_name}`, label: `${t.first_name} ${t.last_name}` }))} onChange={(selected) => setFilters({ ...filters, teacherId: selected?.value || '' })} isClearable isSearchable placeholder="همه اساتید" /></div>
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
                      <th style={{ width: '5%', cursor: 'pointer' }} onClick={() => requestSort('id')}># {getSortIndicator('id')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('teacher_name')}>نام استاد {getSortIndicator('teacher_name')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('day')}>روز {getSortIndicator('day')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('date')}>تاریخ {getSortIndicator('date')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('start_time')}>ساعت شروع {getSortIndicator('start_time')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('end_time')}>ساعت پایان {getSortIndicator('end_time')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('student_count')}>تعداد دانشجو {getSortIndicator('student_count')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('description')}>توضیحات {getSortIndicator('description')}</th>
                    </>
                  )}
                  {reportType === 'payment' && (
                    <>
                      <th style={{ width: '5%', cursor: 'pointer' }} onClick={() => requestSort('id')}># {getSortIndicator('id')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('payer_name')}>پرداخت کننده {getSortIndicator('payer_name')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('day')}>روز {getSortIndicator('day')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('date')}>تاریخ {getSortIndicator('date')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('amount')}>مبلغ (تومان) {getSortIndicator('amount')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('for_what')}>بابت {getSortIndicator('for_what')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('payment_type')}>نوع پرداخت {getSortIndicator('payment_type')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('description')}>توضیحات {getSortIndicator('description')}</th>
                    </>
                  )}
                  {reportType === 'expense' && (
                    <>
                      <th style={{ width: '5%', cursor: 'pointer' }} onClick={() => requestSort('id')}># {getSortIndicator('id')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('receiver_name')}>دریافت کننده {getSortIndicator('receiver_name')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('day')}>روز {getSortIndicator('day')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('date')}>تاریخ {getSortIndicator('date')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('amount')}>مبلغ (تومان) {getSortIndicator('amount')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('subject')}>موضوع {getSortIndicator('subject')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('payment_type')}>نوع پرداخت {getSortIndicator('payment_type')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('description')}>توضیحات {getSortIndicator('description')}</th>
                    </>
                  )}
                  {reportType === 'phonebook' && (
                    <>
                      <th style={{ width: '5%', cursor: 'pointer' }} onClick={() => requestSort('id')}># {getSortIndicator('id')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('first_name')}>نام {getSortIndicator('first_name')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('last_name')}>نام خانوادگی {getSortIndicator('last_name')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('mobile')}>موبایل {getSortIndicator('mobile')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('virtual_mobile')}>موبایل مجازی {getSortIndicator('virtual_mobile')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('landline')}>تلفن ثابت {getSortIndicator('landline')}</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('description')}>توضیحات {getSortIndicator('description')}</th>
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
                        <td style={{ textAlign: 'center' }}>{toPersianDigits(idx + 1)}</td>
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