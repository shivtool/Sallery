// app.js - Main Application Controller for SALARY Powered by SHIV COMPUTER

const App = {
  currentRoute: 'dashboard',
  theme: localStorage.getItem('salary_theme') || 'light',

  async init() {
    this.applyTheme(this.theme);

    // Initialize DB
    await DB.init();

    // Check if demo data prompt needed (first launch)
    await this.checkFirstLaunch();

    // Initialize Auth & Lock Screen
    if (!Auth.isAuthenticated()) {
      this.showLockScreen();
    } else {
      this.hideLockScreen();
      Auth.startInactivityMonitoring();
    }

    // Initialize Modules
    await Schools.init();
    await Attendance.init();
    await Salary.init();
    await Reports.init();

    // Setup Event Listeners
    this.setupEventListeners();

    // Render Initial View
    this.navigateTo(this.currentRoute);

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      try {
        navigator.serviceWorker.register('service-worker.js');
      } catch (e) {
        console.warn('SW registration skipped', e);
      }
    }
  },

  applyTheme(theme) {
    this.theme = theme;
    localStorage.setItem('salary_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    const themeIcon = document.getElementById('themeToggleIcon');
    if (themeIcon) {
      themeIcon.className = theme === 'dark' ? 'icon-sun' : 'icon-moon';
    }
  },

  toggleTheme() {
    this.applyTheme(this.theme === 'dark' ? 'light' : 'dark');
  },

  showLockScreen() {
    const lockScreen = document.getElementById('appLockScreen');
    const lockInput = document.getElementById('lockPasswordInput');
    const lockError = document.getElementById('lockErrorMsg');
    if (!lockScreen) return;

    if (lockInput) lockInput.value = '';
    if (lockError) lockError.textContent = '';
    lockScreen.style.display = 'flex';
    if (lockInput) lockInput.focus();
  },

  hideLockScreen() {
    const lockScreen = document.getElementById('appLockScreen');
    if (lockScreen) lockScreen.style.display = 'none';
  },

  async handleUnlock() {
    const input = document.getElementById('lockPasswordInput');
    const error = document.getElementById('lockErrorMsg');
    const val = input.value;

    const valid = await Auth.verifyPassword(val);
    if (valid) {
      Auth.setAuthenticated(true);
      this.hideLockScreen();
      await Audit.log('Admin Login', 'Security', 'Unlocked application dashboard');
      this.showToast('Welcome to SALARY!', 'success');
      this.renderCurrentView();
    } else {
      error.textContent = 'Invalid application password. Access denied.';
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 500);
      input.select();
    }
  },

  lockApp() {
    Auth.setAuthenticated(false);
    this.showLockScreen();
  },

  // First Launch: Prompt user for Demo Data or Start Empty
  async checkFirstLaunch() {
    const initialized = await DB.getById('app_settings', 'is_initialized');
    if (!initialized) {
      const schools = await DB.getAll('schools');
      if (schools.length === 0) {
        const modal = document.getElementById('firstLaunchModal');
        if (modal) modal.classList.add('active');
      } else {
        await DB.put('app_settings', { key: 'is_initialized', value: true });
      }
    }
  },

  async loadDemoData() {
    const modal = document.getElementById('firstLaunchModal');
    if (modal) modal.classList.remove('active');

    // Create 1 Demo School
    const demoSchool = {
      id: 'sch_demo_01',
      name: 'Delhi Public Academy',
      code: 'DPA-101',
      address: 'Plot 42, Knowledge Park III, Greater Noida, UP',
      mobile: '9876543210',
      email: 'info@delhipublicacademy.edu',
      principal: 'Dr. R. K. Sharma',
      notes: 'Premier Senior Secondary Institution',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await DB.put('schools', demoSchool);

    // 5 Demo Employees
    const demoEmployees = [
      {
        id: 'emp_demo_01',
        schoolId: demoSchool.id,
        employeeId: 'EMP-001',
        name: 'Virendra Singh',
        mobile: '9876500001',
        designation: 'Vice Principal & PGT Physics',
        department: 'Science',
        joiningDate: '2022-04-01',
        monthlySalary: 45000,
        bankName: 'State Bank of India',
        accountNumber: '38192837461',
        ifscCode: 'SBIN0001234',
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'emp_demo_02',
        schoolId: demoSchool.id,
        employeeId: 'EMP-002',
        name: 'Pooja Verma',
        mobile: '9876500002',
        designation: 'TGT Mathematics',
        department: 'Mathematics',
        joiningDate: '2023-07-15',
        monthlySalary: 32000,
        bankName: 'HDFC Bank',
        accountNumber: '501002345678',
        ifscCode: 'HDFC0000123',
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'emp_demo_03',
        schoolId: demoSchool.id,
        employeeId: 'EMP-003',
        name: 'Amitabh Sen',
        mobile: '9876500003',
        designation: 'PRT English',
        department: 'Languages',
        joiningDate: '2024-01-10',
        monthlySalary: 24000,
        bankName: 'Punjab National Bank',
        accountNumber: '1234000100987',
        ifscCode: 'PUNB0123400',
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'emp_demo_04',
        schoolId: demoSchool.id,
        employeeId: 'EMP-004',
        name: 'Sunita Mehra',
        mobile: '9876500004',
        designation: 'Accountant & Office Clerk',
        department: 'Administration',
        joiningDate: '2023-04-01',
        monthlySalary: 22000,
        bankName: 'Bank of Baroda',
        accountNumber: '09876543210',
        ifscCode: 'BARB0NOIDA',
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'emp_demo_05',
        schoolId: demoSchool.id,
        employeeId: 'EMP-005',
        name: 'Ramesh Kumar',
        mobile: '9876500005',
        designation: 'Lab Assistant & Maintenance',
        department: 'Support Staff',
        joiningDate: '2023-11-01',
        monthlySalary: 16000,
        bankName: 'Canara Bank',
        accountNumber: '456710100234',
        ifscCode: 'CNRB0004567',
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const emp of demoEmployees) {
      await DB.put('employees', emp);
    }

    // Default Salary settings
    await Settings.initSchoolSettings(demoSchool.id);

    // Populate current month attendance
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    const daysInMonth = Utils.getDaysInMonth(curYear, curMonth);

    // Emp 1: Clean month (all Present)
    const emp1Days = {};
    for (let d = 1; d <= daysInMonth; d++) {
      if (!Utils.isSunday(curYear, curMonth, d)) emp1Days[d] = 'P';
    }
    await Attendance.saveEmployeeAttendanceRecord(demoSchool.id, 'emp_demo_01', curYear, curMonth, emp1Days);

    // Emp 2: 1 Absent (PAID under Rule 1) + 1 Leave (Deducted 1 day)
    const emp2Days = { ...emp1Days };
    emp2Days[5] = 'A';
    emp2Days[12] = 'L';
    await Attendance.saveEmployeeAttendanceRecord(demoSchool.id, 'emp_demo_02', curYear, curMonth, emp2Days);

    // Emp 3: 2 Half Days (0.5 + 0.5 = 1 day deduction)
    const emp3Days = { ...emp1Days };
    emp3Days[8] = 'H';
    emp3Days[18] = 'H';
    await Attendance.saveEmployeeAttendanceRecord(demoSchool.id, 'emp_demo_03', curYear, curMonth, emp3Days);

    // Emp 4 & 5: All Present
    await Attendance.saveEmployeeAttendanceRecord(demoSchool.id, 'emp_demo_04', curYear, curMonth, emp1Days);
    await Attendance.saveEmployeeAttendanceRecord(demoSchool.id, 'emp_demo_05', curYear, curMonth, emp1Days);

    await DB.put('app_settings', { key: 'is_initialized', value: true });
    await Schools.setActiveSchool(demoSchool.id);

    // Automatically generate salaries
    await Salary.generateMonthlySalaries();

    await Audit.log('Demo Data Loaded', 'System', 'Initialized system with Delhi Public Academy demo data');
    this.showToast('Demo data loaded successfully!', 'success');
    this.navigateTo('dashboard');
  },

  async startEmpty() {
    const modal = document.getElementById('firstLaunchModal');
    if (modal) modal.classList.remove('active');
    await DB.put('app_settings', { key: 'is_initialized', value: true });
    this.showToast('Ready! Please add your first school.', 'info');
    this.navigateTo('schools');
  },

  navigateTo(route) {
    this.currentRoute = route;

    // Update navigation active states
    document.querySelectorAll('.nav-link, .bottom-nav-item').forEach(el => {
      const r = el.getAttribute('data-route');
      if (r === route) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Hide all view panels
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));

    // Show active panel
    const panel = document.getElementById(`view-${route}`);
    if (panel) {
      panel.classList.add('active');
    }

    this.renderCurrentView();
  },

  renderCurrentView() {
    switch (this.currentRoute) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'schools':
        Schools.renderSchoolsList('schoolsListContainer');
        break;
      case 'employees':
        Employees.renderList();
        break;
      case 'attendance':
        Attendance.render();
        break;
      case 'salary':
        Salary.render();
        break;
      case 'reports':
        Reports.render();
        break;
      case 'settings':
        Settings.renderSettingsView();
        break;
      case 'audit':
        this.renderAuditLogs();
        break;
      case 'about':
        // Static view
        break;
    }
  },

  onSchoolChanged() {
    Schools.updateHeaderSelector();
    this.renderCurrentView();
  },

  // -------------------------------------------------------------
  // DASHBOARD ENGINE
  // -------------------------------------------------------------
  async renderDashboard() {
    const schoolId = Schools.activeSchoolId;
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    const todayDay = now.getDate();

    const schools = await DB.getAll('schools');
    const employees = await DB.getAll('employees');
    const schoolEmployees = schoolId ? employees.filter(e => e.schoolId === schoolId) : [];
    const activeEmployees = schoolEmployees.filter(e => e.status === 'Active');

    const attendanceRecords = schoolId ? await DB.getAll('attendance') : [];
    const monthAtt = attendanceRecords.filter(a => a.schoolId === schoolId && a.year === curYear && a.month === curMonth);

    // Today's attendance
    let presentToday = 0;
    let absentToday = 0;
    let leaveToday = 0;
    let halfDayToday = 0;

    monthAtt.forEach(a => {
      const st = a.days ? a.days[todayDay] : null;
      if (st === 'P') presentToday++;
      else if (st === 'A') absentToday++;
      else if (st === 'L') leaveToday++;
      else if (st === 'H') halfDayToday++;
    });

    const salaryRecords = schoolId ? await DB.getAll('salary_records') : [];
    const curMonthSalaries = salaryRecords.filter(s => s.schoolId === schoolId && s.year === curYear && s.month === curMonth);

    const totalMonthSalary = curMonthSalaries.reduce((acc, c) => acc + c.netSalary, 0);
    const paidMonthSalary = curMonthSalaries.filter(s => s.paymentStatus === 'Paid').reduce((acc, c) => acc + c.netSalary, 0);
    const pendingMonthSalary = totalMonthSalary - paidMonthSalary;
    const totalDeductions = curMonthSalaries.reduce((acc, c) => acc + c.totalDeductions, 0);

    // Animate KPI Numbers
    this.animateNumber('dashTotalSchools', schools.length);
    this.animateNumber('dashTotalEmployees', schoolEmployees.length);
    this.animateNumber('dashActiveEmployees', activeEmployees.length);
    this.animateNumber('dashPresentToday', presentToday);
    this.animateNumber('dashAbsentToday', absentToday);
    this.animateNumber('dashLeaveToday', leaveToday);

    const salTotalEl = document.getElementById('dashMonthSalary');
    if (salTotalEl) salTotalEl.textContent = Utils.formatCurrency(totalMonthSalary);

    const salPaidEl = document.getElementById('dashPaidSalary');
    if (salPaidEl) salPaidEl.textContent = Utils.formatCurrency(paidMonthSalary);

    const salPendingEl = document.getElementById('dashPendingSalary');
    if (salPendingEl) salPendingEl.textContent = Utils.formatCurrency(pendingMonthSalary);

    const salDeductEl = document.getElementById('dashTotalDeductions');
    if (salDeductEl) salDeductEl.textContent = Utils.formatCurrency(totalDeductions);

    // Render Canvas Charts
    this.renderAttendanceChart(presentToday, absentToday, leaveToday, halfDayToday);
    this.renderSalaryOverviewChart(paidMonthSalary, pendingMonthSalary, totalDeductions);
    this.renderMonthlySalaryTrendChart(salaryRecords, schoolId);
    this.renderDepartmentChart(schoolEmployees);
    this.renderTodayAttendanceRoster(activeEmployees.length > 0 ? activeEmployees : schoolEmployees, monthAtt, todayDay);
  },

  renderTodayAttendanceRoster(employees, monthAtt, todayDay) {
    const container = document.getElementById('dashTodayAttendanceList');
    if (!container) return;

    if (!employees || employees.length === 0) {
      container.innerHTML = `<div class="text-xs text-muted py-3 text-center">No staff found for this institution.</div>`;
      return;
    }

    const attMap = {};
    monthAtt.forEach(a => {
      if (a.days && a.days[todayDay]) {
        attMap[a.employeeId] = a.days[todayDay];
      }
    });

    const html = employees.slice(0, 6).map(emp => {
      const status = attMap[emp.id] || 'P';
      let badgeClass = 'cell-p';
      let badgeLabel = 'P';
      if (status === 'A') { badgeClass = 'cell-a'; badgeLabel = 'A'; }
      else if (status === 'H') { badgeClass = 'cell-h'; badgeLabel = 'H'; }
      else if (status === 'L') { badgeClass = 'cell-l'; badgeLabel = 'L'; }
      else if (status === 'Sun') { badgeClass = 'sun-cell'; badgeLabel = 'SUN'; }

      const initials = (emp.name || 'Staff')
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      return `
        <div class="recent-att-item">
          <div class="flex-align gap-2">
            <div style="width: 28px; height: 28px; border-radius: 9999px; background-color: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800;">
              ${initials}
            </div>
            <div>
              <div style="font-size: 12px; font-weight: 800; line-height: 1.1; color: var(--text-main);">${Utils.escapeHtml(emp.name)}</div>
              <div style="font-size: 9px; color: var(--text-sub); margin-top: 1px;">${Utils.escapeHtml(emp.designation || 'Staff')}</div>
            </div>
          </div>
          <span class="att-badge ${badgeClass}">${badgeLabel}</span>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  },

  animateNumber(elId, targetValue) {
    const el = document.getElementById(elId);
    if (!el) return;
    const start = 0;
    const duration = 600;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (targetValue - start) * easeProgress);
      el.textContent = current;
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    requestAnimationFrame(update);
  },

  // 1. Attendance Donut Chart (Canvas)
  renderAttendanceChart(p, a, l, h) {
    const canvas = document.getElementById('attendanceDonutChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = 240;
    const height = canvas.height = 240;

    ctx.clearRect(0, 0, width, height);
    const total = p + a + l + h;

    if (total === 0) {
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 70, 0, Math.PI * 2);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 26;
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No Attendance Today', width / 2, height / 2 + 5);
      return;
    }

    const data = [
      { label: 'Present', val: p, color: '#10b981' },
      { label: 'Absent', val: a, color: '#ef4444' },
      { label: 'Leave', val: l, color: '#3b82f6' },
      { label: 'Half Day', val: h, color: '#f59e0b' }
    ];

    let startAngle = -Math.PI / 2;
    const cx = width / 2;
    const cy = height / 2;
    const radius = 70;

    data.forEach(item => {
      if (item.val === 0) return;
      const sliceAngle = (item.val / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 26;
      ctx.stroke();
      startAngle += sliceAngle;
    });

    // Center label
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${p}/${total}`, cx, cy);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Present', cx, cy + 20);
  },

  // 2. Salary Overview Donut Chart
  renderSalaryOverviewChart(paid, pending, deductions) {
    const canvas = document.getElementById('salaryOverviewChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = 240;
    const height = canvas.height = 240;

    ctx.clearRect(0, 0, width, height);
    const total = paid + pending + deductions;

    if (total === 0) {
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 70, 0, Math.PI * 2);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 26;
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No Payroll Yet', width / 2, height / 2 + 5);
      return;
    }

    const data = [
      { val: paid, color: '#10b981' },
      { val: pending, color: '#f59e0b' },
      { val: deductions, color: '#ef4444' }
    ];

    let startAngle = -Math.PI / 2;
    const cx = width / 2;
    const cy = height / 2;
    const radius = 70;

    data.forEach(item => {
      if (item.val === 0) return;
      const sliceAngle = (item.val / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 26;
      ctx.stroke();
      startAngle += sliceAngle;
    });

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    const percent = Math.round((paid / (paid + pending || 1)) * 100);
    ctx.fillText(`${percent}%`, cx, cy);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Paid', cx, cy + 18);
  },

  // 3. Monthly Salary 6-Month Trend Chart (Bar/Area)
  renderMonthlySalaryTrendChart(allSalaries, schoolId) {
    const canvas = document.getElementById('salaryTrendChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = 500;
    const height = canvas.height = 180;
    ctx.clearRect(0, 0, width, height);

    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    const dataPoints = months.map(m => {
      const filtered = allSalaries.filter(s => s.schoolId === schoolId && s.year === m.year && s.month === m.month);
      const sum = filtered.reduce((acc, c) => acc + c.netSalary, 0);
      return {
        label: Utils.getMonthName(m.month).substr(0, 3),
        value: sum
      };
    });

    const maxVal = Math.max(...dataPoints.map(d => d.value), 50000);
    const barWidth = 40;
    const gap = (width - 60 - (dataPoints.length * barWidth)) / (dataPoints.length - 1);
    const bottomY = height - 30;

    // Draw baseline
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(30, bottomY);
    ctx.lineTo(width - 20, bottomY);
    ctx.stroke();

    dataPoints.forEach((d, idx) => {
      const x = 40 + idx * (barWidth + gap);
      const barH = (d.value / maxVal) * (bottomY - 40);
      const y = bottomY - barH;

      // Gradient bar
      const grad = ctx.createLinearGradient(x, y, x, bottomY);
      grad.addColorStop(0, '#6366f1');
      grad.addColorStop(1, '#818cf8');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
      ctx.fill();

      // Value label on top
      if (d.value > 0) {
        ctx.fillStyle = '#475569';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`₹${Math.round(d.value / 1000)}k`, x + barWidth / 2, y - 6);
      }

      // Month Label
      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x + barWidth / 2, bottomY + 16);
    });
  },

  // 4. Department Distribution Horizontal Bars
  renderDepartmentChart(employees) {
    const container = document.getElementById('deptDistributionContainer');
    if (!container) return;

    if (employees.length === 0) {
      container.innerHTML = '<p class="text-muted text-sm text-center py-3">No employee records.</p>';
      return;
    }

    const depts = {};
    employees.forEach(e => {
      const d = e.department || 'General';
      depts[d] = (depts[d] || 0) + 1;
    });

    const total = employees.length;
    let html = '';
    for (const [dept, count] of Object.entries(depts)) {
      const pct = Math.round((count / total) * 100);
      html += `
        <div class="mb-2">
          <div class="flex-between text-xs font-semibold mb-1">
            <span>${Utils.escapeHtml(dept)}</span>
            <span>${count} (${pct}%)</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }
    container.innerHTML = html;
  },

  // Audit Logs view renderer
  async renderAuditLogs() {
    const container = document.getElementById('auditLogsContainer');
    if (!container) return;

    const logs = await Audit.getAll();

    if (logs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="icon-activity"></i></div>
          <h3>No Audit Records</h3>
          <p>System activities and administrative actions will be logged here.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="flex-between mb-3">
        <span class="font-bold text-sm">System Audit History (${logs.length} Entries)</span>
        <button class="btn btn-sm btn-outline-danger" onclick="App.confirmClearAuditLogs()"><i class="icon-trash"></i> Clear Audit History</button>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Module</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
    `;

    logs.forEach(l => {
      html += `
        <tr>
          <td class="text-sm text-muted font-mono whitespace-nowrap">${Utils.formatDate(l.timestamp)} ${new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
          <td><span class="badge badge-accent">${Utils.escapeHtml(l.action)}</span></td>
          <td><span class="font-medium">${Utils.escapeHtml(l.module)}</span></td>
          <td class="text-sm">${Utils.escapeHtml(l.details)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  },

  async confirmClearAuditLogs() {
    const verified = await Auth.promptPassword('Clear All Audit Logs');
    if (!verified) return;
    await Audit.clearAll();
    this.showToast('Audit logs cleared', 'info');
    this.renderAuditLogs();
  },

  // Factory Reset Application
  async confirmResetApplication() {
    const verified = await Auth.promptPassword('Reset Entire Application & Delete All Data');
    if (!verified) return;

    const typed = prompt('WARNING: You are about to permanently wipe all schools, employees, attendance, and salary history.\n\nTo confirm, explicitly type:\nRESET SALARY');
    if (typed !== 'RESET SALARY') {
      this.showToast('Reset cancelled: Confirmation phrase did not match.', 'info');
      return;
    }

    await DB.resetAll();
    localStorage.removeItem('salary_active_school_id');
    localStorage.removeItem('salary_last_activity');
    sessionStorage.clear();

    alert('Application has been successfully reset.');
    window.location.reload();
  },

  // Toast Notification System
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-slide-in`;

    let iconClass = 'icon-info';
    if (type === 'success') iconClass = 'icon-check-circle';
    if (type === 'error') iconClass = 'icon-alert-circle';
    if (type === 'warning') iconClass = 'icon-alert-triangle';

    toast.innerHTML = `
      <i class="${iconClass}"></i>
      <div class="toast-message">${Utils.escapeHtml(message)}</div>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 400);
      }
    }, 3800);
  },

  // Setup Event Listeners
  setupEventListeners() {
    // School selector change
    const schoolSelect = document.getElementById('headerSchoolSelect');
    if (schoolSelect) {
      schoolSelect.addEventListener('change', (e) => {
        if (e.target.value) {
          Schools.setActiveSchool(e.target.value);
        }
      });
    }

    // School Form submit
    const schoolForm = document.getElementById('schoolForm');
    if (schoolForm) {
      schoolForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const formData = {
            id: schoolForm.schoolId.value,
            name: schoolForm.name.value,
            code: schoolForm.code.value,
            address: schoolForm.address.value,
            mobile: schoolForm.mobile.value,
            email: schoolForm.email.value,
            principal: schoolForm.principal.value,
            logo: schoolForm.schoolLogoData.value,
            notes: schoolForm.notes.value
          };
          await Schools.saveSchool(formData);
          Schools.closeModal();
          App.showToast('School saved successfully!', 'success');
          Schools.renderSchoolsList('schoolsListContainer');
        } catch (err) {
          App.showToast(err.message, 'error');
        }
      });
    }

    // School Logo file input
    const schoolLogoInput = document.getElementById('schoolLogoInput');
    if (schoolLogoInput) {
      schoolLogoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const base64 = await Utils.resizeImage(file, 300, 300);
          document.getElementById('schoolLogoData').value = base64;
          document.getElementById('schoolLogoPreview').innerHTML = `<img src="${base64}" alt="Logo" />`;
          document.getElementById('removeSchoolLogoBtn').style.display = 'inline-block';
        } catch (err) {
          App.showToast('Failed to process image: ' + err.message, 'error');
        }
      });
    }

    const removeLogoBtn = document.getElementById('removeSchoolLogoBtn');
    if (removeLogoBtn) {
      removeLogoBtn.addEventListener('click', () => {
        document.getElementById('schoolLogoData').value = '';
        document.getElementById('schoolLogoPreview').innerHTML = '<span class="avatar-initial">?</span>';
        removeLogoBtn.style.display = 'none';
      });
    }

    // Employee Form submit
    const employeeForm = document.getElementById('employeeForm');
    if (employeeForm) {
      employeeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const formData = {
            id: employeeForm.empId.value,
            employeeId: employeeForm.employeeId.value,
            name: employeeForm.name.value,
            mobile: employeeForm.mobile.value,
            address: employeeForm.address.value,
            designation: employeeForm.designation.value,
            department: employeeForm.department.value,
            joiningDate: employeeForm.joiningDate.value,
            monthlySalary: employeeForm.monthlySalary.value,
            photo: employeeForm.empPhotoData.value,
            bankName: employeeForm.bankName.value,
            accountNumber: employeeForm.accountNumber.value,
            ifscCode: employeeForm.ifscCode.value,
            notes: employeeForm.notes.value,
            status: employeeForm.status.value
          };
          await Employees.saveEmployee(formData);
          Employees.closeModal();
          App.showToast('Employee details saved!', 'success');
          Employees.renderList();
        } catch (err) {
          App.showToast(err.message, 'error');
        }
      });
    }

    // Employee Photo input
    const empPhotoInput = document.getElementById('empPhotoInput');
    if (empPhotoInput) {
      empPhotoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const base64 = await Utils.resizeImage(file, 250, 250);
          document.getElementById('empPhotoData').value = base64;
          document.getElementById('empPhotoPreview').innerHTML = `<img src="${base64}" alt="Photo" />`;
          document.getElementById('removeEmpPhotoBtn').style.display = 'inline-block';
        } catch (err) {
          App.showToast('Failed to process photo: ' + err.message, 'error');
        }
      });
    }

    const removeEmpPhotoBtn = document.getElementById('removeEmpPhotoBtn');
    if (removeEmpPhotoBtn) {
      removeEmpPhotoBtn.addEventListener('click', () => {
        document.getElementById('empPhotoData').value = '';
        document.getElementById('empPhotoPreview').innerHTML = '<span class="avatar-initial">?</span>';
        removeEmpPhotoBtn.style.display = 'none';
      });
    }

    // Backup restore input
    const restoreInput = document.getElementById('backupFileInput');
    if (restoreInput) {
      restoreInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          Backup.handleFileRestore(file);
          restoreInput.value = '';
        }
      });
    }

    // Employee Filter listeners (debounced search)
    const empSearchInput = document.getElementById('empSearchInput');
    if (empSearchInput) {
      empSearchInput.addEventListener('input', Utils.debounce((e) => {
        Employees.currentFilters.search = e.target.value;
        Employees.renderList();
      }, 200));
    }

    const empDeptSelect = document.getElementById('empFilterDept');
    if (empDeptSelect) {
      empDeptSelect.addEventListener('change', (e) => {
        Employees.currentFilters.department = e.target.value;
        Employees.renderList();
      });
    }

    const empDesigSelect = document.getElementById('empFilterDesig');
    if (empDesigSelect) {
      empDesigSelect.addEventListener('change', (e) => {
        Employees.currentFilters.designation = e.target.value;
        Employees.renderList();
      });
    }

    const empStatusSelect = document.getElementById('empFilterStatus');
    if (empStatusSelect) {
      empStatusSelect.addEventListener('change', (e) => {
        Employees.currentFilters.status = e.target.value;
        Employees.renderList();
      });
    }

    const empSortSelect = document.getElementById('empSortSelect');
    if (empSortSelect) {
      empSortSelect.addEventListener('change', (e) => {
        Employees.currentFilters.sortBy = e.target.value;
        Employees.renderList();
      });
    }

    // Global Search in Header
    const globalSearch = document.getElementById('globalSearchInput');
    if (globalSearch) {
      globalSearch.addEventListener('input', Utils.debounce((e) => {
        const val = e.target.value.trim();
        if (val.length > 0) {
          App.navigateTo('employees');
          if (empSearchInput) {
            empSearchInput.value = val;
            Employees.currentFilters.search = val;
            Employees.renderList();
          }
        }
      }, 300));
    }

    // Attendance Month/Year change
    const attMonth = document.getElementById('attMonthSelect');
    const attYear = document.getElementById('attYearSelect');
    if (attMonth) {
      attMonth.addEventListener('change', (e) => {
        Attendance.selectedMonth = Number(e.target.value);
        Attendance.render();
      });
    }
    if (attYear) {
      attYear.addEventListener('change', (e) => {
        Attendance.selectedYear = Number(e.target.value);
        Attendance.render();
      });
    }

    // Salary Month/Year change
    const salMonth = document.getElementById('salaryMonthSelect');
    const salYear = document.getElementById('salaryYearSelect');
    if (salMonth) {
      salMonth.addEventListener('change', (e) => {
        Salary.selectedMonth = Number(e.target.value);
        Salary.render();
      });
    }
    if (salYear) {
      salYear.addEventListener('change', (e) => {
        Salary.selectedYear = Number(e.target.value);
        Salary.render();
      });
    }

    // Report Type change
    const reportTypeSelect = document.getElementById('reportTypeSelect');
    if (reportTypeSelect) {
      reportTypeSelect.addEventListener('change', (e) => {
        Reports.currentReportType = e.target.value;
        Reports.render();
      });
    }

    const repMonth = document.getElementById('reportMonthSelect');
    const repYear = document.getElementById('reportYearSelect');
    const repEmp = document.getElementById('reportEmpSelect');

    if (repMonth) repMonth.addEventListener('change', (e) => { Reports.filterMonth = e.target.value; Reports.render(); });
    if (repYear) repYear.addEventListener('change', (e) => { Reports.filterYear = e.target.value; Reports.render(); });
    if (repEmp) repEmp.addEventListener('change', (e) => { Reports.filterEmployeeId = e.target.value; Reports.render(); });
  }
};

// Auto-run on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
