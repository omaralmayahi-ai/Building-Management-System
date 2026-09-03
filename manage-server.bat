@echo off
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: ============================================================================
:: دليل التعليمات والملاحظات الهامة قبل التشغيل
:: ============================================================================
::
:: [ملاحظة 1]: مسار مجلد المشروع على القرص الصلب
:: [الإجراء 1]: تأكد أن الاسم في متغير PROJECT_DIR يطابق تماماً اسم المجلد بعد فك الضغط (قد يكون بدون -main).
::
:: ----------------------------------------------------------------------------
::
:: [ملاحظة 2]: مسار برنامج Node.js
:: [الإجراء 2]: تأكد أن المسار في متغير NODE_PATH يشير إلى مكان ملف node.exe المنصب على جهازك.
::
:: ----------------------------------------------------------------------------
::
:: [ملاحظة 3]: إصدار قاعدة بيانات PostgreSQL ومسار ملفاتها
:: [الإجراء 3]: إذا قمت بتنصيب إصدار غير 16 (مثل 15 أو 17)، غيّر الرقم 16 في متغير PG_BIN وكذلك في متغير PG_SERVICE_NAME بالأسفل.
::
:: ----------------------------------------------------------------------------
::
:: [ملاحظة 4]: بيانات الاتصال بقاعدة البيانات (اسم المستخدم وكلمة المرور)
:: [الإجراء 4]: قم بتغيير DB_USER و DB_PASSWORD و DB_NAME لتطابق ما قمت بإنشائه داخل سيرفر PostgreSQL.
::
:: ----------------------------------------------------------------------------
::
:: [ملاحظة 5]: أمان مفتاح الربط البرمجي API Secret Key
:: [الإجراء 5]: غيّر القيمة الافتراضية في API_SECRET_KEY إلى رمز سري قوي، ويجب أن يطابق ما تدخله في شاشة إعدادات النظام.
::
:: ----------------------------------------------------------------------------
::
:: [ملاحظة 6]: منفذ تشغيل النظام (Port)
:: [الإجراء 6]: المنفذ الافتراضي هو 3000، إذا كان هذا المنفذ محجوزاً لبرنامج آخر في السيرفر يمكنك تغييره من متغير APP_PORT.
::
:: ----------------------------------------------------------------------------
::
:: [ملاحظة 7]: تشغيل النظام بنظام التشفير الآمن (HTTPS)
:: [الإجراء 7]: إذا لم تكن تمتلك شهادة أمان SSL رسمية بعد، يمكنك استخدام الخيار رقم 12 في القائمة لتوليد شهادة داخلية مجاناً.
::
:: ----------------------------------------------------------------------------
::
:: [ملاحظة 8]: أمان الحساب الافتراضي للمدير العام (Admin)
:: [الإجراء 8]: قبل الاستخدام الفعلي، يُنصح بتغيير كلمة المرور الافتراضية (admin123) من داخل شاشة المستخدمين بالنظام.
::
:: ============================================================================

:: ============================================================================
:: إعداد المتغيرات الأساسية (عدّل هذه القيم حسب بيئة السيرفر لديك)
:: ============================================================================

:: 1. مسارات النظام والتشغيل
set PROJECT_DIR=C:\prog\Building-Management-System-main
set NODE_PATH=C:\Program Files\nodejs\node.exe
set NSSM="%~dp0nssm.exe"
set SERVICE_NAME=BuildingsManagementServer

:: 2. إعدادات قاعدة بيانات PostgreSQL
set PG_VERSION=16
set PG_SERVICE_NAME=postgresql-x64-%PG_VERSION%
set PG_BIN=C:\Program Files\PostgreSQL\%PG_VERSION%\bin
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=midland_assets_db
set DB_USER=oil_user
set DB_PASSWORD=CHANGE_ME_BEFORE_DEPLOY

:: 3. إعدادات الحماية والشبكة
set API_SECRET_KEY=CHANGE_ME_BEFORE_DEPLOY
set APP_PORT=3000

