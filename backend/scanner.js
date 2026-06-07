const admin = require("firebase-admin");
const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// 1. Inicializar Firebase Admin
const serviceAccount = require("./serviceAccountKey.json");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

// 2. Configuracion base (Newark, NJ)
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const LATITUDE = Number(process.env.SCAN_LATITUDE || 40.7357);
const LONGITUDE = Number(process.env.SCAN_LONGITUDE || -74.1724);
const RADIUS = Number(process.env.SCAN_RADIUS_METERS || 5000);

const GOOGLE_NEARBY_SEARCH_URL =
  "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
const REQUEST_TIMEOUT_MS = Number(process.env.SCAN_REQUEST_TIMEOUT_MS || 15000);
const PAGE_DELAY_MS = Number(process.env.SCAN_PAGE_DELAY_MS || 2000);

// Nearby Search Legacy devuelve hasta 60 resultados por busqueda. Para no
// depender de una sola busqueda saturada, cubrimos el radio con puntos menores.
const USE_COVERAGE_GRID = process.env.SCAN_USE_COVERAGE_GRID !== "false";
const GRID_STEP_METERS = Number(process.env.SCAN_GRID_STEP_METERS || 3000);
const GRID_RADIUS_METERS = Number(
  process.env.SCAN_GRID_RADIUS_METERS ||
    Math.ceil(Math.min(RADIUS, GRID_STEP_METERS * 0.8)),
);

// Tipos oficiales que si se pueden usar como filtro en Nearby Search Legacy.
// "food" se recibe en respuestas, pero no debe usarse como type de busqueda.
const SEARCH_TYPES = [
  { type: "restaurant", hint: "fast" },
  { type: "meal_takeaway", hint: "fast" },
  { type: "meal_delivery", hint: "fast" },
  { type: "cafe", hint: "fast" },
  { type: "bakery", hint: "fast" },
  { type: "bar", hint: "fast" },
  { type: "supermarket", hint: "fresh" },
  { type: "convenience_store", hint: "fresh" },
];

// Keywords complementarias para capturar locales que Google no clasifica bien.
const KEYWORD_SEARCHES = [
  { keyword: "food", hint: "fast" },
  { keyword: "restaurant", hint: "fast" },
  { keyword: "fast food", hint: "fast" },
  { keyword: "takeout", hint: "fast" },
  { keyword: "pizza", hint: "fast" },
  { keyword: "burger", hint: "fast" },
  { keyword: "fried chicken", hint: "fast" },
  { keyword: "wings", hint: "fast" },
  { keyword: "sandwich", hint: "fast" },
  { keyword: "taco", hint: "fast" },
  { keyword: "deli", hint: "fast" },
  { keyword: "cafe", hint: "fast" },
  { keyword: "coffee", hint: "fast" },
  { keyword: "bakery", hint: "fast" },
  { keyword: "donut", hint: "fast" },
  { keyword: "ice cream", hint: "fast" },
  { keyword: "juice", hint: "fast" },
  { keyword: "smoothie", hint: "fast" },
  { keyword: "bodega", hint: "fresh" },
  { keyword: "grocery", hint: "fresh" },
  { keyword: "supermarket", hint: "fresh" },
  { keyword: "market", hint: "fresh" },
  { keyword: "food market", hint: "fresh" },
  { keyword: "produce", hint: "fresh" },
  { keyword: "fruit", hint: "fresh" },
  { keyword: "vegetable", hint: "fresh" },
  { keyword: "farmers market", hint: "fresh" },
  { keyword: "butcher", hint: "fresh" },
  { keyword: "meat market", hint: "fresh" },
  { keyword: "fish market", hint: "fresh" },
  { keyword: "seafood market", hint: "fresh" },
  { keyword: "health food", hint: "fresh" },
];

