import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bell, Menu, X, ChevronDown, Home, Info, Waves, Map, Users, Gauge,
  Move, BarChart3, BookOpen, LogIn, Shield, Building, Check, LogOut,
  Lock, Radio, AlertTriangle, CheckCircle2, Clock, Sun, Moon,
  ShieldAlert, PhoneCall, ExternalLink, ArrowRight, User, ShieldCheck,
  Activity, Sparkles
} from 'lucide-react';
import Logo from '@/components/Logo';
import NationalEmblem from '@/components/NationalEmblem';
import LanguageDropdown from '@/components/LanguageDropdown';
import { NOTIFICATIONS } from '@/data/demoData';
import { initTheme } from '../theme';
import { useLanguage } from '@/context/LanguageContext';

// ==========================================
// GOVERNMENT PORTAL: EXACT 11 NAV LINKS
// ==========================================
const GOV_NAV_LINKS = [
  { to: '/gov', altTo: '/', labelKey: 'gov_home', fallback: 'Home', icon: Home },
  { to: '/gov/about', altTo: '/about', labelKey: 'gov_about', fallback: 'About', icon: Info },
  { to: '/gov/disasters', altTo: '/disasters', labelKey: 'gov_disasters', fallback: 'Disaster Intel', icon: Waves },
  { to: '/gov/emergency-alerts', altTo: '/emergency-alerts', labelKey: 'gov_alerts', fallback: 'Live Alerts', icon: Bell },
  { to: '/gov/risk-map', altTo: '/risk-map', labelKey: 'gov_risk_map', fallback: 'Risk Map', icon: Map },
  { to: '/gov/habitations', altTo: '/habitations', labelKey: 'gov_habitations', fallback: 'Habitations', icon: Users },
  { to: '/gov/capacity', altTo: '/capacity', labelKey: 'gov_capacity', fallback: 'Capacity', icon: Gauge },
  { to: '/gov/relocation', altTo: '/relocation', labelKey: 'gov_relocation', fallback: 'Relocation', icon: Move },
  { to: '/gov/rescue-teams', altTo: '/rescue-teams', labelKey: 'gov_rescue_teams', fallback: 'Rescue Teams', icon: ShieldAlert },
  { to: '/gov/analytics', altTo: '/analytics', labelKey: 'gov_analytics', fallback: 'Analytics', icon: BarChart3 },
  { to: '/gov/resources', altTo: '/resources', labelKey: 'gov_resources', fallback: 'Resources', icon: BookOpen },
];

// ==========================================
// CITIZEN PORTAL: EXACT USER NAV LINKS
// ==========================================
const CITIZEN_NAV_LINKS = [
  { to: '/', labelKey: 'nav_home', fallback: 'Home', icon: Home },
  { to: '/community-reports', labelKey: 'nav_community_reports', fallback: 'Community Reports', icon: Radio },
  { to: '/risk-map', labelKey: 'nav_risk_map', fallback: 'Risk Map', icon: Map },
];

const ROLES = [
  { id: 'national', name: 'National NDMA Command', subtitle: 'All-India Central Scope', icon: Shield },
  { id: 'chamoli', name: 'DM Chamoli (Uttarakhand)', subtitle: 'District Magistrate Scope', icon: Building },
  { id: 'darbhanga', name: 'DM Darbhanga (Bihar)', subtitle: 'District Magistrate Scope', icon: Building },
  { id: 'wayanad', name: 'DM Wayanad (Kerala)', subtitle: 'District Magistrate Scope', icon: Building },
];

