# ==============================================================================
# سكربت تثبيت المنظومة كخدمة تلقائية في Windows Server وتجهيز الجدار الناري
# تشغيل هذا السكربت يتطلب صلاحيات المسؤول (Run as Administrator)
# ==============================================================================

#Requires -RunAsAdministrator

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "   وزارة النفط العراقية - شركة نفط الوسط (MDOC)" -ForegroundColor Yellow
Write-Host "   سكربت تهيئة الجدار الناري والتشغيل التلقائي عند إقلاع Windows Server" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = 3000
$TaskName = "MDOC_Assets_Management_System"

# 1. فتح المنفذ 3000 في جدار حماية ويندوز
Write-Host "[1/3] فتح المنفذ $Port في جدار حماية Windows Firewall..." -ForegroundColor Green
$RuleName = "MDOC Assets System (Port $Port)"
$ExistingRule = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue

if ($ExistingRule) {
    Write-Host "[+] قاعدة الجدار الناري موجودة مسبقاً." -ForegroundColor Yellow
} else {
    New-NetFirewallRule -DisplayName $RuleName `
                        -Direction Inbound `
                        -LocalPort $Port `
                        -Protocol TCP `
                        -Action Allow `
                        -Description "السماح بالوصول لمنظومة إدارة أصول شركة نفط الوسط عبر الشبكة الداخلية" | Out-Null
    Write-Host "[+] تم إنشاء قاعدة الجدار الناري بنجاح للسماح بالوصول من الشبكة الداخلية." -ForegroundColor Green
}

# 2. التحقق من مسار ملف التشغيل
$StartScript = Join-Path $CurrentDir "start-server.bat"
if (-not (Test-Path $StartScript)) {
    Write-Host "[خطأ] لم يتم العثور على ملف start-server.bat في المسار: $StartScript" -ForegroundColor Red
    Exit 1
}

# 3. تسجيل المهمة في جدولة مهام ويندوز (Task Scheduler) للتشغيل التلقائي عند إقلاع السيرفر
Write-Host ""
Write-Host "[2/3] تسجيل المهمة التلقائية في Windows Task Scheduler..." -ForegroundColor Green

$Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$StartScript`"" -WorkingDirectory $CurrentDir
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 0)
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal | Out-Null

Write-Host "[+] تم تسجيل المهمة بنجاح: سيعمل النظام تلقائياً حتى دون تسجيل دخول المستخدم!" -ForegroundColor Green

# 4. عرض عناوين IP الخاصة بالسيرفر للوصول عبر الشبكة
Write-Host ""
Write-Host "[3/3] عناوين الوصول للمنظومة من أجهزة الشبكة الداخلية (Intranet):" -ForegroundColor Cyan
$IPs = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" }
foreach ($ip in $IPs) {
    Write-Host "  -> http://$($ip.IPAddress):$Port" -ForegroundColor White -BackgroundColor DarkBlue
}

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "اكتملت التهيئة بنجاح! يمكنك الآن تشغيل النظام فوراً أو إعادة تشغيل السيرفر." -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "اضغط Enter للخروج..."
Read-Host