:: 4. مسارات شهادات الأمان (HTTPS)
set HTTPS_CERT_PATH=%PROJECT_DIR%\certs\cert.pem
set HTTPS_KEY_PATH=%PROJECT_DIR%\certs\key.pem

:: 5. مجلد النسخ الاحتياطية
set BACKUP_DIR=%PROJECT_DIR%\backups

title Central Oil Co - Buildings & Caravans System Control (Admin)

:menu
cls
echo =======================================================
echo   Central Oil Company - Asset Management System
echo   لوحة تحكم خادم نظام إدارة الأبنية والكرفانات (Admin)
echo =======================================================
echo.
echo   1. Install ^& Start Permanent Service (تنصيب وتشغيل الخدمة الدائمة)
echo   2. Stop Service (إيقاف الخدمة)
echo   3. Start Service (تشغيل الخدمة)
echo   4. Restart Service (إعادة تشغيل الخدمة)
echo   5. View Service Status (عرض حالة الخدمة وقاعدة البيانات)
echo   6. Remove Service (حذف الخدمة)
echo   7. Rebuild (إعادة بناء وتحديث الكود بأمان)
echo   8. Backup Database Now (أخذ نسخة احتياطية من قاعدة البيانات)
echo   9. Check System Health (فحص صحة واستجابة السيرفر)
echo   10. Open in Browser (فتح النظام في المتصفح)
echo   11. Exit (خروج)
echo   12. Generate Self-Signed HTTPS Certificate (توليد شهادة أمان مشفرة)
echo.
echo =======================================================
if exist "%HTTPS_CERT_PATH%" (
    echo   Status: HTTPS certificate found - Secure Mode Enabled.
) else (
    echo   Status: No HTTPS certificate found - Plain HTTP Mode.
)
echo =======================================================
set /p choice="Enter your choice (اختر رقم العملية): "
if "%choice%"=="1" goto install
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto start
if "%choice%"=="4" goto restart
if "%choice%"=="5" goto status
if "%choice%"=="6" goto remove
if "%choice%"=="7" goto build
if "%choice%"=="8" goto backup
if "%choice%"=="9" goto health
if "%choice%"=="10" goto browser
if "%choice%"=="11" exit
if "%choice%"=="12" goto gencert
goto menu

:install
echo.
echo Checking PostgreSQL service (%PG_SERVICE_NAME%)...
sc query %PG_SERVICE_NAME% >nul 2>&1
if %errorLevel% equ 0 (
    net start %PG_SERVICE_NAME% >nul 2>&1
    echo PostgreSQL service is running.
) else (
    echo [WARNING] PostgreSQL Windows service "%PG_SERVICE_NAME%" not found.
    echo Please verify the PostgreSQL version number in the script settings.
    pause
)

echo.
echo Setting environment variables (system-wide)...
setx DATABASE_URL "postgres://%DB_USER%:%DB_PASSWORD%@%DB_HOST%:%DB_PORT%/%DB_NAME%" /M >nul
setx API_SECRET_KEY "%API_SECRET_KEY%" /M >nul
setx VITE_API_KEY "%API_SECRET_KEY%" /M >nul
setx NODE_ENV "production" /M >nul
setx PORT "%APP_PORT%" /M >nul
if exist "%HTTPS_CERT_PATH%" (
    setx HTTPS_CERT_PATH "%HTTPS_CERT_PATH%" /M >nul
    setx HTTPS_KEY_PATH "%HTTPS_KEY_PATH%" /M >nul
    echo HTTPS certificate found - server configured for secure SSL mode.
) else (
    echo [NOTE] Running in standard HTTP mode.
)

