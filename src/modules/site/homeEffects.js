import { onDocumentReady } from '../utils/dom.js';

export function initHomeEffects() {
  onDocumentReady(() => {
    if (typeof particlesJS === 'function') {
      particlesJS('particles-js', {
        particles: {
          number: {
            value: 80,
            density: {
              enable: true,
              value_area: 800
            }
          },
          color: { value: '#ffffff' },
          shape: { type: 'circle' },
          opacity: { value: 0.3, random: false },
          size: { value: 3, random: true },
          line_linked: {
            enable: true,
            distance: 150,
            color: '#ffffff',
            opacity: 0.2,
            width: 1
          },
          move: {
            enable: true,
            speed: 2,
            direction: 'none',
            random: false,
            straight: false,
            out_mode: 'out',
            bounce: false
          }
        },
        interactivity: {
          detect_on: 'canvas',
          events: {
            onhover: { enable: true, mode: 'repulse' },
            onclick: { enable: true, mode: 'push' },
            resize: true
          }
        },
        retina_detect: true
      });
    }

    if (typeof ScrollReveal === 'function') {
      const sr = ScrollReveal();
      sr.reveal('.story', {
        distance: '50px',
        duration: 1000,
        easing: 'ease-out',
        origin: 'bottom',
        delay: 200
      });
      sr.reveal('.story h2', {
        distance: '30px',
        duration: 800,
        easing: 'ease-out',
        origin: 'top',
        delay: 400
      });
      sr.reveal('.story h3', {
        distance: '30px',
        duration: 800,
        easing: 'ease-out',
        origin: 'left',
        delay: 200
      });
      sr.reveal('.story p', {
        distance: '20px',
        duration: 600,
        easing: 'ease-out',
        origin: 'bottom',
        delay: 100,
        interval: 100
      });
      sr.reveal('.story-tagline', {
        distance: '30px',
        duration: 800,
        easing: 'ease-out',
        origin: 'bottom',
        delay: 600
      });
      sr.reveal('.content-section', {
        distance: '50px',
        duration: 800,
        easing: 'ease-out',
        origin: 'bottom',
        interval: 100
      });
      sr.reveal('.team-card', {
        distance: '30px',
        duration: 600,
        easing: 'ease-out',
        origin: 'bottom',
        delay: 200,
        interval: 150
      });
    }
  });
}

