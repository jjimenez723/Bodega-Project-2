import { onDocumentReady } from '../utils/dom.js';
import { loadGeoJson, toHeatmapPoints } from './dataService.mjs';
import { withBasePath } from '../utils/paths.js';

const DATA_URLS = {
  produce: withBasePath('data/fixed_fresh_food.geojson'),
  fastFood: withBasePath('data/fast_food.geojson'),
  boundary: withBasePath('data/newark_boundary_corrected.geojson')
};

const DEFAULT_HEAT_INTENSITY = 1;
const DEFAULT_HEAT_RADIUS = 60;

const NEWARK_BOUNDARY_BOX = Object.freeze({
  southWest: [40.6737966266808, -74.2513883524854],
  northEast: [40.7882755927157, -74.1140973062534]
});
const MAP_MAX_BOUNDS_PADDING = 0.03;
const MAP_FIT_BOUNDS_PADDING = 0.015;

function createCustomIcon(className, iconHtml) {
  return L.divIcon({
    html: iconHtml,
    className,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

function buildProducePopup(feature) {
  const coordinates = feature?.geometry?.coordinates;
  if (!coordinates) return "";
  const lon = coordinates[0];
  const lat = coordinates[1];
  const props = feature.properties ?? {};
  let html = "<strong>" + (props.name || "Fresh Food Location") + "</strong><br>Type: " + (props.type || "Fresh Food");
  if (props.description) html += "<br>" + props.description;
  if (props.distance_rutgers_1) html += "<br>" + props.distance_rutgers_1;
  if (props.distance_rutgers_2) html += "<br>" + props.distance_rutgers_2;
  if (props.source) html += "<br><small>Source: " + props.source + "</small>";
  html += "<br><a href='https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lon + "' target='_blank'>Directions</a>";
  return html;
}

function buildFastFoodPopup(feature) {
  const coordinates = feature?.geometry?.coordinates;
  if (!coordinates) return "";
  const lon = coordinates[0];
  const lat = coordinates[1];
  const props = feature.properties ?? {};
  const name = props.name || "Fast Food";
  const type = props.type || "Fast Food";
  return "<strong>" + name + "</strong><br>" + type + "<br><a href='https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lon + "' target='_blank'>Directions</a>";
}

function setHeatmapCanvasOpacity(intensity) {
  const canvases = document.querySelectorAll('#map div.leaflet-overlay-pane > canvas');
  canvases.forEach(canvas => {
    canvas.style.opacity = intensity;
  });
}

function populateCluster(cluster, features, icon, popupBuilder) {
  cluster.clearLayers();
  features.forEach(feature => {
    const coordinates = feature?.geometry?.coordinates;
    if (!coordinates) return;
    const lon = coordinates[0];
    const lat = coordinates[1];
    if (typeof lat !== "number" || typeof lon !== "number") return;
    const marker = L.marker([lat, lon], { icon }).bindPopup(popupBuilder(feature));
    cluster.addLayer(marker);
  });
}

export function initMapPage() {
  onDocumentReady(async () => {
    if (typeof L === 'undefined') return;

    if (L.HeatLayer && typeof L.HeatLayer.prototype._initCanvas === 'function' && !L.HeatLayer.prototype._willReadFrequentlyPatched) {
      const baseInitCanvas = L.HeatLayer.prototype._initCanvas;
      L.HeatLayer.prototype._initCanvas = function () {
        baseInitCanvas.call(this);
        if (this._canvas && this._canvas.getContext) {
          const ctx = this._canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) this._ctx = ctx;
        }
      };
      const baseRedraw = L.HeatLayer.prototype.redraw;
      const baseInternalRedraw = L.HeatLayer.prototype._redraw;
      const baseReset = L.HeatLayer.prototype._reset;
      L.HeatLayer.prototype.redraw = function () {
        if (!this._map || !this._map._panes) {
          this._frame = null;
          return this;
        }
        return baseRedraw.call(this);
      };
      L.HeatLayer.prototype._redraw = function () {
        if (!this._map || !this._map._panes) {
          this._frame = null;
          return;
        }
        baseInternalRedraw.call(this);
      };
      L.HeatLayer.prototype._reset = function () {
        if (!this._map || !this._map._panes) return;
        baseReset.call(this);
      };
      L.HeatLayer.prototype._willReadFrequentlyPatched = true;
    }

    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    const newarkBounds = L.latLngBounds(
      NEWARK_BOUNDARY_BOX.southWest,
      NEWARK_BOUNDARY_BOX.northEast
    );
    const paddedMaxBounds = newarkBounds.pad(MAP_MAX_BOUNDS_PADDING);
    const defaultFitBounds = newarkBounds.pad(MAP_FIT_BOUNDS_PADDING);

    const map = L.map('map', {
      maxZoom: 18,
      center: newarkBounds.getCenter(),
      zoom: 13,
      minZoom: 12,
      maxBounds: paddedMaxBounds,
      maxBoundsViscosity: 1,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      bounceAtZoomLimits: false
    });

    map.fitBounds(defaultFitBounds);
    const minZoomForBounds = map.getBoundsZoom(paddedMaxBounds, false);
    map.setMinZoom(minZoomForBounds);
    map.setMaxBounds(paddedMaxBounds);
    window.map = map;

    const baseLayers = {
      standard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }),
      gray: L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenMapTiles & Stadia Maps'
      })
    };

    baseLayers.standard.addTo(map);

    const state = {
      showHeatmap: true,
      showBorder: true,
      showLegend: true,
      heatSettings: { radius: DEFAULT_HEAT_RADIUS, intensity: DEFAULT_HEAT_INTENSITY },
      produce: {
        raw: [],
        heatData: [],
        heat: null,
        cluster: L.markerClusterGroup({ chunkedLoading: true }),
        icon: null
      },
      fastFood: {
        raw: [],
        heatData: [],
        heat: null,
        cluster: L.markerClusterGroup({ chunkedLoading: true }),
        icon: null
      },
      overlays: {
        boundary: null,
        boundaryGhost: null,
        radiusCircle: null
      }
    };

    try {
      const [produceData, fastFoodData, boundaryData] = await Promise.all([
        loadGeoJson(DATA_URLS.produce),
        loadGeoJson(DATA_URLS.fastFood),
        loadGeoJson(DATA_URLS.boundary)
      ]);

      state.produce.raw = produceData.features ?? [];
      state.fastFood.raw = fastFoodData.features ?? [];

      state.produce.icon = createCustomIcon('custom-div-icon', "<i class='fas fa-apple-alt fresh-food-icon' style='font-size:24px;'></i>");
      state.fastFood.icon = createCustomIcon('custom-div-icon', "<i class='fas fa-hamburger fast-food-icon' style='font-size:24px;'></i>");

      populateCluster(state.produce.cluster, state.produce.raw, state.produce.icon, buildProducePopup);
      populateCluster(state.fastFood.cluster, state.fastFood.raw, state.fastFood.icon, buildFastFoodPopup);

      state.produce.heatData = toHeatmapPoints(state.produce.raw, DEFAULT_HEAT_INTENSITY);
      state.fastFood.heatData = toHeatmapPoints(state.fastFood.raw, DEFAULT_HEAT_INTENSITY);

      state.produce.heat = L.heatLayer(state.produce.heatData, { radius: state.heatSettings.radius, gradient: { 0.4: 'blue', 1: 'cyan' } }).addTo(map);
      state.fastFood.heat = L.heatLayer(state.fastFood.heatData, { radius: state.heatSettings.radius, gradient: { 0.4: 'red', 1: 'orange' } }).addTo(map);

      const boundaryFeature = boundaryData.features?.find(feature => {
        const name = feature?.properties?.NAME;
        return name && name.toLowerCase() === 'newark';
      });

      if (boundaryFeature) {
        state.overlays.boundary = L.geoJSON(boundaryFeature, {
          style: {
            color: '#008000',
            weight: 4,
            fillColor: '#008000',
            fillOpacity: 0.04
          }
        }).addTo(map);

        state.overlays.boundaryGhost = L.geoJSON(boundaryFeature, {
          style: { opacity: 0, fillOpacity: 0 },
          interactive: false
        }).addTo(map);

        const boundaryBounds = state.overlays.boundary.getBounds();
        const paddedBoundaryBounds = boundaryBounds.pad(MAP_MAX_BOUNDS_PADDING);
        map.fitBounds(boundaryBounds.pad(MAP_FIT_BOUNDS_PADDING));
        map.setMaxBounds(paddedBoundaryBounds);
        const minZoomForBoundary = map.getBoundsZoom(paddedBoundaryBounds, false);
        map.setMinZoom(minZoomForBoundary);
      }

      const heatmapControls = setupHeatmapControls(map, state);
      const legendControls = setupLegend(map, state);
      const layerControls = setupLayerToggles(map, state, heatmapControls, legendControls);
      setupAccessibilityToggle(map, state, baseLayers, heatmapControls);
      setupFilterControls(map, state, layerControls, heatmapControls);
      setupExportControls(map, state, layerControls, heatmapControls, legendControls);
    } catch (error) {
      console.error('Failed to initialize map', error);
    }
  });
}