const FRESH_TYPES = new Set([
  "asian_grocery_store",
  "butcher_shop",
  "convenience_store",
  "discount_supermarket",
  "farmers_market",
  "food_store",
  "general_store",
  "grocery_or_supermarket",
  "grocery_store",
  "health_food_store",
  "hypermarket",
  "market",
  "supermarket",
  "warehouse_store",
]);

const FAST_TYPES = new Set([
  "bakery",
  "bagel_shop",
  "bar",
  "breakfast_restaurant",
  "brunch_restaurant",
  "cafe",
  "coffee_shop",
  "dessert_shop",
  "diner",
  "donut_shop",
  "fast_food_restaurant",
  "food_court",
  "hamburger_restaurant",
  "ice_cream_shop",
  "juice_shop",
  "meal_delivery",
  "meal_takeaway",
  "pizza_restaurant",
  "restaurant",
  "sandwich_shop",
  "snack_bar",
  "tea_house",
]);

const FOOD_RESPONSE_TYPES = new Set([
  "food",
  "point_of_interest",
  "establishment",
  ...FRESH_TYPES,
  ...FAST_TYPES,
]);

const INSTITUTION_TYPES = new Set([
  "airport",
  "church",
  "hospital",
  "lodging",
  "museum",
  "primary_school",
  "school",
  "secondary_school",
  "tourist_attraction",
  "university",
]);

const FRESH_KEYWORDS = [
  "asian grocery",
  "bodega",
  "butcher",
  "carniceria",
  "fish market",
  "food market",
  "food mart",
  "fruit",
  "fruteria",
  "grocery",
  "health food",
  "market",
  "meat market",
  "mini market",
  "produce",
  "seafood market",
  "supermarket",
  "vegetable",
  "verduleria",
];

