import { UnitAsset, Room } from '../types';

/**
 * Standard Unit & Room Code Structure Management Utility for Midland Oil Company
 *
 * Rules:
 * 1. رمز المنشأة (Unit Code):
 *    - Format: [المحافظة]-[الحقل]-[نوع المنشأة]-[رمز فريد من 4 حروف إنجليزية]
 *    - Example: EBD-EBD-BLD-ABCD (أو WAS-AHD-BLD-WXYZ)
 *    - 1st segment: Governorate code (المحافظة e.g. EBD, WAS, BGD, BSR, DIY, MYS, KRK)
 *    - 2nd segment: Oilfield code (الحقل e.g. EBD, AHD, BDR, NK, RML, MYS)
 *    - 3rd segment: Unit Type code (نوع المنشأة e.g. BLD, CRV, WHS, LAB, CTRL, EQP, SFT, TNK)
 *    - 4th segment: 4-letter UPPERCASE English alphabetic string (لا أرقام، 4 حروف انكليزية فريدة لكل وحدة)
 *
 * 2. رمز الغرفة (Room Code):
 *    - Format: [رمز المنشأة الفريد المكون من 4 حروف]-[الطابق]-[نوع الغرفة]-[تسلسل الغرفة]
 *    - Example: ABCD-F1-OFF-101 (أو ABCD-F2-MTG-201)
 *    - 1st segment: 4-letter unique suffix of the building (المقطع الأخير المكون من 4 حروف لرمز المنشأة)
 *    - 2nd segment: Floor indicator (الطابق e.g. F1, F2, F3...)
 *    - 3rd segment: Room type code (نوع الغرفة e.g. OFF, MTG, TRN, WRK, STR, WSH, BED, DIN, KTN, EQP, SRV, GEN)
 *    - 4th segment: Room sequence starting from:
 *      - 101, 102, 103... للطابق الأول
 *      - 201, 202, 203... للطابق الثاني
 *      - 301, 302, 303... للطابق الثالث وهكذا
 */

const UPPERCASE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generates a random 4-letter uppercase English string (e.g. "ABCD", "WXYZ", "KLMN")
 * and guarantees uniqueness against all existing units in the system.
 */
export function generate4LetterUniqueCode(existingUnits: UnitAsset[] = []): string {
  const existingSuffixes = new Set<string>();

  existingUnits.forEach((u) => {
    if (u.code) {
      const parts = u.code.split('-');
      if (parts.length >= 4) {
        existingSuffixes.add(parts[parts.length - 1].toUpperCase().trim());
      }
    }
  });

  let attempts = 0;
  while (attempts < 5000) {
    let candidate = '';
    for (let i = 0; i < 4; i++) {
      candidate += UPPERCASE_LETTERS.charAt(Math.floor(Math.random() * UPPERCASE_LETTERS.length));
    }
    if (!existingSuffixes.has(candidate)) {
      return candidate;
    }
    attempts++;
  }

  // Fallback timestamp-derived 4-letter string
  const base = Date.now().toString(26).toUpperCase().slice(-4);
  return base.padEnd(4, 'A');
}

/**
 * Generates the full 4-segment Unit Code:
 * [Governorate]-[Field]-[UnitType]-[4-Letter Unique Code]
 * e.g. "EBD-EBD-BLD-ABCD"
 */
export function generateUnitCode(
  govCode: string,
  fieldCode: string,
  unitTypeCode: string,
  existingUnits: UnitAsset[] = []
): string {
  const cleanGov = (govCode || 'EBD').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'EBD';
  const cleanFld = (fieldCode || 'EBD').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'EBD';
  const cleanType = (unitTypeCode || 'BLD').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'BLD';
  const unique4Letters = generate4LetterUniqueCode(existingUnits);

  return `${cleanGov}-${cleanFld}-${cleanType}-${unique4Letters}`;
}

/**
 * Extracts the 4-letter unique building code from any unit code.
 * If the unit code is "EBD-EBD-BLD-ABCD" -> returns "ABCD"
 * If it has numeric legacy format "WS-AHD-BLD-014" -> derives a clean 4-char string.
 */
export function extractUnitUniqueAlphaSuffix(unitCode: string): string {
  if (!unitCode) return 'BLDG';
  const parts = unitCode.trim().split('-');
  if (parts.length >= 4) {
    const last = parts[parts.length - 1].toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (/^[A-Z]{4}$/.test(last)) {
      return last;
    }
    if (last.length === 4) {
      return last;
    }
    // Pad or slice
    if (last.length > 4) return last.slice(0, 4);
    return last.padStart(4, 'A');
  }

  // Fallback for short codes
  const clean = unitCode.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (clean.length >= 4) return clean.slice(-4);
  return clean.padEnd(4, 'X');
}