function setupHeatmapControls(map, state) {
  const intensitySlider = document.getElementById('intensitySlider');
  const sizeSlider = document.getElementById('sizeSlider');

  const setSliderToMax = (slider, fallback) => {
    if (!slider) return fallback;
    const { max } = slider;
    if (!max) return fallback;
    slider.value = max;
    const numericMax = parseFloat(max);
    return Number.isNaN(numericMax) ? fallback : numericMax;
  };

  const apply = () => {
    if (!state.showHeatmap) return;
    const radiusValue = sizeSlider ? parseInt(sizeSlider.value || `${DEFAULT_HEAT_RADIUS}`, 10) : DEFAULT_HEAT_RADIUS;
    const intensityValue = intensitySlider ? parseFloat(intensitySlider.value || `${DEFAULT_HEAT_INTENSITY}`) : DEFAULT_HEAT_INTENSITY;
    const radius = Number.isNaN(radiusValue) ? DEFAULT_HEAT_RADIUS : radiusValue;
    const intensity = Number.isNaN(intensityValue) ? DEFAULT_HEAT_INTENSITY : intensityValue;

    state.heatSettings.radius = radius;
    state.heatSettings.intensity = intensity;

    const updateHeatLayer = (layer, data) => {
      if (!layer) return;
      layer.options.radius = radius;
      if (layer._map) {
        layer.setOptions({ radius });
        layer.setLatLngs(data);
      }
    };

    updateHeatLayer(state.produce.heat, state.produce.heatData);
    updateHeatLayer(state.fastFood.heat, state.fastFood.heatData);

    setHeatmapCanvasOpacity(intensity);
  };

  const initialIntensity = setSliderToMax(intensitySlider, DEFAULT_HEAT_INTENSITY);
  const initialRadius = setSliderToMax(sizeSlider, DEFAULT_HEAT_RADIUS);

  state.heatSettings.intensity = initialIntensity;
  state.heatSettings.radius = initialRadius;

  apply();

  if (intensitySlider) intensitySlider.addEventListener('input', apply);
  if (sizeSlider) sizeSlider.addEventListener('input', apply);

  map.on('layeradd layerremove zoomend moveend', () => {
    if (state.showHeatmap) apply();
  });

  window.setTimeout(apply, 200);

  return { refresh: apply };
}

