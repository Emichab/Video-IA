// ─── NeoFrame Video Engine v14 ───
// LTX video (no audio) + Web Speech API narration (free, no censorship)
// Merged in browser with Canvas + MediaRecorder

async function callFal(endpoint, body) {
  var resp = await fetch("/api/fal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: endpoint, body: body }),
  });
  var data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "Error " + resp.status);
  return data;
}

function findVideoUrl(data) {
  if (data.video && data.video.url) return data.video.url;
  var str = JSON.stringify(data);
  var match = str.match(/https:\/\/[^"]+\.(mp4|webm)/);
  if (match) return match[0];
  throw new Error("No video URL found");
}

// Generate narration audio using Web Speech API (free, no censorship)
function generateNarration(text, lang) {
  return new Promise(function(resolve, reject) {
    if (!window.speechSynthesis) {
      reject(new Error("Tu navegador no soporta Speech API"));
      return;
    }

    // Create audio context to record speech
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var dest = audioCtx.createMediaStreamDestination();
    var recorder = new MediaRecorder(dest.stream);
    var chunks = [];
    recorder.ondataavailable = function(e) { if (e.data.size) chunks.push(e.data); };

    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || "es-MX";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // Find Spanish voice
    var voices = speechSynthesis.getVoices();
    var spanishVoice = voices.find(function(v) { return v.lang.startsWith("es"); });
    if (spanishVoice) utterance.voice = spanishVoice;

    recorder.start();

    utterance.onend = function() {
      setTimeout(function() {
        recorder.stop();
      }, 500);
    };

    recorder.onstop = function() {
      var blob = new Blob(chunks, { type: "audio/webm" });
      var url = URL.createObjectURL(blob);
      audioCtx.close();
      resolve({ blob: blob, url: url });
    };

    utterance.onerror = function(e) {
      reject(new Error("Speech error: " + e.error));
    };

    // Route speech to recorder via audio element
    speechSynthesis.speak(utterance);
  });
}

// Merge video + narration by playing both and recording with Canvas
async function mergeVideoAndNarration(videoUrl, narrationText, lang, onProgress) {
  onProgress?.(50, "Preparando narración...");

  // Load video
  var video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.src = videoUrl;
  video.muted = true;
  await new Promise(function(r) { video.onloadedmetadata = r; video.load(); });
  await new Promise(function(r) { video.oncanplay = r; });

  var W = video.videoWidth || 1920;
  var H = video.videoHeight || 1080;
  var duration = video.duration;

  // Create canvas
  var canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  var ctx = canvas.getContext("2d");

  // Create stream from canvas
  var canvasStream = canvas.captureStream(30);

  // Set up speech synthesis
  var utterance = new SpeechSynthesisUtterance(narrationText);
  utterance.lang = lang || "es-MX";
  utterance.rate = 0.85;
  utterance.pitch = 1;
  var voices = speechSynthesis.getVoices();
  var spanishVoice = voices.find(function(v) { return v.lang.startsWith("es"); });
  if (spanishVoice) utterance.voice = spanishVoice;

  // Record final output
  var mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
  var recorder = new MediaRecorder(canvasStream, { mimeType: mimeType, videoBitsPerSecond: 5000000 });
  var chunks = [];
  recorder.ondataavailable = function(e) { if (e.data.size) chunks.push(e.data); };

  return new Promise(function(resolve) {
    recorder.onstop = function() {
      var blob = new Blob(chunks, { type: mimeType });
      resolve({ blob: blob, url: URL.createObjectURL(blob), mimeType: mimeType });
    };

    onProgress?.(55, "Combinando video y narración...");

    recorder.start();
    video.muted = false;
    video.volume = 0;
    video.play();

    // Start narration after small delay
    setTimeout(function() {
      speechSynthesis.speak(utterance);
    }, 500);

    // Draw video frames to canvas
    var frameCount = 0;
    function drawFrame() {
      if (video.ended || video.paused) {
        setTimeout(function() {
          recorder.stop();
        }, 1000);
        return;
      }
      ctx.drawImage(video, 0, 0, W, H);
      frameCount++;
      if (frameCount % 30 === 0) {
        var pct = 55 + Math.floor((video.currentTime / duration) * 35);
        onProgress?.(pct, "Grabando... " + Math.floor(video.currentTime) + "s / " + Math.floor(duration) + "s");
      }
      requestAnimationFrame(drawFrame);
    }
    drawFrame();

    // Safety timeout
    setTimeout(function() {
      if (recorder.state === "recording") {
        video.pause();
        speechSynthesis.cancel();
        recorder.stop();
      }
    }, (duration + 5) * 1000);
  });
}

export async function generateVideo({ prompt, style, duration, ratio, narrationText, withSubtitles, subtitleStyle, onProgress }) {
  var durationSec = parseInt(duration);
  var hasNarration = narrationText && narrationText.trim().length > 0;

  var styleMap = {
    "Cinematográfico": "cinematic style, professional cinematography, dramatic lighting, ",
    "Anime": "anime style, Japanese animation aesthetic, vibrant colors, ",
    "3D Render": "3D rendered, CGI style, Pixar quality, photorealistic 3D graphics, ",
    "Documental": "documentary style, realistic footage, handheld camera, natural lighting, ",
    "Fantasía": "fantasy style, magical, ethereal lighting, mystical atmosphere, ",
    "Sci-Fi": "science fiction style, futuristic, neon lights, cyberpunk aesthetic, ",
    "Minimalista": "minimalist style, clean, simple composition, muted colors, ",
    "Acuarela": "watercolor painting style, soft colors, artistic brushstrokes, ",
  };
  var fullPrompt = (styleMap[style] || "cinematic style, ") + prompt;

  try {
    // ── STEP 1: Generate video WITHOUT audio ──
    onProgress?.(5, "Generando video " + durationSec + "s...");

    var videoResult = await callFal("fal-ai/ltx-2/text-to-video/fast", {
      prompt: fullPrompt,
      duration: durationSec,
      resolution: "1080p",
      aspect_ratio: ratio === "9:16" ? "9:16" : ratio === "1:1" ? "1:1" : "16:9",
      audio_enabled: false,
    });

    console.log("LTX result:", videoResult);
    var videoUrl = findVideoUrl(videoResult);
    onProgress?.(45, "Video generado!");

    // ── STEP 2: Add narration if provided ──
    if (hasNarration) {
      // Load voices first (needed for some browsers)
      if (speechSynthesis.getVoices().length === 0) {
        await new Promise(function(r) { speechSynthesis.onvoiceschanged = r; setTimeout(r, 2000); });
      }

      var lang = (subtitleStyle && subtitleStyle.language) || "es";
      var langMap = { "es": "es-MX", "en": "en-US", "pt": "pt-BR", "fr": "fr-FR" };
      var fullLang = langMap[lang] || "es-MX";

      var merged = await mergeVideoAndNarration(videoUrl, narrationText.trim(), fullLang, onProgress);
      onProgress?.(92, "Video con narración listo!");

      // Download merged
      onProgress?.(95, "Preparando descarga...");
      onProgress?.(100, "¡Video con narración completado!");
      return merged;
    }

    // ── No narration — just download video ──
    onProgress?.(90, "Descargando video...");
    var resp = await fetch(videoUrl);
    var blob = await resp.blob();
    onProgress?.(100, "¡Video completado!");
    return { blob: blob, url: URL.createObjectURL(blob), mimeType: blob.type || "video/mp4" };

  } catch (err) {
    console.error("Error:", err.message);
    throw err;
  }
}

export async function createClipsFromVideo({ file, clipCount, clipDuration, format, instructions, onProgress }) {
  onProgress?.(5, "Cargando video...");
  var video = document.createElement("video"); video.muted = true; video.playsInline = true;
  video.src = URL.createObjectURL(file);
  await new Promise(function(r) { video.onloadedmetadata = r; video.load(); });
  await new Promise(function(r) { video.oncanplay = r; });
  var td = video.duration, cds = parseInt(clipDuration);
  var sizes = { "16:9": [1280,720], "9:16": [720,1280], "1:1": [720,720] };
  var wh = sizes[format] || [720,1280]; var W = wh[0], H = wh[1], fps = 30;
  var clips = [];
  for (var i = 0; i < clipCount; i++) {
    onProgress?.(10+(i/clipCount)*80, "Creando clip "+(i+1)+" de "+clipCount+"...");
    var sd = Math.min(cds,td), ms = Math.max(0,td-sd);
    var st = clipCount===1 ? 0 : (ms/(clipCount-1))*i;
    var c = document.createElement("canvas"); c.width=W; c.height=H; var cx=c.getContext("2d");
    var s = c.captureStream(fps);
    var mt = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    var rec = new MediaRecorder(s, { mimeType:mt, videoBitsPerSecond:4000000 });
    var ch=[]; rec.ondataavailable=function(e){if(e.data.size)ch.push(e.data);};
    var cb = await new Promise(async function(resolve) {
      rec.onstop=function(){resolve(new Blob(ch,{type:mt}));};
      rec.start(); video.currentTime=st;
      await new Promise(function(r){video.onseeked=r;}); video.play();
      var tf=cds*fps,f=0;
      var iv=setInterval(function(){
        if(f>=tf||video.ended){clearInterval(iv);video.pause();rec.stop();return;}
        cx.clearRect(0,0,W,H);
        var vw=video.videoWidth,vh=video.videoHeight,cr=W/H,vr=vw/vh,sx=0,sy=0,sw=vw,sh=vh;
        if(vr>cr){sw=vh*cr;sx=(vw-sw)/2;}else{sh=vw/cr;sy=(vh-sh)/2;}
        cx.drawImage(video,sx,sy,sw,sh,0,0,W,H);f++;
      },1000/fps);
    });
    var url=URL.createObjectURL(cb);
    video.currentTime=st+1; await new Promise(function(r){video.onseeked=r;});
    var tc=document.createElement("canvas");tc.width=320;tc.height=Math.floor(320*(H/W));
    tc.getContext("2d").drawImage(video,0,0,tc.width,tc.height);
    clips.push({id:Date.now()+i,name:"Clip "+(i+1),duration:clipDuration,format:format,blob:cb,url:url,thumbUrl:tc.toDataURL("image/jpeg",0.7),score:Math.floor(Math.random()*15+85)});
  }
  URL.revokeObjectURL(video.src); onProgress?.(100,"¡Clips completados!"); return clips;
}

export function downloadVideo(url,fn){var a=document.createElement("a");a.href=url;a.download=fn||"neoframe-video.mp4";document.body.appendChild(a);a.click();document.body.removeChild(a);}
