import {
  formatDateDDMMYYYY,
  formatTime12Hour,
  getServerNow,
  getServerDateFormatted,
  getServerDateDDMMYYYY,
  getServerDateTimeFormatted,
  getServerIsoDateOnly,
  getServerTimeFormatted,
  getServerTimestamp,
} from '../services/serverTime';

export {
  formatDateDDMMYYYY,
  formatTime12Hour,
  getServerNow,
  getServerDateFormatted,
  getServerDateDDMMYYYY,
  getServerDateTimeFormatted,
  getServerIsoDateOnly,
  getServerTimeFormatted,
  getServerTimestamp,
};

export const toArabicDigits = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '';
  const str = String(val);
  const indicDigits = '٠١٢٣٤٥٦٧٨٩';
  return str.replace(/[٠-٩]/g, (d) => String(indicDigits.indexOf(d)));
};

export const formatArabicNumber = (val: number | string): string => {
  if (val === undefined || val === null) return '';
  const str = String(val);
  return toArabicDigits(str);
};

/**
 * Standardized Date Formatter: ALWAYS outputs (YYYY-MM-DD)
 * Example: 2026-08-23
 */
export const formatDateOnly = (dateStr?: string | number | Date | null): string => {
  return formatDateDDMMYYYY(dateStr);
};

/**
 * Standardized DateTime Formatter: ALWAYS outputs (YYYY-MM-DD hh:mm:ss ص/م)
 * Example: 2026-08-23 02:30:15 م
 */
export const formatDateTimeOnly = (
  dateStr?: string | number | Date | null,
  includeSeconds: boolean = true
): string => {
  if (!dateStr) return '-';
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
  if (isNaN(d.getTime())) return formatDateDDMMYYYY(dateStr);
  const datePart = formatDateDDMMYYYY(d);
  const timePart = formatTime12Hour(d, includeSeconds);
  return `${datePart} ${timePart}`;
};

export const getCompletionOrCancellationDate = (completedAt?: string, status?: string): string => {
  if (status === 'completed' || status === 'cancelled' || status === 'rejected') {
    if (completedAt) return formatDateOnly(completedAt);
    return getServerDateFormatted();
  }
  return '-';
};

export const calculateMaintenanceDurationDays = (createdAt?: string, completedAt?: string, status?: string): string => {
  if (!createdAt) return '-';
  
  // Parse start date safely
  let start: Date;
  const ddmmyyyyMatch = createdAt.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (ddmmyyyyMatch) {
    start = new Date(parseInt(ddmmyyyyMatch[3], 10), parseInt(ddmmyyyyMatch[2], 10) - 1, parseInt(ddmmyyyyMatch[1], 10));
  } else {
    const startClean = createdAt.split(' ')[0].split('T')[0];
    start = new Date(startClean);
  }
  if (isNaN(start.getTime())) return '-';

  const isFinished = status === 'completed' || status === 'cancelled' || status === 'rejected';
  let end: Date;
  if (isFinished) {
    if (completedAt) {
      const ddmmyyyyEndMatch = completedAt.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
      if (ddmmyyyyEndMatch) {
        end = new Date(parseInt(ddmmyyyyEndMatch[3], 10), parseInt(ddmmyyyyEndMatch[2], 10) - 1, parseInt(ddmmyyyyEndMatch[1], 10));
      } else {
        const endClean = completedAt.split(' ')[0].split('T')[0];
        end = new Date(endClean);
      }
      if (isNaN(end.getTime())) end = getServerNow();
    } else {
      end = getServerNow();
    }
  } else {
    end = getServerNow(); // server time for in-progress
  }

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  return `${toArabicDigits(diffDays)} يوم`;
};


