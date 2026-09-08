@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

:: ==============================================================================
:: وزارة النفط العراقية - شركة نفط الوسط (MDOC)
:: السجل الرقمي الموحد للأصول والمنشآت والكرفانات
:: Master Control Center - لوحة التحكم والإدارة الشاملة للنظام
:: ==============================================================================

:: طلب صلاحيات المدير المسؤول (Run as Administrator)
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ==============================================================================
    echo [تنبيه] يتطلب تشغيل لوحة التحكم صلاحيات المسؤول (Administrator)...
    echo Requesting Administrator privileges...
    echo ==============================================================================
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: كشف المسار الديناميكي التلقائي للمجلد الحالي
set "CURRENT_DIR=%~dp0"
if "%CURRENT_DIR:~-1%"=="\" set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

if "%PROJECT_DIR%"=="" set "PROJECT_DIR=%CURRENT_DIR%"
if "%SERVICE_NAME%"=="" set "SERVICE_NAME=BuildingsManagementServer"
if "%APP_PORT%"=="" set "APP_PORT=3000"

:: إعدادات PostgreSQL الافتراضية
if "%PG_VERSION%"=="" set "PG_VERSION=16"
if "%PG_SERVICE_NAME%"=="" set "PG_SERVICE_NAME=postgresql-x64-%PG_VERSION%"
if "%PG_BIN%"=="" set "PG_BIN=C:\Program Files\PostgreSQL\%PG_VERSION%\bin"
if "%DB_HOST%"=="" set "DB_HOST=localhost"
if "%DB_PORT%"=="" set "DB_PORT=5432"
if "%DB_NAME%"=="" set "DB_NAME=midland_assets_db"
if "%DB_USER%"=="" set "DB_USER=oil_user"
if "%DB_PASSWORD%"=="" set "DB_PASSWORD=CHANGE_ME_BEFORE_DEPLOY"

:: الحماية ومسارات الشهادات
if "%API_SECRET_KEY%"=="" set "API_SECRET_KEY=CHANGE_ME_BEFORE_DEPLOY"
set "HTTPS_CERT_PATH=%PROJECT_DIR%\certs\cert.pem"
set "HTTPS_KEY_PATH=%PROJECT_DIR%\certs\key.pem"
set "BACKUP_DIR=%PROJECT_DIR%\backups"
set "NSSM=%PROJECT_DIR%\nssm.exe"

:: كشف مسار node.exe تلقائياً
where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('where node') do (
        if not defined NODE_PATH set "NODE_PATH=%%i"
    )
) else (
    if exist "C:\Program Files\nodejs\node.exe" set "NODE_PATH=C:\Program Files\nodejs\node.exe"
)

title شركة نفط الوسط - لوحة التحكم والإدارة المركزية (Control Center)

