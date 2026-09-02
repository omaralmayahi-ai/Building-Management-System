import { UnitAsset } from '../types';

/**
 * Utility functions for Fixed Asset Accounting Codes (رمز الأصل في سجلات أصول الشركة)
 *
 * Rules:
 * - (حقل اختياري / فريد): Optional field, but if entered it MUST be unique across all units.
 * - للأبنية (Buildings): 0123456789 (أرقام بدون فواصل)
 * - للكرفانات (Caravans): 123.1234.123 (أرقام مع فواصل / نقاط)
 * - اعتماد هذا الفورمات كتقييم لحالة إدخال رمز الأصل ومطابقته للتنسيق المثالي.
 */

export type AssetCodeFormatType = 'building_continuous' | 'caravan_dotted' | 'invalid';

export interface AssetCodeValidationResult {
  isValid: boolean;
  isIdeal: boolean;
  formatType: AssetCodeFormatType;
  message: string;
  badgeText: string;
  badgeVariant: 'success' | 'warning' | 'error';
}

/**
 * Cleans and filters input to only allow English digits and dot (.)
 */
export function cleanFixedAssetCodeInput(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString())
    .replace(/[۰-۹]/g, (d) => (d.charCodeAt(0) - 1776).toString())
    .replace(/[^0-9.]/g, '')
    .slice(0, 20);
}

/**
 * Validates and evaluates the Fixed Asset Code against ideal formatting rules:
 * - 0123456789 / أرقام بدون فواصل للأبنية
 * - 123.1234.123 / أرقام مع فواصل للكرفانات
 */
export function validateFixedAssetCodeFormat(
  code: string,
  unitType?: 'building' | 'caravan' | string
): AssetCodeValidationResult {
  const clean = (code || '').trim();
  if (!clean) {
    return {
      isValid: false,
      isIdeal: false,
      formatType: 'invalid',
      message: 'يرجى إدخال رمز الأصل المثبت في سجلات الشركة (أو تركه فارغاً لأنه اختياري)',
      badgeText: 'رمز فارغ',
      badgeVariant: 'warning',
    };
  }

  // Check character validity
  if (!/^[0-9.]+$/.test(clean)) {
    return {
      isValid: false,
      isIdeal: false,
      formatType: 'invalid',
      message: 'رمز الأصل يجب أن يتكون من أرقام إنجليزية ورمز النقطة الفاصلة (.) فقط دون رموز أخرى',
      badgeText: 'رموز غير صالحة',
      badgeVariant: 'error',
    };
  }

  // Check dots positions
  if (clean.startsWith('.') || clean.endsWith('.') || clean.includes('..')) {
    return {
      isValid: false,
      isIdeal: false,
      formatType: 'invalid',
      message: 'تنسيق غير سليم: لا يمكن أن تبدأ أو تنتهي أو تتتالى النقاط الفاصلة (.) في رمز الأصل',
      badgeText: 'نقاط غير منتظمة',
      badgeVariant: 'error',
    };
  }

  const isContinuous = /^\d+$/.test(clean);
  const isDotted = clean.includes('.') && /^\d+(\.\d+)+$/.test(clean);

  // Normalize unitType
  const isBuilding = unitType === 'building';
  const isCaravan = unitType === 'caravan';

  // 1. Building context
  if (isBuilding) {
    if (isContinuous) {
      return {
        isValid: true,
        isIdeal: true,
        formatType: 'building_continuous',
        message: 'مطابق للتنسيق المثالي للأبنية (أرقام بدون فواصل: 0123456789)',
        badgeText: 'تنسيق مثالي للأبنية (أرقام بدون فواصل)',
        badgeVariant: 'success',
      };
    }
    if (isDotted) {
      return {
        isValid: true,
        isIdeal: false,
        formatType: 'caravan_dotted',
        message: 'تنبيه تقييم: تم إدخال أرقام مع فواصل (تنسيق الكرفانات)، بينما التنسيق المثالي للأبنية هو أرقام بدون فواصل (مثال: 0123456789)',
        badgeText: 'مقبول (تنسيق كرفانات منقط)',
        badgeVariant: 'warning',
      };
    }
  }

  // 2. Caravan context
  if (isCaravan) {
    if (isDotted) {
      return {
        isValid: true,
        isIdeal: true,
        formatType: 'caravan_dotted',
        message: 'مطابق للتنسيق المثالي للكرفانات (أرقام مع فواصل: 123.1234.123)',
        badgeText: 'تنسيق مثالي للكرفانات (أرقام مع فواصل)',
        badgeVariant: 'success',
      };
    }
    if (isContinuous) {
      return {
        isValid: true,
        isIdeal: false,
        formatType: 'building_continuous',
        message: 'تنبيه تقييم: تم إدخال أرقام بدون فواصل (تنسيق الأبنية)، بينما التنسيق المثالي للكرفانات هو أرقام مع فواصل (مثال: 123.1234.123)',
        badgeText: 'مقبول (تنسيق أبنية بدون فواصل)',
        badgeVariant: 'warning',
      };
    }
  }

  // 3. Generic context (unitType not specified)
  if (isContinuous) {
    return {
      isValid: true,
      isIdeal: true,
      formatType: 'building_continuous',
      message: 'مطابق لتنسيق الأبنية القياسي (أرقام بدون فواصل: 0123456789)',
      badgeText: 'تنسيق الأبنية (أرقام بدون فواصل)',
      badgeVariant: 'success',
    };
  }

  if (isDotted) {
    return {
      isValid: true,
      isIdeal: true,
      formatType: 'caravan_dotted',
      message: 'مطابق لتنسيق الكرفانات القياسي (أرقام مع فواصل: 123.1234.123)',
      badgeText: 'تنسيق الكرفانات (أرقام مع فواصل)',
      badgeVariant: 'success',
    };
  }

  return {
    isValid: false,
    isIdeal: false,
    formatType: 'invalid',
    message: 'تنسيق غير معتمد: يجب أن يكون رمز الأصل إما أرقاماً بدون فواصل للأبنية (مثال: 0123456789) أو أرقاماً مع فواصل للكرفانات (مثال: 123.1234.123)',
    badgeText: 'غير مطابق للتنسيق',
    badgeVariant: 'error',
  };
}

