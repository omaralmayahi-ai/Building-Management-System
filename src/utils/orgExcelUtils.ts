import { OrgEntity, OrgLevel } from '../types';

export const ORG_LEVEL_MAP: Record<string, OrgLevel> = {
  // Arabic values
  'الشركة / المؤسسة': 'company',
  'الشركة': 'company',
  'المؤسسة': 'company',
  'مقر الشركة': 'company',
  'المدير العام': 'director_general',
  'مدير عام': 'director_general',
  'معاون المدير العام': 'deputy_director',
  'معاون مدير عام': 'deputy_director',
  'هيئة / قسم مركزي': 'central_dept',
  'هيئة': 'central_dept',
  'قسم مركزي': 'central_dept',
  'إدارة مركزية': 'central_dept',
  'مديرية': 'central_dept',
  'قسم': 'department',
  'دائرة': 'department',
  'شعبة': 'section',
  'فرع': 'section',
  'وحدة': 'unit',
  'مجموعة عمل': 'unit',
  // English keys
  'company': 'company',
  'director_general': 'director_general',
  'deputy_director': 'deputy_director',
  'central_dept': 'central_dept',
  'directorate': 'central_dept',
  'department': 'department',
  'division': 'department',
  'section': 'section',
  'unit': 'unit',
  'unit_team': 'unit',
};

export const ORG_LEVEL_LABELS: Record<OrgLevel, string> = {
  company: 'الشركة / المؤسسة',
  director_general: 'المدير العام',
  deputy_director: 'معاون المدير العام',
  central_dept: 'هيئة / قسم مركزي',
  department: 'قسم',
  section: 'شعبة',
  unit: 'وحدة',
};

export interface OrgImportRow {
  code: string;
  nameAr: string;
  nameEn?: string;
  parentCode?: string;
  level: OrgLevel;
  employeeCount: number;
  status: 'active' | 'disabled';
  isValid: boolean;
  validationError?: string;
}

/**
 * Generate CSV Template with UTF-8 BOM for Microsoft Excel
 */
export function generateOrgStructureCsvTemplate(): string {
  const headers = [
    'كود التشكيل (رمز فريد)',
    'اسم التشكيل بالعربية',
    'اسم التشكيل بالإنجليزية',
    'كود التشكيل الأب (الجهة الأم)',
    'المستوى التنظيمي',
    'عدد الموظفين (الكادر المباشر)',
    'الحالة (نشط/معطل)',
  ];

  const sampleRows = [
    ['MOC-HQ', 'شركة نفط الوسط - المقر العام', 'Midland Oil Company - HQ', '', 'الشركة / المؤسسة', '80', 'نشط'],
    ['DG-OFFICE', 'مكتب السيد المدير العام', 'Director General Office', 'MOC-HQ', 'المدير العام', '15', 'نشط'],
    ['DEP-TECH', 'معاونية الشؤون الفنية والإنتاجية', 'Technical & Production Deputy', 'DG-OFFICE', 'معاون المدير العام', '20', 'نشط'],
    ['DIR-OPS', 'هيئة العمليات والإنتاج', 'Operations & Production Directorate', 'DEP-TECH', 'هيئة / قسم مركزي', '65', 'نشط'],
    ['DEP-DRILL', 'قسم الحفر والاستصلاح', 'Drilling & Workover Department', 'DIR-OPS', 'قسم', '45', 'نشط'],
    ['SEC-AHD-01', 'شعبة حقول الأحدب وبدرة', 'Ahdeb & Badra Fields Section', 'DEP-DRILL', 'شعبة', '30', 'نشط'],
    ['UNT-LOG-01', 'وحدة الدعم والإسناد الميداني', 'Field Logistics Unit', 'SEC-AHD-01', 'وحدة', '12', 'نشط'],
  ];

  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...sampleRows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\r\n');

  return '\uFEFF' + csvContent;
}

/**
 * Generate CSV of current active Org Structure
 */
export function exportOrgEntitiesToCsv(entities: OrgEntity[]): string {
  const headers = [
    'كود التشكيل (رمز فريد)',
    'اسم التشكيل بالعربية',
    'اسم التشكيل بالإنجليزية',
    'كود التشكيل الأب (الجهة الأم)',
    'المستوى التنظيمي',
    'عدد الموظفين (الكادر المباشر)',
    'الحالة (نشط/معطل)',
  ];

  const idToCodeMap = new Map<string, string>();
  entities.forEach((e) => {
    idToCodeMap.set(e.id, e.code);
  });

  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = entities.map((e) => {
    const parentCode = e.parentId ? (idToCodeMap.get(e.parentId) || e.parentId) : '';
    const levelLabel = ORG_LEVEL_LABELS[e.level] || e.level;
    const statusLabel = e.status === 'active' ? 'نشط' : 'معطل';
    return [
      e.code,
      e.nameAr,
      e.nameEn || '',
      parentCode,
      levelLabel,
      e.employeeCount || 0,
      statusLabel,
    ];
  });

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\r\n');

  return '\uFEFF' + csvContent;
}

