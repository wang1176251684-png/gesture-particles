
const canvas=document.querySelector('#scene'),ctx=canvas.getContext('2d');let w,h,dpr,shape='nebula',color='mint',density=2400,speed=1,time=0,points=[],pointer={x:0,y:0,active:false},spread=1,targetSpread=1,handActive=false,lastHand=0,stream=null,hands=null,tracking=false;let clusterRotation=0,rotationVelocity=0,indexSample=null,clusterTilt=0,tiltVelocity=0,palmSample=null,previousFrame=0,indexFocus=null,focusTrail=[],ballX=0,ballY=0,ballVX=0,ballVY=0,grabbed=false,grabSamples=[],grabOffsetX=0,grabOffsetY=0,ballMode=false,recalling=false,recallBaseline=null,recallAt=0,squashX=1,squashY=1;const palettes={mint:[153,245,207],violet:[167,160,255],amber:[255,191,127]};function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}addEventListener('resize',resize);resize();for(let i=0;i<4000;i++)points.push({a:Math.random()*Math.PI*2,b:Math.acos(2*Math.random()-1),r:Math.pow(Math.random(),.55),seed:Math.random(),x:0,y:0});function frame(){requestAnimationFrame(frame);const now=performance.now(),step=previousFrame?Math.min((now-previousFrame)/16.667,3):1;previousFrame=now;time+=.004*speed;clusterRotation+=rotationVelocity*step;rotationVelocity*=Math.pow(.975,step);clusterTilt+=tiltVelocity*step;tiltVelocity*=Math.pow(.985,step);if(performance.now()-lastHand>700){cancelGrab();handActive=false;targetSpread=ballMode?.42:1}spread+=(targetSpread-spread)*.05;ctx.fillStyle='#080e12';ctx.fillRect(0,0,w,h);updateBall(step);squashX+=(1-squashX)*(1-Math.pow(.955,step));squashY+=(1-squashY)*(1-Math.pow(.955,step));const cx=w*.53+ballX,cy=h*.51+ballY,scale=Math.min(w*.26,h*.38),rgb=palettes[color];let glow=ctx.createRadialGradient(cx,cy,0,cx,cy,scale*1.5);glow.addColorStop(0,`rgba(${rgb.join(',')},.045)`);glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='lighter';for(let i=0;i<density;i++){let p=points[i],a=p.a+time*(.2+p.seed*.15),x,y,z;if(ballMode||shape==='sphere'){x=Math.sin(p.b)*Math.cos(a);y=Math.cos(p.b);z=Math.sin(p.b)*Math.sin(a)}else if(shape==='ring'){let r=.8+p.r*.25;x=Math.cos(a)*r;y=Math.sin(a)*r*.32+(p.seed-.5)*.12;z=Math.sin(a)*r}else if(shape==='helix'){let t=p.r*7*Math.PI;x=Math.cos(t+time)*.55;y=(p.r-.5)*2;z=Math.sin(t+time)*.55}else{let t=a+p.r*5;x=Math.cos(t)*p.r;y=Math.sin(t)*p.r*.65;z=Math.sin(p.b+a)*p.r*.65;y+=(p.seed-.5)*.18}let rot=x*Math.cos(clusterRotation)+z*Math.sin(clusterRotation);let rotatedZ=-x*Math.sin(clusterRotation)+z*Math.cos(clusterRotation);let tiltedY=y*Math.cos(clusterTilt)-rotatedZ*Math.sin(clusterTilt),tiltedZ=y*Math.sin(clusterTilt)+rotatedZ*Math.cos(clusterTilt);let depth=1+tiltedZ*.22,tx=cx+rot*scale*spread*squashX,ty=cy+tiltedY*scale*spread*squashY;if(pointer.active&&!grabbed){let px=pointer.x*w,py=pointer.y*h;tx+=(px-tx)*.38;ty+=(py-ty)*.38}const follow=ballMode?1:.16;p.x+=(tx-p.x)*follow;p.y+=(ty-p.y)*follow;let alpha=.18+p.seed*.65;ctx.fillStyle=`rgba(${rgb.join(',')},${alpha})`;ctx.beginPath();ctx.arc(p.x,p.y,(p.seed>.985?2: .45+p.seed*.65)*depth,0,7);ctx.fill();}ctx.globalCompositeOperation='source-over';drawIndexFocus()}frame();canvas.addEventListener('pointermove',e=>{pointer.x=e.clientX/w;pointer.y=e.clientY/h});canvas.addEventListener('pointerdown',e=>{pointer.active=true;pointer.x=e.clientX/w;pointer.y=e.clientY/h});addEventListener('pointerup',()=>pointer.active=false);document.querySelectorAll('[data-shape]').forEach(b=>b.onclick=()=>{shape=b.dataset.shape;document.querySelector('#shapes .active').classList.remove('active');b.classList.add('active')});document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{color=b.dataset.color;document.querySelector('#colors .active').classList.remove('active');b.classList.add('active')});document.querySelector('#density').oninput=e=>{density=+e.target.value;document.querySelector('#amount').textContent=density;document.querySelector('#count').textContent=density.toLocaleString()};document.querySelector('#speed').oninput=e=>{speed=+e.target.value;document.querySelector('#speedval').textContent=speed.toFixed(1)+'×'};document.querySelector('#fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();document.querySelector('#capture').onclick=()=>{let a=document.createElement('a');a.download='ether-particles.png';a.href=canvas.toDataURL();a.click()};const video=document.querySelector('#video'),button=document.querySelector('#camera'),status=document.querySelector('#status'),label=document.querySelector('#gestureLabel');function stop(){tracking=false;cancelGrab();indexSample=null;palmSample=null;indexFocus=null;focusTrail=[];drawHand(null);if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;handActive=false;button.textContent='开启摄像头 ↗';label.textContent='摄像头已关闭';status.textContent='鼠标移动也可探索 · 按住鼠标吸引粒子'}button.onclick=async()=>{if(stream){stop();return}button.disabled=true;status.textContent='正在加载手势模型并请求摄像头权限…';try{if(!window.Hands)throw Error('手势组件加载失败，请检查网络后刷新');if(!navigator.mediaDevices)throw Error('请通过 localhost 或 HTTPS 打开应用');hands??=new Hands({locateFile:f=>`vendor/hands/${f}`});hands.setOptions({maxNumHands:1,modelComplexity:0,minDetectionConfidence:.65,minTrackingConfidence:.6});hands.onResults(result=>{let landmarks=result.multiHandLandmarks?.[0];drawHand(landmarks);if(!landmarks){if(grabbed)updateGrab(false,0,0,performance.now());indexSample=null;palmSample=null;recallBaseline=null;label.textContent='请将手掌放入画面';return}lastHand=performance.now();indexFocus={x:1-landmarks[8].x,y:landmarks[8].y};const palmY=[0,5,9,13,17].reduce((sum,i)=>sum+landmarks[i].y,0)/5;const palmLength=Math.hypot(landmarks[9].x-landmarks[0].x,landmarks[9].y-landmarks[0].y);const palmAngle=Math.atan2(landmarks[9].z-landmarks[0].z,Math.max(.025,palmLength));if(palmSample&&lastHand-palmSample.time<250){const dt=Math.max(16,lastHand-palmSample.time);const dy=palmSample.y-palmY;const da=palmAngle-palmSample.angle;if(Math.abs(dy)>.003||Math.abs(da)>.025){const impulse=(dy*.14-da*.035)*1000/dt;tiltVelocity=tiltVelocity*.55+Math.max(-.085,Math.min(.085,impulse))*.45;}}palmSample={y:palmY,angle:palmAngle,time:lastHand};const indexX=1-landmarks[8].x;if(indexSample&&lastHand-indexSample.time<250){const dt=Math.max(16,lastHand-indexSample.time);const dx=indexX-indexSample.x;if(Math.abs(dx)>.003){const velocity=Math.max(-.065,Math.min(.065,dx*1000/dt*.12));rotationVelocity=rotationVelocity*.45+velocity*.55;}}indexSample={x:indexX,time:lastHand};let dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),palm=dist(landmarks[0],landmarks[9]),pinch=dist(landmarks[4],landmarks[8])/palm,open=[8,12,16,20].filter(i=>dist(landmarks[i],landmarks[0])>dist(landmarks[i-2],landmarks[0])*1.2).length;const singleIndex=isIndexOnly(landmarks);handActive=!singleIndex&&(grabbed?pinch<.48:pinch<.28);updateGrab(handActive,1-landmarks[8].x,landmarks[8].y,lastHand);updateRecall(open,palm,lastHand);pointer.x=1-landmarks[8].x;pointer.y=landmarks[8].y;targetSpread=ballMode?.42:open>=3?1.65:.55;label.textContent=recalling?'张掌远推 · 正在召回中心':handActive?'已抓住粒子球 · 松手甩出':ballMode?'粒子球惯性飞行 · 捏合可再次接住':open>=3?'张手 · 星尘扩散':'握拳 · 粒子聚拢';});stream=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480,facingMode:'user'},audio:false});video.srcObject=stream;await video.play();tracking=true;button.textContent='关闭摄像头 ×';status.textContent='捏合拖动，松手甩出 · 张开手掌向远处推可召回中心';async function detect(){if(!tracking)return;try{await Promise.race([hands.send({image:video}),new Promise((_,reject)=>setTimeout(()=>reject(new Error("识别模型加载超时，请刷新重试或检查网络")),30000))])}catch(e){stop();status.textContent='手势识别失败：'+e.message;return}if(tracking)setTimeout(detect,45)}detect()}catch(e){stop();status.textContent=e.name==='NotAllowedError'?'摄像头权限被拒绝，请在浏览器地址栏允许摄像头。':e.message}finally{button.disabled=false}};let frames=0,last=performance.now();function fps(now){frames++;if(now-last>1000){document.querySelector('#fps').textContent=Math.round(frames*1000/(now-last))+' FPS';frames=0;last=now}requestAnimationFrame(fps)}requestAnimationFrame(fps);addEventListener('pagehide',stop);
// Draw in display coordinates so mirrored video keeps readable labels.
const handOverlay=document.querySelector('#tracking');
const handCtx=handOverlay.getContext('2d');
const fingerPaths=[
 {name:'拇指',ids:[0,1,2,3,4],color:'#ffbd78'},
 {name:'食指',ids:[0,5,6,7,8],color:'#79f3c5'},
 {name:'中指',ids:[5,9,10,11,12],color:'#77ceff'},
 {name:'无名指',ids:[9,13,14,15,16],color:'#bcacff'},
 {name:'小指',ids:[13,17,18,19,20],color:'#ff94c5'}
];
function drawHand(landmarks){
 const box=handOverlay.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);
 if(!box.width||!box.height)return;
 handOverlay.width=Math.round(box.width*ratio);handOverlay.height=Math.round(box.height*ratio);
 handCtx.setTransform(ratio,0,0,ratio,0,0);handCtx.clearRect(0,0,box.width,box.height);
 if(!landmarks||!video.videoWidth)return;
 const scale=Math.min(box.width/video.videoWidth,box.height/video.videoHeight);
 const vw=video.videoWidth*scale,vh=video.videoHeight*scale,ox=(box.width-vw)/2,oy=(box.height-vh)/2;
 const pos=i=>({x:ox+(1-landmarks[i].x)*vw,y:oy+landmarks[i].y*vh});
 function line(ids,color){handCtx.beginPath();ids.forEach((id,j)=>{const p=pos(id);j?handCtx.lineTo(p.x,p.y):handCtx.moveTo(p.x,p.y)});handCtx.strokeStyle=color;handCtx.lineWidth=2;handCtx.lineJoin='round';handCtx.stroke()}
 line([0,5,9,13,17,0],'#d0e9e0');
 const labels=[];
 fingerPaths.forEach(f=>{line(f.ids,f.color);f.ids.slice(1).forEach((id,j)=>{const p=pos(id);handCtx.beginPath();handCtx.arc(p.x,p.y,j===3?4:2.5,0,Math.PI*2);handCtx.fillStyle=f.color;handCtx.fill();handCtx.strokeStyle='#0b1412';handCtx.lineWidth=1;handCtx.stroke()});const tip=pos(f.ids[4]);labels.push({name:f.name,color:f.color,tip,x:Math.max(4,Math.min(box.width-44,tip.x-18)),y:Math.max(39,Math.min(box.height-38,tip.y-22))})});
 // Separate adjacent tip labels when fingers overlap or curl.
 labels.sort((a,b)=>a.y-b.y);for(let i=0;i<labels.length;i++){for(let j=0;j<i;j++){if(Math.abs(labels[i].x-labels[j].x)<44&&Math.abs(labels[i].y-labels[j].y)<18)labels[i].y=labels[j].y+19}if(labels[i].y>box.height-28){labels[i].y=box.height-28;labels[i].x=Math.max(4,labels[i].x-44)}}
 handCtx.font='10px "Microsoft YaHei",sans-serif';handCtx.textBaseline='middle';labels.forEach(l=>{handCtx.beginPath();handCtx.moveTo(l.tip.x,l.tip.y);handCtx.lineTo(l.x+18,l.y);handCtx.strokeStyle=l.color;handCtx.lineWidth=.7;handCtx.stroke();handCtx.fillStyle='#07110ee0';handCtx.fillRect(l.x,l.y-8,40,16);handCtx.fillStyle=l.color;handCtx.fillText(l.name,l.x+3,l.y)});
}






