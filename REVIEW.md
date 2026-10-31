# Refinement and reliability review — 31 October 2026

## Changes

- Compact headers on both pages: verification sits beneath the title on desktop, with shorter status wording and the same retry control. Clocks, theme controls, navigation, and verification behavior remain available. The session strip has less vertical padding.
- Existing content sections and button ordering are preserved. Buttons use quieter hover effects, mobile inputs avoid focus zoom, quantity controls have larger touch targets, and narrow cards/modals allow content to fit and scroll.
- Both pages register and check the service worker. Builds derive a release revision from asset contents. HTTP cache revalidation, offline query-string fallback, per-directory cache isolation, and relative manifest URLs address update/install gaps.
- No sales, stock, tax, spreadsheet mapping, invoice-date validation, or report calculations were changed. `main.js` is unchanged; the time module changes only displayed status text.

## Findings that remain

1. **Concurrent sales tabs can overwrite saved data.** Each page loads a session into memory, then replaces the same `inventoryState` localStorage entry when saving. There is no cross-tab revision check or lock. Two tabs opened from the same saved session can each record a sale, with the later write dropping the other tab's sale. Use one sales tab per browser profile until concurrency protection is implemented.
2. **Restored JSON lacks structural validation.** `handleRestoreSession` checks for the presence of a product database, while loading a session assumes arrays and valid entries. A malformed backup can be accepted and then break initialization. Restored invoice IDs also reach an inline event handler without type validation. A dedicated backup/schema validation change should reject malformed data before replacing a saved session.
3. **Drafts are not persisted.** The cart, customer form, and reporting imports exist in memory. Manual refresh or closing the window loses unfinished work; the new update checks deliberately do neither automatically.
4. **Offline support is partial.** Spreadsheet and chart scripts come from CDNs. New invoices additionally require a successful external time check by existing design. An offline cached page is not a fully offline sales app.

## Verification

- `npm run build` succeeds, producing compiled CSS and a release revision.
- `npm test`: 44 passing tests covering the existing sales/report contracts, internet-time checks, worker registration/retries, cache behavior/isolation, subdirectory manifest URLs, and deterministic release revisions.
- Source review confirms the header/media-query changes retain the existing controls and responsive table behavior. This is not a substitute for rendered layout checks.
- No browser was connected to this session. Desktop/mobile screenshots, touch/keyboard behavior on actual devices, installed-app update lifecycle, and live host/CDN headers were not verified.
- No changes were pushed or deployed. A Git push alone cannot prove delivery to installed devices without verifying the hosting pipeline.

## Deployment acceptance check

1. Run `npm run build` and `npm test`; deploy the complete resulting release over HTTPS, including compiled CSS and the revised worker.
2. Open the installed app online, make a harmless visible change in a second release, rebuild, and deploy it.
3. Confirm the existing open screen does not reload during an unfinished task. Finish that task, close all app windows and sales/report tabs, then reopen and confirm the new release appears.
4. Check both pages at 320, 375, 768, and 1280 px in light and dark mode, including a populated cart, a long product name, error status, and open dialogs. Confirm tables scroll inside their containers and controls stay reachable with the mobile keyboard open.
