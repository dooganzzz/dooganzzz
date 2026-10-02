/* [화면] 오의(대성 초식) 연출: 병기마다 바탕색 하나와 모이는 방식 · 공격 동작 · 몬스터의 최후를 따로 둔다.
   기운이 모임 → 병기(손)에 실림 → 공격 → 그 자리에서 터짐 → (숨통을 끊으면) 몬스터의 최후.
   검: 찌름 · 산산조각 / 도: 뛰어올라 내려칠 때 도기가 호랑이가 되어 덮침 · 두 동강 / 창: 쾌속 연타 → 꿰뚫기 /
   암기: 한 자루가 꿰뚫을 때마다 불어나 8자로 오가며 거듭 관통 / 권장: 주먹 · 발 · 장 연타 → 날려 보냄.
   ui_live.js(강호행 무대)가 오의가 나간 합에서 부른다. 그림 경로는 ASSET으로만. */
const OG_W = ms => new Promise(r => setTimeout(r, ms));
const OG_CFG = {
  sword: { rgb: '90,140,255', fx: 'ougi_sword', impact: 10, glow: 'blade', gather: 'smoke', death: 'shatter', dash: true,
    seg: { 0: [.48, .57, .61, .87], 1: [.52, .53, .73, .67], 2: [.32, .54, .50, .69], 4: [.46, .43, .29, .28], 5: [.74, .29, .93, .26], 6: [.70, .46, .79, .52] }, reachFrame: 5, reachAt: [.93, .26], reachInto: .38 },
  blade: { rgb: '255,165,55', fx: 'ougi_blade', impact: 11, fxFrom: 5, fxPer: 85, fxAnchor: 'bottom', fxFromBlade: true, glow: 'blade', gather: 'embers', death: 'split', dash: true,
    seg: { 0: [.52, .40, .60, .35], 1: [.45, .49, .33, .75], 2: [.41, .47, .30, .58], 4: [.56, .17, .32, .06], 5: [.58, .56, .74, .73], 6: [.58, .73, .77, .83] }, reachFrame: 5, reachAt: [.74, .73], reachInto: .45 },
  spear: { rgb: '40,215,185', fx: 'ougi_spear', impact: 9, glow: 'blade', gather: 'spiral', death: 'pierce', dash: true,
    seg: { 0: [.22, .68, .63, .10], 1: [.30, .51, .64, .47], 2: [.27, .47, .66, .47], 4: [.26, .23, .67, .62], 5: [.27, .56, .80, .38], 6: [.55, .86, .63, .03] }, reachFrame: 5, reachAt: [.80, .38], reachInto: .3 },
  hidden: { rgb: '170,95,255', noFx: true, kunai: true, impact: 10, glow: 'hands', gather: 'smoke', death: 'riddle', dash: false,
    hands: { 0: [[.55, .20]], 4: [[.37, .13], [.62, .36]], 5: [[.71, .27]], 6: [[.45, .30]] } },
  fist: { rgb: '255,85,50', fx: 'ougi_fist', impact: 9, glow: 'hands', gather: 'flame', death: 'launch', dash: true,
    hands: { 0: [[.55, .26]], 1: [[.60, .41]], 2: [[.63, .38]], 4: [[.70, .26]], 5: [[.69, .09], [.49, .17]], 6: [[.69, .29]] }, reachFrame: 4, reachAt: [.70, .26], reachInto: .3 },
};
/* 오의를 펼친다: 무대(sc) 위에 오의 막을 덮고, 실제 제자 · 요수 자리에서 연출한 뒤 막을 걷는다. 끝나면 풀리는 Promise.
   o = { w 병기, name 오의 이름, heroEl · foeEl 무대의 제자 · 요수, foeImg 요수 그림(조각용), dmg 실제 피해, kill 숨통을 끊는가, onImpact 맞는 순간 } */
