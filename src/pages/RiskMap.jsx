import { useEffect, useState, useMemo } from "react";
import { PageHeader, Disclaimer } from "@/components/Layout";
import {
  Map as MapIcon,
  SlidersHorizontal,
  RefreshCw,
  AlertTriangle,
  MapPin,
  ShieldCheck,
  Navigation,
  X,
  Lock,
  Compass,
  Radio,
  Building,
  ShieldAlert,
  Layers,
  RotateCcw,
} from "lucide-react";

import MapView from "@/components/MapView";
import MapLegend from "@/components/MapLegend";
import FilterPanel from "@/components/FilterPanel";
import ScenarioSandbox from "@/components/ScenarioSandbox";
import {
  STATE_COORDINATES,
  getStateForDistrict,
  getDistrictsForState,
  ALL_STATES,
} from "@/data/jurisdictionData";

// High-fidelity fallback GIS points for national demonstration resilience
const DEFAULT_HABITATIONS = [
  { id: 1, name: "Chamoli Rockfall & Slope Instability", district: "Chamoli", state: "Uttarakhand", coords: [30.4034, 79.324], population: 1420, households: 315, hazard: "Landslide", riskScore: 88, riskLevel: "Critical", vulnerability: "Very High", accessibility: "Poor", capacityDeficit: 850, capacityStatus: "Critical Deficit", priority: "Immediate", status: "Active" },
  { id: 2, name: "Kosi River Embankment Threat", district: "Darbhanga", state: "Bihar", coords: [26.1554, 85.8918], population: 3100, households: 688, hazard: "Flood", riskScore: 92, riskLevel: "Critical", vulnerability: "Very High", accessibility: "Poor", capacityDeficit: 1600, capacityStatus: "Critical Deficit", priority: "Immediate", status: "Active" },
  { id: 3, name: "Wayanad Sector Mudflow Hazard", district: "Wayanad", state: "Kerala", coords: [11.6854, 76.132], population: 890, households: 198, hazard: "Mudflow", riskScore: 84, riskLevel: "Critical", vulnerability: "High", accessibility: "Moderate", capacityDeficit: 450, capacityStatus: "Deficit", priority: "Immediate", status: "Active" },
  { id: 4, name: "Ganga Basin High Flow Alert", district: "Varanasi", state: "Uttar Pradesh", coords: [25.3176, 82.9739], population: 5200, households: 1150, hazard: "Flood", riskScore: 76, riskLevel: "Critical", vulnerability: "High", accessibility: "Good", capacityDeficit: 2100, capacityStatus: "Deficit", priority: "Short-Term", status: "Active" },
  { id: 5, name: "Brahmaputra Basin Flood Watch", district: "Dibrugarh", state: "Assam", coords: [26.1445, 91.7362], population: 4100, households: 910, hazard: "Flood", riskScore: 90, riskLevel: "Critical", vulnerability: "Very High", accessibility: "Poor", capacityDeficit: 2200, capacityStatus: "Critical Deficit", priority: "Immediate", status: "Active" },
  { id: 6, name: "Simlipal Reserve Wildfire Hotspot", district: "Mayurbhanj", state: "Odisha", coords: [21.9397, 86.3264], population: 1250, households: 275, hazard: "Wildfire", riskScore: 68, riskLevel: "High", vulnerability: "Moderate", accessibility: "Moderate", capacityDeficit: 350, capacityStatus: "Warning", priority: "Short-Term", status: "Active" },
  { id: 7, name: "Bandipur Forest Thermal Anomaly", district: "Chamarajanagar", state: "Karnataka", coords: [11.854, 76.6288], population: 980, households: 218, hazard: "Forest Fire", riskScore: 65, riskLevel: "High", vulnerability: "Moderate", accessibility: "Good", capacityDeficit: 200, capacityStatus: "Adequate", priority: "Short-Term", status: "Active" },
];

