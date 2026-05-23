import { BrowserRouter, Route, Routes, useLocation, Navigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import Agent from './pages/Agent'
import Admin from './pages/Admin'
import Manager from './pages/Manager'
import SuperAdmin from './pages/SuperAdmin'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Navbar from './components/Navbar'
import { getToken } from './lib/auth'
import { SoftphoneProvider } from './context/SoftphoneContext'
import './App.css'

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const el = ref.current;
    if (el) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
  }, [location.pathname]);
  return <div ref={ref} className="page-enter">{children}</div>;
}

function AppRoutes() {
  return (
    <PageWrapper>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
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
    </PageWrapper>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SoftphoneProvider>
        <div className="shell">
          <NavbarWrapper />
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
