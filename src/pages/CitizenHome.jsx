import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PhoneCall, Shield, AlertTriangle, MapPin, Radio, CheckCircle2,
  ChevronRight, HeartPulse, LifeBuoy, FileText, Bell, Navigation,
  HelpCircle, Compass, Award, ExternalLink, Activity
} from 'lucide-react';

const HELPLINES = [
  { number: '112', label: 'National Emergency', desc: 'Police, Fire, Medical all-in-one', color: 'bg-red-650 text-white' },
  { number: '1070', label: 'NDMA Central Control', desc: 'National Disaster Response Desk', color: 'bg-amber-600 text-white' },
  { number: '1077', label: 'District Disaster Control', desc: 'Local DM emergency office', color: 'bg-blue-600 text-white' },
  { number: '108', label: 'Ambulance & Medical', desc: 'Immediate medical dispatch', color: 'bg-emerald-600 text-white' },
  { number: '1091', label: 'Women & Child Safety', desc: '24x7 safety assistance', color: 'bg-purple-600 text-white' },
];

const SURVIVAL_KIT_ITEMS = [
  { id: 'water', label: 'Drinking Water (3 Litres per person / day for 3 days)', category: 'Essentials' },
  { id: 'food', label: 'Non-perishable ready-to-eat dry food & snacks', category: 'Essentials' },
  { id: 'firstaid', label: 'First Aid Kit with bandages, antiseptic, personal meds', category: 'Medical' },
  { id: 'torch', label: 'Flashlight / Torch with extra batteries or solar charger', category: 'Tools' },
  { id: 'powerbank', label: 'Fully charged mobile phone power bank & charging cable', category: 'Communication' },
  { id: 'docs', label: 'Aadhaar, IDs, property papers sealed in waterproof pouch', category: 'Important' },
  { id: 'whistle', label: 'Emergency whistle (for signaling search & rescue teams)', category: 'Safety' },
  { id: 'mask', label: 'Dust masks / N95 masks and hand sanitizer', category: 'Hygiene' },
];

const ADVISORIES = [
  { id: 1, type: 'Flash Flood Alert', district: 'Darbhanga (Bihar)', severity: 'Severe', time: 'Active Now', message: 'Kosi River water level near warning mark. Low-lying panchayats advised to stay alert.' },
  { id: 2, type: 'Landslide Warning', district: 'Chamoli (Uttarakhand)', severity: 'Warning', time: '1 hr ago', message: 'Moderate rain may trigger loose slope movement along Badrinath NH corridor.' },
  { id: 3, type: 'Heavy Rainfall Warning', district: 'Wayanad (Kerala)', severity: 'Watch', time: '3 hrs ago', message: 'Isolated heavy rain expected in hilly catchment zones over next 24 hours.' },
];

const DOS_DONTS = {
  Flood: {
    dos: [
      'Move immediately to higher ground or designated multi-purpose cyclone/flood shelters.',
      'Turn off electricity main switch and cooking gas cylinders before leaving.',
      'Boil tap water or use chlorine tablets before drinking.',
      'Keep emergency phone numbers and SOS whistle handy.'
    ],
    donts: [
      'Do not walk or drive through moving flood waters ("Turn Around, Don’t Drown").',
      'Do not touch fallen electrical cables or submerged transformers.',
      'Do not spread unverified rumors on social media.'
    ]
  },
  Earthquake: {
    dos: [
      'DROP to your hands and knees, COVER your head and neck under sturdy furniture, HOLD ON until shaking stops.',
      'If outdoors, move to an open clear area away from buildings, powerlines, and bridges.',
      'Use stairs instead of elevators when exiting buildings after shaking ceases.'
    ],
    donts: [
      'Do not stand near exterior glass windows, mirrors, or heavy tall cupboards.',
      'Do not rush outside in a stampede while shaking is in progress.'
    ]
  },
  Landslide: {
    dos: [
      'Stay alert for unusual sounds like cracking trees or rolling boulders.',
      'Follow evacuation orders from local authorities without delay.',
      'Inform neighbors and elderly individuals when vacating vulnerable slopes.'
    ],
    donts: [
      'Do not stay near river valleys or steep mountain slopes during torrential downpours.',
      'Do not cross roads blocked by fresh debris until clearance teams give green signal.'
    ]
  },
  Cyclone: {
    dos: [
      'Board up or tape glass windows; trim tree branches near your house.',
      'Keep battery-operated radio tuned to local All India Radio / IMD bulletins.',
      'Anchor loose tin sheets and outdoor furniture securely.'
    ],
    donts: [
      'Do not venture into the sea or beaches if fishermen advisories are red.',
      'Do not step outside during the "eye of the storm" as fierce winds will return abruptly.'
    ]
  }
};

