// ─── NeoFrame Video Engine v8 ───
// ONLY uses LTX Video 2.0 Fast ($0.04/s with audio)
// All requests go through /api/fal proxy

async function falProxy(action, endpoint, body, requestId) {
  var resp = await fetch("/api/fal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: action, endpoint: endpoint, body: body, requestId: requestId }),
  });
  if (!resp.ok) {
    var errText = await resp.text();
    throw new Error("Error " + resp.status + ": " + errText);
  }
  return await resp.json();
}

async function falPollResult(endpoint, requestId, onProgress, startPct, endPct, msg) {
  for (var i = 0; i < 120; i++) {
    await new Promise(function(r) { setTimeout(r, 4000); });
    try {
      var status = await falProxy("status", endpoint, null, requestId);
      var p = startPct + (endPct - startPct) * Math.min(1, i / 30);
      onProgress?.(Math.floor(p), msg);
      if (status.status === "COMPLETED") {
        return await falProxy("result", endpoint, null, requestId);
      }
      if (status.status === "FAILED") {
        throw new Error("FAILED: " + (status.error || "error desconocido"));
      }
    } catch (e) {
      if (e.message.includes("FAILED")) throw e;
      if (i === 119) throw e;
    }
  }
  throw new Error("Timeout — el video tardó demasiado");
}

function extractVideoUrl(data) {
  if (data.video && data.video.url) return data.video.url;
  if (data.output && data.output.video) return data.output.video;
  var str = JSON.stringify(data);
  var match = str.match(/https:\/\/[^"]+\.(mp4|webm)/);
  if (match) return match[0];
  throw new Error("No se encontró URL de video");
}

export async function generateVideo({ prompt, style, duration, ratio, withAudio, withSubtitles, subtitleStyle, onProgress }) {
  var durationSec = parseInt(duration);
  var endpoint = "fal-ai/ltx-2/text-to-video/fast";

  try {
    onProgress?.(5, "Conectando con LTX Video AI...");

    var body = {
      prompt: prompt,
      seconds: Math.min(durationSec, 10),
      resolution: "720p",
      aspect_ratio: ratio === "9:16" ? "9:16" : ratio === "1:1" ? "1:1" : "16:9",
      audio_enabled: withAudio ? true : false,
    };

    onProgress?.(8, withAudio ? "Generando video con audio..." : "Generando video...");
    console.log("LTX request:", body);

    var data = await falProxy("generate", endpoint, body);
    console.log("LTX response:", data);

    var videoUrl;
    if (data.request_id) {
      onProgress?.(12, "Video en cola de procesamiento...");
      var result = await falPollResult(endpoint, data.request_id, onProgress, 12, 75, "Generando video...");
      console.log("LTX result:", result);
      videoUrl = extractVideoUrl(result);
    } else {
      videoUrl = extractVideoUrl(data);
    }

    onProgress?.(78, "Video generado!");

    // Subtitles
    if (withSubtitles && withAudio) {
      onProgress?.(80, "Agregando subtítulos...");
      var subStyle = subtitleStyle || {};
      var subEndpoint = "fal-ai/auto-caption";
      var subBody = {
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
      };
      var subData = await falProxy("generate", subEndpoint, subBody);
      if (subData.request_id) {
        var subResult = await falPollResult(subEndpoint, subData.request_id, onProgress, 82, 93, "Procesando subtítulos...");
        if (subResult.video && subResult.video.url) videoUrl = subResult.video.url;
      } else if (subData.video && subData.video.url) {
        videoUrl = subData.video.url;
      }
      onProgress?.(94, "Subtítulos agregados!");
    }

    onProgress?.(96, "Descargando video...");
    var resp = await fetch(videoUrl);
    var blob = await resp.blob();
    onProgress?.(100, "¡Video completado!");
    return { blob: blob, url: URL.createObjectURL(blob), mimeType: blob.type || "video/mp4" };

  } catch (err) {
    console.error("LTX error:", err.message);
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
        cx.drawImage(video,sx,sy,sw,sh,0,0,W,H);
        cx.globalAlpha=0.35;cx.font=Math.floor(W*0.022)+"px sans-serif";cx.fillStyle="#fff";cx.textAlign="right";cx.fillText("NeoFrame.ai",W-12,H-12);cx.globalAlpha=1;f++;
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
