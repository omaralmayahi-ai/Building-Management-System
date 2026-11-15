// مجموعة المكوّنات الموحدة للتصميم المعتمد — منقولة من نظام الأرشفة (client/src/components/ui.tsx).
// تُستخدم داخل حاوية تحمل الصنف .ds (فيها ينقلب سلّم slate في الوضع الداكن) ولا تحتاج شرط فاتح/داكن.
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, useLayoutEffect, type RefObject } from "react";
import { createContext, useCallback, useContext } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, CircleAlert, CircleCheck, CircleHelp, Inbox, TriangleAlert, X, type LucideIcon } from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ---------------------------------------------------------------------
// الأزرار
// ---------------------------------------------------------------------
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "danger-ghost";
const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-brand-700 text-on-brand shadow-sm hover:bg-brand-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none",
  secondary: "border border-slate-300 bg-card text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50 disabled:text-slate-400",
  danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-600/90 disabled:bg-rose-300",
  ghost: "text-slate-700 hover:bg-slate-100 disabled:text-slate-400",
  "danger-ghost": "text-rose-700 hover:bg-rose-50 disabled:text-slate-400",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  icon: Icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md"; loading?: boolean; icon?: LucideIcon }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-colors disabled:cursor-not-allowed",
        size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm",
        BUTTON_STYLES[variant],
        className,
      )}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        Icon && <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
      )}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------
// الحقول
// ---------------------------------------------------------------------
const fieldBase =
  "w-full rounded-lg border border-slate-300 bg-card px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-3 focus:ring-brand-100 disabled:bg-slate-100 disabled:text-slate-500";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldBase, "h-10", props.className)} />;
}

