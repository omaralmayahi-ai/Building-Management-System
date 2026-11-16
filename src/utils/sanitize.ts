/**
 * HTML escaping utility — 5-ح
 * Prevents XSS in print/report templates that build HTML via string concatenation.
 * Use `h()` around every user-supplied value inserted into an HTML template literal.
 */

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#x60;',
};

/**
 * Escape a value for safe HTML insertion.
 * Returns '-' for null/undefined/empty string so templates stay readable.
 */
export function h(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  return String(value).replace(/[&<>"'`]/g, (ch) => ESCAPE_MAP[ch] ?? ch);
}

/**
 * Same as h() but preserves '-' placeholders as-is (no double escaping).
 * Use when the value may already be '-' from a previous fallback.
 */
export function hv(value: unknown): string {
  if (value === null || value === undefined || value === '' || value === '-') return '-';
  return String(value).replace(/[&<>"'`]/g, (ch) => ESCAPE_MAP[ch] ?? ch);
}
