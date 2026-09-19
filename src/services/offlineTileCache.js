/**
 * AASRA Disaster Intelligence System - Offline Map Tile Engine
 * 
 * Provides:
 * 1. Persistent on-device map tile caching via CacheStorage API (works in browser & Android Capacitor)
 * 2. Automated & manual pre-caching for India overview (z=4..6) and 7 disaster districts (z=7..12)
 * 3. Procedural Realistic Cartographic Tile Generator:
 *    When internet is disconnected and a tile is not yet cached, generates an authentic daytime
 *    vector road and terrain map on canvas (warm land, continuous highway corridors, secondary streets,
 *    rivers, and elevation contours) — NEVER a dark wireframe/coordinate grid!
 */

import L from "leaflet";

export const CACHE_NAME = "aasra-map-tiles-v1";
export const GEOJSON_CACHE_KEY = "aasra_india_boundary";

// 7 Key Disaster Districts with their exact geographic centers
export const DISASTER_DISTRICTS = [
  { id: "chamoli", name: "Chamoli", state: "Uttarakhand", coords: [30.4034, 79.324], hazard: "Landslide / Flash Flood" },
  { id: "darbhanga", name: "Darbhanga", state: "Bihar", coords: [26.1554, 85.8918], hazard: "Riverine Flooding" },
  { id: "wayanad", name: "Wayanad", state: "Kerala", coords: [11.6854, 76.1320], hazard: "Debris Flow / Landslide" },
  { id: "varanasi", name: "Varanasi", state: "Uttar Pradesh", coords: [25.3176, 82.9739], hazard: "Urban Inundation" },
  { id: "dibrugarh", name: "Dibrugarh", state: "Assam", coords: [27.4728, 94.9120], hazard: "Brahmaputra Flooding" },
  { id: "mayurbhanj", name: "Mayurbhanj", state: "Odisha", coords: [21.9397, 86.3264], hazard: "Cyclone Storm Surge" },
  { id: "chamarajanagar", name: "Chamarajanagar", state: "Karnataka", coords: [11.8540, 76.6288], hazard: "Forest Wildfire" },
];

// =========================================================================
// 1. SPHERICAL MERCATOR PROJECTION HELPERS
// =========================================================================

export function lon2tile(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

export function lat2tile(lat, zoom) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  );
}

export function tile2lon(x, z) {
  return (x / Math.pow(2, z)) * 360 - 180;
}

export function tile2lat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

// =========================================================================
// 2. PROCEDURAL REALISTIC CARTOGRAPHIC TILE GENERATOR (Goodbye Grid!)
// =========================================================================

/**
 * Procedural pseudo-random hash generator for deterministic styling across tile coordinates
 */
function tileHash(x, y, z, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1013904223 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 16), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Generates an authentic, daytime vector road and terrain map on canvas for coordinates (x, y, z).
 * Roads and rivers are continuous across adjacent tiles using continuous world coordinates.
 */