/**
 * Trigger browser file download
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Robust CSV parser supporting quotes, commas, semicolons, tabs, and UTF-8
 */
export function parseCsvText(text: string): string[][] {
  // Remove BOM if present
  let cleanText = text.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return [];

  // Detect delimiter: comma, semicolon, tab
  const firstLine = cleanText.split(/\r?\n/)[0] || '';
  let delimiter = ',';
  if (firstLine.includes(';') && !firstLine.includes(',')) {
    delimiter = ';';
  } else if (firstLine.includes('\t') && !firstLine.includes(',')) {
    delimiter = '\t';
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parse parsed CSV table into valid OrgEntities with code linking
 */
export function parseOrgImportRows(rawRows: string[][]): {
  rows: OrgImportRow[];
  entities: OrgEntity[];
  errorCount: number;
} {
  if (rawRows.length === 0) {
    return { rows: [], entities: [], errorCount: 0 };
  }

  // Determine if first row is header
  const firstRow = rawRows[0];
  const isHeader =
    firstRow.some(
      (cell) =>
        cell.includes('كود') ||
        cell.includes('اسم') ||
        cell.includes('Code') ||
        cell.includes('Name') ||
        cell.includes('مستوى') ||
        cell.includes('Level')
    );

  const dataRows = isHeader ? rawRows.slice(1) : rawRows;
  const parsedRows: OrgImportRow[] = [];
  const existingCodes = new Set<string>();

  dataRows.forEach((cols, idx) => {
    if (!cols || cols.length === 0 || cols.every((c) => !c.trim())) return;

    const rawCode = (cols[0] || '').trim();
    const rawNameAr = (cols[1] || '').trim();
    const rawNameEn = (cols[2] || '').trim();
    const rawParentCode = (cols[3] || '').trim();
    const rawLevel = (cols[4] || '').trim();
    const rawEmployees = (cols[5] || '').trim();
    const rawStatus = (cols[6] || '').trim();

    let isValid = true;
    let validationError = '';

    if (!rawNameAr) {
      isValid = false;
      validationError = `السطر ${idx + (isHeader ? 2 : 1)}: اسم التشكيل بالعربية مطلوب إلزامي`;
    }

    const code = rawCode || `ORG-${(idx + 1).toString().padStart(3, '0')}`;
    if (existingCodes.has(code.toUpperCase())) {
      isValid = false;
      validationError = `السطر ${idx + (isHeader ? 2 : 1)}: كود التشكيل (${code}) مكرر بالملف`;
    } else {
      existingCodes.add(code.toUpperCase());
    }

    const level: OrgLevel = ORG_LEVEL_MAP[rawLevel.toLowerCase()] || ORG_LEVEL_MAP[rawLevel] || 'department';
    const employeeCount = Math.max(0, parseInt(rawEmployees, 10) || 0);
    const status: 'active' | 'disabled' =
      rawStatus.includes('معطل') || rawStatus.toLowerCase() === 'disabled' || rawStatus.toLowerCase() === 'inactive'
        ? 'disabled'
        : 'active';

    parsedRows.push({
      code,
      nameAr: rawNameAr,
      nameEn: rawNameEn || undefined,
      parentCode: rawParentCode || undefined,
      level,
      employeeCount,
      status,
      isValid,
      validationError,
    });
  });

  // Second pass: Map codes to generated permanent IDs and link parent IDs
  const codeToIdMap = new Map<string, string>();
  parsedRows.forEach((r) => {
    codeToIdMap.set(r.code.toUpperCase(), `ORG-${r.code.replace(/[^a-zA-Z0-9_-]/g, '')}-${Date.now().toString().slice(-4)}`);
  });

  const validEntities: OrgEntity[] = parsedRows
    .filter((r) => r.isValid)
    .map((r) => {
      const id = codeToIdMap.get(r.code.toUpperCase()) || `ORG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      let parentId: string | null = null;
      if (r.parentCode) {
        parentId = codeToIdMap.get(r.parentCode.toUpperCase()) || null;
      }

      return {
        id,
        code: r.code,
        nameAr: r.nameAr,
        nameEn: r.nameEn,
        parentId,
        level: r.level,
        employeeCount: r.employeeCount,
        status: r.status,
      };
    });

  const errorCount = parsedRows.filter((r) => !r.isValid).length;

  return {
    rows: parsedRows,
    entities: validEntities,
    errorCount,
  };
}
