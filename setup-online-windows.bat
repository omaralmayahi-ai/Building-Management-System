@echo off
chcp 65001 >nul
title شركة نفط الوسط - تنصيب وتشغيل المنظومة (متصل بالإنترنت)
color 0A

echo ==============================================================================
echo       وزارة النفط العراقية - شركة نفط الوسط (MDOC)
echo       السجل الرقمي الموحد للأصول الهندسية والإنشائية
echo       سكربت التنصيب والتشغيل التلقائي - Windows Server (Online)
echo ==============================================================================
echo.

:: 1. التحقق من وجود Node.js
echo [1/5] التحقق من بيئة التشغيل Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [خطأ] Node.js غير مثبت على هذا السيرفر!
    echo يرجى تحميل وتثبيت Node.js (الإصدار 20 LTS أو أحدث) من الموقع الرسمي:
    echo https://nodejs.org
    echo ثم أعد تشغيل هذا الملف.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [+] تم العثور على Node.js الإصدار: %NODE_VER%

:: 2. إعداد ملف البيئة .env
echo.
echo [2/5] فحص ملف الإعدادات (.env)...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [+] تم إنشاء ملف .env جديد من النموذج الافتراضي.
    ) else (
        echo PORT=3000 > .env
        echo NODE_ENV=production >> .env
        echo [+] تم إنشاء ملف .env افتراضي.
    )
) else (
    echo [+] ملف .env موجود وجاهز.
)

:: 3. تثبيت كافة المكتبات والاعتماديات
echo.
echo [3/5] جاري تنزيل وتثبيت جميع المكتبات والاعتماديات عبر npm...
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo [خطأ] فشل تنصيب المكتبات عبر npm. يرجى التحقق من اتصال الإنترنت.
    pause
    exit /b 1
)
echo [+] تم تثبيت كافة المكتبات بنجاح.

:: 4. بناء المشروع للإنتاج (Production Build)
echo.
echo [4/5] جاري بناء وتجميع المنظومة (Production Build)...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo [خطأ] فشل بناء ملفات المشروع.
    pause
    exit /b 1
)
echo [+] تم بناء ملفات الإنتاج في مجلد dist بنجاح.

:: 5. تشغيل السيرفر
echo.
echo ==============================================================================
echo [5/5] تشغيل سيرفر المنظومة الآن...
echo ==============================================================================
echo [+] رابط الوصول المحلي:   http://localhost:3000
echo [+] للوصول من أجهزة الشبكة الداخلية (Intranet): استخدم عنوان IP الخاص بهذا السيرفر
echo [+] لإيقاف السيرفر: اضغط Ctrl + C
echo ==============================================================================
echo.

node dist/server.cjs
pause
