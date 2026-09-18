import { useEffect, useState } from "react";
import { AlertTriangle, LocateFixed, MapPin, Radio, RefreshCw, Send, Users } from "lucide-react";
import { PageHeader, Disclaimer } from "@/components/Layout";

const initialForm = {
  reporter_name: "", contact: "", hazard: "Flood", severity: "Warning",
  description: "", latitude: "", longitude: "", evidence_url: "", evidence_data: "",
};

async function request(endpoint, options) {
  let response = await fetch(`/api${endpoint}`, options).catch(() => null);
  if (!response || !response.ok) response = await fetch(`http://127.0.0.1:8000/api${endpoint}`, options);
  if (!response.ok) throw new Error("Backend request failed");
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

  const load = async (selectedLanguage = language) => {
    try {
      setLoading(true);
      const [reportData, alertData] = await Promise.all([request("/community-reports"), request(`/alerts?language=${selectedLanguage}`)]);
      setReports(Array.isArray(reportData) ? reportData : []);
      setAlerts(Array.isArray(alertData) ? alertData : []);
    } catch {
      setMessage("Backend unavailable. Start the FastAPI server on port 8000.");
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
    } catch { setMessage("Report could not be saved. Confirm all fields and backend connection."); }
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader title="Community Flood Reports & Alert Preview" subtitle="GPS-enabled citizen reports for officer verification; no external alert is dispatched." icon={Users} />
        <div className="grid lg:grid-cols-5 gap-6 mt-6">
          <form onSubmit={submit} className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
            <h2 className="font-bold text-sm flex gap-2 items-center"><Send className="w-4 h-4 text-blue-600" /> Submit field report</h2>
            <input required name="reporter_name" value={form.reporter_name} onChange={setValue} placeholder="Reporter name" className="w-full rounded-lg border p-2.5 text-sm bg-transparent" />
            <input name="contact" value={form.contact} onChange={setValue} placeholder="Phone/email (optional)" className="w-full rounded-lg border p-2.5 text-sm bg-transparent" />
            <div className="grid grid-cols-2 gap-3">
              <select name="hazard" value={form.hazard} onChange={setValue} className="rounded-lg border p-2.5 text-sm bg-transparent"><option>Flood</option><option>Waterlogging</option><option>Landslide</option></select>
              <select name="severity" value={form.severity} onChange={setValue} className="rounded-lg border p-2.5 text-sm bg-transparent"><option>Warning</option><option>High</option><option>Critical</option></select>
            </div>
            <textarea required minLength="10" name="description" value={form.description} onChange={setValue} rows="4" placeholder="Describe water level, affected road/area, and immediate risk..." className="w-full rounded-lg border p-2.5 text-sm bg-transparent" />
            <input name="evidence_url" value={form.evidence_url} onChange={setValue} placeholder="Photo/video evidence link (optional)" type="url" className="w-full rounded-lg border p-2.5 text-sm bg-transparent" />
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Or attach a photo (max 900 KB)<input onChange={attachPhoto} type="file" accept="image/*" className="mt-1 block w-full text-xs" /></label>
            {form.evidence_data && <img src={form.evidence_data} alt="Evidence preview" className="h-24 w-full object-cover rounded-lg border" />}
            <button type="button" onClick={useLocation} className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1"><LocateFixed className="w-4 h-4" /> {locating ? "Finding location..." : "Use my current location"}</button>
            <div className="grid grid-cols-2 gap-3"><input required name="latitude" value={form.latitude} onChange={setValue} placeholder="Latitude" type="number" step="any" className="rounded-lg border p-2.5 text-sm bg-transparent" /><input required name="longitude" value={form.longitude} onChange={setValue} placeholder="Longitude" type="number" step="any" className="rounded-lg border p-2.5 text-sm bg-transparent" /></div>
            <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white p-2.5 text-sm font-bold">Submit for verification</button>
            {message && <p className="text-xs text-amber-700 dark:text-amber-300">{message}</p>}
          </form>
          <section className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-center gap-3 mb-3"><h2 className="font-bold text-sm flex items-center gap-2"><Radio className="w-4 h-4 text-red-600" /> Localized alert preview</h2><div className="flex gap-2 items-center"><select value={language} onChange={(event) => { setLanguage(event.target.value); load(event.target.value); }} className="text-xs rounded border p-1.5 bg-transparent"><option value="en">English</option><option value="hi">हिंदी</option></select><button onClick={() => load()} className="text-xs flex gap-1 items-center text-blue-600"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button></div></div>
              {loading ? <p className="text-sm text-slate-500">Loading alert feed...</p> : alerts.length === 0 ? <p className="text-sm text-slate-500">No high-priority flood alerts in the current demo feed.</p> : <div className="space-y-3">{alerts.map((alert) => <div key={alert.id} className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-r-lg"><p className="text-sm font-bold flex gap-2"><AlertTriangle className="w-4 h-4 text-red-600" />{alert.title}</p><p className="text-xs mt-1">{alert.message}</p><p className="text-[11px] text-slate-500 mt-2 flex gap-1"><MapPin className="w-3 h-3" /> {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)} · {alert.channel}</p></div>)}</div>}
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm"><h2 className="font-bold text-sm mb-3">Latest submitted reports</h2>{reports.length === 0 ? <p className="text-sm text-slate-500">No community reports submitted yet.</p> : <div className="space-y-2">{reports.map((report) => <div key={report.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs"><strong>{report.hazard} — {report.severity}</strong><p className="mt-1">{report.description}</p>{report.evidence_data && <img src={report.evidence_data} alt="Submitted field evidence" className="mt-2 h-28 w-full max-w-xs object-cover rounded border" />}{report.evidence_url && <a href={report.evidence_url} target="_blank" rel="noreferrer" className="mt-1 block text-blue-600 underline">Open submitted evidence</a>}<p className="mt-1 text-amber-700 dark:text-amber-300">{report.verification_status}</p>{report.verification_status === "Pending officer verification" && <div className="flex gap-2 mt-2"><button onClick={() => reviewReport(report.id, "Verified")} className="rounded bg-emerald-600 text-white px-2 py-1 font-semibold">Verify</button><button onClick={() => reviewReport(report.id, "Needs field visit")} className="rounded bg-amber-500 text-slate-950 px-2 py-1 font-semibold">Field visit</button><button onClick={() => reviewReport(report.id, "Rejected")} className="rounded bg-slate-600 text-white px-2 py-1 font-semibold">Reject</button></div>}</div>)}</div>}</div>
          </section>
        </div>
        <div className="mt-5"><Disclaimer text="Reports and alerts are demo decision-support records. Never use this page as a substitute for official emergency services or verified authority instructions." /></div>
      </div>
    </div>
  );
}