// حقل نصي مع قائمة اقتراحات بخط النظام (بديل datalist التي يرسمها المتصفح بخط النظام الافتراضي).
// يبقى الإدخال الحر ممكناً؛ الاقتراحات تُصفّى بما يُكتب.
export function SuggestInput({
  value,
  onChange,
  suggestions,
  inputProps,
  maxLength,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  inputProps?: Record<string, unknown>;
  maxLength?: number;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const q = value.trim();
  const options = q && suggestions.includes(q) ? suggestions : suggestions.filter((s) => !q || s.includes(q));
  const show = open && options.length > 0;
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };
  return (
    <div className="relative">
      <input
        {...inputProps}
        className={cx(fieldBase, "h-10 pl-8")}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={show}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && show && active >= 0) {
            e.preventDefault();
            e.stopPropagation();
            pick(options[active]);
          } else if (e.key === "Enter") {
            setOpen(false); // بلا اختيار من القائمة: Enter ينتقل للحقل التالي
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      <ChevronDown className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      {show && (
        <ul role="listbox" className="absolute z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-card py-1 shadow-lg">
          {options.map((o, i) => (
            <li
              key={o}
              role="option"
              aria-selected={o === value}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
              className={cx(
                "flex cursor-pointer items-center justify-between px-3 py-1.5 text-sm",
                i === active ? "bg-brand-50 text-brand-700" : "text-slate-800 hover:bg-slate-50",
              )}
            >
              {o}
              {o === value && <Check className="h-4 w-4 text-brand-700" aria-hidden />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(fieldBase, "min-h-20", props.className)} />;
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(fieldBase, "h-10 py-0 pl-8", props.className)}>
      {children}
    </select>
  );
}

export function Field({ label, hint, children, required }: { label: string; hint?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Checkbox({ label, checked, onChange, disabled }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={cx("flex items-center gap-2 text-sm", disabled ? "text-slate-400" : "cursor-pointer")}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 accent-brand-700"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {msg}
    </p>
  );
}

// ---------------------------------------------------------------------
// عناصر العرض
// ---------------------------------------------------------------------
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("rounded-xl border border-slate-200 bg-card shadow-[0_1px_2px_rgb(15_23_42/0.04)]", className)}>{children}</section>;
}

// مربع أيقونة ملوّن بلون الثيم (نفس أسلوب بطاقات ناظم)
export function IconTile({ icon: Icon, tone = "brand", size = "md" }: { icon: LucideIcon; tone?: "brand" | "amber" | "red" | "green" | "slate"; size?: "sm" | "md" | "lg" }) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-rose-50 text-rose-700",
    green: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-600",
  };
  const sizes = { sm: "h-8 w-8 rounded-lg [&>svg]:h-4 [&>svg]:w-4", md: "h-10 w-10 rounded-xl [&>svg]:h-5 [&>svg]:w-5", lg: "h-12 w-12 rounded-xl [&>svg]:h-6 [&>svg]:w-6" };
  return (
    <span className={cx("inline-flex shrink-0 items-center justify-center", tones[tone], sizes[size])}>
      <Icon aria-hidden />
    </span>
  );
}

// عنوان داخل البطاقة: أيقونة + عنوان + أزرار
export function CardHeader({ title, icon, actions, description }: { title: ReactNode; icon?: LucideIcon; actions?: ReactNode; description?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
      {icon && <IconTile icon={icon} size="sm" />}
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, icon }: { title: string; description?: string; actions?: ReactNode; icon?: LucideIcon }) {
  const Icon = icon;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && <IconTile icon={Icon} size="lg" />}
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold leading-tight text-slate-900">{title}</h1>
          {description && <p className="mt-0.5 max-w-3xl text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// تبويبات بشكل حبوب مع عدّاد (نفس أسلوب ناظم)
export function Tabs<K extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: K; label: ReactNode; count?: number | null; tone?: "red" | "amber"; icon?: LucideIcon }[];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <div role="tablist" className="mb-4 inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-card p-1 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
      {tabs.map((t) => {
        const active = t.key === value;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cx(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
              active ? "bg-brand-700 text-on-brand shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {Icon && <Icon className="h-4 w-4" aria-hidden />}
            {t.label}
            {t.count !== undefined && t.count !== null && (
              <span
                className={cx(
                  "min-w-6 rounded-full px-1.5 text-center text-xs",
                  active ? "bg-white/20" : t.tone === "red" && t.count ? "bg-rose-100 text-rose-800" : t.tone === "amber" && t.count ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600",
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

type BadgeTone = "green" | "red" | "amber" | "slate" | "blue";
const BADGE: Record<BadgeTone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  red: "bg-rose-50 text-rose-700 ring-rose-600/15",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/15",
  blue: "bg-brand-50 text-brand-700 ring-brand-700/15",
};
export function Badge({ tone = "slate", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={cx("inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", BADGE[tone])}>{children}</span>;
}

// يضع عنوان العمود على كل خلية (data-label) حتى يعرض CSS الجدول كبطاقات على الشاشات الضيقة
export function useCellLabels(ref: RefObject<HTMLTableElement | null>) {
  useLayoutEffect(() => {
    const t = ref.current;
    if (!t) return;
    const labels = (Array.from(t.querySelectorAll(":scope > thead th")) as HTMLElement[]).map((th) => (th.textContent ?? "").replace(/[▲▼↑↓]/g, "").trim());
    t.querySelectorAll(":scope > tbody > tr").forEach((tr) => {
      (Array.from(tr.children) as Element[]).forEach((td, i) => {
        const l = (td as HTMLTableCellElement).colSpan > 1 ? "" : labels[i] ?? "";
        if (td.getAttribute("data-label") !== l) td.setAttribute("data-label", l);
      });
    });
  });
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: boolean }) {
  const ref = useRef<HTMLTableElement>(null);
  useCellLabels(ref);
  return (
    <div className="overflow-x-auto">
      <table ref={ref} className="rtable w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-right text-xs text-slate-500">
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-4 py-2.5 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 [&>tr]:transition-colors [&>tr:hover]:bg-slate-50/70">{children}</tbody>
      </table>
      {empty && <EmptyState text="لا توجد بيانات" />}
    </div>
  );
}

export function EmptyState({ text, icon: Icon = Inbox, children }: { text: ReactNode; icon?: LucideIcon; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-sm text-slate-500">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <div>{text}</div>
      {children}
    </div>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx("px-4 py-2.5 align-middle", className)}>{children}</td>;
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16" role="status" aria-label="جارٍ التحميل">
      <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-700" />
    </div>
  );
}

// ---------------------------------------------------------------------
// النوافذ المنبثقة
// ---------------------------------------------------------------------
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
  icon,
  top,
  staticBackdrop,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  icon?: LucideIcon;
  /** فوق كل النوافذ الأخرى (نوافذ التأكيد) */
  top?: boolean;
  /** نوافذ النماذج: النقر خارج النافذة لا يغلقها (حتى لا يضيع ما كُتب) */
  staticBackdrop?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // onClose في مرجع: الأب يمرر دالة جديدة مع كل رسم، ولا نريد إعادة التركيز لأول حقل أثناء الكتابة
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Escape يغلق النافذة العليا فقط (نافذة تأكيد فوق نافذة أخرى)
        const dialogs = document.querySelectorAll('[role="dialog"]');
        if (dialogs[dialogs.length - 1] === ref.current) closeRef.current();
      } else if (e.key === "Tab" && ref.current) {
        // التنقل بـ Tab يبقى داخل النافذة
        const items = [...ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input,select,textarea,button:not([data-close])")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.(); // يعود التركيز للزر الذي فتح النافذة
    };
  }, [open]);
  if (!open) return null;
  // تُرسم النافذة في body مباشرة: لو كانت داخل عنصر عليه backdrop-blur أو transform (مثل الشريط العلوي)
  // يصبح موضعها نسبةً لذلك العنصر بدل الشاشة كلها
  return createPortal(
    <div className={cx("ds fixed inset-0 flex items-start justify-center overflow-y-auto bg-black/45 p-4 text-slate-900 backdrop-blur-[2px] sm:items-center", top ? "z-[2000000]" : "z-50")} dir="rtl" onMouseDown={staticBackdrop ? undefined : onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx("w-full overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-2xl", wide ? "max-w-4xl" : "max-w-lg")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-3.5">
          {icon && <IconTile icon={icon} size="sm" />}
          <h2 className="flex-1 font-bold">{title}</h2>
          <button type="button" data-close onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="إغلاق">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-start gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "موافق",
  cancelText = "رفض",
  danger,
  loading,
  confirmDisabled,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  /** يعطّل «موافق» حتى يكتمل شرط داخل الرسالة (سبب إلزامي، إقرار) */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const Icon = danger ? TriangleAlert : CircleHelp;
  return (
    <Modal
      open={open}
      top
      title={title}
      onClose={() => !loading && onClose()}
      footer={
        <>
          <Button variant={danger ? "danger" : "primary"} icon={Check} loading={loading} disabled={confirmDisabled} onClick={onConfirm} className="min-w-24" data-confirm="ok">
            {confirmText}
          </Button>
          <Button icon={X} disabled={loading} onClick={onClose} className="min-w-24" data-confirm="cancel">
            {cancelText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", danger ? "bg-rose-100 text-rose-700" : "bg-brand-100 text-brand-700")}>
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 pt-1 text-sm leading-relaxed text-slate-700">{message}</div>
      </div>
    </Modal>
  );
}

// نافذة التأكيد الموحدة عند الطلب: const confirm = useConfirm(); if (await confirm({...})) نفّذ
export type ConfirmOptions = { title: string; message: ReactNode; danger?: boolean; confirmText?: string; cancelText?: string };
const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending((current) => {
          current?.resolve(false); // طلب جديد يلغي السابق
          return { ...options, resolve };
        });
      }),
    [],
  );
  const finish = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={!!pending}
        title={pending?.title ?? ""}
        message={pending?.message}
        danger={pending?.danger}
        confirmText={pending?.confirmText}
        cancelText={pending?.cancelText}
        onConfirm={() => finish(true)}
        onClose={() => finish(false)}
      />
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

// ---------------------------------------------------------------------
// الإشعارات
// ---------------------------------------------------------------------
type Toast = { id: number; text: string; tone: "ok" | "error" };
const ToastContext = createContext<(text: string, tone?: "ok" | "error") => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-4 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cx("flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl", t.tone === "ok" ? "bg-emerald-600" : "bg-rose-600")}
          >
            {t.tone === "ok" ? <CircleCheck className="h-4 w-4" aria-hidden /> : <CircleAlert className="h-4 w-4" aria-hidden />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// أرقام الصفحات بين "السابق" و"التالي": الأولى والأخيرة والقريبة من الحالية، و"…" بينها
export function pageList(page: number, pages: number): (number | "…")[] {
  const set = new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2].filter((n) => n >= 1 && n <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((n, i) => {
    // فجوة صفحة واحدة تُعرض رقمها بدل «…»
    if (i && n - sorted[i - 1] === 2) out.push(n - 1);
    else if (i && n - sorted[i - 1] > 2) out.push("…");
    out.push(n);
  });
  return out;
}

export function Pagination({
  page,
  pages,
  onPage,
  pageSize,
  pageSizes,
  onPageSize,
  total,
  unit = "كتاب",
}: {
  page: number;
  pages: number;
  onPage: (p: number) => void;
  pageSize?: number;
  pageSizes?: number[];
  onPageSize?: (n: number) => void;
  total?: number;
  unit?: string;
}) {
  if (pages <= 1 && !(pageSizes && onPageSize) && total === undefined) return null;
  const btn = "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-sm tabular-nums";
  return (
    <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 px-4 py-2.5 text-sm print:hidden" aria-label="الصفحات">
      {pageSizes && onPageSize && (
        <label className="flex items-center gap-2 text-slate-600">
          عرض
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="h-8 rounded-lg border border-slate-300 bg-card px-2 text-sm text-slate-900 outline-none focus:border-brand-600"
          >
            {pageSizes.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          في الصفحة
          {total !== undefined && <span className="text-slate-400">· {total} {unit}</span>}
        </label>
      )}
      {!(pageSizes && onPageSize) && total !== undefined && (
        <span className="text-slate-600">
          {total} {unit}
        </span>
      )}
      <span className="flex-1" />
      {pages > 1 && (
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" className={cx(btn, "border-slate-300 px-3 hover:bg-slate-50 disabled:opacity-40")} disabled={page <= 1} onClick={() => onPage(page - 1)}>
            السابق
          </button>
          {pageList(page, pages).map((n, i) =>
            n === "…" ? (
              <span key={`e${i}`} className="px-1 text-slate-400">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                aria-current={n === page ? "page" : undefined}
                className={cx(btn, n === page ? "border-brand-700 bg-brand-700 font-bold text-on-brand" : "border-slate-300 hover:bg-slate-50")}
                onClick={() => onPage(n)}
              >
                {n}
              </button>
            ),
          )}
          <button type="button" className={cx(btn, "border-slate-300 px-3 hover:bg-slate-50 disabled:opacity-40")} disabled={page >= pages} onClick={() => onPage(page + 1)}>
            التالي
          </button>
        </div>
      )}
    </nav>
  );
}
