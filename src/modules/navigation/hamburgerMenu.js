import { onDocumentReady } from "../utils/dom.js";

export function initHamburgerMenu({
  buttonSelector = "#hamburger-menu, .hamburger",
  menuSelector = "nav .menu",
  closeBreakpoint = 900,
} = {}) {
  // Enable the legacy hamburger menu for larger breakpoints.
  onDocumentReady(() => {
    const button = document.querySelector(buttonSelector);
    const menu = document.querySelector(menuSelector);

    // Exit when required elements are missing.
    if (!button || !menu) return;

    let isOpen = false;

    const openMenu = () => {
      // Skip if already open.
      if (isOpen) return;
      button.classList.add("active");
      menu.classList.add("open");
      button.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      isOpen = true;
    };

    const closeMenu = () => {
      // Skip if already closed.
      if (!isOpen) return;
      button.classList.remove("active");
      menu.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      isOpen = false;
    };

    const toggleMenu = () => {
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    };

    // Toggle when the button is clicked.
    button.addEventListener("click", (event) => {
      event.preventDefault();
      toggleMenu();
    });

    // Close when a nav link is selected on small screens.
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < closeBreakpoint) {
          closeMenu();
        }
      });
    });

    // Close when clicking outside the menu.
    document.addEventListener("click", (event) => {
      if (!isOpen) return;
      if (button.contains(event.target)) return;
      if (menu.contains(event.target)) return;
      closeMenu();
    });

    // Reset when crossing the breakpoint.
    window.addEventListener("resize", () => {
      if (window.innerWidth >= closeBreakpoint) {
        closeMenu();
      }
    });
  });
}
