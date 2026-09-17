import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function LanguageDropdown({ variant = 'citizen' }) {
  const { language, setLanguage, allLanguages } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = allLanguages.find((l) => l.code === language) || allLanguages[0];

  const isGov = variant === 'gov';

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 transition active:scale-95 ${
          isGov
            ? 'px-2.5 py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold'
            : 'px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-500 text-xs font-bold shadow-sm'
        }`}
        title="Select Language / भाषा चुनें"
      >
        <Globe className={`w-3.5 h-3.5 ${isGov ? 'text-amber-400' : 'text-blue-600 dark:text-blue-400'}`} />
        <span className="font-semibold">{currentLang.native}</span>
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 max-h-80 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-1.5 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in duration-100">
          <div className="px-3 py-1.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Official Indian Languages ({allLanguages.length})
            </p>
          </div>
          <div className="pt-1 space-y-0.5">
            {allLanguages.map((lang) => {
              const selected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition text-left ${
                    selected
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{lang.native}</span>
                    <span className="text-[10px] text-slate-400">({lang.name})</span>
                  </div>
                  {selected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
