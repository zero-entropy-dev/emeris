$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$shell = Join-Path $root "shell"
$exe = Join-Path $shell "out\EmerisShell.exe"

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Host "dotnet SDK not found."
    Write-Host "Install: winget install Microsoft.DotNet.SDK.8"
    Write-Host "Then run: npm run shell:build"
    exit 1
}

Push-Location $shell
try {
    dotnet publish -c Release -o out --self-contained false
    if (-not (Test-Path $exe)) {
        Write-Error "Build finished but EmerisShell.exe was not produced."
    }
    Write-Host "Built $exe"
} finally {
    Pop-Location
}
