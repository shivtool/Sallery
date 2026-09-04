// payslip.js - Professional Payslip Generation & Sharing for SALARY Powered by SHIV COMPUTER

const Payslip = {
  currentRecord: null,

  async openPayslip(recordId) {
    const record = await DB.getById('salary_records', recordId);
    if (!record) return;

    this.currentRecord = record;
    const school = await DB.getById('schools', record.schoolId);
    const modal = document.getElementById('payslipModal');
    const container = document.getElementById('payslipSheetContainer');
    if (!modal || !container) return;

    container.innerHTML = this.generatePayslipHtml(record, school);
    modal.classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('payslipModal');
    if (modal) modal.classList.remove('active');
  },

  generatePayslipHtml(record, school) {
    const isPaid = record.paymentStatus === 'Paid';
    const amountInWords = Utils.numberToWords(record.netSalary);

    return `
      <div class="payslip-sheet" id="printablePayslipSheet">
        <!-- School Header -->
        <div class="payslip-header flex-between border-bottom pb-3">
          <div class="school-brand-block flex-align gap-3">
            <div class="payslip-logo">
              ${school && school.logo ? `<img src="${school.logo}" alt="Logo" />` : `<div class="payslip-logo-fallback">${school ? school.name.charAt(0) : 'S'}</div>`}
            </div>
            <div>
              <h1 class="payslip-school-name">${Utils.escapeHtml(school ? school.name : 'INSTITUTION NAME')}</h1>
              <div class="payslip-school-code">Reg. Code: ${Utils.escapeHtml(school ? school.code : 'CODE')}</div>
              <div class="payslip-school-address">${Utils.escapeHtml(school ? school.address : 'Address')}</div>
              <div class="payslip-school-contact">Phone: ${Utils.escapeHtml(school ? school.mobile : '-')} | Email: ${Utils.escapeHtml(school ? school.email : '-')}</div>
            </div>
          </div>
          <div class="payslip-doc-meta text-right">
            <div class="payslip-badge-title">SALARY PAYSLIP</div>
            <div class="payslip-period font-bold">${Utils.getMonthName(record.month).toUpperCase()} ${record.year}</div>
            <div class="payslip-slip-no text-xs text-muted">Slip Ref: ${record.id}</div>
          </div>
        </div>

        <!-- Employee Info Bar -->
        <div class="payslip-employee-bar flex-between py-3 border-bottom">
          <div class="employee-meta-left flex-align gap-3">
            <div class="payslip-emp-photo">
              ${record.photo ? `<img src="${record.photo}" alt="Photo" />` : `<div class="emp-photo-placeholder">${record.employeeName.charAt(0)}</div>`}
            </div>
            <div>
              <h2 class="font-bold text-lg payslip-emp-name">${Utils.escapeHtml(record.employeeName)}</h2>
              <div class="text-sm font-medium text-muted">${Utils.escapeHtml(record.designation)} • Dept: ${Utils.escapeHtml(record.department || 'General')}</div>
              <div class="text-xs text-muted font-mono">Employee ID: <strong>${Utils.escapeHtml(record.employeeCode)}</strong></div>
            </div>
          </div>
          <div class="employee-meta-right text-right text-sm space-y-1">
            <div>Joining Date: <strong>${Utils.formatDate(record.joiningDate)}</strong></div>
            <div>Bank: <strong>${Utils.escapeHtml(record.bankName || '-')}</strong></div>
            <div>A/C: <strong class="font-mono">${record.accountNumber ? Utils.maskAccount(record.accountNumber) : '-'}</strong></div>
            <div>Status: <span class="badge ${isPaid ? 'badge-success' : 'badge-warning'}">${record.paymentStatus}</span></div>
          </div>
        </div>

        <!-- Attendance Stats Pill Row -->
        <div class="payslip-att-summary my-3 p-2 bg-neutral-light rounded flex-between text-xs font-semibold">
          <span>Working Basis: <strong>${record.calculationBasis} Days</strong></span>
          <span>Daily Rate: <strong>₹${record.dailyRate}</strong></span>
          <span>Present: <strong class="text-success">${record.totalPresent}</strong></span>
          <span>Sundays (Paid): <strong>${record.totalSundays}</strong></span>
          <span>Absent: <strong class="text-danger">${record.totalAbsent}</strong></span>
          <span>Leave: <strong class="text-info">${record.totalLeave}</strong></span>
          <span>Half Day: <strong class="text-warning">${record.totalHalfDay}</strong></span>
          <span>Paid Allow: <strong class="text-success">${record.paidAbsentLeaveDays}</strong></span>
          <span>Unpaid: <strong class="text-danger">${record.totalUnpaidDays} Days</strong></span>
        </div>

        <!-- Salary Breakdown Grid -->
        <div class="payslip-table-grid">
          <!-- Earnings Column -->
          <div class="payslip-col">
            <div class="payslip-col-header bg-success-light text-success font-bold py-1 px-2 border-bottom">EARNINGS</div>
            <table class="payslip-subtable">
              <tr>
                <td>Basic Salary</td>
                <td class="text-right font-bold">${Utils.formatCurrency(record.basicSalary)}</td>
              </tr>
              ${record.annualIncrementApplied ? `
              <tr>
                <td>Annual Increment Included</td>
                <td class="text-right text-success">+ ${Utils.formatCurrency(record.annualIncrementApplied)}</td>
              </tr>` : ''}
              <tr>
                <td>Allowances</td>
                <td class="text-right">${Utils.formatCurrency(record.allowance)}</td>
              </tr>
              <tr>
                <td>Bonus / Incentives</td>
                <td class="text-right">${Utils.formatCurrency(record.bonus)}</td>
              </tr>
              <tr class="payslip-subtotal-row border-top">
                <td><strong>Gross Earnings</strong></td>
                <td class="text-right font-bold text-success">${Utils.formatCurrency(record.grossSalary)}</td>
              </tr>
            </table>
          </div>

          <!-- Deductions Column -->
          <div class="payslip-col border-left">
            <div class="payslip-col-header bg-danger-light text-danger font-bold py-1 px-2 border-bottom">DEDUCTIONS</div>
            <table class="payslip-subtable">
              <tr>
                <td>Attendance Deduction (${record.totalUnpaidDays} days)</td>
                <td class="text-right text-danger">${Utils.formatCurrency(record.attendanceDeduction)}</td>
              </tr>
              <tr>
                <td>Other Deductions / Advance</td>
                <td class="text-right text-danger">${Utils.formatCurrency(record.otherDeduction)}</td>
              </tr>
              <tr>
                <td>Tax / PF / TDS</td>
                <td class="text-right">₹ 0</td>
              </tr>
              <tr class="payslip-subtotal-row border-top">
                <td><strong>Total Deductions</strong></td>
                <td class="text-right font-bold text-danger">${Utils.formatCurrency(record.totalDeductions)}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Net Salary Box -->
        <div class="payslip-net-box my-3 p-3 flex-between rounded">
          <div>
            <div class="text-xs font-semibold text-muted text-uppercase">Net Disbursed Salary</div>
            <div class="text-xs font-medium text-muted mt-1">Amount in Words: <em>${amountInWords}</em></div>
          </div>
          <div class="text-right">
            <div class="payslip-net-val text-2xl font-bold text-primary">${Utils.formatCurrency(record.netSalary)}</div>
            ${isPaid && record.paymentDate ? `<div class="text-xs text-success font-medium">Disbursed on ${Utils.formatDate(record.paymentDate)} via ${record.paymentMode || 'Bank'}</div>` : ''}
          </div>
        </div>

        <!-- Signatures & Authority -->
        <div class="payslip-signatures flex-between pt-5 mt-4 border-top">
          <div class="sig-block text-center">
            <div class="sig-line"></div>
            <div class="text-xs font-bold mt-1">Employee Signature</div>
            <div class="text-xs text-muted">${Utils.escapeHtml(record.employeeName)}</div>
          </div>

          <div class="sig-block text-center">
            ${school && school.signature ? `<img src="${school.signature}" class="sig-img" alt="Principal Signature" />` : `<div class="sig-line"></div>`}
            <div class="text-xs font-bold mt-1">Authorized Signatory</div>
            <div class="text-xs text-muted">${Utils.escapeHtml(school ? (school.principal || 'Principal / Manager') : 'Principal')}</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="payslip-footer text-center pt-4 mt-3 border-top text-xs text-muted">
          <span>This is a computer-generated salary slip. Confidential.</span>
          <div class="font-semibold mt-1">Powered by SHIV COMPUTER</div>
        </div>
      </div>
    `;
  },

  // Print Payslip
  printPayslip() {
    if (window.Android && typeof window.Android.printPage === 'function') {
      window.Android.printPage();
    } else {
      window.print();
    }
  },

  // WhatsApp Sharing Workflow
  async shareWhatsApp() {
    if (!this.currentRecord) return;
    const rec = this.currentRecord;
    const school = await DB.getById('schools', rec.schoolId);
    const schoolName = school ? school.name : 'School';

    const message = 
`*SALARY PAYSLIP - ${schoolName}*
--------------------------------
Employee: *${rec.employeeName}* (${rec.employeeCode})
Month: *${Utils.getMonthName(rec.month)} ${rec.year}*
Basic Salary: ₹${rec.basicSalary.toLocaleString()}
Working Basis: ${rec.calculationBasis} Days
Present Days: ${rec.totalPresent}
Unpaid Days: ${rec.totalUnpaidDays}
Total Deductions: ₹${rec.totalDeductions.toLocaleString()}
--------------------------------
*NET SALARY: ₹${rec.netSalary.toLocaleString()}*
Status: *${rec.paymentStatus}*
--------------------------------
Powered by SHIV COMPUTER`;

    // 1. Try native Web Share API if supported
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Salary Payslip - ${rec.employeeName}`,
          text: message
        });
        App.showToast('Shared successfully!', 'success');
        return;
      } catch (err) {
        // User cancelled or fallback
      }
    }

    // 2. Fallback to WhatsApp URL
    let cleanMobile = (rec.mobile || '').replace(/[^0-9]/g, '');
    if (cleanMobile.length === 10) {
      cleanMobile = '91' + cleanMobile; // Prepend India country code
    }

    const waUrl = cleanMobile 
      ? `https://api.whatsapp.com/send?phone=${cleanMobile}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
  },

  // Download printable HTML as a standalone file / trigger print
  downloadPdf() {
    this.printPayslip();
  }
};
