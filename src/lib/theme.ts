// مظهر الواجهة — نفس نظام الثيمات المعتمد في أنظمة الأرشفة وناظم ومتابعة البريد:
// كل ثيم يحدد لوناً أساسياً واحداً (--primary) وتُشتق منه بقية الدرجات في index.css.
// المظهر الافتراضي يضبطه مدير النظام من «إدارة هوية النظام» ويُحفظ ضمن الهوية (branding).

export type ThemeId =
  | 'buildings'
  | 'crimson'
  | 'royal-blue'
  | 'emerald'
  | 'deep-purple'
  | 'charcoal'
  | 'warm-orange'
  | 'azure'
  | 'teal';
export type FontId = 'cairo' | 'ibm-plex' | 'tajawal';
export type SidebarStyle = 'primary' | 'light';

export interface UiAppearance {
  theme: ThemeId;
  font: FontId;
  sidebar: SidebarStyle;
  dark: boolean;
}

export const THEMES: { id: ThemeId; label: string; color: string }[] = [
  { id: 'buildings', label: 'أزرق مخضرّ (الأبنية)', color: '#1b6b78' },
  { id: 'crimson', label: 'أحمر داكن / خمري ملكي', color: '#881337' },
  { id: 'royal-blue', label: 'أزرق ملكي سيادي', color: '#1e3a8a' },
  { id: 'emerald', label: 'أخضر زمردي', color: '#065f46' },
  { id: 'deep-purple', label: 'بنفسجي غامق', color: '#581c87' },
  { id: 'charcoal', label: 'رمادي احترافي', color: '#334155' },
  { id: 'warm-orange', label: 'برتقالي دافئ', color: '#c2410c' },
  { id: 'azure', label: 'أزرق أردوازي', color: '#0369a1' },
  { id: 'teal', label: 'أخضر مائي', color: '#0d9488' },
];

export const FONTS: { id: FontId; label: string }[] = [
  { id: 'cairo', label: 'القاهرة (Cairo)' },
  { id: 'ibm-plex', label: 'آي بي إم بلكس (IBM Plex)' },
  { id: 'tajawal', label: 'تجوّل (Tajawal)' },
];

export const DEFAULT_APPEARANCE: UiAppearance = { theme: 'buildings', font: 'cairo', sidebar: 'primary', dark: false };

const KEY = 'bms.ui';

export function normalizeAppearance(raw: unknown): UiAppearance {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Partial<UiAppearance>;
  return {
    theme: THEMES.some((t) => t.id === p.theme) ? (p.theme as ThemeId) : DEFAULT_APPEARANCE.theme,
    font: FONTS.some((f) => f.id === p.font) ? (p.font as FontId) : DEFAULT_APPEARANCE.font,
    sidebar: p.sidebar === 'light' ? 'light' : 'primary',
    dark: typeof p.dark === 'boolean' ? p.dark : DEFAULT_APPEARANCE.dark,
  };
}

export function cachedAppearance(): UiAppearance {
  try {
    const cached = normalizeAppearance(JSON.parse(localStorage.getItem(KEY) || '{}'));
    const saved = localStorage.getItem('app_theme');
    if (saved === 'dark' || saved === 'light') cached.dark = saved === 'dark';
    return cached;
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function applyAppearance(p: UiAppearance): void {
  const root = document.documentElement;
  root.dataset.theme = p.theme;
  root.dataset.font = p.font;
  root.dataset.sidebar = p.sidebar;
  root.classList.toggle('dark', p.dark);
  root.style.colorScheme = p.dark ? 'dark' : 'light';
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* المتصفح يمنع التخزين: يكفي التطبيق الحالي */
  }
}
