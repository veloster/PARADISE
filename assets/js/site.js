// GSAP is deferred: this runs on DOMContentLoaded, i.e. after both deferred scripts have executed (or failed)
document.addEventListener('DOMContentLoaded', function(){
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.gsap && !reduce) document.documentElement.classList.add('js');
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  /* ---------- birthday club: inline steps ---------- */
  (function(){
    const steps = $$('.cstep'), err = $('#cErr'), f = $('#clubForm'); if (!f) return;
    const go = n => { steps.forEach(x => x.classList.toggle('on', x.dataset.s === String(n))); err.textContent = ''; const inp = $(`.cstep[data-s="${n}"] input`); if (inp && n !== 4) inp.focus({ preventScroll: true }); };
    const bad = (el, on) => { el.closest('.club__in, label').classList.toggle('bad', on); el.setAttribute('aria-invalid', String(on)); };
    f.addEventListener('input', e => { const l = e.target.closest('.bad'); if (l) l.classList.remove('bad'); err.textContent = ''; });
    $('#cNext').addEventListener('click', () => {
      const fi = $('#cFirst'), la = $('#cLast'), em = $('#cEmail');
      const okc = $('#cOk'), ok1 = !!fi.value.trim(), ok2 = !!la.value.trim(), ok3 = !!em.value.trim() && em.checkValidity(), ok4 = okc.checked;
      bad(fi, !ok1); bad(la, !ok2); bad(em, !ok3); okc.closest('label').classList.toggle('bad', !ok4);
      if (!(ok1 && ok2 && ok3)){ err.textContent = !ok3 && ok1 && ok2 ? 'Please enter a valid e-mail address.' : 'Please fill in your first name, last name and e-mail.'; return; }
      if (!ok4){ err.textContent = 'Please confirm you are 18 or older and agree to receive our e-mails.'; return; }
      go(3); });
    f.addEventListener('submit', async e => { e.preventDefault();
      const bd = $('#cBday'), zp = $('#cZip');
      const mmdd = bd.value.replace(/\s/g, '').match(/^(\d{1,2})[\/\-.]?(\d{1,2})$/);
      const okB = !!mmdd && +mmdd[1] >= 1 && +mmdd[1] <= 12 && +mmdd[2] >= 1 && +mmdd[2] <= 31, okZ = /^\d{5}(-\d{4})?$/.test(zp.value.trim());
      bad(bd, !okB); bad(zp, !okZ);
      if (!okB || !okZ){ err.textContent = !okB ? 'Enter your birthday as MM / DD.' : 'Enter a 5-digit ZIP code.'; return; }
      const sb = f.querySelector('[type=submit]'); sb.disabled = true; err.textContent = 'Sending…';
      const first = $('#cFirst').value.trim(), last = $('#cLast').value.trim(), email = $('#cEmail').value.trim();
      const ok = await sendForm(MAIL_CLUB, { _subject: 'Paradice · Birthday Club · ' + first + ' ' + last, 'First name': first, 'Last name': last, 'E-mail': email, Birthday: String(mmdd[1]).padStart(2, '0') + '/' + String(mmdd[2]).padStart(2, '0'), 'ZIP code': zp.value.trim(), 'Consent (18+, e-mails)': 'Yes', _replyto: email });
      sb.disabled = false;
      if (!ok){ err.textContent = 'Sorry, that didn\'t go through. Please try again.'; return; }
      go(4); });
  })();


  /* ---------- locations map: dot map, clusters that zoom ---------- */
  (() => {
    const map = $('#wMap'); if (!map) return;
    const cv = $('#wCanvas'), ctx = cv.getContext('2d'), pinsEl = $('#wPins'), back = $('#wBack'), legend = $('#wLegend'), list = $('#wList');
    const US = [[-124.7,48.4],[-124.1,46.3],[-124.4,43],[-124.2,40.4],[-123.8,39.4],[-122.5,37.8],[-122.4,37.2],[-121.9,36.6],[-121.3,35.6],[-120.6,34.5],[-119.2,34.15],[-118.8,34.02],[-118.5,34.03],[-118.42,33.75],[-118.2,33.74],[-117.9,33.6],[-117.7,33.46],[-117.38,33.2],[-117.28,32.85],[-117.24,32.68],[-117.12,32.53],[-114.7,32.7],[-111,31.3],[-108.2,31.3],[-106.5,31.8],[-104.9,30.6],[-103.1,29],[-101.4,29.8],[-99.5,27.5],[-97.4,25.9],[-97.2,27.8],[-96.5,28.6],[-94,29.7],[-91.5,29.4],[-89.8,29.1],[-89.2,30.3],[-87.5,30.3],[-85.3,29.7],[-84,30],[-82.9,29.1],[-82.7,27.5],[-81.9,26.4],[-81.1,25.2],[-80.4,25.2],[-80.1,26.9],[-80.6,28.4],[-81.3,30],[-81.4,31.3],[-80,32.5],[-78.7,33.8],[-77.8,34.5],[-75.8,35.5],[-75.9,36.9],[-75.1,38.4],[-74,40.5],[-72,41.1],[-70,41.6],[-70.7,42.7],[-70.2,43.6],[-68.5,44.4],[-67,44.8],[-67.8,47.1],[-69.2,47.4],[-71.5,45],[-74.8,45],[-76.8,43.6],[-79.1,43.3],[-79,42.6],[-81.5,41.7],[-82.9,42.1],[-82.5,43.5],[-83.4,45.8],[-84.8,45.9],[-86.5,46.5],[-88.4,48.3],[-90,48],[-92,46.7],[-95.1,49],[-104,49],[-116,49],[-123.3,49]];
    const BORDERS = [[[-120,42],[-120,39],[-114.63,35.0]],[[-114.05,42],[-114.05,37]],[[-114.05,37],[-109.05,37]],[[-114.63,35.0],[-114.6,34.3],[-114.4,34.1],[-114.7,32.7]],[[-109.05,37],[-109.05,31.33]],[[-103.06,37],[-103.06,32],[-106.6,32]],[[-103,36.5],[-100,36.5],[-100,34.56],[-95.5,33.9],[-94.04,33.55],[-94.04,31],[-93.6,29.8]]];
    const STATES = [{t:'Nevada',lon:-116.8,lat:39.2},{t:'California',lon:-119.6,lat:35.7},{t:'Arizona',lon:-110.9,lat:34.55},{t:'Texas',lon:-99.6,lat:31.3},{t:'Utah',lon:-111.6,lat:39.4},{t:'New Mexico',lon:-106.1,lat:34.4}];
    const LOC = [
      { id:'lv', city:'Las Vegas', st:'NV', area:'Las Vegas Valley', lon:-115.14, lat:36.17, open:true },
      { id:'hd', city:'Henderson', st:'NV', area:'Las Vegas Valley', lon:-114.98, lat:36.03, side:'left', open:true },
      { id:'px', city:'Phoenix', st:'AZ', area:'Arizona', lon:-112.07, lat:33.45 },
      { id:'dl', city:'Dallas', st:'TX', area:'Texas', lon:-96.8, lat:32.78 }
    ];
    const CL = [
      { id:'NV', name:'Las Vegas Valley', short:'Las Vegas', ids:['lv','hd'], view:{ lon:-115.06, lat:36.1, span:1.3 }, mside:'above' },
      { id:'AZ', name:'Phoenix', short:'Phoenix', ids:['px'], view:{ lon:-112.07, lat:33.45, span:3.2 }, mside:'below' },
      { id:'TX', name:'Dallas', short:'Dallas', ids:['dl'], view:{ lon:-96.8, lat:32.78, span:3.2 }, side:'left', mside:'below' }
    ];
    const ALL = { lon:-107.8, lat:34.4, span:27.5 };
    const K = Math.cos(34 * Math.PI / 180);
    let W = 0, H = 0, dpr = 1, view = { ...ALL }, region = 'all', sel = null, anim = 0;
    const proj = (lon, lat, v = view) => { const s = W / (v.span * K); return [(lon - v.lon) * K * s + W / 2, (v.lat - lat) * s + H / 2]; };
    const unproj = (x, y, v = view) => { const s = W / (v.span * K); return [(x - W / 2) / (K * s) + v.lon, v.lat - (y - H / 2) / s]; };
    const inside = (lon, lat) => { let c = false; for (let i = 0, j = US.length - 1; i < US.length; j = i++){ const [xi, yi] = US[i], [xj, yj] = US[j]; if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) c = !c; } return c; };
    const css = getComputedStyle(document.documentElement);
    const INK = (getComputedStyle(document.documentElement).getPropertyValue('--marine') || '#054664').trim();
    const stat = l => l.open ? 'Open now' : 'Coming soon';

    // pins (HTML buttons, so they are keyboard- and screen-reader-friendly)
    const pinEls = {};
    LOC.forEach(l => { const b = document.createElement('button'); b.type = 'button'; b.className = 'wpin' + (l.side ? ' ' + l.side : '') + (l.open ? '' : ' soon'); b.innerHTML = `<span class="d" aria-hidden="true"></span><span class="l">${l.city}<em>${stat(l)}</em></span>`; b.setAttribute('aria-label', `${l.city}, ${l.st}: ${stat(l)}`); b.addEventListener('click', () => pick(l.id)); pinsEl.appendChild(b); pinEls[l.id] = b; });
    const clEls = {};
    CL.forEach(c => { const open = c.ids.filter(id => LOC.find(l => l.id === id).open).length, st = open ? 'Open now' : 'Coming soon'; const b = document.createElement('button'); b.type = 'button'; b.className = 'wpin cl' + (open ? '' : ' soon'); b.innerHTML = `<span class="d" aria-hidden="true">${c.ids.length}</span><span class="l"><span class="lf">${c.name}</span><span class="ls">${c.short}</span><em>${st}</em></span>`; b.setAttribute('aria-label', `${c.name}: ${c.ids.length} trailer${c.ids.length > 1 ? 's' : ''}, ${st}. Zoom in`); b.addEventListener('click', () => zoomTo(c.id)); pinsEl.appendChild(b); clEls[c.id] = b; });
    const stEls = STATES.map(s0 => { const e = document.createElement('span'); e.className = 'where__st'; e.textContent = s0.t; pinsEl.appendChild(e); return e; });

    // side list
    list.innerHTML = LOC.map(l => `<li data-st="${l.st}" class="${l.open ? 'open' : ''}"><button type="button" data-id="${l.id}"><b>${l.city}, ${l.st}</b><small>${l.open ? 'Open' : 'Soon'}</small></button></li>`).join('');
    list.querySelectorAll('button').forEach(b => b.addEventListener('click', () => pick(b.dataset.id)));
    const chips = $$('.where__chips button');
    chips.forEach(b => b.addEventListener('click', () => zoomTo(b.dataset.r)));

    function size(){ const r = map.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); draw(); }
    function draw(){
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      // dot grid in screen space, so dots keep the same size at every zoom
      const step = W < 520 ? 10 : 13, r = step * 0.22;
      ctx.fillStyle = INK; ctx.globalAlpha = .18; ctx.beginPath();
      for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step){ const [lo, la] = unproj(x, y); if (inside(lo, la)){ ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832); } }
      ctx.fill();
      // state borders
      ctx.globalAlpha = .28; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.setLineDash([4, 5]);
      BORDERS.forEach(line => { ctx.beginPath(); line.forEach(([lo, la], i) => { const [x, y] = proj(lo, la); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); });
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      // HTML layer
      const zoomed = view.span < 12;
      LOC.forEach(l => { const e = pinEls[l.id], [x, y] = proj(l.lon, l.lat); e.style.transform = `translate(${x}px,${y}px) ` + (l.side === 'below' ? 'translate(-50%,-8px)' : l.side === 'above' ? 'translate(-50%,calc(-100% + 8px))' : `translate(${l.side === 'left' ? 'calc(-100% + 8px)' : '-8px'},-50%)`); e.hidden = !zoomed || x < -40 || x > W + 40 || y < -20 || y > H + 20; e.classList.toggle('on', sel === l.id); });
      const small = W < 560; map.classList.toggle('small', small);
      CL.forEach(c => { const e = clEls[c.id], v = c.view, [x, y] = proj(v.lon, v.lat), sd = (small ? c.mside : c.side) || 'right'; e.classList.remove('left', 'below', 'above'); if (sd !== 'right') e.classList.add(sd); e.style.transform = `translate(${x}px,${y}px) ` + (sd === 'below' ? 'translate(-50%,-17px)' : sd === 'above' ? 'translate(-50%,calc(-100% + 17px))' : `translate(${sd === 'left' ? 'calc(-100% + 17px)' : '-17px'},-50%)`); e.hidden = zoomed; });
      STATES.forEach((s0, i) => { const [x, y] = proj(s0.lon, s0.lat); const e = stEls[i]; e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.opacity = zoomed ? 0 : 1; });
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function fly(to){
      cancelAnimationFrame(anim); const from = { ...view };
      if (reduce){ view = { ...to }; draw(); return; }
      const t0 = performance.now(), d = 900, lf = Math.log(from.span), lt = Math.log(to.span);
      const step = now => { const k = Math.min(1, (now - t0) / d), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        view = { lon: from.lon + (to.lon - from.lon) * e, lat: from.lat + (to.lat - from.lat) * e, span: Math.exp(lf + (lt - lf) * e) }; draw();
        if (k < 1) anim = requestAnimationFrame(step); };
      anim = requestAnimationFrame(step);
    }
    function fitSpan(v){ return W && H && W / H < 1.1 ? v.span * 1.15 : v.span; }
    function showCard(){}
    function zoomTo(r, withCard){
      region = r; sel = null; showCard(null);
      chips.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.r === r)));
      list.querySelectorAll('li').forEach(li => li.classList.toggle('dim', r !== 'all' && li.dataset.st !== r));
      list.querySelectorAll('button').forEach(b => b.classList.remove('on'));
      back.hidden = r === 'all';
      if (r === 'all'){ fly({ ...ALL, span: fitSpan(ALL) }); return; }
      const c = CL.find(x => x.id === r), sp = fitSpan(c.view); fly({ ...c.view, span: sp, lat: c.view.lat });
    }
    function pick(id){
      const l = LOC.find(x => x.id === id), c = CL.find(x => x.ids.includes(id));
      if (region !== c.id) zoomTo(c.id, true);
      if (W < 560){ const sp = Math.min(fitSpan(c.view), 2.2); fly({ lon: l.lon, lat: l.lat, span: sp }); }
      sel = id; showCard(l); draw();
      list.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.id === id));
    }
    back.addEventListener('click', () => zoomTo('all'));
    map.addEventListener('keydown', e => { if (e.key === 'Escape' && region !== 'all') zoomTo('all'); });
    new ResizeObserver(() => { size(); if (!anim || region === 'all') view = region === 'all' ? { ...ALL, span: fitSpan(ALL) } : view; draw(); }).observe(map);
    size(); view = { ...ALL, span: fitSpan(ALL) }; draw();
  })();

  /* ---------- flavour data ---------- */
  const FLAVORS = [
    { name:'Grenadine', bg:'#D7263D', fg:'#FFFFFF', syrup:'#D7263D' },
    { name:'Passion fruit', bg:'#FDC208', fg:'#054664', syrup:'#FDC208' },
    { name:'Mango',     bg:'#2C8C4B', fg:'#FFFFFF', syrup:'#F7A11B' },
    { name:'Island blue', bg:'#00BADD', fg:'#054664', syrup:'#00BADD' }
  ];
  const stage = $('#flavorStage'), ghost = $('#ghost'), ghostWrap = $('#ghostWrap'), flvs = $$('.flv'), bars = $$('.progress i');
  let flavorIdx = 0;
  function setFlavor(i){
    if (i === flavorIdx) return;
    flavorIdx = i;
    flvs.forEach((el,k) => el.setAttribute('aria-hidden', k===i ? 'false' : 'true'));
    bars.forEach((b,k) => b.classList.toggle('on', k===i));
    $$('.fset').forEach((el,k) => el.classList.toggle('on', k===i));
    ghost.textContent = FLAVORS[i].name;
    stage.style.setProperty('--stage-fg', FLAVORS[i].fg);
  }
  // background follows the same progress as the syrup running down the cup
  const hex = h => [1,3,5].map(o => parseInt(h.slice(o, o+2), 16));
  function mixHex(a, b, t){ const A = hex(a), B = hex(b); return 'rgb(' + A.map((v,i) => Math.round(v + (B[i]-v)*t)).join(',') + ')'; }
  stage.style.setProperty('--stage-bg', FLAVORS[0].bg);
  stage.style.setProperty('--stage-fg', FLAVORS[0].fg);
  const flavorsSec = $('#flavors');
  function flavorProgress(){
    const r = flavorsSec.getBoundingClientRect();
    const total = flavorsSec.offsetHeight - innerHeight;
    return Math.min(1, Math.max(0, -r.top / total));
  }

  function tickGallery(){}

  /* ---------- 3D cup: Blender turntable renders (72 angles x 5 flavours) driven by mouse + scroll ---------- */
  // The canvas is only as big as one render; it is moved and scaled with a GPU transform and
  // redrawn only when the angle or the flavour actually changes.
  const canvas = $('#stage3d'), ctx = canvas.getContext('2d'), shadowEl = $('#cupShadow');
  const SEQ = ['tri','grenadine','passion','mangue','bleu'], NF = 72;
  // two sizes: phones / low-memory devices get the light set
  const LITE = Math.min(innerWidth, innerHeight) < 700 || (navigator.deviceMemory || 8) <= 4;
  const TIER = LITE ? 'lo' : 'hi';
  const CROP = LITE ? { w: 400, h: 635, foot: 0.980, cx: 0.5 } : { w: 600, h: 952, foot: 0.980, cx: 0.5 };
  let CW = CROP.w, CH = CROP.h; canvas.width = CW; canvas.height = CH;
  const mk = document.createElement('canvas'); mk.width = CW; mk.height = CH; const mctx = mk.getContext('2d');
  const BASE_W = 400; canvas.style.width = BASE_W + 'px'; canvas.style.height = Math.round(BASE_W * CROP.h / CROP.w) + 'px';
  // Frames come in sheets of 6 (one file = 6 angles side by side). Sheets are kept compressed (Blob);
  // only the flavours on screen are decoded (ImageBitmap) and the others are released, so the
  // browser never runs out of memory and never has to re-decode while the cup turns.
  const SH = 6, NS = NF / SH, HAS_BMP = 'createImageBitmap' in window;
  const blobs = SEQ.map(() => new Array(NS)), sheets = SEQ.map(() => new Array(NS));
  const frames = SEQ.map(() => new Array(NF)), ready = SEQ.map(() => new Uint8Array(NF));
  const url = (si, k) => `assets/cup/${TIER}/${SEQ[si]}/s${String(k).padStart(2,'0')}.webp?v=1`;
  const ORDER = []; for (const f of [0, 36, 18, 54, 9, 45, 27, 63]) { const k = Math.floor(f / SH); if (!ORDER.includes(k)) ORDER.push(k); }
  for (let k = 0; k < NS; k++) if (!ORDER.includes(k)) ORDER.push(k);
  let focus = 0;
  const KEEP = LITE ? 2 : 3;
  const wanted = si => si >= focus && si < focus + KEEP;
  function publish(si, k, img){ sheets[si][k] = img; for (let j = 0; j < SH; j++){ frames[si][k * SH + j] = { im: img, x: j * CROP.w }; ready[si][k * SH + j] = 1; } dirty = true; mark3d(); }
  // the canvas takes over from the fallback picture as soon as the cup on screen has a frame to draw
  let has3d = false;
  function mark3d(){ if (!has3d && (ready[0][0] || ready[focus].includes(1))){ has3d = true; document.documentElement.classList.add('has-3d'); } }
  // decodes run one at a time, so a burst never blocks the frames of the cup that is turning
  let dq = Promise.resolve();
  const idle = () => new Promise(r => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 120 }) : setTimeout(r, 16)));
  function decode(si, k){ dq = dq.then(() => (sheets[si][k] || !blobs[si][k] || !wanted(si)) ? null : idle().then(() => decodeNow(si, k))); return dq; }
  function decodeNow(si, k){
    if (sheets[si][k] || !blobs[si][k] || !wanted(si)) return Promise.resolve();
    if (!HAS_BMP) return new Promise(res => { const im = new Image(); im.onload = () => { if (wanted(si)) publish(si, k, im); res(); }; im.onerror = res; im.src = URL.createObjectURL(blobs[si][k]); });
    // decode the sheet once, cut it into 6 small bitmaps (fast to draw), then drop the big one
    return createImageBitmap(blobs[si][k]).then(bm => Promise.all(Array.from({ length: SH }, (_, j) => createImageBitmap(bm, j * CROP.w, 0, CROP.w, CROP.h))).then(parts => { bm.close();
      if (!wanted(si) || sheets[si][k]) { parts.forEach(p => p.close()); return; }
      sheets[si][k] = parts; parts.forEach((pb, j) => { frames[si][k * SH + j] = { im: pb, x: 0 }; ready[si][k * SH + j] = 1; }); dirty = true; mark3d(); })).catch(() => {});
  }
  function release(si){ for (let k = 0; k < NS; k++) if (sheets[si][k]) { const im = sheets[si][k]; (Array.isArray(im) ? im : [im]).forEach(x => x.close && x.close()); sheets[si][k] = null; for (let j = 0; j < SH; j++){ frames[si][k * SH + j] = null; ready[si][k * SH + j] = 0; } } }
  function setFocus(si){
    if (si === focus) return; focus = si;
    if (si > 0) for (let i = si; i <= si + 2; i++) unlock(i);   // the flavour on screen and the next two
    for (let i = 0; i < SEQ.length; i++) if (!wanted(i)) release(i);
    for (let i = focus; i < Math.min(SEQ.length, focus + KEEP); i++) ORDER.forEach(k => decode(i, k));
    kick();
  }
  // What may be downloaded. The hero shows the tri-colour cup, so only its first sheet (frames 0-5) is fetched
  // right away; its other sheets follow once the page has painted and gone idle. The other flavours wait until
  // the flavour section gets close (the visitor starts scrolling towards it) or until one is about to be shown.
  const allow = new Uint8Array(SEQ.length);   // 0 = nothing yet, 1 = first sheet only, 2 = every sheet
  allow[0] = 1;
  function unlock(si){ if (si >= 0 && si < SEQ.length && allow[si] !== 2){ allow[si] = 2; kick(); } }
  (() => {
    const later = () => requestAnimationFrame(() => setTimeout(() => window.requestIdleCallback ? requestIdleCallback(() => unlock(0), { timeout: 2000 }) : unlock(0), 0));
    if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
    // "close" = the flavour section is within half a screen below the viewport and the page has been scrolled
    let near = !('IntersectionObserver' in window), io = null;
    const approach = () => { unlock(0); unlock(1); unlock(2); removeEventListener('scroll', onScroll); if (io) io.disconnect(); };
    const onScroll = () => { if (near && scrollY > 0) approach(); };
    addEventListener('scroll', onScroll, { passive: true });
    if (!near){
      io = new IntersectionObserver(es => { near = es.some(e => e.isIntersecting); if (near && scrollY > 0) approach(); }, { rootMargin: '0px 0px 50% 0px' });
      io.observe(flavorsSec);
    }
  })();
  // download queue: the flavour on screen first, then the next ones, then the rest (only what is allowed)
  const done = SEQ.map(() => new Uint8Array(NS)), busy = SEQ.map(() => new Uint8Array(NS));
  function nextTask(){
    const byDist = SEQ.map((_, i) => i).sort((a, b) => ((a - focus + 5) % 5) - ((b - focus + 5) % 5));
    for (const si of byDist) { if (!allow[si]) continue; for (const k of (allow[si] === 2 ? ORDER : ORDER.slice(0, 1))) if (!done[si][k] && !busy[si][k]) return [si, k]; }
    return null;
  }
  let workers = 0; const MAXW = 3;
  function kick(){ while (workers < MAXW){ const t = nextTask(); if (!t) return; run(t); } }
  function run([si, k]){ workers++; busy[si][k] = 1;
    // the very first sheet yields to the first-screen picture (the LCP); after that the flavour on screen goes first
    fetch(url(si, k), { priority: si === focus && has3d ? 'high' : 'low' }).then(r => r.ok ? r.blob() : null).then(b => { if (b) blobs[si][k] = b; done[si][k] = 1; decode(si, k); })
      .catch(() => { done[si][k] = 1; })
      .finally(() => { busy[si][k] = 0; workers--; kick(); }); }
  kick();
  function pick(si, f){ if (ready[si][f]) return frames[si][f];
    for (let d = 1; d < NF/2; d++){ const a = (f + d) % NF, b = (f - d + NF) % NF; if (ready[si][a]) return frames[si][a]; if (ready[si][b]) return frames[si][b]; } return null; }

  let mx = 0, my = 0, tmx = 0, tmy = 0;
  addEventListener('pointermove', e => { tmx = (e.clientX / innerWidth) * 2 - 1; tmy = (e.clientY / innerHeight) * 2 - 1; }, { passive:true });
  const anchorHero = $('#anchorHero'), anchorFlavor = $('#anchorFlavor');
  const drifters = $$('[data-depth]');
  const ss = (a,b,t) => { t = Math.min(1, Math.max(0, (t-a)/(b-a))); return t*t*(3-2*t); };
  const lerp = (a,b,t) => a + (b-a)*t;
  

  let dirty = true, last = '', turnsShown = 0, lastBg = '', lastGx = '', lastGk = '', lastOnStage = null, lastFixed = null;
  function paint(siA, siB, mix, f){
    const key = siA + '|' + siB + '|' + f + '|' + Math.round(mix * 160);
    if (!dirty && key === last) return;
    const a = pick(siA, f); if (!a) return;
    last = key; dirty = false;
    ctx.clearRect(0, 0, CW, CH);
    const blit = fr => ctx.drawImage(fr.im, fr.x, 0, CROP.w, CROP.h, 0, 0, CW, CH);
    if (mix >= 0.999) { const b = pick(siB, f); blit(b || a); return; }
    blit(a);
    if (mix <= 0.001) return;
    const b = pick(siB, f); if (!b) return;
    // the new syrup soaks down from the top of the dome: B is faded in through a soft vertical gradient (no hard edge)
    const front = lerp(-0.14, 0.78, mix) * CH, fe = 0.13 * CH;
    mctx.globalCompositeOperation = 'source-over'; mctx.clearRect(0, 0, CW, CH);
    mctx.drawImage(b.im, b.x, 0, CROP.w, CROP.h, 0, 0, CW, CH);
    const g = mctx.createLinearGradient(0, front - fe, 0, front + fe);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.35, 'rgba(0,0,0,.85)'); g.addColorStop(0.7, 'rgba(0,0,0,.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    mctx.globalCompositeOperation = 'destination-in'; mctx.fillStyle = g; mctx.fillRect(0, 0, CW, CH);
    ctx.drawImage(mk, 0, 0);
  }

  let t0 = performance.now();
  function frame(now){
    const t = (now - t0) / 1000;
    mx += (tmx - mx) * 0.2; my += (tmy - my) * 0.2;
    tickGallery();
    const fp = flavorProgress();
    { const spF = fp * 4, kF = Math.min(3, Math.floor(spF)), eF = kF < 3 ? ss(0.7, 0.98, spF - kF) : 0;
      setFlavor(Math.min(3, kF + ((-0.06 + 0.68 * eF - 0.06) / 0.30 > 0.5 ? 1 : 0)));
      const frontF = -0.06 + 0.68 * eF, covF = Math.min(1, Math.max(0, (frontF - 0.06) / 0.30));   // share of the dome already recoloured
      const bgv = mixHex(FLAVORS[kF].bg, FLAVORS[Math.min(3, kF + 1)].bg, Math.round(covF * 50) / 50); if (bgv !== lastBg){ lastBg = bgv; stage.style.setProperty('--stage-bg', bgv); } }
    const gx = (-fp * 30).toFixed(2); if (gx !== lastGx){ lastGx = gx; ghost.style.transform = `translate3d(${gx}vw,0,0)`; }
    if (!reduce) drifters.forEach(el => { const d = +el.dataset.depth; el.style.transform = `translate3d(${mx * d * 22}px, ${my * d * 16 + Math.sin(t * 0.9 + d * 3) * 6}px, 0)`; });

    const fr = flavorsSec.getBoundingClientRect();
    const onStage = fr.top < 80 && fr.bottom > 0; if (onStage !== lastOnStage){ lastOnStage = onStage; document.documentElement.classList.toggle('no-blur', onStage); }
    const p = 1 - Math.min(1, Math.max(0, fr.top / innerHeight)), pe = p * p * (3 - 2 * p);
    const h = anchorHero.getBoundingClientRect(), f = anchorFlavor.getBoundingClientRect();
    const visible = !(h.bottom < -50 && f.bottom < -50) && !(fr.top > innerHeight * 1.2 && h.top > innerHeight);
    canvas.style.visibility = shadowEl.style.visibility = visible ? 'visible' : 'hidden';
    if (visible){
      const bx = lerp(h.left, f.left, pe), by = lerp(h.top, f.top, pe), bw = lerp(h.width, f.width, pe), bh = lerp(h.height, f.height, pe);
      const s = Math.min(bw / CROP.w, bh / CROP.h), w = CROP.w * s, hh = CROP.h * s;
      const x = bx + (bw - w) / 2, y = by + (bh - hh) / 2 + (reduce ? 0 : Math.sin(t * 1.1) * 3);
      const tiltOn = fp <= 0 ? 1 - pe : 0;
      // fixed only while the flavour stage is pinned; elsewhere absolute (page coords), so mobile Safari never clips the cup under its toolbar
      const fixedMode = fr.top <= 0 && fr.bottom >= innerHeight; if (fixedMode !== lastFixed){ lastFixed = fixedMode; canvas.style.position = shadowEl.style.position = fixedMode ? 'fixed' : 'absolute'; }
      const oy = fixedMode ? 0 : scrollY;
      canvas.style.transform = `translate3d(${x + mx * 14 * tiltOn}px,${y + oy + my * 8 * tiltOn}px,0) scale(${w / BASE_W}) translate(${BASE_W/2}px,${CROP.h/5}px) rotate(${mx * -2.2 * tiltOn}deg) translate(${-BASE_W/2}px,${-CROP.h/5}px)`;
      shadowEl.style.transform = `translate3d(${x + w * CROP.cx - w * 0.36}px,${y + oy + hh * CROP.foot - w * 0.05}px,0)`;
      { const sr = stage.getBoundingClientRect(), gv = [x + w / 2 - sr.left, y + hh * 0.56 - sr.top, w * 0.62, hh * 0.62].map(v => Math.round(v));
        const gk = gv.join(); if (gk !== lastGk){ lastGk = gk; const gs = ghostWrap.style; gs.setProperty('--gcx', gv[0] + 'px'); gs.setProperty('--gcy', gv[1] + 'px'); gs.setProperty('--grx', gv[2] + 'px'); gs.setProperty('--gry', gv[3] + 'px'); } }
      shadowEl.style.width = (w * 0.72) + 'px'; shadowEl.style.height = (w * 0.1) + 'px';
      // rotation follows the scroll continuously: one turn on the way down, one turn per flavour
      let target, siA, siB, mix;
      if (fp <= 0) { siA = 0; siB = 1; mix = ss(0.2, 0.9, p); target = p; }
      else { const sp = fp * 4, k = Math.min(3, Math.floor(sp)); siA = k + 1; siB = Math.min(4, k + 2); mix = k < 3 ? ss(0.7, 0.98, sp - k) : 0; target = 1 + sp; }
      target += mx * 0.2;
      turnsShown += (target - turnsShown) * 0.25;
      const fi = ((Math.round(turnsShown * NF) % NF) + NF) % NF;
      setFocus(siA);
      if (mix > 0) unlock(siB);   // the next syrup is about to run down the cup
      paint(siA, siB, mix, fi);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- 3D trailer: 72 Blender renders, turns with the scroll through the franchise section ---------- */
  (function(){
    const cv = $('#trailerCanvas'); if (!cv) return;
    const cx = cv.getContext('2d'), N = 72, imgs = new Array(N), ok = new Uint8Array(N);
    const TW = 1600, TH = 1000; cv.width = TW; cv.height = TH;
    let started = false, last = -1, shown = 0, angT = 0, velT = 0, dragT = false, lxT = 0;
    const box = cv.parentElement;
    box.addEventListener('pointerdown', e => { dragT = true; lxT = e.clientX; velT = 0; box.classList.add('dragging'); box.setPointerCapture(e.pointerId); });
    box.addEventListener('pointermove', e => { if (!dragT) return; const d = -(e.clientX - lxT) / box.clientWidth * 1.1; lxT = e.clientX; angT += d; velT = d; });
    const endT = () => { dragT = false; box.classList.remove('dragging'); };
    box.addEventListener('pointerup', endT); box.addEventListener('pointercancel', endT);
    box.tabIndex = 0;
    box.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { velT = 0.02; e.preventDefault(); } if (e.key === 'ArrowRight') { velT = -0.02; e.preventDefault(); } });
    const sec = $('#own');
    // loads only when the viewer is opened: coarse angles first, then the rest, 6 at a time
    function start(){ if (started) return; started = true;
      const order = []; for (const st of [12, 6, 3, 1]) for (let f = 0; f < N; f += st) if (!order.includes(f)) order.push(f);
      let i = 0; const next = () => { if (i >= order.length) return; const f = order[i++]; const im = new Image();
        im.onload = () => (im.decode ? im.decode() : Promise.resolve()).catch(()=>{}).then(() => { imgs[f] = im; ok[f] = 1; last = -1; next(); });
        im.onerror = next; im.src = `assets/trailer/${String(f).padStart(3,'0')}.webp?v=6`; };
      for (let k = 0; k < 6; k++) next(); }
    window.__trailerStart = start;
    function pick(f){ if (ok[f]) return imgs[f]; for (let d = 1; d < N/2; d++){ if (ok[(f+d)%N]) return imgs[(f+d)%N]; if (ok[(f-d+N)%N]) return imgs[(f-d+N)%N]; } return null; }
    function tick(){
      const r = cv.getBoundingClientRect();
      if (r.bottom > -100 && r.top < innerHeight + 100){
        if (!dragT){ angT += velT; velT *= 0.94; if (Math.abs(velT) < 0.0004 && !reduce) angT += 0.0006; }
        shown += (angT - shown) * 0.35;
        const f = ((Math.round(shown * N) % N) + N) % N;
        if (f !== last){ const im = pick(f); if (im){ cx.clearRect(0, 0, TW, TH); cx.drawImage(im, 0, 0, TW, TH); last = f; } }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  /* ---------- event types: drag the strip ---------- */
  (function(){
    const strip = $('#evTypes'); if (!strip) return; const ul = strip.querySelector('ul');
    let x = 0, vx = 0, drag = false, lx = 0;
    strip.addEventListener('pointerdown', e => { drag = true; lx = e.clientX; strip.classList.add('dragging'); strip.setPointerCapture(e.pointerId); });
    strip.addEventListener('pointermove', e => { if (!drag) return; vx = e.clientX - lx; lx = e.clientX; x += vx; });
    const end = () => { drag = false; strip.classList.remove('dragging'); };
    strip.addEventListener('pointerup', end); strip.addEventListener('pointercancel', end);
    (function loop(){ if (!drag){ x += vx; vx *= 0.93; if (!reduce && Math.abs(vx) < 0.2) x -= 0.25; }
      const half = ul.scrollWidth / 2; if (x < -half) x += half; if (x > 0) x -= half;
      ul.style.transform = `translate3d(${x}px,0,0)`; requestAnimationFrame(loop); })();
  })();


  /* ---------- self-serve bar: tap to highlight ---------- */
  (() => {
    $$('.selfserve__list li').forEach(li => { li.tabIndex = 0; li.addEventListener('click', () => { $$('.selfserve__list li').forEach(x => x !== li && x.classList.remove('tap')); li.classList.toggle('tap'); }); });
  })();

  /* ---------- form delivery (FormSubmit → e-mail) ---------- */
  const MAIL_FRANCHISE = 'info@paradicelv.com', MAIL_EVENTS = 'sam@paradicelv.com', MAIL_CLUB = 'info@paradicelv.com';
  /* anti-spam: honeypot + minimum human time + per-browser rate limit */
  const T0 = Date.now(); let firstTouch = 0;
  document.addEventListener('focusin', e => { if (!firstTouch && e.target.closest('form')) firstTouch = Date.now(); });
  const RL_KEY = 'pdx_sends', RL_MAX = 5, RL_WINDOW = 60 * 60 * 1000;
  function rateOk(){ try { const now = Date.now(); const list = JSON.parse(localStorage.getItem(RL_KEY) || '[]').filter(t => now - t < RL_WINDOW); if (list.length >= RL_MAX) return false; list.push(now); localStorage.setItem(RL_KEY, JSON.stringify(list)); return true; } catch (_) { return true; } }
  async function sendForm(to, fields){
    const honey = [...document.querySelectorAll('.hp__in')].map(i => i.value).join(''); if (honey) return true; /* honeypot filled: bot, drop silently */
    const filledIn = Date.now() - (firstTouch || T0); if (filledIn < 3000) return true; /* filled faster than a human can: drop silently */
    if (!rateOk()) return false; /* more than 5 sends in an hour from this browser */
    try { const r = await fetch('https://formsubmit.co/ajax/' + to, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ _template: 'table', _captcha: 'false', ...fields, _honey: honey, 'Received (Las Vegas / Los Angeles time)': new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' PT' }) });
      return r.ok; } catch (_) { return false; } }

  /* ---------- keyboard focus trap for modal dialogs ---------- */
  function trapFocus(root, e){
    if (e.key !== 'Tab' || root.hidden) return;
    const f = [...root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not(.hp__in),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el => el.offsetParent !== null || el === document.activeElement);
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1], cur = document.activeElement;
    if (!root.contains(cur)){ e.preventDefault(); a.focus(); return; }
    if (e.shiftKey && cur === a){ e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && cur === z){ e.preventDefault(); a.focus(); } }

  /* ---------- franchise inquiry form ---------- */
  (() => {
    const m = $('#franModal'); if (!m) return;
    const f = $('#fqForm'), s1 = f.querySelector('[data-s="1"]'), s2 = f.querySelector('[data-s="2"]'), err = $('#fqErr');
    let last = null;
    const open = v => { m.hidden = !v; document.documentElement.style.overflow = v ? 'hidden' : '';
      if (v){ m.querySelector('input:not(.hp__in),select').focus(); } else if (last) last.focus(); };
    $$('[data-fran]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); last = b; open(true); }));
    $('#fqClose').addEventListener('click', () => open(false));
    $('#fqDoneClose').addEventListener('click', () => open(false));
    m.addEventListener('click', e => { if (e.target === m) open(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !m.hidden) open(false); else trapFocus(m, e); });
    const check = box => { let ok = true; err.textContent = '';
      box.querySelectorAll('input[required]:not([type=radio]):not([type=checkbox]),select[required]').forEach(el => { const good = el.checkValidity() && el.value.trim() !== ''; el.classList.toggle('bad', !good); if (!good) ok = false; });
      box.querySelectorAll('.fq__pills').forEach(g => { if (!g.querySelector('[required]')) return; const good = !!g.querySelector('input:checked'); g.classList.toggle('bad', !good); if (!good) ok = false; });
      const c = box.querySelector('[name=consent]'); if (c && !c.checked){ ok = false; err.textContent = 'Please accept to be contacted.'; }
      if (!ok && !err.textContent) err.textContent = 'Please fill in the highlighted fields.';
      box.querySelectorAll('input,select,textarea').forEach(el => el.setAttribute('aria-invalid', String(el.classList.contains('bad') || !!el.closest('.fq__pills.bad'))));
      if (!ok){ const first = box.querySelector('.bad input, input.bad, select.bad'); if (first) first.focus(); }
      return ok; };
    const step = n => { s1.hidden = n !== 1; s2.hidden = n !== 2; $('#fqStep').textContent = n === 1 ? 'Step 1 of 2 · About you' : 'Step 2 of 2 · Your plans'; $('#fqBar').style.width = n === 1 ? '50%' : '100%'; err.textContent = ''; (n === 1 ? s1 : s2).querySelector('input:not(.hp__in),select').focus(); };
    $('#fqNext').addEventListener('click', () => { if (check(s1)) step(2); });
    $('#fqBack').addEventListener('click', () => step(1));
    f.addEventListener('input', e => { e.target.classList.remove('bad'); e.target.removeAttribute('aria-invalid'); });
    f.addEventListener('change', e => { const g = e.target.closest('.fq__pills'); if (g) g.classList.remove('bad'); });
    f.addEventListener('submit', async e => { e.preventDefault(); if (!check(s2)) return;
      const data = Object.fromEntries(new FormData(f).entries());
      const sb = f.querySelector('[type=submit]'); sb.disabled = true; err.textContent = 'Sending…';
      const ok = await sendForm(MAIL_FRANCHISE, { _subject: 'Paradice · Franchise inquiry · ' + [data.first, data.last].filter(Boolean).join(' '), ...Object.fromEntries(Object.entries(data).map(([k, v]) => [({ first: 'First name', last: 'Last name', email: 'E-mail', phone: 'Phone', city: 'City', state: 'State', capital: 'Capital available', units: 'Units', employment: 'Current situation', source: 'Heard about us', msg: 'Message', consent: 'Agreed to be contacted' })[k] || k, v || '-'])), ...(data.email ? { _replyto: data.email } : {}) });
      sb.disabled = false;
      if (!ok){ err.textContent = 'Sorry, that didn\'t go through. Please try again or call (702) 336-5208.'; return; }
      err.textContent = '';
      $('#fqName').textContent = data.first || 'friend'; f.hidden = true; $('#fqDone').hidden = false; $('#fqDone button').focus(); });
  })();

  /* ---------- events quote builder ---------- */
  (function(){
    const form = $('#qform'); if (!form) return;
    const chips = $$('#qchips button'), bgs = $$('#qbg img'), g = $('#qg'), go = $('#qgo'), d = $('#qd'), sum = $('#qsum');
    const GUESTS = [10,20,30,40,50,60,75,100,125,150,200,250,300,400,500,600,700,800,900,1000];
    const gv = () => GUESTS[+g.value], gtxt = () => gv() === 1000 ? '1,000+' : gv().toLocaleString('en-US');
    const gpaint = () => { g.style.setProperty('--p', (g.value / g.max * 100) + '%'); go.textContent = gtxt(); g.setAttribute('aria-valuetext', gtxt() + ' guests'); };
    gpaint();
    let kind = 'birthday';
    function write(){ const lab = chips.find(c => c.dataset.k === kind).textContent;
      const dt = d.value ? new Date(d.value + 'T12:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'date to choose';
      sum.textContent = `${lab} · ${gtxt()} guests · ${dt}. Fully self-contained: no water, no power needed. We park and we pour.`; }
    chips.forEach(c => c.addEventListener('click', () => { kind = c.dataset.k; chips.forEach(o => o.setAttribute('aria-pressed', String(o === c)));
      bgs.forEach(b => b.classList.toggle('on', b.dataset.k === kind)); write(); }));
    g.addEventListener('input', () => { gpaint(); write(); }); d.addEventListener('change', write);
    const qn = $('#qn'), qp = $('#qp'), qe = $('#qe'), qc = $('#qc'), qz = $('#qz'), qs = $('#qs'), done = $('#qdone'), btn = form.querySelector('[type=submit]');
    [qn, qp, qe].forEach(i => i.addEventListener('input', () => [qn, qp, qe].forEach(x => x.classList.remove('bad'))));
    [qc, qz, qs].forEach(i => ['input','change'].forEach(ev => i.addEventListener(ev, () => i.classList.remove('bad'))));
    const paintSel = () => qs.classList.toggle('empty', !qs.value); qs.addEventListener('change', paintSel); paintSel();
    const say = (t, bad) => { done.textContent = t; done.classList.toggle('err', !!bad); done.hidden = false; };
    form.addEventListener('submit', async e => { e.preventDefault();
      const name = qn.value.trim(), phone = qp.value.trim(), email = qe.value.trim();
      const emailOk = !email || qe.checkValidity();
      const city = qc.value.trim(), zip = qz.value.trim(), state = qs.value, zipOk = /^[0-9]{5}(-[0-9]{4})?$/.test(zip);
      const who = !name || (!phone && !email) || !emailOk;
      if (who || !city || !zipOk || !state){ qn.classList.toggle('bad', !name); if (!phone && !email){ qp.classList.add('bad'); qe.classList.add('bad'); } if (!emailOk) qe.classList.add('bad');
        qc.classList.toggle('bad', !city); qz.classList.toggle('bad', !zipOk); qs.classList.toggle('bad', !state);
        say(who ? 'Add your name and a phone number or e-mail so we can get back to you.' : 'Tell us where the event is: city, ZIP code and state.', true); return; }
      btn.disabled = true; say('Sending…');
      const ok = await sendForm(MAIL_EVENTS, { _subject: 'Paradice · Event request · ' + name, Occasion: chips.find(c => c.dataset.k === kind).textContent, Guests: gtxt(), Date: d.value || 'to choose', Name: name, Phone: phone || '-', Email: email || '-', City: city, ZIP: zip, State: state, ...(email ? { _replyto: email } : {}) });
      btn.disabled = false;
      if (ok){ say('Thanks ' + name + '! We got your request and will get back to you shortly.'); form.querySelectorAll('.qcontact input').forEach(i => i.value = ''); qs.value = ''; paintSel(); }
      else say('Sorry, that didn\'t go through. Please call us at (702) 336-5208.', true); });
  })();

  /* ---------- franchise: tabs + 3D viewer ---------- */
  (function(){
    const tabs = $$('.biz__tabs [role=tab]'), panels = $$('.biz__panel'); if (!tabs.length) return;
    function show(t){ tabs.forEach(o => { const on = o === t; o.setAttribute('aria-selected', String(on)); o.tabIndex = on ? 0 : -1; });
      panels.forEach(p => p.hidden = p.id !== t.getAttribute('aria-controls')); }
    tabs.forEach((t, k) => { t.addEventListener('click', () => show(t));
      t.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft'){ e.preventDefault(); const n = tabs[(k + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; show(n); n.focus(); } }); });
    const m = $('#bizModal'), open = $('#biz3d');
    const vis = v => { if (v && window.__trailerStart) window.__trailerStart(); m.hidden = !v; document.documentElement.style.overflow = v ? 'hidden' : ''; (v ? m.querySelector('.biz__trailer') : open).focus(); };
    open.addEventListener('click', () => vis(true));
    ['pointerenter','focus','touchstart'].forEach(ev => open.addEventListener(ev, () => window.__trailerStart && window.__trailerStart(), { once: true, passive: true }));
    $('#bizClose').addEventListener('click', () => vis(false));
    m.addEventListener('click', e => { if (e.target === m) vis(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !m.hidden) vis(false); else trapFocus(m, e); });
  })();

  /* ---------- scroll animations ---------- */
  if (!window.gsap || reduce) return;
  gsap.registerPlugin(ScrollTrigger);

  // split headings into words that rise into place
  $$('.split').forEach(el => {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3){
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement('span'); w.className = 'w';
            const inner = document.createElement('span'); inner.textContent = part; w.appendChild(inner); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    const words = el.querySelectorAll('.w>span');
    const inHero = el.closest('.hero');
    gsap.from(words, { yPercent: 110, rotate: 4, duration: 0.9, ease: 'power3.out', stagger: 0.06,
      scrollTrigger: inHero ? null : { trigger: el, start: 'top 85%' }, delay: inHero ? 0.15 : 0 });
  });

  // hero entrance
  gsap.from('#sun', { scale: 0.6, duration: 1.2, ease: 'elastic.out(1, 0.6)' });
  gsap.from('.fruits .fr img', { scale: 0, rotate: -60, opacity: 0, duration: 0.9, ease: 'back.out(2.2)', stagger: { each: 0.09, from: 'random' }, delay: 0.35 });
  $('.hero__visual').addEventListener('pointerenter', () => gsap.fromTo('.fruits .fr img', { scale: 1 }, { scale: 1.12, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out', stagger: 0.03, overwrite: 'auto' }));
  gsap.from('#stickerHero', { scale: 0, rotate: -90, duration: 0.9, delay: 0.5, ease: 'back.out(2)' });
  gsap.to('#sun', { yPercent: 18, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // marquee: drifts on its own and speeds up with scroll direction
  const mq = $('#marquee');
  const loop = gsap.to(mq, { xPercent: -33.333, ease: 'none', duration: 46, repeat: -1 });
  ScrollTrigger.create({ onUpdate: self => {
    const v = self.getVelocity() / 300;
    gsap.to(loop, { timeScale: (self.direction > 0 ? 1 : -1) * (1 + Math.min(1.2, Math.abs(v) * 0.4)), duration: 0.3, overwrite: true });
  }});

  // parallax photos
  // the photo sits in a <picture> (display:contents, no box of its own): trigger on the real container
  $$('.para').forEach(img => gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img.closest('picture') ? img.closest('picture').parentElement : img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));

  // gallery cards fan in

  // feature tiles and party photos rise

  // franchise arch opens, sticker spins with scroll
    gsap.from('.bigmenu li', { yPercent: 60, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.07, scrollTrigger: { trigger: '.bigmenu', start: 'top 85%' } });
  gsap.from('.biz__box > *', { y: 30, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: '.biz__hero', start: 'top 70%' } });
  gsap.from('.quote__step, .quote__sum', { y: 30, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: '.quote', start: 'top 70%' } });
  gsap.from('.club__box > *', { y: 24, opacity: 0, duration: .6, ease: 'power3.out', stagger: .07, scrollTrigger: { trigger: '.club', start: 'top 70%' } });

});

// gallery lightbox
(()=>{const lb=document.getElementById('lb'); if(!lb) return;
 const its=[...document.querySelectorAll('.gal__it')]; const img=document.getElementById('lbImg'), cap=document.getElementById('lbCap'); let k=0;
 const show=i=>{k=(i+its.length)%its.length; const b=its[k]; img.src=b.dataset.full; img.alt=b.querySelector('img').alt; cap.textContent=b.querySelector('.gal__cap').textContent+' · '+(k+1)+' / '+its.length;};
 its.forEach((b,i)=>b.addEventListener('click',()=>{show(i); if(lb.showModal) lb.showModal(); else lb.setAttribute('open','');}));
 lb.addEventListener('click',e=>{const a=e.target.dataset.lb; if(a==='x') lb.close(); else if(a==='p') show(k-1); else if(a==='n') show(k+1); else if(e.target===lb) lb.close();});
 lb.addEventListener('keydown',e=>{if(e.key==='ArrowLeft') show(k-1); if(e.key==='ArrowRight') show(k+1);});
 let x0=null; lb.addEventListener('touchstart',e=>{x0=e.touches[0].clientX},{passive:true}); lb.addEventListener('touchend',e=>{if(x0==null)return; const d=e.changedTouches[0].clientX-x0; if(Math.abs(d)>50) show(k+(d<0?1:-1)); x0=null;});
})();
