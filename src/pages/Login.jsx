import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, KeyRound, AlertCircle, RefreshCw, Shield, Building, Lock, ArrowRight, UserCheck } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const quickFill = (userEmail) => {
    setEmail(userEmail);
    setPassword('Password@123');
    setAuthError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');

    try {
      // Real FastAPI Authentication Request
      let res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password }),
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch('http://127.0.0.1:8000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password: password }),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Authentication failed: Invalid government officer credentials.');
      }

      const data = await res.json();

      // Store real authenticated session payload
      localStorage.setItem('dss_auth_user', JSON.stringify(data.user));
      localStorage.setItem('dss_user_role', data.user.role);
      localStorage.setItem('aasra_portal_mode', 'gov');

      // Trigger global state updates across Navbar and other pages
      window.dispatchEvent(new Event('authChanged'));
      window.dispatchEvent(new Event('roleChanged'));

      navigate('/gov');
    } catch (err) {
      console.error(err);
      setAuthError(err.message || 'Server connection error. Please verify backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-10 bg-slate-100 dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-lg space-y-4">
        
        {/* Government Officer Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
          {/* Tricolor Stripe */}
          <div className="h-1.5 bg-gradient-to-r from-amber-500 via-white to-emerald-600" />

          <div className="p-6 sm:p-8">
            {/* Header with National Crest motif */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 flex items-center justify-center mx-auto mb-3 bg-slate-900 text-amber-400 rounded-2xl p-2 border border-slate-700 shadow-md">
                <Logo className="w-10 h-10" variant="light" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
                <Lock className="w-3 h-3 text-amber-500" />
                <span>NIC Single Sign-On (SSO) • Official Portal</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Government Officer Authentication
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                National Disaster Management Authority (NDMA) & District Incident Command
              </p>
            </div>

            {/* Error banner */}
            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Official Email ID / Service Username (@nic.in / @gov.in)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@nic.in"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Security Passphrase / Token
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-700/25 flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-95"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Official Credentials...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Authorize Officer Session & Enter Command</span>
                  </>
                )}
              </button>
            </form>

            {/* Pre-Provisioned Enterprise Directory Accounts */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 text-center">
                Pre-Provisioned Directory Accounts (Demo Instant Login):
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => quickFill('dg.ndma@nic.in')}
                  className="p-2.5 text-left bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 transition group"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    NDMA National Command
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">dg.ndma@nic.in</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('dm.chamoli@uk.gov.in')}
                  className="p-2.5 text-left bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-400 dark:hover:border-emerald-500 transition group"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    DM Chamoli (UK)
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">dm.chamoli@uk.gov.in</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('dm.wayanad@kerala.gov.in')}
                  className="p-2.5 text-left bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-purple-400 dark:hover:border-purple-500 transition group"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs group-hover:text-purple-600 dark:group-hover:text-purple-400">
                    DM Wayanad (KL)
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">dm.wayanad@kerala.gov.in</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('dm.darbhanga@bihar.gov.in')}
                  className="p-2.5 text-left bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-amber-400 dark:hover:border-amber-500 transition group"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs group-hover:text-amber-600 dark:group-hover:text-amber-400">
                    DM Darbhanga (BR)
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">dm.darbhanga@bihar.gov.in</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                Authorized Officer Key: <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-700 dark:text-slate-300 font-bold">Password@123</code>
              </p>
            </div>
          </div>
        </div>

        {/* Link back to Citizen Portal Login */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm flex items-center justify-between">
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Are you a citizen or resident?
          </span>
          <Link
            to="/citizen-login"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Open Citizen Safety Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
}