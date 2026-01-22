import { onDocumentReady } from "../utils/dom.js";

export function initOffcanvasNav({
  toggleId = "navToggle",
  panelId = "mobileNav",
  overlayId = "navOverlay",
} = {}) {
  // Wire up the offcanvas nav once the DOM is ready.
  onDocumentReady(() => {
    // Grab the key elements used to open/close the panel.
    const toggle = document.getElementById(toggleId);
    const panel = document.getElementById(panelId);
    const overlay = document.getElementById(overlayId);

    // Exit early when expected markup is missing.
    if (!toggle || !panel || !overlay) return;

    const focusSelector = "a, button, input, select, textarea";
    let focusable = [];
    let isOpen = false;

    const open = () => {
      // Skip if already open.
      if (isOpen) return;
      panel.classList.add("is-open");
      overlay.classList.add("is-open");
      overlay.hidden = false;
      toggle.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      focusable = Array.from(panel.querySelectorAll(focusSelector));
      focusable[0]?.focus();
      document.body.style.overflow = "hidden";
      isOpen = true;
    };

    const close = () => {
      // Skip if already closed.
      if (!isOpen) return;
      panel.classList.remove("is-open");
      overlay.classList.remove("is-open");
      toggle.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
      document.body.style.overflow = "";
      // Match the overlay transition before hiding it.
      window.setTimeout(() => {
        overlay.hidden = true;
      }, 350);
      isOpen = false;
    };

    // Toggle the panel from the hamburger button.
    toggle.addEventListener("click", () => {
      isOpen ? close() : open();
    });

    // Close when the overlay is clicked.
    overlay.addEventListener("click", close);

    // Close after selecting a nav link.
    panel.addEventListener("click", (event) => {
      if (event.target instanceof HTMLElement && event.target.tagName === "A") {
        close();
      }
    });

    // Trap focus and handle escape key while open.
    document.addEventListener("keydown", (event) => {
      if (!isOpen) return;

      if (event.key === "Escape") {
        close();
        return;
      }

      if (event.key === "Tab") {
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
