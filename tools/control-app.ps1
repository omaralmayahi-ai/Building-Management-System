# =====================================================================
#  لوحة تحكم نظام إدارة الأبنية والكرفانات (Building-Management-System)
#  تُشغَّل من الملف control-app.bat في مجلد النظام.
#  متوافقة مع Windows PowerShell 5.1 (Windows 10/11 و Windows Server).
# =====================================================================
#  -ScheduledBackup : يُستدعى من المهمة المجدولة BuildingsMgmtBackup لأخذ نسخة احتياطية بدون واجهة.
# =====================================================================
param([switch]$ScheduledBackup)

$ErrorActionPreference = 'Stop'
# وضع الاختبار (ECP_TEST=1): تحميل الدوال فقط بدون صلاحية المدير ولا واجهة
$script:TestMode = [bool]$env:ECP_TEST

# ---------------------------------------------------------------------
# التشغيل بصلاحية المدير (مطلوبة للتشغيل الدائم وجدار الحماية)
# ---------------------------------------------------------------------
if (-not $script:TestMode) {
    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        if ($ScheduledBackup) { exit 1 }
        $argList = '-NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File "' + $PSCommandPath + '"'
        try {
            Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -Verb RunAs | Out-Null
        } catch {
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.MessageBox]::Show('لوحة التحكم تحتاج صلاحية المدير (Administrator). أعد فتحها ووافق على طلب الصلاحية.', 'نظام إدارة الأبنية والكرفانات') | Out-Null
        }
        exit
    }
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    [System.Windows.Forms.Application]::EnableVisualStyles()
}

# ---------------------------------------------------------------------
# الثوابت والمسارات
# ---------------------------------------------------------------------
$script:AppDir     = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
# وقت تعديل ملف اللوحة عند فتحها: إذا تحدّث النظام واللوحة مفتوحة تبقى تعمل بالنسخة القديمة من نفسها
$script:PanelFile  = $PSCommandPath
$script:PanelStamp = $null
if ($PSCommandPath) { $script:PanelStamp = (Get-Item -LiteralPath $PSCommandPath).LastWriteTimeUtc }
$script:TaskName   = 'BuildingsMgmtServer'
$script:FwRuleName = 'BuildingsMgmtServer'
$script:BackupTask = 'BuildingsMgmtBackup'
$script:DefaultPort = 3000
$script:RepoUrl = 'https://github.com/omaralmayahi-ai/Building-Management-System.git'
$script:EnvFile    = Join-Path $AppDir '.env'
$script:LogDir     = Join-Path $AppDir 'logs'
$script:BackupDir  = Join-Path $AppDir 'backups'
$script:DataDir    = Join-Path $AppDir '.data'
$script:DbFile     = Join-Path $DataDir 'store.json'
$script:UploadsDir = Join-Path $AppDir 'uploads'
$script:CodeBackupDir = Join-Path $BackupDir 'code'
$script:BackupSchedule = Join-Path $BackupDir 'schedule.json'
$script:ServerLog  = Join-Path $LogDir 'server.log'
$script:PanelLog   = Join-Path $LogDir 'control-panel.log'
$script:Runner     = Join-Path $AppDir 'tools\run-server.ps1'
$script:Entry      = Join-Path $AppDir 'dist\server.cjs'
$script:Busy       = $false
$script:Utf8NoBom  = New-Object System.Text.UTF8Encoding($false)

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
# بيئة اللوحة نفسها يجب ألا تكون production وإلا لن يُنصَّب npm مكتبات التطوير اللازمة للبناء
Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue

# ---------------------------------------------------------------------
# أدوات عامة
# ---------------------------------------------------------------------
function Update-PathFromRegistry {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user    = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machine;$user"
}

# كل ما يظهر في السجلّ يُحفظ أيضاً في logs\control-panel.log للرجوع إليه
function Save-PanelLog([string]$text) {
    try { [IO.File]::AppendAllText($script:PanelLog, $text, $script:Utf8NoBom) } catch { }
}

function Write-Log([string]$text) {
    $stamp = (Get-Date).ToString('HH:mm:ss')
    foreach ($line in ($text -split "`r?`n")) {
        if ($line.Length -gt 0) {
            if ($script:LogBox) { $script:LogBox.AppendText("[$stamp] $line`r`n") }
            Save-PanelLog ((Get-Date).ToString('yyyy-MM-dd ') + "[$stamp] $line`r`n")
        }
    }
    if ($script:LogBox) { [System.Windows.Forms.Application]::DoEvents() }
}

function Show-Info([string]$text, [string]$title = 'نظام إدارة الأبنية والكرفانات') {
    $opts = [System.Windows.Forms.MessageBoxOptions]::RtlReading -bor [System.Windows.Forms.MessageBoxOptions]::RightAlign
    [System.Windows.Forms.MessageBox]::Show($text, $title, 'OK', 'Information', 'Button1', $opts) | Out-Null
}

function Show-Error([string]$text, [string]$title = 'خطأ') {
    $opts = [System.Windows.Forms.MessageBoxOptions]::RtlReading -bor [System.Windows.Forms.MessageBoxOptions]::RightAlign
    [System.Windows.Forms.MessageBox]::Show($text, $title, 'OK', 'Error', 'Button1', $opts) | Out-Null
}

function Confirm-Action([string]$text, [string]$title = 'تأكيد') {
    $opts = [System.Windows.Forms.MessageBoxOptions]::RtlReading -bor [System.Windows.Forms.MessageBoxOptions]::RightAlign
    $r = [System.Windows.Forms.MessageBox]::Show($text, $title, 'YesNo', 'Question', 'Button2', $opts)
    return ($r -eq [System.Windows.Forms.DialogResult]::Yes)
}

# تشغيل أمر طويل مع عرض مخرجاته في السجلّ بدون تجميد الواجهة.
# الأدوات التي لا تفهم المسارات العربية تُشغَّل من داخل المجلد المطلوب ($workDir).
function Invoke-Logged([string]$file, [string]$arguments, [string]$title, [string]$workDir) {
    if ($title) { Write-Log "── $title" }
    $tmp = [IO.Path]::GetTempFileName()
    $script:LastOutput = New-Object System.Collections.Generic.List[string]
    $cmdLine = '/d /s /c ""' + $file + '" ' + $arguments + ' > "' + $tmp + '" 2>&1"'
    $psi = New-Object Diagnostics.ProcessStartInfo 'cmd.exe', $cmdLine
    if ($workDir) { $psi.WorkingDirectory = $workDir } else { $psi.WorkingDirectory = $script:AppDir }
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $proc = [Diagnostics.Process]::Start($psi)
    $pos = 0
    $fs = $null
    try {
        while ($true) {
            $exited = $proc.HasExited
            if ($null -eq $fs) {
                try { $fs = New-Object IO.FileStream($tmp, 'Open', 'Read', 'ReadWrite') } catch { $fs = $null }
            }
            if ($null -ne $fs -and $fs.Length -gt $pos) {
                $fs.Seek($pos, 'Begin') | Out-Null
                $buf = New-Object byte[] ($fs.Length - $pos)
                $n = $fs.Read($buf, 0, $buf.Length)
                $pos += $n
                $chunk = [Text.Encoding]::UTF8.GetString($buf, 0, $n)
                $chunk = [regex]::Replace($chunk, '\x1B\[[0-9;?]*[A-Za-z]', '')
                foreach ($line in ($chunk -split "`r?`n")) {
                    if ($line.Trim().Length -gt 0) {
                        $script:LastOutput.Add($line)
                        if (-not $script:QuietLog) {
                            if ($script:LogBox) { $script:LogBox.AppendText("   $line`r`n") }
                            Save-PanelLog "   $line`r`n"
                        }
                    }
                }
            }
            if ($exited) { break }
            [System.Windows.Forms.Application]::DoEvents()
            Start-Sleep -Milliseconds 150
        }
    } finally {
        if ($null -ne $fs) { $fs.Close() }
        Remove-Item $tmp -ErrorAction SilentlyContinue
    }
    return $proc.ExitCode
}

function Assert-Step([int]$code, [string]$message) {
    if ($code -ne 0) { throw $message }
}

# حذف مجلد كبير (مثل node_modules) بسرعة وبدون تجميد الواجهة
function Remove-FolderFast([string]$path) {
    if (-not (Test-Path -LiteralPath $path)) { return }
    [void](Invoke-Logged 'cmd.exe' ('/c rd /s /q "' + $path + '"') '')
    if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue }
}

function Format-Size([double]$bytes) {
    if ($bytes -ge 1GB) { return ('{0:N1} GB' -f ($bytes / 1GB)) }
    if ($bytes -ge 1MB) { return ('{0:N1} MB' -f ($bytes / 1MB)) }
    return ('{0:N0} KB' -f ($bytes / 1KB))
}

# ---------------------------------------------------------------------
# ملف الإعدادات .env
# ---------------------------------------------------------------------
function Read-EnvFile {
    $result = @{}
    if (Test-Path $script:EnvFile) {
        foreach ($line in [IO.File]::ReadAllLines($script:EnvFile, $script:Utf8NoBom)) {
            if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') { $result[$matches[1]] = $matches[2].Trim() }
        }
    }
    return $result
}

function Set-EnvValues([hashtable]$values) {
    if (-not (Test-Path $script:EnvFile)) {
        [IO.File]::WriteAllText($script:EnvFile, "# إعدادات نظام إدارة الأبنية والكرفانات (تُدار من لوحة التحكم)`r`n", $script:Utf8NoBom)
    }
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.AddRange([string[]][IO.File]::ReadAllLines($script:EnvFile, $script:Utf8NoBom))
    foreach ($key in $values.Keys) {
        $found = $false
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match ('^\s*' + [regex]::Escape($key) + '\s*=')) {
                $lines[$i] = "$key=$($values[$key])"
                $found = $true
            }
        }
        if (-not $found) { $lines.Add("$key=$($values[$key])") }
    }
    [IO.File]::WriteAllLines($script:EnvFile, $lines.ToArray(), $script:Utf8NoBom)
}

function Get-AppPort {
    $cfg = Read-EnvFile
    $p = 0
    if ($cfg.ContainsKey('PORT') -and [int]::TryParse($cfg['PORT'], [ref]$p) -and $p -gt 0 -and $p -lt 65536) { return $p }
    return $script:DefaultPort
}

function New-Secret {
    $bytes = New-Object byte[] 48
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    return ([Convert]::ToBase64String($bytes) -replace '[^A-Za-z0-9]', '')
}

# يضمن وجود .env بمنفذ ومفتاح جلسات. المفتاح القديم (.session_secret) يُنقل كما هو حتى لا يُسجَّل خروج المستخدمين.
function Ensure-EnvFile {
    $cfg = Read-EnvFile
    $values = @{}
    if (-not $cfg.ContainsKey('PORT')) { $values.PORT = "$($script:DefaultPort)" }
    $secret = ''
    if ($cfg.ContainsKey('SESSION_SECRET')) { $secret = $cfg['SESSION_SECRET'] }
    if ($secret.Length -lt 16) {
        $legacyFile = Join-Path $script:AppDir '.session_secret'
        $legacy = ''
        if (Test-Path $legacyFile) { $legacy = ([IO.File]::ReadAllText($legacyFile, $script:Utf8NoBom)).Trim() }
        if ($legacy.Length -ge 16) {
            $values.SESSION_SECRET = $legacy
            Write-Log 'نُقل مفتاح الجلسات الحالي إلى ملف الإعدادات (لا يُسجَّل خروج أحد).'
        } else {
            $values.SESSION_SECRET = New-Secret
            Write-Log 'أُنشئ مفتاح جلسات جديد.'
        }
    }
    if ($values.Count -gt 0 -or -not (Test-Path $script:EnvFile)) { Set-EnvValues $values }
}

# ---------------------------------------------------------------------
# البحث عن البرامج المطلوبة
# ---------------------------------------------------------------------
function Get-NodeExe {
    Update-PathFromRegistry
    $c = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    $p = Join-Path $env:ProgramFiles 'nodejs\node.exe'
    if (Test-Path $p) { return $p }
    return $null
}

function Get-NpmCmd {
    $node = Get-NodeExe
    if (-not $node) { return $null }
    $p = Join-Path (Split-Path $node) 'npm.cmd'
    if (Test-Path $p) { return $p }
    $c = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    return $null
}

function Get-NodeVersion {
    $ErrorActionPreference = 'Continue'
    $node = Get-NodeExe
    if (-not $node) { return $null }
    try { return (& $node --version).Trim() } catch { return $null }
}

# يلزم Node.js 20 أو أحدث
function Test-NodeVersionOk([string]$v) {
    if ($v -notmatch '^v(\d+)\.(\d+)') { return $false }
    $major = [int]$matches[1]; $minor = [int]$matches[2]
    return ($major -ge 20)
}

function Test-WingetAvailable {
    return [bool](Get-Command winget.exe -ErrorAction SilentlyContinue)
}

