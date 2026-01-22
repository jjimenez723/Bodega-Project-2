import { initOffcanvasNav } from "../modules/navigation/offcanvasNav.js";
import { initMobileEnhancements } from "../modules/mobile/enhancements.js";
import { initMapPanelControls } from "../modules/map/panelControls.js";
import { initMapPage } from "../modules/map/mapPage.js";

// Initialize shared navigation and mobile helpers.
initOffcanvasNav();
initMobileEnhancements();

// Wire up map panel behavior and map layers.
initMapPanelControls();
initMapPage();