:menu
cls
color 0B
echo ==============================================================================
echo        وزارة النفط العراقية - شركة نفط الوسط (Midland Oil Company)
echo        السجل الرقمي الموحد للأصول الهندسية والمنشآت والكرفانات (MDOC-AMS)
echo                     لوحة التحكم والإدارة المركزية (CONTROL CENTER)
echo ==============================================================================
echo [المجلد]: %PROJECT_DIR%
echo [المنفذ]: %APP_PORT%   ^|   [محرك Node]: %NODE_PATH%
if exist "%HTTPS_CERT_PATH%" (
    echo [الحماية]: نشط بنظام التشفير الآمن (HTTPS Enabled - Port %APP_PORT%)
) else (
    echo [الحماية]: تشغيل قياسي (HTTP Mode - Port %APP_PORT%)
)
echo ==============================================================================
echo.
echo  [1]  تشغيل فوري مباشر للمنظومة (Foreground Start / Console Mode)
echo  [2]  تنصيب المنظومة كخدمة ويندوز دائمة (Install Permanent Windows Service)
echo  [3]  تشغيل الخدمة الدائمة (Start Windows Service)
echo  [4]  إيقاف الخدمة الدائمة (Stop Windows Service)
echo  [5]  إعادة تشغيل الخدمة الدائمة (Restart Windows Service)
echo  [6]  فحص حالة المنظومة والخدمات (System & Service Status)
echo  [7]  حذف الخدمة الدائمة (Uninstall Windows Service)
echo.
echo  --- إدارة التثبيت والتحديث وبناء الكود ---
echo  [8]  تثبيت الحزم وبناء المنظومة (Full Build / Rebuild)
echo  [9]  تنصيب المنظومة عبر الإنترنت (Online NPM Setup & Build)
echo  [10] تشغيل النسخة المعزولة دون إنترنت (Offline Air-Gapped Mode)
echo.
echo  --- إدارة قواعد البيانات والنسخ الاحتياطي ---
echo  [11] تهيئة قاعدة بيانات PostgreSQL (Execute database/init.sql)
echo  [12] أخذ نسخة احتياطية فورية من قاعدة البيانات (Backup Database)
echo  [13] استرجاع نسخة احتياطية لقاعدة البيانات (Restore Database)
echo  [14] فحص اتصال PostgreSQL (Test DB Connection)
echo.
echo  --- الشبكة والأمان وعناوين الحقول ---
echo  [15] فحص صحة واستجابة السيرفر (Health Check API)
echo  [16] كشف عناوين السيرفر للشبكة الداخلية وحقول النفط (Show LAN IPs)
echo  [17] فتح منافذ جدار حماية ويندوز (Open Windows Firewall Ports)
echo  [18] توليد شهادة تشفير أمان ذاتية (Generate SSL Certificate)
echo  [19] فتح المنظومة في المتصفح (Open in Web Browser)
echo.
echo  --- الحاويات وبيئات Docker ---
echo  [20] إطلاق المنظومة وقاعدة البيانات عبر Docker Compose
echo  [21] إيقاف حاويات Docker Compose
echo.
echo  [0]  خروج من لوحة التحكم (Exit)
echo ==============================================================================
set /p choice="اختر رقم العملية المطلوبة [0-21]: "

if "%choice%"=="1" goto run_direct
if "%choice%"=="2" goto srv_install
if "%choice%"=="3" goto srv_start
if "%choice%"=="4" goto srv_stop
if "%choice%"=="5" goto srv_restart
if "%choice%"=="6" goto srv_status
if "%choice%"=="7" goto srv_remove
if "%choice%"=="8" goto sys_build
if "%choice%"=="9" goto sys_online
if "%choice%"=="10" goto sys_offline
if "%choice%"=="11" goto db_init
if "%choice%"=="12" goto db_backup
if "%choice%"=="13" goto db_restore
if "%choice%"=="14" goto db_test
if "%choice%"=="15" goto sys_health
if "%choice%"=="16" goto show_ip
if "%choice%"=="17" goto open_firewall
if "%choice%"=="18" goto gen_ssl
if "%choice%"=="19" goto open_browser
if "%choice%"=="20" goto docker_up
if "%choice%"=="21" goto docker_down
if "%choice%"=="0" exit /b 0
goto menu

:: ==============================================================================
:: [1] تشغيل فوري مباشر
:: ==============================================================================
:run_direct
cls
echo ==============================================================================
echo   جاري تشغيل المنظومة في نافذة الأوامر المباشرة...
echo ==============================================================================
cd /d "%PROJECT_DIR%"
if not exist "dist\server.cjs" (
    echo [+] حزمة التشغيل غير مبنية، جاري البناء أولاً...
    call npm run build
)
set PORT=%APP_PORT%
node dist/server.cjs
pause
goto menu

:: ==============================================================================
:: [2] تنصيب الخدمة الدائمة
:: ==============================================================================
:srv_install
cls
echo ==============================================================================
echo   تنصيب وتشغيل المنظومة كخدمة ويندوز دائمة (Auto-start Windows Service)
echo ==============================================================================
cd /d "%PROJECT_DIR%"