function Get-PowerShellExe {
    return (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe')
}

# تشغيل أداة قاعدة البيانات المساعدة (script\panel-tools.mjs)
function Invoke-PanelTool([string]$arguments, [string]$title) {
    $node = Get-NodeExe
    if (-not $node) { throw 'Node.js غير منصّب.' }
    # مخرجات الأداة سطور KEY=VALUE للقراءة الآلية فلا تُعرض في السجلّ
    $script:QuietLog = $true
    try { return (Invoke-Logged $node ('script\panel-tools.mjs ' + $arguments) $title $script:AppDir) }
    finally { $script:QuietLog = $false }
}

# قيمة KEY من مخرجات آخر أداة (KEY=VALUE)
function Get-ToolValue([string]$key) {
    if ($script:LastOutput) {
        foreach ($l in $script:LastOutput) {
            if ($l -match ('^' + [regex]::Escape($key) + '=(.*)$')) { return $matches[1].Trim() }
        }
    }
    return $null
}

# ---------------------------------------------------------------------
# حالة الخادم
# ---------------------------------------------------------------------
function Get-ListeningPid([int]$port) {
    $ErrorActionPreference = 'Continue'
    try {
        $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop | Select-Object -First 1
        if ($c) { return [int]$c.OwningProcess }
    } catch {
        $line = netstat -ano -p tcp | Select-String (":$port\s+.*LISTENING\s+(\d+)") | Select-Object -First 1
        if ($line -and $line.Matches[0].Groups[1].Value) { return [int]$line.Matches[0].Groups[1].Value }
    }
    return $null
}

# النظام يعمل إذا ردّ الخادم على الطلب (أي رد، حتى لو كان رفضاً أو صفحة خطأ). بدون بروكسي.
function Test-AppUp([int]$port = 0) {
    if ($port -le 0) { $port = Get-AppPort }
    try {
        $req = [System.Net.HttpWebRequest]::Create("http://127.0.0.1:$port/")
        $req.Proxy = $null
        $req.Timeout = 3000
        $req.ReadWriteTimeout = 3000
        $req.AllowAutoRedirect = $false
        $resp = $req.GetResponse()
        $resp.Close()
        return $true
    } catch [System.Net.WebException] {
        if ($null -ne $_.Exception.Response) {
            try { $_.Exception.Response.Close() } catch { }
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

# عمليات المشغّل الخلفي (run-server.ps1) الخاصة بهذا المجلد
function Get-RunnerProcesses {
    try {
        return @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction Stop |
            Where-Object { $_.CommandLine -and $_.CommandLine -like '*run-server.ps1*' -and $_.CommandLine -like ('*' + $script:AppDir + '*') })
    } catch { return @() }
}

function Get-AutoStartTask {
    return Get-ScheduledTask -TaskName $script:TaskName -ErrorAction SilentlyContinue
}

function Get-LanAddresses {
    try {
        return @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
            ForEach-Object { $_.IPAddress })
    } catch { return @() }
}

function Get-AppUrl {
    return "http://localhost:$(Get-AppPort)"
}

# ---------------------------------------------------------------------
# PostgreSQL: قاعدة البيانات المعتمدة للنظام (قرار 14-11-2026)
#  بدون DATABASE_URL في .env يحفظ الخادم في ملف محلي (.data\store.json) وهو وضع للتجربة فقط.
# ---------------------------------------------------------------------
function Test-PostgresMode {
    $url = (Read-EnvFile)['DATABASE_URL']
    if (-not $url) { return $false }
    return ($url -notmatch 'CHANGE_ME')
}

function Get-PostgresBin {
    $roots = @()
    if ($env:ProgramFiles) { $roots += (Join-Path $env:ProgramFiles 'PostgreSQL') }
    if (${env:ProgramFiles(x86)}) { $roots += (Join-Path ${env:ProgramFiles(x86)} 'PostgreSQL') }
    foreach ($root in $roots) {
        if (-not (Test-Path $root)) { continue }
        foreach ($dir in (Get-ChildItem -LiteralPath $root -Directory | Sort-Object Name -Descending)) {
            $bin = Join-Path $dir.FullName 'bin'
            if (Test-Path (Join-Path $bin 'psql.exe')) { return $bin }
        }
    }
    $cmd = Get-Command 'psql.exe' -ErrorAction SilentlyContinue
    if ($cmd) { return (Split-Path -Parent $cmd.Source) }
    return $null
}

function Show-PostgresDialog {
    $f = New-DialogForm 'إعداد PostgreSQL' 480 300
    $lbl = New-Object System.Windows.Forms.Label
    $lbl.Text = 'بيانات مدير PostgreSQL (التي اخترتها عند تنصيبه). تُستخدم مرة واحدة لإنشاء قاعدة النظام ولا تُحفظ.'
    $lbl.Location = New-Object System.Drawing.Point(20, 12)
    $lbl.Size = New-Object System.Drawing.Size(440, 44)
    $f.Controls.Add($lbl)
    $fields = @(
        @{ Key = 'Server';   Label = 'عنوان الخادم';         Value = '127.0.0.1'; Secret = $false },
        @{ Key = 'Port';     Label = 'المنفذ';               Value = '5432';      Secret = $false },
        @{ Key = 'Admin';    Label = 'اسم مدير PostgreSQL';  Value = 'postgres';  Secret = $false },
        @{ Key = 'Password'; Label = 'كلمة مرور المدير';     Value = '';          Secret = $true }
    )
    $boxes = @{}
    $y = 66
    foreach ($fd in $fields) {
        $l = New-Object System.Windows.Forms.Label
        $l.Text = $fd.Label
        $l.Location = New-Object System.Drawing.Point(20, ($y + 4))
        $l.Size = New-Object System.Drawing.Size(170, 24)
        $t = New-Object System.Windows.Forms.TextBox
        $t.Location = New-Object System.Drawing.Point(200, $y)
        $t.Size = New-Object System.Drawing.Size(250, 26)
        $t.RightToLeft = 'No'
        $t.Text = $fd.Value
        if ($fd.Secret) { $t.UseSystemPasswordChar = $true }
        $f.Controls.Add($l); $f.Controls.Add($t)
        $boxes[$fd.Key] = $t
        $y += 42
    }
    Add-DialogButtons $f ($y + 10)
    while ($true) {
        if ($f.ShowDialog($script:MainForm) -ne 'OK') { return $null }
        $server = $boxes['Server'].Text.Trim()
        $port = $boxes['Port'].Text.Trim()
        $admin = $boxes['Admin'].Text.Trim()
        if ($server -notmatch '^[A-Za-z0-9.\-]+$') { Show-Error 'عنوان الخادم غير صالح.'; continue }
        if ($port -notmatch '^[0-9]{2,5}$') { Show-Error 'رقم المنفذ غير صالح.'; continue }
        if ($admin -notmatch '^[A-Za-z0-9_]+$') { Show-Error 'اسم المدير غير صالح.'; continue }
        if ($boxes['Password'].Text.Length -lt 1) { Show-Error 'اكتب كلمة مرور مدير PostgreSQL.'; continue }
        return @{ Server = $server; Port = $port; Admin = $admin; Password = $boxes['Password'].Text }
    }
}

function Invoke-SetupPostgres([hashtable]$Preset) {
    if (-not (Test-Path (Join-Path $script:AppDir 'node_modules'))) { throw 'المكتبات غير منصّبة. اضغط «تنصيب المكتبات» أولاً.' }
    if (Test-PostgresMode) {
        $code = Invoke-PanelTool ('storage "' + $script:AppDir + '"') 'اختبار الاتصال بقاعدة PostgreSQL...'
        if ($code -eq 0) {
            Write-Log '✔ PostgreSQL مُعدّ ويعمل، وهو المخزن المعتمد للنظام.'
            Show-Info 'PostgreSQL مُعدّ ويعمل، وهو المخزن المعتمد للنظام.'
            return
        }
        $err = Get-ToolValue 'ERROR'
        if (-not (Confirm-Action "PostgreSQL مُعدّ في ملف الإعدادات لكن الاتصال به فشل:`n$err`n`nهل تريد إعادة إعداده الآن؟" 'إعداد PostgreSQL')) { return }
    }
    $bin = Get-PostgresBin
    if (-not $bin) {
        Show-Info "PostgreSQL غير منصّب على هذه الحاسبة.`n`nنصّبه أولاً (ملف التنصيب من postgresql.org ويعمل دون إنترنت بعد تنزيله)، واحفظ كلمة مرور المدير التي تختارها، ثم اضغط هذا الزر من جديد."
        return
    }
    # بعد «استعادة كلمة مرور PostgreSQL» تُستخدم البيانات نفسها دون سؤال ثانٍ
    $d = $Preset
    if (-not $d) { $d = Show-PostgresDialog }
    if (-not $d) { return }

    Write-Log '════ إعداد PostgreSQL ════'
    $pw = New-Secret
    if ($pw.Length -gt 32) { $pw = $pw.Substring(0, 32) }
    $sql = @'
DO $do$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bms_user') THEN
    CREATE ROLE bms_user LOGIN PASSWORD '__PW__';
  ELSE
    ALTER ROLE bms_user LOGIN PASSWORD '__PW__';
  END IF;
END
$do$;
SELECT 'CREATE DATABASE bms_db OWNER bms_user ENCODING ''UTF8'' TEMPLATE template0' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'bms_db')\gexec
'@
    $sql = $sql.Replace('__PW__', $pw)
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ('bms-pg-' + [Guid]::NewGuid().ToString('N') + '.sql')
    [IO.File]::WriteAllText($tmp, $sql, $script:Utf8NoBom)
    $psqlArgs = '-h "' + $d.Server + '" -p ' + $d.Port + ' -U "' + $d.Admin + '" -d postgres -v ON_ERROR_STOP=1 -f "' + $tmp + '"'
    $env:PGPASSWORD = $d.Password
    $script:QuietLog = $true
    try {
        $code = Invoke-Logged (Join-Path $bin 'psql.exe') $psqlArgs 'إنشاء مستخدم وقاعدة بيانات النظام...' $script:AppDir
    } finally {
        $script:QuietLog = $false
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
    }
    if ($code -ne 0) {
        $detail = ''
        if ($script:LastOutput -and $script:LastOutput.Count -gt 0) { $detail = $script:LastOutput[$script:LastOutput.Count - 1] }
        throw "تعذّر إعداد PostgreSQL. تحقق من كلمة مرور المدير ومن أن خدمة PostgreSQL تعمل.`n$detail"
    }

    $wasRunning = Test-AppUp
    if ($wasRunning) { Stop-App }
    $previous = (Read-EnvFile)['DATABASE_URL']
    Set-EnvValues @{ DATABASE_URL = ('postgres://bms_user:' + $pw + '@' + $d.Server + ':' + $d.Port + '/bms_db') }
    $code = Invoke-PanelTool ('storage "' + $script:AppDir + '"') 'اختبار الاتصال بقاعدة النظام...'
    if ($code -ne 0) {
        $err = Get-ToolValue 'ERROR'
        if (-not $previous) { $previous = '' }
        Set-EnvValues @{ DATABASE_URL = $previous }
        Restart-AppIfWasRunning $wasRunning
        throw "أُنشئت القاعدة لكن الاتصال بها فشل، فأُعيد الإعداد السابق: $err"
    }
    Write-Log '✔ PostgreSQL صار المخزن المعتمد للنظام (العنوان محفوظ في .env).'
    Write-Log '  عند أول تشغيل تُنقل البيانات الحالية من الملف المحلي إلى PostgreSQL تلقائياً مرة واحدة.'
    Restart-AppIfWasRunning $wasRunning
    if (-not $wasRunning) { Show-Info 'تم إعداد PostgreSQL. اضغط «تشغيل» لبدء النظام عليه.' }
}

# خدمة PostgreSQL المنصّبة على هذه الحاسبة ومجلد بياناتها ومنفذها
function Get-PostgresServiceInfo {
    $svc = Get-CimInstance Win32_Service | Where-Object { $_.Name -like 'postgresql*' } | Sort-Object Name -Descending | Select-Object -First 1
    if (-not $svc) { return $null }
    $dataDir = $null
    if ($svc.PathName -match '-D\s+"([^"]+)"') { $dataDir = $matches[1] }
    elseif ($svc.PathName -match '-D\s+(\S+)') { $dataDir = $matches[1] }
    $port = '5432'
    if ($dataDir) {
        $conf = Join-Path $dataDir 'postgresql.conf'
        if (Test-Path -LiteralPath $conf) {
            foreach ($line in [IO.File]::ReadAllLines($conf)) {
                if ($line -match '^\s*port\s*=\s*([0-9]+)') { $port = $matches[1] }
            }
        }
    }
    return @{ Name = $svc.Name; DataDir = $dataDir; Port = $port }
}

function Show-PostgresNewPasswordDialog {
    $f = New-DialogForm 'كلمة مرور جديدة لمدير PostgreSQL' 480 220
    $lbl = New-Object System.Windows.Forms.Label
    $lbl.Text = 'اختر كلمة مرور جديدة للمستخدم postgres واحفظها عندك (8 أحرف على الأقل، حروف إنجليزية وأرقام ورموز).'
    $lbl.Location = New-Object System.Drawing.Point(20, 12)
    $lbl.Size = New-Object System.Drawing.Size(440, 44)
    $f.Controls.Add($lbl)
    $boxes = @{}
    $y = 66
    foreach ($fd in @(@{ Key = 'Password'; Label = 'كلمة المرور الجديدة' }, @{ Key = 'Confirm'; Label = 'تأكيد كلمة المرور' })) {
        $l = New-Object System.Windows.Forms.Label
        $l.Text = $fd.Label
        $l.Location = New-Object System.Drawing.Point(20, ($y + 4))
        $l.Size = New-Object System.Drawing.Size(170, 24)
        $t = New-Object System.Windows.Forms.TextBox
        $t.Location = New-Object System.Drawing.Point(200, $y)
        $t.Size = New-Object System.Drawing.Size(250, 26)
        $t.RightToLeft = 'No'
        $t.UseSystemPasswordChar = $true
        $f.Controls.Add($l); $f.Controls.Add($t)
        $boxes[$fd.Key] = $t
        $y += 42
    }
    Add-DialogButtons $f ($y + 10)
    while ($true) {
        if ($f.ShowDialog($script:MainForm) -ne 'OK') { return $null }
        $pass = $boxes['Password'].Text
        if ($pass -ne $boxes['Confirm'].Text) { Show-Error 'كلمتا المرور غير متطابقتين.'; continue }
        if ($pass -notmatch '^[\x21-\x7E]{8,}$') { Show-Error 'كلمة المرور 8 أحرف على الأقل، بحروف إنجليزية وأرقام ورموز فقط ودون فراغات.'; continue }
        return $pass
    }
}

# يُعيد قراءة إعدادات PostgreSQL (دون قطع اتصالات الأنظمة الأخرى)، وإن تعذّر يعيد تشغيل الخدمة
function Update-PostgresConfig([string]$bin, $info) {
    $pgCtl = Join-Path $bin 'pg_ctl.exe'
    $code = 1
    if (Test-Path -LiteralPath $pgCtl) {
        $script:QuietLog = $true
        try { $code = Invoke-Logged $pgCtl ('reload -D "' + $info.DataDir + '"') '' $script:AppDir }
        finally { $script:QuietLog = $false }
    }
    if ($code -ne 0) { Restart-Service -Name $info.Name -Force }
    Start-Sleep -Seconds 2
}

# استعادة كلمة مرور مدير PostgreSQL المنسية:
#  يُسمح مؤقتاً (ثوانٍ) بالدخول من هذه الحاسبة نفسها دون كلمة مرور، تُعيَّن الكلمة الجديدة، ثم يُعاد ملف الإعداد الأصلي كما كان.
function Invoke-ResetPostgresPassword {
    $bin = Get-PostgresBin
    if (-not $bin) { Show-Info 'PostgreSQL غير منصّب على هذه الحاسبة.'; return }
    $info = Get-PostgresServiceInfo
    if (-not $info -or -not $info.DataDir) { throw 'لم أجد خدمة PostgreSQL أو مجلد بياناتها على هذه الحاسبة.' }
    $hba = Join-Path $info.DataDir 'pg_hba.conf'
    if (-not (Test-Path -LiteralPath $hba)) { throw "ملف إعداد الدخول غير موجود: $hba" }
    $msg = "ستُعيَّن كلمة مرور جديدة لمدير PostgreSQL (المستخدم postgres) على هذه الحاسبة.`n`nأي نظام آخر يتصل بالمستخدم postgres نفسه سيحتاج الكلمة الجديدة. الأنظمة التي لها مستخدم خاص بها لا تتأثر.`n`nهل تريد المتابعة؟"
    if (-not (Confirm-Action $msg 'استعادة كلمة مرور PostgreSQL')) { return }
    $newPw = Show-PostgresNewPasswordDialog
    if (-not $newPw) { return }

    Write-Log '════ استعادة كلمة مرور PostgreSQL ════'
    $original = [IO.File]::ReadAllBytes($hba)
    [IO.File]::WriteAllBytes(($hba + '.bms-backup'), $original)
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ('bms-pg-' + [Guid]::NewGuid().ToString('N') + '.sql')
    [IO.File]::WriteAllText($tmp, ("ALTER USER postgres WITH PASSWORD '" + $newPw.Replace("'", "''") + "';"), $script:Utf8NoBom)
    $psql = Join-Path $bin 'psql.exe'
    $code = 1
    try {
        $trust = [Text.Encoding]::ASCII.GetBytes("# BMS temporary rule (removed automatically)`r`nhost all all 127.0.0.1/32 trust`r`n")
        $temp = New-Object byte[] ($trust.Length + $original.Length)
        [Array]::Copy($trust, 0, $temp, 0, $trust.Length)
        [Array]::Copy($original, 0, $temp, $trust.Length, $original.Length)
        [IO.File]::WriteAllBytes($hba, $temp)
        Update-PostgresConfig $bin $info
        $script:QuietLog = $true
        try {
            $code = Invoke-Logged $psql ('-h 127.0.0.1 -p ' + $info.Port + ' -U postgres -d postgres -w -v ON_ERROR_STOP=1 -f "' + $tmp + '"') 'تعيين كلمة المرور الجديدة...' $script:AppDir
        } finally { $script:QuietLog = $false }
    } finally {
        # يُعاد ملف الإعداد الأصلي دائماً، نجحت العملية أم فشلت
        [IO.File]::WriteAllBytes($hba, $original)
        Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
        Update-PostgresConfig $bin $info
    }
    if ($code -ne 0) {
        $detail = ''
        if ($script:LastOutput -and $script:LastOutput.Count -gt 0) { $detail = $script:LastOutput[$script:LastOutput.Count - 1] }
        throw "تعذّر تعيين كلمة المرور. أُعيد ملف الإعداد كما كان ولم يتغير شيء.`n$detail"
    }
    Write-Log '✔ عُيّنت كلمة مرور جديدة لمدير PostgreSQL وأُعيد ملف الإعداد كما كان.'
    if (Confirm-Action "تم تعيين كلمة المرور الجديدة.`n`nهل تريد إكمال إعداد قاعدة بيانات النظام على PostgreSQL الآن؟" 'إعداد PostgreSQL') {
        Invoke-SetupPostgres @{ Server = '127.0.0.1'; Port = $info.Port; Admin = 'postgres'; Password = $newPw }
    }
}

function Get-DbSizeText {
    if (Test-PostgresMode) { return 'PostgreSQL' }
    if (Test-Path $script:DbFile) { return (Format-Size (Get-Item $script:DbFile).Length) }
    return '—'
}

# آخر نسخة احتياطية (تاريخها) أو $null
function Get-LastBackupTime {
    if (-not (Test-Path $script:BackupDir)) { return $null }
    $best = $null
    foreach ($d in (Get-ChildItem -Path $script:BackupDir -Directory -ErrorAction SilentlyContinue)) {
        if ($d.Name -eq '_uploads' -or $d.Name -eq 'code') { continue }
        if (-not (Test-Path (Join-Path $d.FullName '.data\store.json'))) { continue }
        $t = $d.LastWriteTime
        $info = Join-Path $d.FullName 'backup-info.json'
        if (Test-Path $info) {
            try {
                $j = [IO.File]::ReadAllText($info, $script:Utf8NoBom) | ConvertFrom-Json
                if ($j.at) { $t = [datetime]$j.at }
            } catch { }
        }
        if ($null -eq $best -or $t -gt $best) { $best = $t }
    }
    return $best
}

# هل مصدر النظام أحدث من البناء الحالي؟ (نسيان "إعادة البناء" بعد تحديث الملفات)
function Get-BuildState {
    if (-not (Test-Path $script:Entry)) { return 'missing' }
    $built = (Get-Item $script:Entry).LastWriteTime
    $newest = $null
    foreach ($rel in @('server.ts', 'src', 'index.html', 'script', 'package.json', 'vite.config.ts', 'tsconfig.json')) {
        $p = Join-Path $script:AppDir $rel
        if (-not (Test-Path $p)) { continue }
        $item = Get-Item $p
        if ($item.PSIsContainer) {
            $f = Get-ChildItem -Path $p -Recurse -File -ErrorAction SilentlyContinue | Where-Object { ($_.Extension -in @('.ts', '.tsx', '.css', '.html')) -and ($_.Name -notlike '*.test.ts*') } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
            if ($f -and ($null -eq $newest -or $f.LastWriteTime -gt $newest)) { $newest = $f.LastWriteTime }
        } elseif ($null -eq $newest -or $item.LastWriteTime -gt $newest) { $newest = $item.LastWriteTime }
    }
    if ($newest -and $newest -gt $built.AddMinutes(1)) { return 'stale' }
    return 'ok'
}


# ---------------------------------------------------------------------
# التشغيل والإيقاف
# ---------------------------------------------------------------------
function Wait-ForServer([int]$seconds) {
    for ($i = 0; $i -lt ($seconds * 2); $i++) {
        if (Test-AppUp) { return $true }
        [System.Windows.Forms.Application]::DoEvents()
        Start-Sleep -Milliseconds 500
    }
    return (Test-AppUp)
}

function Stop-ProcessTree([int]$procId) {
    $ErrorActionPreference = 'Continue'
    & taskkill.exe /F /T /PID $procId 2>&1 | Out-Null
}

function Start-App {
    $port = Get-AppPort
    if (Test-AppUp $port) { Write-Log 'النظام يعمل مسبقاً.'; return }
    $owner = Get-ListeningPid $port
    if ($owner) { throw "المنفذ $port مشغول ببرنامج آخر (رقم العملية $owner). غيّر المنفذ من زر «تغيير المنفذ»." }
    if (-not (Test-Path $script:Entry)) { throw 'النظام غير مبني بعد. استخدم «إعادة البناء».' }
    if (-not (Test-Path $script:Runner)) { throw 'الملف tools\run-server.ps1 غير موجود.' }
    $node = Get-NodeExe
    if (-not $node) { throw 'Node.js غير منصّب.' }
    Ensure-EnvFile

    # مشغّل خلفي عالق (ينتظر بعد انهيار سابق): يُنهى قبل البدء حتى لا يتكرر
    foreach ($r in (Get-RunnerProcesses)) { Stop-ProcessTree ([int]$r.ProcessId) }
    Start-Sleep -Milliseconds 500

    $task = Get-AutoStartTask
    if ($task) {
        Write-Log 'تشغيل النظام (التشغيل الدائم)...'
        Start-ScheduledTask -TaskName $script:TaskName
    } else {
        Write-Log 'تشغيل النظام في الخلفية...'
        $procArgs = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $script:Runner + '" -Node "' + $node + '"'
        Start-Process -FilePath (Get-PowerShellExe) -ArgumentList $procArgs -WorkingDirectory $script:AppDir -WindowStyle Hidden | Out-Null
    }
    if (Wait-ForServer 40) {
        Write-Log "✔ النظام يعمل على $(Get-AppUrl)"
    } else {
        throw 'لم يبدأ النظام خلال 40 ثانية. راجع «سجلّ الخادم».'
    }
}

function Stop-App {
    $task = Get-AutoStartTask
    if ($task -and $task.State -eq 'Running') {
        Write-Log 'إيقاف مهمة التشغيل الدائم...'
        Stop-ScheduledTask -TaskName $script:TaskName -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }
    foreach ($r in (Get-RunnerProcesses)) {
        Write-Log "إيقاف المشغّل الخلفي (العملية $($r.ProcessId))..."
        Stop-ProcessTree ([int]$r.ProcessId)
    }
    $port = Get-AppPort
    $procId = Get-ListeningPid $port
    if ($procId) {
        $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($p -and $p.ProcessName -eq 'node') {
            Write-Log "إيقاف الخادم (العملية $procId)..."
            Stop-ProcessTree $procId
        } elseif ($p) {
            Write-Log "⚠ المنفذ $port تستخدمه عملية أخرى ($($p.ProcessName)) — لم يتم إيقافها."
        }
    }
    for ($i = 0; $i -lt 24; $i++) {
        if (-not (Get-ListeningPid $port)) { break }
        Start-Sleep -Milliseconds 250
    }
    Write-Log '✔ النظام متوقف.'
}

function Restart-AppIfWasRunning([bool]$wasRunning) {
    if ($wasRunning) { Start-App }
}

# ---------------------------------------------------------------------
# التشغيل الدائم (مهمة مجدولة تبدأ مع تشغيل Windows وتعيد التشغيل عند التوقف)
# ---------------------------------------------------------------------
# إدخالات قديمة في مجلد Startup تشير إلى ملف تشغيل لم يعد موجوداً (مجلد نُقل أو سُمّي من جديد)
function Get-StaleStartupEntries {
    $found = @()
    $dir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
    if (-not (Test-Path $dir)) { return $found }
    foreach ($f in (Get-ChildItem -Path $dir -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -in '.vbs', '.cmd', '.bat' })) {
        $text = ''
        try { $text = [IO.File]::ReadAllText($f.FullName) } catch { continue }
        if ($text -match '([A-Za-z]:\\[^"\r\n]*?_autostart\.bat)') {
            $target = $matches[1]
            $underApp = $target.StartsWith($script:AppDir.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)
            if ($underApp -or -not (Test-Path -LiteralPath $target)) { $found += $f }
        }
    }
    return $found
}