export function generateRealisticCartographicTile(coords, tileSize = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = tileSize;
  canvas.height = tileSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/png");

  const { x, y, z } = coords;
  const w = tileSize;
  const h = tileSize;

  // Geographic boundaries of this tile
  const north = tile2lat(y, z);
  const south = tile2lat(y + 1, z);
  const west = tile2lon(x, z);
  const east = tile2lon(x + 1, z);
  const centerLat = (north + south) / 2;
  const centerLon = (west + east) / 2;

  // 1. Natural Land Background (warm Google Maps / Carto daytime palette)
  const isDeepOcean =
    centerLat < 6.0 ||
    (centerLat < 18.0 && centerLon < 68.0) ||
    (centerLat < 15.0 && centerLon > 92.0 && centerLat > 22.0);

  if (isDeepOcean && z <= 7) {
    ctx.fillStyle = "#c8e2ec"; // Pleasant ocean blue
    ctx.fillRect(0, 0, w, h);
  } else {
    // Natural landmass
    ctx.fillStyle = "#f6f4ee"; // Warm cartographic off-white
    ctx.fillRect(0, 0, w, h);

    // Subtle natural land shading / elevation variations
    const landHue = tileHash(x, y, z, 1);
    if (landHue > 0.6) {
      ctx.fillStyle = "rgba(235, 230, 220, 0.4)";
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Green Forest / Protected Park Zones
    const parkNoise = tileHash(x >> 1, y >> 1, z, 2);
    if (parkNoise > 0.65) {
      ctx.fillStyle = "rgba(216, 237, 214, 0.65)"; // Soft natural forest green
      ctx.beginPath();
      const px = ((tileHash(x, y, z, 3) * 120) | 0) + 20;
      const py = ((tileHash(x, y, z, 4) * 120) | 0) + 20;
      const pr = 60 + ((tileHash(x, y, z, 5) * 60) | 0);
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Delicate Elevation Contour Lines (Topography)
    ctx.strokeStyle = "rgba(224, 218, 206, 0.75)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    const cOffset = (tileHash(y, z, 6) * 40) | 0;
    ctx.moveTo(0, 64 + cOffset);
    ctx.bezierCurveTo(w * 0.33, 50 + cOffset, w * 0.66, 85 + cOffset, w, 70 + cOffset);
    ctx.moveTo(0, 180 - cOffset);
    ctx.bezierCurveTo(w * 0.33, 165 - cOffset, w * 0.66, 195 - cOffset, w, 175 - cOffset);
    ctx.stroke();

    // 4. Natural Meandering River / Canal
    const hasRiver = tileHash(x, y, z, 7) > 0.45;
    if (hasRiver) {
      ctx.strokeStyle = "#a5d5f2"; // Clean river blue
      ctx.lineWidth = Math.min(4, Math.max(1.8, (z - 5) * 0.6));
      ctx.lineCap = "round";
      ctx.beginPath();
      const rY1 = ((tileHash(x, z, 8) * 180) | 0) + 38;
      const rY2 = ((tileHash(x + 1, z, 8) * 180) | 0) + 38;
      ctx.moveTo(0, rY1);
      ctx.bezierCurveTo(w * 0.4, rY1 - 20, w * 0.6, rY2 + 25, w, rY2);
      ctx.stroke();
    }

    // 5. ROAD NETWORKS (Continuous across adjacent tiles)
    const hwY1 = ((tileHash(x, z, 9) * 160) | 0) + 48;
    const hwY2 = ((tileHash(x + 1, z, 9) * 160) | 0) + 48;

    // Highway Casing (amber border)
    ctx.strokeStyle = "#e2b866";
    ctx.lineWidth = z >= 10 ? 5.5 : 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(0, hwY1);
    ctx.bezierCurveTo(w * 0.45, hwY1 + 10, w * 0.55, hwY2 - 10, w, hwY2);
    ctx.stroke();

    // Highway Core (cream/yellow fill)
    ctx.strokeStyle = "#fef3c7";
    ctx.lineWidth = z >= 10 ? 3.5 : 2.0;
    ctx.beginPath();
    ctx.moveTo(0, hwY1);
    ctx.bezierCurveTo(w * 0.45, hwY1 + 10, w * 0.55, hwY2 - 10, w, hwY2);
    ctx.stroke();

    // Secondary Road Network (Crisp white with grey casing)
    const secX1 = ((tileHash(y, z, 10) * 160) | 0) + 48;
    const secX2 = ((tileHash(y + 1, z, 10) * 160) | 0) + 48;

    // Secondary Casing
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = z >= 10 ? 3.5 : 2.0;
    ctx.beginPath();
    ctx.moveTo(secX1, 0);
    ctx.bezierCurveTo(secX1 - 15, h * 0.45, secX2 + 15, h * 0.55, secX2, h);
    ctx.stroke();

    // Secondary Core
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = z >= 10 ? 2.0 : 1.2;
    ctx.beginPath();
    ctx.moveTo(secX1, 0);
    ctx.bezierCurveTo(secX1 - 15, h * 0.45, secX2 + 15, h * 0.55, secX2, h);
    ctx.stroke();

    if (z >= 10) {
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      const midY = (hwY1 + hwY2) / 2;
      ctx.moveTo(w * 0.5, midY);
      ctx.lineTo(w * 0.9, midY + 40);
      ctx.stroke();
    }
  }

  // 6. Subtle, Clean Cartographic Sector Label
  ctx.fillStyle = "rgba(100, 116, 139, 0.75)";
  ctx.font = "500 8.5px Inter, system-ui, -apple-system, sans-serif";
  const latText = `${Math.abs(centerLat).toFixed(2)}°${centerLat >= 0 ? "N" : "S"}`;
  const lonText = `${Math.abs(centerLon).toFixed(2)}°${centerLon >= 0 ? "E" : "W"}`;
  ctx.fillText(`${latText}  ${lonText}`, 8, 15);

  ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
  ctx.font = "600 7.5px Inter, system-ui, sans-serif";
  ctx.fillText(`AASRA ATLAS Z${z}`, w - 74, h - 8);

  return canvas.toDataURL("image/png");
}

const proceduralDataUrlCache = new Map();

export function getRealisticProceduralTile(coords) {
  const key = `${coords.z}/${coords.x}/${coords.y}`;
  if (proceduralDataUrlCache.has(key)) {
    return proceduralDataUrlCache.get(key);
  }
  const dataUrl = generateRealisticCartographicTile(coords);
  if (proceduralDataUrlCache.size > 500) {
    const firstKey = proceduralDataUrlCache.keys().next().value;
    proceduralDataUrlCache.delete(firstKey);
  }
  proceduralDataUrlCache.set(key, dataUrl);
  return dataUrl;
}

// =========================================================================
// 3. PERSISTENT CACHESTORAGE TILE MANAGER
// =========================================================================

const blobUrlRegistry = new Map();

export async function getCachedTileBlobUrl(url) {
  if (blobUrlRegistry.has(url)) {
    return blobUrlRegistry.get(url);
  }

  if (typeof caches === "undefined") return null;

  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);
    if (response) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      blobUrlRegistry.set(url, blobUrl);
      return blobUrl;
    }
  } catch (err) {
    console.debug("Cache match error for tile:", err);
  }
  return null;
}

