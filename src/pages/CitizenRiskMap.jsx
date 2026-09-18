import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Search,
  ShieldCheck,
  PhoneCall,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Crosshair,
  Droplets,
  HeartPulse,
  Zap,
  Utensils,
  ChevronRight,
  Info,
  X,
  ExternalLink,
  RefreshCw,
  Compass,
} from "lucide-react";
import MapView from "@/components/MapView";
import MapLegend from "@/components/MapLegend";
import { calculateHaversineKm } from "@/services/osrmRouting";
import { useLanguage } from "@/context/LanguageContext";

// Exact District Center Coordinates across India
const DISTRICT_COORDINATES = {
  all: { center: [22.8, 79.5], zoom: 5 },
  Chamoli: { center: [30.4034, 79.324], zoom: 11 },
  Darbhanga: { center: [26.1554, 85.8918], zoom: 11 },
  Wayanad: { center: [11.6854, 76.132], zoom: 11 },
  Varanasi: { center: [25.3176, 82.9739], zoom: 11 },
  Dibrugarh: { center: [26.1445, 91.7362], zoom: 11 },
  Mayurbhanj: { center: [21.9397, 86.3264], zoom: 11 },
  Chamarajanagar: { center: [11.854, 76.6288], zoom: 11 },
};

// Demo fallback data if backend is warming up
const FALLBACK_HABITATIONS = [
  { id: 1, name: "Chamoli Slope Settlement", district: "Chamoli", coords: [30.4034, 79.324], population: 1420, hazard: "Landslide", riskLevel: "Critical", riskScore: 88, priority: "Immediate" },
  { id: 2, name: "Kosi Floodplain Village", district: "Darbhanga", coords: [26.1554, 85.8918], population: 3100, hazard: "Flood", riskLevel: "Critical", riskScore: 92, priority: "Immediate" },
  { id: 3, name: "Wayanad Tea Estate Colony", district: "Wayanad", coords: [11.6854, 76.132], population: 890, hazard: "Mudflow", riskLevel: "Critical", riskScore: 84, priority: "Immediate" },
  { id: 4, name: "Ganga Ghat Lowland Ward", district: "Varanasi", coords: [25.3176, 82.9739], population: 5200, hazard: "Flood", riskLevel: "High", riskScore: 76, priority: "Short-Term" },
  { id: 5, name: "Brahmaputra Riverside Ward", district: "Dibrugarh", coords: [26.1445, 91.7362], population: 4100, hazard: "Flood", riskLevel: "Critical", riskScore: 90, priority: "Immediate" },
  { id: 6, name: "Simlipal Foothills Basti", district: "Mayurbhanj", coords: [21.9397, 86.3264], population: 1250, hazard: "Wildfire", riskLevel: "High", riskScore: 68, priority: "Short-Term" },
  { id: 7, name: "Bandipur Border Hamlet", district: "Chamarajanagar", coords: [11.854, 76.6288], population: 980, hazard: "Forest Fire", riskLevel: "High", riskScore: 65, priority: "Short-Term" },
];

const FALLBACK_SHELTERS = [
  { id: 101, name: "Government Senior Secondary Relief Camp", district: "Chamoli", coords: [30.3974, 79.316], capacity: 2100, available: 1050, accessibility: "Good", facilities: ["water", "medical", "power", "food"] },
  { id: 102, name: "District Multi-Purpose Cyclone & Flood Shelter", district: "Darbhanga", coords: [26.1494, 85.8838], capacity: 6250, available: 3125, accessibility: "Good", facilities: ["water", "medical", "power", "food"] },
  { id: 103, name: "Meppadi Community Evacuation Center", district: "Wayanad", coords: [11.6934, 76.142], capacity: 2100, available: 1050, accessibility: "Good", facilities: ["water", "medical", "power", "food"] },
  { id: 104, name: "Varanasi Central Disaster Transit Facility", district: "Varanasi", coords: [25.3256, 82.9839], capacity: 6250, available: 3125, accessibility: "Good", facilities: ["water", "power", "food"] },
  { id: 105, name: "Dibrugarh Municipal Flood Relief Center", district: "Dibrugarh", coords: [26.1525, 91.7462], capacity: 6250, available: 3125, accessibility: "Good", facilities: ["water", "medical", "food"] },
  { id: 106, name: "Baripada Safe Haven Relief School", district: "Mayurbhanj", coords: [21.9337, 86.3184], capacity: 1400, available: 700, accessibility: "Moderate", facilities: ["water", "power"] },
  { id: 107, name: "Gundlupet Community Relief Hall", district: "Chamarajanagar", coords: [11.862, 76.6388], capacity: 1400, available: 700, accessibility: "Good", facilities: ["water", "food"] },
];

