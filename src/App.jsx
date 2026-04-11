import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import StudioPage from "./pages/StudioPage.jsx";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-inner">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
            <rect x="2" y="6" width="28" height="20" rx="3" stroke="url(#llg)" strokeWidth="2" />
            <polygon points="13,11 13,21 22,16" fill="url(#llg)" />
            <defs><linearGradient id="llg" x1="0" y1="0" x2="32" y2="32">
              <stop offset="0%" stopColor="#c084fc" /><stop offset="100%" stopColor="#22d3ee" />
            </linearGradient></defs>
          </svg>
          <span className="spin" />
          <span>Cargando NeoFrame.ai...</span>
        </div>
      </div>
    );
  }

  return user ? <StudioPage /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
