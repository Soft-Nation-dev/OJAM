# Performance Smoke Benchmark

Use this quick flow to compare app performance before/after changes.

## Run

From the project root:

`npm run perf:smoke`

This creates a folder like:

`perf-reports/smoke-YYYYMMDD-HHMMSS`

with:

- `summary.txt`
- `startup-logcat.txt`
- `mem-before.txt`
- `mem-after.txt`
- `gfx-before.txt`
- `gfx-after.txt`

## What it measures

- Cold-start display timing (from `logcat` "Displayed ...")
- Memory (`dumpsys meminfo`, `TOTAL` PSS)
- Frame stats (`dumpsys gfxinfo`, janky frame percentage)

## Compare runs

For two run folders, compare these lines in `summary.txt`:

- `startup_displayed_line`
- `mem_total_pss_before_kb`
- `mem_total_pss_after_kb`
- `gfx_janky_before`
- `gfx_janky_after`

## Suggested pass criteria

- Startup time not slower than baseline
- Post-flow PSS does not grow unexpectedly
- Janky frame percent does not regress
