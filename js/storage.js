/**
 * TALABALAR ELEKTRON JURNALI - STORAGE.JS
 * SQLite Server bazasi bilan to'liq sinxronlashuvchi va oflayn xotira
 * 15 ta amaliy dars va Alohida Mustaqil Ishlar
 */

const STORAGE_KEYS = {
  AUTH_TOKEN: 'jurnal_auth_token',
  AUTH_USER: 'jurnal_auth_user',
  STUDENTS: 'jurnal_students',
  GROUPS: 'jurnal_groups',
  ATTENDANCE: 'jurnal_attendance',
  GRADE_COLUMNS: 'jurnal_grade_columns',
  GRADES: 'jurnal_grades',
  MUSTAQIL_COLUMNS: 'jurnal_mustaqil_columns',
  MUSTAQIL_GRADES: 'jurnal_mustaqil_grades',
  SETTINGS: 'jurnal_settings'
};

const DEFAULT_SETTINGS = {
  gradingSystem: '5',
  institutionName: "O'quv yurti",
  subjectName: 'Mutaxassislik fani (15 ta amaliy dars)',
  semester: 'Kuzgi semestr 2026'
};

const DEFAULT_GROUPS = ['401-guruh', '402-guruh'];

function generate15PracticalColumns() {
  const cols = [];
  for (let i = 1; i <= 15; i++) {
    cols.push({
      id: `col_amaliy_${i}`,
      title: `${i}-amaliy`,
      type: 'amaliy',
      maxScore: 5
    });
  }
  return cols;
}

const DEMO_GRADE_COLUMNS = generate15PracticalColumns();

const DEFAULT_MUSTAQIL_COLUMNS = [
  { id: 'col_mi_1', title: '1-Mustaqil ish', description: "Nazariy ma'lumotlar tahlili", maxScore: 5 },
  { id: 'col_mi_2', title: '2-Mustaqil ish', description: "Amaliy masala va hisobot", maxScore: 5 },
  { id: 'col_mi_3', title: '3-Mustaqil ish', description: "Taqdimot va loyiha himoyasi", maxScore: 5 }
];

const DEMO_STUDENTS = [
  { id: 'st_1', fullName: 'Aliyev Behruz Shavkatovich', group: '401-guruh', phone: '+998 90 123 45 67', note: "A'lochi" },
  { id: 'st_2', fullName: 'Karimova Madina Anvarovna', group: '401-guruh', phone: '+998 91 234 56 78', note: 'Guruh sardori' },
  { id: 'st_3', fullName: 'Toshmatov Jasur Ilhom o‘g‘li', group: '401-guruh', phone: '+998 93 345 67 89', note: '' },
  { id: 'st_4', fullName: 'Yusupova Shahzoda Baxtiyor qizi', group: '401-guruh', phone: '+998 94 456 78 90', note: 'Faol' },
  { id: 'st_5', fullName: 'Rustamov Sardor Otabekovich', group: '401-guruh', phone: '+998 97 567 89 01', note: '' },
  { id: 'st_6', fullName: 'Nazarova Gulnoza Rustamovna', group: '402-guruh', phone: '+998 99 678 90 12', note: '' },
  { id: 'st_7', fullName: 'Qodirov Farrux Dilmurodovich', group: '402-guruh', phone: '+998 90 789 01 23', note: '' },
  { id: 'st_8', fullName: 'Saidova Zarina Sherzod qizi', group: '402-guruh', phone: '+998 91 890 12 34', note: "A'lochi" },
  { id: 'st_9', fullName: 'Hamroyev Diyorbek Jamshid o‘g‘li', group: '402-guruh', phone: '+998 93 901 23 45', note: '' },
  { id: 'st_10', fullName: 'Ergasheva Kamola Azizovna', group: '402-guruh', phone: '+998 94 012 34 56', note: '' }
];

class JurnalStorage {
  constructor() {
    this.isServerConnected = false;
    this.token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || '';
    this.init();
  }

  async init() {
    // Agar dastur birinchi marta ochilayotgan bo'lsa, zaxira sifatida demo ma'lumotlar qo'yiladi
    if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
      this.loadLocalDemoData();
    }

