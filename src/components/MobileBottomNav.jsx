import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Map, Radio, PhoneCall, User, ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

/**
 * MobileBottomNav
 * Native Mobile Bottom Navigation Bar.
 * Strictly hidden on desktop viewports (md:hidden) to preserve existing desktop UI.
 */
export default function MobileBottomNav() {
  const location = useLocation();
  const { t } = useLanguage();

  const isGovPath = location.pathname.startsWith('/gov') || [
    '/about', '/disasters', '/emergency-alerts', '/habitations',
    '/capacity', '/relocation', '/relocation-sites', '/rescue-teams',
    '/analytics', '/resources', '/admin', '/settings'
  ].some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));

  // On government command desktop screens, let the standard navbar handle controls
  if (isGovPath) {
    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-3 py-2 flex items-center justify-between text-xs text-white shadow-2xl">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-[11px] tracking-wide">AASRA GOV COMMAND</span>
        </div>
        <Link
          to="/"
          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] transition"
        >
          Citizen App →
        </Link>
      </div>
    );
  }

  const navItems = [
    {
      to: '/',
      label: t('nav_home') || 'Home',
      icon: Home,
      exact: true,
    },
    {
      to: '/risk-map',
      label: t('nav_risk_map') || 'Risk Map',
      icon: Map,
    },
    {
      to: '/community-reports',
      label: 'SOS Alert',
      icon: Radio,
      highlight: true,
    },
    {
      href: 'tel:112',
      label: 'Call 112',
      icon: PhoneCall,
      isTel: true,
    },
    {
      to: '/citizen-login',
      label: t('nav_citizen_login') || 'Profile',
      icon: User,
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1.5 transition-colors"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item, idx) => {
          const isActive = item.exact
            ? location.pathname === item.to
            : item.to && location.pathname.startsWith(item.to);

          if (item.isTel) {
            return (
              <a
                key={idx}
                href={item.href}
                className="flex flex-col items-center justify-center py-1 px-2 min-w-[56px] text-red-600 dark:text-red-400 active:scale-95 transition"
                title="Direct Emergency Hotline 112"
              >
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center mb-0.5">
                  <PhoneCall className="w-4 h-4 animate-pulse text-red-600 dark:text-red-400" />
                </div>
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 leading-none">
                  {item.label}
                </span>
              </a>
            );
          }

          if (item.highlight) {
            return (
              <Link
                key={idx}
                to={item.to}
                className="flex flex-col items-center justify-center py-1 px-2 min-w-[56px] -mt-4 active:scale-95 transition group"
              >
                <div className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30 border-2 border-white dark:border-slate-900 mb-0.5">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <span className="text-[10px] font-black text-red-600 dark:text-red-400 leading-none">
                  {item.label}
                </span>
              </Link>
            );
          }

          const Icon = item.icon;
          return (
            <Link
              key={idx}
              to={item.to}
              className={`flex flex-col items-center justify-center py-1 px-2 min-w-[56px] rounded-lg transition active:scale-95 ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
              <span className="text-[10px] font-semibold tracking-tight leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