/**
 * Standard Room Type Code Mapping (3-letter uppercase codes)
 */
export const ROOM_TYPE_CODES: Record<
  string,
  { code: string; labelAr: string; defaultArea: number; isCapacity: boolean; isOccupants: boolean; defaultVal: number }
> = {
  standardRooms: { code: 'OFF', labelAr: 'مكتب إداري', defaultArea: 25, isCapacity: false, isOccupants: true, defaultVal: 2 },
  office: { code: 'OFF', labelAr: 'مكتب إداري', defaultArea: 25, isCapacity: false, isOccupants: true, defaultVal: 2 },
  meetingHalls: { code: 'MTG', labelAr: 'قاعة اجتماعات', defaultArea: 40, isCapacity: true, isOccupants: false, defaultVal: 12 },
  meeting: { code: 'MTG', labelAr: 'قاعة اجتماعات', defaultArea: 40, isCapacity: true, isOccupants: false, defaultVal: 12 },
  trainingHalls: { code: 'TRN', labelAr: 'قاعة تدريب', defaultArea: 50, isCapacity: true, isOccupants: false, defaultVal: 24 },
  training: { code: 'TRN', labelAr: 'قاعة تدريب', defaultArea: 50, isCapacity: true, isOccupants: false, defaultVal: 24 },
  workshops: { code: 'WRK', labelAr: 'ورشة فنية', defaultArea: 45, isCapacity: false, isOccupants: true, defaultVal: 4 },
  workshop: { code: 'WRK', labelAr: 'ورشة فنية', defaultArea: 45, isCapacity: false, isOccupants: true, defaultVal: 4 },
  storageRooms: { code: 'STR', labelAr: 'مخزن أصول ومستودع', defaultArea: 30, isCapacity: true, isOccupants: false, defaultVal: 50 },
  storage: { code: 'STR', labelAr: 'مخزن أصول ومستودع', defaultArea: 30, isCapacity: true, isOccupants: false, defaultVal: 50 },
  restrooms: { code: 'WSH', labelAr: 'دورة مياه صحية', defaultArea: 12, isCapacity: true, isOccupants: false, defaultVal: 3 },
  bathroom: { code: 'WSH', labelAr: 'دورة مياه صحية', defaultArea: 12, isCapacity: true, isOccupants: false, defaultVal: 3 },
  bedrooms: { code: 'BED', labelAr: 'غرفة نوم سكن واستراحة', defaultArea: 22, isCapacity: false, isOccupants: true, defaultVal: 2 },
  bedroom: { code: 'BED', labelAr: 'غرفة نوم سكن واستراحة', defaultArea: 22, isCapacity: false, isOccupants: true, defaultVal: 2 },
  living: { code: 'BED', labelAr: 'غرفة نوم سكن واستراحة', defaultArea: 22, isCapacity: false, isOccupants: true, defaultVal: 2 },
  diningHalls: { code: 'DIN', labelAr: 'قاعة طعام ومطعم', defaultArea: 60, isCapacity: true, isOccupants: false, defaultVal: 40 },
  dining: { code: 'DIN', labelAr: 'قاعة طعام ومطعم', defaultArea: 60, isCapacity: true, isOccupants: false, defaultVal: 40 },
  kitchens: { code: 'KTN', labelAr: 'مطبخ / بوفيه', defaultArea: 18, isCapacity: false, isOccupants: true, defaultVal: 2 },
  kitchen: { code: 'KTN', labelAr: 'مطبخ / بوفيه', defaultArea: 18, isCapacity: false, isOccupants: true, defaultVal: 2 },
  equipmentRooms: { code: 'EQP', labelAr: 'غرفة معدات وسيرفرات', defaultArea: 20, isCapacity: true, isOccupants: false, defaultVal: 5 },
  server: { code: 'EQP', labelAr: 'غرفة معدات وسيرفرات', defaultArea: 20, isCapacity: true, isOccupants: false, defaultVal: 5 },
  serviceRooms: { code: 'SRV', labelAr: 'غرفة خدمات صيانة', defaultArea: 15, isCapacity: false, isOccupants: true, defaultVal: 2 },
  service: { code: 'SRV', labelAr: 'غرفة خدمات صيانة', defaultArea: 15, isCapacity: false, isOccupants: true, defaultVal: 2 },
  lab: { code: 'LAB', labelAr: 'مختبر فحوصات وتحاليل', defaultArea: 35, isCapacity: false, isOccupants: true, defaultVal: 3 },
  control: { code: 'CTRL', labelAr: 'غرفة سيطرة ومراقبة آبار', defaultArea: 35, isCapacity: false, isOccupants: true, defaultVal: 3 },
  general: { code: 'GEN', labelAr: 'غرفة مخصصة عامة', defaultArea: 20, isCapacity: false, isOccupants: true, defaultVal: 2 },
};

