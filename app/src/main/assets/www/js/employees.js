// employees.js - Employee / Teacher Management for SALARY Powered by SHIV COMPUTER

const Employees = {
  currentFilters: {
    search: '',
    department: 'all',
    designation: 'all',
    status: 'all',
    sortBy: 'name_asc'
  },

  async getForActiveSchool() {
    const schoolId = Schools.activeSchoolId;
    if (!schoolId) return [];
    const all = await DB.getAll('employees');
    return all.filter(e => e.schoolId === schoolId);
  },

  async generateNextEmployeeId() {
    const employees = await this.getForActiveSchool();
    const count = employees.length + 1;
    return `EMP-${String(count).padStart(3, '0')}`;
  },

  async saveEmployee(formData) {
    const schoolId = Schools.activeSchoolId;
    if (!schoolId) {
      throw new Error('Please select or add a school first.');
    }

    const isNew = !formData.id;
    const employees = await this.getForActiveSchool();

    // Validate duplicate employee ID
    const duplicate = employees.find(e => e.employeeId.toLowerCase() === formData.employeeId.trim().toLowerCase() && e.id !== formData.id);
    if (duplicate) {
      throw new Error(`Employee ID "${formData.employeeId}" already exists in this school.`);
    }

    const employee = {
      id: formData.id || Utils.uuid('emp'),
      schoolId: schoolId,
      employeeId: formData.employeeId.trim().toUpperCase(),
      name: formData.name.trim(),
      mobile: formData.mobile.trim(),
      address: formData.address.trim(),
      designation: formData.designation.trim(),
      department: formData.department.trim(),
      joiningDate: formData.joiningDate,
      monthlySalary: Number(formData.monthlySalary) || 0,
      photo: formData.photo || null,
      bankName: formData.bankName ? formData.bankName.trim() : '',
      accountNumber: formData.accountNumber ? formData.accountNumber.trim() : '',
      ifscCode: formData.ifscCode ? formData.ifscCode.trim().toUpperCase() : '',
      notes: formData.notes ? formData.notes.trim() : '',
      status: formData.status || 'Active',
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await DB.put('employees', employee);

    if (isNew) {
      await Audit.log('Employee Added', 'Employees', `Added ${employee.name} (${employee.employeeId}, ${employee.designation})`);
    } else {
      await Audit.log('Employee Updated', 'Employees', `Updated ${employee.name} (${employee.employeeId})`);
    }

    return employee;
  },

  async toggleStatus(id) {
    const emp = await DB.getById('employees', id);
    if (!emp) return;
    emp.status = emp.status === 'Active' ? 'Inactive' : 'Active';
    emp.updatedAt = new Date().toISOString();
    await DB.put('employees', emp);
    await Audit.log('Status Changed', 'Employees', `Changed ${emp.name} to ${emp.status}`);
    this.renderList();
    App.showToast(`${emp.name} is now ${emp.status}`, 'info');
  },

  async deleteEmployee(id) {
    const emp = await DB.getById('employees', id);
    if (!emp) return;

    const verified = await Auth.promptPassword(`Delete Employee: "${emp.name}" (${emp.employeeId})`);
    if (!verified) return false;

    // Delete employee attendance and salary records
    const attendance = await DB.getAll('attendance');
    for (const a of attendance.filter(att => att.employeeId === id)) {
      await DB.delete('attendance', a.id);
    }
    const salaries = await DB.getAll('salary_records');
    for (const s of salaries.filter(sal => sal.employeeId === id)) {
      await DB.delete('salary_records', s.id);
    }

    await DB.delete('employees', id);
    await Audit.log('Employee Deleted', 'Employees', `Deleted ${emp.name} (${emp.employeeId}) and associated records.`);
    App.showToast(`Deleted employee ${emp.name}`, 'info');
    this.renderList();
    return true;
  },

  filterAndSort(list) {
    const { search, department, designation, status, sortBy } = this.currentFilters;
    let res = list.filter(item => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || (
        item.name.toLowerCase().includes(q) ||
        item.employeeId.toLowerCase().includes(q) ||
        item.mobile.includes(q) ||
        item.designation.toLowerCase().includes(q)
      );

      const matchDept = department === 'all' || item.department === department;
      const matchDesig = designation === 'all' || item.designation === designation;
      const matchStatus = status === 'all' || item.status === status;

      return matchSearch && matchDept && matchDesig && matchStatus;
    });

    res.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'salary_desc') return b.monthlySalary - a.monthlySalary;
      if (sortBy === 'salary_asc') return a.monthlySalary - b.monthlySalary;
      if (sortBy === 'id_asc') return a.employeeId.localeCompare(b.employeeId);
      if (sortBy === 'date_desc') return new Date(b.joiningDate) - new Date(a.joiningDate);
      return 0;
    });

    return res;
  },

  async renderList() {
    const container = document.getElementById('employeeListContainer');
    const statsBadge = document.getElementById('employeeCountBadge');
    if (!container) return;

    if (!Schools.activeSchoolId) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="icon-school"></i></div>
          <h3>No School Selected</h3>
          <p>Please add or select a school first to manage its teachers and staff.</p>
          <button class="btn btn-primary" onclick="App.navigateTo('schools')">Manage Schools</button>
        </div>
      `;
      if (statsBadge) statsBadge.textContent = '0';
      return;
    }

    const all = await this.getForActiveSchool();
    const filtered = this.filterAndSort(all);

    if (statsBadge) statsBadge.textContent = `${filtered.length} of ${all.length}`;

    // Populate filter dropdowns dynamically
    const depts = [...new Set(all.map(e => e.department).filter(Boolean))];
    const desigs = [...new Set(all.map(e => e.designation).filter(Boolean))];
    const deptSelect = document.getElementById('empFilterDept');
    const desigSelect = document.getElementById('empFilterDesig');

    if (deptSelect && deptSelect.options.length <= 1) {
      depts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        deptSelect.appendChild(opt);
      });
    }

    if (desigSelect && desigSelect.options.length <= 1) {
      desigs.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        desigSelect.appendChild(opt);
      });
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="icon-users"></i></div>
          <h3>No Employees Found</h3>
          <p>${all.length === 0 ? 'No employees or staff added yet for this school.' : 'No records match your filter criteria.'}</p>
          <button class="btn btn-primary" onclick="Employees.openModal()"><i class="icon-plus"></i> Add New Employee</button>
        </div>
      `;
      return;
    }

    let html = `
      <div class="table-responsive desktop-view-table">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Designation & Dept</th>
              <th>Contact</th>
              <th>Monthly Salary</th>
              <th>Joining Date</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    filtered.forEach(e => {
      const isActive = e.status === 'Active';
      html += `
        <tr>
          <td>
            <div class="flex-align gap-2">
              <div class="user-avatar-sm">
                ${e.photo ? `<img src="${e.photo}" alt="${Utils.escapeHtml(e.name)}" />` : `<span class="avatar-initial">${e.name.charAt(0).toUpperCase()}</span>`}
              </div>
              <div>
                <a href="javascript:void(0)" class="font-bold table-link" onclick="Employees.viewProfile('${e.id}')">${Utils.escapeHtml(e.name)}</a>
                <div class="text-xs text-muted font-mono">${Utils.escapeHtml(e.employeeId)}</div>
              </div>
            </div>
          </td>
          <td>
            <div class="font-medium">${Utils.escapeHtml(e.designation)}</div>
            <div class="text-xs text-muted">${Utils.escapeHtml(e.department || 'General')}</div>
          </td>
          <td>
            <div><i class="icon-phone text-xs text-muted"></i> ${Utils.escapeHtml(e.mobile)}</div>
          </td>
          <td>
            <span class="font-bold text-success">${Utils.formatCurrency(e.monthlySalary)}</span>
          </td>
          <td>
            <span class="text-sm">${Utils.formatDate(e.joiningDate)}</span>
          </td>
          <td>
            <button class="badge ${isActive ? 'badge-success' : 'badge-neutral'} cursor-pointer" onclick="Employees.toggleStatus('${e.id}')" title="Click to toggle status">
              ${isActive ? 'Active' : 'Inactive'}
            </button>
          </td>
          <td class="text-right">
            <div class="btn-group">
              <button class="btn btn-xs btn-outline" onclick="Employees.viewProfile('${e.id}')" title="View Profile"><i class="icon-eye"></i></button>
              <button class="btn btn-xs btn-secondary" onclick="Employees.openModal('${e.id}')" title="Edit"><i class="icon-edit"></i></button>
              <button class="btn btn-xs btn-danger" onclick="Employees.deleteEmployee('${e.id}')" title="Delete"><i class="icon-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards View -->
      <div class="mobile-cards-view cards-grid">
    `;

    filtered.forEach(e => {
      const isActive = e.status === 'Active';
      html += `
        <div class="card employee-card">
          <div class="card-header flex-between">
            <div class="flex-align gap-2">
              <div class="user-avatar-sm">
                ${e.photo ? `<img src="${e.photo}" alt="${Utils.escapeHtml(e.name)}" />` : `<span class="avatar-initial">${e.name.charAt(0).toUpperCase()}</span>`}
              </div>
              <div>
                <h4 class="card-title font-bold" onclick="Employees.viewProfile('${e.id}')">${Utils.escapeHtml(e.name)}</h4>
                <div class="text-xs text-muted font-mono">${Utils.escapeHtml(e.employeeId)}</div>
              </div>
            </div>
            <button class="badge ${isActive ? 'badge-success' : 'badge-neutral'}" onclick="Employees.toggleStatus('${e.id}')">
              ${isActive ? 'Active' : 'Inactive'}
            </button>
          </div>
          <div class="card-body">
            <div class="flex-between text-sm mb-1">
              <span class="text-muted">Role:</span>
              <span class="font-medium">${Utils.escapeHtml(e.designation)} (${Utils.escapeHtml(e.department || '-')})</span>
            </div>
            <div class="flex-between text-sm mb-1">
              <span class="text-muted">Salary:</span>
              <span class="font-bold text-success">${Utils.formatCurrency(e.monthlySalary)}/mo</span>
            </div>
            <div class="flex-between text-sm mb-1">
              <span class="text-muted">Mobile:</span>
              <span><a href="tel:${e.mobile}">${Utils.escapeHtml(e.mobile)}</a></span>
            </div>
          </div>
          <div class="card-footer flex-between">
            <button class="btn btn-sm btn-outline" onclick="Employees.viewProfile('${e.id}')"><i class="icon-eye"></i> Profile</button>
            <div class="btn-group">
              <button class="btn btn-sm btn-secondary" onclick="Employees.openModal('${e.id}')"><i class="icon-edit"></i> Edit</button>
              <button class="btn btn-sm btn-danger" onclick="Employees.deleteEmployee('${e.id}')"><i class="icon-trash"></i></button>
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  },

  async openModal(empId = null) {
    if (!Schools.activeSchoolId) {
      App.showToast('Please select a school first', 'warning');
      return;
    }

    const modal = document.getElementById('employeeModal');
    const form = document.getElementById('employeeForm');
    const titleEl = document.getElementById('empModalTitle');
    const photoPreview = document.getElementById('empPhotoPreview');
    const removePhotoBtn = document.getElementById('removeEmpPhotoBtn');

    form.reset();
    form.empId.value = '';
    form.empPhotoData.value = '';
    if (photoPreview) photoPreview.innerHTML = '<span class="avatar-initial">?</span>';
    if (removePhotoBtn) removePhotoBtn.style.display = 'none';

    if (empId) {
      titleEl.textContent = 'Edit Employee';
      const emp = await DB.getById('employees', empId);
      if (emp) {
        form.empId.value = emp.id;
        form.employeeId.value = emp.employeeId;
        form.name.value = emp.name;
        form.mobile.value = emp.mobile;
        form.address.value = emp.address || '';
        form.designation.value = emp.designation;
        form.department.value = emp.department || '';
        form.joiningDate.value = emp.joiningDate || '';
        form.monthlySalary.value = emp.monthlySalary;
        form.bankName.value = emp.bankName || '';
        form.accountNumber.value = emp.accountNumber || '';
        form.ifscCode.value = emp.ifscCode || '';
        form.notes.value = emp.notes || '';
        form.status.value = emp.status || 'Active';
        if (emp.photo) {
          form.empPhotoData.value = emp.photo;
          if (photoPreview) photoPreview.innerHTML = `<img src="${emp.photo}" alt="Photo" />`;
          if (removePhotoBtn) removePhotoBtn.style.display = 'inline-block';
        }
      }
    } else {
      titleEl.textContent = 'Add New Employee / Teacher';
      form.employeeId.value = await this.generateNextEmployeeId();
      form.joiningDate.value = new Date().toISOString().split('T')[0];
      form.status.value = 'Active';
    }

    modal.classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('employeeModal');
    if (modal) modal.classList.remove('active');
  },

  async viewProfile(id) {
    const emp = await DB.getById('employees', id);
    if (!emp) return;

    const modal = document.getElementById('employeeProfileModal');
    const content = document.getElementById('empProfileContent');
    if (!modal || !content) return;

    const school = await DB.getById('schools', emp.schoolId);

    // Fetch latest attendance & salary summary
    const salaries = await DB.getAll('salary_records');
    const empSalaries = salaries.filter(s => s.employeeId === id);
    const totalPaid = empSalaries.filter(s => s.paymentStatus === 'Paid').reduce((acc, c) => acc + c.netSalary, 0);

    content.innerHTML = `
      <div class="profile-header card-banner text-center">
        <div class="user-avatar-lg mx-auto mb-2">
          ${emp.photo ? `<img src="${emp.photo}" alt="${Utils.escapeHtml(emp.name)}" />` : `<span class="avatar-initial">${emp.name.charAt(0).toUpperCase()}</span>`}
        </div>
        <h2 class="font-bold">${Utils.escapeHtml(emp.name)}</h2>
        <p class="text-accent font-medium">${Utils.escapeHtml(emp.designation)} • ${Utils.escapeHtml(emp.department || 'General')}</p>
        <span class="badge ${emp.status === 'Active' ? 'badge-success' : 'badge-neutral'} mt-1">${emp.status}</span>
      </div>

      <div class="profile-details-grid mt-3">
        <div class="detail-group">
          <label>Employee ID</label>
          <div class="font-mono font-bold">${Utils.escapeHtml(emp.employeeId)}</div>
        </div>
        <div class="detail-group">
          <label>School</label>
          <div>${Utils.escapeHtml(school ? school.name : 'Unknown')}</div>
        </div>
        <div class="detail-group">
          <label>Mobile Number</label>
          <div><a href="tel:${emp.mobile}" class="text-primary font-bold"><i class="icon-phone"></i> ${Utils.escapeHtml(emp.mobile)}</a></div>
        </div>
        <div class="detail-group">
          <label>Address</label>
          <div>${Utils.escapeHtml(emp.address || '-')}</div>
        </div>
        <div class="detail-group">
          <label>Joining Date</label>
          <div>${Utils.formatDate(emp.joiningDate)}</div>
        </div>
        <div class="detail-group">
          <label>Monthly Salary</label>
          <div class="font-bold text-success text-lg">${Utils.formatCurrency(emp.monthlySalary)}</div>
        </div>
      </div>

      <div class="card mt-3">
        <h4 class="card-title text-sm font-semibold mb-2"><i class="icon-credit-card"></i> Banking Information</h4>
        <div class="profile-details-grid">
          <div class="detail-group">
            <label>Bank Name</label>
            <div>${Utils.escapeHtml(emp.bankName || '-')}</div>
          </div>
          <div class="detail-group">
            <label>Account Number</label>
            <div class="font-mono">${emp.accountNumber ? Utils.maskAccount(emp.accountNumber) : '-'}</div>
          </div>
          <div class="detail-group">
            <label>IFSC Code</label>
            <div class="font-mono">${Utils.escapeHtml(emp.ifscCode || '-')}</div>
          </div>
        </div>
      </div>

      <div class="card mt-3">
        <h4 class="card-title text-sm font-semibold mb-2"><i class="icon-activity"></i> Lifetime Salary Summary</h4>
        <div class="flex-between">
          <span class="text-muted">Total Payslips Issued:</span>
          <span class="font-bold">${empSalaries.length}</span>
        </div>
        <div class="flex-between mt-1">
          <span class="text-muted">Total Disbursed:</span>
          <span class="font-bold text-success">${Utils.formatCurrency(totalPaid)}</span>
        </div>
      </div>

      <div class="modal-actions mt-4 flex-between">
        <button class="btn btn-secondary" onclick="Employees.closeProfileModal()"><i class="icon-x"></i> Close</button>
        <div class="btn-group">
          <button class="btn btn-primary" onclick="Employees.closeProfileModal(); Employees.openModal('${emp.id}')"><i class="icon-edit"></i> Edit Profile</button>
        </div>
      </div>
    `;

    modal.classList.add('active');
  },

  closeProfileModal() {
    const modal = document.getElementById('employeeProfileModal');
    if (modal) modal.classList.remove('active');
  }
};
