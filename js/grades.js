/**
 * TALABALAR ELEKTRON JURNALI - GRADES.JS
 * 15 ta amaliy dars va Alohida Mustaqil Ishlar paneli
 * Oraliq nazoratsiz to'liq hisob-kitoblar
 */

class GradesManager {
  constructor() {}

  // 15 ta amaliy dars bo'yicha talabaning o'rtacha balini hisoblash
  getStudentGradeStats(studentId) {
    const grades = window.storage.getGrades();
    const studentGrades = grades[studentId] || {};
    const columns = window.storage.getGradeColumns();
    const settings = window.storage.getSettings();

    let sum = 0;
    let count = 0;
    const scores = [];

    columns.forEach(col => {
      const val = studentGrades[col.id];
      if (val !== undefined && val !== null && val !== '') {
        const num = Number(val);
        if (!isNaN(num)) {
          sum += num;
          count++;
          scores.push({ colId: col.id, score: num });
        }
      }
    });

    const average = count > 0 ? Number((sum / count).toFixed(2)) : 0;
    const status = this.determineStatus(average, settings.gradingSystem);

    return {
      average,
      count,
      totalCols: columns.length,
      scores,
      status
    };
  }

  // Alohida Mustaqil Ish bo'yicha talabaning ko'rsatkichlari
  getStudentMustaqilStats(studentId) {
    const grades = window.storage.getMustaqilGrades();
    const studentGrades = grades[studentId] || {};
    const columns = window.storage.getMustaqilColumns();
    const settings = window.storage.getSettings();

    let sum = 0;
    let count = 0;
    const scores = [];

    columns.forEach(col => {
      const val = studentGrades[col.id];
      if (val !== undefined && val !== null && val !== '') {
        const num = Number(val);
        if (!isNaN(num)) {
          sum += num;
          count++;
          scores.push({ colId: col.id, score: num });
        }
      }
    });

    const average = count > 0 ? Number((sum / count).toFixed(2)) : 0;
    const status = this.determineStatus(average, settings.gradingSystem);

    return {
      average,
      count,
      totalCols: columns.length,
      scores,
      status
    };
  }

  // Umumiy yakuniy ball (15 ta amaliy dars + Mustaqil ish)
  getStudentOverallStats(studentId) {
    const prStats = this.getStudentGradeStats(studentId);
    const miStats = this.getStudentMustaqilStats(studentId);
    const settings = window.storage.getSettings();

    let overallAvg = 0;
    if (prStats.count > 0 && miStats.count > 0) {
      overallAvg = Number(((prStats.average + miStats.average) / 2).toFixed(2));
    } else if (prStats.count > 0) {
      overallAvg = prStats.average;
    } else if (miStats.count > 0) {
      overallAvg = miStats.average;
    }

    const status = this.determineStatus(overallAvg, settings.gradingSystem);

    return {
      overallAvg,
      prAvg: prStats.average,
      miAvg: miStats.average,
      prCount: prStats.count,
      miCount: miStats.count,
      status
    };
  }

  // O'rtacha ball bo'yicha holatni aniqlash
  determineStatus(avg, system = '5') {
    if (avg === 0) return { label: 'Baholanmagan', badgeClass: 'badge-neutral', color: '#64748b' };

    if (system === '100') {
      if (avg >= 86) return { label: "A'lo (A)", badgeClass: 'badge-success', color: '#10b981' };
      if (avg >= 71) return { label: 'Yaxshi (B)', badgeClass: 'badge-info', color: '#06b6d4' };
      if (avg >= 56) return { label: 'Qoniqarli (C)', badgeClass: 'badge-warning', color: '#f59e0b' };
      return { label: 'Qoniqarsiz (F)', badgeClass: 'badge-danger', color: '#ef4444' };
    } else {
      // 5 ballik tizim
      if (avg >= 4.5) return { label: "A'lochi", badgeClass: 'badge-success', color: '#10b981' };
      if (avg >= 3.5) return { label: 'Yaxshi', badgeClass: 'badge-info', color: '#06b6d4' };
      if (avg >= 2.6) return { label: 'Qoniqarli', badgeClass: 'badge-warning', color: '#f59e0b' };
      return { label: 'Qoniqarsiz', badgeClass: 'badge-danger', color: '#ef4444' };
    }
  }

