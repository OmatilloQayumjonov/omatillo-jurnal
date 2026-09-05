/**
 * TALABALAR ELEKTRON JURNALI - EXCEL.JS
 * Ma'lumotlarni professional Excel (.xlsx) formatida eksport va import qilish
 * 15 ta amaliy dars va Alohida Mustaqil Ish jurnallari bilan
 */

class ExcelManager {
  constructor() {}

  // Barcha ma'lumotlarni bitta Excel fayliga (4 ta sahifada) eksport qilish
  exportCompleteJournal(selectedGroup = 'all') {
    if (typeof XLSX === 'undefined') {
      alert("Excel kutubxonasi (SheetJS) yuklanmagan!");
      return;
    }

    const students = window.storage.getStudents().filter(s => {
      return selectedGroup === 'all' || s.group === selectedGroup;
    });

    if (students.length === 0) {
      alert("Eksport qilish uchun talabalar topilmadi!");
      return;
    }

    const wb = XLSX.utils.book_new();
    const settings = window.storage.getSettings();

    // 1. UMUMIY HISOBOT VARAQASI
    const summaryData = this.buildSummarySheet(students, selectedGroup);
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    this.setColWidths(wsSummary, [6, 32, 16, 18, 14, 14, 16, 14, 18, 18, 18, 18, 20]);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Umumiy Hisobot");

    // 2. DAVOMAT JURNALI VARAQASI
    const attendanceData = this.buildAttendanceSheet(students, selectedGroup);
    const wsAttendance = XLSX.utils.aoa_to_sheet(attendanceData.rows);
    this.setColWidths(wsAttendance, attendanceData.colWidths);
    XLSX.utils.book_append_sheet(wb, wsAttendance, "Davomat Jurnali");

    // 3. 15 TA AMALIY DARS BAHOLARI (Oraliq nazoratsiz)
    const gradesData = this.buildGradesSheet(students, selectedGroup);
    const wsGrades = XLSX.utils.aoa_to_sheet(gradesData.rows);
    this.setColWidths(wsGrades, gradesData.colWidths);
    XLSX.utils.book_append_sheet(wb, wsGrades, "15 Amaliy Dars");

    // 4. MUSTAQIL ISH BAHOLARI VARAQASI
    const mustaqilData = this.buildMustaqilSheet(students, selectedGroup);
    const wsMustaqil = XLSX.utils.aoa_to_sheet(mustaqilData.rows);
    this.setColWidths(wsMustaqil, mustaqilData.colWidths);
    XLSX.utils.book_append_sheet(wb, wsMustaqil, "Mustaqil Ish");

    // Fayl nomini shakllantirish
    const dateStr = new Date().toISOString().split('T')[0];
    const groupNameClean = selectedGroup === 'all' ? 'Barcha_guruhlar' : selectedGroup.replace(/\s+/g, '_');
    const fileName = `Jurnal_${groupNameClean}_${dateStr}.xlsx`;

    // Faylni yuklab berish
    XLSX.writeFile(wb, fileName);
  }

  // 1-Varaq: Umumiy hisobot
  buildSummarySheet(students, selectedGroup) {
    const rows = [];
    const settings = window.storage.getSettings();
    const today = new Date().toLocaleDateString('uz-UZ');

    rows.push([`${settings.institutionName} - Talabalar Umumiy Jurnali`]);
    rows.push([`Fan: ${settings.subjectName} | Guruh: ${selectedGroup === 'all' ? 'Barcha guruhlar' : selectedGroup} | Sana: ${today}`]);
    rows.push([]);

    rows.push([
      'T/r',
      'Talaba F.I.SH',
      'Guruhi',
      'Telefon raqami',
      'Jami darslar',
      'Kelgan darslari',
      'Qoldirilgan soat',
      'Davomat (%)',
      "15 Amaliy o'rtachasi",
      "Mustaqil ish o'rtachasi",
      "Umumiy yakuniy ball",
      'Holati (Reyting)',
      'Izoh'
    ]);

    students.forEach((st, idx) => {
      const attStats = window.attendanceManager.getStudentStats(st.id, selectedGroup === 'all' ? null : selectedGroup);
      const prStats = window.gradesManager.getStudentGradeStats(st.id);
      const miStats = window.gradesManager.getStudentMustaqilStats(st.id);
      const overall = window.gradesManager.getStudentOverallStats(st.id);

      rows.push([
        idx + 1,
        st.fullName,
        st.group,
        st.phone || '-',
        attStats.totalLessons,
        attStats.presentCount,
        attStats.missedHours + ' soat',
        attStats.percentage + '%',
        prStats.count > 0 ? prStats.average : '-',
        miStats.count > 0 ? miStats.average : '-',
        overall.overallAvg > 0 ? overall.overallAvg : '-',
        overall.status.label,
        st.note || ''
      ]);
    });

    return rows;
  }

