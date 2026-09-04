// backup.js - Backup & Disaster Recovery for SALARY Powered by SHIV COMPUTER

const Backup = {
  async createFullBackup() {
    const schools = await DB.getAll('schools');
    const employees = await DB.getAll('employees');
    const attendance = await DB.getAll('attendance');
    const salary_records = await DB.getAll('salary_records');
    const salary_settings = await DB.getAll('salary_settings');
    const app_settings = await DB.getAll('app_settings');
    const audit_logs = await DB.getAll('audit_logs');

    const backupPayload = {
      app: 'SALARY',
      brand: 'SHIV COMPUTER',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      summary: {
        schoolsCount: schools.length,
        employeesCount: employees.length,
        attendanceCount: attendance.length,
        salariesCount: salary_records.length
      },
      data: {
        schools,
        employees,
        attendance,
        salary_records,
        salary_settings,
        app_settings,
        audit_logs
      }
    };

    const json = JSON.stringify(backupPayload, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    Utils.downloadFile(json, `SALARY_Backup_ShivComputer_${dateStr}.json`, 'application/json');

    await Audit.log('Backup Created', 'Backup', `Exported full database JSON (${schools.length} schools, ${employees.length} employees)`);
    App.showToast('Backup file generated and downloaded!', 'success');
  },

  async handleFileRestore(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      if (!payload.data || !payload.app) {
        throw new Error('Invalid backup file structure.');
      }

      const verified = await Auth.promptPassword('Restore Database Backup');
      if (!verified) return;

      const modal = document.getElementById('restoreConfirmationModal');
      const infoEl = document.getElementById('restoreSummaryInfo');
      if (!modal || !infoEl) return;

      const summary = payload.summary || {
        schoolsCount: payload.data.schools ? payload.data.schools.length : 0,
        employeesCount: payload.data.employees ? payload.data.employees.length : 0,
        salariesCount: payload.data.salary_records ? payload.data.salary_records.length : 0
      };

      infoEl.innerHTML = `
        <div class="alert alert-warning mb-3">
          <i class="icon-alert-triangle"></i>
          <div>
            <strong>Backup Validation Successful:</strong>
            <div>Exported: ${Utils.formatDate(payload.exportedAt)}</div>
            <div>Contains: <strong>${summary.schoolsCount} Schools</strong>, <strong>${summary.employeesCount} Employees</strong>, <strong>${summary.salariesCount} Salary Slips</strong>.</div>
          </div>
        </div>
        <p class="text-sm">Choose how you want to restore this data:</p>
      `;

      modal.classList.add('active');

      document.getElementById('btnRestoreReplace').onclick = async () => {
        modal.classList.remove('active');
        await Backup.applyRestore(payload.data, 'replace');
      };

      document.getElementById('btnRestoreMerge').onclick = async () => {
        modal.classList.remove('active');
        await Backup.applyRestore(payload.data, 'merge');
      };

    } catch (err) {
      App.showToast('Corrupted or invalid backup file: ' + err.message, 'error');
    }
  },

  async applyRestore(data, mode = 'replace') {
    try {
      if (mode === 'replace') {
        await DB.resetAll();
      }

      // Restore schools
      if (data.schools && Array.isArray(data.schools)) {
        for (const s of data.schools) await DB.put('schools', s);
      }

      // Restore employees
      if (data.employees && Array.isArray(data.employees)) {
        for (const e of data.employees) await DB.put('employees', e);
      }

      // Restore attendance
      if (data.attendance && Array.isArray(data.attendance)) {
        for (const a of data.attendance) await DB.put('attendance', a);
      }

      // Restore salary records
      if (data.salary_records && Array.isArray(data.salary_records)) {
        for (const sal of data.salary_records) await DB.put('salary_records', sal);
      }

      // Restore salary settings
      if (data.salary_settings && Array.isArray(data.salary_settings)) {
        for (const ss of data.salary_settings) await DB.put('salary_settings', ss);
      }

      // Restore app settings (except password if merge)
      if (data.app_settings && Array.isArray(data.app_settings)) {
        for (const as of data.app_settings) {
          if (mode === 'merge' && as.key === 'app_password_hash') continue;
          await DB.put('app_settings', as);
        }
      }

      await Audit.log('Backup Restored', 'Backup', `Restored backup using mode: ${mode.toUpperCase()}`);
      App.showToast('Database restore completed successfully!', 'success');

      // Re-init active school and refresh UI
      await Schools.init();
      App.onSchoolChanged();
      App.navigateTo('dashboard');
    } catch (e) {
      App.showToast('Error during restore: ' + e.message, 'error');
    }
  }
};