function Remove-StaleStartupEntries {
    $stale = @(Get-StaleStartupEntries)
    if ($stale.Count -eq 0) { return }
    $names = ($stale | ForEach-Object { $_.Name }) -join "`n"
    if (Confirm-Action ("وُجدت إدخالات تشغيل تلقائي قديمة لا تعمل (تشير إلى ملف تشغيل لم يعد موجوداً):`n`n$names`n`nالتشغيل الدائم الجديد يغني عنها. هل تريد حذفها؟")) {
        foreach ($f in $stale) {
            Remove-Item -LiteralPath $f.FullName -Force -ErrorAction SilentlyContinue
            Write-Log "✔ حُذف إدخال التشغيل القديم: $($f.Name)"
        }
    }
}

function Enable-AutoStart {
    if (-not (Test-Path $script:Runner)) { throw 'الملف tools\run-server.ps1 غير موجود.' }
    $node = Get-NodeExe
    if (-not $node) { throw 'Node.js غير منصّب.' }
    if ($node.StartsWith($env:USERPROFILE, [StringComparison]::OrdinalIgnoreCase)) {
        if (-not (Confirm-Action "Node.js منصّب داخل مجلد المستخدم:`n$node`n`nالتشغيل الدائم يعمل بحساب SYSTEM وقد لا يصل إلى هذا المسار. يُنصح بتنصيب Node.js لكل المستخدمين (Program Files). هل تريد المتابعة؟")) { return }
    }
    Ensure-EnvFile
    $wasRunning = Test-AppUp
    Stop-App

    $procArgs      = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $script:Runner + '" -Node "' + $node + '"'
    $action    = New-ScheduledTaskAction -Execute (Get-PowerShellExe) -Argument $procArgs -WorkingDirectory $script:AppDir
    $trigger   = New-ScheduledTaskTrigger -AtStartup
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
    $settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
                    -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName $script:TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings `
        -Description 'نظام إدارة الأبنية والكرفانات — يعمل تلقائياً مع تشغيل Windows ويُعاد تشغيله إذا توقف' -Force | Out-Null
    Write-Log '✔ فُعّل التشغيل الدائم: النظام يبدأ مع تشغيل الحاسبة (بدون تسجيل دخول) ويُعاد تشغيله إذا توقف.'
    Remove-StaleStartupEntries
    Start-App
}

function Disable-AutoStart {
    $task = Get-AutoStartTask
    if (-not $task) { Write-Log 'التشغيل الدائم غير مفعّل أصلاً.'; return }
    $wasRunning = Test-AppUp
    Stop-App
    Unregister-ScheduledTask -TaskName $script:TaskName -Confirm:$false
    Write-Log '✔ أُلغي التشغيل الدائم.'
    if ($wasRunning -and (Confirm-Action 'هل تريد تشغيل النظام الآن بشكل عادي (يتوقف عند إعادة تشغيل الحاسبة)؟')) { Start-App }
}

# ---------------------------------------------------------------------
# جدار الحماية (الخادم يستمع على كل الواجهات؛ القاعدة هي ما يسمح لبقية الحاسبات بالدخول)
# ---------------------------------------------------------------------
function Test-FirewallRule {
    $ErrorActionPreference = 'Continue'
    & netsh.exe advfirewall firewall show rule "name=$($script:FwRuleName)" 2>&1 | Out-Null
    return ($LASTEXITCODE -eq 0)
}

function Set-FirewallRule([bool]$enabled, [int]$port) {
    $ErrorActionPreference = 'Continue'
    & netsh.exe advfirewall firewall delete rule "name=$($script:FwRuleName)" 2>&1 | Out-Null
    if ($enabled) {
        & netsh.exe advfirewall firewall add rule "name=$($script:FwRuleName)" dir=in action=allow protocol=TCP "localport=$port" 2>&1 | Out-Null
        Write-Log "✔ فُتح المنفذ $port في جدار حماية Windows: يمكن للحاسبات الأخرى في الشبكة الدخول."
        foreach ($ip in (Get-LanAddresses)) { Write-Log "   http://${ip}:$port" }
    } else {
        Write-Log '✔ أُغلق المنفذ في جدار الحماية: الدخول من هذه الحاسبة فقط.'
    }
}

# ---------------------------------------------------------------------
# المكتبات والبناء (مع إرجاع تلقائي إذا فشل)
# ---------------------------------------------------------------------
function Get-LockHash {
    $lock = Join-Path $script:AppDir 'package-lock.json'
    if (-not (Test-Path $lock)) { return '' }
    return (Get-FileHash -Path $lock -Algorithm SHA256).Hash
}

function Install-Dependencies([bool]$force) {
    $nm = Join-Path $script:AppDir 'node_modules'
    $prev = Join-Path $script:AppDir 'node_modules.prev'
    $stamp = Join-Path $nm '.lock-hash'
    $hash = Get-LockHash
    if ((Test-Path $nm) -and -not $force) {
        if (-not (Test-Path $stamp)) {
            # أول تشغيل للوحة: المكتبات الموجودة تُعتبر مطابقة
            if ($hash) { [IO.File]::WriteAllText($stamp, $hash, $script:Utf8NoBom) }
            Write-Log 'المكتبات موجودة (سُجّل إصدارها للمقارنة لاحقاً).'
            return
        }
        if ((Get-Content $stamp -Raw).Trim() -eq $hash) { Write-Log 'المكتبات محدّثة.'; return }
    }
    $npm = Get-NpmCmd
    if (-not $npm) { throw 'npm غير موجود. تأكد من تنصيب Node.js.' }
    if (-not (Test-Path (Join-Path $script:AppDir 'package-lock.json'))) { throw 'الملف package-lock.json غير موجود.' }
    # المكتبات القديمة تُحفظ جانباً: إذا فشل التنصيب (مثلاً لا يوجد إنترنت) تعود كما كانت
    Remove-FolderFast $prev
    if (Test-Path $nm) { Rename-Item -LiteralPath $nm -NewName 'node_modules.prev' }
    $code = Invoke-Logged $npm 'ci --no-audit --no-fund' 'تنصيب المكتبات (يحتاج إنترنت، قد يستغرق دقائق)...'
    if ($code -ne 0 -or -not (Test-Path (Join-Path $nm 'express'))) {
        Remove-FolderFast $nm
        if (Test-Path $prev) { Rename-Item -LiteralPath $prev -NewName 'node_modules' }
        throw 'فشل تنصيب المكتبات. أُرجعت المكتبات السابقة كما كانت. تأكد من الاتصال بالإنترنت.'
    }
    if ($hash) { [IO.File]::WriteAllText($stamp, $hash, $script:Utf8NoBom) }
    Remove-FolderFast $prev
    Write-Log '✔ تم تنصيب المكتبات.'
}

function Invoke-Build {
    $npm = Get-NpmCmd
    if (-not $npm) { throw 'npm غير موجود. تأكد من تنصيب Node.js.' }
    $dist = Join-Path $script:AppDir 'dist'
    $prev = Join-Path $script:AppDir 'dist.prev'
    # أمر البناء يحذف مجلد dist قبل البدء؛ نحتفظ بالنسخة السابقة حتى ينجح البناء
    Remove-FolderFast $prev
    if (Test-Path $dist) { Rename-Item -LiteralPath $dist -NewName 'dist.prev' }
    $code = Invoke-Logged $npm 'run build' 'بناء النظام (قد يستغرق دقيقة أو أكثر)...'
    if ($code -ne 0 -or -not (Test-Path $script:Entry)) {
        Remove-FolderFast $dist
        if (Test-Path $prev) { Rename-Item -LiteralPath $prev -NewName 'dist' }
        throw 'فشل بناء النظام. أُرجع البناء السابق كما كان (التفاصيل في السجلّ أعلاه).'
    }
    Remove-FolderFast $prev
    Write-Log '✔ تم البناء.'
}

function Invoke-Rebuild {
    $wasRunning = Test-AppUp
    if ($wasRunning) { Stop-App }
    try {
        Install-Dependencies $false
        Invoke-Build
    } catch {
        # الفشل لا يجب أن يترك النظام متوقفاً: نعيد تشغيل البناء السابق
        if ($wasRunning) { try { Start-App } catch { } }
        throw
    }
    Restart-AppIfWasRunning $wasRunning
}

function Invoke-ReinstallDependencies {
    $wasRunning = Test-AppUp
    if ($wasRunning) { Stop-App }
    try { Install-Dependencies $true } catch { if ($wasRunning) { try { Start-App } catch { } }; throw }
    Restart-AppIfWasRunning $wasRunning
}

# ---------------------------------------------------------------------
# التحديث من حزمة (ملف ZIP أو مجلد) مع نسخة للتراجع
#   - لا يلمس أبداً: البيانات والمرفقات والسجلات والنسخ الاحتياطية وملف الإعدادات
#   - يحفظ نسخة من كل ملف سيُستبدل (backups\code\<التاريخ>) فيمكن التراجع بزر واحد
# ---------------------------------------------------------------------
$script:ExcludedTop = @('.data', 'uploads', 'logs', 'backups', 'node_modules', 'node_modules.prev', 'dist.prev', '.env', '.session_secret', 'updates', 'remov', '.git', '_safety', 'certs', 'data_store_backup.json')

# يفك الحزمة داخل $dest\x ويعيد مسار مجلد الاستخراج
function Expand-ZipTo([string]$zip, [string]$dest) {
    $extractDir = Join-Path $dest 'x'
    New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
    $tar = Join-Path $env:SystemRoot 'System32\tar.exe'
    if (Test-Path $tar) {
        Copy-Item -LiteralPath $zip -Destination (Join-Path $dest 'package.zip')
        $code = Invoke-Logged $tar '-xf ..\package.zip' 'فك ضغط الحزمة...' $extractDir
        Assert-Step $code 'فشل فك ضغط الملف.'
    } else {
        Write-Log 'فك ضغط الحزمة...'
        Expand-Archive -LiteralPath $zip -DestinationPath $extractDir -Force
    }
    return $extractDir
}

# المجلد الذي يحتوي فعلاً على ملفات النظام (قد تكون الحزمة داخل مجلد واحد إضافي)
function Find-UpdateRoot([string]$dir) {
    $markers = @('package.json', 'server.ts', 'src', 'script', 'dist')
    foreach ($m in $markers) { if (Test-Path -LiteralPath (Join-Path $dir $m)) { return $dir } }
    foreach ($sub in (Get-ChildItem -LiteralPath $dir -Directory -ErrorAction SilentlyContinue)) {
        foreach ($m in $markers) { if (Test-Path -LiteralPath (Join-Path $sub.FullName $m)) { return $sub.FullName } }
    }
    return $null
}

function Get-UpdatePlan([string]$root) {
    $changed = New-Object System.Collections.Generic.List[string]
    $added   = New-Object System.Collections.Generic.List[string]
    $rootFull = (Resolve-Path -LiteralPath $root).Path.TrimEnd('\')
    foreach ($f in (Get-ChildItem -LiteralPath $rootFull -Recurse -File -Force -ErrorAction SilentlyContinue)) {
        $rel = $f.FullName.Substring($rootFull.Length + 1)
        $top = ($rel -split '\\')[0]
        if ($script:ExcludedTop -contains $top) { continue }
        $target = Join-Path $script:AppDir $rel
        if (-not (Test-Path -LiteralPath $target)) { $added.Add($rel); continue }
        $t = Get-Item -LiteralPath $target
        if ($t.Length -ne $f.Length) { $changed.Add($rel); continue }
        if ((Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash) { $changed.Add($rel) }
    }
    return @{ Root = $rootFull; Changed = $changed; Added = $added }
}

function Get-UpdateNeeds([string[]]$files) {
    $pkg = $false; $src = $false; $dist = $false
    $cfg = @('vite.config.ts', 'tsconfig.json', 'server.ts', 'index.html')
    foreach ($rel in $files) {
        if ($rel -eq 'package.json' -or $rel -eq 'package-lock.json') { $pkg = $true }
        elseif ($rel -match '^dist\\') { $dist = $true }
        elseif ($rel -match '^(src|script|database|public)\\' -or $cfg -contains $rel) { $src = $true }
    }
    return @{ Package = $pkg; Source = $src; Dist = $dist }
}

function Invoke-ApplyUpdate([string]$root, [string]$label) {
    $plan = Get-UpdatePlan $root
    $all = @($plan.Changed) + @($plan.Added)
    if ($all.Count -eq 0) { Write-Log '✔ النظام مطابق للحزمة تماماً: لم يتغير شيء.'; return }
    $needs = Get-UpdateNeeds $all
    $sample = ($all | Select-Object -First 12) -join "`n"
    if ($all.Count -gt 12) { $sample += "`n... و $($all.Count - 12) ملفاً آخر" }
    $todo = @()
    if ($needs.Package) { $todo += 'تنصيب المكتبات' }
    if ($needs.Source -and -not $needs.Dist) { $todo += 'إعادة البناء' }
    $todoText = 'لا حاجة لخطوات إضافية.'
    if ($todo.Count -gt 0) { $todoText = 'ثم: ' + ($todo -join ' + ') }
    $msg = "الحزمة: $label`n`nملفات معدّلة: $($plan.Changed.Count) — ملفات جديدة: $($plan.Added.Count)`n`n$sample`n`n" +
           "قبل التطبيق تُؤخذ نسخة احتياطية من قاعدة البيانات، وتُحفظ نسخة من كل ملف سيُستبدل للتراجع.`n$todoText`n`nهل تريد المتابعة؟"
    if (-not (Confirm-Action $msg 'تحديث النظام')) { return }

    Write-Log "════ تحديث النظام: $label ════"
    $wasRunning = Test-AppUp
    if ($wasRunning) { Stop-App }
    try {
        if ((Test-PostgresMode) -or (Test-Path $script:DbFile)) { [void](New-Backup 'pre-update') }

        # نسخة الملفات التي ستُستبدل + قائمة الملفات الجديدة (للتراجع)
        $stamp = (Get-Date).ToString('yyyy-MM-dd_HHmmss')
        $snap = Join-Path $script:CodeBackupDir $stamp
        New-Item -ItemType Directory -Force -Path $snap | Out-Null
        foreach ($rel in $plan.Changed) {
            $dst = Join-Path (Join-Path $snap 'files') $rel
            New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
            Copy-Item -LiteralPath (Join-Path $script:AppDir $rel) -Destination $dst -Force
        }
        $manifest = @{ at = (Get-Date).ToString('yyyy-MM-ddTHH:mm:sszzz'); label = $label; changed = @($plan.Changed); added = @($plan.Added) }
        [IO.File]::WriteAllText((Join-Path $snap 'manifest.json'), ($manifest | ConvertTo-Json -Depth 4), $script:Utf8NoBom)

        # التطبيق
        Write-Log "نسخ $($all.Count) ملف..."
        foreach ($rel in $all) {
            $dst = Join-Path $script:AppDir $rel
            New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
            Copy-Item -LiteralPath (Join-Path $plan.Root $rel) -Destination $dst -Force
        }
        Write-Log '✔ نُسخت الملفات.'

        Ensure-EnvFile
        if ($needs.Package) { Install-Dependencies $true }
        if ($needs.Source -and -not $needs.Dist) { Invoke-Build }
    } catch {
        Write-Log "✘ $($_.Exception.Message)"
        Write-Log '⚠ إذا لم يعمل النظام كما يجب، استخدم زر «التراجع عن آخر تحديث».'
        if ($wasRunning) { try { Start-App } catch { } }
        throw
    }
    Write-Log '✔ اكتمل التحديث. للتراجع عنه: زر «التراجع عن آخر تحديث».'
    Write-Log '⚠ إذا تغيّر ملف لوحة التحكم نفسه، أغلقها وافتحها من جديد.'
    Restart-AppIfWasRunning $wasRunning
}

