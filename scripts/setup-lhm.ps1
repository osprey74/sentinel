#requires -Version 5.1
<#
.SYNOPSIS
    Downloads LibreHardwareMonitor and stages it under src-tauri/resources/lhm/
    so the Tauri bundler picks it up as a resource.

.DESCRIPTION
    Sentinel ships LHM (MPL-2.0) as an optional sidecar to expose CPU/memory
    temperatures via WMI. This script fetches a release from GitHub, picks the
    .NET Framework portable archive (net472 / net48), extracts it, and copies
    the MPL license alongside.

    Run once before `npm run tauri dev` or `npm run tauri build`. The script is
    idempotent — re-running it overwrites the existing copy.

.PARAMETER Version
    Pin to a specific LHM release tag (e.g. "v0.9.4"). Defaults to "latest".

.EXAMPLE
    pwsh ./scripts/setup-lhm.ps1
    pwsh ./scripts/setup-lhm.ps1 -Version v0.9.6
#>
param(
    [string]$Version = "latest"
)

$ErrorActionPreference = "Stop"

$repoRoot   = Split-Path -Parent $PSScriptRoot
$targetDir  = Join-Path $repoRoot "src-tauri/resources/lhm"
$tempDir    = Join-Path $env:TEMP "sentinel-lhm-stage"

Write-Host "[setup-lhm] target: $targetDir"

# Resolve release metadata from GitHub API (works for both "latest" and pinned tags).
$apiUrl = if ($Version -eq "latest") {
    "https://api.github.com/repos/LibreHardwareMonitor/LibreHardwareMonitor/releases/latest"
} else {
    "https://api.github.com/repos/LibreHardwareMonitor/LibreHardwareMonitor/releases/tags/$Version"
}
Write-Host "[setup-lhm] querying $apiUrl"
$release = Invoke-RestMethod -UseBasicParsing -Headers @{ "User-Agent" = "sentinel-setup" } -Uri $apiUrl
$tag = $release.tag_name
Write-Host "[setup-lhm] release tag: $tag"

# LHM asset naming has changed across releases:
#   - v0.9.5+ : "LibreHardwareMonitor.zip" (default .NET Framework portable, runs on Win10/11 out of the box)
#               + "LibreHardwareMonitor.NET.10.zip" (requires .NET 10 runtime)
#   - older    : "LibreHardwareMonitor-net48.zip", "-net472.zip", etc.
# We prefer the bare .NET Framework portable since it has no extra runtime dependency.
$candidates = @(
    "LibreHardwareMonitor.zip",
    "LibreHardwareMonitor-net48.zip",
    "LibreHardwareMonitor-net472.zip",
    "LibreHardwareMonitor-net47.zip"
)

$asset = $null
foreach ($name in $candidates) {
    $asset = $release.assets | Where-Object { $_.name -eq $name } | Select-Object -First 1
    if ($asset) { break }
}

if (-not $asset) {
    # Final fallback: any zip that is not a .NET (Core/5+) build and not a debug/source archive.
    # This avoids picking ".NET.10.zip" by mistake (which needs .NET 10 installed).
    $asset = $release.assets |
        Where-Object {
            $_.name -like 'LibreHardwareMonitor*.zip' -and
            $_.name -notmatch '\.NET\.\d' -and
            $_.name -notmatch '(?i)debug|source|symbols|pdb'
        } |
        Select-Object -First 1
}

if (-not $asset) {
    Write-Host ""
    Write-Host "[setup-lhm] no compatible .NET Framework asset found in release $tag. Available assets:"
    $release.assets | ForEach-Object { Write-Host "    - $($_.name)" }
    Write-Error "No .NET Framework portable archive found. Re-run with -Version <tag> targeting an older release, or modify the candidate list in this script."
    exit 1
}

$zipUrl = $asset.browser_download_url
Write-Host "[setup-lhm] selected asset: $($asset.name)"
Write-Host "[setup-lhm] downloading $zipUrl"

if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir | Out-Null

