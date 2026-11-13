# نظام إدارة الأبنية والكرفانات — ملاحظات لـ Claude

نظام شعبة الأبنية والكرفانات في شركة نفط الوسط. المالك: عمر. الواجهة وكل النصوص عربية (RTL). تحدّث مع عمر بالعربية.

## الحالة
- النظام قيد الإصلاح وفق «خطة-الإصلاح-والتعديل» (مستندات مشروع Claude). المراحل 0 إلى 5.
- عند انتهاء كل مرحلة: حدّث جدول المتابعة في مستند الخطة، وسجّل commit ووسم `phase-N-done`.
- نقطة البداية الأصلية موسومة `baseline-original`. نسخة مضغوطة منها في `_safety/` (خارج Git).

## التقنيات الحالية
- React 19 + TypeScript + Vite 6 + Tailwind 4 (src/)، Express 4 (server.ts)، PostgreSQL عبر pg (src/db/)، Firebase Firestore (**باقٍ بقرار المالك 13-11-2026: أُوقفت إزالته**؛ لا تُحذف شيفرته ولا تُنقل بياناته دون طلب صريح).
- الهدف: Windows 10/11 أو Windows Server على شبكة داخلية بلا إنترنت. الخطوط والأصول تُضمَّن محلياً (لا CDN).
- المنفذ يُقرأ من PORT في .env (الافتراضي 3000).
- **GitHub (قرار 13-11-2026):** كل تعديل يُرفع إلى `main` في https://github.com/omaralmayahi-ai/Building-Management-System ، والفرع main هو دائماً آخر إصدار. المالك يحدّث حاسبته من زر «تحديث من GitHub» في لوحة التحكم (fetch ثم reset --hard origin/main ثم تنصيب وبناء). لا تُرفع الأسرار ولا البيانات: `.env` و `.data/` و `backups/` و `logs/` و `_safety/` خارج المستودع.

## قواعد العمل
- التحقق قبل كل commit: `npm run lint` (tsc --noEmit) ثم `npm run build` ثم `npm test`.
- لا تُنفَّذ `npm install` من بيئة Linux داخل مجلد النظام على ويندوز (حزم ثنائية خاصة بالمنصة). البناء للتحقق يجري على نسخة خارجية.
- التشغيل والإدارة عبر `control-app.bat` → `tools\\control-app.ps1` (منقولة من لوحة نظام ناظم بنفس الأزرار؛ الخادم يعمل عبر `tools\\run-server.ps1`؛ أدوات اللوحة في `script\\`؛ البيانات في `.data\\store.json`) (WinForms، متوافق مع Windows PowerShell 5.1، محفوظ UTF-8 مع BOM و CRLF؛ بلا ternary ولا ?? ولا &&). التعليمات لعمر تُعطى كأزرار في اللوحة لا كأوامر طرفية.
- التصميم المعتمد: أسلوب أنظمة الأرشفة (C:\prog\arch) وناظم والمخصصات وحجز القاعات — خط Cairo محلي، لون أساسي واحد `--primary` لكل ثيم، رموز `bg-card`/`bg-page` بدل `bg-white`، قائمة جانبية يمنى قابلة للطي، شريط حالة، نافذة تأكيد «موافق / رفض» لكل حذف أو تعديل. النطاق: الشكل والواجهة فقط.
- لا تُكتب أسرار أو كلمات مرور أو بيانات شخصية داخل الكود.

