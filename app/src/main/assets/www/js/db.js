// db.js - IndexedDB Local Persistence Layer for SALARY Powered by SHIV COMPUTER

const DB = {
  dbName: 'SalaryShivComputerDB',
  version: 1,
  db: null,

  async init() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = event => {
        const db = event.target.result;

        // Schools Store
        if (!db.objectStoreNames.contains('schools')) {
          const schoolStore = db.createObjectStore('schools', { keyPath: 'id' });
          schoolStore.createIndex('code', 'code', { unique: false });
        }

        // Employees Store
        if (!db.objectStoreNames.contains('employees')) {
          const empStore = db.createObjectStore('employees', { keyPath: 'id' });
          empStore.createIndex('schoolId', 'schoolId', { unique: false });
          empStore.createIndex('employeeId', 'employeeId', { unique: false });
          empStore.createIndex('status', 'status', { unique: false });
        }

        // Attendance Store: Each record is for an employee for a specific date or month
        if (!db.objectStoreNames.contains('attendance')) {
          const attStore = db.createObjectStore('attendance', { keyPath: 'id' });
          attStore.createIndex('schoolId', 'schoolId', { unique: false });
          attStore.createIndex('school_month_year', ['schoolId', 'month', 'year'], { unique: false });
          attStore.createIndex('lookup', ['schoolId', 'employeeId', 'month', 'year'], { unique: false });
        }

        // Salary Records Store: generated monthly salary slips
        if (!db.objectStoreNames.contains('salary_records')) {
          const salStore = db.createObjectStore('salary_records', { keyPath: 'id' });
          salStore.createIndex('schoolId', 'schoolId', { unique: false });
          salStore.createIndex('school_month_year', ['schoolId', 'month', 'year'], { unique: false });
          salStore.createIndex('lookup', ['schoolId', 'employeeId', 'month', 'year'], { unique: false });
        }

        // Salary Settings Store (by schoolId)
        if (!db.objectStoreNames.contains('salary_settings')) {
          db.createObjectStore('salary_settings', { keyPath: 'schoolId' });
        }

        // App Settings Store (general key-value)
        if (!db.objectStoreNames.contains('app_settings')) {
          db.createObjectStore('app_settings', { keyPath: 'key' });
        }

        // Audit Logs Store
        if (!db.objectStoreNames.contains('audit_logs')) {
          const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
          auditStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = event => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = event => {
        console.error('IndexedDB open error:', event.target.error);
        reject(event.target.error);
      };
    });
  },

  async getTransaction(storeName, mode = 'readonly') {
    const db = await this.init();
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  },

  async getAll(storeName) {
    try {
      const store = await this.getTransaction(storeName, 'readonly');
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`Error in getAll(${storeName}):`, err);
      return [];
    }
  },

  async getById(storeName, id) {
    try {
      const store = await this.getTransaction(storeName, 'readonly');
      return new Promise((resolve, reject) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`Error in getById(${storeName}, ${id}):`, err);
      return null;
    }
  },

  async put(storeName, item) {
    try {
      const store = await this.getTransaction(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const req = store.put(item);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`Error in put(${storeName}):`, err);
      throw err;
    }
  },

  async delete(storeName, id) {
    try {
      const store = await this.getTransaction(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`Error in delete(${storeName}, ${id}):`, err);
      throw err;
    }
  },

  async clearStore(storeName) {
    try {
      const store = await this.getTransaction(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`Error clearing ${storeName}:`, err);
      throw err;
    }
  },

  async getByIndex(storeName, indexName, value) {
    try {
      const db = await this.init();
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      return new Promise((resolve, reject) => {
        const req = index.getAll(value);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`Error getByIndex(${storeName}, ${indexName}):`, err);
      return [];
    }
  },

  // Reset entire database
  async resetAll() {
    const stores = ['schools', 'employees', 'attendance', 'salary_records', 'salary_settings', 'app_settings', 'audit_logs'];
    for (const s of stores) {
      try {
        await this.clearStore(s);
      } catch (e) {
        console.warn('Error clearing store ' + s, e);
      }
    }
  }
};
