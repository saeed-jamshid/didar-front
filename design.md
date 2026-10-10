# Didar Cafe — existing-design repair

## Approved scope

Owner confirmed GitHub `main` is intended frontend and selected **repair existing design**, not redesign. Persian cafe-menu/QR browsing; preserve menu data, prices/tax/cart behavior, hero/logo, cream/forest-green branding, category chips, current single-column menu layout and desktop/mobile composition. Main-domain/CDN cutover remains deferred; public read-only IP8086 preview stays available, admin/writes blocked.

## Existing visual baseline

Colors from app/page.tsx: sand #cfc5b4, cream #ede8df, green #1a4731, greenLight #52b788, ink #1c1c1a. Existing spacing/radii/card sizing retained. Self-hosted Vazirmatn variable font for Persian; correct declared100–900 weight axis instead of mapping all requested weights onto400/700. Persian document language; do not blindly flip inherited direction because existing row-reverse/explicitRTL layouts already control alignment.

Tree card texture `/Asset 6@9x.png` was deleted in828a1b5 but still referenced twice. Recover exact artwork from0179fee as URL-safe `/card-tree.png`; downsize decorative raster to512px wide (same aspect/transparency) instead of sending45.8MP bitmap. Original remains recoverable in Git. No guessed replacement art, new font/color system or page redesign.

## Rendering/performance fixes

- Keep75px card/48px cart image dimensions; honor existing radius prop.
- Use native Next image optimization on HTTP preview as well as HTTPS production. Allowlist only HTTP130.185.76.124:8086/media/** alongside existing HTTPSdidarplace.ir/media/**, not arbitrary hosts/private IPs.
- Remove modal raw-original-image cache probe and duplicate reset effect. Actual optimized image onLoad controls fade-in.
- Existing API rebasing remains: preview pagination/media stay on current browser origin; explicit API base unchanged.
- Shared VPS had ~380MiB available/no swap; set Didar-only libuv pool1 to serialize image/fs work. Do not change/stop unrelated apps. Raise pool only when memory headroom improves.

## States/accessibility/responsiveness

Preserve loading skeletons, no-image fallback, unavailable items, image-error state, modal/cart behavior and keyboard cart activation. No horizontal overflow. Keep explicitRTL structures and correct Persian language. Do not invent missing data/menus/admin credentials. Desktop/mobile thumbnails and modal image must load without original-photo double downloads.

## Verification

Run lint/typecheck/build, API normalization tests and deployment/rollback checks. Verify texture dimensions/transparency/route200, tightly scoped Next image allowlist, serial PM2 env. Inspect real browser at390px and1440px with screenshots before/after:13categories/all117items, optimized thumbnail and modal requests, actual image completion, no404/JSerrors/overflow; preview admin404/write403. Measure actual same-origin media image transfer bytes, not field/Lighthouse performance claims. CI/deploy and Pal health must remain green. No branch merge or broad redesign included.
