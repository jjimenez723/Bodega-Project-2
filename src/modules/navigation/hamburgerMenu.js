import { onDocumentReady } from '../utils/dom.js';

export function initHamburgerMenu({
  buttonSelector = '#hamburger-menu, .hamburger',
  menuSelector = 'nav .menu',
  closeBreakpoint = 900
} = {}) {
  onDocumentReady(() => {
    const button = document.querySelector(buttonSelector);
    const menu = document.querySelector(menuSelector);

    if (!button || !menu) return;

    let isOpen = false;

    const openMenu = () => {
      if (isOpen) return;
      button.classList.add('active');
      menu.classList.add('open');
      button.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      isOpen = true;
    };

    const closeMenu = () => {
      if (!isOpen) return;
      button.classList.remove('active');
      menu.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      isOpen = false;
    };

    const toggleMenu = () => {
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    };

    button.addEventListener('click', (event) => {
      event.preventDefault();
      toggleMenu();
    });

    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth < closeBreakpoint) {
          closeMenu();
        }
      });
    });

    document.addEventListener('click', (event) => {
      if (!isOpen) return;
      if (button.contains(event.target)) return;
      if (menu.contains(event.target)) return;
      closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= closeBreakpoint) {
        closeMenu();
      }
    });
  });
}

