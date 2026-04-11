import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth.jsx";

export default function AdminPanel({ onClose }) {
  const { getAllUsers, addUserCredits, setUserCredits, setUserRole, profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creditInput, setCreditInput] = useState({});
  const [msg, setMsg] = useState("");

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await getAllUsers();
      setUsers(list);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleAddCredits = async (uid) => {
    const amount = parseInt(creditInput[uid]);
    if (!amount || amount <= 0) return;
    try {
      await addUserCredits(uid, amount);
      setMsg(`+${amount} créditos añadidos`);
      setCreditInput((p) => ({ ...p, [uid]: "" }));
      await loadUsers();
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setMsg("Error: " + e.message);
    }
  };

  const handleSetCredits = async (uid, amount) => {
    try {
      await setUserCredits(uid, amount);
      setMsg(`Créditos establecidos a ${amount}`);
      await loadUsers();
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setMsg("Error: " + e.message);
    }
  };

  const handleToggleAdmin = async (uid, currentRole) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (uid === profile.id) return; // Can't remove own admin
    try {
      await setUserRole(uid, newRole);
      setMsg(`Rol cambiado a ${newRole}`);
      await loadUsers();
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setMsg("Error: " + e.message);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCredits = users.reduce((s, u) => s + (u.credits || 0), 0);
  const totalVideos = users.reduce((s, u) => s + (u.videosGenerated || 0), 0);
  const totalClips = users.reduce((s, u) => s + (u.clipsGenerated || 0), 0);

  return (
    <div className="admin-overlay">
      <div className="admin-panel">
        {/* Header */}
        <div className="admin-hdr">
          <div>
            <h2>⚙ Panel de Administración</h2>
            <p className="dim">Gestiona usuarios y créditos</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {msg && <div className="admin-toast">{msg}</div>}

        {/* Stats */}
        <div className="admin-stats">
          <div className="stat-card">
            <span className="stat-num">{users.length}</span>
            <span className="stat-label">Usuarios</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{totalCredits}</span>
            <span className="stat-label">Créditos Totales</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{totalVideos}</span>
            <span className="stat-label">Videos Generados</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{totalClips}</span>
            <span className="stat-label">Clips Creados</span>
          </div>
        </div>

        {/* Bulk actions */}
        <div className="admin-bar">
          <input
            className="admin-search"
            placeholder="Buscar usuario por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-sm accent" onClick={loadUsers}>↻ Refrescar</button>
        </div>

        {/* Users table */}
        {loading ? (
          <div className="admin-loading"><span className="spin" /> Cargando usuarios...</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Créditos</th>
                  <th>Videos</th>
                  <th>Clips</th>
                  <th>Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className={u.id === profile.id ? "me" : ""}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar-sm">
                          {(u.name || u.email || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="user-name">{u.name || "Sin nombre"}</div>
                          <div className="user-email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${u.role}`}>
                        {u.role === "admin" ? "👑 Admin" : "👤 Usuario"}
                      </span>
                    </td>
                    <td>
                      <span className="credit-display">◈ {u.credits || 0}</span>
                    </td>
                    <td>{u.videosGenerated || 0}</td>
                    <td>{u.clipsGenerated || 0}</td>
                    <td className="mono xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                    <td>
                      <div className="action-row">
                        <div className="credit-add">
                          <input
                            type="number"
                            min="1"
                            placeholder="+"
                            value={creditInput[u.id] || ""}
                            onChange={(e) => setCreditInput((p) => ({ ...p, [u.id]: e.target.value }))}
                            className="credit-input"
                          />
                          <button className="btn-xs green" onClick={() => handleAddCredits(u.id)}>Dar</button>
                        </div>
                        <button className="btn-xs" onClick={() => handleSetCredits(u.id, 0)}>Reset</button>
                        {u.id !== profile.id && (
                          <button
                            className={`btn-xs ${u.role === "admin" ? "warn" : "purple"}`}
                            onClick={() => handleToggleAdmin(u.id, u.role)}
                          >
                            {u.role === "admin" ? "Quitar Admin" : "Hacer Admin"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Credit Packages info */}
        <div className="admin-section">
          <h3>Tabla de Costos por Video</h3>
          <div className="cost-grid">
            <div className="cost-item"><span>Video 5s</span><span className="cost-val">1 crédito</span></div>
            <div className="cost-item"><span>Video 10s</span><span className="cost-val">2 créditos</span></div>
            <div className="cost-item"><span>Video 15s</span><span className="cost-val">3 créditos</span></div>
            <div className="cost-item"><span>Video 30s</span><span className="cost-val">5 créditos</span></div>
            <div className="cost-item"><span>Video 60s</span><span className="cost-val">8 créditos</span></div>
            <div className="cost-item"><span>Clip (cada uno)</span><span className="cost-val">2 créditos</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
