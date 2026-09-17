export default function MapLegend({ variant = "gov" }) {
  const items = [
    { label: "Low Risk", color: "#16a34a" },
    { label: "Moderate", color: "#ca8a04" },
    { label: "High", color: "#ea580c" },
    { label: "Critical", color: "#dc2626" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-4 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-xs transition-colors">
      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
        <span>Map Legend:</span>
      </span>

      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
            style={{ background: item.color }}
          />
          <span className="text-slate-600 dark:text-slate-400 font-medium">
            {item.label}
          </span>
        </div>
      ))}

      <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
        <span className="flex items-center justify-center w-4 h-4 rounded bg-blue-600 text-white text-[10px] shadow-sm">
          🏛️
        </span>
        <span className="text-blue-700 dark:text-blue-400 font-bold">
          Safe Shelter
        </span>
      </div>

      <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
        <span className="w-4 h-1 rounded bg-blue-600" />
        <span className="text-slate-600 dark:text-slate-400 font-medium">
          Evac Corridor
        </span>
      </div>
    </div>
  );
}
