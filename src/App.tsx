import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { DemoBanner } from '@/components/Layout';
import { LanguageProvider } from '@/context/LanguageContext';

// Citizen Portal Pages
import CitizenHome from '@/pages/CitizenHome';
import CitizenLogin from '@/pages/CitizenLogin';
import CitizenRiskMap from '@/pages/CitizenRiskMap';

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
import GovAuthGuard from '@/components/GovAuthGuard';

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
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-200 overflow-x-hidden w-full">
          <DemoBanner />
          <Navbar />
        <main className="flex-1 pb-16 md:pb-0">
          <Routes>
            {/* ==========================================
                1. CITIZEN PUBLIC SAFETY PORTAL
                ========================================== */}
            <Route path="/" element={<CitizenHome />} />
            <Route path="/community-reports" element={<CommunityReports />} />
            <Route path="/risk-map" element={<CitizenRiskMap />} />
            <Route path="/citizen-login" element={<CitizenLogin />} />
            <Route path="/disasters" element={<DisasterInformation />} />
            <Route path="/disaster-info" element={<DisasterInformation />} />
            <Route path="/emergency-alerts" element={<EmergencyAlerts />} />
            <Route path="/alerts" element={<EmergencyAlerts />} />
            <Route path="/live-alerts" element={<EmergencyAlerts />} />

            {/* ==========================================
                2. GOVERNMENT COMMAND PORTAL (/gov prefix)
                ========================================== */}
            <Route path="/gov/login" element={<Login />} />
            <Route path="/gov" element={<GovAuthGuard><Home /></GovAuthGuard>} />
            <Route path="/gov/about" element={<GovAuthGuard><About /></GovAuthGuard>} />
            <Route path="/gov/disasters" element={<GovAuthGuard><DisasterInformation /></GovAuthGuard>} />
            <Route path="/gov/emergency-alerts" element={<EmergencyAlerts />} />
            <Route path="/gov/risk-map" element={<GovAuthGuard><RiskMap /></GovAuthGuard>} />
            <Route path="/gov/habitations" element={<GovAuthGuard><Habitations /></GovAuthGuard>} />
            <Route path="/gov/habitations/:id" element={<GovAuthGuard><HabitationDetails /></GovAuthGuard>} />
            <Route path="/gov/capacity" element={<GovAuthGuard><Capacity /></GovAuthGuard>} />
            <Route path="/gov/relocation" element={<GovAuthGuard><Relocation /></GovAuthGuard>} />
            <Route path="/gov/relocation-sites" element={<GovAuthGuard><RelocationSites /></GovAuthGuard>} />
            <Route path="/gov/rescue-teams" element={<GovAuthGuard><RescueTeams /></GovAuthGuard>} />
            <Route path="/gov/analytics" element={<GovAuthGuard><Analytics /></GovAuthGuard>} />
            <Route path="/gov/resources" element={<GovAuthGuard><Resources /></GovAuthGuard>} />
            <Route path="/gov/admin" element={<GovAuthGuard><Admin /></GovAuthGuard>} />
            <Route path="/gov/settings" element={<GovAuthGuard><Settings /></GovAuthGuard>} />

            {/* ==========================================
                3. DIRECT / LEGACY COMPATIBILITY ROUTES
                ========================================== */}
            <Route path="/login" element={<Login />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/habitations" element={<GovAuthGuard><Habitations /></GovAuthGuard>} />
            <Route path="/habitations/:id" element={<GovAuthGuard><HabitationDetails /></GovAuthGuard>} />
            <Route path="/capacity" element={<GovAuthGuard><Capacity /></GovAuthGuard>} />
            <Route path="/relocation" element={<GovAuthGuard><Relocation /></GovAuthGuard>} />
            <Route path="/relocation-sites" element={<GovAuthGuard><RelocationSites /></GovAuthGuard>} />
            <Route path="/rescue-teams" element={<GovAuthGuard><RescueTeams /></GovAuthGuard>} />
            <Route path="/analytics" element={<GovAuthGuard><Analytics /></GovAuthGuard>} />
            <Route path="/resources" element={<GovAuthGuard><Resources /></GovAuthGuard>} />
            <Route path="/admin" element={<GovAuthGuard><Admin /></GovAuthGuard>} />
            <Route path="/settings" element={<GovAuthGuard><Settings /></GovAuthGuard>} />
          </Routes>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    </BrowserRouter>
  </LanguageProvider>
  );
}

export default App;