function Get-GitExe {
    Update-PathFromRegistry
    $c = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    $p = Join-Path $env:ProgramFiles 'Git\cmd\git.exe'
    if (Test-Path $p) { return $p }
    return $null
}

# التحديث من GitHub: الفرع main هو دائماً آخر إصدار. يجلب آخر نسخة ويطابق ملفات النظام معها ثم ينصّب ويبني.
# البيانات والإعدادات (.data و .env و backups و logs) خارج المستودع ولا تُمس.
function Invoke-UpdateFromGitHub {
    $ErrorActionPreference = 'Continue'
    $git = Get-GitExe
    if (-not $git) {
        if ((Test-WingetAvailable) -and (Confirm-Action "برنامج Git غير منصّب، وهو مطلوب للتحديث من GitHub.`n`nهل تريد تنصيبه الآن؟")) {
            $null = Invoke-Logged 'winget' 'install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements' 'تنصيب Git...'
            $git = Get-GitExe
        }
        if (-not $git) {
            Start-Process 'https://git-scm.com/download/win'
            throw 'نصّب Git من الصفحة التي فُتحت ثم أعد المحاولة.'
        }
    }
    Write-Log '════ التحديث من GitHub ════'
    # اللوحة تعمل بصلاحية المسؤول والمجلد قد يكون ملك مستخدم آخر: نسمح لـ Git بالعمل عليه لهذه الأوامر فقط
    $g = '-c safe.directory=* '

    if (-not (Test-Path (Join-Path $script:AppDir '.git'))) {
        Assert-Step (Invoke-Logged $git ($g + 'init -b main') 'ربط المجلد بـ GitHub...') 'فشل git init.'
    }
    $null = Invoke-Logged $git ($g + 'remote remove origin') ''
    Assert-Step (Invoke-Logged $git ($g + 'remote add origin ' + $script:RepoUrl) '') 'فشل ضبط رابط المستودع.'
    $code = Invoke-Logged $git ($g + 'fetch origin main') 'تحميل آخر إصدار (قد يطلب منك تسجيل الدخول إلى GitHub أول مرة)...'
    Assert-Step $code 'فشل التحميل من GitHub. تأكد من الإنترنت ومن تسجيل الدخول بحسابك.'

    $local  = (& $git -c safe.directory=* -C $script:AppDir rev-parse HEAD 2>$null)
    $remote = (& $git -c safe.directory=* -C $script:AppDir rev-parse origin/main 2>$null)
    if (-not $remote) { throw 'تعذر قراءة آخر إصدار من GitHub.' }
    if ($local -and $local -eq $remote -and (Test-Path $script:Entry)) {
        Write-Log '✔ النظام محدّث مسبقاً: لا يوجد إصدار أحدث على GitHub.'
        return
    }
    $short = "$remote".Substring(0, 7)
    $msg = "يوجد إصدار أحدث على GitHub ($short).`n`nستؤخذ نسخة احتياطية من البيانات، ثم تُطابق ملفات النظام مع GitHub، ثم تُنصّب المكتبات ويُعاد البناء.`n" +
           "أي تعديل يدوي على ملفات النظام غير مرفوع إلى GitHub سيُستبدل. البيانات والإعدادات لا تُمس.`n`nهل تريد المتابعة؟"
    if (-not (Confirm-Action $msg 'تحديث من GitHub')) { return }

    $wasRunning = Test-AppUp
    if ($wasRunning) { Stop-App }
    try {
        if ((Test-PostgresMode) -or (Test-Path $script:DbFile)) { [void](New-Backup 'pre-update') }
        Assert-Step (Invoke-Logged $git ($g + 'reset --hard origin/main') 'تطبيق التحديث...') 'فشل تطبيق التحديث.'
        $null = Invoke-Logged $git ($g + 'branch --set-upstream-to=origin/main main') ''
        Ensure-EnvFile
        Install-Dependencies $true
        Invoke-Build
        Write-Log "✔ تم التحديث إلى الإصدار $short."
        Write-Log '⚠ أغلق لوحة التحكم وافتحها من جديد حتى تعمل بنسختها المحدّثة.'
    } finally {
        Restart-AppIfWasRunning $wasRunning
    }
}

function Invoke-UpdateFromZip {
    $dlg = New-Object System.Windows.Forms.OpenFileDialog
    $dlg.Filter = 'حزمة التحديث (*.zip)|*.zip'
    $dlg.Title = 'اختر حزمة التحديث'
    if ($dlg.ShowDialog() -ne 'OK') { return }
    $zip = $dlg.FileName
    $tmp = Join-Path $env:TEMP ('ee-update-' + [Guid]::NewGuid().ToString('N'))
    try {
        $extracted = Expand-ZipTo $zip $tmp
        $root = Find-UpdateRoot $extracted
        if (-not $root) { throw 'الملف لا يحتوي على ملفات النظام (لا يوجد server.ts أو src أو package.json).' }
        Invoke-ApplyUpdate $root (Split-Path $zip -Leaf)
    } finally {
        Remove-FolderFast $tmp
    }
}