const FAST_KEYWORDS = [
  "auntie anne",
  "bagel",
  "bakery",
  "burger",
  "burger king",
  "cafe",
  "checkers",
  "chick-fil-a",
  "chipotle",
  "coffee",
  "domino",
  "donut",
  "dunkin",
  "fast food",
  "five guys",
  "fried chicken",
  "grill",
  "hamburger",
  "ice cream",
  "jersey mike",
  "juice",
  "kfc",
  "mcdonald",
  "meal",
  "panda express",
  "pizza",
  "popeyes",
  "qdoba",
  "restaurant",
  "sandwich",
  "shake shack",
  "smoothie",
  "subway",
  "taco",
  "takeout",
  "wendy",
  "white castle",
  "wings",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasKeyword(text, keyword) {
  const normalizedKeyword = normalizeText(keyword);
  const pattern = new RegExp(
    `(^|[^a-z0-9])${escapeRegExp(normalizedKeyword)}([^a-z0-9]|$)`,
    "i",
  );
  return pattern.test(text);
}

function hasAnyKeyword(text, keywords) {
  return keywords.some((keyword) => hasKeyword(text, keyword));
}

function isFastType(type) {
  return FAST_TYPES.has(type) || type.endsWith("_restaurant");
}

function isFoodType(type) {
  return FOOD_RESPONSE_TYPES.has(type) || isFastType(type);
}

function metersToLatitudeDegrees(meters) {
  return meters / 111320;
}

function metersToLongitudeDegrees(meters, latitude) {
  const latitudeRadians = (latitude * Math.PI) / 180;
  return meters / (111320 * Math.cos(latitudeRadians));
}

function generateCoverageCenters() {
  if (!USE_COVERAGE_GRID || RADIUS <= GRID_RADIUS_METERS) {
    return [
      {
        lat: LATITUDE,
        lng: LONGITUDE,
        radius: RADIUS,
        label: "center",
      },
    ];
  }

  const centers = new Map();
  const maxSteps = Math.ceil(RADIUS / GRID_STEP_METERS);

  for (let northStep = -maxSteps; northStep <= maxSteps; northStep++) {
    for (let eastStep = -maxSteps; eastStep <= maxSteps; eastStep++) {
      const northMeters = northStep * GRID_STEP_METERS;
      const eastMeters = eastStep * GRID_STEP_METERS;
      if (Math.hypot(northMeters, eastMeters) > RADIUS) continue;

      const lat = LATITUDE + metersToLatitudeDegrees(northMeters);
      const lng = LONGITUDE + metersToLongitudeDegrees(eastMeters, LATITUDE);
      const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      centers.set(key, {
        lat,
        lng,
        radius: GRID_RADIUS_METERS,
        label: `${northMeters}mN/${eastMeters}mE`,
      });
    }
  }

  return [...centers.values()];
}

function buildSearchRequests() {
  const coverageCenters = generateCoverageCenters();
  const typeRequests = coverageCenters.flatMap((center) =>
    SEARCH_TYPES.map((search) => ({
      ...search,
      ...center,
      label: `${search.type} @ ${center.label}`,
    })),
  );

  const keywordRequests = KEYWORD_SEARCHES.map((search) => ({
    ...search,
    lat: LATITUDE,
    lng: LONGITUDE,
    radius: RADIUS,
    label: `keyword "${search.keyword}"`,
  }));

  return [...typeRequests, ...keywordRequests];
}

async function fetchNearbySearch(search) {
  const results = [];
  let pageToken = null;
  let page = 1;

  while (page <= 3) {
    const params = pageToken
      ? { key: GOOGLE_PLACES_API_KEY, pagetoken: pageToken }
      : {
          key: GOOGLE_PLACES_API_KEY,
          location: `${search.lat},${search.lng}`,
          radius: search.radius,
          type: search.type,
          keyword: search.keyword,
        };

    Object.keys(params).forEach((key) => {
      if (params[key] === undefined) delete params[key];
    });

    if (pageToken) await sleep(PAGE_DELAY_MS);

    let response = await axios.get(GOOGLE_NEARBY_SEARCH_URL, {
      params,
      timeout: REQUEST_TIMEOUT_MS,
    });

    let data = response.data;

    // El token de la siguiente pagina puede tardar un poco en activarse.
    for (let retry = 0; data.status === "INVALID_REQUEST" && pageToken && retry < 3; retry++) {
      await sleep(PAGE_DELAY_MS);
      response = await axios.get(GOOGLE_NEARBY_SEARCH_URL, {
        params,
        timeout: REQUEST_TIMEOUT_MS,
      });
      data = response.data;
    }

    if (data.status === "ZERO_RESULTS") break;
    if (data.status !== "OK") {
      const detail = data.error_message ? `: ${data.error_message}` : "";
      throw new Error(`${data.status}${detail}`);
    }

    results.push(...(data.results || []));

    if (!data.next_page_token) break;
    pageToken = data.next_page_token;
    page++;
  }

  return results;
}

function addOrMergePlace(placesById, place, search) {
  if (!place.place_id) return;

  const existing = placesById.get(place.place_id);
  if (!existing) {
    placesById.set(place.place_id, {
      ...place,
      types: [...new Set(place.types || [])],
      searchHints: [search.hint],
      matchedSearches: [search.label],
    });
    return;
  }

  existing.types = [...new Set([...(existing.types || []), ...(place.types || [])])];
  existing.searchHints = [
    ...new Set([...(existing.searchHints || []), search.hint]),
  ];
  existing.matchedSearches = [
    ...new Set([...(existing.matchedSearches || []), search.label]),
  ];

  // Mantener la version con mas datos cuando Google devuelve campos parciales.
  existing.vicinity = existing.vicinity || place.vicinity;
  existing.rating = existing.rating || place.rating;
  existing.user_ratings_total =
    existing.user_ratings_total || place.user_ratings_total;
  existing.price_level = existing.price_level || place.price_level;
  existing.business_status = existing.business_status || place.business_status;
}

function classifyPlace(place) {
  const name = normalizeText(place.name);
  const types = (place.types || []).map(normalizeText);
  const hints = new Set(place.searchHints || []);
  const hasFreshType = types.some((type) => FRESH_TYPES.has(type));
  const hasFastType = types.some(isFastType);
  const hasFoodSignal = types.some(isFoodType) || hints.has("fresh") || hints.has("fast");
  const hasFreshKeyword = hasAnyKeyword(name, FRESH_KEYWORDS);
  const hasFastKeyword = hasAnyKeyword(name, FAST_KEYWORDS);
  const isInstitution = types.some((type) => INSTITUTION_TYPES.has(type));

  if (place.business_status === "CLOSED_PERMANENTLY") {
    return null;
  }

  if (isInstitution && !hasFreshType && !hasFastType && !hasFreshKeyword && !hasFastKeyword) {
    return null;
  }

  if (hasFreshType || hasFreshKeyword || (hints.has("fresh") && !hasFastType)) {
    return {
      category: "Fresh Food",
      reason: hasFreshType
        ? "fresh_type"
        : hasFreshKeyword
          ? "fresh_keyword"
          : "fresh_search",
    };
  }

  if (hasFastType || hasFastKeyword || hints.has("fast") || hasFoodSignal) {
    return {
      category: "Fast Food",
      reason: hasFastType
        ? "fast_type"
        : hasFastKeyword
          ? "fast_keyword"
          : "food_search",
    };
  }

  return null;
}

function buildPlaceData(place, classification) {
  return {
    placeId: place.place_id,
    name: place.name,
    address: place.vicinity || "No address provided",
    category: classification.category,
    classificationReason: classification.reason,
    source: "google_places",
    types: place.types || [],
    businessStatus: place.business_status || null,
    rating: place.rating || null,
    userRatingsTotal: place.user_ratings_total || null,
    priceLevel: place.price_level || null,
    matchedSearches: (place.matchedSearches || []).slice(0, 12),
    coordinates: new admin.firestore.GeoPoint(
      place.geometry.location.lat,
      place.geometry.location.lng,
    ),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function scanBustlingFoodPlaces() {
  console.log("Iniciando escaneo amplio de locales de comida...");

  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error("Falta GOOGLE_PLACES_API_KEY en backend/.env");
  }

  try {
    const searches = buildSearchRequests();
    const placesById = new Map();
    const stats = {
      searches: searches.length,
      rawResults: 0,
      saved: 0,
      skipped: 0,
      failedSearches: 0,
      byCategory: {
        "Fast Food": 0,
        "Fresh Food": 0,
      },
    };

    console.log(
      `Ejecutando ${searches.length} busquedas: ${SEARCH_TYPES.length} tipos oficiales + ${KEYWORD_SEARCHES.length} keywords.`,
    );

    for (const search of searches) {
      try {
        const results = await fetchNearbySearch(search);
        stats.rawResults += results.length;

        for (const place of results) {
          addOrMergePlace(placesById, place, search);
        }

        console.log(`${search.label}: ${results.length} resultados`);
      } catch (error) {
        stats.failedSearches++;
        console.error(`Error en ${search.label}:`, error.message);
      }
    }

    console.log(
      `Resultados crudos: ${stats.rawResults}. Unicos por place_id: ${placesById.size}.`,
    );

    for (const place of placesById.values()) {
      const classification = classifyPlace(place);

      if (!classification) {
        stats.skipped++;
        continue;
      }

      const placeData = buildPlaceData(place, classification);
      await db.collection("places").doc(place.place_id).set(placeData, {
        merge: true,
      });

      stats.saved++;
      stats.byCategory[classification.category]++;
      console.log(`Guardado: ${place.name} -> [${classification.category}]`);
    }

    console.log(
      `Escaneo finalizado. Guardados: ${stats.saved} (${stats.byCategory["Fast Food"]} Fast Food, ${stats.byCategory["Fresh Food"]} Fresh Food). Omitidos: ${stats.skipped}. Busquedas fallidas: ${stats.failedSearches}.`,
    );
  } catch (error) {
    console.error("Error ejecutando el escaneo:", error);
  }
}

scanBustlingFoodPlaces();
