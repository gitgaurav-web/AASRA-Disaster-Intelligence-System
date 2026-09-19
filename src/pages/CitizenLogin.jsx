import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Smartphone, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight,
  LogOut, PhoneCall, MapPin, User, FileText, Bell, RefreshCw
} from 'lucide-react';
import Logo from '@/components/Logo';

const DEMO_CITIZENS = [
  {
    name: 'Ramesh Sharma',
    phone: '9876543210',
    district: 'Wayanad',
    state: 'Kerala',
    aadhaarLast4: '4821',
    emergencyContact: '+91 98765 00000 (Brother)',
    role: 'citizen',
    submittedReports: 2
  },
  {
    name: 'Priya Rawat',
    phone: '9412012345',
    district: 'Chamoli',
    state: 'Uttarakhand',
    aadhaarLast4: '9012',
    emergencyContact: '+91 94120 99999 (Father)',
    role: 'citizen',
    submittedReports: 1
  },
  {
    name: 'Sunita Devi',
    phone: '9123456789',
    district: 'Darbhanga',
    state: 'Bihar',
    aadhaarLast4: '3341',
    emergencyContact: '+91 91234 11111 (Husband)',
    role: 'citizen',
    submittedReports: 3
  }
];

export default function CitizenLogin() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [citizenUser, setCitizenUser] = useState(() => {
    const saved = localStorage.getItem('dss_citizen_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!mobile || mobile.length < 10) {
      setMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setLoading(true);
    setMessage('');
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
      setMessage('One-Time Password (OTP) sent to +91 ' + mobile + '. Use demo OTP: 442918');
    }, 700);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otp !== '442918' && otp.length !== 6) {
      setMessage('Invalid OTP. Please enter 442918 for demo verification.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const user = {
        name: 'Citizen User',
        phone: mobile,
        district: 'Chamoli',
        state: 'Uttarakhand',
        aadhaarLast4: '8832',
        emergencyContact: '+91 98000 00000',
        role: 'citizen',
        submittedReports: 1
      };
      loginAsUser(user);
    }, 600);
  };

  const loginAsUser = (userObj) => {
    localStorage.setItem('dss_citizen_user', JSON.stringify(userObj));
    setCitizenUser(userObj);
    window.dispatchEvent(new Event('citizenAuthChanged'));
    setLoading(false);
    setMessage(`Welcome, ${userObj.name}! Logged in successfully.`);
  };

  const handleLogout = () => {
    localStorage.removeItem('dss_citizen_user');
    setCitizenUser(null);
    setOtpSent(false);
    setOtp('');
    setMobile('');
    window.dispatchEvent(new Event('citizenAuthChanged'));
    setMessage('Logged out successfully.');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-6 sm:py-10 pb-28 md:pb-10 px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">

        {/* If Citizen is Already Logged In */}
        {citizenUser ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xl space-y-5">
            <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3 border border-emerald-200 dark:border-emerald-800 shadow-sm">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                Aadhaar & Mobile Verified
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                {citizenUser.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Resident of {citizenUser.district}, {citizenUser.state}
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Registered Phone</span>
                <span className="font-bold text-slate-900 dark:text-white">{citizenUser.phone}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Emergency SOS Contact</span>
                <span className="font-bold text-red-600 dark:text-red-400">{citizenUser.emergencyContact}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Submitted Hazard Reports</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{citizenUser.submittedReports || 1} Reports (1 Verified)</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href={`tel:${(citizenUser.emergencyContact || '').replace(/[^\d+]/g, '')}`}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-red-600/20 transition active:scale-95"
              >
                <PhoneCall className="w-4 h-4 animate-pulse" />
                <span>Call Emergency Contact</span>
              </a>
              <Link
                to="/community-reports"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
              >
                <FileText className="w-4 h-4" />
                <span>Submit / View My Hazard Reports</span>
              </Link>
              <Link
                to="/risk-map"
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
              >
                <MapPin className="w-4 h-4" />
                <span>Find Safe Shelters in {citizenUser.district}</span>
              </Link>
              <button
                onClick={handleLogout}
                type="button"
                className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Citizen Portal</span>
              </button>
            </div>
          </div>
        ) : (
          /* Login Form */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-2 border border-blue-100 dark:border-blue-900">
                <Smartphone className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Citizen Portal Login
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sign in with mobile number to submit SOS reports and receive personalized safety alerts
              </p>
            </div>

            {message && (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
                {message}
              </div>
            )}

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number (10 Digits)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-bold text-slate-400">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || mobile.length < 10}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 disabled:opacity-50 transition"
                >
                  {loading ? 'Sending OTP...' : 'Send One-Time Password (OTP)'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Enter 6-Digit OTP
                    </label>
                    <button
                      type="button"
                      onClick={() => setOtp('442918')}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Fill Demo OTP (442918)
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="442918"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm text-center tracking-widest font-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 transition"
                >
                  {loading ? 'Verifying...' : 'Verify OTP & Enter Portal'}
                </button>

                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:underline"
                >
                  Change Mobile Number
                </button>
              </form>
            )}

            {/* Quick Demo Citizen Profiles */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 text-center">
                Instant One-Click Demo Residents
              </p>
              <div className="space-y-2">
                {DEMO_CITIZENS.map((citizen) => (
                  <button
                    key={citizen.phone}
                    type="button"
                    onClick={() => loginAsUser(citizen)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-800/40 text-left transition flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {citizen.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {citizen.district}, {citizen.state} • +91 {citizen.phone}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      Login
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Link to Official Gov Login */}
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-center">
              <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold mb-1">
                Disaster Officer or District Magistrate?
              </p>
              <Link
                to="/login"
                className="text-xs font-bold text-amber-900 dark:text-amber-200 underline hover:text-amber-700"
              >
                Access Official Government Authentication Portal &rarr;
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