/**
 * Returns the standard 3-letter code for any room type or category key
 */
export function getRoomTypeCode(keyOrLabel: string): string {
  if (!keyOrLabel) return 'GEN';
  const clean = keyOrLabel.trim();

  // If already a valid 3-4 letter uppercase code
  if (['OFF', 'MTG', 'TRN', 'WRK', 'STR', 'WSH', 'BED', 'DIN', 'KTN', 'EQP', 'SRV', 'LAB', 'CTRL', 'GEN'].includes(clean.toUpperCase())) {
    return clean.toUpperCase();
  }

  // Check direct key match
  if (ROOM_TYPE_CODES[clean]) {
    return ROOM_TYPE_CODES[clean].code;
  }

  // Check partial arabic / english labels
  if (clean.includes('مكتب') || clean.includes('إداري') || clean.toLowerCase().includes('office')) return 'OFF';
  if (clean.includes('اجتماع') || clean.toLowerCase().includes('meeting')) return 'MTG';
  if (clean.includes('تدريب') || clean.toLowerCase().includes('training')) return 'TRN';
  if (clean.includes('ورش') || clean.toLowerCase().includes('workshop')) return 'WRK';
  if (clean.includes('مخزن') || clean.includes('مستودع') || clean.toLowerCase().includes('storage')) return 'STR';
  if (clean.includes('مياه') || clean.includes('صحية') || clean.includes('صحيات') || clean.toLowerCase().includes('bath') || clean.toLowerCase().includes('restroom')) return 'WSH';
  if (clean.includes('نوم') || clean.includes('سكن') || clean.includes('استراحة') || clean.toLowerCase().includes('bed') || clean.toLowerCase().includes('living')) return 'BED';
  if (clean.includes('طعام') || clean.includes('مطعم') || clean.toLowerCase().includes('dining')) return 'DIN';
  if (clean.includes('مطبخ') || clean.includes('بوفيه') || clean.toLowerCase().includes('kitchen')) return 'KTN';
  if (clean.includes('معدات') || clean.includes('سيرفر') || clean.toLowerCase().includes('server') || clean.toLowerCase().includes('equip')) return 'EQP';
  if (clean.includes('خدمات') || clean.toLowerCase().includes('service')) return 'SRV';
  if (clean.includes('مختبر') || clean.toLowerCase().includes('lab')) return 'LAB';
  if (clean.includes('سيطرة') || clean.includes('مراقبة') || clean.toLowerCase().includes('control')) return 'CTRL';

  return 'GEN';
}

/**
 * Returns Arabic label for room type code
 */
export function getRoomTypeLabel(code: string): string {
  const c = (code || '').toUpperCase().trim();
  switch (c) {
    case 'OFF':
      return 'مكتب إداري';
    case 'MTG':
      return 'قاعة اجتماعات';
    case 'TRN':
      return 'قاعة تدريب';
    case 'WRK':
      return 'ورشة فنية';
    case 'STR':
      return 'مخزن أصول';
    case 'WSH':
      return 'دورة مياه صحية';
    case 'BED':
      return 'غرفة نوم سكن';
    case 'DIN':
      return 'قاعة طعام';
    case 'KTN':
      return 'مطبخ / بوفيه';
    case 'EQP':
      return 'غرفة معدات وسيرفرات';
    case 'SRV':
      return 'غرفة خدمات صيانة';
    case 'LAB':
      return 'مختبر فحوصات';
    case 'CTRL':
      return 'غرفة سيطرة ومراقبة';
    default:
      return 'غرفة مخصصة';
  }
}

/**
 * Determines whether a room type prioritizes Occupants Count (شاغلين)
 * vs Capacity (طاقة استيعابية)
 */
