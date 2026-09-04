// audit.js - Audit Logging Module for SALARY Powered by SHIV COMPUTER

const Audit = {
  async log(action, module, details = '') {
    try {
      const entry = {
        id: Utils.uuid('log'),
        timestamp: new Date().toISOString(),
        action,
        module,
        details
      };
      await DB.put('audit_logs', entry);
    } catch (e) {
      console.warn('Audit log error:', e);
    }
  },

  async getAll() {
    const logs = await DB.getAll('audit_logs');
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  async clearAll() {
    await DB.clearStore('audit_logs');
    await this.log('Audit Logs Cleared', 'Audit', 'Administrator cleared audit history.');
  }
};
