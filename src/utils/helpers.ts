/**
 * Validation Utilities
 */

export const validators = {
  /**
   * Validate email format
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate password strength
   */
  isValidPassword: (password: string): boolean => {
    return password.length >= 6;
  },

  /**
   * Validate username
   */
  isValidUsername: (username: string): boolean => {
    return username.length >= 3 && username.length <= 30 && /^[a-zA-Z0-9_-]+$/.test(username);
  },

  /**
   * Validate required field
   */
  isRequired: (value: string): boolean => {
    return value.trim().length > 0;
  },
};

/**
 * Format Utilities
 */
export const formatters = {
  /**
   * Format timestamp to readable date
   */
  formatDate: (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  },

  /**
   * Format timestamp to time
   */
  formatTime: (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  /**
   * Format timestamp to relative time (e.g., "2 hours ago")
   */
  formatRelativeTime: (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return formatters.formatDate(d);
  },

  /**
   * Truncate text with ellipsis
   */
  truncateText: (text: string, length: number): string => {
    return text.length > length ? `${text.substring(0, length)}...` : text;
  },

  /**
   * Format file size
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  },
};

/**
 * String Utilities
 */
export const stringUtils = {
  /**
   * Get initials from name
   */
  getInitials: (name: string): string => {
    return name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  },

  /**
   * Capitalize first letter
   */
  capitalize: (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * Generate random ID
   */
  generateId: (): string => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  },
};

/**
 * Array Utilities
 */
export const arrayUtils = {
  /**
   * Remove duplicates from array
   */
  removeDuplicates: <T>(array: T[], key?: keyof T): T[] => {
    if (key) {
      const seen = new Set();
      return array.filter((item) => {
        const value = item[key];
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      });
    }
    return Array.from(new Set(array));
  },

  /**
   * Group array by key
   */
  groupBy: <T>(array: T[], key: keyof T): Record<string, T[]> => {
    return array.reduce(
      (groups, item) => {
        const groupKey = String(item[key]);
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(item);
        return groups;
      },
      {} as Record<string, T[]>
    );
  },

  /**
   * Sort array by key
   */
  sortBy: <T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
    return [...array].sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];

      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });
  },
};
