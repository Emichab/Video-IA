import { useState } from "react";
import { useAuth } from "../hooks/useAuth.jsx";

export default function AuthPage() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, pass);
      } else {
        if (!name.trim()) { setErr("Ingresa tu nombre"); setLoading(false); return; }
        await signup(email, pass, name.trim());
      }
    } catch (error) {
      const map = {
        "auth/email-already-in-use": "Este email ya está registrado",
        "auth/invalid-email": "Email inválido",
        "auth/weak-password": "La contraseña debe tener al menos 6 caracteres",
        "auth/invalid-credential": "Email o contraseña incorrectos",
        "auth/user-not-found": "No existe una cuenta con este email",
      };
      setErr(map[error.code] || error.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
            <rect x="2" y="6" width="28" height="20" rx="3" stroke="url(#alg)" strokeWidth="2" />
            <polygon points="13,11 13,21 22,16" fill="url(#alg)" />
            <defs>
              <linearGradient id="alg" x1="0" y1="0" x2="32" y2="32">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>
          <span className="logo-name">NeoFrame<span className="grad-text">.ai</span></span>
        </div>

        <h2>{mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}</h2>
        <p className="auth-sub">
          {mode === "login"
            ? "Accede a tu estudio de video con IA"
            : "Regístrate y obtén 10 créditos gratis"}
        </p>

        <form onSubmit={handle} className="auth-form">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="auth-input"
            />
          )}
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="auth-input"
            required
            minLength={6}
          />

          {err && <p className="auth-err">{err}</p>}

          <button type="submit" className="btn-main full" disabled={loading}>
            {loading ? <span className="spin" /> : null}
            {mode === "login" ? "Entrar" : "Crear Cuenta"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }}>
            {mode === "login" ? "Regístrate" : "Inicia Sesión"}
          </button>
        </p>

        {mode === "signup" && (
          <div className="auth-bonus">
            <span>🎁</span> Al registrarte recibes <strong>10 créditos gratis</strong> para generar videos
          </div>
        )}
      </div>
    </div>
  );
}
