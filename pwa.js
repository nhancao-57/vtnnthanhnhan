// Update checks never reload a page: carts and report imports may exist only in memory.
(() => {
    if (!window.isSecureContext || !('serviceWorker' in navigator)) return;

    async function register() {
        try {
            const registration = await navigator.serviceWorker.register('./service-worker.js', {
                scope: './', updateViaCache: 'none'
            });
            let checking = false;
            const check = async () => {
                if (checking || document.visibilityState !== 'visible' || navigator.onLine === false) return;
                checking = true;
                try { await registration.update(); }
                catch { /* Offline or a failed deployment must not interrupt work. */ }
                finally { checking = false; }
            };
            document.addEventListener('visibilitychange', check);
            window.addEventListener('online', check);
            window.addEventListener('pageshow', check);
            setInterval(check, 60 * 60 * 1000);
            await check();
        } catch (error) {
            console.warn('Không thể đăng ký cập nhật ứng dụng:', error);
        }
    }

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
})();
