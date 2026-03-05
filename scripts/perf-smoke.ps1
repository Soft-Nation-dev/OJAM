param(
    [string]$PackageName = "com.softnation.ojam"
)

$ErrorActionPreference = "Stop"

function Require-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found. Install Android platform-tools and ensure '$Name' is on PATH."
    }
}

function Read-ValueByRegex {
    param(
        [string[]]$Lines,
        [string]$Pattern
    )

    foreach ($line in $Lines) {
        if ($line -match $Pattern) {
            return $Matches[1]
        }
    }

    return $null
}

Require-Command "adb"

$workspace = Resolve-Path (Join-Path $PSScriptRoot "..")
$reportsDir = Join-Path $workspace "perf-reports"
New-Item -ItemType Directory -Path $reportsDir -Force | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$runDir = Join-Path $reportsDir "smoke-$timestamp"
New-Item -ItemType Directory -Path $runDir -Force | Out-Null

Write-Host ""
Write-Host "=== Ojam Performance Smoke Run ===" -ForegroundColor Cyan
Write-Host "Package: $PackageName"
Write-Host "Output:  $runDir"
Write-Host ""

Write-Host "Waiting for device..." -ForegroundColor Yellow
adb wait-for-device | Out-Null

Write-Host "Clearing logcat and resetting app process..." -ForegroundColor Yellow
adb logcat -c
adb shell am force-stop $PackageName

Write-Host "Resolving launch activity..." -ForegroundColor Yellow
$resolvedActivityOutput = adb shell cmd package resolve-activity --brief $PackageName
$launchActivity = ($resolvedActivityOutput | Where-Object { $_ -match "/" } | Select-Object -Last 1)

$amStartPath = Join-Path $runDir "am-start.txt"
$amStartStatus = "NOT_AVAILABLE"
$amStartThisTimeMs = "NOT_AVAILABLE"
$amStartTotalTimeMs = "NOT_AVAILABLE"
$amStartWaitTimeMs = "NOT_AVAILABLE"

Write-Host "Launching app for cold-start measurement..." -ForegroundColor Yellow
if ($launchActivity) {
    $launchActivity = $launchActivity.Trim()
    $amStartOutput = adb shell am start -W -n $launchActivity
    $amStartOutput | Out-File -FilePath $amStartPath -Encoding utf8

    $amStartStatus = Read-ValueByRegex -Lines $amStartOutput -Pattern "Status:\s+(.+)"
    $amStartThisTimeMs = Read-ValueByRegex -Lines $amStartOutput -Pattern "ThisTime:\s+(\d+)"
    $amStartTotalTimeMs = Read-ValueByRegex -Lines $amStartOutput -Pattern "TotalTime:\s+(\d+)"
    $amStartWaitTimeMs = Read-ValueByRegex -Lines $amStartOutput -Pattern "WaitTime:\s+(\d+)"
}
else {
    Write-Host "Could not resolve launch activity, using monkey fallback." -ForegroundColor DarkYellow
    $fallbackOutput = adb shell monkey -p $PackageName -c android.intent.category.LAUNCHER 1
    $fallbackOutput | Out-File -FilePath $amStartPath -Encoding utf8
}

Start-Sleep -Seconds 6

$logcat = adb logcat -d
$logcatPath = Join-Path $runDir "startup-logcat.txt"
$logcat | Out-File -FilePath $logcatPath -Encoding utf8

$displayLine = ($logcat | Select-String -Pattern "Displayed $PackageName" | Select-Object -Last 1)
$displayText = if ($displayLine) { $displayLine.Line.Trim() } else { "NOT_FOUND" }

Write-Host "Capturing baseline memory and frame stats..." -ForegroundColor Yellow
$memBefore = adb shell dumpsys meminfo $PackageName
$gfxBefore = adb shell dumpsys gfxinfo $PackageName

$memBeforePath = Join-Path $runDir "mem-before.txt"
$gfxBeforePath = Join-Path $runDir "gfx-before.txt"
$memBefore | Out-File -FilePath $memBeforePath -Encoding utf8
$gfxBefore | Out-File -FilePath $gfxBeforePath -Encoding utf8

Write-Host ""
Write-Host "Manual flow:" -ForegroundColor Green
Write-Host "1) Open Home and scroll for ~10s"
Write-Host "2) Open Explore and scroll for ~10s"
Write-Host "3) Open Search, type a query (e.g. 'faith') and scroll results"
Write-Host "4) Open Notifications"
Write-Host "5) Open a sermon and then Player"
Write-Host ""
[void](Read-Host "Press Enter after completing the flow")

Write-Host "Capturing post-flow memory and frame stats..." -ForegroundColor Yellow
$memAfter = adb shell dumpsys meminfo $PackageName
$gfxAfter = adb shell dumpsys gfxinfo $PackageName

$memAfterPath = Join-Path $runDir "mem-after.txt"
$gfxAfterPath = Join-Path $runDir "gfx-after.txt"
$memAfter | Out-File -FilePath $memAfterPath -Encoding utf8
$gfxAfter | Out-File -FilePath $gfxAfterPath -Encoding utf8

$memBeforeTotal = Read-ValueByRegex -Lines $memBefore -Pattern "TOTAL\s+(\d+)"
$memAfterTotal = Read-ValueByRegex -Lines $memAfter -Pattern "TOTAL\s+(\d+)"

$gfxBeforeJanky = Read-ValueByRegex -Lines $gfxBefore -Pattern "Janky frames:\s+\d+\s+\(([^\)]+)\)"
$gfxAfterJanky = Read-ValueByRegex -Lines $gfxAfter -Pattern "Janky frames:\s+\d+\s+\(([^\)]+)\)"

$gfxBeforeRendered = Read-ValueByRegex -Lines $gfxBefore -Pattern "Total frames rendered:\s+(\d+)"
$gfxAfterRendered = Read-ValueByRegex -Lines $gfxAfter -Pattern "Total frames rendered:\s+(\d+)"

$summary = @(
    "run_timestamp=$timestamp",
    "package=$PackageName",
    "launch_activity=$launchActivity",
    "am_start_status=$amStartStatus",
    "am_start_this_time_ms=$amStartThisTimeMs",
    "am_start_total_time_ms=$amStartTotalTimeMs",
    "am_start_wait_time_ms=$amStartWaitTimeMs",
    "startup_displayed_line=$displayText",
    "mem_total_pss_before_kb=$memBeforeTotal",
    "mem_total_pss_after_kb=$memAfterTotal",
    "gfx_total_frames_before=$gfxBeforeRendered",
    "gfx_total_frames_after=$gfxAfterRendered",
    "gfx_janky_before=$gfxBeforeJanky",
    "gfx_janky_after=$gfxAfterJanky"
)

$summaryPath = Join-Path $runDir "summary.txt"
$summary | Out-File -FilePath $summaryPath -Encoding utf8

Write-Host ""
Write-Host "Smoke benchmark complete." -ForegroundColor Green
Write-Host "Summary: $summaryPath"
Write-Host "AM start status/total/wait (ms): $amStartStatus / $amStartTotalTimeMs / $amStartWaitTimeMs"
Write-Host "Startup line: $displayText"
Write-Host "PSS before/after (KB): $memBeforeTotal -> $memAfterTotal"
Write-Host "Janky before/after: $gfxBeforeJanky -> $gfxAfterJanky"
Write-Host ""
