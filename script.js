/* ===================== Sidebar collapse & resize ===================== */
(function(){
  const rail = document.getElementById('rail');
  const openBtn = document.getElementById('railOpenBtn');
  const collapseBtn = document.getElementById('railCollapseBtn');
  const handle = document.getElementById('railResizeHandle');
  const MIN_W = 200, MAX_W = 420, DEFAULT_W = 260;

  function applyWidth(w){
    rail.style.width = w + 'px';
  }
  function loadWidth(){
    const saved = parseInt(localStorage.getItem('benchone_rail_width'), 10);
    applyWidth(Number.isFinite(saved) ? Math.min(MAX_W, Math.max(MIN_W, saved)) : DEFAULT_W);
  }
  function saveWidth(w){
    localStorage.setItem('benchone_rail_width', w);
  }
  window.resetRailWidth = function(){
    localStorage.removeItem('benchone_rail_width');
    applyWidth(DEFAULT_W);
  };
  loadWidth();

  function setCollapsed(collapsed){
    rail.classList.toggle('collapsed', collapsed);
    openBtn.hidden = !collapsed;
    localStorage.setItem('benchone_rail_collapsed', collapsed ? '1' : '0');
  }
  setCollapsed(localStorage.getItem('benchone_rail_collapsed') === '1');

  collapseBtn.addEventListener('click', () => setCollapsed(true));
  openBtn.addEventListener('click', () => setCollapsed(false));

  let dragging = false;
  handle.addEventListener('mousedown', e => {
    dragging = true;
    handle.classList.add('active');
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if(!dragging) return;
    const w = Math.min(MAX_W, Math.max(MIN_W, e.clientX));
    applyWidth(w);
  });
  window.addEventListener('mouseup', () => {
    if(!dragging) return;
    dragging = false;
    handle.classList.remove('active');
    document.body.style.userSelect = '';
    saveWidth(parseInt(rail.style.width, 10));
  });
})();

/* ===================== Lesson progress tracking ===================== */
const LessonProgress = (function(){
  const KEY = 'benchone_progress';
  const trackableSections = Array.from(document.querySelectorAll('.mini-quiz-block')).map(b => b.dataset.quizSection);

  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ return {}; }
  }
  function save(state){
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  function markDone(sectionId){
    const state = load();
    if(state[sectionId]) return;
    state[sectionId] = true;
    save(state);
    render();
  }
  function clear(){
    localStorage.removeItem(KEY);
    render();
  }
  function render(){
    const state = load();
    document.querySelectorAll('.rail-item').forEach(item => {
      item.classList.toggle('done', !!state[item.dataset.target]);
    });
    const doneCount = trackableSections.filter(s => state[s]).length;
    const pct = trackableSections.length ? Math.round((doneCount/trackableSections.length)*100) : 0;
    const fill = document.getElementById('railProgressFill');
    const label = document.getElementById('railProgressLabel');
    if(fill) fill.style.width = pct + '%';
    if(label) label.textContent = pct + '% complete';
  }
  render();
  return { markDone, clear, render };
})();

/* ===================== Navigation ===================== */
const order = [
  'intro','static','conductors','circuitdef','fundamentals','resistance','practical','flowdir',
  'ohmslaw','power','circuits','seriesparallel','kirchhoff','dividers','safety','scinotation',
  'library','meters','resistors','capacitors','magnetism',
  'microcontrollers','soldering','troubleshoot',
  'playground','flashcards','quiz',
  'binary','gates','adder','cppbasics','digitalio','serial','shiftreg','pwm','interrupts','statemachine'
];
const railItems = document.querySelectorAll('.rail-item');
const mobileSelect = document.getElementById('mobileSelect');
const sections = document.querySelectorAll('section');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

function showSection(id){
  sections.forEach(s => {
    const active = s.id === id;
    s.classList.toggle('active', active);
    s.toggleAttribute('hidden', !active);
  });
  railItems.forEach(b => {
    const active = b.dataset.target === id;
    b.classList.toggle('active', active);
    if(active) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  mobileSelect.value = id;
  window.scrollTo({top:0, behavior:'instant'});
  const idx = order.indexOf(id);
  prevBtn.disabled = idx === 0;
  nextBtn.disabled = idx === order.length - 1;
  prevBtn.onclick = () => idx > 0 && showSection(order[idx-1]);
  nextBtn.onclick = () => idx < order.length-1 && showSection(order[idx+1]);
  const heading = document.querySelector('#'+id+' h1, #'+id+' h2');
  if(heading){
    heading.setAttribute('tabindex', '-1');
    heading.focus();
  }
  const announcer = document.getElementById('routeAnnouncer');
  if(announcer) announcer.textContent = (heading ? heading.textContent : id) + ' section loaded';
}

railItems.forEach(btn => btn.addEventListener('click', () => showSection(btn.dataset.target)));
mobileSelect.addEventListener('change', e => showSection(e.target.value));
showSection('intro');

/* ===================== Ohm's Law Calculator ===================== */
let lockedVar = 'R'; // which variable stays fixed when others change
const vSlider = document.getElementById('vSlider');
const iSlider = document.getElementById('iSlider');
const rSlider = document.getElementById('rSlider');
const vVal = document.getElementById('vVal');
const iVal = document.getElementById('iVal');
const rVal = document.getElementById('rVal');

function toggleLock(which){
  lockedVar = which;
  ['V','I','R'].forEach(k => {
    document.getElementById('lock'+k).classList.toggle('locked', k === which);
    document.getElementById('field'+k).classList.toggle('is-locked', k === which);
  });
}
toggleLock('R');

function setOhmFlowSpeed(mA){
  const clamped = Math.max(1, Math.min(500, mA));
  const duration = Math.max(0.25, 1.6 - (clamped/500)*1.35);
  const flow = document.getElementById('ohmFlow');
  if(flow) flow.style.animationDuration = duration.toFixed(2) + 's';
}

function updateFromV(){
  const V = parseFloat(vSlider.value);
  vVal.innerHTML = V.toFixed(1) + ' <span>V</span>';
  vSlider.setAttribute('aria-valuetext', V.toFixed(1) + ' volts');
  vSlider.style.setProperty('--fill', ((V-vSlider.min)/(vSlider.max-vSlider.min)*100)+'%');
  let mA = parseFloat(iSlider.value);
  if(lockedVar === 'R'){
    const R = parseFloat(rSlider.value);
    mA = (V / R) * 1000;
    iVal.innerHTML = mA.toFixed(1) + ' <span>mA</span>';
    iSlider.value = Math.min(mA, 500);
    iSlider.style.setProperty('--fill', ((iSlider.value-iSlider.min)/(iSlider.max-iSlider.min)*100)+'%');
  } else if(lockedVar === 'I'){
    const I = parseFloat(iSlider.value) / 1000; // A
    const R = V / I;
    rVal.innerHTML = Math.round(R) + ' <span>Ω</span>';
    rSlider.value = Math.min(Math.max(R,1), 10000);
    rSlider.style.setProperty('--fill', ((rSlider.value-rSlider.min)/(rSlider.max-rSlider.min)*100)+'%');
  }
  setOhmFlowSpeed(mA);
}
function updateFromI(){
  const I = parseFloat(iSlider.value);
  iVal.innerHTML = I.toFixed(1) + ' <span>mA</span>';
  iSlider.setAttribute('aria-valuetext', I.toFixed(1) + ' milliamps');
  iSlider.style.setProperty('--fill', ((I-iSlider.min)/(iSlider.max-iSlider.min)*100)+'%');
  if(lockedVar === 'R'){
    const R = parseFloat(rSlider.value);
    const V = (I/1000) * R;
    vVal.innerHTML = V.toFixed(2) + ' <span>V</span>';
    vSlider.value = Math.min(V, 24);
    vSlider.style.setProperty('--fill', ((vSlider.value-vSlider.min)/(vSlider.max-vSlider.min)*100)+'%');
  } else if(lockedVar === 'V'){
    const V = parseFloat(vSlider.value);
    const R = V / (I/1000);
    rVal.innerHTML = Math.round(R) + ' <span>Ω</span>';
    rSlider.value = Math.min(Math.max(R,1), 10000);
    rSlider.style.setProperty('--fill', ((rSlider.value-rSlider.min)/(rSlider.max-rSlider.min)*100)+'%');
  }
  setOhmFlowSpeed(I);
}
function updateFromR(){
  const R = parseFloat(rSlider.value);
  rVal.innerHTML = Math.round(R) + ' <span>Ω</span>';
  rSlider.setAttribute('aria-valuetext', Math.round(R) + ' ohms');
  rSlider.style.setProperty('--fill', ((R-rSlider.min)/(rSlider.max-rSlider.min)*100)+'%');
  let mA = parseFloat(iSlider.value);
  if(lockedVar === 'I'){
    const I = parseFloat(iSlider.value)/1000;
    const V = I * R;
    vVal.innerHTML = V.toFixed(2) + ' <span>V</span>';
    vSlider.value = Math.min(V, 24);
    vSlider.style.setProperty('--fill', ((vSlider.value-vSlider.min)/(vSlider.max-vSlider.min)*100)+'%');
  } else if(lockedVar === 'V'){
    const V = parseFloat(vSlider.value);
    mA = (V / R) * 1000;
    iVal.innerHTML = mA.toFixed(1) + ' <span>mA</span>';
    iSlider.value = Math.min(mA, 500);
    iSlider.style.setProperty('--fill', ((iSlider.value-iSlider.min)/(iSlider.max-iSlider.min)*100)+'%');
  }
  setOhmFlowSpeed(mA);
}
vSlider.addEventListener('input', updateFromV);
iSlider.addEventListener('input', updateFromI);
rSlider.addEventListener('input', updateFromR);
[vSlider, iSlider, rSlider].forEach(s => s.style.setProperty('--fill', ((s.value-s.min)/(s.max-s.min)*100)+'%'));
setOhmFlowSpeed(parseFloat(iVal.textContent) || 9);

/* ===================== Power calculator ===================== */
(function(){
  const vSlider = document.getElementById('pwrVSlider');
  const rSlider = document.getElementById('pwrRSlider');
  const vVal = document.getElementById('pwrVVal');
  const rVal = document.getElementById('pwrRVal');
  const iOut = document.getElementById('pwrIOut');
  const pOut = document.getElementById('pwrPOut');
  const glow = document.getElementById('pwrBulbGlow');
  const filament = document.getElementById('pwrBulbFilament');
  const note = document.getElementById('pwrNote');
  if(!vSlider) return;

  function render(){
    const V = parseFloat(vSlider.value);
    const R = parseFloat(rSlider.value);
    const I = V / R;
    const P = I * V;

    vVal.innerHTML = V.toFixed(1) + ' <span>V</span>';
    rVal.innerHTML = Math.round(R) + ' <span>Ω</span>';
    iOut.innerHTML = (I*1000).toFixed(1) + ' <span>mA</span>';
    pOut.innerHTML = P.toFixed(3) + ' <span>W</span>';

    const glowStrength = Math.min(1, P / 2);
    glow.setAttribute('opacity', (0.1 + glowStrength*0.7).toFixed(2));
    glow.setAttribute('r', (30 + glowStrength*20).toFixed(1));
    filament.setAttribute('stroke', P > 0.5 ? '#FFD98A' : 'var(--copper)');
    filament.style.filter = P > 0.5 ? `drop-shadow(0 0 ${(glowStrength*6).toFixed(1)}px var(--copper))` : '';

    if(P < 0.05) note.textContent = 'Tiny — this is well within a standard ¼W resistor\'s safe range.';
    else if(P < 0.25) note.textContent = 'Typical for a small LED resistor — barely warm to the touch.';
    else if(P < 1) note.textContent = 'Getting warm — a ¼W resistor would be over its rating here; you\'d want a ½W or 1W part.';
    else note.textContent = 'High power — this would need a large power resistor rated well above 1W, with real heat dissipation.';
  }
  vSlider.addEventListener('input', render);
  rSlider.addEventListener('input', render);
  render();
})();

/* ===================== Voltage divider calculator ===================== */
(function(){
  const supplySlider = document.getElementById('vdSupplySlider');
  const r1Slider = document.getElementById('vdR1Slider');
  const r2Slider = document.getElementById('vdR2Slider');
  const supplyVal = document.getElementById('vdSupplyVal');
  const r1Val = document.getElementById('vdR1Val');
  const r2Val = document.getElementById('vdR2Val');
  const voutVal = document.getElementById('vdVoutVal');
  const iVal = document.getElementById('vdIVal');
  const tapNode = document.getElementById('vdTapNode');
  if(!supplySlider) return;

  function render(){
    const V = parseFloat(supplySlider.value);
    const R1 = parseFloat(r1Slider.value);
    const R2 = parseFloat(r2Slider.value);
    const Rtotal = R1 + R2;
    const I = V / Rtotal;
    const Vout = V * (R2 / Rtotal);

    supplyVal.innerHTML = V.toFixed(1) + ' <span>V</span>';
    r1Val.innerHTML = Math.round(R1) + ' <span>Ω</span>';
    r2Val.innerHTML = Math.round(R2) + ' <span>Ω</span>';
    voutVal.innerHTML = Vout.toFixed(2) + ' <span>V</span>';
    iVal.innerHTML = (I*1000).toFixed(2) + ' <span>mA</span>';

    if(tapNode){
      const frac = Vout / Math.max(V, 0.001);
      tapNode.setAttribute('r', (4 + frac*3).toFixed(1));
    }
  }
  supplySlider.addEventListener('input', render);
  r1Slider.addEventListener('input', render);
  r2Slider.addEventListener('input', render);
  render();
})();

/* ===================== Resistor Decoder ===================== */
const colorMap = [
  {name:'Black', hex:'#1a1a1a', digit:0, mult:1},
  {name:'Brown', hex:'#8B4513', digit:1, mult:10},
  {name:'Red', hex:'#FF0000', digit:2, mult:100},
  {name:'Orange', hex:'#FF8C00', digit:3, mult:1000},
  {name:'Yellow', hex:'#FFD700', digit:4, mult:10000},
  {name:'Green', hex:'#228B22', digit:5, mult:100000},
  {name:'Blue', hex:'#1E90FF', digit:6, mult:1000000},
  {name:'Violet', hex:'#8A2BE2', digit:7, mult:10000000},
  {name:'Grey', hex:'#808080', digit:8, mult:100000000},
  {name:'White', hex:'#F5F5F5', digit:9, mult:1000000000},
];
const toleranceMap = [
  {name:'Gold (±5%)', hex:'#FFD700', tol:'±5%'},
  {name:'Silver (±10%)', hex:'#C0C0C0', tol:'±10%'},
  {name:'Brown (±1%)', hex:'#8B4513', tol:'±1%'},
  {name:'Red (±2%)', hex:'#FF0000', tol:'±2%'},
];

function populateSelect(sel, list, defaultIdx){
  sel.innerHTML = list.map((c,i) => `<option value="${i}">${c.name}</option>`).join('');
  sel.value = defaultIdx;
}
populateSelect(document.getElementById('b1'), colorMap, 1); // brown
populateSelect(document.getElementById('b2'), colorMap, 2); // red
populateSelect(document.getElementById('b3'), colorMap, 2); // red multiplier x100
populateSelect(document.getElementById('b4'), toleranceMap, 0); // gold

function formatOhms(n){
  if(n >= 1000000) return (n/1000000).toFixed(n % 1000000 === 0 ? 0 : 2) + ' MΩ';
  if(n >= 1000) return (n/1000).toFixed(n % 1000 === 0 ? 0 : 2) + ' kΩ';
  return n + ' Ω';
}

function updateResistor(){
  const b1 = colorMap[document.getElementById('b1').value];
  const b2 = colorMap[document.getElementById('b2').value];
  const b3 = colorMap[document.getElementById('b3').value];
  const b4 = toleranceMap[document.getElementById('b4').value];

  const value = (b1.digit * 10 + b2.digit) * b3.mult;

  document.getElementById('band1').setAttribute('fill', b1.hex);
  document.getElementById('band2').setAttribute('fill', b2.hex);
  document.getElementById('band3').setAttribute('fill', b3.hex);
  document.getElementById('band4').setAttribute('fill', b4.hex);
  document.getElementById('swatch1').style.background = b1.hex;
  document.getElementById('swatch2').style.background = b2.hex;
  document.getElementById('swatch3').style.background = b3.hex;
  document.getElementById('swatch4').style.background = b4.hex;

  const readout = document.getElementById('resistorReadout');
  readout.innerHTML = `${value.toLocaleString()} Ω <span>${formatOhms(value)}, ${b4.tol} tolerance</span>`;
  readout.classList.remove('pulse-good');
  void readout.offsetWidth; // restart animation
  readout.classList.add('pulse-good');
}
['b1','b2','b3','b4'].forEach(id => document.getElementById(id).addEventListener('change', updateResistor));
updateResistor();

/* ===================== Static electricity charge sim ===================== */
(function(){
  const balloonGroup = document.getElementById('balloonGroup');
  const balloonBody = document.getElementById('balloonBody');
  const balloonSymbols = document.getElementById('balloonSymbols');
  const balloonShadow = document.getElementById('balloonShadow');
  const wallSymbols = document.getElementById('wallSymbols');
  const attractLines = document.getElementById('attractLines');
  const auraRing = document.getElementById('chargeAuraRing');
  const hairStrands = document.getElementById('hairStrands');
  const readout = document.getElementById('chargeReadout');
  const rubBtn = document.getElementById('rubBtn');
  const wallBtn = document.getElementById('chargeWallBtn');
  const resetBtn = document.getElementById('resetChargeBtn');
  const slider = document.getElementById('chargeDistSlider');
  if(!balloonGroup) return;

  let balloonCharged = false;
  let wallCharged = false;
  let rubbing = false;

  const FAR_X = 60, NEAR_X = 250, REPEL_STOP_X = 175; // svg x positions
  const HEAD_X = 70;

  function symbolMarkup(n, color){
    let s = '';
    for(let i=0;i<n;i++){
      const a = (i/n)*Math.PI*2;
      const x = Math.cos(a)*16, y = Math.sin(a)*16;
      s += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" fill="${color}" font-family="JetBrains Mono" font-size="11" font-weight="700" style="filter:drop-shadow(0 0 3px ${color})">−</text>`;
    }
    return s;
  }

  function render(){
    if(rubbing) return; // rub animation drives its own transform temporarily
    const dist = parseFloat(slider.value)/100; // 0 = far, 1 = close
    let x;
    const repelling = balloonCharged && wallCharged;
    if(repelling){
      x = FAR_X + (REPEL_STOP_X - FAR_X) * dist;
    } else {
      x = FAR_X + (NEAR_X - FAR_X) * dist;
    }
    balloonGroup.style.transition = 'transform .25s cubic-bezier(.4,0,.2,1)';
    balloonGroup.setAttribute('transform', `translate(${x.toFixed(1)},103)`);
    balloonShadow.setAttribute('cx', x.toFixed(1));

    balloonBody.setAttribute('fill', balloonCharged ? 'url(#balloonGradCharged)' : 'url(#balloonGrad)');
    balloonBody.setAttribute('stroke', balloonCharged ? 'var(--trace)' : '#3A4A5A');
    balloonSymbols.innerHTML = balloonCharged ? symbolMarkup(5, 'var(--trace)') : '';
    auraRing.style.transition = 'opacity .4s ease';
    auraRing.setAttribute('opacity', balloonCharged ? '0.8' : '0');

    wallSymbols.innerHTML = '';
    if(wallCharged){
      wallSymbols.innerHTML = `<text x="366" y="68" text-anchor="middle" fill="var(--trace)" font-family="JetBrains Mono" font-size="12" font-weight="700" style="filter:drop-shadow(0 0 3px var(--trace))">−</text>
        <text x="366" y="103" text-anchor="middle" fill="var(--trace)" font-family="JetBrains Mono" font-size="12" font-weight="700" style="filter:drop-shadow(0 0 3px var(--trace))">−</text>
        <text x="366" y="138" text-anchor="middle" fill="var(--trace)" font-family="JetBrains Mono" font-size="12" font-weight="700" style="filter:drop-shadow(0 0 3px var(--trace))">−</text>`;
    }

    const gap = 330 - (x + 37);
    attractLines.innerHTML = '';
    if(balloonCharged && !wallCharged && gap < 90){
      const strength = Math.max(0, 1 - gap/90);
      attractLines.style.transition = 'opacity .2s ease';
      attractLines.style.opacity = String(strength);
      let arcs = '';
      [-30,-8,14].forEach((oy,i) => {
        const jitter = gap < 20 ? (Math.random()-0.5)*6 : 0;
        arcs += `<path d="M${(x+37).toFixed(1)},${(103+oy).toFixed(1)} Q${(x+37+gap/2).toFixed(1)},${(103+oy+10+jitter).toFixed(1)} ${330},${(103+oy*0.6).toFixed(1)}" fill="none" stroke="var(--trace)" stroke-width="${gap<20?2:1.5}" stroke-dasharray="4 5"/>`;
      });
      attractLines.innerHTML = arcs;
    } else {
      attractLines.style.opacity = '0';
    }

    if(!balloonCharged){
      readout.textContent = 'Balloon: neutral. Slide it toward the wall — nothing happens yet.';
    } else if(repelling){
      readout.textContent = dist > 0.7
        ? 'Both negatively charged — like charges repel. The balloon won\'t get any closer, no matter how far you slide it.'
        : 'Balloon and wall both carry extra electrons (negative). Slide closer to feel them push apart.';
    } else if(gap < 20){
      readout.textContent = 'Contact! The charged balloon induces an opposite charge on the wall\'s surface and sticks — the classic "static cling."';
    } else if(gap < 90){
      readout.textContent = 'Getting close: the balloon\'s extra electrons repel the wall\'s surface electrons, leaving the near surface positive — opposite charges attract.';
    } else {
      readout.textContent = 'Balloon rubbed on hair: gained extra electrons, now negatively charged. Slide it toward the (neutral) wall.';
    }
  }

  function runRubAnimation(){
    if(rubbing) return;
    rubbing = true;
    rubBtn.disabled = true;
    balloonGroup.style.transition = 'transform .09s ease-in-out';
    hairStrands.style.transition = 'transform .09s ease-in-out';
    let step = 0;
    const totalSteps = 8;
    const wobble = setInterval(() => {
      step++;
      const dx = HEAD_X + (step % 2 === 0 ? -4 : 4);
      balloonGroup.setAttribute('transform', `translate(${dx},103)`);
      hairStrands.setAttribute('transform', step % 2 === 0 ? 'skewX(-6)' : 'skewX(6)');
      if(step >= totalSteps){
        clearInterval(wobble);
        hairStrands.setAttribute('transform', '');
        hairStrands.style.transition = 'transform .3s ease';
        balloonCharged = true;
        rubbing = false;
        rubBtn.disabled = false;
        render();
      }
    }, 80);
  }

  rubBtn.addEventListener('click', runRubAnimation);
  wallBtn.addEventListener('click', () => {
    if(!balloonCharged) return;
    wallCharged = !wallCharged;
    wallBtn.classList.toggle('active', wallCharged);
    render();
  });
  resetBtn.addEventListener('click', () => {
    balloonCharged = false; wallCharged = false; wallBtn.classList.remove('active');
    rubbing = false; rubBtn.disabled = false;
    hairStrands.setAttribute('transform', '');
    slider.value = 0; render();
  });
  slider.addEventListener('input', render);
  render();
})();

/* ===================== Toggle-switch keyboard support (generic) ===================== */
document.querySelectorAll('.toggle-switch[role="switch"]').forEach(el => {
  el.addEventListener('keydown', e => {
    if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); el.click(); }
  });
});

