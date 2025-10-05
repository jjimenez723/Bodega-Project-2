import { onDocumentReady } from '../utils/dom.js';

export function initOffcanvasNav({
  toggleId = 'navToggle',
  panelId = 'mobileNav',
  overlayId = 'navOverlay'
} = {}) {
  onDocumentReady(() => {
    const toggle = document.getElementById(toggleId);
    const panel = document.getElementById(panelId);
    const overlay = document.getElementById(overlayId);

    if (!toggle || !panel || !overlay) return;

    const focusSelector = 'a, button, input, select, textarea';
    let focusable = [];
    let isOpen = false;

    const open = () => {
      if (isOpen) return;
      panel.classList.add('is-open');
      overlay.classList.add('is-open');
      overlay.hidden = false;
      toggle.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      focusable = Array.from(panel.querySelectorAll(focusSelector));
      focusable[0]?.focus();
      document.body.style.overflow = 'hidden';
      isOpen = true;
    };

    const close = () => {
      if (!isOpen) return;
      panel.classList.remove('is-open');
      overlay.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
      document.body.style.overflow = '';
      window.setTimeout(() => { overlay.hidden = true; }, 350);
      isOpen = false;
    };

    toggle.addEventListener('click', () => {
      isOpen ? close() : open();
    });

    overlay.addEventListener('click', close);

    panel.addEventListener('click', (event) => {
      if (event.target instanceof HTMLElement && event.target.tagName === 'A') {
        close();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        close();
        return;
      }

      if (event.key === 'Tab') {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  });
}