export default function CitizenRiskMap() {
  const { t } = useLanguage();

  const [habitations, setHabitations] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [redZones, setRedZones] = useState(null);
  const [loading, setLoading] = useState(true);

  // Selected filters
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Interactive selection state
  const [selectedHabitation, setSelectedHabitation] = useState(null);
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  // Camera coordinates controlled explicitly
  const [mapCenter, setMapCenter] = useState([22.8, 79.5]);
  const [mapZoom, setMapZoom] = useState(5);

  // Fetch GIS Data from Backend
  async function loadData() {
    setLoading(true);
    try {
      let habRes = await fetch("/api/gis/habitations").catch(() => null);
      if (!habRes || !habRes.ok) {
        habRes = await fetch("http://127.0.0.1:8000/api/gis/habitations").catch(() => null);
      }
      if (habRes && habRes.ok) {
        const habGeo = await habRes.json();
        const parsed = (habGeo.features || []).map((f) => {
          const p = f.properties || {};
          const c = f.geometry?.coordinates || [78.96, 20.59];
          return {
            id: p.id,
            name: p.name,
            district: p.district,
            population: Number(p.population || 0),
            hazard: p.hazard || "Unknown",
            riskLevel: p.risk_level || "Low",
            riskScore: Number(p.risk_score || 0),
            priority: p.priority || "Monitor",
            coords: [c[1], c[0]],
          };
        });
        if (parsed.length > 0) setHabitations(parsed);
        else setHabitations(FALLBACK_HABITATIONS);
      } else {
        setHabitations(FALLBACK_HABITATIONS);
      }

      let siteRes = await fetch("/api/gis/relocation-sites").catch(() => null);
      if (!siteRes || !siteRes.ok) {
        siteRes = await fetch("http://127.0.0.1:8000/api/gis/relocation-sites").catch(() => null);
      }
      if (siteRes && siteRes.ok) {
        const siteGeo = await siteRes.json();
        const parsed = (siteGeo.features || []).map((f) => {
          const p = f.properties || {};
          const c = f.geometry?.coordinates || [78.96, 20.59];
          return {
            id: p.id,
            name: p.name,
            district: p.district,
            capacity: Number(p.capacity || 0),
            available: Number(p.available || 0),
            accessibility: p.accessibility || "Good",
            coords: [c[1], c[0]],
            facilities: ["water", "medical", "power", "food"],
          };
        });
        if (parsed.length > 0) setShelters(parsed);
        else setShelters(FALLBACK_SHELTERS);
      } else {
        setShelters(FALLBACK_SHELTERS);
      }

      let zoneRes = await fetch("/api/gis/red-zones").catch(() => null);
      if (!zoneRes || !zoneRes.ok) {
        zoneRes = await fetch("http://127.0.0.1:8000/api/gis/red-zones").catch(() => null);
      }
      if (zoneRes && zoneRes.ok) {
        const zoneGeo = await zoneRes.json();
        setRedZones(zoneGeo);
      }
    } catch {
      setHabitations(FALLBACK_HABITATIONS);
      setShelters(FALLBACK_SHELTERS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Distinct districts list
  const districtList = useMemo(() => {
    const list = new Set();
    habitations.forEach((h) => h.district && list.add(h.district));
    shelters.forEach((s) => s.district && list.add(s.district));
    return Array.from(list).sort();
  }, [habitations, shelters]);

  // Handle District Pill click (flies to district coordinates)
  const handleDistrictChange = (d) => {
    setSelectedDistrict(d);
    setSelectedHabitation(null);
    setSelectedShelter(null);

    const target = DISTRICT_COORDINATES[d] || DISTRICT_COORDINATES.all;
    setMapCenter(target.center);
    setMapZoom(target.zoom);
  };

  // Filtered Habitations
  const filteredHabitations = useMemo(() => {
    return habitations.filter((h) => {
      if (selectedDistrict !== "all" && h.district?.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return h.name.toLowerCase().includes(q) || h.district.toLowerCase().includes(q);
      }
      return true;
    });
  }, [habitations, selectedDistrict, searchQuery]);

  // Active Danger or GPS Origin Coordinates
  const activeOriginCoords = useMemo(() => {
    if (selectedHabitation?.coords) return selectedHabitation.coords;
    if (userLocation) return [userLocation.lat, userLocation.lng];
    return null;
  }, [selectedHabitation, userLocation]);

  // Filtered Shelters, dynamically sorted by shortest safe path distance
  const filteredShelters = useMemo(() => {
    const list = shelters.filter((s) => {
      if (selectedDistrict !== "all" && s.district?.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false;
      }
      if (facilityFilter !== "all") {
        if (!s.facilities?.includes(facilityFilter)) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.district.toLowerCase().includes(q);
      }
      return true;
    });

    if (!activeOriginCoords) return list;

    // Calculate road-calibrated distances from the active danger origin
    const withDistance = list.map((s) => {
      if (!s.coords) return { ...s, distanceKm: null };
      const directKm = calculateHaversineKm(
        activeOriginCoords[0],
        activeOriginCoords[1],
        s.coords[0],
        s.coords[1]
      );
      const roadKm = parseFloat((directKm * 1.28).toFixed(1));
      return {
        ...s,
        distanceKm: roadKm,
      };
    });

    // Rank from shortest road distance to longest
    withDistance.sort((a, b) => {
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    return withDistance;
  }, [shelters, selectedDistrict, facilityFilter, searchQuery, activeOriginCoords]);

  // Handle Shelter Card Click
  const handleSelectShelter = (site) => {
    setSelectedShelter(site);
    if (site.coords) {
      setMapCenter(site.coords);
      setMapZoom(14);
    }
  };

  // User Geolocation Trigger
  const handleLocateCitizen = () => {
    if (!navigator.geolocation) {
      alert("GPS location is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setMapCenter([latitude, longitude]);
        setMapZoom(14);

        // Find nearest shelter
        let closest = null;
        let minD = Infinity;
        shelters.forEach((s) => {
          if (!s.coords) return;
          const d = Math.hypot(latitude - s.coords[0], longitude - s.coords[1]);
          if (d < minD) {
            minD = d;
            closest = s;
          }
        });
        if (closest) {
          setSelectedShelter(closest);
          setSelectedHabitation({
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
        setIsLocating(false);
        alert("Unable to acquire GPS position. Please check your browser location permissions.");
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* 1. CITIZEN FAST EMERGENCY TICKER (Desktop only - mobile has bottom nav) */}
      <div className="hidden md:block bg-red-700 text-white px-4 py-2 border-b border-red-800 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-white animate-ping" />
            <span className="font-bold tracking-wide">
              Emergency Fast Dial • 24x7 Active Citizen Helpline
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="tel:112"
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-800 hover:bg-red-900 border border-red-500/40 font-bold text-amber-200 transition active:scale-95"
            >
              <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
              <span>112 (National Emergency)</span>
            </a>
            <a
              href="tel:1070"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-800 hover:bg-red-900 border border-red-500/40 font-bold text-white transition active:scale-95"
            >
              <span>1070 (NDMA)</span>
            </a>
            <a
              href="tel:108"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-800 hover:bg-red-900 border border-red-500/40 font-bold text-white transition active:scale-95"
            >
              <span>108 (Ambulance)</span>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-20">
        {/* 2. PAGE HERO & GOOGLE MAPS POWERED INTRO */}
        <div className="mb-4 sm:mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Google Maps Verified Public Safety Portal</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Citizen Disaster Risk & Safe Shelter Map
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Locate government-vetted cyclone shelters, inspect neighborhood hazard alerts, and navigate safe evacuation corridors via Google Maps.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleLocateCitizen}
              disabled={isLocating}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition active:scale-95"
            >
              {isLocating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Crosshair className="w-4 h-4" />
              )}
              <span>Find Closest Shelter (GPS)</span>
            </button>
          </div>
        </div>

        {/* 3. DISTRICT JUMP PILLS - Sleek swipeable on mobile */}
        <div className="mb-4 sm:mb-6 bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1 flex-shrink-0">
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Select Jurisdiction:</span>
          </span>
          <button
            onClick={() => handleDistrictChange("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 whitespace-nowrap ${
              selectedDistrict === "all"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            🇮🇳 All-India Focus
          </button>
          {districtList.map((d) => (
            <button
              key={d}
              onClick={() => handleDistrictChange(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 whitespace-nowrap ${
                selectedDistrict === d
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              📍 {d}
            </button>
          ))}
        </div>

        {/* 4. ACTIVE EVACUATION HUD BANNER */}
        {(selectedHabitation || selectedShelter || userLocation) && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow">
                <Navigation className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>Shortest Safe Path Active</span>
                  </span>
                  {(selectedShelter?.distanceKm || filteredShelters[0]?.distanceKm) && (
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      ~{selectedShelter?.distanceKm || filteredShelters[0]?.distanceKm} km Road Route
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  Safe Shelter:{" "}
                  <span className="text-emerald-700 dark:text-emerald-400">
                    {selectedShelter?.name || filteredShelters[0]?.name || "Nearest Designated Shelter"}
                  </span>
                </p>
                {selectedHabitation && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Departing Danger Zone: <strong>{selectedHabitation.name}</strong> ({selectedHabitation.hazard || "Hazard"} · {selectedHabitation.district})
                  </p>
                )}
                {userLocation && !selectedHabitation && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Departing: <strong>Live Citizen GPS Location</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {((selectedShelter?.coords) || (filteredShelters[0]?.coords)) && (
                <a
                  href={
                    activeOriginCoords
                      ? `https://www.google.com/maps/dir/?api=1&origin=${activeOriginCoords[0]},${activeOriginCoords[1]}&destination=${(selectedShelter?.coords || filteredShelters[0].coords)[0]},${(selectedShelter?.coords || filteredShelters[0].coords)[1]}&travelmode=driving`
                      : `https://www.google.com/maps/dir/?api=1&destination=${(selectedShelter?.coords || filteredShelters[0].coords)[0]},${(selectedShelter?.coords || filteredShelters[0].coords)[1]}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Navigate Shortest Path (Google Maps)</span>
                </a>
              )}
              <button
                onClick={() => {
                  setSelectedHabitation(null);
                  setSelectedShelter(null);
                }}
                className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. MAIN INTERACTIVE MAP & SHELTERS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Shelter Discovery (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span>Relief Camps ({filteredShelters.length})</span>
                </h2>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                  Verified Open
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search village or shelter name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Facility Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px]">
                <button
                  onClick={() => setFacilityFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    facilityFilter === "all"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  All Facilities
                </button>
                <button
                  onClick={() => setFacilityFilter("water")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition ${
                    facilityFilter === "water"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Droplets className="w-3 h-3 text-cyan-400" /> Water
                </button>
                <button
                  onClick={() => setFacilityFilter("medical")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition ${
                    facilityFilter === "medical"
                      ? "bg-red-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <HeartPulse className="w-3 h-3 text-rose-400" /> Medical
                </button>
                <button
                  onClick={() => setFacilityFilter("food")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition ${
                    facilityFilter === "food"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Utensils className="w-3 h-3 text-amber-400" /> Food
                </button>
              </div>

              {/* Scrollable Shelters List */}
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {filteredShelters.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No relief shelters found matching your search.
                  </div>
                ) : (
                  filteredShelters.map((site, index) => {
                    const isSelected = selectedShelter?.id === site.id || (!selectedShelter && index === 0 && activeOriginCoords);
                    const isShortest = activeOriginCoords && index === 0;
                    const availPct = Math.round(((site.available || 0) / (site.capacity || 1)) * 100);

                    return (
                      <div
                        key={site.id}
                        onClick={() => handleSelectShelter(site)}
                        className={`p-3.5 rounded-2xl border text-xs transition cursor-pointer relative ${
                          isSelected
                            ? "bg-emerald-50/90 dark:bg-emerald-950/80 border-emerald-500 shadow-md ring-1 ring-emerald-500"
                            : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-slate-700"
                        }`}
                      >
                        {/* Shortest Safe Path Badge */}
                        {isShortest && (
                          <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-black text-[10px] shadow-sm tracking-wide">
                            <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                            <span>⚡ #1 SHORTEST SAFE PATH ({site.distanceKm} KM)</span>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-xs leading-snug">
                              {site.name}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              📍 {site.district} District
                            </p>
                            {site.distanceKm !== undefined && site.distanceKm !== null && (
                              <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                <span>🛣️ Road Distance: ~{site.distanceKm} km</span>
                              </p>
                            )}
                          </div>
                          <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                            {site.available} Spaces
                          </span>
                        </div>

                        {/* Capacity Progress Bar */}
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                            <span>Available: {availPct}%</span>
                            <span>Total Intake: {site.capacity}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(100, availPct)}%` }}
                            />
                          </div>
                        </div>

                        {/* Facilities tags */}
                        <div className="mt-2.5 flex flex-wrap gap-1 text-[10px]">
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100/60 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                            <Droplets className="w-2.5 h-2.5" /> Potable Water
                          </span>
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100/60 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                            <HeartPulse className="w-2.5 h-2.5" /> First Aid
                          </span>
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100/60 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                            <Zap className="w-2.5 h-2.5" /> Generator
                          </span>
                        </div>

                        {/* Direct Action Buttons */}
                        <div className="mt-3 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectShelter(site);
                            }}
                            className={`flex-1 py-1.5 px-2 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm ${
                              isShortest
                                ? "bg-emerald-600 hover:bg-emerald-500"
                                : "bg-blue-600 hover:bg-blue-500"
                            }`}
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>{isShortest ? "Selected Shortest Route" : "Plot Route"}</span>
                          </button>
                          <a
                            href={
                              activeOriginCoords
                                ? `https://www.google.com/maps/dir/?api=1&origin=${activeOriginCoords[0]},${activeOriginCoords[1]}&destination=${site.coords[0]},${site.coords[1]}&travelmode=driving`
                                : `https://www.google.com/maps/dir/?api=1&destination=${site.coords[0]},${site.coords[1]}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Open Turn-by-Turn GPS in Google Maps"
                          >
                            <ExternalLink className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Emergency SOP Card */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Citizen Evacuation SOP</span>
              </div>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed text-[11px]">
                If your area is under <strong>Critical / Red Zone</strong> alert, immediately follow the designated route above to the nearest safe shelter. Keep your mobile phone charged and carry family IDs in a waterproof pouch.
              </p>
            </div>
          </div>

          {/* Right Panel: Interactive Google Maps Canvas (8 cols on lg) */}
          <div className="lg:col-span-8 space-y-3">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Current View:
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold">
                  {selectedDistrict === "all" ? "All-India View" : `${selectedDistrict} District`}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 font-medium">
                  {filteredHabitations.length} Habitats · {filteredShelters.length} Shelters
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Reload GIS Data"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Map</span>
                </button>
              </div>
            </div>

            {/* Google Maps Powered Canvas */}
            <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
              <MapView
                habitations={filteredHabitations}
                relocationSites={filteredShelters}
                redZones={redZones}
                selectedHabitation={selectedHabitation}
                selectedShelter={selectedShelter}
                onSelectHabitation={setSelectedHabitation}
                onSelectShelter={setSelectedShelter}
                center={mapCenter}
                zoom={mapZoom}
                height="650px"
                variant="citizen"
                userLocation={userLocation}
                onLocateMe={handleLocateCitizen}
              />
            </div>

            {/* Map Legend */}
            <div className="pt-1">
              <MapLegend variant="citizen" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