/* ===================== Electron flow tube ===================== */
(function(){
  const row = document.getElementById('electronRow');
  const sw = document.getElementById('tubeSwitch');
  const label = document.getElementById('tubeLabel');
  const glow = document.getElementById('tubePushGlow');
  if(!row) return;
  const spacing = 30;
  const startX = 40;
  const count = 11;
  const positions = Array.from({length:count}, (_,i) => startX + i*spacing);
  positions.forEach((x,i) => {
    const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx', x); c.setAttribute('cy', 35); c.setAttribute('r', 5);
    c.setAttribute('class','electron-dot'); c.setAttribute('id','edot'+i);
    row.appendChild(c);
  });

  let on = false;
  const STEP_MS = 90; // delay between each domino-effect nudge — visibly sequential, not instant

  function reset(dots){
    dots.forEach((d,i) => {
      d.setAttribute('cx', positions[i]);
      d.classList.remove('entering','exiting');
    });
  }

  sw.addEventListener('click', () => {
    if(on) return;
    on = true;
    sw.classList.add('on');
    sw.setAttribute('aria-pressed', 'true');
    label.textContent = 'Electron pushed in on the left — the chain reacts down the line';
    if(glow) glow.classList.add('active');
    const dots = [...row.querySelectorAll('circle')].sort((a,b) =>
      parseFloat(a.getAttribute('cx')) - parseFloat(b.getAttribute('cx')));

    dots[0].classList.add('entering');
    dots[dots.length-1].classList.add('exiting');

    dots.forEach((d,i) => {
      setTimeout(() => {
        d.setAttribute('cx', parseFloat(d.getAttribute('cx')) + spacing);
      }, i*STEP_MS);
    });

    const totalMs = (dots.length-1)*STEP_MS + 500;
    setTimeout(() => {
      label.textContent = 'A different electron popped out the right — almost instantly';
    }, totalMs - 300);

    setTimeout(() => {
      sw.classList.remove('on');
      sw.setAttribute('aria-pressed', 'false');
      if(glow) glow.classList.remove('active');
      label.textContent = 'Push electron in';
      reset(dots);
      on = false;
    }, totalMs + 900);
  });
})();

/* ===================== Circuit open/closed switch ===================== */
(function(){
  const sw = document.getElementById('circuitSwitch');
  const label = document.getElementById('circuitSwitchLabel');
  const open = document.getElementById('switchOpen');
  const closed = document.getElementById('switchClosed');
  const flow = document.getElementById('circuitFlow');
  if(!sw) return;
  let isOn = false;
  sw.addEventListener('click', () => {
    isOn = !isOn;
    sw.classList.toggle('on', isOn);
    open.style.display = isOn ? 'none' : '';
    closed.style.display = isOn ? '' : 'none';
    flow.style.opacity = isOn ? '1' : '0';
    label.textContent = isOn ? 'Circuit closed — current flows' : 'Circuit open — no current flows';
  });
})();

/* ===================== Scientific notation converter ===================== */
(function(){
  const val = document.getElementById('notationValue');
  const prefix = document.getElementById('notationPrefix');
  const out = document.getElementById('notationOut');
  if(!val) return;
  function update(){
    const v = parseFloat(val.value) || 0;
    const mult = parseFloat(prefix.value);
    const result = v * mult;
    out.textContent = result.toExponential(4).replace('e', ' × 10^').replace('+','') + '  (' + result.toString() + ')';
  }
  val.addEventListener('input', update);
  prefix.addEventListener('change', update);
  update();
})();

/* ===================== Capacitor charge/discharge sim ===================== */
(function(){
  const sw = document.getElementById('capSwitch');
  const label = document.getElementById('capSwitchLabel');
  const fill = document.getElementById('capBarFill');
  const percentText = document.getElementById('capPercentText');
  const flow = document.getElementById('capFlow');
  if(!sw) return;
  let charge = 0, target = 0, connected = false;
  const tau = 1.2; // seconds, simulated
  function tick(){
    const rate = 1/(tau*20);
    if(charge < target) charge = Math.min(target, charge + (target-charge)*rate + 0.002);
    else if(charge > target) charge = Math.max(target, charge - (charge-target)*rate - 0.002);
    fill.style.width = (charge*100).toFixed(0) + '%';
    percentText.textContent = (charge*100).toFixed(0) + '% charged';
    requestAnimationFrame(tick);
  }
  sw.addEventListener('click', () => {
    connected = !connected;
    sw.classList.toggle('on', connected);
    target = connected ? 1 : 0;
    flow.style.opacity = connected ? '1' : '0';
    label.textContent = connected ? 'Charging — click to disconnect' : 'Connect to charge';
  });
  tick();
})();

/* ===================== Electromagnet sim ===================== */
(function(){
  const slider = document.getElementById('magnetSlider');
  const readout = document.getElementById('magnetReadout');
  const coilLines = document.getElementById('coilLines');
  const fieldLines = document.getElementById('fieldLines');
  if(!slider) return;
  for(let i=0;i<6;i++){
    const y = 30 + i*13;
    const l = document.createElementNS('http://www.w3.org/2000/svg','line');
    l.setAttribute('x1',105); l.setAttribute('y1',y); l.setAttribute('x2',155); l.setAttribute('y2',y);
    l.setAttribute('stroke','#8B9AAB'); l.setAttribute('stroke-width','2');
    coilLines.appendChild(l);
  }
  function render(){
    const pct = parseFloat(slider.value)/100;
    readout.textContent = Math.round(pct*100) + '%';
    fieldLines.innerHTML = '';
    const count = Math.round(pct*5);
    for(let i=0;i<count;i++){
      const r = 20 + i*14;
      const e = document.createElementNS('http://www.w3.org/2000/svg','ellipse');
      e.setAttribute('cx',130); e.setAttribute('cy',70); e.setAttribute('rx', r); e.setAttribute('ry', r*0.65);
      e.setAttribute('fill','none'); e.setAttribute('stroke','var(--trace)'); e.setAttribute('stroke-width','1.5');
      e.setAttribute('opacity', (0.8 - i*0.12).toFixed(2));
      fieldLines.appendChild(e);
    }
    coilLines.querySelectorAll('line').forEach(l => {
      l.setAttribute('stroke', pct > 0.05 ? 'var(--copper)' : '#8B9AAB');
    });
  }
  slider.addEventListener('input', render);
  render();
})();

