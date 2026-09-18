import { useEffect, useState, useMemo } from 'react';
import { PageHeader, Disclaimer } from '@/components/Layout';
import {
  Bell,
  BellRing,
  CloudRain,
  Activity,
  AlertTriangle,
  Flame,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Send,
  Radio,
  Settings,
  Volume2,
  VolumeX,
  Sliders,
  Check,
  X,
  ExternalLink,
  Smartphone,
  MessageSquare,
  FileCode,
  Download,
  Copy,
  Users,
  MapPin,
  PhoneCall,
  Mic,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendTestHazardAlert,
  displayDesktopNotification,
  playEmergencyAlertChime,
  getOrCreateDeviceToken,
  speakEmergencyAnnouncement,
  generateCAPAlertXML,
  downloadCAPAlertFile,
} from '@/services/notificationService';

export default function EmergencyAlerts() {
  const [permission, setPermission] = useState('default');
  const [deviceToken, setDeviceToken] = useState('');
  const [district, setDistrict] = useState('Chamoli');
  const [subscribing, setSubscribing] = useState(false);

  // Active Role tracking for multi-district awareness
  const [activeRole, setActiveRole] = useState(() => {
    return localStorage.getItem('dss_user_role') || 'national';
  });

  useEffect(() => {
    const handleRoleChange = () => {
      const role = localStorage.getItem('dss_user_role') || 'national';
      setActiveRole(role);
      if (role === 'chamoli') setDistrict('Chamoli');
      else if (role === 'darbhanga') setDistrict('Darbhanga');
      else if (role === 'wayanad') setDistrict('Wayanad');
    };
    window.addEventListener('roleChanged', handleRoleChange);
    window.addEventListener('storage', handleRoleChange);
    return () => {
      window.removeEventListener('roleChanged', handleRoleChange);
      window.removeEventListener('storage', handleRoleChange);
    };
  }, []);

  // Preferences
  const [prefs, setPrefs] = useState({
    rain: true,
    flood: true,
    earthquake: true,
    landslide: true,
  });

  // Test triggering state
  const [testingHazard, setTestingHazard] = useState(null);
  const [lastDispatched, setLastDispatched] = useState(null);

  // Auto monitoring
  const [autoMonitor, setAutoMonitor] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);

  // History & Subscribers
  const [history, setHistory] = useState([]);
  const [subscriberCount, setSubscriberCount] = useState(0);

  // Habitations dataset for live geo-fencing audience calculation
  const [habitations, setHabitations] = useState([]);

  // Advanced Features State
  const [voiceLang, setVoiceLang] = useState('hi-IN'); // 'hi-IN' | 'en-IN' | 'off'
  const [geoRadius, setGeoRadius] = useState(15); // km radius
  const [activeChannelTab, setActiveChannelTab] = useState('cell'); // 'cell' | 'sms' | 'whatsapp' | 'cap'
  const [showRedAlertModal, setShowRedAlertModal] = useState(false);
  const [capCopied, setCapCopied] = useState(false);

  // Firebase FCM Config State
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [firebaseConfig, setFirebaseConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aasra_firebase_config') || localStorage.getItem('diastra_firebase_config') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (isNotificationSupported()) {
      setPermission(getNotificationPermission());
      setDeviceToken(getOrCreateDeviceToken());
    }
    loadHistory();
    loadSubscribers();
    loadHabitations();
  }, []);

  // Background hazard evaluator interval
  useEffect(() => {
    if (!autoMonitor) return;

    const interval = setInterval(() => {
      runHazardEvaluation(false);
    }, 45000); // 45 seconds heartbeat

    return () => clearInterval(interval);
  }, [autoMonitor, permission]);

  const loadHabitations = async () => {
    try {
      let res = await fetch('/api/habitations').catch(() => null);
      if (!res || !res.ok) res = await fetch('http://127.0.0.1:8000/api/habitations');
      if (res.ok) {
        const data = await res.json();
        setHabitations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Could not load habitations for audience calculation:', err);
    }
  };

  const loadHistory = async () => {
    try {
      let res = await fetch('/api/notifications/history').catch(() => null);
      if (!res || !res.ok) res = await fetch('http://127.0.0.1:8000/api/notifications/history');
      if (res.ok) setHistory(await res.json());
    } catch (err) {
      console.warn('Could not load history:', err);
    }
  };

  const loadSubscribers = async () => {
    try {
      let res = await fetch('/api/notifications/subscribers').catch(() => null);
      if (!res || !res.ok) res = await fetch('http://127.0.0.1:8000/api/notifications/subscribers');
      if (res.ok) {
        const data = await res.json();
        setSubscriberCount(data.total_subscribers || 0);
      }
    } catch (err) {
      console.warn('Could not load subscribers:', err);
    }
  };

  const handleRequestPermission = async () => {
    try {
      setSubscribing(true);
      const res = await requestNotificationPermission('Incident Officer Device', district);
      setPermission(res.permission);
      if (res.token) setDeviceToken(res.token);
      loadSubscribers();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubscribing(false);
    }
  };

  const handleSendTest = async (hazardType) => {
    try {
      setTestingHazard(hazardType);
      const alertData = await sendTestHazardAlert(hazardType, district);
      setLastDispatched(alertData);
      loadHistory();

      // Multilingual Voice Announcement Trigger
      if (voiceLang !== 'off') {
        let voiceText = '';
        if (voiceLang === 'hi-IN') {
          voiceText =
            hazardType === 'Rain'
              ? `सावधान! ${district} जिले में भारी वर्षा और बादल फटने की चेतावनी है। कृपया तुरंत सुरक्षित आश्रय में पहुंचे।`
              : hazardType === 'Flood'
              ? `आपातकालीन चेतावनी! ${district} में नदी का जलस्तर खतरे के निशान से ऊपर है। तुरंत बाढ़ राहत केंद्र पहुंचे।`
              : hazardType === 'Earthquake'
              ? `भूकंप चेतावनी! ${district} सेक्टर में तीव्र झटके दर्ज किए गए हैं। तुरंत खुली जगह पर जाएं।`
              : `भूस्खलन चेतावनी! ${district} पहाड़ी मार्गों पर यात्रा न करें और सुरक्षित रहें।`;
        } else {
          voiceText = `Emergency Alert for ${district}! Critical ${hazardType} threshold exceeded. Evacuate immediately to designated relief shelters.`;
        }

        setTimeout(() => {
          speakEmergencyAnnouncement(voiceText, voiceLang);
        }, 350);
      }
    } catch (err) {
      alert('Failed to send test notification: ' + err.message);
    } finally {
      setTestingHazard(null);
    }
  };

  const handleManualVoiceTest = () => {
    if (voiceLang === 'off') {
      alert('Please enable Hindi or English voice announcement first.');
      return;
    }
    const sampleText =
      voiceLang === 'hi-IN'
        ? `सावधान! यह ${district} आपदा नियंत्रण कक्ष से परीक्षण आपातकालीन ध्वनि चेतावनी है। सभी नागरिक सुरक्षित आश्रयों की ओर प्रस्थान करें।`
        : `Attention! This is a test emergency broadcast from ${district} Disaster Emergency Operation Center. Please follow safety protocols.`;
    speakEmergencyAnnouncement(sampleText, voiceLang);
  };

  const runHazardEvaluation = async (manual = true) => {
    try {
      if (manual) setEvaluating(true);
      let res = await fetch('/api/notifications/evaluate-hazards', { method: 'POST' }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch('http://127.0.0.1:8000/api/notifications/evaluate-hazards', { method: 'POST' });
      }
      if (res.ok) {
        const data = await res.json();
        setEvaluationResult(data);
        if (data.triggered_alerts && data.triggered_alerts.length > 0) {
          // Push notifications for newly evaluated critical alerts
          data.triggered_alerts.forEach((alert) => {
            displayDesktopNotification(alert.title, {
              body: alert.message,
              severity: alert.severity,
            });
            if (voiceLang !== 'off') {
              const text =
                voiceLang === 'hi-IN'
                  ? `सावधान! ${alert.title}. कृपया तुरंत सुरक्षित राहत शिविर की ओर जाएं।`
                  : `Emergency Alert: ${alert.title}. ${alert.message}`;
              speakEmergencyAnnouncement(text, voiceLang);
            }
          });
          setLastDispatched(data.triggered_alerts[0]);
          loadHistory();
        }
      }
    } catch (err) {
      console.warn('Hazard evaluation error:', err);
    } finally {
      if (manual) setEvaluating(false);
    }
  };

  const saveFirebaseConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('aasra_firebase_config', JSON.stringify(firebaseConfig));
    setShowFirebaseModal(false);
    alert('Firebase FCM configuration saved successfully!');
  };

  // Geo-Fenced Audience Math (using habitations)
  const targetedHabitations = useMemo(() => {
    const list = habitations.filter((h) =>
      district === 'All Districts' ? true : h.district?.toLowerCase() === district.toLowerCase()
    );
    if (!list.length) return habitations.slice(0, 3);
    const count = Math.min(list.length, Math.max(1, Math.round((geoRadius / 50) * list.length)));
    return list.slice(0, count);
  }, [habitations, district, geoRadius]);

  const estimatedAudience = useMemo(() => {
    return targetedHabitations.reduce((acc, h) => acc + (h.population || 2600), 0);
  }, [targetedHabitations]);

  // Current Alert Payload for CAP v1.2 Standard Generator
  const currentAlertPayload = useMemo(() => {
    return (
      lastDispatched || {
        id: 'DEMO-7921',
        title: `Multi-Hazard Emergency Warning (${district} Basin)`,
        message: `Doppler precipitation (>65mm) and river flood surge detected in ${district} Sector. Evacuate immediately.`,
        severity: 'Critical',
        district: district,
        dispatched_at: new Date().toISOString(),
      }
    );
  }, [lastDispatched, district]);

  const capXML = useMemo(() => {
    return generateCAPAlertXML(currentAlertPayload);
  }, [currentAlertPayload]);

  const handleCopyCAP = () => {
    navigator.clipboard.writeText(capXML);
    setCapCopied(true);
    setTimeout(() => setCapCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {/* Top Header & Trigger Takeover Drill Action */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <PageHeader
            title="Emergency Early Warning & Omnichannel Broadcast"
            subtitle="CAP v1.2 standard alerts, Web Push, Cell Broadcast (WEA), Voice Siren & DLT SMS simulation"
            icon={BellRing}
          />

          <button
            onClick={() => {
              setShowRedAlertModal(true);
              if (voiceLang !== 'off') {
                handleManualVoiceTest();
              } else {
                playEmergencyAlertChime('critical');
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/20 transition transform active:scale-95 animate-pulse"
          >
            <ShieldAlert className="w-4 h-4" />
            🚨 Trigger Citizen Red Alert Screen Takeover Drill
          </button>
        </div>

        {/* Permission & Device Registration Banner with Voice Settings */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl mb-8 border border-blue-800/50 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-400/30">
                  <Bell className="w-5 h-5 animate-bounce" />
                </span>
                <h2 className="text-lg font-bold text-white">Browser Push & Omnichannel Alert Integration</h2>
              </div>
              <p className="text-xs text-blue-100/90 leading-relaxed">
                When disaster thresholds are breached (cloudburst precipitation &ge; 50mm, CWC river discharge &ge; 8000 m³/s, or USGS seismic magnitude &ge; 4.2), this engine automatically pushes real Windows desktop alerts with audio sirens and multilingual voice speech.
              </p>
              {deviceToken && (
                <p className="text-[11px] text-blue-300/90 font-mono break-all bg-black/20 p-2 rounded-lg border border-blue-500/20">
                  <strong className="text-blue-200">Device Token:</strong> {deviceToken}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              {permission === 'granted' ? (
                <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 rounded-xl text-xs font-bold shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Push Alerts Enabled (Active)
                </div>
              ) : (
                <button
                  onClick={handleRequestPermission}
                  disabled={subscribing}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition transform active:scale-95 disabled:opacity-50"
                >
                  <Bell className="w-4 h-4" />
                  {subscribing ? 'Requesting...' : '🔔 Enable Live Emergency Alerts'}
                </button>
              )}

              <button
                onClick={() => setShowFirebaseModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-xl transition shadow-sm"
              >
                <Settings className="w-4 h-4" />
                Firebase FCM Setup
              </button>
            </div>
          </div>

          {/* Voice Speech Synthesizer Control Bar */}
          <div className="mt-6 pt-4 border-t border-blue-800/40 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-blue-200 font-semibold">
                <Mic className="w-4 h-4 text-blue-400" />
                <span>Multilingual Spoken Siren:</span>
              </div>
              <select
                value={voiceLang}
                onChange={(e) => setVoiceLang(e.target.value)}
                className="bg-blue-900/60 border border-blue-500/30 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-medium"
              >
                <option value="hi-IN">🇮🇳 Hindi Voice Announcement (हिंदी वाणी)</option>
                <option value="en-IN">🇬🇧 English Voice Announcement (Indian English)</option>
                <option value="off">🔇 Mute Spoken Voice (Chime Only)</option>
              </select>
            </div>

            <button
              onClick={handleManualVoiceTest}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-lg text-blue-200 text-xs font-medium transition"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Test Voice Announcement Now
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column: Live Test Broadcast Controls */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Live Test Broadcast Triggers (Instant Desktop Push Demo)
                  </h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Test live browser pop-ups</span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
                Click any hazard below to test how citizens and district officers receive real desktop notifications and audible sirens when an emergency alert is triggered:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rain Alert Button */}
                <button
                  onClick={() => handleSendTest('Rain')}
                  disabled={testingHazard !== null}
                  className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 transition text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                      <CloudRain className="w-4 h-4" />
                    </div>
                    <Send className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">🌧️ Test Heavy Rain Alert</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                    Triggers Doppler precipitation alert (&gt;65mm warning).
                  </p>
                </button>

                {/* Flood Alert Button */}
                <button
                  onClick={() => handleSendTest('Flood')}
                  disabled={testingHazard !== null}
                  className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100/80 dark:hover:bg-rose-900/40 transition text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-rose-600 text-white rounded-lg shadow-sm">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <Send className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 group-hover:translate-x-1 transition" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">⚠️ Test Critical Flood Alert</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                    Triggers CWC river discharge breach (&gt;9,500 m³/s).
                  </p>
                </button>

                {/* Earthquake Alert Button */}
                <button
                  onClick={() => handleSendTest('Earthquake')}
                  disabled={testingHazard !== null}
                  className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 transition text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-amber-600 text-white rounded-lg shadow-sm">
                      <Activity className="w-4 h-4" />
                    </div>
                    <Send className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">🌎 Test Earthquake Alert</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                    Triggers USGS live seismic tremor (Mag 4.8 event).
                  </p>
                </button>

                {/* Landslide Alert Button */}
                <button
                  onClick={() => handleSendTest('Landslide')}
                  disabled={testingHazard !== null}
                  className="p-4 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/70 dark:bg-teal-950/40 hover:bg-teal-100/80 dark:hover:bg-teal-900/40 transition text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-teal-600 text-white rounded-lg shadow-sm">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <Send className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 group-hover:translate-x-1 transition" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">🏔️ Test Landslide Alert</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                    Triggers Geological Survey slope instability warning.
                  </p>
                </button>
              </div>

              {lastDispatched && (
                <div className="mt-5 p-4 bg-slate-100 dark:bg-slate-750 border border-slate-200 dark:border-slate-650 rounded-xl flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg mt-0.5 border border-blue-200 dark:border-blue-800">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Last Dispatched: {lastDispatched.title}
                    </p>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">
                      {lastDispatched.message}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Geo-Fencing Radius & Target Audience Estimator */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Targeted Geo-Fencing Radius & Population Reach Estimator
                  </h4>
                </div>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                  {geoRadius} km Radius Circle
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                Prevents state-wide panic by restricting emergency broadcast to the immediate disaster corridor. Dynamic aggregation calculates the audience reachable within this perimeter:
              </p>

              <div className="space-y-4">
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={geoRadius}
                  onChange={(e) => setGeoRadius(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                />

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Target Radius</p>
                    <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">{geoRadius} km</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Citizens Reached</p>
                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ~{estimatedAudience.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Habitations</p>
                    <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">
                      {targetedHabitations.length} Villages
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Covered Villages:</span>
                  {targetedHabitations.map((h) => (
                    <span
                      key={h.id}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded"
                    >
                      {h.name} ({h.population || 2500})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Automated Evaluator Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Automated Cloud Telemetry Monitor
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                  Background worker scans Open-Meteo rainfall & USGS seismic API every 45s.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={autoMonitor}
                    onChange={(e) => setAutoMonitor(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  Auto-Heartbeat Active
                </label>

                <button
                  onClick={() => runHazardEvaluation(true)}
                  disabled={evaluating}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin' : ''}`} />
                  Scan Telemetry Now
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Alert Preferences & Subscriber Stats */}
          <div className="space-y-6">
            {/* Preferences Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-4 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Citizen Alert Subscriptions
              </h3>

              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-750 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 transition cursor-pointer">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">🌧️ Heavy Rain Alerts</span>
                  <input
                    type="checkbox"
                    checked={prefs.rain}
                    onChange={(e) => setPrefs({ ...prefs, rain: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-750 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 transition cursor-pointer">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">⚠️ Critical Flood Alerts</span>
                  <input
                    type="checkbox"
                    checked={prefs.flood}
                    onChange={(e) => setPrefs({ ...prefs, flood: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-750 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 transition cursor-pointer">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">🌎 Seismic Tremor Alerts</span>
                  <input
                    type="checkbox"
                    checked={prefs.earthquake}
                    onChange={(e) => setPrefs({ ...prefs, earthquake: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-750 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 transition cursor-pointer">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">🏔️ Landslide Corridor Alerts</span>
                  <input
                    type="checkbox"
                    checked={prefs.landslide}
                    onChange={(e) => setPrefs({ ...prefs, landslide: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Registered Devices:</span>
                <span className="font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 px-2.5 py-0.5 rounded">
                  {subscriberCount} Devices
                </span>
              </div>
            </div>

            {/* Sound Testing Button */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 text-center">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">Test Audio Alert Siren</h4>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => playEmergencyAlertChime('standard')}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-650 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 transition"
                >
                  Standard Chime
                </button>
                <button
                  onClick={() => playEmergencyAlertChime('critical')}
                  className="px-3 py-1.5 bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 dark:hover:bg-rose-900/60 text-xs font-semibold rounded-lg text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 transition"
                >
                  🚨 Critical Siren
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Omnichannel Multi-Network Broadcast Simulator (WEA, SMS, WhatsApp, CAP v1.2) */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-8">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Omnichannel Multi-Network Broadcast Simulator (NDMA Standard)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Inspect how alerts fan out to Cell Broadcast (WEA), Bulk SMS Gateways, WhatsApp SOS Bots, and CAP 1.2 XML feeds.
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 dark:bg-slate-700/80 p-1 rounded-xl">
              <button
                onClick={() => setActiveChannelTab('cell')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeChannelTab === 'cell'
                    ? 'bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Cell Broadcast (WEA)
              </button>

              <button
                onClick={() => setActiveChannelTab('sms')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeChannelTab === 'sms'
                    ? 'bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Bulk SMS (DLT)
              </button>

              <button
                onClick={() => setActiveChannelTab('whatsapp')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeChannelTab === 'whatsapp'
                    ? 'bg-white dark:bg-slate-850 text-emerald-600 dark:text-emerald-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                WhatsApp SOS Bot
              </button>

              <button
                onClick={() => setActiveChannelTab('cap')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeChannelTab === 'cap'
                    ? 'bg-white dark:bg-slate-850 text-purple-600 dark:text-purple-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                CAP v1.2 XML Feed
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Tab 1: Cell Broadcast / Wireless Emergency Alert (WEA) */}
            {activeChannelTab === 'cell' && (
              <div className="max-w-xl mx-auto">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500 dark:border-amber-600 rounded-2xl shadow-xl space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-300/60 dark:border-amber-700/60">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-bounce" />
                      <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                        EMERGENCY ALERT — SEVERE THREAT DETECTED
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded">
                      GOV CELL BROADCAST
                    </span>
                  </div>

                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {currentAlertPayload.title}
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                    {currentAlertPayload.message} Proceed to nearest designated high-ground shelter immediately. Avoid low-lying riverbeds.
                  </p>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                    <span>Cell Tower LAC/CID: 404-45-7281 (Sector {district})</span>
                    <button
                      onClick={() => playEmergencyAlertChime('critical')}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition"
                    >
                      🔊 Test Horn Sound
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-3">
                  Simulates telecom tower cell-broadcast pushed directly to mobile devices without requiring an app or internet connection.
                </p>
              </div>
            )}

            {/* Tab 2: Bulk SMS Gateway (TRAI DLT 160-char) */}
            {activeChannelTab === 'sms' && (
              <div className="max-w-xl mx-auto space-y-4">
                <div className="p-4 bg-slate-100 dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-2xl shadow-inner font-mono text-xs">
                  <div className="flex items-center justify-between mb-2 text-slate-500 dark:text-slate-400 text-[11px]">
                    <span>From: <strong>VM-NDMAGOV</strong></span>
                    <span>TRAI DLT Header: Registered</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 leading-relaxed">
                    [DISASTER-ALERT] CRITICAL {currentAlertPayload.title} issued for {district}. Evacuate to nearest shelter immediately. Emergency Helpline: 1077.
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Characters: 138 / 160 (1 SMS Credit)</span>
                    <span>Language: GSM 7-bit + Unicode</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold">Estimated Dispatch</p>
                    <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                      ~{estimatedAudience.toLocaleString()} Nos
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold">Delivery Rate</p>
                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">99.4%</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold">Telecom PRI Tunnel</p>
                    <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">Jio / BSNL</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: WhatsApp Disaster SOS Bot */}
            {activeChannelTab === 'whatsapp' && (
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl shadow-lg space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-emerald-200 dark:border-emerald-800">
                    <div className="w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        Disaster Emergency Command (DEOC)
                        <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">Verified Official</span>
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Automated Citizen Assistance Bot</p>
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                    <p className="font-bold text-rose-600 dark:text-rose-400">
                      🚨 URGENT: {currentAlertPayload.title}
                    </p>
                    <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                      {currentAlertPayload.message}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      Recommended Shelter: Government Inter College Campus (1.8 km)
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <button
                      onClick={() => alert('Opening Designated Evacuation Route on Live GIS Map...')}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
                    >
                      🗺️ View Safe Evacuation Route (OSRM)
                    </button>
                    <button
                      onClick={() => alert('Connecting to District Emergency Control Room (1077)...')}
                      className="w-full py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-650 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-600 rounded-lg transition"
                    >
                      📞 Call Control Room (Toll-Free 1077)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Common Alerting Protocol (CAP v1.2 OASIS Standard) */}
            {activeChannelTab === 'cap' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded">
                      OASIS CAP v1.2 Compliant
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      Machine-readable payload automatically broadcast to IMD, NDMA Sachet, and local FM radio transmitters.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyCAP}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-600 transition"
                    >
                      {capCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {capCopied ? 'Copied XML' : 'Copy XML'}
                    </button>

                    <button
                      onClick={() => downloadCAPAlertFile(currentAlertPayload, 'xml')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download CAP 1.2 XML
                    </button>

                    <button
                      onClick={() => downloadCAPAlertFile(currentAlertPayload, 'json')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-sm transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download JSON
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto border border-slate-800 shadow-inner max-h-72">
                  <pre>{capXML}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dispatched History Log */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-8">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Emergency Broadcast Dispatch Logs</h3>
            </div>
            <button onClick={loadHistory} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Refresh Logs
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
            {history.length === 0 ? (
              <div className="p-6 text-center text-slate-400 dark:text-slate-500">No emergency broadcasts triggered yet.</div>
            ) : (
              history.map((h) => (
                <div key={h.id} className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-750 transition flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{h.title}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        h.severity === 'Critical'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}>
                        {h.severity}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mt-1">{h.message}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-400 flex-shrink-0">
                    {new Date(h.dispatched_at).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Fullscreen Citizen Red Alert Takeover Drill Modal */}
        {showRedAlertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 text-white w-full max-w-2xl rounded-3xl shadow-2xl border-4 border-rose-600 p-6 md:p-8 space-y-6 relative overflow-hidden animate-pulse">
              <div className="flex items-center justify-between pb-4 border-b border-rose-900/60">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-rose-600 text-white rounded-xl shadow-lg">
                    <ShieldAlert className="w-7 h-7" />
                  </span>
                  <div>
                    <h2 className="text-base md:text-lg font-black tracking-wide text-rose-500 uppercase">
                      🚨 CRITICAL DISASTER ALERT — IMMEDIATE ACTION REQUIRED
                    </h2>
                    <p className="text-xs text-rose-200/80">
                      National Disaster Management Authority (NDMA) & DEOC {district}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowRedAlertModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-4 bg-rose-950/50 border border-rose-800/80 rounded-2xl space-y-2">
                <p className="text-sm font-bold text-white">
                  {currentAlertPayload.title}
                </p>
                <p className="text-xs text-rose-100 leading-relaxed">
                  {currentAlertPayload.message} Cloudburst precipitation and river discharge has exceeded critical danger thresholds. Flash flood danger is active along river channels and vulnerable slopes.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-800/90 border border-slate-700 rounded-xl space-y-1">
                  <p className="text-slate-400 uppercase font-bold text-[10px]">Designated Safe Shelter</p>
                  <p className="text-sm font-black text-white">Government Inter College</p>
                  <p className="text-[11px] text-emerald-400 font-semibold">1.8 km via Highway (Turn-by-Turn Route Ready)</p>
                </div>

                <div className="p-4 bg-slate-800/90 border border-slate-700 rounded-xl space-y-1">
                  <p className="text-slate-400 uppercase font-bold text-[10px]">Emergency Control Room</p>
                  <p className="text-sm font-black text-white">Dial 1077 or 112</p>
                  <p className="text-[11px] text-blue-400 font-semibold">Toll-Free 24x7 State Emergency Helpline</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  onClick={handleManualVoiceTest}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-600 transition"
                >
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  Replay Audio Siren & Spoken Voice
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      alert('Connecting to 1077 Emergency Control Room...');
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg transition"
                  >
                    <PhoneCall className="w-4 h-4" />
                    Call 1077 Helpline
                  </button>

                  <button
                    onClick={() => setShowRedAlertModal(false)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg transition"
                  >
                    I am Safe / Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Firebase Configuration Modal */}
        {showFirebaseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-850 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Firebase Cloud Messaging (FCM) Setup</h3>
                <button onClick={() => setShowFirebaseModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={saveFirebaseConfig} className="p-6 space-y-4 text-xs">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Connect your custom Firebase project for multi-device cross-platform push notifications. (Native browser notifications operate seamlessly even without this).
                </p>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">API Key</label>
                  <input
                    type="text"
                    value={firebaseConfig.apiKey || ''}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Project ID</label>
                  <input
                    type="text"
                    value={firebaseConfig.projectId || ''}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })}
                    placeholder="my-weather-alert"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Web Push Certificate (VAPID Key)</label>
                  <input
                    type="text"
                    value={firebaseConfig.vapidKey || ''}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, vapidKey: e.target.value })}
                    placeholder="BExxxxxxxxxxxxxxxxxxxxxxxxx..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowFirebaseModal(false)}
                    className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition"
                  >
                    Save FCM Config
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <Disclaimer />
      </div>
    </div>
  );
}