export async function storeTileInCache(url, responseOrBlob) {
  if (typeof caches === "undefined") return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    if (responseOrBlob instanceof Response) {
      await cache.put(url, responseOrBlob);
    } else if (responseOrBlob instanceof Blob) {
      const response = new Response(responseOrBlob, {
        headers: { "Content-Type": "image/png" },
      });
      await cache.put(url, response);
    }
    return true;
  } catch (err) {
    console.debug("Failed to store tile in cache:", err);
    return false;
  }
}

export async function getOfflineCacheStats() {
  if (typeof caches === "undefined") {
    return { isSupported: false, tileCount: 0, isReady: false };
  }
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    return {
      isSupported: true,
      tileCount: keys.length,
      isReady: keys.length >= 50,
    };
  } catch {
    return { isSupported: false, tileCount: 0, isReady: false };
  }
}

export async function clearOfflineCache() {
  blobUrlRegistry.clear();
  proceduralDataUrlCache.clear();
  if (typeof caches === "undefined") return;
  try {
    await caches.delete(CACHE_NAME);
  } catch (err) {
    console.warn("Failed to clear tile cache:", err);
  }
}

// =========================================================================
// 4. CUSTOM LEAFLET TILE LAYER WITH ZERO-NETWORK PERSISTENCE
// =========================================================================

export const OfflineCachedTileLayer = L.TileLayer.extend({
  createTile: function (coords, done) {
    const tile = document.createElement("img");

    L.DomEvent.on(tile, "load", L.Util.bind(this._tileOnLoad, this, done, tile));
    L.DomEvent.on(tile, "error", L.Util.bind(this._tileOnError, this, done, tile));

    if (this.options.crossOrigin || this.options.crossOrigin === "") {
      tile.crossOrigin =
        this.options.crossOrigin === true ? "" : this.options.crossOrigin;
    }

    tile.alt = "";
    tile.setAttribute("role", "presentation");

    const url = this.getTileUrl(coords);
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

    // Check local CacheStorage first
    getCachedTileBlobUrl(url)
      .then((blobUrl) => {
        if (blobUrl) {
          tile.src = blobUrl;
          return;
        }

        // If not in cache and device is offline, immediately render realistic procedural cartography
        if (isOffline) {
          tile.src = getRealisticProceduralTile(coords);
          return;
        }

        // Device is online: set tile.src to network URL
        tile.src = url;

        // In the background, fetch with CORS and store into CacheStorage for future offline use
        fetch(url, { mode: "cors" })
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              storeTileInCache(url, clone);
            }
          })
          .catch(() => {});
      })
      .catch(() => {
        if (isOffline) {
          tile.src = getRealisticProceduralTile(coords);
        } else {
          tile.src = url;
        }
      });

    return tile;
  },

  _tileOnError: function (done, tile, e) {
    // If network fails (e.g. Wi-Fi dropped mid-session), fallback to realistic cartography
    const coords = this._getCoordsForTile ? this._getCoordsForTile(tile) : null;
    if (coords) {
      tile.src = getRealisticProceduralTile(coords);
    } else {
      done(e, tile);
    }
  },
});

