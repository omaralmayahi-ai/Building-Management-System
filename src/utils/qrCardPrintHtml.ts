import { UnitAsset, Room, SystemBranding } from '../types';
import { getServerDateDDMMYYYY, toArabicDigits } from './arabicUtils';
import { isRoomVacant } from './unitAndRoomCodeUtils';

export type CardPrintSize = 'compact' | 'medium' | 'full';

export type CardPlacementA6 =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'center'
  | 'four-copies';

export type CardPlacementA5 = 'top' | 'bottom' | 'center' | 'two-copies';

export type CardPlacement = CardPlacementA6 | CardPlacementA5;

interface CommonCardData {
  countryMinistryHeader: string;
  companyName: string;
  systemName: string;
  qrDataUrl: string;
  dateStr: string;
}

/**
 * Helper to split and clean occupying entities into a unique string list
 */
export function extractOccupyingList(
  input?: string | string[] | Array<{ occupiedBy?: string }>,
  additionalRooms?: Array<{ occupiedBy?: string }>
): string[] {
  const sources: string[] = [];
  if (typeof input === 'string' && input) {
    sources.push(input);
  } else if (Array.isArray(input)) {
    for (const item of input) {
      if (typeof item === 'string') sources.push(item);
      else if (item && typeof item === 'object' && item.occupiedBy) sources.push(item.occupiedBy);
    }
  }
  if (Array.isArray(additionalRooms)) {
    for (const r of additionalRooms) {
      if (r?.occupiedBy) sources.push(r.occupiedBy);
    }
  }

  const seen = new Set<string>();
  const list: string[] = [];

  for (const raw of sources) {
    if (!raw) continue;
    const parts = raw.split(/[،,\n;\t•]+/);
    for (const part of parts) {
      const trimmed = part.trim().replace(/\s+/g, ' ');
      if (!trimmed || trimmed === '-' || trimmed === '—' || trimmed === 'غير محدد') continue;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(trimmed);
      }
    }
  }

  return list.length > 0 ? list : ['غير محدد'];
}

/**
 * Renders occupying entities as small individual cards/badges arranged horizontally & vertically
 */
