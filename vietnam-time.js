// All current business dates originate from HTTPS time responses, never Date.now().
// performance.now() only measures elapsed time between checks; it is not a wall clock.
const VietnamTime = (() => {
    const ZONE = 'Asia/Ho_Chi_Minh';
    const MAX_AGE_MS = 120000;
    const providers = [
        { name: 'TimeAPI.io', url: 'https://timeapi.io/api/Time/current/zone?timeZone=Asia/Ho_Chi_Minh', field: 'dateTime', zone: 'timeZone', unzoned: true },
        { name: 'WorldTimeAPI', url: 'https://worldtimeapi.org/api/timezone/Asia/Ho_Chi_Minh', field: 'datetime', zone: 'timezone', unzoned: false }
    ];
    const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
    const clockFormatter = new Intl.DateTimeFormat('vi-VN', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    let sample = null;
    let pending = null;
    let pendingGeneration = 0;
    let state = 'idle';
    let started = false;
    let generation = 0;

    function dateString(date) {
        const parts = Object.fromEntries(dateFormatter.formatToParts(date).map(part => [part.type, part.value]));
        return `${parts.year}-${parts.month}-${parts.day}`;
    }

    function now() {
        if (!sample) return null;
        const elapsed = performance.now() - sample.receivedAt;
        if (elapsed < 0 || elapsed > MAX_AGE_MS) return null;
        return new Date(sample.epoch + elapsed);
    }

    // Historical reports/backups can still be downloaded offline without inventing a date.
    function fileDate() {
        const date = now();
        return date ? dateString(date) : 'ChuaXacMinhNgay';
    }

    function parseResponse(data, provider) {
        if (data?.[provider.zone] !== ZONE) throw new Error('Unexpected time zone');
        const value = data[provider.field];
        // Explicitly interpret TimeAPI's timezone-less timestamp as UTC+7, not device time.
        const match = typeof value === 'string' && value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.(\d{1,7}))?(\+07:00)?$/);
        if (!match || (!provider.unzoned && !match[4])) throw new Error('Invalid Vietnam timestamp');
        const fraction = (match[3] || '').padEnd(3, '0').slice(0, 3);
        const epoch = Date.parse(`${match[1]}T${match[2]}.${fraction}+07:00`);
        const date = new Date(epoch);
        // Round-trip validation rejects impossible dates and rollover hours (e.g. February 30).
        if (!Number.isFinite(epoch) || dateString(date) !== match[1] || clockFormatter.format(date) !== match[2]) {
            throw new Error('Invalid calendar date');
        }
        return epoch;
    }

    function render() {
        const date = now();
        const label = document.getElementById('time-sync-status');
        const retry = document.getElementById('time-sync-retry');
        const dateInput = document.getElementById('invoice-date');
        if (dateInput) {
            dateInput.readOnly = true;
            dateInput.value = date ? dateString(date) : '';
        }
        if (label) {
            const status = state === 'syncing' ? 'syncing' : date ? 'verified' : state === 'error' ? 'error' : 'waiting';
            label.dataset.state = status;
            const message = status === 'syncing' ? 'Đang xác minh giờ VN…'
                : status === 'verified' ? `Giờ VN đã xác minh · ${sample.source}`
                : status === 'error' ? 'Lỗi giờ Internet · Chưa thể lưu / xuất HĐ mới'
                : 'Cần xác minh giờ trước khi lập HĐ';
            label.title = status === 'verified' ? `Đã xác minh giờ Việt Nam (GMT+7) qua ${sample.source}`
                : status === 'syncing' ? 'Đang xác minh giờ Việt Nam qua Internet'
                : 'Cần xác minh giờ Internet trước khi lưu hoặc xuất hóa đơn mới';
            if (label.textContent !== message) label.textContent = message;
        }
        if (retry) retry.disabled = state === 'syncing';
        const setText = (id, text) => { const element = document.getElementById(id); if (element) element.textContent = text; };
        setText('vietnam-clock-label', 'Giờ Việt Nam (GMT+7)');
        setText('current-time-display', date ? clockFormatter.format(date) : '--:--:--');
        setText('current-date-display', date ? date.toLocaleDateString('vi-VN', { timeZone: ZONE }) : '--/--/----');
        // The optional local display uses the same internet instant, in the user's timezone.
        setText('local-time-display', date ? date.toLocaleTimeString('vi-VN', { hour12: false }) : '--:--:--');
        setText('local-date-display', date ? date.toLocaleDateString('vi-VN') : '--/--/----');
        const quarter = document.getElementById('financial-quarter-display');
        if (quarter) {
            const parts = date ? dateString(date).split('-') : null;
            quarter.textContent = parts ? `Quý ${Math.ceil(Number(parts[1]) / 3)}, ${parts[0]}` : 'Chờ giờ Internet';
        }
    }

    async function requestTime(provider) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
            // A random nonce bypasses intermediary caches without trusting the device's date.
            const separator = provider.url.includes('?') ? '&' : '?';
            const response = await fetch(`${provider.url}${separator}cb=${crypto.randomUUID()}`, {
                cache: 'no-store', credentials: 'omit', signal: controller.signal
            });
            if (!response.ok) throw new Error(`Time service HTTP ${response.status}`);
            const epoch = parseResponse(await response.json(), provider);
            return { epoch, receivedAt: performance.now(), source: provider.name };
        } finally {
            clearTimeout(timeout);
        }
    }

    async function sync({ force = false } = {}) {
        if (pending) {
            if (pendingGeneration === generation) return pending;
            // A request started before sleep/offline must not satisfy a resumed check.
            try { await pending; } catch { /* Retry with the current generation below. */ }
            return sync({ force: true });
        }
        if (!force && now()) { render(); return now(); }
        const requestGeneration = generation;
        pendingGeneration = requestGeneration;
        state = 'syncing';
        render();
        pending = (async () => {
            for (const provider of providers) {
                try {
                    const result = await requestTime(provider);
                    if (requestGeneration !== generation) throw new Error('Time check interrupted');
                    sample = result;
                    state = 'verified';
                    return now();
                } catch (error) {
                    if (requestGeneration !== generation) break;
                }
            }
            sample = null;
            state = 'error';
            throw new Error('Không xác minh được ngày Việt Nam từ Internet. Vui lòng kiểm tra kết nối và thử lại.');
        })();
        try { return await pending; }
        finally { pending = null; render(); }
    }

    function invalidate() {
        generation++;
        sample = null;
        state = 'idle';
        render();
    }

    function start() {
        if (started) return;
        started = true;
        const refresh = () => sync({ force: true }).catch(() => {});
        document.getElementById('time-sync-retry')?.addEventListener('click', refresh);
        document.addEventListener('visibilitychange', () => {
            invalidate();
            if (document.visibilityState === 'visible') refresh();
        });
        window.addEventListener('focus', refresh);
        window.addEventListener('pageshow', event => { if (event.persisted) { invalidate(); refresh(); } });
        window.addEventListener('offline', () => { invalidate(); state = 'error'; render(); });
        window.addEventListener('online', refresh);
        setInterval(render, 1000);
        setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 60000);
        refresh();
    }

    return { now, dateString, fileDate, sync, render, start };
})();
