import { UnitAsset } from '../types';

/**
 * Utility functions for Fixed Asset Accounting Codes (رمز الأصل)
 * Supports:
 * - Only numbers (0-9) and dots (.)
 * - 10-digit continuous numeric sequence (e.g. 1002030405)
 * - 12-character sequence separated by dots (e.g. 10.02.03.0405 or 10.020.304.05)
 * - Non-repeatable unique identifier across all company units
 */

/**
 * Cleans and filters input to only allow English digits and dot (.)
 */
export function cleanFixedAssetCodeInput(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString())
    .replace(/[۰-۹]/g, (d) => (d.charCodeAt(0) - 1776).toString())
    .replace(/[^0-9.]/g, '')
    .slice(0, 12);
}

/**
 * Checks whether the asset code matches either:
 * 1) Exactly 10 digits (e.g. 1002030405)
 * 2) Exactly 12 characters with digits separated by dots (e.g. 10.02.03.0405 or 10.020.304.05)
 */
export function validateFixedAssetCodeFormat(code: string): {
  isValid: boolean;
  type?: 'continuous_10' | 'dotted_12';
  message?: string;
} {
  const clean = (code || '').trim();
  if (!clean) {
    return { isValid: false, message: 'يرجى إدخال رمز الأصل المثبت في سجلات الشركة' };
  }

  if (!/^[0-9.]+$/.test(clean)) {
    return { isValid: false, message: 'رمز الأصل يجب أن يحتوي على أرقام ورمز (.) فقط' };
  }

  // Format 1: 10 digits
  if (/^\d{10}$/.test(clean)) {
    return { isValid: true, type: 'continuous_10' };
  }

  // Format 2: 12 chars with dots
  if (clean.length === 12 && clean.includes('.')) {
    if (clean.startsWith('.') || clean.endsWith('.') || clean.includes('..')) {
      return {
        isValid: false,
        message: 'لا يمكن أن تبدأ أو تنتهي أو تتتالى النقاط الفاصلة (.) في رمز الأصل',
      };
    }
    const digitsOnly = clean.replace(/\./g, '');
    if (digitsOnly.length >= 8 && digitsOnly.length <= 11) {
      return { isValid: true, type: 'dotted_12' };
    }
  }

  return {
    isValid: false,
    message: 'صيغة غير مطابقة: يجب أن يتكون رمز الأصل إما من 10 أرقام متصلة (مثال: 1002030405) أو 12 خانة مع النقاط الفاصلة (مثال: 10.02.03.0405)',
  };
}

/**
 * Checks for uniqueness across existing units in the system
 */
export function checkFixedAssetCodeUniqueness(
  code: string,
  existingUnits: UnitAsset[] = [],
  currentUnitCode?: string
): { isUnique: boolean; conflictUnit?: UnitAsset; message?: string } {
  const clean = (code || '').trim();
  if (!clean) return { isUnique: true };

  const conflict = existingUnits.find(
    (u) =>
      u.code !== currentUnitCode &&
      u.fixedAssetCode &&
      u.fixedAssetCode.trim().toLowerCase() === clean.toLowerCase()
  );

  if (conflict) {
    return {
      isUnique: false,
      conflictUnit: conflict,
      message: `رمز الأصل (${clean}) مستخدم مسبقاً للمنشأة "${conflict.name}" (${conflict.code})، ويجب أن يكون الرمز فريداً لكل وحدة وغير قابل للتكرار`,
    };
  }

  return { isUnique: true };
}

/**
 * Formats a 10-digit number into standard 12-char dotted format (10.XX.XX.XXXX)
 */
export function formatToDottedAssetCode(digitsOnly: string): string {
  const raw = digitsOnly.replace(/[^0-9]/g, '').slice(0, 10);
  if (raw.length === 10) {
    return `${raw.slice(0, 2)}.${raw.slice(2, 4)}.${raw.slice(4, 6)}.${raw.slice(6, 10)}`;
  }
  return raw;
}
