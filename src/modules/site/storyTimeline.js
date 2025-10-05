import { onDocumentReady } from '../utils/dom.js';

export function initStoryTimeline() {
  onDocumentReady(() => {
    const chapters = document.querySelectorAll('.chapter');
    const icons = document.querySelectorAll('.chapter .icon');
    if (chapters.length === 0) return;

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          const index = Array.from(chapters).indexOf(entry.target);
          if (icons[index]) icons[index].classList.add('active');
        }
      });
    }, { rootMargin: '-10% 0px', threshold: 0.15 });

    chapters.forEach(chapter => io.observe(chapter));

    const storyline = document.querySelector('.storyline');
    const firstChapter = chapters[0];
    const mainEl = document.querySelector('main');

    const alignStoryline = () => {
      if (!storyline || !firstChapter || !mainEl) return;
      const offset = firstChapter.offsetTop + firstChapter.offsetHeight / 2 - mainEl.offsetTop;
      storyline.style.top = offset + 'px';
    };

    alignStoryline();
    window.addEventListener('resize', alignStoryline);

    const path = document.querySelector('.storyline path');
    if (!path) return;

    const length = path.getTotalLength();
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);

    const drawPath = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (!mainEl) return;
      const start = mainEl.offsetTop;
      const end = start + mainEl.offsetHeight - window.innerHeight;
      const progressRaw = (scrollTop - start) / (end - start);
      const progress = Math.min(Math.max(progressRaw, 0), 1);
      path.style.strokeDashoffset = String(length * (1 - progress));
    };

    drawPath();
    window.addEventListener('scroll', () => requestAnimationFrame(drawPath), { passive: true });
  });
}

