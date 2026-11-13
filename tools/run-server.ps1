# Buildings Management System - background server runner.
# Started by the control panel (hidden window) or by the "BuildingsMgmtServer" scheduled task at Windows startup.
# Loads .env, starts the server and restarts it automatically if it stops or crashes.
# To stop it use the control panel (Stop), which ends this runner and the server together.
param([string]$Node = 'node')

$ErrorActionPreference = 'Continue'
$AppDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $AppDir

$LogDir = Join-Path $AppDir 'logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Log = Join-Path $LogDir 'server.log'
$Old = Join-Path $LogDir 'server.previous.log'
$Utf8 = New-Object System.Text.UTF8Encoding($false)

function Write-RunnerLog([string]$text) {
    try { [IO.File]::AppendAllText($Log, ('[' + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + '] ' + $text + "`r`n"), $Utf8) } catch { }
}

# Keep the log small: above 20 MB the old one is kept as server.previous.log
function Rotate-Log {
    try {
        if ((Test-Path $Log) -and ((Get-Item $Log).Length -gt 20MB)) {
            Move-Item $Log $Old -Force
        }
    } catch { }
}

# .env -> environment variables of this process (and so of the server)
$envFile = Join-Path $AppDir '.env'
if (Test-Path $envFile) {
    foreach ($line in [IO.File]::ReadAllLines($envFile, $Utf8)) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
            # A placeholder DATABASE_URL (CHANGE_ME) is skipped: the server then runs on its data file only
            if ($matches[1] -eq 'DATABASE_URL' -and $matches[2] -match 'CHANGE_ME') { continue }
            if ($matches[2].Length -gt 0) { Set-Item -Path ('Env:' + $matches[1]) -Value $matches[2] }
        }
    }
}
# Older installs kept the session secret in .session_secret
if (-not $env:SESSION_SECRET) {
    $legacy = Join-Path $AppDir '.session_secret'
    if (Test-Path $legacy) { $env:SESSION_SECRET = ([IO.File]::ReadAllText($legacy, $Utf8)).Trim() }
}
if (-not $env:PORT) { $env:PORT = '3000' }
$env:NODE_ENV = 'production'

$entry = Join-Path $AppDir 'dist\server.cjs'
$fast = 0
while ($true) {
    Rotate-Log
    if (-not (Test-Path $entry)) {
        Write-RunnerLog 'dist\server.cjs not found - the system is not built. Retrying in 30 seconds.'
        Start-Sleep -Seconds 30
        continue
    }
    Write-RunnerLog ('server starting on port ' + $env:PORT)
    $started = Get-Date
    $cmdLine = '/d /s /c ""' + $Node + '" "' + $entry + '" >> "' + $Log + '" 2>&1"'
    $p = Start-Process -FilePath 'cmd.exe' -ArgumentList $cmdLine -WorkingDirectory $AppDir -WindowStyle Hidden -PassThru
    $p.WaitForExit()
    $secs = [int]((Get-Date) - $started).TotalSeconds
    if ($secs -lt 20) { $fast++ } else { $fast = 0 }
    # Crash loop: wait longer each time (5s, 10s, ... up to 60s)
    $wait = [Math]::Min(60, 5 * [Math]::Max(1, $fast))
    Write-RunnerLog ('server stopped after ' + $secs + 's (exit code ' + $p.ExitCode + '), restarting in ' + $wait + ' seconds')
    Start-Sleep -Seconds $wait
}
