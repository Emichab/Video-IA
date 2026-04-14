// ─── NeoFrame Video Engine v10 ───
// LTX Video 2.0 Fast — supports 6-20s, style in prompt, audio

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

// Map user duration to LTX supported values: 6,8,10,12,14,16,18,20
function mapDuration(dur) {
  var secs = parseInt(dur);
  var allowed = [6, 8, 10, 12, 14, 16, 18, 20];
  // Find closest allowed value
  var closest = 6;
  for (var i = 0; i < allowed.length; i++) {
    if (Math.abs(allowed[i] - secs) < Math.abs(closest - secs)) {
      closest = allowed[i];
    }
  }
  return closest;
}

export async function generateVideo({ prompt, style, duration, ratio, withAudio, withSubtitles, subtitleStyle, onProgress }) {
  var durationSec = mapDuration(duration);

  // Add style to the prompt so LTX applies it visually
  var fullPrompt = prompt;
  if (style && style !== "Cinematográfico") {
    var styleMap = {
      "Anime": "anime style, Japanese animation aesthetic, vibrant colors, ",
      "3D Render": "3D rendered, CGI style, photorealistic 3D graphics, ",
      "Documental": "documentary style, realistic footage, handheld camera, ",
      "Fantasía": "fantasy style, magical, ethereal lighting, mystical atmosphere, ",
      "Sci-Fi": "science fiction style, futuristic, neon lights, cyberpunk aesthetic, ",
      "Minimalista": "minimalist style, clean, simple composition, muted colors, ",
      "Acuarela": "watercolor painting style, soft colors, artistic brushstrokes, ",
    };
    var prefix = styleMap[style] || "";
    fullPrompt = prefix + prompt;
  } else {
    fullPrompt = "cinematic style, professional cinematography, dramatic lighting, " + prompt;
  }

  try {
    onProgress?.(5, "Enviando a LTX Video AI (" + durationSec + "s)...");

    var body = {
      prompt: fullPrompt,
      seconds: durationSec,
      resolution: "1080p",
      aspect_ratio: ratio === "9:16" ? "9:16" : ratio === "1:1" ? "1:1" : "16:9",
      audio_enabled: withAudio ? true : false,
    };

    // Videos longer than 10s need 25fps
    if (durationSec > 10) {
      body.fps = 25;
    }

    console.log("LTX request:", body);
    onProgress?.(8, "Generando video " + durationSec + "s con " + (withAudio ? "audio" : "sin audio") + "...");

    var result = await callFal("fal-ai/ltx-2/text-to-video/fast", body);
    console.log("LTX result:", result);

    var videoUrl = findVideoUrl(result);
    onProgress?.(70, "Video de " + durationSec + "s generado!");

    // Subtitles
    if (withSubtitles && withAudio) {
      onProgress?.(75, "Agregando subtítulos...");
      var subStyle = subtitleStyle || {};
      var subResult = await callFal("fal-ai/auto-caption", {
        video_url: videoUrl,
        language: subStyle.language || "es",
        font_name: "Montserrat",
        font_size: 80,
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
      });
      if (subResult.video && subResult.video.url) videoUrl = subResult.video.url;
      onProgress?.(90, "Subtítulos listos!");
    }

    onProgress?.(95, "Descargando video...");
    var resp = await fetch(videoUrl);
    var blob = await resp.blob();
    onProgress?.(100, "¡Video de " + durationSec + "s completado!");
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
