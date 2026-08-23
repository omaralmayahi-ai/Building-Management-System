/**
 * Midland Oil Company - Server Time Synchronization Service
 * 
 * Ensures all dates, times, and timestamps throughout the application are strictly
 * calibrated to the central Server Computer Clock and NOT dependent on the client
 * user's local device clock.
 *
 * Date Format Standard across the entire application:
 * (DD-MM-YYYY) => (يوم - شهر - سنة) مثال: (23-08-2026)
 */

interface ServerTimeState {
  serverTimeOffsetMs: number;
  lastSyncedAtMs: number;
  isInitialized: boolean;
}

const state: ServerTimeState = {
  serverTimeOffsetMs: 0,
  lastSyncedAtMs: 0,
  isInitialized: false,
};

const listeners: Set<() => void> = new Set();

export function onServerTimeChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

/**
 * Calibrate the server time offset using a server timestamp and network round-trip estimation
 */
export function updateServerTimeFromTimestamp(serverTimestampMs: number, roundTripMs: number = 0) {
  if (!serverTimestampMs || isNaN(serverTimestampMs)) return;
  const now = Date.now();
  const estimatedServerNow = serverTimestampMs + Math.round(roundTripMs / 2);
  state.serverTimeOffsetMs = estimatedServerNow - now;
  state.lastSyncedAtMs = now;
  state.isInitialized = true;
  notifyListeners();
}

/**
 * Synchronize current time directly from the backend server
 */
export async function syncWithServerTime(): Promise<boolean> {
  const reqStart = Date.now();
  try {
    const res = await fetch('/api/server-time', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    const reqEnd = Date.now();
    const roundTrip = Math.max(0, reqEnd - reqStart);

    if (res.ok) {
      const data = await res.json();
      if (data && data.serverTimeMs) {
        updateServerTimeFromTimestamp(data.serverTimeMs, roundTrip);
        return true;
      }
    }

    // Fallback: Check 'X-Server-Time' or 'Date' response header
    const serverTimeHeader = res.headers.get('x-server-time');
    if (serverTimeHeader) {
      const serverMs = parseInt(serverTimeHeader, 10);
      if (!isNaN(serverMs)) {
        updateServerTimeFromTimestamp(serverMs, roundTrip);
        return true;
      }
    }

    const dateHeader = res.headers.get('date');
    if (dateHeader) {
      const serverMs = new Date(dateHeader).getTime();
      if (!isNaN(serverMs)) {
        updateServerTimeFromTimestamp(serverMs, roundTrip);
        return true;
      }
    }
  } catch (err) {
    console.warn('Note: Server time sync attempt:', err);
  }
  return false;
}

// Automatically sync on initial load and at a regular periodic interval (every 45 seconds)
if (typeof window !== 'undefined') {
  syncWithServerTime();
  setInterval(() => {
    syncWithServerTime();
  }, 45000);
}

/**
 * Returns a calibrated Date object representing the exact current time on the Server
 */
export function getServerNow(): Date {
  return new Date(Date.now() + state.serverTimeOffsetMs);
}

/**
 * Returns the current Server time in milliseconds
 */
export function getServerTimestamp(): number {
  return Date.now() + state.serverTimeOffsetMs;
}

/**
 * Formats a given Date, string, or number into strict (YYYY-MM-DD) format
 * Example: 2026-08-23
 */
export function formatDateYYYYMMDD(val?: string | number | Date | null): string {
  if (val === undefined || val === null || val === '') return '-';

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '-';
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof val === 'number') {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '-';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const str = String(val).trim();
  if (!str || str === 'undefined' || str === 'null' || str === '-') return '-';

  // If already formatted like YYYY-MM-DD (e.g. 2026-08-23 or ISO 2026-08-23T...)
  const yyyymmddMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (yyyymmddMatch) {
    const year = yyyymmddMatch[1];
    const month = String(yyyymmddMatch[2]).padStart(2, '0');
    const day = String(yyyymmddMatch[3]).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // If formatted like DD-MM-YYYY (e.g. 23-08-2026 or 23/08/2026)
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (ddmmyyyyMatch && parseInt(ddmmyyyyMatch[3], 10) > 1000) {
    const day = String(ddmmyyyyMatch[1]).padStart(2, '0');
    const month = String(ddmmyyyyMatch[2]).padStart(2, '0');
    const year = ddmmyyyyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Attempt standard Date parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return str;
}

// Backward-compatibility alias
export const formatDateDDMMYYYY = formatDateYYYYMMDD;

/**
 * Formats a Date or timestamp into 12-hour format with AM/PM (ص / م) distinction
 * Example: 03:45:12 م or 09:15:00 ص
 */
export function formatTime12Hour(
  val?: Date | string | number | null,
  includeSeconds: boolean = true
): string {
  let d: Date;
  if (!val) {
    d = getServerNow();
  } else if (val instanceof Date) {
    d = val;
  } else if (typeof val === 'number') {
    d = new Date(val);
  } else {
    // String parsing
    const str = String(val).trim();
    // Check if it already includes Arabic AM/PM indicator (ص / م)
    if (str.includes('ص') || str.includes('م') || str.includes('AM') || str.includes('PM')) {
      return str;
    }
    // Check if it's a standalone time string like "14:30:00" or "14:30"
    const timeMatch = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch && !str.includes('T') && !str.includes('-')) {
      const rawHours = parseInt(timeMatch[1], 10);
      const mins = timeMatch[2];
      const secs = timeMatch[3] || '00';
      const period = rawHours >= 12 ? 'م' : 'ص';
      const h12 = rawHours % 12 === 0 ? 12 : rawHours % 12;
      const hh = String(h12).padStart(2, '0');
      return includeSeconds ? `${hh}:${mins}:${secs} ${period}` : `${hh}:${mins} ${period}`;
    }
    d = new Date(str);
  }

  if (isNaN(d.getTime())) return '-';

  const rawHours = d.getHours();
  const period = rawHours >= 12 ? 'م' : 'ص';
  const h12 = rawHours % 12 === 0 ? 12 : rawHours % 12;
  const hh = String(h12).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');

  return includeSeconds ? `${hh}:${mm}:${ss} ${period}` : `${hh}:${mm} ${period}`;
}

/**
 * Returns current Server Date formatted as YYYY-MM-DD (e.g. 2026-08-23)
 */
export function getServerDateFormatted(): string {
  return formatDateYYYYMMDD(getServerNow());
}

/**
 * Returns current Server Time formatted in 12-hour system with AM/PM (e.g. 02:30:15 م)
 */
export function getServerTimeFormatted(includeSeconds: boolean = true): string {
  return formatTime12Hour(getServerNow(), includeSeconds);
}

/**
 * Returns current Server DateTime formatted as (YYYY-MM-DD hh:mm:ss ص/م)
 * Example: 2026-08-23 02:30:15 م
 */
export function getServerDateTimeFormatted(includeSeconds: boolean = true): string {
  return `${getServerDateFormatted()} ${getServerTimeFormatted(includeSeconds)}`;
}

/**
 * Returns current Server Date in YYYY-MM-DD format (specifically for <input type="date"> value binding)
 */
export function getServerIsoDateOnly(): string {
  const now = getServerNow();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