/* [SSOT] 오의 고르기: 무공에 제 오의(OG_MANUAL)가 있으면 그 그림 · 빛깔을 쓰고, 병기 공용 오의의 겹치는 막(기운 오라 · 모이는 기운 · 칼빛 · 터지는 고리)은 끈다.
   없으면 병기 공용 오의(OG_CFG). 오의 그림은 이 함수 하나에서만 고른다 (옛 그림이 새 그림 위에 겹치지 않게) */
const OG_MANUAL = {};   // 예: sw1b: { fx: 'ougi_sw1b', rgb: '200,225,255', impact: 5 } — impact: 16컷 중 터지는 컷 (일격 순간에 맞춤) · 확정본이 들어오면 여기에
function ougiCfg(w, mid) { const M = mid && OG_MANUAL[mid]; return M && OG_CFG[w] ? { ...OG_CFG[w], ...M, own: true } : OG_CFG[w]; }
function ougiPreload(w, mid) { const C = ougiCfg(w, mid); if (C) preloadImgs([...(C.own ? [] : [ASSET.fx('aura'), ASSET.fx('dart')]), ...(C.fx ? [ASSET.fx(C.fx)] : [])]); }
function ougiPlay(sc, o) {
  const w = o.w, C = ougiCfg(w, o.mid);
  if (!C || !sc || !o.heroEl || !o.foeEl) return Promise.resolve();
  const stage = document.createElement('div'); stage.className = 'og-layer'; stage.dataset.live = 1;
  stage.style.setProperty('--c', C.rgb); stage.style.setProperty('--aura-f', OG_AURA_F[w]);
  stage.innerHTML = `<i class="og-dim"></i><div class="og-hero" data-f="0"><div class="og-spr og-prev"></div><div class="og-spr og-cur"></div></div><div class="og-foe"></div><img class="og-aura" alt="" src="${ASSET.fx('aura')}"><i class="og-fx"></i><i class="og-ring"></i><b class="og-ban"><small>奧義</small></b><span class="og-num"></span><i class="og-flash"></i>`;
  sc.appendChild(stage);
  const $ = s => stage.querySelector(s);
  const H = $('.og-hero'), E = $('.og-foe'), cur = $('.og-cur'), prev = $('.og-prev'), ban = $('.og-ban'), aura = $('.og-aura'), fx = $('.og-fx'), ring = $('.og-ring'), num = $('.og-num'), flash = $('.og-flash');
  const D = Math.max(0, +o.dmg || 0), HERO = `url('${ASSET.hero(w)}')`, DART = `url('${ASSET.fx('dart')}')`;
  const part = s => fmt(Math.max(1, Math.round(D * s * (.85 + Math.random() * .3))));   // 연타 한 번의 몫 (마지막에 실제 피해 합을 크게)
  ban.append(o.name || ''); num.textContent = fmt(D);
  if (C.fx) fx.style.backgroundImage = `url('${ASSET.fx(C.fx)}')`;
  // 무대의 제자 · 요수 자리 그대로 막 위에 옮겨 놓고, 진짜는 잠시 숨긴다
  const box = el => { const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect(); return { left: r.left - s.left, top: r.top - s.top, width: r.width, height: r.height }; };
  const hb = box(o.heroEl), fb = box(o.foeEl), px = b => ({ left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px' });
  Object.assign(H.style, px(hb)); cur.style.backgroundImage = prev.style.backgroundImage = HERO;
  const lspr = o.heroEl.querySelector('.sp-spr'); if (lspr) cur.style.filter = prev.style.filter = getComputedStyle(lspr).filter;
  Object.assign(E.style, px(fb));
  const twin = o.foeEl.cloneNode(true); twin.removeAttribute('id'); twin.classList.remove('striking', 'ko', 'mist');
  Object.assign(twin.style, { position: 'absolute', left: 0, top: 0, bottom: 'auto', width: '100%', height: '100%', transition: 'none', visibility: 'visible' }); E.appendChild(twin);
  o.heroEl.style.visibility = 'hidden'; o.foeEl.style.visibility = 'hidden';
  const blade = document.createElement('i'); blade.className = 'og-blade'; stage.appendChild(blade);
  const kunai = document.createElement('i'); kunai.className = 'og-kunai'; kunai.style.backgroundImage = DART; if (C.kunai) stage.appendChild(kunai);
  let kHeld = false;
  const handGlows = [0, 1].map(() => { const g = document.createElement('i'); g.className = 'og-hand'; stage.appendChild(g); return g; });
  const pos = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };
  const re = (el, c) => { el.classList.remove(c); void el.offsetWidth; el.classList.add(c); };
  const R = el => { const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }; };
  const P = (u, v) => { const r = R(H); return [r.x + u * r.w, r.y + v * r.h]; };
  const fr = () => +H.dataset.f;
  const seg = () => { const s = C.seg && (C.seg[fr()] || C.seg[4]); return s ? [P(s[0], s[1]), P(s[2], s[3])] : null; };
  const hands = () => (C.hands && (C.hands[fr()] || C.hands[4]) || []).map(h => P(h[0], h[1]));
  const body = () => { const r = R(H); return [r.x + r.w * .47, r.y + r.h * .55]; };
  const head = () => { const r = R(H); return [r.x + r.w * .47, r.y - r.h * .02]; };
  const foeC = () => { const r = R(E); return [r.x + r.w / 2, r.y + r.h * .55]; };
  function F(f, ghost) {   // 칸 바꾸기: 앞 칸을 잠깐 겹쳐 흐리게 · 잔상
    if (fr() === f && cur.style.backgroundPosition) return;
    prev.style.backgroundPosition = cur.style.backgroundPosition || '0% 0'; re(prev, 'fade');
    H.dataset.f = f; cur.style.backgroundPosition = (f * 100 / 11) + '% 0';
    if (ghost) { const r = R(H), g = document.createElement('i'); g.className = 'og-ghost';
      Object.assign(g.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', backgroundImage: HERO, backgroundPosition: prev.style.backgroundPosition });
      stage.appendChild(g); setTimeout(() => g.remove(), 420); }
  }
  let glowOn = false, raf = 0;
  function track() {
    pos(ban, ...head());
    if (glowOn && C.glow === 'blade') { const s = seg(); if (s) { const [a, b] = s, dx = b[0] - a[0], dy = b[1] - a[1];
      blade.style.left = a[0] + 'px'; blade.style.top = a[1] + 'px'; blade.style.width = Math.hypot(dx, dy) * 1.12 + 'px'; blade.style.transform = `translateY(-50%) rotate(${Math.atan2(dy, dx)}rad)`; } }
    if (kHeld) { const hs = hands(), h = hs[hs.length - 1]; if (h) pos(kunai, ...h); }
    if (glowOn && C.glow === 'hands') { const hs = hands(); handGlows.forEach((g, i) => { if (hs[i]) { pos(g, ...hs[i]); g.style.display = ''; } else g.style.display = 'none'; }); }
    raf = requestAnimationFrame(track);
  }
  const target = () => { if (C.glow === 'blade') { const [a, b] = seg(), t = Math.random(); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; } const hs = hands(); return hs[Math.floor(Math.random() * hs.length)] || body(); };
  /* 연기 줄기 하나: 시작점에서 휘어 돌며 목표(병기 · 손)로 흘러든다. path로 모양을 바꾼다 */
  function wisp(start, dur, delay, kind) {
    const el = document.createElement('i'); el.className = 'og-wisp ' + kind; stage.appendChild(el);
    const tt = Math.random(), swirl = (Math.random() < .5 ? -1 : 1) * (.6 + Math.random() * .8), size = .6 + Math.random() * .9;
    let t0 = 0;
    const step = now => {
      if (!t0) t0 = now + delay; const k = (now - t0) / dur;
      if (k < 0) { el.style.opacity = 0; return requestAnimationFrame(step); } if (k >= 1) { el.remove(); return; }
      let ex, ey; if (C.glow === 'blade') { const [a, b] = seg(); ex = a[0] + (b[0] - a[0]) * tt; ey = a[1] + (b[1] - a[1]) * tt; } else { const hs = hands(), h = hs[Math.floor(tt * hs.length)] || body(); [ex, ey] = h; }
      const e = k * k * (3 - 2 * k), [sx, sy] = start;
      let x, y;
      if (kind === 'spiral') {   // 창: 창대를 축으로 나선을 그리며 감겨 든다
        const ang = k * Math.PI * 4 + tt * 6, rad = (1 - e) * 46;
        x = sx + (ex - sx) * e + Math.cos(ang) * rad; y = sy + (ey - sy) * e + Math.sin(ang) * rad * .45;
      } else if (kind === 'dart') { // 암기: 손 둘레를 도는 작은 빛 비표
        const ang = k * Math.PI * 5 + tt * 6.28, rad = 28 * (1 - e * .55);
        x = ex + Math.cos(ang) * rad; y = ey + Math.sin(ang) * rad * .6;
      } else {
        const mx = (sx + ex) / 2 - (ey - sy) * swirl * .5, my = (sy + ey) / 2 + (ex - sx) * swirl * .5;
        x = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * mx + e * e * ex; y = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * my + e * e * ey;
      }
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.style.opacity = Math.min(1, k * 4) * (1 - Math.max(0, k - .75) * 4);
      el.style.transform = `translate(-50%, -50%) scale(${size * (1 - e * .5)})`;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function gather(ms) {
    const [bx, by] = body(), r = R(H);
    const n = { smoke: 30, embers: 34, spiral: 26, darts: 14, flame: 30 }[C.gather];
    for (let i = 0; i < n; i++) {
      const delay = Math.random() * ms * .45, dur = ms * (.5 + Math.random() * .35);
      if (C.gather === 'embers') wisp([bx + (Math.random() - .5) * r.w * .7, r.y + r.h * (.95 + Math.random() * .08)], dur, delay, 'ember');    // 도: 땅에서 불티가 솟는다
      else if (C.gather === 'spiral') { const s = seg(); wisp(s ? s[0] : [bx, by], dur, delay, 'spiral'); }                                   // 창: 창 자루 끝에서 나선
      else if (C.gather === 'darts') wisp([bx, by], dur * 1.4, delay, 'dart');
      else if (C.gather === 'flame') wisp([bx + (Math.random() - .5) * r.w * .5, by + r.h * (.1 + Math.random() * .3)], dur * .8, delay, 'flame');   // 권장: 주먹으로 불길이 타오른다
      else { const a0 = Math.random() * 6.28, r0 = r.h * .45 * (.6 + Math.random() * .5); wisp([bx + Math.cos(a0) * r0 * .8, by + Math.sin(a0) * r0], dur, delay, 'smoke'); }
    }
  }
  function hitNum(t, big) { const n = document.createElement('span'); n.className = 'og-hit' + (big ? ' big' : ''); n.textContent = t; const [x, y] = foeC();
    pos(n, x + (Math.random() - .5) * 60, y - 40 - Math.random() * 30); stage.appendChild(n); setTimeout(() => n.remove(), 900); }
  function spark(x, y) { const s = document.createElement('i'); s.className = 'og-spark'; pos(s, x, y); stage.appendChild(s); setTimeout(() => s.remove(), 400); }
  /* 몬스터의 최후: 병기마다 다르게 */
  function shards(N, bias = [0, 0], spread = 1) {
    const r = R(E), img = o.foeImg, w = r.w / N, h = r.h / N;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const d = document.createElement('i'); d.className = 'og-shard';
      Object.assign(d.style, { left: (r.x + (N - 1 - i) * w) + 'px', top: (r.y + j * h) + 'px', width: w + 'px', height: h + 'px', backgroundImage: `url(${img})`, backgroundSize: `${r.w}px ${r.h}px`, backgroundPosition: `${-i * w}px ${-j * h}px` });
      const ang = Math.atan2(j - (N - 1) / 2, -(i - (N - 1) / 2)) + (Math.random() - .5), dist = (60 + Math.random() * 90) * spread;
      d.style.setProperty('--dx', `${-Math.cos(ang) * dist - bias[0]}px`); d.style.setProperty('--dy', `${Math.sin(ang) * dist + bias[1]}px`); d.style.setProperty('--r', `${(Math.random() - .5) * 240}deg`);
      stage.appendChild(d); setTimeout(() => d.remove(), 900);
    }
    E.classList.add('gone');
  }
  function split() {   // 도: 비스듬히 두 동강 — 윗몸은 미끄러져 떨어지고 아랫몸은 주저앉는다
    const r = R(E), img = o.foeImg;
    for (const [cls, clip] of [['top', 'polygon(0 0,100% 0,100% 38%,0 62%)'], ['bot', 'polygon(0 62%,100% 38%,100% 100%,0 100%)']]) {
      const d = document.createElement('i'); d.className = 'og-half ' + cls;
      Object.assign(d.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', backgroundImage: `url(${img})`, clipPath: clip });
      stage.appendChild(d); setTimeout(() => d.remove(), 1300);
    }
    const cut = document.createElement('i'); cut.className = 'og-cut'; Object.assign(cut.style, { left: r.x + 'px', top: (r.y + r.h * .5) + 'px', width: r.w + 'px' }); stage.appendChild(cut); setTimeout(() => cut.remove(), 700);
    E.classList.add('gone');
  }
  function launch() {  // 권장: 마지막 일장에 날아가다 터진다
    E.classList.add('fly'); setTimeout(() => { shards(4, [-60, -40], .8); E.classList.remove('fly'); }, 420);
  }
  const death = { shatter: () => shards(4), split, pierce: () => { E.classList.add('push'); setTimeout(() => { shards(4, [-80, 0], .9); E.classList.remove('push'); }, 220); }, riddle: () => shards(8, [0, 0], .7), launch };
  /* 암기 오의: 한 자루를 던져 몬스터를 꿰뚫으면, 꿰뚫을 때마다 비수가 불어나(1→2→4→8→12) 저마다 다른 각도의 8자로 왔다 갔다 하며
     모두 몬스터 한가운데에서 엇갈려 다시 꿰뚫는다. 자루마다 짙은 잔상(비수 그림자 + 빛 꼬리)을 남긴다 */
  function fly8() {
    return new Promise(done => {
      const [cx, cy] = foeC(), er = R(E), A = er.w * 1.05, B = er.h * .8, t0 = -Math.PI / 2, CROSS = 6, IN = 170, DUR = 2100, COUNT = [1, 2, 4, 8, 12, 12, 12];
      const s0 = [parseFloat(kunai.style.left), parseFloat(kunai.style.top)];
      const blades = [{ el: kunai, rot: 0, sc: 1, mir: 1, last: s0, gh: 0 }];
      let start = 0, passed = 0;
      const spawnTo = n => { while (blades.length < n) { const k = blades.length, el = document.createElement('i'); el.className = 'og-kunai on charged'; el.style.backgroundImage = DART; stage.appendChild(el);
        blades.push({ el, rot: (k * 2.39996) % Math.PI, sc: .8 + (k % 4) * .14, mir: k % 2 ? -1 : 1, last: [cx, cy], gh: 0 }); } };   // 황금각으로 흩어 겹치지 않게
      const at = (b, t) => { const d = 1 + Math.sin(t) ** 2, x = b.mir * A * b.sc * Math.cos(t) / d, y = B * b.sc * 2.2 * Math.sin(t) * Math.cos(t) / d, c = Math.cos(b.rot), sn = Math.sin(b.rot);
        return [cx + x * c - y * sn, cy + x * sn + y * c]; };
      const pierce = (n, big) => { const [x, y] = foeC();
        for (let i = 0; i < Math.min(6, 2 + n / 2); i++) spark(x + (Math.random() - .5) * er.w * .5, y + (Math.random() - .5) * er.h * .5);
        E.classList.remove('flinch'); void E.offsetWidth; E.classList.add('flinch'); re(flash, 'play');
        for (let i = 0; i < Math.min(3, Math.ceil(n / 3)); i++) setTimeout(() => hitNum(part(big ? .14 : .05), big && i === 0), i * 45); };
      const trail = (b, p, a, now) => {   // 잔상: 비수 그림자(그대로 남아 흐려짐) + 빛 꼬리
        if (now - b.gh < 22) return; b.gh = now;
        const g = document.createElement('i'); g.className = 'og-kghost'; g.style.backgroundImage = DART; g.style.setProperty('--a', a + 'rad'); pos(g, ...p); stage.appendChild(g); setTimeout(() => g.remove(), 420);
        const tr = document.createElement('i'); tr.className = 'og-ktrail'; tr.style.setProperty('--a', a + 'rad'); pos(tr, ...p); stage.appendChild(tr); setTimeout(() => tr.remove(), 360); };
      const step = now => {
        if (!start) start = now; const el = now - start;
        let t = null, k = 0;
        if (el >= IN) { k = Math.min(1, (el - IN) / DUR); const u = .5 * k + .5 * k * k; t = t0 + u * CROSS * Math.PI;   // 갈수록 빨라진다
          const n = Math.min(CROSS, Math.floor((t - t0) / Math.PI + 1e-6));
          while (passed <= n) { const cnt = blades.length; pierce(cnt, passed === CROSS); spawnTo(COUNT[passed + 1] || 12); passed++; } }
        for (const b of blades) {
          const p = t === null ? [s0[0] + (cx - s0[0]) * (el / IN), s0[1] + (cy - s0[1]) * (el / IN)] : k >= 1 ? [cx, cy] : at(b, t);
          const dx = p[0] - b.last[0], dy = p[1] - b.last[1], a = Math.atan2(dy, dx);
          if (Math.hypot(dx, dy) > .5) { b.el.style.setProperty('--a', a + 'rad'); trail(b, p, a, now); }
          pos(b.el, ...p); b.last = p;
        }
        if (k < 1) requestAnimationFrame(step);
        else { blades.forEach((b, i) => { b.el.classList.remove('charged'); b.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }); if (i) setTimeout(() => b.el.remove(), 240); }); done(); }
      };
      requestAnimationFrame(step);
    });
  }
  async function play() {
    const [cx, cy] = foeC(), fw = fx.offsetWidth;
    fx.style.left = (cx - fw / 2) + 'px'; fx.style.top = (C.fxAnchor === 'bottom' ? cy - fw * .82 : cy - fw / 2) + 'px';
    F(4); stage.classList.add('dark'); track(); if (!o.noName) re(ban, 'play');   // 두루마리가 이미 이름을 외쳤으면 오의 이름 띠는 다시 띄우지 않는다
    if (!C.own) { pos(aura, ...body()); aura.className = 'og-aura on'; } await OG_W(700);   // 제 오의는 공용 기운 오라를 띄우지 않는다
    // 이펙트 시작은 '터지는 컷'이 공격 순간에 오도록 계산해 둔다 (16컷 2초 → 한 컷 125ms)
    const reach = { sword: 1400, blade: 1370, spear: 1820, hidden: 1550, fist: 1790 }[w];   // 이 시점부터 공격이 닿기까지 (아래 동작 시간의 합)
    // 이펙트: from컷부터 재생. 컷당 시간(ms)은 병기마다 (도는 공중에서 도를 치켜든 순간부터 빠르게 호랑이가 된다)
    const from = C.fxFrom || 0, per = C.fxPer || 125;
    const playFx = () => { fx.getAnimations().forEach(a => a.cancel()); const n = 16 - from;
      fx.animate([{ backgroundPosition: (from * 100 / 15) + '% 0' }, { backgroundPosition: (16 * 100 / 15) + '% 0' }], { duration: n * per, easing: `steps(${n})`, fill: 'forwards' });
      fx.animate([{ opacity: 0 }, { opacity: 1, offset: .06 }, { opacity: 1, offset: .9 }, { opacity: 0 }], { duration: n * per, fill: 'forwards' });
      if (C.fxFromBlade) bladeOut((C.impact - from) * per); };
    /* 도: 도신에 서린 도기가 빠져나오며 호랑이 꼴을 이루고, 커지면서 몹에게 덮친다 (불티 꼬리를 남김) */
    function bladeOut(ms) {
      const fw = fx.offsetWidth, fc = [fx.offsetLeft + fw / 2, fx.offsetTop + fw / 2]; let t0 = 0, lastE = 0;
      const step = now => { if (!t0) t0 = now; const k = Math.min(1, (now - t0) / ms), e = k * k, s = seg();
        const [a, b] = s || [fc, fc], bc = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], dx = (bc[0] - fc[0]) * (1 - e), dy = (bc[1] - fc[1]) * (1 - e);
        fx.style.transform = `translate(${dx}px, ${dy}px) scale(${.3 + .7 * e})`;
        if (k < .5) blade.style.opacity = 1 - k * 1.6;   // 도신의 빛이 빠져나간다
        if (now - lastE > 30 && k < .95) { lastE = now; const em = document.createElement('i'); em.className = 'og-wisp ember'; stage.appendChild(em);
          const p0 = [a[0] + (b[0] - a[0]) * Math.random(), a[1] + (b[1] - a[1]) * Math.random()], p1 = [fc[0] + dx, fc[1] + dy];
          em.animate([{ left: p0[0] + 'px', top: p0[1] + 'px', opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }, { left: p1[0] + 'px', top: p1[1] + 'px', opacity: 0, transform: 'translate(-50%,-50%) scale(.4)' }], { duration: 260, easing: 'ease-in', fill: 'forwards' });
          setTimeout(() => em.remove(), 280); }
        if (k < 1) requestAnimationFrame(step); else blade.style.opacity = ''; };
      fx.style.transformOrigin = '50% 50%'; requestAnimationFrame(step);
    }
    glowOn = true;   // 기운이 모여 병기로 빨려 든다 (제 오의도 같은 모으기 — 빛깔은 그 오의의 rgb)
    const blaze = () => { if (C.glow === 'blade') blade.classList.add('on', 'blaze'); else if (!C.kunai) handGlows.forEach(g => g.classList.add('on', 'blaze')); };
    if (o.callout) {   // 오의 공식: 두루마리가 펼쳐지며 기를 모은다 → 시문이 나올 때 모인 기가 칼 전체로 모여 광채를 뿜는다 → 시문이 끝나면 공격하며 두루마리가 접힌다
      const co = o.callout(); gather(CO_TL.poem); setTimeout(blaze, CO_TL.poem); await co;
    } else gather(1000);
    if (!C.noFx && !C.own) setTimeout(playFx, Math.max(0, reach - (C.impact - from) * per));   // 제 오의는 아래 '터지는 순간'에 바로 튼다 (먼저 터지지 않게)
    if (C.kunai) { kHeld = true; kunai.style.removeProperty('--a'); kunai.className = 'og-kunai on'; kunai.style.opacity = ''; kunai.animate([{ '--g': .2 }, { '--g': 1 }], { duration: 1000, fill: 'forwards' }); setTimeout(() => kunai.classList.add('charged'), 450); } aura.classList.add('fadeout'); if (!o.callout) await OG_W(250); if (C.glow === 'blade') blade.classList.add('on'); else if (!C.kunai) handGlows.forEach(g => g.classList.add('on'));
    if (!o.callout) await OG_W(500); aura.className = 'og-aura';   // 두루마리를 썼으면 감기기 시작하는 순간 바로 돌진
    if (w === 'blade') {   // 도: 달려가다 뛰어올라 공중에서 도를 치켜들고, 내려앉으며 내려친다
      const hr = R(H), er = R(E), left = er.x + er.w * C.reachInto - C.reachAt[0] * hr.w;
      H.style.transition = 'left .62s cubic-bezier(.35, .1, .45, 1)'; H.style.left = left + 'px';
      F(1, true); await OG_W(110); F(2, true); await OG_W(90); re(H, 'jump'); F(4, true);
      const air = setInterval(() => F(4, true), 120); await OG_W(420); clearInterval(air);
    } else if (C.dash) {   // 병기 끝(주먹)이 몬스터 몸에 닿는 자리까지
      const hr = R(H), er = R(E), left = er.x + er.w * C.reachInto - C.reachAt[0] * hr.w;
      H.style.left = left + 'px'; let n = 0; const legs = setInterval(() => F(n++ % 2 ? 2 : 1, true), 90); await OG_W(500); clearInterval(legs);
    }
    if (w === 'sword') { F(4, true); await OG_W(150); F(5, true); }
    else if (w === 'blade') { F(5, true); }                                                                // 도: 내려앉는 순간 내려친다
    else if (w === 'spear') { for (let i = 0; i < 6; i++) { F(i % 2 ? 4 : 5, true); if (i % 2 === 0) { spark(...foeC()); hitNum(part(.12)); } await OG_W(70); } F(4, true); await OG_W(150); F(5, true); }   // 창: 쾌속 연타 → 길게 꿰뚫기
    else if (w === 'hidden') { F(4, true); await OG_W(220); F(5, true); kHeld = false; handGlows.forEach(g => g.classList.remove('on')); await fly8(); }   // 암기: 기가 맺힌 비수를 던지면 몬스터를 축으로 8자를 그리며 거듭 꿰뚫는다
    else if (w === 'fist') { for (const f of [4, 5, 6, 4, 5]) { F(f, true); E.classList.remove('flinch'); void E.offsetWidth; E.classList.add('flinch'); spark(...foeC()); hitNum(part(.1)); await OG_W(108); } F(6, true); }   // 권장: 주먹 · 발 · 장 연타 → 마지막 일장
    if (C.own && !C.noFx) playFx();
    E.classList.add('charge'); if (!C.own) { pos(ring, ...foeC()); re(ring, 'play'); } re(flash, 'play'); if (typeof liveShake === 'function') liveShake(sc); if (o.onImpact) o.onImpact();   // 터지는 순간 (체력패도 이때)
    await OG_W(300); { const r = R(E); pos(num, r.x + r.w * .5, r.y + r.h * .1); } re(num, 'play');
    if (o.kill) { if (C.own) E.animate([{ opacity: 1, filter: 'none' }, { opacity: 0, filter: 'blur(3px) brightness(1.6)' }], { duration: 650, fill: 'forwards' }); else death[C.death](); }   // 제 오의는 공용 오의의 마무리(부서짐 · 두 동강 …)를 쓰지 않고 스러지기만
    else { E.classList.remove('charge', 'flinch'); void E.offsetWidth; E.classList.add('flinch'); }   // 몬스터의 최후는 숨통을 끊을 때만
    re(flash, 'play');
    await OG_W(450); F(w === 'hidden' ? 0 : 6); await OG_W(550);
    blade.classList.remove('on', 'blaze'); handGlows.forEach(g => g.classList.remove('on', 'blaze')); glowOn = false;
    stage.classList.remove('dark'); H.classList.remove('jump'); H.style.transition = 'left .36s cubic-bezier(.5, .05, .35, 1)'; H.style.left = hb.left + 'px'; F(0); await OG_W(360);
    await OG_W(250); cancelAnimationFrame(raf);
    o.heroEl.style.visibility = ''; o.foeEl.style.visibility = ''; if (o.kill) o.foeEl.classList.add('og-dead');
    stage.remove();
  }
  return play().catch(() => { stage.remove(); o.heroEl.style.visibility = ''; o.foeEl.style.visibility = ''; });
}
const OG_AURA_F = { sword: 'hue-rotate(190deg) saturate(1.3)', blade: 'saturate(1.5) sepia(.2)', spear: 'hue-rotate(125deg) saturate(1.4)', hidden: 'hue-rotate(215deg) saturate(1.5) brightness(1.05)', fist: 'hue-rotate(-38deg) saturate(2.2)' };
