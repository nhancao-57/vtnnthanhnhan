# VTNN Thành Nhân — sales tools

Static Vietnamese sales and revenue-reporting pages. Serve this directory over HTTP after building the stylesheet.

```sh
npm install
npm run build
npm test
```

On Windows PowerShell with script execution disabled, use `npm.cmd` instead of `npm`.
`npm run dev:css` watches stylesheet changes. Both pages load SheetJS from their existing CDNs; the reporting page also loads Chart.js. A connected browser is needed for visual checks.

## Preserved spreadsheet contracts

- CSDL: first worksheet, data from Excel row **4**; name **E**, ID **F**, stock **AF**, unit **AH**, price **AI**. The filename still starts with `CSDL`, and the picker accepts `.xlsm`.
- Products aggregate by ID, with name as fallback. Batch order, first available batch pricing, stock parsing, and confirmed overselling remain in place.
- Invoice/sales export: the same **14 columns**, including product name **I**, unit **J**, quantity **K**, price **L**, amount **M**, and ID **N**. Existing rounding and customer fields on the first item row are preserved.
- Revenue aggregation still reads **I/J/K/M/N**, skips the header row, and retains the existing positive-amount revenue rule.
- Inventory export retains its seven columns and worksheet names remain unchanged.

## Reliability and verification

Invoice saves now store inventory, transactions, and invoice history in one `inventoryState` write. Old sessions with a separate `exportedInvoicesLog` key still load; backup/restore retains the existing external JSON format. A failed storage write leaves the cart intact. A failed download can be retried from invoice history without recording the sale again.

Tests execute the app functions with DOM, storage, file-reader, and SheetJS adapters. They cover spreadsheet positions and output rows, FIFO updates, matching by ID, oversell confirmation, cancelled imports, storage/download failure, reload recovery, report read errors, and cache isolation. They do not replace testing actual customer workbooks or visual browser checks.

Both pages now register the service worker via `pwa.js` on HTTPS (or localhost). It checks for updates at launch, when the page becomes visible, when connectivity returns, and hourly while visible. Checks are coalesced and failures do not interrupt work. No update forces a reload or activates over an open session.

`npm run build` compiles the stylesheet and generates a content-derived service worker revision from the app assets. Commit the resulting `src/output.css` and `service-worker.js` with source changes. The compiled CSS remains tracked for hosts that serve the repository directly. A push reaches installed apps **only after the host successfully deploys it**; this repository does not include a deployment workflow or identify the live hosting configuration.

The worker revalidates static assets against the network and falls back to cached copies on failure. A new worker waits until all existing app windows/tabs close; reopening then loads the new release. Ordinary refresh also requests current assets, but can leave a replacement worker waiting while other tabs remain open. This follows the [service worker lifecycle](https://web.dev/articles/service-worker-lifecycle). Background update checks do not replace JavaScript already running in an open page. Save the current invoice and export any in-memory report work before manually refreshing.

The host must serve the built files over HTTPS, serve `service-worker.js` with a JavaScript content type, and revalidate HTML, the worker, and unversioned JS/CSS (for example, `Cache-Control: no-cache`). Avoid immutable/long-lived CDN caching for these URLs; purge stale CDN responses when deploying. Publish a complete release together. The manifest's launch URL, scope, and icons resolve relative to the app directory, including subdirectory hosting.

Only this app's static assets are cached; external spreadsheet/chart libraries and time APIs are not. Offline shell loading is therefore **not** a guarantee that imports, exports, charts, or new invoices work offline. Cache cleanup is scoped to the app directory so a second installation on the same origin is not cleared. Older, unscoped `invoice-app-v*` caches are left intact because their owning directory cannot be established safely.

See [the refinement review](REVIEW.md) for findings and verification limits.

## Internet time and invoice dates

New invoices (including “save only”) require a fresh HTTPS time check before any sale, stock update, invoice history entry, or download is recorded. The date is calculated explicitly in `Asia/Ho_Chi_Minh` (GMT+7), regardless of the device clock or timezone. The date field is read-only; invoice creation derives its date directly from the verified timestamp rather than the field value. Excel positions, rounding, and other sales rules are unchanged.

`vietnam-time.js` queries TimeAPI.io first and WorldTimeAPI as a fallback, with a five-second timeout for each service, response validation, and cache bypassing. If neither service verifies the time, invoice creation stops and keeps the cart intact. There is no device-date or persisted-date fallback. Existing invoice downloads retain their original date and remain available without a new time check.

Both headers show Vietnam internet time, verification status, and a retry button. The optional local clock shows that same internet instant in the user's timezone. Between checks, display clocks advance using a monotonic elapsed-time timer, with checks every minute and on return to the page. Samples expire after two minutes and are invalidated on background/offline transitions. New invoices always check again, even when the header is verified.

Historical reports and session backups remain downloadable without time verification. In that case their filenames use `ChuaXacMinhNgay` (date unverified), and backup timestamp metadata is `null`, rather than using the device date. Recorded invoice dates inside reports are preserved.