const DEFAULT_SHELTERS = [
  { id: 101, name: "Dynamic Relief Shelter 4 (Chamoli)", district: "Chamoli", state: "Uttarakhand", coords: [30.3974, 79.316], capacity: 2100, available: 1050, occupancy: 1050, accessibility: "Good", distance: 1.8, status: "Active" },
  { id: 102, name: "Dynamic Relief Shelter 2 (Darbhanga)", district: "Darbhanga", state: "Bihar", coords: [26.1494, 85.8838], capacity: 6250, available: 3125, occupancy: 3125, accessibility: "Good", distance: 2.1, status: "Active" },
  { id: 103, name: "Dynamic Relief Shelter 5 (Wayanad)", district: "Wayanad", state: "Kerala", coords: [11.6934, 76.142], capacity: 2100, available: 1050, occupancy: 1050, accessibility: "Good", distance: 1.5, status: "Active" },
  { id: 104, name: "Dynamic Relief Shelter 3 (Varanasi)", district: "Varanasi", state: "Uttar Pradesh", coords: [25.3256, 82.9839], capacity: 6250, available: 3125, occupancy: 3125, accessibility: "Good", distance: 3.4, status: "Active" },
  { id: 105, name: "Dynamic Relief Shelter 1 (Dibrugarh)", district: "Dibrugarh", state: "Assam", coords: [26.1525, 91.7462], capacity: 6250, available: 3125, occupancy: 3125, accessibility: "Good", distance: 2.2, status: "Active" },
  { id: 106, name: "Dynamic Relief Shelter 6 (Mayurbhanj)", district: "Mayurbhanj", state: "Odisha", coords: [21.9337, 86.3184], capacity: 1400, available: 700, occupancy: 700, accessibility: "Moderate", distance: 2.8, status: "Active" },
  { id: 107, name: "Dynamic Relief Shelter 7 (Chamarajanagar)", district: "Chamarajanagar", state: "Karnataka", coords: [11.862, 76.6388], capacity: 1400, available: 700, occupancy: 700, accessibility: "Good", distance: 1.9, status: "Active" },
];

const DISTRICT_COORDINATES = {
  national: { center: [22.8, 79.5], zoom: 5 },
  all: { center: [22.8, 79.5], zoom: 5 },
  chamoli: { center: [30.4034, 79.324], zoom: 11 },
  Chamoli: { center: [30.4034, 79.324], zoom: 11 },
  darbhanga: { center: [26.1554, 85.8918], zoom: 11 },
  Darbhanga: { center: [26.1554, 85.8918], zoom: 11 },
  wayanad: { center: [11.6854, 76.132], zoom: 11 },
  Wayanad: { center: [11.6854, 76.132], zoom: 11 },
  varanasi: { center: [25.3176, 82.9739], zoom: 11 },
  Varanasi: { center: [25.3176, 82.9739], zoom: 11 },
  dibrugarh: { center: [26.1445, 91.7362], zoom: 11 },
  Dibrugarh: { center: [26.1445, 91.7362], zoom: 11 },
  mayurbhanj: { center: [21.9397, 86.3264], zoom: 11 },
  Mayurbhanj: { center: [21.9397, 86.3264], zoom: 11 },
  chamarajanagar: { center: [11.854, 76.6288], zoom: 11 },
  Chamarajanagar: { center: [11.854, 76.6288], zoom: 11 },
};

