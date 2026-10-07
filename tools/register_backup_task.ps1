param(
    [Parameter(Mandatory=$true)][string]$PythonPath,
    [Parameter(Mandatory=$true)][string]$DataRoot,
    [Parameter(Mandatory=$true)][string]$BackupRoot,
    [ValidatePattern('^[A-Za-z0-9_-]+$')][string]$TaskName = 'NotebookPets-Backup',
    [ValidatePattern('^([01][0-9]|2[0-3]):[0-5][0-9]$')][string]$At = '03:00',
    [ValidateRange(1,36500)][int]$KeepDays = 30,
    [ValidateRange(1,100000)][int]$KeepMin = 7,
    [switch]$Register
)
$ErrorActionPreference = 'Stop'
$pythonExe = (Resolve-Path -LiteralPath $PythonPath).Path
$dataDirectory = (Resolve-Path -LiteralPath $DataRoot).Path
$backupDirectory = [IO.Path]::GetFullPath($BackupRoot)
if (-not (Test-Path -LiteralPath (Join-Path $dataDirectory 'state') -PathType Container)) {
    throw 'DataRoot must contain state/.'
}
function Quote-Argument([string]$Value) {
    if ($Value.Contains('"') -or $Value.Contains("`r") -or $Value.Contains("`n")) { throw 'Invalid argument.' }
    return '"' + ($Value -replace '(\\+)$', '$1$1') + '"'
}
$runner = Join-Path $PSScriptRoot 'run_backup.ps1'
$arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -File ' + (Quote-Argument $runner) +
    ' -PythonPath ' + (Quote-Argument $pythonExe) + ' -DataRoot ' + (Quote-Argument $dataDirectory) +
    ' -BackupRoot ' + (Quote-Argument $backupDirectory) + ' -KeepDays ' + $KeepDays + ' -KeepMin ' + $KeepMin
$shellExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
if (-not $Register) {
    [pscustomobject]@{TaskName=$TaskName; Execute=$shellExe; Arguments=$arguments; DailyAt=$At;
        TimeZone=[TimeZoneInfo]::Local.Id; Logon='Current user, logged in only'; Registered=$false} | ConvertTo-Json
    exit 0
}
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    throw 'Task already exists. Inspect it before changing its configuration.'
}
$action = New-ScheduledTaskAction -Execute $shellExe -Argument $arguments -WorkingDirectory (Split-Path $PSScriptRoot -Parent)
$trigger = New-ScheduledTaskTrigger -Daily -At ([datetime]::ParseExact($At, 'HH:mm', [Globalization.CultureInfo]::InvariantCulture))
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Notebook Pets verified save backup and retention' | Out-Null
[pscustomobject]@{TaskName=$TaskName; Registered=$true; DailyAt=$At; TimeZone=[TimeZoneInfo]::Local.Id} | ConvertTo-Json
