import { initOffcanvasNav } from "../modules/navigation/offcanvasNav.js";
import { initMobileEnhancements } from "../modules/mobile/enhancements.js";
import { initKpiBuilder } from "../modules/site/kpiBuilder.js";

// Initialize shared navigation and mobile helpers.
initOffcanvasNav();
initMobileEnhancements();

// Start the KPI builder table and UI controls.
initKpiBuilder();