function Invoke-UpdateFromFolder {
    $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
    $dlg.Description = 'اختر مجلد التحديث (يحتوي على الملفات بنفس بنية مجلد النظام، مثل server\routes.ts)'
    if ($dlg.ShowDialog() -ne 'OK') { return }
    $root = Find-UpdateRoot $dlg.SelectedPath
    if (-not $root) { throw 'المجلد لا يحتوي على ملفات النظام (لا يوجد server.ts أو src أو package.json).' }
    if ($root.TrimEnd('\') -eq $script:AppDir.TrimEnd('\')) { throw 'اخترت مجلد النظام نفسه.' }
    Invoke-ApplyUpdate $root (Split-Path $dlg.SelectedPath -Leaf)
}

function Invoke-RollbackUpdate {
    if (-not (Test-Path $script:CodeBackupDir)) { throw 'لا توجد نسخة للتراجع عنها.' }
    $latest = Get-ChildItem -Path $script:CodeBackupDir -Directory | Where-Object { $_.Name -notlike '*_rolled-back' } | Sort-Object Name -Descending | Select-Object -First 1
    if (-not $latest) { throw 'لا توجد نسخة للتراجع عنها.' }
    $mf = Join-Path $latest.FullName 'manifest.json'
    if (-not (Test-Path $mf)) { throw 'ملف وصف النسخة (manifest.json) غير موجود.' }
    $m = [IO.File]::ReadAllText($mf, $script:Utf8NoBom) | ConvertFrom-Json
    $changed = @($m.changed)
    $added = @($m.added)
    $msg = "سيتم التراجع عن التحديث:`n$($m.label)`nبتاريخ $($m.at)`n`nيُرجَع $($changed.Count) ملف إلى ما كان عليه، ويُحذف $($added.Count) ملف جديد أضافه التحديث.`nقاعدة البيانات والمرفقات لا تتأثر.`n`nهل تريد المتابعة؟"
    if (-not (Confirm-Action $msg 'التراجع عن التحديث')) { return }
    Write-Log "════ التراجع عن التحديث: $($m.label) ════"
    $wasRunning = Test-AppUp
    if ($wasRunning) { Stop-App }
    foreach ($rel in $changed) {
        Copy-Item -LiteralPath (Join-Path (Join-Path $latest.FullName 'files') $rel) -Destination (Join-Path $script:AppDir $rel) -Force
    }
    foreach ($rel in $added) {
        Remove-Item -LiteralPath (Join-Path $script:AppDir $rel) -Force -ErrorAction SilentlyContinue
    }
    Rename-Item -LiteralPath $latest.FullName -NewName ($latest.Name + '_rolled-back')
    Write-Log '✔ أُرجعت الملفات.'
    try {
        $needs = Get-UpdateNeeds ($changed + $added)
        if ($needs.Package) { Install-Dependencies $true }
        if ($needs.Source -and -not $needs.Dist) { Invoke-Build }
        elseif ($needs.Dist) { Write-Log '⚠ التحديث كان يتضمن مجلد dist جاهزاً؛ إذا لم يعمل النظام كما يجب اضغط «إعادة البناء».' }
    } finally {
        Restart-AppIfWasRunning $wasRunning
    }
}

# حزمة لنقل النظام إلى حاسبة أخرى (بدون البيانات والمرفقات والإعدادات)
function New-TransferPackage {
    $tar = Join-Path $env:SystemRoot 'System32\tar.exe'
    if (-not (Test-Path $tar)) { throw 'أداة tar غير موجودة (تحتاج Windows 10 إصدار 1803 أو أحدث).' }
    if ((Get-BuildState) -ne 'ok') { Write-Log '⚠ البناء الحالي غير محدّث أو غير موجود؛ يُنصح بـ «إعادة البناء» قبل التجهيز.' }
    $withModules = Confirm-Action "هل تريد تضمين مجلد المكتبات (node_modules) في الحزمة؟`n`nنعم: للسيرفر الذي لا يملك إنترنت (الحزمة أكبر).`nلا: حزمة صغيرة، ويلزم إنترنت على الجهاز الآخر لتنصيب المكتبات." 'تجهيز حزمة'
    $name = 'buildings-system-' + (Get-Date).ToString('yyyyMMdd-HHmm') + '.zip'
    $out = Join-Path (Split-Path $script:AppDir) $name
    $ex = '--exclude=./.data --exclude=./uploads --exclude=./logs --exclude=./backups --exclude=./.env --exclude=./.session_secret --exclude=./updates --exclude=./remov --exclude=./.git --exclude=./_safety --exclude=./certs --exclude=./data_store_backup.json --exclude=./dist.prev --exclude=./node_modules.prev'
    if (-not $withModules) { $ex += ' --exclude=./node_modules' }
    Write-Log '════ تجهيز حزمة النظام ════'
    $code = Invoke-Logged $tar ('-a -c -f "' + $out + '" ' + $ex + ' .') 'ضغط الحزمة (قد يستغرق دقائق)...' $script:AppDir
    Assert-Step $code 'فشل إنشاء الحزمة.'
    Write-Log "✔ الحزمة جاهزة: $out"
    Start-Process 'explorer.exe' ('/select,"' + $out + '"')
}


# ---------------------------------------------------------------------
# النسخ الاحتياطي والاستعادة (SQLite)
#   backups\<التاريخ>\.data\store.json  : لقطة متسقة من قاعدة البيانات تُؤخذ والنظام يعمل (VACUUM INTO ثم فحص)
#   backups\_uploads                    : نسخة تراكمية من المرفقات (الجديد والمعدّل فقط، لا يُحذف منها شيء)
# ---------------------------------------------------------------------
function Save-UploadsMirror {
    if (-not (Test-Path $script:UploadsDir)) { return }
    $dest = Join-Path $script:BackupDir '_uploads'
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    $code = Invoke-Logged 'robocopy' ('"' + $script:UploadsDir + '" "' + $dest + '" /E /NFL /NDL /NJH /NJS /NP /R:1 /W:1') 'نسخ المرفقات (الجديد والمعدّل فقط)...'
    if ($code -ge 8) { throw 'فشل نسخ المرفقات.' }
}

function New-Backup([string]$Type = 'manual') {
    $node = Get-NodeExe
    if (-not $node) { throw 'Node.js غير موجود.' }
    if (-not (Test-PostgresMode) -and -not (Test-Path $script:DbFile)) { throw 'قاعدة البيانات غير موجودة (.data\store.json).' }
    if (-not (Test-Path (Join-Path $script:AppDir 'script\backup-db.mjs'))) { throw 'الملف script\backup-db.mjs غير موجود.' }
    $name = (Get-Date).ToString('yyyy-MM-dd_HHmm')
    if ($Type -eq 'pre-restore') { $name = (Get-Date).ToString('yyyy-MM-dd_HHmmss') + '_before-restore' }
    elseif ($Type -eq 'pre-update') { $name = (Get-Date).ToString('yyyy-MM-dd_HHmmss') + '_before-update' }
    $folder = Join-Path $script:BackupDir $name
    if (Test-Path $folder) { $folder = $folder + '_' + (Get-Date).ToString('ss') }
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
    Write-Log '════ نسخة احتياطية ════'
    $code = Invoke-Logged $node ('script\backup-db.mjs "' + $script:AppDir + '" "' + $folder + '"') 'نسخ قاعدة البيانات (لقطة متسقة والنظام يعمل)...' $script:AppDir
    if ($code -ne 0) {
        Remove-Item -LiteralPath $folder -Recurse -Force -ErrorAction SilentlyContinue
        throw 'فشل نسخ قاعدة البيانات.'
    }
    Save-UploadsMirror
    # الإعدادات ومفتاح الجلسات (لازمان لإرجاع النظام كما كان)
    Copy-Item $script:EnvFile (Join-Path $folder 'env.txt') -ErrorAction SilentlyContinue
    $info = '{"at":"' + (Get-Date).ToString('yyyy-MM-ddTHH:mm:sszzz') + '","type":"' + $Type + '","machine":"' + $env:COMPUTERNAME + '"}'
    [IO.File]::WriteAllText((Join-Path $folder 'backup-info.json'), $info, $script:Utf8NoBom)
    $size = (Get-Item (Join-Path $folder '.data\store.json')).Length
    Write-Log "✔ النسخة الاحتياطية جاهزة: $folder ($(Format-Size $size))"
    if ($Type -eq 'manual') { Start-Process 'explorer.exe' ('"' + $folder + '"') }
    return $folder
}

# نسخة مستقلة كاملة (قاعدة + مرفقات + إعدادات) إلى قرص خارجي أو حاسبة أخرى
function Export-BackupCopy {
    $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
    $dlg.Description = 'اختر مكان حفظ النسخة المستقلة (مثلاً قرص خارجي)'
    if ($dlg.ShowDialog() -ne 'OK') { return }
    $folder = New-Backup 'export'
    $dest = Join-Path $dlg.SelectedPath ('buildings-backup-' + (Split-Path $folder -Leaf))
    Write-Log "════ تصدير نسخة مستقلة إلى $dest ════"
    $code = Invoke-Logged 'robocopy' ('"' + $folder + '" "' + $dest + '" /E /NFL /NDL /NJH /NJS /NP') 'نسخ قاعدة البيانات والإعدادات...'
    if ($code -ge 8) { throw 'فشل التصدير.' }
    if (Test-Path (Join-Path $script:BackupDir '_uploads')) {
        $code = Invoke-Logged 'robocopy' ('"' + (Join-Path $script:BackupDir '_uploads') + '" "' + (Join-Path $dest 'uploads') + '" /E /NFL /NDL /NJH /NJS /NP') 'نسخ المرفقات...'
        if ($code -ge 8) { throw 'فشل نسخ المرفقات.' }
    }
    Write-Log "✔ النسخة المستقلة جاهزة: $dest (تُستعاد من زر «استعادة نسخة» باختيار ملف .data\store.json فيها)"
    Start-Process 'explorer.exe' ('"' + $dest + '"')
}

# ---------------------------------------------------------------------
# النسخ الاحتياطي المجدول (مهمة Windows يومية تعمل بحساب SYSTEM)
# ---------------------------------------------------------------------
function Get-BackupSchedule {
    $s = @{ Enabled = $false; Time = '23:00'; Keep = 14 }
    if (Test-Path $script:BackupSchedule) {
        try {
            $j = [IO.File]::ReadAllText($script:BackupSchedule, $script:Utf8NoBom) | ConvertFrom-Json
            $s.Enabled = [bool]$j.enabled
            if ($j.time) { $s.Time = [string]$j.time }
            if ($j.keep) { $s.Keep = [int]$j.keep }
        } catch { }
    }
    return $s
}

function Save-BackupSchedule([bool]$enabled, [string]$time, [int]$keep) {
    New-Item -ItemType Directory -Force -Path $script:BackupDir | Out-Null
    $en = 'false'
    if ($enabled) { $en = 'true' }
    $json = '{"enabled":' + $en + ',"time":"' + $time + '","keep":' + $keep + ',"since":"' + (Get-Date).ToString('yyyy-MM-ddTHH:mm:sszzz') + '"}'
    [IO.File]::WriteAllText($script:BackupSchedule, $json, $script:Utf8NoBom)
}

function ConvertTo-JsonText([string]$v) {
    $sb = New-Object System.Text.StringBuilder
    foreach ($ch in $v.ToCharArray()) {
        $c = [int]$ch
        if ($ch -eq '"') { [void]$sb.Append('\"') }
        elseif ($ch -eq '\') { [void]$sb.Append('\\') }
        elseif ($c -lt 32) { [void]$sb.Append('\u' + $c.ToString('x4')) }
        else { [void]$sb.Append($ch) }
    }
    return '"' + $sb.ToString() + '"'
}

# نتيجة آخر محاولة نسخ مجدول (نجاح أو فشل مع السبب)
function Write-BackupRunResult([bool]$ok, [string]$message) {
    try {
        New-Item -ItemType Directory -Force -Path $script:BackupDir | Out-Null
        $okText = 'false'
        if ($ok) { $okText = 'true' }
        $json = '{"at":"' + (Get-Date).ToString('yyyy-MM-ddTHH:mm:sszzz') + '","type":"scheduled","ok":' + $okText + ',"error":' + (ConvertTo-JsonText $message) + ',"machine":' + (ConvertTo-JsonText $env:COMPUTERNAME) + '}'
        [IO.File]::WriteAllText((Join-Path $script:BackupDir 'last-run.json'), $json, $script:Utf8NoBom)
    } catch { }
}

# نص يصف فشل آخر نسخة مجدولة أو $null
function Get-LastRunProblem {
    $f = Join-Path $script:BackupDir 'last-run.json'
    if (-not (Test-Path $f)) { return $null }
    try {
        $j = [IO.File]::ReadAllText($f, $script:Utf8NoBom) | ConvertFrom-Json
        if ($j.ok -eq $false) { return [string]$j.error }
    } catch { }
    return $null
}

function Invoke-ScheduledBackup {
    $ErrorActionPreference = 'Continue'
    Save-PanelLog ((Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + " ════ نسخة احتياطية مجدولة ════`r`n")
    $folder = New-Backup 'scheduled'
    # الإبقاء على آخر (Keep) نسخ مجدولة فقط؛ النسخ اليدوية وقبل التحديث لا تُحذف
    $keep = (Get-BackupSchedule).Keep
    $scheduled = @(Get-ChildItem -Path $script:BackupDir -Directory -ErrorAction SilentlyContinue | Where-Object {
        $f = Join-Path $_.FullName 'backup-info.json'
        (Test-Path $f) -and ((Get-Content $f -Raw -Encoding UTF8) -match '"type":"scheduled"')
    } | Sort-Object Name -Descending)
    if ($scheduled.Count -gt $keep) {
        foreach ($old in ($scheduled | Select-Object -Skip $keep)) {
            Remove-Item -Recurse -Force $old.FullName -ErrorAction SilentlyContinue
            Save-PanelLog ("   حُذفت نسخة مجدولة قديمة: " + $old.FullName + "`r`n")
        }
    }
    return $folder
}

# ---------------------------------------------------------------------
# نوافذ الإدخال
# ---------------------------------------------------------------------
function New-DialogForm([string]$title, [int]$width, [int]$height) {
    $f = New-Object System.Windows.Forms.Form
    $f.Text = $title
    $f.RightToLeft = 'Yes'
    $f.RightToLeftLayout = $true
    $f.StartPosition = 'CenterParent'
    $f.FormBorderStyle = 'FixedDialog'
    $f.MaximizeBox = $false
    $f.MinimizeBox = $false
    $f.Font = New-Object System.Drawing.Font('Segoe UI', 10)
    $f.ClientSize = New-Object System.Drawing.Size($width, $height)
    return $f
}

function Add-DialogButtons($form, [int]$y) {
    $ok = New-Object System.Windows.Forms.Button
    $ok.Text = 'حفظ'
    $ok.DialogResult = 'OK'
    $ok.Size = New-Object System.Drawing.Size(100, 32)
    $ok.Location = New-Object System.Drawing.Point(20, $y)
    $cancel = New-Object System.Windows.Forms.Button
    $cancel.Text = 'إلغاء'
    $cancel.DialogResult = 'Cancel'
    $cancel.Size = New-Object System.Drawing.Size(100, 32)
    $cancel.Location = New-Object System.Drawing.Point(130, $y)
    $form.Controls.Add($ok); $form.Controls.Add($cancel)
    $form.AcceptButton = $ok; $form.CancelButton = $cancel
}

function Show-PortDialog([int]$current) {
    $f = New-DialogForm 'تغيير المنفذ' 380 150
    $l = New-Object System.Windows.Forms.Label
    $l.Text = 'رقم المنفذ (من 1024 إلى 65535):'
    $l.Location = New-Object System.Drawing.Point(20, 20)
    $l.Size = New-Object System.Drawing.Size(220, 24)
    $n = New-Object System.Windows.Forms.NumericUpDown
    $n.Minimum = 1024; $n.Maximum = 65535; $n.Value = $current
    $n.Location = New-Object System.Drawing.Point(250, 18)
    $n.Size = New-Object System.Drawing.Size(110, 26)
    $f.Controls.Add($l); $f.Controls.Add($n)
    Add-DialogButtons $f 80
    if ($f.ShowDialog($script:MainForm) -ne 'OK') { return $null }
    return [int]$n.Value
}

# قائمة النسخ المتاحة للاستعادة (مجلدات النسخ، وملفات .db في مجلد النسخ، ولقطات التطبيق في .data\backups)
function Get-BackupItems {
    $items = New-Object System.Collections.Generic.List[object]
    if (Test-Path $script:BackupDir) {
        foreach ($d in (Get-ChildItem -Path $script:BackupDir -Directory -ErrorAction SilentlyContinue)) {
            $db = Join-Path $d.FullName '.data\store.json'
            if (Test-Path $db) {
                $it = Get-Item $db
                $items.Add([pscustomobject]@{ Path = $db; Time = $it.LastWriteTime; Size = $it.Length; Label = $d.Name })
            }
        }
        foreach ($f in (Get-ChildItem -Path $script:BackupDir -File -Filter 'store*.json' -ErrorAction SilentlyContinue)) {
            $items.Add([pscustomobject]@{ Path = $f.FullName; Time = $f.LastWriteTime; Size = $f.Length; Label = $f.Name })
        }
    }
    $appBackups = Join-Path $script:DataDir 'backups'
    if (Test-Path $appBackups) {
        foreach ($f in (Get-ChildItem -Path $appBackups -File -Filter 'store*.json' -ErrorAction SilentlyContinue)) {
            $items.Add([pscustomobject]@{ Path = $f.FullName; Time = $f.LastWriteTime; Size = $f.Length; Label = ('.data\backups\' + $f.Name) })
        }
    }
    return @($items | Sort-Object Time -Descending)
}

# يعيد مسار ملف قاعدة البيانات المختار أو $null
function Show-BackupPicker {
    $items = Get-BackupItems
    $f = New-DialogForm 'اختيار نسخة للاستعادة' 760 470
    $l = New-Object System.Windows.Forms.Label
    $l.Text = 'اختر النسخة التي تريد الرجوع إليها (الأحدث في الأعلى):'
    $l.Location = New-Object System.Drawing.Point(20, 14)
    $l.Size = New-Object System.Drawing.Size(720, 24)
    $lb = New-Object System.Windows.Forms.ListBox
    $lb.Location = New-Object System.Drawing.Point(20, 44)
    $lb.Size = New-Object System.Drawing.Size(720, 330)
    $lb.RightToLeft = 'No'
    $lb.Font = New-Object System.Drawing.Font('Consolas', 10)
    $lb.HorizontalScrollbar = $true
    foreach ($it in $items) {
        [void]$lb.Items.Add(('{0:yyyy-MM-dd HH:mm}   {1,10}   {2}' -f $it.Time, (Format-Size $it.Size), $it.Label))
    }
    $f.Controls.Add($l); $f.Controls.Add($lb)

    $ok = New-Object System.Windows.Forms.Button
    $ok.Text = 'استعادة'
    $ok.Size = New-Object System.Drawing.Size(110, 32)
    $ok.Location = New-Object System.Drawing.Point(20, 390)
    $ok.DialogResult = 'OK'
    $browse = New-Object System.Windows.Forms.Button
    $browse.Text = 'اختيار ملف آخر...'
    $browse.Size = New-Object System.Drawing.Size(150, 32)
    $browse.Location = New-Object System.Drawing.Point(140, 390)
    $cancel = New-Object System.Windows.Forms.Button
    $cancel.Text = 'إلغاء'
    $cancel.Size = New-Object System.Drawing.Size(100, 32)
    $cancel.Location = New-Object System.Drawing.Point(300, 390)
    $cancel.DialogResult = 'Cancel'
    $f.Controls.Add($ok); $f.Controls.Add($browse); $f.Controls.Add($cancel)
    $f.CancelButton = $cancel
    $script:PickedFile = $null
    $browse.Add_Click({
        $dlg = New-Object System.Windows.Forms.OpenFileDialog
        $dlg.Filter = 'ملف بيانات (*.json)|*.json|كل الملفات (*.*)|*.*'
        $dlg.Title = 'اختر ملف قاعدة البيانات'
        if ($dlg.ShowDialog() -eq 'OK') {
            $script:PickedFile = $dlg.FileName
            $frm = $this.FindForm()
            $frm.DialogResult = 'OK'
            $frm.Close()
        }
    })
    $lb.Add_DoubleClick({
        if ($this.SelectedIndex -ge 0) {
            $frm = $this.FindForm()
            $frm.DialogResult = 'OK'
            $frm.Close()
        }
    })
    if ($f.ShowDialog($script:MainForm) -ne 'OK') { return $null }
    if ($script:PickedFile) { return $script:PickedFile }
    if ($lb.SelectedIndex -lt 0) { return $null }
    return $items[$lb.SelectedIndex].Path
}

function Invoke-BackupScheduleDialog {
    $cur = Get-BackupSchedule
    $f = New-DialogForm 'النسخ الاحتياطي المجدول' 420 230
    $chk = New-Object System.Windows.Forms.CheckBox
    $chk.Text = 'أخذ نسخة احتياطية تلقائياً كل يوم'
    $chk.Checked = $cur.Enabled
    $chk.Location = New-Object System.Drawing.Point(20, 16)
    $chk.Size = New-Object System.Drawing.Size(380, 26)
    $f.Controls.Add($chk)
    $l1 = New-Object System.Windows.Forms.Label
    $l1.Text = 'الوقت (ساعة:دقيقة، 24 ساعة)'
    $l1.Location = New-Object System.Drawing.Point(20, 58)
    $l1.Size = New-Object System.Drawing.Size(220, 24)
    $t1 = New-Object System.Windows.Forms.TextBox
    $t1.Text = $cur.Time
    $t1.Location = New-Object System.Drawing.Point(250, 55)
    $t1.Size = New-Object System.Drawing.Size(140, 26)
    $l2 = New-Object System.Windows.Forms.Label
    $l2.Text = 'عدد النسخ المجدولة المحفوظة'
    $l2.Location = New-Object System.Drawing.Point(20, 98)
    $l2.Size = New-Object System.Drawing.Size(220, 24)
    $t2 = New-Object System.Windows.Forms.TextBox
    $t2.Text = [string]$cur.Keep
    $t2.Location = New-Object System.Drawing.Point(250, 95)
    $t2.Size = New-Object System.Drawing.Size(140, 26)
    $f.Controls.Add($l1); $f.Controls.Add($t1); $f.Controls.Add($l2); $f.Controls.Add($t2)
    Add-DialogButtons $f 170
    if ($f.ShowDialog($script:MainForm) -ne 'OK') { return }

    $time = $t1.Text.Trim()
    if ($time -notmatch '^([01]?\d|2[0-3]):[0-5]\d$') { throw 'اكتب الوقت بالشكل 23:00' }
    $keep = 0
    if (-not [int]::TryParse($t2.Text.Trim(), [ref]$keep) -or $keep -lt 1) { throw 'عدد النسخ يجب أن يكون رقماً أكبر من صفر' }

    Unregister-ScheduledTask -TaskName $script:BackupTask -Confirm:$false -ErrorAction SilentlyContinue
    if ($chk.Checked) {
        $action    = New-ScheduledTaskAction -Execute (Get-PowerShellExe) -Argument ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $PSCommandPath + '" -ScheduledBackup') -WorkingDirectory $script:AppDir
        $trigger   = New-ScheduledTaskTrigger -Daily -At ([datetime]::ParseExact($time.PadLeft(5, '0'), 'HH:mm', $null))
        $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
        $settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 4)
        Register-ScheduledTask -TaskName $script:BackupTask -Action $action -Trigger $trigger -Principal $principal -Settings $settings `
            -Description 'نسخة احتياطية يومية لنظام إدارة الأبنية والكرفانات' | Out-Null
        Save-BackupSchedule $true $time $keep
        Write-Log "✔ فُعّل النسخ الاحتياطي اليومي الساعة $time مع الإبقاء على آخر $keep نسخة مجدولة."
    } else {
        Save-BackupSchedule $false $time $keep
        Write-Log '✔ أُلغي النسخ الاحتياطي المجدول. النسخ اليدوي متاح من زر «نسخة احتياطية».'
    }
}

# العمليات الحساسة (الاستعادة) لا تعمل من لوحة فُتحت قبل تحديث النظام: يجب إعادة فتحها لتعمل بالنسخة الجديدة
function Assert-PanelCurrent {
    $now = $null
    try { $now = (Get-Item -LiteralPath $script:PanelFile).LastWriteTimeUtc } catch { return }
    if ($now -ne $script:PanelStamp) {
        throw 'تم تحديث ملف لوحة التحكم بعد فتحها، وهي ما زالت تعمل بنسختها القديمة. أغلقها وافتحها من جديد، ثم أعد المحاولة.'
    }
}

function Restore-Backup {
    Assert-PanelCurrent
    $file = Show-BackupPicker
    if (-not $file) { return }
    if ((Test-Path $script:DbFile) -and (Resolve-Path -LiteralPath $file).Path -eq $script:DbFile) { throw 'اخترت قاعدة البيانات الحالية نفسها.' }

    # فحص النسخة قبل أي تغيير: يجب أن تكون قاعدة سليمة
    $code = Invoke-PanelTool ('check "' + $file + '"') 'فحص النسخة المختارة...'
    if ($code -ne 0) { throw 'النسخة المختارة تالفة أو ليست قاعدة بيانات صالحة. لم يتغير شيء.' }
    $emp = Get-ToolValue 'USERS'
    $corr = Get-ToolValue 'UNITS'
    $last = Get-ToolValue 'LAST_UPDATE'
    $details = "المستخدمون: $emp — الوحدات: $corr"
    if ($last) { $details += "`nآخر تحديث في النسخة: $last" }
    $msg = "سيرجع النظام إلى حالته في النسخة:`n$file`n`n$details`n`nكل ما أُدخل بعد تاريخ هذه النسخة (وحدات، كشوفات، صيانة، حسابات) سيختفي من النظام.`nقبل الاستعادة تُحفظ تلقائياً نسخة أمان من البيانات الحالية، فيمكن الرجوع إليها من الزر نفسه.`n`nهل أنت متأكد؟"
    if (-not (Confirm-Action $msg 'استعادة نسخة احتياطية')) { return }

    Write-Log '════ استعادة نسخة احتياطية ════'
    $wasRunning = Test-AppUp
    Stop-App
    Write-Log '── نسخة أمان من البيانات الحالية قبل الاستعادة...'
    $safety = New-Backup 'pre-restore'
    if (Test-PostgresMode) {
        # المخزن المعتمد PostgreSQL: تُكتب محتويات النسخة في القاعدة نفسها
        $code = Invoke-PanelTool ('restore "' + $file + '"') 'كتابة النسخة في قاعدة PostgreSQL...'
        if ($code -ne 0) {
            $err = Get-ToolValue 'ERROR'
            Restart-AppIfWasRunning $wasRunning
            throw "فشلت الاستعادة إلى PostgreSQL: $err`nالبيانات كما كانت قبلها محفوظة في: $safety"
        }
    } else {
        foreach ($suffix in @('', '-wal', '-shm', '-journal')) {
            Remove-Item -LiteralPath ($script:DbFile + $suffix) -Force -ErrorAction SilentlyContinue
        }
        Copy-Item -LiteralPath $file -Destination $script:DbFile -Force
        if (Test-Path ($file + '-wal')) { Copy-Item -LiteralPath ($file + '-wal') -Destination ($script:DbFile + '-wal') -Force }
    }
    # المرفقات المحفوظة مع النسخة (مجلد files بجانب ملف البيانات) تُعاد إلى مجلد البيانات؛ لا يُحذف ما هو موجود
    $backupFiles = Join-Path (Split-Path -Parent $file) 'files'
    if (Test-Path -LiteralPath $backupFiles) {
        $targetFiles = Join-Path (Split-Path -Parent $script:DbFile) 'files'
        if (-not (Test-Path -LiteralPath $targetFiles)) { New-Item -ItemType Directory -Path $targetFiles -Force | Out-Null }
        Copy-Item -Path (Join-Path $backupFiles '*') -Destination $targetFiles -Force -ErrorAction SilentlyContinue
        Write-Log '   أُعيدت المرفقات المحفوظة مع النسخة.'
    }
    # المرفقات لا تُحذف أبداً: نُعيد فقط ما هو مفقود من المخزن (لا نستبدل أي ملف موجود)
    $store = Join-Path $script:BackupDir '_uploads'
    if (Test-Path $store) {
        New-Item -ItemType Directory -Force -Path $script:UploadsDir | Out-Null
        [void](Invoke-Logged 'robocopy' ('"' + $store + '" "' + $script:UploadsDir + '" /E /XC /XN /XO /NFL /NDL /NJH /NJS /NP') 'استعادة المرفقات المفقودة فقط...')
    }
    Write-Log "✔ تمت الاستعادة. البيانات كما كانت قبلها محفوظة في: $safety"
    Restart-AppIfWasRunning $wasRunning
}

# ---------------------------------------------------------------------
# حساب مدير النظام (استعادة كلمة المرور عند النسيان)
# ---------------------------------------------------------------------
function Show-AdminDialog([string]$hint) {
    $f = New-DialogForm 'كلمة مرور مدير النظام' 460 300
    $lbl = New-Object System.Windows.Forms.Label
    $lbl.Text = $hint
    $lbl.Location = New-Object System.Drawing.Point(20, 12)
    $lbl.Size = New-Object System.Drawing.Size(420, 44)
    $f.Controls.Add($lbl)
    $fields = @(
        @{ Key = 'Username'; Label = 'اسم المستخدم'; Secret = $false },
        @{ Key = 'Password'; Label = 'كلمة المرور الجديدة'; Secret = $true },
        @{ Key = 'Confirm';  Label = 'تأكيد كلمة المرور'; Secret = $true }
    )
    $boxes = @{}
    $y = 70
    foreach ($fd in $fields) {
        $l = New-Object System.Windows.Forms.Label
        $l.Text = $fd.Label
        $l.Location = New-Object System.Drawing.Point(20, ($y + 4))
        $l.Size = New-Object System.Drawing.Size(150, 24)
        $t = New-Object System.Windows.Forms.TextBox
        $t.Location = New-Object System.Drawing.Point(180, $y)
        $t.Size = New-Object System.Drawing.Size(250, 26)
        $t.RightToLeft = 'No'
        if ($fd.Secret) { $t.UseSystemPasswordChar = $true }
        $f.Controls.Add($l); $f.Controls.Add($t)
        $boxes[$fd.Key] = $t
        $y += 44
    }
    $boxes['Username'].Text = 'admin'
    Add-DialogButtons $f ($y + 10)
    while ($true) {
        if ($f.ShowDialog($script:MainForm) -ne 'OK') { return $null }
        $user = $boxes['Username'].Text.Trim()
        $pass = $boxes['Password'].Text
        if ($user.Length -lt 2) { Show-Error 'اكتب اسم المستخدم.'; continue }
        if ($pass -ne $boxes['Confirm'].Text) { Show-Error 'كلمتا المرور غير متطابقتين.'; continue }
        if ($pass.Length -lt 8 -or $pass -notmatch '[0-9]' -or $pass -notmatch '[^0-9]') { Show-Error 'كلمة المرور 8 أحرف على الأقل وتحتوي على أرقام وحروف.'; continue }
        return @{ Username = $user; Password = $pass }
    }
}

function Invoke-ResetAdmin {
    if (-not (Test-Path (Join-Path $script:AppDir 'node_modules'))) { throw 'المكتبات غير منصّبة.' }
    if (-not (Test-PostgresMode) -and -not (Test-Path $script:DbFile)) { throw 'قاعدة البيانات غير موجودة.' }
    $a = Show-AdminDialog 'تعيين كلمة مرور جديدة لحساب موجود (مثلاً مدير النظام) إذا نُسيت. الحساب يُفعَّل إن كان معطّلاً.'
    if (-not $a) { return }
    # ملف البيانات يُحمَّل في ذاكرة الخادم: يجب إيقافه قبل التعديل وإلا كتب فوقه
    $wasRunning = Test-AppUp
    if ($wasRunning) { Stop-App }
    $env:ECP_ADMIN_USERNAME = $a.Username
    $env:ECP_ADMIN_PASSWORD = $a.Password
    try {
        $code = Invoke-PanelTool 'reset-admin' 'تعيين كلمة المرور...'
    } finally {
        Remove-Item Env:ECP_ADMIN_USERNAME, Env:ECP_ADMIN_PASSWORD -ErrorAction SilentlyContinue
    }
    Restart-AppIfWasRunning $wasRunning
    if ($code -ne 0) {
        $err = Get-ToolValue 'ERROR'
        if (-not $err) { $err = 'فشل تعيين كلمة المرور.' }
        throw $err
    }
    Write-Log "✔ عُيّنت كلمة المرور الجديدة للحساب: $($a.Username)"
}

# ---------------------------------------------------------------------
# حماية المجلدات الخاصة (البيانات والمرفقات والنسخ والسجلات والإعدادات)
#  يفتحها فقط SYSTEM (الخادم والنسخ المجدول) ومدراء الحاسبة بعد موافقة Windows (UAC).
#  تُستخدم معرّفات SID حتى تعمل على Windows بأي لغة.
# ---------------------------------------------------------------------
$script:SidSystem = '*S-1-5-18'
$script:SidAdmins = '*S-1-5-32-544'

function Get-PrivatePaths {
    $list = @()
    foreach ($p in @($script:DataDir, $script:UploadsDir, $script:BackupDir, $script:LogDir)) {
        if (Test-Path $p) { $list += (Resolve-Path $p).Path }
    }
    return $list
}

function Get-FolderProtection {
    if (-not (Test-Path $script:DataDir)) { return $false }
    try { return [bool](Get-Acl -Path $script:DataDir).AreAccessRulesProtected } catch { return $false }
}

function Invoke-ProtectFolders {
    $ErrorActionPreference = 'Continue'
    $msg = "سيتم قفل المجلدات الخاصة بصلاحيات Windows:`n`n" +
        "• قاعدة البيانات، المرفقات، النسخ الاحتياطية، السجلات، ملف الإعدادات ومفتاح الجلسات.`n" +
        "• لا يفتحها إلا النظام نفسه (SYSTEM) ومدراء الحاسبة بعد موافقة Windows.`n`n" +
        "تنبيه: أي برنامج أو مستخدم عادي (غير مرفوع الصلاحية) لن يستطيع قراءة هذه المجلدات بعد الحماية، بما في ذلك أدوات التطوير والتشخيص التي تعمل بحسابك العادي.`n" +
        "لوحة التحكم والتشغيل الدائم والنسخ المجدول تبقى تعمل كالمعتاد. هل توافق؟"
    if (-not (Confirm-Action $msg 'حماية المجلدات')) { return }
    Write-Log '════ حماية المجلدات الخاصة ════'
    $grant = '"' + $script:SidSystem + ':(OI)(CI)F" "' + $script:SidAdmins + ':(OI)(CI)F"'
    foreach ($p in (Get-PrivatePaths)) {
        $code = Invoke-Logged 'icacls' ('"' + $p + '" /inheritance:r /grant:r ' + $grant) ('قفل ' + $p + '...')
        if ($code -ne 0) { throw ('تعذّر قفل ' + $p) }
        [void](Invoke-Logged 'icacls' ('"' + $p + '\*" /reset /T /C /Q') '')
        [void](Invoke-Logged 'icacls' ('"' + $p + '" /setowner "' + $script:SidAdmins + '" /T /C /Q') '')
    }
    foreach ($file in @($script:EnvFile, (Join-Path $script:AppDir '.session_secret'))) {
        if (Test-Path $file) {
            [void](Invoke-Logged 'icacls' ('"' + $file + '" /inheritance:r /grant:r "' + $script:SidSystem + ':F" "' + $script:SidAdmins + ':F"') ('قفل ' + (Split-Path $file -Leaf) + '...'))
        }
    }
    Write-Log '✔ المجلدات الخاصة محمية. لإلغاء الحماية: زر «إلغاء الحماية».'
}

function Invoke-UnprotectFolders {
    $ErrorActionPreference = 'Continue'
    if (-not (Confirm-Action 'ستعود صلاحيات المجلدات الخاصة كما يرثها المجلد الأب من القرص. هل توافق؟' 'إلغاء حماية المجلدات')) { return }
    Write-Log '════ إلغاء حماية المجلدات ════'
    foreach ($p in (Get-PrivatePaths)) {
        [void](Invoke-Logged 'icacls' ('"' + $p + '" /reset /T /C /Q') ('إرجاع صلاحيات ' + $p + '...'))
    }
    foreach ($file in @($script:EnvFile, (Join-Path $script:AppDir '.session_secret'))) {
        if (Test-Path $file) { [void](Invoke-Logged 'icacls' ('"' + $file + '" /reset /Q') '') }
    }
    Write-Log '✔ أُلغيت حماية المجلدات.'
}

# ---------------------------------------------------------------------
# فحص النظام
# ---------------------------------------------------------------------
function Invoke-SystemCheck {
    $ErrorActionPreference = 'Continue'
    Write-Log '════ فحص النظام ════'
    $ok = '✔'; $bad = '✘'; $warn = '⚠'
    Write-Log "مجلد النظام: $($script:AppDir)"

    $nv = Get-NodeVersion
    if ($nv -and (Test-NodeVersionOk $nv)) { Write-Log "$ok Node.js $nv" }
    elseif ($nv) { Write-Log "$bad Node.js $nv قديم — المطلوب 20 أو أحدث" }
    else { Write-Log "$bad Node.js غير منصّب" }

    if (Test-Path $script:EnvFile) {
        $cfg = Read-EnvFile
        Write-Log "$ok ملف الإعدادات .env موجود"
        if ($cfg.ContainsKey('SESSION_SECRET') -and $cfg['SESSION_SECRET'].Length -ge 32) { Write-Log "$ok مفتاح الجلسات مضبوط" }
        else { Write-Log "$bad مفتاح الجلسات (SESSION_SECRET) ناقص أو قصير — يُنشأ تلقائياً عند التشغيل" }
    } else {
        Write-Log "$warn ملف الإعدادات .env غير موجود — يُنشأ تلقائياً عند أول تشغيل من اللوحة"
    }

    if (Test-Path (Join-Path $script:AppDir 'node_modules')) { Write-Log "$ok المكتبات منصّبة" } else { Write-Log "$bad المكتبات غير منصّبة — استخدم «تنصيب المكتبات»" }
    switch (Get-BuildState) {
        'ok'      { Write-Log "$ok النظام مبني ومحدّث ($((Get-Item $script:Entry).LastWriteTime.ToString('yyyy-MM-dd HH:mm')))" }
        'stale'   { Write-Log "$warn ملفات المصدر أحدث من البناء الحالي — اضغط «إعادة البناء» لتفعيل التعديلات" }
        'missing' { Write-Log "$bad النظام غير مبني — اضغط «إعادة البناء»" }
    }

    # قاعدة البيانات
    if (Test-Path $script:DbFile) {
        Write-Log "$ok قاعدة البيانات: $(Get-DbSizeText)"
        if ($nv -and (Test-NodeVersionOk $nv) -and (Test-Path (Join-Path $script:AppDir 'node_modules'))) {
            $c = Invoke-PanelTool ('check "' + $script:DbFile + '"') ''
            $qc = Get-ToolValue 'QUICK_CHECK'
            if ($c -eq 0) { Write-Log "$ok سلامة قاعدة البيانات: $qc — مستخدمون: $(Get-ToolValue 'USERS')، وحدات: $(Get-ToolValue 'UNITS')، طلبات صيانة: $(Get-ToolValue 'MAINTENANCE')" }
            else { Write-Log "$bad فحص قاعدة البيانات فشل: $qc $(Get-ToolValue 'ERROR')" }
            $c2 = Invoke-PanelTool ('stats "' + $script:AppDir + '"') ''
            if ($c2 -eq 0) {
                if ((Get-ToolValue 'DEFAULT_ADMIN_PASSWORD') -eq '1') { Write-Log "$bad حساب admin ما زال بكلمة المرور الافتراضية — غيّرها فوراً من النظام أو من زر «كلمة مرور المدير»" }
                $pp = Get-ToolValue 'PLAINTEXT_PASSWORDS'
                if ($pp -and [int]$pp -gt 0) { Write-Log "$warn $pp حساب كلمة مروره محفوظة كنص صريح غير مشفّر (تُعالج في المرحلة 1 من خطة الإصلاح)" }
            }
        }
    } else {
        Write-Log "$bad قاعدة البيانات غير موجودة (.data\store.json)"
    }

    if (Test-Path $script:UploadsDir) {
        $sz = (Get-ChildItem -Path $script:UploadsDir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        if ($null -eq $sz) { $sz = 0 }
        Write-Log "$ok المرفقات: $(Format-Size $sz)"
    }

    # النسخ الاحتياطي
    $last = Get-LastBackupTime
    if ($last) {
        $age = (Get-Date) - $last
        if ($age.TotalHours -gt 48) { Write-Log "$warn آخر نسخة احتياطية قبل $([int]$age.TotalDays) يوماً ($($last.ToString('yyyy-MM-dd HH:mm')))" }
        else { Write-Log "$ok آخر نسخة احتياطية: $($last.ToString('yyyy-MM-dd HH:mm'))" }
    } else {
        Write-Log "$bad لا توجد أي نسخة احتياطية بعد — اضغط «نسخة احتياطية»"
    }
    $sch = Get-BackupSchedule
    $bt = Get-ScheduledTask -TaskName $script:BackupTask -ErrorAction SilentlyContinue
    if ($sch.Enabled -and $bt) { Write-Log "$ok النسخ المجدول مفعّل: يومياً الساعة $($sch.Time) (يُحتفظ بآخر $($sch.Keep))" }
    else { Write-Log "$warn النسخ المجدول غير مفعّل — يُنصح بتفعيله من زر «النسخ المجدول»" }
    $problem = Get-LastRunProblem
    if ($problem) { Write-Log "$bad فشلت آخر نسخة مجدولة: $problem" }

    # التشغيل
    $port = Get-AppPort
    if (Test-AppUp $port) {
        Write-Log "$ok النظام يعمل على المنفذ $port"
    } else {
        $owner = Get-ListeningPid $port
        if ($owner) {
            $p = Get-Process -Id $owner -ErrorAction SilentlyContinue
            Write-Log "$bad المنفذ $port مشغول ببرنامج آخر: $($p.ProcessName)"
        } else {
            Write-Log "$warn النظام متوقف"
        }
    }
    $task = Get-AutoStartTask
    if ($task) { Write-Log "$ok التشغيل الدائم مفعّل (الحالة: $($task.State))" } else { Write-Log "$warn التشغيل الدائم غير مفعّل — النظام لا يعمل بعد إعادة تشغيل الحاسبة" }
    foreach ($s in (Get-StaleStartupEntries)) { Write-Log "$warn إدخال تشغيل تلقائي قديم لا يعمل: $($s.Name) (يُحذف عند تفعيل التشغيل الدائم)" }
    if (Test-FirewallRule) {
        Write-Log "$ok المنفذ مفتوح في جدار الحماية (الحاسبات الأخرى تدخل من الشبكة)"
        foreach ($ip in (Get-LanAddresses)) { Write-Log "   رابط الحاسبات الأخرى: http://${ip}:$port" }
    } else {
        Write-Log "$warn المنفذ غير مفتوح في جدار الحماية — الدخول من هذه الحاسبة فقط"
    }
    if (Get-FolderProtection) { Write-Log "$ok المجلدات الخاصة محمية بصلاحيات Windows" } else { Write-Log "$warn المجلدات الخاصة غير محمية (اختياري: زر «حماية المجلدات»)" }

    $drive = Get-PSDrive -Name ($script:AppDir.Substring(0, 1)) -ErrorAction SilentlyContinue
    if ($drive) {
        $freeGb = [math]::Round($drive.Free / 1GB, 1)
        if ($freeGb -lt 5) { Write-Log "$warn المساحة الفارغة على القرص $($drive.Name): $freeGb GB" } else { Write-Log "$ok المساحة الفارغة على القرص $($drive.Name): $freeGb GB" }
    }
    Write-Log '════ انتهى الفحص ════'
}

# ---------------------------------------------------------------------
# إجراءات الأزرار
# ---------------------------------------------------------------------
function Invoke-ChangePort {
    $old = Get-AppPort
    $new = Show-PortDialog $old
    if (-not $new -or $new -eq $old) { return }
    $owner = Get-ListeningPid $new
    if ($owner) { throw "المنفذ $new مشغول ببرنامج آخر. اختر رقماً آخر." }
    $wasRunning = Test-AppUp
    Stop-App
    Ensure-EnvFile
    Set-EnvValues @{ PORT = "$new" }
    Write-Log "✔ تغيّر المنفذ من $old إلى $new"
    if (Test-FirewallRule) { Set-FirewallRule $true $new }
    Restart-AppIfWasRunning $wasRunning
}

function Invoke-OpenNetwork {
    $port = Get-AppPort
    if (-not (Confirm-Action "سيُفتح المنفذ $port في جدار حماية Windows ليدخل المستخدمون من حاسباتهم عبر الشبكة.`n`nهل تريد المتابعة؟")) { return }
    Set-FirewallRule $true $port
}

function Invoke-CloseNetwork {
    if (-not (Test-FirewallRule)) { Write-Log 'المنفذ غير مفتوح في جدار الحماية أصلاً.'; return }
    if (-not (Confirm-Action 'سيُغلق المنفذ في جدار الحماية فلا يستطيع أحد الدخول من حاسبة أخرى. هل تريد المتابعة؟')) { return }
    Set-FirewallRule $false 0
}

function Show-ServerLogTail {
    if (-not (Test-Path $script:ServerLog)) { Show-Info 'لا يوجد سجلّ بعد. شغّل النظام أولاً.'; return }
    Write-Log '── آخر 60 سطراً من سجلّ الخادم'
    foreach ($line in (Get-Content -Path $script:ServerLog -Tail 60 -Encoding UTF8)) { Write-Log "   $line" }
}

function Open-ServerLogFile {
    if (-not (Test-Path $script:ServerLog)) { Show-Info 'لا يوجد سجلّ بعد. شغّل النظام أولاً.'; return }
    Start-Process 'notepad.exe' ('"' + $script:ServerLog + '"')
}

# ---------------------------------------------------------------------
# أدوات التطوير
# ---------------------------------------------------------------------
function Invoke-TypeCheck {
    $npm = Get-NpmCmd
    if (-not $npm) { throw 'Node.js غير منصّب.' }
    $code = Invoke-Logged $npm 'run lint' 'فحص الأنواع (tsc --noEmit)...'
    if ($code -eq 0) { Write-Log '✔ فحص الأنواع نظيف: لا أخطاء.' } else { Write-Log '✘ يوجد أخطاء في الأنواع (أعلاه).' }
}

function Invoke-Tests {
    $npm = Get-NpmCmd
    if (-not $npm) { throw 'Node.js غير منصّب.' }
    if (-not (Test-Path $script:Entry)) { throw 'النظام غير مبني. اضغط «إعادة البناء» أولاً.' }
    # الاختبارات تشغّل نسخة مؤقتة من الخادم على منفذ آخر وبمجلد بيانات مؤقت: لا تمس بيانات النظام
    $code = Invoke-Logged $npm 'test' 'تشغيل اختبارات الأمان (قد يستغرق نصف دقيقة)...'
    if ($code -eq 0) { Write-Log '✔ نجحت كل الاختبارات.' } else { Write-Log '✘ فشل بعض الاختبارات (التفاصيل أعلاه).' }
}

function Invoke-DevMode {
    $tsx = Join-Path $script:AppDir 'node_modules\.bin\tsx.cmd'
    if (-not (Test-Path $tsx)) { throw 'أداة التطوير (tsx) غير منصّبة. استخدم «تنصيب المكتبات».' }
    $msg = "وضع التطوير يشغّل النظام من الشيفرة المصدرية مباشرة (بدون بناء) على المنفذ 3001، ويعمل على بيانات النظام الحالية نفسها.`n`n" +
           "لذلك يجب إيقاف النظام العادي أولاً، ويُنصح بأخذ نسخة احتياطية قبل التجربة.`n`nهل تريد المتابعة؟"
    if (-not (Confirm-Action $msg 'وضع التطوير')) { return }
    if (Test-AppUp) { Stop-App }
    Ensure-EnvFile
    $cfg = Read-EnvFile
    $secret = ''
    if ($cfg.ContainsKey('SESSION_SECRET')) { $secret = $cfg['SESSION_SECRET'] }
    $cmd = '/k "cd /d "' + $script:AppDir + '" && set NODE_ENV=development&& set PORT=3001&& set SESSION_SECRET=' + $secret + '&& "' + $tsx + '" server.ts"'
    Start-Process 'cmd.exe' -ArgumentList $cmd -WorkingDirectory $script:AppDir
    Write-Log 'فُتح وضع التطوير في نافذة منفصلة: http://localhost:3001 — أغلق النافذة لإيقافه.'
}

function Open-CodeEditor {
    Update-PathFromRegistry
    $code = Get-Command code.cmd -ErrorAction SilentlyContinue
    if ($code) { Start-Process $code.Source -ArgumentList ('"' + $script:AppDir + '"') -WindowStyle Hidden; return }
    Show-Info 'محرر VS Code غير منصّب أو غير مضاف إلى المسار.'
}

function Open-ShellWindow {
    Start-Process 'cmd.exe' -ArgumentList '/k' -WorkingDirectory $script:AppDir
}

function Open-EnvInNotepad {
    Ensure-EnvFile
    if (-not (Confirm-Action "ملف الإعدادات يحتوي على مفتاح الجلسات (سرّي). افتحه للتعديل فقط عند الحاجة، ولا تشاركه.`n`nأي تعديل يُطبَّق بعد إعادة تشغيل النظام.`n`nفتح الملف؟")) { return }
    Start-Process 'notepad.exe' ('"' + $script:EnvFile + '"')
}

# تشغيل بدون واجهة من المهمة المجدولة
if ($ScheduledBackup -and -not $script:TestMode) {
    try {
        [void](Invoke-ScheduledBackup)
        Write-BackupRunResult $true ''
        exit 0
    } catch {
        $msg = $_.Exception.Message
        Save-PanelLog ((Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + ' ✖ فشل النسخ المجدول: ' + $msg + "`r`n")
        Write-BackupRunResult $false $msg
        exit 1
    }
}


# ---------------------------------------------------------------------
# الواجهة الرئيسية
# ---------------------------------------------------------------------
if (-not $script:TestMode) {

$script:MainForm = New-Object System.Windows.Forms.Form
$MainForm.Text = 'لوحة تحكم نظام إدارة الأبنية والكرفانات'
$MainForm.RightToLeft = 'Yes'
$MainForm.RightToLeftLayout = $true
$MainForm.StartPosition = 'CenterScreen'
$MainForm.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$MainForm.ClientSize = New-Object System.Drawing.Size(1280, 780)
$MainForm.MinimumSize = New-Object System.Drawing.Size(1000, 640)
$MainForm.BackColor = [System.Drawing.Color]::FromArgb(248, 250, 252)

$layout = New-Object System.Windows.Forms.TableLayoutPanel
$layout.Dock = 'Fill'
$layout.ColumnCount = 1
$layout.RowCount = 4
$layout.Padding = New-Object System.Windows.Forms.Padding(12)
[void]$layout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle('Absolute', 56)))
[void]$layout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle('Absolute', 112)))
[void]$layout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle('Absolute', 250)))
[void]$layout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle('Percent', 100)))
$MainForm.Controls.Add($layout)

# العنوان
$header = New-Object System.Windows.Forms.Panel
$header.Dock = 'Fill'
$header.BackColor = [System.Drawing.Color]::FromArgb(31, 78, 95)
$title = New-Object System.Windows.Forms.Label
$title.Text = 'نظام إدارة الأبنية والكرفانات — لوحة التحكم'
$title.ForeColor = [System.Drawing.Color]::White
$title.Font = New-Object System.Drawing.Font('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)
$title.Dock = 'Fill'
$title.TextAlign = 'MiddleRight'
$title.Padding = New-Object System.Windows.Forms.Padding(12, 0, 12, 0)
$header.Controls.Add($title)
$layout.Controls.Add($header, 0, 0)

# لوحة الحالة
$statusBox = New-Object System.Windows.Forms.GroupBox
$statusBox.Text = 'الحالة'
$statusBox.Dock = 'Fill'
$statusGrid = New-Object System.Windows.Forms.TableLayoutPanel
$statusGrid.Dock = 'Fill'
$statusGrid.ColumnCount = 4
$statusGrid.RowCount = 3
for ($i = 0; $i -lt 4; $i++) { [void]$statusGrid.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle('Percent', 25))) }
$statusBox.Controls.Add($statusGrid)
$layout.Controls.Add($statusBox, 0, 1)