if not exist "%NSSM%" (
    echo [تحذير] ملف nssm.exe غير موجود في مجلد المشروع.
    echo جاري استخدام سكريبت PowerShell المرفق لتسجيل الخدمة...
    powershell -ExecutionPolicy Bypass -File "%PROJECT_DIR%\register-windows-service.ps1"
    pause
    goto menu
)

:: التحقق من خدمة PostgreSQL إن وجدت
sc query %PG_SERVICE_NAME% >nul 2>&1
if %errorlevel% equ 0 (
    net start %PG_SERVICE_NAME% >nul 2>&1
    echo [+] تم التحقق من تشغيل خدمة PostgreSQL بنجاح.
)

:: حفظ متغيرات البيئة العامة للنظام
setx DATABASE_URL "postgres://%DB_USER%:%DB_PASSWORD%@%DB_HOST%:%DB_PORT%/%DB_NAME%" /M >nul 2>&1
setx API_SECRET_KEY "%API_SECRET_KEY%" /M >nul 2>&1
setx VITE_API_KEY "%API_SECRET_KEY%" /M >nul 2>&1
setx NODE_ENV "production" /M >nul 2>&1
setx PORT "%APP_PORT%" /M >nul 2>&1

if exist "%HTTPS_CERT_PATH%" (
    setx HTTPS_CERT_PATH "%HTTPS_CERT_PATH%" /M >nul 2>&1
    setx HTTPS_KEY_PATH "%HTTPS_KEY_PATH%" /M >nul 2>&1
    echo [+] تم تفعيل مفاتيح HTTPS المشفرة في الخدمة.
)

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
echo [+] تم تنصيب خدمة (%SERVICE_NAME%) وتشغيلها بشكل دائم مع إقلاع السيرفر.
echo [+] ملفات السجلات والتقارير: %PROJECT_DIR%\logs
pause
goto menu

:: ==============================================================================
:: [3, 4, 5, 6, 7] إدارة الخدمة الدائمة
:: ==============================================================================
:srv_start
cls
echo جاري تشغيل الخدمة (%SERVICE_NAME%)...
sc start %SERVICE_NAME% >nul 2>&1 || if exist "%NSSM%" %NSSM% start %SERVICE_NAME%
pause
goto menu

:srv_stop
cls
echo جاري إيقاف الخدمة (%SERVICE_NAME%)...
sc stop %SERVICE_NAME% >nul 2>&1 || if exist "%NSSM%" %NSSM% stop %SERVICE_NAME%
pause
goto menu

:srv_restart
cls
echo جاري إعادة تشغيل الخدمة (%SERVICE_NAME%)...
sc stop %SERVICE_NAME% >nul 2>&1
timeout /t 2 /nobreak >nul
sc start %SERVICE_NAME% >nul 2>&1 || if exist "%NSSM%" %NSSM% restart %SERVICE_NAME%
pause
goto menu

:srv_status
cls
echo ==============================================================================
echo                     حالة خدمات المنظومة وقاعدة البيانات
echo ==============================================================================
echo [1] حالة خدمة المنظومة (%SERVICE_NAME%):
sc query %SERVICE_NAME%
echo.
echo [2] حالة خدمة قاعدة بيانات PostgreSQL (%PG_SERVICE_NAME%):
sc query %PG_SERVICE_NAME% 2>nul || echo [ملاحظة]: الخدمة غير مسجلة كخدمة ويندوز محلية أو تعمل في حاوية Docker.
echo.
echo [3] فحص المنفذ %APP_PORT%:
netstat -ano | findstr ":%APP_PORT% "
pause
goto menu

:srv_remove
cls
echo ==============================================================================
echo                      حذف خدمة المنظومة الدائمة
echo ==============================================================================
if exist "%NSSM%" (
    %NSSM% stop %SERVICE_NAME% >nul 2>&1
    %NSSM% remove %SERVICE_NAME% confirm
) else (
    sc stop %SERVICE_NAME% >nul 2>&1
    sc delete %SERVICE_NAME%
)
echo [+] تم إيقاف وحذف الخدمة بنجاح.
pause
goto menu