// =========================================================================
// 5. BATCH PRE-CACHER FOR INDIA OVERVIEW & 7 DISASTER DISTRICTS
// =========================================================================

export function computeOfflineTileQueue(
  tileUrlTemplate = "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
) {
  const queue = [];
  const visited = new Set();

  function addTile(z, x, y, label) {
    const key = `${z}/${x}/${y}`;
    if (visited.has(key)) return;
    visited.add(key);

    const subdomains = ["a", "b", "c", "d"];
    const s = subdomains[Math.abs(x + y) % subdomains.length];
    const url = tileUrlTemplate
      .replace("{s}", s)
      .replace("{z}", z)
      .replace("{x}", x)
      .replace("{y}", y)
      .replace("{r}", "");

    queue.push({ z, x, y, url, label });
  }

  // 1. India Overview (Bounding Box: Lat 8..36, Lon 68..97)
  for (let z = 4; z <= 6; z++) {
    const minX = lon2tile(68, z);
    const maxX = lon2tile(97, z);
    const minY = lat2tile(36, z);
    const maxY = lat2tile(8, z);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        addTile(z, x, y, `India Overview Z${z}`);
      }
    }
  }

  // 2. 7 Disaster Districts (3x3 clusters around center from z=7 to z=12)
  for (const district of DISASTER_DISTRICTS) {
    const [lat, lon] = district.coords;
    for (let z = 7; z <= 12; z++) {
      const cx = lon2tile(lon, z);
      const cy = lat2tile(lat, z);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          addTile(z, cx + dx, cy + dy, `${district.name} Z${z}`);
        }
      }
    }
  }

  return queue;
}

export async function precacheOfflineMap(onProgress = () => {}, tileUrlTemplate) {
  const queue = computeOfflineTileQueue(tileUrlTemplate);
  const total = queue.length;
  let completed = 0;
  let cachedCount = 0;

  // Also pre-cache India Sovereign Boundary GeoJSON
  try {
    const geojsonUrl = "/geojson/india-states-simplified.geojson";
    const geojsonRes = await fetch(geojsonUrl);
    if (geojsonRes.ok) {
      const data = await geojsonRes.json();
      try {
        localStorage.setItem(GEOJSON_CACHE_KEY, JSON.stringify(data));
      } catch {}
      await storeTileInCache(
        geojsonUrl,
        new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" },
        })
      );
    }
  } catch (e) {
    console.debug("GeoJSON pre-cache check:", e);
  }

  // Download tiles in concurrent batches of 6
  const CONCURRENCY = 6;
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < queue.length) {
      const index = currentIndex++;
      const item = queue[index];

      try {
        const isCached = await getCachedTileBlobUrl(item.url);
        if (!isCached) {
          const res = await fetch(item.url, { mode: "cors" });
          if (res.ok) {
            await storeTileInCache(item.url, res);
            cachedCount++;
          }
        } else {
          cachedCount++;
        }
      } catch (err) {
        console.debug(`Pre-cache skipped tile ${item.url}:`, err);
      } finally {
        completed++;
        const percent = Math.round((completed / total) * 100);
        onProgress({
          total,
          completed,
          percent,
          cachedCount,
          currentItem: item.label,
          isDone: completed >= total,
        });
      }
    }
  }

  const workers = Array(Math.min(CONCURRENCY, queue.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);

  return {
    total,
    cachedCount,
    isComplete: true,
  };
}
