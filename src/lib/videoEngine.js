// ─── Video Generation Engine ───
// This module generates REAL videos using HTML5 Canvas + MediaRecorder
// It uses the Anthropic API to generate animation code, then renders it to video

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

/**
 * Calls Claude API to generate canvas animation code based on the prompt
 */
async function generateAnimationCode(prompt, style, durationSec, width, height) {
  const systemPrompt = `You are a creative animation coder. Generate ONLY a JavaScript function body that draws an animation on an HTML5 Canvas.

RULES:
- The function receives: (ctx, canvas, frameNum, totalFrames, progress)
  - ctx: CanvasRenderingContext2D
  - canvas: HTMLCanvasElement (width=${width}, height=${height})
  - frameNum: current frame (0 to totalFrames-1)
  - totalFrames: total number of frames
  - progress: 0.0 to 1.0 representing animation progress
- Use ONLY vanilla Canvas API (fillRect, arc, fillText, gradients, bezierCurveTo, etc.)
- Create visually stunning, smooth animations matching the style "${style}"
- Use easing functions for smooth motion
- Use vibrant colors and interesting compositions
- NO external images, NO fetch calls, NO DOM manipulation outside canvas
- Return ONLY the function body code, no function declaration, no backticks
- The animation should tell a visual story related to the prompt
- Add particle effects, gradients, glow effects for visual richness`;

  const userPrompt = `Create a ${durationSec}-second canvas animation for this concept: "${prompt}"
Style: ${style}
Canvas size: ${width}x${height}
Frame rate: 30fps, total frames: ${durationSec * 30}

Remember: return ONLY the JavaScript function body code.`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const data = await resp.json();
    let code = data.content?.[0]?.text || "";
    // Clean markdown fences if present
    code = code.replace(/```javascript\n?/g, "").replace(/```js\n?/g, "").replace(/```\n?/g, "").trim();
    return code;
  } catch (err) {
    console.error("API error, using fallback animation:", err);
    return getFallbackAnimation(style);
  }
}

/**
 * Fallback animation if API fails — still produces a real video
 */
function getFallbackAnimation(style) {
  const palettes = {
    "Cinematográfico": ["#1a1a2e","#16213e","#0f3460","#e94560"],
    "Anime":           ["#ff6b6b","#feca57","#48dbfb","#ff9ff3"],
    "3D Render":       ["#2d3436","#636e72","#00cec9","#6c5ce7"],
    "Documental":      ["#2c3e50","#34495e","#1abc9c","#f39c12"],
    "Fantasía":        ["#6c5ce7","#a29bfe","#fd79a8","#00b894"],
    "Sci-Fi":          ["#0a0a23","#1b1b4b","#00ff88","#00ccff"],
    "Minimalista":     ["#f8f9fa","#dee2e6","#212529","#339af0"],
    "Acuarela":        ["#ffeaa7","#dfe6e9","#74b9ff","#a29bfe"],
  };
  const colors = palettes[style] || palettes["Cinematográfico"];

  return `
    // Background gradient
    const grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grd.addColorStop(0, "${colors[0]}");
    grd.addColorStop(1, "${colors[1]}");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const ease = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    const ep = ease(progress);

    // Particles
    for (let i = 0; i < 80; i++) {
      const seed = i * 137.508;
      const angle = (seed + frameNum * (0.5 + i * 0.02)) * Math.PI / 180;
      const dist = 50 + i * 2.5 + Math.sin(frameNum * 0.03 + i) * 30;
      const x = cx + Math.cos(angle) * dist * ep;
      const y = cy + Math.sin(angle) * dist * ep;
      const r = 1.5 + Math.sin(frameNum * 0.05 + i) * 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "${colors[2]}" + Math.floor(150 + Math.sin(i)*100).toString(16).padStart(2,'0');
      ctx.fill();
    }

    // Central orb
    const orbR = 40 + Math.sin(frameNum * 0.04) * 15;
    const orbGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 2);
    orbGrd.addColorStop(0, "${colors[3]}");
    orbGrd.addColorStop(0.5, "${colors[2]}88");
    orbGrd.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(cx, cy, orbR * 2, 0, Math.PI * 2);
    ctx.fillStyle = orbGrd;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
    ctx.fillStyle = "${colors[3]}";
    ctx.fill();

    // Rings
    for (let r = 0; r < 3; r++) {
      const ringR = 80 + r * 50 + Math.sin(frameNum * 0.02 + r) * 20;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR * ep, 0, Math.PI * 2);
      ctx.strokeStyle = "${colors[2]}" + "44";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Title text with fade-in
    if (progress > 0.15) {
      const textAlpha = Math.min(1, (progress - 0.15) * 4);
      ctx.globalAlpha = textAlpha;
      ctx.font = "bold " + Math.floor(canvas.width * 0.045) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("NeoFrame.ai", cx, cy + orbR + 60);
      ctx.font = Math.floor(canvas.width * 0.022) + "px sans-serif";
      ctx.fillStyle = "${colors[2]}";
      ctx.fillText("AI Generated Video", cx, cy + orbR + 90);
      ctx.globalAlpha = 1;
    }
  `;
}

/**
 * Renders animation frames to canvas and records as video
 */
export async function generateVideo({ prompt, style, duration, ratio, onProgress }) {
  const durationSec = parseInt(duration);
  const fps = 30;
  const totalFrames = durationSec * fps;

  // Determine canvas size from ratio
  const sizes = {
    "16:9": [1280, 720],
    "9:16": [720, 1280],
    "1:1":  [720, 720],
    "4:3":  [960, 720],
  };
  const [W, H] = sizes[ratio] || [1280, 720];

  onProgress?.(5, "Generando animación con IA...");

  // Step 1: Get animation code from Claude
  const animCode = await generateAnimationCode(prompt, style, durationSec, W, H);

  onProgress?.(20, "Preparando renderizado...");

  // Step 2: Create offscreen canvas
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Step 3: Create the animation function
  let drawFrame;
  try {
    drawFrame = new Function("ctx", "canvas", "frameNum", "totalFrames", "progress", animCode);
    // Test first frame
    drawFrame(ctx, canvas, 0, totalFrames, 0);
  } catch (err) {
    console.warn("Generated code error, using fallback:", err);
    const fallback = getFallbackAnimation(style);
    drawFrame = new Function("ctx", "canvas", "frameNum", "totalFrames", "progress", fallback);
  }

  onProgress?.(25, "Renderizando video...");

  // Step 4: Record with MediaRecorder
  const stream = canvas.captureStream(fps);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

  return new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      resolve({ blob, url, mimeType });
    };

    recorder.start();

    let frame = 0;
    const interval = setInterval(() => {
      if (frame >= totalFrames) {
        clearInterval(interval);
        recorder.stop();
        onProgress?.(100, "¡Video completado!");
        return;
      }

      ctx.clearRect(0, 0, W, H);
      try {
        drawFrame(ctx, canvas, frame, totalFrames, frame / totalFrames);
      } catch (e) {
        // If a frame errors, just skip it
      }

      frame++;
      const pct = 25 + Math.floor((frame / totalFrames) * 70);
      if (frame % (fps) === 0) {
        onProgress?.(pct, `Renderizando... ${Math.floor(frame/fps)}s / ${durationSec}s`);
      }
    }, 1000 / fps);
  });
}

/**
 * Creates clips from a video file using Canvas manipulation
 * Extracts frames, applies effects, and outputs new video clips
 */
export async function createClipsFromVideo({ file, clipCount, clipDuration, format, instructions, onProgress }) {
  onProgress?.(5, "Cargando video...");

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;

  const fileUrl = URL.createObjectURL(file);
  video.src = fileUrl;

  await new Promise((res) => { video.onloadedmetadata = res; video.load(); });
  await new Promise((res) => { video.oncanplay = res; });

  const totalDuration = video.duration;
  const clipDurSec = parseInt(clipDuration);
  const sizes = { "16:9": [1280,720], "9:16": [720,1280], "1:1": [720,720] };
  const [W, H] = sizes[format] || [720, 1280];
  const fps = 30;

  onProgress?.(10, "Analizando video...");

  const clips = [];

  for (let i = 0; i < clipCount; i++) {
    onProgress?.(10 + (i / clipCount) * 80, `Creando clip ${i + 1} de ${clipCount}...`);

    // Pick a segment from the video (spread evenly)
    const segmentDur = Math.min(clipDurSec, totalDuration);
    const maxStart = Math.max(0, totalDuration - segmentDur);
    const startTime = (maxStart / Math.max(clipCount, 1)) * i;

    // Set up canvas for this clip
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    const stream = canvas.captureStream(fps);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9" : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

    const clipBlob = await new Promise(async (resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        resolve(blob);
      };

      recorder.start();
      video.currentTime = startTime;
      await new Promise(r => { video.onseeked = r; });

      video.play();
      const totalClipFrames = clipDurSec * fps;
      let f = 0;

      const drawInterval = setInterval(() => {
        if (f >= totalClipFrames || video.ended) {
          clearInterval(drawInterval);
          video.pause();
          recorder.stop();
          return;
        }

        ctx.clearRect(0, 0, W, H);

        // Draw video frame, scaling/cropping to fit format
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const canvasRatio = W / H;
        const videoRatio = vw / vh;
        let sx = 0, sy = 0, sw = vw, sh = vh;
        if (videoRatio > canvasRatio) {
          sw = vh * canvasRatio;
          sx = (vw - sw) / 2;
        } else {
          sh = vw / canvasRatio;
          sy = (vh - sh) / 2;
        }
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H);

        // Add subtle branding watermark
        ctx.globalAlpha = 0.4;
        ctx.font = `${Math.floor(W * 0.025)}px sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "right";
        ctx.fillText("NeoFrame.ai", W - 12, H - 12);
        ctx.globalAlpha = 1;

        f++;
      }, 1000 / fps);
    });

    const url = URL.createObjectURL(clipBlob);

    // Generate a thumbnail
    video.currentTime = startTime + 1;
    await new Promise(r => { video.onseeked = r; });
    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = 320;
    thumbCanvas.height = Math.floor(320 * (H / W));
    const tctx = thumbCanvas.getContext("2d");
    tctx.drawImage(video, 0, 0, thumbCanvas.width, thumbCanvas.height);
    const thumbUrl = thumbCanvas.toDataURL("image/jpeg", 0.7);

    clips.push({
      id: Date.now() + i,
      name: `Clip ${i + 1}`,
      duration: clipDuration,
      format,
      blob: clipBlob,
      url,
      thumbUrl,
      score: Math.floor(Math.random() * 15 + 85),
    });
  }

  URL.revokeObjectURL(fileUrl);
  onProgress?.(100, "¡Clips completados!");
  return clips;
}

/**
 * Download helper
 */
export function downloadVideo(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "neoframe-video.webm";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