## المصادقة والصلاحيات (المرحلة 1)
- كل مسارات `/api` تتطلب جلسة (`Authorization: Bearer`) عدا: health، server-time، auth/login، auth/verify-session، download/*، و GET branding. مسار الأحداث `/api/sync/events` يقبل `?token=`.
- جدول الصلاحيات في server.ts (`roleKind` / `isWriteAllowed`): الإعدادات والمستخدمون والهيكل التنظيمي وكل مسارات `*/bulk` للمدير فقط؛ إنشاء الوحدات وحذفها والإشغال للمشغل؛ تعديل الوحدة للمشغل وموظفي الكشف والصيانة؛ الكشوفات للمشغل وموظف الكشف؛ رفع طلب صيانة لأي مستخدم وتعديله لغير دور «مستخدم». أي مسار كتابة جديد يجب إضافته للجدول وإلا رُفض.
- التحقق من المدخلات بـ zod في server.ts (`bodySchemas` / `validateRequestBody`). حد جسم الطلب 25MB.
- كلمات المرور `scrypt$<salt>$<hash>` (`hashSecurePassword` / `secureUsersForStore`، ونفس الصيغة في script/panel-tools.mjs). القديمة تُرقّى عند الإقلاع وعند الدخول. الدخول بكلمة افتراضية (`DEFAULT_PASSWORDS`) يفرض تغييرها (`mustChangePassword`) قبل أي طلب آخر.
- الجلسات في `.data/sessions.json`. لا تُرسل كلمة المرور في أي استجابة ولا تُحفظ في localStorage ولا في Firestore.
- تغيير كلمة المرور الشخصية: `POST /api/auth/change-password`. لا يوجد دخول بديل داخل المتصفح.
- الاختبارات: `npm test` (node:test، tests/security.test.mjs) تشغّل dist/server.cjs بمنفذ مؤقت و`BMS_DATA_DIR` مؤقت. يجب أن تمر قبل كل commit يمس الخادم.
- إزالة Firestore أُلغيت بقرار المالك (13-11-2026). المرحلة 2 (مصدر واحد للحقيقة) تحتاج إعادة تحديد نطاق مع بقاء Firestore. ما زال موقع البيانات الحقيقية غير معروف — يُذكَّر المالك بتصديرها إلى `_safety`.

## التصميم المعتمد (4-أ منجزة؛ 4-ب: التحويل الآلي لكل الشاشات والنوافذ منجز، بقي اعتماد مكوّنات ui.tsx وتقسيم المكوّنات الكبيرة)
- الرموز في `src/index.css` (منقولة من نظام الأرشفة): `--primary` لكل ثيم (`[data-theme]`)، `brand-*` مشتقة منه، `bg-card` / `bg-page` / `bg-sidebar` / `text-on-brand`. الخطوط محلية (@fontsource). `dark:` يتبع الصنف `.dark` على `<html>` لا نظام التشغيل.
- `src/lib/theme.ts`: الثيمات التسعة («buildings» الافتراضي + لوحات ناظم الثماني)، الخطوط، `applyAppearance`. المظهر الافتراضي ضمن هوية النظام (`branding.themeId/fontId/sidebarStyle`، الإعدادات ← الهوية ← «مظهر الواجهة»). تفضيلات كل مستخدم فوقه في `user.uiPrefs` {theme,font,sidebar,collapsed} عبر `PATCH /api/auth/preferences` (null = العودة لمظهر النظام)، وقائمة «مظهر الواجهة» في الترويسة (`AppearanceMenu.tsx`). الوضع الداكن من زر المستخدم (`app_theme`). `effectiveAppearance` في App.tsx.
- المحوَّل: `Sidebar.tsx`، `StatusBar.tsx` (يعتمد `GET /api/status`)، شريط `Header.tsx` العلوي (زر طيّ القائمة في بدايته)، `AppearanceMenu.tsx`. الترتيب العلوي: شريط الحالة ثابت 30px، الترويسة `top-[30px]`، القائمة `top-[91px]`.
- `src/components/ui.tsx`: مجموعة المكوّنات الموحدة منقولة من الأرشفة (Button، Input، Select، Field، Card، PageHeader، Tabs، Badge، Table، EmptyState، Modal، ConfirmDialog، ToastProvider، Pagination). لم تُستخدم في الشاشات بعد.
- التنقل: كل تبويب له مسار من مقطع واحد (`/dashboard`، `/units`، `/gis-map`...) عبر History API في App.tsx (`tabFromLocation` / `pathForTab` / `isTabAllowedForRole`). المسارات من مقطع واحد فقط لأن `base: './'` في vite.
- **نطاق `.ds` (4-ب):** الصنف `ds` على `<body>` وجذر التطبيق؛ داخله ينقلب سلّم slate والألوان الدلالية (50/100/200 و600–900) في الوضع الداكن، فتُكتب الأصناف بصيغة الوضع الفاتح فقط (`bg-card`، `text-slate-900`، `border-slate-200`، `text-emerald-600`...). لا تكتب شروط `isLight` للألوان ولا `dark:` ولا `bg-white` للأسطح ولا درجات 300/400/950 للنصوص والحدود.
- `ds-off` يعيد الدرجات الأصلية لمكوّن يلوّن نفسه: `ThreeBuildingCanvas`، `DroneHudOverlay`، `InteractiveEngineeringEditor`، `Sidebar`، `StatusBar`، وبطاقات QR المطبوعة (تبقى بيضاء).
- الخلفيات الصلبة `bg-<لون>-600/700/800` تبقى بدرجتها الأصلية في الداكن (قواعد في index.css) لتصلح مع نص أبيض. الزر الأساسي: `bg-brand-700 hover:bg-brand-800 text-on-brand`.
- `script/ds-codemod.py <ملفات>`: المحوّل الآلي (يزيل شروط isLight ويحوّل amber إلى brand). استُخدم على كل `src/components` عدا مكوّنات `ds-off` و`ui.tsx`. ما بقي من `isLight` وظيفي (أيقونة الشمس/القمر، خصائص تُمرَّر للمكوّنات ثلاثية الأبعاد).
- ما زالت قواعد تجاوز `.light` في index.css والصنف `light`/`dark` على جذر التطبيق؛ تُزال عند التنظيف (المرحلة 5) بعد فحص بصري.
- الفحص البصري: playwright + google-chrome على نسخة البناء الخارجية بالوضعين وبمقاس الهاتف، مع فحص آلي لتباين النصوص (أقل من 2.6 يُعدّ عيباً). لم تُفحص بعد النوافذ التي تحتاج بيانات (تعديل وحدة، بطاقات QR، عارض المرفقات، المخطط التنظيمي، المجسّم ثلاثي الأبعاد).

## معروف وغير محلول (تفاصيله في تقرير المراجعة)
- أربعة مخازن بيانات (Firestore، PostgreSQL، ذاكرة + .data/store.json، localStorage).
- مسارات bulk تحذف ما ليس في القائمة المرسلة.
- أعمدة لا تُكتب في units: unit_type_code، land_area_sq_m، roof_type، structure_type.
- قواعد Firestore المنشورة فعلياً ترفض القراءة المجهولة (403)، خلافاً لملف firestore.rules المحلي.
