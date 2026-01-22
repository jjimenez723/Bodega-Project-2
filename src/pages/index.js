import { initOffcanvasNav } from "../modules/navigation/offcanvasNav.js";
import { initCarousel } from "../modules/carousel/basicCarousel.js";
import { initMobileEnhancements } from "../modules/mobile/enhancements.js";
import { initHomeEffects } from "../modules/site/homeEffects.js";

// Initialize shared navigation and mobile helpers.
initOffcanvasNav();
initMobileEnhancements();

// Run the home page visual effects.
initHomeEffects();

// Wire up the homepage carousel.
initCarousel({ containerId: "image-carousel" });
