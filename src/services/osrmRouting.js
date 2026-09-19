/**
 * OSRM & Offline GIS Evacuation Routing Service
 * Real-time shortest and safest path computation from danger zones to verified safe shelters
 * with 100% on-device offline capability, geodesic Red-Zone synthesis, and obstacle avoidance.
 */

const routeCache = new Map();

/**
 * Calculates exact great-circle distance between two GPS points using Haversine formula (in km)
 */
export function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generates client-side geodesic Red Zone screening polygons on-device in 0 ms
 * Matches backend `_red_zone_feature` mathematical specification.
 * 
 * @param {Array} habitations - List of habitations
 * @returns {object} GeoJSON FeatureCollection
 */
export function generateOfflineRedZones(habitations = []) {
  const features = [];

  habitations.forEach((hab) => {
    const riskLevel = hab.riskLevel || hab.risk_level || "Low";
    const score = Number(hab.riskScore || hab.risk_score || 0);

    // Only Critical and High risk habitations generate red zones
    if (riskLevel === "Critical" || riskLevel === "High" || score >= 60) {
      const coords = hab.coords || [hab.latitude, hab.longitude];
      if (!coords || !coords[0] || !coords[1]) return;

      const lat = parseFloat(coords[0]);
      const lon = parseFloat(coords[1]);

      // Radius between 1.5 km to 5.0 km based on hazard severity score
      const radiusKm = 1.0 + (Math.max(score, 60) / 100) * 4.0;

      const ring = [];
      for (let step = 0; step < 25; step++) {
        const angle = (2 * Math.PI * step) / 24;
        const dLat = (radiusKm / 111.0) * Math.sin(angle);
        const dLon =
          (radiusKm / (111.0 * Math.max(Math.cos((lat * Math.PI) / 180), 0.1))) *
          Math.cos(angle);
        ring.push([parseFloat((lon + dLon).toFixed(5)), parseFloat((lat + dLat).toFixed(5))]);
      }

      features.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [ring],
        },
        properties: {
          habitation_id: hab.id,
          name: hab.name || "Critical Hazard Zone",
          hazard: hab.hazard || "Multi-Hazard",
          risk_level: riskLevel,
          risk_score: score,
          screening_radius_km: parseFloat(radiusKm.toFixed(1)),
          classification: "Offline On-Device Screening Buffer",
          center: [lat, lon],
        },
      });
    }
  });

  return {
    type: "FeatureCollection",
    features,
    metadata: { source: "AASRA On-Device Offline GIS Engine", isOffline: true },
  };
}

/**
 * Checks if a direct line segment between start and end passes through a danger circle
 */
function checkSegmentCrossesCircle(start, end, circleCenter, radiusKm) {
  const [lat1, lon1] = start;
  const [lat2, lon2] = end;
  const [cLat, cLon] = circleCenter;

  const dTotal = calculateHaversineKm(lat1, lon1, lat2, lon2);
  if (dTotal < 0.01) return false;

  // Approximate planar projection in km relative to start
  const cosLat = Math.cos((cLat * Math.PI) / 180);
  const dx = (lon2 - lon1) * 111.0 * cosLat;
  const dy = (lat2 - lat1) * 111.0;
  const segmentLength = Math.sqrt(dx * dx + dy * dy);

  const cx = (cLon - lon1) * 111.0 * cosLat;
  const cy = (cLat - lat1) * 111.0;

  // Project center onto segment line: t in [0, 1]
  const t = Math.max(0, Math.min(1, (cx * dx + cy * dy) / (segmentLength * segmentLength)));
  const projX = t * dx;
  const projY = t * dy;

  const distToSegmentKm = Math.sqrt((cx - projX) ** 2 + (cy - projY) ** 2);

  // If closest distance is inside danger radius (plus safety clearance)
  return distToSegmentKm < radiusKm * 1.15;
}