/**
 * Checks for uniqueness across existing units in the system
 */
export function checkFixedAssetCodeUniqueness(
  code: string,
  existingUnits: UnitAsset[] = [],
  currentUnitCodeOrId?: string
): { isUnique: boolean; conflictUnit?: UnitAsset; message?: string } {
  const clean = (code || '').trim();
  if (!clean) return { isUnique: true };

  const conflict = existingUnits.find(
    (u) =>
      (u.code !== currentUnitCodeOrId && u.id !== currentUnitCodeOrId) &&
      u.fixedAssetCode &&
      u.fixedAssetCode.trim().toLowerCase() === clean.toLowerCase()
  );

  if (conflict) {
    return {
      isUnique: false,
      conflictUnit: conflict,
      message: `رمز الأصل (${clean}) مسجل ومستخدم مسبقاً للمنشأة "${conflict.name}" (${conflict.code})، ويجب أن يكون رمز الأصل فريداً وغير قابل للتكرار`,
    };
  }

  return { isUnique: true };
}

/**
 * Converts a continuous numeric string to a standard 3-segment caravan dotted format (e.g. 123.1234.123)
 */
export function formatToCaravanDottedCode(code: string): string {
  const digits = code.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    // Format 10 digits as 123.1234.123 (3.4.3) or 2.2.2.4
    return `${digits.slice(0, 3)}.${digits.slice(3, 7)}.${digits.slice(7, 10)}`;
  }
  if (digits.length >= 6) {
    const part1 = digits.slice(0, 3);
    const part2 = digits.slice(3, Math.min(7, digits.length - 2));
    const part3 = digits.slice(Math.min(7, digits.length - 2));
    return `${part1}.${part2}.${part3}`;
  }
  return digits;
}

/**
 * Removes dots to format as continuous digits for buildings (e.g. 0123456789)
 */
export function formatToBuildingContinuousCode(code: string): string {
  return code.replace(/[^0-9]/g, '');
}

/**
 * Backward-compatible alias
 */
export function formatToDottedAssetCode(digitsOnly: string): string {
  return formatToCaravanDottedCode(digitsOnly);
}