function New-StatusLabel {
    $l = New-Object System.Windows.Forms.Label
    $l.Dock = 'Fill'
    $l.TextAlign = 'MiddleRight'
    $l.AutoEllipsis = $true
    $statusGrid.Controls.Add($l)
    return $l
}
$script:LblServer  = New-StatusLabel
$script:LblPort    = New-StatusLabel
$script:LblAuto    = New-StatusLabel
$script:LblSched   = New-StatusLabel
$script:LblBuild   = New-StatusLabel
$script:LblNode    = New-StatusLabel
$script:LblDb      = New-StatusLabel
$script:LblBackup  = New-StatusLabel
$script:LblUrl     = New-Object System.Windows.Forms.LinkLabel
$LblUrl.Dock = 'Fill'
$LblUrl.TextAlign = 'MiddleRight'
$statusGrid.Controls.Add($LblUrl)
$LblUrl.Add_LinkClicked({ Start-Process (Get-AppUrl) })
$script:LblLan     = New-StatusLabel
$script:LblFw      = New-StatusLabel
$script:LblProtect = New-StatusLabel

# الأزرار
$buttonsPanel = New-Object System.Windows.Forms.FlowLayoutPanel
$buttonsPanel.Dock = 'Fill'
$buttonsPanel.FlowDirection = 'LeftToRight'
$buttonsPanel.WrapContents = $true
$buttonsPanel.AutoScroll = $true
$layout.Controls.Add($buttonsPanel, 0, 2)