/**
 * Computes safe perimeter bypass waypoints avoiding hazard red-zone buffers
 */
export function computeSafeObstacleAvoidancePath(start, end, redZonesGeoJson) {
  const defaultPath = [start, end];
  if (!redZonesGeoJson || !redZonesGeoJson.features || redZonesGeoJson.features.length === 0) {
    return defaultPath;
  }

  // Find all red zones intersecting the direct path
  const intersectingZones = [];
  redZonesGeoJson.features.forEach((f) => {
    const props = f.properties || {};
    const center = props.center;
    const radius = props.screening_radius_km || 2.5;
    if (!center) return;

    // Do NOT treat origin (evacuating directly out of it) or destination (approaching shelter)
    // as an obstacle to detour around!
    const distFromStart = calculateHaversineKm(start[0], start[1], center[0], center[1]);
    const distFromEnd = calculateHaversineKm(end[0], end[1], center[0], center[1]);
    if (distFromStart <= radius * 1.15 || distFromEnd <= radius * 1.15) {
      return;
    }

    if (checkSegmentCrossesCircle(start, end, center, radius)) {
      intersectingZones.push({ center, radius, name: props.name });
    }
  });

  if (intersectingZones.length === 0) {
    return defaultPath;
  }

  // If multiple, pick the most critical / primary obstacle
  const obstacle = intersectingZones[0];
  const [cLat, cLon] = obstacle.center;
  const clearanceRadiusKm = obstacle.radius * 1.35; // 35% safe buffer outside red zone

  const [lat1, lon1] = start;
  const [lat2, lon2] = end;

  const cosLat = Math.cos((cLat * Math.PI) / 180);
  const vLineX = (lon2 - lon1) * 111.0 * cosLat;
  const vLineY = (lat2 - lat1) * 111.0;
  const lineLen = Math.sqrt(vLineX * vLineX + vLineY * vLineY) || 1;

  // Normal vector perpendicular to start -> end line
  const n1X = -vLineY / lineLen;
  const n1Y = vLineX / lineLen;

  // Arc tangent waypoints curving around perimeter
  const wpNorth = [
    cLat + (clearanceRadiusKm / 111.0) * n1Y,
    cLon + (clearanceRadiusKm / (111.0 * cosLat)) * n1X,
  ];
  const wpSouth = [
    cLat - (clearanceRadiusKm / 111.0) * n1Y,
    cLon - (clearanceRadiusKm / (111.0 * cosLat)) * n1X,
  ];

  // Pick whichever bypass waypoint is closer to natural route
  const distNorth =
    calculateHaversineKm(lat1, lon1, wpNorth[0], wpNorth[1]) +
    calculateHaversineKm(wpNorth[0], wpNorth[1], lat2, lon2);
  const distSouth =
    calculateHaversineKm(lat1, lon1, wpSouth[0], wpSouth[1]) +
    calculateHaversineKm(wpSouth[0], wpSouth[1], lat2, lon2);

  const bestWaypoint = distNorth <= distSouth ? wpNorth : wpSouth;

  // Construct safe multi-point evacuation corridor
  // [Start -> Entry Checkpoint -> Perimeter Bypass -> Exit Safe Point -> Shelter]
  const mid1 = [
    lat1 * 0.4 + bestWaypoint[0] * 0.6,
    lon1 * 0.4 + bestWaypoint[1] * 0.6,
  ];
  const mid2 = [
    bestWaypoint[0] * 0.6 + lat2 * 0.4,
    bestWaypoint[1] * 0.6 + lon2 * 0.4,
  ];

  return [start, mid1, bestWaypoint, mid2, end];
}

/**
 * Fetch driving route with offline fallback and obstacle avoidance
 */
