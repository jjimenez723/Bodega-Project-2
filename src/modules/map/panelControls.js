import { onDocumentReady } from '../utils/dom.js';

function safeInvalidateMap() {
  if (window.map && typeof window.map.invalidateSize === 'function') {
    window.setTimeout(() => window.map.invalidateSize(), 120);
  }
}

export function initMapPanelControls() {
  onDocumentReady(() => {
    const controlPanel = document.getElementById('control-panel');
    if (!controlPanel) return;

    const compactBtn = document.getElementById('compactPanelBtn');
    const minimizeBtn = document.getElementById('minimizePanelBtn');
    const restoreBtn = document.getElementById('restorePanelBtn');
    const showPanelBtn = document.getElementById('showPanelBtn');

    let wasCompact = false;
    let updateAxis = () => {};

    if (compactBtn) {
      compactBtn.addEventListener('click', () => {
        if (controlPanel.classList.contains('collapsed')) return;
        controlPanel.classList.toggle('compact');
        const icon = compactBtn.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-expand-alt', controlPanel.classList.contains('compact'));
          icon.classList.toggle('fa-compress-alt', !controlPanel.classList.contains('compact'));
        }
        safeInvalidateMap();
        if (!controlPanel.classList.contains('collapsed')) {
          window.requestAnimationFrame(updateAxis);
        }
      });
    }

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        if (controlPanel.classList.contains('collapsed')) return;
        wasCompact = controlPanel.classList.contains('compact');
        controlPanel.classList.add('collapsed');
        controlPanel.classList.remove('compact');
        safeInvalidateMap();
      });
    }

    if (restoreBtn) {
      restoreBtn.addEventListener('click', () => {
        controlPanel.classList.remove('collapsed');
        if (wasCompact) controlPanel.classList.add('compact');
        safeInvalidateMap();
        window.requestAnimationFrame(updateAxis);
      });
    }

    if (showPanelBtn) {
      showPanelBtn.addEventListener('click', () => {
        controlPanel.classList.remove('collapsed');
        if (wasCompact) controlPanel.classList.add('compact');
        safeInvalidateMap();
        window.requestAnimationFrame(updateAxis);
      });
    }

    const updateShowButton = () => {
      if (!showPanelBtn) return;
      showPanelBtn.style.display = controlPanel.classList.contains('collapsed') ? 'block' : 'none';
    };

    updateShowButton();

    const observer = new MutationObserver(() => {
      updateShowButton();
      if (!controlPanel.classList.contains('collapsed')) {
        window.requestAnimationFrame(updateAxis);
      }
    });
    observer.observe(controlPanel, { attributes: true, attributeFilter: ['class'] });

    const resizer = document.getElementById('panel-resizer');
    const container = document.getElementById('main-flex-container');
    if (!resizer || !container) return;

    const mediaQuery = window.matchMedia('(max-width: 700px)');
    const panelMin = { width: 240, height: 160 };
    const mapMin = { width: 320, height: 260 };

    let lastDesktopWidth = controlPanel.getBoundingClientRect().width || 340;
    let lastMobileHeight = Math.max(
      panelMin.height,
      Math.min(controlPanel.getBoundingClientRect().height || panelMin.height, window.innerHeight * 0.45)
    );
    let rafToken = null;
    let activePointer = null;
    let dragAxis = resizer.dataset.axis === 'y' ? 'y' : 'x';
    let startSize = 0;
    let startPointer = 0;

    const queueInvalidate = () => {
      if (rafToken) return;
      rafToken = window.requestAnimationFrame(() => {
        rafToken = null;
        safeInvalidateMap();
      });
    };

    const panelMaxWidth = () => {
      const available = container.getBoundingClientRect().width || window.innerWidth;
      const limit = available - mapMin.width;
      return limit > panelMin.width ? limit : panelMin.width;
    };

    const panelMaxHeight = () => {
      const available = container.getBoundingClientRect().height || window.innerHeight;
      const limit = available - mapMin.height;
      return limit > panelMin.height ? limit : panelMin.height;
    };

    const applyDesktopWidth = (value) => {
      const constrained = Math.min(Math.max(value, panelMin.width), panelMaxWidth());
      controlPanel.style.width = `${constrained}px`;
      lastDesktopWidth = constrained;
    };

    const applyMobileHeight = (value) => {
      const maxHeight = panelMaxHeight();
      const constrained = Math.min(Math.max(value, panelMin.height), maxHeight);
      controlPanel.style.height = `${constrained}px`;
      controlPanel.style.flexBasis = `${constrained}px`;
      lastMobileHeight = constrained;
    };

    const clearDesktopSizing = () => {
      controlPanel.style.removeProperty('width');
    };

    const clearMobileSizing = () => {
      controlPanel.style.removeProperty('height');
      controlPanel.style.removeProperty('flex-basis');
    };

    updateAxis = () => {
      if (controlPanel.classList.contains('collapsed')) return;
      const isMobileLayout = mediaQuery.matches;
      if (isMobileLayout) {
        lastDesktopWidth = controlPanel.getBoundingClientRect().width || lastDesktopWidth;
        dragAxis = 'y';
        clearDesktopSizing();
        const maxHeight = panelMaxHeight();
        lastMobileHeight = Math.min(Math.max(lastMobileHeight, panelMin.height), maxHeight);
        applyMobileHeight(lastMobileHeight);
        resizer.dataset.axis = 'y';
        resizer.setAttribute('aria-orientation', 'horizontal');
        resizer.setAttribute('aria-label', 'Resize map control panel height');
      } else {
        lastMobileHeight = controlPanel.getBoundingClientRect().height || lastMobileHeight;
        dragAxis = 'x';
        clearMobileSizing();
        const maxWidth = panelMaxWidth();
        lastDesktopWidth = Math.min(Math.max(lastDesktopWidth, panelMin.width), maxWidth);
        applyDesktopWidth(lastDesktopWidth);
        resizer.dataset.axis = 'x';
        resizer.setAttribute('aria-orientation', 'vertical');
        resizer.setAttribute('aria-label', 'Resize map control panel width');
      }
      queueInvalidate();
    };

    const stopDragging = () => {
      if (activePointer === null) return;
      try {
        resizer.releasePointerCapture(activePointer);
      } catch (_) {
        /* no-op */
      }
      activePointer = null;
      resizer.classList.remove('active');
      controlPanel.classList.remove('no-transition');
      document.body.classList.remove('panel-resizing-x', 'panel-resizing-y');
      queueInvalidate();
    };

    const handlePointerMove = (event) => {
      if (activePointer === null) return;
      if (dragAxis === 'x') {
        const delta = event.clientX - startPointer;
        applyDesktopWidth(startSize + delta);
      } else {
        const delta = event.clientY - startPointer;
        applyMobileHeight(startSize + delta);
      }
      queueInvalidate();
    };

    resizer.addEventListener('pointerdown', (event) => {
      if (controlPanel.classList.contains('collapsed')) return;
      dragAxis = resizer.dataset.axis === 'y' ? 'y' : 'x';
      activePointer = event.pointerId;
      startSize = dragAxis === 'x'
        ? controlPanel.getBoundingClientRect().width
        : controlPanel.getBoundingClientRect().height;
      startPointer = dragAxis === 'x' ? event.clientX : event.clientY;
      controlPanel.classList.add('no-transition');
      resizer.classList.add('active');
      document.body.classList.add(dragAxis === 'x' ? 'panel-resizing-x' : 'panel-resizing-y');
      try {
        resizer.setPointerCapture(activePointer);
      } catch (_) {
        /* pointer capture may fail */
      }
      event.preventDefault();
    });

    resizer.addEventListener('pointermove', handlePointerMove);
    resizer.addEventListener('pointerup', (event) => {
      handlePointerMove(event);
      stopDragging();
    });
    resizer.addEventListener('pointercancel', stopDragging);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('blur', stopDragging);

    const keyboardStep = 24;
    resizer.addEventListener('keydown', (event) => {
      if (controlPanel.classList.contains('collapsed')) return;
      const axis = resizer.dataset.axis === 'y' ? 'y' : 'x';
      if (axis === 'x' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        const delta = event.key === 'ArrowLeft' ? -keyboardStep : keyboardStep;
        applyDesktopWidth(lastDesktopWidth + delta);
        queueInvalidate();
      } else if (axis === 'y' && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        const delta = event.key === 'ArrowUp' ? -keyboardStep : keyboardStep;
        applyMobileHeight(lastMobileHeight + delta);
        queueInvalidate();
      }
    });

    const handleResize = () => {
      if (controlPanel.classList.contains('collapsed')) return;
      if (mediaQuery.matches) {
        applyMobileHeight(lastMobileHeight);
      } else {
        applyDesktopWidth(lastDesktopWidth);
      }
      queueInvalidate();
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateAxis);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(updateAxis);
    }

    window.addEventListener('resize', handleResize, { passive: true });

    updateAxis();

    controlPanel.addEventListener('transitionend', (event) => {
      if ((event.propertyName === 'width' || event.propertyName === 'height') && !controlPanel.classList.contains('collapsed')) {
        queueInvalidate();
      }
    });
  });
}
