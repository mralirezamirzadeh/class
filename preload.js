const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // کلاس‌ها
  getClassrooms: () => ipcRenderer.invoke('get-classrooms'),
  addClassroom: (data) => ipcRenderer.invoke('add-classroom', data),
  updateClassroom: (id, data) => ipcRenderer.invoke('update-classroom', id, data),
  deleteClassroom: (id) => ipcRenderer.invoke('delete-classroom', id),

  // پرداخت‌ها
  getPayments: () => ipcRenderer.invoke('get-payments'),
  addPayment: (data) => ipcRenderer.invoke('add-payment', data),
  updatePayment: (id, data) => ipcRenderer.invoke('update-payment', id, data),
  deletePayment: (id) => ipcRenderer.invoke('delete-payment', id),

  // اساتید
  getTeachers: () => ipcRenderer.invoke('get-teachers'),
  addTeacher: (data) => ipcRenderer.invoke('add-teacher', data),
  updateTeacher: (id, data) => ipcRenderer.invoke('update-teacher', id, data),
  deleteTeacher: (id) => ipcRenderer.invoke('delete-teacher', id),


  getExpenses: () => ipcRenderer.invoke('get-expenses'),
  addExpense: (data) => ipcRenderer.invoke('add-expense', data),
  updateExpense: (id, data) => ipcRenderer.invoke('update-expense', id, data),
  deleteExpense: (id) => ipcRenderer.invoke('delete-expense', id),


  getPhonebook: () => ipcRenderer.invoke('get-phonebook'),
addPhonebook: (data) => ipcRenderer.invoke('add-phonebook', data),
updatePhonebook: (id, data) => ipcRenderer.invoke('update-phonebook', id, data),
deletePhonebook: (id) => ipcRenderer.invoke('delete-phonebook', id),

  // پشتیبان
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  restoreDatabase: () => ipcRenderer.invoke('restore-database')
});