// Shared presentation and keyboard behavior; no spreadsheet or sales calculations.
document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('body > header');
    if (header && typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(() => {
            document.documentElement.style.setProperty('--app-header-height', `${header.offsetHeight}px`);
        }).observe(header);
    }

    document.querySelectorAll('label[for]').forEach(label => {
        const input = document.getElementById(label.htmlFor);
        if (input?.type !== 'file') return;
        label.tabIndex = 0;
        label.setAttribute('role', 'button');
        label.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (!input.disabled) input.click();
            }
        });
    });
    document.querySelectorAll('button[id^="modal-close-"]').forEach(button => {
        button.setAttribute('aria-label', 'Đóng hộp thoại');
    });

    const menuButton = document.getElementById('header-menu-btn');
    const menuModal = document.getElementById('header-menu-modal');
    const setMenuOpen = open => {
        if (!menuModal) return;
        menuModal.classList.toggle('hidden', !open);
        menuButton?.setAttribute('aria-expanded', String(open));
    };
    menuButton?.addEventListener('click', () => setMenuOpen(true));
    document.getElementById('modal-close-header-menu')?.addEventListener('click', () => setMenuOpen(false));
    menuModal?.addEventListener('click', event => {
        if (event.target === menuModal) setMenuOpen(false);
    });

    let activeModal = null;
    let returnFocus = null;
    const focusable = modal => [...modal.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]'
    )].filter(element => element.getClientRects().length);
    const syncModals = () => {
        const visible = [...document.querySelectorAll('.modal-overlay:not(.hidden)')];
        const modal = visible.at(-1) || null;
        if (modal === activeModal) return;
        if (!activeModal && modal) returnFocus = document.activeElement;
        activeModal = modal;
        document.body.classList.toggle('dialog-open', !!modal);
        if (modal) {
            modal.tabIndex = -1;
            const cancel = modal.querySelector('[id$="cancel-btn"], [id^="modal-close-"], #negative-modal-close');
            (cancel || focusable(modal)[0] || modal).focus();
        } else if (returnFocus?.isConnected) {
            returnFocus.focus();
        }
    };
    new MutationObserver(syncModals).observe(document.body, {
        subtree: true, attributes: true, attributeFilter: ['class']
    });
    document.addEventListener('keydown', event => {
        if (!activeModal) return;
        if (event.key === 'Escape') {
            const cancel = activeModal.querySelector('[id$="cancel-btn"], [id^="modal-close-"], #negative-modal-close');
            if (cancel) { event.preventDefault(); cancel.click(); }
        }
        if (event.key === 'Tab') {
            const elements = focusable(activeModal);
            const first = elements[0] || activeModal;
            const last = elements.at(-1) || activeModal;
            if (!activeModal.contains(document.activeElement) || document.activeElement === activeModal) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus();
            } else if (event.shiftKey && document.activeElement === first) {
                event.preventDefault(); last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault(); first.focus();
            }
        }
    });
    syncModals();
});