:: ==============================================================================
:: [8] إعادة بناء المشروع
:: ==============================================================================
:sys_build
cls
echo ==============================================================================
echo                     إعادة بناء وتجميع ملفات الإنتاج (Rebuild)
echo ==============================================================================
cd /d "%PROJECT_DIR%"
echo [+] إيقاف الخدمة مؤقتاً لفك قفل ملفات dist...
sc stop %SERVICE_NAME% >nul 2>&1
call npm run build
if %errorlevel% equ 0 (
    echo [+] اكتمل البناء بنجاح!
    sc start %SERVICE_NAME% >nul 2>&1
    echo [+] أعيد تشغيل الخدمة بنجاح.
) else (
    echo [خطأ] فشل البناء! تحقق من مخرجات الأخطاء بالأعلى.
)
pause
goto menu

:: ==============================================================================
:: [9] التنصيب عبر الإنترنت
:: ==============================================================================
:sys_online
cls
cd /d "%PROJECT_DIR%"
call setup-online-windows.bat
pause
goto menu

:: ==============================================================================
:: [10] تشغيل النسخة المعزولة بدون إنترنت
:: ==============================================================================
:sys_offline
cls
cd /d "%PROJECT_DIR%"
call setup-offline-windows.bat
pause
goto menu

:: ==============================================================================
:: [11] تهيئة قاعدة بيانات PostgreSQL
:: ==============================================================================
:db_init
cls
echo ==============================================================================
echo             تهيئة وتطبيق مخطط الجداول (database/init.sql)
echo ==============================================================================
set "PSQL_BIN=%PG_BIN%\psql.exe"
if not exist "%PSQL_BIN%" (
    where psql >nul 2>&1
    if %errorlevel% equ 0 (
        for /f "tokens=*" %%i in ('where psql') do if not defined PSQL_BIN set "PSQL_BIN=%%i"
    )
)

if not exist "%PSQL_BIN%" (
    echo [خطأ] أداة psql.exe غير موجودة في: %PG_BIN%
    echo يرجى تعديل مسار PG_BIN في أعلى الملف.
    pause
    goto menu
)

echo جاري الاتصال وتطبيق ملف SQL على قاعدة البيانات (%DB_NAME%)...
set PGPASSWORD=%DB_PASSWORD%
"%PSQL_BIN%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%PROJECT_DIR%\database\init.sql"
set PGPASSWORD=
if %errorlevel% equ 0 (
    echo.
    echo [+] تم تطبيق مخطط الجداول والفهارس بنجاح!
) else (
    echo.
    echo [خطأ] فشل تطبيق المخطط! تحقق من اسم المستخدم وكلمة المرور وقاعدة البيانات.
)
pause
goto menu

:: ==============================================================================
:: [12] النسخ الاحتياطي لقاعدة البيانات
:: ==============================================================================
:db_backup
cls
echo ==============================================================================
echo             أخذ نسخة احتياطية فورية من قاعدة البيانات (pg_dump)
echo ==============================================================================
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

set "PGDUMP_BIN=%PG_BIN%\pg_dump.exe"
if not exist "%PGDUMP_BIN%" (
    where pg_dump >nul 2>&1
    if %errorlevel% equ 0 (
        for /f "tokens=*" %%i in ('where pg_dump') do if not defined PGDUMP_BIN set "PGDUMP_BIN=%%i"
    )
)

if not exist "%PGDUMP_BIN%" (
    echo [خطأ] أداة pg_dump.exe غير متوفرة في مسار PostgreSQL!
    pause
    goto menu
)

set TIMESTAMP=%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%
set "BACKUP_FILE=%BACKUP_DIR%\mdoc_backup_%TIMESTAMP%.sql"

echo جاري إنشاء ملف النسخة الاحتياطية: %BACKUP_FILE% ...
set PGPASSWORD=%DB_PASSWORD%
"%PGDUMP_BIN%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -F p -f "%BACKUP_FILE%"
set PGPASSWORD=

