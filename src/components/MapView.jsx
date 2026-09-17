import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  GeoJSON,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Navigation,
  Layers,
  Crosshair,
  Maximize2,
  Minimize2,
  Compass,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Minus,
  ExternalLink,
  Shield,
} from "lucide-react";
import LiveRiskInspector from "./LiveRiskInspector";
import { getEvacuationRoute, findShortestEvacuationPath } from "../services/osrmRouting";

// =========================================================================
// HIGH-VISIBILITY GOOGLE-STYLE SVG PINS (100% Reliable, Zero Image URLs)
// =========================================================================
const createHabitationIcon = (riskLevel, isSelected) => {
  const colorMap = {
    Critical: "#d93025", // Google Red
    High: "#ea8600",     // Google Amber
    Moderate: "#f9ab00", // Google Yellow
    Low: "#1e8e3e",      // Google Green
  };
  const color = colorMap[riskLevel] || "#1e8e3e";
  const size = isSelected ? 32 : 24;
  const isCritical = riskLevel === "Critical";

  return L.divIcon({
    className: "google-hab-marker",
    html: `
      <div style="position: relative; width: ${size}px; height: ${size + 8}px; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        ${
          isCritical
            ? `<div style="position: absolute; top: 0; width: ${size}px; height: ${size}px; border-radius: 50%; background-color: rgba(217,48,37,0.4); animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>`
            : ""
        }
        <svg viewBox="0 0 24 32" width="${size}" height="${size + 8}" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.4));">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
          <circle cx="12" cy="12" r="4.5" fill="#ffffff"/>
        </svg>
      </div>
    `,
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -(size + 8)],
  });
};

const createShelterIcon = (isSelected) => {
  const size = isSelected ? 36 : 28;
  return L.divIcon({
    className: "google-shelter-marker",
    html: `
      <div style="position: relative; width: ${size}px; height: ${size + 8}px; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <svg viewBox="0 0 24 32" width="${size}" height="${size + 8}" style="filter: drop-shadow(0 3px 6px rgba(26,115,232,0.5));">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="#1a73e8" stroke="#ffffff" stroke-width="1.8"/>
          <circle cx="12" cy="12" r="6" fill="#ffffff"/>
          <path d="M9 14v-3l3-2.5 3 2.5v3h-2v-2h-2v2H9z" fill="#1a73e8"/>
        </svg>
      </div>
    `,
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -(size + 8)],
  });
};

const createUserLocationIcon = () => {
  return L.divIcon({
    className: "google-user-marker",
    html: `
      <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; border-radius: 50%; background-color: rgba(66,133,244,0.35); animation: ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="
          background-color: #1a73e8;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 3.5px solid #ffffff;
          box-shadow: 0 0 8px rgba(0,0,0,0.4);
        "></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

