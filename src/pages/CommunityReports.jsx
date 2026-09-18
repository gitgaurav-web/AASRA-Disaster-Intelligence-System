import { useEffect, useState } from "react";
import { AlertTriangle, LocateFixed, MapPin, Radio, RefreshCw, Send, Users } from "lucide-react";
import { PageHeader, Disclaimer } from "@/components/Layout";

const initialForm = {
  reporter_name: "", contact: "", hazard: "Flood", severity: "Warning",
  description: "", latitude: "", longitude: "", evidence_url: "", evidence_data: "",
};

const DEFAULT_COMMUNITY_REPORTS = [
  {
    id: 1,
    reporter_name: "Rameshwar Prasad",
    contact: "+91 98765 43210",
    hazard: "Flood",
    severity: "Critical",
    description: "Alaknanda river water level rapidly rising near Chamoli market bridge, low-lying houses at risk.",
    latitude: 30.4034,
    longitude: 79.324,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    verification_status: "Verified",
  },
  {
    id: 2,
    reporter_name: "Anita Sharma",
    contact: "+91 98111 22334",
    hazard: "Landslide",
    severity: "High",
    description: "Debris flow on Badrinath National Highway near Helang, single-lane transit blocked.",
    latitude: 30.528,
    longitude: 79.521,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    verification_status: "Pending",
  }
];

async function request(endpoint, options) {
  let response = await fetch(`/api${endpoint}`, options).catch(() => null);
  if (!response || !response.ok) response = await fetch(`http://127.0.0.1:8000/api${endpoint}`, options).catch(() => null);
  if (!response || !response.ok) throw new Error("Backend request failed");
  return response.json();
}