function setupLayerToggles(map, state, heatmapControls, legendControls) {
  const produceToggle = document.getElementById('produceToggle');
  const fastfoodToggle = document.getElementById('fastfoodToggle');
  const layerModeBtn = document.getElementById('layerModeBtn');
  const legendToggleBtn = document.getElementById('legendToggleBtn');

  const isActive = toggle => !toggle || toggle.classList.contains('active');

  const updateProduce = () => {
    const active = isActive(produceToggle);
    if (!active) {
      if (state.produce.heat) map.removeLayer(state.produce.heat);
      map.removeLayer(state.produce.cluster);
      return;
    }
    if (state.showHeatmap) {
      if (state.produce.heat && !map.hasLayer(state.produce.heat)) map.addLayer(state.produce.heat);
      if (map.hasLayer(state.produce.cluster)) map.removeLayer(state.produce.cluster);
    } else {
      if (state.produce.heat && map.hasLayer(state.produce.heat)) map.removeLayer(state.produce.heat);
      if (!map.hasLayer(state.produce.cluster)) map.addLayer(state.produce.cluster);
    }
  };

  const updateFastFood = () => {
    const active = isActive(fastfoodToggle);
    if (!active) {
      if (state.fastFood.heat) map.removeLayer(state.fastFood.heat);
      map.removeLayer(state.fastFood.cluster);
      return;
    }
    if (state.showHeatmap) {
      if (state.fastFood.heat && !map.hasLayer(state.fastFood.heat)) map.addLayer(state.fastFood.heat);
      if (map.hasLayer(state.fastFood.cluster)) map.removeLayer(state.fastFood.cluster);
    } else {
      if (state.fastFood.heat && map.hasLayer(state.fastFood.heat)) map.removeLayer(state.fastFood.heat);
      if (!map.hasLayer(state.fastFood.cluster)) map.addLayer(state.fastFood.cluster);
    }
  };

  const refreshLegendToggle = () => {
    if (legendToggleBtn) {
      legendToggleBtn.textContent = state.showLegend ? 'Hide Map Legend' : 'Show Map Legend';
      legendToggleBtn.setAttribute('aria-pressed', state.showLegend ? 'true' : 'false');
    }
    if (legendControls && typeof legendControls.applyVisibility === 'function') {
      legendControls.applyVisibility();
    }
  };

  const refresh = () => {
    if (layerModeBtn) {
      layerModeBtn.textContent = state.showHeatmap ? 'Switch to Cluster View' : 'Switch to Heatmap View';
    }
    updateProduce();
    updateFastFood();
    refreshLegendToggle();
    if (state.showHeatmap) heatmapControls.refresh();
  };

  if (produceToggle) {
    produceToggle.addEventListener('click', () => {
      produceToggle.classList.toggle('active');
      refresh();
    });
  }

  if (fastfoodToggle) {
    fastfoodToggle.addEventListener('click', () => {
      fastfoodToggle.classList.toggle('active');
      refresh();
    });
  }

  if (legendToggleBtn) {
    legendToggleBtn.addEventListener('click', () => {
      state.showLegend = !state.showLegend;
      refreshLegendToggle();
    });
  }

  if (layerModeBtn) {
    layerModeBtn.addEventListener('click', () => {
      state.showHeatmap = !state.showHeatmap;
      refresh();
    });
  }

  refresh();

  return { refresh };
}


