import { useState, useRef } from "react";
import { useAuth, COSTS } from "../hooks/useAuth.jsx";
import { generateVideo, createClipsFromVideo, downloadVideo } from "../lib/videoEngine.js";
import AdminPanel from "./AdminPanel.jsx";

const STYLES = ["Cinematográfico","Anime","3D Render","Documental","Fantasía","Sci-Fi","Minimalista","Acuarela"];
const DURATIONS = ["6s","8s","10s","14s","20s"];
const RATIOS = ["16:9","9:16","1:1"];
const CLIP_DURS = ["15s","30s","45s","60s"];
const CLIP_FMTS = ["9:16","16:9","1:1"];
const SUB_COLORS = ["white","yellow","#00ff88","#00ccff","#ff6b6b"];
const SUB_POSITIONS = ["bottom","center","top"];
const DUR_COSTS = { "6s": 1, "8s": 2, "10s": 2, "14s": 3, "20s": 4 };

function Pills({ items, value, onChange, small }) {
  return (
    <div className="pills">
      {items.map((it) => (
        <button key={it} className={`pill${value === it ? " on" : ""}${small ? " sm" : ""}`} onClick={() => onChange(it)}>{it}</button>
      ))}
    </div>
  );
}

function ProgressBar({ value, label }) {
  return (
    <div className="prog-wrap">
      <div className="prog-track">
        <div className="prog-fill" style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      {label && <div className="prog-label">{label}</div>}
    </div>
  );
}

function Toggle({ label, checked, onChange, description, color }) {
  return (
    <label className="toggle-row">
      <div className="toggle-info">
        <span className="toggle-label">{label}</span>
        {description && <span className="toggle-desc">{description}</span>}
      </div>
      <div className={`toggle-switch ${checked ? "on" : ""} ${color || ""}`} onClick={() => onChange(!checked)}>
        <div className="toggle-knob" />
      </div>
    </label>
  );
}

