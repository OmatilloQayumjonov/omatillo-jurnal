/**
 * TALABALAR ELEKTRON JURNALI - ATTENDANCE.JS
 * Davomatni yuritish, hisob-kitoblar va interaktiv jadvallar
 * 15 ta amaliy darsga to'liq moslashtirilgan
 */

class AttendanceManager {
  constructor() {
    this.currentGroup = '';
    this.currentDate = new Date().toISOString().split('T')[0];
    this.currentRecords = {}; // { studentId: 'present' | 'absent' | 'excused' }
  }

  // Talaba bo'yicha davomat statistikasini hisoblash
  getStudentStats(studentId, groupFilter = null) {
    const allAttendance = window.storage.getAttendance();
    let relevantLessons = allAttendance;

    if (groupFilter) {
      relevantLessons = relevantLessons.filter(a => a.group === groupFilter);
    }

    let totalLessons = 0;
    let presentCount = 0;
    let absentCount = 0;
    let excusedCount = 0;

    relevantLessons.forEach(lesson => {
      if (lesson.records && lesson.records[studentId]) {
        totalLessons++;
        const status = lesson.records[studentId];
        if (status === 'present') presentCount++;
        else if (status === 'absent') absentCount++;
        else if (status === 'excused') excusedCount++;
      }
    });

    const percentage = totalLessons > 0 
      ? Math.round((presentCount / totalLessons) * 100) 
      : 100;

    return {
      totalLessons,
      presentCount,
      absentCount,
      excusedCount,
      missedHours: (absentCount + excusedCount) * 2, // 1 ta dars odatda 2 akademik soat
      percentage
    };
  }

  // Guruh bo'yicha umumiy davomat foizini hisoblash
  getGroupStats(groupName) {
    const students = window.storage.getStudents().filter(s => s.group === groupName);
    if (students.length === 0) return { averagePercentage: 100, totalLessons: 0 };

    let sumPercentage = 0;
    students.forEach(st => {
      const stats = this.getStudentStats(st.id, groupName);
      sumPercentage += stats.percentage;
    });

    const groupLessons = window.storage.getAttendance().filter(a => a.group === groupName);

    return {
      averagePercentage: Math.round(sumPercentage / students.length),
      totalLessons: groupLessons.length
    };
  }

  // Kunlik davomat oynasini yuklash
  loadDailyAttendance(group, date) {
    this.currentGroup = group;
    this.currentDate = date;

    const allAttendance = window.storage.getAttendance();
    const existing = allAttendance.find(a => a.date === date && a.group === group);

    const students = window.storage.getStudents().filter(s => s.group === group);

    this.currentRecords = {};
    if (existing && existing.records) {
      this.currentRecords = { ...existing.records };
    } else {
      // Standart holatda barchani 'present' qilamiz
      students.forEach(st => {
        this.currentRecords[st.id] = 'present';
      });
    }

    return {
      lessonType: existing ? existing.lessonType : 'Amaliyot',
      lessonTheme: existing ? existing.lessonTheme : '',
      records: this.currentRecords
    };
  }

  // Davomat holatini o'zgartirish
  setRecordStatus(studentId, status) {
    this.currentRecords[studentId] = status;
  }

  // Barchasini keldi deb belgilash
  markAllPresent(group) {
    const students = window.storage.getStudents().filter(s => s.group === group);
    students.forEach(st => {
      this.currentRecords[st.id] = 'present';
    });
  }

  // Barchasini tozalash (yoki kelmadi qilish)
  markAllAbsent(group) {
    const students = window.storage.getStudents().filter(s => s.group === group);
    students.forEach(st => {
      this.currentRecords[st.id] = 'absent';
    });
  }

  // Davomatni saqlash
  saveDaily(group, date, lessonType, lessonTheme) {
    const record = {
      date,
      group,
      lessonType: lessonType || 'Amaliyot',
      lessonTheme: lessonTheme || '',
      records: this.currentRecords
    };
    window.storage.saveDailyAttendance(record);
    return true;
  }

  // Davomat matritsasini yaratish (Kunlar x Talabalar)
  getAttendanceMatrix(group) {
    const students = window.storage.getStudents().filter(s => s.group === group);
    const lessons = window.storage.getAttendance()
      .filter(a => a.group === group)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const rows = students.map(student => {
      const statuses = {};
      lessons.forEach(lesson => {
        statuses[lesson.id] = lesson.records ? (lesson.records[student.id] || '-') : '-';
      });

      const stats = this.getStudentStats(student.id, group);

      return {
        student,
        statuses,
        stats
      };
    });

    return {
      lessons,
      rows
    };
  }

  // Matritsadagi bitta katakchani tezkor bosganda almashtirish
  toggleMatrixCell(lessonId, studentId) {
    const allAttendance = window.storage.getAttendance();
    const lessonIndex = allAttendance.findIndex(a => a.id === lessonId);
    if (lessonIndex === -1) return null;

    const currentStatus = allAttendance[lessonIndex].records[studentId] || 'absent';
    let nextStatus = 'present';

    if (currentStatus === 'present') nextStatus = 'absent';
    else if (currentStatus === 'absent') nextStatus = 'excused';
    else if (currentStatus === 'excused') nextStatus = 'present';

    allAttendance[lessonIndex].records[studentId] = nextStatus;
    window.storage.saveAttendance(allAttendance);

    return nextStatus;
  }

  // O'tilgan dars sanasini o'chirish
  deleteLesson(lessonId) {
    let allAttendance = window.storage.getAttendance();
    allAttendance = allAttendance.filter(a => a.id !== lessonId);
    window.storage.saveAttendance(allAttendance);
  }

  // 15 ta amaliy dars sanalarini yaratish
  setup15Lessons(group, startDateStr) {
    return window.storage.create15LessonDates(group, startDateStr);
  }
}

window.attendanceManager = new AttendanceManager();