function setupLegend(map, state) {
  let legendElement = null;
  const legendControl = L.control({ position: 'bottomleft' });
  legendControl.onAdd = () => {
    legendElement = L.DomUtil.create('div', 'map-legend');
    legendElement.innerHTML = "" +
      "<div><i class='fas fa-apple-alt fresh-food-icon' style='font-size: 16px; margin-right: 6px;'></i> Fresh Food</div>" +
      "<div><i class='fas fa-hamburger fast-food-icon' style='font-size: 16px; margin-right: 6px;'></i> Fast Food</div>" +
      "<div><span class='legend-line' style='border-color:#008000'></span> Newark</div>" +
      "<div><span class='legend-circle'></span> Filter</div>" +
      "<div><span class='legend-cluster'></span> Clusters</div>";
    legendElement.setAttribute('role', 'group');
    legendElement.setAttribute('aria-label', 'Map legend');
    legendElement.setAttribute('aria-hidden', state.showLegend ? 'false' : 'true');
    return legendElement;
  };
  legendControl.addTo(map);

  const applyVisibility = () => {
    if (!legendElement) return;
    legendElement.classList.toggle('is-hidden', !state.showLegend);
    legendElement.setAttribute('aria-hidden', String(!state.showLegend));
  };

  applyVisibility();

  return {
    applyVisibility,
    get element() {
      return legendElement;
    }
  };
}

function setupAccessibilityToggle(map, state, baseLayers, heatmapControls) {
  const accessToggle = document.getElementById('accessToggle');
  if (!accessToggle) return;

  const applyGradient = (layer, gradient) => {
    if (!layer) return;
    layer.options.gradient = gradient;
    if (layer._map) layer.setOptions({ gradient });
  };

  accessToggle.addEventListener('change', event => {
    if (event.target.checked) {
      map.removeLayer(baseLayers.standard);
      baseLayers.gray.addTo(map);
      applyGradient(state.produce.heat, { 0.4: '#00429d', 1: '#73a2c6' });
      applyGradient(state.fastFood.heat, { 0.4: '#b10026', 1: '#f4a582' });
    } else {
      map.removeLayer(baseLayers.gray);
      baseLayers.standard.addTo(map);
      applyGradient(state.produce.heat, { 0.4: 'blue', 1: 'cyan' });
      applyGradient(state.fastFood.heat, { 0.4: 'red', 1: 'orange' });
    }
    if (state.showHeatmap) heatmapControls.refresh();
  });
}

