# Changelog

## 2.0.0 - 2026-07-24

### Fixed

- Focus timer now uses `chrome.alarms` instead of an unreliable service-worker `setInterval`
- Blocking is session-scoped by default (no longer permanent after adding a site)
- Dynamic DNR rules are fully cleared before re-sync (no orphan rules)
- Duration uses exact minute values (no more 1501s / 25:01 drift)
- Hostname input is normalized and validated
- Focus interstitial uses tab navigation instead of `window.close()`

### Added

- Duration presets (15 / 25 / 50) and custom minutes
- Short break flow + completion notifications
- Session count and day streak
- Optional **Always block** toggle
- Optional host permissions requested per blocked site
- Privacy policy, store listing copy, deploy guide, package script
- Unit tests for hostname helpers and streak math



### Changed

- Manifest V3 permissions tightened (`declarativeNetRequestWithHostAccess` + optional hosts)
- Popup / interstitial UI refreshed
- Versioned store zip via `scripts/package.ps1`