// =========================================================================
// GOOGLE MAPS TILE PROVIDERS (Fast, High-Res, Direct Google Infrastructure)
// =========================================================================
const BASE_MAPS = {
  googleRoad: {
    id: "googleRoad",
    name: "Google Roadmap",
    icon: "🗺️",
    url: "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
    maxZoom: 20,
  },
  googleHybrid: {
    id: "googleHybrid",
    name: "Google Satellite",
    icon: "🛰️",
    url: "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a> (Satellite Imagery)',
    maxZoom: 20,
  },
  googleTerrain: {
    id: "googleTerrain",
    name: "Google Terrain",
    icon: "⛰️",
    url: "https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
    maxZoom: 20,
  },
  dark: {
    id: "dark",
    name: "Tactical Dark",
    icon: "🌙",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    subdomains: ["a", "b", "c", "d"],
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
};

// =========================================================================
// MAP CAMERA & SIZE CONTROLLER (Never resets user zoom unexpectedly)
// =========================================================================
function MapController({ targetView, onMapReady }) {
  const map = useMap();
  const lastTargetViewRef = useRef(null);

  // Invalidate size on load to guarantee 0 grey tiles
  useEffect(() => {
    if (onMapReady) onMapReady(map);
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map, onMapReady]);

  // Handle explicit flyTo requests only when targetView actually changes
  useEffect(() => {
    if (!targetView || !targetView.center) return;
    const key = `${targetView.center[0]}_${targetView.center[1]}_${targetView.zoom}`;
    if (lastTargetViewRef.current === key) return;
    lastTargetViewRef.current = key;

    map.flyTo(targetView.center, targetView.zoom, {
      duration: 1.1,
      easeLinearity: 0.25,
    });
  }, [targetView, map]);

  return null;
}

export default function MapView({
  habitations = [],
  relocationSites = [],
  redZones = null,
  selectedHabitation = null,
  selectedShelter = null,
  onSelectHabitation = () => {},
  onSelectShelter = () => {},
  center = [22.8, 79.5],
  zoom = 5,
  height = "620px",
  showSites = true,
  showHabitations = true,
  showRedZones = true,
  variant = "gov", // "gov" | "citizen"
  userLocation = null,
  onLocateMe = null,
}) {
  // Default to Google Roadmap for Citizen, or Google Hybrid / Dark for Gov
  const [baseMap, setBaseMap] = useState(variant === "gov" ? "googleHybrid" : "googleRoad");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [indiaBoundary, setIndiaBoundary] = useState(null);

  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Target view state triggered ONLY on explicit actions
  const [targetView, setTargetView] = useState({ center, zoom });

  // Update targetView when center/zoom props change from parent
  useEffect(() => {
    if (center && center[0] && center[1]) {
      setTargetView({ center, zoom });
    }
  }, [center, zoom]);

  // Load India administrative boundary GeoJSON
  useEffect(() => {
    let mounted = true;
    fetch("/geojson/india-states-simplified.geojson")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data) setIndiaBoundary(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const getRiskColor = (level) => {
    switch (level) {
      case "Critical":
        return "#d93025";
      case "High":
        return "#ea8600";
      case "Moderate":
        return "#f9ab00";
      default:
        return "#1e8e3e";
    }
  };

  const getCoords = (item) => {
    if (!item) return null;
    if (item.coords && Array.isArray(item.coords) && item.coords.length === 2) {
      return item.coords;
    }
    if (item.latitude !== undefined && item.longitude !== undefined) {
      return [parseFloat(item.latitude), parseFloat(item.longitude)];
    }
    return null;
  };

  const selHabCoords = useMemo(() => getCoords(selectedHabitation), [selectedHabitation]);

  // Origin Coordinates (Danger Zone or User Location)
  const originCoords = useMemo(() => {
    return selHabCoords || (userLocation ? [userLocation.lat, userLocation.lng] : null);
  }, [selHabCoords, userLocation]);

  const [activeTargetShelter, setActiveTargetShelter] = useState(null);
  const [roadRoute, setRoadRoute] = useState(null);
  const [isShortestCandidate, setIsShortestCandidate] = useState(false);

  // Calculate Shortest Safe Path automatically
  useEffect(() => {
    let mounted = true;

    if (!originCoords || relocationSites.length === 0) {
      setActiveTargetShelter(null);
      setRoadRoute(null);
      setIsShortestCandidate(false);
      return;
    }

    // If user explicitly picked a shelter from the UI, route directly to it
    if (selectedShelter) {
      const destCoords = getCoords(selectedShelter);
      if (destCoords) {
        setActiveTargetShelter(selectedShelter);
        setIsShortestCandidate(false);
        getEvacuationRoute(originCoords, destCoords).then((route) => {
          if (mounted && route) setRoadRoute(route);
        });
      }
      return () => {
        mounted = false;
      };
    }

    // Otherwise, automatically calculate the SHORTEST PATH to the closest safe shelter!
    findShortestEvacuationPath(originCoords, relocationSites).then(({ bestShelter, route }) => {
      if (mounted && bestShelter) {
        setActiveTargetShelter(bestShelter);
        setRoadRoute(route);
        setIsShortestCandidate(true);
      }
    }).catch(() => {});

    return () => {
      mounted = false;
    };
  }, [originCoords, selectedShelter, relocationSites]);

  const fallbackRoute =
    originCoords && activeTargetShelter
      ? [originCoords, getCoords(activeTargetShelter)]
      : null;

  const activeCorridorCoords = roadRoute?.coordinates || fallbackRoute;

  // Zoom In / Zoom Out Google Controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  // Fullscreen Handler
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    }, 200);
  };

  // Geolocation Handler
  const handleLocateMe = () => {
    if (onLocateMe) {
      onLocateMe();
      return;
    }
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        setTargetView({ center: [latitude, longitude], zoom: 14 });
        if (onSelectHabitation) {
          onSelectHabitation({
            id: "user-gps",
            name: "Your Live GPS Location",
            district: "Live GPS",
            coords: [latitude, longitude],
            population: 1,
            hazard: "Citizen Geolocation",
            riskLevel: "Low",
          });
        }
      },
      () => {
        setLocating(false);
        alert("Unable to acquire your location. Please check browser GPS permissions.");
      },
      { timeout: 8000 }
    );
  };

  // Google Maps Deep Link
  const openGoogleMapsDirections = () => {
    const destCoords = activeTargetShelter ? getCoords(activeTargetShelter) : null;
    if (!destCoords) return;

    let url = "";
    if (originCoords) {
      url = `https://www.google.com/maps/dir/?api=1&origin=${originCoords[0]},${originCoords[1]}&destination=${destCoords[0]},${destCoords[1]}&travelmode=driving`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${destCoords[0]},${destCoords[1]}`;
    }
    window.open(url, "_blank");
  };

  const activeBaseObj = BASE_MAPS[baseMap] || BASE_MAPS.googleRoad;

  return (
    <div
      ref={containerRef}
      style={{
        height: isFullscreen ? "100vh" : height,
        width: "100%",
      }}
      className="relative rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-800 shadow-lg font-sans z-0 bg-slate-100 dark:bg-slate-900 select-none"
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        {/* Core Controller for sizing & camera motions */}
        <MapController
          targetView={targetView}
          onMapReady={(map) => {
            mapInstanceRef.current = map;
          }}
        />

        {/* High-Resolution Google Maps Tile Layer */}
        <TileLayer
          key={baseMap}
          url={activeBaseObj.url}
          subdomains={activeBaseObj.subdomains || ["a", "b", "c", "d"]}
          attribution={activeBaseObj.attribution}
          maxZoom={activeBaseObj.maxZoom}
        />

        {/* India Sovereign Border Overlay */}
        {indiaBoundary && (
          <GeoJSON
            data={indiaBoundary}
            style={{
              color: "#1a73e8",
              weight: 2.2,
              opacity: 0.85,
              fillOpacity: 0,
            }}
          />
        )}

        {/* Hazard Screening Red Zones */}
        {showRedZones && redZones && (
          <GeoJSON
            data={redZones}
            style={(f) => ({
              color: f?.properties?.risk_level === "Critical" ? "#d93025" : "#ea8600",
              weight: 2,
              fillColor: f?.properties?.risk_level === "Critical" ? "#ea4335" : "#fbbc04",
              fillOpacity: 0.22,
              dashArray: "5, 5",
            })}
            onEachFeature={(f, layer) => {
              const p = f.properties || {};
              layer.bindPopup(`
                <div style="font-size:12px; font-family:sans-serif; min-width:180px;">
                  <strong style="color:#d93025; font-size:13px;">⚠️ ${p.name || "Risk Screening Area"}</strong>
                  <div style="margin-top:5px; font-size:11px; color:#374151;">
                    Hazard: <strong>${p.hazard || "Multi-Hazard"}</strong><br/>
                    Risk Index: <strong>${p.risk_level || "Critical"}</strong><br/>
                    Buffer Type: <em>${p.classification || "Official Screening"}</em>
                  </div>
                </div>
              `);
            }}
          />
        )}

        {/* Evacuation Route Polyline in Google Blue */}
        {activeCorridorCoords && (
          <Polyline
            positions={activeCorridorCoords}
            pathOptions={{
              color: "#1a73e8",
              weight: 6,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {/* User GPS Pin */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserLocationIcon()}>
            <Popup>
              <div className="p-1 text-xs">
                <p className="font-bold text-blue-600">📍 You Are Here</p>
                <p className="text-[10px] text-slate-500">Live GPS Location</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Habitation Markers */}
        {showHabitations &&
          habitations.map((hab) => {
            const coords = getCoords(hab);
            if (!coords || !coords[0] || !coords[1]) return null;

            const isSelected = selectedHabitation?.id === hab.id;
            const riskLevel = hab.riskLevel || hab.risk_level || "Low";

            return (
              <Marker
                key={`hab-${hab.id}`}
                position={coords}
                icon={createHabitationIcon(riskLevel, isSelected)}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    onSelectHabitation(isSelected ? null : { ...hab, coords });
                    setTargetView({ center: coords, zoom: 14 });
                  },
                }}
              >
                <Popup>
                  <div className="text-xs p-1 min-w-[220px] font-sans">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-slate-900 text-sm leading-tight">{hab.name}</span>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-black text-white flex-shrink-0"
                        style={{ backgroundColor: getRiskColor(riskLevel) }}
                      >
                        {riskLevel}
                      </span>
                    </div>

                    <p className="text-slate-500 text-[11px] mb-2 font-medium">
                      📍 {hab.district} District
                    </p>

                    <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 mb-2.5 text-[11px]">
                      <div className="flex justify-between">
                        <span>Active Hazard:</span>
                        <strong className="text-red-600 dark:text-red-400 font-bold">{hab.hazard}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Population at Risk:</span>
                        <strong className="font-bold">{hab.population ? hab.population.toLocaleString() : "N/A"}</strong>
                      </div>
                      {hab.riskScore !== undefined && (
                        <div className="flex justify-between">
                          <span>Vulnerability Index:</span>
                          <strong>{Number(hab.riskScore).toFixed(1)} / 100</strong>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onSelectHabitation(isSelected ? null : { ...hab, coords });
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition shadow flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? "bg-rose-600 hover:bg-rose-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{isSelected ? "Clear Evacuation Route" : "Show Shortest Safe Path"}</span>
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Designated Safe Shelters */}
        {showSites &&
          relocationSites.map((site) => {
            const coords = getCoords(site);
            if (!coords || !coords[0] || !coords[1]) return null;

            const isSelected = activeTargetShelter?.id === site.id;

            return (
              <Marker
                key={`site-${site.id}`}
                position={coords}
                icon={createShelterIcon(isSelected)}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    onSelectShelter({ ...site, coords });
                    setTargetView({ center: coords, zoom: 14 });
                  },
                }}
              >
                <Popup>
                  <div className="text-xs p-1 min-w-[230px] font-sans">
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/70 px-2 py-0.5 rounded-md w-fit">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>GOVERNMENT SAFE SHELTER</span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm mt-1 leading-snug">{site.name}</h4>
                    <p className="text-slate-500 text-[11px] mb-2 font-medium">📍 {site.district} District</p>

                    <div className="space-y-1.5 bg-blue-50/60 dark:bg-slate-800 p-2.5 rounded-xl border border-blue-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 mb-2.5 text-[11px]">
                      <div className="flex justify-between">
                        <span>Available Space:</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {site.available ? site.available.toLocaleString() : "Open"} Beds
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Capacity:</span>
                        <strong>{site.capacity ? site.capacity.toLocaleString() : "N/A"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Road Connectivity:</span>
                        <strong>{site.accessibility || "Good"}</strong>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onSelectShelter({ ...site, coords });
                        }}
                        className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow flex items-center justify-center gap-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Show Directions on Map</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${coords[0]},${coords[1]}`;
                          window.open(url, "_blank");
                        }}
                        className="w-full py-1.5 px-3 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                        <span>Navigate in Google Maps App</span>
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* ===================================================================== */}
      {/* GOOGLE MAPS STYLE FLOATING CONTROLS                                  */}
      {/* ===================================================================== */}

      {/* 1. TOP-LEFT ACTIVE TELEMETRY HUD (When Shortest Route is active) */}
      {roadRoute && activeTargetShelter && (
        <div className="absolute top-3 left-3 z-[1000] max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3.5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow flex-shrink-0 mt-0.5">
              <Navigation className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-emerald-600 dark:text-emerald-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                  <span>⚡ Shortest Safe Path Selected</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                  {roadRoute.isRoadNetwork ? "Road Verified" : "Direct Vector"}
                </span>
              </div>
              <p className="text-slate-900 dark:text-white font-bold text-xs mt-1 truncate">
                To Safe Shelter: <span className="text-blue-600 dark:text-blue-400">{activeTargetShelter.name}</span>
              </p>
              {selectedHabitation && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  From: <strong className="text-red-600 dark:text-red-400">⚠️ {selectedHabitation.name}</strong> (Danger Zone)
                </p>
              )}
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-700 dark:text-slate-200 font-bold">
                <span>🛣️ Distance: <strong className="text-emerald-600 dark:text-emerald-400">{roadRoute.distanceKm} km</strong></span>
                <span>⏱️ Transit: <strong>~{roadRoute.durationMinutes} mins</strong></span>
              </div>
              <button
                onClick={openGoogleMapsDirections}
                className="mt-2 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Open Turn-by-Turn GPS in Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. BOTTOM-LEFT GOOGLE MAPS BASE LAYER TOGGLE */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 transition active:scale-95"
            title="Switch Map Layers"
          >
            <span className="text-base">{activeBaseObj.icon}</span>
            <span>{activeBaseObj.name}</span>
            <Layers className="w-3.5 h-3.5 text-blue-600" />
          </button>

          {showLayerMenu && (
            <div className="absolute bottom-12 left-0 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Google Maps Views
              </p>
              {Object.entries(BASE_MAPS).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => {
                    setBaseMap(key);
                    setShowLayerMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    baseMap === key
                      ? "bg-blue-600 text-white font-bold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </span>
                  {baseMap === key && <span className="text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. BOTTOM-RIGHT GOOGLE-STYLE CONTROLS (Zoom +, Zoom -, Locate Me, Fullscreen) */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col items-center gap-2">
        {/* GPS Locate Me */}
        <button
          onClick={handleLocateMe}
          disabled={locating}
          className="p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 transition active:scale-90"
          title="Locate Me (GPS)"
        >
          {locating ? (
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
          ) : (
            <Crosshair className="w-4 h-4 text-blue-600" />
          )}
        </button>

        {/* Zoom Controls */}
        <div className="flex flex-col rounded-xl overflow-hidden shadow-xl border border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md divide-y divide-slate-200 dark:divide-slate-700">
          <button
            onClick={handleZoomIn}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition active:scale-95"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition active:scale-95"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={handleToggleFullscreen}
          className="p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-90"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* 4. Google Maps Watermark badge in corner */}
      <div className="absolute bottom-1 right-24 z-[999] pointer-events-none opacity-80 text-[10px] font-bold text-slate-600 dark:text-slate-400">
        Google Maps Infrastructure
      </div>

      {/* 5. Government Tactical Inspector Drawer (only in gov view) */}
      {variant === "gov" && selectedHabitation && (
        <LiveRiskInspector
          habitation={selectedHabitation}
          onClose={() => onSelectHabitation(null)}
        />
      )}
    </div>
  );
}
