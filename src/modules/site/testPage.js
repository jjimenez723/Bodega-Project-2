import { onDocumentReady } from '../utils/dom.js';

export function initTestPage() {
  onDocumentReady(() => {
    const map = L.map('map').setView([40.7, -74.0], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    function exportMap() {
      leafletImage(map, function(canvas) {
        if (!canvas) {
          alert('leaflet-image did not return a map canvas.');
          return;
        }
        document.body.appendChild(canvas);
      });
    }

    window.exportMap = exportMap;
  });
}