export function renderOccupantsBadgesHtml(
  entities: string[],
  cardSize: 'compact' | 'medium' | 'full' = 'full'
): string {
  const badgeClass =
    cardSize === 'compact'
      ? 'occupant-badge-c'
      : cardSize === 'medium'
      ? 'occupant-badge-m'
      : 'occupant-badge-f';

  const iconSvg =
    cardSize === 'compact'
      ? `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v8h4"/><path d="M18 9h2a2 2 0 0 1 2 2v11h-4"/></svg>`
      : cardSize === 'medium'
      ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v8h4"/><path d="M18 9h2a2 2 0 0 1 2 2v11h-4"/></svg>`
      : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v8h4"/><path d="M18 9h2a2 2 0 0 1 2 2v11h-4"/></svg>`;

  return `
    <div class="occupant-badges-wrap ${cardSize}">
      ${entities
        .map(
          (entity) => `
        <div class="${badgeClass}">
          <span class="badge-icon">${iconSvg}</span>
          <span class="badge-text">${entity}</span>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

/**
 * Generates the compact A6 HTML for a single Room card
 */
export function generateCompactRoomCardHtml(
  unit: UnitAsset,
  room: Room,
  roomCode: string,
  common: CommonCardData,
  options?: { isStandalone?: boolean }
): string {
  const isVacant = isRoomVacant(room.occupiedBy);
  const occupantList = isVacant ? ['شاغرة'] : extractOccupyingList(room.occupiedBy);
  const floor = room.floor ?? '1';

  return `
    <div class="card-compact-room">
      <div class="c-header">
        <div class="c-hdr-ministry">${common.countryMinistryHeader}</div>
        <div class="c-hdr-company">${common.companyName}</div>
        <div class="c-hdr-system">${common.systemName}</div>
        <div class="c-hdr-tag">بطاقة تعريف وترقيم الغرفة (QR)</div>
      </div>

      <div class="c-qr-wrap">
        <img class="c-qr-img" src="${common.qrDataUrl}" alt="QR" />
      </div>

      <div class="c-table">
        <div class="c-row c-alt">
          <span class="c-lbl">اسم المنشأة:</span>
          <span class="c-val c-bold c-truncate">${unit.name}</span>
        </div>
        <div class="c-row">
          <span class="c-lbl">رمز المنشأة:</span>
          <span class="c-val c-mono c-blue">${unit.code}</span>
        </div>
        <div class="c-row c-alt">
          <span class="c-lbl">رمز الأصل:</span>
          <span class="c-val c-mono c-purple">${unit.fixedAssetCode || 'غير مسجل'}</span>
        </div>
        <div class="c-row">
          <span class="c-lbl">رقم الطابق:</span>
          <span class="c-val c-green c-bold">${floor}</span>
        </div>
        <div class="c-row c-highlight">
          <span class="c-lbl c-amber">رمز الغرفة:</span>
          <span class="c-val c-mono c-amber c-bold-lg">${roomCode}</span>
        </div>
        <div class="c-row c-row-occupants c-alt">
          <div class="c-occupants-hdr">
            <span class="c-lbl">الجهة الشاغلة:</span>
            ${occupantList.length > 1 ? `<span class="c-occupants-cnt">${occupantList.length}</span>` : ''}
          </div>
          ${renderOccupantsBadgesHtml(occupantList, 'compact')}
        </div>
      </div>

      <div class="c-footer">
        <span>تاريخ الإصدار: ${common.dateStr}</span>
      </div>
    </div>
  `;
}

/**
 * Generates the compact A6 HTML for a single Unit card
 */
export function generateCompactUnitCardHtml(
  unit: UnitAsset,
  occupyingDisplay: string | string[],
  common: CommonCardData,
  occupyingListInput?: string[]
): string {
  const coords = unit.coordinates ? `${unit.coordinates.lat}°, ${unit.coordinates.lng}°` : 'غير محدد';
  const area = unit.totalAreaSqM ? `${unit.totalAreaSqM} م²` : 'غير محدد';
  const occupantList = occupyingListInput && occupyingListInput.length > 0
    ? occupyingListInput
    : extractOccupyingList(occupyingDisplay, unit.rooms);

  return `
    <div class="card-compact-unit">
      <div class="c-header">
        <div class="c-hdr-ministry">${common.countryMinistryHeader}</div>
        <div class="c-hdr-company">${common.companyName}</div>
        <div class="c-hdr-system">${common.systemName}</div>
        <div class="c-hdr-tag">لوحة التعريف الميدانية ورمز الوصول السريع (QR)</div>
      </div>

      <div class="c-code-box-wrap">
        <span class="c-code-lbl">رمز المنشأة</span>
        <div class="c-code-box">${unit.code}</div>
      </div>

      <div class="c-qr-wrap">
        <img class="c-qr-img" src="${common.qrDataUrl}" alt="Unit QR" />
      </div>

      <div class="c-table">
        <div class="c-row c-alt">
          <span class="c-lbl">اسم المنشأة:</span>
          <span class="c-val c-bold c-truncate">${unit.name}</span>
        </div>
        <div class="c-row">
          <span class="c-lbl">رمز الأصل:</span>
          <span class="c-val c-mono c-purple">${unit.fixedAssetCode || 'غير مسجل'}</span>
        </div>
        <div class="c-row c-alt">
          <span class="c-lbl">الموقع الميداني:</span>
          <span class="c-val c-amber c-bold">${unit.governorate} • ${unit.field}</span>
        </div>
        <div class="c-row">
          <span class="c-lbl">المساحة / الطوابق:</span>
          <span class="c-val c-green">${area} (ط ${unit.floorsCount || 1})</span>
        </div>
        <div class="c-row c-alt">
          <span class="c-lbl">الإحداثيات:</span>
          <span class="c-val c-mono c-blue c-truncate">${coords}</span>
        </div>
        <div class="c-row c-row-occupants">
          <div class="c-occupants-hdr">
            <span class="c-lbl">الجهات الشاغلة:</span>
            ${occupantList.length > 1 ? `<span class="c-occupants-cnt">${occupantList.length}</span>` : ''}
          </div>
          ${renderOccupantsBadgesHtml(occupantList, 'compact')}
        </div>
      </div>

      <div class="c-footer">
        <span>تاريخ الطباعة: ${common.dateStr}</span>
      </div>
    </div>
  `;
}

/**
 * Generates the Medium (A5) HTML for a single Room card
 */
export function generateMediumRoomCardHtml(
  unit: UnitAsset,
  room: Room,
  roomCode: string,
  common: CommonCardData
): string {
  const isVacant = isRoomVacant(room.occupiedBy);
  const occupantList = isVacant ? ['شاغرة'] : extractOccupyingList(room.occupiedBy);
  const floor = room.floor ?? '1';

  return `
    <div class="card-medium-room">
      <div class="m-header">
        <div class="m-hdr-ministry">${common.countryMinistryHeader}</div>
        <div class="m-hdr-company">${common.companyName}</div>
        <div class="m-hdr-system">${common.systemName}</div>
        <div class="m-hdr-tag">بطاقة رمز الوصول السريع (QR) للغرفة</div>
      </div>

      <div class="m-body">
        <div class="m-qr-box">
          <img class="m-qr-img" src="${common.qrDataUrl}" alt="Room QR" />
          <div class="m-code-badge">${roomCode}</div>
        </div>

        <div class="m-table">
          <div class="m-row m-alt">
            <span class="m-lbl">اسم المنشأة:</span>
            <span class="m-val m-bold">${unit.name}</span>
          </div>
          <div class="m-row">
            <span class="m-lbl">رمز المنشأة:</span>
            <span class="m-val m-mono m-blue">${unit.code}</span>
          </div>
          <div class="m-row m-alt">
            <span class="m-lbl">رمز الأصل:</span>
            <span class="m-val m-mono m-purple">${unit.fixedAssetCode || 'غير مسجل'}</span>
          </div>
          <div class="m-row">
            <span class="m-lbl">رقم الطابق:</span>
            <span class="m-val m-green m-bold">${floor}</span>
          </div>
          <div class="m-row m-highlight">
            <span class="m-lbl m-amber">رمز الغرفة:</span>
            <span class="m-val m-mono m-amber m-bold-lg">${roomCode}</span>
          </div>
          <div class="m-row m-row-occupants m-alt">
            <div class="m-occupants-hdr">
              <span class="m-lbl">الجهة الشاغلة:</span>
              ${occupantList.length > 1 ? `<span class="m-occupants-cnt">${occupantList.length}</span>` : ''}
            </div>
            ${renderOccupantsBadgesHtml(occupantList, 'medium')}
          </div>
        </div>
      </div>

      <div class="m-footer">
        <span>تاريخ الإصدار: ${common.dateStr}</span>
      </div>
    </div>
  `;
}

/**
 * Generates the Medium (A5) HTML for a single Unit card
 */
export function generateMediumUnitCardHtml(
  unit: UnitAsset,
  occupyingDisplay: string | string[],
  common: CommonCardData,
  occupyingListInput?: string[]
): string {
  const coords = unit.coordinates ? `${unit.coordinates.lat}°, ${unit.coordinates.lng}°` : 'غير محدد';
  const area = unit.totalAreaSqM ? `${unit.totalAreaSqM} م²` : 'غير محدد';
  const occupantList = occupyingListInput && occupyingListInput.length > 0
    ? occupyingListInput
    : extractOccupyingList(occupyingDisplay, unit.rooms);

  return `
    <div class="card-medium-unit">
      <div class="m-header">
        <div class="m-hdr-ministry">${common.countryMinistryHeader}</div>
        <div class="m-hdr-company">${common.companyName}</div>
        <div class="m-hdr-system">${common.systemName}</div>
        <div class="m-hdr-tag">لوحة التعريف الميدانية ورمز الوصول السريع (QR)</div>
      </div>

      <div class="m-body">
        <div class="m-qr-box">
          <div class="m-unit-code-box">${unit.code}</div>
          <img class="m-qr-img" src="${common.qrDataUrl}" alt="Unit QR" />
        </div>

        <div class="m-table">
          <div class="m-row m-alt">
            <span class="m-lbl">اسم المنشأة:</span>
            <span class="m-val m-bold">${unit.name}</span>
          </div>
          <div class="m-row">
            <span class="m-lbl">رمز المنشأة:</span>
            <span class="m-val m-mono m-blue">${unit.code}</span>
          </div>
          <div class="m-row m-alt">
            <span class="m-lbl">رمز الأصل:</span>
            <span class="m-val m-mono m-purple">${unit.fixedAssetCode || 'غير مسجل'}</span>
          </div>
          <div class="m-row">
            <span class="m-lbl">الموقع الميداني:</span>
            <span class="m-val m-amber m-bold">${unit.governorate} • ${unit.field}</span>
          </div>
          <div class="m-row m-alt">
            <span class="m-lbl">المساحة / الطوابق:</span>
            <span class="m-val m-green">${area} • ${unit.floorsCount || 1} طوابق</span>
          </div>
          <div class="m-row">
            <span class="m-lbl">الإحداثيات:</span>
            <span class="m-val m-mono m-blue">${coords}</span>
          </div>
          <div class="m-row m-row-occupants m-alt">
            <div class="m-occupants-hdr">
              <span class="m-lbl">الجهات الشاغلة:</span>
              ${occupantList.length > 1 ? `<span class="m-occupants-cnt">${occupantList.length} جهات</span>` : ''}
            </div>
            ${renderOccupantsBadgesHtml(occupantList, 'medium')}
          </div>
        </div>
      </div>

      <div class="m-footer">
        <span>تاريخ الطباعة: ${common.dateStr}</span>
      </div>
    </div>
  `;
}

/**
 * Generates the Full (A4) HTML for a single Room card
 */
export function generateFullRoomCardHtml(
  unit: UnitAsset,
  room: Room,
  roomCode: string,
  common: CommonCardData
): string {
  const isVacant = isRoomVacant(room.occupiedBy);
  const occupantList = isVacant ? ['شاغرة'] : extractOccupyingList(room.occupiedBy);
  const floor = room.floor ?? '1';

  return `
    <div class="card-full">
      <div class="f-header">
        <div class="f-hdr-ministry">${common.countryMinistryHeader}</div>
        <div class="f-hdr-company">${common.companyName}</div>
        <div class="f-hdr-system">${common.systemName}</div>
        <div class="f-hdr-tag">بطاقة رمز الوصول السريع (QR) للغرفة</div>
      </div>

      <div class="f-qr-wrap">
        <img class="f-qr-img" src="${common.qrDataUrl}" alt="Room QR" />
      </div>

      <div class="f-table">
        <div class="f-row f-alt">
          <span class="f-lbl">اسم المنشأة:</span>
          <span class="f-val f-bold">${unit.name}</span>
        </div>
        <div class="f-row">
          <span class="f-lbl">رمز المنشأة:</span>
          <span class="f-val f-mono f-blue">${unit.code}</span>
        </div>
        <div class="f-row f-alt">
          <span class="f-lbl">رمز الأصل:</span>
          <span class="f-val f-mono f-purple">${unit.fixedAssetCode || 'غير مسجل'}</span>
        </div>
        <div class="f-row">
          <span class="f-lbl">رقم الطابق:</span>
          <span class="f-val f-green f-bold">${floor}</span>
        </div>
        <div class="f-row f-highlight">
          <span class="f-lbl f-amber">رمز الغرفة:</span>
          <span class="f-val f-mono f-amber f-bold-lg">${roomCode}</span>
        </div>
        <div class="f-row f-row-occupants f-alt">
          <div class="f-occupants-hdr">
            <span class="f-lbl">الجهة الشاغلة:</span>
            ${occupantList.length > 1 ? `<span class="f-occupants-cnt">${occupantList.length} جهات</span>` : ''}
          </div>
          ${renderOccupantsBadgesHtml(occupantList, 'full')}
        </div>
      </div>

      <div class="f-footer">تاريخ الإصدار: ${common.dateStr}</div>
    </div>
  `;
}

/**
 * Generates the Full (A4) HTML for a single Unit card
 */
export function generateFullUnitCardHtml(
  unit: UnitAsset,
  occupyingDisplay: string | string[],
  common: CommonCardData,
  occupyingListInput?: string[]
): string {
  const coords = unit.coordinates ? `${unit.coordinates.lat}°, ${unit.coordinates.lng}°` : 'غير محدد';
  const area = unit.totalAreaSqM ? `${unit.totalAreaSqM} م²` : 'غير محدد';
  const occupantList = occupyingListInput && occupyingListInput.length > 0
    ? occupyingListInput
    : extractOccupyingList(occupyingDisplay, unit.rooms);

  return `
    <div class="card-full">
      <div class="f-header">
        <div class="f-hdr-ministry">${common.countryMinistryHeader}</div>
        <div class="f-hdr-company">${common.companyName}</div>
        <div class="f-hdr-system">${common.systemName}</div>
        <div class="f-hdr-tag">لوحة التعريف الميدانية ورمز الوصول السريع (QR)</div>
      </div>

      <div class="f-code-section">
        <span class="f-code-lbl">رمز المنشأة</span>
        <div class="f-code-box">${unit.code}</div>
      </div>

      <div class="f-qr-wrap">
        <img class="f-qr-img" src="${common.qrDataUrl}" alt="Unit QR" />
      </div>

      <div class="f-table">
        <div class="f-row f-alt">
          <span class="f-lbl">اسم المنشأة:</span>
          <span class="f-val f-bold">${unit.name}</span>
        </div>
        <div class="f-row">
          <span class="f-lbl">رمز المنشأة:</span>
          <span class="f-val f-mono f-blue">${unit.code}</span>
        </div>
        <div class="f-row f-alt">
          <span class="f-lbl">رمز الأصل:</span>
          <span class="f-val f-mono f-purple">${unit.fixedAssetCode || 'غير مسجل'}</span>
        </div>
        <div class="f-row">
          <span class="f-lbl">الموقع الميداني:</span>
          <span class="f-val f-amber f-bold">${unit.governorate} • ${unit.field}</span>
        </div>
        <div class="f-row f-alt">
          <span class="f-lbl">المساحة الإجمالية:</span>
          <span class="f-val f-green">${area} • عدد الطوابق: ${unit.floorsCount || 1}</span>
        </div>
        <div class="f-row">
          <span class="f-lbl">الإحداثيات الجغرافية:</span>
          <span class="f-val f-mono f-blue">${coords}</span>
        </div>
        <div class="f-row f-row-occupants f-alt">
          <div class="f-occupants-hdr">
            <span class="f-lbl">الجهات الشاغلة:</span>
            ${occupantList.length > 1 ? `<span class="f-occupants-cnt">${occupantList.length} جهات شاغلة</span>` : ''}
          </div>
          ${renderOccupantsBadgesHtml(occupantList, 'full')}
        </div>
      </div>

      <div class="f-footer">تاريخ الطباعة: ${common.dateStr}</div>
    </div>
  `;
}

/**
 * Shared CSS stylesheet embedded in every print window
 */
export const PRINT_STYLESHEET = `
  @page {
    size: A4 portrait;
    margin: 6mm 6mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #0f172a;
    direction: rtl;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  }

  /* A4 2x2 Grid Page for 4 Cards */
  .a4-grid-page {
    width: 198mm;
    height: 284mm;
    max-height: 284mm;
    page-break-after: always;
    break-after: page;
    display: grid;
    grid-template-columns: 96mm 96mm;
    grid-template-rows: 138mm 138mm;
    gap: 4mm;
    justify-content: center;
    align-content: center;
    margin: 0 auto;
    padding: 2mm;
  }
  .a4-grid-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  /* Single centered compact page */
  .a4-center-page {
    width: 198mm;
    height: 284mm;
    max-height: 284mm;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    page-break-after: auto;
  }

  /* A4 Halves Page for A5 (2 Cards) */
  .a4-halves-page {
    width: 198mm;
    height: 284mm;
    max-height: 284mm;
    page-break-after: always;
    break-after: page;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    align-items: center;
    gap: 6mm;
    margin: 0 auto;
    padding: 2mm;
  }
  .a4-halves-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  /* Cell slots */
  .slot-cell {
    width: 96mm;
    height: 138mm;
    max-height: 138mm;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .slot-empty {
    width: 96mm;
    height: 138mm;
    border: 1px dashed #e2e8f0;
    border-radius: 8px;
    background: #fafafa;
  }
  .slot-half-empty {
    width: 190mm;
    height: 135mm;
    border: 1px dashed #e2e8f0;
    border-radius: 12px;
    background: #fafafa;
  }

  /* Compact Card (A6: 96mm x 138mm) */
  .card-compact-room, .card-compact-unit {
    width: 96mm;
    height: 138mm;
    max-height: 138mm;
    border: 1.5px dashed #94a3b8; /* Clean cut line */
    border-radius: 8px;
    padding: 5mm 6mm;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    overflow: hidden;
    box-sizing: border-box;
  }

  .c-header {
    width: 100%;
    text-align: center;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 2mm;
    margin-bottom: 1mm;
  }
  .c-hdr-ministry { font-size: 8.5px; font-weight: 900; color: #b45309; line-height: 1.2; }
  .c-hdr-company { font-size: 8px; font-weight: 800; color: #0f172a; line-height: 1.2; }
  .c-hdr-system { font-size: 7px; font-weight: 700; color: #475569; line-height: 1.2; }
  .c-hdr-tag {
    display: inline-block;
    background: #fef3c7;
    color: #92400e;
    border: 0.5px solid #fde68a;
    font-size: 6.5px;
    font-weight: 900;
    padding: 1px 6px;
    border-radius: 8px;
    margin-top: 1px;
  }

  .c-code-box-wrap {
    text-align: center;
    margin: 1mm 0;
  }
  .c-code-lbl { font-size: 6.5px; font-weight: bold; color: #64748b; display: block; }
  .c-code-box {
    display: inline-block;
    background: #0f172a;
    color: #f59e0b;
    font-family: monospace;
    font-size: 11px;
    font-weight: 900;
    padding: 2px 8px;
    border-radius: 5px;
    letter-spacing: 0.5px;
    border: 1px solid #f59e0b;
  }

  .c-qr-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 2mm 0;
    flex: 1;
  }
  .card-compact-room .c-qr-img {
    width: 56mm;
    height: 56mm;
    display: block;
    margin: 0 auto;
    border: 2px solid #0f172a;
    border-radius: 8px;
    padding: 2.5mm;
    background: #ffffff;
    box-sizing: border-box;
  }
  .card-compact-unit .c-qr-img {
    width: 48mm;
    height: 48mm;
    display: block;
    margin: 0 auto;
    border: 2px solid #0f172a;
    border-radius: 8px;
    padding: 2mm;
    background: #ffffff;
    box-sizing: border-box;
  }

  .c-table {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    overflow: hidden;
    font-size: 7.5px;
    line-height: 1.25;
    background: #ffffff;
    width: 100%;
  }
  .c-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2.5px 5px;
    border-bottom: 0.5px solid #f1f5f9;
    gap: 4px;
  }
  .c-row:last-child { border-bottom: none; }
  .c-alt { background: #f8fafc; }
  .c-highlight { background: #fef3c7; border-bottom: 0.5px solid #fde68a; }
  .c-lbl { color: #64748b; font-weight: bold; flex-shrink: 0; min-width: 58px; text-align: right; }
  .c-val { font-weight: 800; color: #0f172a; text-align: left; flex: 1; min-width: 0; }
  .c-mono { font-family: monospace; }
  .c-bold { font-weight: 900; }
  .c-bold-lg { font-weight: 900; font-size: 8.5px; }
  .c-blue { color: #0284c7; }
  .c-purple { color: #4f46e5; }
  .c-green { color: #059669; }
  .c-amber { color: #b45309; }
  .c-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .c-footer {
    text-align: center;
    font-size: 6.5px;
    color: #94a3b8;
    font-weight: bold;
    padding-top: 1mm;
  }

  /* Medium Card (A5) */
  .card-medium-room, .card-medium-unit {
    width: 190mm;
    height: 135mm;
    max-height: 135mm;
    border: 1.5px dashed #94a3b8;
    border-radius: 12px;
    padding: 8mm 10mm;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
  }
  .m-header { text-align: center; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px; }
  .m-hdr-ministry { font-size: 11px; font-weight: 900; color: #b45309; }
  .m-hdr-company { font-size: 10.5px; font-weight: 800; color: #0f172a; }
  .m-hdr-system { font-size: 9.5px; font-weight: 700; color: #475569; }
  .m-hdr-tag { display: inline-block; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-size: 9px; font-weight: 900; padding: 2px 10px; border-radius: 12px; margin-top: 2px; }
  .m-body { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin: 6px 0; flex: 1; }
  .m-qr-box { text-align: center; flex-shrink: 0; }
  .m-qr-img { width: 44mm; height: 44mm; border: 2.5px solid #0f172a; border-radius: 10px; padding: 3mm; display: block; background: #ffffff; box-sizing: border-box; }
  .m-code-badge { margin-top: 4px; font-family: monospace; font-size: 11.5px; font-weight: 900; background: #0f172a; color: #f59e0b; padding: 3px 8px; border-radius: 6px; }
  .m-unit-code-box { font-family: monospace; font-size: 12px; font-weight: 900; background: #0f172a; color: #f59e0b; padding: 3px 8px; border-radius: 6px; margin-bottom: 4px; border: 1px solid #f59e0b; }
  .m-table { flex: 1; min-width: 0; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; font-size: 9.5px; line-height: 1.35; }
  .m-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; border-bottom: 1px solid #f1f5f9; gap: 6px; }
  .m-row:last-child { border-bottom: none; }
  .m-alt { background: #f8fafc; }
  .m-highlight { background: #fef3c7; }
  .m-lbl { color: #64748b; font-weight: bold; flex-shrink: 0; min-width: 75px; text-align: right; }
  .m-val { font-weight: 800; color: #0f172a; text-align: left; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .m-mono { font-family: monospace; }
  .m-bold { font-weight: 900; }
  .m-bold-lg { font-weight: 900; font-size: 11px; }
  .m-blue { color: #0284c7; }
  .m-purple { color: #4f46e5; }
  .m-green { color: #059669; }
  .m-amber { color: #b45309; }
  .m-footer { text-align: center; font-size: 8px; color: #94a3b8; font-weight: bold; }

  /* Full Page Card (A4) */
  .card-full {
    border: 2.5px solid #0f172a;
    border-radius: 16px;
    padding: 20px 20px;
    max-width: 520px;
    margin: 15px auto;
    background: #ffffff;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    text-align: center;
    box-sizing: border-box;
  }
  .f-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px; text-align: center; }
  .f-hdr-ministry { font-size: 13.5px; font-weight: 900; color: #b45309; margin-bottom: 2px; }
  .f-hdr-company { font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
  .f-hdr-system { font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px; }
  .f-hdr-tag { display: inline-block; margin-top: 4px; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-size: 11px; font-weight: 900; padding: 3px 12px; border-radius: 20px; }
  .f-code-section { margin-bottom: 12px; }
  .f-code-lbl { display: block; font-size: 10.5px; font-weight: bold; color: #64748b; margin-bottom: 4px; }
  .f-code-box { background: #0f172a; color: #f59e0b; font-family: monospace; font-size: 22px; font-weight: 900; padding: 8px 16px; border-radius: 10px; display: inline-block; letter-spacing: 1.5px; border: 2px solid #f59e0b; }
  .f-qr-wrap { margin: 12px auto 16px; padding: 10px; border: 2.5px solid #cbd5e1; border-radius: 16px; background: #ffffff; display: inline-block; }
  .f-qr-img { width: 68mm; height: 68mm; display: block; }
  .f-table { text-align: right; margin-top: 6px; border: 1.5px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff; width: 100%; }
  .f-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; gap: 8px; }
  .f-row:last-child { border-bottom: none; }
  .f-alt { background: #f8fafc; }
  .f-highlight { background: #fef3c7; }
  .f-lbl { color: #64748b; font-weight: 700; font-size: 11px; flex-shrink: 0; min-width: 90px; text-align: right; }
  .f-val { font-weight: 900; color: #0f172a; text-align: left; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .f-mono { font-family: monospace; letter-spacing: 0.5px; }
  .f-bold { font-weight: 900; }
  .f-bold-lg { font-weight: 900; font-size: 13.5px; }
  .f-blue { color: #0284c7; }
  .f-purple { color: #4f46e5; }
  .f-green { color: #059669; }
  .f-amber { color: #b45309; }
  .f-footer { font-size: 9px; color: #94a3b8; margin-top: 14px; font-weight: bold; }

  /* Occupant Badges / Small Cards Layout */
  .c-row-occupants {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    padding: 3.5px 5px !important;
    gap: 2.5px !important;
  }
  .c-occupants-hdr {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .c-occupants-cnt {
    font-size: 6.5px;
    font-weight: 800;
    color: #b45309;
    background: #fef3c7;
    padding: 0.5px 4px;
    border-radius: 6px;
    border: 0.5px solid #fde68a;
  }

  .m-row-occupants {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    padding: 5px 8px !important;
    gap: 3.5px !important;
  }
  .m-occupants-hdr {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .m-occupants-cnt {
    font-size: 8px;
    font-weight: 800;
    color: #b45309;
    background: #fef3c7;
    padding: 1px 6px;
    border-radius: 8px;
    border: 0.5px solid #fde68a;
  }

  .f-row-occupants {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    padding: 8px 12px !important;
    gap: 5px !important;
  }
  .f-occupants-hdr {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .f-occupants-cnt {
    font-size: 10px;
    font-weight: 800;
    color: #b45309;
    background: #fef3c7;
    padding: 2px 8px;
    border-radius: 10px;
    border: 0.5px solid #fde68a;
  }

  .occupant-badges-wrap {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    justify-content: flex-start;
    width: 100%;
    direction: rtl;
    margin-top: 3px;
  }
  .occupant-badges-wrap.compact {
    gap: 3px 4px;
  }
  .occupant-badges-wrap.medium {
    gap: 4px 6px;
  }
  .occupant-badges-wrap.full {
    gap: 6px 8px;
  }

  .occupant-badge-c {
    display: inline-flex;
    align-items: center;
    gap: 3.5px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 2px 5px;
    font-size: 7.5px;
    font-weight: 800;
    color: #0f172a;
    box-shadow: 0 0.5px 1px rgba(0,0,0,0.04);
    line-height: 1.25;
    white-space: normal;
    text-align: right;
  }
  .occupant-badge-m {
    display: inline-flex;
    align-items: center;
    gap: 4.5px;
    background: #f8fafc;
    border: 1.2px solid #cbd5e1;
    border-radius: 6px;
    padding: 3px 8px;
    font-size: 9.5px;
    font-weight: 800;
    color: #0f172a;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    line-height: 1.3;
    white-space: normal;
    text-align: right;
  }
  .occupant-badge-f {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #f8fafc;
    border: 1.5px solid #cbd5e1;
    border-radius: 8px;
    padding: 5px 10px;
    font-size: 11.5px;
    font-weight: 800;
    color: #0f172a;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    line-height: 1.35;
    white-space: normal;
    text-align: right;
  }
  .badge-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .badge-text {
    white-space: normal;
    word-break: break-word;
  }
`;

/**
 * Builds the complete HTML string for printing a batch of room cards (4 cards per A4 page)
 */
export function buildBatchRoomsPrintHtml(
  unit: UnitAsset,
  cardHtmls: string[],
  title = 'طباعة كافة بطاقات غرف المنشأة'
): string {
  // Group cardHtmls in chunks of 4
  const pages: string[] = [];
  for (let i = 0; i < cardHtmls.length; i += 4) {
    const chunk = cardHtmls.slice(i, i + 4);
    // RTL Grid: Slot 0: Top-Right, Slot 1: Top-Left, Slot 2: Bottom-Right, Slot 3: Bottom-Left
    const slots = [
      chunk[0] ? `<div class="slot-cell">${chunk[0]}</div>` : '<div class="slot-empty"></div>',
      chunk[1] ? `<div class="slot-cell">${chunk[1]}</div>` : '<div class="slot-empty"></div>',
      chunk[2] ? `<div class="slot-cell">${chunk[2]}</div>` : '<div class="slot-empty"></div>',
      chunk[3] ? `<div class="slot-cell">${chunk[3]}</div>` : '<div class="slot-empty"></div>',
    ];

    pages.push(`
      <div class="a4-grid-page">
        ${slots.join('')}
      </div>
    `);
  }

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>${title} - ${unit.code}</title>
      <style>${PRINT_STYLESHEET}</style>
    </head>
    <body>
      ${pages.join('')}
      <script>
        window.onload = function() { window.print(); window.close(); };
      </script>
    </body>
    </html>
  `;
}

/**
 * Builds the complete HTML string for printing a single card with user-chosen size & placement
 */
export function buildSingleCardPrintHtml(
  cardHtml: string,
  size: CardPrintSize,
  placement: CardPlacement,
  title: string
): string {
  let content = '';

  if (size === 'compact') {
    const p = placement as CardPlacementA6;
    if (p === 'center') {
      content = `
        <div class="a4-center-page">
          ${cardHtml}
        </div>
      `;
    } else if (p === 'four-copies') {
      content = `
        <div class="a4-grid-page">
          <div class="slot-cell">${cardHtml}</div>
          <div class="slot-cell">${cardHtml}</div>
          <div class="slot-cell">${cardHtml}</div>
          <div class="slot-cell">${cardHtml}</div>
        </div>
      `;
    } else {
      // In RTL Grid:
      // Index 0 = Top-Right (أعلى اليمين)
      // Index 1 = Top-Left (أعلى اليسار)
      // Index 2 = Bottom-Right (أسفل اليمين)
      // Index 3 = Bottom-Left (أسفل اليسار)
      const slots = [
        p === 'top-right' ? `<div class="slot-cell">${cardHtml}</div>` : '<div class="slot-empty"></div>',
        p === 'top-left' ? `<div class="slot-cell">${cardHtml}</div>` : '<div class="slot-empty"></div>',
        p === 'bottom-right' ? `<div class="slot-cell">${cardHtml}</div>` : '<div class="slot-empty"></div>',
        p === 'bottom-left' ? `<div class="slot-cell">${cardHtml}</div>` : '<div class="slot-empty"></div>',
      ];

      content = `
        <div class="a4-grid-page">
          ${slots.join('')}
        </div>
      `;
    }
  } else if (size === 'medium') {
    const p = placement as CardPlacementA5;
    if (p === 'two-copies') {
      content = `
        <div class="a4-halves-page">
          <div class="slot-half">${cardHtml}</div>
          <div class="slot-half">${cardHtml}</div>
        </div>
      `;
    } else if (p === 'bottom') {
      content = `
        <div class="a4-halves-page">
          <div class="slot-half-empty"></div>
          <div class="slot-half">${cardHtml}</div>
        </div>
      `;
    } else if (p === 'center') {
      content = `
        <div class="a4-center-page">
          ${cardHtml}
        </div>
      `;
    } else {
      // 'top' is default
      content = `
        <div class="a4-halves-page">
          <div class="slot-half">${cardHtml}</div>
          <div class="slot-half-empty"></div>
        </div>
      `;
    }
  } else {
    // Full size
    content = `
      <div class="a4-center-page" style="height: auto; min-height: 284mm;">
        ${cardHtml}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>${PRINT_STYLESHEET}</style>
    </head>
    <body>
      ${content}
      <script>
        window.onload = function() { window.print(); window.close(); };
      </script>
    </body>
    </html>
  `;
}