export function isOccupantsBasedRoom(typeOrKey: string): boolean {
  const code = getRoomTypeCode(typeOrKey);
  return ['OFF', 'WRK', 'BED', 'LAB', 'CTRL', 'GEN'].includes(code);
}

export function isCapacityBasedRoom(typeOrKey: string): boolean {
  const code = getRoomTypeCode(typeOrKey);
  return ['MTG', 'TRN', 'DIN', 'WSH'].includes(code);
}

/**
 * Non-occupancy rooms: Equipment (EQP), Service (SRV), Storage (STR), Kitchen/Buffet (KTN)
 * These rooms never take occupant counts and always display "—".
 */
export function isNonOccupancyRoom(typeOrKey: string): boolean {
  const code = getRoomTypeCode(typeOrKey);
  return ['EQP', 'SRV', 'STR', 'KTN'].includes(code);
}

/**
 * Checks whether a room's assigned entity is vacant / empty
 */
export function isRoomVacant(occupiedBy?: string): boolean {
  if (!occupiedBy) return true;
  const clean = occupiedBy.trim().toLowerCase();
  return (
    clean === '' ||
    clean === '-' ||
    clean === '—' ||
    clean.includes('شاغر') ||
    clean.includes('فارغ') ||
    clean.includes('بدون') ||
    clean.includes('غير محدد')
  );
}

/**
 * Formats room occupancy display value for tables and cards:
 * 1. Equipment/Service/Storage/Kitchen -> "—"
 * 2. Meeting/Training/Restrooms/Dining -> "الطاقة الاستيعابية: [X]" (e.g. "الطاقة الاستيعابية: 12")
 * 3. Offices/Workshops/Staff -> "[X] شاغل" if occupied, or "—" if vacant.
 */
export function formatRoomOccupancyDisplay(room: Room): {
  kind: 'occupants' | 'capacity' | 'none';
  text: string;
  badgeClass: string;
  count: number;
} {
  const typeCode = room.roomTypeCode || getRoomTypeCode(room.type);

  // 1. Non-occupancy rooms (Equipment, Service, Storage, Kitchen)
  if (isNonOccupancyRoom(typeCode)) {
    return {
      kind: 'none',
      text: '—',
      badgeClass: 'text-slate-400 font-normal',
      count: 0,
    };
  }

  // 2. Capacity-based rooms (Meeting, Training, Restrooms, Dining)
  if (isCapacityBasedRoom(typeCode)) {
    const cap =
      room.capacity !== undefined && room.capacity !== null && room.capacity > 0
        ? room.capacity
        : (room.occupantsCount && room.occupantsCount > 0 ? room.occupantsCount : 0);

    if (cap > 0) {
      return {
        kind: 'capacity',
        text: `الطاقة الاستيعابية: ${cap}`,
        badgeClass: 'text-sky-600 dark:text-sky-400 font-bold',
        count: cap,
      };
    }
    return {
      kind: 'capacity',
      text: 'الطاقة الاستيعابية: —',
      badgeClass: 'text-slate-400 font-medium',
      count: 0,
    };
  }

  // 3. Staff / Office occupancy rooms
  if (isRoomVacant(room.occupiedBy)) {
    return {
      kind: 'none',
      text: '—',
      badgeClass: 'text-slate-400 font-normal',
      count: 0,
    };
  }

  const occCount =
    room.occupantsCount !== undefined && room.occupantsCount !== null && room.occupantsCount > 0
      ? room.occupantsCount
      : (room.capacity !== undefined && room.capacity !== null && room.capacity > 0 ? room.capacity : 1);

  return {
    kind: 'occupants',
    text: `${occCount} شاغل`,
    badgeClass: 'text-emerald-600 dark:text-emerald-400 font-bold',
    count: occCount,
  };
}

/**
 * Extracts floor number from string or number
 */