/* ===================== Circuit Playground ===================== */
(function(){
  const svg = document.getElementById('pgSvg');
  const board = document.getElementById('pgBoard');
  const partsG = document.getElementById('pgParts');
  const wiresG = document.getElementById('pgWires');
  const hintEl = document.getElementById('pgHint');
  const modeRow = document.getElementById('pgModeRow');
  const palette = document.getElementById('pgPalette');
  const resistorSub = document.getElementById('pgResistorSub');
  const ledSub = document.getElementById('pgLedSub');
  const vOut = document.getElementById('pgV');
  const rOut = document.getElementById('pgR');
  const iOut = document.getElementById('pgI');
  const statusEl = document.getElementById('pgStatus');
  const clearBtn = document.getElementById('pgClearBtn');
  const demoBtn = document.getElementById('pgDemoBtn');
  const infoPop = document.getElementById('pgInfoPop');
  const infoName = document.getElementById('pgInfoName');
  const infoBody = document.getElementById('pgInfoBody');
  if(!svg) return;

  // Each part has two terminals at fixed local offsets from its center — used both
  // for drawing the dots and for computing wire endpoints in board coordinates.
  const TERM_OFFSET = 26;
  const INFO = {
    battery:  { name:'Battery', body:'Provides the "push" — a voltage difference between its two terminals. This board treats every battery as 9V.' },
    resistor: { name:'Resistor', body:'Limits current flow. Higher ohms means less current for the same voltage — the main tool for keeping an LED safe.' },
    led:      { name:'LED', body:'A diode — current only flows one way, and it needs about 2V across it to light up. Too much current burns it out.' },
    switch:   { name:'Switch', body:'Opens or closes the path. Tap a placed switch directly to flip it on/off, in either mode.' },
    wire:     { name:'Wire link', body:'Zero resistance — just extends the path so you can route around the board.' },
  };

  let mode = 'build';               // 'build' | 'wire'
  let resistorVal = 220;
  let ledColor = 'red';
  let nextId = 1;
  const parts = [];                 // {id, type, x, y, value?, color?, closed?, burned?}
  const wires = [];                 // {id, a:{partId,term}, b:{partId,term}}
  let armedTerm = null;             // {partId, term} waiting for its pair, in wire mode
  let dragPartId = null;            // part currently being repositioned in build mode
  let dragOffset = {x:0, y:0};

  function svgPoint(clientX, clientY){
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const m = svg.getScreenCTM().inverse();
    const p = pt.matrixTransform(m);
    return {x:p.x, y:p.y};
  }
  function clampToBoard(x, y){
    return { x: Math.min(600, Math.max(40, x)), y: Math.min(280, Math.max(40, y)) };
  }
  function termPos(part, term){
    // horizontal-body parts: term 0 = left terminal, term 1 = right terminal
    return term === 0 ? {x:part.x - TERM_OFFSET, y:part.y} : {x:part.x + TERM_OFFSET, y:part.y};
  }
  function findPart(id){ return parts.find(p => p.id === id); }

  function setMode(next){
    mode = next;
    modeRow.querySelectorAll('.pg-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === next));
    board.classList.toggle('wire-mode', next === 'wire');
    armedTerm = null;
    hideInfo();
    draw();
  }
  modeRow.querySelectorAll('.pg-mode-btn').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));

  // ---------- Palette: drag a chip onto the board to place a new part ----------
  palette.querySelectorAll('.pg-chip').forEach(chip => {
    chip.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', chip.dataset.type);
      e.dataTransfer.effectAllowed = 'copy';
      chip.classList.add('dragging');
    });
    chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
  });
  board.addEventListener('dragover', e => { e.preventDefault(); board.classList.add('drag-over'); });
  board.addEventListener('dragleave', () => board.classList.remove('drag-over'));
  board.addEventListener('drop', e => {
    e.preventDefault();
    board.classList.remove('drag-over');
    const type = e.dataTransfer.getData('text/plain');
    if(!type) return;
    const p = clampToBoard(...Object.values(svgPoint(e.clientX, e.clientY)));
    addPart(type, p.x, p.y);
  });

  function addPart(type, x, y, overrides){
    const part = { id: nextId++, type, x, y };
    if(type === 'resistor') part.value = (overrides && overrides.value) || resistorVal;
    if(type === 'led'){ part.color = (overrides && overrides.color) || ledColor; part.burned = false; }
    if(type === 'switch') part.closed = true;
    parts.push(part);
    draw();
  }

  resistorSub.querySelectorAll('.pg-sub').forEach(btn => {
    btn.addEventListener('click', () => {
      resistorVal = parseInt(btn.dataset.val);
      resistorSub.querySelectorAll('.pg-sub').forEach(b => b.classList.toggle('active', b === btn));
    });
  });
  ledSub.querySelectorAll('.pg-sub').forEach(btn => {
    btn.addEventListener('click', () => {
      ledColor = btn.dataset.val;
      ledSub.querySelectorAll('.pg-sub').forEach(b => b.classList.toggle('active', b === btn));
    });
  });
  // The value sub-rows only matter while dragging a NEW chip; show them on chip hover/dragstart.
  palette.querySelector('[data-type="resistor"]').addEventListener('dragstart', () => { resistorSub.style.display = 'flex'; ledSub.style.display = 'none'; });
  palette.querySelector('[data-type="led"]').addEventListener('dragstart', () => { ledSub.style.display = 'flex'; resistorSub.style.display = 'none'; });

  function labelFor(part){
    if(part.type === 'wire') return 'wire';
    if(part.type === 'resistor') return part.value >= 1000 ? (part.value/1000)+'kΩ' : part.value+'Ω';
    if(part.type === 'led') return part.burned ? 'LED ✕' : (part.color === 'red' ? 'LED (R)' : 'LED (G)');
    if(part.type === 'switch') return part.closed ? 'SW: on' : 'SW: off';
    if(part.type === 'battery') return '9V';
    return '?';
  }
  function colorFor(part){
    if(part.type === 'led' && part.burned) return {fill:'#2A1616', stroke:'var(--danger)', text:'var(--danger)'};
    if(part.type === 'led') return {fill:'#1C2530', stroke: part.color === 'red' ? '#FF6B6B' : 'var(--trace)', text:'var(--text)'};
    if(part.type === 'switch') return {fill:'#1C2530', stroke: part.closed ? 'var(--trace-dim)' : '#2A3846', text:'var(--text)'};
    if(part.type === 'battery') return {fill:'#1C2530', stroke:'var(--copper)', text:'var(--copper)'};
    if(part.type === 'resistor') return {fill:'#1C2530', stroke:'var(--copper-dim)', text:'var(--text)'};
    return {fill:'#1C2530', stroke:'var(--trace-dim)', text:'var(--text)'}; // wire
  }

  function draw(){
    hintEl.style.display = parts.length ? 'none' : 'flex';

    // Wires first, so terminals draw on top
    wiresG.innerHTML = '';
    wires.forEach(w => {
      const pa = findPart(w.a.partId), pb = findPart(w.b.partId);
      if(!pa || !pb) return;
      const p1 = termPos(pa, w.a.term), p2 = termPos(pb, w.b.term);
      const mx = (p1.x + p2.x)/2;
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d', `M${p1.x},${p1.y} Q${mx},${(p1.y+p2.y)/2 + (Math.abs(p1.x-p2.x)<4 ? 0 : 0)} ${p2.x},${p2.y}`);
      path.setAttribute('class', 'pg-wire-line' + (w.live ? ' live' : ''));
      path.dataset.wireId = w.id;
      path.addEventListener('click', () => { wires.splice(wires.findIndex(x => x.id === w.id), 1); simulate(); });
      wiresG.appendChild(path);
    });

    partsG.innerHTML = '';
    parts.forEach(part => {
      const c = colorFor(part);
      const g = document.createElementNS('http://www.w3.org/2000/svg','g');
      g.setAttribute('transform', `translate(${part.x},${part.y})`);

      const body = document.createElementNS('http://www.w3.org/2000/svg','g');
      body.setAttribute('class', 'pg-part-body');
      body.innerHTML = `
        <rect x="-24" y="-14" width="48" height="28" rx="6" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.7"/>
        ${glyphFor(part, c)}
        <text x="0" y="21" text-anchor="middle" fill="${c.text}" font-family="JetBrains Mono" font-size="9" font-weight="600">${labelFor(part)}</text>
        ${part.type==='led' && !part.burned ? `<circle cx="0" cy="0" r="16" fill="${part.color==='red'?'#FF6B6B':'var(--trace)'}" opacity="0" data-glow="${part.id}"/>` : ''}
      `;
      attachPartBodyHandlers(body, part);
      g.appendChild(body);

      [0,1].forEach(term => {
        const tx = term === 0 ? -TERM_OFFSET : TERM_OFFSET;
        const dot = document.createElementNS('http://www.w3.org/2000/svg','g');
        dot.setAttribute('class', 'pg-terminal' + (armedTerm && armedTerm.partId===part.id && armedTerm.term===term ? ' armed' : ''));
        dot.setAttribute('transform', `translate(${tx},0)`);
        dot.innerHTML = `<circle r="5.5" fill="#151C24" stroke="${c.stroke}" stroke-width="1.7"/>`;
        dot.addEventListener('click', e => { e.stopPropagation(); onTerminalClick(part.id, term); });
        g.appendChild(dot);
      });

      partsG.appendChild(g);
    });
  }

  function glyphFor(part, c){
    // A small schematic-style glyph drawn inside each part body, so components read
    // at a glance instead of relying on the text label alone.
    if(part.type === 'resistor'){
      return `<path d="M-18,-2 L-12,-2 L-9,-9 L-3,5 L3,-9 L9,5 L12,-2 L18,-2" fill="none" stroke="${c.stroke}" stroke-width="1.6" stroke-linejoin="round" transform="translate(0,-4)"/>`;
    }
    if(part.type === 'led'){
      const glow = part.burned ? '' : `filter="drop-shadow(0 0 3px ${part.color==='red'?'#FF6B6B':'var(--trace)'})"`;
      return `<g transform="translate(0,-4)" ${glow}>
        <path d="M-8,-8 L-8,8 L8,0 Z" fill="${c.stroke}" stroke="${c.stroke}"/>
        <line x1="8" y1="-8" x2="8" y2="8" stroke="${c.stroke}" stroke-width="2"/>
      </g>`;
    }
    if(part.type === 'switch'){
      const angle = part.closed ? 0 : -28;
      return `<g transform="translate(0,-4)">
        <circle cx="-10" cy="0" r="2.2" fill="${c.stroke}"/>
        <circle cx="10" cy="0" r="2.2" fill="${c.stroke}"/>
        <line x1="-10" y1="0" x2="10" y2="0" stroke="${c.stroke}" stroke-width="1.6" transform="rotate(${angle} -10 0)"/>
      </g>`;
    }
    if(part.type === 'battery'){
      return `<g transform="translate(0,-4)">
        <line x1="-6" y1="-9" x2="-6" y2="9" stroke="${c.stroke}" stroke-width="2.5"/>
        <line x1="4" y1="-5" x2="4" y2="5" stroke="${c.stroke}" stroke-width="1.4"/>
        <text x="-14" y="-10" fill="${c.stroke}" font-family="JetBrains Mono" font-size="8" font-weight="700">+</text>
        <text x="10" y="-10" fill="${c.stroke}" font-family="JetBrains Mono" font-size="8" font-weight="700">−</text>
      </g>`;
    }
    // wire
    return `<line x1="-16" y1="-4" x2="16" y2="-4" stroke="${c.stroke}" stroke-width="1.6" stroke-dasharray="3 3"/>`;
  }

  function attachPartBodyHandlers(body, part){
    // Build mode: drag to move, or click (no movement) to open the info popover.
    // Wire mode: clicking the body is ignored — only terminals respond — except a
    // switch, which always toggles regardless of mode since it's a live control, not a node.
    let moved = false;
    body.addEventListener('pointerdown', e => {
      if(mode !== 'build') return;
      moved = false;
      dragPartId = part.id;
      const sp = svgPoint(e.clientX, e.clientY);
      dragOffset = { x: sp.x - part.x, y: sp.y - part.y };
      body.classList.add('placing');
      e.stopPropagation();
    });
    body.addEventListener('click', e => {
      e.stopPropagation();
      if(part.type === 'switch'){ part.closed = !part.closed; simulate(); return; }
      if(mode === 'build' && !moved) showInfo(part, e.clientX, e.clientY);
    });
    body.__markMoved = () => { moved = true; };
  }

  svg.addEventListener('pointermove', e => {
    if(dragPartId == null) return;
    const part = findPart(dragPartId);
    if(!part) return;
    const sp = svgPoint(e.clientX, e.clientY);
    const p = clampToBoard(sp.x - dragOffset.x, sp.y - dragOffset.y);
    if(Math.abs(p.x - part.x) > 1 || Math.abs(p.y - part.y) > 1){
      part.x = p.x; part.y = p.y;
      hideInfo();
      draw();
    }
  });
  window.addEventListener('pointerup', () => {
    if(dragPartId != null){
      const g = partsG.querySelector('.pg-part-body.placing');
      if(g) g.classList.remove('placing');
    }
    dragPartId = null;
  });

  function onTerminalClick(partId, term){
    if(mode !== 'wire') return;
    if(!armedTerm){ armedTerm = {partId, term}; draw(); return; }
    if(armedTerm.partId === partId && armedTerm.term === term){ armedTerm = null; draw(); return; } // tap same terminal again = cancel
    // A terminal can only host one wire — remove any existing wire touching either end first.
    const touches = (t) => wires.filter(w =>
      (w.a.partId===t.partId && w.a.term===t.term) || (w.b.partId===t.partId && w.b.term===t.term));
    touches(armedTerm).forEach(w => wires.splice(wires.indexOf(w), 1));
    touches({partId, term}).forEach(w => wires.splice(wires.indexOf(w), 1));
    wires.push({ id: nextId++, a: armedTerm, b: {partId, term} });
    armedTerm = null;
    simulate();
  }

  function showInfo(part, clientX, clientY){
    const meta = INFO[part.type];
    if(!meta) return;
    infoName.textContent = meta.name;
    infoBody.textContent = meta.body;
    const boardRect = board.getBoundingClientRect();
    let left = clientX - boardRect.left + 12;
    let top = clientY - boardRect.top - 10;
    left = Math.min(left, boardRect.width - 232);
    infoPop.style.left = left + 'px';
    infoPop.style.top = Math.max(8, top) + 'px';
    infoPop.classList.add('show');
  }
  function hideInfo(){ infoPop.classList.remove('show'); }
  board.addEventListener('click', hideInfo); // clicking empty board space dismisses the popover

  // ---------- Loop detection ----------
  // A part only participates electrically once BOTH its terminals are wired, and the
  // whole board must resolve to exactly one closed loop — no branches, no dead ends.
  // This mirrors "open circuit" from chapter 3 rather than silently ignoring stray parts.
  function analyzeLoop(){
    if(parts.length === 0) return {ok:false, reason:'empty'};
    const degree = new Map(); // `${partId}:${term}` -> wire count touching this terminal
    parts.forEach(p => { degree.set(`${p.id}:0`, 0); degree.set(`${p.id}:1`, 0); });
    wires.forEach(w => {
      degree.set(`${w.a.partId}:${w.a.term}`, (degree.get(`${w.a.partId}:${w.a.term}`)||0) + 1);
      degree.set(`${w.b.partId}:${w.b.term}`, (degree.get(`${w.b.partId}:${w.b.term}`)||0) + 1);
    });
    const unwired = [...degree.entries()].filter(([,d]) => d === 0).length;
    const overwired = [...degree.entries()].filter(([,d]) => d > 1).length;
    if(unwired > 0) return {ok:false, reason:'unwired', count: unwired};
    if(overwired > 0) return {ok:false, reason:'branch'};

    // Walk the ring starting from part 0's terminal 0; a valid loop visits every part exactly once.
    const visitedParts = new Set();
    let curPartId = parts[0].id, curTerm = 0, steps = 0;
    const maxSteps = parts.length * 2 + 2;
    while(steps++ < maxSteps){
      visitedParts.add(curPartId);
      const otherTerm = curTerm === 0 ? 1 : 0;
      const w = wires.find(w =>
        (w.a.partId===curPartId && w.a.term===otherTerm) || (w.b.partId===curPartId && w.b.term===otherTerm));
      if(!w) return {ok:false, reason:'unwired', count:1};
      const next = (w.a.partId===curPartId && w.a.term===otherTerm) ? w.b : w.a;
      if(next.partId === parts[0].id && visitedParts.size === parts.length) return {ok:true};
      if(visitedParts.has(next.partId)) return {ok:false, reason:'branch'};
      curPartId = next.partId; curTerm = next.term;
    }
    return {ok:false, reason:'branch'};
  }

  function markWiresLive(isLive){
    wires.forEach(w => w.live = isLive);
    wiresG.querySelectorAll('.pg-wire-line').forEach(el => el.classList.toggle('live', isLive));
  }

  function simulate(){
    draw();
    const loop = analyzeLoop();
    let totalV = 0, resistiveSum = 0, ledDrop = 0, ledParts = [], anyOpenSwitch = false;
    parts.forEach(part => {
      if(part.type === 'battery') totalV += 9;
      else if(part.type === 'resistor') resistiveSum += part.value;
      else if(part.type === 'switch'){ if(!part.closed) anyOpenSwitch = true; }
      else if(part.type === 'led'){ ledDrop += 2; ledParts.push(part); }
    });

    vOut.textContent = totalV.toFixed(1) + ' V';
    rOut.textContent = loop.ok ? resistiveSum.toLocaleString() + ' Ω' : '— Ω';

    if(!loop.ok){
      iOut.textContent = '0 mA';
      markWiresLive(false);
      statusEl.className = 'pg-status';
      if(loop.reason === 'empty') statusEl.textContent = 'Drag a part onto the board to begin.';
      else if(loop.reason === 'unwired') statusEl.textContent = `Circuit open — ${loop.count} terminal${loop.count>1?'s':''} still unconnected. Switch to Wire mode and connect every terminal into one loop.`;
      else statusEl.textContent = 'That\'s a branch, not a single loop — this board only simulates one continuous path. Remove a wire so every part has exactly one path in and one out.';
      return;
    }
    if(anyOpenSwitch){
      iOut.textContent = '0 mA';
      markWiresLive(false);
      statusEl.className = 'pg-status';
      statusEl.textContent = 'Circuit open — a switch is off. Tap it to close the loop.';
      return;
    }
    if(totalV === 0){
      iOut.textContent = '0 mA';
      markWiresLive(false);
      statusEl.className = 'pg-status warn';
      statusEl.textContent = 'Loop is complete, but there\'s no battery in it — nothing to push the current.';
      return;
    }
    const availableV = totalV - ledDrop;
    if(ledParts.length && availableV <= 0){
      iOut.textContent = '0 mA';
      markWiresLive(false);
      statusEl.className = 'pg-status warn';
      statusEl.textContent = `Not enough voltage — the LED${ledParts.length>1?'s':''} need${ledParts.length>1?'':'s'} ~${ledDrop}V but the battery only supplies ${totalV}V.`;
      return;
    }
    if(resistiveSum === 0){
      markWiresLive(true);
      if(ledParts.length){
        ledParts.forEach(p => p.burned = true);
        draw();
        iOut.textContent = '∞ (unsafe)';
        statusEl.className = 'pg-status danger';
        statusEl.textContent = '💥 Short circuit — no resistor to limit current. The LED burned out. Erase it and add a resistor before replacing it.';
      } else {
        iOut.textContent = '∞ (unsafe)';
        statusEl.className = 'pg-status danger';
        statusEl.textContent = '⚠ Short circuit! Zero resistance in the loop — a real battery would overheat here. Add a resistor.';
      }
      return;
    }
    const currentA = availableV / resistiveSum;
    const currentMA = currentA * 1000;
    iOut.textContent = currentMA.toFixed(1) + ' mA';
    markWiresLive(true);

    if(ledParts.length && currentMA > 30){
      ledParts.forEach(p => p.burned = true);
      draw();
      statusEl.className = 'pg-status danger';
      statusEl.textContent = `💥 ${currentMA.toFixed(0)}mA is too much for an LED (safe is ~20mA). It burned out — try a bigger resistor.`;
    } else if(ledParts.length){
      ledParts.forEach(p => {
        const glow = partsG.querySelector(`[data-glow="${p.id}"]`);
        if(glow) glow.setAttribute('opacity', Math.min(1, currentMA/20).toFixed(2));
      });
      statusEl.className = 'pg-status ok';
      statusEl.textContent = currentMA < 5
        ? `✓ ${currentMA.toFixed(1)}mA flowing — the LED will glow dimly. Try a smaller resistor for more brightness.`
        : `✓ ${currentMA.toFixed(1)}mA flowing — safely within LED range. Nice.`;
    } else {
      statusEl.className = 'pg-status ok';
      statusEl.textContent = `✓ ${currentMA.toFixed(1)}mA flowing through the loop.`;
    }
  }

  clearBtn.addEventListener('click', () => {
    parts.length = 0; wires.length = 0; armedTerm = null;
    simulate();
  });
  demoBtn.addEventListener('click', () => {
    parts.length = 0; wires.length = 0; armedTerm = null;
    addPart('battery', 120, 90);
    addPart('resistor', 260, 90, {value: 1000}); // 1kΩ regardless of the picker — always lands as a working glow, not a burnout
    addPart('led', 400, 90, {color: 'red'});
    addPart('switch', 400, 200);
    const [bat, res, led, sw] = parts;
    wires.push({id:nextId++, a:{partId:bat.id,term:1}, b:{partId:res.id,term:0}});
    wires.push({id:nextId++, a:{partId:res.id,term:1}, b:{partId:led.id,term:0}});
    wires.push({id:nextId++, a:{partId:led.id,term:1}, b:{partId:sw.id,term:1}});
    wires.push({id:nextId++, a:{partId:sw.id,term:0}, b:{partId:bat.id,term:0}});
    simulate();
  });

  setMode('build');
  simulate();
})();