$zipPath = Join-Path $tempDir "lhm.zip"
Invoke-WebRequest -UseBasicParsing -Uri $zipUrl -OutFile $zipPath

Write-Host "[setup-lhm] extracting..."
Expand-Archive -Path $zipPath -DestinationPath $tempDir -Force

# Stage to target — clean first to avoid stale files between releases. Preserve
# README.txt (committed so the directory survives in fresh clones) by saving and
# restoring it around the wipe.
$readmePath = Join-Path $targetDir "README.txt"
$readmeBackup = $null
if (Test-Path $readmePath) {
    $readmeBackup = Get-Content -Raw -LiteralPath $readmePath
}
if (Test-Path $targetDir) { Remove-Item -Recurse -Force $targetDir }
New-Item -ItemType Directory -Path $targetDir | Out-Null
if ($readmeBackup) {
    Set-Content -LiteralPath $readmePath -Value $readmeBackup -NoNewline
}

Get-ChildItem -Path $tempDir -Exclude "lhm.zip" | ForEach-Object {
    Copy-Item -Recurse -Force -Path $_.FullName -Destination $targetDir
}

# Some LHM archives place files inside a top-level folder. If LibreHardwareMonitor.exe
# is not directly under $targetDir, look one level deeper and flatten.
$exe = Join-Path $targetDir "LibreHardwareMonitor.exe"
if (-not (Test-Path $exe)) {
    $nested = Get-ChildItem -Path $targetDir -Filter "LibreHardwareMonitor.exe" -Recurse -File |
              Select-Object -First 1
    if ($nested) {
        Write-Host "[setup-lhm] flattening nested directory: $($nested.DirectoryName)"
        $sourceDir = $nested.DirectoryName
        Get-ChildItem -Path $sourceDir | Move-Item -Destination $targetDir -Force
        # Clean up empty parent folders left over from the move.
        Get-ChildItem -Path $targetDir -Directory |
            Where-Object { -not (Get-ChildItem -Path $_.FullName -Recurse -File) } |
            Remove-Item -Recurse -Force
    }
}

# Fetch and bundle MPL-2.0 license text alongside the binary.
$licenseUrl = "https://raw.githubusercontent.com/LibreHardwareMonitor/LibreHardwareMonitor/$tag/LICENSE"
$licensePath = Join-Path $targetDir "LICENSE-LibreHardwareMonitor.txt"
try {
    Invoke-WebRequest -UseBasicParsing -Uri $licenseUrl -OutFile $licensePath
    Write-Host "[setup-lhm] license -> $licensePath"
} catch {
    Write-Warning "[setup-lhm] could not fetch license: $_"
}

# Strip non-runtime files to keep the bundle small and avoid WiX MSI build
# issues (file-ID collisions and path-length limits during light.exe link).
# LHM only needs the .NET assemblies + native deps + config to run; debug
# symbols and localized UI resources are optional.
$pdbCount = 0
$xmlCount = 0
$langCount = 0
Get-ChildItem -Path $targetDir -Filter '*.pdb' -Recurse | ForEach-Object {
    Remove-Item -Force -LiteralPath $_.FullName
    $pdbCount++
}
Get-ChildItem -Path $targetDir -Filter '*.xml' -Recurse | ForEach-Object {
    Remove-Item -Force -LiteralPath $_.FullName
    $xmlCount++
}
# Language resource subdirs are named like "de", "ja", "zh-CN".
Get-ChildItem -Path $targetDir -Directory |
    Where-Object { $_.Name -match '^[a-z]{2}(-[A-Za-z]+)?$' } |
    ForEach-Object {
        Remove-Item -Recurse -Force -LiteralPath $_.FullName
        $langCount++
    }
Write-Host "[setup-lhm] stripped: $pdbCount pdb, $xmlCount xml, $langCount language dirs"

# Final sanity check
if (-not (Test-Path $exe)) {
    Write-Error "[setup-lhm] expected $exe but it is missing — release archive layout may have changed."
    exit 1
}

Remove-Item -Recurse -Force $tempDir
Write-Host "[setup-lhm] done. LHM staged at $targetDir"
