import { onDocumentReady, prefersReducedMotion } from "../utils/dom.js";

export function initCarousel({
  containerId,
  trackSelector = ".carousel-track",
  prevSelector = ".carousel-btn.prev",
  nextSelector = ".carousel-btn.next",
  swipeThreshold = 50,
  autoPlay = false,
  intervalMs = 4000,
  pauseOnHover = true,
} = {}) {
  // Initialize the carousel once the DOM is ready.
  onDocumentReady(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const track = container.querySelector(trackSelector);
    const prevButton = container.querySelector(prevSelector);
    const nextButton = container.querySelector(nextSelector);
    const slides = track ? Array.from(track.children) : [];

    // Exit if the track or slides are missing.
    if (!track || slides.length === 0) return;

    const isMarquee =
      container.classList.contains("carousel--marquee") ||
      container.dataset.carousel === "marquee";

    if (isMarquee) {
      if (track.dataset.marqueeReady === "true") return;
      track.dataset.marqueeReady = "true";

      const clones = slides.map((slide) => {
        const clone = slide.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        clone.tabIndex = -1;
        return clone;
      });

      clones.forEach((clone) => track.appendChild(clone));

      const duration = Math.max(slides.length * 8, 90);
      track.style.setProperty("--marquee-duration", `${duration}s`);
      return;
    }

    let currentIndex = 0;
    let isAnimating = false;
    let autoTimer = null;

    const applyTransition = (animate) => {
      if (prefersReducedMotion() || !animate) {
        track.style.transition = "none";
        return;
      }
      track.style.transition = "";
    };

    const setSlide = (index, { animate = true } = {}) => {
      if (!track) return;
      currentIndex = (index + slides.length) % slides.length;
      applyTransition(animate);
      track.style.transform = "translateX(-" + currentIndex * 100 + "%)";

      if (!animate && !prefersReducedMotion()) {
        window.requestAnimationFrame(() => {
          track.style.transition = "";
        });
      }
    };

    const showNext = () => {
      if (isAnimating) return;
      isAnimating = true;
      const isWrapping = currentIndex === slides.length - 1;
      setSlide(isWrapping ? 0 : currentIndex + 1, { animate: !isWrapping });
      window.setTimeout(() => {
        isAnimating = false;
      }, 400);
    };

    const showPrev = () => {
      if (isAnimating) return;
      isAnimating = true;
      const isWrapping = currentIndex === 0;
      setSlide(isWrapping ? slides.length - 1 : currentIndex - 1, {
        animate: !isWrapping,
      });
      window.setTimeout(() => {
        isAnimating = false;
      }, 400);
    };

    // Bind arrow controls.
    prevButton?.addEventListener("click", showPrev);
    nextButton?.addEventListener("click", showNext);

    let startX = null;
    let startY = null;

    const onTouchStart = (event) => {
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const onTouchMove = (event) => {
      if (startX === null || startY === null) return;
      const touch = event.touches[0];
      const diffX = Math.abs(touch.clientX - startX);
      const diffY = Math.abs(touch.clientY - startY);
      // Prevent vertical scrolling when horizontal swipe is detected.
      if (diffX > diffY && diffX > 10) {
        event.preventDefault();
      }
    };

    const onTouchEnd = (event) => {
      if (startX === null) return;
      const touch = event.changedTouches[0];
      const diffX = touch.clientX - startX;
      if (Math.abs(diffX) > swipeThreshold) {
        if (diffX > 0) {
          showPrev();
        } else {
          showNext();
        }
      }
      startX = null;
      startY = null;
    };

    // Handle swipe gestures.
    track.addEventListener("touchstart", onTouchStart, { passive: true });
    track.addEventListener("touchmove", onTouchMove, { passive: false });
    track.addEventListener("touchend", onTouchEnd, { passive: true });

    const syncPosition = () => setSlide(currentIndex, { animate: false });
    window.addEventListener("orientationchange", () =>
      window.setTimeout(syncPosition, 120),
    );
    window.addEventListener("resize", syncPosition);

    const stopAuto = () => {
      if (!autoTimer) return;
      window.clearInterval(autoTimer);
      autoTimer = null;
    };

    const startAuto = () => {
      if (!autoPlay || prefersReducedMotion()) return;
      stopAuto();
      autoTimer = window.setInterval(showNext, intervalMs);
    };

    if (pauseOnHover) {
      container.addEventListener("mouseenter", stopAuto);
      container.addEventListener("mouseleave", startAuto);
      container.addEventListener("focusin", stopAuto);
      container.addEventListener("focusout", startAuto);
    }

    setSlide(0, { animate: false });
    startAuto();
  });
}