cd /d %PROJECT_DIR%
%NSSM% stop %SERVICE_NAME% >nul 2>&1
%NSSM% remove %SERVICE_NAME% confirm >nul 2>&1
%NSSM% install %SERVICE_NAME% "%NODE_PATH%" "dist\server.cjs"
%NSSM% set %SERVICE_NAME% AppDirectory "%PROJECT_DIR%"
%NSSM% set %SERVICE_NAME% Start SERVICE_AUTO_START
%NSSM% set %SERVICE_NAME% AppStdout "%PROJECT_DIR%\logs\service-out.log"
%NSSM% set %SERVICE_NAME% AppStderr "%PROJECT_DIR%\logs\service-err.log"
%NSSM% set %SERVICE_NAME% AppRotateFiles 1
%NSSM% set %SERVICE_NAME% AppRotateBytes 10485760
if not exist "%PROJECT_DIR%\logs" mkdir "%PROJECT_DIR%\logs"
%NSSM% start %SERVICE_NAME%
echo.
echo Service installed and started permanently.
echo Logs are saved under: %PROJECT_DIR%\logs
pause
goto menu

:stop
%NSSM% stop %SERVICE_NAME%
pause
goto menu

:start
%NSSM% start %SERVICE_NAME%
pause
goto menu

:restart
%NSSM% restart %SERVICE_NAME%
pause
goto menu

:status
sc query %SERVICE_NAME%
echo.
echo --- PostgreSQL Status (%PG_SERVICE_NAME%) ---
sc query %PG_SERVICE_NAME%
pause
goto menu

:remove
%NSSM% stop %SERVICE_NAME% >nul 2>&1
%NSSM% remove %SERVICE_NAME% confirm
echo Service removed successfully.
pause
goto menu

:build
cd /d %PROJECT_DIR%
echo Stopping service before rebuild to unlock server.cjs...
%NSSM% stop %SERVICE_NAME% >nul 2>&1
call npm install
call npm run build
echo.
echo Rebuild finished. Restarting service now...
%NSSM% start %SERVICE_NAME%
echo Service updated and running!
pause
goto menu

:backup
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
set TIMESTAMP=%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%
echo.
echo Backing up database to %BACKUP_DIR%\backup_%TIMESTAMP%.sql ...
set PGPASSWORD=%DB_PASSWORD%
"%PG_BIN%\pg_dump.exe" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_DIR%\backup_%TIMESTAMP%.sql"
set PGPASSWORD=
if %errorLevel% equ 0 (
    echo Backup completed successfully.
) else (
    echo [ERROR] Backup failed. Check PG_BIN path and database credentials above.
)
pause
goto menu

:health
echo.
echo Checking server health...
if exist "%HTTPS_CERT_PATH%" (set HEALTH_SCHEME=https) else (set HEALTH_SCHEME=http)
powershell -Command "try { $r = Invoke-RestMethod -Uri '%HEALTH_SCHEME%://localhost:%APP_PORT%/api/health' -TimeoutSec 5 -SkipCertificateCheck; Write-Host 'Server response:'; $r | ConvertTo-Json } catch { Write-Host '[ERROR] Server is not responding on port %APP_PORT%.' -ForegroundColor Red }"
pause
goto menu

:browser
if exist "%HTTPS_CERT_PATH%" (set BROWSER_SCHEME=https) else (set BROWSER_SCHEME=http)
start %BROWSER_SCHEME%://localhost:%APP_PORT%
goto menu

:gencert
echo.
echo Generating self-signed HTTPS certificate...
where openssl >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] OpenSSL not found. Install Git for Windows or OpenSSL to use this option.
    pause
    goto menu
)
if not exist "%PROJECT_DIR%\certs" mkdir "%PROJECT_DIR%\certs"
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 825 ^
    -keyout "%HTTPS_KEY_PATH%" -out "%HTTPS_CERT_PATH%" ^
    -subj "/C=IQ/ST=Baghdad/O=Midland Oil Company/CN=buildings-system.local"
if %errorLevel% equ 0 (
    echo.
    echo Certificate created successfully at:
    echo   %HTTPS_CERT_PATH%
    echo   %HTTPS_KEY_PATH%
    echo Now run Option 1 (Install ^& Start) to enable HTTPS.
) else (
    echo [ERROR] Certificate generation failed.
)
pause
goto menu
