import { BrowserRouter, Route, Routes, useLocation, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect, useRef } from 'react'
import Navbar from './components/Navbar'
import SessionLogoutModal from './components/SessionLogoutModal'
import { getToken } from './lib/auth'
import { SoftphoneProvider } from './context/SoftphoneContext'
import './App.css'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Checkout = lazy(() => import('./pages/Checkout'))
const BillingSuccess = lazy(() => import('./pages/BillingSuccess'))
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'))
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'))
const Admin = lazy(() => import('./pages/Admin'))
const Manager = lazy(() => import('./pages/Manager'))
const Agent = lazy(() => import('./pages/Agent'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Features = lazy(() => import('./pages/Features'))
const HowItWorks = lazy(() => import('./pages/HowItWorks'))

const InboundCalls = lazy(() => import('./pages/InboundCalls'))
const OutboundCalls = lazy(() => import('./pages/OutboundCalls'))
const AutoDialer = lazy(() => import('./pages/AutoDialer'))
const ManualDialer = lazy(() => import('./pages/ManualDialer'))
const CallRecording = lazy(() => import('./pages/CallRecording'))
const SMS = lazy(() => import('./pages/SMS'))
const WhatsApp = lazy(() => import('./pages/WhatsApp'))
const AIAgent = lazy(() => import('./pages/AIAgent'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Integrations = lazy(() => import('./pages/Integrations'))

const RealEstate = lazy(() => import('./pages/RealEstate'))
const Insurance = lazy(() => import('./pages/Insurance'))
const SaaS = lazy(() => import('./pages/SaaS'))
const Collections = lazy(() => import('./pages/Collections'))
const GHLAgencies = lazy(() => import('./pages/GHLAgencies'))
const SDRTeams = lazy(() => import('./pages/SDRTeams'))



function getUserRole() {
  const token = getToken();
  if (!token) return null;
  // Dev mode bypass — fake token used for UI-only work
  if (token === 'dev-mode-fake-token') return 'dev';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role?.toLowerCase() || null;
  } catch {
    return null;
  }
}

function ProtectedRoute({ children, allowedRoles }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;

  const role = getUserRole();

  // Dev mode bypass — allow access to any protected route
  if (role === 'dev') return children;

  if (allowedRoles) {
    if (!allowedRoles.includes(role)) {
      if (role === 'superadmin') return <Navigate to="/superadmin" replace />;
      if (role === 'admin') return <Navigate to="/admin" replace />;
      if (role === 'manager') return <Navigate to="/manager" replace />;
      return <Navigate to="/agent" replace />;
    }
  }

  return children;
}

function PageWrapper({ children }) {
  const location = useLocation();
  const ref = useRef(null);
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    const el = ref.current;
    if (el) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
  }, [location.pathname]);
  return <div ref={ref} className="page-enter">{children}</div>;
}

function RouteFallback() {
  return (
    <div style={{
      minHeight: '40vh',
      display: 'grid',
      placeItems: 'center',
      color: '#64748b',
      fontWeight: 700,
      letterSpacing: '0.02em',
    }}>
      Loading...
    </div>
  );
}

function AppRoutes() {
  return (
    <PageWrapper>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/features" element={<Features />} />
          <Route path="/how-it-works" element={<HowItWorks />} />

          <Route path="/features/inbound-calls" element={<InboundCalls />} />
          <Route path="/features/outbound-calls" element={<OutboundCalls />} />
          <Route path="/features/auto-dialer" element={<AutoDialer />} />
          <Route path="/features/manual-dialer" element={<ManualDialer />} />
          <Route path="/features/call-recording" element={<CallRecording />} />
          <Route path="/features/sms" element={<SMS />} />
          <Route path="/features/whatsapp" element={<WhatsApp />} />
          <Route path="/features/ai-agent" element={<AIAgent />} />
          <Route path="/features/analytics" element={<Analytics />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/integrations/:id" element={<Integrations />} />

          <Route path="/solutions/real-estate" element={<RealEstate />} />
          <Route path="/solutions/insurance" element={<Insurance />} />
          <Route path="/solutions/saas" element={<SaaS />} />
          <Route path="/solutions/collections" element={<Collections />} />
          <Route path="/solutions/ghl-agencies" element={<GHLAgencies />} />
          <Route path="/solutions/sdr-teams" element={<SDRTeams />} />
          <Route path="/solutions/sales-teams" element={<SDRTeams />} />
          <Route path="/solutions/small-business" element={<SDRTeams />} />
          <Route path="/solutions/enterprise" element={<SDRTeams />} />


          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/billing/success" element={<BillingSuccess />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/superadmin" element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdmin />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Admin />
            </ProtectedRoute>
          } />
          <Route path="/manager" element={
            <ProtectedRoute allowedRoles={['manager']}>
              <Manager />
            </ProtectedRoute>
          } />
          <Route path="/agent" element={
            <ProtectedRoute allowedRoles={['agent']}>
              <Agent />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </PageWrapper>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SoftphoneProvider>
        <div className="shell">
          <NavbarWrapper />
          <SessionLogoutModal />
          <main className="page" style={{ padding: 0 }}>
            <AppRoutes />
          </main>
        </div>
      </SoftphoneProvider>
    </BrowserRouter>
  );
}

function NavbarWrapper() {
  const location = useLocation();
  const publicPaths = [
    '/', '/login', '/signup', '/pricing', '/features', '/how-it-works',
    '/features/inbound-calls', '/features/outbound-calls', '/features/auto-dialer',
    '/features/manual-dialer', '/features/call-recording', '/features/sms',
    '/features/whatsapp', '/features/ai-agent', '/features/analytics',
    '/integrations', '/blog'
  ];
  if (
    publicPaths.includes(location.pathname) || 
    location.pathname.startsWith('/integrations/') || 
    location.pathname.startsWith('/solutions/') ||
    location.pathname.startsWith('/blog')
  ) return <Navbar />;
  return null;
}

export default App;
