/* Animated architecture schematic, not a trained inference or PDE solve.
 * Input: the homepage's first-Born-inspired point sheet. pi(z): an invented
 * projection of a GLOBAL p-dimensional code, not learned latent geometry.
 * Output: a synthetic phantom whose material inclusions move and deform
 * coherently over a fixed pale support.
 * Filaments illustrate diagram flow, not activations or optimization steps.
 */
(() => {
  'use strict';
  const stage=document.querySelector('.animation-stage'),canvas=document.getElementById('hero-canvas');
  const playButton=document.getElementById('motion-toggle'),scrubber=document.getElementById('path-scrubber');
  if(!stage||!canvas||!playButton||!scrubber)return;
  const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
  const TAU=Math.PI*2,paper='#f9faf7',ink='#304840',muted='#708179';
  const green=[99,149,117],blue=[75,120,159],purple=[147,128,176];
  const waveColors=[[99,149,117],[115,161,139],[114,157,173],[114,142,182],[143,140,191],[167,143,192]];
  const scatterers=[{x:-1.45,z:-.5,a:.95,w:.67},{x:.85,z:.8,a:1.2,w:.83},{x:2,z:-1.5,a:.65,w:.52}];
  const inclusions=scatterers.map((s,i)=>({...s,rx:s.w*[1.9,1.9,1.6][i],rz:s.w*[1.45,1.42,1.65][i],angle:[-.48,.38,-.24][i],lobes:[3,3,2][i],irregularity:[.11,.18,.085][i]}));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t;
  const smooth=x=>x*x*(3-2*x),rgba=(c,a)=>`rgba(${c.join(',')},${a})`;
  let mobile=false,width=1120,height=390,scale=1,phase=.1875;
  let playing=!reduced.matches,visible=false,ready=false,previous=null,request=0;
  let wavePoints=[],supportPoints=[],blobPoints=[],routes=[],background,seed=1926;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
  const hash=(x,y)=>{let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
  function noise(x,y){
    const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy);
    return mix(mix(hash(ix,iy),hash(ix+1,iy),u),mix(hash(ix,iy+1),hash(ix+1,iy+1),u),v);
  }
  // A quiet, stationary background medium. The darker inclusions below use
  // material coordinates, so their particles are advected by the blob rather
  // than flickering independently in place.
  function supportAt(x,z){
    const support=Math.exp(-((x/3.7)**6+(z/2.9)**6));
    return .025+.07*support*(.30+.70*noise(x*.8+7,z*.8+9));
  }
  function buildPoints(){
    seed=1926;wavePoints=[];supportPoints=[];blobPoints=inclusions.map(()=>[]);
    const cols=mobile?109:126,rows=mobile?82:94;
    // Homepage construction: taper, deterministic jitter, radial scatterers,
    // and sparse particles above and below its oscillating sheet.
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const x=((i+(random()-.5)*.38)/(cols-1)-.5)*10.4,z=((j+(random()-.5)*.38)/(rows-1)-.5)*8;
      const edge=Math.pow(Math.abs(x/5.25),8)+Math.pow(Math.abs(z/4.05),8);
      if(edge>1||random()<Math.max(0,edge-.65)*.7)continue;
      let waveSin=.19*Math.sin(2.6*x),waveCos=.19*Math.cos(2.6*x);
      for(const s of scatterers){
        const r=Math.hypot(x-s.x,z-s.z),a=s.a*.56/Math.sqrt(1+r*1.4),angle=3.9*r+2.6*s.x;
        waveSin+=a*Math.sin(angle);waveCos+=a*Math.cos(angle);
      }
      const color=Math.max(0,Math.min(5,Math.floor((x/10.4+.5)*4.8+(z/8+.5)*1.1)));
      const opacity=Math.max(.13,.7*Math.min(1,(1.13-edge)*2.3)*(.67+random()*.33));
      const point={x,z,waveSin,waveCos,color,alpha:Math.min(3,Math.floor(opacity*5.5)),size:.64+random()*.28};
      wavePoints.push(point);if(random()<.13)wavePoints.push({...point,ghost:(random()-.5)*.9,alpha:0,size:.5});
    }
    const count=mobile?106:126;
    for(let j=0;j<Math.round(count*.78);j++)for(let i=0;i<count;i++){
      const x=((i+.5+(hash(i,j)-.5)*.66)/count-.5)*9,z=((j+.5+(hash(j,i+83)-.5)*.66)/Math.round(count*.78)-.5)*7;
      supportPoints.push({x,z,q:supportAt(x,z)});
    }
    const particlesPerBlob=mobile?720:980;
    for(const[i]of inclusions.entries())for(let k=0;k<particlesPerBlob;k++){
      const a=random()*TAU,r=Math.sqrt(random()),u=Math.cos(a)*r,v=Math.sin(a)*r;
      blobPoints[i].push({
        a,r,
        texture:noise(u*1.8+i*4.1+12,v*1.8+i*3.7+7),
        fine:noise(u*5.2+i*7.3+31,v*5.2+i*6.4+17),
        size:.56+random()*.30
      });
    }
  }
  function dot(x,y,r){ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,TAU);}
  function path(points,color,lineWidth=.7,close=false){
    ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    if(close)ctx.closePath();ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.stroke();
  }
  function label(value,x,y,size=11,color=muted,serif=false,align='center'){
    ctx.fillStyle=Array.isArray(color)?rgba(color,1):color;ctx.textAlign=align;
    ctx.font=(serif?'italic ':'')+size+'px '+(serif?'Georgia,serif':'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif');
    const pieces=value==='Nφ'?[['N',1,0],['φ',.57,.2]]:value==='Dθ'?[['D',1,0],['θ',.57,.2]]:value==='q̂ = Dθ(z)'?[['q̂ = D',1,0],['θ',.57,.2],['(z)',1,0]]:null;
    if(!serif||!pieces){ctx.fillText(value,x,y);return;}
    const widths=pieces.map(([s,f])=>{ctx.font=`italic ${size*f}px Georgia,serif`;return ctx.measureText(s).width;});
    let left=x-(align==='center'?widths.reduce((a,b)=>a+b,0)/2:0);ctx.textAlign='left';
    pieces.forEach(([s,f,dy],i)=>{ctx.font=`italic ${size*f}px Georgia,serif`;ctx.fillText(s,left,y+dy*size);left+=widths[i];});
  }
  function wavefield(cx,cy,size){
    const t=phase*TAU*2+1.2,sinT=Math.sin(t),cosT=Math.cos(t),cosA=Math.cos(-.32),sinA=Math.sin(-.32),buckets=Array.from({length:24},()=>[]);
    let signature=0;
    for(const p of wavePoints){
      const rx=p.x*cosA-p.z*sinA,depth=p.x*sinA+p.z*cosA,elevation=(p.waveSin*cosT-p.waveCos*sinT)*1.05+(p.ghost||0),perspective=1+depth*.022;
      buckets[p.color*4+p.alpha].push([cx+rx*size*perspective,cy+(depth*.53-elevation)*size*perspective,p.size*.77*perspective]);signature+=elevation;
    }
    buckets.forEach((points,i)=>{ctx.beginPath();points.forEach(([x,y,r])=>dot(x,y,r));ctx.fillStyle=rgba(waveColors[Math.floor(i/4)],[.18,.32,.49,.70][i%4]);ctx.fill();});
    canvas.dataset.inputKind='homepage-oscillating-point-sheet';canvas.dataset.inputSource='homepage-analytic-wave-construction';canvas.dataset.inputSignature=signature.toFixed(6);
  }
  function latentPoint(u,v,cx,cy){
    const t=phase*TAU,h=.19*Math.sin(u*3+t)+.11*Math.cos(v*4-t)+.11*u*v;
    return[cx+u*75+v*27,cy+(u*15-v*34-h*39)*(mobile?.88:1)];
  }
  function latent(cx,cy){
    const t=phase*TAU;
    for(let j=0;j<=14;j++){
      const v=j/7-1,curve=[];for(let i=0;i<=48;i++)curve.push(latentPoint(i/24-1,v,cx,cy));
      path(curve,rgba(purple,j%7===0?.27:.12),j%7===0?.75:.55);
    }
    for(let i=0;i<=16;i++){
      const u=i/8-1,curve=[];for(let j=0;j<=32;j++)curve.push(latentPoint(u,j/16-1,cx,cy));path(curve,rgba(purple,i%8===0?.24:.09),.55);
    }
    // Moving constellation points suggest continuity, not component values.
    for(let k=0;k<34;k++){
      const u=Math.sin(k*2.399+t)*.90,v=Math.cos(k*1.731-t)*.84,[x,y]=latentPoint(u,v,cx,cy);
      ctx.beginPath();dot(x,y,.7+(1+Math.sin(t+k))*.3);ctx.fillStyle=rgba(purple,.26);ctx.fill();
    }
    const orbit=[];for(let k=0;k<=128;k++){const a=k/128*TAU;orbit.push(latentPoint(.82*Math.cos(a),.65*Math.sin(a*2+.4),cx,cy));}path(orbit,rgba(purple,.30),.85);
    for(let k=32;k>=0;k--){
      const a=t-k*.021,[x,y]=latentPoint(.82*Math.cos(a),.65*Math.sin(a*2+.4),cx,cy);
      ctx.beginPath();dot(x,y,k===0?3:1.5);ctx.fillStyle=rgba(purple,(1-k/34)*.85);ctx.fill();
    }
    const[x,y]=latentPoint(.82*Math.cos(t),.65*Math.sin(t*2+.4),cx,cy);
    ctx.beginPath();dot(x,y,6);ctx.strokeStyle=rgba(purple,.24);ctx.lineWidth=.7;ctx.stroke();label('π(z)',cx+82,cy-56,17,purple,true);
    canvas.dataset.latentKind='animated-schematic-coordinate-ribbon';canvas.dataset.latentDimension='p';canvas.dataset.latentValues='not-shown';
    canvas.dataset.latentProjectionSource='invented-schematic';canvas.dataset.latentProjectionPoint=[x,y].map(v=>v.toFixed(4)).join(',');
  }
  function outputProjection(x,z,q,cx,cy,size){return[cx+(x*.98-z*.15)*size,cy+(x*.12+z*.72)*size-q*9];}
  function inclusionState(s,i,t){
    const offset=[.35,2.55,4.65][i];
    return{
      x:s.x+[.16,.12,.14][i]*Math.sin(t+offset),
      z:s.z+[.10,.14,.11][i]*Math.cos(t+offset*.83),
      angle:s.angle+[.12,.10,.14][i]*Math.sin(t+offset*1.31),
      rx:s.rx*(1+[.11,.13,.10][i]*Math.sin(t+offset+1.1)),
      rz:s.rz*(1+[.12,.10,.14][i]*Math.cos(t+offset-.7)),
      darkness:.82+.16*Math.sin(t+offset+.65)
    };
  }
  function materialPoint(p,s,i,state,t){
    const twist=.065*Math.sin(t+i*1.17)*p.r*p.r,a=p.a+twist;
    const boundary=1+s.irregularity*(1+.22*Math.sin(t+i))*Math.cos(s.lobes*a+.4+.18*Math.sin(t+i*.7))
      +.065*Math.sin(5*a+i-.18*Math.cos(t+i))+.045*p.r*Math.sin(2*a-t+i*.8);
    const radial=p.r*boundary;
    let u=Math.cos(a)*state.rx*radial,v=Math.sin(a)*state.rz*radial;
    u+=state.rx*.055*Math.sin(t+i*1.4)*(v/state.rz)*(1-.35*p.r);
    v+=state.rz*.035*Math.cos(t+i*.9)*(u/state.rx)*(1-.25*p.r);
    const cos=Math.cos(state.angle),sin=Math.sin(state.angle);
    const x=state.x+u*cos-v*sin,z=state.z+u*sin+v*cos;
    const mu=Math.cos(p.a)*p.r,mv=Math.sin(p.a)*p.r;
    const core=Math.exp(-((mu+.24)**2+(mv-.08)**2)*3.5);
    const pocket=i===1?.24*Math.exp(-((mu-.32)**2+(mv+.18)**2)*10):0;
    const q=clamp((.42+.28*p.texture+.10*p.fine+.18*core-pocket)*state.darkness);
    return{x,z,q};
  }
  function decodedField(cx,cy,size){
    const t=phase*TAU,project=(x,z,q=0)=>outputProjection(x,z,q,cx,cy,size);
    path([project(-4.5,-3.5),project(4.5,-3.5),project(4.5,3.5),project(-4.5,3.5)],rgba(blue,.17),.7,true);
    // The support is deliberately static: same particles, positions, heights,
    // and colors at every phase.
    const supportBuckets=Array.from({length:8},()=>[]);let supportSignature=0;
    for(const p of supportPoints){
      const[x,y]=project(p.x,p.z,p.q),index=Math.round(clamp((p.q-.025)/.07)*7);
      supportBuckets[index].push([x,y]);supportSignature+=p.x*.001+p.z*.002+p.q;
    }
    supportBuckets.forEach((points,i)=>{
      const q=i/7;ctx.beginPath();points.forEach(([x,y])=>dot(x,y,.45+.12*q));
      ctx.fillStyle=rgba([mix(184,142,q),mix(213,188,q),mix(226,211,q)].map(Math.round),.30+.16*q);ctx.fill();
    });
    const states=inclusions.map((s,i)=>inclusionState(s,i,t));
    const blobBuckets=Array.from({length:36},()=>[]);let signature=0;
    for(const[i,points]of blobPoints.entries())for(const p of points){
      const material=materialPoint(p,inclusions[i],i,states[i],t),[x,y]=project(material.x,material.z,material.q);
      blobBuckets[Math.round(material.q*35)].push([x,y,p.size]);
      signature+=material.x*.17+material.z*.23+material.q;
    }
    blobBuckets.forEach((points,i)=>{
      const q=i/35;ctx.beginPath();points.forEach(([x,y,r])=>dot(x,y,r*(.88+.18*q)));
      ctx.fillStyle=rgba([mix(133,31,q),mix(171,76,q),mix(200,126,q)].map(Math.round),.48+.45*Math.sqrt(q));ctx.fill();
    });
    for(const[i,s]of inclusions.entries())for(const r of [.66,.98]){
      const curve=[];for(let k=0;k<=96;k++){
        const p={a:k/96*TAU,r,texture:.58,fine:.48},material=materialPoint(p,s,i,states[i],t);
        curve.push(project(material.x,material.z,material.q));
      }path(curve,rgba(blue,r>.9?.16:.09),r>.9?.72:.52,true);
    }
    const o=project(-4.5,3.5),a=project(4.7,3.5),b=project(-4.5,-3.7);path([a,o,b],rgba(blue,.28),.65);
    label('x₁',a[0]+7,a[1]+5,12,blue,true);label('x₂',b[0]-8,b[1]-4,12,blue,true);
    canvas.dataset.outputKind='shallow-synthetic-contrast-field';canvas.dataset.outputSupport='fixed';canvas.dataset.outputProjection='0.98,0.12,-0.15,0.72';
    canvas.dataset.outputSource='homepage-inspired-synthetic-phantom';canvas.dataset.outputMotion='coherent-material-advection';canvas.dataset.backgroundMotion='fixed';
    canvas.dataset.blobCount=String(inclusions.length);canvas.dataset.materialPointCount=String(blobPoints.reduce((n,p)=>n+p.length,0));
    canvas.dataset.blobCenters=states.map(s=>`${s.x.toFixed(4)},${s.z.toFixed(4)}`).join(';');canvas.dataset.blobContrasts=states.map(s=>s.darkness.toFixed(4)).join(',');
    canvas.dataset.supportSignature=supportSignature.toFixed(6);canvas.dataset.surfacePoints=String(supportPoints.length+blobPoints.reduce((n,p)=>n+p.length,0));canvas.dataset.surfaceSignature=signature.toFixed(6);
  }
  function bezier(points,t){const s=1-t;return[0,1].map(k=>s*s*s*points[0][k]+3*s*s*t*points[1][k]+3*s*t*t*points[2][k]+t*t*t*points[3][k]);}
  function filament(start,end,color,strength=.16){
    const p1=mobile?[start[0],mix(start[1],end[1],.45)]:[mix(start[0],end[0],.45),start[1]],p2=mobile?[end[0],mix(start[1],end[1],.55)]:[mix(start[0],end[0],.55),end[1]],points=[start,p1,p2,end];
    ctx.beginPath();ctx.moveTo(...start);ctx.bezierCurveTo(...p1,...p2,...end);ctx.strokeStyle=rgba(color,strength);ctx.lineWidth=.65;ctx.stroke();routes.push({points,color});
  }
  function inferenceFlow(){
    for(let i=-4;i<=4;i++){
      const k=i/4;filament(mobile?[190+k*71,224]:[323,201+k*42],mobile?[190+k*12,302]:[430,201+k*9],green);
    }
    for(let i=-5;i<=5;i++){
      const k=i/5,start=mobile?[190+k*12,482]:[649,201+k*11],end=mobile?outputProjection(k*3.8,-2.75,0,190,631,27):outputProjection(-3.75,k*2.85,0,932,205,29);
      filament(start,end,purple,.13);
    }
    for(const[ri,route]of routes.entries())for(let stream=0;stream<2;stream++){
      const head=(phase*4+ri*.073+stream*.5)%1;
      for(let tail=0;tail<10;tail++){
        const p=head-tail*.012;if(p<0||p>1)continue;const[x,y]=bezier(route.points,p),fade=Math.min(1,p*9,(1-p)*9)*(1-tail/10);
        ctx.beginPath();dot(x,y,tail===0?1.6:.9);ctx.fillStyle=rgba(route.color,fade*.66);ctx.fill();
      }
    }
    canvas.dataset.decoderKind='animated-unfolding-filaments';canvas.dataset.flowSignature=Math.sin(phase*TAU*4).toFixed(6);
  }
  function paintBase(){
    ctx.fillStyle=paper;ctx.fillRect(0,0,width,height);
    if(!mobile){
      label('01  /  WAVEFIELD',175,25,9,green);label('02  /  LATENT COORDINATES',536,25,9,purple);label('03  /  RECONSTRUCTION',930,25,9,blue);
      label('Scattered wavefield',175,328,16,ink);label('Oscillating field · illustrative',175,352,10);
      label('Nφ',377,147,24,green,true);label('inverse map',377,265,10);
      label('z ∈ ℝᵖ',536,328,24,purple,true);label('Animated schematic projection π(z)',536,352,10);
      label('Dθ',730,139,25,purple,true);label('latent decoder',730,275,10);
      label('q̂ = Dθ(z)',930,328,24,blue,true);label('Reconstructed contrast · illustrative',930,352,10);
    }else{
      label('01  /  WAVEFIELD',190,20,10,green);label('Scattered wavefield',190,42,13,ink);
      label('Nφ',276,267,23,green,true);label('inverse map',315,268,9);
      label('02  /  LATENT COORDINATES',190,311,9,purple);label('z ∈ ℝᵖ',190,471,22,purple,true);
      label('Dθ',275,518,24,purple,true);label('latent decoder',315,538,9);
      label('q̂ = Dθ(z)',190,730,23,blue,true);label('Illustrative contrast · fixed physical support',190,752,10);
    }
    background=document.createElement('canvas');background.width=canvas.width;background.height=canvas.height;background.getContext('2d').drawImage(canvas,0,0);
  }
  function draw(){
    if(!ready)return;ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(background,0,0);ctx.setTransform(scale,0,0,scale,0,0);routes=[];
    inferenceFlow();if(!mobile){wavefield(168,199,27);latent(536,200);decodedField(932,205,29);}else{wavefield(183,135,26);latent(190,393);decodedField(190,631,27);}
    scrubber.value=String(Math.round(phase*1000));canvas.dataset.phase=phase.toFixed(5);canvas.dataset.layout=mobile?'vertical':'horizontal';canvas.dataset.renderer='continuous-wave-latent-decoder-v4';
  }
  function resize(){
    const nextMobile=matchMedia('(max-width:820px)').matches;if(nextMobile!==mobile||!wavePoints.length){mobile=nextMobile;buildPoints();}
    width=mobile?380:1120;height=mobile?772:390;const displayWidth=stage.getBoundingClientRect().width;if(displayWidth<=0)return;
    scale=displayWidth/width*Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);ctx.setTransform(scale,0,0,scale,0,0);paintBase();draw();
  }
  function updateButton(){
    playButton.setAttribute('aria-label',playing?'Pause animation':'Play animation');playButton.setAttribute('aria-pressed',String(!playing));
    playButton.querySelector('.motion-label').textContent=playing?'Pause':'Play';playButton.querySelector('.motion-icon').textContent=playing?'Ⅱ':'▷';
  }
  function stop(){cancelAnimationFrame(request);request=0;previous=null;}
  function tick(now){
    request=0;if(!ready||!playing||!visible||document.hidden){previous=null;return;}const dt=previous===null?0:Math.min((now-previous)/1000,.05);previous=now;phase=(phase+dt/24)%1;draw();request=requestAnimationFrame(tick);
  }
  function schedule(){if(ready&&playing&&visible&&!document.hidden&&!request)request=requestAnimationFrame(tick);}
  playButton.addEventListener('click',()=>{playing=!playing;stop();updateButton();schedule();});
  scrubber.addEventListener('input',()=>{playing=false;stop();phase=(Number(scrubber.value)/1000)%1;updateButton();draw();});
  reduced.addEventListener('change',e=>{playing=!e.matches;stop();updateButton();schedule();});
  document.addEventListener('visibilitychange',()=>{stop();schedule();});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;stop();schedule();}).observe(stage);else visible=true;
  if('ResizeObserver'in window)new ResizeObserver(resize).observe(stage);else window.addEventListener('resize',resize);
  // No raster asset is needed. The poster is retained when JS/canvas fails.
  ready=true;resize();stage.classList.add('is-ready');document.querySelector('.teaser-controls').hidden=false;updateButton();schedule();
})();
