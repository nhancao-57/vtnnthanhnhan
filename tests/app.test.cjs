const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Small DOM/file/storage adapters run the actual app functions without network/CDN dependencies.
function harness(page = 'main.js', storage = new Map()) {
    const elements = new Map();
    const readers = [];
    const timers = [];
    const downloads = [];
    const listeners = {};
    const html = fs.readFileSync(page === 'main.js' ? 'index.html' : page, 'utf8');
    const declaredIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
    function element() {
        const classes = new Set();
        return {
            value: '', checked: false, disabled: false, dataset: {}, style: {}, children: [], files: [],
            textContent: '', innerHTML: '',
            classList: { add: (...v) => v.forEach(x => classes.add(x)), remove: (...v) => v.forEach(x => classes.delete(x)), contains: v => classes.has(v), toggle(v, force) { if (force) classes.add(v); else classes.delete(v); } },
            addEventListener() {}, setAttribute(k, v) { this[k] = v; }, focus() {}, reset() {},
            appendChild(child) { this.children.push(child); }, contains(child) { return this.children.includes(child); },
            removeChild(child) { this.children = this.children.filter(x => x !== child); },
            insertRow() { const row = element(); this.children.push(row); return row; },
            querySelector() { return element(); }, getContext() { return null; }
        };
    }
    const document = {
        getElementById(id) { if (!declaredIds.has(id)) return null; if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
        createElement: element, documentElement: element(),
        addEventListener(name, callback) { (listeners[name] ??= []).push(callback); }
    };
    const context = vm.createContext({
        document, console: { log() {}, warn() {}, error() {} }, Intl, Date, Uint8Array,
        setTimeout: cb => timers.push(cb), clearTimeout() {}, setInterval() {},
        window: { matchMedia: () => ({ matches: false }), addEventListener() {} },
        VietnamTime: {
            start() {}, render() {},
            now: () => new Date('2026-10-25T10:00:00Z'),
            fileDate: () => '2026-10-25',
            sync: async () => new Date('2026-10-25T10:00:00Z'),
            dateString: date => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date)
        },
        localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, val) => storage.set(key, val), removeItem: key => storage.delete(key) },
        FileReader: class { constructor() { readers.push(this); } readAsArrayBuffer() {} readAsText() {} },
        XLSX: {
            read: () => ({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } }),
            utils: {
                sheet_to_json: () => [], aoa_to_sheet: rows => ({ rows }), book_new: () => ({ sheets: [] }),
                book_append_sheet: (book, sheet, name) => book.sheets.push({ sheet, name }),
                decode_range: () => ({ s: { r: 1, c: 8 }, e: { r: 1, c: 13 } }),
                encode_cell: ({ r, c }) => `${String.fromCharCode(65 + c)}${r + 1}`
            },
            writeFile: (book, name) => downloads.push({ book, name })
        }
    });
    const run = code => vm.runInContext(code, context);
    if (page.endsWith('.html')) {
        for (const match of fs.readFileSync(page, 'utf8').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) run(match[1]);
    } else {
        run(fs.readFileSync(page, 'utf8'));
        for (const callback of listeners.DOMContentLoaded || []) callback();
    }
    const state = expression => JSON.parse(run(`JSON.stringify(${expression})`));
    return { context, run, state, storage, readers, timers, downloads, el: document.getElementById };
}

const seed = `
    productDatabase = [
        {id:'A', name:'Same name', unit:'Bag', stock:10, price:100, batches:[{stock:3,price:100},{stock:7,price:120}]},
        {id:'B', name:'Same name', unit:'Bag', stock:20, price:200, batches:[{stock:20,price:200}]}
    ];
    productDatabaseOriginal = JSON.parse(JSON.stringify(productDatabase));
    currentCart = [{id:'A',name:'Same name',unit:'Bag',price:100,quantity:4}];
    document.getElementById('customer-name').value = 'Customer';
    document.getElementById('invoice-date').value = '2026-10-25';
    document.getElementById('save-invoice-only-check').checked = true;
`;

test('invoice saves stock, FIFO batches, transactions and history together and survives reload', async () => {
    const h = harness(); h.run(seed); await h.run('exportInvoiceFile()');
    assert.deepEqual(h.state('productDatabase.map(p => p.stock)'), [6, 20]);
    assert.deepEqual(h.state('productDatabase[0].batches.map(b => b.stock)'), [0, 6]);
    assert.equal(h.run('productDatabase[0].price'), 120);
    const reloaded = harness('main.js', h.storage);
    assert.equal(reloaded.run('dailyTransactions.length'), 1);
    assert.equal(reloaded.run('exportedInvoicesLog.length'), 1);
    assert.deepEqual(reloaded.state('productDatabase.map(p => p.stock)'), [6, 20]);
    assert.equal(h.run('currentCart.length'), 0);
});

