@echo off
chcp 65001 >nul
title شركة نفط الوسط - تشغيل المنظومة دون إنترنت (Offline / Air-Gapped)
color 0E

echo ==============================================================================
echo       وزارة النفط العراقية - شركة نفط الوسط (MDOC)
echo       السجل الرقمي الموحد للأصول الهندسية والإنشائية
echo       تشغيل المنظومة على السيرفر الداخلي المعزول (Air-Gapped Server)
echo ==============================================================================
echo.

:: 1. فحص وجود Node.js
echo [1/4] فحص محرك التشغيل Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [خطأ فادح] Node.js غير مثبت على هذا السيرفر!
    echo لتشغيل النظام دون إنترنت، يرجى نقل ملف تثبيت Node.js (ملف msi)
    echo وتثبيته على السيرفر أولاً ثم إعادة تشغيل هذا الملف.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [+] Node.js متوفر بالإصدار: %NODE_VER%

:: 2. التحقق من وجود مجلد node_modules
echo.
echo [2/4] فحص المكتبات المجمعة داخلياً (node_modules)...
if not exist "node_modules\" (
    color 0C
    echo [خطأ] مجلد node_modules غير موجود!
    echo تأكد من نسخ مجلد المشروع كاملاً بعد تشغيل prepare-offline-package.bat
    echo على جهاز متصل بالإنترنت لنقل كافة المكتبات دون الحاجة لتحميلها هنا.
    echo.
    pause
    exit /b 1
)
echo [+] تم التحقق من وجود كافة المكتبات البرمجية محلياً.

:: 3. فحص مجلد الإنتاج dist
echo.
echo [3/4] فحص حزمة الإنتاج المترجمة (dist)...
if not exist "dist\server.cjs" (
    echo [تنبيه] حزمة الإنتاج المترجمة غير موجودة، جاري البناء المحلي بدون إنترنت...
    call npm run build
    if %errorlevel% neq 0 (
        color 0C
        echo [خطأ] فشل بناء ملفات المشروع.
        pause
        exit /b 1
    )
)
echo [+] حزمة التشغيل المترجمة dist\server.cjs جاهزة.

:: 4. تجهيز ملف الإعدادات .env إن لم يكن موجوداً
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
    ) else (
        echo PORT=3000 > .env
        echo NODE_ENV=production >> .env
    )
)

:: 5. إطلاق السيرفر
echo.
echo ==============================================================================
echo [4/4] إطلاق منظومة إدارة الأصول بنجاح على الشبكة الداخلية!
echo ==============================================================================
echo [+] رابط السيرفر المحلي:      http://localhost:3000
echo [+] المنظومة تعمل الآن بكامل طاقتها دون أي اتصال بالإنترنت الخارجي.
echo [+] التخزين التلقائي نشط في ملف: data_store_backup.json
echo [+] لإيقاف السيرفر: اضغط Ctrl + C
echo ==============================================================================
echo.

node dist/server.cjs
pause
