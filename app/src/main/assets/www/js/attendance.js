// attendance.js - Attendance Management Module for SALARY Powered by SHIV COMPUTER

const Attendance = {
  selectedMonth: new Date().getMonth() + 1,
  selectedYear: new Date().getFullYear(),
  currentView: 'matrix', // 'matrix' or 'daily'
  selectedDay: new Date().getDate(),

  async init() {
    this.selectedMonth = new Date().getMonth() + 1;
    this.selectedYear = new Date().getFullYear();
    this.selectedDay = new Date().getDate();
    this.populateSelectors();
  },

  populateSelectors() {
    const monthSelect = document.getElementById('attMonthSelect');
    const yearSelect = document.getElementById('attYearSelect');
    if (!monthSelect || !yearSelect) return;

    monthSelect.innerHTML = '';
    for (let m = 1; m <= 12; m++) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = Utils.getMonthName(m);
      if (m === this.selectedMonth) opt.selected = true;
      monthSelect.appendChild(opt);
    }

    yearSelect.innerHTML = '';
    const curYear = new Date().getFullYear();
    for (let y = curYear - 3; y <= curYear + 2; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === this.selectedYear) opt.selected = true;
      yearSelect.appendChild(opt);
    }
  },

  // Generate storage key
  getRecordId(schoolId, employeeId, year, month) {
    return `att_${schoolId}_${employeeId}_${year}_${month}`;
  },

  async getMonthAttendance(schoolId, year, month) {
    const all = await DB.getAll('attendance');
    return all.filter(a => a.schoolId === schoolId && a.year === Number(year) && a.month === Number(month));
  },

  async getEmployeeMonthAttendance(schoolId, employeeId, year, month) {
    const id = this.getRecordId(schoolId, employeeId, year, month);
    return await DB.getById('attendance', id);
  },

  async saveEmployeeAttendanceRecord(schoolId, employeeId, year, month, daysMap) {
    const id = this.getRecordId(schoolId, employeeId, year, month);
    const record = {
      id,
      schoolId,
      employeeId,
      year: Number(year),
      month: Number(month),
      days: daysMap, // { "1": "P", "2": "A", ... }
      updatedAt: new Date().toISOString()
    };
    await DB.put('attendance', record);
    return record;
  },

  // Calculate summary counts for an employee
  computeAttendanceStats(daysMap, year, month) {
    const daysInMonth = Utils.getDaysInMonth(year, month);
    let present = 0;
    let absent = 0;
    let leave = 0;
    let halfDay = 0;
    let sundays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      if (Utils.isSunday(year, month, d)) {
        sundays++;
        continue;
      }
      const st = daysMap[d];
      if (st === 'P') present++;
      else if (st === 'A') absent++;
      else if (st === 'L') leave++;
      else if (st === 'H') halfDay++;
    }

    return { present, absent, leave, halfDay, sundays, daysInMonth };
  },

  async setDayStatus(employeeId, day, status) {
    const schoolId = Schools.activeSchoolId;
    if (!schoolId) return;

    let record = await this.getEmployeeMonthAttendance(schoolId, employeeId, this.selectedYear, this.selectedMonth);
    const days = record && record.days ? { ...record.days } : {};
    
    if (status === 'CLEAR') {
      delete days[day];
    } else {
      days[day] = status;
    }

    await this.saveEmployeeAttendanceRecord(schoolId, employeeId, this.selectedYear, this.selectedMonth, days);
    this.render();
  },

  // Bulk: Mark all employees Present for selected day
  async markAllDay(status) {
    const schoolId = Schools.activeSchoolId;
    if (!schoolId) return;
    const employees = await Employees.getForActiveSchool();
    const activeEmps = employees.filter(e => e.status === 'Active');

    const day = this.selectedDay;
    if (Utils.isSunday(this.selectedYear, this.selectedMonth, day)) {
      App.showToast('Selected date is Sunday (Paid Holiday)', 'info');
      return;
    }

    for (const emp of activeEmps) {
      let record = await this.getEmployeeMonthAttendance(schoolId, emp.id, this.selectedYear, this.selectedMonth);
      const days = record && record.days ? { ...record.days } : {};
      days[day] = status;
      await this.saveEmployeeAttendanceRecord(schoolId, emp.id, this.selectedYear, this.selectedMonth, days);
    }

    await Audit.log('Bulk Attendance', 'Attendance', `Marked ${status} for all employees on ${day}/${this.selectedMonth}/${this.selectedYear}`);
    App.showToast(`Marked All ${status === 'P' ? 'Present' : status === 'A' ? 'Absent' : status} for Day ${day}`, 'success');
    this.render();
  },

  // Mark all working days in month as Present for all active employees
  async markAllMonthPresent() {
    const schoolId = Schools.activeSchoolId;
    if (!schoolId) return;

    const confirmed = confirm(`Mark all working days of ${Utils.getMonthName(this.selectedMonth)} ${this.selectedYear} as PRESENT for all active employees?`);
    if (!confirmed) return;

    const employees = await Employees.getForActiveSchool();
    const activeEmps = employees.filter(e => e.status === 'Active');
    const daysInMonth = Utils.getDaysInMonth(this.selectedYear, this.selectedMonth);

    for (const emp of activeEmps) {
      const days = {};
      for (let d = 1; d <= daysInMonth; d++) {
        if (!Utils.isSunday(this.selectedYear, this.selectedMonth, d)) {
          days[d] = 'P';
        }
      }
      await this.saveEmployeeAttendanceRecord(schoolId, emp.id, this.selectedYear, this.selectedMonth, days);
    }

    await Audit.log('Bulk Attendance', 'Attendance', `Marked entire month Present for ${activeEmps.length} employees`);
    App.showToast('Marked all working days as Present', 'success');
    this.render();
  },

  async clearMonthAttendance() {
    const verified = await Auth.promptPassword(`Clear all attendance data for ${Utils.getMonthName(this.selectedMonth)} ${this.selectedYear}`);
    if (!verified) return;

    const schoolId = Schools.activeSchoolId;
    const records = await this.getMonthAttendance(schoolId, this.selectedYear, this.selectedMonth);
    for (const r of records) {
      await DB.delete('attendance', r.id);
    }

    await Audit.log('Attendance Cleared', 'Attendance', `Cleared attendance for ${this.selectedMonth}/${this.selectedYear}`);
    App.showToast('Attendance data cleared', 'info');
    this.render();
  },

  // Copy previous day's attendance
  async copyPreviousDay() {
    const schoolId = Schools.activeSchoolId;
    if (!schoolId) return;
    const targetDay = this.selectedDay;
    const prevDay = targetDay - 1;

    if (prevDay < 1) {
      App.showToast('Cannot copy previous day from day 1', 'warning');
      return;
    }

    const employees = await Employees.getForActiveSchool();
    for (const emp of employees) {
      let record = await this.getEmployeeMonthAttendance(schoolId, emp.id, this.selectedYear, this.selectedMonth);
      if (record && record.days && record.days[prevDay]) {
        const days = { ...record.days };
        days[targetDay] = record.days[prevDay];
        await this.saveEmployeeAttendanceRecord(schoolId, emp.id, this.selectedYear, this.selectedMonth, days);
      }
    }

    App.showToast(`Copied attendance from Day ${prevDay} to Day ${targetDay}`, 'success');
    this.render();
  },

  async render() {
    const container = document.getElementById('attendanceContainer');
    if (!container) return;

    const schoolId = Schools.activeSchoolId;
    if (!schoolId) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="icon-school"></i></div>
          <h3>No School Selected</h3>
          <p>Please select a school to mark or view attendance.</p>
        </div>
      `;
      return;
    }

    const employees = await Employees.getForActiveSchool();
    const activeEmps = employees.filter(e => e.status === 'Active');

    if (activeEmps.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="icon-users"></i></div>
          <h3>No Active Employees</h3>
          <p>Add active employees to this school to start recording attendance.</p>
          <button class="btn btn-primary" onclick="Employees.openModal()"><i class="icon-plus"></i> Add Employee</button>
        </div>
      `;
      return;
    }

    const year = Number(this.selectedYear);
    const month = Number(this.selectedMonth);
    const daysInMonth = Utils.getDaysInMonth(year, month);
    const records = await this.getMonthAttendance(schoolId, year, month);
    const recordsMap = {};
    records.forEach(r => { recordsMap[r.employeeId] = r.days || {}; });

    // Header controls bar
    let html = `
      <div class="card mb-3">
        <div class="flex-between flex-wrap gap-2">
          <div class="flex-align gap-2">
            <span class="font-bold text-sm">Target Day:</span>
            <select id="attDayPicker" class="form-control form-control-sm" onchange="Attendance.selectedDay = Number(this.value); Attendance.render();" style="width: auto;">
    `;

    for (let d = 1; d <= daysInMonth; d++) {
      const isSun = Utils.isSunday(year, month, d);
      html += `<option value="${d}" ${d === this.selectedDay ? 'selected' : ''}>Day ${d} (${isSun ? 'Sun' : 'Work'})</option>`;
    }

    html += `
            </select>
            <button class="btn btn-sm btn-success" onclick="Attendance.markAllDay('P')"><i class="icon-check"></i> All Present Today</button>
            <button class="btn btn-sm btn-danger" onclick="Attendance.markAllDay('A')"><i class="icon-x"></i> All Absent Today</button>
          </div>
          <div class="flex-align gap-2">
            <button class="btn btn-sm btn-outline" onclick="Attendance.copyPreviousDay()"><i class="icon-copy"></i> Copy Prev Day</button>
            <button class="btn btn-sm btn-primary" onclick="Attendance.markAllMonthPresent()"><i class="icon-check-circle"></i> Fill All Month Present</button>
            <button class="btn btn-sm btn-outline-danger" onclick="Attendance.clearMonthAttendance()"><i class="icon-trash"></i> Clear</button>
          </div>
        </div>

        <div class="attendance-legend flex-align gap-3 mt-3 pt-2 border-top">
          <span class="legend-item"><span class="badge badge-success">P</span> Present</span>
          <span class="legend-item"><span class="badge badge-danger">A</span> Absent</span>
          <span class="legend-item"><span class="badge badge-warning">H</span> Half Day (0.5)</span>
          <span class="legend-item"><span class="badge badge-info">L</span> Leave</span>
          <span class="legend-item"><span class="badge badge-neutral">SUN</span> Sunday (Paid)</span>
        </div>
      </div>
    `;

    // Monthly Attendance Table Matrix
    html += `
      <div class="card table-card">
        <div class="table-responsive attendance-scrollable-table">
          <table class="data-table attendance-table">
            <thead>
              <tr>
                <th class="sticky-col first-col">Employee</th>
    `;

    for (let d = 1; d <= daysInMonth; d++) {
      const isSun = Utils.isSunday(year, month, d);
      html += `<th class="text-center ${isSun ? 'sun-header' : ''} ${d === this.selectedDay ? 'active-day-col' : ''}">
        <div>${d}</div>
        <div class="text-xs ${isSun ? 'text-accent' : 'text-muted'}">${isSun ? 'Sun' : 'D'}</div>
      </th>`;
    }

    html += `
                <th class="text-center sticky-col last-col">P</th>
                <th class="text-center">A</th>
                <th class="text-center">H</th>
                <th class="text-center">L</th>
              </tr>
            </thead>
            <tbody>
    `;

    activeEmps.forEach(emp => {
      const days = recordsMap[emp.id] || {};
      const stats = this.computeAttendanceStats(days, year, month);

      html += `
        <tr>
          <td class="sticky-col first-col">
            <div class="font-bold text-sm text-truncate" style="max-width: 140px;">${Utils.escapeHtml(emp.name)}</div>
            <div class="text-xs text-muted font-mono">${Utils.escapeHtml(emp.employeeId)}</div>
          </td>
      `;

      for (let d = 1; d <= daysInMonth; d++) {
        const isSun = Utils.isSunday(year, month, d);
        if (isSun) {
          html += `<td class="text-center sun-cell"><span class="badge-sun" title="Sunday Paid Holiday">S</span></td>`;
        } else {
          const st = days[d] || '-';
          let badgeClass = 'cell-empty';
          if (st === 'P') badgeClass = 'cell-p';
          else if (st === 'A') badgeClass = 'cell-a';
          else if (st === 'H') badgeClass = 'cell-h';
          else if (st === 'L') badgeClass = 'cell-l';

          html += `
            <td class="text-center cell-interactive ${d === this.selectedDay ? 'active-day-cell' : ''}" onclick="Attendance.cycleStatus('${emp.id}', ${d})">
              <span class="att-badge ${badgeClass}" title="Click to cycle status">${st}</span>
            </td>
          `;
        }
      }

      html += `
          <td class="text-center font-bold text-success sticky-col last-col">${stats.present}</td>
          <td class="text-center font-bold text-danger">${stats.absent}</td>
          <td class="text-center font-bold text-warning">${stats.halfDay}</td>
          <td class="text-center font-bold text-info">${stats.leave}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  // Cycle status: - -> P -> A -> H -> L -> CLEAR
  async cycleStatus(employeeId, day) {
    const schoolId = Schools.activeSchoolId;
    if (!schoolId) return;

    let record = await this.getEmployeeMonthAttendance(schoolId, employeeId, this.selectedYear, this.selectedMonth);
    const days = record && record.days ? { ...record.days } : {};
    const cur = days[day];

    let next = 'P';
    if (!cur || cur === '-') next = 'P';
    else if (cur === 'P') next = 'A';
    else if (cur === 'A') next = 'H';
    else if (cur === 'H') next = 'L';
    else if (cur === 'L') next = 'CLEAR';

    if (next === 'CLEAR') {
      delete days[day];
    } else {
      days[day] = next;
    }

    await this.saveEmployeeAttendanceRecord(schoolId, employeeId, this.selectedYear, this.selectedMonth, days);
    this.render();
  }
};