function GenerateTab() {
  const { profile, useCredits, addStat, refreshProfile } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [narration, setNarration] = useState("");
  const [style, setStyle] = useState("Cinematográfico");
  const [dur, setDur] = useState("10s");
  const [ratio, setRatio] = useState("16:9");
  const [withNarration, setWithNarration] = useState(false);
  const [withSubs, setWithSubs] = useState(false);
  const [subColor, setSubColor] = useState("white");
  const [subPosition, setSubPosition] = useState("bottom");
  const [subLang, setSubLang] = useState("es");
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [status, setStatus] = useState("");
  const [videos, setVideos] = useState([]);
  const [err, setErr] = useState("");

  const baseCost = DUR_COSTS[dur] || 2;
  const narrationCost = withNarration ? 0 : 0; // Free!
  const subCost = withSubs ? 1 : 0;
  const totalCost = baseCost + subCost;
  const seconds = parseInt(dur);
  const usdPrice = (seconds * 0.04).toFixed(2);

  const generate = async () => {
    if (!prompt.trim() || busy) return;
    setErr("");
    if ((profile?.credits || 0) < totalCost) {
      setErr("Necesitas " + totalCost + " créditos. Tienes " + (profile?.credits || 0) + ".");
      return;
    }
    const ok = await useCredits(totalCost);
    if (!ok) { setErr("Créditos insuficientes"); return; }

    setBusy(true); setPct(0); setStatus("Iniciando...");
    try {
      const result = await generateVideo({
        prompt: prompt.trim(), style, duration: dur, ratio,
        narrationText: withNarration ? narration : "",
        withSubtitles: withSubs,
        subtitleStyle: { color: subColor, position: subPosition, language: subLang },
        onProgress: (p, s) => { setPct(p); setStatus(s); },
      });
      await addStat("videosGenerated");
      setVideos((prev) => [{
        id: Date.now(), prompt: prompt.trim(), style, dur, ratio,
        ts: new Date().toLocaleString(), url: result.url, blob: result.blob,
        hasNarration: withNarration, hasSubs: withSubs,
      }, ...prev]);
    } catch (e) { setErr("Error: " + e.message); }
    setBusy(false); setPct(0); await refreshProfile();
  };

  return (
    <section className="tab-body fade-in">
      <div className="sec-head">
        <span className="sec-badge purple">✦</span>
        <div>
          <h2>Generador de Video con IA</h2>
          <p className="dim">Video + narración en español sin censura — descargable</p>
        </div>
      </div>

      <div className="gen-grid">
        <div className="col gap-20">
          <label className="lbl">Describe la escena visual (en inglés funciona mejor)</label>
          <textarea className="ta" rows={3}
            placeholder="Ej: 3D animated video. Three happy cartoon friends in colorful jerseys watching football on TV, cheering and celebrating. Cozy living room."
            value={prompt} onChange={(e) => setPrompt(e.target.value)} />

          <label className="lbl">Estilo Visual</label>
          <Pills items={STYLES} value={style} onChange={setStyle} />

          <div className="row-wrap">
            <div className="col gap-8 flex1">
              <label className="lbl">Duración</label>
              <Pills items={DURATIONS} value={dur} onChange={setDur} small />
            </div>
            <div className="col gap-8 flex1">
              <label className="lbl">Aspect Ratio</label>
              <Pills items={RATIOS} value={ratio} onChange={setRatio} small />
            </div>
          </div>

          <div className="options-card">
            <Toggle label="🎙 Narración en español" checked={withNarration} onChange={setWithNarration} color="cyan"
              description="Agrega voz narrando tu script (gratis, sin censura)" />

            {withNarration && (
              <div className="sub-options fade-in">
                <label className="lbl">Script de narración (escribe lo que quieras, sin filtros)</label>
                <textarea className="ta" rows={4}
                  placeholder="Ej: Todos creemos que somos expertos viendo el fútbol desde el sillón. Llega la quiniela del Mundial 2026. Entras con $1,500 pesos. Cada semana hay premios. Los tres primeros lugares se llevan grandes premios. Inscríbete ahora."
                  value={narration} onChange={(e) => setNarration(e.target.value)} />
                <div className="narration-note">💡 Este texto se convierte a voz con la Speech API del navegador — es gratis y puedes decir lo que quieras sin filtros.</div>
              </div>
            )}

            <Toggle label="💬 Subtítulos" checked={withSubs} onChange={setWithSubs} color="purple"
              description={withNarration ? "Agrega subtítulos automáticos" : "Requiere narración activada"} />

            {withSubs && withNarration && (
              <div className="sub-options fade-in">
                <div className="row-wrap">
                  <div className="col gap-6 flex1">
                    <label className="lbl">Color texto</label>
                    <div className="color-pills">
                      {SUB_COLORS.map((c) => (
                        <button key={c} className={`color-pill ${subColor === c ? "on" : ""}`}
                          style={{ background: c }} onClick={() => setSubColor(c)} />
                      ))}
                    </div>
                  </div>
                  <div className="col gap-6 flex1">
                    <label className="lbl">Posición</label>
                    <Pills items={SUB_POSITIONS} value={subPosition} onChange={setSubPosition} small />
                  </div>
                  <div className="col gap-6">
                    <label className="lbl">Idioma</label>
                    <select className="sel" value={subLang} onChange={(e) => setSubLang(e.target.value)}>
                      <option value="es">Español</option>
                      <option value="en">English</option>
                      <option value="pt">Português</option>
                      <option value="fr">Français</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="cost-info">
            <span>Costo: <strong>{totalCost} crédito{totalCost !== 1 ? "s" : ""}</strong></span>
            {withNarration && <span className="cost-tag free">🎙 narración gratis</span>}
            {withSubs && <span className="cost-tag sub">+subs</span>}
            <span className="sep">·</span>
            <span>Tienes: <strong className="cyan">◈ {profile?.credits || 0}</strong></span>
            <span className="sep">·</span>
            <span className="dim" style={{fontSize:".75rem"}}>~${usdPrice} USD</span>
          </div>

          {err && <div className="err-msg">{err}</div>}

          <button className={`btn-main${busy ? " loading" : ""}`} onClick={generate} disabled={busy || !prompt.trim()}>
            {busy ? <><span className="spin" /> {status}</> : <>⚡ Generar Video {dur} — {totalCost} créditos</>}
          </button>

          {busy && <ProgressBar value={pct} label={status} />}
        </div>

        <div className="col gap-8">
          <label className="lbl">Vista Previa</label>
          <div className={`preview r-${ratio.replace(":", "x")}`}>
            {busy ? (
              <div className="preview-msg"><div className="pulse-orb" /><span>{status}</span></div>
            ) : videos.length > 0 ? (
              <video src={videos[0].url} controls className="preview-video" />
            ) : (
              <div className="preview-msg">
                <span style={{ fontSize: "2.8rem", opacity: 0.35 }}>🎬</span>
                <span>Tu video aparecerá aquí</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {videos.length > 0 && (
        <div className="gallery fade-in">
          <h3>Videos Generados ({videos.length})</h3>
          <div className="card-grid">
            {videos.map((v) => (
              <div key={v.id} className="card">
                <div className="card-video">
                  <video src={v.url} loop
                    onMouseEnter={(e) => e.target.play()} onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }} />
                </div>
                <div className="card-body">
                  <p className="card-txt">{v.prompt}</p>
                  <div className="tags">
                    <span className="tag">{v.style}</span>
                    <span className="tag">{v.dur}</span>
                    <span className="tag">{v.ratio}</span>
                    {v.hasNarration && <span className="tag audio-tag">🎙 Narración</span>}
                    {v.hasSubs && <span className="tag sub-tag">💬 Subs</span>}
                  </div>
                </div>
                <div className="card-actions">
                  <button className="btn-sm accent" onClick={() => downloadVideo(v.url, "neoframe-" + v.id + ".webm")}>⬇ Descargar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ClipsTab() {
  const { profile, useCredits, addStat, refreshProfile } = useAuth();
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [count, setCount] = useState(3);
  const [clipDur, setClipDur] = useState("30s");
  const [fmt, setFmt] = useState("9:16");
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [status, setStatus] = useState("");
  const [clips, setClips] = useState([]);
  const [err, setErr] = useState("");
  const ref = useRef();

  const cost = count * COSTS.clip_per_clip;
  const onDrop = (e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer?.files?.[0]; if (f?.type.startsWith("video/")) setFile(f); };

  const process = async () => {
    if (!file || busy) return;
    setErr("");
    if ((profile?.credits || 0) < cost) { setErr("Necesitas " + cost + " créditos."); return; }
    const ok = await useCredits(cost);
    if (!ok) { setErr("Créditos insuficientes"); return; }
    setBusy(true); setPct(0); setClips([]);
    try {
      const result = await createClipsFromVideo({
        file, clipCount: count, clipDuration: clipDur, format: fmt,
        onProgress: (p, s) => { setPct(p); setStatus(s); },
      });
      await addStat("clipsGenerated", count);
      setClips(result);
    } catch (e) { setErr("Error: " + e.message); }
    setBusy(false); setPct(0); await refreshProfile();
  };

  return (
    <section className="tab-body fade-in">
      <div className="sec-head">
        <span className="sec-badge rose">✂</span>
        <div><h2>Creador de Clips &amp; Shorts</h2><p className="dim">Sube tu video y genera clips descargables</p></div>
      </div>
      <div className={`dropzone${drag ? " dragging" : ""}${file ? " has" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={onDrop} onClick={() => ref.current?.click()}>
        <input type="file" accept="video/*" ref={ref} hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
        {file ? (
          <div className="file-row">
            <span style={{ fontSize: "1.8rem" }}>🎥</span>
            <div className="col gap-2">
              <span className="fname">{file.name}</span>
              <span className="fsize">{(file.size / 1048576).toFixed(1)} MB</span>
            </div>
            <button className="x-btn" onClick={(e) => { e.stopPropagation(); setFile(null); setClips([]); }}>✕</button>
          </div>
        ) : (
          <div className="drop-inner">
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M24 4v28M24 4l-8 8M24 4l8 8" /><path d="M8 28v10a4 4 0 004 4h24a4 4 0 004-4V28" /></svg>
            <span className="drop-title">Arrastra tu video aquí</span>
            <span className="dim">o haz clic para seleccionar</span>
          </div>
        )}
      </div>
      <div className="col gap-16 mt-24">
        <div className="row-wrap">
          <div className="col gap-8">
            <label className="lbl">Clips</label>
            <div className="counter">
              <button onClick={() => setCount(Math.max(1, count - 1))}>−</button>
              <span>{count}</span>
              <button onClick={() => setCount(Math.min(10, count + 1))}>+</button>
            </div>
          </div>
          <div className="col gap-8 flex1">
            <label className="lbl">Duración / clip</label>
            <Pills items={CLIP_DURS} value={clipDur} onChange={setClipDur} small />
          </div>
          <div className="col gap-8 flex1">
            <label className="lbl">Formato</label>
            <Pills items={CLIP_FMTS} value={fmt} onChange={setFmt} small />
          </div>
        </div>
        <div className="cost-info">
          <span>Costo: <strong>{cost} créditos</strong></span>
          <span className="sep">·</span>
          <span>Tienes: <strong className="cyan">◈ {profile?.credits || 0}</strong></span>
        </div>
        {err && <div className="err-msg">{err}</div>}
        <button className={`btn-main rose${busy ? " loading" : ""}`} onClick={process} disabled={busy || !file}>
          {busy ? <><span className="spin" /> {status}</> : <>✂ Crear Clips — {cost} créditos</>}
        </button>
        {busy && <ProgressBar value={pct} label={status} />}
      </div>
      {clips.length > 0 && (
        <div className="gallery fade-in mt-32">
          <h3>Clips Generados <span className="count-badge">{clips.length}</span></h3>
          <div className="clip-grid">
            {clips.map((c) => (
              <div key={c.id} className="card">
                <div className="card-video tall"><video src={c.url} controls poster={c.thumbUrl} /></div>
                <div className="card-body"><p className="card-txt sm">{c.name}</p></div>
                <div className="card-actions">
                  <button className="btn-sm accent" onClick={() => downloadVideo(c.url, "clip-" + c.id + ".webm")}>⬇ Descargar</button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-dl-all" onClick={() => clips.forEach((c, i) => setTimeout(() => downloadVideo(c.url, "clip-" + (i+1) + ".webm"), i * 500))}>⬇ Descargar Todos</button>
        </div>
      )}
    </section>
  );
}

export default function StudioPage() {
  const { profile, logout, isAdmin, refreshProfile } = useAuth();
  const [tab, setTab] = useState("gen");
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <div className="app">
      <div className="orbs" aria-hidden="true"><div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" /></div>
      <header className="hdr">
        <div className="logo">
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
            <rect x="2" y="6" width="28" height="20" rx="3" stroke="url(#slg)" strokeWidth="2" />
            <polygon points="13,11 13,21 22,16" fill="url(#slg)" />
            <defs><linearGradient id="slg" x1="0" y1="0" x2="32" y2="32"><stop offset="0%" stopColor="#c8956c" /><stop offset="100%" stopColor="#d4a054" /></linearGradient></defs>
          </svg>
          <span className="logo-name">NeoFrame<span className="grad-text">.ai</span></span>
        </div>
        <nav className="tabs">
          <button className={`tab${tab === "gen" ? " on" : ""}`} onClick={() => setTab("gen")}><span className="tab-ic">✦</span> Generar Video</button>
          <button className={`tab${tab === "clip" ? " on" : ""}`} onClick={() => setTab("clip")}><span className="tab-ic">✂</span> Crear Clips</button>
        </nav>
        <div className="hdr-r">
          <div className="credits" onClick={refreshProfile} style={{ cursor: "pointer" }}>◈ {profile?.credits || 0} créditos</div>
          {isAdmin && <button className="btn-sm admin-btn" onClick={() => setShowAdmin(true)}>⚙ Admin</button>}
          <div className="user-menu">
            <div className="avatar">{(profile?.name || "?")[0].toUpperCase()}</div>
            <button className="logout-btn" onClick={logout}>Salir</button>
          </div>
        </div>
      </header>
      <main className="main">{tab === "gen" ? <GenerateTab /> : <ClipsTab />}</main>
      <footer className="ftr">NeoFrame.ai — Powered by AI <span className="dot">·</span> {profile?.name}</footer>
      {showAdmin && <AdminPanel onClose={() => { setShowAdmin(false); refreshProfile(); }} />}
    </div>
  );
}
