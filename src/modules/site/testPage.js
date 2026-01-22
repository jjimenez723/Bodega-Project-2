import { onDocumentReady } from "../utils/dom.js";

export function initTestPage() {
  // Initialize a minimal Leaflet map for export testing.
  onDocumentReady(() => {
    const map = L.map("map").setView([40.7, -74.0], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
      map,
    );

    function exportMap() {
      // Export a snapshot using leaflet-image.
      leafletImage(map, function (canvas) {
        if (!canvas) {
          alert("leaflet-image did not return a map canvas.");
          return;
        }
        document.body.appendChild(canvas);
      });
    }

    // Expose exportMap for the inline button handler.
    window.exportMap = exportMap;
  });
}
