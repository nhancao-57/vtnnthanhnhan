const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function clockHarness() {
    let elapsed = 0;
    const elements = new Map();
    const requests = [];
    const timeouts = new Map();
    const events = {};
    let timerId = 0;
    let nonce = 0;
    // Any accidental device-wall-clock read fails the test immediately.
    class UntrustedDeviceDate extends Date {
        constructor(...args) {
            if (!args.length) throw new Error('Device clock must not be read');
            super(...args);
        }
        static now() { throw new Error('Device clock must not be read'); }
    }
    const document = {
        visibilityState: 'visible',
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, { value: '', textContent: '', dataset: {}, addEventListener: (type, fn) => { events[`${id}:${type}`] = fn; } });
            return elements.get(id);
        },
        addEventListener: (type, fn) => { events[type] = fn; }
    };
    const context = vm.createContext({
        Date: UntrustedDeviceDate, Intl, AbortController,
        performance: { now: () => elapsed },
        crypto: { randomUUID: () => `nonce-${++nonce}` },
        setTimeout: fn => { timeouts.set(++timerId, fn); return timerId; },
        clearTimeout: id => timeouts.delete(id), setInterval() {},
        document, window: { addEventListener: (type, fn) => { events[type] = fn; } },
        fetch: async (url, options) => {
            requests.push({ url, options });
            return { ok: true, json: async () => ({ timeZone: 'Asia/Ho_Chi_Minh', dateTime: '2026-10-25T23:59:59.0001234' }) };
        }
    });
    vm.runInContext(fs.readFileSync('vietnam-time.js', 'utf8'), context);
    return {
        context, requests, events, timeouts, el: document.getElementById,
        run: code => vm.runInContext(code, context),
        advance: ms => { elapsed += ms; }
    };
}

test('internet Vietnam date and clock work without reading the device clock', async () => {
    const h = clockHarness();
    const verified = await h.run('VietnamTime.sync({force:true})');
    assert.equal(verified.toISOString(), '2026-10-25T16:59:59.000Z');
    assert.equal(h.el('invoice-date').value, '2026-10-25');
    assert.equal(h.el('invoice-date').readOnly, true);
    assert.equal(h.el('time-sync-status').dataset.state, 'verified');
    assert.equal(h.requests[0].options.cache, 'no-store');
    assert.equal(h.requests[0].options.credentials, 'omit');
    assert.equal(h.timeouts.size, 0);
});

test('Vietnam midnight rolls over using elapsed time, independently of device date and timezone', async () => {
    const h = clockHarness(); await h.run('VietnamTime.sync()');
    h.advance(2000);
    h.run('VietnamTime.render()');
    assert.equal(h.el('invoice-date').value, '2026-10-26');
    assert.equal(h.el('current-time-display').textContent, '00:00:01');
    h.el('invoice-date').value = '1999-01-01';
    h.run('VietnamTime.render()');
    assert.equal(h.el('invoice-date').value, '2026-10-26');
});

test('forced checks bypass recent verification; concurrent requests share the current network check', async () => {
    const h = clockHarness();
    await h.run('Promise.all([VietnamTime.sync({force:true}), VietnamTime.sync({force:true})])');
    assert.equal(h.requests.length, 1);
    await h.run('VietnamTime.sync()');
    assert.equal(h.requests.length, 1);
    await h.run('VietnamTime.sync({force:true})');
    assert.equal(h.requests.length, 2);
    assert.notEqual(h.requests[0].url, h.requests[1].url);
});

for (const badPayload of [
    { timeZone: 'UTC', dateTime: '2026-10-25T12:00:00' },
    { timeZone: 'Asia/Ho_Chi_Minh', dateTime: '2026-02-30T12:00:00' },
    { timeZone: 'Asia/Ho_Chi_Minh', dateTime: '2026-10-25T24:00:00' },
    { timeZone: 'Asia/Ho_Chi_Minh', dateTime: 'invalid' }
]) {
    test(`invalid primary response falls back: ${badPayload.dateTime} (${badPayload.timeZone})`, async () => {
        const h = clockHarness();
        let count = 0;
        h.context.fetch = async () => ({ ok: true, json: async () => ++count === 1 ? badPayload : { timezone: 'Asia/Ho_Chi_Minh', datetime: '2026-10-26T00:00:01.125+07:00' } });
        await h.run('VietnamTime.sync({force:true})');
        assert.equal(count, 2);
        assert.equal(h.el('invoice-date').value, '2026-10-26');
        assert.ok(h.el('time-sync-status').textContent.includes('WorldTimeAPI'));
    });
}

test('failed fresh verification clears previously verified date instead of using a cached or device date', async () => {
    const h = clockHarness(); await h.run('VietnamTime.sync()');
    h.context.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(h.run('VietnamTime.sync({force:true})'));
    assert.equal(h.run('VietnamTime.now()'), null);
    assert.equal(h.el('invoice-date').value, '');
    assert.equal(h.el('current-time-display').textContent, '--:--:--');
    assert.equal(h.el('time-sync-status').dataset.state, 'error');
    assert.equal(h.el('time-sync-retry').disabled, false);
});

test('old samples expire and background/sleep transitions invalidate the displayed date', async () => {
    const h = clockHarness();
    h.run('VietnamTime.start()'); await h.run('VietnamTime.sync()');
    h.advance(120001);
    h.run('VietnamTime.render()');
    assert.equal(h.el('invoice-date').value, '');
    await h.run('VietnamTime.sync({force:true})');
    h.context.document.visibilityState = 'hidden'; h.events.visibilitychange();
    assert.equal(h.run('VietnamTime.now()'), null);
    h.context.document.visibilityState = 'visible'; h.events.visibilitychange();
    await h.run('VietnamTime.sync()');
    assert.equal(h.el('invoice-date').value, '2026-10-25');
});

test('a resumed page retries when an earlier request was invalidated while pending', async () => {
    const h = clockHarness();
    let completeFirst;
    let calls = 0;
    const response = { ok: true, json: async () => ({ timeZone: 'Asia/Ho_Chi_Minh', dateTime: '2026-10-26T08:00:00' }) };
    h.context.fetch = async () => ++calls === 1 ? new Promise(resolve => { completeFirst = resolve; }) : response;
    h.run('VietnamTime.start()');
    h.context.document.visibilityState = 'hidden'; h.events.visibilitychange();
    h.context.document.visibilityState = 'visible'; h.events.visibilitychange();
    completeFirst(response);
    await h.run('VietnamTime.sync()');
    assert.equal(calls, 2);
    assert.equal(h.el('invoice-date').value, '2026-10-26');
});

test('unverified report/backup filenames never use a device date', async () => {
    const h = clockHarness();
    assert.equal(h.run('VietnamTime.fileDate()'), 'ChuaXacMinhNgay');
    await h.run('VietnamTime.sync()');
    assert.equal(h.run('VietnamTime.fileDate()'), '2026-10-25');
    h.advance(120001);
    assert.equal(h.run('VietnamTime.fileDate()'), 'ChuaXacMinhNgay');
});

test('hung requests time out and release the retry button after both providers fail', async () => {
    const h = clockHarness();
    let calls = 0;
    h.context.fetch = (url, { signal }) => {
        calls++;
        return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('timeout'))));
    };
    const pending = h.run('VietnamTime.sync({force:true})');
    const rejected = assert.rejects(pending);
    [...h.timeouts.values()][0]();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls, 2);
    [...h.timeouts.values()][0]();
    await rejected;
    assert.equal(h.timeouts.size, 0);
    assert.equal(h.el('time-sync-retry').disabled, false);
    assert.equal(h.el('invoice-date').value, '');
});