  // Guruh bo'yicha amaliy darslar o'rtacha bali
  getGroupAverage(groupName) {
    const students = window.storage.getStudents().filter(s => s.group === groupName);
    if (students.length === 0) return 0;

    let sum = 0;
    let count = 0;

    students.forEach(st => {
      const stats = this.getStudentGradeStats(st.id);
      if (stats.count > 0) {
        sum += stats.average;
        count++;
      }
    });

    return count > 0 ? Number((sum / count).toFixed(2)) : 0;
  }

  // Guruh bo'yicha mustaqil ishlar o'rtacha bali
  getMustaqilGroupAverage(groupName) {
    const students = window.storage.getStudents().filter(s => s.group === groupName);
    if (students.length === 0) return 0;

    let sum = 0;
    let count = 0;

    students.forEach(st => {
      const stats = this.getStudentMustaqilStats(st.id);
      if (stats.count > 0) {
        sum += stats.average;
        count++;
      }
    });

    return count > 0 ? Number((sum / count).toFixed(2)) : 0;
  }

  // Barcha guruhlar bo'yicha umumiy o'rtacha ball
  getGlobalAverage() {
    const students = window.storage.getStudents();
    if (students.length === 0) return 0;

    let sum = 0;
    let count = 0;

    students.forEach(st => {
      const stats = this.getStudentOverallStats(st.id);
      if (stats.overallAvg > 0) {
        sum += stats.overallAvg;
        count++;
      }
    });

    return count > 0 ? Number((sum / count).toFixed(2)) : 0;
  }

  // 15 ta amaliy dars matritsasi
  getGradesMatrix(group) {
    const students = window.storage.getStudents().filter(s => s.group === group);
    const columns = window.storage.getGradeColumns();
    const allGrades = window.storage.getGrades();

    const rows = students.map(student => {
      const studentGrades = allGrades[student.id] || {};
      const colValues = {};
      columns.forEach(col => {
        colValues[col.id] = studentGrades[col.id] !== undefined ? studentGrades[col.id] : '';
      });

      const stats = this.getStudentGradeStats(student.id);

      return {
        student,
        colValues,
        stats
      };
    });

    return {
      columns,
      rows
    };
  }

  // Mustaqil Ish matritsasi
  getMustaqilMatrix(group) {
    const students = window.storage.getStudents().filter(s => s.group === group);
    const columns = window.storage.getMustaqilColumns();
    const allGrades = window.storage.getMustaqilGrades();

    const rows = students.map(student => {
      const studentGrades = allGrades[student.id] || {};
      const colValues = {};
      columns.forEach(col => {
        colValues[col.id] = studentGrades[col.id] !== undefined ? studentGrades[col.id] : '';
      });

      const stats = this.getStudentMustaqilStats(student.id);

      return {
        student,
        colValues,
        stats
      };
    });

    return {
      columns,
      rows
    };
  }

  // Bitta amaliy dars bahosini saqlash
  setGrade(studentId, columnId, value) {
    window.storage.setStudentGrade(studentId, columnId, value);
    return this.getStudentGradeStats(studentId);
  }

  // Bitta mustaqil ish bahosini saqlash
  setMustaqilGrade(studentId, columnId, value) {
    window.storage.setStudentMustaqilGrade(studentId, columnId, value);
    return this.getStudentMustaqilStats(studentId);
  }

  // 15 amaliy dars ustunini boshqarish
  addColumn(title, type, maxScore) {
    return window.storage.addGradeColumn({ title, type, maxScore });
  }

  deleteColumn(colId) {
    window.storage.deleteGradeColumn(colId);
  }

  // Mustaqil ish ustunini boshqarish
  addMustaqilColumn(title, description, maxScore) {
    return window.storage.addMustaqilColumn({ title, description, maxScore });
  }

  deleteMustaqilColumn(colId) {
    window.storage.deleteMustaqilColumn(colId);
  }

  // 15 ta amaliy dars shablonini yuklash
  setup15PracticalsTemplate() {
    return window.storage.apply15PracticalTemplate();
  }
}

window.gradesManager = new GradesManager();