test('storage failure rolls back stock and history and retains the editable cart', async () => {
    const h = harness(); h.run(seed);
    h.context.localStorage.setItem = () => { throw new Error('Quota exceeded'); };
    await h.run('exportInvoiceFile()');
    assert.deepEqual(h.state('productDatabase.map(p => p.stock)'), [10, 20]);
    assert.equal(h.run('currentCart.length'), 1);
    assert.equal(h.run('dailyTransactions.length + exportedInvoicesLog.length'), 0);
});

test('download failure preserves a single saved invoice that can be downloaded again', async () => {
    const h = harness(); h.run(seed);
    h.el('save-invoice-only-check').checked = false;
    h.context.XLSX.writeFile = () => { throw new Error('Download failed'); };
    await h.run('Promise.all([exportInvoiceFile(), exportInvoiceFile()])');
    assert.equal(h.run('dailyTransactions.length'), 1);
    assert.equal(h.run('exportedInvoicesLog.length'), 1);
    assert.equal(h.run('productDatabase[0].stock'), 6);
    const downloads = [];
    h.context.XLSX.writeFile = (book, name) => downloads.push({ book, name });
    h.run('reExportInvoice(exportedInvoicesLog[0].id)');
    assert.equal(downloads.length, 1);
    assert.equal(h.run('dailyTransactions.length'), 1);
});

test('manual sales without a database keep saved invoices and reports accessible', async () => {
    const h = harness();
    await h.run(seed + 'productDatabase = []; productDatabaseOriginal = []; devBypassMode = true; exportInvoiceFile();');
    assert.equal(h.el('view-exports-btn').disabled, false);
    assert.equal(h.el('export-sales-report-btn').disabled, false);
    assert.equal(h.el('end-session-btn').disabled, false);
    assert.equal(h.el('view-database-btn').disabled, true);
    assert.equal(h.run('exportedInvoicesLog[0].invoiceType'), 'Ngoài CSDL');
});

test('new invoices force an online check and ignore edits to the date field, including save-only mode', async () => {
    const h = harness(); h.run(seed);
    let checks = 0;
    h.context.VietnamTime.sync = async options => {
        assert.equal(options.force, true);
        checks++;
        return new Date('2026-10-25T17:00:01Z'); // October 26 in Vietnam, October 25 in UTC.
    };
    h.el('invoice-date').value = '1999-01-01';
    await h.run('exportInvoiceFile()');
    assert.ok(checks >= 1);
    assert.equal(h.run('dailyTransactions[0].customerInfo.date'), '2026-10-26');
    assert.equal(h.run('exportedInvoicesLog[0].dataForExport[1][1]'), '26/10/2026');
    assert.equal(h.run('exportedInvoicesLog[0].timestamp'), '2026-10-25T17:00:01.000Z');
    assert.ok(h.run('exportedInvoicesLog[0].fileName').endsWith('_2026-10-26.xlsx'));
});

test('real time module and invoice flow save the Vietnam day with device clock reads forbidden', async () => {
    const h = harness(); h.run(seed);
    h.context.Date = class extends Date {
        constructor(...args) { if (!args.length) throw new Error('Device clock read'); super(...args); }
        static now() { throw new Error('Device clock read'); }
    };
    h.context.performance = { now: () => 0 };
    h.context.crypto = { randomUUID: () => 'test-request' };
    h.context.AbortController = AbortController;
    h.context.fetch = async () => ({ ok: true, json: async () => ({ timeZone: 'Asia/Ho_Chi_Minh', dateTime: '2026-10-26T00:01:00.000' }) });
    h.run(fs.readFileSync('vietnam-time.js', 'utf8'));
    h.el('invoice-date').value = '2000-01-01';
    await h.run('exportInvoiceFile()');
    const saved = JSON.parse(h.storage.get('inventoryState'));
    assert.equal(saved.transactions[0].customerInfo.date, '2026-10-26');
    assert.equal(saved.exportedInvoicesLog[0].dataForExport[1][1], '26/10/2026');
    assert.equal(saved.exportedInvoicesLog[0].timestamp, '2026-10-25T17:01:00.000Z');
});

test('unavailable internet time blocks both download and save-only without mutating the sale', async () => {
    for (const saveOnly of [true, false]) {
        const h = harness(); h.run(seed);
        h.el('save-invoice-only-check').checked = saveOnly;
        h.context.VietnamTime.sync = async () => { throw new Error('offline'); };
        await h.run('exportInvoiceFile()');
        assert.equal(h.run('dailyTransactions.length'), 0);
        assert.equal(h.run('exportedInvoicesLog.length'), 0);
        assert.equal(h.run('productDatabase[0].stock'), 10);
        assert.equal(h.run('currentCart.length'), 1);
        assert.equal(h.storage.size, 0);
        assert.equal(h.downloads.length, 0);
        assert.equal(h.run('invoiceExportPending'), false);
        assert.equal(h.el('main-app-controls').disabled, false);
    }
});