/* ===================== Flashcards (spaced repetition) ===================== */
(function(){
  const dueCountEl = document.getElementById('fcDueCount');
  const totalCountEl = document.getElementById('fcTotalCount');
  const masteredCountEl = document.getElementById('fcMasteredCount');
  const progressFill = document.getElementById('fcProgressFill');
  const activeArea = document.getElementById('fcActiveArea');
  const emptyArea = document.getElementById('fcEmptyArea');
  const cardEl = document.getElementById('fcCard');
  const frontTag = document.getElementById('fcFrontTag');
  const frontText = document.getElementById('fcFrontText');
  const backTag = document.getElementById('fcBackTag');
  const backText = document.getElementById('fcBackText');
  const rateRow = document.getElementById('fcRateRow');
  const reviewAnywayBtn = document.getElementById('fcReviewAnywayBtn');
  const resetProgressBtn = document.getElementById('fcResetProgressBtn');
  if(!cardEl) return;

  const DECK = [
    {tag:'Static electricity', q:'What is static electricity, physically?', a:'An imbalance of charge on a surface, created when electrons transfer between two materials by friction or contact.'},
    {tag:'Static electricity', q:'Like charges do what? Opposite charges do what?', a:'Like charges repel each other; opposite charges attract each other.'},
    {tag:'Conductors', q:'What makes a material a good conductor?', a:'Its outer electrons are loosely bound and move freely between atoms — true of most metals.'},
    {tag:'Conductors', q:'What makes a material a good insulator?', a:'Its electrons are tightly bound to their atoms and don\'t move easily — e.g. rubber, glass, plastic.'},
    {tag:'Circuits', q:'What three things does every working circuit need?', a:'A source (provides the push), a path (a conductor), and a load (uses the energy).'},
    {tag:'Circuits', q:'What is an open circuit?', a:'A circuit whose loop is broken somewhere, so no current can flow at all.'},
    {tag:'Voltage & current', q:'Define voltage.', a:'The "electrical pressure" pushing current through a circuit, measured in volts.'},
    {tag:'Voltage & current', q:'Define current.', a:'The rate of flow of electric charge, measured in amps (A) or milliamps (mA).'},
    {tag:'Resistance', q:'Define resistance.', a:'How much a material restricts current flow, measured in ohms (Ω).'},
    {tag:'Resistance', q:'What four factors affect a wire\'s resistance?', a:'Material, length, cross-sectional area (thickness), and temperature.'},
    {tag:"Ohm's law", q:"State Ohm's law.", a:'V = I × R (voltage equals current times resistance). Rearranged: I = V/R, R = V/I.'},
    {tag:'Series & parallel', q:'In series circuits, what stays the same through every part?', a:'Current — there\'s only one path, so the same current flows through everything in the chain.'},
    {tag:'Series & parallel', q:'In parallel circuits, what stays the same across every branch?', a:'Voltage — every branch connects across the same two points.'},
    {tag:"Kirchhoff's laws", q:"State Kirchhoff's Current Law.", a:'At any junction, total current flowing in equals total current flowing out.'},
    {tag:"Kirchhoff's laws", q:"State Kirchhoff's Voltage Law.", a:'Around any closed loop, the sum of voltage rises equals the sum of voltage drops (they balance to zero).'},
    {tag:'Flow direction', q:'What\'s the difference between conventional current and electron flow?', a:'Conventional current is defined as + to −; electrons (what actually moves) flow − to +. Same math, opposite labeled direction.'},
    {tag:'Safety', q:'Why is current, not voltage, the real danger in a shock?', a:'Current is what actually causes physiological harm — a high-voltage static shock with tiny current is usually harmless.'},
    {tag:'Safety', q:'Why can a capacitor still shock you after power is removed?', a:'Capacitors store charge and can retain it for minutes or hours after the source is disconnected.'},
    {tag:'Scientific notation', q:'What does the "k" prefix mean? "µ"? "M"? "p"?', a:'k = kilo (×1,000), µ = micro (×10⁻⁶), M = mega (×1,000,000), p = pico (×10⁻¹²).'},
    {tag:'Resistor colors', q:'What does a 4-band resistor color code encode?', a:'Two significant digits, a multiplier, and a tolerance — giving the resistance value in ohms.'},
    {tag:'Resistor colors', q:'Why does an LED need a series resistor?', a:'To limit current to a safe range — without one, near-zero resistance lets current spike and burn it out.'},
    {tag:'Capacitors', q:'What is a capacitor and what unit is it measured in?', a:'Two conductive plates separated by an insulator, storing charge — measured in farads (usually µF, nF, or pF).'},
    {tag:'Capacitors', q:'What is the RC time constant formula, and what does it tell you?', a:'τ = R × C. After 1τ a capacitor is ~63% charged; after 5τ it\'s essentially fully charged.'},
    {tag:'Magnetism', q:'What creates a magnetic field around a wire?', a:'Any current flowing through it — this current-to-magnetism link is called electromagnetism.'},
    {tag:'Inductors', q:'What does an inductor mainly oppose?', a:'Changes in current (not current itself, like a resistor does) — it stores/releases energy in a magnetic field.'},
    {tag:'Microcontrollers', q:'What does Arduino\'s setup() do? What does loop() do?', a:'setup() runs once at power-on for configuration; loop() repeats forever — the core pattern of every sketch.'},
    {tag:'Microcontrollers', q:'What\'s the key difference between Arduino and Raspberry Pi?', a:'Arduino runs one program directly on the chip with no OS; Raspberry Pi is a full multitasking computer running Linux.'},
    {tag:'Soldering', q:'Why heat the joint itself, not just the solder?', a:'Heating the actual metal being joined lets solder flow into a proper bond, instead of forming a weak "cold joint."'},
    {tag:'Troubleshooting', q:'What\'s the first step when troubleshooting a dead circuit?', a:'Confirm power is actually reaching the board — it rules out the most common cause of all before touching anything else.'},
    {tag:'Troubleshooting', q:'When should you measure resistance with a multimeter?', a:'Only with power disconnected from the circuit — measuring live gives bad readings and can damage the meter.'},
    {tag:'Binary', q:'How many values can an 8-bit byte represent?', a:'256 values (0 to 255) — 2 to the power of 8.'},
    {tag:'Logic gates', q:'What does an AND gate output, and when?', a:'Outputs 1 only when every input is 1 — like switches in series, all must close.'},
    {tag:'Logic gates', q:'What does XOR output, and when?', a:'Outputs 1 only when its inputs differ from each other.'},
    {tag:'Half-adder', q:'Which two gates make a half-adder, and what does each produce?', a:'XOR produces the SUM bit; AND produces the CARRY bit.'},
    {tag:'C++ basics', q:'What\'s the difference between int, byte, and float in Arduino C++?', a:'int holds whole numbers (~2 bytes); byte holds only 0–255 (1 byte); float holds decimals (4 bytes).'},
    {tag:'Digital I/O', q:'Why use INPUT_PULLUP for a button instead of INPUT?', a:'It holds the pin reliably HIGH by default, avoiding a floating pin that reads random noise.'},
    {tag:'Digital I/O', q:'What is switch bounce, and how do you fix it in code?', a:'Mechanical contacts flicker before settling; fix it by ignoring changes that happen too soon after the last one, using millis().'},
    {tag:'Serial', q:'What does Serial.begin(9600) set up?', a:'Opens serial communication at 9600 baud — both board and monitor must use the same rate.'},
    {tag:'Shift registers', q:'What problem do shift registers solve?', a:'They let a few microcontroller pins control many outputs, by sending bits in serially and presenting them in parallel.'},
    {tag:'PWM', q:'What does PWM vary to simulate a dimmer brightness?', a:'The duty cycle — the percentage of time each cycle spends HIGH versus LOW.'},
    {tag:'Interrupts', q:'Why might polling in loop() miss an event that an interrupt would catch?', a:'Polling only checks at the instant it runs; if loop() is busy (e.g. in a delay()), the event goes unnoticed. An interrupt fires immediately regardless.'},
    {tag:'State machines', q:'What are the three core pieces of a finite state machine?', a:'A set of named states, rules for what triggers moving between them, and behavior tied to being in each state.'},
  ];

  const STORAGE_KEY = 'benchOneFlashcardState_v1';
  let storageAvailable = true;
  try {
    const t = '__bo_test__';
    localStorage.setItem(t, '1');
    localStorage.removeItem(t);
  } catch(e){ storageAvailable = false; }
  let memoryStore = null;
  function loadState(){
    if(!storageAvailable) return memoryStore;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw) return JSON.parse(raw);
    } catch(e){ /* corrupt data — fall back to fresh state */ }
    return null;
  }
  function saveState(state){
    memoryStore = state;
    if(!storageAvailable) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch(e){ storageAvailable = false; }
  }
  let state = loadState();
  if(!state || !state.cards){
    state = { cards: DECK.map(() => ({box:1, due:0})) };
    saveState(state);
  }
  // guard against deck length changes between edits
  while(state.cards.length < DECK.length) state.cards.push({box:1, due:0});

  const INTERVAL_DAYS = {1:0, 2:1, 3:3, 4:7, 5:16};
  const DAY = 24*60*60*1000;

  let queue = [];
  let currentIdx = null;
  let reviewAnywayMode = false;

  function buildQueue(){
    const now = Date.now();
    queue = DECK.map((_, i) => i).filter(i => reviewAnywayMode || state.cards[i].due <= now);
    // shuffle
    for(let i=queue.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [queue[i],queue[j]]=[queue[j],queue[i]]; }
  }

  function updateStats(){
    const now = Date.now();
    const dueNow = state.cards.filter(c => c.due <= now).length;
    const mastered = state.cards.filter(c => c.box >= 5).length;
    dueCountEl.textContent = dueNow;
    totalCountEl.textContent = DECK.length;
    masteredCountEl.textContent = mastered;
  }

  function showCard(){
    if(currentIdx === null){
      activeArea.style.display = 'none';
      emptyArea.style.display = 'block';
      return;
    }
    activeArea.style.display = 'block';
    emptyArea.style.display = 'none';
    cardEl.classList.remove('flipped');
    rateRow.style.visibility = 'hidden';
    const card = DECK[currentIdx];
    frontTag.textContent = card.tag;
    frontText.textContent = card.q;
    backTag.textContent = 'Answer';
    backText.textContent = card.a;
    const totalInSession = queue.length + 1;
    const doneInSession = totalInSession - queue.length - 1;
    progressFill.style.width = Math.max(4, 100 - (queue.length/(Math.max(1,totalInSession)))*100) + '%';
  }

  function nextCard(){
    if(queue.length === 0){ buildQueue(); }
    if(queue.length === 0){ currentIdx = null; updateStats(); showCard(); return; }
    currentIdx = queue.shift();
    updateStats();
    showCard();
  }

  cardEl.addEventListener('click', () => {
    if(currentIdx === null) return;
    const flipping = !cardEl.classList.contains('flipped');
    cardEl.classList.toggle('flipped');
    rateRow.style.visibility = flipping ? 'visible' : 'hidden';
  });

  rateRow.querySelectorAll('.fc-rate-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if(currentIdx === null) return;
      const rating = parseInt(btn.dataset.r);
      const c = state.cards[currentIdx];
      if(rating === 1){ c.box = 1; queue.push(currentIdx); }  // re-queue same session
      else if(rating === 2){ c.box = Math.max(1, c.box); c.due = Date.now() + Math.max(1,INTERVAL_DAYS[c.box])*DAY*0.5; }
      else if(rating === 3){ c.box = Math.min(5, c.box+1); c.due = Date.now() + INTERVAL_DAYS[c.box]*DAY; }
      else if(rating === 4){ c.box = Math.min(5, c.box+2); c.due = Date.now() + INTERVAL_DAYS[c.box]*DAY*1.3; }
      saveState(state);
      nextCard();
    });
  });

  reviewAnywayBtn.addEventListener('click', () => { reviewAnywayMode = true; nextCard(); });
  resetProgressBtn.addEventListener('click', () => {
    state = { cards: DECK.map(() => ({box:1, due:0})) };
    saveState(state);
    reviewAnywayMode = false;
    nextCard();
  });

  buildQueue();
  nextCard();
})();

