# نظام إدارة الأبنية والكرفانات — ملاحظات لـ Claude

نظام شعبة الأبنية والكرفانات في شركة نفط الوسط. المالك: عمر. الواجهة وكل النصوص عربية (RTL). تحدّث مع عمر بالعربية.

## الحالة
- النظام قيد الإصلاح وفق «خطة-الإصلاح-والتعديل» (مستندات مشروع Claude). المراحل 0 إلى 5.
- عند انتهاء كل مرحلة: حدّث جدول المتابعة في مستند الخطة، وسجّل commit ووسم `phase-N-done`.
- نقطة البداية الأصلية موسومة `baseline-original`. نسخة مضغوطة منها في `_safety/` (خارج Git).

## التقنيات الحالية
- React 19 + TypeScript + Vite 6 + Tailwind 4 (src/)، Express 4 (server.ts)، PostgreSQL عبر pg (src/db/) وهو المصدر المعتمد، Firestore نسخة مزامنة يرسلها الخادم فقط (لا مكتبة Firebase في المتصفح؛ الحزمة `firebase` ما زالت في package.json وتُحذف في المرحلة 5).
- الهدف: Windows 10/11 أو Windows Server على شبكة داخلية بلا إنترنت. الخطوط والأصول تُضمَّن محلياً (لا CDN).
- المنفذ يُقرأ من PORT في .env (الافتراضي 3000).
- **GitHub (قرار 13-11-2026):** كل تعديل يُرفع إلى `main` في https://github.com/omaralmayahi-ai/Building-Management-System ، والفرع main هو دائماً آخر إصدار. المالك يحدّث حاسبته من زر «تحديث من GitHub» في لوحة التحكم (fetch ثم reset --hard origin/main ثم تنصيب وبناء). لا تُرفع الأسرار ولا البيانات: `.env` و `.data/` و `backups/` و `logs/` و `_safety/` خارج المستودع.
- **طريقة العمل (قرار 14-11-2026):** التطوير كله على نسخة المستودع ثم الرفع إلى `main` فقط. **لا تُكتب الملفات في مجلد النظام على حاسبة المالك ولا يُسجَّل فيه commit**؛ المالك يسحب التعديلات بزر «تحديث من GitHub». الوصول إلى الحاسبة يقتصر على ما يطلبه المالك صراحة (مثل قراءة سجل لتشخيص خطأ). الهدف تقليل استهلاك رصيد الجلسة: ردود قصيرة، وفحص يتناسب مع حجم التعديل.

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
- الجلسات في PostgreSQL (مجموعة `sessions`)، وفي `.data/sessions.json` في وضع الملف فقط. لا تُرسل كلمة المرور في أي استجابة ولا تُحفظ في localStorage ولا في Firestore.
- تغيير كلمة المرور الشخصية: `POST /api/auth/change-password`. لا يوجد دخول بديل داخل المتصفح.
- الاختبارات: `npm test` (node:test) تشغّل dist/server.cjs بمنفذ مؤقت و`BMS_DATA_DIR` مؤقت: `tests/security.test.mjs` (وضع الملف) و`tests/storage.test.mjs` (PostgreSQL مؤقت عبر initdb، أو `BMS_TEST_DATABASE_URL`؛ تُتخطى إن لم يتوفر PostgreSQL). يجب أن تمر قبل كل commit يمس الخادم.
## تخزين البيانات (المرحلة 2 منجزة 14-11-2026)
- **القرارات:** خادم النظام هو المصدر المعتمد الوحيد وقاعدته PostgreSQL؛ Firestore نسخة مزامنة فقط؛ لا بيانات حقيقية للاستعادة (لا تُذكِّر بتصديرها)؛ مسار GitHub Pages حُذف.
- `src/db/storage.ts`: وضعان. `postgres` عند ضبط `DATABASE_URL` (جدول `bms_records(collection,id,data JSONB,version)` + `bms_audit` + `schema_migrations`؛ الترحيلات في مصفوفة `MIGRATIONS`). `file` بدونه (`.data/store.json`، للتجربة والاختبارات فقط، ويظهر تحذير في شريط الحالة). القيمة النموذجية `CHANGE_ME` تُعدّ غير مضبوطة. التشفير فقط مع `DATABASE_SSL=true` أو `sslmode=require`.
- server.ts يحتفظ بنسخة عاملة في الذاكرة (`memStore`) ويكتب كل تغيير عبر `commit(keys, ids?)` **قبل الرد**؛ عند فشل الكتابة تُعاد الذاكرة لآخر حالة محفوظة ويُرد 503 `DB_UNAVAILABLE`. أي مسار كتابة جديد يجب أن ينتظر `commit`. لا يُكتب ملف بيانات محلي في وضع postgres.
- أول تشغيل على قاعدة فارغة ينقل `store.json` إليها ثم يعيد تسميته `store.imported-*.json`. فشل الاتصال بالقاعدة عند الإقلاع يوقف الخادم برسالة واضحة.
- مراقبة القاعدة كل 15 ثانية (`BMS_DB_HEALTH_INTERVAL_MS`): أثناء توقفها كل `/api` يرد 503 عدا health/server-time/status/download؛ عند عودتها تُعاد القراءة منها.
- المجموعات عبر `registerCollection` (units، maintenance، occupancy، inspections، org-entities، audit-logs): GET، POST (إضافة أو تحديث)، PUT `/:id`، DELETE `/:id`، `POST /batch {upserts, deletes}` (ذرّية، صلاحية كل سجل تُفحص)، `POST /bulk` (للمدير؛ يضيف ويحدّث **ولا يحذف**). كل سجل يحمل `_v` و`_updatedAt` و`_updatedBy`؛ إرسال `_v` قديم يرد 409 `VERSION_CONFLICT` مع السجل الحالي.
- سجل النشاطات `audit-logs` إضافة فقط (لا PUT ولا DELETE ولا تفريغ؛ `reset-module audit_logs` يرد 403، وضبط المصنع يبقيه). سجل التدقيق الذي يكتبه الخادم لكل طلب كتابة (ناجح أو مرفوض، بلا محتوى الطلب): `GET /api/audit-trail` للمدير. **لا توجد له شاشة في الواجهة بعد.**
- `GET /api/health` عام ولا يعيد بيانات تشغيلية. `GET /api/status` يعيد `storage{mode,healthy}` و`mirror` (للمدير).
- `src/db/firestoreMirror.ts`: يُفعَّل بـ `FIREBASE_SERVICE_ACCOUNT_PATH` (ملف مفتاح حساب خدمة؛ لا يُرفع). يرسل عبر REST كل 30 ثانية، قائمة الانتظار في `.data/mirror-queue.json`، كلمات المرور والجلسات لا تُرسل، المستند الأكبر من ~900KB يُتخطى. فشله لا يعطّل العمل. **اختُبر بخادم وهمي فقط، لا على Firestore حقيقي.**
- الواجهة: `src/services/http.ts` (`apiRequest` بنتيجة صريحة، `onApiError`، `requestResync`)؛ `apiClient.ts` يعتمد الخادم فقط عبر `ServerCollection` (حفظ القوائم يرسل الفرق إلى `/batch`؛ `_v` يُحدَّث بعد كتابتنا). فشل الحفظ يظهر في تنبيه أحمر أسفل الشاشة (App.tsx `saveError`) ثم تُعاد قراءة البيانات. localStorage يبقى نسخة للعرض عند انقطاع الاتصال (App.tsx ما زال يكتبها)، لا مصدراً.
- قائمة الانتظار دون اتصال (`syncQueue.ts`) لطلبات الصيانة والكشوفات: ترسل للخادم برمز الجلسة؛ تعيد المحاولة عند انقطاع الخادم (0/401/429/5xx) وتُسقط العملية مع تنبيه عند الرفض النهائي.
- تحميل البيانات والاشتراك في أحداث الخادم يعتمدان على `currentUser?.id` (يعملان بعد الدخول دون إعادة تحميل الصفحة).
- لوحة التحكم: زر «إعداد PostgreSQL» (`Invoke-SetupPostgres`: ينشئ `bms_user`/`bms_db` عبر psql ويكتب `DATABASE_URL` في .env). أدوات اللوحة تقرأ وتكتب عبر `script/store-io.mjs` في الوضعين (النسخ الاحتياطي يصدّر store.json + database.dump، الاستعادة `panel-tools.mjs restore`، كلمة مرور المدير). زر «كلمة مرور PostgreSQL» (`Invoke-ResetPostgresPassword`) لاستعادة كلمة مرور المستخدم postgres المنسية: يضيف مؤقتاً سطر trust لـ 127.0.0.1 أعلى `pg_hba.conf` (نسخة في `pg_hba.conf.bms-backup`)، يعيد قراءة الإعداد، ينفّذ ALTER USER، ثم يعيد الملف الأصلي دائماً. الزران شُغّلا بنجاح على حاسبة المالك في 14-11-2026 (PostgreSQL 16): عُيّنت الكلمة، أُنشئت القاعدة، ونُقلت بيانات store.json. **حاسبة المالك تعمل الآن على PostgreSQL.**
- **المرفقات ملفات على القرص (المرحلة 3-أ):** `src/db/fileStore.ts`. أي نص `data:...;base64,` بطول 512 فأكثر داخل سجل (units، maintenance، occupancy، inspections) يُخرجه الخادم عند الحفظ (`stampRecord`) وعند الإقلاع إلى `.data/files/<sha256>.<ext>` ويضع مكانه `/api/files/<الاسم>`. هوية النظام (الشعار) تبقى مضمّنة لأن شاشة الدخول عامة. `GET /api/files/:name` يتطلب جلسة: ترويسة Bearer أو الكعكة `bms_files` (HttpOnly، SameSite=Strict، محصورة بـ `/api/files`، يضعها الخادم مع الدخول ومع أي طلب موثَّق، ولا تفتح أي مسار آخر). الصور و PDF و glb تُعرض، وغيرها يُنزَّل كملف (`nosniff` و CSP sandbox). الملفات اليتيمة الأقدم من يوم تُحذف عند الإقلاع. النسخ الاحتياطي ينسخ `.data/files` والاستعادة تعيده. المرفقات لا تُعرض دون اتصال بالخادم.
- **حذف الوحدة:** وحدة لها صيانة أو كشوفات أو إشغال لا تُحذف (409 `UNIT_HAS_HISTORY`، في DELETE وفي `/batch`)؛ تُشطب من الواجهة. ضبط المصنع وإعادة ضبط الأقسام غير مشمولين.
- لم يُستخدم Drizzle: التخزين مستندات JSONB. الجداول العلائقية (غرف، معدات، تواريخ، مرفقات كملفات) هي المرحلة 3 وتُضاف كترحيلات في `MIGRATIONS`.

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
- الفحص البصري: playwright + google-chrome على نسخة البناء الخارجية بالوضعين وبمقاس الهاتف، مع فحص آلي لتباين النصوص (أقل من 2.6 يُعدّ عيباً). فُحصت بوحدة تجريبية: تفاصيل الوحدة والمجسّم، نافذة التعديل، QR الوحدة، الخريطة، المحرر الهندسي، الشطب، المرفقات. لم تُفحص: بطاقة QR للغرفة، عارض المرفقات بملف فعلي، المخطط التنظيمي، بقية الثيمات الثمانية.
- أشرطة أدوات المجسّم تتبع `darkChrome` (الوضع الليلي للمجسّم أو الوضع الداكن للنظام) في `ThreeBuildingCanvas.tsx`.

## معروف وغير محلول (تفاصيله في تقرير المراجعة)
- بيانات الوحدة مستند JSON واحد (الغرف والمعدات والمرفقات داخله، والتواريخ نصوص): المرحلة 3.
- App.tsx ما زال يكتب نسخ العرض في localStorage ويحدّث الحالة قبل رد الخادم (تُصحَّح بإعادة القراءة عند الفشل).
- `memStore` يحمّل كل البيانات في ذاكرة الخادم؛ مناسب لحجم الشعبة الحالي لا لعشرات آلاف الوحدات بمرفقاتها.
- قواعد Firestore المنشورة ترفض القراءة المجهولة (403)، خلافاً لملف firestore.rules المحلي.
- docker-compose.yml يشير إلى database/init.sql القديم: المرحلة 5.