  // 2-Varaq: Davomat jurnali
  buildAttendanceSheet(students, selectedGroup) {
    const rows = [];
    const allLessons = window.storage.getAttendance()
      .filter(a => selectedGroup === 'all' || a.group === selectedGroup)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const headerRow = ['T/r', 'Talaba F.I.SH', 'Guruhi'];
    const colWidths = [6, 32, 16];

    allLessons.forEach(l => {
      const shortDate = l.date.split('-').slice(1).join('.');
      headerRow.push(`${shortDate} (${l.lessonType})`);
      colWidths.push(14);
    });

    headerRow.push('Jami keldi', 'Jami kelmadi', 'Qatnashish %');
    colWidths.push(14, 14, 16);

    rows.push(headerRow);

    students.forEach((st, idx) => {
      const attStats = window.attendanceManager.getStudentStats(st.id, selectedGroup === 'all' ? null : selectedGroup);
      const row = [idx + 1, st.fullName, st.group];

      allLessons.forEach(l => {
        const status = l.records ? l.records[st.id] : '-';
        if (status === 'present') row.push('+ (Keldi)');
        else if (status === 'absent') row.push('- (Kelmadi)');
        else if (status === 'excused') row.push('S (Sababli)');
        else row.push('-');
      });

      row.push(attStats.presentCount, attStats.absentCount + attStats.excusedCount, attStats.percentage + '%');
      rows.push(row);
    });

    return { rows, colWidths };
  }

  // 3-Varaq: 15 ta Amaliy Dars baholari (Oraliq nazoratsiz)
  buildGradesSheet(students, selectedGroup) {
    const rows = [];
    const columns = window.storage.getGradeColumns();
    const allGrades = window.storage.getGrades();

    const headerRow = ['T/r', 'Talaba F.I.SH', 'Guruhi'];
    const colWidths = [6, 32, 16];

    columns.forEach(c => {
      headerRow.push(`${c.title}`);
      colWidths.push(12);
    });

    headerRow.push("15 Dars o'rtacha bali", 'Holati');
    colWidths.push(20, 16);

    rows.push(headerRow);

    students.forEach((st, idx) => {
      const studentGrades = allGrades[st.id] || {};
      const prStats = window.gradesManager.getStudentGradeStats(st.id);

      const row = [idx + 1, st.fullName, st.group];

      columns.forEach(c => {
        const val = studentGrades[c.id];
        row.push(val !== undefined && val !== null ? val : '');
      });

      row.push(prStats.count > 0 ? prStats.average : '-', prStats.status.label);
      rows.push(row);
    });

    return { rows, colWidths };
  }

  // 4-Varaq: Alohida Mustaqil Ish baholari
  buildMustaqilSheet(students, selectedGroup) {
    const rows = [];
    const columns = window.storage.getMustaqilColumns();
    const allGrades = window.storage.getMustaqilGrades();

    const headerRow = ['T/r', 'Talaba F.I.SH', 'Guruhi'];
    const colWidths = [6, 32, 16];

    columns.forEach(c => {
      headerRow.push(`${c.title}`);
      colWidths.push(18);
    });

    headerRow.push("Mustaqil ish o'rtachasi", 'Holati');
    colWidths.push(20, 16);

    rows.push(headerRow);

    students.forEach((st, idx) => {
      const studentGrades = allGrades[st.id] || {};
      const miStats = window.gradesManager.getStudentMustaqilStats(st.id);

      const row = [idx + 1, st.fullName, st.group];

      columns.forEach(c => {
        const val = studentGrades[c.id];
        row.push(val !== undefined && val !== null ? val : '');
      });

      row.push(miStats.count > 0 ? miStats.average : '-', miStats.status.label);
      rows.push(row);
    });

    return { rows, colWidths };
  }

  setColWidths(ws, widths) {
    ws['!cols'] = widths.map(w => ({ wch: w }));
  }

  downloadStudentTemplate() {
    if (typeof XLSX === 'undefined') return;

    const wb = XLSX.utils.book_new();
    const templateData = [
      ['Talaba F.I.SH', 'Guruhi', 'Telefon raqami', 'Izoh'],
      ['Karimov Jasur Anvarovich', '401-guruh', '+998 90 123 45 67', "A'lochi"],
      ['Aliyeva Madina Rustamovna', '401-guruh', '+998 91 234 56 78', 'Guruh sardori'],
      ['Sobirov Otabek Ilhom o‘g‘li', '402-guruh', '+998 93 345 67 89', '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    this.setColWidths(ws, [32, 16, 20, 20]);
    XLSX.utils.book_append_sheet(wb, ws, "Talabalar");
    XLSX.writeFile(wb, "Talabalar_Shabloni.xlsx");
  }

  importStudentsFromExcel(file, callback) {
    if (typeof XLSX === 'undefined') {
      alert("Excel kutubxonasi mavjud emas!");
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length < 2) {
          callback({ success: false, message: "Fayl bo'sh yoki noto'g'ri formatda!" });
          return;
        }

        let addedCount = 0;
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;

          const fullName = row[0] ? String(row[0]).trim() : '';
          const group = row[1] ? String(row[1]).trim() : 'Umumiy guruh';
          const phone = row[2] ? String(row[2]).trim() : '';
          const note = row[3] ? String(row[3]).trim() : '';

          if (fullName) {
            window.storage.addStudent({ fullName, group, phone, note });
            addedCount++;
          }
        }

        callback({ success: true, count: addedCount });
      } catch (err) {
        console.error("Excel import xatosi:", err);
        callback({ success: false, message: "Faylni o'qishda xatolik yuz berdi: " + err.message });
      }
    };

    reader.readAsArrayBuffer(file);
  }
}

window.excelManager = new ExcelManager();