export default function RiskMap() {
  const [habitations, setHabitations] = useState(DEFAULT_HABITATIONS);
  const [baselineHabitations, setBaselineHabitations] = useState(DEFAULT_HABITATIONS);
  const [relocationSites, setRelocationSites] = useState(DEFAULT_SHELTERS);
  const [redZones, setRedZones] = useState(null);

  // Read authenticated user role
  const [activeRole, setActiveRole] = useState(() => {
    return localStorage.getItem("dss_user_role") || "national";
  });

  const [mapCenter, setMapCenter] = useState(() => {
    const role = localStorage.getItem("dss_user_role") || "national";
    return DISTRICT_COORDINATES[role]?.center || [22.8, 79.5];
  });
  const [mapZoom, setMapZoom] = useState(() => {
    const role = localStorage.getItem("dss_user_role") || "national";
    return DISTRICT_COORDINATES[role]?.zoom || 5;
  });

  useEffect(() => {
    const handleRoleUpdate = () => {
      const role = localStorage.getItem("dss_user_role") || "national";
      setActiveRole(role);
      const target = DISTRICT_COORDINATES[role] || DISTRICT_COORDINATES.national;
      setMapCenter(target.center);
      setMapZoom(target.zoom);
    };
    window.addEventListener("roleChanged", handleRoleUpdate);
    window.addEventListener("storage", handleRoleUpdate);
    return () => {
      window.removeEventListener("roleChanged", handleRoleUpdate);
      window.removeEventListener("storage", handleRoleUpdate);
    };
  }, []);

  const districtScope =
    activeRole === "chamoli"
      ? "Chamoli"
      : activeRole === "darbhanga"
      ? "Darbhanga"
      : activeRole === "wayanad"
      ? "Wayanad"
      : null;

  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // State for active evacuation corridor
  const [selectedHab, setSelectedHab] = useState(null);
  const [selectedShelter, setSelectedShelter] = useState(null);

  // Sync role-based district into map filters
  useEffect(() => {
    if (districtScope) {
      const st = getStateForDistrict(districtScope);
      setFilters((prev) => ({
        ...prev,
        district: districtScope,
        ...(st ? { state: st } : {}),
      }));
    } else {
      setFilters((prev) => {
        const next = { ...prev };
        delete next.district;
        return next;
      });
    }
  }, [districtScope]);

  // ==========================================================
  // LOAD REAL GIS DATA FROM FASTAPI BACKEND
  // ==========================================================
  async function loadGISData() {
    try {
      setLoading(true);
      setError("");

      let habRes = await fetch("/api/gis/habitations").catch(() => null);
      if (!habRes || !habRes.ok) {
        habRes = await fetch("http://127.0.0.1:8000/api/gis/habitations").catch(() => null);
      }
      if (habRes && habRes.ok) {
        const habitationGeoJSON = await habRes.json();
        const habFeatures = habitationGeoJSON.features || [];
        const parsedHabs = habFeatures.map((f) => {
          const p = f.properties || {};
          const coords = f.geometry?.coordinates || [78.9629, 20.5937];
          return {
            id: p.id,
            name: p.name,
            district: p.district,
            state: p.state || getStateForDistrict(p.district) || "Unknown",
            population: Number(p.population || 0),
            households: Number(p.households || 0),
            hazard: p.hazard || "Unknown",
            riskScore: Number(p.risk_score || 0),
            riskLevel: p.risk_level || "Low",
            vulnerability: p.vulnerability || "Moderate",
            accessibility: p.accessibility || "Moderate",
            capacityDeficit: Number(p.capacity_deficit || 0),
            capacityStatus: p.capacity_status || "Adequate",
            priority: p.priority || "Monitor",
            status: p.status || "Active",
            coords: [coords[1], coords[0]],
          };
        });
        if (parsedHabs.length > 0) {
          setHabitations(parsedHabs);
          setBaselineHabitations(parsedHabs);
        } else {
          setHabitations(DEFAULT_HABITATIONS);
          setBaselineHabitations(DEFAULT_HABITATIONS);
        }
      } else {
        setHabitations(DEFAULT_HABITATIONS);
        setBaselineHabitations(DEFAULT_HABITATIONS);
      }

      let siteRes = await fetch("/api/gis/relocation-sites").catch(() => null);
      if (!siteRes || !siteRes.ok) {
        siteRes = await fetch("http://127.0.0.1:8000/api/gis/relocation-sites").catch(() => null);
      }
      if (siteRes && siteRes.ok) {
        const siteGeoJSON = await siteRes.json();
        const siteFeatures = siteGeoJSON.features || [];
        const parsedSites = siteFeatures.map((f) => {
          const p = f.properties || {};
          const coords = f.geometry?.coordinates || [78.9629, 20.5937];
          return {
            id: p.id,
            name: p.name,
            district: p.district,
            state: p.state || getStateForDistrict(p.district) || "Unknown",
            capacity: Number(p.capacity || 0),
            occupancy: Number(p.occupancy || 0),
            available: Number(p.available || 0),
            accessibility: p.accessibility || "Good",
            distance: Number(p.distance || 0),
            suitability: p.suitability,
            status: p.status || "Active",
            coords: [coords[1], coords[0]],
          };
        });
        if (parsedSites.length > 0) setRelocationSites(parsedSites);
        else setRelocationSites(DEFAULT_SHELTERS);
      } else {
        setRelocationSites(DEFAULT_SHELTERS);
      }

      let zoneRes = await fetch("/api/gis/red-zones").catch(() => null);
      if (!zoneRes || !zoneRes.ok) {
        zoneRes = await fetch("http://127.0.0.1:8000/api/gis/red-zones").catch(() => null);
      }
      if (zoneRes && zoneRes.ok) {
        const redZoneGeoJSON = await zoneRes.json();
        setRedZones(redZoneGeoJSON);
      }
    } catch (err) {
      console.error("GIS loading failed, using fallback:", err);
      setHabitations(DEFAULT_HABITATIONS);
      setBaselineHabitations(DEFAULT_HABITATIONS);
      setRelocationSites(DEFAULT_SHELTERS);
    } finally {
      setLoading(false);
    }
  }

  const handleSimulationResult = (simData) => {
    if (!simData?.simulated_habitations) return;
    const simMap = new Map(simData.simulated_habitations.map((sh) => [sh.id, sh]));
    setHabitations((prev) =>
      prev.map((h) => {
        const simMatch = simMap.get(h.id);
        if (!simMatch) return h;
        return {
          ...h,
          riskScore: simMatch.simulated_risk_score,
          risk_score: simMatch.simulated_risk_score,
          riskLevel: simMatch.simulated_risk_level,
          risk_level: simMatch.simulated_risk_level,
          priority: simMatch.simulated_priority,
          accessibility: simMatch.simulated_accessibility,
        };
      })
    );
  };

  const handleResetSimulation = () => {
    if (baselineHabitations.length > 0) {
      setHabitations(baselineHabitations);
    }
  };

  useEffect(() => {
    loadGISData();
  }, []);

  // Smooth Camera FlyTo State helper
  const handleFlyToState = (stateName) => {
    if (!stateName || stateName === "all") {
      setMapCenter([22.8, 79.5]);
      setMapZoom(5);
      return;
    }
    const target = STATE_COORDINATES[stateName];
    if (target) {
      setMapCenter(target.center);
      setMapZoom(target.zoom);
    } else {
      const match = habitations.find(
        (h) =>
          h.state?.toLowerCase() === stateName.toLowerCase() ||
          getStateForDistrict(h.district)?.toLowerCase() === stateName.toLowerCase()
      );
      if (match?.coords) {
        setMapCenter(match.coords);
        setMapZoom(8);
      }
    }
  };

  // Smooth Camera FlyTo District helper
  const handleFlyToDistrict = (d) => {
    if (!d || d === "all") {
      if (filters.state && filters.state !== "all") {
        handleFlyToState(filters.state);
      } else {
        setMapCenter([22.8, 79.5]);
        setMapZoom(5);
      }
      return;
    }
    const target = DISTRICT_COORDINATES[d] || DISTRICT_COORDINATES[d.toLowerCase()];
    if (target) {
      setMapCenter(target.center);
      setMapZoom(target.zoom);
    } else {
      const match = habitations.find((h) => h.district?.toLowerCase() === d.toLowerCase());
      if (match?.coords) {
        setMapCenter(match.coords);
        setMapZoom(11);
      }
    }
  };

  // Filtered Habitations strictly scoped to Active District Scope and Matrix Filters
  const filtered = useMemo(() => {
    return habitations.filter((h) => {
      // 1. Role-locked district scope
      if (districtScope && h.district?.toLowerCase() !== districtScope.toLowerCase()) {
        return false;
      }
      // 2. State filter from Matrix
      if (filters.state && filters.state !== "all") {
        const hState = h.state || getStateForDistrict(h.district);
        if (hState?.toLowerCase() !== filters.state.toLowerCase()) {
          return false;
        }
      }
      // 3. District filter from Matrix
      if (filters.district && filters.district !== "all" && h.district?.toLowerCase() !== filters.district.toLowerCase()) {
        return false;
      }
      // 4. Specific settlement selection filter
      if (filters.settlementId && filters.settlementId !== "all") {
        if (String(h.id) !== String(filters.settlementId)) {
          return false;
        }
      }
      // 5. Search query (matches name, district, hazard, or state)
      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        const matchName = (h.name || "").toLowerCase().includes(q);
        const matchDistrict = (h.district || "").toLowerCase().includes(q);
        const matchHazard = (h.hazard || "").toLowerCase().includes(q);
        const matchState = (h.state || getStateForDistrict(h.district) || "").toLowerCase().includes(q);
        if (!matchName && !matchDistrict && !matchHazard && !matchState) return false;
      }
      // 6. Hazard filter (case-insensitive & lenient with forest fire synonyms)
      if (filters.hazard && filters.hazard !== "all") {
        const hHaz = (h.hazard || "").toLowerCase();
        const fHaz = filters.hazard.toLowerCase();
        const matchWildfire =
          (fHaz.includes("fire") || fHaz.includes("wildfire")) &&
          (hHaz.includes("fire") || hHaz.includes("wildfire"));
        if (hHaz !== fHaz && !hHaz.includes(fHaz) && !fHaz.includes(hHaz) && !matchWildfire) {
          return false;
        }
      }
      // 7. Risk Level filter (Critical, High, Moderate/Medium, Low)
      if (filters.riskLevel && filters.riskLevel !== "all") {
        const hRisk = (h.riskLevel || h.risk_level || "").toLowerCase();
        const fRisk = filters.riskLevel.toLowerCase();
        const normH = hRisk === "medium" ? "moderate" : hRisk;
        const normF = fRisk === "medium" ? "moderate" : fRisk;
        if (normH !== normF) return false;
      }
      // 8. Vulnerability filter (Critical, Very High, High, Moderate, Low)
      if (filters.vulnerability && filters.vulnerability !== "all") {
        const hVuln = (h.vulnerability || "").toLowerCase();
        const fVuln = filters.vulnerability.toLowerCase();
        if (hVuln !== fVuln && !hVuln.includes(fVuln) && !fVuln.includes(hVuln)) {
          return false;
        }
      }
      // 9. Capacity Status filter (Critical, Deficit, Moderate/Warning, Adequate)
      if (filters.capacityStatus && filters.capacityStatus !== "all") {
        const hCap = (h.capacityStatus || h.capacity_status || "").toLowerCase();
        const fCap = filters.capacityStatus.toLowerCase();
        const isCritMatch = fCap.includes("crit") && hCap.includes("crit");
        const isDeficitMatch = fCap.includes("deficit") && hCap.includes("deficit");
        const isModMatch =
          (fCap.includes("mod") || fCap.includes("warn")) &&
          (hCap.includes("mod") || hCap.includes("warn"));
        const isAdequateMatch = fCap.includes("adeq") && hCap.includes("adeq");
        if (hCap !== fCap && !isCritMatch && !isDeficitMatch && !isModMatch && !isAdequateMatch) {
          return false;
        }
      }
      // 10. Relocation Priority filter (Immediate, Short-Term, Planned, Monitor)
      if (filters.priority && filters.priority !== "all") {
        const hPri = (h.priority || "").toLowerCase();
        const fPri = filters.priority.toLowerCase();
        if (hPri !== fPri && !hPri.includes(fPri) && !fPri.includes(hPri)) {
          return false;
        }
      }
      return true;
    });
  }, [habitations, filters, districtScope]);

  // Filter Relocation Sites strictly scoped to Active District Scope or user-selected District
  const scopedSites = useMemo(() => {
    let sites = relocationSites;
    const targetDistrict =
      districtScope || (filters.district && filters.district !== "all" ? filters.district : null);
    if (targetDistrict) {
      return sites.filter(
        (s) => s.district?.toLowerCase() === targetDistrict.toLowerCase()
      );
    }
    if (filters.state && filters.state !== "all") {
      return sites.filter((s) => {
        const sState = s.state || getStateForDistrict(s.district);
        return sState?.toLowerCase() === filters.state.toLowerCase();
      });
    }
    return sites;
  }, [relocationSites, districtScope, filters.district, filters.state]);

  const districts = useMemo(() => {
    if (districtScope) return [districtScope];
    return [...new Set(habitations.map((h) => h.district))].filter(Boolean).sort();
  }, [habitations, districtScope]);

  // Base list for Statistics (Strictly district-scoped)
  const scopedBaseHabitations = useMemo(() => {
    if (districtScope) {
      return habitations.filter(
        (h) => h.district?.toLowerCase() === districtScope.toLowerCase()
      );
    }
    return habitations;
  }, [habitations, districtScope]);

  // Real-time Dynamic Statistics derived from active filtered subset
  const totalInScope = scopedBaseHabitations.length;
  const filteredCount = filtered.length;
  const criticalCount = filtered.filter((h) => (h.riskLevel || h.risk_level) === "Critical").length;
  const highRiskCount = filtered.filter((h) => (h.riskLevel || h.risk_level) === "High").length;
  const relocationCount = filtered.filter(
    (h) => h.priority === "Immediate" || h.priority === "Short-Term"
  ).length;

  const handleToggleHabitation = (hab) => {
    if (!hab) {
      setSelectedHab(null);
      return;
    }
    if (selectedHab && selectedHab.id === hab.id) {
      setSelectedHab(null);
    } else {
      setSelectedHab(hab);
      if (hab.coords) {
        setMapCenter(hab.coords);
        setMapZoom(14);
      }
    }
  };

  const handleSelectShelter = (site) => {
    setSelectedShelter(site);
    if (site.coords) {
      setMapCenter(site.coords);
      setMapZoom(14);
    }
  };

  // Quick Scope selection helper for testing/officers
  const handleQuickScope = (scopeId) => {
    localStorage.setItem("dss_user_role", scopeId);
    setActiveRole(scopeId);
    setSelectedHab(null);
    setSelectedShelter(null);
    const target = DISTRICT_COORDINATES[scopeId] || DISTRICT_COORDINATES.national;
    setMapCenter(target.center);
    setMapZoom(target.zoom);
    if (scopeId === "national") {
      setFilters({});
    } else {
      const dName = scopeId.charAt(0).toUpperCase() + scopeId.slice(1);
      setFilters({ district: dName });
    }
    window.dispatchEvent(new Event("roleChanged"));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
              <Radio className="w-3.5 h-3.5 animate-pulse text-red-500" />
              <span>National Disaster Management Spatial Command (NDMA-GIS)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Tactical Risk Intelligence & Spatial Operations
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {districtScope
                ? `Active Jurisdiction Focus: District Magistrate ${districtScope} Unified Command Scope`
                : "India-Wide Disaster Risk Intelligence & Incident Command Spatial Center"}
            </p>
          </div>

          {/* Quick Jurisdiction Scope Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
            <span className="text-[11px] font-bold text-slate-400 px-2">Jurisdiction Scope:</span>
            <button
              onClick={() => handleQuickScope("national")}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                activeRole === "national"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              🇮🇳 All-India NDMA
            </button>
            <button
              onClick={() => handleQuickScope("chamoli")}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                activeRole === "chamoli"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              🏔️ DM Chamoli
            </button>
            <button
              onClick={() => handleQuickScope("darbhanga")}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                activeRole === "darbhanga"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              🌊 DM Darbhanga
            </button>
            <button
              onClick={() => handleQuickScope("wayanad")}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                activeRole === "wayanad"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              🌿 DM Wayanad
            </button>
          </div>
        </div>

        {/* Multi-Hazard What-If Scenario Sandbox */}
        <ScenarioSandbox
          onSimulationResult={handleSimulationResult}
          onReset={handleResetSimulation}
        />

        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">GIS Connection Alert</p>
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
            <button
              onClick={loadGISData}
              className="flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-medium text-white px-3 py-1.5 transition"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {/* Real-time Dynamic Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {districtScope ? `${districtScope} Matching` : "Matching Settlements"}
                </p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {filteredCount}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    / {totalInScope} total
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <MapPin className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Critical Red Zones
                </p>
                <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">
                  {criticalCount}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  High Risk Zones
                </p>
                <p className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">
                  {highRiskCount}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Immediate Evacuation
                </p>
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                  {relocationCount}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                <MapIcon className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Map + Filters Workspace */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Tactical Filters Sidebar */}
          <div
            className={`lg:w-64 flex-shrink-0 ${
              showFilters ? "block" : "hidden lg:block"
            }`}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm transition-colors sticky top-36">
              <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200">
                    GIS Filter Matrix
                  </h3>
                </div>
                {districtScope && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                    <Lock className="w-2.5 h-2.5" /> Locked
                  </span>
                )}
              </div>

              <FilterPanel
                filters={filters}
                onChange={setFilters}
                districts={districts}
                habitations={scopedBaseHabitations}
                isDistrictLocked={Boolean(districtScope)}
                onFlyToDistrict={handleFlyToDistrict}
                onFlyToState={handleFlyToState}
                onSelectSettlement={handleToggleHabitation}
              />
            </div>
          </div>

          {/* Main Map Canvas Area */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Showing <strong className="text-blue-600 dark:text-blue-400">{filtered.length}</strong> of{" "}
                  <strong>{totalInScope}</strong> habitations{" "}
                  {districtScope ? `in ${districtScope} Jurisdiction` : "Across India"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click on any settlement marker to plot its live evacuation vector and inspect telemetry
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadGISData}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync GIS</span>
                </button>
              </div>
            </div>

            {/* Active Tactical Evacuation Vector Alert */}
            {(selectedHab || selectedShelter) && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                    <Navigation className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                        ⚡ Tactical Shortest Evacuation Vector Active
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                      Target Safe Shelter:{" "}
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {selectedShelter?.name || "Automated Shortest Path Safe Shelter"}
                      </span>
                    </p>
                    {selectedHab && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Incident Zone: <strong>{selectedHab.name}</strong> ({selectedHab.hazard} · Risk Level: {selectedHab.riskLevel})
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedHab(null);
                      setSelectedShelter(null);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear Vector</span>
                  </button>
                </div>
              </div>
            )}

            {/* Empty Filter Results Alert Banner */}
            {filtered.length === 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold">No settlements match the selected GIS Matrix criteria</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      Try clearing or loosening your filters to view habitations on the tactical map.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (districtScope) setFilters({ district: districtScope });
                    else {
                      setFilters({});
                      handleFlyToDistrict("all");
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 flex-shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Matrix Filters</span>
                </button>
              </div>
            )}

            {/* Tactical High-Resolution Leaflet Map */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
              <MapView
                habitations={filtered}
                relocationSites={scopedSites}
                redZones={redZones}
                selectedHabitation={selectedHab}
                selectedShelter={selectedShelter}
                onSelectHabitation={handleToggleHabitation}
                onSelectShelter={handleSelectShelter}
                center={mapCenter}
                zoom={mapZoom}
                showSites
                height="650px"
                variant="gov"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <MapLegend variant="gov" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                <strong>{filtered.length}</strong> settlements plotted ·{" "}
                <strong>{scopedSites.length}</strong> designated safe shelters online
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Disclaimer text="Red-zone shapes are prototype risk-screening buffers, not official cadastral boundaries. Field validation and authorized SDMA/NDMA officer approval are required before operational evacuation execution." />
        </div>
      </div>
    </div>
  );
}
