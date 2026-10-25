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
        addAll: async urls => written.push(...urls),
        match: async () => stored,
        put: async (request, response) => { stored = response; }
    };
    const context = vm.createContext({
        URL, Response,
        self: { registration: { scope: 'https://example.test/shop/' }, addEventListener: (name, callback) => { handlers[name] = callback; } },
        caches: {
            open: async () => cache,
            keys: async () => ['invoice-app-v2', 'invoice-app-v3', 'invoice-app-v4', 'another-app-v1'],
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
    assert.ok(w.written.includes('./src/output.css'));
    assert.ok(w.written.includes('./ui.js'));
    w.handlers.activate({ waitUntil: promise => { pending = promise; } }); await pending;
    assert.deepEqual(w.deleted, ['invoice-app-v2', 'invoice-app-v3']);
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
