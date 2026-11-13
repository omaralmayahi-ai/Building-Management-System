#!/usr/bin/env python3
"""تحويل آلي أولي لشاشة قديمة إلى التصميم المعتمد (المرحلة 4-ب).

الاستعمال:  python3 script/ds-codemod.py src/components/SomeView.tsx [...]

ما يفعله (ثم تُراجع الشاشة بصرياً بالوضعين الفاتح والداكن):
  1. يحذف شرط  isLight ? 'فاتح' : 'داكن'  ويُبقي أصناف الوضع الفاتح.
  2. يحذف أصناف dark:* (داخل .ds ينقلب سلّم الألوان تلقائياً في الوضع الداكن).
  3. يحوّل الأصناف الداكنة الثابتة إلى مقابلها الفاتح (كانت تُصحَّح بتجاوزات .light في index.css).
  4. bg-white ← bg-card، ولون التمييز amber ← brand (لون الثيم).
لا يضيف الصنف ds إلى حاوية الشاشة: أضفه يدوياً على العنصر الجذر.
"""
import re
import sys

TERNARY = [
    re.compile(r"isLight\s*\?\s*'([^']*)'\s*:\s*'[^']*'", re.S),
    re.compile(r'isLight\s*\?\s*"([^"]*)"\s*:\s*"[^"]*"', re.S),
    re.compile(r"isLight\s*\?\s*`([^`$]*)`\s*:\s*`[^`$]*`", re.S),
]

STRONG_BG = re.compile(
    r"(?:^|\s)(?:[a-z-]+:)*(?:bg-(?:brand|emerald|rose|red|blue|sky|indigo|green|teal|orange|purple|violet|cyan|pink)-[5-9]00|bg-gradient-|bg-linear-|from-)"
)


def map_token(tok: str, light_source: bool, strong_bg: bool) -> str:
    # البادئات (hover: / sm: / focus: ...) تبقى كما هي
    parts = tok.split(":")
    prefix, cls = parts[:-1], parts[-1]
    if "dark" in prefix:
        return ""
    important = cls.startswith("!")
    if important:
        cls = cls[1:]

    def out(new: str) -> str:
        return ":".join(prefix + [("!" if important else "") + new])

    m = re.fullmatch(r"bg-white(/\d+)?", cls)
    if m:
        return out("bg-card" + (m.group(1) or ""))

    # لون التمييز: amber ← brand
    m = re.fullmatch(r"(bg|text|border|ring|from|to|via|shadow|outline|accent|fill|stroke|decoration|divide|border-[trblxyse])-amber-(\d+)(/\d+)?", cls)
    if m:
        kind, shade, op = m.group(1), int(m.group(2)), m.group(3)
        if kind == "shadow":
            return ""
        if kind == "bg":
            if op or shade <= 100:
                return out("bg-brand-50" if (shade <= 50 or (op and int(op[1:]) <= 12)) else "bg-brand-100")
            if shade <= 200:
                return out("bg-brand-100")
            return out("bg-brand-800" if ("hover" in prefix or shade >= 700) else "bg-brand-700")
        if kind == "text":
            return out("text-brand-800" if shade >= 800 else "text-brand-700")
        if kind.startswith("border") or kind in ("divide", "outline"):
            return out(f"{kind}-brand-600" if ("focus" in prefix or (shade >= 500 and not op)) else f"{kind}-brand-200")
        if kind == "ring":
            return out("ring-brand-600" + (op or ""))
        if kind in ("from", "via"):
            return out(f"{kind}-brand-600")
        if kind == "to":
            return out("to-brand-800")
        return out(f"{kind}-brand-700")

    if cls == "text-slate-950" and strong_bg:
        return out("text-on-brand")

    if light_source:
        return tok

    # أصناف داكنة ثابتة ← مقابلها الفاتح
    m = re.fullmatch(r"bg-slate-(950|900)(/\d+)?", cls)
    if m:
        return out("bg-card" + (m.group(2) or ""))
    m = re.fullmatch(r"bg-slate-(800|700)(/\d+)?", cls)
    if m:
        return out("bg-slate-100")
    m = re.fullmatch(r"(border(?:-[trblxyse])?|divide)-slate-(800|700|600)(/\d+)?", cls)
    if m:
        return out(f"{m.group(1)}-slate-200")
    if cls == "text-white" and not strong_bg:
        return out("text-slate-900")
    m = re.fullmatch(r"text-slate-(50|100|200)", cls)
    if m:
        return out("text-slate-800")
    if cls == "text-slate-300":
        return out("text-slate-600")
    if cls == "text-slate-400":
        return out("text-slate-500")
    return tok


CLASS_TOKEN = re.compile(r"[^\s'\"`{}$]+")


def map_class_string(text: str, light_source: bool) -> str:
    strong = bool(STRONG_BG.search(text)) or "bg-amber-500" in text or "bg-amber-600" in text

    def repl(m: re.Match) -> str:
        tok = m.group(0)
        if "-" not in tok or tok.startswith(("http", "/", "@", "#")):
            return tok
        return map_token(tok, light_source, strong)

    res = CLASS_TOKEN.sub(repl, text)
    return re.sub(r"[ \t]{2,}", " ", res)


def looks_like_classes(text: str) -> bool:
    return bool(re.search(r"(?:^|\s)(?:[a-z-]+:)*(?:bg|text|border|rounded|flex|grid|p[xytrbl]?|m[xytrbl]?|w|h|gap|font|shadow|ring|hover|dark)[-:]", text))


def convert(src: str) -> str:
    kept = []

    def keep(m: re.Match) -> str:
        kept.append(map_class_string(m.group(1), True))
        return f"'\x00KEEP{len(kept) - 1}\x00'"

    for pat in TERNARY:
        src = pat.sub(keep, src)

    # بقية النصوص: نحوّل ما يبدو قائمة أصناف فقط
    def literal(m: re.Match) -> str:
        quote, body = m.group(1), m.group(2)
        if "\x00KEEP" in body or not looks_like_classes(body):
            return m.group(0)
        return quote + map_class_string(body, False) + quote

    src = re.sub(r"(['\"])((?:(?!\1)[^\\\n])*)\1", literal, src)

    # القوالب متعددة الأسطر `...${...}...`: تُحوَّل الأجزاء النصية خارج ${}
    def template(m: re.Match) -> str:
        body = m.group(1)
        if not looks_like_classes(body):
            return m.group(0)
        pieces = re.split(r"(\$\{(?:[^{}]|\{[^{}]*\})*\})", body)
        for i in range(0, len(pieces), 2):
            pieces[i] = map_class_string(pieces[i], False)
        return "`" + "".join(pieces) + "`"

    src = re.sub(r"`((?:[^`\\]|\\.)*)`", template, src)

    for i, text in enumerate(kept):
        src = src.replace(f"'\x00KEEP{i}\x00'", "'" + text + "'")
    # تبسيط ما بقي من الشرط المحذوف داخل القوالب: ${ 'a b' } ← a b
    src = re.sub(r"\$\{\s*'([^'`$]*)'\s*\}", r"\1", src)
    return src


if __name__ == "__main__":
    for path in sys.argv[1:]:
        with open(path, encoding="utf-8") as f:
            before = f.read()
        after = convert(before)
        with open(path, "w", encoding="utf-8") as f:
            f.write(after)
        print(f"{path}: isLight {before.count('isLight')} -> {after.count('isLight')}, amber {len(re.findall('amber-', before))} -> {len(re.findall('amber-', after))}")
