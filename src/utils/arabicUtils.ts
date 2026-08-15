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

export const formatDateOnly = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const clean = dateStr.split(' ')[0].split('T')[0];
  if (!clean || clean === 'undefined' || clean === 'null') return '-';
  return toArabicDigits(clean);
};

export const getCompletionOrCancellationDate = (completedAt?: string, status?: string): string => {
  if (status === 'completed' || status === 'cancelled') {
    if (completedAt) return formatDateOnly(completedAt);
    return formatDateOnly(new Date().toISOString().split('T')[0]);
  }
  return '-';
};

export const calculateMaintenanceDurationDays = (createdAt?: string, completedAt?: string, status?: string): string => {
  if (!createdAt) return '-';
  const startClean = createdAt.split(' ')[0].split('T')[0];
  const start = new Date(startClean);
  if (isNaN(start.getTime())) return '-';

  const isFinished = status === 'completed' || status === 'cancelled';
  let end: Date;
  if (isFinished) {
    if (completedAt) {
      const endClean = completedAt.split(' ')[0].split('T')[0];
      end = new Date(endClean);
      if (isNaN(end.getTime())) end = new Date();
    } else {
      end = new Date();
    }
  } else {
    end = new Date(); // current date for in-progress
  }

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  return `${toArabicDigits(diffDays)} يوم`;
};


