$ErrorActionPreference = "Stop"

if (-not $env:UXP_HYBRID_SDK_ROOT) {
  throw "UXP_HYBRID_SDK_ROOT is not set. Point it to the extracted Adobe UXP Hybrid Plugin SDK root."
}

$sdk = (Resolve-Path $env:UXP_HYBRID_SDK_ROOT).Path
$solution = Join-Path $PSScriptRoot "..\native\uxpaddon\BeatCheatPro-UxpAddon.sln"
$solution = (Resolve-Path $solution).Path

if (-not (Test-Path (Join-Path $sdk "src\api\UxpAddonShared.h"))) {
  throw "Invalid UXP_HYBRID_SDK_ROOT: src\api\UxpAddonShared.h was not found."
}

$msbuild = Get-Command msbuild.exe -ErrorAction SilentlyContinue
if (-not $msbuild) {
  throw "msbuild.exe was not found. Install Visual Studio with the Desktop development with C++ workload."
}

& $msbuild.Source $solution /m /p:Configuration=Release /p:Platform=x64 /p:UxpHybridSdkRoot="$sdk"
if ($LASTEXITCODE -ne 0) {
  throw "MSBuild failed with exit code $LASTEXITCODE."
}

$binary = Join-Path $PSScriptRoot "..\dist\win\x64\beatcheatpro_dsp.uxpaddon"
if (-not (Test-Path $binary)) {
  throw "Build reported success but the expected addon was not produced: $binary"
}

Write-Host ""
Write-Host "BeatCheat Pro Windows Hybrid addon built successfully:"
Write-Host (Resolve-Path $binary).Path
