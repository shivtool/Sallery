// settings.js - Settings Management for SALARY Powered by SHIV COMPUTER

const Settings = {
  defaultSalarySettings: {
    calculationBasis: 30,          // Fixed 30-day calculation basis
    paidFirstAbsentLeaveCount: 1,  // 1 Absent OR 1 Leave in a month is PAID
    sundayPaid: true,              // Sunday is ALWAYS PAID
    halfDayFactor: 0.5,            // 1 Half Day = 0.5 day deduction
    currencySymbol: '₹',
    roundingRule: 'round',         // 'round', 'floor', 'ceil'
    defaultAllowance: 0,
    defaultBonus: 0,
    defaultOtherDeduction: 0,
    annualIncrementType: 'flat',   // 'flat' or 'percent'
    annualIncrementValue: 1000,    // ₹1,000 or 10%
    incrementEffectiveMonth: 4     // April (Financial Year start)
  },

  async initSchoolSettings(schoolId) {
    let settings = await DB.getById('salary_settings', schoolId);
    if (!settings) {
      settings = {
        schoolId,
        ...this.defaultSalarySettings,
        updatedAt: new Date().toISOString()
      };
      await DB.put('salary_settings', settings);
    }
    return settings;
  },

  async getSalarySettings(schoolId) {
    if (!schoolId) schoolId = Schools.activeSchoolId;
    if (!schoolId) return { ...this.defaultSalarySettings };
    let settings = await DB.getById('salary_settings', schoolId);
    if (!settings) {
      settings = await this.initSchoolSettings(schoolId);
    }
    return { ...this.defaultSalarySettings, ...settings };
  },

  async saveSalarySettings(schoolId, newSettings) {
    const verified = await Auth.promptPassword('Save Salary and Financial Settings');
    if (!verified) return false;

    const current = await this.getSalarySettings(schoolId);
    const updated = {
      ...current,
      ...newSettings,
      schoolId,
      updatedAt: new Date().toISOString()
    };

    await DB.put('salary_settings', updated);
    await Audit.log('Settings Updated', 'Salary Settings', `Updated calculation settings for school ${schoolId}`);
    App.showToast('Salary settings saved successfully', 'success');
    return true;
  },

  async renderSettingsView() {
    const container = document.getElementById('settingsContainer');
    if (!container) return;

    const schoolId = Schools.activeSchoolId;
    const school = schoolId ? await DB.getById('schools', schoolId) : null;
    const salarySettings = await this.getSalarySettings(schoolId);
    const autoLockSetting = await DB.getById('app_settings', 'auto_lock_minutes');
    const autoLockVal = autoLockSetting ? autoLockSetting.value : 15;

    let html = `
      <div class="tabs-nav mb-3">
        <button class="tab-btn active" onclick="Settings.switchTab('salaryTab')"><i class="icon-calculator"></i> Salary Engine</button>
        <button class="tab-btn" onclick="Settings.switchTab('incrementTab')"><i class="icon-trending-up"></i> Annual Increment</button>
        <button class="tab-btn" onclick="Settings.switchTab('securityTab')"><i class="icon-shield"></i> Security & Password</button>
        <button class="tab-btn" onclick="Settings.switchTab('generalTab')"><i class="icon-sliders"></i> General & Lock</button>
        <button class="tab-btn" onclick="Settings.switchTab('dangerTab')"><i class="icon-alert-triangle"></i> Reset & Danger</button>
      </div>

      <!-- Tab 1: Salary Engine Rules -->
      <div id="salaryTab" class="tab-pane active">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="icon-settings"></i> Salary Calculation Policy (${school ? Utils.escapeHtml(school.name) : 'No School'})</h3>
            <p class="text-sm text-muted">Customize the deterministic calculation formula for this school's monthly payroll.</p>
          </div>
          <form id="salaryRulesForm" onsubmit="event.preventDefault(); Settings.handleSaveSalaryRules();">
            <div class="form-grid">
              <div class="form-group">
                <label>Calculation Basis (Days/Month) *</label>
                <input type="number" name="calculationBasis" class="form-control" value="${salarySettings.calculationBasis}" required min="1" max="31">
                <small class="text-muted">Standard basis (Default: 30 days per month)</small>
              </div>

              <div class="form-group">
                <label>Paid Absent / Leave Count *</label>
                <input type="number" name="paidFirstAbsentLeaveCount" class="form-control" value="${salarySettings.paidFirstAbsentLeaveCount}" required min="0" max="10">
                <small class="text-muted">Number of first absent/leave days that are PAID (Default: 1)</small>
              </div>

              <div class="form-group">
                <label>Sunday Paid Policy *</label>
                <select name="sundayPaid" class="form-control">
                  <option value="true" ${salarySettings.sundayPaid ? 'selected' : ''}>Sunday is ALWAYS PAID (Standard Rule)</option>
                  <option value="false" ${!salarySettings.sundayPaid ? 'selected' : ''}>Sunday is Unpaid</option>
                </select>
                <small class="text-muted">Sundays are counted as paid holidays and never deducted</small>
              </div>

              <div class="form-group">
                <label>Half Day Deduction Factor *</label>
                <select name="halfDayFactor" class="form-control">
                  <option value="0.5" ${salarySettings.halfDayFactor === 0.5 ? 'selected' : ''}>0.5 Day (Half Day Deduction)</option>
                  <option value="0.25" ${salarySettings.halfDayFactor === 0.25 ? 'selected' : ''}>0.25 Day</option>
                  <option value="1.0" ${salarySettings.halfDayFactor === 1.0 ? 'selected' : ''}>1.0 Full Day</option>
                  <option value="0.0" ${salarySettings.halfDayFactor === 0.0 ? 'selected' : ''}>0.0 Day (No Deduction)</option>
                </select>
                <small class="text-muted">Deduction rate applied per Half Day</small>
              </div>

              <div class="form-group">
                <label>Currency Symbol</label>
                <input type="text" name="currencySymbol" class="form-control" value="${salarySettings.currencySymbol}" maxlength="5">
              </div>

              <div class="form-group">
                <label>Rounding Rule</label>
                <select name="roundingRule" class="form-control">
                  <option value="round" ${salarySettings.roundingRule === 'round' ? 'selected' : ''}>Round to Nearest Integer (Standard)</option>
                  <option value="floor" ${salarySettings.roundingRule === 'floor' ? 'selected' : ''}>Floor (Round Down)</option>
                  <option value="ceil" ${salarySettings.roundingRule === 'ceil' ? 'selected' : ''}>Ceiling (Round Up)</option>
                </select>
              </div>
            </div>

            <div class="form-actions mt-3">
              <button type="submit" class="btn btn-primary"><i class="icon-save"></i> Save Salary Rules</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Tab 2: Annual Increment -->
      <div id="incrementTab" class="tab-pane">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="icon-trending-up"></i> Annual Salary Increment Policy</h3>
            <p class="text-sm text-muted">Configure automatic annual increments for staff based on years of service.</p>
          </div>
          <form id="incrementForm" onsubmit="event.preventDefault(); Settings.handleSaveIncrementRules();">
            <div class="form-grid">
              <div class="form-group">
                <label>Increment Calculation Mode</label>
                <select name="annualIncrementType" class="form-control">
                  <option value="flat" ${salarySettings.annualIncrementType === 'flat' ? 'selected' : ''}>Flat Amount Per Year (e.g. ₹1,000/yr)</option>
                  <option value="percent" ${salarySettings.annualIncrementType === 'percent' ? 'selected' : ''}>Percentage Per Year (e.g. 10%/yr)</option>
                </select>
              </div>

              <div class="form-group">
                <label>Default Increment Value</label>
                <input type="number" name="annualIncrementValue" class="form-control" value="${salarySettings.annualIncrementValue}" min="0">
                <small class="text-muted">Enter flat ₹ amount or % rate</small>
              </div>

              <div class="form-group">
                <label>Annual Increment Cycle Month</label>
                <select name="incrementEffectiveMonth" class="form-control">
                  <option value="1" ${salarySettings.incrementEffectiveMonth === 1 ? 'selected' : ''}>January</option>
                  <option value="4" ${salarySettings.incrementEffectiveMonth === 4 ? 'selected' : ''}>April (Indian Financial Year)</option>
                  <option value="7" ${salarySettings.incrementEffectiveMonth === 7 ? 'selected' : ''}>July (Academic Session)</option>
                </select>
              </div>
            </div>

            <div class="alert alert-info mt-3">
              <i class="icon-info"></i>
              <span><strong>Annual Increment Example:</strong> With a Flat increment of ₹1,000/yr, an employee joining at ₹15,000/mo will have their salary calculated as ₹16,000 after 1 completed year, ₹17,000 after 2 years.</span>
            </div>

            <div class="form-actions mt-3">
              <button type="submit" class="btn btn-primary"><i class="icon-save"></i> Save Increment Rules</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Tab 3: Security & Password -->
      <div id="securityTab" class="tab-pane">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="icon-lock"></i> Application Password & Authentication</h3>
            <p class="text-sm text-muted">Change your administrator application password. Default is <code>9919</code>.</p>
          </div>

          <form id="changePasswordForm" onsubmit="event.preventDefault(); Settings.handleChangePassword();" class="max-w-md">
            <div class="form-group">
              <label>Current Application Password *</label>
              <input type="password" name="currentPassword" class="form-control" required placeholder="Enter current password">
            </div>

            <div class="form-group">
              <label>New Application Password *</label>
              <input type="password" name="newPassword" class="form-control" required minlength="4" placeholder="Minimum 4 characters">
            </div>

            <div class="form-group">
              <label>Confirm New Password *</label>
              <input type="password" name="confirmNewPassword" class="form-control" required minlength="4" placeholder="Re-enter new password">
            </div>

            <div class="form-actions mt-3 flex-between">
              <button type="submit" class="btn btn-primary"><i class="icon-check"></i> Update Password</button>
              <button type="button" class="btn btn-outline-danger" onclick="Settings.handleResetPassword()"><i class="icon-refresh-cw"></i> Reset to Default (9919)</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Tab 4: General Settings & Auto-lock -->
      <div id="generalTab" class="tab-pane">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="icon-shield"></i> Security Timeouts & General Settings</h3>
          </div>
          <form onsubmit="event.preventDefault(); Settings.handleSaveGeneral();" class="max-w-md">
            <div class="form-group">
              <label>Auto-Lock After Inactivity</label>
              <select id="autoLockSelect" class="form-control">
                <option value="5" ${autoLockVal == 5 ? 'selected' : ''}>5 Minutes</option>
                <option value="15" ${autoLockVal == 15 ? 'selected' : ''}>15 Minutes (Default)</option>
                <option value="30" ${autoLockVal == 30 ? 'selected' : ''}>30 Minutes</option>
                <option value="60" ${autoLockVal == 60 ? 'selected' : ''}>1 Hour</option>
                <option value="0" ${autoLockVal == 0 ? 'selected' : ''}>Disabled (Never Auto-Lock)</option>
              </select>
              <small class="text-muted">The screen will automatically lock if no mouse/touch activity is detected.</small>
            </div>

            <div class="form-group mt-3">
              <label>Theme Preference</label>
              <button type="button" class="btn btn-outline" onclick="App.toggleTheme()">
                <i class="icon-moon"></i> Toggle Light / Dark Mode
              </button>
            </div>

            <div class="form-actions mt-3">
              <button type="submit" class="btn btn-primary"><i class="icon-save"></i> Save Preferences</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Tab 5: Danger Zone -->
      <div id="dangerTab" class="tab-pane">
        <div class="card border-danger">
          <div class="card-header bg-danger-light">
            <h3 class="card-title text-danger"><i class="icon-alert-triangle"></i> Danger Zone - Factory Reset</h3>
            <p class="text-sm">These actions are permanent and cannot be undone without a previously exported backup file.</p>
          </div>
          <div class="card-body">
            <p>To completely wipe all schools, employee profiles, attendance calendars, and salary histories, you must enter your password and type <code>RESET SALARY</code>.</p>
            <button class="btn btn-danger mt-2" onclick="App.confirmResetApplication()"><i class="icon-trash-2"></i> Reset Application Completely</button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');

    const pane = document.getElementById(tabId);
    if (pane) pane.classList.add('active');
  },

  async handleSaveSalaryRules() {
    const form = document.getElementById('salaryRulesForm');
    const schoolId = Schools.activeSchoolId;
    if (!schoolId) {
      App.showToast('Please select a school first', 'warning');
      return;
    }

    const data = {
      calculationBasis: Number(form.calculationBasis.value) || 30,
      paidFirstAbsentLeaveCount: Number(form.paidFirstAbsentLeaveCount.value) || 0,
      sundayPaid: form.sundayPaid.value === 'true',
      halfDayFactor: Number(form.halfDayFactor.value) || 0.5,
      currencySymbol: form.currencySymbol.value.trim() || '₹',
      roundingRule: form.roundingRule.value
    };

    await this.saveSalarySettings(schoolId, data);
  },

  async handleSaveIncrementRules() {
    const form = document.getElementById('incrementForm');
    const schoolId = Schools.activeSchoolId;
    if (!schoolId) {
      App.showToast('Please select a school first', 'warning');
      return;
    }

    const data = {
      annualIncrementType: form.annualIncrementType.value,
      annualIncrementValue: Number(form.annualIncrementValue.value) || 0,
      incrementEffectiveMonth: Number(form.incrementEffectiveMonth.value) || 4
    };

    await this.saveSalarySettings(schoolId, data);
  },

  async handleChangePassword() {
    const form = document.getElementById('changePasswordForm');
    const current = form.currentPassword.value;
    const newPwd = form.newPassword.value;
    const confirmPwd = form.confirmNewPassword.value;

    if (newPwd !== confirmPwd) {
      App.showToast('New passwords do not match!', 'error');
      return;
    }

    const valid = await Auth.verifyPassword(current);
    if (!valid) {
      App.showToast('Current password is incorrect!', 'error');
      return;
    }

    try {
      await Auth.setPassword(newPwd);
      form.reset();
      App.showToast('Application password updated successfully!', 'success');
    } catch (e) {
      App.showToast(e.message, 'error');
    }
  },

  async handleResetPassword() {
    const verified = await Auth.promptPassword('Reset Password to Default (9919)');
    if (!verified) return;

    await Auth.resetToDefaultPassword();
    App.showToast('Password reset to default (9919)', 'success');
  },

  async handleSaveGeneral() {
    const select = document.getElementById('autoLockSelect');
    const val = Number(select.value);
    await DB.put('app_settings', { key: 'auto_lock_minutes', value: val, updatedAt: new Date().toISOString() });
    App.showToast('General settings saved', 'success');
  }
};
