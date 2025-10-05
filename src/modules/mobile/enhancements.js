import { onDocumentReady } from '../utils/dom.js';

function adjustTouchTargets() {
  const touchTargets = document.querySelectorAll('button, a, input, select');
  touchTargets.forEach(target => {
    const rect = target.getBoundingClientRect();
    if (rect.width < 48 || rect.height < 48) {
      target.style.minHeight = '48px';
      target.style.minWidth = '48px';
    }
  });
}

function setupSmoothScroll() {
  const smoothScrollLinks = document.querySelectorAll("a[href^='#']");
  smoothScrollLinks.forEach(link => {
    link.addEventListener('click', event => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function setupFocusIndicators() {
  const focusable = document.querySelectorAll('button, a, input, select, textarea');
  focusable.forEach(element => {
    element.addEventListener('focus', () => {
      element.style.outline = '3px solid #2563eb';
      element.style.outlineOffset = '2px';
    });
    element.addEventListener('blur', () => {
      element.style.outline = '';
      element.style.outlineOffset = '';
    });
  });
}

function preventDoubleTapZoom() {
  let lastTouchEnd = 0;
  document.addEventListener('touchend', event => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
}

function enhanceForms() {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', () => {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        if (!submitBtn.dataset.originalText) {
          submitBtn.dataset.originalText = submitBtn.textContent || '';
        }
        submitBtn.textContent = 'Submitting...';
      }
    });
  });
}

function lazyLoadImages() {
  if (!('IntersectionObserver' in window)) return;
  const images = document.querySelectorAll('img[loading="lazy"]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
        }
        observer.unobserve(img);
      }
    });
  });
  images.forEach(img => observer.observe(img));
}

export function initMobileEnhancements() {
  onDocumentReady(() => {
    adjustTouchTargets();
    setupSmoothScroll();
    setupFocusIndicators();
    preventDoubleTapZoom();
    enhanceForms();
    lazyLoadImages();

    window.addEventListener('resize', adjustTouchTargets);
    window.addEventListener('orientationchange', () => {
      window.setTimeout(adjustTouchTargets, 120);
    });
  });
}

