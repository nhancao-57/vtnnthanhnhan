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

The service worker caches only this app's static assets and does not cache external libraries or time APIs. Its existing registration/deployment mechanism is unchanged; the HTML pages do not register a new worker automatically.
