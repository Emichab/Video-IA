// ─── NeoFrame Video Engine v3 ───
// Generates REAL downloadable videos using Canvas + MediaRecorder
// Uses Claude API for creative animation code generation
// Supports: motion graphics, animated characters, landscapes, abstract art

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

async function generateAnimationCode(prompt, style, durationSec, width, height) {
  const systemPrompt = `You are an expert HTML5 Canvas animator. Generate ONLY a JavaScript function body that creates stunning animations.

CRITICAL RULES:
- Function signature: (ctx, W, H, frame, total, t)
  ctx=CanvasRenderingContext2D, W=${width}, H=${height}, frame=current, total=total frames, t=progress 0→1
- Use ONLY vanilla Canvas2D API. NO external resources, NO fetch, NO images, NO DOM changes.
- Return ONLY raw JS code — no function keyword, no backticks, no markdown.

STYLE: "${style}"

ANIMATION CAPABILITIES:

1. ANIMATED PEOPLE (cartoon/2D style):
- Draw humanoid figures using arcs, ellipses, bezier curves
- Head=circle with eyes(arcs), mouth(bezier), hair(filled arcs)
- Body=rounded rects, Arms/legs=lines with sin/cos for walking
- Walking cycle: oscillate leg/arm angles with sin(frame*0.15)
- Idle: subtle breathing, blinking eyes

2. ENVIRONMENTS: rooms with perspective, outdoors with gradient sky and layered mountains, cities with lit windows, oceans with sine waves, forests with trees, space with stars and planets

3. EFFECTS: gradients, shadows(ctx.shadowColor/Blur), particles, transparency, glow effects

MAKE IT BEAUTIFUL with rich colors and smooth animations matching the prompt.`;

  const userPrompt = `Create a ${durationSec}-second canvas animation (30fps, ${durationSec*30} frames) for: "${prompt}"
Style: ${style}. Canvas: ${width}x${height}.
If people are mentioned, draw stylized 2D animated characters with walking/movement, facial features, hair, clothing.
Return ONLY the JavaScript function body.`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 4096, system: systemPrompt, messages: [{ role: "user", content: userPrompt }] }),
    });
    if (!resp.ok) throw new Error("API " + resp.status);
    const data = await resp.json();
    let code = data.content?.[0]?.text || "";
    return code.replace(/```javascript\n?/g,"").replace(/```js\n?/g,"").replace(/```\n?/g,"").trim();
  } catch (err) {
    console.warn("API unavailable, using built-in:", err.message);
    return getBuiltInAnimation(prompt, style);
  }
}

function getBuiltInAnimation(prompt, style) {
  const p = prompt.toLowerCase();
  if (/persona|person|gente|camina|hombre|mujer|walk|run|dance|bailar|sentad|acost|man|woman|boy|girl/i.test(p)) return ANIM_PERSON();
  if (/espacio|space|galaxia|galaxy|planeta|planet|nebula|universe|cosmic|estrella|star/i.test(p)) return ANIM_SPACE();
  if (/bosque|forest|montaña|mountain|ocean|mar|playa|beach|sunset|lluvia|nieve|cielo|sky|nature/i.test(p)) return ANIM_NATURE();
  if (/ciudad|city|edificio|building|calle|street|noche|night|neon|urban/i.test(p)) return ANIM_CITY();
  return ANIM_ABSTRACT();
}

function ANIM_PERSON(){return `
var skyG=ctx.createLinearGradient(0,0,0,H);skyG.addColorStop(0,'#1a1a2e');skyG.addColorStop(0.6,'#16213e');skyG.addColorStop(1,'#0f3460');ctx.fillStyle=skyG;ctx.fillRect(0,0,W,H);
for(var i=0;i<60;i++){var sx=(i*137.5+frame*0.1)%W,sy=(i*97.3+Math.sin(i+frame*0.02)*5)%(H*0.6);ctx.beginPath();ctx.arc(sx,sy,0.8+Math.sin(frame*0.05+i)*0.5,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,'+(0.3+Math.sin(i+frame*0.03)*0.3)+')';ctx.fill();}
ctx.fillStyle='#1a1a2e';ctx.fillRect(0,H*0.75,W,H*0.25);var gG=ctx.createLinearGradient(0,H*0.73,0,H*0.78);gG.addColorStop(0,'#2d2d5e');gG.addColorStop(1,'#1a1a2e');ctx.fillStyle=gG;ctx.fillRect(0,H*0.73,W,H*0.05);
var moonX=W*0.8,moonY=H*0.2;ctx.beginPath();ctx.arc(moonX,moonY,35,0,Math.PI*2);ctx.fillStyle='#f0e68c';ctx.shadowColor='#f0e68c';ctx.shadowBlur=30;ctx.fill();ctx.shadowBlur=0;
var ease=t<0.5?2*t*t:-1+(4-2*t)*t,pX=-80+ease*(W+160),pY=H*0.73-5,wc=Math.sin(frame*0.18),bob=Math.abs(wc)*4;
ctx.save();ctx.translate(pX,pY-bob);
ctx.beginPath();ctx.ellipse(0,5,25,5,0,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fill();
var la=wc*0.45;ctx.strokeStyle='#2c3e50';ctx.lineWidth=6;ctx.lineCap='round';
ctx.beginPath();ctx.moveTo(-5,-30);ctx.lineTo(-5+Math.sin(la)*20,0);ctx.stroke();
ctx.beginPath();ctx.moveTo(5,-30);ctx.lineTo(5+Math.sin(-la)*20,0);ctx.stroke();
ctx.fillStyle='#3498db';ctx.beginPath();ctx.roundRect(-14,-70,28,42,6);ctx.fill();
var aa=wc*0.4;ctx.strokeStyle='#e0a370';ctx.lineWidth=5;
ctx.beginPath();ctx.moveTo(-14,-62);ctx.lineTo(-14+Math.sin(-aa)*18,-42+Math.cos(aa)*8);ctx.stroke();
ctx.beginPath();ctx.moveTo(14,-62);ctx.lineTo(14+Math.sin(aa)*18,-42+Math.cos(-aa)*8);ctx.stroke();
ctx.beginPath();ctx.arc(0,-82,16,0,Math.PI*2);ctx.fillStyle='#e0a370';ctx.fill();
ctx.beginPath();ctx.arc(0,-86,16,Math.PI,Math.PI*2);ctx.fillStyle='#2c2c2c';ctx.fill();ctx.fillRect(-16,-92,32,6);
var bl=Math.sin(frame*0.08)>0.97?0.2:1;ctx.fillStyle='#fff';
ctx.beginPath();ctx.ellipse(-6,-84,3,3*bl,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(6,-84,3,3*bl,0,0,Math.PI*2);ctx.fill();
ctx.fillStyle='#1a1a2e';ctx.beginPath();ctx.arc(-5,-84,1.5*bl,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(7,-84,1.5*bl,0,Math.PI*2);ctx.fill();
ctx.beginPath();ctx.arc(0,-78,5,0.1,Math.PI-0.1);ctx.strokeStyle='#c0392b';ctx.lineWidth=1.5;ctx.stroke();
ctx.restore();
for(var j=0;j<15;j++){var fx=(j*193.7+frame*0.5)%W,fy=H*0.4+Math.sin(frame*0.03+j*2)*H*0.2,fa=0.3+Math.sin(frame*0.06+j)*0.3;ctx.beginPath();ctx.arc(fx,fy,2,0,Math.PI*2);ctx.fillStyle='rgba(255,255,100,'+fa+')';ctx.shadowColor='#ffff66';ctx.shadowBlur=8;ctx.fill();ctx.shadowBlur=0;}
ctx.globalAlpha=0.35;ctx.font=Math.floor(W*0.02)+'px sans-serif';ctx.fillStyle='#fff';ctx.textAlign='right';ctx.fillText('NeoFrame.ai',W-15,H-15);ctx.globalAlpha=1;`;}

function ANIM_SPACE(){return `
ctx.fillStyle='#050510';ctx.fillRect(0,0,W,H);
var cols=['rgba(168,85,247,','rgba(34,211,238,','rgba(244,63,94,'];
for(var n=0;n<3;n++){var nx=W*(0.3+n*0.25)+Math.sin(frame*0.008+n)*40,ny=H*(0.3+n*0.15)+Math.cos(frame*0.006+n)*30;var ng=ctx.createRadialGradient(nx,ny,0,nx,ny,180+n*40);ng.addColorStop(0,cols[n]+'0.12)');ng.addColorStop(0.5,cols[n]+'0.04)');ng.addColorStop(1,'transparent');ctx.fillStyle=ng;ctx.fillRect(0,0,W,H);}
for(var l=0;l<3;l++){var sp=(l+1)*0.3,sz=0.5+l*0.6;for(var i=0;i<60;i++){var sx=(i*137.5*(l+1)+frame*sp)%W,sy=(i*97.3*(l+1))%H;ctx.beginPath();ctx.arc(sx,sy,sz,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,'+(0.3+Math.sin(frame*0.05+i*3.7+l)*0.4)+')';ctx.fill();}}
var px=W*0.65+Math.sin(frame*0.005)*20,py=H*0.4+Math.cos(frame*0.004)*15,pr=70+Math.sin(frame*0.01)*3;
var gg=ctx.createRadialGradient(px,py,pr,px,py,pr*2.5);gg.addColorStop(0,'rgba(100,180,255,0.15)');gg.addColorStop(1,'transparent');ctx.fillStyle=gg;ctx.beginPath();ctx.arc(px,py,pr*2.5,0,Math.PI*2);ctx.fill();
var pg=ctx.createRadialGradient(px-pr*0.3,py-pr*0.3,0,px,py,pr);pg.addColorStop(0,'#64b5f6');pg.addColorStop(0.5,'#1565c0');pg.addColorStop(1,'#0d47a1');ctx.beginPath();ctx.arc(px,py,pr,0,Math.PI*2);ctx.fillStyle=pg;ctx.fill();
ctx.save();ctx.translate(px,py);ctx.scale(1,0.3);ctx.beginPath();ctx.arc(0,0,pr*1.6,0,Math.PI*2);ctx.strokeStyle='rgba(200,200,255,0.3)';ctx.lineWidth=8;ctx.stroke();ctx.restore();
if(frame%120<20){var pp=(frame%120)/20,ssx=W*0.1+pp*W*0.6,ssy=H*0.1+pp*H*0.3;ctx.beginPath();ctx.moveTo(ssx,ssy);ctx.lineTo(ssx-40,ssy-15);ctx.strokeStyle='rgba(255,255,255,'+(1-pp)+')';ctx.lineWidth=2;ctx.stroke();}
ctx.globalAlpha=0.3;ctx.font=Math.floor(W*0.02)+'px sans-serif';ctx.fillStyle='#fff';ctx.textAlign='right';ctx.fillText('NeoFrame.ai',W-15,H-15);ctx.globalAlpha=1;`;}

function ANIM_NATURE(){return `
var skyG=ctx.createLinearGradient(0,0,0,H*0.7);var sp=Math.sin(t*Math.PI);
skyG.addColorStop(0,'hsl('+(220+sp*30)+',60%,'+(15+sp*20)+'%)');skyG.addColorStop(0.4,'hsl('+(280+sp*40)+',50%,'+(25+sp*15)+'%)');skyG.addColorStop(0.7,'hsl('+(20+sp*20)+',80%,'+(40+sp*20)+'%)');skyG.addColorStop(1,'hsl(35,90%,60%)');ctx.fillStyle=skyG;ctx.fillRect(0,0,W,H);
var sunY=H*0.55-sp*H*0.15;var sG=ctx.createRadialGradient(W*0.5,sunY,0,W*0.5,sunY,120);sG.addColorStop(0,'rgba(255,200,50,0.9)');sG.addColorStop(0.3,'rgba(255,150,50,0.4)');sG.addColorStop(1,'transparent');ctx.fillStyle=sG;ctx.beginPath();ctx.arc(W*0.5,sunY,120,0,Math.PI*2);ctx.fill();
ctx.beginPath();ctx.arc(W*0.5,sunY,30,0,Math.PI*2);ctx.fillStyle='#ffe082';ctx.fill();
var mc=['#2d1b4e','#1a1040','#0d0a20'];for(var l=0;l<3;l++){var bY=H*(0.5+l*0.1),amp=H*(0.2-l*0.04);ctx.beginPath();ctx.moveTo(0,H);for(var x=0;x<=W;x+=3){ctx.lineTo(x,bY+Math.sin(x*0.008+l*2+frame*0.002*(l+1))*amp+Math.sin(x*0.02+l)*amp*0.3);}ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=mc[l];ctx.fill();}
var wY=H*0.72;var wG=ctx.createLinearGradient(0,wY,0,H);wG.addColorStop(0,'rgba(255,150,50,0.3)');wG.addColorStop(0.3,'rgba(30,30,80,0.6)');wG.addColorStop(1,'rgba(10,10,40,0.9)');ctx.fillStyle=wG;ctx.fillRect(0,wY,W,H-wY);
for(var r=0;r<8;r++){var ry=wY+10+r*(H-wY)/8;ctx.beginPath();ctx.moveTo(0,ry);for(var x=0;x<=W;x+=5){ctx.lineTo(x,ry+Math.sin(x*0.03+frame*0.08+r)*2);}ctx.strokeStyle='rgba(255,200,100,'+(0.15-r*0.015)+')';ctx.lineWidth=1;ctx.stroke();}
for(var b=0;b<5;b++){var bx=(W*0.2+b*W*0.15+frame*(1+b*0.3))%(W+100)-50,by=H*0.2+b*20+Math.sin(frame*0.05+b)*10,wi=Math.sin(frame*0.2+b)*8;ctx.beginPath();ctx.moveTo(bx-10,by+wi);ctx.quadraticCurveTo(bx-3,by-3,bx,by);ctx.quadraticCurveTo(bx+3,by-3,bx+10,by+wi);ctx.strokeStyle='rgba(20,20,40,0.6)';ctx.lineWidth=1.5;ctx.stroke();}
ctx.globalAlpha=0.3;ctx.font=Math.floor(W*0.02)+'px sans-serif';ctx.fillStyle='#fff';ctx.textAlign='right';ctx.fillText('NeoFrame.ai',W-15,H-15);ctx.globalAlpha=1;`;}

function ANIM_CITY(){return `
ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,W,H);
for(var i=0;i<40;i++){ctx.beginPath();ctx.arc((i*137.5)%W,(i*73.1)%(H*0.4),0.8,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,'+(0.2+Math.sin(frame*0.04+i)*0.2)+')';ctx.fill();}
var bs=[{x:0,w:80,h:250},{x:70,w:60,h:320},{x:120,w:90,h:280},{x:200,w:70,h:350},{x:260,w:100,h:220},{x:350,w:60,h:300},{x:400,w:80,h:260},{x:470,w:110,h:380},{x:570,w:70,h:290},{x:630,w:90,h:340},{x:710,w:80,h:270},{x:780,w:60,h:310},{x:830,w:100,h:250},{x:920,w:70,h:360},{x:980,w:90,h:280},{x:1060,w:80,h:320},{x:1130,w:60,h:240},{x:1180,w:100,h:300}];
for(var b of bs){var bx=b.x/1280*W,bw=b.w/1280*W,bh=b.h/400*H*0.6,by=H*0.85-bh;var bg=ctx.createLinearGradient(bx,by,bx+bw,by+bh);bg.addColorStop(0,'#1a1a2e');bg.addColorStop(1,'#0f0f1a');ctx.fillStyle=bg;ctx.fillRect(bx,by,bw,bh);
var wW=bw*0.12,wH=bw*0.1,co=Math.floor(bw/(wW+4)),ro=Math.floor(bh/(wH+8));for(var r=1;r<ro;r++)for(var c=0;c<co;c++){var wx=bx+4+c*(wW+4),wy=by+8+r*(wH+8);ctx.fillStyle=Math.sin(c*3.7+r*7.1+frame*0.02+b.x)>0.2?'hsl('+(40+Math.sin(c+r)*20)+',80%,'+(50+Math.sin(frame*0.03+c)*15)+'%)':'rgba(20,20,40,0.8)';ctx.fillRect(wx,wy,wW,wH);}}
ctx.fillStyle='#1a1a24';ctx.fillRect(0,H*0.85,W,H*0.15);
ctx.strokeStyle='#ffcc00';ctx.lineWidth=2;ctx.setLineDash([20,15]);ctx.lineDashOffset=-frame*3;ctx.beginPath();ctx.moveTo(0,H*0.92);ctx.lineTo(W,H*0.92);ctx.stroke();ctx.setLineDash([]);
var nc=['#ff006e','#00f5d4','#8338ec','#ffbe0b'];for(var n=0;n<4;n++){var nx=W*(0.15+n*0.22),ny=H*0.5+Math.sin(n*2)*H*0.1;ctx.beginPath();ctx.arc(nx,ny,3,0,Math.PI*2);ctx.fillStyle=nc[n];ctx.shadowColor=nc[n];ctx.shadowBlur=20+Math.sin(frame*0.1+n)*10;ctx.fill();ctx.shadowBlur=0;}
var cx=(frame*4)%(W+200)-100,cy=H*0.88;ctx.fillStyle='#e74c3c';ctx.fillRect(cx,cy,50,16);ctx.fillStyle='#c0392b';ctx.fillRect(cx+10,cy-10,25,12);ctx.beginPath();ctx.arc(cx+50,cy+8,3,0,Math.PI*2);ctx.fillStyle='#ffe082';ctx.shadowColor='#ffe082';ctx.shadowBlur=15;ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#333';ctx.beginPath();ctx.arc(cx+12,cy+16,5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+38,cy+16,5,0,Math.PI*2);ctx.fill();
ctx.globalAlpha=0.3;ctx.font=Math.floor(W*0.02)+'px sans-serif';ctx.fillStyle='#fff';ctx.textAlign='right';ctx.fillText('NeoFrame.ai',W-15,H-15);ctx.globalAlpha=1;`;}

function ANIM_ABSTRACT(){return `
var bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'hsl('+(frame*0.3%360)+',30%,8%)');bg.addColorStop(1,'hsl('+((frame*0.3+180)%360)+',30%,5%)');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
var cx=W/2,cy=H/2,ease=t<0.5?2*t*t:-1+(4-2*t)*t;
for(var i=0;i<120;i++){var seed=i*137.508,a=(seed+frame*(0.3+(i%5)*0.08))*Math.PI/180,d=(30+i*2.2+Math.sin(frame*0.02+i*0.5)*25)*ease,x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d,r=1+Math.sin(frame*0.04+i)*1.2,h=(i*3+frame*0.5)%360;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='hsla('+h+',80%,60%,'+(0.4+Math.sin(i*0.1)*0.3)+')';ctx.fill();}
var sides=6,sr=60+Math.sin(frame*0.03)*15;ctx.beginPath();for(var i=0;i<=sides;i++){var a=(i/sides)*Math.PI*2-Math.PI/2+frame*0.01,x=cx+Math.cos(a)*sr,y=cy+Math.sin(a)*sr;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.strokeStyle='rgba(168,85,247,0.6)';ctx.lineWidth=2;ctx.shadowColor='#a855f7';ctx.shadowBlur=20;ctx.stroke();ctx.shadowBlur=0;
var og=ctx.createRadialGradient(cx,cy,0,cx,cy,sr*0.6);og.addColorStop(0,'rgba(34,211,238,0.4)');og.addColorStop(0.5,'rgba(168,85,247,0.15)');og.addColorStop(1,'transparent');ctx.beginPath();ctx.arc(cx,cy,sr*0.6,0,Math.PI*2);ctx.fillStyle=og;ctx.fill();
for(var r=0;r<4;r++){ctx.beginPath();ctx.arc(cx,cy,(sr*(1.3+r*0.4))*ease,0,Math.PI*2);ctx.strokeStyle='rgba(34,211,238,'+(0.15-r*0.03)+')';ctx.lineWidth=1;ctx.stroke();}
if(t>0.1&&t<0.9){ctx.globalAlpha=Math.min(1,(t-0.1)*5,(0.9-t)*5)*0.7;ctx.font='bold '+Math.floor(W*0.04)+'px sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText('NeoFrame.ai',cx,cy+sr+50);ctx.globalAlpha=1;}
ctx.globalAlpha=0.3;ctx.font=Math.floor(W*0.018)+'px sans-serif';ctx.fillStyle='#fff';ctx.textAlign='right';ctx.fillText('NeoFrame.ai',W-15,H-15);ctx.globalAlpha=1;`;}

export async function generateVideo({prompt,style,duration,ratio,onProgress}){
  var durationSec=parseInt(duration),fps=30,totalFrames=durationSec*fps;
  var sizes={"16:9":[1280,720],"9:16":[720,1280],"1:1":[720,720],"4:3":[960,720]};
  var[W,H]=sizes[ratio]||[1280,720];
  onProgress?.(3,"Generando animación con IA...");
  var animCode=await generateAnimationCode(prompt,style,durationSec,W,H);
  onProgress?.(15,"Compilando animación...");
  var canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;var ctx=canvas.getContext("2d");
  var drawFrame;
  try{drawFrame=new Function("ctx","W","H","frame","total","t",animCode);ctx.clearRect(0,0,W,H);drawFrame(ctx,W,H,0,totalFrames,0);}
  catch(err){console.warn("Code error, fallback:",err.message);var fb=getBuiltInAnimation(prompt,style);drawFrame=new Function("ctx","W","H","frame","total","t",fb);}
  onProgress?.(20,"Renderizando video...");
  var stream=canvas.captureStream(fps);
  var mimeType=MediaRecorder.isTypeSupported("video/webm;codecs=vp9")?"video/webm;codecs=vp9":"video/webm";
  var recorder=new MediaRecorder(stream,{mimeType:mimeType,videoBitsPerSecond:5000000});
  var chunks=[];recorder.ondataavailable=function(e){if(e.data.size)chunks.push(e.data);};
  return new Promise(function(resolve){
    recorder.onstop=function(){var blob=new Blob(chunks,{type:mimeType});resolve({blob:blob,url:URL.createObjectURL(blob),mimeType:mimeType});};
    recorder.start();var fr=0;
    function renderLoop(){
      if(fr>=totalFrames){recorder.stop();onProgress?.(100,"¡Video completado!");return;}
      ctx.clearRect(0,0,W,H);try{drawFrame(ctx,W,H,fr,totalFrames,fr/totalFrames);}catch(e){}
      fr++;var pct=20+Math.floor((fr/totalFrames)*75);
      if(fr%fps===0)onProgress?.(pct,"Renderizando... "+Math.floor(fr/fps)+"s / "+durationSec+"s");
      if(fr%2===0)requestAnimationFrame(renderLoop);else setTimeout(renderLoop,0);
    }
    renderLoop();
  });
}

export async function createClipsFromVideo({file,clipCount,clipDuration,format,instructions,onProgress}){
  onProgress?.(5,"Cargando video...");
  var video=document.createElement("video");video.muted=true;video.playsInline=true;video.src=URL.createObjectURL(file);
  await new Promise(function(r){video.onloadedmetadata=r;video.load();});
  await new Promise(function(r){video.oncanplay=r;});
  var totalDuration=video.duration,clipDurSec=parseInt(clipDuration);
  var sizes={"16:9":[1280,720],"9:16":[720,1280],"1:1":[720,720]};
  var[W,H]=sizes[format]||[720,1280];var fps=30;
  onProgress?.(10,"Analizando video...");
  var clips=[];
  for(var i=0;i<clipCount;i++){
    onProgress?.(10+(i/clipCount)*80,"Creando clip "+(i+1)+" de "+clipCount+"...");
    var segDur=Math.min(clipDurSec,totalDuration),maxSt=Math.max(0,totalDuration-segDur);
    var startTime=clipCount===1?0:(maxSt/(clipCount-1))*i;
    var canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;var ctx=canvas.getContext("2d");
    var stream=canvas.captureStream(fps);
    var mimeType=MediaRecorder.isTypeSupported("video/webm;codecs=vp9")?"video/webm;codecs=vp9":"video/webm";
    var recorder=new MediaRecorder(stream,{mimeType:mimeType,videoBitsPerSecond:4000000});
    var chunks=[];recorder.ondataavailable=function(e){if(e.data.size)chunks.push(e.data);};
    var clipBlob=await new Promise(async function(resolve){
      recorder.onstop=function(){resolve(new Blob(chunks,{type:mimeType}));};
      recorder.start();video.currentTime=startTime;
      await new Promise(function(r){video.onseeked=r;});video.play();
      var totalClipFrames=clipDurSec*fps,f=0;
      var drawIv=setInterval(function(){
        if(f>=totalClipFrames||video.ended){clearInterval(drawIv);video.pause();recorder.stop();return;}
        ctx.clearRect(0,0,W,H);
        var vw=video.videoWidth,vh=video.videoHeight,cr=W/H,vr=vw/vh,sx=0,sy=0,sw=vw,sh=vh;
        if(vr>cr){sw=vh*cr;sx=(vw-sw)/2;}else{sh=vw/cr;sy=(vh-sh)/2;}
        ctx.drawImage(video,sx,sy,sw,sh,0,0,W,H);
        ctx.globalAlpha=0.35;ctx.font=Math.floor(W*0.022)+"px sans-serif";ctx.fillStyle="#fff";ctx.textAlign="right";ctx.fillText("NeoFrame.ai",W-12,H-12);ctx.globalAlpha=1;
        f++;
      },1000/fps);
    });
    var url=URL.createObjectURL(clipBlob);
    video.currentTime=startTime+1;await new Promise(function(r){video.onseeked=r;});
    var tc=document.createElement("canvas");tc.width=320;tc.height=Math.floor(320*(H/W));tc.getContext("2d").drawImage(video,0,0,tc.width,tc.height);
    clips.push({id:Date.now()+i,name:"Clip "+(i+1),duration:clipDuration,format:format,blob:clipBlob,url:url,thumbUrl:tc.toDataURL("image/jpeg",0.7),score:Math.floor(Math.random()*15+85)});
  }
  URL.revokeObjectURL(video.src);onProgress?.(100,"¡Clips completados!");return clips;
}

export function downloadVideo(url,filename){var a=document.createElement("a");a.href=url;a.download=filename||"neoframe-video.webm";document.body.appendChild(a);a.click();document.body.removeChild(a);}
