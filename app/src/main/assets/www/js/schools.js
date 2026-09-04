// schools.js - Multi-School Management for SALARY Powered by SHIV COMPUTER

const Schools = {
  activeSchoolId: null,

  async init() {
    const schools = await DB.getAll('schools');
    const savedId = localStorage.getItem('salary_active_school_id');
    if (savedId && schools.some(s => s.id === savedId)) {
      this.activeSchoolId = savedId;
    } else if (schools.length > 0) {
      this.activeSchoolId = schools[0].id;
      localStorage.setItem('salary_active_school_id', this.activeSchoolId);
    } else {
      this.activeSchoolId = null;
    }
    this.updateHeaderSelector();
  },

  async getActiveSchool() {
    if (!this.activeSchoolId) {
      await this.init();
    }
    if (!this.activeSchoolId) return null;
    return await DB.getById('schools', this.activeSchoolId);
  },

  async setActiveSchool(id) {
    const school = await DB.getById('schools', id);
    if (!school) return false;
    this.activeSchoolId = id;
    localStorage.setItem('salary_active_school_id', id);
    this.updateHeaderSelector();
    App.onSchoolChanged();
    return true;
  },

  async getAll() {
    return await DB.getAll('schools');
  },

  async saveSchool(formData) {
    const isNew = !formData.id;
    const school = {
      id: formData.id || Utils.uuid('sch'),
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      address: formData.address.trim(),
      mobile: formData.mobile.trim(),
      email: formData.email.trim(),
      principal: formData.principal.trim(),
      logo: formData.logo || null,
      signature: formData.signature || null,
      notes: formData.notes ? formData.notes.trim() : '',
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await DB.put('schools', school);

    // Initialize default salary settings for new school if not set
    const existingSettings = await DB.getById('salary_settings', school.id);
    if (!existingSettings) {
      await Settings.initSchoolSettings(school.id);
    }

    if (isNew) {
      await Audit.log('School Created', 'Schools', `Created school "${school.name}" (${school.code})`);
      if (!this.activeSchoolId) {
        await this.setActiveSchool(school.id);
      }
    } else {
      await Audit.log('School Updated', 'Schools', `Updated school "${school.name}" (${school.code})`);
    }

    this.updateHeaderSelector();
    return school;
  },

  async deleteSchool(id) {
    const school = await DB.getById('schools', id);
    if (!school) return;

    // Check password
    const verified = await Auth.promptPassword(`Delete School: "${school.name}" and all associated data`);
    if (!verified) return false;

    // Delete associated employees, attendance, and salary records
    const allEmployees = await DB.getAll('employees');
    const schoolEmployees = allEmployees.filter(e => e.schoolId === id);
    for (const emp of schoolEmployees) {
      await DB.delete('employees', emp.id);
    }

    const allAttendance = await DB.getAll('attendance');
    const schoolAttendance = allAttendance.filter(a => a.schoolId === id);
    for (const att of schoolAttendance) {
      await DB.delete('attendance', att.id);
    }

    const allSalaries = await DB.getAll('salary_records');
    const schoolSalaries = allSalaries.filter(s => s.schoolId === id);
    for (const sal of schoolSalaries) {
      await DB.delete('salary_records', sal.id);
    }

    await DB.delete('salary_settings', id);
    await DB.delete('schools', id);

    await Audit.log('School Deleted', 'Schools', `Deleted school "${school.name}" and all associated records.`);

    const remaining = await DB.getAll('schools');
    if (remaining.length > 0) {
      await this.setActiveSchool(remaining[0].id);
    } else {
      this.activeSchoolId = null;
      localStorage.removeItem('salary_active_school_id');
      this.updateHeaderSelector();
      App.onSchoolChanged();
    }
    return true;
  },

  async updateHeaderSelector() {
    const selector = document.getElementById('headerSchoolSelect');
    const schoolNameEl = document.getElementById('currentSchoolNameBadge');
    if (!selector) return;

    const schools = await this.getAll();
    selector.innerHTML = '';

    if (schools.length === 0) {
      selector.innerHTML = '<option value="">No Schools Configured</option>';
      if (schoolNameEl) schoolNameEl.textContent = 'No School Selected';
      return;
    }

    schools.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.code})`;
      if (s.id === this.activeSchoolId) {
        opt.selected = true;
      }
      selector.appendChild(opt);
    });

    const active = schools.find(s => s.id === this.activeSchoolId);
    if (schoolNameEl && active) {
      schoolNameEl.textContent = active.name;
    }
  },

  renderSchoolsList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.getAll().then(schools => {
      if (schools.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><i class="icon-school"></i></div>
            <h3>No Schools Found</h3>
            <p>Add your first school or educational institution to begin managing salaries.</p>
            <button class="btn btn-primary" onclick="Schools.openModal()"><i class="icon-plus"></i> Add First School</button>
          </div>
        `;
        return;
      }

      let html = '<div class="cards-grid">';
      schools.forEach(s => {
        const isActive = s.id === this.activeSchoolId;
        html += `
          <div class="card school-card ${isActive ? 'active-school-card' : ''}">
            <div class="card-header flex-between">
              <div class="flex-align gap-2">
                <div class="school-logo-avatar">
                  ${s.logo ? `<img src="${s.logo}" alt="${Utils.escapeHtml(s.name)}" />` : `<span class="avatar-initial">${s.name.charAt(0).toUpperCase()}</span>`}
                </div>
                <div>
                  <h3 class="card-title">${Utils.escapeHtml(s.name)}</h3>
                  <span class="badge ${isActive ? 'badge-success' : 'badge-primary'}">${Utils.escapeHtml(s.code)}</span>
                  ${isActive ? '<span class="badge badge-accent">ACTIVE</span>' : ''}
                </div>
              </div>
            </div>
            <div class="card-body">
              <p class="text-muted"><i class="icon-map-pin"></i> ${Utils.escapeHtml(s.address || 'Address not specified')}</p>
              <p class="text-muted"><i class="icon-phone"></i> ${Utils.escapeHtml(s.mobile || '-')}</p>
              <p class="text-muted"><i class="icon-mail"></i> ${Utils.escapeHtml(s.email || '-')}</p>
              <p class="text-muted"><i class="icon-user"></i> Principal: <strong>${Utils.escapeHtml(s.principal || '-')}</strong></p>
            </div>
            <div class="card-footer flex-between">
              ${!isActive ? `<button class="btn btn-sm btn-outline" onclick="Schools.setActiveSchool('${s.id}').then(() => { Schools.renderSchoolsList('${containerId}'); App.showToast('Switched to ${Utils.escapeHtml(s.name)}', 'info'); })">Set Active</button>` : `<span class="text-success text-sm font-semibold"><i class="icon-check-circle"></i> Currently Active</span>`}
              <div class="btn-group">
                <button class="btn btn-sm btn-secondary" onclick="Schools.openModal('${s.id}')" title="Edit"><i class="icon-edit"></i> Edit</button>
                <button class="btn btn-sm btn-danger" onclick="Schools.deleteSchool('${s.id}').then(ok => { if(ok) Schools.renderSchoolsList('${containerId}'); })" title="Delete"><i class="icon-trash"></i></button>
              </div>
            </div>
          </div>
        `;
      });
      html += '</div>';
      container.innerHTML = html;
    });
  },

  async openModal(schoolId = null) {
    const modal = document.getElementById('schoolModal');
    const form = document.getElementById('schoolForm');
    const titleEl = document.getElementById('schoolModalTitle');
    const logoPreview = document.getElementById('schoolLogoPreview');
    const removeLogoBtn = document.getElementById('removeSchoolLogoBtn');

    form.reset();
    form.schoolId.value = '';
    form.schoolLogoData.value = '';
    if (logoPreview) logoPreview.innerHTML = '<span class="avatar-initial">?</span>';
    if (removeLogoBtn) removeLogoBtn.style.display = 'none';

    if (schoolId) {
      titleEl.textContent = 'Edit School Details';
      const s = await DB.getById('schools', schoolId);
      if (s) {
        form.schoolId.value = s.id;
        form.name.value = s.name;
        form.code.value = s.code;
        form.address.value = s.address;
        form.mobile.value = s.mobile;
        form.email.value = s.email;
        form.principal.value = s.principal;
        form.notes.value = s.notes || '';
        if (s.logo) {
          form.schoolLogoData.value = s.logo;
          if (logoPreview) logoPreview.innerHTML = `<img src="${s.logo}" alt="Logo" />`;
          if (removeLogoBtn) removeLogoBtn.style.display = 'inline-block';
        }
      }
    } else {
      titleEl.textContent = 'Add New School';
    }

    modal.classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('schoolModal');
    if (modal) modal.classList.remove('active');
  }
};
