// salary.js - Salary Calculation Engine & Payroll Processing for SALARY Powered by SHIV COMPUTER

const Salary = {
  selectedMonth: new Date().getMonth() + 1,
  selectedYear: new Date().getFullYear(),
  currentFilterStatus: 'all',

  async init() {
    this.selectedMonth = new Date().getMonth() + 1;
    this.selectedYear = new Date().getFullYear();
    this.populateSelectors();
  },

  populateSelectors() {
    const monthSelect = document.getElementById('salaryMonthSelect');
    const yearSelect = document.getElementById('salaryYearSelect');
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

  getRecordId(schoolId, employeeId, year, month) {
    return `sal_${schoolId}_${employeeId}_${year}_${month}`;
  },

  async getMonthSalaries(schoolId, year, month) {
    const all = await DB.getAll('salary_records');
    return all.filter(s => s.schoolId === schoolId && s.year === Number(year) && s.month === Number(month));
  },

  // Calculate annual increment on basic salary if applicable
  calculateIncrement(employee, settings, year, month) {
    if (!employee.joiningDate) return 0;
    const joinDate = new Date(employee.joiningDate);
    if (isNaN(joinDate.getTime())) return 0;

    // Effective increment cycle month (default April)
    const effMonth = settings.incrementEffectiveMonth || 4;
    const currentPeriod = new Date(year, month - 1, 1);
    
    // Years of completed service
    let years = year - joinDate.getFullYear();
    if (month < joinDate.getMonth() + 1) {
      years--;
    }

    if (years <= 0) return 0;

    let inc = 0;
    if (settings.annualIncrementType === 'percent') {
      inc = (employee.monthlySalary * (settings.annualIncrementValue / 100)) * years;
    } else {
      inc = settings.annualIncrementValue * years;
    }
    return Math.round(inc);
  },

  /**
   * CORE SALARY CALCULATION ENGINE
   * Respects strict user constraints:
   * 1. Fixed 30-day calculation basis (default 30 days)
   * 2. Daily Salary = Basic / 30
   * 3. Sunday is ALWAYS PAID (never deducted)
   * 4. One Absent OR one Leave in a month is PAID (paidFirstAbsentLeaveCount = 1)
   * 5. If Absent/Leave count > 1, only additional excess days are deducted
   * 6. Half Day = 0.5 day deduction
   * 7. Present = no deduction
   */
  calculateEmployeeSalary(employee, attendanceRecord, settings, year, month, overrides = {}) {
    const basis = Number(settings.calculationBasis) || 30;
    const paidAllowance = Number(settings.paidFirstAbsentLeaveCount) || 0;
    const halfFactor = Number(settings.halfDayFactor) !== undefined ? Number(settings.halfDayFactor) : 0.5;

    // Compute basic salary with increment if applicable
    const increment = this.calculateIncrement(employee, settings, year, month);
    const effectiveBasic = Number(employee.monthlySalary) + increment;

    // Daily salary based on fixed 30 days
    const dailyRate = effectiveBasic / basis;

    // Attendance stats
    const daysMap = attendanceRecord && attendanceRecord.days ? attendanceRecord.days : {};
    const attStats = Attendance.computeAttendanceStats(daysMap, year, month);

    const totalAbsent = attStats.absent;
    const totalLeave = attStats.leave;
    const totalPresent = attStats.present;
    const totalHalfDay = attStats.halfDay;
    const totalSundays = attStats.sundays;

    // Absent + Leave combined
    const totalAbsentLeave = totalAbsent + totalLeave;

    // First X Absent/Leave is PAID
    const paidAbsentLeaveDays = Math.min(totalAbsentLeave, paidAllowance);
    const unpaidAbsentLeaveDays = Math.max(0, totalAbsentLeave - paidAllowance);

    // Half Day Unpaid Days
    const unpaidHalfDays = totalHalfDay * halfFactor;

    // Total Unpaid Days
    const totalUnpaidDays = unpaidAbsentLeaveDays + unpaidHalfDays;

    // Attendance Deduction Amount
    const attendanceDeduction = totalUnpaidDays * dailyRate;

    // Overrides (Bonus, Allowance, Other Deductions)
    const bonus = Number(overrides.bonus !== undefined ? overrides.bonus : (settings.defaultBonus || 0));
    const allowance = Number(overrides.allowance !== undefined ? overrides.allowance : (settings.defaultAllowance || 0));
    const otherDeduction = Number(overrides.otherDeduction !== undefined ? overrides.otherDeduction : (settings.defaultOtherDeduction || 0));

    // Gross and Net
    const totalDeductions = attendanceDeduction + otherDeduction;
    const grossSalary = effectiveBasic + allowance + bonus;
    let netSalary = grossSalary - totalDeductions;

    // Rounding rule
    if (settings.roundingRule === 'floor') netSalary = Math.floor(netSalary);
    else if (settings.roundingRule === 'ceil') netSalary = Math.ceil(netSalary);
    else netSalary = Math.round(netSalary);

    if (netSalary < 0) netSalary = 0;

    return {
      basicSalary: effectiveBasic,
      baseBasicWithoutIncrement: employee.monthlySalary,
      annualIncrementApplied: increment,
      calculationBasis: basis,
      dailyRate: Math.round(dailyRate * 100) / 100,
      totalPresent,
      totalSundays,
      totalAbsent,
      totalLeave,
      totalHalfDay,
      paidAbsentLeaveDays,
      unpaidAbsentLeaveDays,
      unpaidHalfDays,
      totalUnpaidDays: Math.round(totalUnpaidDays * 100) / 100,
      attendanceDeduction: Math.round(attendanceDeduction),
      otherDeduction,
      allowance,
      bonus,
      grossSalary: Math.round(grossSalary),
      totalDeductions: Math.round(totalDeductions),
      netSalary
    };
  },

  // Automatically generate/refresh monthly salaries for active school
  async generateMonthlySalaries() {
    const schoolId = Schools.activeSchoolId;
    if (!schoolId) {
      App.showToast('Please select a school first', 'warning');
      return;
    }

    const employees = await Employees.getForActiveSchool();
    const activeEmps = employees.filter(e => e.status === 'Active');

    if (activeEmps.length === 0) {
      App.showToast('No active employees found to calculate salary', 'warning');
      return;
    }

    const year = Number(this.selectedYear);
    const month = Number(this.selectedMonth);
    const settings = await Settings.getSalarySettings(schoolId);

    let count = 0;
    for (const emp of activeEmps) {
      const attRecord = await Attendance.getEmployeeMonthAttendance(schoolId, emp.id, year, month);
      const existingSalary = await DB.getById('salary_records', this.getRecordId(schoolId, emp.id, year, month));

      // Retain existing payment status and remarks if already marked paid
      const overrides = existingSalary ? {
        bonus: existingSalary.bonus,
        allowance: existingSalary.allowance,
        otherDeduction: existingSalary.otherDeduction
      } : {};

      const calc = this.calculateEmployeeSalary(emp, attRecord, settings, year, month, overrides);

      const salaryRecord = {
        id: this.getRecordId(schoolId, emp.id, year, month),
        schoolId,
        employeeId: emp.id,
        year,
        month,
        employeeName: emp.name,
        employeeCode: emp.employeeId,
        designation: emp.designation,
        department: emp.department,
        joiningDate: emp.joiningDate,
        mobile: emp.mobile,
        bankName: emp.bankName,
        accountNumber: emp.accountNumber,
        ifscCode: emp.ifscCode,
        photo: emp.photo,
        ...calc,
        paymentStatus: existingSalary ? existingSalary.paymentStatus : 'Pending',
        paymentDate: existingSalary ? existingSalary.paymentDate : null,
        paymentMode: existingSalary ? existingSalary.paymentMode : null,
        paymentRemarks: existingSalary ? existingSalary.paymentRemarks : null,
        updatedAt: new Date().toISOString()
      };

      await DB.put('salary_records', salaryRecord);
      count++;
    }

    await Audit.log('Salary Generated', 'Salary', `Generated payroll for ${count} employees for ${Utils.getMonthName(month)} ${year}`);
    App.showToast(`Successfully processed payroll for ${count} staff members`, 'success');
    this.render();
  },

  async markAsPaid(recordId) {
    const record = await DB.getById('salary_records', recordId);
    if (!record) return;

    const modal = document.getElementById('paymentModal');
    const form = document.getElementById('paymentForm');
    if (!modal || !form) return;

    form.recordId.value = record.id;
    form.empName.value = `${record.employeeName} (${record.employeeCode})`;
    form.amount.value = Utils.formatCurrency(record.netSalary);
    form.paymentDate.value = new Date().toISOString().split('T')[0];
    form.paymentMode.value = 'Bank Transfer';
    form.remarks.value = '';

    modal.classList.add('active');
  },

  async handleSavePayment() {
    const form = document.getElementById('paymentForm');
    const recordId = form.recordId.value;
    const record = await DB.getById('salary_records', recordId);
    if (!record) return;

    record.paymentStatus = 'Paid';
    record.paymentDate = form.paymentDate.value;
    record.paymentMode = form.paymentMode.value;
    record.paymentRemarks = form.remarks.value.trim();
    record.updatedAt = new Date().toISOString();

    await DB.put('salary_records', record);
    await Audit.log('Salary Paid', 'Salary', `Marked ${record.employeeName}'s salary of ₹${record.netSalary} as Paid via ${record.paymentMode}`);
    
    document.getElementById('paymentModal').classList.remove('active');
    App.showToast(`Marked as Paid for ${record.employeeName}`, 'success');
    this.render();
  },

  async markBulkAsPaid() {
    const schoolId = Schools.activeSchoolId;
    if (!schoolId) return;

    const salaries = await this.getMonthSalaries(schoolId, this.selectedYear, this.selectedMonth);
    const pending = salaries.filter(s => s.paymentStatus !== 'Paid');

    if (pending.length === 0) {
      App.showToast('No pending salaries for this month', 'info');
      return;
    }

    const verified = await Auth.promptPassword(`Mark all ${pending.length} pending salaries as PAID`);
    if (!verified) return;

    const today = new Date().toISOString().split('T')[0];
    for (const sal of pending) {
      sal.paymentStatus = 'Paid';
      sal.paymentDate = today;
      sal.paymentMode = 'Bulk Bank Transfer';
      sal.updatedAt = new Date().toISOString();
      await DB.put('salary_records', sal);
    }

    await Audit.log('Bulk Salary Paid', 'Salary', `Marked all ${pending.length} salaries as Paid for ${this.selectedMonth}/${this.selectedYear}`);
    App.showToast(`Marked ${pending.length} salaries as Paid!`, 'success');
    this.render();
  },

  async openAdjustModal(recordId) {
    const record = await DB.getById('salary_records', recordId);
    if (!record) return;

    const modal = document.getElementById('adjustSalaryModal');
    const form = document.getElementById('adjustSalaryForm');
    if (!modal || !form) return;

    form.recordId.value = record.id;
    form.empName.value = `${record.employeeName} (${record.employeeCode})`;
    form.bonus.value = record.bonus || 0;
    form.allowance.value = record.allowance || 0;
    form.otherDeduction.value = record.otherDeduction || 0;

    modal.classList.add('active');
  },

  async handleSaveAdjustment() {
    const form = document.getElementById('adjustSalaryForm');
    const recordId = form.recordId.value;
    const record = await DB.getById('salary_records', recordId);
    if (!record) return;

    const bonus = Number(form.bonus.value) || 0;
    const allowance = Number(form.allowance.value) || 0;
    const otherDeduction = Number(form.otherDeduction.value) || 0;

    record.bonus = bonus;
    record.allowance = allowance;
    record.otherDeduction = otherDeduction;

    // Recalculate
    record.grossSalary = record.basicSalary + allowance + bonus;
    record.totalDeductions = record.attendanceDeduction + otherDeduction;
    record.netSalary = Math.max(0, Math.round(record.grossSalary - record.totalDeductions));
    record.updatedAt = new Date().toISOString();

    await DB.put('salary_records', record);
    await Audit.log('Salary Adjusted', 'Salary', `Updated bonus/deduction for ${record.employeeName}`);

    document.getElementById('adjustSalaryModal').classList.remove('active');
    App.showToast('Salary adjusted and updated', 'success');
    this.render();
  },

  // Formula Breakdown Details Modal
  async showCalculationFormula(recordId) {
    const record = await DB.getById('salary_records', recordId);
    if (!record) return;

    const modal = document.getElementById('salaryFormulaModal');
    const content = document.getElementById('salaryFormulaContent');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="card-banner mb-3 text-center">
        <h3 class="font-bold">${Utils.escapeHtml(record.employeeName)}</h3>
        <p class="text-sm text-accent">${Utils.escapeHtml(record.designation)} • ${Utils.getMonthName(record.month)} ${record.year}</p>
      </div>

      <div class="salary-calc-box p-3 bg-neutral-light rounded mb-3">
        <h4 class="font-bold text-sm mb-2 text-primary"><i class="icon-info"></i> Transparent Formula Specification</h4>
        <div class="text-sm space-y-1">
          <div>• <strong>Calculation Basis:</strong> Fixed ${record.calculationBasis} Days Basis</div>
          <div>• <strong>Daily Rate:</strong> ₹${record.basicSalary.toLocaleString()} ÷ ${record.calculationBasis} = <strong>₹${record.dailyRate} / day</strong></div>
          <div>• <strong>Sundays:</strong> ${record.totalSundays} Days (Always 100% Paid)</div>
          <div>• <strong>Attendance Recorded:</strong> ${record.totalPresent} Present, ${record.totalAbsent} Absent, ${record.totalLeave} Leave, ${record.totalHalfDay} Half Day</div>
          <div>• <strong>Paid First Absent/Leave Allowance:</strong> ${record.paidAbsentLeaveDays} Day(s) Paid</div>
          <div>• <strong>Excess Unpaid Absent/Leave:</strong> ${record.unpaidAbsentLeaveDays} Day(s)</div>
          <div>• <strong>Half-Day Deduction:</strong> ${record.totalHalfDay} × 0.5 = ${record.unpaidHalfDays} Day(s)</div>
          <div>• <strong>Total Unpaid Days:</strong> ${record.totalUnpaidDays} Days</div>
          <div class="font-bold text-danger">• <strong>Attendance Deduction:</strong> ${record.totalUnpaidDays} × ₹${record.dailyRate} = ₹${record.attendanceDeduction.toLocaleString()}</div>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Component</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic Salary ${record.annualIncrementApplied ? `<span class="text-xs text-success">(Incl. ₹${record.annualIncrementApplied} Annual Increment)</span>` : ''}</td>
              <td class="text-right font-bold text-success">${Utils.formatCurrency(record.basicSalary)}</td>
            </tr>
            <tr>
              <td>Additional Allowances</td>
              <td class="text-right font-medium text-success">+ ${Utils.formatCurrency(record.allowance)}</td>
            </tr>
            <tr>
              <td>Bonus / Incentives</td>
              <td class="text-right font-medium text-success">+ ${Utils.formatCurrency(record.bonus)}</td>
            </tr>
            <tr class="table-active">
              <td><strong>Gross Earnings</strong></td>
              <td class="text-right font-bold text-success">${Utils.formatCurrency(record.grossSalary)}</td>
            </tr>
            <tr>
              <td>Attendance Deductions (${record.totalUnpaidDays} unpaid days)</td>
              <td class="text-right font-medium text-danger">- ${Utils.formatCurrency(record.attendanceDeduction)}</td>
            </tr>
            <tr>
              <td>Other Deductions / Advance</td>
              <td class="text-right font-medium text-danger">- ${Utils.formatCurrency(record.otherDeduction)}</td>
            </tr>
            <tr class="table-highlight">
              <td><strong>Net Disbursable Salary</strong></td>
              <td class="text-right font-bold text-primary text-lg">${Utils.formatCurrency(record.netSalary)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-3 text-center text-xs text-muted">
        In Words: <strong>${Utils.numberToWords(record.netSalary)}</strong>
      </div>
    `;

    modal.classList.add('active');
  },

  async render() {
    const container = document.getElementById('salaryContainer');
    if (!container) return;

    const schoolId = Schools.activeSchoolId;
    if (!schoolId) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="icon-school"></i></div>
          <h3>No School Selected</h3>
          <p>Please select a school to process payroll.</p>
        </div>
      `;
      return;
    }

    const year = Number(this.selectedYear);
    const month = Number(this.selectedMonth);
    const salaries = await this.getMonthSalaries(schoolId, year, month);

    let filtered = salaries;
    if (this.currentFilterStatus === 'paid') filtered = salaries.filter(s => s.paymentStatus === 'Paid');
    if (this.currentFilterStatus === 'pending') filtered = salaries.filter(s => s.paymentStatus !== 'Paid');

    const totalSalarySum = salaries.reduce((acc, c) => acc + c.netSalary, 0);
    const paidSum = salaries.filter(s => s.paymentStatus === 'Paid').reduce((acc, c) => acc + c.netSalary, 0);
    const pendingSum = totalSalarySum - paidSum;

    let html = `
      <!-- Salary KPI Overview Cards -->
      <div class="stats-grid mb-3">
        <div class="stat-card">
          <div class="stat-icon bg-primary-light"><i class="icon-dollar-sign text-primary"></i></div>
          <div class="stat-content">
            <span class="stat-label">Total Payroll (${Utils.getMonthName(month)} ${year})</span>
            <h3 class="stat-value text-primary">${Utils.formatCurrency(totalSalarySum)}</h3>
            <span class="stat-subtext">${salaries.length} Staff Slips Generated</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon bg-success-light"><i class="icon-check-circle text-success"></i></div>
          <div class="stat-content">
            <span class="stat-label">Paid Amount</span>
            <h3 class="stat-value text-success">${Utils.formatCurrency(paidSum)}</h3>
            <span class="stat-subtext">${salaries.filter(s => s.paymentStatus === 'Paid').length} Paid Records</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon bg-warning-light"><i class="icon-clock text-warning"></i></div>
          <div class="stat-content">
            <span class="stat-label">Pending Disbursement</span>
            <h3 class="stat-value text-warning">${Utils.formatCurrency(pendingSum)}</h3>
            <span class="stat-subtext">${salaries.filter(s => s.paymentStatus !== 'Paid').length} Pending Slips</span>
          </div>
        </div>
      </div>

      <!-- Action Toolbar -->
      <div class="card mb-3">
        <div class="flex-between flex-wrap gap-2">
          <div class="flex-align gap-2">
            <button class="btn btn-primary" onclick="Salary.generateMonthlySalaries()"><i class="icon-refresh-cw"></i> Calculate & Generate Payroll</button>
            <button class="btn btn-success" onclick="Salary.markBulkAsPaid()"><i class="icon-check-all"></i> Mark All as Paid</button>
          </div>
          <div class="flex-align gap-2">
            <span class="text-sm font-semibold">Filter:</span>
            <select class="form-control form-control-sm" onchange="Salary.currentFilterStatus = this.value; Salary.render();" style="width: auto;">
              <option value="all" ${this.currentFilterStatus === 'all' ? 'selected' : ''}>All Records (${salaries.length})</option>
              <option value="pending" ${this.currentFilterStatus === 'pending' ? 'selected' : ''}>Pending Only (${salaries.filter(s => s.paymentStatus !== 'Paid').length})</option>
              <option value="paid" ${this.currentFilterStatus === 'paid' ? 'selected' : ''}>Paid Only (${salaries.filter(s => s.paymentStatus === 'Paid').length})</option>
            </select>
          </div>
        </div>
      </div>
    `;

    if (salaries.length === 0) {
      html += `
        <div class="empty-state card">
          <div class="empty-icon"><i class="icon-file-text"></i></div>
          <h3>No Payroll Records Generated</h3>
          <p>Click "Calculate & Generate Payroll" above to automatically calculate salaries for all active staff based on attendance and salary policies.</p>
          <button class="btn btn-primary mt-2" onclick="Salary.generateMonthlySalaries()"><i class="icon-play"></i> Generate Now</button>
        </div>
      `;
      container.innerHTML = html;
      return;
    }

    // Table view
    html += `
      <div class="card table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Basic Salary</th>
                <th class="text-center">Attn (P/A/H/L)</th>
                <th class="text-center">Unpaid Days</th>
                <th>Deductions</th>
                <th>Net Salary</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
    `;

    filtered.forEach(s => {
      const isPaid = s.paymentStatus === 'Paid';
      html += `
        <tr>
          <td>
            <div class="font-bold">${Utils.escapeHtml(s.employeeName)}</div>
            <div class="text-xs text-muted font-mono">${Utils.escapeHtml(s.employeeCode)} • ${Utils.escapeHtml(s.designation)}</div>
          </td>
          <td>
            <span class="font-bold">${Utils.formatCurrency(s.basicSalary)}</span>
            <div class="text-xs text-muted">₹${s.dailyRate}/day</div>
          </td>
          <td class="text-center">
            <span class="text-success font-bold" title="Present">${s.totalPresent}</span> /
            <span class="text-danger font-bold" title="Absent">${s.totalAbsent}</span> /
            <span class="text-warning font-bold" title="Half Day">${s.totalHalfDay}</span> /
            <span class="text-info font-bold" title="Leave">${s.totalLeave}</span>
          </td>
          <td class="text-center">
            <button class="badge ${s.totalUnpaidDays > 0 ? 'badge-danger' : 'badge-neutral'} cursor-pointer" onclick="Salary.showCalculationFormula('${s.id}')" title="Click to view full transparent formula">
              ${s.totalUnpaidDays} Days
            </button>
          </td>
          <td>
            <span class="text-danger font-medium">- ${Utils.formatCurrency(s.totalDeductions)}</span>
            ${s.otherDeduction > 0 ? `<div class="text-xs text-muted">Other: -${Utils.formatCurrency(s.otherDeduction)}</div>` : ''}
          </td>
          <td>
            <span class="font-bold text-success text-base">${Utils.formatCurrency(s.netSalary)}</span>
          </td>
          <td>
            <span class="badge ${isPaid ? 'badge-success' : 'badge-warning'}">
              ${isPaid ? `<i class="icon-check"></i> Paid` : 'Pending'}
            </span>
          </td>
          <td class="text-right">
            <div class="btn-group">
              <button class="btn btn-xs btn-outline" onclick="Salary.showCalculationFormula('${s.id}')" title="View Formula Breakdown"><i class="icon-info"></i></button>
              <button class="btn btn-xs btn-secondary" onclick="Salary.openAdjustModal('${s.id}')" title="Adjust Bonus/Deduction"><i class="icon-sliders"></i></button>
              <button class="btn btn-xs btn-primary" onclick="Payslip.openPayslip('${s.id}')" title="Print/View Payslip"><i class="icon-file-text"></i> Slip</button>
              ${!isPaid ? `<button class="btn btn-xs btn-success" onclick="Salary.markAsPaid('${s.id}')" title="Mark Paid"><i class="icon-check"></i> Pay</button>` : ''}
            </div>
          </td>
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
  }
};
