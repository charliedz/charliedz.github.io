/* An artistic first-Born-inspired field, not a numerical PDE solver or a
   trained reconstruction. Each scatterer contributes an outgoing radial wave.
   The second view flattens into a spatial contrast map. Colors encode a
   normalized, heterogeneous illustrative contrast, not surface height. */
(() => {
  'use strict';
  const canvas = document.querySelector('#wavefield');
  const stage = document.querySelector('#field-stage');
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;
  const emitterCanvas = document.querySelector('#field-emitters');
  const emitterContext = emitterCanvas.getContext('2d', {alpha:true});

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controls = document.querySelector('.field-controls');
  const pauseButton = document.querySelector('#motion-toggle');
  const modeButtons = [...document.querySelectorAll('[data-mode]')];
  const label = document.querySelector('#field-label');
  const hint = document.querySelector('#field-hint');
  const equation = stage.querySelector('.field-equation');
  const contrastKey = document.querySelector('#contrast-key');
  const colors = [[99, 149, 117], [115, 161, 139], [114, 157, 173], [114, 142, 182], [143, 140, 191], [167, 143, 192]];
  const scatterers = [{x: -1.45, z: -.5, a: .95, w: .67}, {x: .85, z: .8, a: 1.2, w: .83}, {x: 2.0, z: -1.5, a: .65, w: .52}];
  // Correlated structure and finite-width interfaces suggest an inhomogeneous
  // medium. This is a synthetic phantom, not measured or reconstructed data.
  const inclusions = scatterers.map((s, i) => ({...s,
    rx:s.w * [1.9,1.9,1.6][i], rz:s.w * [1.45,1.42,1.65][i],
    angle:[-.48,.38,-.24][i], lobes:[3,3,2][i], irregularity:[.11,.18,.085][i]
  }));
  const contrastStops = [[0,214,229,233],[.22,165,204,221],[.48,102,160,193],[.73,53,109,161],[1,30,61,111]];
  const contrastSteps = 48;
  const contrastColors = Array.from({length:contrastSteps}, (_, i) => {
    const q = i / (contrastSteps-1);
    const upper = contrastStops.findIndex(stop => stop[0] >= q);
    const a = contrastStops[Math.max(0,upper-1)], b = contrastStops[upper];
    const t = a === b ? 0 : (q-a[0])/(b[0]-a[0]);
    return a.slice(1).map((channel,index) => Math.round(channel+(b[index+1]-channel)*t));
  });
  let width = 0, height = 0, points = [], buckets = [], sampleClass = null;
  let time = 1.2, lastFrame = null, frame = 0, visible = true;
  let pulseTime = 1;
  let paused = reducedMotion.matches, targetMode = 0, mode = 0, modeVelocity = 0;
  let pointerX = 0, pointerY = 0, tiltX = 0, tiltY = 0;
  let tiltVelocityX = 0, tiltVelocityY = 0;
  let seed = 1926;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
  const smooth = x => x * x * (3 - 2 * x);
  const clamp = x => Math.max(0,Math.min(1,x));
  const mix = (a,b,t) => a+(b-a)*t;

  // A deterministic smooth random field: variation is spatially correlated,
  // rather than independent noise that would sparkle as the camera moves.
  const hash = (x,y) => {
    let n = Math.imul(x,374761393)+Math.imul(y,668265263);
    n = Math.imul(n^(n>>>13),1274126177);
    return ((n^(n>>>16))>>>0)/4294967295;
  };
  function noise(x,y) {
    const ix=Math.floor(x), iy=Math.floor(y);
    const u=smooth(x-ix), v=smooth(y-iy);
    return mix(mix(hash(ix,iy),hash(ix+1,iy),u),mix(hash(ix,iy+1),hash(ix+1,iy+1),u),v);
  }
  // Exact critically damped motion preserves velocity when a transition is
  // reversed. Its timing is independent of refresh rate, with no endpoint snap.
  function damp(value,velocity,target,dt,frequency) {
    const offset=value-target, c=velocity+frequency*offset, decay=Math.exp(-frequency*dt);
    return [target+(offset+c*dt)*decay,(velocity-frequency*c*dt)*decay];
  }

  function contrastAt(x, z) {
    const support=Math.exp(-((x/3.7)**6+(z/2.9)**6));
    let q=.10*support*(.3+.7*noise(x*.8+7,z*.8+9));
    for (const [i,s] of inclusions.entries()) {
      const dx = x-s.x, dz = z-s.z;
      const u = (dx*Math.cos(s.angle)+dz*Math.sin(s.angle))/s.rx;
      const v = (-dx*Math.sin(s.angle)+dz*Math.cos(s.angle))/s.rz;
      const theta = Math.atan2(v,u);
      const boundary = 1 + s.irregularity*Math.cos(s.lobes*theta+.4)
        + .065*Math.sin(5*theta+i) + .11*(noise(x*1.2+11,z*1.2+4)-.5);
      const r = Math.hypot(u,v)/boundary;
      const envelope = smooth(clamp((1.12-r)/.28));
      const tissue = .30 + .47*noise(x*1.4+3,z*1.4+8)
        + .13*noise(x*3.5+17,z*3.5+21) + .06*noise(x*7+6,z*7+4);
      const core = Math.exp(-((u+.24)**2+(v-.08)**2)*3.5);
      const pocket = i===1 ? .36*Math.exp(-((u-.32)**2+(v+.18)**2)*10) : 0;
      q += s.a/1.2*envelope*(tissue+.34*core-pocket);
      // Low-amplitude smooth shoulders suggest finite reconstruction bandwidth.
      q += .035*Math.exp(-r*r*1.8);
    }
    return Math.min(1,q);
  }

  // Sample a density from the scalar field, then spatially match it to the
  // original wave particles. Every point (including the floating ones) gets a
  // destination: this is a material-gathering morph, not a crossfade of pictures.
  function assignDestinations() {
    const cols=128, rows=100, cdf=[];
    let total=0, maximum=0;
    for(let j=0;j<rows;j++) {
      for(let i=0;i<cols;i++) {
        const q=contrastAt((i+.5)/cols*9-4.5,(j+.5)/rows*7-3.5);
        maximum=Math.max(maximum,q);
        // Most particles gather in the inclusions; a few describe the weak
        // surrounding contrast. No particle disappears to make the final view.
        total+=.002+Math.pow(Math.max(0,q-.04),.9);
        cdf.push(total);
      }
    }
    const targets=[];
    for(let i=0;i<points.length;i++) {
      // Stratifying the CDF keeps sample coverage even and deterministic.
      const mass=(i+random())/points.length*total;
      let lo=0,hi=cdf.length-1;
      while(lo<hi) {const mid=(lo+hi)>>1;if(cdf[mid]<mass)lo=mid+1;else hi=mid;}
      const x=((lo%cols)+random())/cols*9-4.5;
      const z=(Math.floor(lo/cols)+random())/rows*7-3.5;
      targets.push({x,z,q:clamp(contrastAt(x,z)/maximum)});
    }
    // Recursive spatial matching keeps neighboring particles traveling together
    // instead of crisscrossing the entire scene. This is visual transport, not
    // an inverse solver or a claim of an optimal-transport computation.
    function match(source,destinations,depth=0) {
      if(source.length===1) {
        const p=source[0], t=destinations[0];
        p.targetX=t.x;p.targetZ=t.z;p.contrast=t.q;
        const curve=.08+.035*Math.sin(p.x*.8+p.z*.6);
        p.arcX=-(t.z-p.z)*curve;p.arcZ=(t.x-p.x)*curve;
        return;
      }
      const axis=depth%2?'z':'x';
      source.sort((a,b)=>a[axis]-b[axis]);
      destinations.sort((a,b)=>a[axis]-b[axis]);
      const mid=source.length>>1;
      match(source.slice(0,mid),destinations.slice(0,mid),depth+1);
      match(source.slice(mid),destinations.slice(mid),depth+1);
    }
    match([...points],targets);
  }

  function buildPoints() {
    if(sampleClass===(width<480))return;
    sampleClass=width<480;
    seed = 1926;
    points = [];
    // Smaller displays use fewer samples; each point remains a real canvas mark.
    const cols = width < 480 ? 109 : 154;
    const rows = width < 480 ? 82 : 114;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = ((i + (random() - .5) * .38) / (cols - 1) - .5) * 10.4;
        const z = ((j + (random() - .5) * .38) / (rows - 1) - .5) * 8.0;
        const nx = Math.abs(x / 5.25), nz = Math.abs(z / 4.05);
        const edge = Math.pow(nx, 8) + Math.pow(nz, 8);
        if (edge > 1 || random() < Math.max(0, edge - .65) * .7) continue;
        let waveSin = .19 * Math.sin(2.6 * x), waveCos = .19 * Math.cos(2.6 * x);
        for (const s of scatterers) {
          const r = Math.hypot(x - s.x, z - s.z);
          const a = s.a * .56 / Math.sqrt(1 + r * 1.4);
          const phase = 3.9 * r + 2.6 * s.x;
          waveSin += a * Math.sin(phase);
          waveCos += a * Math.cos(phase);
        }
        const color = Math.max(0, Math.min(5, Math.floor((x / 10.4 + .5) * 4.8 + (z / 8 + .5) * 1.1)));
        const opacity = Math.max(.13, .7 * Math.min(1, (1.13 - edge) * 2.3) * (.67 + random() * .33));
        const alpha = Math.min(3, Math.floor(opacity * 5.5));
        const point = {x, z, waveSin, waveCos, color, alpha, size:.64 + random() * .28};
        points.push(point);
        // Sparse points above and below the sheet give the field volume.
        if (random() < .13) points.push({...point, ghost:(random() - .5) * .9, alpha:0, size:.5});
      }
    }
    assignDestinations();
    // A shared set of particles changes color, radius and camera position in one
    // pass; no crossfaded duplicate layers or per-particle allocations per frame.
    const groups = new Map();
    for (const p of points) {
      const q=Math.round(p.contrast*(contrastSteps-1));
      const key=`${p.color}/${p.alpha}/${q}`;
      if(!groups.has(key)) groups.set(key,{
        wave:colors[p.color], blue:contrastColors[q],
        waveAlpha:[.18,.32,.49,.70][p.alpha],
        contrastAlpha:mix(.56,.88,smooth(clamp(p.contrast*2))),
        points:[]
      });
      groups.get(key).points.push(p);
    }
    buckets=[...groups.values()];
  }

  function resize() {
    const bounds = stage.getBoundingClientRect();
    const nextWidth = bounds.width, nextHeight = bounds.height;
    if (!nextWidth || !nextHeight) return;
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth; height = nextHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    emitterCanvas.width=canvas.width;emitterCanvas.height=canvas.height;
    emitterContext?.setTransform(ratio,0,0,ratio,0,0);
    buildPoints();
    draw();
  }

  function draw() {
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);
    const sinT = Math.sin(time), cosT = Math.cos(time);
    const m=clamp(mode), colorMix=smooth(clamp((m-.08)/.86));
    const travel=smooth(m), arc=Math.sin(Math.PI*travel);
    const scale=mix(Math.min(width/12.4,height/7.1),Math.min(width/11.7,(height-68)/6.7),m);
    const yaw=mix(-.32,.045,m)+tiltX*.075*(1-m);
    const pitch=mix(Math.asin(.53),.88,m)+tiltY*.028*(1-m);
    const cosA=Math.cos(yaw), sinA=Math.sin(yaw), sinP=Math.sin(pitch);
    const centerX=width*mix(.52,.5,m), centerY=height*mix(.53,.465,m);
    stage.style.setProperty('--contrast-reveal',String(smooth(clamp((m-.35)/.65))));
    contrastKey.hidden = m === 0 && targetMode === 0;

    for (const bucket of buckets) {
      const alpha=mix(bucket.waveAlpha,bucket.contrastAlpha,colorMix);
      if(alpha < .005) continue;
      const rgb=bucket.wave.map((channel,i)=>Math.round(mix(channel,bucket.blue[i],colorMix)));
      context.fillStyle=`rgba(${rgb.join(',')},${alpha})`;
      context.beginPath();
      for (const p of bucket.points) {
        const px=mix(p.x,p.targetX,travel)+p.arcX*arc;
        const pz=mix(p.z,p.targetZ,travel)+p.arcZ*arc;
        const rx=px*cosA-pz*sinA, depth=px*sinA+pz*cosA;
        const elevation=((p.waveSin*cosT-p.waveCos*sinT)*1.05+(p.ghost||0))*(1-m);
        const perspective=1+depth*.022*(1-m);
        const x=centerX+rx*scale*perspective;
        const y=centerY+(depth*sinP-elevation)*scale*perspective;
        const waveRadius=p.size*(width<480?.87:1)*perspective;
        const mapRadius=mix(width<480?.38:.44,width<480?.51:.61,smooth(clamp(p.contrast*2)));
        const radius=mix(waveRadius,mapRadius,m);
        context.moveTo(x+radius,y);
        context.arc(x,y,radius,0,Math.PI*2);
      }
      context.fill();
    }
    drawEmitters();
  }

  function drawEmitters() {
    if(!emitterContext||!width||!height)return;
    const ctx=emitterContext;
    ctx.clearRect(0,0,width,height);
    const reveal=smooth(clamp((mode-.48)/.52));
    if(reveal===0)return;
    const scale=Math.min(width/11.7,(height-68)/6.7);
    const cosA=Math.cos(.045),sinA=Math.sin(.045),sinP=Math.sin(.88);
    const project=(x,z)=>[width*.5+(x*cosA-z*sinA)*scale,
      height*.465+(x*sinA+z*cosA)*sinP*scale];
    const cycle=2.8, activePair=Math.floor(pulseTime/cycle)%4;
    const phase=(pulseTime%cycle)/cycle;
    ctx.globalAlpha=reveal;

    for(let i=0;i<8;i++) {
      const theta=i*Math.PI/4+.16;
      const ex=Math.cos(theta)*4.5,ez=Math.sin(theta)*3.3;
      const [x,y]=project(ex,ez), active=i%4===activePair;
      const glow=active ? .14+.86*Math.sin(phase*Math.PI)**2 : .14;
      // A quiet aperture: the active opposing pair sends cylindrical fronts
      // inward. These marks illustrate illumination, not a forward PDE solve.
      ctx.beginPath();ctx.arc(x,y,5.5+glow*2,0,Math.PI*2);
      ctx.fillStyle=`rgba(91,148,183,${.035+glow*.055})`;ctx.fill();
      ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);
      ctx.strokeStyle=`rgba(71,121,160,${.27+glow*.38})`;ctx.lineWidth=.75;ctx.stroke();
      ctx.beginPath();ctx.arc(x,y,1.05,0,Math.PI*2);
      ctx.fillStyle=`rgba(45,97,147,${.35+glow*.45})`;ctx.fill();
      if(!active)continue;
      const direction=Math.atan2(-ez,-ex), distance=Math.hypot(ex,ez);
      for(let front=0;front<3;front++) {
        const age=phase*1.55-front*.22;
        if(age<=0||age>=1)continue;
        const envelope=smooth(clamp(age/.14))*smooth(clamp((1-age)/.26));
        ctx.fillStyle=`rgba(80,147,191,${envelope*.28})`;
        ctx.beginPath();
        for(let j=0;j<=50;j++) {
          const u=j/50,angle=direction+(u-.5)*1.02;
          const radius=distance*age*1.12;
          const [px,py]=project(ex+Math.cos(angle)*radius,ez+Math.sin(angle)*radius);
          const dot=.23+.38*Math.sin(Math.PI*u);
          ctx.moveTo(px+dot,py);ctx.arc(px,py,dot,0,Math.PI*2);
        }
        ctx.fill();
      }
    }
    ctx.globalAlpha=1;
  }

  function animate(stamp) {
    frame = 0;
    if (!visible || document.hidden || paused) { lastFrame = null; return; }
    const dt=lastFrame===null ? 0 : Math.min((stamp-lastFrame)/1000,.05);
    lastFrame=stamp;
    const settled=mode===1&&targetMode===1;
    time+=dt*.62;
    pulseTime+=dt;
    [mode,modeVelocity]=damp(mode,modeVelocity,targetMode,dt,4.6);
    if (Math.abs(targetMode-mode)<.0005 && Math.abs(modeVelocity)<.003) {mode=targetMode;modeVelocity=0;}
    [tiltX,tiltVelocityX]=damp(tiltX,tiltVelocityX,pointerX,dt,5);
    [tiltY,tiltVelocityY]=damp(tiltY,tiltVelocityY,pointerY,dt,5);
    // Keep the recovered material bitmap fixed; only the lightweight emitter
    // overlay needs new frames once the particles have arrived.
    if(settled)drawEmitters();else draw();
    frame = requestAnimationFrame(animate);
  }

  function schedule() {
    if (!frame && !paused && visible && !document.hidden) {
      lastFrame = null;
      frame = requestAnimationFrame(animate);
    }
  }

  function syncMotion() {
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.setAttribute('aria-label', paused ? 'Play animation' : 'Pause animation');
    pauseButton.querySelector('.motion-symbol').textContent = paused ? '▷' : 'Ⅱ';
    pauseButton.querySelector('.motion-text').textContent = paused ? 'Play' : 'Pause';
    if (paused) { cancelAnimationFrame(frame); frame = 0; draw(); }
    else schedule();
  }

  pauseButton.addEventListener('click', () => { paused = !paused; syncMotion(); });
  modeButtons.forEach(button => button.addEventListener('click', () => {
    targetMode = button.dataset.mode === 'medium' ? 1 : 0;
    modeButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    label.textContent = targetMode ? 'Recovered contrast field' : 'Scattered wavefield';
    hint.textContent = targetMode ? 'Pulsed illumination · conceptual illustration' : 'An illustration of inverse scattering';
    equation.textContent = targetMode ? 'q(x)' : '(Δ + k²n²)u = 0';
    if (targetMode) contrastKey.hidden = false;
    if (paused || reducedMotion.matches) { mode = targetMode; modeVelocity=0; draw(); }
    else schedule();
  }));
  stage.addEventListener('pointermove', event => {
    if (reducedMotion.matches || event.pointerType === 'touch') return;
    const bounds = stage.getBoundingClientRect();
    pointerX = (event.clientX - bounds.left) / bounds.width * 2 - 1;
    pointerY = (event.clientY - bounds.top) / bounds.height * 2 - 1;
  });
  stage.addEventListener('pointerleave', () => { pointerX = pointerY = 0; });
  reducedMotion.addEventListener('change', event => {
    paused = event.matches;
    if (event.matches) {
      tiltX = tiltY = pointerX = pointerY = tiltVelocityX = tiltVelocityY = 0;
      mode = targetMode; modeVelocity=0;
    }
    syncMotion();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; lastFrame = null; }
    else schedule();
  });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) { cancelAnimationFrame(frame); frame = 0; lastFrame = null; }
    else schedule();
  }, {rootMargin:'80px'}).observe(stage);
  new ResizeObserver(resize).observe(stage);
  resize();
  stage.classList.add('is-ready');
  controls.hidden = false;
  syncMotion();
})();
