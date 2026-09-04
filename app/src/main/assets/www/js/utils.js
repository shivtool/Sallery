// utils.js - Utility helpers for SALARY Powered by SHIV COMPUTER

const Utils = {
  // Format currency
  formatCurrency(amount, symbol = '₹') {
    if (isNaN(amount) || amount === null || amount === undefined) amount = 0;
    const num = Math.round(Number(amount));
    return symbol + ' ' + num.toLocaleString('en-IN');
  },

  // Format date to DD/MM/YYYY
  formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  },

  // Get Month Name
  getMonthName(monthIndex) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[Number(monthIndex) - 1] || months[Number(monthIndex)] || '';
  },

  // Get Days in Month
  getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  },

  // Check if date is Sunday
  isSunday(year, month, day) {
    const date = new Date(year, month - 1, day);
    return date.getDay() === 0;
  },

  // Count Sundays in a month
  countSundays(year, month) {
    const daysInMonth = this.getDaysInMonth(year, month);
    let sundays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      if (this.isSunday(year, month, day)) {
        sundays++;
      }
    }
    return sundays;
  },

  // Sanitize HTML string to prevent XSS
  escapeHtml(text) {
    if (!text && text !== 0) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  },

  // Mask sensitive account number
  maskAccount(acc) {
    if (!acc) return '-';
    const str = String(acc).trim();
    if (str.length <= 4) return str;
    return '•••• •••• ' + str.slice(-4);
  },

  // Number to words converter (Indian numbering system)
  numberToWords(num) {
    num = Math.round(Number(num));
    if (isNaN(num) || num === 0) return 'Zero Rupees Only';
    if (num < 0) return 'Minus ' + this.numberToWords(Math.abs(num));

    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertTwoDigits(n) {
      if (n < 20) return a[n];
      const tens = b[Math.floor(n / 10)];
      const ones = a[n % 10];
      return tens + (ones ? ' ' + ones : '');
    }

    function convertThreeDigits(n) {
      const hundred = Math.floor(n / 100);
      const rest = n % 100;
      let str = '';
      if (hundred > 0) {
        str += a[hundred] + ' Hundred';
        if (rest > 0) str += ' and ';
      }
      if (rest > 0) {
        str += convertTwoDigits(rest);
      }
      return str;
    }

    let crore = Math.floor(num / 10000000);
    num %= 10000000;
    let lakh = Math.floor(num / 100000);
    num %= 100000;
    let thousand = Math.floor(num / 1000);
    num %= 1000;
    let hundredAndBelow = num;

    let res = '';
    if (crore > 0) {
      res += convertTwoDigits(crore) + ' Crore ';
    }
    if (lakh > 0) {
      res += convertTwoDigits(lakh) + ' Lakh ';
    }
    if (thousand > 0) {
      res += convertTwoDigits(thousand) + ' Thousand ';
    }
    if (hundredAndBelow > 0) {
      res += convertThreeDigits(hundredAndBelow) + ' ';
    }

    return 'Rupees ' + res.trim() + ' Only';
  },

  // Unique ID generator
  uuid(prefix = 'id') {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
  },

  // Debounce helper
  debounce(func, wait = 250) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Compress & resize image to base64 for offline storage
  resizeImage(file, maxWidth = 400, maxHeight = 400, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = err => reject(err);
        img.src = e.target.result;
      };
      reader.onerror = err => reject(err);
      reader.readAsDataURL(file);
    });
  },

  // Download JSON or Text file
  downloadFile(content, fileName, contentType = 'application/json') {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },

  // Convert array of objects to CSV string
  arrayToCsv(headers, rows) {
    const escapeCsv = val => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };
    let csv = headers.map(h => escapeCsv(h.label)).join(',') + '\n';
    rows.forEach(row => {
      csv += headers.map(h => escapeCsv(row[h.key])).join(',') + '\n';
    });
    return csv;
  }
};
