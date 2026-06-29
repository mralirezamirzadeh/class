const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('./database-sqlite.js');

let mainWindow;
let db;
const DB_PATH = path.join(app.getPath('userData'), 'school.db');
const BACKUP_DIR = path.join(app.getPath('userData'), 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log('✅ پوشه backups ایجاد شد:', BACKUP_DIR);
}

function initDatabase() {
  db = new Database(DB_PATH);
  console.log('✅ دیتابیس SQLite راه‌اندازی شد', DB_PATH);
}

function autoBackup() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.log('❌ دیتابیس وجود ندارد، پشتیبان خودکار انجام نشد.');
      return;
    }
    const now = new Date();
    const backupName = `backup_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}.db`;
    const backupPath = path.join(BACKUP_DIR, backupName);
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`✅ پشتیبان خودکار ذخیره شد: ${backupPath}`);
  } catch (err) {
    console.error('❌ خطا در پشتیبان خودکار:', err.message);
  }
}

function setupIpcHandlers() {
  ipcMain.handle('get-classrooms', () => db.getAllClassrooms());
  ipcMain.handle('add-classroom', (event, data) => db.addClassroom(data));
  ipcMain.handle('update-classroom', (event, id, data) => db.updateClassroom(id, data));
  ipcMain.handle('delete-classroom', (event, id) => db.deleteClassroom(id));

  ipcMain.handle('get-payments', () => db.getAllPayments());
  ipcMain.handle('add-payment', (event, data) => db.addPayment(data));
  ipcMain.handle('update-payment', (event, id, data) => db.updatePayment(id, data));
  ipcMain.handle('delete-payment', (event, id) => db.deletePayment(id));

  ipcMain.handle('get-teachers', () => db.getAllTeachers());
  ipcMain.handle('add-teacher', (event, data) => db.addTeacher(data));
  ipcMain.handle('update-teacher', (event, id, data) => db.updateTeacher(id, data));
  ipcMain.handle('delete-teacher', (event, id) => db.deleteTeacher(id));

  ipcMain.handle('get-expenses', () => db.getAllExpenses());
  ipcMain.handle('add-expense', (event, data) => db.addExpense(data));
  ipcMain.handle('update-expense', (event, id, data) => db.updateExpense(id, data));
  ipcMain.handle('delete-expense', (event, id) => db.deleteExpense(id));

  ipcMain.handle('get-phonebook', () => db.getAllPhonebook());
ipcMain.handle('add-phonebook', (event, data) => db.addPhonebook(data));
ipcMain.handle('update-phonebook', (event, id, data) => db.updatePhonebook(id, data));
ipcMain.handle('delete-phonebook', (event, id) => db.deletePhonebook(id));
  

  ipcMain.handle('backup-database', async () => {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'ذخیره پشتیبان',
      defaultPath: `backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.db`,
      filters: [{ name: 'Database', extensions: ['db'] }]
    });
    if (filePath) {
      const success = db.backup(filePath);
      return { success, path: filePath };
    }
    return { success: false };
  });

  ipcMain.handle('restore-database', async () => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'انتخاب فایل پشتیبان',
      filters: [{ name: 'Database', extensions: ['db'] }],
      properties: ['openFile']
    });
    if (filePaths && filePaths[0]) {
      const success = db.restore(filePaths[0]);
      if (success) {
        mainWindow.webContents.reload();
      }
      return { success };
    }
    return { success: false };
  });
}


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (app.isPackaged) {
    // در نسخه打包 شده، فایل index.html را از پوشه renderer/dist بارگذاری کن
    const indexPath = path.join(__dirname, 'renderer', 'dist', 'index.html');
    console.log('Loading index.html from:', indexPath);
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
      // اگر خطا خورد، مسیر جایگزین را امتحان کن
      const altPath = path.join(process.resourcesPath, 'app.asar', 'renderer', 'dist', 'index.html');
      mainWindow.loadFile(altPath);
    });
  } else {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  }
}


app.whenReady().then(() => {
  initDatabase();
  setupIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  autoBackup();
  if (process.platform !== 'darwin') app.quit();
});