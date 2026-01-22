import { initOffcanvasNav } from "../modules/navigation/offcanvasNav.js";
import { initMobileEnhancements } from "../modules/mobile/enhancements.js";
import { initTestPage } from "../modules/site/testPage.js";

// Initialize shared navigation and mobile helpers.
initOffcanvasNav();
initMobileEnhancements();

// Boot the test page map export sample.
initTestPage();
