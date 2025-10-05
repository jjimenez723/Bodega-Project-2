import { initOffcanvasNav } from '../modules/navigation/offcanvasNav.js';
import { initCarousel } from '../modules/carousel/basicCarousel.js';
import { initMobileEnhancements } from '../modules/mobile/enhancements.js';
import { initHomeEffects } from '../modules/site/homeEffects.js';

initOffcanvasNav();
initMobileEnhancements();
initHomeEffects();

initCarousel({ containerId: 'image-carousel' });