/* ===================== Mini end-of-chapter quizzes ===================== */
const miniQuizData = {
  static: [
    { q:"Rubbing a balloon on your hair transfers...", opts:["Protons","Electrons","Neutrons","Nothing — it's magnetism"], correct:1, explain:"Electrons move between surfaces during friction; protons stay locked in the nucleus." },
    { q:"An object with extra electrons is...", opts:["Positively charged","Negatively charged","Neutral","Radioactive"], correct:1, explain:"Extra electrons means more negative charge than positive — net negative." },
  ],
  conductors: [
    { q:"Why is copper used for wiring?", opts:["It's cheap and colorful","Its outer electrons move freely","It's a strong insulator","It never gets hot"], correct:1, explain:"Metals like copper have loosely-held outer electrons, making them excellent conductors." },
    { q:"The marble-tube analogy explains why...", opts:["Electrons travel at light speed individually","A push transmits through a wire almost instantly, even though drift is slow","Wires need to be cooled","Conductors block current"], correct:1, explain:"The electric field pushes through near light-speed; any one electron drifts comparatively slowly." },
  ],
  circuitdef: [
    { q:"Which three things does every working circuit need?", opts:["Source, path, load","Battery, LED, resistor only","Voltage, current, ohms","Switch, wire, ground"], correct:0, explain:"A source (push), a path (conductor), and a load (something using the energy)." },
    { q:"An open circuit means...", opts:["Maximum current is flowing","The loop is broken — no current flows","The battery is fully charged","Nothing, it's a synonym for closed"], correct:1, explain:"Open = the loop isn't complete, so no current can flow anywhere in it." },
  ],
  fundamentals: [
    { q:"Voltage is best compared to...", opts:["Water flow rate","Water pressure","Pipe width","Water temperature"], correct:1, explain:"Voltage is the 'push' — like pressure driving water through a pipe." },
    { q:"What does DC stand for, and what does it mean?", opts:["Direct Current — flows one direction, steady","Dual Current — flows both ways at once","Digital Current — used in computers only","Delayed Current — arrives late"], correct:0, explain:"DC flows in a single direction at a steady level, like a battery." },
  ],
  resistance: [
    { q:"A longer wire has...", opts:["Less resistance","More resistance","The same resistance as any length","No resistance at all"], correct:1, explain:"Resistance scales with length — twice the wire, twice the resistance." },
    { q:"Conductance is...", opts:["The same thing as voltage","The inverse of resistance (1/R)","Only relevant in AC circuits","Measured in ohms"], correct:1, explain:"Conductance (siemens) is 1/R — high resistance means low conductance." },
  ],
  practical: [
    { q:"Why does an LED need a series resistor?", opts:["To make it brighter","To limit current so it doesn't burn out","To reverse its polarity","It doesn't — it's optional decoration"], correct:1, explain:"Without a resistor, near-zero circuit resistance lets current spike dangerously high." },
    { q:"In a 9V–resistor–2V LED loop, how much voltage does the resistor drop?", opts:["9V","2V","7V","11V"], correct:2, explain:"The LED takes 2V, leaving 9V − 2V = 7V for the resistor to drop." },
  ],
  flowdir: [
    { q:"Conventional current is defined as flowing from...", opts:["− to +","+ to −","Neither — it doesn't move","Only during AC"], correct:1, explain:"Conventional current flows + to − by (historical) definition." },
    { q:"Does using conventional vs. electron flow change the math?", opts:["Yes, formulas differ", "No — same answers, just a labeling convention", "Only for AC circuits", "Only for capacitors"], correct:1, explain:"It's a direction convention, not a physics disagreement — every formula still works." },
  ],
  circuits: [
    { q:"In a series circuit, what's the same through every component?", opts:["Voltage","Current","Power","Nothing is the same"], correct:1, explain:"One path means the same current flows through every component in the chain." },
    { q:"In a parallel circuit, what's the same across every branch?", opts:["Current","Voltage","Resistance","Total power"], correct:1, explain:"Every branch connects across the same two points, so they all see the same voltage." },
  ],
  seriesparallel: [
    { q:"To solve a series-parallel circuit, the general strategy is to...", opts:["Guess and check", "Find pure series or parallel groups and reduce them to single equivalent resistors, one step at a time", "Always assume it's fully parallel", "Ignore the parallel parts"], correct:1, explain:"Collapse the circuit gradually: combine a purely series or purely parallel group into one resistance, redraw, and repeat until only one resistor remains." },
    { q:"If a resistor in a parallel group fails open, what happens to that group's resistance?", opts:["It drops to zero","It rises, since one path is now removed","It stays exactly the same","The whole circuit stops working"], correct:1, explain:"Removing a parallel branch leaves fewer paths for current, so the group's overall resistance goes up." },
  ],
  kirchhoff: [
    { q:"Kirchhoff's Current Law says that at a junction...", opts:["Voltage in equals voltage out","Current in equals current out","Resistance is zero","Power is conserved but current isn't"], correct:1, explain:"Charge can't pile up at a junction — total current in equals total current out." },
    { q:"Kirchhoff's Voltage Law says that around a closed loop...", opts:["Voltages add up to zero","Current is always maximum","Resistance cancels out","Only the largest resistor matters"], correct:0, explain:"Sum of rises equals sum of drops — the loop's voltages balance to zero." },
  ],
  dividers: [
    { q:"In a voltage divider, a resistor's share of the total voltage is proportional to...", opts:["Its own resistance divided by the total resistance","The current through it alone","The total voltage only","Nothing — every resistor gets equal voltage"], correct:0, explain:"Vx = Vtotal × (Rx / Rtotal) — a bigger share of the total resistance means a bigger share of the total voltage." },
    { q:"In a current divider, which branch carries more current?", opts:["The one with more resistance","The one with less resistance","Both always carry equal current","Whichever is closer to the battery"], correct:1, explain:"Current takes the path of least resistance — the lower-resistance branch gets the larger share of current." },
  ],
  safety: [
    { q:"What actually causes injury in a shock?", opts:["Voltage alone","Current through the body","Wire color","Resistance alone"], correct:1, explain:"Current — not voltage by itself — is what causes physiological harm." },
    { q:"Why can a capacitor still shock you after power is off?", opts:["It generates its own new power","It can still hold stored charge","Capacitors are always dangerous","This is a myth"], correct:1, explain:"Capacitors store charge and can retain it well after the source is disconnected." },
  ],
  scinotation: [
    { q:"4.7k on a resistor means:", opts:["4.7 Ω","470 Ω","4,700 Ω","47,000 Ω"], correct:2, explain:"'k' is kilo, ×1000 — so 4.7k = 4,700 ohms." },
    { q:"Which prefix is smaller: µ (micro) or n (nano)?", opts:["µ is smaller","n is smaller","They're equal","Neither is a real prefix"], correct:1, explain:"nano (10⁻⁹) is a thousand times smaller than micro (10⁻⁶)." },
  ],
  ohmslaw: [
    { q:"Ohm's law is written as:", opts:["V = I + R","V = I × R","V = R / I","I = V + R"], correct:1, explain:"V = I × R. Rearranged: I = V/R and R = V/I." },
    { q:"If R stays fixed and V increases, what happens to I?", opts:["I increases","I decreases","I stays the same","I becomes negative"], correct:0, explain:"I = V/R — with R constant, more voltage means proportionally more current." },
  ],
  power: [
    { q:"Power is calculated as:", opts:["P = I + V","P = I × V","P = V / I","P = I − V"], correct:1, explain:"P = I × V. Combined with Ohm's law this also gives P = I²R and P = V²/R." },
    { q:"A resistor rated ¼W is dissipating 0.4W. What happens?", opts:["Nothing, it's fine","It's over its rating and may overheat or fail","It becomes a better conductor","It stores the extra energy"], correct:1, explain:"Exceeding a resistor's power rating causes overheating, value drift, or outright failure — you'd need a higher-wattage part." },
  ],
  library: [
    { q:"Why does an LED have a longer and a shorter leg?", opts:["Style only","To mark polarity — current flows one way","For higher voltage","No functional meaning"], correct:1, explain:"LEDs are diodes — current only flows one direction; the longer leg is positive." },
    { q:"A breadboard is mainly used for...", opts:["Measuring voltage","Prototyping circuits without soldering","Storing charge","Generating current"], correct:1, explain:"Breadboards let you build and rewire circuits quickly, with no permanent joints." },
  ],
  meters: [
    { q:"How should an ammeter be connected to measure current?", opts:["In parallel across the component","In series, breaking the circuit to insert it","It doesn't matter","Only across the battery terminals"], correct:1, explain:"An ammeter must be in series so all the circuit's current is forced through it — wiring it in parallel by mistake can blow its fuse." },
    { q:"Why should you only use an ohmmeter on an unpowered circuit?", opts:["It looks nicer that way","It pushes its own small current through the component, which a live circuit would interfere with","Ohmmeters don't work at all otherwise","There's no real reason"], correct:1, explain:"An ohmmeter measures resistance by applying its own known current — testing on a powered circuit gives a meaningless reading and can damage the meter." },
  ],
  resistors: [
    { q:"What does a resistor's color code tell you?", opts:["Physical size","Resistance value and tolerance","Power rating only","Current direction"], correct:1, explain:"The bands encode significant digits, a multiplier, and a tolerance." },
    { q:"A gold 4th band means:", opts:["±1% tolerance","±5% tolerance","±10% tolerance","No tolerance info"], correct:1, explain:"Gold is the standard color for ±5% tolerance." },
  ],
  capacitors: [
    { q:"A capacitor stores energy in...", opts:["A chemical reaction","An electric field between two plates","A magnetic field","A spinning motor"], correct:1, explain:"Two conductive plates separated by a dielectric build up charge — an electric field." },
    { q:"After 1 time constant (τ), a charging capacitor reaches about:", opts:["10%","37%","63%","100%"], correct:2, explain:"1τ = ~63% charged; 5τ is considered essentially fully charged." },
  ],
  magnetism: [
    { q:"What creates a magnetic field around a wire?", opts:["Voltage alone","Current flowing through it","Resistance","Capacitance"], correct:1, explain:"Any current-carrying wire generates a magnetic field — the basis of electromagnetism." },
    { q:"An inductor mainly opposes...", opts:["Current itself, like a resistor","Changes in current","Static charge","Nothing — it's just a wire"], correct:1, explain:"Inductors resist sudden changes in current, storing/releasing energy in a magnetic field." },
  ],
  microcontrollers: [
    { q:"What does Arduino's setup() function do?", opts:["Runs forever in a loop","Runs once at power-on","Only runs on button press","Deletes the program"], correct:1, explain:"setup() runs a single time at power-on/reset — ideal for one-time configuration." },
    { q:"A Raspberry Pi differs from an Arduino because it...", opts:["Can't run any code","Is a full computer running an OS like Linux","Only works with LEDs","Has no GPIO pins"], correct:1, explain:"A Pi is a tiny multitasking computer; an Arduino runs one program directly on the chip." },
  ],
  soldering: [
    { q:"Why heat the joint, not just the solder?", opts:["It looks better","Creates a strong, clean electrical connection","It's faster","Uses less solder"], correct:1, explain:"Heating the metal being joined lets solder flow into a proper bond, not sit as a cold joint." },
    { q:"A good solder joint looks like:", opts:["A dull grey blob","A shiny, smooth volcano cone","A giant ball of solder","Exactly like the wire underneath, invisible"], correct:1, explain:"Shiny and cone-shaped means the joint formed cleanly; dull/blobby usually means a cold joint." },
  ],
  troubleshoot: [
    { q:"First troubleshooting step for a dead circuit?", opts:["Replace all components","Confirm power is reaching the board","Resolder everything","Buy a new breadboard"], correct:1, explain:"Confirming live power rules out the single most common cause before touching anything else." },
    { q:"When should you measure resistance (Ω) with a multimeter?", opts:["Anytime, power on or off","Only with power disconnected","Only while soldering","Never, it's unsafe"], correct:1, explain:"Measuring resistance with power connected gives inaccurate readings and can damage the meter." },
  ],
  playground: [
    { q:"You place an LED and a battery with no resistor. What happens?", opts:["Nothing — it needs a switch too","The LED burns out from too much current","The LED glows dimly, safely","The battery won't connect"], correct:1, explain:"With ~0Ω resistance in the loop, current spikes far past the LED's safe limit." },
    { q:"You leave one slot empty. What does the simulator show?", opts:["Full current flows anyway","No current — the loop is open","Double the voltage","A short circuit warning"], correct:1, explain:"An empty slot breaks the loop, exactly like the open-circuit concept from chapter 3." },
  ],
  binary: [
    { q:"What are the only two digits used in binary?", opts:["1 and 2","0 and 1","0 and 9","A and B"], correct:1, explain:"Binary is base 2 — every value is built from just 0 and 1, matching a wire's two voltage states." },
    { q:"An 8-bit byte can represent how many distinct values?", opts:["8","16","100","256"], correct:3, explain:"8 bits gives 2⁸ = 256 possible combinations, from 0 to 255." },
  ],
  gates: [
    { q:"Which gate outputs 1 only when every input is 1?", opts:["OR","AND","NOT","XOR"], correct:1, explain:"AND requires all inputs to be 1 — like switches wired in series, all must close." },
    { q:"XOR outputs 1 when...", opts:["Both inputs are the same","The inputs differ","Both inputs are 0","Never"], correct:1, explain:"XOR (exclusive OR) is 1 only when its two inputs are different from each other." },
  ],
  adder: [
    { q:"In a half-adder, which gate produces the SUM output?", opts:["AND","OR","XOR","NOT"], correct:2, explain:"XOR is 1 exactly when the inputs differ — which matches when a bit-sum should be 1 without carrying." },
    { q:"Why is it called a 'half' adder?", opts:["It only has one input","It can't accept a carry-in from a previous column","It's only half built","It doesn't produce a carry"], correct:1, explain:"A half-adder handles two input bits but has no way to include a carry from a prior stage — that requires a full adder." },
  ],
  cppbasics: [
    { q:"Which type would you use for a value that's always 0-255, like a brightness level?", opts:["float","bool","byte","String"], correct:2, explain:"byte stores exactly 0–255 in a single byte of memory — efficient and exactly matching PWM's range." },
    { q:"What does a function's return type of void mean?", opts:["It returns a random value","It returns nothing","It always returns 0","It causes an error"], correct:1, explain:"void means the function performs an action but doesn't hand back a value to the caller." },
  ],
  digitalio: [
    { q:"Why use INPUT_PULLUP instead of plain INPUT for a button?", opts:["It's required by law","It prevents a floating pin from reading random noise","It makes the button faster","It only works with LEDs"], correct:1, explain:"INPUT_PULLUP holds the pin reliably HIGH until pulled LOW, avoiding the noisy floating-pin problem of plain INPUT." },
    { q:"What causes 'switch bounce'?", opts:["Software bugs","The mechanical contacts physically flickering before settling","Bad C++ syntax","Low battery voltage"], correct:1, explain:"Physical metal contacts don't close cleanly — they bounce for a few milliseconds, which fast digital reads can misread as many presses." },
  ],
  serial: [
    { q:"What does Serial.begin(9600) do?", opts:["Sets the LED brightness","Opens communication at 9600 baud","Deletes previous serial output","Starts a for loop"], correct:1, explain:"It opens the serial connection at a set speed (baud rate) that both board and monitor must agree on." },
    { q:"Difference between Serial.print() and Serial.println()?", opts:["No difference","println() adds a line break after","print() is faster","println() only works with numbers"], correct:1, explain:"println() appends a newline after the text; print() does not, so the next output continues on the same line." },
  ],
  shiftreg: [
    { q:"What problem do shift registers solve?", opts:["Making LEDs brighter","Controlling many outputs from just a few microcontroller pins","Speeding up analogRead","Storing data permanently"], correct:1, explain:"A shift register expands a handful of control pins into many parallel outputs, sending bits in serially." },
    { q:"What does the latch pin do?", opts:["Sends the data bits","Updates all outputs at once after shifting is complete","Powers the chip","Resets the register to zero"], correct:1, explain:"Latching applies all the shifted-in bits to the outputs simultaneously, avoiding a visible ripple effect." },
  ],
  pwm: [
    { q:"What does PWM actually vary to create a dimming effect?", opts:["The voltage level","The duty cycle (% of time spent HIGH)","The wire thickness","The resistor color"], correct:1, explain:"PWM switches fully on/off very fast; the percentage of time spent HIGH (duty cycle) is what your eye perceives as brightness." },
    { q:"What range of values does analogWrite() accept?", opts:["0 to 1","0 to 100","0 to 255","0 to 1023"], correct:2, explain:"analogWrite() takes 0–255, where 0 is always off and 255 is always on." },
  ],
  interrupts: [
    { q:"Why might a polling loop() miss a button press?", opts:["Polling is always broken","If loop() is busy (e.g. in a delay()) when the press happens, it's never checked","Buttons don't work with polling","It only happens with LEDs"], correct:1, explain:"Polling only sees what's true at the exact moment it checks — a press during a long-running operation goes unnoticed." },
    { q:"What should an ISR (interrupt service routine) generally do?", opts:["Run a long calculation","Stay short — usually just set a flag","Call delay() to wait", "Print detailed debug logs"], correct:1, explain:"ISRs interrupt everything else, so keeping them short (like setting a flag for loop() to handle) keeps the chip responsive." },
  ],
  statemachine: [
    { q:"In the traffic light FSM, what triggers a state change?", opts:["A random number","Enough time elapsing in the current state","Pressing reset","Nothing — it never changes"], correct:1, explain:"Each state has a duration; once elapsed time reaches that duration, the code transitions to the next state." },
    { q:"Why does the FSM sketch use millis() instead of delay()?", opts:["millis() is shorter to type","delay() would freeze the whole chip, blocking other logic","millis() is more accurate","There's no real difference"], correct:1, explain:"delay() blocks everything; millis()-based timing lets the chip keep checking other things (like a pedestrian button) while still tracking state duration." },
  ],
};

