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
  Building2,
  Crosshair,
} from "lucide-react";
import {
  ALL_STATES,
  STATE_DISTRICT_MAP,
  getStateForDistrict,
  getDistrictsForState,
} from "@/data/jurisdictionData";

export default function FilterPanel({
  filters = {},
  onChange,
  districts = [],
  habitations = [],
  isDistrictLocked = false,
  onFlyToDistrict = () => {},
  onFlyToState = () => {},
  onSelectSettlement = () => {},
}) {
  // Determine if state is locked based on role-locked district
  const lockedState = useMemo(() => {
    if (!isDistrictLocked || !filters.district) return null;
    return getStateForDistrict(filters.district);
  }, [isDistrictLocked, filters.district]);

  // Compute live counts from habitations for each filter attribute
  const stats = useMemo(() => {
    const counts = {
      states: {},
      districts: {},
      hazards: {},
      riskLevels: {},
      vulnerabilities: {},
      capacityStatuses: {},
      priorities: {},
    };

    habitations.forEach((h) => {
      const st = h.state || getStateForDistrict(h.district);
      if (st) {
        counts.states[st] = (counts.states[st] || 0) + 1;
      }
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

  // Available states list
  const availableStates = useMemo(() => {
    const set = new Set(ALL_STATES);
    habitations.forEach((h) => {
      const st = h.state || getStateForDistrict(h.district);
      if (st) set.add(st);
    });
    return Array.from(set).sort();
  }, [habitations]);

  // Cascading districts: Only show districts belonging to the selected state
  const visibleDistricts = useMemo(() => {
    if (filters.state && filters.state !== "all") {
      const stateDistricts = getDistrictsForState(filters.state);
      const matched = districts.filter((d) =>
        stateDistricts.some((sd) => sd.toLowerCase() === d.toLowerCase())
      );
      if (matched.length > 0) return matched;
      return stateDistricts;
    }
    return districts;
  }, [filters.state, districts]);

  // Settlements matching the current state/district scope for quick picking
  const settlementsInScope = useMemo(() => {
    return habitations.filter((h) => {
      if (filters.state && filters.state !== "all") {
        const hState = h.state || getStateForDistrict(h.district);
        if (hState?.toLowerCase() !== filters.state.toLowerCase()) return false;
      }
      if (filters.district && filters.district !== "all") {
        if (h.district?.toLowerCase() !== filters.district.toLowerCase()) return false;
      }
      return true;
    });
  }, [habitations, filters.state, filters.district]);

  // Generic filter change
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
  };

  // State Change Handler (Cascades to District)
  const handleStateChange = (selectedState) => {
    const nextState = !selectedState || selectedState === "all" ? undefined : selectedState;

    onChange((prev) => {
      const next = { ...prev };
      if (!nextState) {
        delete next.state;
      } else {
        next.state = nextState;
        // If current district does not belong to new state, reset district
        if (next.district && next.district !== "all") {
          const stateDistricts = getDistrictsForState(nextState);
          const belongs = stateDistricts.some(
            (d) => d.toLowerCase() === next.district.toLowerCase()
          );
          if (!belongs) {
            delete next.district;
          }
        }
      }
      delete next.settlementId;
      return next;
    });

    if (onFlyToState) {
      onFlyToState(selectedState);
    }
  };

  // District Change Handler
  const handleDistrictChange = (selectedDistrict) => {
    const nextDistrict = !selectedDistrict || selectedDistrict === "all" ? undefined : selectedDistrict;

    onChange((prev) => {
      const next = { ...prev };
      if (!nextDistrict) {
        delete next.district;
      } else {
        next.district = nextDistrict;
        // Auto-set state if not yet set
        const parentState = getStateForDistrict(nextDistrict);
        if (parentState && (!next.state || next.state === "all")) {
          next.state = parentState;
        }
      }
      delete next.settlementId;
      return next;
    });

    if (onFlyToDistrict) {
      onFlyToDistrict(selectedDistrict);
    }
  };

  // Direct Settlement Quick Picker Handler
  const handleSettlementChange = (settlementId) => {
    if (!settlementId || settlementId === "all") {
      onChange((prev) => {
        const next = { ...prev };
        delete next.settlementId;
        return next;
      });
      if (onSelectSettlement) {
        onSelectSettlement(null);
      }
      return;
    }

    const chosenHab = habitations.find((h) => String(h.id) === String(settlementId));
    if (chosenHab) {
      onChange((prev) => {
        const next = { ...prev, settlementId: chosenHab.id };
        if (chosenHab.district) {
          next.district = chosenHab.district;
        }
        const st = chosenHab.state || getStateForDistrict(chosenHab.district);
        if (st) {
          next.state = st;
        }
        return next;
      });

      if (onSelectSettlement) {
        onSelectSettlement(chosenHab);
      }
    }
  };

  // Clear / Reset All Filters
  const handleClear = () => {
    if (isDistrictLocked && filters.district) {
      const st = getStateForDistrict(filters.district);
      onChange({
        district: filters.district,
        ...(st ? { state: st } : {}),
      });
    } else {
      onChange({});
      if (onFlyToDistrict) {
        onFlyToDistrict("all");
      }
    }
    if (onSelectSettlement) {
      onSelectSettlement(null);
    }
  };

  // Remove Individual Filter Chip
  const handleRemoveFilter = (key) => {
    if (key === "district" && isDistrictLocked) return;
    if (key === "state" && isDistrictLocked) return;

    onChange((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    if (key === "district" && onFlyToDistrict) {
      if (filters.state && filters.state !== "all") {
        onFlyToState(filters.state);
      } else {
        onFlyToDistrict("all");
      }
    }
    if (key === "state" && onFlyToState) {
      onFlyToState("all");
    }
    if (key === "settlementId" && onSelectSettlement) {
      onSelectSettlement(null);
    }
  };

  // List of active filters
  const activeFilters = useMemo(() => {
    const list = [];
    if (filters.search) list.push({ key: "search", label: `Search: "${filters.search}"` });
    if (filters.state && filters.state !== "all" && !isDistrictLocked) {
      list.push({ key: "state", label: `State: ${filters.state}` });
    }
    if (filters.district && filters.district !== "all" && !isDistrictLocked) {
      list.push({ key: "district", label: `District: ${filters.district}` });
    }
    if (filters.settlementId && filters.settlementId !== "all") {
      const h = habitations.find((item) => String(item.id) === String(filters.settlementId));
      list.push({ key: "settlementId", label: `Settlement: ${h?.name || filters.settlementId}` });
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
  }, [filters, isDistrictLocked, habitations]);

  return (
    <div className="space-y-3.5 text-xs text-slate-900 dark:text-slate-100">
      {/* 1. Instant Text Search & Settlement Filter */}
      <div>
        <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Search Settlement</span>
          </span>
          {filters.search && (
            <button
              onClick={() => handleRemoveFilter("search")}
              className="text-[10px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold"
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
            className="w-full pl-3 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-sm"
          />
          {filters.search && (
            <button
              onClick={() => handleRemoveFilter("search")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Select Specific Settlement (Direct Focus & Route Plotting) */}
      <div>
        <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Select Specific Settlement</span>
          </span>
          {filters.settlementId && (
            <button
              onClick={() => handleRemoveFilter("settlementId")}
              className="text-[10px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold"
            >
              Clear
            </button>
          )}
        </label>
        <select
          value={filters.settlementId || "all"}
          onChange={(e) => handleSettlementChange(e.target.value)}
          className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-sm ${
            filters.settlementId && filters.settlementId !== "all"
              ? "border-indigo-500 bg-indigo-50/80 dark:bg-slate-800 text-indigo-900 dark:text-indigo-200 font-bold"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          }`}
        >
          <option value="all">🎯 All Settlements in View ({settlementsInScope.length})</option>
          {settlementsInScope.map((h) => (
            <option key={h.id} value={h.id}>
              📍 {h.name} ({h.district} · {h.hazard})
            </option>
          ))}
        </select>
      </div>

      {/* 3. Active Filters Chips */}
      {activeFilters.length > 0 && (
        <div className="p-2.5 bg-blue-50 dark:bg-slate-800/80 rounded-xl border border-blue-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">
              Active Criteria ({activeFilters.length})
            </span>
            <button
              onClick={handleClear}
              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Reset All
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {activeFilters.map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 text-blue-800 dark:text-blue-200 text-[10px] font-bold border border-blue-200 dark:border-slate-700 shadow-xs"
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

      {/* 4. State Jurisdiction Filter */}
      <div>
        <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>State Jurisdiction</span>
          </span>
          {isDistrictLocked && lockedState && (
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" /> Locked
            </span>
          )}
        </label>
        <select
          value={filters.state || (isDistrictLocked && lockedState ? lockedState : "all")}
          disabled={isDistrictLocked}
          onChange={(e) => handleStateChange(e.target.value)}
          className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-sm ${
            isDistrictLocked
              ? "bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              : filters.state && filters.state !== "all"
              ? "border-blue-500 bg-blue-50/80 dark:bg-slate-800 text-blue-900 dark:text-blue-200 font-bold"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          }`}
        >
          <option value="all">🇮🇳 All States ({habitations.length})</option>
          {availableStates.map((st) => {
            const count = stats.states[st] || 0;
            return (
              <option key={st} value={st}>
                🏛️ {st} {count > 0 ? `(${count})` : ""}
              </option>
            );
          })}
        </select>
      </div>

      {/* 5. District Jurisdiction Filter (Cascading from State) */}
      <div>
        <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>District Jurisdiction</span>
          </span>
          {isDistrictLocked && (
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" /> Locked
            </span>
          )}
        </label>
        <select
          value={filters.district || "all"}
          disabled={isDistrictLocked}
          onChange={(e) => handleDistrictChange(e.target.value)}
          className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-sm ${
            isDistrictLocked
              ? "bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              : filters.district && filters.district !== "all"
              ? "border-blue-500 bg-blue-50/80 dark:bg-slate-800 text-blue-900 dark:text-blue-200 font-bold"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          }`}
        >
          <option value="all">
            {filters.state && filters.state !== "all"
              ? `📍 All Districts in ${filters.state} (${settlementsInScope.length})`
              : `🇮🇳 All Districts (${habitations.length})`}
          </option>
          {visibleDistricts.map((d) => {
            const count = stats.districts[d] || 0;
            return (
              <option key={d} value={d}>
                📍 {d} ({count})
              </option>
            );
          })}
        </select>
      </div>

      {/* 6. Hazard Type */}
      <div>
        <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Hazard Type</span>
        </label>
        <select
          value={filters.hazard || "all"}
          onChange={(e) => handleChange("hazard", e.target.value)}
          className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-sm ${
            filters.hazard && filters.hazard !== "all"
              ? "border-amber-500 bg-amber-50/80 dark:bg-slate-800 text-amber-900 dark:text-amber-200 font-bold"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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

      {/* 7. Threat / Risk Level */}
      <div>
        <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
          <span>Risk Level</span>
        </label>
        <select
          value={filters.riskLevel || "all"}
          onChange={(e) => handleChange("riskLevel", e.target.value)}
          className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-sm ${
            filters.riskLevel && filters.riskLevel !== "all"
              ? "border-red-500 bg-red-50/80 dark:bg-slate-800 text-red-900 dark:text-red-200 font-bold"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          }`}
        >
          <option value="all">All Levels ({habitations.length})</option>
          <option value="Critical">🔴 Critical ({stats.riskLevels["Critical"] || 0})</option>
          <option value="High">🟠 High ({stats.riskLevels["High"] || 0})</option>
          <option value="Moderate">🟡 Moderate ({stats.riskLevels["Moderate"] || 0})</option>
          <option value="Low">🟢 Low ({stats.riskLevels["Low"] || 0})</option>
        </select>
      </div>

      {/* 8. Vulnerability Index */}
      <div>
        <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
          <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
          <span>Vulnerability</span>
        </label>
        <select
          value={filters.vulnerability || "all"}
          onChange={(e) => handleChange("vulnerability", e.target.value)}
          className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-sm ${
            filters.vulnerability && filters.vulnerability !== "all"
              ? "border-purple-500 bg-purple-50/80 dark:bg-slate-800 text-purple-900 dark:text-purple-200 font-bold"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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

      {/* 9. Shelter Capacity Status */}
      <div>
        <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-indigo-500" />
          <span>Capacity Deficit Status</span>
        </label>
        <select
          value={filters.capacityStatus || "all"}
          onChange={(e) => handleChange("capacityStatus", e.target.value)}
          className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-sm ${
            filters.capacityStatus && filters.capacityStatus !== "all"
              ? "border-indigo-500 bg-indigo-50/80 dark:bg-slate-800 text-indigo-900 dark:text-indigo-200 font-bold"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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

      {/* 10. Relocation Priority */}
      <div>
        <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-purple-500" />
          <span>Relocation Priority</span>
        </label>
        <select
          value={filters.priority || "all"}
          onChange={(e) => handleChange("priority", e.target.value)}
          className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-sm ${
            filters.priority && filters.priority !== "all"
              ? "border-purple-500 bg-purple-50/80 dark:bg-slate-800 text-purple-900 dark:text-purple-200 font-bold"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          }`}
        >
          <option value="all">All Priorities ({habitations.length})</option>
          <option value="Immediate">⚡ Immediate ({stats.priorities["Immediate"] || 0})</option>
          <option value="Short-Term">⏳ Short-Term ({stats.priorities["Short-Term"] || 0})</option>
          <option value="Planned">📋 Planned ({stats.priorities["Planned"] || 0})</option>
          <option value="Monitor">👁️ Monitor ({stats.priorities["Monitor"] || 0})</option>
        </select>
      </div>

      {/* 11. Reset / Clear Button */}
      <button
        onClick={handleClear}
        className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition font-bold text-xs shadow-sm active:scale-98"
      >
        <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span>Reset Matrix Filters</span>
      </button>
    </div>
  );
}