test('pending time verification blocks repeat clicks and aborts if the session changes', async () => {
    const h = harness(); h.run(seed);
    let resolve;
    h.context.VietnamTime.sync = () => new Promise(done => { resolve = done; });
    const pending = h.run('exportInvoiceFile()');
    assert.equal(h.el('main-app-controls').disabled, true);
    await h.run('exportInvoiceFile()');
    assert.equal(h.run('dailyTransactions.length'), 0);
    h.run('productDatabase = []');
    resolve(new Date('2026-10-25T10:00:00Z'));
    await pending;
    assert.equal(h.run('dailyTransactions.length'), 0);
    assert.equal(h.run('currentCart.length'), 1);
});

test('re-downloading a historical invoice preserves its original date without a new time check', async () => {
    const h = harness(); h.run(seed); await h.run('exportInvoiceFile()');
    h.context.VietnamTime.sync = () => { throw new Error('Must not check time for a historical download'); };
    h.run('reExportInvoice(exportedInvoicesLog[0].id)');
    assert.equal(h.downloads[0].book.sheets[0].sheet.rows[1][1], '25/10/2026');
    assert.equal(h.run('dailyTransactions.length'), 1);
});

test('editing search clears the selected product; cumulative additions require oversell confirmation', () => {
    const h = harness(); h.run(seed);
    h.run(`selectProduct(productDatabase[0]); document.getElementById('product-search').value = 'Different'; handleProductSearch({target:document.getElementById('product-search')});`);
    assert.equal(h.run('selectedProduct'), null);
    h.run(`selectProduct(productDatabase[0]); document.getElementById('product-quantity').value = '7'; handleAddProduct({preventDefault(){}});`);
    assert.equal(h.run('currentCart[0].quantity'), 4);
    h.run('onConfirmCallback()');
    assert.equal(h.run('currentCart[0].quantity'), 11);
});

test('same-name products with different IDs remain separate in cart and inventory export', async () => {
    const h = harness(); h.run(seed);
    await h.run(`selectProduct(productDatabase[1]); document.getElementById('product-quantity').value = '2'; handleAddProduct({preventDefault(){}}); exportInvoiceFile();`);
    h.run('exportInventory()');
    assert.deepEqual(h.state('dailyTransactions[0].items.map(i => i.id)'), ['A', 'B']);
    const rows = h.downloads[0].book.sheets[0].sheet.rows;
    assert.deepEqual(Array.from(rows[1]), ['Same name', 'Bag', 10, 4, 6, '', 'A']);
    assert.deepEqual(Array.from(rows[2]), ['Same name', 'Bag', 20, 2, 18, '', 'B']);
});

test('invoice output keeps all 14 columns, first-row customer fields and rounding rules', () => {
    const h = harness(); h.run(seed);
    const rows = h.state(`buildFlatInvoiceData([{customerInfo:{date:'2026-10-25',name:'C',address:'Addr',tin:'T',buyerName:'Buyer',email:'E',paymentMethod:'Cash'},items:[{id:'A',name:'P',unit:'U',quantity:3,price:10.4},{id:'B',name:'Q',unit:'V',quantity:2,price:20}]}])`);
    assert.equal(rows[0].length, 14);
    assert.deepEqual(rows[1], [1, '25/10/2026', 'C', 'Addr', 'T', 'Buyer', 'E', 'Cash', 'P', 'U', 3, 10, 31, 'A']);
    assert.deepEqual(rows[2], [1, '', '', '', '', '', '', '', 'Q', 'V', 2, 20, 40, 'B']);
});

function importRows(h, rows) {
    h.el('file-input').files = [{ name: 'CSDL_test.xlsm' }];
    h.context.XLSX.utils.sheet_to_json = () => rows;
    h.run('handleFileLoad()');
    h.readers.at(-1).onload({ target: { result: new ArrayBuffer(0) } });
}
function productRow(stock = 5, price = 123) {
    const row = Array(35).fill('');
    row[4] = 'Fertilizer'; row[5] = 'P001'; row[31] = stock; row[33] = 'Bag'; row[34] = price;
    return row;
}

test('CSDL begins at row 4 and reads E/F/AF/AH/AI, aggregating batches by ID', () => {
    const h = harness();
    importRows(h, [productRow(999), [], [], productRow(5), productRow(2, 150)]);
    assert.deepEqual(h.state('productDatabase'), [{ id: 'P001', name: 'Fertilizer', unit: 'Bag', stock: 7, price: 123, batches: [{ stock: 5, originalStock: 5, price: 123 }, { stock: 2, originalStock: 2, price: 150 }] }]);
});

