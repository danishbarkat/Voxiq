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
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'))
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'))
const Admin = lazy(() => import('./pages/Admin'))
const Manager = lazy(() => import('./pages/Manager'))
const Agent = lazy(() => import('./pages/Agent'))

function getUserRole() {
  const token = getToken();
  if (!token) return null;
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

  if (allowedRoles) {
    const role = getUserRole();
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
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/checkout" element={<Checkout />} />
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
  const publicPaths = ['/', '/login', '/signup'];
  if (publicPaths.includes(location.pathname)) return <Navbar />;
  return null;
}

export default App;