if %errorlevel% equ 0 (
    echo [+] تم إنشاء النسخة الاحتياطية بنجاح وحفظها في:
    echo     %BACKUP_FILE%
) else (
    echo [خطأ] فشلت عملية النسخ الاحتياطي!
)
pause
goto menu

:: ==============================================================================
:: [13] استرجاع نسخة احتياطية
:: ==============================================================================
:db_restore
cls
echo ==============================================================================
echo             استرجاع نسخة احتياطية سابقة لقاعدة البيانات
echo ==============================================================================
echo ملفات النسخ الاحتياطية المتوفرة في مجلد backups:
dir /b /o-d "%BACKUP_DIR%\*.sql" 2>nul
echo.
set /p RESTORE_NAME="أدخل اسم ملف النسخة الاحتياطية (أو مساره الكامل): "
if "%RESTORE_NAME%"=="" goto menu

if not exist "%RESTORE_NAME%" (
    if exist "%BACKUP_DIR%\%RESTORE_NAME%" set "RESTORE_NAME=%BACKUP_DIR%\%RESTORE_NAME%"
)

if not exist "%RESTORE_NAME%" (
    echo [خطأ] الملف غير موجود: %RESTORE_NAME%
    pause
    goto menu
)

set "PSQL_BIN=%PG_BIN%\psql.exe"
set PGPASSWORD=%DB_PASSWORD%
echo جاري استرجاع البيانات من: %RESTORE_NAME% ...
"%PSQL_BIN%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%RESTORE_NAME%"
set PGPASSWORD=

if %errorlevel% equ 0 (
    echo [+] تمت استعادة البيانات بنجاح!
) else (
    echo [خطأ] حدثت أخطاء أثناء استرجاع النسخة الاحتياطية!
)
pause
goto menu

:: ==============================================================================
:: [14] فحص اتصال قاعدة البيانات
:: ==============================================================================
:db_test
cls
echo ==============================================================================
echo                اختبار الاتصال بقاعدة بيانات PostgreSQL
echo ==============================================================================
powershell -Command "try { $tcp = New-Object System.Net.Sockets.TcpClient('%DB_HOST%', %DB_PORT%); Write-Host '[+] منفذ PostgreSQL (%DB_HOST%:%DB_PORT%) مفتوح ويستجيب بنجاح!' -ForegroundColor Green; $tcp.Close() } catch { Write-Host '[-] تعذر الاتصال بمنفذ PostgreSQL على %DB_HOST%:%DB_PORT%. تأكد من تشغيل السيرفر.' -ForegroundColor Red }"
pause
goto menu

:: ==============================================================================
:: [15] فحص صحة واستجابة السيرفر
:: ==============================================================================
:sys_health
cls
echo ==============================================================================
echo                فحص صحة واستجابة السيرفر (Health Check API)
echo ==============================================================================
if exist "%HTTPS_CERT_PATH%" (set HEALTH_SCHEME=https) else (set HEALTH_SCHEME=http)
powershell -Command "try { $resp = Invoke-RestMethod -Uri '%HEALTH_SCHEME%://localhost:%APP_PORT%/api/health' -TimeoutSec 6 -SkipCertificateCheck; Write-Host '[+] استجابة السيرفر سليمة وطبيعية:' -ForegroundColor Green; $resp | ConvertTo-Json } catch { Write-Host '[-] السيرفر لا يستجيب على المنفذ %APP_PORT%! تأكد من تشغيل الخدمة.' -ForegroundColor Red }"
pause
goto menu

:: ==============================================================================
:: [16] كشف عناوين السيرفر للشبكة الداخلية
:: ==============================================================================
:show_ip
cls
echo ==============================================================================
echo       عناوين الوصول للمنظومة عبر الشبكة الداخلية (LAN / Intranet IPs)
echo ==============================================================================
if exist "%HTTPS_CERT_PATH%" (set SCHEME=https) else (set SCHEME=http)
echo يمكن لمهندسي الحقول والمقرات الدخول للنظام عبر الروابط التالية:
echo.
powershell -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | ForEach-Object { Write-Host '  --> ' -NoNewline -ForegroundColor Cyan; Write-Host ('%SCHEME%://' + $_.IPAddress + ':%APP_PORT%/') -ForegroundColor Yellow }"
echo.
echo [+] الرابط المحلي لنفس الجهاز: %SCHEME%://localhost:%APP_PORT%/
echo ==============================================================================
pause
goto menu