test('cancelled negative-stock and empty imports preserve previous data', () => {
    const h = harness(); h.run(seed + 'dailyTransactions = [];');
    importRows(h, [[], [], [], productRow(-5)]);
    assert.equal(h.run('productDatabase[0].id'), 'A');
    h.run('hideConfirmModal()');
    assert.equal(h.el('file-input').dataset.loading, undefined);
    importRows(h, [[], [], []]);
    assert.equal(h.run('productDatabase[0].id'), 'A');
    assert.equal(h.run('currentCart.length'), 1);
});

test('legacy invoice history loads alongside old session data', () => {
    const storage = new Map([
        ['inventoryState', JSON.stringify({ current: [], original: [], transactions: [], devBypass: true })],
        ['exportedInvoicesLog', JSON.stringify([{ id: 1, customerName: 'Legacy' }])]
    ]);
    const h = harness('main.js', storage);
    assert.equal(h.run('exportedInvoicesLog[0].customerName'), 'Legacy');
    assert.equal(h.run('devBypassMode'), true);
});

test('restoring negative stock shows its warning without breaking initialization', () => {
    const h = harness(); h.run(seed + 'productDatabase[0].stock = -1; saveStateToStorage();');
    const restored = harness('main.js', h.storage);
    assert.equal(restored.el('negative-stock-list').children.length, 1);
    assert.equal(restored.el('negative-stock-modal').classList.contains('hidden'), false);
    assert.ok(restored.el('cart-body').innerHTML.includes('Giỏ hàng đang trống'));
});

test('HTML IDs are unique and all literal app references resolve', () => {
    for (const file of ['index.html', 'tong-hop.html']) {
        const html = fs.readFileSync(file, 'utf8');
        const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
        assert.equal(ids.length, new Set(ids).size, `${file}: duplicate IDs`);
        const script = file === 'index.html' ? fs.readFileSync('main.js', 'utf8') : html;
        for (const match of script.matchAll(/getElementById\('([^']+)'\)/g)) {
            assert.ok(ids.includes(match[1]), `${file}: missing ${match[1]}`);
        }
    }
});

test('quantity inputs commit on change and render imported HTML as plain text', () => {
    const h = harness(); h.run(seed);
    h.run(`currentCart[0].name = '<img src=x onerror=alert(1)>'; renderCart();`);
    const html = h.el('cart-body').children.at(-1).innerHTML;
    assert.ok(html.includes('&lt;img'));
    assert.ok(!html.includes('onkeyup='));
    assert.ok(!html.includes('<img'));
    h.run(`handleQuantityInput(0,'Infinity')`);
    assert.equal(h.run('currentCart[0].quantity'), 4);
});

test('summary reader preserves absolute I/J/K/M/N positions even when used range starts at I2', () => {
    const h = harness('tong-hop.html');
    const rows = h.state(`manualReadSheet({'!ref':'I2:N2',I2:{v:'P'},J2:{v:'Bag'},K2:{v:4},M2:{v:500},N2:{v:'ID'}})`);
    assert.equal(rows[1][8], 'P'); assert.equal(rows[1][10], 4);
    assert.equal(rows[1][12], 500); assert.equal(rows[1][13], 'ID');
    assert.equal(rows[0][8], null);
});

test('summary import blocks overlapping reads and recovers after file errors', () => {
    const h = harness('tong-hop.html');
    h.run(`handleFileSelection({target:{files:[{name:'first.xlsx'}],value:''}})`);
    assert.equal(h.el('report-file-input').disabled, true);
    h.run(`handleFileSelection({target:{files:[{name:'second.xlsx'}],value:''}})`);
    assert.equal(h.readers.length, 1);
    h.readers[0].onerror();
    h.timers.shift()();
    assert.equal(h.run('isProcessing'), false);
    assert.equal(h.el('report-file-input').disabled, false);
    assert.equal(h.run('processedFilesCount'), 1);
});

test('summary aggregation keeps mapped columns and handles special product IDs', () => {
    const h = harness('tong-hop.html');
    h.context.XLSX.read = () => ({ SheetNames: ['S'], Sheets: { S: { '!ref': 'I2:N2', I2: { v: 'P' }, J2: { v: 'Bag' }, K2: { v: 4 }, M2: { v: 500 }, N2: { v: '__proto__' } } } });
    h.run(`handleFileSelection({target:{files:[{name:'report.xlsx'}],value:''}})`);
    h.readers[0].onload({ target: { result: new ArrayBuffer(0) } });
    h.timers.shift()();
    assert.equal(h.run('totalAccumulatedRevenue'), 500);
    assert.equal(h.run('productAggregates["__proto__"].quantity'), 4);
    assert.equal(h.el('export-master-btn').disabled, false);
    assert.equal(h.run('masterRows[0][13]'), '__proto__');
});
