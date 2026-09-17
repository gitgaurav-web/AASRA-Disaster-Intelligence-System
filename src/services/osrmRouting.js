/**
 * OSRM & GIS Evacuation Routing Service
 * Real-time shortest path computation from danger zones to verified safe shelters
 * using OpenStreetMap / OSRM API with automatic road-network heuristic fallback.
 */

const routeCache = new Map();

/**
 * Calculates exact great-circle distance between two GPS points using Haversine formula
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
 * Fetch real driving route from danger zone to safe shelter.
 * @param {[number, number]} start - [latitude, longitude] (Danger Location)
 * @param {[number, number]} end - [latitude, longitude] (Safe Shelter)
 * @returns {Promise<{coordinates: [number, number][], distanceKm: number, durationMinutes: number, isRoadNetwork: boolean}>}
 */
export async function getEvacuationRoute(start, end) {
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

  // Realistic road winding factor: in mountainous and flood terrains, road distance is ~1.25x - 1.35x direct distance
  const directDistanceKm = calculateHaversineKm(startLat, startLon, endLat, endLon);
  const estimatedRoadKm = parseFloat((directDistanceKm * 1.28).toFixed(1));
  const fallbackResult = {
    coordinates: [start, end],
    distanceKm: estimatedRoadKm,
    durationMinutes: Math.max(3, Math.round((estimatedRoadKm / 35) * 60)), // ~35 km/h emergency transit
    isRoadNetwork: false,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5 second fast timeout

    // OSRM expects coordinates in lon,lat order
    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      routeCache.set(cacheKey, fallbackResult);
      return fallbackResult;
    }

    const data = await response.json();
    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const primaryRoute = data.routes[0];
      // OSRM GeoJSON coordinates are [lon, lat], Leaflet needs [lat, lon]
      const leafletCoords = primaryRoute.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
      const distanceKm = parseFloat((primaryRoute.distance / 1000).toFixed(1));
      const durationMinutes = Math.max(1, Math.round(primaryRoute.duration / 60));

      const result = {
        coordinates: leafletCoords,
        distanceKm,
        durationMinutes,
        isRoadNetwork: true,
      };

      routeCache.set(cacheKey, result);
      return result;
    }
  } catch {
    // Gracefully handle network timeouts or offline mode
  }

  routeCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}

/**
 * Automatically finds the SHORTEST PATH from a danger location to the nearest safe shelter.
 * Evaluates all candidate shelters and ranks them by shortest road transit distance.
 * 
 * @param {[number, number]} dangerCoords - [latitude, longitude] of danger zone or user GPS
 * @param {Array} sheltersList - List of available safe shelters
 * @returns {Promise<{bestShelter: object, route: object, rankedShelters: Array}>}
 */
export async function findShortestEvacuationPath(dangerCoords, sheltersList = []) {
  if (!dangerCoords || !Array.isArray(dangerCoords) || sheltersList.length === 0) {
    return { bestShelter: null, route: null, rankedShelters: [] };
  }

  const [dLat, dLng] = dangerCoords;

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
      return {
        ...site,
        coords: sCoords,
        directKm: parseFloat(directKm.toFixed(2)),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.directKm - b.directKm);

  if (scoredShelters.length === 0) {
    return { bestShelter: null, route: null, rankedShelters: [] };
  }

  // 2. Evaluate the closest 3 candidate shelters with full road routing in parallel
  const topCandidates = scoredShelters.slice(0, 3);
  const routePromises = topCandidates.map((s) => getEvacuationRoute(dangerCoords, s.coords));
  const candidateRoutes = await Promise.all(routePromises);

  // 3. Find the candidate with the absolute minimum road distance (Shortest Path)
  let bestIndex = 0;
  let minDistance = Infinity;

  candidateRoutes.forEach((route, idx) => {
    const dist = route ? route.distanceKm : topCandidates[idx].directKm;
    if (dist < minDistance) {
      minDistance = dist;
      bestIndex = idx;
    }
  });

  const bestShelter = topCandidates[bestIndex];
  const bestRoute = candidateRoutes[bestIndex];

  // 4. Create sorted list of all shelters with ranked shortest distances
  const rankedShelters = scoredShelters.map((site, idx) => {
    let roadDist = site.directKm * 1.28;
    let dur = Math.round((roadDist / 35) * 60);

    if (idx < topCandidates.length && candidateRoutes[idx]) {
      roadDist = candidateRoutes[idx].distanceKm;
      dur = candidateRoutes[idx].durationMinutes;
    }

    return {
      ...site,
      distanceKm: parseFloat(roadDist.toFixed(1)),
      durationMinutes: Math.max(2, dur),
      isShortest: site.id === bestShelter.id,
      rank: idx + 1,
    };
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    bestShelter: {
      ...bestShelter,
      distanceKm: bestRoute ? bestRoute.distanceKm : parseFloat((bestShelter.directKm * 1.28).toFixed(1)),
      durationMinutes: bestRoute ? bestRoute.durationMinutes : Math.round((bestShelter.directKm / 35) * 60),
    },
    route: bestRoute,
    rankedShelters,
  };
}
