param(
    [Parameter(Mandatory=$true)][string]$PythonPath,
    [Parameter(Mandatory=$true)][string]$DataRoot,
    [Parameter(Mandatory=$true)][string]$BackupRoot,
    [ValidateRange(1,36500)][int]$KeepDays = 30,
    [ValidateRange(1,100000)][int]$KeepMin = 7
)
$ErrorActionPreference = 'Stop'
& $PythonPath -B -X utf8 (Join-Path $PSScriptRoot 'daily_backup.py') --source $DataRoot --destination $BackupRoot --keep-days $KeepDays --keep-min $KeepMin
exit $LASTEXITCODE
