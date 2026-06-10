// src/App.jsx
import React, { useState, useEffect } from 'react';
import Classrooms from './components/Classrooms';
import Payments from './components/Payments';
import Teachers from './components/Teachers';
import Reports from './components/Reports';
import Expenses from './components/Expenses';
import Login from './components/Login';
import Phonebook from './components/Phonebook';

function App() {
  const [activeTab, setActiveTab] = useState('classrooms');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // بررسی وضعیت لاگین در هنگام بارگذاری
  useEffect(() => {
    const auth = sessionStorage.getItem('isAuthenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // هوک دارک مود (قبل از return شرطی)
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogin = (status) => {
    setIsAuthenticated(status);
    if (status) {
      sessionStorage.setItem('isAuthenticated', 'true');
    } else {
      sessionStorage.removeItem('isAuthenticated');
    }
  };

  const handleLogout = () => {
    handleLogin(false);
  };

  const handleBackup = async () => {
    const result = await window.api.backupDatabase();
    if (result.success) alert(`پشتیبان در ${result.path} ذخیره شد.`);
    else alert('پشتیبان‌گیری لغو شد.');
  };

  const handleRestore = async () => {
    if (confirm('بازیابی اطلاعات، داده‌های فعلی را جایگزین می‌کند. ادامه؟')) {
      const result = await window.api.restoreDatabase();
      if (result.success) alert('بازیابی با موفقیت انجام شد.');
      else alert('بازیابی ناموفق یا لغو شد.');
    }
  };

  // اگر لاگین نشده، صفحه لاگین را نمایش بده (بعد از همه هوک‌ها)
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header>
        <div className='flex justify-center items-center gap-2 '>
          <img src="./images/logo.jpg" alt="logo" width={64} height={64}/>
          <h1 className='text-3xl font-black'>آموزشگاه هیأت امنایی هوش برتر</h1>
        </div>
        <div className="header-buttons">
          <button onClick={() => setDarkMode(!darkMode)} className="theme-toggle">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={handleLogout} className="btn logout">🚪 خروج</button>
          <button onClick={handleBackup} className="btn backup">💾 پشتیبان‌گیری</button>
          <button onClick={handleRestore} className="btn restore">📂 بازیابی از پشتیبان</button>
        </div>
      </header>
      <div className="tabs">
        <button className={activeTab === 'classrooms' ? 'tab active' : 'tab'} onClick={() => setActiveTab('classrooms')}>📚 کلاس‌های درس</button>
        <button className={activeTab === 'teachers' ? 'tab active' : 'tab'} onClick={() => setActiveTab('teachers')}>👨‍🏫 اساتید و کارکنان</button>
        <button className={activeTab === 'payments' ? 'tab active' : 'tab'} onClick={() => setActiveTab('payments')}>💰 شهریه</button>
        <button className={activeTab === 'expenses' ? 'tab active' : 'tab'} onClick={() => setActiveTab('expenses')}>💵 هزینه‌ها</button>
        <button className={activeTab === 'phonebook' ? 'tab active' : 'tab'} onClick={() => setActiveTab('phonebook')}>📞 دفتر تلفن</button>

        <button className={activeTab === 'reports' ? 'tab active' : 'tab'} onClick={() => setActiveTab('reports')}>📊 گزارش‌گیری</button>
      </div>
      <div className="tab-content">
        {activeTab === 'classrooms' && <Classrooms />}
        {activeTab === 'teachers' && <Teachers />}
        {activeTab === 'payments' && <Payments />}
        {activeTab === 'expenses' && <Expenses />}
        {activeTab === 'phonebook' && <Phonebook />}

        {activeTab === 'reports' && <Reports />}
      </div>
    </div>
  );
}

export default App;