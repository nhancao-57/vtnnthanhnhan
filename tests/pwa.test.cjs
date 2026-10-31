const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function app({ secure = true, supported = true, readyState = 'complete', fails = false } = {}) {
    const events = {};
    const intervals = [];
    const registrations = [];
    let updates = 0;
    const registration = { update: async () => { updates++; } };
    const context = vm.createContext({
        window: {
            isSecureContext: secure,
            addEventListener: (name, fn) => { events[name] = fn; },
            location: { reload() { assert.fail('Updates must never reload an active sale'); } }
        },
        document: { readyState, visibilityState: 'visible', addEventListener: (name, fn) => { events[name] = fn; } },
        navigator: {
            onLine: true,
            ...(supported ? { serviceWorker: { register: async (...args) => {
                registrations.push(args);
                if (fails) throw new Error('registration failed');
                return registration;
            } } } : {})
        },
        setInterval: (fn, ms) => intervals.push({ fn, ms }),
        console: { warn() {} }
    });
    vm.runInContext(fs.readFileSync('pwa.js', 'utf8'), context);
    return { context, events, intervals, registrations, registration, updates: () => updates };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('both pages register a scope-relative worker without cached update scripts', async () => {
    const h = app(); await settle();
    const [url, options] = h.registrations[0];
    assert.equal(url, './service-worker.js');
    assert.equal(options.scope, './');
    assert.equal(options.updateViaCache, 'none');
    assert.equal(h.updates(), 1);
    assert.equal(h.intervals[0].ms, 3600000);
    for (const page of ['index.html', 'tong-hop.html']) {
        assert.match(fs.readFileSync(page, 'utf8'), /<script src="\.\/pwa\.js"><\/script>/);
    }
});

test('checks run on resume, online, pageshow and hourly, while background/offline work is skipped', async () => {
    const h = app(); await settle();
    h.context.document.visibilityState = 'hidden';
    await h.events.visibilitychange();
    assert.equal(h.updates(), 1);
    h.context.document.visibilityState = 'visible';
    await h.events.visibilitychange();
    h.context.navigator.onLine = false;
    await h.intervals[0].fn();
    assert.equal(h.updates(), 2);
    h.context.navigator.onLine = true;
    await h.events.online();
    await h.events.pageshow();
    await h.intervals[0].fn();
    assert.equal(h.updates(), 5);
});

test('concurrent checks are coalesced and failures allow a later retry', async () => {
    const h = app(); await settle();
    let rejectCheck;
    let calls = 0;
    h.registration.update = () => { calls++; return new Promise((resolve, reject) => { rejectCheck = reject; }); };
    const pending = h.events.online();
    await h.events.pageshow();
    assert.equal(calls, 1);
    rejectCheck(new Error('offline')); await pending;
    h.registration.update = async () => { calls++; };
    await h.events.online();
    assert.equal(calls, 2);
});

test('registration waits for load and handles unsupported/insecure browsers and rejection', async () => {
    const h = app({ readyState: 'loading' });
    assert.equal(h.registrations.length, 0);
    await h.events.load();
    assert.equal(h.registrations.length, 1);
    assert.equal(app({ secure: false }).registrations.length, 0);
    assert.equal(app({ supported: false }).registrations.length, 0);
    const rejected = app({ fails: true }); await settle();
    assert.equal(rejected.intervals.length, 0);
});

test('manifest launches and resolves icons inside a subdirectory installation', () => {
    const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    const base = 'https://example.test/shop/manifest.json';
    assert.equal(new URL(manifest.start_url, base).href, 'https://example.test/shop/');
    assert.equal(new URL(manifest.scope, base).href, 'https://example.test/shop/');
    for (const icon of manifest.icons) {
        assert.ok(new URL(icon.src, base).pathname.startsWith('/shop/images/'));
        assert.ok(fs.existsSync(icon.src));
    }
});
