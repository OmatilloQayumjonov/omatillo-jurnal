/**
 * TALABALAR ELEKTRON JURNALI - APP.JS
 * Asosiy foydalanuvchi interfeysi boshqaruvchisi
 * 15 ta amaliy dars va Alohida Mustaqil Ishlar paneli
 */

class JurnalApp {
  constructor() {
    this.currentTab = 'dashboard';
    this.selectedGroup = 'all';
    this.charts = {};
  }

  async init() {
    this.setupNavigation();
    this.setupModals();
    this.setupDarkMode();

    // Admin autentifikatsiyasini tekshirish
    const isAuth = await this.checkAuth();
    if (isAuth) {
      this.hideLoginModal();
      this.renderAll();
    } else {
      this.showLoginModal();
    }
  }

  // Sahifalar navigatsiyasi (Sidebar + Mobil Bottom Nav)
  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = item.getAttribute('data-tab');
        this.switchTab(tabName);
        this.closeMobileSidebar();
      });
    });

    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    mobileNavItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = item.getAttribute('data-tab');
        this.switchTab(tabName);
        this.closeMobileSidebar();
      });
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;

    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-tab') === tabName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      if (item.getAttribute('data-tab') === tabName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    const targetPane = document.getElementById(`tab-${tabName}`);
    if (targetPane) {
      targetPane.classList.add('active');
    }

    const titles = {
      dashboard: "Boshqaruv Paneli",
      students: "Talabalar Ro'yxati",
      attendance: "Davomat Jurnali",
      grades: "15 ta Amaliy Dars Baholari",
      mustaqil: "Mustaqil Ish Baholari",
      summary: "Hisobot va Reyting",
      settings: "Sozlamalar"
    };
    const titleElem = document.getElementById('current-page-title');
    if (titleElem) {
      titleElem.textContent = titles[tabName] || "Elektron Jurnal";
    }

    if (tabName === 'dashboard') this.renderDashboard();
    if (tabName === 'students') this.renderStudents();
    if (tabName === 'attendance') this.renderAttendance();
    if (tabName === 'grades') this.renderGrades();
    if (tabName === 'mustaqil') this.renderMustaqil();
    if (tabName === 'summary') this.renderSummary();
    if (tabName === 'settings') this.renderSettings();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar && overlay) {
      sidebar.classList.toggle('show');
      overlay.classList.toggle('show');
    }
  }

  closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar && overlay) {
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
    }
  }

  renderAll() {
    this.populateGroupDropdowns();
    this.renderDashboard();
  }

  populateGroupDropdowns() {
    const groups = window.storage.getGroups();
    const dropdowns = [
      'dash-group-select',
      'students-group-filter',
      'att-group-select',
      'grades-group-select',
      'mustaqil-group-select',
      'summary-group-filter',
      'export-group-select'
    ];

    dropdowns.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;

      const currentVal = el.value;
      const isFilter = id.includes('filter') || id.includes('export') || id.includes('dash');

      let html = isFilter ? '<option value="all">Barcha guruhlar</option>' : '';
      groups.forEach(g => {
        html += `<option value="${g}">${g}</option>`;
      });

      el.innerHTML = html;
      if (currentVal && (groups.includes(currentVal) || currentVal === 'all')) {
        el.value = currentVal;
      }
    });

    const modalGroupSelect = document.getElementById('student-group-input');
    if (modalGroupSelect) {
      modalGroupSelect.innerHTML = groups.map(g => `<option value="${g}">${g}</option>`).join('');
    }
  }

  // =========================================================================
  // 1. BOSHQARUV PANELI (DASHBOARD)
  // =========================================================================
  renderDashboard() {
    const students = window.storage.getStudents();
    const groups = window.storage.getGroups();
    const attendance = window.storage.getAttendance();

    document.getElementById('dash-total-students').textContent = students.length;
    document.getElementById('dash-total-groups').textContent = groups.length;

    let totalPresent = 0;
    let totalRecords = 0;
    attendance.forEach(a => {
      if (a.records) {
        Object.values(a.records).forEach(status => {
          totalRecords++;
          if (status === 'present') totalPresent++;
        });
      }
    });
    const avgAttendance = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 100;
    document.getElementById('dash-avg-attendance').textContent = avgAttendance + '%';

    const globalAvg = window.gradesManager.getGlobalAverage();
    document.getElementById('dash-avg-grade').textContent = globalAvg > 0 ? globalAvg : '0.0';

    this.renderTopStudents(students);
    this.renderAttentionStudents(students);
    this.renderDashboardCharts(students, groups, avgAttendance);
  }

  renderTopStudents(students) {
    const listEl = document.getElementById('dash-top-students-list');
    if (!listEl) return;

    const ranked = students.map(st => {
      const stats = window.gradesManager.getStudentOverallStats(st.id);
      return { student: st, stats };
    }).filter(item => item.stats.overallAvg > 0)
      .sort((a, b) => b.stats.overallAvg - a.stats.overallAvg)
      .slice(0, 5);

    if (ranked.length === 0) {
      listEl.innerHTML = `<div class="text-center py-6 text-muted">Hali baholar kiritilmagan</div>`;
      return;
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    listEl.innerHTML = ranked.map((item, idx) => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
          <span style="font-size: 1.25rem;">${medals[idx]}</span>
          <div style="overflow: hidden;">
            <div style="font-weight: 600; font-size: 0.92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.student.fullName}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${item.student.group}</div>
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0; margin-left: 8px;">
          <div style="font-weight: 800; color: var(--success); font-size: 1.05rem;">${item.stats.overallAvg}</div>
          <span class="badge ${item.stats.status.badgeClass}">${item.stats.status.label}</span>
        </div>
      </div>
    `).join('');
  }

  renderAttentionStudents(students) {
    const listEl = document.getElementById('dash-attention-students-list');
    if (!listEl) return;

    const attentionList = students.map(st => {
      const att = window.attendanceManager.getStudentStats(st.id);
      const overall = window.gradesManager.getStudentOverallStats(st.id);
      return { student: st, att, overall };
    }).filter(item => item.att.percentage < 75 || (item.overall.overallAvg > 0 && item.overall.overallAvg < 3.0))
      .slice(0, 5);

    if (attentionList.length === 0) {
      listEl.innerHTML = `<div class="text-center py-6 text-muted" style="color: var(--success);">
        <i class="fa-solid fa-circle-check" style="font-size: 1.5rem; display: block; margin-bottom: 6px;"></i>
        Dars qoldiruvchi yoki past baholi talabalar yo'q. A'lo darajada!
      </div>`;
      return;
    }

    listEl.innerHTML = attentionList.map(item => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
        <div style="min-width: 0; overflow: hidden;">
          <div style="font-weight: 600; font-size: 0.92rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.student.fullName}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${item.student.group}</div>
        </div>
        <div style="display: flex; gap: 6px; flex-shrink: 0; margin-left: 8px;">
          <span class="badge badge-danger">${item.att.percentage}%</span>
          ${item.overall.overallAvg > 0 ? `<span class="badge badge-warning">${item.overall.overallAvg}</span>` : ''}
        </div>
      </div>
    `).join('');
  }

  renderDashboardCharts(students, groups, avgAttendance) {
    if (typeof Chart === 'undefined') return;

    const ctxAttendance = document.getElementById('chart-attendance');
    if (ctxAttendance) {
      if (this.charts.attendance) this.charts.attendance.destroy();

      let present = 0, absent = 0, excused = 0;
      window.storage.getAttendance().forEach(a => {
        if (a.records) {
          Object.values(a.records).forEach(st => {
            if (st === 'present') present++;
            else if (st === 'absent') absent++;
            else if (st === 'excused') excused++;
          });
        }
      });

      this.charts.attendance = new Chart(ctxAttendance, {
        type: 'doughnut',
        data: {
          labels: ['Keldi', 'Kelmadi', 'Sababli'],
          datasets: [{
            data: [present || 1, absent, excused],
            backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }

    const ctxGrades = document.getElementById('chart-groups');
    if (ctxGrades) {
      if (this.charts.groups) this.charts.groups.destroy();

      const groupLabels = groups;
      const groupAverages = groups.map(g => window.gradesManager.getGroupAverage(g));

      this.charts.groups = new Chart(ctxGrades, {
        type: 'bar',
        data: {
          labels: groupLabels,
          datasets: [{
            label: "15 Dars o'rtachasi",
            data: groupAverages,
            backgroundColor: '#2563eb',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true, max: 5 } },
          plugins: { legend: { display: false } }
        }
      });
    }
  }

  // =========================================================================
  // 2. TALABALAR RO'YXATI (STUDENTS)
  // =========================================================================
  renderStudents() {
    const filterGroup = document.getElementById('students-group-filter').value;
    const searchTerm = (document.getElementById('students-search-input')?.value || '').toLowerCase().trim();

    let students = window.storage.getStudents();

    if (filterGroup !== 'all') {
      students = students.filter(s => s.group === filterGroup);
    }

    if (searchTerm) {
      students = students.filter(s => 
        s.fullName.toLowerCase().includes(searchTerm) || 
        (s.phone && s.phone.includes(searchTerm)) ||
        (s.note && s.note.toLowerCase().includes(searchTerm))
      );
    }

    document.getElementById('students-count-badge').textContent = `Jami: ${students.length} ta talaba`;

    const tbody = document.getElementById('students-table-body');
    if (!tbody) return;

    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-muted">Talabalar topilmadi</td></tr>`;
      return;
    }

    tbody.innerHTML = students.map((st, idx) => {
      const att = window.attendanceManager.getStudentStats(st.id);
      const overall = window.gradesManager.getStudentOverallStats(st.id);

      return `
        <tr>
          <td style="font-weight: 600; color: var(--text-muted); text-align: center;">${idx + 1}</td>
          <td>
            <div style="font-weight: 600;">${st.fullName}</div>
            ${st.note ? `<div style="font-size: 0.76rem; color: var(--text-muted);"><i class="fa-solid fa-tag"></i> ${st.note}</div>` : ''}
          </td>
          <td><span class="badge badge-neutral">${st.group}</span></td>
          <td>${st.phone ? `<a href="tel:${st.phone}" style="color: var(--primary); text-decoration: none;"><i class="fa-solid fa-phone"></i> ${st.phone}</a>` : '-'}</td>
          <td>
            <span class="badge ${att.percentage >= 80 ? 'badge-success' : (att.percentage >= 60 ? 'badge-warning' : 'badge-danger')}">
              ${att.percentage}% (${att.presentCount}/${att.totalLessons})
            </span>
          </td>
          <td>
            ${overall.overallAvg > 0 
              ? `<span style="font-weight: 700; color: ${overall.status.color};">${overall.overallAvg}</span> <span class="badge ${overall.status.badgeClass}">${overall.status.label}</span>`
              : `<span class="badge badge-neutral">Baho yo'q</span>`
            }
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-outline btn-sm" onclick="app.editStudent('${st.id}')" title="Tahrirlash">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn btn-outline btn-sm" style="color: var(--danger);" onclick="app.confirmDeleteStudent('${st.id}')" title="O'chirish">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // =========================================================================
  // 3. DAVOMAT JURNALI (ATTENDANCE)
  // =========================================================================
  renderAttendance() {
    const groupSelect = document.getElementById('att-group-select');
    const dateInput = document.getElementById('att-date-input');

    if (!groupSelect || !dateInput) return;

    const group = groupSelect.value || window.storage.getGroups()[0];
    const date = dateInput.value || new Date().toISOString().split('T')[0];
    dateInput.value = date;

    const currentSubTab = document.querySelector('.att-subtab.active')?.getAttribute('data-subtab') || 'daily';

    if (currentSubTab === 'daily') {
      this.renderDailyAttendance(group, date);
      document.getElementById('att-daily-view').style.display = 'block';
      document.getElementById('att-matrix-view').style.display = 'none';
    } else {
      this.renderAttendanceMatrix(group);
      document.getElementById('att-daily-view').style.display = 'none';
      document.getElementById('att-matrix-view').style.display = 'block';
    }
  }

  renderDailyAttendance(group, date) {
    const container = document.getElementById('daily-attendance-list');
    if (!container) return;

    const data = window.attendanceManager.loadDailyAttendance(group, date);
    document.getElementById('att-lesson-type').value = data.lessonType;
    document.getElementById('att-lesson-theme').value = data.lessonTheme;

    const students = window.storage.getStudents().filter(s => s.group === group);

    if (students.length === 0) {
      container.innerHTML = `<div class="text-center py-8 text-muted">Ushbu guruhda talabalar mavjud emas</div>`;
      return;
    }

    container.innerHTML = students.map((st, idx) => {
      const currentStatus = data.records[st.id] || 'present';

      return `
        <div class="daily-att-row" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border-color); background: var(--bg-card);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-weight: 700; color: var(--text-muted); width: 22px;">${idx + 1}</span>
            <div>
              <div style="font-weight: 600; font-size: 0.95rem;">${st.fullName}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${st.phone || ''}</div>
            </div>
          </div>

          <div class="attendance-toggle-group">
            <button type="button" class="att-btn ${currentStatus === 'present' ? 'active-present' : ''}" onclick="app.setDailyStatus('${st.id}', 'present', this)">
              <i class="fa-solid fa-check"></i> Keldi
            </button>
            <button type="button" class="att-btn ${currentStatus === 'absent' ? 'active-absent' : ''}" onclick="app.setDailyStatus('${st.id}', 'absent', this)">
              <i class="fa-solid fa-xmark"></i> Kelmadi
            </button>
            <button type="button" class="att-btn ${currentStatus === 'excused' ? 'active-excused' : ''}" onclick="app.setDailyStatus('${st.id}', 'excused', this)">
              <i class="fa-solid fa-clock"></i> Sababli
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  setDailyStatus(studentId, status, btnElement) {
    window.attendanceManager.setRecordStatus(studentId, status);
    const parent = btnElement.closest('.attendance-toggle-group');
    parent.querySelectorAll('.att-btn').forEach(b => {
      b.className = 'att-btn';
    });
    btnElement.classList.add(`active-${status}`);
  }

  markAllDaily(status) {
    const group = document.getElementById('att-group-select').value;
    if (status === 'present') {
      window.attendanceManager.markAllPresent(group);
    } else {
      window.attendanceManager.markAllAbsent(group);
    }
    const date = document.getElementById('att-date-input').value;
    this.renderDailyAttendance(group, date);
    this.showToast(`Barcha talabalar holati yangilandi!`, 'info');
  }

  saveDailyAttendanceForm() {
    const group = document.getElementById('att-group-select').value;
    const date = document.getElementById('att-date-input').value;
    const lessonType = document.getElementById('att-lesson-type').value;
    const lessonTheme = document.getElementById('att-lesson-theme').value;

    window.attendanceManager.saveDaily(group, date, lessonType, lessonTheme);
    this.showToast(`Davomat muvaffaqiyatli saqlandi! (${date})`, 'success');
  }

  generate15AttendanceDates() {
    const group = document.getElementById('att-group-select').value;
    const dateInput = document.getElementById('att-date-input').value || new Date().toISOString().split('T')[0];
    window.attendanceManager.setup15Lessons(group, dateInput);
    this.renderAttendance();
    this.showToast(`15 ta amaliy dars sanalari yaratildi!`, 'success');
  }

  renderAttendanceMatrix(group) {
    const matrix = window.attendanceManager.getAttendanceMatrix(group);
    const thead = document.getElementById('att-matrix-thead');
    const tbody = document.getElementById('att-matrix-tbody');

    if (!thead || !tbody) return;

    let headerHtml = `
      <tr>
        <th style="width: 38px;">T/r</th>
        <th style="min-width: 170px;">Talaba F.I.SH</th>
    `;

    matrix.lessons.forEach(l => {
      const short = l.date.split('-').slice(1).join('.');
      headerHtml += `
        <th style="text-align: center; min-width: 50px;" title="${l.date} | ${l.lessonType}: ${l.lessonTheme || ''}">
          <div>${short}</div>
          <div style="font-size: 0.65rem; font-weight: normal;">${l.lessonTheme ? l.lessonTheme.split(' ')[0] : 'Dars'}</div>
        </th>
      `;
    });

    headerHtml += `
        <th style="text-align: center; min-width: 70px;">Keldi</th>
        <th style="text-align: center; min-width: 70px;">Kelmadi</th>
        <th style="text-align: center; min-width: 85px;">Davomat %</th>
      </tr>
    `;
    thead.innerHTML = headerHtml;

    if (matrix.rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${matrix.lessons.length + 5}" class="text-center py-8 text-muted">Talabalar yo'q</td></tr>`;
      return;
    }

    tbody.innerHTML = matrix.rows.map((row, idx) => {
      let cellsHtml = `
        <td style="font-weight: 600; color: var(--text-muted); text-align: center;">${idx + 1}</td>
        <td style="font-weight: 600;">${row.student.fullName}</td>
      `;

      matrix.lessons.forEach(l => {
        const st = row.statuses[l.id] || 'empty';
        let badgeIcon = '-';
        if (st === 'present') badgeIcon = '+';
        if (st === 'absent') badgeIcon = '—';
        if (st === 'excused') badgeIcon = 'S';

        cellsHtml += `
          <td style="text-align: center; padding: 4px;">
            <div class="matrix-cell ${st}" onclick="app.toggleCell('${l.id}', '${row.student.id}')" title="Bosganda almashtirish: + / — / S">
              ${badgeIcon}
            </div>
          </td>
        `;
      });

      cellsHtml += `
        <td style="text-align: center; font-weight: 600; color: var(--success);">${row.stats.presentCount}</td>
        <td style="text-align: center; font-weight: 600; color: var(--danger);">${row.stats.absentCount + row.stats.excusedCount}</td>
        <td style="text-align: center;">
          <span class="badge ${row.stats.percentage >= 80 ? 'badge-success' : (row.stats.percentage >= 60 ? 'badge-warning' : 'badge-danger')}">
            ${row.stats.percentage}%
          </span>
        </td>
      `;

      return `<tr>${cellsHtml}</tr>`;
    }).join('');
  }

  toggleCell(lessonId, studentId) {
    window.attendanceManager.toggleMatrixCell(lessonId, studentId);
    const group = document.getElementById('att-group-select').value;
    this.renderAttendanceMatrix(group);
  }

  // =========================================================================
  // 4. 15 TA AMALIY DARS BAHOLARI (Oraliq nazoratsiz)
  // =========================================================================
  renderGrades() {
    const groupSelect = document.getElementById('grades-group-select');
    if (!groupSelect) return;

    const group = groupSelect.value || window.storage.getGroups()[0];
    const matrix = window.gradesManager.getGradesMatrix(group);

    const thead = document.getElementById('grades-table-thead');
    const tbody = document.getElementById('grades-table-tbody');

    if (!thead || !tbody) return;

    let headHtml = `
      <tr>
        <th style="width: 38px;">T/r</th>
        <th style="min-width: 170px;">Talaba F.I.SH</th>
    `;

    matrix.columns.forEach(c => {
      headHtml += `
        <th style="text-align: center; min-width: 70px;">
          <div style="font-weight: 700; font-size: 0.82rem;">${c.title}</div>
          <div style="font-size: 0.68rem; font-weight: normal; color: var(--text-muted);">
            maks: ${c.maxScore}
            <i class="fa-solid fa-trash-can" style="cursor: pointer; margin-left: 3px; color: var(--danger);" onclick="app.confirmDeleteGradeColumn('${c.id}')" title="O'chirish"></i>
          </div>
        </th>
      `;
    });

    headHtml += `
        <th style="text-align: center; min-width: 90px;">15 Dars o'rtacha</th>
        <th style="text-align: center; min-width: 95px;">Holati</th>
      </tr>
    `;
    thead.innerHTML = headHtml;

    if (matrix.rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${matrix.columns.length + 4}" class="text-center py-8 text-muted">Talabalar topilmadi</td></tr>`;
      return;
    }

    tbody.innerHTML = matrix.rows.map((row, idx) => {
      let cellsHtml = `
        <td style="font-weight: 600; color: var(--text-muted); text-align: center;">${idx + 1}</td>
        <td style="font-weight: 600;">${row.student.fullName}</td>
      `;

      matrix.columns.forEach(c => {
        const val = row.colValues[c.id] !== undefined ? row.colValues[c.id] : '';
        const gradeClass = val ? `grade-${val}` : '';

        cellsHtml += `
          <td style="text-align: center; padding: 4px;">
            <input type="number" 
                   class="grade-input ${gradeClass}" 
                   value="${val}" 
                   min="0" 
                   max="${c.maxScore}" 
                   step="any"
                   onchange="app.onGradeChange('${row.student.id}', '${c.id}', this.value, this)"
                   placeholder="-">
          </td>
        `;
      });

      const stats = row.stats;
      cellsHtml += `
        <td style="text-align: center;">
          <span id="avg-${row.student.id}" style="font-size: 1.05rem; font-weight: 800; color: ${stats.status.color};">
            ${stats.count > 0 ? stats.average : '-'}
          </span>
        </td>
        <td style="text-align: center;">
          <span id="status-${row.student.id}" class="badge ${stats.status.badgeClass}">
            ${stats.status.label}
          </span>
        </td>
      `;

      return `<tr>${cellsHtml}</tr>`;
    }).join('');

    const groupAvg = window.gradesManager.getGroupAverage(group);
    document.getElementById('grades-group-avg-badge').textContent = `15 Dars o'rtacha bali: ${groupAvg}`;
  }

  onGradeChange(studentId, colId, value, inputEl) {
    const updatedStats = window.gradesManager.setGrade(studentId, colId, value);

    inputEl.className = 'grade-input' + (value ? ` grade-${value}` : '');

    const avgEl = document.getElementById(`avg-${studentId}`);
    const statusEl = document.getElementById(`status-${studentId}`);
    if (avgEl && statusEl) {
      avgEl.textContent = updatedStats.count > 0 ? updatedStats.average : '-';
      avgEl.style.color = updatedStats.status.color;
      statusEl.textContent = updatedStats.status.label;
      statusEl.className = `badge ${updatedStats.status.badgeClass}`;
    }

    const group = document.getElementById('grades-group-select').value;
    const groupAvg = window.gradesManager.getGroupAverage(group);
    document.getElementById('grades-group-avg-badge').textContent = `15 Dars o'rtacha bali: ${groupAvg}`;

    this.showToast("Baho saqlandi", "success");
  }

  apply15LessonsTemplate() {
    if (confirm("15 ta sof amaliy dars shablonini (1-amaliy ... 15-amaliy) qo'llashni xohlaysizmi?")) {
      window.gradesManager.setup15PracticalsTemplate();
      this.renderGrades();
      this.showToast("15 ta amaliy dars shabloni qo'llandi!", "success");
    }
  }

  // =========================================================================
  // 5. ALOHIDA MUSTAQIL ISHLAR PANELI
  // =========================================================================
  renderMustaqil() {
    const groupSelect = document.getElementById('mustaqil-group-select');
    if (!groupSelect) return;

    const group = groupSelect.value || window.storage.getGroups()[0];
    const matrix = window.gradesManager.getMustaqilMatrix(group);

    const thead = document.getElementById('mustaqil-table-thead');
    const tbody = document.getElementById('mustaqil-table-tbody');

    if (!thead || !tbody) return;

    let headHtml = `
      <tr>
        <th style="width: 38px;">T/r</th>
        <th style="min-width: 170px;">Talaba F.I.SH</th>
    `;

    matrix.columns.forEach(c => {
      headHtml += `
        <th style="text-align: center; min-width: 110px;">
          <div style="font-weight: 700; font-size: 0.85rem;">${c.title}</div>
          <div style="font-size: 0.68rem; font-weight: normal; color: var(--text-muted);" title="${c.description || ''}">
            maks: ${c.maxScore}
            <i class="fa-solid fa-trash-can" style="cursor: pointer; margin-left: 3px; color: var(--danger);" onclick="app.confirmDeleteMustaqilColumn('${c.id}')" title="O'chirish"></i>
          </div>
        </th>
      `;
    });

    headHtml += `
        <th style="text-align: center; min-width: 95px;">Mustaqil Ish o'rtachasi</th>
        <th style="text-align: center; min-width: 95px;">Holati</th>
      </tr>
    `;
    thead.innerHTML = headHtml;

    if (matrix.rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${matrix.columns.length + 4}" class="text-center py-8 text-muted">Talabalar topilmadi</td></tr>`;
      return;
    }

    tbody.innerHTML = matrix.rows.map((row, idx) => {
      let cellsHtml = `
        <td style="font-weight: 600; color: var(--text-muted); text-align: center;">${idx + 1}</td>
        <td style="font-weight: 600;">${row.student.fullName}</td>
      `;

      matrix.columns.forEach(c => {
        const val = row.colValues[c.id] !== undefined ? row.colValues[c.id] : '';
        const gradeClass = val ? `grade-${val}` : '';

        cellsHtml += `
          <td style="text-align: center; padding: 6px;">
            <input type="number" 
                   class="grade-input ${gradeClass}" 
                   value="${val}" 
                   min="0" 
                   max="${c.maxScore}" 
                   step="any"
                   onchange="app.onMustaqilGradeChange('${row.student.id}', '${c.id}', this.value, this)"
                   placeholder="-">
          </td>
        `;
      });

      const stats = row.stats;
      cellsHtml += `
        <td style="text-align: center;">
          <span id="mi-avg-${row.student.id}" style="font-size: 1.05rem; font-weight: 800; color: ${stats.status.color};">
            ${stats.count > 0 ? stats.average : '-'}
          </span>
        </td>
        <td style="text-align: center;">
          <span id="mi-status-${row.student.id}" class="badge ${stats.status.badgeClass}">
            ${stats.status.label}
          </span>
        </td>
      `;

      return `<tr>${cellsHtml}</tr>`;
    }).join('');

    const groupMiAvg = window.gradesManager.getMustaqilGroupAverage(group);
    document.getElementById('mustaqil-group-avg-badge').textContent = `Mustaqil ish o'rtacha bali: ${groupMiAvg}`;
  }

  onMustaqilGradeChange(studentId, colId, value, inputEl) {
    const updatedStats = window.gradesManager.setMustaqilGrade(studentId, colId, value);

    inputEl.className = 'grade-input' + (value ? ` grade-${value}` : '');

    const avgEl = document.getElementById(`mi-avg-${studentId}`);
    const statusEl = document.getElementById(`mi-status-${studentId}`);
    if (avgEl && statusEl) {
      avgEl.textContent = updatedStats.count > 0 ? updatedStats.average : '-';
      avgEl.style.color = updatedStats.status.color;
      statusEl.textContent = updatedStats.status.label;
      statusEl.className = `badge ${updatedStats.status.badgeClass}`;
    }

    const group = document.getElementById('mustaqil-group-select').value;
    const groupMiAvg = window.gradesManager.getMustaqilGroupAverage(group);
    document.getElementById('mustaqil-group-avg-badge').textContent = `Mustaqil ish o'rtacha bali: ${groupMiAvg}`;

    this.showToast("Mustaqil ish bahosi saqlandi", "success");
  }

  openAddMustaqilModal() {
    document.getElementById('mi-title-input').value = '';
    document.getElementById('mi-desc-input').value = '';
    this.openModal('modal-add-mustaqil');
  }

  saveMustaqilForm(e) {
    e.preventDefault();
    const title = document.getElementById('mi-title-input').value.trim();
    const description = document.getElementById('mi-desc-input').value.trim();
    const maxScore = Number(document.getElementById('mi-maxscore-input').value) || 5;

    if (!title) {
      alert("Mustaqil ish nomini kiriting!");
      return;
    }

    window.gradesManager.addMustaqilColumn(title, description, maxScore);
    this.closeAllModals();
    this.renderMustaqil();
    this.showToast(`Yangi "${title}" qo'shildi!`, "success");
  }

  confirmDeleteMustaqilColumn(colId) {
    const col = window.storage.getMustaqilColumns().find(c => c.id === colId);
    if (!col) return;

    if (confirm(`"${col.title}" mustaqil ishini va uning barcha baholarini o'chirishni tasdiqlaysizmi?`)) {
      window.gradesManager.deleteMustaqilColumn(colId);
      this.renderMustaqil();
      this.showToast("Mustaqil ish ustuni o'chirildi", "info");
    }
  }

  // =========================================================================
  // 6. UMUMIY HISOBOT VA REYTING (SUMMARY)
  // =========================================================================
  renderSummary() {
    const groupFilter = document.getElementById('summary-group-filter').value;
    const searchTerm = (document.getElementById('summary-search-input')?.value || '').toLowerCase().trim();

    let students = window.storage.getStudents();

    if (groupFilter !== 'all') {
      students = students.filter(s => s.group === groupFilter);
    }

    if (searchTerm) {
      students = students.filter(s => s.fullName.toLowerCase().includes(searchTerm));
    }

    // Reyting bo'yicha saralash
    const list = students.map(st => {
      const att = window.attendanceManager.getStudentStats(st.id, groupFilter === 'all' ? null : groupFilter);
      const pr = window.gradesManager.getStudentGradeStats(st.id);
      const mi = window.gradesManager.getStudentMustaqilStats(st.id);
      const overall = window.gradesManager.getStudentOverallStats(st.id);
      return { student: st, att, pr, mi, overall };
    }).sort((a, b) => b.overall.overallAvg - a.overall.overallAvg);

    const tbody = document.getElementById('summary-table-tbody');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-muted">Ma'lumot topilmadi</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((item, idx) => {
      const rankBadge = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`));

      return `
        <tr>
          <td style="font-weight: 700; text-align: center;">${rankBadge}</td>
          <td style="font-weight: 600;">${item.student.fullName}</td>
          <td><span class="badge badge-neutral">${item.student.group}</span></td>
          <td style="text-align: center;">${item.att.totalLessons} ta</td>
          <td style="text-align: center; color: var(--danger); font-weight: 600;">${item.att.missedHours} soat</td>
          <td style="text-align: center;">
            <span class="badge ${item.att.percentage >= 80 ? 'badge-success' : (item.att.percentage >= 60 ? 'badge-warning' : 'badge-danger')}">
              ${item.att.percentage}%
            </span>
          </td>
          <td style="text-align: center; font-weight: 700; color: var(--primary);">
            ${item.pr.count > 0 ? item.pr.average : '-'}
          </td>
          <td style="text-align: center; font-weight: 700; color: #9333ea;">
            ${item.mi.count > 0 ? item.mi.average : '-'}
          </td>
          <td style="text-align: center; font-size: 1.1rem; font-weight: 800; color: ${item.overall.status.color};">
            ${item.overall.overallAvg > 0 ? item.overall.overallAvg : '-'}
          </td>
          <td style="text-align: center;">
            <span class="badge ${item.overall.status.badgeClass}">${item.overall.status.label}</span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // =========================================================================
  // 7. SOZLAMALAR VA GURUHLAR (SETTINGS)
  // =========================================================================
  renderSettings() {
    const settings = window.storage.getSettings();
    document.getElementById('setting-institution').value = settings.institutionName || '';
    document.getElementById('setting-subject').value = settings.subjectName || '';
    document.getElementById('setting-grading-system').value = settings.gradingSystem || '5';

    const groups = window.storage.getGroups();
    const groupListEl = document.getElementById('settings-groups-list');
    if (groupListEl) {
      groupListEl.innerHTML = groups.map(g => `
        <div style="display: inline-flex; align-items: center; gap: 8px; background: var(--bg-card); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: var(--radius-md);">
          <span style="font-weight: 600;">${g}</span>
          <i class="fa-solid fa-xmark" style="cursor: pointer; color: var(--danger);" onclick="app.removeGroup('${g}')" title="Guruhni o'chirish"></i>
        </div>
      `).join('');
    }

    const srvBadge = document.getElementById('settings-server-status');
    if (srvBadge) {
      if (window.storage.isServerConnected) {
        srvBadge.textContent = "Ulangan";
        srvBadge.className = "badge badge-success";
      } else {
        srvBadge.textContent = "Lokal (Oflayn)";
        srvBadge.className = "badge badge-neutral";
      }
    }
  }

  saveSettingsForm(e) {
    if (e) e.preventDefault();
    const settings = {
      institutionName: document.getElementById('setting-institution').value.trim(),
      subjectName: document.getElementById('setting-subject').value.trim(),
      gradingSystem: document.getElementById('setting-grading-system').value
    };
    window.storage.saveSettings(settings);
    this.showToast("Sozlamalar saqlandi!", "success");
    this.renderAll();
  }

  addNewGroupPrompt() {
    const name = prompt("Yangi guruh nomini kiriting (masalan: 301-guruh):");
    if (name && name.trim()) {
      if (window.storage.addGroup(name.trim())) {
        this.populateGroupDropdowns();
        this.renderSettings();
        this.showToast(`Yangi "${name}" guruhi qo'shildi!`, "success");
      } else {
        alert("Bu nomdagi guruh allaqachon mavjud!");
      }
    }
  }

  removeGroup(groupName) {
    const studentsInGroup = window.storage.getStudents().filter(s => s.group === groupName);
    let confirmMsg = `Haqiqatan ham "${groupName}" guruhini o'chirmoqchimisiz?`;
    if (studentsInGroup.length > 0) {
      confirmMsg = `DIQQAT: "${groupName}" guruhida ${studentsInGroup.length} ta talaba mavjud!\n\n"${groupName}" guruhi va unga tegishli BARCHA ${studentsInGroup.length} ta talaba, ularning davomati va barcha baholari saytdan butunlay o'chib ketadi.\n\nTasdiqlaysizmi?`;
    }
    if (confirm(confirmMsg)) {
      const count = window.storage.deleteGroupAndStudents(groupName);
      this.populateGroupDropdowns();
      this.renderAll();
      this.showToast(`"${groupName}" guruhi va uning ${count} ta talabasi saytdan to'liq o'chirildi!`, "info");
    }
  }

  // Ommaviy nusxalab qo'shish (Kopiya qilib joylash)
  openBulkAddModal() {
    const groups = window.storage.getGroups();
    const select = document.getElementById('bulk-group-input');
    if (select) {
      select.innerHTML = groups.map(g => `<option value="${g}">${g}</option>`).join('');
      const curFilter = document.getElementById('students-group-filter')?.value;
      if (curFilter && curFilter !== 'all') {
        select.value = curFilter;
      }
    }
    const txtArea = document.getElementById('bulk-students-textarea');
    if (txtArea) txtArea.value = '';
    const preview = document.getElementById('bulk-preview-badge');
    if (preview) {
      preview.textContent = 'Aniqlangan talabalar: 0 ta';
      preview.className = 'badge badge-neutral';
    }
    this.openModal('modal-bulk-add');
  }

  onBulkTextChange(textarea) {
    const parsed = window.storage.parseBulkStudentText(textarea.value);
    const preview = document.getElementById('bulk-preview-badge');
    if (preview) {
      preview.textContent = `Aniqlangan talabalar: ${parsed.length} ta`;
      preview.className = parsed.length > 0 ? 'badge badge-success' : 'badge badge-neutral';
    }
  }

  saveBulkStudentsForm(e) {
    e.preventDefault();
    const text = document.getElementById('bulk-students-textarea').value;
    const group = document.getElementById('bulk-group-input').value;

    if (!text || !text.trim()) {
      alert("Iltimos, talabalar ro'yxatini matn maydoniga joylashtiring (Ctrl+V)!");
      return;
    }

    const count = window.storage.addStudentsBulk(text, group);
    if (count > 0) {
      this.closeAllModals();
      this.populateGroupDropdowns();
      this.renderAll();
      this.showToast(`${count} ta talaba "${group}"ga alohida-alohida muvaffaqiyatli kiritildi!`, "success");
    } else {
      alert("Talabalar aniqlanmadi! Har bir talabani yangi qatordan joylashtiring.");
    }
  }

  // =========================================================================
  // MODAL OYNALAR VA AMALLAR
  // =========================================================================
  setupModals() {
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeAllModals();
        }
      });
    });

    document.querySelectorAll('.att-subtab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.att-subtab').forEach(t => t.classList.remove('active', 'btn-primary'));
        document.querySelectorAll('.att-subtab').forEach(t => t.classList.add('btn-outline'));
        tab.classList.add('active', 'btn-primary');
        tab.classList.remove('btn-outline');
        this.renderAttendance();
      });
    });
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
    }
  }

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.classList.remove('show');
    });
  }

  openAddStudentModal() {
    document.getElementById('student-modal-title').textContent = "Yangi Talaba Qo'shish";
    document.getElementById('student-id-input').value = '';
    document.getElementById('student-name-input').value = '';
    document.getElementById('student-phone-input').value = '';
    document.getElementById('student-note-input').value = '';
    this.openModal('modal-student');
  }

  editStudent(id) {
    const student = window.storage.getStudents().find(s => s.id === id);
    if (!student) return;

    document.getElementById('student-modal-title').textContent = "Talabani Tahrirlash";
    document.getElementById('student-id-input').value = student.id;
    document.getElementById('student-name-input').value = student.fullName;
    document.getElementById('student-group-input').value = student.group;
    document.getElementById('student-phone-input').value = student.phone || '';
    document.getElementById('student-note-input').value = student.note || '';
    this.openModal('modal-student');
  }

  saveStudentForm(e) {
    e.preventDefault();
    const id = document.getElementById('student-id-input').value;
    const fullName = document.getElementById('student-name-input').value.trim();
    const group = document.getElementById('student-group-input').value.trim();
    const phone = document.getElementById('student-phone-input').value.trim();
    const note = document.getElementById('student-note-input').value.trim();

    if (!fullName || !group) {
      alert("Talaba ismi va guruhini kiritish majburiy!");
      return;
    }

    if (id) {
      window.storage.updateStudent(id, { fullName, group, phone, note });
      this.showToast("Talaba ma'lumotlari yangilandi!", "success");
    } else {
      window.storage.addStudent({ fullName, group, phone, note });
      this.showToast("Yangi talaba qo'shildi!", "success");
    }

    this.closeAllModals();
    this.renderAll();
  }

  confirmDeleteStudent(id) {
    const student = window.storage.getStudents().find(s => s.id === id);
    if (!student) return;

    if (confirm(`Haqiqatan ham "${student.fullName}"ni ro'yxatdan o'chirmoqchimisiz?`)) {
      window.storage.deleteStudent(id);
      this.showToast("Talaba o'chirildi", "danger");
      this.renderAll();
    }
  }

  openAddColumnModal() {
    document.getElementById('col-title-input').value = '';
    this.openModal('modal-add-column');
  }

  saveColumnForm(e) {
    e.preventDefault();
    const title = document.getElementById('col-title-input').value.trim();
    const maxScore = Number(document.getElementById('col-maxscore-input').value) || 5;

    if (!title) {
      alert("Dars nomini kiriting!");
      return;
    }

    window.gradesManager.addColumn(title, 'amaliy', maxScore);
    this.closeAllModals();
    this.renderGrades();
    this.showToast(`Yangi "${title}" ustuni qo'shildi!`, "success");
  }

  confirmDeleteGradeColumn(colId) {
    const col = window.storage.getGradeColumns().find(c => c.id === colId);
    if (!col) return;

    if (confirm(`"${col.title}" ustuni va unga tegishli barcha baholarni o'chirishni tasdiqlaysizmi?`)) {
      window.gradesManager.deleteColumn(colId);
      this.renderGrades();
      this.showToast("Ustun o'chirildi", "info");
    }
  }

  // =========================================================================
  // EXCEL EKSPORT VA IMPORT
  // =========================================================================
  exportExcel() {
    const groupSelect = document.getElementById('export-group-select');
    const selectedGroup = groupSelect ? groupSelect.value : 'all';
    window.excelManager.exportCompleteJournal(selectedGroup);
    this.showToast("Excel fayl (4 ta varaqda) yuklanmoqda...", "success");
  }

  downloadTemplate() {
    window.excelManager.downloadStudentTemplate();
    this.showToast("Shablon yuklandi", "info");
  }

  handleExcelImport(inputEl) {
    const file = inputEl.files[0];
    if (!file) return;

    window.excelManager.importStudentsFromExcel(file, (res) => {
      inputEl.value = '';
      if (res.success) {
        this.populateGroupDropdowns();
        this.renderAll();
        this.showToast(`${res.count} ta talaba Exceldan yuklandi!`, "success");
      } else {
        alert(res.message);
      }
    });
  }

  downloadJsonBackup() {
    const jsonStr = window.storage.exportAllDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Jurnal_Zaxira_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast("Zaxira nusxa yuklandi", "success");
  }

  handleJsonRestore(inputEl) {
    const file = inputEl.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const success = window.storage.importAllDataJSON(e.target.result);
      inputEl.value = '';
      if (success) {
        this.populateGroupDropdowns();
        this.renderAll();
        this.showToast("Barcha ma'lumotlar tiklandi!", "success");
      } else {
        alert("Zaxira fayli yaroqsiz!");
      }
    };
    reader.readAsText(file);
  }

  confirmResetDemo() {
    if (confirm("Namunaviy ma'lumotlarni (15 ta amaliy dars va mustaqil ishlar) qayta yuklamoqchimisiz?")) {
      window.storage.loadDemoData();
      this.populateGroupDropdowns();
      this.renderAll();
      this.showToast("Namunaviy ma'lumotlar yuklandi!", "info");
    }
  }

  confirmClearAll() {
    if (confirm("DIQQAT: Barcha talabalar, davomat va baholar butunlay o'chiriladi! Davom etasizmi?")) {
      window.storage.clearAllData();
      location.reload();
    }
  }

  setupDarkMode() {
    const toggleBtn = document.getElementById('dark-mode-toggle');
    const isDark = localStorage.getItem('jurnal_theme') === 'dark';

    if (isDark) {
      document.body.classList.add('dark-mode');
      if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const darkActive = document.body.classList.contains('dark-mode');
        localStorage.setItem('jurnal_theme', darkActive ? 'dark' : 'light');
        toggleBtn.innerHTML = darkActive ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
      });
    }
  }

  showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = {
      success: 'fa-circle-check',
      danger: 'fa-circle-exclamation',
      warning: 'fa-triangle-exclamation',
      info: 'fa-circle-info'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="fa-solid ${icons[type] || 'fa-bell'}" style="font-size: 1.1rem;"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // =========================================================================
  // ADMIN AUTENTIFIKATSIYASI VA XAVFSIZLIK (LOGIN & SECURITY)
  // =========================================================================
  async checkAuth() {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const isOfflineLogged = localStorage.getItem('jurnal_auth_logged_in') === 'true';

    // 1. Agar token mavjud bo'lsa, server orqali tekshiramiz
    if (token) {
      try {
        const res = await fetch('/api/auth/verify', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.authenticated) {
            window.storage.token = token;
            window.storage.isServerConnected = true;
            window.storage.updateConnectionBadge(true);
            return true;
          }
        } else if (res.status === 401) {
          // Boshqa qurilmada parol o'zgartirilgan bo'lsa, ushbu qurilmadagi eski sessiyani bekor qilish!
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          localStorage.removeItem('jurnal_auth_logged_in');
          window.storage.token = '';
          return false;
        }
      } catch (err) {
        console.warn("Server tekshiruvida tarmoq xatoligi:", err);
        if (isOfflineLogged) {
          window.storage.updateConnectionBadge(false);
          return true;
        }
      }
    }

    return false;
  }

  showLoginModal() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      const pwdInput = document.getElementById('login-password');
      if (pwdInput) {
        setTimeout(() => pwdInput.focus(), 200);
      }
    }
  }

  hideLoginModal() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  async submitLogin(e) {
    if (e) e.preventDefault();
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const submitBtn = document.getElementById('login-submit-btn');
    const alertBox = document.getElementById('login-error-alert');
    const alertText = document.getElementById('login-error-text');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!username || !password) {
      if (alertBox && alertText) {
        alertText.textContent = "Login va parolni kiriting!";
        alertBox.style.display = 'flex';
      }
      return;
    }

    if (alertBox) alertBox.style.display = 'none';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Tekshirilmoqda...';
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, json.token);
        localStorage.setItem(STORAGE_KEYS.AUTH_USER, json.username);
        localStorage.setItem('jurnal_auth_logged_in', 'true');
        window.storage.token = json.token;
        window.storage.isServerConnected = true;

        // Server bazasidan barcha ma'lumotlarni tortib olish
        await window.storage.syncFromServer();

        this.hideLoginModal();
        this.renderAll();
        this.showToast(`Xush kelibsiz, ${json.username}!`, "success");
        return;
      } else {
        if (alertBox && alertText) {
          alertText.textContent = json.message || "Login yoki parol noto'g'ri!";
          alertBox.style.display = 'flex';
        }
      }
    } catch (netErr) {
      console.warn("Server bilan aloqa yo'q, lokal oflayn login tekshirilmoqda:", netErr);
      const offlinePass = localStorage.getItem('jurnal_offline_pass') || 'admin123';
      if (username === 'admin' && password === offlinePass) {
        localStorage.setItem('jurnal_auth_logged_in', 'true');
        localStorage.setItem(STORAGE_KEYS.AUTH_USER, 'admin');
        window.storage.isServerConnected = false;
        window.storage.updateConnectionBadge(false);

        this.hideLoginModal();
        this.renderAll();
        this.showToast("Oflayn rejimda muvaffaqiyatli kirdingiz!", "info");
        return;
      } else {
        if (alertBox && alertText) {
          alertText.textContent = "Login yoki parol noto'g'ri! (Standart parol: admin123)";
          alertBox.style.display = 'flex';
        }
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> <span>Tizimga Kirish</span>';
      }
    }
  }

  logout() {
    if (confirm("Haqiqatan ham tizimdan chiqmoqchimisiz?")) {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      localStorage.removeItem('jurnal_auth_logged_in');
      window.storage.token = '';
      const pwdInput = document.getElementById('login-password');
      if (pwdInput) pwdInput.value = '';
      this.showLoginModal();
      this.showToast("Tizimdan chiqildi", "info");
    }
  }

  togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    if (btn) {
      btn.innerHTML = isPassword ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
    }
  }

  async changePassword(e) {
    if (e) e.preventDefault();
    const oldPassInput = document.getElementById('admin-current-pass');
    const newPassInput = document.getElementById('admin-new-pass');
    const confirmPassInput = document.getElementById('admin-confirm-pass');

    const oldPassword = oldPassInput ? oldPassInput.value.trim() : '';
    const newPassword = newPassInput ? newPassInput.value.trim() : '';
    const confirmPassword = confirmPassInput ? confirmPassInput.value.trim() : '';

    if (!oldPassword || !newPassword) {
      this.showToast("Barcha maydonlarni to'ldiring!", "danger");
      return;
    }

    if (newPassword.length < 4) {
      this.showToast("Yangi parol kamida 4 ta belgidan iborat bo'lishi kerak!", "warning");
      return;
    }

    if (newPassword !== confirmPassword) {
      this.showToast("Yangi parollar bir-biriga mos kelmadi!", "danger");
      return;
    }

    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

    if (token) {
      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            old_password: oldPassword,
            new_password: newPassword
          })
        });

        const json = await res.json();
        if (res.ok && json.success) {
          if (json.new_token) {
            localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, json.new_token);
            window.storage.token = json.new_token;
          }
          localStorage.setItem('jurnal_offline_pass', newPassword);
          this.showToast("Admin paroli o'zgartirildi! Boshqa barcha qurilmalarda ham yangi parol kuchga kirdi. ✅", "success");
          if (oldPassInput) oldPassInput.value = '';
          if (newPassInput) newPassInput.value = '';
          if (confirmPassInput) confirmPassInput.value = '';
          return;
        } else {
          this.showToast(json.message || "Eski parol noto'g'ri!", "danger");
          return;
        }
      } catch (err) {
        console.warn("Server orqali parolni o'zgartirishda xatolik:", err);
      }
    }

    // Oflayn rejimda parolni yangilash
    const currentOffline = localStorage.getItem('jurnal_offline_pass') || 'admin123';
    if (oldPassword !== currentOffline) {
      this.showToast("Amaldagi eski parol noto'g'ri!", "danger");
      return;
    }

    localStorage.setItem('jurnal_offline_pass', newPassword);
    this.showToast("Admin paroli muvaffaqiyatli yangilandi!", "success");
    if (oldPassInput) oldPassInput.value = '';
    if (newPassInput) newPassInput.value = '';
    if (confirmPassInput) confirmPassInput.value = '';
  }

  async manualServerSync() {
    this.showToast("Markaziy SQLite bazasi bilan sinxronlanmoqda...", "info");
    const success = await window.storage.syncFromServer();
    const statusBadge = document.getElementById('settings-server-status');

    if (success) {
      if (statusBadge) {
        statusBadge.textContent = "Ulangan";
        statusBadge.className = "badge badge-success";
      }
      this.renderAll();
      this.showToast("Barcha ma'lumotlar serverdan yangilandi!", "success");
    } else {
      if (statusBadge) {
        statusBadge.textContent = "Aloqa yo'q";
        statusBadge.className = "badge badge-danger";
      }
      this.showToast("Server bilan aloqa bog'lanmadi. Server ishga tushirilganligini tekshiring.", "danger");
    }
  }

  async forceSyncAll() {
    const btn = document.getElementById('btn-force-sync');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Sinxronlanmoqda...</span>';
    }
    this.showToast("Barcha ma'lumotlar markaziy baza va Telegram botga yuklanmoqda...", "info");

    const ok = await window.storage.syncAllToServer();
    if (ok) {
      this.showToast("Barcha ma'lumotlar bulutga saqlandi! Telegram botda ham yangilandi. ✅", "success");
    } else {
      this.showToast("Bulut serveriga ulanishda xatolik. Internetni tekshiring.", "danger");
    }

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Sinxronlash</span>';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new JurnalApp();
  window.app.init();
});