function renderAllMiniQuizzes(){
  document.querySelectorAll('.mini-quiz-block').forEach(block => {
    const container = block.querySelector('.mini-quiz-container');
    if(container.dataset.rendered) return;
    container.dataset.rendered = '1';
    const items = miniQuizData[block.dataset.quizSection];
    if(!items) return;
    let answeredInBlock = 0;
    items.forEach((item, qi) => {
      const card = document.createElement('div');
      card.className = 'mq-card';
      card.innerHTML = `
        <div class="mq-q">${item.q}</div>
        <div class="mq-opts">
          ${item.opts.map((opt,oi) => `<button class="mq-opt" data-o="${oi}"><span class="opt-mark"></span><span>${opt}</span></button>`).join('')}
        </div>
        <div class="mq-explain">${item.explain}</div>
      `;
      const buttons = card.querySelectorAll('.mq-opt');
      buttons.forEach((btn, oi) => {
        btn.addEventListener('click', () => {
          if(buttons[0].disabled) return;
          const isCorrect = oi === item.correct;
          buttons.forEach(b => b.disabled = true);
          buttons[item.correct].classList.add('correct');
          if(!isCorrect){
            btn.classList.add('wrong');
            card.classList.add('shake');
            setTimeout(() => card.classList.remove('shake'), 400);
          } else {
            card.classList.add('pulse-good');
          }
          card.querySelector('.mq-explain').classList.add('show');
          answeredInBlock++;
          if(answeredInBlock >= items.length) LessonProgress.markDone(block.dataset.quizSection);
        });
      });
      container.appendChild(card);
    });
  });
}
renderAllMiniQuizzes();

/* ===================== Settings modal ===================== */
(function(){
  const overlay = document.getElementById('settingsOverlay');
  const openBtn = document.getElementById('railSettingsBtn');
  const closeBtn = document.getElementById('settingsCloseBtn');
  if(!overlay) return;

  openBtn.addEventListener('click', () => overlay.hidden = false);
  closeBtn.addEventListener('click', () => overlay.hidden = true);
  overlay.addEventListener('click', e => { if(e.target === overlay) overlay.hidden = true; });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && !overlay.hidden) overlay.hidden = true;
  });

  document.getElementById('resetWidthBtn').addEventListener('click', () => {
    if(window.resetRailWidth) window.resetRailWidth();
  });

  document.getElementById('clearLessonProgressBtn').addEventListener('click', () => {
    if(!confirm('Clear all lesson and quiz progress?')) return;
    LessonProgress.clear();
    document.querySelectorAll('.mini-quiz-container').forEach(c => { c.innerHTML = ''; delete c.dataset.rendered; });
    renderAllMiniQuizzes();
    answeredCount = 0; correctCount = 0;
    quizContainer.querySelectorAll('.quiz-opt').forEach(b => { b.disabled = false; b.classList.remove('correct','wrong'); });
    quizContainer.querySelectorAll('.quiz-card').forEach(c => c.classList.remove('answered-correct','answered-wrong'));
    quizContainer.querySelectorAll('.quiz-explain').forEach(e => e.classList.remove('show'));
    document.getElementById('quizScore').textContent = 'Score: 0 / 0 answered';
  });

  document.getElementById('clearFlashcardsBtn').addEventListener('click', () => {
    if(!confirm('Reset all flashcard progress?')) return;
    const btn = document.getElementById('fcResetProgressBtn');
    if(btn) btn.click();
    else localStorage.removeItem('benchOneFlashcardState_v1');
  });

  document.getElementById('clearAllBtn').addEventListener('click', () => {
    if(!confirm('Clear ALL progress and preferences? This cannot be undone.')) return;
    localStorage.clear();
    location.reload();
  });
})();

/* ===================== Quiz ===================== */
const quizData = [
  { q:"What does voltage measure?", opts:["The flow rate of current","The electrical pressure pushing current","The resistance in a circuit","The power stored in a battery"], correct:1, explain:"Voltage is the 'pressure' that pushes current through a circuit — like water pressure in a pipe." },
  { q:"What's the formula for Ohm's law?", opts:["V = I + R","V = I / R","V = I × R","I = V × R"], correct:2, explain:"V = I × R. Rearranged: I = V/R, and R = V/I." },
  { q:"In a series circuit, what stays the same through every component?", opts:["Voltage","Current","Resistance","Power"], correct:1, explain:"Series circuits have one path, so the same current flows through every component in the chain." },
  { q:"In a parallel circuit, what's the same across every branch?", opts:["Current","Resistance","Voltage","Total power"], correct:2, explain:"Every branch in a parallel circuit connects across the same two points, so they all see the same voltage." },
  { q:"What does a resistor's color code tell you?", opts:["Its physical size","Its power rating only","Its resistance value and tolerance","Which direction current should flow"], correct:2, explain:"The bands encode two or three significant digits, a multiplier, and a tolerance — giving the resistor's value in ohms." },
  { q:"Why does an LED have a longer and a shorter leg?", opts:["Just for style","To mark polarity — it only conducts one direction","The longer leg is for higher voltage","It has no functional meaning"], correct:1, explain:"LEDs are diodes — current only flows one way. The longer leg (anode) connects to positive." },
  { q:"What does the Arduino setup() function do?", opts:["Runs forever in a loop","Runs once when the board powers on","Only runs when a button is pressed","Deletes the previous program"], correct:1, explain:"setup() runs a single time at power-on/reset — perfect for one-time configuration like pinMode()." },
  { q:"Why should you heat the joint, not just the solder, when soldering?", opts:["It looks better","It's faster","It creates a strong, clean electrical connection","It uses less solder"], correct:2, explain:"Heating the actual metal being joined lets solder flow into a proper bond, rather than sitting as a weak 'cold joint' on top." },
  { q:"First troubleshooting step for a dead circuit?", opts:["Replace all the components","Confirm power is actually reaching the board","Resolder everything","Buy a new breadboard"], correct:1, explain:"Confirming live power at the source rules out the single most common cause before you touch anything else." },
  { q:"When should you measure resistance (Ω) with a multimeter?", opts:["Anytime, power on or off","Only with power disconnected from the circuit","Only while soldering","Only on resistors, never other parts"], correct:1, explain:"Measuring resistance while power is connected gives inaccurate readings and can damage the meter." },
  { q:"Static electricity is caused by...", opts:["Creating brand new electrons","Transferring electrons between two materials","Destroying protons in an atom","Magnetism, not charge"], correct:1, explain:"Rubbing two materials together transfers electrons from one surface to the other — charge moves, it isn't created." },
  { q:"Which best describes a conductor?", opts:["Electrons are tightly bound to atoms","Electrons move freely between atoms","It always insulates against current","It only works with AC"], correct:1, explain:"Conductors like metals have loosely-held outer electrons, letting charge move freely through the material." },
  { q:"What three things does every working circuit need?", opts:["A source, a path, a load","A resistor, a capacitor, an inductor","A battery, a switch, a fuse only","A microcontroller and code"], correct:0, explain:"A source provides the push, a path (conductor) lets charge travel, and a load uses the energy." },
  { q:"Conventional current is defined as flowing...", opts:["From − to + through the circuit","From + to − through the circuit","Randomly in both directions","Only in AC circuits"], correct:1, explain:"Conventional current flows + to − by definition — even though electrons (the actual charge carriers) move the opposite way." },
  { q:"Kirchhoff's Current Law says that at a junction...", opts:["Voltage in equals voltage out","Current in equals current out","Resistance is always zero","Current disappears"], correct:1, explain:"Charge can't pile up or vanish at a junction, so total current in must equal total current out." },
  { q:"What actually causes injury in an electrical shock?", opts:["Voltage alone","Current through the body","The color of the wire","Resistance alone"], correct:1, explain:"Current — not voltage by itself — is what causes physiological harm; a high-voltage static shock with tiny current is usually harmless." },
  { q:"4.7k on a resistor means:", opts:["4.7 ohms", "47 ohms", "4,700 ohms", "4,700,000 ohms"], correct:2, explain:"The 'k' prefix means kilo, ×1000 — so 4.7k = 4,700 ohms." },
  { q:"An inductor mainly opposes...", opts:["Current itself, like a resistor", "Changes in current", "Voltage spikes only in DC", "Nothing — it's just a wire"], correct:1, explain:"Inductors store energy in a magnetic field and push back against changes in current, not steady current itself." },
  { q:"An 8-bit byte can represent how many distinct values?", opts:["8","64","256","1024"], correct:2, explain:"8 bits gives 2⁸ = 256 possible combinations, from 0 through 255." },
  { q:"Which logic gate outputs 1 only when its two inputs differ?", opts:["AND","OR","XOR","NAND"], correct:2, explain:"XOR (exclusive OR) is 1 exactly when the inputs are different from each other." },
  { q:"In a half-adder, which gate produces the CARRY output?", opts:["XOR","AND","NOT","OR"], correct:1, explain:"AND is 1 only when both inputs are 1 — exactly the case where a bit-sum overflows into a carry." },
  { q:"Why use INPUT_PULLUP instead of plain INPUT for a button pin?", opts:["It's faster","It prevents a floating pin from reading random noise","It's required for LEDs","It reverses the button's polarity"], correct:1, explain:"INPUT_PULLUP holds the pin reliably HIGH by default, avoiding the unpredictable readings a floating INPUT pin can pick up." },
  { q:"What causes 'switch bounce'?", opts:["A software bug in Arduino","Mechanical contacts physically flickering before settling","Low battery voltage","Using the wrong baud rate"], correct:1, explain:"A switch's metal contacts don't close cleanly — they bounce for a few milliseconds, which fast digital reads can misinterpret as multiple presses." },
  { q:"What does PWM (analogWrite) actually control to simulate brightness?", opts:["The supply voltage","The duty cycle — the percent of time spent HIGH","The resistor value","The wire gauge"], correct:1, explain:"PWM switches fully on/off rapidly; varying the percentage of time spent HIGH (duty cycle) is what appears as a brightness change." },
  { q:"Why might a polling loop() miss a button press that an interrupt wouldn't?", opts:["Polling doesn't work with buttons","If loop() is busy elsewhere (like in a delay()) when the press occurs, it's never checked","Interrupts are slower","There's no real difference"], correct:1, explain:"Polling only reflects what's true at the instant it checks; an interrupt fires immediately no matter what the chip was doing." },
  { q:"What's the purpose of a shift register like the 74HC595?", opts:["To store data permanently","To control many outputs using just a few microcontroller pins","To increase voltage","To measure resistance"], correct:1, explain:"A shift register takes bits in serially and presents them on parallel outputs, freeing up microcontroller pins." },
];

const quizContainer = document.getElementById('quizContainer');
let answeredCount = 0, correctCount = 0;

quizData.forEach((item, qi) => {
  const card = document.createElement('div');
  card.className = 'quiz-card';
  card.innerHTML = `
    <div class="quiz-q"><span class="qnum">${qi+1}</span><span>${item.q}</span></div>
    <div class="quiz-opts">
      ${item.opts.map((opt,oi) => `<button class="quiz-opt" data-q="${qi}" data-o="${oi}"><span class="opt-mark"></span><span>${opt}</span></button>`).join('')}
    </div>
    <div class="quiz-explain" id="explain-${qi}">${item.explain}</div>
  `;
  quizContainer.appendChild(card);
});