function setupFilterControls(map, state, layerControls, heatmapControls) {
  const addressInput = document.getElementById('addressInput');
  const latInput = document.getElementById('latInput');
  const lngInput = document.getElementById('lngInput');
  const radiusInput = document.getElementById('radiusInput');
  const centerFilterBtn = document.getElementById('centerFilterBtn');
  const filterBtn = document.getElementById('filterBtn');
  const addressField = document.getElementById('address');
  const radiusField = document.getElementById('radius');

  const applyFilter = (center, radiusKm) => {
    if (!center || Number.isNaN(radiusKm)) return;

    if (state.overlays.radiusCircle) {
      map.removeLayer(state.overlays.radiusCircle);
    }
    state.overlays.radiusCircle = L.circle(center, { radius: radiusKm * 1000, color: '#333', dashArray: '4' }).addTo(map);

    const withinBounds = (lat, lon) => {
      if (!state.overlays.boundaryGhost) return true;
      const matches = leafletPip.pointInLayer([lon, lat], state.overlays.boundaryGhost) || [];
      return matches.length > 0;
    };

    const filterFeatures = features => features.filter(feature => {
      const coordinates = feature?.geometry?.coordinates;
      if (!coordinates) return false;
      const lon = coordinates[0];
      const lat = coordinates[1];
      if (typeof lat !== "number" || typeof lon !== "number") return false;
      const insideRadius = center.distanceTo([lat, lon]) <= radiusKm * 1000;
      return insideRadius && withinBounds(lat, lon);
    });

    const produceFiltered = filterFeatures(state.produce.raw);
    const fastFoodFiltered = filterFeatures(state.fastFood.raw);

    populateCluster(state.produce.cluster, produceFiltered, state.produce.icon, buildProducePopup);
    populateCluster(state.fastFood.cluster, fastFoodFiltered, state.fastFood.icon, buildFastFoodPopup);

    state.produce.heatData = toHeatmapPoints(produceFiltered, DEFAULT_HEAT_INTENSITY);
    state.fastFood.heatData = toHeatmapPoints(fastFoodFiltered, DEFAULT_HEAT_INTENSITY);

    if (state.showHeatmap) heatmapControls.refresh();
    layerControls.refresh();
  };

  const geocode = async query => {
    const response = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(query));
    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('Address not found.');
    }
    const lat = parseFloat(results[0].lat);
    const lon = parseFloat(results[0].lon);
    return L.latLng(lat, lon);
  };

  if (centerFilterBtn) {
    centerFilterBtn.addEventListener('click', async () => {
      try {
        let center = null;
        if (latInput && latInput.value && lngInput && lngInput.value) {
          center = L.latLng(parseFloat(latInput.value), parseFloat(lngInput.value));
        } else if (addressInput && addressInput.value) {
          center = await geocode(addressInput.value);
        }
        if (!center) {
          alert('Enter an address or latitude/longitude.');
          return;
        }
        map.setView(center, 14);
        const radiusKm = parseFloat((radiusInput && radiusInput.value) || '0');
        applyFilter(center, radiusKm);
      } catch (error) {
        alert(error.message);
      }
    });
  }

  if (filterBtn) {
    filterBtn.addEventListener('click', async () => {
      try {
        if (!addressField || !addressField.value) {
          alert('Enter an address.');
          return;
        }
        const center = await geocode(addressField.value);
        map.setView(center, 14);
        const radiusKm = parseFloat((radiusField && radiusField.value) || '0');
        applyFilter(center, radiusKm);
      } catch (error) {
        alert(error.message);
      }
    });
  }
}