function RoleSwitcherDropdown({ currentRole, onSelectRole, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-slate-900/20 backdrop-blur-sm sm:hidden" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:translate-x-0 sm:translate-y-0 sm:mt-2 sm:w-72 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[70] p-2 animate-in fade-in zoom-in duration-200">
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Select Command Jurisdiction
          </p>
        </div>
        <div className="space-y-1">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const isSelected = currentRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => {
                  onSelectRole(role.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 sm:p-2.5 rounded-xl sm:rounded-lg text-left transition ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-md ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                    <Icon className="w-5 h-5 sm:w-4 sm:h-4" />
                  </div>
                  <div>
                    <p className="text-sm sm:text-xs font-bold leading-tight">{role.name}</p>
                    <p className="text-xs sm:text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">{role.subtitle}</p>
                  </div>
                </div>
                {isSelected && <Check className="w-5 h-5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  // Live IST Clock for Government Portal
  const [currentTime, setCurrentTime] = useState(() => {
    return new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine Portal Mode (Government vs Citizen)
  const isGovPath =
    location.pathname.startsWith('/gov') ||
    [
      '/about', '/disasters', '/emergency-alerts', '/habitations',
      '/capacity', '/relocation', '/relocation-sites', '/rescue-teams',
      '/analytics', '/resources', '/admin', '/settings'
    ].some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));

  const [portalMode, setPortalMode] = useState(() => {
    if (isGovPath) return 'gov';
    return localStorage.getItem('aasra_portal_mode') || localStorage.getItem('diastra_portal_mode') || 'citizen';
  });

  useEffect(() => {
    if (isGovPath) {
      setPortalMode('gov');
      localStorage.setItem('aasra_portal_mode', 'gov');
    } else if (location.pathname === '/' || location.pathname === '/community-reports' || location.pathname === '/citizen-login') {
      setPortalMode('citizen');
      localStorage.setItem('aasra_portal_mode', 'citizen');
    }
  }, [location.pathname, isGovPath]);

  const switchToCitizen = () => {
    setPortalMode('citizen');
    localStorage.setItem('aasra_portal_mode', 'citizen');
    navigate('/');
  };

  // Dark / Light Theme
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('disastra_theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  });

  useEffect(() => {
    const current = initTheme();
    setTheme(current);

    const handleThemeChange = (e) => {
      if (e.detail) {
        setTheme(e.detail);
      } else {
        setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      }
    };
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('disastra_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('disastra_theme', 'light');
    }
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: nextTheme }));
  };

  // Auth & Roles
  const [authUser, setAuthUser] = useState(() => {
    const saved = localStorage.getItem('dss_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [citizenUser, setCitizenUser] = useState(() => {
    const saved = localStorage.getItem('dss_citizen_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentRole, setCurrentRole] = useState(() => {
    return localStorage.getItem('dss_user_role') || 'national';
  });

  const [alertLogs, setAlertLogs] = useState(() => {
    const savedLogs = localStorage.getItem('dss_alert_logs');
    if (savedLogs) {
      try { return JSON.parse(savedLogs); } catch { return NOTIFICATIONS || []; }
    }
    return NOTIFICATIONS || [];
  });

  const notifRef = useRef(null);
  const roleRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    const handleAuth = () => {
      const saved = localStorage.getItem('dss_auth_user');
      setAuthUser(saved ? JSON.parse(saved) : null);
      const savedCitizen = localStorage.getItem('dss_citizen_user');
      setCitizenUser(savedCitizen ? JSON.parse(savedCitizen) : null);
    };

    window.addEventListener('authChanged', handleAuth);
    window.addEventListener('citizenAuthChanged', handleAuth);
    window.addEventListener('storage', handleAuth);

    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (roleRef.current && !roleRef.current.contains(e.target)) setRoleOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserDropdown(false);
    }
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('authChanged', handleAuth);
      window.removeEventListener('citizenAuthChanged', handleAuth);
      window.removeEventListener('storage', handleAuth);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleRoleChange = (roleId) => {
    if (authUser && authUser.role !== 'national') return;
    setCurrentRole(roleId);
    localStorage.setItem('dss_user_role', roleId);
    window.dispatchEvent(new Event('roleChanged'));
  };

  const handleGovLogout = () => {
    localStorage.removeItem('dss_auth_user');
    localStorage.setItem('dss_user_role', 'national');
    setAuthUser(null);
    setCurrentRole('national');
    window.dispatchEvent(new Event('authChanged'));
    window.dispatchEvent(new Event('roleChanged'));
    setUserDropdown(false);
    navigate('/gov/login');
  };

  const activeRoleObj = ROLES.find((r) => r.id === currentRole) || ROLES[0];
  const isDMLocked = authUser && authUser.role !== 'national';

  const isLinkActive = (to, altTo) => {
    if (location.pathname === to) return true;
    if (altTo && location.pathname === altTo) return true;
    return false;
  };

  const filteredAlerts = useMemo(() => {
    if (currentRole === 'national') return alertLogs;
    return alertLogs.filter((n) => {
      const txt = (n.title + ' ' + (n.message || '') + ' ' + (n.district || '')).toLowerCase();
      return txt.includes(currentRole.toLowerCase());
    });
  }, [alertLogs, currentRole]);

  const unreadCount = filteredAlerts.length;

  // =========================================================================
  // 1. RENDER: OFFICIAL GOVERNMENT COMMAND PORTAL NAVBAR (High-Grade GOI)
  // =========================================================================
  if (portalMode === 'gov') {
    return (
      <header className="sticky top-0 z-50 shadow-xl font-sans">
        {/* Official Apex Header: National Emblem + Ministry of Home Affairs + NDMA */}
        <div className="bg-[#0b1b33] text-white px-4 sm:px-6 py-2 border-b border-slate-700/80">
          <div className="max-w-[1750px] mx-auto flex flex-wrap items-center justify-between gap-4">
            
            {/* Left: National Seal & Official Identity */}
            <div className="flex items-center gap-3.5">
              <NationalEmblem className="w-8 h-10" variant="gold" />
              <div className="border-l border-slate-700/90 pl-3.5 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-black text-xs tracking-wider text-amber-300 uppercase">
                    {t('gov_portal_title')}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="font-serif text-[11px] tracking-wide text-slate-200">
                    {t('mha_title')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-100">
                    {t('ndma_title')}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Security Clearance + Live IST Clock + Language Selector + Exit to Citizen */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 text-xs">
              {/* Readiness Badge */}
              <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-800/90 border border-slate-700 text-[11px] font-mono">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-emerald-400 font-bold">DEFCON-ALPHA</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-300">READINESS LEVEL 1</span>
              </div>

              {/* Live IST Clock */}
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-amber-300 font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentTime} IST</span>
              </div>

              {/* All-India Multi-Language Selector */}
              <LanguageDropdown variant="gov" />

              {/* Switch to Public Citizen Portal */}
              <button
                onClick={switchToCitizen}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold shadow-sm transition active:scale-95 border border-blue-500/50"
                title="Switch to Public Citizen Portal"
              >
                <span>🌐 {t('switch_to_citizen')}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Tier 2: Government Incident Command Portal Header (Identity & Session Controls) */}
        <div className="bg-[#0f2444] text-white border-b border-slate-700/80">
          <div className="max-w-[1750px] mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">
              
              {/* Government Command Brand Designation */}
              <Link to="/gov" className="flex items-center gap-2.5 flex-shrink-0 group">
                <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-white shadow-inner p-1">
                  <Logo className="w-7 h-7" variant="light" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black tracking-wider text-white font-mono uppercase">
                      AASRA DSS
                    </span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono font-bold tracking-tight">
                      OFFICIAL
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-300 block font-medium">
                    Unified Multi-Hazard Incident Command
                  </span>
                </div>
              </Link>

              {/* Right Command Controls */}
              <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
                {/* Theme Toggle */}
                <button
                  onClick={handleToggleTheme}
                  className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-200" />}
                </button>

                {/* Notifications Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => {
                      setNotifOpen(!notifOpen);
                      setRoleOpen(false);
                      setUserDropdown(false);
                    }}
                    className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                    title="CAP Alert Broadcast Feed"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden text-slate-900 dark:text-slate-100">
                      <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                          <span className="text-xs font-bold uppercase tracking-wider">CAP Alert Logs</span>
                        </div>
                        <span className="text-[10px] font-bold bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/30">
                          {currentRole === 'national' ? 'All-India' : activeRoleObj.name.split(' ')[1]}
                        </span>
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredAlerts.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-xs">
                            No broadcast alerts recorded for this jurisdiction.
                          </div>
                        ) : (
                          filteredAlerts.map((n, idx) => (
                            <div key={idx} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition text-xs">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                  {n.title}
                                </p>
                                <span className="text-[10px] text-slate-400">{n.time || 'Recent'}</span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 text-center">
                        <Link
                          to="/gov/emergency-alerts"
                          onClick={() => setNotifOpen(false)}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Open Emergency Broadcast Center →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scope Switcher */}
                <div className="relative" ref={roleRef}>
                  {isDMLocked ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-emerald-950/40 border-emerald-700 text-emerald-300 text-xs font-bold">
                      <Lock className="w-3 h-3 text-emerald-400" />
                      <span className="hidden sm:inline">{activeRoleObj.name}</span>
                      <span className="sm:hidden">DM</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setRoleOpen(!roleOpen);
                        setNotifOpen(false);
                        setUserDropdown(false);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-600 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition"
                    >
                      <activeRoleObj.icon className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">{activeRoleObj.name}</span>
                      <span className="sm:hidden">{currentRole === 'national' ? 'NDMA' : 'DM'}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                  )}

                  {roleOpen && !isDMLocked && (
                    <RoleSwitcherDropdown
                      currentRole={currentRole}
                      onSelectRole={handleRoleChange}
                      onClose={() => setRoleOpen(false)}
                    />
                  )}
                </div>

                {/* Officer Profile / Login */}
                {authUser ? (
                  <div className="relative" ref={userRef}>
                    <button
                      onClick={() => setUserDropdown(!userDropdown)}
                      className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-left transition"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                        {authUser.name.charAt(0)}
                      </div>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {userDropdown && (
                <>
                  <div className="fixed inset-0 z-[60] bg-slate-900/20 backdrop-blur-sm sm:hidden" onClick={() => setUserDropdown(false)} />
                  <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:translate-x-0 sm:translate-y-0 sm:mt-2 sm:w-56 bg-slate-900 text-white rounded-2xl sm:rounded-xl shadow-2xl border border-slate-700 sm:border-slate-800 p-2 z-[70]">
                    <div className="px-3 py-3 sm:py-2 border-b border-slate-800">
                      <p className="text-sm sm:text-xs font-bold">{authUser.name}</p>
                      <p className="text-xs sm:text-[10px] text-slate-400 truncate">{authUser.email}</p>
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-900/60 text-blue-300 font-semibold text-[9px] rounded">
                        {authUser.designation}
                      </span>
                    </div>
                    <button
                      onClick={handleGovLogout}
                      className="w-full mt-1.5 flex items-center gap-2 px-3 py-3 sm:py-2 text-sm sm:text-xs font-semibold text-rose-400 hover:bg-rose-950/40 rounded-xl sm:rounded-lg transition"
                    >
                      <LogOut className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
                      {t('gov_sign_out')}
                    </button>
                  </div>
                </>
              )}
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-sm"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{t('gov_officer_login')}</span>
                  </Link>
                )}

                {/* Mobile Menu Button (< lg) */}
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="lg:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-800 transition"
                  aria-label="Toggle Menu"
                >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Mobile Dropdown for Govt Links (Shown below lg when open) */}
            {mobileOpen && (
              <div className="lg:hidden py-3 border-t border-slate-700/80 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {GOV_NAV_LINKS.map((link) => {
                  const active = isLinkActive(link.to, link.altTo);
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition ${
                        active
                          ? 'bg-blue-600 text-white font-bold shadow'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
                      <span className="truncate">{t(link.labelKey) || link.fallback}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tier 3: Dedicated Full-Width Navigation Bar for the 11 Command Modules */}
        <nav className="hidden lg:block bg-[#09172c] border-b border-slate-700/90 shadow-sm">
          <div className="max-w-[1750px] mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-1 xl:gap-1.5">
                {GOV_NAV_LINKS.map((link) => {
                  const active = isLinkActive(link.to, link.altTo);
                  const label = t(link.labelKey) || link.fallback;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap ${
                        active
                          ? 'bg-blue-600 text-white shadow border-b-2 border-amber-400'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5 opacity-80 hidden xl:inline" />}
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Real-Time Operational Status Indicator */}
              <div className="hidden 2xl:flex items-center gap-2 text-[11px] font-mono text-emerald-300 bg-emerald-950/40 px-3 py-1 rounded border border-emerald-700/40">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>COMMAND CONSOLE • ACTIVE</span>
              </div>
            </div>
          </div>
        </nav>
      </header>
    );
  }

  // =========================================================================
  // 2. RENDER: CITIZEN PUBLIC SAFETY PORTAL NAVBAR (Clean, Dedicated Public)
  // =========================================================================
  return (
    <header className="sticky top-0 z-50 shadow-sm font-sans">
      {/* Citizen Top Strip: Interactive Helpline with Direct Calling */}
      <div className="bg-red-700 text-white px-4 py-1.5 text-xs font-semibold shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-white animate-ping" />
            <span className="text-[11px] tracking-wide">
              {t('citizen_portal_sub')}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to={authUser ? "/gov" : "/gov/login"}
              className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-extrabold shadow-sm transition active:scale-95 border border-amber-300"
              title="Official Government Incident Command Portal"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-slate-950" />
              <span>🏛️ {t('switch_to_gov')} →</span>
            </Link>

            <a
              href="tel:112"
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-red-800/90 hover:bg-red-900 border border-red-500/40 text-[11px] font-bold text-amber-200 transition active:scale-95"
              title="Direct call National Emergency Helpline 112"
            >
              <PhoneCall className="w-3 h-3 animate-pulse text-amber-300" />
              <span>{t('sos_call')}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Citizen Navbar: Only Citizen Links, NO Gov Prompts */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            
            {/* Citizen Portal Logo */}
            <Link to="/" className="flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 flex items-center justify-center p-1 shadow-sm">
                <Logo className="w-8 h-8" variant="light" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none block">
                  AASRA
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block leading-tight mt-0.5">
                  {t('citizen_portal_title')}
                </span>
              </div>
            </Link>

            {/* Exact 3 Citizen Links (Home, Community Reports, Risk Map) */}
            <div className="hidden md:flex items-center gap-1">
              {CITIZEN_NAV_LINKS.map((link) => {
                const active = location.pathname === link.to;
                const Icon = link.icon;
                const label = t(link.labelKey) || link.fallback;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right Actions: All-India Multi-Language Dropdown, Theme Toggle, Citizen Login */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* All-India Language Dropdown */}
              <LanguageDropdown variant="citizen" />

              {/* Theme toggle */}
              <button
                onClick={handleToggleTheme}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

              {/* Citizen Login or Profile */}
              {citizenUser ? (
                <Link
                  to="/citizen-login"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">{citizenUser.name.split(' ')[0]}</span>
                  <span className="sm:hidden">{t('nav_profile')}</span>
                </Link>
              ) : (
                <Link
                  to="/citizen-login"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{t('nav_citizen_login')}</span>
                </Link>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Citizen Dropdown */}
          {mobileOpen && (
            <div className="md:hidden py-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
              {CITIZEN_NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <link.icon className="w-4 h-4" />
                  <span>{t(link.labelKey) || link.fallback}</span>
                </Link>
              ))}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Link
                  to={authUser ? "/gov" : "/gov/login"}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>🏛️ {t('switch_to_gov')}</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