quizContainer.addEventListener('click', e => {
  const optBtn = e.target.closest('.quiz-opt');
  if(!optBtn) return;
  const qi = parseInt(optBtn.dataset.q);
  const oi = parseInt(optBtn.dataset.o);
  const card = optBtn.closest('.quiz-card');
  const buttons = card.querySelectorAll('.quiz-opt');
  if(buttons[0].disabled) return; // already answered

  const isCorrect = oi === quizData[qi].correct;
  buttons.forEach(b => b.disabled = true);
  buttons[quizData[qi].correct].classList.add('correct');
  if(!isCorrect){
    optBtn.classList.add('wrong');
    card.classList.add('shake');
    card.classList.add('answered-wrong');
    setTimeout(() => card.classList.remove('shake'), 400);
  } else {
    card.classList.add('answered-correct', 'pulse-good');
  }
  document.getElementById('explain-'+qi).classList.add('show');

  answeredCount++;
  if(isCorrect) correctCount++;
  document.getElementById('quizScore').textContent = `Score: ${correctCount} / ${answeredCount} answered`;

  if(answeredCount >= quizData.length){
    LessonProgress.markDone('quiz');
    showCertificate(correctCount, quizData.length);
  }
});

/* ===================== Certificate of completion ===================== */
function showCertificate(score, total){
  const overlay = document.getElementById('certOverlay');
  const nameInput = document.getElementById('certNameInput');
  const savedName = localStorage.getItem('benchone_cert_name') || '';
  nameInput.value = savedName;
  document.getElementById('certName').textContent = savedName || 'A Learner';
  document.getElementById('certScore').textContent = `${score} / ${total}`;
  document.getElementById('certDate').textContent = new Date().toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' });
  overlay.hidden = false;
}
(function(){
  const overlay = document.getElementById('certOverlay');
  const closeBtn = document.getElementById('certCloseBtn');
  const nameInput = document.getElementById('certNameInput');
  const nameEl = document.getElementById('certName');
  const downloadBtn = document.getElementById('certDownloadBtn');
  if(!overlay) return;

  closeBtn.addEventListener('click', () => overlay.hidden = true);
  overlay.addEventListener('click', e => { if(e.target === overlay) overlay.hidden = true; });
  nameInput.addEventListener('input', () => {
    const v = nameInput.value.trim();
    nameEl.textContent = v || 'A Learner';
    localStorage.setItem('benchone_cert_name', nameInput.value);
  });

  downloadBtn.addEventListener('click', async () => {
    const paper = document.getElementById('certPaper');
    const rect = paper.getBoundingClientRect();
    const scale = 2;
    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('xmlns', svgNs);
    svg.setAttribute('width', rect.width);
    svg.setAttribute('height', rect.height);
    const fo = document.createElementNS(svgNs, 'foreignObject');
    fo.setAttribute('width', '100%');
    fo.setAttribute('height', '100%');
    const clone = paper.cloneNode(true);
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    fo.appendChild(clone);
    svg.appendChild(fo);
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = '#0B1017';
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = 'bench-one-certificate.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
  });
})();
/* ===================== Binary bit toggle board ===================== */
(function(){
  const board = document.getElementById('binBoard');
  const decimalEl = document.getElementById('binDecimal');
  const sumEl = document.getElementById('binSum');
  const randomBtn = document.getElementById('binRandomBtn');
  const clearBtn = document.getElementById('binClearBtn');
  const maxBtn = document.getElementById('binMaxBtn');
  if(!board) return;

  const places = [128,64,32,16,8,4,2,1];
  let bits = [0,0,0,0,0,0,0,0];

  function render(){
    board.innerHTML = '';
    places.forEach((place, i) => {
      const cell = document.createElement('div');
      cell.className = 'bin-bit' + (bits[i] ? ' on' : '');
      cell.innerHTML = `<div class="place">${place}</div><div class="val">${bits[i]}</div>`;
      cell.addEventListener('click', () => { bits[i] = bits[i] ? 0 : 1; render(); });
      board.appendChild(cell);
    });
    const decimal = bits.reduce((sum, b, i) => sum + b*places[i], 0);
    decimalEl.textContent = decimal;
    const activeTerms = places.filter((p,i) => bits[i]);
    sumEl.textContent = activeTerms.length ? activeTerms.join(' + ') + ' = ' + decimal : 'all zero';
  }

  randomBtn.addEventListener('click', () => { bits = bits.map(() => Math.random() > 0.5 ? 1 : 0); render(); });
  clearBtn.addEventListener('click', () => { bits = bits.map(() => 0); render(); });
  maxBtn.addEventListener('click', () => { bits = bits.map(() => 1); render(); });
  render();
})();

/* ===================== Logic gate playground ===================== */
(function(){
  const btnRow = document.getElementById('gateBtnRow');
  const svg = document.getElementById('gateSvg');
  const ioRow = document.getElementById('gateIoRow');
  const description = document.getElementById('gateDescription');
  const truthTable = document.getElementById('gateTruthTable');
  if(!btnRow) return;

  const GATES = {
    AND:  { inputs:2, fn:(a,b)=> a&&b ? 1:0, desc:'Output is 1 only when every input is 1. Think of two switches wired in series — both must close for current to flow through.' },
    OR:   { inputs:2, fn:(a,b)=> (a||b) ? 1:0, desc:'Output is 1 if any input is 1. Two switches wired in parallel — either one closing lets current through.' },
    NOT:  { inputs:1, fn:(a)=> a ? 0:1, desc:'The only gate with one input — it simply flips whatever comes in. Also called an inverter.' },
    XOR:  { inputs:2, fn:(a,b)=> (a!==b) ? 1:0, desc:'Output is 1 only when the inputs differ. Useful for detecting a change or comparing two bits.' },
    NAND: { inputs:2, fn:(a,b)=> (a&&b) ? 0:1, desc:'AND, then inverted. Famous in digital logic because every other gate can be built from NAND gates alone.' },
    NOR:  { inputs:2, fn:(a,b)=> (a||b) ? 0:1, desc:'OR, then inverted. Output is 1 only when every input is 0.' },
  };

  let activeGate = 'AND';
  let inputs = [0,0];

  function gateBodySvg(type){
    // Simple, consistent gate silhouettes drawn with the trace-path convention used elsewhere on the page.
    if(type === 'NOT'){
      return `<path d="M60,40 L60,100 L120,70 Z" fill="#1C2530" stroke="var(--blue)" stroke-width="2"/><circle cx="128" cy="70" r="6" fill="#1C2530" stroke="var(--blue)" stroke-width="2"/>`;
    }
    const inverted = type === 'NAND' || type === 'NOR';
    const curved = type === 'OR' || type === 'NOR' || type === 'XOR';
    let body;
    if(curved){
      body = `<path d="M55,35 Q75,70 55,105 Q95,105 120,70 Q95,35 55,35 Z" fill="#1C2530" stroke="var(--blue)" stroke-width="2"/>`;
      if(type === 'XOR'){
        body = `<path d="M45,35 Q65,70 45,105" fill="none" stroke="var(--blue)" stroke-width="2"/>` + body;
      }
    } else {
      body = `<path d="M55,35 L80,35 A35,35 0 0 1 80,105 L55,105 Z" fill="#1C2530" stroke="var(--blue)" stroke-width="2"/>`;
    }
    const bubble = inverted ? `<circle cx="127" cy="70" r="6" fill="#1C2530" stroke="var(--blue)" stroke-width="2"/>` : '';
    return body + bubble;
  }

  function render(){
    const gate = GATES[activeGate];
    const outX = gate.inputs === 1 ? 134 : (activeGate==='NAND'||activeGate==='NOR' ? 133 : 120);

    // wires + gate body
    let wires = '';
    if(gate.inputs === 2){
      wires = `<path class="trace-path" d="M10,50 L55,50 M10,90 L55,90"/>`;
    } else {
      wires = `<path class="trace-path" d="M10,70 L60,70"/>`;
    }
    const outStartX = activeGate === 'NOT' || activeGate === 'NAND' || activeGate === 'NOR' ? 134 : 120;
    wires += `<path class="trace-path" d="M${outStartX},70 L210,70"/>`;

    const output = gate.inputs === 2 ? gate.fn(inputs[0], inputs[1]) : gate.fn(inputs[0]);
    const outFlow = output ? `<path class="trace-flow" d="M${outStartX},70 L210,70" style="animation-duration:.9s;"/>` : '';
    const inFlows = gate.inputs === 2
      ? [inputs[0] ? `<path class="trace-flow" d="M10,50 L55,50" style="animation-duration:.9s;"/>` : '',
         inputs[1] ? `<path class="trace-flow" d="M10,90 L55,90" style="animation-duration:.9s;"/>` : ''].join('')
      : (inputs[0] ? `<path class="trace-flow" d="M10,70 L60,70" style="animation-duration:.9s;"/>` : '');

    svg.innerHTML = `${wires}${inFlows}${gateBodySvg(activeGate)}${outFlow}
      <circle class="node ${output?'hot':''}" cx="210" cy="70" r="7"/>
      <text x="220" y="74" fill="var(--muted-2)" font-family="JetBrains Mono" font-size="11">${output}</text>`;

    // input toggles + output LED
    ioRow.innerHTML = '';
    for(let i=0;i<gate.inputs;i++){
      const item = document.createElement('div');
      item.className = 'gate-io-item';
      item.innerHTML = `<span class="lbl">IN ${gate.inputs===2?String.fromCharCode(65+i):''}</span>
        <div class="led-cell small ${inputs[i]?'on':''}" data-in="${i}" style="cursor:pointer;"></div>`;
      item.querySelector('.led-cell').addEventListener('click', () => { inputs[i] = inputs[i]?0:1; render(); });
      ioRow.appendChild(item);
    }
    const outItem = document.createElement('div');
    outItem.className = 'gate-io-item';
    outItem.innerHTML = `<span class="lbl">OUT</span><div class="led-cell ${output?'on':''}"></div>`;
    ioRow.appendChild(outItem);

    description.innerHTML = `<b style="color:var(--text);">${activeGate}:</b> ${gate.desc}`;

    // truth table
    const rows = [];
    if(gate.inputs === 2){
      for(let a=0;a<2;a++) for(let b=0;b<2;b++) rows.push([a,b,gate.fn(a,b)]);
    } else {
      for(let a=0;a<2;a++) rows.push([a,gate.fn(a)]);
    }
    truthTable.innerHTML = `<tr>${gate.inputs===2?'<th>A</th><th>B</th>':'<th>A</th>'}<th>OUT</th></tr>` +
      rows.map(r => {
        const isActive = gate.inputs===2 ? (r[0]===inputs[0] && r[1]===inputs[1]) : (r[0]===inputs[0]);
        return `<tr class="${isActive?'tt-active':''}">${r.map(v=>`<td>${v}</td>`).join('')}</tr>`;
      }).join('');
  }

  btnRow.querySelectorAll('.gate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeGate = btn.dataset.gate;
      btnRow.querySelectorAll('.gate-btn').forEach(b => b.classList.toggle('active', b===btn));
      inputs = GATES[activeGate].inputs === 1 ? [0] : [0,0];
      render();
    });
  });
  render();
})();

/* ===================== Half-adder builder ===================== */
(function(){
  const svg = document.getElementById('adderSvg');
  const ioRow = document.getElementById('adderIoRow');
  const truthTable = document.getElementById('adderTruthTable');
  if(!svg) return;
  let a = 0, b = 0;

  function render(){
    const sum = (a !== b) ? 1 : 0;   // XOR
    const carry = (a && b) ? 1 : 0;  // AND

    svg.innerHTML = `
      <path class="trace-path" d="M10,45 L60,45 L60,45 M10,45 L40,45 M40,45 L40,45"/>
      <path class="trace-path" d="M10,45 L50,45 M10,125 L50,125"/>
      <path class="trace-path" d="M10,45 L30,45 L30,80 L50,80 M10,125 L30,125 L30,90 L50,90"/>
      ${a ? `<path class="trace-flow" d="M10,45 L30,45 L30,80 L50,80" style="animation-duration:.9s;"/>` : ''}
      ${b ? `<path class="trace-flow" d="M10,125 L30,125 L30,90 L50,90" style="animation-duration:.9s;"/>` : ''}
      <path class="trace-path" d="M10,45 L30,45 L30,25 L50,25 M10,125 L30,125 L30,145 L50,145"/>
      ${a ? `<path class="trace-flow" d="M10,45 L30,45 L30,25 L50,25" style="animation-duration:.9s;"/>` : ''}
      ${b ? `<path class="trace-flow" d="M10,125 L30,125 L30,145 L50,145" style="animation-duration:.9s;"/>` : ''}

      <!-- XOR gate (top) producing SUM -->
      <path d="M50,10 Q68,40 50,70 Q85,70 105,40 Q85,10 50,10 Z" fill="#1C2530" stroke="var(--blue)" stroke-width="2"/>
      <path d="M42,10 Q60,40 42,70" fill="none" stroke="var(--blue)" stroke-width="2"/>
      <path class="trace-path" d="M105,40 L160,40"/>
      ${sum ? `<path class="trace-flow" d="M105,40 L160,40" style="animation-duration:.9s;"/>` : ''}
      <circle class="node ${sum?'hot':''}" cx="160" cy="40" r="7"/>
      <text x="168" y="36" fill="var(--muted-2)" font-family="JetBrains Mono" font-size="10">SUM</text>
      <text x="168" y="50" fill="var(--trace)" font-family="JetBrains Mono" font-size="12" font-weight="700">${sum}</text>

      <!-- AND gate (bottom) producing CARRY -->
      <path d="M50,100 L75,100 A32,32 0 0 1 75,164 L50,164 Z" fill="#1C2530" stroke="var(--copper)" stroke-width="2"/>
      <path class="trace-path" d="M107,132 L160,132"/>
      ${carry ? `<path class="trace-flow" d="M107,132 L160,132" style="animation-duration:.9s;"/>` : ''}
      <circle class="node ${carry?'hot':''}" cx="160" cy="132" r="7"/>
      <text x="168" y="128" fill="var(--muted-2)" font-family="JetBrains Mono" font-size="10">CARRY</text>
      <text x="168" y="142" fill="var(--copper)" font-family="JetBrains Mono" font-size="12" font-weight="700">${carry}</text>

      <text x="0" y="40" fill="var(--muted-2)" font-family="JetBrains Mono" font-size="11">A</text>
      <text x="0" y="120" fill="var(--muted-2)" font-family="JetBrains Mono" font-size="11">B</text>
    `;

    ioRow.innerHTML = `
      <div class="gate-io-item"><span class="lbl">A</span><div class="led-cell small ${a?'on':''}" id="adderA" style="cursor:pointer;"></div></div>
      <div class="gate-io-item"><span class="lbl">B</span><div class="led-cell small ${b?'on':''}" id="adderB" style="cursor:pointer;"></div></div>
      <div class="gate-io-item"><span class="lbl">SUM</span><div class="led-cell ${sum?'on':''}"></div></div>
      <div class="gate-io-item"><span class="lbl">CARRY</span><div class="led-cell" style="${carry?'background:var(--copper);border-color:var(--copper);box-shadow:0 0 16px var(--copper);':''}"></div></div>
    `;
    document.getElementById('adderA').addEventListener('click', () => { a = a?0:1; render(); });
    document.getElementById('adderB').addEventListener('click', () => { b = b?0:1; render(); });

    const rows = [[0,0],[0,1],[1,0],[1,1]];
    truthTable.innerHTML = `<tr><th>A</th><th>B</th><th>SUM</th><th>CARRY</th></tr>` +
      rows.map(([ra,rb]) => {
        const isActive = ra===a && rb===b;
        const rs = (ra!==rb)?1:0, rc = (ra&&rb)?1:0;
        return `<tr class="${isActive?'tt-active':''}"><td>${ra}</td><td>${rb}</td><td>${rs}</td><td>${rc}</td></tr>`;
      }).join('');
  }
  render();
})();