function setupExportControls(map, state, layerControls, heatmapControls, legendControls) {
  const controlPanel = document.getElementById('control-panel');
  const exportImgBtn = document.getElementById('exportImgBtn');
  const exportSpinner = document.getElementById('exportSpinner');
  const printBtn = document.getElementById('printBtn');
  const shareLinkBtn = document.getElementById('shareLinkBtn');
  const borderToggleBtn = document.getElementById('borderToggleBtn');

  const toggleBorder = visible => {
    state.showBorder = visible;
    if (!state.overlays.boundary) return;
    if (visible) {
      state.overlays.boundary.addTo(map);
      if (borderToggleBtn) borderToggleBtn.textContent = 'Hide Newark Border';
    } else {
      map.removeLayer(state.overlays.boundary);
      if (borderToggleBtn) borderToggleBtn.textContent = 'Show Newark Border';
    }
  };

  if (borderToggleBtn) {
    borderToggleBtn.addEventListener('click', () => {
      toggleBorder(!state.showBorder);
    });
  }

  if (exportImgBtn) {
    exportImgBtn.addEventListener('click', () => {
      if (!controlPanel) return;
      if (typeof html2canvas === 'undefined') {
        alert('Export library is unavailable.');
        return;
      }

      const previousShowHeatmap = state.showHeatmap;
      const previousBorder = state.showBorder;
      state.showHeatmap = true;
      toggleBorder(false);
      layerControls.refresh();
      heatmapControls.refresh();

      const legendItems = Array.from(document.querySelectorAll('.map-legend div'));
      const hiddenLegendItems = legendItems.filter(div => {
        const text = div.textContent || '';
        return /Filter|Clusters/i.test(text);
      });
      hiddenLegendItems.forEach(div => { div.style.display = 'none'; });

      const wasRadius = state.overlays.radiusCircle && map.hasLayer(state.overlays.radiusCircle);
      const wasGhost = state.overlays.boundaryGhost && map.hasLayer(state.overlays.boundaryGhost);

      if (state.overlays.radiusCircle) map.removeLayer(state.overlays.radiusCircle);
      if (state.overlays.boundaryGhost) map.removeLayer(state.overlays.boundaryGhost);

      controlPanel.classList.add('collapsed');
      exportImgBtn.setAttribute('disabled', 'true');
      if (exportSpinner) exportSpinner.style.display = 'flex';

      const mapContainer = document.getElementById('map');
      const title = document.createElement('div');
      title.textContent = 'Newark Food Access Map';
      title.style.cssText = [
        'position:absolute',
        'top:1.5rem',
        'left:50%',
        'transform:translateX(-50%)',
        'background:rgba(255,255,255,0.95)',
        'padding:8px 16px',
        'border-radius:8px',
        'font-weight:bold',
        'font-size:16px',
        'color:#2563eb',
        'z-index:2002',
        'box-shadow:0 2px 8px rgba(0,0,0,0.1)'
      ].join(';');
      mapContainer.appendChild(title);

      window.setTimeout(() => {
        html2canvas(mapContainer, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          allowTaint: true,
          foreignObjectRendering: false,
          logging: false,
          width: mapContainer.offsetWidth,
          height: mapContainer.offsetHeight
        }).then(canvas => {
          const link = document.createElement('a');
          link.download = 'newark-food-map-export.png';
          link.href = canvas.toDataURL();
          link.click();
        }).catch(error => {
          alert('Export failed: ' + error.message);
        }).finally(() => {
          title.remove();
          hiddenLegendItems.forEach(div => { div.style.display = ''; });
          if (state.overlays.radiusCircle && wasRadius) map.addLayer(state.overlays.radiusCircle);
          if (state.overlays.boundaryGhost && wasGhost) map.addLayer(state.overlays.boundaryGhost);
          toggleBorder(previousBorder);
          state.showHeatmap = previousShowHeatmap;
          layerControls.refresh();
          heatmapControls.refresh();
          if (legendControls && typeof legendControls.applyVisibility === 'function') {
            legendControls.applyVisibility();
          }
          if (exportSpinner) exportSpinner.style.display = 'none';
          exportImgBtn.removeAttribute('disabled');
          controlPanel.classList.remove('collapsed');
        });
      }, 300);
    });
  }

  if (shareLinkBtn) {
    shareLinkBtn.addEventListener('click', () => {
      const url = window.location.href;
      if (navigator.share) {
        navigator.share({ title: document.title, url });
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          alert('Map link copied to clipboard!');
        }).catch(() => {
          prompt('Copy this link:', url);
        });
      } else {
        prompt('Copy this link:', url);
      }
    });
  }

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      const previousShowHeatmap = state.showHeatmap;
      const previousBorder = state.showBorder;
      const previousCenter = map.getCenter();
      const previousZoom = map.getZoom();

      state.showHeatmap = true;
      toggleBorder(true);
      layerControls.refresh();
      heatmapControls.refresh();

      window.setTimeout(() => {
        map.setView([40.7357, -73.413], 13, { animate: false });
        map.invalidateSize();
        document.getElementById('map').scrollIntoView({ behavior: 'instant', block: 'start' });
        window.setTimeout(() => {
          window.print();
          window.setTimeout(() => {
            state.showHeatmap = previousShowHeatmap;
            toggleBorder(previousBorder);
            map.setView(previousCenter, previousZoom, { animate: false });
            layerControls.refresh();
            heatmapControls.refresh();
          }, 800);
        }, 300);
      }, 200);
    });
  }

  toggleBorder(state.showBorder);
}


