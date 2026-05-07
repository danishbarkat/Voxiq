import { BrowserRouter, Route, Routes, useLocation, Navigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import Agent from './pages/Agent'
import Admin from './pages/Admin'
import Manager from './pages/Manager'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Navbar from './components/Navbar'
import { getToken } from './lib/auth'
import './App.css'

// Protected Route Wrapper
function ProtectedRoute({ children, role }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

// Wrap each page individually so animation fires on every route change
function PageWrapper({ children }) {
  const location = useLocation();
  const ref = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const el = ref.current;
    if (el) {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    }
  }, [location.pathname]);

  return (
    <div ref={ref} className="page-enter">
      {children}
    </div>
  );
}

function AppRoutes() {
  return (
    <PageWrapper>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="ADMIN">
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager"
          element={
            <ProtectedRoute role="MANAGER">
              <Manager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agent"
          element={
            <ProtectedRoute role="AGENT">
              <Agent />
            </ProtectedRoute>
          }
        />
        {/* Fallback to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PageWrapper>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="shell">
        <NavbarWrapper />
        <main className="page" style={{ padding: 0 }}>
          <AppRoutes />
        </main>
      </div>
    </BrowserRouter>
  )
}

function NavbarWrapper() {
  const location = useLocation();
  const publicPaths = ['/', '/login', '/signup'];
  if (publicPaths.includes(location.pathname)) {
    return <Navbar />;
  }
  return null;
}


export default App