import { useLanguage } from '@/context/LanguageContext';

export default function CitizenHome() {
  const { language, t } = useLanguage();
  const [checkedKit, setCheckedKit] = useState(() => {
    const saved = localStorage.getItem('diastra_kit_checked');
    return saved ? JSON.parse(saved) : ['water', 'torch', 'powerbank'];
  });
  const [activeTab, setActiveTab] = useState('Flood');
  const [citizenUser, setCitizenUser] = useState(() => {
    const saved = localStorage.getItem('dss_citizen_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const handleAuth = () => {
      const saved = localStorage.getItem('dss_citizen_user');
      setCitizenUser(saved ? JSON.parse(saved) : null);
    };
    window.addEventListener('citizenAuthChanged', handleAuth);
    return () => window.removeEventListener('citizenAuthChanged', handleAuth);
  }, []);

  const toggleKitItem = (id) => {
    setCheckedKit(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('diastra_kit_checked', JSON.stringify(next));
      return next;
    });
  };

  const kitPercent = Math.round((checkedKit.length / SURVIVAL_KIT_ITEMS.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16">
      
      {/* 24x7 Helpline Ticker */}
      <div className="bg-red-700 text-white px-4 py-2 text-xs font-semibold shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-white animate-ping" />
            <span className="uppercase tracking-wider font-bold">24x7 Citizen Emergency Hotlines:</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
            <a href="tel:112" className="hover:underline flex items-center gap-1 bg-red-800/80 px-2 py-0.5 rounded">
              <PhoneCall className="w-3.5 h-3.5" /> 112 (Emergency)
            </a>
            <a href="tel:1070" className="hover:underline flex items-center gap-1 bg-red-800/80 px-2 py-0.5 rounded">
              <PhoneCall className="w-3.5 h-3.5" /> 1070 (NDMA)
            </a>
            <a href="tel:1077" className="hover:underline flex items-center gap-1 bg-red-800/80 px-2 py-0.5 rounded">
              <PhoneCall className="w-3.5 h-3.5" /> 1077 (District Control)
            </a>
            <a href="tel:108" className="hover:underline flex items-center gap-1 bg-red-800/80 px-2 py-0.5 rounded">
              <PhoneCall className="w-3.5 h-3.5" /> 108 (Ambulance)
            </a>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-900 via-indigo-950 to-slate-900 text-white pt-12 pb-16 px-4 sm:px-6 border-b border-slate-800">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="max-w-2xl space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('citizen_hero_tag')}</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                {t('citizen_hero_h1_1')} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-sky-300 to-emerald-300">
                  {t('citizen_hero_h1_2')}
                </span>
              </h1>
              
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {t('citizen_hero_desc')}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/community-reports"
                  className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-600/30 flex items-center gap-2 transition active:scale-95"
                >
                  <AlertTriangle className="w-4 h-4 animate-bounce" />
                  <span>{t('btn_report_sos')}</span>
                </Link>
                <Link
                  to="/risk-map"
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center gap-2 transition active:scale-95"
                >
                  <MapPin className="w-4 h-4" />
                  <span>{t('btn_find_shelter')}</span>
                </Link>
                {citizenUser ? (
                  <div className="px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Logged in as: <strong className="text-white">{citizenUser.name}</strong></span>
                  </div>
                ) : (
                  <Link
                    to="/citizen-login"
                    className="px-4 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center gap-2 transition"
                  >
                    <span>Citizen Login</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>

            {/* Quick SOS Card */}
            <div className="w-full lg:w-96 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
                    <HeartPulse className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Emergency Fast Dial</h3>
                    <p className="text-[11px] text-slate-400">Toll-free 24x7 response</p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                  Active
                </span>
              </div>

              <div className="space-y-2">
                {HELPLINES.slice(0, 4).map((h) => (
                  <a
                    key={h.number}
                    href={`tel:${h.number}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`px-2 py-1 rounded-md text-xs font-black ${h.color}`}>
                        {h.number}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200 group-hover:text-white">{h.label}</p>
                        <p className="text-[10px] text-slate-400">{h.desc}</p>
                      </div>
                    </div>
                    <PhoneCall className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                  </a>
                ))}
              </div>

              <p className="text-[10px] text-slate-400 text-center">
                *In case of network failure, switch phone to 2G or dial 112 directly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">

        {/* 3 Core Quick Access Action Cards */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              {t('services_title')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('services_sub')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Report Hazard */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <Radio className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {t('card1_title')}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t('card1_desc')}
                </p>
              </div>
              <Link
                to="/community-reports"
                className="mt-5 w-full py-2.5 px-4 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-bold text-xs flex items-center justify-between transition"
              >
                <span>{t('card1_btn')}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Card 2: Risk Map */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Safe Shelters & Risk Map
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Locate government-vetted cyclone shelters, relief camps, schools, and hospitals with available beds, safe drinking water, and backup power generators.
                </p>
              </div>
              <Link
                to="/risk-map"
                className="mt-5 w-full py-2.5 px-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-between transition"
              >
                <span>View Map & Evacuation Routes</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Card 3: Citizen Login */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Citizen Profile & Alerts
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Log in with your mobile number to track the status of your submitted reports, save family emergency contacts, and receive localized SMS/WhatsApp warnings.
                </p>
              </div>
              <Link
                to="/citizen-login"
                className="mt-5 w-full py-2.5 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-between transition"
              >
                <span>{citizenUser ? 'View My Citizen Profile' : 'Login / Register as Citizen'}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Live Active Advisories Section */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Live District Advisories & Early Warnings
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Synced from IMD & CWC Feeds
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ADVISORIES.map((adv) => (
              <div
                key={adv.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2 hover:border-blue-400 transition"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    adv.severity === 'Severe' 
                      ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400' 
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                  }`}>
                    {adv.severity}
                  </span>
                  <span className="text-[10px] text-slate-400">{adv.time}</span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{adv.type}</h4>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {adv.district}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{adv.message}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 72-Hour Family Emergency Survival Kit Checklist */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-850 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-blue-200/60 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider mb-1">
                <LifeBuoy className="w-3 h-3" /> NDMA Recommended
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Interactive 72-Hour Family Survival Kit Checklist
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Tick items as you pack them before evacuating or during high-alert advisories.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full md:w-64 space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Kit Preparedness</span>
                <span className={kitPercent === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}>
                  {kitPercent}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    kitPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${kitPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
            {SURVIVAL_KIT_ITEMS.map((item) => {
              const isChecked = checkedKit.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleKitItem(item.id)}
                  type="button"
                  className={`p-3 rounded-xl text-left border transition flex items-start gap-3 ${
                    isChecked
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition ${
                    isChecked ? 'bg-emerald-600 text-white' : 'border border-slate-300 dark:border-slate-600'
                  }`}>
                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                      {item.category}
                    </span>
                    <p className="text-xs font-semibold leading-tight">{item.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Disaster Do's and Don'ts */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Life-Saving Guidelines: Do's & Don'ts
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Standard operating procedures for citizens during active hazards
            </p>
          </div>

          {/* Hazard Selector Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-3">
            {Object.keys(DOS_DONTS).map((hazard) => (
              <button
                key={hazard}
                onClick={() => setActiveTab(hazard)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === hazard
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {hazard}
              </button>
            ))}
          </div>

          {/* Guidelines Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/40 p-5 space-y-3">
              <h4 className="text-sm font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> WHAT YOU SHOULD DO (DO'S)
              </h4>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                {DOS_DONTS[activeTab].dos.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/40 p-5 space-y-3">
              <h4 className="text-sm font-black text-red-800 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" /> WHAT YOU MUST AVOID (DON'TS)
              </h4>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                {DOS_DONTS[activeTab].donts.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Official Authority Banner Link */}
        <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl border border-indigo-900/50 p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
              <span>National & District Authority Access</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              Are you an authorized Disaster Response Officer?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              District Magistrates, NDRF Commanders, and SDMA directors can access the unified Government Command Dashboard with multi-hazard GIS layers, evacuation algorithms, and automated shelter allocation gap tools.
            </p>
          </div>
          <Link
            to="/gov"
            className="px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-400/20 flex items-center gap-2 transition flex-shrink-0 active:scale-95"
          >
            <Shield className="w-4 h-4" />
            <span>Enter Government Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

      </div>
    </div>
  );
}

function ArrowRight(props) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}
