// reports.js - Comprehensive Reporting Engine for SALARY Powered by SHIV COMPUTER

const Reports = {
  currentReportType: 'monthly_salary',
  filterMonth: new Date().getMonth() + 1,
  filterYear: new Date().getFullYear(),
  filterEmployeeId: 'all',
  filterStatus: 'all',
  lastRenderedData: [],

  async init() {
    this.filterMonth = new Date().getMonth() + 1;
    this.filterYear = new Date().getFullYear();
    this.populateControls();
  },

  async populateControls() {
    const monthSelect = document.getElementById('reportMonthSelect');
    const yearSelect = document.getElementById('reportYearSelect');
    const empSelect = document.getElementById('reportEmpSelect');

    if (monthSelect) {
      monthSelect.innerHTML = '<option value="all">All Months</option>';
      for (let m = 1; m <= 12; m++) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = Utils.getMonthName(m);
        if (m === this.filterMonth) opt.selected = true;
        monthSelect.appendChild(opt);
      }
    }

    if (yearSelect) {
      yearSelect.innerHTML = '';
      const curYear = new Date().getFullYear();
      for (let y = curYear - 3; y <= curYear + 2; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === this.filterYear) opt.selected = true;
        yearSelect.appendChild(opt);
      }
    }

    if (empSelect) {
      empSelect.innerHTML = '<option value="all">All Staff Members</option>';
      const emps = await Employees.getForActiveSchool();
      emps.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = `${e.name} (${e.employeeId})`;
        empSelect.appendChild(opt);
      });
    }
  },

  async render() {
    const container = document.getElementById('reportResultsContainer');
    const reportTitleEl = document.getElementById('activeReportTitle');
    if (!container) return;

    const schoolId = Schools.activeSchoolId;
    if (!schoolId) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="icon-school"></i></div>
          <h3>No School Selected</h3>
          <p>Please select a school to generate reports.</p>
        </div>
      `;
      return;
    }

    const type = this.currentReportType;
    const month = this.filterMonth;
    const year = Number(this.filterYear);
    const empId = this.filterEmployeeId;
    const status = this.filterStatus;

    const school = await DB.getById('schools', schoolId);
    const allEmployees = await DB.getAll('employees');
    const schoolEmployees = allEmployees.filter(e => e.schoolId === schoolId);

    const allSalaries = await DB.getAll('salary_records');
    const schoolSalaries = allSalaries.filter(s => s.schoolId === schoolId);

    const allAttendance = await DB.getAll('attendance');
    const schoolAttendance = allAttendance.filter(a => a.schoolId === schoolId);

    let html = '';
    let reportData = [];
    let headers = [];

    if (type === 'monthly_salary' || type === 'pending_salary' || type === 'paid_salary') {
      let filtered = schoolSalaries.filter(s => s.year === year);
      if (month !== 'all') filtered = filtered.filter(s => s.month === Number(month));
      if (empId !== 'all') filtered = filtered.filter(s => s.employeeId === empId);

      if (type === 'pending_salary') filtered = filtered.filter(s => s.paymentStatus !== 'Paid');
      if (type === 'paid_salary') filtered = filtered.filter(s => s.paymentStatus === 'Paid');

      reportData = filtered;
      this.lastRenderedData = filtered;

      headers = [
        { label: 'Employee Name', key: 'employeeName' },
        { label: 'Employee ID', key: 'employeeCode' },
        { label: 'Designation', key: 'designation' },
        { label: 'Month', key: 'month' },
        { label: 'Year', key: 'year' },
        { label: 'Basic Salary', key: 'basicSalary' },
        { label: 'Unpaid Days', key: 'totalUnpaidDays' },
        { label: 'Total Deductions', key: 'totalDeductions' },
        { label: 'Net Salary', key: 'netSalary' },
        { label: 'Payment Status', key: 'paymentStatus' },
        { label: 'Payment Date', key: 'paymentDate' }
      ];

      const totalDisbursed = filtered.reduce((acc, c) => acc + c.netSalary, 0);

      html = `
        <div class="report-header mb-3 pb-2 border-bottom flex-between">
          <div>
            <h3 class="font-bold">${type === 'pending_salary' ? 'Pending Salary Disbursement Report' : type === 'paid_salary' ? 'Disbursed Paid Salary Report' : 'Monthly Payroll Summary Report'}</h3>
            <div class="text-sm text-muted">${school ? school.name : ''} • Period: ${month === 'all' ? 'All Months' : Utils.getMonthName(month)} ${year}</div>
          </div>
          <div class="text-right">
            <span class="badge badge-accent text-sm">Total Records: ${filtered.length}</span>
            <div class="font-bold text-success text-base mt-1">Total Net: ${Utils.formatCurrency(totalDisbursed)}</div>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Period</th>
                <th>Basic</th>
                <th>Unpaid Days</th>
                <th>Deductions</th>
                <th>Net Salary</th>
                <th>Status</th>
                <th>Date Paid</th>
              </tr>
            </thead>
            <tbody>
      `;

      if (filtered.length === 0) {
        html += `<tr><td colspan="8" class="text-center py-4 text-muted">No records found matching filters.</td></tr>`;
      } else {
        filtered.forEach(r => {
          html += `
            <tr>
              <td>
                <strong>${Utils.escapeHtml(r.employeeName)}</strong>
                <div class="text-xs text-muted font-mono">${Utils.escapeHtml(r.employeeCode)} • ${Utils.escapeHtml(r.designation)}</div>
              </td>
              <td>${Utils.getMonthName(r.month)} ${r.year}</td>
              <td>${Utils.formatCurrency(r.basicSalary)}</td>
              <td><span class="badge ${r.totalUnpaidDays > 0 ? 'badge-danger' : 'badge-neutral'}">${r.totalUnpaidDays}</span></td>
              <td class="text-danger">- ${Utils.formatCurrency(r.totalDeductions)}</td>
              <td class="font-bold text-success">${Utils.formatCurrency(r.netSalary)}</td>
              <td><span class="badge ${r.paymentStatus === 'Paid' ? 'badge-success' : 'badge-warning'}">${r.paymentStatus}</span></td>
              <td>${r.paymentDate ? Utils.formatDate(r.paymentDate) : '-'}</td>
            </tr>
          `;
        });
      }

      html += `
            </tbody>
          </table>
        </div>
      `;
    } else if (type === 'attendance_summary') {
      let filteredAtt = schoolAttendance.filter(a => a.year === year);
      if (month !== 'all') filteredAtt = filteredAtt.filter(a => a.month === Number(month));

      const rows = [];
      filteredAtt.forEach(att => {
        const emp = schoolEmployees.find(e => e.id === att.employeeId);
        if (!emp) return;
        if (empId !== 'all' && emp.id !== empId) return;

        const stats = Attendance.computeAttendanceStats(att.days || {}, att.year, att.month);
        rows.push({
          employeeName: emp.name,
          employeeCode: emp.employeeId,
          designation: emp.designation,
          month: Utils.getMonthName(att.month),
          year: att.year,
          present: stats.present,
          absent: stats.absent,
          leave: stats.leave,
          halfDay: stats.halfDay,
          sundays: stats.sundays
        });
      });

      this.lastRenderedData = rows;
      headers = [
        { label: 'Employee Name', key: 'employeeName' },
        { label: 'ID', key: 'employeeCode' },
        { label: 'Month', key: 'month' },
        { label: 'Year', key: 'year' },
        { label: 'Present Days', key: 'present' },
        { label: 'Absent Days', key: 'absent' },
        { label: 'Leave Days', key: 'leave' },
        { label: 'Half Days', key: 'halfDay' },
        { label: 'Sundays (Paid)', key: 'sundays' }
      ];

      html = `
        <div class="report-header mb-3 pb-2 border-bottom flex-between">
          <div>
            <h3 class="font-bold">Monthly Staff Attendance Audit Report</h3>
            <div class="text-sm text-muted">${school ? school.name : ''} • Period: ${month === 'all' ? 'All Months' : Utils.getMonthName(month)} ${year}</div>
          </div>
          <span class="badge badge-primary text-sm">${rows.length} Records</span>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Month/Year</th>
                <th class="text-center text-success">Present (P)</th>
                <th class="text-center text-danger">Absent (A)</th>
                <th class="text-center text-info">Leave (L)</th>
                <th class="text-center text-warning">Half Day (H)</th>
                <th class="text-center">Sundays</th>
              </tr>
            </thead>
            <tbody>
      `;

      if (rows.length === 0) {
        html += `<tr><td colspan="7" class="text-center py-4 text-muted">No attendance logs found for this period.</td></tr>`;
      } else {
        rows.forEach(r => {
          html += `
            <tr>
              <td>
                <strong>${Utils.escapeHtml(r.employeeName)}</strong>
                <div class="text-xs text-muted font-mono">${Utils.escapeHtml(r.employeeCode)} • ${Utils.escapeHtml(r.designation)}</div>
              </td>
              <td>${r.month} ${r.year}</td>
              <td class="text-center font-bold text-success">${r.present}</td>
              <td class="text-center font-bold text-danger">${r.absent}</td>
              <td class="text-center font-bold text-info">${r.leave}</td>
              <td class="text-center font-bold text-warning">${r.halfDay}</td>
              <td class="text-center font-medium">${r.sundays}</td>
            </tr>
          `;
        });
      }

      html += `
            </tbody>
          </table>
        </div>
      `;
    } else if (type === 'increment_report') {
      const settings = await Settings.getSalarySettings(schoolId);
      const rows = schoolEmployees.map(emp => {
        const inc = Salary.calculateIncrement(emp, settings, year, month === 'all' ? 4 : Number(month));
        const effective = emp.monthlySalary + inc;
        return {
          name: emp.name,
          employeeId: emp.employeeId,
          designation: emp.designation,
          joiningDate: emp.joiningDate,
          baseSalary: emp.monthlySalary,
          increment: inc,
          effectiveSalary: effective
        };
      });

      this.lastRenderedData = rows;
      headers = [
        { label: 'Employee Name', key: 'name' },
        { label: 'ID', key: 'employeeId' },
        { label: 'Designation', key: 'designation' },
        { label: 'Joining Date', key: 'joiningDate' },
        { label: 'Base Salary', key: 'baseSalary' },
        { label: 'Annual Increment', key: 'increment' },
        { label: 'Revised Salary', key: 'effectiveSalary' }
      ];

      html = `
        <div class="report-header mb-3 pb-2 border-bottom flex-between">
          <div>
            <h3 class="font-bold">Staff Annual Salary Increment Projections</h3>
            <div class="text-sm text-muted">${school ? school.name : ''} • Policy: ${settings.annualIncrementType === 'flat' ? `₹${settings.annualIncrementValue} / year` : `${settings.annualIncrementValue}% / year`}</div>
          </div>
          <span class="badge badge-accent text-sm">${rows.length} Staff Members</span>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Joining Date</th>
                <th>Base Salary</th>
                <th>Annual Increment</th>
                <th>Revised Salary</th>
              </tr>
            </thead>
            <tbody>
      `;

      rows.forEach(r => {
        html += `
          <tr>
            <td>
              <strong>${Utils.escapeHtml(r.name)}</strong>
              <div class="text-xs text-muted font-mono">${Utils.escapeHtml(r.employeeId)} • ${Utils.escapeHtml(r.designation)}</div>
            </td>
            <td>${Utils.formatDate(r.joiningDate)}</td>
            <td>${Utils.formatCurrency(r.baseSalary)}</td>
            <td class="text-success font-bold">+ ${Utils.formatCurrency(r.increment)}</td>
            <td class="text-primary font-bold">${Utils.formatCurrency(r.effectiveSalary)}</td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;
    }

    container.innerHTML = html;
  },

  exportCsv() {
    if (!this.lastRenderedData || this.lastRenderedData.length === 0) {
      App.showToast('No data available to export', 'warning');
      return;
    }

    const first = this.lastRenderedData[0];
    const headers = Object.keys(first).map(k => ({ label: k.toUpperCase(), key: k }));
    const csv = Utils.arrayToCsv(headers, this.lastRenderedData);
    Utils.downloadFile(csv, `Salary_Report_${this.currentReportType}_${Date.now()}.csv`, 'text/csv');
    App.showToast('CSV Report Downloaded', 'success');
  },

  exportJson() {
    if (!this.lastRenderedData || this.lastRenderedData.length === 0) {
      App.showToast('No data available to export', 'warning');
      return;
    }

    const json = JSON.stringify(this.lastRenderedData, null, 2);
    Utils.downloadFile(json, `Salary_Report_${this.currentReportType}_${Date.now()}.json`, 'application/json');
    App.showToast('JSON Report Downloaded', 'success');
  },

  printReport() {
    if (window.Android && typeof window.Android.printPage === 'function') {
      window.Android.printPage();
    } else {
      window.print();
    }
  }
};