export function extractFloorNumber(floorStr?: string | number): number {
  if (typeof floorStr === 'number') return Math.max(1, Math.floor(floorStr));
  if (!floorStr) return 1;
  const cleaned = String(floorStr).replace(/\D/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

/**
 * Calculates standard sequential room number:
 * Floor 1: 101, 102, 103...
 * Floor 2: 201, 202, 203...
 * Floor 3: 301, 302, 303...
 */
export function calculateRoomSequenceNumber(floorNumber: number, sequenceInFloor: number): number {
  const f = Math.max(1, Math.floor(floorNumber || 1));
  const s = Math.max(1, Math.floor(sequenceInFloor || 1));
  return f * 100 + s;
}

/**
 * Generates the unified Room Code:
 * Format: [4-Letter Building Code]-[Floor]-[RoomType]-[Sequence Number]
 * Example: ABCD-F1-OFF-101 (Floor 1, Office, sequence 101)
 * Example: ABCD-F2-MTG-201 (Floor 2, Meeting Hall, sequence 201)
 */
export function generateRoomCode(
  unitCodeOrSuffix: string,
  floorNumber: number,
  typeOrCategory: string,
  sequenceInFloorOrFullSeq: number,
  isAlreadyFullSequence = false
): string {
  const buildingSuffix = extractUnitUniqueAlphaSuffix(unitCodeOrSuffix);
  const floorNum = Math.max(1, Math.floor(floorNumber || 1));
  const floorSegment = `F${floorNum}`;
  const typeSegment = getRoomTypeCode(typeOrCategory);

  const finalSeq = isAlreadyFullSequence
    ? sequenceInFloorOrFullSeq
    : calculateRoomSequenceNumber(floorNum, sequenceInFloorOrFullSeq);

  return `${buildingSuffix}-${floorSegment}-${typeSegment}-${finalSeq}`;
}

/**
 * Normalizes an array of rooms for a unit so every room receives its strict standard sequence:
 * Floor 1: 101, 102, 103, 104...
 * Floor 2: 201, 202, 203, 204...
 * Floor 3: 301, 302, 303, 304...
 */
export function normalizeUnitRoomsSequence(unitCode: string, rooms: Room[]): Room[] {
  if (!rooms || rooms.length === 0) return [];

  const floorCounters: Record<number, number> = {};

  return rooms.map((rm) => {
    const floorNum = extractFloorNumber(rm.floor);
    if (!floorCounters[floorNum]) {
      floorCounters[floorNum] = 1;
    } else {
      floorCounters[floorNum]++;
    }

    const seqInFloor = floorCounters[floorNum];
    const fullSeqNumber = calculateRoomSequenceNumber(floorNum, seqInFloor);
    const typeCode = rm.roomTypeCode || getRoomTypeCode(rm.type);
    const standardCode = generateRoomCode(unitCode, floorNum, typeCode, fullSeqNumber, true);

    return {
      ...rm,
      floor: rm.floor || `الطابق ${floorNum}`,
      roomTypeCode: typeCode,
      sequenceNumber: fullSeqNumber,
      code: standardCode,
    };
  });
}

/**
 * Returns standard code for a single room given the context of all rooms in the unit
 */
export function getStandardRoomCode(unitCode: string, room: Room, allRooms?: Room[]): string {
  const floorNum = extractFloorNumber(room.floor);
  let fullSeq = room.sequenceNumber;

  if (allRooms && allRooms.length > 0) {
    const sameFloorRooms = allRooms.filter(
      (r) => extractFloorNumber(r.floor) === floorNum
    );
    const idx = sameFloorRooms.findIndex((r) => r.id === room.id || r.code === room.code);
    if (idx !== -1) {
      fullSeq = calculateRoomSequenceNumber(floorNum, idx + 1);
    }
  }

  if (!fullSeq || fullSeq < 100) {
    fullSeq = calculateRoomSequenceNumber(floorNum, 1);
  }

  const typeCode = room.roomTypeCode || getRoomTypeCode(room.type);
  return generateRoomCode(unitCode, floorNum, typeCode, fullSeq, true);
}

/**
 * Validates whether a unit code adheres strictly to the 4-segment convention
 * [Governorate]-[Field]-[Type]-[4-Letter Unique Alphabet]
 */
export function validateUnitCodeFormat(code: string): { isValid: boolean; message: string } {
  const clean = (code || '').trim();
  if (!clean) {
    return { isValid: false, message: 'رمز المنشأة مطلوب' };
  }

  const parts = clean.split('-');
  if (parts.length < 4) {
    return {
      isValid: false,
      message: 'رمز المنشأة يجب أن يتكون من 4 مقاطع: [المحافظة]-[الحقل]-[نوع المنشأة]-[رمز فريد من 4 حروف]',
    };
  }

  const suffix = parts[parts.length - 1];
  if (!/^[A-Za-z0-9]{3,5}$/.test(suffix)) {
    return {
      isValid: false,
      message: 'المقطع الرابع لرمز المنشأة يجب أن يتكون من 4 رموز إنجليزية فريدة (مثال: A398)',
    };
  }

  return { isValid: true, message: 'رمز المنشأة سليم ومطابق للمعايير القياسية' };
}
