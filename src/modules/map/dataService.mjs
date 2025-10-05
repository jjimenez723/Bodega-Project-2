const cache = new Map();

export async function loadGeoJson(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error('Failed to load ' + url + ': ' + response.status + ' ' + response.statusText);
  }
  const data = await response.json();
  cache.set(url, data);
  return data;
}

export function toHeatmapPoints(features, intensity = 0.5) {
  return features
    .map(feature => {
      const coordinates = feature?.geometry?.coordinates;
      if (!coordinates) return null;
      const [lon, lat] = coordinates;
      return [lat, lon, intensity];
    })
    .filter(Boolean);
}