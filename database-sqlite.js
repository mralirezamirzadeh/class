const Database = require('better-sqlite3');
const fs = require('fs');

class SQLiteDatabase {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this.initTables();
    this.migrate(); // اضافه کردن ستون‌های جدید (اگر وجود نداشته باشند)
    this.migratePhonebook(); // اضافه کردن جدول phonebook در صورت عدم وجود
    this.ensurePhonebookTable();
  }

  initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS classrooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_name TEXT NOT NULL,
        day TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        student_count INTEGER DEFAULT 0,
        description TEXT
      );
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payer_name TEXT NOT NULL,
        day TEXT NOT NULL,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        for_what TEXT NOT NULL,
        payment_type TEXT NOT NULL,
        description TEXT
      );
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receiver_name TEXT NOT NULL,
        day TEXT NOT NULL,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        subject TEXT NOT NULL,
        payment_type TEXT NOT NULL,
        description TEXT
      );
      CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        national_code TEXT UNIQUE,
        father_name TEXT,
        birth_date TEXT,
        birth_place_issue TEXT,
        birth_place TEXT,
        mobile TEXT,
        virtual_space TEXT,
        degree TEXT,
        field_of_study TEXT,
        home_address TEXT,
        work_address TEXT,
        work_experience TEXT,
        bank_account TEXT,
        bank_card TEXT
      );
      CREATE TABLE IF NOT EXISTS phonebook (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  mobile TEXT,
  virtual_mobile TEXT,
  landline TEXT,
  description TEXT
);
    `);
  }

  

  // مهاجرت خودکار: اضافه کردن ستون‌های جدید بدون نیاز به کاربر
  migrate() {
    const tableInfo = this.db.prepare("PRAGMA table_info(classrooms)").all();
    const existingColumns = tableInfo.map(col => col.name);
    const newColumns = ['lesson', 'grade', 'gender', 'class_number'];
    for (const col of newColumns) {
      if (!existingColumns.includes(col)) {
        this.db.exec(`ALTER TABLE classrooms ADD COLUMN ${col} TEXT;`);
        console.log(`✅ ستون ${col} به جدول classrooms اضافه شد.`);
      }
    }
  }

    migratePhonebook() {
    const tableExists = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='phonebook'").get();
    if (!tableExists) {
      this.db.exec(`
        CREATE TABLE phonebook (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          mobile TEXT,
          virtual_mobile TEXT,
          landline TEXT,
          description TEXT
        )
      `);
      console.log('✅ جدول phonebook ایجاد شد.');
    }
  }

  ensurePhonebookTable() {
  const table = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='phonebook'").get();
  if (!table) {
    this.db.exec(`
      CREATE TABLE phonebook (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        mobile TEXT,
        virtual_mobile TEXT,
        landline TEXT,
        description TEXT
      )
    `);
    console.log('جدول phonebook ایجاد شد.');
  }
}

  getAllClassrooms() {
    return this.db.prepare('SELECT * FROM classrooms ORDER BY id DESC').all();
  }

  addClassroom(data) {
    const stmt = this.db.prepare(`
      INSERT INTO classrooms (
        teacher_name, day, date, start_time, end_time, student_count, description,
        lesson, grade, gender, class_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      data.teacher_name, data.day, data.date, data.start_time, data.end_time,
      data.student_count, data.description,
      data.lesson, data.grade, data.gender, data.class_number
    );
    return { id: info.lastInsertRowid, ...data };
  }

  updateClassroom(id, data) {
    const stmt = this.db.prepare(`
      UPDATE classrooms SET
        teacher_name=?, day=?, date=?, start_time=?, end_time=?, student_count=?, description=?,
        lesson=?, grade=?, gender=?, class_number=?
      WHERE id=?
    `);
    stmt.run(
      data.teacher_name, data.day, data.date, data.start_time, data.end_time,
      data.student_count, data.description,
      data.lesson, data.grade, data.gender, data.class_number,
      id
    );
    return { id, ...data };
  }

  deleteClassroom(id) {
    this.db.prepare('DELETE FROM classrooms WHERE id=?').run(id);
    return true;
  }

  // ---------- پرداخت‌ها ----------
  getAllPayments() {
    return this.db.prepare('SELECT * FROM payments ORDER BY id DESC').all();
  }

  addPayment(data) {
    const stmt = this.db.prepare(`
      INSERT INTO payments (payer_name, day, date, amount, for_what, payment_type, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(data.payer_name, data.day, data.date, data.amount, data.for_what, data.payment_type, data.description);
    return { id: info.lastInsertRowid, ...data };
  }

  updatePayment(id, data) {
    const stmt = this.db.prepare(`
      UPDATE payments SET payer_name=?, day=?, date=?, amount=?, for_what=?, payment_type=?, description=?
      WHERE id=?
    `);
    stmt.run(data.payer_name, data.day, data.date, data.amount, data.for_what, data.payment_type, data.description, id);
    return { id, ...data };
  }

  deletePayment(id) {
    this.db.prepare('DELETE FROM payments WHERE id=?').run(id);
    return true;
  }

  // ---------- اساتید و کارکنان ----------
  getAllTeachers() {
    return this.db.prepare('SELECT * FROM teachers ORDER BY last_name, first_name').all();
  }

  addTeacher(data) {
    const stmt = this.db.prepare(`
      INSERT INTO teachers (
        first_name, last_name, national_code, father_name, birth_date,
        birth_place_issue, birth_place, mobile, virtual_space, degree,
        field_of_study, home_address, work_address, work_experience,
        bank_account, bank_card
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      data.first_name, data.last_name, data.national_code, data.father_name,
      data.birth_date, data.birth_place_issue, data.birth_place, data.mobile,
      data.virtual_space, data.degree, data.field_of_study, data.home_address,
      data.work_address, data.work_experience, data.bank_account, data.bank_card
    );
    return { id: info.lastInsertRowid, ...data };
  }

  updateTeacher(id, data) {
    const stmt = this.db.prepare(`
      UPDATE teachers SET
        first_name=?, last_name=?, national_code=?, father_name=?, birth_date=?,
        birth_place_issue=?, birth_place=?, mobile=?, virtual_space=?, degree=?,
        field_of_study=?, home_address=?, work_address=?, work_experience=?,
        bank_account=?, bank_card=?
      WHERE id=?
    `);
    stmt.run(
      data.first_name, data.last_name, data.national_code, data.father_name,
      data.birth_date, data.birth_place_issue, data.birth_place, data.mobile,
      data.virtual_space, data.degree, data.field_of_study, data.home_address,
      data.work_address, data.work_experience, data.bank_account, data.bank_card,
      id
    );
    return { id, ...data };
  }


  getAllExpenses() {
  return this.db.prepare('SELECT * FROM expenses ORDER BY id DESC').all();
}
addExpense(data) {
  const stmt = this.db.prepare(`
    INSERT INTO expenses (receiver_name, day, date, amount, subject, payment_type, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(data.receiver_name, data.day, data.date, data.amount, data.subject, data.payment_type, data.description);
  return { id: info.lastInsertRowid, ...data };
}
updateExpense(id, data) {
  const stmt = this.db.prepare(`
    UPDATE expenses SET receiver_name=?, day=?, date=?, amount=?, subject=?, payment_type=?, description=?
    WHERE id=?
  `);
  stmt.run(data.receiver_name, data.day, data.date, data.amount, data.subject, data.payment_type, data.description, id);
  return { id, ...data };
}
deleteExpense(id) {
  this.db.prepare('DELETE FROM expenses WHERE id=?').run(id);
  return true;
}

  deleteTeacher(id) {
    this.db.prepare('DELETE FROM teachers WHERE id=?').run(id);
    return true;
  }


  getAllPhonebook() {
  return this.db.prepare('SELECT * FROM phonebook ORDER BY last_name, first_name').all();
}
addPhonebook(data) {
  const stmt = this.db.prepare(`
    INSERT INTO phonebook (first_name, last_name, mobile, virtual_mobile, landline, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(data.first_name, data.last_name, data.mobile, data.virtual_mobile, data.landline, data.description);
  return { id: info.lastInsertRowid, ...data };
}
updatePhonebook(id, data) {
  const stmt = this.db.prepare(`
    UPDATE phonebook SET first_name=?, last_name=?, mobile=?, virtual_mobile=?, landline=?, description=?
    WHERE id=?
  `);
  stmt.run(data.first_name, data.last_name, data.mobile, data.virtual_mobile, data.landline, data.description, id);
  return { id, ...data };
}
deletePhonebook(id) {
  this.db.prepare('DELETE FROM phonebook WHERE id=?').run(id);
  return true;
}

  backup(backupPath) {
    fs.copyFileSync(this.dbPath, backupPath);
    return true;
  }

  restore(restorePath) {
    this.db.close();
    fs.copyFileSync(restorePath, this.dbPath);
    this.db = new Database(this.dbPath);
    return true;
  }

  close() {
    this.db.close();
  }
}

module.exports = SQLiteDatabase;