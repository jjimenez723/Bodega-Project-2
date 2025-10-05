import { onDocumentReady } from '../utils/dom.js';

export function initGalleryLightbox() {
  onDocumentReady(() => {
    const heroTitle = document.querySelector('.hero-text h1');
    const heroSubtitle = document.querySelector('.hero-text p');
    if (heroTitle && heroSubtitle) {
      heroTitle.style.opacity = '0';
      heroTitle.style.transform = 'translateY(8px)';
      heroSubtitle.style.opacity = '0';
      heroSubtitle.style.transform = 'translateY(8px)';
      window.setTimeout(() => {
        heroTitle.style.transition = 'opacity 1s cubic-bezier(0.4,0.2,0.2,1), transform 1s cubic-bezier(0.4,0.2,0.2,1)';
        heroTitle.style.opacity = '1';
        heroTitle.style.transform = 'translateY(0)';
      }, 200);
      window.setTimeout(() => {
        heroSubtitle.style.transition = 'opacity 1s cubic-bezier(0.4,0.2,0.2,1), transform 1s cubic-bezier(0.4,0.2,0.2,1)';
        heroSubtitle.style.opacity = '1';
        heroSubtitle.style.transform = 'translateY(0)';
      }, 500);
    }

    if (typeof ScrollReveal === 'function') {
      const sr = ScrollReveal();
      sr.reveal('.gallery-section h2', {
        distance: '30px',
        duration: 900,
        easing: 'ease-out',
        origin: 'top',
        delay: 200
      });
      sr.reveal('.gallery-thumb', {
        distance: '20px',
        duration: 700,
        easing: 'ease-out',
        origin: 'bottom',
        interval: 80
      });
    }

    const galleryThumbs = document.querySelectorAll('.gallery-grid img');
    const lightbox = document.querySelector('.lightbox');
    const lightboxImg = document.querySelector('.lightbox img');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');

    if (!galleryThumbs.length || !lightbox || !lightboxImg || !closeBtn || !prevBtn || !nextBtn) return;

    const images = Array.from(galleryThumbs).map(img => img.src);
    let currentIndex = 0;

    const showLightbox = index => {
      currentIndex = index;
      lightboxImg.src = images[index];
      lightbox.style.display = 'flex';
    };

    const closeLightbox = () => {
      lightbox.style.display = 'none';
      lightboxImg.src = '';
    };

    const showPrev = () => {
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      lightboxImg.src = images[currentIndex];
    };

    const showNext = () => {
      currentIndex = (currentIndex + 1) % images.length;
      lightboxImg.src = images[currentIndex];
    };

    galleryThumbs.forEach((img, index) => {
      img.addEventListener('click', () => showLightbox(index));
    });

    closeBtn.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click', showPrev);
    nextBtn.addEventListener('click', showNext);

    lightbox.addEventListener('click', event => {
      if (event.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', event => {
      if (lightbox.style.display !== 'flex') return;
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') showPrev();
      if (event.key === 'ArrowRight') showNext();
    });
  });
}