$script:AllButtons = New-Object System.Collections.Generic.List[System.Windows.Forms.Button]

function Invoke-UiAction([scriptblock]$action) {
    if ($script:Busy) { return }
    $script:Busy = $true
    foreach ($b in $script:AllButtons) { $b.Enabled = $false }
    $MainForm.Cursor = 'WaitCursor'
    try {
        & $action
    } catch {
        $msg = $_.Exception.Message
        Write-Log "✘ $msg"
        Show-Error $msg
    } finally {
        $MainForm.Cursor = 'Default'
        foreach ($b in $script:AllButtons) { $b.Enabled = $true }
        $script:Busy = $false
        Update-Status
    }
}

function Add-Group([string]$caption, [array]$items) {
    $g = New-Object System.Windows.Forms.GroupBox
    $g.Text = $caption
    $g.Size = New-Object System.Drawing.Size(168, (34 + 34 * $items.Count))
    $g.Margin = New-Object System.Windows.Forms.Padding(4)
    $y = 22
    foreach ($it in $items) {
        $b = New-Object System.Windows.Forms.Button
        $b.Text = $it[0]
        $b.Size = New-Object System.Drawing.Size(152, 30)
        $b.Location = New-Object System.Drawing.Point(8, $y)
        $b.FlatStyle = 'System'
        $b.Tag = $it[1]
        $b.Add_Click({ Invoke-UiAction $this.Tag })
        $g.Controls.Add($b)
        $script:AllButtons.Add($b)
        $y += 34
    }
    $buttonsPanel.Controls.Add($g)
}