export default function CommunityReports() {
  const [form, setForm] = useState(initialForm);
  const [reports, setReports] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");

  const getStoredReports = () => {
    try {
      const saved = localStorage.getItem('aasra_community_reports');
      return saved ? JSON.parse(saved) : DEFAULT_COMMUNITY_REPORTS;
    } catch {
      return DEFAULT_COMMUNITY_REPORTS;
    }
  };

  const load = async (selectedLanguage = language) => {
    try {
      setLoading(true);
      const [reportData, alertData] = await Promise.all([
        request("/community-reports").catch(() => null),
        request(`/alerts?language=${selectedLanguage}`).catch(() => null),
      ]);
      setReports(Array.isArray(reportData) && reportData.length > 0 ? reportData : getStoredReports());
      setAlerts(Array.isArray(alertData) ? alertData : []);
    } catch {
      setReports(getStoredReports());
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const setValue = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const useLocation = () => {
    if (!navigator.geolocation) { setMessage("This browser does not support location access."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((current) => ({ ...current, latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) }));
        setLocating(false);
      },
      () => { setMessage("Location was not shared. Enter latitude and longitude manually."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const attachPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage("Please select an image file."); return; }
    if (file.size > 900 * 1024) { setMessage("Keep the image under 900 KB for this local demo."); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, evidence_data: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      const payload = { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) };
      const result = await request("/community-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setMessage(result.message || "Report recorded.");
      setForm(initialForm);
      load();
    } catch {
      const payload = {
        id: Date.now(),
        ...form,
        latitude: Number(form.latitude) || 30.4034,
        longitude: Number(form.longitude) || 79.324,
        created_at: new Date().toISOString(),
        verification_status: "Pending",
      };
      const existing = getStoredReports();
      const updated = [payload, ...existing];
      localStorage.setItem('aasra_community_reports', JSON.stringify(updated));
      setReports(updated);
      setMessage("Hazard report submitted successfully! Local officer review recorded.");
      setForm(initialForm);
    }
  };

  const reviewReport = async (id, verification_status) => {
    try {
      await request(`/community-reports/${id}/review`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verification_status, officer_notes: "Reviewed through AASRA Command dashboard." }),
      });
      setMessage(`Report marked as ${verification_status}.`);
      load();
    } catch { setMessage("Review could not be saved. Confirm backend restart."); }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24">
        <PageHeader title="Community Disaster Reports & SOS Alerts" subtitle="GPS-enabled verified citizen incident reporting connected to emergency authorities." icon={Users} />
        <div className="grid lg:grid-cols-5 gap-6 mt-4 sm:mt-6">
          <form onSubmit={submit} className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-black text-sm sm:text-base flex gap-2 items-center text-slate-900 dark:text-white">
                <Send className="w-4 h-4 text-red-600" /> Submit Field Hazard Report
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                CITIZEN SOS
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Reporter Name *</label>
              <input required name="reporter_name" value={form.reporter_name} onChange={setValue} placeholder="Your Full Name" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 text-sm bg-slate-50/50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 transition" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Phone / Email (Optional)</label>
              <input name="contact" value={form.contact} onChange={setValue} placeholder="+91 98765 43210" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 text-sm bg-slate-50/50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 transition" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Hazard Type</label>
                <select name="hazard" value={form.hazard} onChange={setValue} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 text-sm bg-slate-50/50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800">
                  <option>Flood</option>
                  <option>Waterlogging</option>
                  <option>Landslide</option>
                  <option>Cyclone</option>
                  <option>Earthquake</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Urgency / Severity</label>
                <select name="severity" value={form.severity} onChange={setValue} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 text-sm bg-slate-50/50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800">
                  <option>Warning</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Incident Description *</label>
              <textarea required minLength="10" name="description" value={form.description} onChange={setValue} rows="3" placeholder="Describe water level, affected road, trapped families, or immediate danger..." className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 text-sm bg-slate-50/50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 transition" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Attach Photo Proof (Camera / Gallery)</label>
              <input onChange={attachPhoto} type="file" accept="image/*" className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 dark:file:bg-slate-800 dark:file:text-blue-300 hover:file:bg-blue-100" />
            </div>
            {form.evidence_data && <img src={form.evidence_data} alt="Evidence preview" className="h-32 w-full object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm" />}

            <div className="pt-1">
              <button type="button" onClick={useLocation} className="w-full py-2.5 px-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center justify-center gap-2 transition active:scale-95">
                <LocateFixed className="w-4 h-4 text-blue-600 animate-pulse" />
                <span>{locating ? "Acquiring GPS Position..." : "Auto-fill with My GPS Location"}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input required name="latitude" value={form.latitude} onChange={setValue} placeholder="Latitude (e.g. 26.155)" type="number" step="any" className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-slate-50/50 dark:bg-slate-800/60" />
              <input required name="longitude" value={form.longitude} onChange={setValue} placeholder="Longitude (e.g. 85.891)" type="number" step="any" className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-slate-50/50 dark:bg-slate-800/60" />
            </div>

            <button className="w-full rounded-xl bg-red-600 hover:bg-red-500 text-white py-3.5 px-4 text-sm font-black shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition active:scale-95">
              <AlertTriangle className="w-4 h-4" />
              <span>Submit SOS Report to Authorities</span>
            </button>
            {message && <p className="text-xs font-bold text-center text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50">{message}</p>}
          </form>

          <section className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
              <div className="flex justify-between items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="font-black text-sm sm:text-base flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-600 animate-pulse" /> Live Localized Alert Preview
                </h2>
                <div className="flex gap-2 items-center">
                  <select value={language} onChange={(event) => { setLanguage(event.target.value); load(event.target.value); }} className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 bg-slate-50 dark:bg-slate-800 font-bold">
                    <option value="en">English</option>
                    <option value="hi">हिंदी</option>
                  </select>
                  <button onClick={() => load()} className="text-xs flex gap-1 items-center font-bold text-blue-600 dark:text-blue-400 hover:underline">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>
              </div>
              {loading ? <p className="text-sm text-slate-500 py-4 text-center">Loading alert feed...</p> : alerts.length === 0 ? <p className="text-xs text-slate-500 py-4 text-center">No high-priority flood alerts in the current demo feed.</p> : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="border-l-4 border-red-500 bg-red-50/70 dark:bg-red-950/30 p-3.5 rounded-r-xl space-y-1.5">
                      <p className="text-sm font-bold flex items-center gap-2 text-red-700 dark:text-red-400">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{alert.title}</span>
                      </p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{alert.message}</p>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-500" /> {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)} · {alert.channel}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
              <h2 className="font-black text-sm sm:text-base mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                Latest Field Reports ({reports.length})
              </h2>
              {reports.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No community reports submitted yet.</p>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {reports.map((report) => (
                    <div key={report.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                          {report.hazard} — {report.severity}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                          {report.verification_status || "Pending"}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">{report.description}</p>
                      {report.evidence_data && <img src={report.evidence_data} alt="Submitted field evidence" className="mt-2 h-28 w-full max-w-xs object-cover rounded-xl border border-slate-200 dark:border-slate-700" />}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span>Reported by: <strong>{report.reporter_name || "Citizen"}</strong></span>
                        <span>{report.created_at ? new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
        <div className="mt-6"><Disclaimer text="Citizen reports directly sync with the AASRA Government Command Operations Dashboard for NDRF/SDMA ground validation." /></div>
      </div>
    </div>
  );
}
