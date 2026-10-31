const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function worker() {
    const handlers = {};
    const deleted = [];
    const written = [];
    let stored;
    const cache = {
        addAll: async requests => written.push(...requests),
        match: async () => stored,
        put: async (request, response) => { stored = response; }
    };
    const context = vm.createContext({
        URL, Response, Request,
        self: { registration: { scope: 'https://example.test/shop/' }, addEventListener: (name, callback) => { handlers[name] = callback; } },
        caches: {
            open: async () => cache,
            keys: async () => ['invoice-app-%2Fshop%2F-old', vm.runInContext('CACHE_NAME', context), 'invoice-app-%2Fother%2F-old', 'another-app-v1', 'invoice-app-v4'],
            delete: async name => deleted.push(name)
        },
        fetch: async () => new Response('latest')
    });
    vm.runInContext(fs.readFileSync('service-worker.js', 'utf8'), context);
    return { handlers, context, cache, deleted, written };
}

test('worker installs app shell including compiled CSS and only removes its own old caches', async () => {
    const w = worker();
    let pending;
    w.handlers.install({ waitUntil: promise => { pending = promise; } }); await pending;
    assert.ok(w.written.some(request => request.url === 'https://example.test/shop/src/output.css'));
    assert.ok(w.written.some(request => request.url === 'https://example.test/shop/ui.js'));
    assert.ok(w.written.some(request => request.url === 'https://example.test/shop/pwa.js'));
    assert.ok(w.written.every(request => request.cache === 'reload'));
    w.handlers.activate({ waitUntil: promise => { pending = promise; } }); await pending;
    assert.deepEqual(w.deleted, ['invoice-app-%2Fshop%2F-old']);
});

test('worker leaves external resources, unrelated routes, and POST requests alone', () => {
    const w = worker();
    for (const request of [
        { method: 'GET', url: 'https://worldtimeapi.org/api/timezone/Asia/Ho_Chi_Minh' },
        { method: 'GET', url: 'https://example.test/other/main.js' },
        { method: 'POST', url: 'https://example.test/shop/main.js' }
    ]) w.handlers.fetch({ request, respondWith() { assert.fail('Request should bypass worker'); } });
});

test('worker prefers current assets, falls back offline, and tolerates cache write failures', async () => {
    const w = worker();
    const request = { method: 'GET', url: 'https://example.test/shop/main.js' };
    let pending;
    const respondWith = promise => { pending = promise; };
    w.handlers.fetch({ request, respondWith });
    assert.equal(await (await pending).text(), 'latest');
    w.context.fetch = async () => { throw new Error('offline'); };
    w.handlers.fetch({ request, respondWith });
    assert.equal(await (await pending).text(), 'latest');
    w.context.fetch = async () => new Response('newer');
    w.cache.put = async () => { throw new Error('quota'); };
    w.handlers.fetch({ request, respondWith });
    assert.equal(await (await pending).text(), 'newer');
});

test('asset requests revalidate the HTTP cache and query strings share the offline fallback', async () => {
    const w = worker();
    let pending;
    let storedKey;
    w.context.fetch = async (request, options) => {
        assert.equal(options.cache, 'no-cache');
        return new Response('current page');
    };
    w.cache.put = async key => { storedKey = key; };
    const request = { method: 'GET', url: 'https://example.test/shop/?source=installed' };
    w.handlers.fetch({ request, respondWith: promise => { pending = promise; } });
    assert.equal(await (await pending).text(), 'current page');
    assert.equal(storedKey, 'https://example.test/shop/');
    w.context.fetch = async () => { throw new Error('offline'); };
    w.cache.match = async key => {
        assert.equal(key, storedKey);
        return new Response('cached page');
    };
    w.handlers.fetch({ request, respondWith: promise => { pending = promise; } });
    assert.equal(await (await pending).text(), 'cached page');
});

test('failed deployments retain cached assets; offline cache misses return an error response', async () => {
    const w = worker();
    let pending;
    const event = { request: { method: 'GET', url: 'https://example.test/shop/main.js' }, respondWith: promise => { pending = promise; } };
    w.cache.match = async () => new Response('previous release');
    w.context.fetch = async () => new Response('unavailable', { status: 503 });
    w.handlers.fetch(event);
    assert.equal(await (await pending).text(), 'previous release');
    w.cache.match = async () => undefined;
    w.context.fetch = async () => { throw new Error('offline'); };
    w.handlers.fetch(event);
    assert.equal((await pending).type, 'error');
});