:: ==============================================================================
:: [17] فتح منافذ جدار حماية ويندوز
:: ==============================================================================
:open_firewall
cls
echo ==============================================================================
echo             فتح منافذ جدار حماية ويندوز (Windows Defender Firewall)
echo ==============================================================================
echo جاري السماح بالاتصال على المنفذ %APP_PORT% للشبكة الداخلية...
netsh advfirewall firewall delete rule name="MDOC Asset System (Port %APP_PORT%)" >nul 2>&1
netsh advfirewall firewall add rule name="MDOC Asset System (Port %APP_PORT%)" dir=in action=allow protocol=TCP localport=%APP_PORT%
if %errorlevel% equ 0 (
    echo [+] تم فتح المنفذ %APP_PORT% بنجاح لاستقبال اتصالات المهندسين والمستخدمين.
) else (
    echo [خطأ] تعذر إضافة قاعدة جدار الحماية! تأكد من تشغيل السكربت كمسؤول.
)
pause
goto menu

:: ==============================================================================
:: [18] توليد شهادة SSL/HTTPS
:: ==============================================================================
:gen_ssl
cls
echo ==============================================================================
echo          توليد شهادة أمان مشفرة ذاتية التوقيع (Self-Signed SSL/HTTPS)
:: ==============================================================================
where openssl >nul 2>&1
if %errorlevel% neq 0 (
    echo [خطأ] أداة OpenSSL غير متوفرة في متغيرات النظام PATH.
    echo يمكنك تثبيت Git for Windows أو OpenSSL لتوليد الشهادة.
    pause
    goto menu
)
if not exist "%PROJECT_DIR%\certs" mkdir "%PROJECT_DIR%\certs"
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 1095 ^
    -keyout "%HTTPS_KEY_PATH%" -out "%HTTPS_CERT_PATH%" ^
    -subj "/C=IQ/ST=Baghdad/O=Midland Oil Company/CN=mdoc-assets.local"

if %errorlevel% equ 0 (
    echo [+] تم توليد شهادة التشفير بنجاح وحفظها في:
    echo     %HTTPS_CERT_PATH%
    echo     %HTTPS_KEY_PATH%
    echo [+] عند إعادة تشغيل الخدمة، سيعمل النظام تلقائياً عبر بروتوكول HTTPS الآمن.
) else (
    echo [خطأ] فشل توليد شهادة الأمان!
)
pause
goto menu

:: ==============================================================================
:: [19] فتح المنظومة في المتصفح
:: ==============================================================================
:open_browser
if exist "%HTTPS_CERT_PATH%" (set BROWSER_SCHEME=https) else (set BROWSER_SCHEME=http)
start %BROWSER_SCHEME%://localhost:%APP_PORT%
goto menu

:: ==============================================================================
:: [20, 21] إدارة Docker Compose
:: ==============================================================================
:docker_up
cls
echo ==============================================================================
echo                تشغيل المنظومة وقاعدة البيانات عبر Docker Compose
echo ==============================================================================
where docker-compose >nul 2>&1
if %errorlevel% neq 0 (
    echo [خطأ] Docker أو Docker Compose غير مثبت على هذا الجهاز.
    pause
    goto menu
)
cd /d "%PROJECT_DIR%"
docker-compose up -d --build
echo.
docker-compose ps
pause
goto menu

:docker_down
cls
echo ==============================================================================
echo                إيقاف حاويات Docker Compose
echo ==============================================================================
cd /d "%PROJECT_DIR%"
docker-compose down
echo [+] تم إيقاف الحاويات بنجاح.
pause
goto menu