function drawIndexFocus(){
 const age=performance.now()-lastHand;
 if(!indexFocus||age>700){focusTrail.length=0;return}
 const alpha=Math.max(0,1-age/700),x=indexFocus.x*w,y=indexFocus.y*h;
 // Smooth the visible cursor independently of gesture velocity samples.
 const last=focusTrail[focusTrail.length-1];
 const point=last?{x:last.x+(x-last.x)*.32,y:last.y+(y-last.y)*.32}:{x,y};
 focusTrail.push(point);if(focusTrail.length>22)focusTrail.shift();
 ctx.save();ctx.globalAlpha=alpha;ctx.globalCompositeOperation='lighter';
 for(let i=1;i<focusTrail.length;i++){
  const a=focusTrail[i-1],b=focusTrail[i];ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
  ctx.strokeStyle=`rgba(126,255,215,${i/focusTrail.length*.55})`;ctx.lineWidth=i/focusTrail.length*3;ctx.stroke();
 }
 const px=point.x,py=point.y,pulse=1+Math.sin(performance.now()*.006)*.12;
 const glow=ctx.createRadialGradient(px,py,0,px,py,48);glow.addColorStop(0,'rgba(148,255,218,.3)');glow.addColorStop(1,'rgba(148,255,218,0)');ctx.fillStyle=glow;ctx.fillRect(px-48,py-48,96,96);
 ctx.strokeStyle='#9dffda';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(px,py,(handActive?13:22)*pulse,0,Math.PI*2);ctx.stroke();
 ctx.strokeStyle='rgba(157,255,218,.32)';ctx.beginPath();ctx.arc(px,py,32*pulse,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#e0fff3';ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.fill();
 ctx.beginPath();for(const s of [-1,1]){ctx.moveTo(px+s*27,py);ctx.lineTo(px+s*35,py);ctx.moveTo(px,py+s*27);ctx.lineTo(px,py+s*35)}ctx.strokeStyle='#9dffda';ctx.stroke();
 ctx.globalCompositeOperation='source-over';ctx.font='11px "Microsoft YaHei",sans-serif';
 const text=handActive?'已抓住 · 松手甩出':'食指 · 旋转控制',tw=ctx.measureText(text).width;
 const lx=Math.max(8,Math.min(w-tw-20,px+36)),ly=Math.max(24,Math.min(h-12,py-26));
 ctx.fillStyle='rgba(8,22,18,.82)';ctx.fillRect(lx-6,ly-15,tw+12,23);ctx.fillStyle='#b5f7d9';ctx.fillText(text,lx,ly);
 ctx.restore();
}


function cancelGrab(){grabbed=false;grabSamples=[];}
function updateGrab(pinching,nx,ny,now){
 const x=nx*w,y=ny*h;
 if(pinching){
  if(!grabbed){grabbed=true;recalling=false;recallBaseline=null;ballMode=true;targetSpread=.42;grabSamples=[];grabOffsetX=0;grabOffsetY=0;ballVX=ballVY=0;}
  ballX=x+grabOffsetX-w*.53;ballY=y+grabOffsetY-h*.51;
  grabSamples.push({x,y,time:now});grabSamples=grabSamples.filter(s=>now-s.time<320);
 }else if(grabbed){
  // Use the recent held trajectory, avoiding the finger jump caused by opening a pinch.
  const samples=grabSamples.filter(s=>now-s.time<=320);
  if(samples.length>=2&&now-samples[samples.length-1].time<320){
   const meanT=samples.reduce((s,p)=>s+p.time,0)/samples.length;
   const meanX=samples.reduce((s,p)=>s+p.x,0)/samples.length;
   const meanY=samples.reduce((s,p)=>s+p.y,0)/samples.length;
   let variance=0,covX=0,covY=0;
   for(const p of samples){const dt=p.time-meanT;variance+=dt*dt;covX+=dt*(p.x-meanX);covY+=dt*(p.y-meanY)}
   ballVX=variance?covX/variance*16.667:0;ballVY=variance?covY/variance*16.667:0;
   const magnitude=Math.hypot(ballVX,ballVY);if(magnitude>45){ballVX*=45/magnitude;ballVY*=45/magnitude;}
  }else{ballVX=ballVY=0;}
  grabbed=false;grabSamples=[];
 }
}
function updateBall(step){
 if(grabbed)return;
 if(recalling){const decay=Math.pow(.87,step),ease=1-Math.pow(.09,step/60);ballVX=(ballVX-ballX*.014*step)*decay;ballVY=(ballVY-ballY*.014*step)*decay;ballX+=ballVX*step;ballY+=ballVY*step;if(Math.hypot(ballX,ballY)<2&&Math.hypot(ballVX,ballVY)<.5){ballX=ballY=ballVX=ballVY=0;recalling=false;}return;}
 ballX+=ballVX*step;ballY+=ballVY*step;
 ballVX*=Math.pow(.982,step);ballVY*=Math.pow(.982,step);
 const radius=Math.min(w*.26,h*.38)*(ballMode?.42:Math.min(spread,1));
 const minX=radius-w*.53,maxX=w-radius-w*.53,minY=radius-h*.51,maxY=h-radius-h*.51;
 if(ballX<minX){ballX=minX;ballVX=Math.abs(ballVX)*.78;edgeDeform("x",ballVX)}else if(ballX>maxX){ballX=maxX;ballVX=-Math.abs(ballVX)*.78;edgeDeform("x",ballVX)}
 if(ballY<minY){ballY=minY;ballVY=Math.abs(ballVY)*.78;edgeDeform("y",ballVY)}else if(ballY>maxY){ballY=maxY;ballVY=-Math.abs(ballVY)*.78;edgeDeform("y",ballVY)}
 if(Math.abs(ballVX)<.01)ballVX=0;if(Math.abs(ballVY)<.01)ballVY=0;
}




function updateRecall(open,palmSize,now){
 if(open<3||grabbed){recallBaseline=null;return;}
 if(!recallBaseline||now-recallAt>1800){recallBaseline=palmSize;recallAt=now;return;}
 // Relative palm scale avoids dependence on camera resolution or hand size.
 if(palmSize<recallBaseline*.82&&now-recallAt>100){
  recalling=true;ballMode=true;targetSpread=.42;ballVX*=.3;ballVY*=.3;
  recallBaseline=null;
 }else if(palmSize>recallBaseline){recallBaseline=palmSize;recallAt=now;}
}


function edgeDeform(axis,velocity){
 const impact=Math.min(.55,.22+Math.abs(velocity)*.008);
 if(axis==='x'){squashX=1-impact;squashY=1+impact*.75;}
 else{squashY=1-impact;squashX=1+impact*.75;}
 // A strong rebound stays bounded after repeated collisions.
 ballVX=Math.max(-48,Math.min(48,ballVX));ballVY=Math.max(-48,Math.min(48,ballVY));
}



function isIndexOnly(lm){
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
 const extended=tip=>distance(lm[tip],lm[0])>distance(lm[tip-2],lm[0])*1.15;
 const indexExtended=extended(8);
 const otherExtended=[12,16,20].filter(extended).length;
 // A straight index with the other fingers curled is pointing, never grabbing.
 return indexExtended&&otherExtended===0;
}





