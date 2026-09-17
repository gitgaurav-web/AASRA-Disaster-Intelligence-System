import { useEffect, useState, useMemo, useRef } from "react";
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
  Info,
  Compass,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import LiveRiskInspector from "./LiveRiskInspector";
import { getEvacuationRoute } from "../services/osrmRouting";

// Custom SVG Icons (Zero external HTTP dependencies for maximum reliability)
const createHabitationIcon = (riskLevel, isSelected) => {
  const colorMap = {
    Critical: "#ef4444",
    High: "#f97316",
    Moderate: "#eab308",
    Low: "#22c55e",
  };
  const color = colorMap[riskLevel] || "#22c55e";
  const size = isSelected ? 24 : 18;
  const isCritical = riskLevel === "Critical";

  return L.divIcon({
    className: "custom-hab-marker",
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        ${
          isCritical
            ? `<div style="position: absolute; inset: -4px; border-radius: 50%; background-color: rgba(239,68,68,0.4); animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>`
            : ""
        }
        <div style="
          background-color: ${color};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: ${isSelected ? "3px solid #ffffff" : "2px solid #ffffff"};
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        ">
          <div style="width: 5px; height: 5px; border-radius: 50%; background: white;"></div>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const createShelterIcon = (isSelected) => {
  const size = isSelected ? 30 : 24;
  return L.divIcon({
    className: "custom-shelter-marker",
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="
          background-color: #2563eb;
          width: ${size}px;
          height: ${size}px;
          border-radius: 6px;
          border: 2px solid #ffffff;
          box-shadow: 0 3px 10px rgba(37,99,235,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 13px;
          line-height: 1;
        ">
          🏛️
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const createUserIcon = () => {
  return L.divIcon({
    className: "custom-user-marker",
    html: `
      <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; border-radius: 50%; background-color: rgba(59,130,246,0.4); animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="
          background-color: #2563eb;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 3px solid #ffffff;
          box-shadow: 0 0 10px rgba(37,99,235,0.8);
        "></div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
};

// Base map configurations with high-reliability CDNs
const BASE_MAPS = {
  streets: {
    name: "Street Map",
    icon: "🗺️",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satellite: {
    name: "Satellite",
    icon: "🛰️",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri &mdash; Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
  dark: {
    name: "Tactical Dark",
    icon: "🌙",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
  osm: {
    name: "OpenStreetMap",
    icon: "🌐",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
};

// Sub-component that handles auto-resize and camera motion inside MapContainer
function MapController({ center, zoom, bounds, resizeTrigger }) {
  const map = useMap();

  // Invalidate size multiple times to eliminate grey/blank tiles completely
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 350);
    const t3 = setTimeout(() => map.invalidateSize(), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [map, resizeTrigger]);

  // Window resize listener
  useEffect(() => {
    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [map]);

  // Auto-fit bounds or fly to center
  useEffect(() => {
    if (bounds && bounds.isValid && bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 12,
        animate: true,
        duration: 0.8,
      });
    } else if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom(), {
        animate: true,
        duration: 0.8,
      });
    }
  }, [center, zoom, bounds, map]);

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
  center = [22.5, 79.0],
  zoom = 5,
  height = "600px",
  showSites = true,
  showHabitations = true,
  showRedZones = true,
  variant = "gov", // "gov" | "citizen"
  userLocation = null,
  onLocateMe = null,
}) {
  const [baseMap, setBaseMap] = useState(variant === "gov" ? "dark" : "streets");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [indiaBoundary, setIndiaBoundary] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [locating, setLocating] = useState(false);
  const containerRef = useRef(null);

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
        return "#dc2626";
      case "High":
        return "#ea580c";
      case "Moderate":
        return "#ca8a04";
      default:
        return "#16a34a";
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

  // Find target shelter for selected habitation
  const selHabCoords = selectedHabitation ? getCoords(selectedHabitation) : null;
  const targetShelter = useMemo(() => {
    if (selectedShelter) return selectedShelter;
    if (!selectedHabitation || !selHabCoords || relocationSites.length === 0) return null;

    let minD = Infinity;
    let best = null;
    for (const site of relocationSites) {
      const sCoords = getCoords(site);
      if (!sCoords) continue;
      const d =
        Math.pow(selHabCoords[0] - sCoords[0], 2) +
        Math.pow(selHabCoords[1] - sCoords[1], 2);
      if (d < minD) {
        minD = d;
        best = { ...site, coords: sCoords };
      }
    }
    return best;
  }, [selectedHabitation, selectedShelter, selHabCoords, relocationSites]);

  // Road Routing calculation
  const [roadRoute, setRoadRoute] = useState(null);
  useEffect(() => {
    const originCoords = selHabCoords || (userLocation ? [userLocation.lat, userLocation.lng] : null);
    const destCoords = targetShelter ? getCoords(targetShelter) : null;

    if (originCoords && destCoords) {
      let mounted = true;
      getEvacuationRoute(originCoords, destCoords).then((route) => {
        if (mounted && route) setRoadRoute(route);
      });
      return () => {
        mounted = false;
      };
    } else {
      setRoadRoute(null);
    }
  }, [selectedHabitation?.id, targetShelter?.id, userLocation]);

  const fallbackRoute =
    (selHabCoords || (userLocation ? [userLocation.lat, userLocation.lng] : null)) &&
    targetShelter
      ? [
          selHabCoords || [userLocation.lat, userLocation.lng],
          getCoords(targetShelter),
        ]
      : null;

  const activeCorridorCoords = roadRoute?.coordinates || fallbackRoute;

  // Calculate dynamic bounding box of all markers for optimal view
  const autoBounds = useMemo(() => {
    const points = [];
    if (showHabitations) {
      habitations.forEach((h) => {
        const c = getCoords(h);
        if (c) points.push(c);
      });
    }
    if (showSites) {
      relocationSites.forEach((s) => {
        const c = getCoords(s);
        if (c) points.push(c);
      });
    }
    if (userLocation) {
      points.push([userLocation.lat, userLocation.lng]);
    }
    if (points.length >= 2) {
      return L.latLngBounds(points);
    }
    return null;
  }, [habitations, relocationSites, showHabitations, showSites, userLocation]);

  // Fullscreen toggle handler
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
  };

  // Internal Geolocation handler
  const handleTriggerLocate = () => {
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
        if (onSelectHabitation) {
          onSelectHabitation({
            id: "user-gps",
            name: "Your Current Location",
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
        alert("Unable to acquire your GPS location. Please ensure location services are enabled.");
      },
      { timeout: 8000 }
    );
  };

  const activeBaseObj = BASE_MAPS[baseMap] || BASE_MAPS.streets;

  return (
    <div
      ref={containerRef}
      style={{
        height: isFullscreen ? "100vh" : height,
        width: "100%",
      }}
      className="relative rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-800 shadow-md font-sans z-0 bg-slate-900"
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        {/* Core Controller for sizing, recentering, and bounds fitting */}
        <MapController
          center={center}
          zoom={zoom}
          bounds={autoBounds}
          resizeTrigger={`${height}-${isFullscreen}-${baseMap}`}
        />

        {/* Dynamic Base Tile Layer */}
        <TileLayer
          key={baseMap}
          url={activeBaseObj.url}
          attribution={activeBaseObj.attribution}
          maxZoom={activeBaseObj.maxZoom}
        />

        {/* Official India Administrative Border */}
        {indiaBoundary && (
          <GeoJSON
            data={indiaBoundary}
            style={{
              color: variant === "gov" ? "#38bdf8" : "#2563eb",
              weight: 2,
              opacity: 0.7,
              fillOpacity: 0,
            }}
          />
        )}

        {/* Hazard Red Zones / Screening Buffers */}
        {showRedZones && redZones && (
          <GeoJSON
            data={redZones}
            style={(f) => ({
              color: f?.properties?.risk_level === "Critical" ? "#dc2626" : "#ea580c",
              weight: 2,
              fillColor: f?.properties?.risk_level === "Critical" ? "#ef4444" : "#f97316",
              fillOpacity: 0.18,
              dashArray: "4, 4",
            })}
            onEachFeature={(f, layer) => {
              const p = f.properties || {};
              layer.bindPopup(`
                <div style="font-size:12px; font-family:sans-serif; min-width:180px;">
                  <strong style="color:#b91c1c;">⚠️ ${p.name || "Risk Screening Zone"}</strong>
                  <div style="margin-top:4px; font-size:11px; color:#475569;">
                    Hazard: <strong>${p.hazard || "Multi-Hazard"}</strong><br/>
                    Risk Level: <strong>${p.risk_level || "Critical"}</strong><br/>
                    Buffer: <em>${p.classification || "Official Screening"}</em>
                  </div>
                </div>
              `);
            }}
          />
        )}

        {/* Active Evacuation Road Corridor Polyline */}
        {activeCorridorCoords && (
          <Polyline
            positions={activeCorridorCoords}
            pathOptions={{
              color: roadRoute?.isRoadNetwork ? "#2563eb" : "#dc2626",
              weight: roadRoute?.isRoadNetwork ? 5 : 4,
              dashArray: roadRoute?.isRoadNetwork ? undefined : "6, 6",
              opacity: 0.95,
            }}
          />
        )}

        {/* User GPS Location Marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserIcon()}>
            <Popup>
              <div className="p-1 text-xs">
                <p className="font-bold text-blue-700">📍 You Are Here</p>
                <p className="text-[11px] text-slate-500">Live GPS Coordinates</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Habitations / Settlements Markers */}
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
                  },
                }}
              >
                <Popup>
                  <div className="text-xs p-1 min-w-[210px] font-sans">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-slate-900 text-sm">{hab.name}</span>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-black text-white"
                        style={{ backgroundColor: getRiskColor(riskLevel) }}
                      >
                        {riskLevel} Risk
                      </span>
                    </div>

                    <p className="text-slate-500 text-[11px] mb-2 font-medium">
                      📍 {hab.district} District
                    </p>

                    <div className="space-y-1 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 mb-2.5 text-[11px]">
                      <div className="flex justify-between">
                        <span>Hazard Exposure:</span>
                        <strong className="text-red-600 dark:text-red-400">{hab.hazard}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Resident Population:</span>
                        <strong>{hab.population ? hab.population.toLocaleString() : "N/A"}</strong>
                      </div>
                      {hab.riskScore !== undefined && (
                        <div className="flex justify-between">
                          <span>Risk Index:</span>
                          <strong>{Number(hab.riskScore).toFixed(1)} / 100</strong>
                        </div>
                      )}
                      {hab.priority && (
                        <div className="flex justify-between">
                          <span>Relocation Priority:</span>
                          <strong className="text-blue-600 dark:text-blue-400">{hab.priority}</strong>
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
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition shadow flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? "bg-rose-600 hover:bg-rose-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{isSelected ? "Clear Evacuation Route" : "Show Safe Evacuation Route"}</span>
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Designated Safe Shelters / Relief Camps */}
        {showSites &&
          relocationSites.map((site) => {
            const coords = getCoords(site);
            if (!coords || !coords[0] || !coords[1]) return null;

            const isSelected = targetShelter?.id === site.id;

            return (
              <Marker
                key={`site-${site.id}`}
                position={coords}
                icon={createShelterIcon(isSelected)}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    onSelectShelter({ ...site, coords });
                  },
                }}
              >
                <Popup>
                  <div className="text-xs p-1 min-w-[210px] font-sans">
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded w-fit">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>OFFICIAL SAFE SHELTER</span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm mt-1">{site.name}</h4>
                    <p className="text-slate-500 text-[11px] mb-2">{site.district} District</p>

                    <div className="space-y-1 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 mb-2.5 text-[11px]">
                      <div className="flex justify-between">
                        <span>Available Spaces:</span>
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {site.available ? site.available.toLocaleString() : "Open"}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Capacity:</span>
                        <strong>{site.capacity ? site.capacity.toLocaleString() : "N/A"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Road Accessibility:</span>
                        <strong>{site.accessibility || "Good"}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onSelectShelter({ ...site, coords });
                      }}
                      className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow flex items-center justify-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Direct Route to this Shelter</span>
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* FLOATING MAP CONTROLS OVERLAY */}
      {/* 1. Top Right Controls (Layer Switcher + GPS + Fullscreen) */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
        {/* Locate Me Button */}
        <button
          onClick={handleTriggerLocate}
          disabled={locating}
          className="p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 transition active:scale-95 flex items-center gap-1 text-xs font-bold"
          title="Locate my GPS coordinates"
        >
          {locating ? (
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
          ) : (
            <Crosshair className="w-4 h-4 text-blue-600" />
          )}
          <span className="hidden sm:inline">My Location</span>
        </button>

        {/* Base Layer Switcher Button */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5 text-xs font-bold"
            title="Change Map View"
          >
            <Layers className="w-4 h-4 text-amber-500" />
            <span className="hidden md:inline">{activeBaseObj.name}</span>
          </button>

          {showLayerMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Base Map Layer
              </p>
              {Object.entries(BASE_MAPS).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => {
                    setBaseMap(key);
                    setShowLayerMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    baseMap === key
                      ? "bg-blue-600 text-white"
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

        {/* Fullscreen Button */}
        <button
          onClick={handleToggleFullscreen}
          className="p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          title={isFullscreen ? "Exit Fullscreen" : "View Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* 2. Top Left Evacuation Telemetry HUD */}
      {roadRoute && targetShelter && (
        <div className="absolute top-3 left-3 z-[1000] max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow flex-shrink-0 mt-0.5">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-900 dark:text-white">Active Evacuation Corridor</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  {roadRoute.isRoadNetwork ? "Real Road Route" : "Direct Vector"}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 mt-1 font-medium">
                Destination: <strong className="text-blue-600 dark:text-blue-400">{targetShelter.name}</strong>
              </p>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                <span>🛣️ Distance: <strong className="text-slate-900 dark:text-white">{roadRoute.distanceKm} km</strong></span>
                <span>⏱️ Est. Time: <strong className="text-slate-900 dark:text-white">~{roadRoute.durationMinutes} mins</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Government Tactical Inspector Drawer */}
      {variant === "gov" && selectedHabitation && (
        <LiveRiskInspector
          habitation={selectedHabitation}
          onClose={() => onSelectHabitation(null)}
        />
      )}
    </div>
  );
}