    // Server bilan bog'lanish va bazadan so'nggi ma'lumotlarni yuklab olish
    await this.syncFromServer();
  }

  // Server API dan barcha ma'lumotlarni tortib olish
  async syncFromServer() {
    try {
      const token = this.token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || 'admin_direct_master_token';
      const res = await fetch('/api/data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          this.isServerConnected = true;

          if (d.students) localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(d.students));
          if (d.groups) localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(d.groups));
          if (d.attendance) localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(d.attendance));
          if (d.grade_columns) localStorage.setItem(STORAGE_KEYS.GRADE_COLUMNS, JSON.stringify(d.grade_columns));
          if (d.grades) localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(d.grades));
          if (d.mustaqil_columns) localStorage.setItem(STORAGE_KEYS.MUSTAQIL_COLUMNS, JSON.stringify(d.mustaqil_columns));
          if (d.mustaqil_grades) localStorage.setItem(STORAGE_KEYS.MUSTAQIL_GRADES, JSON.stringify(d.mustaqil_grades));
          if (d.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(d.settings));

          this.updateConnectionBadge(true);
          return true;
        }
      }
    } catch (e) {
      console.warn("Serverga ulanib bo'lmadi, oflayn rejimda ishlamoqda:", e);
      this.isServerConnected = false;
      this.updateConnectionBadge(false);
    }
    return false;
  }

  // O'zgarishlarni serverga saqlash (Har qanday o'zgarishda darhol bazaga yoziladi)
  async saveToServer(key, value) {
    try {
      const token = this.token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || 'admin_direct_master_token';
      const res = await fetch('/api/save-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ key, value })
      });

      if (res.ok) {
        this.isServerConnected = true;
        this.updateConnectionBadge(true);
        this.showSaveIndicator(true);
        return true;
      } else if (res.status === 401) {
        // Token yangilab ko'ramiz
        const relogged = await this.autoRelogin();
        if (relogged) {
          return await this.saveToServer(key, value);
        }
      }
    } catch (err) {
      console.warn("Serverga yozishda xatolik:", err);
      this.isServerConnected = false;
      this.updateConnectionBadge(false);
      this.showSaveIndicator(false);
    }
    return false;
  }

  // Barcha ma'lumotlarni bir vaqtda to'liq serverga yuklash (Sinxronlash tugmasi uchun)
  async syncAllToServer() {
    try {
      const allData = {
        students: this.getStudents(),
        groups: this.getGroups(),
        attendance: this.getAttendance(),
        grade_columns: this.getGradeColumns(),
        grades: this.getGrades(),
        mustaqil_columns: this.getMustaqilColumns(),
        mustaqil_grades: this.getMustaqilGrades(),
        settings: this.getSettings()
      };

      const token = this.token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || 'admin_direct_master_token';
      const res = await fetch('/api/save-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data: allData })
      });

      if (res.ok) {
        this.isServerConnected = true;
        this.updateConnectionBadge(true);
        this.showSaveIndicator(true, "Barcha ma'lumotlar bulutga saqlandi ✅");
        return true;
      }
    } catch (e) {
      console.warn("syncAllToServer xatolik:", e);
    }
    return false;
  }

  async autoRelogin() {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.token) {
          this.token = json.token;
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, json.token);
          return true;
        }
      }
    } catch (e) {
      console.warn("autoRelogin muvaffaqiyatsiz:", e);
    }
    return false;
  }

  showSaveIndicator(success, customMsg) {
    let indicator = document.getElementById('save-status-toast');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'save-status-toast';
      indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 18px;
        background: #0f172a;
        color: #fff;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.25);
        z-index: 99999;
        transition: all 0.3s ease;
        opacity: 0;
        pointer-events: none;
      `;
      document.body.appendChild(indicator);
    }

    if (success) {
      indicator.innerHTML = `<i class=\"fa-solid fa-cloud-check\" style=\"color: #10b981;\"></i> <span>\${customMsg || "Markaziy bazaga saqlandi (Botda yangilandi) ✅"}</span>`;
      indicator.style.borderLeft = '4px solid #10b981';
    } else {
      indicator.innerHTML = `<i class=\"fa-solid fa-triangle-exclamation\" style=\"color: #ef4444;\"></i> <span>Lokal saqlandi (Serverga ulanmadi)</span>`;
      indicator.style.borderLeft = '4px solid #ef4444';
    }

    indicator.style.opacity = '1';
    indicator.style.transform = 'translateY(0)';

    clearTimeout(this._indicatorTimeout);
    this._indicatorTimeout = setTimeout(() => {
      indicator.style.opacity = '0';
      indicator.style.transform = 'translateY(10px)';
    }, 2500);
  }

  updateConnectionBadge(isConnected) {
    const badge = document.getElementById('server-status-badge');
    if (!badge) return;
    if (isConnected) {
      badge.innerHTML = '<i class="fa-solid fa-cloud-arrow-up" style="color: #10b981;"></i> <span>Sinxronlangan</span>';
      badge.title = "Markaziy SQLite bazasi bilan to'liq ulangan (Barcha qurilmalarda saqlanadi)";
      badge.className = 'badge badge-success';
    } else {
      badge.innerHTML = '<i class="fa-solid fa-hard-drive" style="color: #64748b;"></i> <span>Lokal rejim</span>';
      badge.title = "Brauzer xotirasi (Oflayn)";
      badge.className = 'badge badge-neutral';
    }
  }

  loadLocalDemoData() {
    this.saveStudents(DEMO_STUDENTS);
    this.saveGroups(DEFAULT_GROUPS);
    this.saveGradeColumns(DEMO_GRADE_COLUMNS);
    this.saveGrades({
      st_1: { col_amaliy_1: 5, col_amaliy_2: 5, col_amaliy_3: 5 },
      st_2: { col_amaliy_1: 5, col_amaliy_2: 4, col_amaliy_3: 5 }
    });
    this.saveMustaqilColumns(DEFAULT_MUSTAQIL_COLUMNS);
    this.saveMustaqilGrades({
      st_1: { col_mi_1: 5, col_mi_2: 5, col_mi_3: 5 },
      st_2: { col_mi_1: 5, col_mi_2: 4, col_mi_3: 5 }
    });
    this.saveAttendance([]);
    this.saveSettings(DEFAULT_SETTINGS);
  }

  // --- TALABALAR ---
  getStudents() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveStudents(students) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    this.saveToServer('students', students);
  }

  addStudent(student) {
    const students = this.getStudents();
    const newStudent = {
      id: 'st_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      fullName: student.fullName.trim(),
      group: student.group.trim(),
      phone: student.phone ? student.phone.trim() : '',
      note: student.note ? student.note.trim() : '',
      createdAt: new Date().toISOString()
    };
    students.push(newStudent);
    this.saveStudents(students);
    this.ensureGroupExists(newStudent.group);
    return newStudent;
  }

  parseBulkStudentText(rawText) {
    if (!rawText || !rawText.trim()) return [];
    const lines = rawText.split(/\r?\n/);
    const students = [];

    for (let line of lines) {
      let clean = line.trim();
      if (!clean) continue;

      clean = clean.replace(/^[\s\d]+[.)\-\]\/:]+\s*/, '').trim();
      if (!clean) continue;

      let fullName = clean;
      let phone = '';
      let note = '';

      if (clean.includes('\t')) {
        const parts = clean.split('\t').map(p => p.trim()).filter(Boolean);
        fullName = parts[0] || '';
        phone = parts[1] || '';
        note = parts[2] || '';
      } else {
        const phoneMatch = clean.match(/(\+?998[\s\-]?[0-9]{2}[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}|[0-9]{9,12})/);
        if (phoneMatch) {
          phone = phoneMatch[0];
          fullName = clean.replace(phone, '').trim();
        }
      }

      if (fullName) {
        students.push({ fullName, phone, note });
      }
    }
    return students;
  }

  addStudentsBulk(rawText, groupName) {
    const parsed = this.parseBulkStudentText(rawText);
    if (parsed.length === 0) return 0;

    const currentStudents = this.getStudents();
    const cleanGroup = groupName.trim() || 'Umumiy guruh';
    this.ensureGroupExists(cleanGroup);

    parsed.forEach((st, idx) => {
      currentStudents.push({
        id: 'st_' + Date.now() + '_' + idx + '_' + Math.floor(Math.random() * 1000),
        fullName: st.fullName,
        group: cleanGroup,
        phone: st.phone || '',
        note: st.note || '',
        createdAt: new Date().toISOString()
      });
    });

    this.saveStudents(currentStudents);
    return parsed.length;
  }

  updateStudent(id, updatedData) {
    const students = this.getStudents();
    const index = students.findIndex(s => s.id === id);
    if (index !== -1) {
      students[index] = { ...students[index], ...updatedData };
      this.saveStudents(students);
      if (updatedData.group) {
        this.ensureGroupExists(updatedData.group);
      }
      return students[index];
    }
    return null;
  }

  deleteStudent(id) {
    let students = this.getStudents();
    students = students.filter(s => s.id !== id);
    this.saveStudents(students);

    const grades = this.getGrades();
    if (grades[id]) {
      delete grades[id];
      this.saveGrades(grades);
    }
    const miGrades = this.getMustaqilGrades();
    if (miGrades[id]) {
      delete miGrades[id];
      this.saveMustaqilGrades(miGrades);
    }
  }

  // --- GURUHLAR ---
  getGroups() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GROUPS);
      return data ? JSON.parse(data) : DEFAULT_GROUPS;
    } catch (e) {
      return DEFAULT_GROUPS;
    }
  }

  saveGroups(groups) {
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
    this.saveToServer('groups', groups);
  }

  addGroup(groupName) {
    const groups = this.getGroups();
    const cleanName = groupName.trim();
    if (cleanName && !groups.includes(cleanName)) {
      groups.push(cleanName);
      this.saveGroups(groups);
      return true;
    }
    return false;
  }

  ensureGroupExists(groupName) {
    if (groupName && groupName.trim()) {
      this.addGroup(groupName.trim());
    }
  }

  deleteGroupAndStudents(groupName) {
    let students = this.getStudents();
    const studentsInGroup = students.filter(s => s.group === groupName);
    const studentIds = new Set(studentsInGroup.map(s => s.id));

    students = students.filter(s => s.group !== groupName);
    this.saveStudents(students);

    let groups = this.getGroups().filter(g => g !== groupName);
    this.saveGroups(groups);

    const grades = this.getGrades();
    const miGrades = this.getMustaqilGrades();
    studentIds.forEach(id => {
      delete grades[id];
      delete miGrades[id];
    });
    this.saveGrades(grades);
    this.saveMustaqilGrades(miGrades);

    let attendance = this.getAttendance().filter(a => a.group !== groupName);
    this.saveAttendance(attendance);

    return studentsInGroup.length;
  }

  // --- DAVOMAT ---
  getAttendance() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveAttendance(attendanceList) {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendanceList));
    this.saveToServer('attendance', attendanceList);
  }

  saveDailyAttendance(record) {
    const list = this.getAttendance();
    const index = list.findIndex(a => a.date === record.date && a.group === record.group);
    if (index !== -1) {
      list[index] = { ...list[index], ...record };
    } else {
      record.id = 'att_' + Date.now();
      list.push(record);
    }
    this.saveAttendance(list);
    return record;
  }

  create15LessonDates(group, startDateStr) {
    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    const currentList = this.getAttendance();
    const students = this.getStudents().filter(s => s.group === group);

    const createdLessons = [];
    for (let i = 0; i < 15; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + (i * 7));
      const dateStr = d.toISOString().split('T')[0];

      const exists = currentList.some(a => a.group === group && a.date === dateStr);
      if (!exists) {
        const records = {};
        students.forEach(st => {
          records[st.id] = 'present';
        });

        const newLesson = {
          id: `att_${group}_${Date.now()}_${i + 1}`,
          date: dateStr,
          group: group,
          lessonType: 'Amaliyot',
          lessonTheme: `${i + 1}-amaliy mashg'ulot`,
          records: records
        };
        currentList.push(newLesson);
        createdLessons.push(newLesson);
      }
    }

    this.saveAttendance(currentList);
    return createdLessons;
  }

  // --- 15 TA AMALIY DARS BAHOLARI ---
  getGradeColumns() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GRADE_COLUMNS);
      return data ? JSON.parse(data) : DEMO_GRADE_COLUMNS;
    } catch (e) {
      return DEMO_GRADE_COLUMNS;
    }
  }

  saveGradeColumns(columns) {
    localStorage.setItem(STORAGE_KEYS.GRADE_COLUMNS, JSON.stringify(columns));
    this.saveToServer('grade_columns', columns);
  }

  apply15PracticalTemplate() {
    const cols = generate15PracticalColumns();
    this.saveGradeColumns(cols);
    return cols;
  }

  addGradeColumn(col) {
    const cols = this.getGradeColumns();
    const newCol = {
      id: 'col_' + Date.now(),
      title: col.title.trim(),
      type: 'amaliy',
      maxScore: col.maxScore || 5
    };
    cols.push(newCol);
    this.saveGradeColumns(cols);
    return newCol;
  }

  deleteGradeColumn(colId) {
    let cols = this.getGradeColumns();
    cols = cols.filter(c => c.id !== colId);
    this.saveGradeColumns(cols);

    const grades = this.getGrades();
    for (let stId in grades) {
      if (grades[stId] && grades[stId][colId] !== undefined) {
        delete grades[stId][colId];
      }
    }
    this.saveGrades(grades);
  }

  getGrades() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GRADES);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  saveGrades(grades) {
    localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(grades));
    this.saveToServer('grades', grades);
  }

  setStudentGrade(studentId, columnId, score) {
    const grades = this.getGrades();
    if (!grades[studentId]) {
      grades[studentId] = {};
    }
    if (score === null || score === undefined || score === '') {
      delete grades[studentId][columnId];
    } else {
      grades[studentId][columnId] = Number(score);
    }
    this.saveGrades(grades);
  }

  // --- MUSTAQIL ISH ---
  getMustaqilColumns() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MUSTAQIL_COLUMNS);
      return data ? JSON.parse(data) : DEFAULT_MUSTAQIL_COLUMNS;
    } catch (e) {
      return DEFAULT_MUSTAQIL_COLUMNS;
    }
  }

  saveMustaqilColumns(columns) {
    localStorage.setItem(STORAGE_KEYS.MUSTAQIL_COLUMNS, JSON.stringify(columns));
    this.saveToServer('mustaqil_columns', columns);
  }

  addMustaqilColumn(col) {
    const cols = this.getMustaqilColumns();
    const newCol = {
      id: 'col_mi_' + Date.now(),
      title: col.title.trim(),
      description: col.description ? col.description.trim() : '',
      maxScore: col.maxScore || 5
    };
    cols.push(newCol);
    this.saveMustaqilColumns(cols);
    return newCol;
  }

  deleteMustaqilColumn(colId) {
    let cols = this.getMustaqilColumns();
    cols = cols.filter(c => c.id !== colId);
    this.saveMustaqilColumns(cols);

    const miGrades = this.getMustaqilGrades();
    for (let stId in miGrades) {
      if (miGrades[stId] && miGrades[stId][colId] !== undefined) {
        delete miGrades[stId][colId];
      }
    }
    this.saveMustaqilGrades(miGrades);
  }

  getMustaqilGrades() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MUSTAQIL_GRADES);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  saveMustaqilGrades(grades) {
    localStorage.setItem(STORAGE_KEYS.MUSTAQIL_GRADES, JSON.stringify(grades));
    this.saveToServer('mustaqil_grades', grades);
  }

  setStudentMustaqilGrade(studentId, columnId, score) {
    const grades = this.getMustaqilGrades();
    if (!grades[studentId]) {
      grades[studentId] = {};
    }
    if (score === null || score === undefined || score === '') {
      delete grades[studentId][columnId];
    } else {
      grades[studentId][columnId] = Number(score);
    }
    this.saveMustaqilGrades(grades);
  }

  // --- SOZLAMALAR ---
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.saveToServer('settings', settings);
  }

  // --- ZAXIRA JSON ---
  exportAllDataJSON() {
    const backup = {
      version: '4.0',
      exportedAt: new Date().toISOString(),
      students: this.getStudents(),
      groups: this.getGroups(),
      attendance: this.getAttendance(),
      gradeColumns: this.getGradeColumns(),
      grades: this.getGrades(),
      mustaqilColumns: this.getMustaqilColumns(),
      mustaqilGrades: this.getMustaqilGrades(),
      settings: this.getSettings()
    };
    return JSON.stringify(backup, null, 2);
  }

  importAllDataJSON(jsonString) {
    try {
      const backup = JSON.parse(jsonString);
      if (backup.students) this.saveStudents(backup.students);
      if (backup.groups) this.saveGroups(backup.groups);
      if (backup.attendance) this.saveAttendance(backup.attendance);
      if (backup.gradeColumns) this.saveGradeColumns(backup.gradeColumns);
      if (backup.grades) this.saveGrades(backup.grades);
      if (backup.mustaqilColumns) this.saveMustaqilColumns(backup.mustaqilColumns);
      if (backup.mustaqilGrades) this.saveMustaqilGrades(backup.mustaqilGrades);
      if (backup.settings) this.saveSettings(backup.settings);
      return true;
    } catch (e) {
      return false;
    }
  }

  clearAllData() {
    localStorage.clear();
  }
}

window.storage = new JurnalStorage();