/* ===================== Code challenge: predict the output ===================== */
(function(){
  const container = document.getElementById('ccContainer');
  if(!container) return;

  const challenges = [
    {
      tag: 'Variables & math',
      code: `int a = 7;
int b = 2;
Serial.println(a / b);
Serial.println(a % b);`,
      answer: `3
1`,
      explain: 'Both operands are int, so 7/2 does integer division (drops the remainder) — result 3, not 3.5. % is the remainder operator: 7 divided by 2 leaves a remainder of 1.'
    },
    {
      tag: 'Loops',
      code: `for (int i = 0; i < 4; i++) {
  Serial.println(i * 2);
}`,
      answer: `0
2
4
6`,
      explain: 'The loop runs for i = 0, 1, 2, 3 (stops once i < 4 is false) — four lines, each printing i doubled.'
    },
    {
      tag: 'Conditionals',
      code: `int sensor = 450;
if (sensor > 700) {
  Serial.println("high");
} else if (sensor > 300) {
  Serial.println("mid");
} else {
  Serial.println("low");
}`,
      answer: `mid`,
      explain: '450 fails the first check (not > 700), but passes the second (450 > 300) — so "mid" prints, and the else is never reached.'
    },
  ];

  challenges.forEach((c, i) => {
    const card = document.createElement('div');
    card.className = 'cc-card';
    card.innerHTML = `
      <div class="cc-tag">${c.tag}</div>
      <div class="cc-code">${c.code}</div>
      <button class="charge-btn" data-cc="${i}">Reveal output</button>
      <div class="mq-explain" id="ccExplain${i}" style="margin-top:12px;">
        <div style="font-family:'JetBrains Mono',monospace; color:var(--trace); font-size:13px; margin-bottom:8px; white-space:pre;">${c.answer}</div>
        ${c.explain}
      </div>
    `;
    container.appendChild(card);
    card.querySelector('button').addEventListener('click', (e) => {
      document.getElementById('ccExplain'+i).classList.add('show');
      e.target.disabled = true;
      e.target.textContent = 'Revealed';
    });
  });
})();

/* ===================== Debounce demo ===================== */
(function(){
  const pressBtn = document.getElementById('bouncePressBtn');
  const rawPath = document.getElementById('bounceRawPath');
  const cleanPath = document.getElementById('bounceCleanPath');
  const rawCountEl = document.getElementById('bounceRawCount');
  const cleanCountEl = document.getElementById('bounceCleanCount');
  if(!pressBtn) return;

  let rawCount = 0, cleanCount = 0;
  let busy = false;

  function flatLine(level){
    // level 0 = low line (y=30), level 1 = high line (y=10)
    const y = level ? 10 : 30;
    return `M0,${y} L300,${y}`;
  }
  rawPath.setAttribute('d', flatLine(0));
  cleanPath.setAttribute('d', flatLine(0));

  pressBtn.addEventListener('click', () => {
    if(busy) return;
    busy = true;
    pressBtn.style.opacity = '0.5';

    // Simulate real mechanical bounce: rapid up/down transitions over ~16ms, settle high, then release.
    // Each (ms, level) pair is a step; scaled across a 150ms window mapped to the 300px trace.
    const pattern = [ [0,0],[4,1],[7,0],[9,1],[13,0],[16,1],[120,1],[125,0] ];
    const scaleX = 300/150;
    let d = `M0,30`;
    pattern.forEach(([ms, lvl]) => {
      const x = (ms * scaleX).toFixed(1);
      const y = lvl ? 10 : 30;
      d += ` L${x},${y}`;
    });
    rawPath.setAttribute('d', d);
    rawCount += 4; // the demo bounce pattern above contains 4 rising edges a naive read would count
    rawCountEl.textContent = rawCount + ' presses seen';

    // Debounced: single clean rising edge, ignoring anything within 50ms, held then released.
    let cd = `M0,30 L40,30 L40,10 L120,10 L120,30 L300,30`;
    cleanPath.setAttribute('d', cd);
    cleanCount += 1;
    cleanCountEl.textContent = cleanCount + ' presses seen';

    setTimeout(() => {
      rawPath.setAttribute('d', flatLine(0));
      cleanPath.setAttribute('d', flatLine(0));
      pressBtn.style.opacity = '1';
      busy = false;
    }, 900);
  });
})();

/* ===================== Serial monitor simulation ===================== */
(function(){
  const runBtn = document.getElementById('serialRunBtn');
  const screen = document.getElementById('serialScreen');
  if(!runBtn) return;
  let running = false;
  let tickHandle = null;
  let tickCount = 0;

  function addLine(text, dim){
    const line = document.createElement('div');
    line.className = 'serial-line' + (dim ? ' dim' : '');
    line.textContent = text;
    screen.appendChild(line);
    screen.scrollTop = screen.scrollHeight;
  }

  function stop(){
    running = false;
    clearInterval(tickHandle);
    runBtn.textContent = '▶ Run sketch';
  }

  runBtn.addEventListener('click', () => {
    if(running){ stop(); return; }
    running = true;
    tickCount = 0;
    screen.innerHTML = '';
    runBtn.textContent = '■ Stop';
    addLine('Sensor ready.');
    tickHandle = setInterval(() => {
      tickCount++;
      if(tickCount > 8){ stop(); return; }
      const tempC = (20 + Math.sin(tickCount*0.7)*6 + tickCount*0.9).toFixed(1);
      addLine(`Temp: ${tempC} C`);
      if(parseFloat(tempC) > 28.0) addLine('WARNING: overheating');
    }, 700);
  });
})();

/* ===================== Shift register ===================== */
(function(){
  const stage = document.getElementById('srStage');
  const readout = document.getElementById('srReadout');
  const oneBtn = document.getElementById('srShiftOneBtn');
  const zeroBtn = document.getElementById('srShiftZeroBtn');
  const clearBtn = document.getElementById('srClearBtn');
  if(!stage) return;

  let bits = [0,0,0,0,0,0,0,0]; // index 0 = leftmost (oldest), index 7 = rightmost (newest in)

  function render(){
    stage.innerHTML = `<div class="sr-bit-box"><span class="lbl">DATA IN</span><div class="led-cell small" id="srDataIn"></div></div>
      <span class="sr-arrow">→</span>`;
    bits.forEach((b) => {
      const box = document.createElement('div');
      box.className = 'sr-bit-box';
      box.innerHTML = `<span class="lbl">Q</span><div class="led-cell small ${b?'on':''}"></div>`;
      stage.appendChild(box);
    });
    const binStr = bits.join('');
    const decimal = parseInt(binStr, 2);
    readout.textContent = `Register: 0b${binStr}  =  ${decimal} decimal`;
  }

  function shiftIn(bit){
    bits.shift();
    bits.push(bit);
    const dataIn = document.getElementById('srDataIn');
    if(dataIn) dataIn.classList.add('on');
    render();
    setTimeout(() => { const d = document.getElementById('srDataIn'); if(d) d.classList.remove('on'); }, 300);
  }

  oneBtn.addEventListener('click', () => shiftIn(1));
  zeroBtn.addEventListener('click', () => shiftIn(0));
  clearBtn.addEventListener('click', () => { bits = [0,0,0,0,0,0,0,0]; render(); });
  render();
})();

/* ===================== PWM duty cycle demo ===================== */
(function(){
  const slider = document.getElementById('pwmDutySlider');
  const dutyLabel = document.getElementById('pwmDutyLabel');
  const codeVal = document.getElementById('pwmCodeVal');
  const glow = document.getElementById('pwmLedGlow');
  const core = document.getElementById('pwmLedCore');
  const waveSvg = document.getElementById('pwmWaveSvg');
  if(!slider) return;

  function render(){
    const val = parseInt(slider.value);
    const pct = Math.round((val/255)*100);
    dutyLabel.textContent = pct + '%';
    codeVal.textContent = val;
    glow.setAttribute('opacity', (val/255*0.7).toFixed(2));
    core.setAttribute('fill', `rgba(0,229,160,${(val/255).toFixed(2)})`);

    // Draw 3 duty cycles of a square wave
    const cycleW = 400/3;
    const highW = cycleW * (val/255);
    let d = '';
    for(let i=0;i<3;i++){
      const x0 = i*cycleW;
      d += `M${x0},70 L${x0},20 L${(x0+highW).toFixed(1)},20 L${(x0+highW).toFixed(1)},70 L${(x0+cycleW).toFixed(1)},70 `;
    }
    waveSvg.innerHTML = `
      <line x1="0" y1="70" x2="400" y2="70" stroke="#2A3846" stroke-width="1"/>
      <path d="${d}" fill="none" stroke="var(--trace)" stroke-width="2" filter="drop-shadow(0 0 3px var(--trace))"/>
      <text x="5" y="15" fill="var(--muted-2)" font-family="JetBrains Mono" font-size="10">HIGH</text>
      <text x="5" y="88" fill="var(--muted-2)" font-family="JetBrains Mono" font-size="10">LOW</text>
    `;
  }
  slider.addEventListener('input', render);
  render();
})();

/* ===================== Interrupt vs polling demo ===================== */
(function(){
  const pressBtn = document.getElementById('interruptPressBtn');
  const resetBtn = document.getElementById('interruptResetBtn');
  const pollBar = document.getElementById('pollBusyBar');
  const isrBar = document.getElementById('isrBusyBar');
  const pollResult = document.getElementById('pollResult');
  const isrResult = document.getElementById('isrResult');
  if(!pressBtn) return;

  let pollBusy = false, isrBusy = false;
  let pollCaught = 0, isrCaught = 0;
  let pollMissed = 0;

  function runBusyWork(){
    pollBusy = true; isrBusy = true;
    pollBar.style.transition = 'none'; isrBar.style.transition = 'none';
    pollBar.style.width = '0%'; isrBar.style.width = '0%';
    requestAnimationFrame(() => {
      pollBar.style.transition = 'width 1.6s linear'; isrBar.style.transition = 'width 1.6s linear';
      pollBar.style.width = '100%'; isrBar.style.width = '100%';
    });
    setTimeout(() => { pollBusy = false; isrBusy = false; }, 1600);
  }

  pressBtn.addEventListener('click', () => {
    if(!pollBusy && !isrBusy) runBusyWork();
    // Interrupt-driven always catches it, no matter what "loop" is doing.
    isrCaught++;
    isrResult.textContent = `Presses caught: ${isrCaught}`;
    // Polling only catches it if loop() isn't "busy" right now.
    if(pollBusy){
      pollMissed++;
      pollResult.textContent = `Presses caught: ${pollCaught}  (${pollMissed} missed while busy)`;
    } else {
      pollCaught++;
      pollResult.textContent = `Presses caught: ${pollCaught}` + (pollMissed ? `  (${pollMissed} missed while busy)` : '');
    }
  });

  resetBtn.addEventListener('click', () => {
    pollCaught = 0; isrCaught = 0; pollMissed = 0; pollBusy = false; isrBusy = false;
    pollBar.style.transition = 'none'; isrBar.style.transition = 'none';
    pollBar.style.width = '0%'; isrBar.style.width = '0%';
    pollResult.textContent = 'Presses caught: 0';
    isrResult.textContent = 'Presses caught: 0';
  });
})();

/* ===================== Capstone: traffic light FSM ===================== */
(function(){
  const svg = document.getElementById('fsmSvg');
  const bulbRed = document.getElementById('fsmBulbRed');
  const bulbYellow = document.getElementById('fsmBulbYellow');
  const bulbGreen = document.getElementById('fsmBulbGreen');
  const stateBadge = document.getElementById('fsmStateBadge');
  const trace = document.getElementById('fsmTrace');
  const runBtn = document.getElementById('fsmRunBtn');
  const resetBtn = document.getElementById('fsmResetBtn');
  if(!svg) return;

  const STATES = ['RED','GREEN','YELLOW'];
  const DURATIONS = { RED: 4, GREEN: 3, YELLOW: 1 }; // simulated seconds, compressed for demo pacing
  const COLORS = { RED:'#FF6B6B', GREEN:'#00E5A0', YELLOW:'#FFB627' };

  let stateIdx = 0;
  let elapsed = 0;
  let running = true;
  let tickHandle = null;

  function drawDiagram(){
    const positions = { RED:{x:70,y:80}, GREEN:{x:390,y:80}, YELLOW:{x:230,y:130} };
    const cur = STATES[stateIdx];
    let nodes = '';
    STATES.forEach(s => {
      const p = positions[s];
      const active = s === cur;
      nodes += `<circle cx="${p.x}" cy="${p.y}" r="34" fill="${active?'rgba(0,229,160,0.12)':'#1C2530'}" stroke="${active?'var(--trace)':'#2A3846'}" stroke-width="${active?2.5:1.5}"/>
        <text x="${p.x}" y="${p.y+4}" text-anchor="middle" fill="${active?'var(--trace)':'var(--muted-2)'}" font-family="JetBrains Mono" font-size="11" font-weight="700">${s}</text>`;
    });
    svg.innerHTML = `
      <path class="trace-path" d="M104,80 L356,80"/>
      <path class="trace-path" d="M370,105 L260,124"/>
      <path class="trace-path" d="M200,124 L100,102"/>
      <text x="230" y="72" text-anchor="middle" fill="var(--muted)" font-family="JetBrains Mono" font-size="9">timer elapsed</text>
      <text x="335" y="120" text-anchor="middle" fill="var(--muted)" font-family="JetBrains Mono" font-size="9">timer elapsed</text>
      <text x="140" y="120" text-anchor="middle" fill="var(--muted)" font-family="JetBrains Mono" font-size="9">timer elapsed</text>
      ${nodes}
    `;
  }

  function addTraceLine(text){
    const line = document.createElement('div');
    line.className = 'serial-line';
    line.textContent = text;
    trace.appendChild(line);
    trace.scrollTop = trace.scrollHeight;
    while(trace.children.length > 40) trace.removeChild(trace.firstChild);
  }

  function updateBulbs(){
    const cur = STATES[stateIdx];
    bulbRed.setAttribute('fill', cur==='RED' ? '#FF6B6B' : '#3A1616');
    bulbYellow.setAttribute('fill', cur==='YELLOW' ? '#FFB627' : '#3A2E10');
    bulbGreen.setAttribute('fill', cur==='GREEN' ? '#00E5A0' : '#123321');
    [bulbRed,bulbYellow,bulbGreen].forEach(b => b.style.filter = '');
    const activeBulb = cur==='RED' ? bulbRed : cur==='YELLOW' ? bulbYellow : bulbGreen;
    activeBulb.style.filter = `drop-shadow(0 0 8px ${COLORS[cur]})`;
    stateBadge.textContent = 'STATE: ' + cur;
    stateBadge.className = 'status-badge ' + (cur==='RED' ? 'warn' : cur==='YELLOW' ? 'info' : 'ok');
  }

  function tick(){
    elapsed++;
    const cur = STATES[stateIdx];
    addTraceLine(`elapsed=${elapsed}s  state=${cur}`);
    if(elapsed >= DURATIONS[cur]){
      stateIdx = (stateIdx+1) % STATES.length;
      elapsed = 0;
      addTraceLine(`→ transition to ${STATES[stateIdx]}`);
      updateBulbs();
      drawDiagram();
    }
  }

  function start(){
    running = true;
    runBtn.textContent = '⏸ Pause';
    runBtn.classList.add('active');
    tickHandle = setInterval(tick, 500);
  }
  function pause(){
    running = false;
    runBtn.textContent = '▶ Resume';
    runBtn.classList.remove('active');
    clearInterval(tickHandle);
  }

  runBtn.addEventListener('click', () => running ? pause() : start());
  resetBtn.addEventListener('click', () => {
    pause();
    stateIdx = 0; elapsed = 0;
    trace.innerHTML = '<span class="serial-line dim">// state trace</span>';
    updateBulbs();
    drawDiagram();
    start();
  });

  updateBulbs();
  drawDiagram();
  start();
})();