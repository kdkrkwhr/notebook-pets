param(
    [string]$ComfyPath = $env:NOTEBOOK_COMFY_PATH,
    [int]$Port = 8188
)
$ErrorActionPreference = 'Stop'
if (-not $ComfyPath) { throw 'Specify -ComfyPath or NOTEBOOK_COMFY_PATH.' }
if ($Port -lt 1 -or $Port -gt 65535) { throw 'Invalid port.' }
$comfyRoot = (Resolve-Path -LiteralPath $ComfyPath).Path
$comfyPython = Join-Path $comfyRoot '.venv\Scripts\python.exe'
$entry = Join-Path $comfyRoot 'main.py'
if (-not (Test-Path -LiteralPath $comfyPython) -or -not (Test-Path -LiteralPath $entry)) {
    throw 'ComfyUI main.py and .venv\Scripts\python.exe are required.'
}
Push-Location -LiteralPath $comfyRoot
try {
    & $comfyPython $entry --listen 127.0.0.1 --port $Port --disable-auto-launch --disable-all-custom-nodes --offline
    $result = $LASTEXITCODE
} finally { Pop-Location }
exit $result
