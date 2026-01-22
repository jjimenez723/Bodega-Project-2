import { initOffcanvasNav } from "../modules/navigation/offcanvasNav.js";
import { initMobileEnhancements } from "../modules/mobile/enhancements.js";
import { initStoryTimeline } from "../modules/site/storyTimeline.js";

// Initialize shared navigation and mobile helpers.
initOffcanvasNav();
initMobileEnhancements();

// Animate the story timeline and markers.
initStoryTimeline();
