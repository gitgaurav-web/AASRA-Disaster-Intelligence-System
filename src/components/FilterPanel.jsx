import { useMemo } from "react";
import {
  RotateCcw,
  Search,
  MapPin,
  AlertTriangle,
  ShieldAlert,
  HeartPulse,
  Users,
  Zap,
  Lock,
  X,
} from "lucide-react";

export default function FilterPanel({
  filters = {},
  onChange,
  districts = [],
  habitations = [],
  isDistrictLocked = false,
  onFlyToDistrict = () => {},
}) {
  const handleChange = (key, value) => {
    onChange((prev) => {
      const next = { ...prev };
      if (!value || value === "all") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });

    if (key === "district" && onFlyToDistrict) {
      onFlyToDistrict(value);
    }
  };

  const handleClear = () => {
    // Preserve locked district scope if role is active
    if (isDistrictLocked && filters.district) {
      onChange({ district: filters.district });
    } else {
      onChange({});
      if (onFlyToDistrict) {
        onFlyToDistrict("all");
      }
    }
  };

  const handleRemoveFilter = (key) => {
    if (key === "district" && isDistrictLocked) return;
    onChange((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (key === "district" && onFlyToDistrict) {
      onFlyToDistrict("all");
    }
  };

  // Compute live counts from habitations for each filter attribute
  const stats = useMemo(() => {
    const counts = {
      districts: {},
      hazards: {},
      riskLevels: {},
      vulnerabilities: {},
      capacityStatuses: {},
      priorities: {},
    };

    habitations.forEach((h) => {
      if (h.district) {
        counts.districts[h.district] = (counts.districts[h.district] || 0) + 1;
      }
      if (h.hazard) {
        counts.hazards[h.hazard] = (counts.hazards[h.hazard] || 0) + 1;
      }
      const rl = h.riskLevel || h.risk_level;
      if (rl) {
        counts.riskLevels[rl] = (counts.riskLevels[rl] || 0) + 1;
      }
      if (h.vulnerability) {
        counts.vulnerabilities[h.vulnerability] = (counts.vulnerabilities[h.vulnerability] || 0) + 1;
      }
      const cs = h.capacityStatus || h.capacity_status;
      if (cs) {
        counts.capacityStatuses[cs] = (counts.capacityStatuses[cs] || 0) + 1;
      }
      if (h.priority) {
        counts.priorities[h.priority] = (counts.priorities[h.priority] || 0) + 1;
      }
    });

    return counts;
  }, [habitations]);

  // List of active filters excluding "all" and undefined
  const activeFilters = useMemo(() => {
    const list = [];
    if (filters.search) list.push({ key: "search", label: `Search: "${filters.search}"` });
    if (filters.district && filters.district !== "all" && !isDistrictLocked) {
      list.push({ key: "district", label: `District: ${filters.district}` });
    }
    if (filters.hazard && filters.hazard !== "all") {
      list.push({ key: "hazard", label: `Hazard: ${filters.hazard}` });
    }
    if (filters.riskLevel && filters.riskLevel !== "all") {
      list.push({ key: "riskLevel", label: `Risk: ${filters.riskLevel}` });
    }
    if (filters.vulnerability && filters.vulnerability !== "all") {
      list.push({ key: "vulnerability", label: `Vuln: ${filters.vulnerability}` });
    }
    if (filters.capacityStatus && filters.capacityStatus !== "all") {
      list.push({ key: "capacityStatus", label: `Cap: ${filters.capacityStatus}` });
    }
    if (filters.priority && filters.priority !== "all") {
      list.push({ key: "priority", label: `Priority: ${filters.priority}` });
    }
    return list;
  }, [filters, isDistrictLocked]);

  return (
    <div className="space-y-3.5 text-xs">
      {/* 1. Instant Text Search */}
      <div>
        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-blue-600" />
            <span>Search Settlement</span>
          </span>
          {filters.search && (
            <button
              onClick={() => handleRemoveFilter("search")}
              className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-normal"
            >
              Clear
            </button>
          )}
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Type name, district, hazard..."
            value={filters.search || ""}
            onChange={(e) => handleChange("search", e.target.value)}
            className="w-full pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-sm"
          />
          {filters.search && (
            <button
              onClick={() => handleRemoveFilter("search")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Active Filters Chips */}
      {activeFilters.length > 0 && (
        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-xl border border-blue-200 dark:border-blue-900/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Active Criteria ({activeFilters.length})
            </span>
            <button
              onClick={handleClear}
              className="text-[10px] font-bold text-blue-600 hover:underline"
            >
              Reset All
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {activeFilters.map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-700 shadow-xs"
              >
                <span>{f.label}</span>
                <button
                  onClick={() => handleRemoveFilter(f.key)}
                  className="hover:text-red-500 transition ml-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3. District Jurisdiction Filter */}
      <div>
        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>District Jurisdiction</span>
          </span>
          {isDistrictLocked && (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" /> Locked
            </span>
          )}
        </label>
        <select
          value={filters.district || "all"}
          disabled={isDistrictLocked}
          onChange={(e) => handleChange("district", e.target.value)}
          className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-sm ${
            isDistrictLocked
              ? "bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-500 cursor-not-allowed"
              : filters.district && filters.district !== "all"
              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-bold"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          }`}
        >
          <option value="all">🇮🇳 All Districts ({habitations.length})</option>
          {districts.map((d) => {
            const count = stats.districts[d] || 0;
            return (
              <option key={d} value={d}>
                📍 {d} ({count})
              </option>
            );
          })}
        </select>
      </div>

      {/* 4. Hazard Type */}
      <div>
        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Hazard Type</span>
        </label>
        <select
          value={filters.hazard || "all"}
          onChange={(e) => handleChange("hazard", e.target.value)}
          className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-sm ${
            filters.hazard && filters.hazard !== "all"
              ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 font-bold"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          }`}
        >
          <option value="all">All Hazards ({habitations.length})</option>
          <option value="Flood">🌊 Flood ({stats.hazards["Flood"] || 0})</option>
          <option value="Landslide">🏔️ Landslide ({stats.hazards["Landslide"] || 0})</option>
          <option value="Forest Fire">🔥 Forest Fire / Wildfire ({stats.hazards["Forest Fire"] || 0})</option>
          <option value="Cyclone">🌀 Cyclone ({stats.hazards["Cyclone"] || 0})</option>
          <option value="Earthquake">⚠️ Earthquake ({stats.hazards["Earthquake"] || 0})</option>
          <option value="Cloudburst">⚡ Cloudburst ({stats.hazards["Cloudburst"] || 0})</option>
          <option value="Erosion">🌊 Erosion ({stats.hazards["Erosion"] || 0})</option>
          <option value="Drought">☀️ Drought ({stats.hazards["Drought"] || 0})</option>
        </select>
      </div>

      {/* 5. Threat / Risk Level */}
      <div>
        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
          <span>Risk Level</span>
        </label>
        <select
          value={filters.riskLevel || "all"}
          onChange={(e) => handleChange("riskLevel", e.target.value)}
          className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-sm ${
            filters.riskLevel && filters.riskLevel !== "all"
              ? "border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-900 dark:text-red-100 font-bold"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          }`}
        >
          <option value="all">All Levels ({habitations.length})</option>
          <option value="Critical">🔴 Critical ({stats.riskLevels["Critical"] || 0})</option>
          <option value="High">🟠 High ({stats.riskLevels["High"] || 0})</option>
          <option value="Moderate">🟡 Moderate ({stats.riskLevels["Moderate"] || 0})</option>
          <option value="Low">🟢 Low ({stats.riskLevels["Low"] || 0})</option>
        </select>
      </div>

      {/* 6. Vulnerability Index */}
      <div>
        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
          <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
          <span>Vulnerability</span>
        </label>
        <select
          value={filters.vulnerability || "all"}
          onChange={(e) => handleChange("vulnerability", e.target.value)}
          className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-sm ${
            filters.vulnerability && filters.vulnerability !== "all"
              ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-100 font-bold"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          }`}
        >
          <option value="all">All Vulnerability ({habitations.length})</option>
          <option value="Critical">Critical ({stats.vulnerabilities["Critical"] || 0})</option>
          <option value="Very High">Very High ({stats.vulnerabilities["Very High"] || 0})</option>
          <option value="High">High ({stats.vulnerabilities["High"] || 0})</option>
          <option value="Moderate">Moderate ({stats.vulnerabilities["Moderate"] || 0})</option>
          <option value="Low">Low ({stats.vulnerabilities["Low"] || 0})</option>
        </select>
      </div>

      {/* 7. Shelter Capacity Status */}
      <div>
        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-indigo-500" />
          <span>Capacity Deficit Status</span>
        </label>
        <select
          value={filters.capacityStatus || "all"}
          onChange={(e) => handleChange("capacityStatus", e.target.value)}
          className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-sm ${
            filters.capacityStatus && filters.capacityStatus !== "all"
              ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-100 font-bold"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          }`}
        >
          <option value="all">All Statuses ({habitations.length})</option>
          <option value="Critical">
            Critical Deficit ({(stats.capacityStatuses["Critical"] || 0) + (stats.capacityStatuses["Critical Deficit"] || 0)})
          </option>
          <option value="Deficit">Deficit ({stats.capacityStatuses["Deficit"] || 0})</option>
          <option value="Moderate">
            Warning / Moderate ({(stats.capacityStatuses["Moderate"] || 0) + (stats.capacityStatuses["Warning"] || 0)})
          </option>
          <option value="Adequate">Adequate ({stats.capacityStatuses["Adequate"] || 0})</option>
        </select>
      </div>

      {/* 8. Relocation Priority */}
      <div>
        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-purple-500" />
          <span>Relocation Priority</span>
        </label>
        <select
          value={filters.priority || "all"}
          onChange={(e) => handleChange("priority", e.target.value)}
          className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-sm ${
            filters.priority && filters.priority !== "all"
              ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-100 font-bold"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          }`}
        >
          <option value="all">All Priorities ({habitations.length})</option>
          <option value="Immediate">⚡ Immediate ({stats.priorities["Immediate"] || 0})</option>
          <option value="Short-Term">⏳ Short-Term ({stats.priorities["Short-Term"] || 0})</option>
          <option value="Planned">📋 Planned ({stats.priorities["Planned"] || 0})</option>
          <option value="Monitor">👁️ Monitor ({stats.priorities["Monitor"] || 0})</option>
        </select>
      </div>

      {/* 9. Reset / Clear Button */}
      <button
        onClick={handleClear}
        className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition font-bold text-xs shadow-sm active:scale-98"
      >
        <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
        <span>Reset Matrix Filters</span>
      </button>
    </div>
  );
}