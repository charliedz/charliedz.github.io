/* Canonical synthetic Adams tower, following the diagram in Charlie's thesis
   and Burklund–Hahn–Senger, Appendix A, immediately before Notation A.6.
   The labeled objects, map directions, and commuting triangles are mathematical;
   the particle geometry, suspended faces, and traveling lights are illustrative.
   No points represent computed homotopy classes or spectral-sequence data. */
(() => {
  'use strict';
  const svg = document.querySelector('#homotopy-diagram');
  const canvas = document.querySelector('#synthetic-particles');
  const context = canvas.getContext('2d');
  const edgeGroup = document.querySelector('#synthetic-edges');
  const labels = document.querySelector('#synthetic-labels');
  const button = document.querySelector('#homotopy-motion');
  const traceButton = document.querySelector('#tau-trace');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const namespace = 'http://www.w3.org/2000/svg';
  const palette = [[111,153,129], [111,149,177], [155,135,185]];
  let time = 1.8, frame = 0, lastFrame = null;
  let paused = reducedMotion.matches, visible = false, traceTau = false;

  const nodes = [
    {id:'a2', x:110, y:84, col:0, row:0, shift:2, index:3},
    {id:'a1', x:310, y:66, col:1, row:0, shift:1, index:2},
    {id:'a0', x:510, y:48, col:2, row:0, shift:0, index:1},
    {id:'t2', x:93, y:202, col:0, row:1, shift:2, index:2},
    {id:'t1', x:293, y:184, col:1, row:1, shift:1, index:1},
    {id:'t0', x:493, y:166, col:2, row:1, shift:0, index:0},
    {id:'q2', x:76, y:304, col:0, row:2, shift:2, index:2},
    {id:'q1', x:276, y:286, col:1, row:2, shift:1, index:1},
    {id:'q0', x:476, y:268, col:2, row:2, shift:0, index:0}
  ];
  const byId = Object.fromEntries(nodes.map(n => [n.id,n]));
  byId.previous = {x:12, y:210};
  const edgeSpecs = [
    ['previous','t2','tower',null,0,0],
    ['a2','previous','tau','τ',45,144],
    ['a1','t2','tau','τ',192,112],
    ['a0','t1','tau','τ',392,94],
    ['a2','t2','comparison','ν(f₃)',126,145],
    ['a1','t1','comparison','ν(f₂)',326,127],
    ['a0','t0','comparison','ν(f₁)',526,109],
    ['t2','t1','tower','f̃₂',194,179],
    ['t1','t0','tower','f̃₁',394,161],
    ['t2','q2','cofiber','ν(i₂)',108,258],
    ['t1','q1','cofiber','ν(i₁)',308,240],
    ['t0','q0','cofiber','ν(i₀)',508,222]
  ];
  const edges = [];
  const faces = [
    {vertices:[byId.a1,byId.t2,byId.t1], col:0},
    {vertices:[byId.a0,byId.t1,byId.t0], col:1}
  ];

  function element(tag, attributes, text) {
    const node = document.createElementNS(namespace, tag);
    Object.entries(attributes).forEach(([key,value]) => node.setAttribute(key,value));
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function pointOnEdge(edge, s) {
    const u = 1 - s;
    return [u*u*edge.a.x + 2*u*s*edge.cx + s*s*edge.b.x,
      u*u*edge.a.y + 2*u*s*edge.cy + s*s*edge.b.y];
  }

  for (const [from,to,kind,text,x,y] of edgeSpecs) {
    const a = byId[from], b = byId[to];
    const edge = {a,b,kind,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2 - (kind === 'tau' ? 10 : 0)};
    const distance = Math.hypot(b.x-a.x,b.y-a.y);
    const start = pointOnEdge(edge,14/distance), end = pointOnEdge(edge,1-17/distance);
    const path = element('path', {
      d:`M${start.join(' ')}Q${edge.cx} ${edge.cy} ${end.join(' ')}`,
      stroke:kind === 'tau' ? '#a995bc' : '#9cafab',
      'marker-end':kind === 'tau' ? 'url(#arrow-tau)' : 'url(#arrow-synthetic)',
      'data-from':from, 'data-to':to, 'data-kind':kind,
      opacity:from === 'previous' || to === 'previous' ? '.4' : '.85'
    });
    if (from === 'previous' || to === 'previous') path.setAttribute('stroke-dasharray','2 4');
    edgeGroup.append(path);
    edge.path = path;
    edges.push(edge);
    if (text) labels.append(element('text',{x,y,'text-anchor':'middle',class:`synthetic-map-label ${kind === 'tau' ? 'tau-map' : ''}`},text));
  }

  for (const n of nodes) {
    const text = element('text', {
      x:n.x, y:n.y + (n.row === 0 ? -22 : 31),
      class:`synthetic-node-label ${n.row === 2 ? 'synthetic-bottom' : ''}`,
      'text-anchor':'middle'
    });
    if (n.row === 2) text.append(document.createTextNode('νE ⊗ '));
    if (n.shift) {
      text.append(document.createTextNode('Σ'));
      text.append(element('tspan',{'baseline-shift':'super','font-size':10},`0,${n.shift}`));
    }
    text.append(document.createTextNode('νX'));
    text.append(element('tspan',{'baseline-shift':'sub','font-size':10},n.index));
    labels.append(text);
  }

  if (!context) {
    button.hidden = true;
    traceButton.hidden = true;
    svg.dataset.ready = 'true';
    return;
  }
  context.setTransform(2,0,0,2,0,0);

  const faceSamples = [];
  for (const face of faces) {
    for (let i=1; i<49; i++) {
      for (let j=1; j<49-i; j++) {
        const a=i/49, b=j/49, c=1-a-b;
        const [v0,v1,v2] = face.vertices;
        faceSamples.push({
          x:a*v0.x+b*v1.x+c*v2.x, y:a*v0.y+b*v1.y+c*v2.y,
          lift:Math.sin(Math.PI*a)*Math.sin(Math.PI*b)*Math.sin(Math.PI*c),
          phase:(a-b)*4, col:face.col, radius:(i+j)%5 ? .64 : .9
        });
      }
    }
  }
  const sphereSamples = Array.from({length:210},(_,i) => {
    const y = 1 - 2*(i+.5)/210;
    const radius = Math.sqrt(1-y*y);
    const phi = i * Math.PI * (3-Math.sqrt(5));
    return {x:radius*Math.cos(phi),y,z:radius*Math.sin(phi)};
  });

  function rgba(rgb, alpha) { return `rgba(${rgb.join(',')},${alpha})`; }

  function dot(x,y,r) {
    context.moveTo(x+r,y);
    context.arc(x,y,r,0,Math.PI*2);
  }

  function draw() {
    context.clearRect(0,0,620,380);
    // The commuting triangles become two gently suspended particle membranes.
    for (let col=0; col<2; col++) {
      const color = palette[col+1];
      context.fillStyle = rgba(color, traceTau ? .47 : .28);
      context.beginPath();
      for (const p of faceSamples) {
        if (p.col !== col) continue;
        const lift = p.lift * (31 + Math.sin(time*.55+p.phase)*9);
        dot(p.x + p.lift*Math.sin(time*.23)*5, p.y-lift,p.radius);
      }
      context.fill();
    }
    // Fine rippled strands suggest coherent families, without adding graph edges.
    faces.forEach((face,index) => {
      const [a,b,c]=face.vertices;
      context.strokeStyle=rgba(palette[index+1],traceTau ? .21 : .1);
      context.lineWidth=.55;
      for(let k=1;k<9;k++) {
        context.beginPath();
        const t=k/9;
        for(let j=0;j<=36;j++) {
          const s=j/36, u=(1-s)*t, v=s, w=1-u-v;
          const lift=Math.sin(Math.PI*u)*Math.sin(Math.PI*v)*Math.sin(Math.PI*w);
          const x=u*a.x+v*b.x+w*c.x;
          const y=u*a.y+v*b.y+w*c.y-lift*(31+Math.sin(time*.55+(u-v)*4)*9);
          if(j) context.lineTo(x,y); else context.moveTo(x,y);
        }
        context.stroke();
      }
    });
    nodes.forEach((n,index) => {
      const size=n.row === 1 ? 19 : n.row === 0 ? 13 : 15;
      const angle=time*.11+index*.75, cos=Math.cos(angle),sin=Math.sin(angle);
      context.strokeStyle=rgba(palette[n.col],.12);
      context.lineWidth=.55;
      context.beginPath();
      context.ellipse(n.x,n.y,size*1.55,size*.68,-.12,0,Math.PI*2);
      context.stroke();
      for(const p of sphereSamples) {
        const x=p.x*cos-p.z*sin,z=p.x*sin+p.z*cos, depth=(z+1)/2;
        // Continuous depth shading avoids the old three-band brightness jumps
        // as each particle rotates from the back to the front of its sphere.
        context.fillStyle=rgba(palette[n.col],.19+.45*depth);
        context.beginPath();
        dot(n.x+x*size,n.y+(p.y*.61+z*.2)*size,.53+depth*.32);
        context.fill();
      }
      context.fillStyle=rgba(palette[n.col],.8);
      context.beginPath(); dot(n.x,n.y,1.7); context.fill();
    });
    edges.forEach((edge,index) => {
      const isTau=edge.kind==='tau';
      const color=isTau ? palette[2] : edge.kind==='cofiber' ? palette[0] : palette[1];
      const dim=traceTau && !isTau ? .18 : 1;
      // A short train travels in the direction of each actual map.
      for(let stream=0;stream<2;stream++) {
        const head=(time*(isTau?.1:.075)+index*.163+stream*.5)%1;
        for(let tail=0;tail<13;tail++) {
          const s=head-tail*.008;
          if(s<.07||s>.93)continue;
          const [x,y]=pointOnEdge(edge,s);
          const fade=Math.min(1,(s-.07)/.06,(.93-s)/.06);
          context.fillStyle=rgba(color,(1-tail/13)*.75*dim*fade);
          context.beginPath();dot(x,y,tail===0?1.9:1.05);context.fill();
        }
      }
    });
    // The rightmost term is canonically the synthetic analogue νX.
    context.fillStyle=rgba(palette[2],.65);
    context.beginPath();dot(591,167,2);context.fill();
  }

  function animate(stamp) {
    frame=0;
    if(paused||!visible||document.hidden){lastFrame=null;return;}
    const dt=lastFrame===null?0:Math.min((stamp-lastFrame)/1000,.05);
    time+=dt;lastFrame=stamp;draw();
    frame=requestAnimationFrame(animate);
  }
  function schedule() {
    if(!frame&&!paused&&visible&&!document.hidden){lastFrame=null;frame=requestAnimationFrame(animate);}
  }
  function stop() {cancelAnimationFrame(frame);frame=0;lastFrame=null;}
  function sync() {
    button.setAttribute('aria-pressed',String(paused));
    button.setAttribute('aria-label',paused?'Play synthetic animation':'Pause synthetic animation');
    button.querySelector('.motion-symbol').textContent=paused?'▷':'Ⅱ';
    button.querySelector('.motion-text').textContent=paused?'Play':'Pause';
    if(paused)stop();else schedule();
  }
  button.addEventListener('click',()=>{paused=!paused;sync();});
  traceButton.addEventListener('click',()=>{
    traceTau=!traceTau;
    traceButton.setAttribute('aria-pressed',String(traceTau));
    edges.forEach(edge=>edge.path.setAttribute('opacity',traceTau&&edge.kind!=='tau'?'.28':'.85'));
    draw();
  });
  reducedMotion.addEventListener('change',event=>{paused=event.matches;sync();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else schedule();});
  new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if(visible)schedule();else stop();
  }).observe(svg);
  draw();
  sync();
  svg.dataset.ready='true';
})();
