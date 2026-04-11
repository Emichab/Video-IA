// ─── NeoFrame Video Engine v5 ───
// fal.ai: Seedance 1.5 (audio) + Auto-Caption (subtitles) + Canvas fallback

const FAL_API_KEY = "FAL_KEY_PLACEHOLDER";
const FAL_BASE = "https://queue.fal.run";
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

// ── fal.ai helpers ──
async function falRequest(endpoint, body) {
  var resp = await fetch(FAL_BASE + "/" + endpoint, {
    method: "POST",
    headers: { "Authorization": "Key " + FAL_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error("fal.ai " + resp.status + ": " + (await resp.text()));
  return await resp.json();
}

async function falPoll(endpoint, requestId, onStatus) {
  var base = FAL_BASE + "/" + endpoint + "/requests/" + requestId;
  for (var i = 0; i < 120; i++) {
    await new Promise(function(r) { setTimeout(r, 3000); });
    try {
      var resp = await fetch(base + "/status", { headers: { "Authorization": "Key " + FAL_API_KEY } });
      var status = await resp.json();
      if (onStatus) onStatus(status);
      if (status.status === "COMPLETED") {
        var result = await fetch(base, { headers: { "Authorization": "Key " + FAL_API_KEY } });
        return await result.json();
      }
      if (status.status === "FAILED") throw new Error("Generation failed: " + (status.error || "unknown"));
    } catch (e) { if (i === 119) throw e; }
  }
  throw new Error("Timeout waiting for fal.ai");
}

async function falGenerate(endpoint, body, onProgress, startPct, endPct, msg) {
  var data = await falRequest(endpoint, body);
  if (data.request_id) {
    return await falPoll(endpoint, data.request_id, function(s) {
      var p = startPct + (endPct - startPct) * (s.queue_position ? Math.max(0, 1 - s.queue_position / 10) : 0.5);
      onProgress?.(Math.floor(p), msg);
    });
  }
  return data;
}

async function downloadUrl(url) {
  var resp = await fetch(url);
  var blob = await resp.blob();
  return { blob: blob, url: URL.createObjectURL(blob), mimeType: blob.type || "video/mp4" };
}

// ══════════════════════════════════════
// MAIN GENERATE — with audio & subtitle options
// ══════════════════════════════════════
export async function generateVideo({ prompt, style, duration, ratio, withAudio, withSubtitles, subtitleStyle, onProgress }) {
  var durationSec = parseInt(duration);
  var hasFal = FAL_API_KEY && FAL_API_KEY !== "FAL_KEY_PLACEHOLDER";

  if (hasFal) {
    try {
      // STEP 1: Generate video (with or without audio)
      onProgress?.(5, "Conectando con IA...");

      var videoResult;
      var videoUrl;

      if (withAudio) {
        // Seedance 1.5 Pro — cheapest with native audio
        onProgress?.(8, "Generando video con audio (Seedance AI)...");
        var endpoint = "fal-ai/seedance/video/v1.5/pro/text-to-video";
        videoResult = await falGenerate(endpoint, {
          prompt: prompt,
          duration: Math.min(durationSec, 10),
          aspect_ratio: ratio === "9:16" ? "9:16" : ratio === "1:1" ? "1:1" : "16:9",
          generate_audio: true,
        }, onProgress, 10, 65, "Generando video con audio...");
      } else {
        // Kling 2.5 Turbo — cheapest without audio
        onProgress?.(8, "Generando video (Kling AI)...");
        var endpoint = "fal-ai/kling-video/v2.5-turbo/pro/text-to-video";
        videoResult = await falGenerate(endpoint, {
          prompt: prompt,
          duration: Math.min(durationSec, 10),
          aspect_ratio: ratio === "9:16" ? "9:16" : ratio === "1:1" ? "1:1" : "16:9",
        }, onProgress, 10, 65, "Generando video...");
      }

      // Extract video URL from result
      if (videoResult.video && videoResult.video.url) {
        videoUrl = videoResult.video.url;
      } else if (videoResult.output && videoResult.output.video) {
        videoUrl = videoResult.output.video;
      } else {
        // Try to find URL in response
        var resultStr = JSON.stringify(videoResult);
        var urlMatch = resultStr.match(/https:\/\/[^"]+\.mp4/);
        if (urlMatch) videoUrl = urlMatch[0];
        else throw new Error("No video URL found in response");
      }

      onProgress?.(70, "Video generado exitosamente!");

      // STEP 2: Add subtitles if requested
      if (withSubtitles && withAudio) {
        onProgress?.(72, "Agregando subtítulos...");

        var subStyle = subtitleStyle || {};
        var captionResult = await falGenerate("fal-ai/auto-caption", {
          video_url: videoUrl,
          language: subStyle.language || "es",
          font_name: subStyle.font || "Montserrat",
          font_size: subStyle.fontSize || 80,
          font_weight: "bold",
          font_color: subStyle.color || "white",
          highlight_color: subStyle.highlightColor || "#a855f7",
          stroke_width: 3,
          stroke_color: "black",
          background_color: "none",
          position: subStyle.position || "bottom",
          y_offset: 75,
          words_per_subtitle: 2,
          enable_animation: true,
        }, onProgress, 75, 92, "Procesando subtítulos...");

        // Use captioned video
        if (captionResult.video && captionResult.video.url) {
          videoUrl = captionResult.video.url;
        }
        onProgress?.(93, "Subtítulos agregados!");
      }

      // STEP 3: Download final video
      onProgress?.(95, "Descargando video final...");
      var result = await downloadUrl(videoUrl);
      onProgress?.(100, "¡Video completado!");
      return result;

    } catch (err) {
      console.warn("fal.ai error:", err.message);
      onProgress?.(15, "Error con API, generando con Canvas...");
    }
  }

  // FALLBACK: Canvas animation (always free)
  return await generateCanvasVideo({ prompt, style, duration: durationSec, ratio, onProgress });
}

// ══════════════════════════════════════
// CANVAS FALLBACK
// ══════════════════════════════════════
async function generateCanvasVideo({ prompt, style, duration, ratio, onProgress }) {
  var fps = 30, totalFrames = duration * fps;
  var sizes = { "16:9": [1280, 720], "9:16": [720, 1280], "1:1": [720, 720], "4:3": [960, 720] };
  var [W, H] = sizes[ratio] || [1280, 720];

  onProgress?.(5, "Generando animación...");
  var animCode = await getAnimCode(prompt, style, duration, W, H);

  onProgress?.(15, "Compilando...");
  var canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  var ctx = canvas.getContext("2d");
  var drawFrame;
  try {
    drawFrame = new Function("ctx", "W", "H", "frame", "total", "t", animCode);
    ctx.clearRect(0, 0, W, H); drawFrame(ctx, W, H, 0, totalFrames, 0);
  } catch (e) {
    drawFrame = new Function("ctx", "W", "H", "frame", "total", "t", getBuiltIn(prompt));
  }

  onProgress?.(20, "Renderizando...");
  var stream = canvas.captureStream(fps);
  var mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
  var rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5000000 });
  var chunks = []; rec.ondataavailable = function(e) { if (e.data.size) chunks.push(e.data); };

  return new Promise(function(resolve) {
    rec.onstop = function() { var blob = new Blob(chunks, { type: mime }); resolve({ blob: blob, url: URL.createObjectURL(blob), mimeType: mime }); };
    rec.start(); var fr = 0;
    function loop() {
      if (fr >= totalFrames) { rec.stop(); onProgress?.(100, "¡Video completado!"); return; }
      ctx.clearRect(0, 0, W, H);
      try { drawFrame(ctx, W, H, fr, totalFrames, fr / totalFrames); } catch (e) {}
      fr++;
      if (fr % fps === 0) onProgress?.(20 + Math.floor((fr / totalFrames) * 75), "Renderizando... " + Math.floor(fr / fps) + "s / " + duration + "s");
      fr % 2 === 0 ? requestAnimationFrame(loop) : setTimeout(loop, 0);
    }
    loop();
  });
}

async function getAnimCode(prompt, style, dur, W, H) {
  try {
    var resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 4096,
        system: "You are an HTML5 Canvas animator. Generate ONLY JS function body for (ctx,W,H,frame,total,t). Style:" + style + ". Draw animated 2D characters for people. NO markdown, NO backticks.",
        messages: [{ role: "user", content: "Create " + dur + "s animation (30fps) for: \"" + prompt + "\". Canvas:" + W + "x" + H + ". Return ONLY JS code." }]
      }),
    });
    if (!resp.ok) throw new Error("API error");
    var data = await resp.json();
    var code = data.content?.[0]?.text || "";
    return code.replace(/```javascript\n?/g, "").replace(/```js\n?/g, "").replace(/```\n?/g, "").trim();
  } catch (e) { return getBuiltIn(prompt); }
}

function getBuiltIn(p) {
  p = p.toLowerCase();
  if (/persona|person|camina|hombre|mujer|walk|man|woman/i.test(p)) return PERSON();
  if (/espacio|space|galaxy|planet|star/i.test(p)) return SPACE();
  if (/bosque|forest|mountain|ocean|sunset|nature/i.test(p)) return NATURE();
  if (/ciudad|city|building|street|night|neon/i.test(p)) return CITY();
  return ABSTRACT();
}

function PERSON(){return `var g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1a1a2e');g.addColorStop(1,'#0f3460');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);for(var i=0;i<50;i++){ctx.beginPath();ctx.arc((i*137.5+frame*0.1)%W,(i*97)%(H*0.6),0.8,0,6.28);ctx.fillStyle='rgba(255,255,255,'+(0.3+Math.sin(i+frame*0.03)*0.3)+')';ctx.fill();}ctx.fillStyle='#1a1a2e';ctx.fillRect(0,H*0.75,W,H*0.25);ctx.beginPath();ctx.arc(W*0.8,H*0.2,35,0,6.28);ctx.fillStyle='#f0e68c';ctx.shadowColor='#f0e68c';ctx.shadowBlur=30;ctx.fill();ctx.shadowBlur=0;var e=t<0.5?2*t*t:-1+(4-2*t)*t,px=-80+e*(W+160),py=H*0.73-5,w=Math.sin(frame*0.18),b=Math.abs(w)*4;ctx.save();ctx.translate(px,py-b);ctx.beginPath();ctx.ellipse(0,5,25,5,0,0,6.28);ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fill();var l=w*0.45;ctx.strokeStyle='#2c3e50';ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-5,-30);ctx.lineTo(-5+Math.sin(l)*20,0);ctx.stroke();ctx.beginPath();ctx.moveTo(5,-30);ctx.lineTo(5+Math.sin(-l)*20,0);ctx.stroke();ctx.fillStyle='#3498db';ctx.beginPath();ctx.roundRect(-14,-70,28,42,6);ctx.fill();ctx.strokeStyle='#e0a370';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-14,-62);ctx.lineTo(-14+Math.sin(-w*0.4)*18,-42);ctx.stroke();ctx.beginPath();ctx.moveTo(14,-62);ctx.lineTo(14+Math.sin(w*0.4)*18,-42);ctx.stroke();ctx.beginPath();ctx.arc(0,-82,16,0,6.28);ctx.fillStyle='#e0a370';ctx.fill();ctx.beginPath();ctx.arc(0,-86,16,3.14,6.28);ctx.fillStyle='#2c2c2c';ctx.fill();var bk=Math.sin(frame*0.08)>0.97?0.2:1;ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(-6,-84,3,3*bk,0,0,6.28);ctx.fill();ctx.beginPath();ctx.ellipse(6,-84,3,3*bk,0,0,6.28);ctx.fill();ctx.fillStyle='#1a1a2e';ctx.beginPath();ctx.arc(-5,-84,1.5,0,6.28);ctx.fill();ctx.beginPath();ctx.arc(7,-84,1.5,0,6.28);ctx.fill();ctx.beginPath();ctx.arc(0,-78,5,0.1,3.04);ctx.strokeStyle='#c0392b';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();`;}
function SPACE(){return `ctx.fillStyle='#050510';ctx.fillRect(0,0,W,H);for(var l=0;l<3;l++)for(var i=0;i<50;i++){ctx.beginPath();ctx.arc((i*137.5*(l+1)+frame*(l+1)*0.3)%W,(i*97*(l+1))%H,0.5+l*0.5,0,6.28);ctx.fillStyle='rgba(255,255,255,'+(0.3+Math.sin(frame*0.05+i+l)*0.4)+')';ctx.fill();}var px=W*0.65,py=H*0.4,pr=70;var pg=ctx.createRadialGradient(px-20,py-20,0,px,py,pr);pg.addColorStop(0,'#64b5f6');pg.addColorStop(1,'#0d47a1');ctx.beginPath();ctx.arc(px,py,pr,0,6.28);ctx.fillStyle=pg;ctx.fill();ctx.save();ctx.translate(px,py);ctx.scale(1,0.3);ctx.beginPath();ctx.arc(0,0,pr*1.6,0,6.28);ctx.strokeStyle='rgba(200,200,255,0.3)';ctx.lineWidth=8;ctx.stroke();ctx.restore();`;}
function NATURE(){return `var g=ctx.createLinearGradient(0,0,0,H);var s=Math.sin(t*3.14);g.addColorStop(0,'hsl('+(220+s*30)+',60%,'+(15+s*20)+'%)');g.addColorStop(0.7,'hsl('+(20+s*20)+',80%,'+(40+s*20)+'%)');g.addColorStop(1,'hsl(35,90%,60%)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.beginPath();ctx.arc(W*0.5,H*0.5,30,0,6.28);ctx.fillStyle='#ffe082';ctx.fill();var c=['#2d1b4e','#1a1040','#0d0a20'];for(var l=0;l<3;l++){ctx.beginPath();ctx.moveTo(0,H);for(var x=0;x<=W;x+=3)ctx.lineTo(x,H*(0.5+l*0.1)+Math.sin(x*0.008+l*2+frame*0.002*(l+1))*H*(0.2-l*0.04));ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=c[l];ctx.fill();}for(var b=0;b<5;b++){var bx=(W*0.2+b*W*0.15+frame*(1+b*0.3))%(W+100)-50,by=H*0.2+b*20+Math.sin(frame*0.05+b)*10,wi=Math.sin(frame*0.2+b)*8;ctx.beginPath();ctx.moveTo(bx-10,by+wi);ctx.quadraticCurveTo(bx-3,by-3,bx,by);ctx.quadraticCurveTo(bx+3,by-3,bx+10,by+wi);ctx.strokeStyle='rgba(20,20,40,0.6)';ctx.lineWidth=1.5;ctx.stroke();}`;}
function CITY(){return `ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,W,H);var bs=[{x:0,w:80,h:250},{x:70,w:60,h:320},{x:200,w:70,h:350},{x:350,w:60,h:300},{x:470,w:110,h:380},{x:630,w:90,h:340},{x:780,w:60,h:310},{x:920,w:70,h:360},{x:1060,w:80,h:320}];for(var b of bs){var bx=b.x/1280*W,bw=b.w/1280*W,bh=b.h/400*H*0.6,by=H*0.85-bh;ctx.fillStyle='#1a1a2e';ctx.fillRect(bx,by,bw,bh);var wW=bw*0.12,co=Math.floor(bw/(wW+4)),ro=Math.floor(bh/(wW*0.8+8));for(var r=1;r<ro;r++)for(var c=0;c<co;c++){ctx.fillStyle=Math.sin(c*3.7+r*7.1+frame*0.02+b.x)>0.2?'hsl('+(40+Math.sin(c+r)*20)+',80%,'+(50+Math.sin(frame*0.03+c)*15)+'%)':'rgba(20,20,40,0.8)';ctx.fillRect(bx+4+c*(wW+4),by+8+r*(wW*0.8+8),wW,wW*0.8);}}ctx.fillStyle='#1a1a24';ctx.fillRect(0,H*0.85,W,H*0.15);var cx=(frame*4)%(W+200)-100;ctx.fillStyle='#e74c3c';ctx.fillRect(cx,H*0.88,50,16);ctx.fillStyle='#333';ctx.beginPath();ctx.arc(cx+12,H*0.88+16,5,0,6.28);ctx.fill();ctx.beginPath();ctx.arc(cx+38,H*0.88+16,5,0,6.28);ctx.fill();`;}
function ABSTRACT(){return `var bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'hsl('+(frame*0.3%360)+',30%,8%)');bg.addColorStop(1,'hsl('+((frame*0.3+180)%360)+',30%,5%)');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);var cx=W/2,cy=H/2,e=t<0.5?2*t*t:-1+(4-2*t)*t;for(var i=0;i<100;i++){var a=(i*137.5+frame*(0.3+(i%5)*0.08))*0.0175,d=(30+i*2.2+Math.sin(frame*0.02+i*0.5)*25)*e;ctx.beginPath();ctx.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,1+Math.sin(frame*0.04+i),0,6.28);ctx.fillStyle='hsla('+((i*3+frame*0.5)%360)+',80%,60%,0.5)';ctx.fill();}var sr=60+Math.sin(frame*0.03)*15;ctx.beginPath();for(var i=0;i<=6;i++){var a=(i/6)*6.28-1.57+frame*0.01;i===0?ctx.moveTo(cx+Math.cos(a)*sr,cy+Math.sin(a)*sr):ctx.lineTo(cx+Math.cos(a)*sr,cy+Math.sin(a)*sr);}ctx.strokeStyle='rgba(168,85,247,0.6)';ctx.lineWidth=2;ctx.shadowColor='#a855f7';ctx.shadowBlur=20;ctx.stroke();ctx.shadowBlur=0;`;}

// ══════════════════════════════════════
// CLIP CREATOR
// ══════════════════════════════════════
export async function createClipsFromVideo({ file, clipCount, clipDuration, format, instructions, onProgress }) {
  onProgress?.(5, "Cargando video...");
  var video = document.createElement("video"); video.muted = true; video.playsInline = true;
  video.src = URL.createObjectURL(file);
  await new Promise(function(r) { video.onloadedmetadata = r; video.load(); });
  await new Promise(function(r) { video.oncanplay = r; });
  var td = video.duration, cds = parseInt(clipDuration);
  var sizes = { "16:9": [1280,720], "9:16": [720,1280], "1:1": [720,720] };
  var [W, H] = sizes[format] || [720, 1280]; var fps = 30;
  var clips = [];
  for (var i = 0; i < clipCount; i++) {
    onProgress?.(10 + (i / clipCount) * 80, "Creando clip " + (i+1) + " de " + clipCount + "...");
    var sd = Math.min(cds, td), ms = Math.max(0, td - sd);
    var st = clipCount === 1 ? 0 : (ms / (clipCount - 1)) * i;
    var c = document.createElement("canvas"); c.width = W; c.height = H; var cx = c.getContext("2d");
    var s = c.captureStream(fps);
    var mt = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    var rec = new MediaRecorder(s, { mimeType: mt, videoBitsPerSecond: 4000000 });
    var ch = []; rec.ondataavailable = function(e) { if (e.data.size) ch.push(e.data); };
    var cb = await new Promise(async function(resolve) {
      rec.onstop = function() { resolve(new Blob(ch, { type: mt })); };
      rec.start(); video.currentTime = st;
      await new Promise(function(r) { video.onseeked = r; }); video.play();
      var tf = cds * fps, f = 0;
      var iv = setInterval(function() {
        if (f >= tf || video.ended) { clearInterval(iv); video.pause(); rec.stop(); return; }
        cx.clearRect(0, 0, W, H);
        var vw = video.videoWidth, vh = video.videoHeight, cr = W/H, vr = vw/vh, sx=0, sy=0, sw=vw, sh=vh;
        if (vr > cr) { sw = vh*cr; sx = (vw-sw)/2; } else { sh = vw/cr; sy = (vh-sh)/2; }
        cx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H);
        cx.globalAlpha = 0.35; cx.font = Math.floor(W*0.022)+"px sans-serif"; cx.fillStyle = "#fff";
        cx.textAlign = "right"; cx.fillText("NeoFrame.ai", W-12, H-12); cx.globalAlpha = 1; f++;
      }, 1000/fps);
    });
    var url = URL.createObjectURL(cb);
    video.currentTime = st + 1; await new Promise(function(r) { video.onseeked = r; });
    var tc = document.createElement("canvas"); tc.width = 320; tc.height = Math.floor(320*(H/W));
    tc.getContext("2d").drawImage(video, 0, 0, tc.width, tc.height);
    clips.push({ id: Date.now()+i, name: "Clip "+(i+1), duration: clipDuration, format: format, blob: cb, url: url, thumbUrl: tc.toDataURL("image/jpeg",0.7), score: Math.floor(Math.random()*15+85) });
  }
  URL.revokeObjectURL(video.src); onProgress?.(100, "¡Clips completados!"); return clips;
}

export function downloadVideo(url, fn) {
  var a = document.createElement("a"); a.href = url; a.download = fn || "neoframe-video.webm";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
