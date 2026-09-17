import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { DemoBanner } from '@/components/Layout';
import { LanguageProvider } from '@/context/LanguageContext';

// Citizen Portal Pages
import CitizenHome from '@/pages/CitizenHome';
import CitizenLogin from '@/pages/CitizenLogin';

// Government Portal Pages
import Home from '@/pages/Home';
import About from '@/pages/About';
import DisasterInformation from '@/pages/DisasterInformation';
import RiskMap from '@/pages/RiskMap';
import Habitations from '@/pages/Habitations';
import HabitationDetails from '@/pages/HabitationDetails';
import Capacity from '@/pages/Capacity';
import Relocation from '@/pages/Relocation';
import RelocationSites from '@/pages/RelocationSites';
import Analytics from '@/pages/Analytics';
import Resources from '@/pages/Resources';
import Contact from '@/pages/Contact';
import Login from '@/pages/Login';
import Admin from '@/pages/Admin';
import Settings from '@/pages/Settings';
import CommunityReports from '@/pages/CommunityReports';
import RescueTeams from '@/pages/RescueTeams';
import EmergencyAlerts from '@/pages/EmergencyAlerts';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
          <DemoBanner />
          <Navbar />
        <main className="flex-1">
          <Routes>
            {/* ==========================================
                1. CITIZEN PUBLIC SAFETY PORTAL
                ========================================== */}
            <Route path="/" element={<CitizenHome />} />
            <Route path="/community-reports" element={<CommunityReports />} />
            <Route path="/risk-map" element={<RiskMap />} />
            <Route path="/citizen-login" element={<CitizenLogin />} />

            {/* ==========================================
                2. GOVERNMENT COMMAND PORTAL (/gov prefix)
                ========================================== */}
            <Route path="/gov" element={<Home />} />
            <Route path="/gov/about" element={<About />} />
            <Route path="/gov/disasters" element={<DisasterInformation />} />
            <Route path="/gov/emergency-alerts" element={<EmergencyAlerts />} />
            <Route path="/gov/risk-map" element={<RiskMap />} />
            <Route path="/gov/habitations" element={<Habitations />} />
            <Route path="/gov/habitations/:id" element={<HabitationDetails />} />
            <Route path="/gov/capacity" element={<Capacity />} />
            <Route path="/gov/relocation" element={<Relocation />} />
            <Route path="/gov/relocation-sites" element={<RelocationSites />} />
            <Route path="/gov/rescue-teams" element={<RescueTeams />} />
            <Route path="/gov/analytics" element={<Analytics />} />
            <Route path="/gov/resources" element={<Resources />} />
            <Route path="/gov/login" element={<Login />} />
            <Route path="/gov/admin" element={<Admin />} />
            <Route path="/gov/settings" element={<Settings />} />

            {/* ==========================================
                3. DIRECT / LEGACY COMPATIBILITY ROUTES
                ========================================== */}
            <Route path="/about" element={<About />} />
            <Route path="/disasters" element={<DisasterInformation />} />
            <Route path="/emergency-alerts" element={<EmergencyAlerts />} />
            <Route path="/habitations" element={<Habitations />} />
            <Route path="/habitations/:id" element={<HabitationDetails />} />
            <Route path="/capacity" element={<Capacity />} />
            <Route path="/relocation" element={<Relocation />} />
            <Route path="/relocation-sites" element={<RelocationSites />} />
            <Route path="/rescue-teams" element={<RescueTeams />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  </LanguageProvider>
  );
}

export default App;
