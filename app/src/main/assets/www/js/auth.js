// auth.js - Security and Authentication Module for SALARY Powered by SHIV COMPUTER

const Auth = {
  // Default password: 9919
  // SHA-256 of "9919" = 7dc68be061dc10f4f9f688e1bb3b6fe9b50b5514f77c8e54d32a4e40280eb4c6
  DEFAULT_HASH: '7dc68be061dc10f4f9f688e1bb3b6fe9b50b5514f77c8e54d32a4e40280eb4c6',
  SESSION_KEY: 'salary_session_auth',
  LOCK_TIME_KEY: 'salary_last_activity',
  AUTO_LOCK_MINUTES: 15,
  inactivityTimer: null,

  async sha256(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async getStoredHash() {
    const setting = await DB.getById('app_settings', 'app_password_hash');
    return setting ? setting.value : this.DEFAULT_HASH;
  },

  async verifyPassword(password) {
    if (!password) return false;
    const inputHash = await this.sha256(password.trim());
    const storedHash = await this.getStoredHash();
    return inputHash === storedHash;
  },

  async setPassword(newPassword) {
    if (!newPassword || newPassword.length < 4) {
      throw new Error('Password must be at least 4 characters long.');
    }
    const hash = await this.sha256(newPassword.trim());
    await DB.put('app_settings', { key: 'app_password_hash', value: hash, updatedAt: new Date().toISOString() });
    await Audit.log('Password Changed', 'Security', 'Application password was updated.');
    return true;
  },

  async resetToDefaultPassword() {
    await DB.put('app_settings', { key: 'app_password_hash', value: this.DEFAULT_HASH, updatedAt: new Date().toISOString() });
    await Audit.log('Password Reset', 'Security', 'Application password reset to default.');
    return true;
  },

  isAuthenticated() {
    return sessionStorage.getItem(this.SESSION_KEY) === 'true';
  },

  setAuthenticated(val) {
    if (val) {
      sessionStorage.setItem(this.SESSION_KEY, 'true');
      this.updateActivity();
      this.startInactivityMonitoring();
    } else {
      sessionStorage.removeItem(this.SESSION_KEY);
      this.stopInactivityMonitoring();
    }
  },

  updateActivity() {
    localStorage.setItem(this.LOCK_TIME_KEY, Date.now().toString());
  },

  async checkInactivityLock() {
    const autoLockSetting = await DB.getById('app_settings', 'auto_lock_minutes');
    const minutes = autoLockSetting ? Number(autoLockSetting.value) : this.AUTO_LOCK_MINUTES;
    if (minutes <= 0) return; // Disabled

    const last = Number(localStorage.getItem(this.LOCK_TIME_KEY) || Date.now());
    const diffMs = Date.now() - last;
    if (diffMs > minutes * 60 * 1000) {
      this.setAuthenticated(false);
      App.showLockScreen();
    }
  },

  startInactivityMonitoring() {
    this.stopInactivityMonitoring();
    const activityHandler = () => this.updateActivity();
    window.addEventListener('mousemove', activityHandler, { passive: true });
    window.addEventListener('keydown', activityHandler, { passive: true });
    window.addEventListener('touchstart', activityHandler, { passive: true });

    this.inactivityTimer = setInterval(() => {
      if (this.isAuthenticated()) {
        this.checkInactivityLock();
      }
    }, 30000);
  },

  stopInactivityMonitoring() {
    if (this.inactivityTimer) {
      clearInterval(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  },

  // Modal helper for sensitive action confirmation
  promptPassword(actionTitle = 'Sensitive Operation') {
    return new Promise((resolve) => {
      const modal = document.getElementById('passwordPromptModal');
      const titleEl = document.getElementById('pwdPromptTitle');
      const inputEl = document.getElementById('pwdPromptInput');
      const errorEl = document.getElementById('pwdPromptError');
      const confirmBtn = document.getElementById('pwdPromptConfirm');
      const cancelBtn = document.getElementById('pwdPromptCancel');

      if (!modal) {
        // Fallback
        const pwd = prompt(`Please enter application password to confirm: ${actionTitle}`);
        this.verifyPassword(pwd).then(valid => resolve(valid));
        return;
      }

      titleEl.textContent = actionTitle;
      inputEl.value = '';
      errorEl.textContent = '';
      modal.classList.add('active');
      inputEl.focus();

      const cleanup = () => {
        modal.classList.remove('active');
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
        inputEl.onkeydown = null;
      };

      const handleConfirm = async () => {
        const val = inputEl.value;
        const valid = await Auth.verifyPassword(val);
        if (valid) {
          cleanup();
          resolve(true);
        } else {
          errorEl.textContent = 'Incorrect password. Access denied.';
          inputEl.classList.add('shake');
          setTimeout(() => inputEl.classList.remove('shake'), 500);
          inputEl.select();
        }
      };

      confirmBtn.onclick = handleConfirm;
      inputEl.onkeydown = (e) => {
        if (e.key === 'Enter') handleConfirm();
        if (e.key === 'Escape') {
          cleanup();
          resolve(false);
        }
      };
      cancelBtn.onclick = () => {
        cleanup();
        resolve(false);
      };
    });
  }
};