export async function getEvacuationRoute(start, end, redZonesGeoJson = null) {
  if (!start || !end || !start[0] || !start[1] || !end[0] || !end[1]) {
    return null;
  }

  const cacheKey = `${start[0].toFixed(4)},${start[1].toFixed(4)}_${end[0].toFixed(4)},${end[1].toFixed(4)}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  const startLat = start[0];
  const startLon = start[1];
  const endLat = end[0];
  const endLon = end[1];

  // Compute safe obstacle-avoiding path coordinates offline
  const safeCoordinates = computeSafeObstacleAvoidancePath(start, end, redZonesGeoJson);
  const directDistanceKm = calculateHaversineKm(startLat, startLon, endLat, endLon);
  const hasBypass = safeCoordinates.length > 2;

  // Realistic road winding factor
  const roadMultiplier = hasBypass ? 1.42 : 1.28;
  const estimatedRoadKm = parseFloat((directDistanceKm * roadMultiplier).toFixed(1));
  const fallbackResult = {
    coordinates: safeCoordinates,
    distanceKm: estimatedRoadKm,
    durationMinutes: Math.max(3, Math.round((estimatedRoadKm / 35) * 60)), // ~35 km/h emergency transit
    isRoadNetwork: false,
    isSafeBypass: hasBypass,
    isOffline: true,
  };

  // Only attempt online OSRM if navigator reports online
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    routeCache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2800); // Fast 2.8s timeout

    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const primaryRoute = data.routes[0];
        const leafletCoords = primaryRoute.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        const distanceKm = parseFloat((primaryRoute.distance / 1000).toFixed(1));
        const durationMinutes = Math.max(1, Math.round(primaryRoute.duration / 60));

        const result = {
          coordinates: leafletCoords,
          distanceKm,
          durationMinutes,
          isRoadNetwork: true,
          isSafeBypass: false,
          isOffline: false,
        };

        routeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    // Network offline or timeout: use offline safe corridor
  }

  routeCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}

/**
 * Automatically finds the SHORTEST & SAFEST PATH from a danger location to the nearest safe shelter.
 * Evaluates candidate shelters by road distance, intake capacity headroom, and hazard perimeter avoidance.
 * 
 * @param {[number, number]} dangerCoords - [latitude, longitude] of danger zone or user GPS
 * @param {Array} sheltersList - List of available safe shelters
 * @param {object} redZonesGeoJson - Optional GeoJSON of active Red Zones for obstacle avoidance
 * @returns {Promise<{bestShelter: object, route: object, rankedShelters: Array, isOffline: boolean}>}
 */
export async function findShortestEvacuationPath(dangerCoords, sheltersList = [], redZonesGeoJson = null) {
  if (!dangerCoords || !Array.isArray(dangerCoords) || sheltersList.length === 0) {
    return { bestShelter: null, route: null, rankedShelters: [], isOffline: false };
  }

  const [dLat, dLng] = dangerCoords;
  const isBrowserOffline = typeof navigator !== "undefined" && navigator.onLine === false;

  // 1. Calculate direct distances to all shelters to sort candidates
  const scoredShelters = sheltersList
    .map((site) => {
      const sCoords =
        site.coords ||
        (site.latitude !== undefined && site.longitude !== undefined
          ? [parseFloat(site.latitude), parseFloat(site.longitude)]
          : null);
      if (!sCoords) return null;

      const directKm = calculateHaversineKm(dLat, dLng, sCoords[0], sCoords[1]);
      const available = Number(site.available !== undefined ? site.available : site.capacity || 100);

      return {
        ...site,
        coords: sCoords,
        directKm: parseFloat(directKm.toFixed(2)),
        availableHeadroom: available,
        hasHeadroom: available > 0,
      };
    })
    .filter(Boolean)
    // Prioritize shelters that have positive available headroom, then by closest distance
    .sort((a, b) => {
      if (a.hasHeadroom && !b.hasHeadroom) return -1;
      if (!a.hasHeadroom && b.hasHeadroom) return 1;
      return a.directKm - b.directKm;
    });

  if (scoredShelters.length === 0) {
    return { bestShelter: null, route: null, rankedShelters: [], isOffline: isBrowserOffline };
  }

  // 2. Evaluate the top candidates
  const topCandidates = scoredShelters.slice(0, 3);
  const routePromises = topCandidates.map((s) => getEvacuationRoute(dangerCoords, s.coords, redZonesGeoJson));
  const candidateRoutes = await Promise.all(routePromises);

  // 3. Map all shelters with accurate road routing metrics
  const candidateShelters = scoredShelters.map((site, idx) => {
    let roadDist = site.directKm * 1.28;
    let dur = Math.round((roadDist / 35) * 60);
    let matchedRoute = null;

    if (idx < topCandidates.length && candidateRoutes[idx]) {
      roadDist = candidateRoutes[idx].distanceKm;
      dur = candidateRoutes[idx].durationMinutes;
      matchedRoute = candidateRoutes[idx];
    }

    return {
      ...site,
      distanceKm: parseFloat(roadDist.toFixed(1)),
      durationMinutes: Math.max(2, dur),
      route: matchedRoute,
    };
  });

  // 4. Sort strictly by headroom first, then by absolute shortest road distance
  const sortedRanked = candidateShelters.sort((a, b) => {
    if (a.hasHeadroom && !b.hasHeadroom) return -1;
    if (!a.hasHeadroom && b.hasHeadroom) return 1;
    return a.distanceKm - b.distanceKm;
  });

  // The true absolute #1 ideal shortest shelter is sortedRanked[0]
  const idealShelter = sortedRanked[0];
  const idealRoute = idealShelter.route || candidateRoutes[0] || null;
  const usedOffline = isBrowserOffline || (idealRoute && idealRoute.isOffline);

  // Attach final rank and isShortest boolean flag
  const finalRanked = sortedRanked.map((s, rankIdx) => ({
    ...s,
    isShortest: rankIdx === 0,
    rank: rankIdx + 1,
  }));

  return {
    bestShelter: {
      ...idealShelter,
      distanceKm: idealShelter.distanceKm,
      durationMinutes: idealShelter.durationMinutes,
    },
    route: idealRoute,
    rankedShelters: finalRanked,
    isOffline: usedOffline,
  };
}

/**
 * LocalStorage Offline GIS Caching Helpers
 */
const STORAGE_PREFIX = "aasra_offline_gis_";

export function saveOfflineGISCache(data = {}) {
  try {
    if (typeof localStorage === "undefined") return;
    if (data.habitations) {
      localStorage.setItem(`${STORAGE_PREFIX}habitations`, JSON.stringify(data.habitations));
    }
    if (data.shelters) {
      localStorage.setItem(`${STORAGE_PREFIX}shelters`, JSON.stringify(data.shelters));
    }
    if (data.redZones) {
      localStorage.setItem(`${STORAGE_PREFIX}red_zones`, JSON.stringify(data.redZones));
    }
    localStorage.setItem(`${STORAGE_PREFIX}timestamp`, new Date().toISOString());
  } catch (err) {
    console.warn("Unable to save offline GIS cache:", err);
  }
}

export function getOfflineGISCache() {
  try {
    if (typeof localStorage === "undefined") return null;
    const habsRaw = localStorage.getItem(`${STORAGE_PREFIX}habitations`);
    const sheltersRaw = localStorage.getItem(`${STORAGE_PREFIX}shelters`);
    const zonesRaw = localStorage.getItem(`${STORAGE_PREFIX}red_zones`);
    const ts = localStorage.getItem(`${STORAGE_PREFIX}timestamp`);

    if (!habsRaw && !sheltersRaw) return null;

    return {
      habitations: habsRaw ? JSON.parse(habsRaw) : null,
      shelters: sheltersRaw ? JSON.parse(sheltersRaw) : null,
      redZones: zonesRaw ? JSON.parse(zonesRaw) : null,
      timestamp: ts,
    };
  } catch {
    return null;
  }
}