Add-Group 'التشغيل' @(
    @('تشغيل',               { Start-App }),
    @('إيقاف',               { Stop-App }),
    @('إعادة تشغيل',         { Stop-App; Start-App }),
    @('فتح النظام',          { Start-Process (Get-AppUrl) })
)
Add-Group 'التشغيل مع Windows' @(
    @('تفعيل التشغيل الدائم', { Enable-AutoStart }),
    @('إلغاء التشغيل الدائم', { Disable-AutoStart }),
    @('فتح المنفذ للشبكة',    { Invoke-OpenNetwork }),
    @('إغلاق المنفذ',         { Invoke-CloseNetwork })
)
Add-Group 'البناء والتحديث' @(
    @('إعادة البناء',          { Invoke-Rebuild }),
    @('تنصيب المكتبات',       { Invoke-ReinstallDependencies }),
    @('تحديث من GitHub',      { Invoke-UpdateFromGitHub }),
    @('تحديث من ملف ZIP',     { Invoke-UpdateFromZip }),
    @('تحديث من مجلد',        { Invoke-UpdateFromFolder }),
    @('التراجع عن آخر تحديث', { Invoke-RollbackUpdate }),
    @('تجهيز حزمة للنقل',     { New-TransferPackage })
)
Add-Group 'النسخ الاحتياطي' @(
    @('نسخة احتياطية',        { [void](New-Backup 'manual') }),
    @('النسخ المجدول',         { Invoke-BackupScheduleDialog }),
    @('استعادة نسخة',         { Restore-Backup }),
    @('تصدير نسخة مستقلة',    { Export-BackupCopy }),
    @('فتح مجلد النسخ',       { New-Item -ItemType Directory -Force -Path $script:BackupDir | Out-Null; Start-Process 'explorer.exe' ('"' + $script:BackupDir + '"') })
)
Add-Group 'الإعدادات والأمان' @(
    @('تغيير المنفذ',          { Invoke-ChangePort }),
    @('كلمة مرور المدير',     { Invoke-ResetAdmin }),
    @('إعداد PostgreSQL',      { Invoke-SetupPostgres }),
    @('كلمة مرور PostgreSQL',  { Invoke-ResetPostgresPassword }),
    @('ملف الإعدادات .env',   { Open-EnvInNotepad }),
    @('حماية المجلدات',        { Invoke-ProtectFolders }),
    @('إلغاء الحماية',         { Invoke-UnprotectFolders })
)
Add-Group 'الصيانة' @(
    @('فحص النظام',            { Invoke-SystemCheck }),
    @('آخر سجلّ الخادم',       { Show-ServerLogTail }),
    @('فتح ملف السجلّ',        { Open-ServerLogFile }),
    @('فتح مجلد النظام',       { Start-Process 'explorer.exe' ('"' + $script:AppDir + '"') }),
    @('مسح السجلّ',            { $script:LogBox.Clear() })
)
Add-Group 'التطوير' @(
    @('فحص الأنواع',           { Invoke-TypeCheck }),
    @('تشغيل الاختبارات',     { Invoke-Tests }),
    @('وضع التطوير',           { Invoke-DevMode }),
    @('فتح في VS Code',        { Open-CodeEditor }),
    @('نافذة أوامر',           { Open-ShellWindow })
)

# مربع السجلّ
$logGroup = New-Object System.Windows.Forms.GroupBox
$logGroup.Text = 'السجلّ'
$logGroup.Dock = 'Fill'
$script:LogBox = New-Object System.Windows.Forms.TextBox
$LogBox.Multiline = $true
$LogBox.ReadOnly = $true
$LogBox.ScrollBars = 'Vertical'
$LogBox.Dock = 'Fill'
$LogBox.BackColor = [System.Drawing.Color]::White
$LogBox.Font = New-Object System.Drawing.Font('Segoe UI', 9.5)
$logGroup.Controls.Add($LogBox)
$layout.Controls.Add($logGroup, 0, 3)

$script:BuildCache = @{ At = [datetime]::MinValue; State = 'ok' }
$script:NodeCache = @{ At = [datetime]::MinValue; Ver = $null }

function Set-StatusLabel($label, [string]$text, [string]$tone) {
    $label.Text = $text
    switch ($tone) {
        'good'  { $label.ForeColor = [System.Drawing.Color]::FromArgb(4, 120, 87) }
        'bad'   { $label.ForeColor = [System.Drawing.Color]::FromArgb(190, 18, 60) }
        'warn'  { $label.ForeColor = [System.Drawing.Color]::FromArgb(180, 83, 9) }
        default { $label.ForeColor = [System.Drawing.Color]::FromArgb(51, 65, 85) }
    }
}

function Update-Status {
    $port = Get-AppPort
    if (Test-AppUp $port) { Set-StatusLabel $LblServer 'النظام: يعمل' 'good' } else { Set-StatusLabel $LblServer 'النظام: متوقف' 'bad' }
    Set-StatusLabel $LblPort "المنفذ: $port" 'neutral'

    if (Get-AutoStartTask) { Set-StatusLabel $LblAuto 'التشغيل الدائم: مفعّل' 'good' } else { Set-StatusLabel $LblAuto 'التشغيل الدائم: غير مفعّل' 'warn' }

    $sch = Get-BackupSchedule
    $problem = Get-LastRunProblem
    if ($problem) { Set-StatusLabel $LblSched 'النسخ المجدول: فشلت آخر مرة' 'bad' }
    elseif ($sch.Enabled -and (Get-ScheduledTask -TaskName $script:BackupTask -ErrorAction SilentlyContinue)) { Set-StatusLabel $LblSched "النسخ المجدول: يومياً $($sch.Time)" 'good' }
    else { Set-StatusLabel $LblSched 'النسخ المجدول: غير مفعّل' 'warn' }

    # فحص تقادم البناء يمسح ملفات المصدر: يُحدَّث مرة كل دقيقة فقط
    if (((Get-Date) - $script:BuildCache.At).TotalSeconds -gt 60) {
        $script:BuildCache = @{ At = (Get-Date); State = (Get-BuildState) }
    }
    switch ($script:BuildCache.State) {
        'ok'      { Set-StatusLabel $LblBuild 'البناء: محدّث' 'good' }
        'stale'   { Set-StatusLabel $LblBuild 'البناء: يحتاج إعادة بناء' 'warn' }
        'missing' { Set-StatusLabel $LblBuild 'البناء: غير موجود' 'bad' }
    }

    # إصدار Node.js يتغير نادراً: يُقرأ كل 5 دقائق فقط
    if (((Get-Date) - $script:NodeCache.At).TotalMinutes -gt 5 -or -not $script:NodeCache.Ver) {
        $script:NodeCache = @{ At = (Get-Date); Ver = (Get-NodeVersion) }
    }
    $nv = $script:NodeCache.Ver
    if ($nv -and (Test-NodeVersionOk $nv)) { Set-StatusLabel $LblNode "Node.js: $nv" 'neutral' }
    elseif ($nv) { Set-StatusLabel $LblNode "Node.js: $nv (قديم)" 'bad' }
    else { Set-StatusLabel $LblNode 'Node.js: غير منصّب' 'bad' }

    Set-StatusLabel $LblDb "قاعدة البيانات: $(Get-DbSizeText)" 'neutral'

    $last = Get-LastBackupTime
    if (-not $last) { Set-StatusLabel $LblBackup 'آخر نسخة: لا توجد' 'bad' }
    else {
        $hours = ((Get-Date) - $last).TotalHours
        $txt = 'آخر نسخة: ' + $last.ToString('yyyy-MM-dd HH:mm')
        if ($hours -gt 48) { Set-StatusLabel $LblBackup $txt 'warn' } else { Set-StatusLabel $LblBackup $txt 'good' }
    }

    $LblUrl.Text = Get-AppUrl
    $ips = @(Get-LanAddresses)
    if ($ips.Count -gt 0) { Set-StatusLabel $LblLan ("الشبكة: http://$($ips[0]):$port") 'neutral' } else { Set-StatusLabel $LblLan 'الشبكة: —' 'neutral' }
    if (Test-FirewallRule) { Set-StatusLabel $LblFw 'جدار الحماية: المنفذ مفتوح للشبكة' 'good' } else { Set-StatusLabel $LblFw 'جدار الحماية: الدخول من هذه الحاسبة فقط' 'neutral' }
    if (Get-FolderProtection) { Set-StatusLabel $LblProtect 'حماية المجلدات: مفعّلة' 'good' } else { Set-StatusLabel $LblProtect 'حماية المجلدات: غير مفعّلة' 'neutral' }
}

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 10000
$timer.Add_Tick({ if (-not $script:Busy) { Update-Status } })

$MainForm.Add_Shown({
    Save-PanelLog "`r`n===== فتح لوحة التحكم =====`r`n"
    Write-Log "مجلد النظام: $($script:AppDir)"
    if (-not (Test-Path (Join-Path $script:AppDir 'node_modules'))) {
        Write-Log 'المكتبات غير منصّبة. اضغط «تنصيب المكتبات» ثم «إعادة البناء».'
    }
    $stale = @(Get-StaleStartupEntries)
    if ($stale.Count -gt 0 -and -not (Get-AutoStartTask)) {
        Write-Log "⚠ يوجد إدخال تشغيل تلقائي قديم لا يعمل ($($stale[0].Name)). اضغط «تفعيل التشغيل الدائم» لاستبداله."
    }
    Update-Status
    $timer.Start()
})

[void]$MainForm.ShowDialog()
$timer.Stop()

}
