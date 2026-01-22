export function onDocumentReady(callback) {
  // Run callback after DOM is ready, even if already loaded.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback, { once: true });
  } else {
    callback();
  }
}

export function prefersReducedMotion() {
  // Read OS-level motion preference for animations.
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
