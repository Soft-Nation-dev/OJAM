# Mobile release QA

Run this checklist before publishing the web, Expo OTA, or Play Store release.

- [ ] iPhone SE: install guide, safe areas, compact home rows, and Settings actions.
- [ ] Standard/Max iPhone: Safari install, installed launch, and update refresh banner.
- [ ] iPad: desktop-mode install detection and responsive admin layout.
- [ ] Android Chrome: native PWA prompt, installed launch, and back navigation.
- [ ] Slow upload: progress appears within one second; cancel, retry, and resume work.
- [ ] Backgrounded upload: state and selected metadata remain available on return.
- [ ] Admin: search/filter, edit/delete, upload review, playlist multi-add, drag reorder, and one-save persistence.
- [ ] Offline launch: cached app shell opens and clearly handles unavailable audio/data.
- [ ] Expo OTA: preview stays on preview; production stays on production; rollback tested.
- [ ] Play Store: version/build values match and optional versus required updates behave correctly.
