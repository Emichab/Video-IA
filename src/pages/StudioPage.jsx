import { useState, useRef } from "react";
import { useAuth, COSTS } from "../hooks/useAuth.jsx";
import { generateVideo, createClipsFromVideo, downloadVideo } from "../lib/videoEngine.js";
import AdminPanel from "./AdminPanel.jsx";

/* ── constants ── */
const STYLES = ["Cinematográfico","Anime","3D Render","Documental","Fantasía","Sci-Fi","Minimalista","Acuarela"];
const DURATIONS = ["5s","10s","15s","30s","60s"];
const RATIOS = ["16:9","9:16","1:1","4:3"];
const CLIP_DURS = ["15s","30s","45s","60s"];
const CLIP_FMTS = ["9:16","16:9","1:1"];

/* ── small UI components ── */
function Pills({ items, value, onChange, small }) {
  return (
    <div className="pills">
      {items.map((it) => (
        <button key={it} className={`pill${value === it ? " on" : ""}${small ? " sm" : ""}`} onClick={() => onChange(it)}>{it}</button>
      ))}
    </div>
  );
}

function ProgressBar({ value, variant, label, steps }) {
  return (
    <div className="prog-wrap">
      <div className="prog-track">
        <div className={`prog-fill ${variant || ""}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      {label && <div className="prog-label">{label}</div>}
      {steps && (
        <div className="prog-steps">
          {steps.map((s, i) => (
            <span key={i} className={value > (i + 1) * (100 / steps.length) - 10 ? "lit" : ""}>{s}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TAB 1 — GENERATE VIDEO
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function GenerateTab() {
  const { profile, useCredits, addStat, refreshProfile } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Cinematográfico");
  const [dur, setDur] = useState("10s");
  const [ratio, setRatio] = useState("16:9");
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [status, setStatus] = useState("");
  const [videos, setVideos] = useState([]);
  const [err, setErr] = useState("");

  const costKey = `generate_${dur}`;
  const cost = COSTS[costKey] || 2;

  const generate = async () => {
    if (!prompt.trim() || busy) return;
    setErr("");

    // Check credits
    if ((profile?.credits || 0) < cost) {
      setErr(`Necesitas ${cost} créditos. Tienes ${profile?.credits || 0}.`);
      return;
    }

    // Deduct credits
    const ok = await useCredits(cost);
    if (!ok) { setErr("Créditos insuficientes"); return; }

    setBusy(true);
    setPct(0);
    setStatus("Iniciando...");

    try {
      const result = await generateVideo({
        prompt: prompt.trim(),
        style,
        duration: dur,
        ratio,
        onProgress: (p, s) => { setPct(p); setStatus(s); },
      });

      await addStat("videosGenerated");

      setVideos((prev) => [
        {
          id: Date.now(),
          prompt: prompt.trim(),
          style, dur, ratio,
          ts: new Date().toLocaleString(),
          url: result.url,
          blob: result.blob,
        },
        ...prev,
      ]);
    } catch (e) {
      setErr("Error generando video: " + e.message);
    }

    setBusy(false);
    setPct(0);
    await refreshProfile();
  };

  return (
    <section className="tab-body fade-in">
      <div className="sec-head">
        <span className="sec-badge purple">✦</span>
        <div>
          <h2>Generador de Video con IA</h2>
          <p className="dim">Videos reales generados con inteligencia artificial — descargables en WebM</p>
        </div>
      </div>

      <div className="gen-grid">
        <div className="col gap-20">
          <label className="lbl">Describe tu video</label>
          <textarea className="ta" rows={5}
            placeholder="Ej: Un universo en expansión con galaxias y nebulosas de colores vibrantes, estrellas brillantes naciendo..."
            value={prompt} onChange={(e) => setPrompt(e.target.value)}
          />

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

          <div className="cost-info">
            <span>Costo: <strong>{cost} crédito{cost !== 1 ? "s" : ""}</strong></span>
            <span className="sep">·</span>
            <span>Tienes: <strong className="cyan">◈ {profile?.credits || 0}</strong></span>
          </div>

          {err && <div className="err-msg">{err}</div>}

          <button className={`btn-main${busy ? " loading" : ""}`} onClick={generate} disabled={busy || !prompt.trim()}>
            {busy ? <><span className="spin" /> {status}</> : <>⚡ Generar Video — {cost} créditos</>}
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
                  <video src={v.url} muted loop onMouseEnter={(e) => e.target.play()} onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }} />
                </div>
                <div className="card-body">
                  <p className="card-txt">{v.prompt}</p>
                  <div className="tags">
                    <span className="tag">{v.style}</span>
                    <span className="tag">{v.dur}</span>
                    <span className="tag">{v.ratio}</span>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="btn-sm accent" onClick={() => downloadVideo(v.url, `neoframe-${v.id}.webm`)}>
                    ⬇ Descargar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TAB 2 — CREATE CLIPS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function ClipsTab() {
  const { profile, useCredits, addStat, refreshProfile } = useAuth();
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [count, setCount] = useState(3);
  const [clipDur, setClipDur] = useState("30s");
  const [fmt, setFmt] = useState("9:16");
  const [instr, setInstr] = useState("");
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
    if ((profile?.credits || 0) < cost) {
      setErr(`Necesitas ${cost} créditos. Tienes ${profile?.credits || 0}.`);
      return;
    }
    const ok = await useCredits(cost);
    if (!ok) { setErr("Créditos insuficientes"); return; }

    setBusy(true); setPct(0); setStatus("Iniciando..."); setClips([]);

    try {
      const result = await createClipsFromVideo({
        file, clipCount: count, clipDuration: clipDur, format: fmt, instructions: instr,
        onProgress: (p, s) => { setPct(p); setStatus(s); },
      });
      await addStat("clipsGenerated", count);
      setClips(result);
    } catch (e) {
      setErr("Error creando clips: " + e.message);
    }

    setBusy(false); setPct(0);
    await refreshProfile();
  };

  return (
    <section className="tab-body fade-in">
      <div className="sec-head">
        <span className="sec-badge rose">✂</span>
        <div>
          <h2>Creador de Clips &amp; Shorts</h2>
          <p className="dim">Sube tu video y la IA creará clips cortos reales descargables</p>
        </div>
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
              <span className="fsize">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
            </div>
            <button className="x-btn" onClick={(e) => { e.stopPropagation(); setFile(null); setClips([]); }}>✕</button>
          </div>
        ) : (
          <div className="drop-inner">
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M24 4v28M24 4l-8 8M24 4l8 8" /><path d="M8 28v10a4 4 0 004 4h24a4 4 0 004-4V28" />
            </svg>
            <span className="drop-title">Arrastra tu video aquí</span>
            <span className="dim">o haz clic para seleccionar</span>
            <span className="mono xs dim">MP4, MOV, AVI, WebM</span>
          </div>
        )}
      </div>

      <div className="col gap-16 mt-24">
        <label className="lbl">Instrucciones para la IA (opcional)</label>
        <textarea className="ta" rows={2} placeholder="Ej: Enfócate en los momentos más emocionantes…"
          value={instr} onChange={(e) => setInstr(e.target.value)} />

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
          <span>Costo: <strong>{cost} créditos</strong> ({count} clips × {COSTS.clip_per_clip})</span>
          <span className="sep">·</span>
          <span>Tienes: <strong className="cyan">◈ {profile?.credits || 0}</strong></span>
        </div>

        {err && <div className="err-msg">{err}</div>}

        <button className={`btn-main rose${busy ? " loading" : ""}`} onClick={process} disabled={busy || !file}>
          {busy ? <><span className="spin" /> {status}</> : <>✂ Crear Clips — {cost} créditos</>}
        </button>

        {busy && <ProgressBar value={pct} variant="rose" label={status}
          steps={["Cargando","Analizando","Cortando","Finalizando"]} />}
      </div>

      {clips.length > 0 && (
        <div className="gallery fade-in mt-32">
          <h3>Clips Generados <span className="count-badge">{clips.length}</span></h3>
          <div className="clip-grid">
            {clips.map((c) => (
              <div key={c.id} className="card">
                <div className="card-video tall">
                  <video src={c.url} controls poster={c.thumbUrl} />
                  <span className="score-badge">⚡ {c.score}</span>
                </div>
                <div className="card-body">
                  <p className="card-txt sm">{c.name}</p>
                  <div className="tags">
                    <span className="tag">{c.dur}</span><span className="tag">{c.fmt}</span>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="btn-sm accent" onClick={() => downloadVideo(c.url, `clip-${c.id}.webm`)}>⬇ Descargar</button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-dl-all" onClick={() => clips.forEach((c, i) => setTimeout(() => downloadVideo(c.url, `clip-${i + 1}.webm`), i * 500))}>
            ⬇ Descargar Todos los Clips
          </button>
        </div>
      )}
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   STUDIO (main layout)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function StudioPage() {
  const { profile, logout, isAdmin, refreshProfile } = useAuth();
  const [tab, setTab] = useState("gen");
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <div className="app">
      <div className="orbs" aria-hidden="true">
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
      </div>

      <header className="hdr">
        <div className="logo">
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
            <rect x="2" y="6" width="28" height="20" rx="3" stroke="url(#slg)" strokeWidth="2" />
            <polygon points="13,11 13,21 22,16" fill="url(#slg)" />
            <defs><linearGradient id="slg" x1="0" y1="0" x2="32" y2="32">
              <stop offset="0%" stopColor="#c084fc" /><stop offset="100%" stopColor="#22d3ee" />
            </linearGradient></defs>
          </svg>
          <span className="logo-name">NeoFrame<span className="grad-text">.ai</span></span>
        </div>

        <nav className="tabs">
          <button className={`tab${tab === "gen" ? " on" : ""}`} onClick={() => setTab("gen")}>
            <span className="tab-ic">✦</span> Generar Video
          </button>
          <button className={`tab${tab === "clip" ? " on" : ""}`} onClick={() => setTab("clip")}>
            <span className="tab-ic">✂</span> Crear Clips
          </button>
        </nav>

        <div className="hdr-r">
          <div className="credits" onClick={refreshProfile} style={{ cursor: "pointer" }}>
            ◈ {profile?.credits || 0} créditos
          </div>
          {isAdmin && (
            <button className="btn-sm admin-btn" onClick={() => setShowAdmin(true)}>⚙ Admin</button>
          )}
          <div className="user-menu">
            <div className="avatar">{(profile?.name || "?")[0].toUpperCase()}</div>
            <button className="logout-btn" onClick={logout}>Salir</button>
          </div>
        </div>
      </header>

      <main className="main">
        {tab === "gen" ? <GenerateTab /> : <ClipsTab />}
      </main>

      <footer className="ftr">
        NeoFrame.ai — Powered by AI <span className="dot">·</span> {profile?.name} · {profile?.email}
      </footer>

      {showAdmin && <AdminPanel onClose={() => { setShowAdmin(false); refreshProfile(); }} />}
    </div>
  );
}
