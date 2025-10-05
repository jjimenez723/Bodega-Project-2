import { onDocumentReady, prefersReducedMotion } from '../utils/dom.js';

export function initCarousel({
  containerId,
  trackSelector = '.carousel-track',
  prevSelector = '.carousel-btn.prev',
  nextSelector = '.carousel-btn.next',
  swipeThreshold = 50
}) {
  onDocumentReady(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const track = container.querySelector(trackSelector);
    const prevButton = container.querySelector(prevSelector);
    const nextButton = container.querySelector(nextSelector);
    const slides = track ? Array.from(track.children) : [];

    if (!track || slides.length === 0) return;

    let currentIndex = 0;
    let isAnimating = false;

    const setSlide = (index) => {
      if (!track) return;
      currentIndex = (index + slides.length) % slides.length;
      track.style.transform = "translateX(-" + currentIndex * 100 + "%)";
      if (prefersReducedMotion()) {
        track.style.transition = 'none';
      }
    };

    const showNext = () => {
      if (isAnimating) return;
      isAnimating = true;
      setSlide(currentIndex + 1);
      window.setTimeout(() => { isAnimating = false; }, 400);
    };

    const showPrev = () => {
      if (isAnimating) return;
      isAnimating = true;
      setSlide(currentIndex - 1);
      window.setTimeout(() => { isAnimating = false; }, 400);
    };

    prevButton?.addEventListener('click', showPrev);
    nextButton?.addEventListener('click', showNext);

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

    track.addEventListener('touchstart', onTouchStart, { passive: true });
    track.addEventListener('touchmove', onTouchMove, { passive: false });
    track.addEventListener('touchend', onTouchEnd, { passive: true });

    const syncPosition = () => setSlide(currentIndex);
    window.addEventListener('orientationchange', () => window.setTimeout(syncPosition, 120));
    window.addEventListener('resize', syncPosition);

    setSlide(0);
  });
}

