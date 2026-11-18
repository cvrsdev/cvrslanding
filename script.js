const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let motion = !reduced.matches;
const toggle = document.querySelector('#motion-toggle');
const layers = [...document.querySelectorAll('.depth')];
let pointer = { x: 0, y: 0 }, eased = { x: 0, y: 0 }, last = 0;
const chars = '{}[]/;:01<>#_*+=!';
const texts = [...document.querySelectorAll('[data-glitch]')];
texts.forEach(el => { el.dataset.original = el.textContent; el.setAttribute('aria-label', el.textContent); });
let glitchEnd = 0, active = null, nextGlitch = performance.now() + 2200;
let fullGlitchEnd = 0, nextFullGlitch = performance.now() + 6500, fullGlitchTick = -1;
let fullGlitchNodes = [], fullGlitchElements = [];
function restoreFullGlitch() {
  fullGlitchNodes.forEach(({node,text}) => { node.nodeValue = text; });
  fullGlitchElements.forEach(({el,style,label}) => { if(style === null) el.removeAttribute('style'); else el.setAttribute('style',style); if(label === null) el.removeAttribute('aria-label'); else el.setAttribute('aria-label',label); });
  fullGlitchNodes = []; fullGlitchElements = []; fullGlitchEnd = 0;
  document.body.classList.remove('hero-meltdown');
}
function startFullGlitch(t) {
  restore();
  const parents = new Set();
  for(const root of [document.querySelector('.hero'),document.querySelector('.nav')]) {
    const walker = document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) { const node = walker.currentNode; if(!node.nodeValue.trim()) continue; fullGlitchNodes.push({node,text:node.nodeValue}); parents.add(node.parentElement); }
  }
  parents.forEach(el => {
    fullGlitchElements.push({el,style:el.getAttribute('style'),label:el.getAttribute('aria-label')});
    const width = el.getBoundingClientRect().width;
    if(getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
    el.style.width = `${width}px`; el.style.flexShrink = '0';
    if(!el.hasAttribute('aria-label')) el.setAttribute('aria-label',el.textContent);
  });
  fullGlitchEnd = t + 850; fullGlitchTick = -1;
  document.body.classList.add('hero-meltdown');
}
function updateFullGlitch(t) {
  if(!motion || document.hidden || scrollY > innerHeight * .35) { if(fullGlitchEnd) restoreFullGlitch(); return; }
  if(fullGlitchEnd && t >= fullGlitchEnd) { restoreFullGlitch(); nextFullGlitch = t + 8500 + Math.random() * 6500; }
  if(!fullGlitchEnd && t >= nextFullGlitch) startFullGlitch(t);
  const tick = Math.floor(t / 95);
  if(fullGlitchEnd && tick !== fullGlitchTick) {
    fullGlitchTick = tick;
    fullGlitchNodes.forEach(({node,text}) => { node.nodeValue = [...text].map(c => { if(/\s/.test(c)) return c; const pool = chars.replaceAll(c,''); return pool[Math.floor(Math.random() * pool.length)]; }).join(''); });
  }
}
const fields = [...document.querySelectorAll('.noise')].map(canvas => ({ canvas, ctx: canvas.getContext('2d'), visible: true, seed: Math.random() * 90 }));
const observer = new IntersectionObserver(entries => entries.forEach(entry => { const f = fields.find(f => f.canvas === entry.target); if (f) f.visible = entry.isIntersecting; }));
fields.forEach(f => observer.observe(f.canvas));
function resize() { fields.forEach(f => { const dpr = Math.min(devicePixelRatio || 1, 1.5); f.w = f.canvas.clientWidth; f.h = f.canvas.clientHeight; f.canvas.width = f.w * dpr; f.canvas.height = f.h * dpr; f.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }); drawNoise(0); }
function hash(n) { return Math.abs(Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1; }
function drawNoise(t) {
  fields.forEach(f => {
    if (!f.visible) return;
    const {ctx, w, h} = f; ctx.clearRect(0, 0, w, h);
    const dense = f.canvas.dataset.density === 'hero';
    const phase = motion ? Math.floor(t / 155) : 0;
    ctx.font = `${dense ? 11 : 10}px monospace`;
    if (dense) {
      const cell = w < 600 ? 11 : 12;
      for (let y = 48; y < h - 35; y += 12) for (let x = -20; x < w + 20; x += cell) {
        const nx = x / w, ny = y / h;
        const wave = Math.sin(nx * 17 + ny * 9 + f.seed) + Math.cos(ny * 19 - nx * 7) + Math.sin(nx * 31 + ny * 15) * .5;
        const rnd = hash(x * 3 + y * 7 + f.seed);
        if (wave > .72 && rnd > .19) {
          const jump = hash(y + phase) > .93 ? 18 : 0;
          ctx.fillStyle = `rgba(255,22,30,${.32 + rnd * .48})`;
          ctx.fillText(chars[Math.floor(hash(x + y + phase) * chars.length)], x + jump + eased.x * 19, y + eased.y * 14);
        }
      }
      for (let i = 0; i < 9; i++) { const yy = hash(i * 45 + phase) * h; ctx.fillStyle = '#ff202a'; if (hash(i + phase) > .63) ctx.fillRect(hash(i * 17 + phase) * w, yy, 20 + hash(i + 4) * 65, 1); }
    } else {
      for (let i = 0; i < 27; i++) { const seed = i + f.seed; const moving = phase ? Math.floor(phase / 9) : 0; const x = hash(seed * 3 + moving) * w, y = hash(seed * 9 + moving) * h; ctx.fillStyle = `rgba(255,37,45,${.25 + hash(seed + phase) * .5})`; const size = hash(seed) > .8 ? 5 : 2; ctx.fillRect(x + eased.x * 9, y, size, size); if (i % 7 === 0) ctx.fillText('0x' + Math.floor(hash(seed + phase) * 99), x + 8, y + 5); }
    }
  });
}
function restore() { if (active) { active.textContent = active.dataset.original; active.classList.remove('glitching'); active = null; } }
function frame(t) {
  updateFullGlitch(t);
  drawFrontGlitch(t);
  if (motion && !document.hidden) {
    eased.x += (pointer.x - eased.x) * .065; eased.y += (pointer.y - eased.y) * .065;
    layers.forEach(el => { const rect = el.getBoundingClientRect(); if (rect.bottom < -150 || rect.top > innerHeight + 150) return; const depth = Number(el.dataset.depth); const scroll = Math.max(-25, Math.min(25, (innerHeight / 2 - (rect.top + rect.height / 2)) * .035)); el.style.setProperty('--px', `${eased.x * depth * 16}px`); el.style.setProperty('--py', `${(eased.y * 12 + scroll) * depth}px`); });
    if (t - last > 140) { drawNoise(t); last = t; if (active) active.textContent = [...active.dataset.original].map(c => c !== ' ' && Math.random() > .72 ? chars[Math.floor(Math.random() * chars.length)] : c).join(''); }
    if (active && t > glitchEnd) restore();
    if (!fullGlitchEnd && t > nextGlitch) { const visible = texts.filter(el => { const r = el.getBoundingClientRect(); return r.top > 0 && r.bottom < innerHeight; }); active = visible[Math.floor(Math.random() * visible.length)]; if (active) { active.classList.add('glitching'); glitchEnd = t + 260; } nextGlitch = t + 2400 + Math.random() * 3300; }
  }
  requestAnimationFrame(frame);
}
function updateMotion() { document.body.classList.toggle('motion-off', !motion); toggle.textContent = `MOTION: ${motion ? 'ON' : 'OFF'}`; toggle.setAttribute('aria-pressed', String(!motion)); if (!motion) { restore(); eased = {x:0,y:0}; drawNoise(0); } }
toggle.addEventListener('click', () => { motion = !motion; updateMotion(); });
reduced.addEventListener('change', () => { motion = !reduced.matches; updateMotion(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { restore(); restoreFullGlitch(); } });
window.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') pointer = { x: (e.clientX / innerWidth - .5) * 2, y: (e.clientY / innerHeight - .5) * 2 }; }, {passive:true});
document.addEventListener('pointerleave', () => { pointer = {x:0,y:0}; });
window.addEventListener('resize', resize, {passive:true});
resize(); updateMotion(); requestAnimationFrame(frame);

// Short, local bursts above every layer. No full-screen flashing.
const front = document.querySelector('#front-glitch');
const frontCtx = front.getContext('2d');
const sections = [...document.querySelectorAll('main > section')];
let burstAt = performance.now() + 3000, burstUntil = 0, burstSeed = 0, frontTick = -1;
function sizeFront() { front.width = innerWidth; front.height = innerHeight; }
sizeFront(); window.addEventListener('resize', sizeFront, {passive:true});
function currentSection() { return sections.reduce((best, section, i) => Math.abs(section.offsetTop - scrollY) < Math.abs(sections[best].offsetTop - scrollY) ? i : best, 0); }
function drawFrontGlitch(t) {
  if (!motion || document.hidden) { frontCtx.clearRect(0,0,front.width,front.height); burstUntil = 0; return; }
  if (t >= burstAt) { burstSeed = Math.random() * 999; burstUntil = t + 420; burstAt = t + 3200 + Math.random() * 3000; }
  const tick = Math.floor(t / 85);
  if (tick === frontTick) return;
  frontTick = tick; frontCtx.clearRect(0,0,front.width,front.height);
  if ((t > burstUntil && !fullGlitchEnd) || tick % 4 === 0) return;
  const mode = currentSection(), w = front.width, h = front.height;
  frontCtx.fillStyle = '#ff252d'; frontCtx.strokeStyle = '#ff252d'; frontCtx.font = '11px monospace';
  if(mode === 0) {
    // Additional large foreground tears; retain the existing thin interference below.
    for(let i = 0; i < 3; i++) {
      const seed = burstSeed + i * 73 + tick;
      const x = hash(seed) * w * .65, y = h * (.14 + hash(seed + 9) * .66);
      const width = w * (.22 + hash(seed + 3) * .34), height = 18 + hash(seed + 5) * Math.min(65,h * .07);
      frontCtx.globalAlpha = .82; frontCtx.fillRect(x,y,width,height);
      frontCtx.globalAlpha = .4; frontCtx.fillRect(x - 25,y + height + 6,width * .78,8);
      frontCtx.globalAlpha = 1; frontCtx.fillStyle = '#000';
      for(let j = 0; j < 5; j++) frontCtx.fillRect(x + hash(seed + j * 9) * width,y + j * height / 5, width * .22,2);
      frontCtx.fillStyle = '#ff252d';
    }
  }
  for (let i = 0; i < (mode === 1 ? 15 : 7); i++) {
    const n = burstSeed + i * 31, x = hash(n + tick) * w, y = hash(n + 7) * h;
    if (mode === 0) { const width = 30 + hash(n) * w * .22; frontCtx.fillRect(x,y,width,1 + hash(n + 5) * 4); frontCtx.globalAlpha = .35; frontCtx.fillRect(x - 13,y + 7,width * .6,2); frontCtx.globalAlpha = 1; }
    else if (mode === 1) { const size = 3 + hash(n) * 11; frontCtx.fillRect(x,y,size,size); if(i % 5 === 0) { frontCtx.strokeRect(x - 7,y - 8,74,26); frontCtx.fillText('ERR_'+Math.floor(hash(n)*99),x,y + 8); } }
    else { const cx = w * .5 + (hash(n) - .5) * Math.min(w * .8,550), cy = h * .6 + (hash(n + 3) - .5) * 240; frontCtx.fillRect(cx,cy,16 + hash(n + 1) * 100,2); frontCtx.fillText('</'+chars[Math.floor(hash(n + tick)*chars.length)]+'>',cx + 10,cy + 16); }
  }
}

// One wheel gesture advances one screen; tall screens remain fully readable.
let scrollLock = 0, lastWheel = 0, wheelTotal = 0;
function goToSection(index) {
  const target = sections[Math.max(0,Math.min(sections.length - 1,index))];
  scrollLock = performance.now() + 950;
  window.scrollTo({top:target.offsetTop,behavior:motion ? 'smooth' : 'instant'});
}
window.addEventListener('wheel', event => {
  if(event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
  const now = performance.now(), gap = now - lastWheel; lastWheel = now;
  if(now < scrollLock) { event.preventDefault(); return; }
  // Ignore the inertial tail of the gesture that initiated a transition.
  if(gap < 130 && wheelTotal === Infinity) { event.preventDefault(); return; }
  if(gap > 130) wheelTotal = 0;
  const index = currentSection(), section = sections[index], direction = Math.sign(event.deltaY);
  const bottom = section.offsetTop + section.offsetHeight - innerHeight;
  if(direction > 0 && scrollY < bottom - 3 || direction < 0 && scrollY > section.offsetTop + 3) return;
  event.preventDefault(); wheelTotal += event.deltaY;
  if(Math.abs(wheelTotal) < 15) return;
  if(index + direction >= 0 && index + direction < sections.length) goToSection(index + direction);
  wheelTotal = Infinity;
}, {passive:false});
document.querySelectorAll('.nav a[href^="#"]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault(); const index = sections.findIndex(section => '#'+section.id === link.getAttribute('href'));
  goToSection(index); history.replaceState(null,'',link.getAttribute('href'));
}));
function updateNavigation() { const id = sections[currentSection()].id; document.querySelectorAll('.nav a[href^="#"]').forEach(link => { if(link.getAttribute('href') === '#'+id) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current'); }); }
window.addEventListener('scroll', updateNavigation, {passive:true}); updateNavigation();
let touchStart = null, swipeDirection = 0;
window.addEventListener('touchstart', event => { touchStart = event.touches.length === 1 ? {x:event.touches[0].clientX,y:event.touches[0].clientY,index:currentSection()} : null; swipeDirection = 0; }, {passive:true});
window.addEventListener('touchmove', event => {
  if(!touchStart || event.touches.length !== 1) return;
  const dy = touchStart.y - event.touches[0].clientY, dx = touchStart.x - event.touches[0].clientX;
  if(Math.abs(dy) < 15 || Math.abs(dx) > Math.abs(dy)) return;
  const section = sections[touchStart.index], down = dy > 0;
  const atEdge = down ? scrollY + innerHeight >= section.offsetTop + section.offsetHeight - 4 : scrollY <= section.offsetTop + 4;
  if(atEdge) { event.preventDefault(); swipeDirection = Math.sign(dy); }
}, {passive:false});
window.addEventListener('touchend', () => { if(touchStart && swipeDirection && performance.now() >= scrollLock) goToSection(touchStart.index + swipeDirection); touchStart = null; swipeDirection = 0; }, {passive:true});
window.addEventListener('touchcancel', () => { touchStart = null; swipeDirection = 0; }, {passive:true});
