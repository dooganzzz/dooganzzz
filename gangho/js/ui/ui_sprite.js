/* [화면] 관찰 창 2D 스프라이트 무대: 옆모습 무대 위에서 제자와 요수가 기록된 합대로 움직인다.
   제자는 병기별 스프라이트시트 12칸, 요수는 숨쉬기 시트(제자리) + 공격 시트 3칸(움츠림 · 공격 · 마무리).
   사냥터 셋(청풍산 · 염화채 · 수룡방) 무대와 요수 31종, 병기 5종 모두에서 켠다 */
const SPRITE_STAGES = new Set(['cheongpung', 'yeomhwa', 'suryong']);
const SPRITE_SRC = ASSET;
/* [SSOT] 초식 그림 고르기: 어느 무공 · 단계(1 = 초식 · 2 = 오의 단계)에 어떤 그림을 띄울지는 이 함수 하나만 정한다.
   강호행 무대 · 관찰 창 무대 · 초식 알림 모두 이것을 부른다. 새 그림을 넣을 때 여기만 바꾸면 옛 그림이 다른 화면에 남아 겹치지 않는다
   (manualFx · cut_ 그림을 다른 파일에서 직접 쓰면 check-layers가 막는다).
   초식 컷: 무공 고유 폴더(manual/무공id/cut_1 · cut_2, 목록은 data/assets.js MANUAL_ART)의 확정본 검기 컷(10컷, 왼쪽 끝 = 칼끝)이 있는 무공. 칼끝 = 제자 그림 너비의 tip 지점 · 그림 너비 = 칼끝~요수 가운데 × reach · 세로 가운데는 제자 가운데보다 dy(제자 키 비율) 위 */
/* 요수 몸 위에서 터지는 제1초식(MANUAL_HIT): 컷 4:3, 요수 가운데(가슴 높이)에 요수 키의 1.9배 크기로 */
const HIT_GEO = { ar: 4 / 3, ms: 1000, fy: .5, size: 1.9, tipX: .706, tipY: .254, entry: .38 };   // tip: 팔을 곧게 뻗은 칸(4)의 손끝 자리 (권장 제자 그림 hero_fist에서 잼) · entry: 그림 안에서 꿰뚫는 자리
const CUT_GEO = { 1: { tip: .75, reach: 1.07, dy: .18, ar: 640 / 200, ms: 1000 }, 2: { tip: .7, reach: 1.04, dy: .35, ar: 640 / 360, ms: 1300, screen: true } };
/* n: 초식 번호 (1 · 2 · 3=오의). 확정본 컷은 초식마다(제1 · 제2), 옛 한 장 그림은 제1 · 제2초식 공용(_1) · 오의(_2) */
const stanceCutN = n => Math.min(2, Math.max(1, n || 1));
const stanceFxSrc = (mid, n) => n >= 3 ? null : ASSET.manual(mid, 'cut_' + stanceCutN(n));   // 그 무공 폴더에 없으면 null → 평타   // 그림이 없는 무공은 초식 그림 없이 (일격만)
/* stage: 그림을 붙일 무대 · imgCls: 옛 한 장 그림일 때 붙일 클래스 · hero · foe: 칼끝 · 거리를 잴 요소 (없으면 무대 가운데를 가로지름) */
function stanceFxEl(stage, mid, n, imgCls, hero, foe) {
  if (!stanceFxSrc(mid, n)) return null;
  const au = stanceCutN(n) === 1 && ASSET.hit(mid), g = au ? HIT_GEO : CUT_GEO[stanceCutN(n)], v = document.createElement('div'); v.className = `stance-cut${au ? ' hit' : ''}${ASSET.glow(mid) ? ' glow' : ''}${g.screen && !ASSET.ink(mid) && !ASSET.solid(mid) ? ' screen' : ''}${ASSET.ink(mid) ? ' ink' : ''}${ASSET.solid(mid) ? ' solid' : ''}`;
  v.style.backgroundImage = `url('${stanceFxSrc(mid, n)}')`; v.style.animationDuration = g.ms + 'ms';
  const s = stage.getBoundingClientRect(), h = hero && hero.getBoundingClientRect();
  if (!h || !h.width) { Object.assign(v.style, { left: '5%', width: '90%', top: '50%', aspectRatio: String(g.ar), transform: 'translateY(-50%)' }); return v; }
  const f = foe && foe.getBoundingClientRect();
  if (au && f && f.width && ASSET.hitN(mid) === 1) {   // 한 번 깊게 찌르기(철사장): 손끝에서 꿰뚫는 자리가 시작되게 — 손 뻗는 위치와 그림을 맞춘다
    const w = f.height * g.size, tx = h.left - s.left + h.width * g.tipX, ty = h.top - s.top + h.height * g.tipY;
    Object.assign(v.style, { left: (tx - w * g.entry) + 'px', top: (ty - w / g.ar / 2) + 'px', width: w + 'px', height: (w / g.ar) + 'px' }); return v;
  }
  if (au && f && f.width) { const w = f.height * g.size; Object.assign(v.style, { left: (f.left - s.left + f.width / 2 - w / 2) + 'px', top: (f.top - s.top + f.height * g.fy - w / g.ar / 2) + 'px', width: w + 'px', height: (w / g.ar) + 'px' }); return v; }
  const foeX = f && f.width && f.left < s.right ? f.left + f.width / 2 - s.left : s.width * .8;
  const x = h.left - s.left + h.width * g.tip, w = Math.max(s.width * .3, (foeX - x) * g.reach), cy = h.top - s.top + h.height * (.5 - g.dy);
  Object.assign(v.style, { left: x + 'px', top: (cy - w / g.ar / 2) + 'px', width: w + 'px', height: (w / g.ar) + 'px' });
  return v;
}
/* 그림 미리 풀기: 한 번 푼 그림은 기억해 두어 다음엔 곧바로 (Image 객체를 붙들어 브라우저가 풀어 둔 그림을 버리지 않게) */
const IMG_CACHE = new Map();
function preloadImgs(urls) {
  return Promise.all(urls.map(u => {
    if (IMG_CACHE.has(u)) return IMG_CACHE.get(u).p;
    const im = new Image(); im.decoding = 'async'; im.src = u;
    const e = { im, ok: false }; e.p = (im.decode ? im.decode() : new Promise(r => { im.onload = im.onerror = r; })).then(() => { e.ok = true; }, () => { e.ok = true; });
    IMG_CACHE.set(u, e); return e.p;
  }));
}
const imgsReady = urls => urls.every(u => IMG_CACHE.has(u) && IMG_CACHE.get(u).ok);
function spriteUrls(zid, eid) { return ASSET_SET.battle(zid, eid, weaponType()); }
/* 쉬는 틈에 강호행 그림을 미리 풀어 둔다: 강호행 화면을 보거나 강호행 중일 때만, 지금 단계와 다음 단계 요수만
   (다른 요수는 조우할 때 liveShowQueue가 불러온다) */
function prewarmSprites() {
  if (typeof S === 'undefined' || !S || !S.expedition) return;
  const run = activeRun(); if (!run && !(typeof ui !== 'undefined' && ui.tab === 'field')) return;
  const z = (run && run.zone) || S.expedition.zone || 'cheongpung', n = (run && run.stage) || S.expedition.stage || 1;
  const urls = ASSET_SET.live(z, weaponType());
  for (const e of new Set([...stageFoes(z, n), ...stageFoes(z, Math.min(STAGE.count, n + 1))])) urls.push(SPRITE_SRC.foe(e), SPRITE_SRC.foe(e, 1));
  const id = S.active.mugong; if (id && MANUALS[id].weapon) urls.push(...[1, 2].map(n => stanceFxSrc(id, n)).filter(Boolean));
  preloadImgs(urls);
}
setTimeout(() => (window.requestIdleCallback || setTimeout)(prewarmSprites), 2500);
setInterval(() => (window.requestIdleCallback || setTimeout)(prewarmSprites), 20000);

/* 요수 숨쉬기 칸 수 (흑비단독사는 똬리를 늘였다 줄이는 8칸, 나머지는 6칸) */
const FOE_SHEET = { viper: 8 };
/* 무대 위 요수 크기 (기본 1 = 무대 폭 18%): 작은 짐승은 작게, 두목은 크게 */
const FOE_SIZE = { rabbit: .62, wildcat: .72, turtle: .86, boar: .92, eagle: 1.1, scaleFish: .8, centipede: 1.05, crocodile: 1.12,
  redTiger: 1.15, jeokpaecheon: 1.1, byeokhaeryong: 1.1, magmaGolem: 1.1, treant: 1.05, armored: 1, anchor: 1 };
const FOE_HUMAN = new Set(['scout', 'deserter', 'slinger', 'logger', 'cannoneer', 'charger', 'eliteAxe', 'raftScout', 'netter', 'raider', 'diver', 'ronin', 'iceSpirit']);
function foeSize(eid) { return FOE_SIZE[eid] || (FOE_HUMAN.has(eid) ? .9 : 1); }
function spriteOn(zid, eid) { return SPRITE_STAGES.has(zid) && !!ENEMIES[eid]; }
function spriteStage(zid, eid) {
  const n = FOE_SHEET[eid] || 6, w = weaponType();
  return `<div class="sprite-stage" id="spStage" style="background-image:url('${SPRITE_SRC.stage(zid)}')">
    <div class="sp-fighter sp-hero idle w-${w}" id="spHero" data-f="0" data-w="${w}"><i class="sp-shadow"></i><div class="sp-spr" style="background-image:url('${SPRITE_SRC.hero(w)}')"></div></div>
    <div class="sp-fighter sp-foe idle flip fsheet" id="spFoe" data-f="0" style="width:${(18 * foeSize(eid)).toFixed(1)}%"><i class="sp-shadow"></i><div class="sp-fspr" style="background-image:url('${SPRITE_SRC.foe(eid)}');background-size:${n * 100}% 100%"></div><div class="sp-fatk" style="background-image:url('${SPRITE_SRC.foe(eid, 1)}');background-size:300% 100%"></div></div>
  </div>`;
}
/* 무대 되돌리기 (처음부터) */
function spriteReset() {
  spBreathLoop();
  const h = $('#spHero'), f = $('#spFoe'); if (!h || !f) return;
  h.className = `sp-fighter sp-hero idle w-${h.dataset.w}`; spFrame(h, 'idle'); f.className = f.className.replace(/\b(ko|lunge|hit|striking|step)\b/g, '').trim() + ' idle';
  for (const x of document.querySelectorAll('#spStage .sp-vfx, #spStage .sp-dim, #spStage .sp-aura, #spStage .sp-dart')) x.remove();
}
const spWait = ms => new Promise(r => setTimeout(r, ms));
const spFlash = el => { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); };
function spNum(t, side, cls) {
  const st = $('#spStage'); if (!st) return;
  const n = document.createElement('div'); n.className = `sp-num ${cls || ''}`; n.textContent = t;
  n.style.left = side === 'foe' ? '70%' : '20%'; st.appendChild(n); setTimeout(() => n.remove(), 1000);
}
/* 제자 스프라이트시트 칸: 0 대기 · 1~2 달리기 · 3 평타 타격 · 4~6 병기 동작(준비 · 타격 · 마무리) · 7 피격 · 8 회피 · 9~11 호흡(가슴 들썩) */
const SPF = { idle: 0, run1: 1, run2: 2, thrust: 3, slashA: 4, slashB: 5, slashC: 6, hurt: 7, dodge: 8 };
/* 가만히 서 있을 때: 대기 → 들숨 → 가득 → 날숨 → 대기 … (몸은 제자리, 가슴·어깨만) */
const BREATH = [0, 0, 9, 10, 10, 11];
let spBreathT = null;
let spFoeT = null;
function spBreathLoop() {
  clearInterval(spBreathT); clearInterval(spFoeT); let i = 0, j = 0;
  spBreathT = setInterval(() => { const h = $('#spHero'); if (!h) { clearInterval(spBreathT); return; } if (h.classList.contains('idle')) h.dataset.f = BREATH[i++ % BREATH.length]; }, 260);
  const e = $('#spFoe'), n = e && e.classList.contains('fsheet') ? e.querySelector('.sp-fspr') : null;
  if (n) { const N = Math.round(parseFloat(n.style.backgroundSize) / 100);
    spFoeT = setInterval(() => { if (!n.isConnected) { clearInterval(spFoeT); return; } if (e.classList.contains('idle')) n.style.backgroundPositionX = (j++ % N) * 100 / (N - 1) + '%'; }, 190); }
}
function spFrame(h, k) { h.dataset.f = SPF[k]; }
function spStreak(kind) {
  const st = $('#spStage'); if (!st) return;
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 200 120'); s.setAttribute('class', `sp-streak ${kind}`);
  s.innerHTML = kind === 'thrust'
    ? '<path d="M8 60H192"/><path class="tip" d="M150 52L196 60 150 68"/>'
    : kind === 'chop' ? '<path d="M40 8Q150 30 170 112"/><path class="thin" style="animation-delay:60ms,60ms" d="M58 10Q150 44 160 110"/>'
    : '<path d="M10 78Q100 30 192 62"/><path class="thin" style="animation-delay:60ms,60ms" d="M20 90Q104 46 186 76"/>';
  st.appendChild(s); setTimeout(() => s.remove(), 900);
}
/* 발밑 흙먼지 (x: 무대 가로 %, 방향 dx) */
function spDust(x, dx = -18, n = 2) {
  const st = $('#spStage'); if (!st) return;
  for (let i = 0; i < n; i++) { const d = document.createElement('i'); d.className = 'sp-dust'; d.style.left = (x + i * 2) + '%'; d.style.bottom = (19 + Math.random() * 2) + '%'; d.style.setProperty('--dx', (dx * (1 + i * .6)) + 'px'); d.style.animationDelay = (i * 60) + 'ms'; st.appendChild(d); setTimeout(() => d.remove(), 900); }
}
/* 이펙트 그림 한 장 띄우기 (cls: n1 소성 먹빛 · n2 대성 광휘 · hit · crit · dodge) */
function spVfx(name, cls, ms = 900) {
  const st = $('#spStage'); if (!st) return null;
  const v = document.createElement('img'); v.className = `sp-vfx ${cls}`; v.src = ASSET.vfx(name); v.alt = '';
  st.appendChild(v); setTimeout(() => v.remove(), ms); return v;
}
/* 대성 초식: 무대가 어두워지고 발밑에 금빛 기운이 솟는다 */
function spDaesungOn() {
  const st = $('#spStage'); if (!st) return;
  const d = document.createElement('i'); d.className = 'sp-dim'; st.appendChild(d);
  const a = document.createElement('img'); a.className = 'sp-aura'; a.src = SPRITE_SRC.fx('aura'); a.alt = ''; st.appendChild(a);
}
function spDaesungOff() { for (const x of document.querySelectorAll('#spStage .sp-dim, #spStage .sp-aura')) { x.classList.add('out'); setTimeout(() => x.remove(), 400); } }
function spShake() { const st = $('#spStage'); if (!st) return; st.classList.remove('shake'); void st.offsetWidth; st.classList.add('shake'); }
/* 암기: 손을 떠난 비표가 요수에게 날아간다 */
function spDart(n = 1) {
  const st = $('#spStage'); if (!st) return;
  for (let i = 0; i < n; i++) { const d = document.createElement('i'); d.className = 'sp-dart'; d.style.top = (48 + (i - (n - 1) / 2) * 5) + '%'; d.style.animationDelay = (i * 40) + 'ms'; st.appendChild(d); setTimeout(() => d.remove(), 500); }
}
/* 병기별 기본 동작: 검 · 창 = 달려가 힘껏 찌르기 / 도 = 달려가 힘껏 베기 / 권장 = 달려가 주먹 · 발 · 장 3연타 / 암기 = 제자리에서 힘껏 던지기 */
const HERO_MOTION = { sword: { dash: 'dash' }, blade: { dash: 'dash' }, spear: { dash: 'dash-s' }, fist: { dash: 'dash' }, hidden: { dash: null } };
let spOnHit = null;   // 이번 합의 첫 타격 순간에 한 번 (체력 막대 갱신)
const spImpact = f => { if (spOnHit) { spOnHit(); spOnHit = null; } playFx([f]); };
async function spHeroAttack(f, stance, gap) {
  const h = $('#spHero'), e = $('#spFoe'); if (!h || !e) return;
  const w = h.dataset.w || 'sword', M = HERO_MOTION[w] || HERO_MOTION.sword;
  const k = Math.min(1, gap / 1000), wt = ms => spWait(ms * k);
  const tier = stance ? (stance.n >= 3 ? 2 : 1) : 0;   // 화면 단계: 1 = 제1 · 제2초식 (먹빛), 2 = 오의 (광휘)
  h.classList.remove('idle');
  if (tier === 2) { spDaesungOn(); spFrame(h, 'slashA'); await wt(360); }
  if (M.dash) {
    h.classList.add(M.dash); spDust(20, -22);
    let n = 0; const legs = setInterval(() => { spFrame(h, n++ % 2 ? 'run2' : 'run1'); spDust(24 + n * 5, -14, 1); }, 110 * k);
    spFrame(h, 'run1'); await wt(430); clearInterval(legs);
  }
  const land = () => {
    spImpact(f);
    if (f.k === 'miss') { spNum('빗나감', 'foe', 'miss'); return; }
    spFlash(e); spNum(f.t, 'foe', f.k === 'crit' ? 'crit' : '');
    if (!tier) spVfx(f.k === 'crit' ? 'crit' : 'hit', `spark ${f.k === 'crit' ? 'crit' : ''}`, 600);
  };
  const skill = () => {
    if (!tier) return;
    if (stance.t) playFx([stance]);
    if (stance.mid) { const st = $('#spStage'), v = st && stanceFxEl(st, stance.mid, stance.n, `sp-vfx n${tier}`, h, e); if (v) { st.appendChild(v); setTimeout(() => v.remove(), tier === 2 ? 1300 : 1000); } }
    if (tier === 2) { spShake(); setTimeout(spShake, 260 * k); }
  };
  if (w === 'sword' && !tier) {                          // 검 평타: 힘껏 찌르기
    spFrame(h, 'thrust'); spDust(46, -24, 3); spStreak('thrust'); land(); await wt(320);
  } else if (w === 'fist') {                             // 권장: 주먹 · 발 · 장 세 번 (초식 그림이 있으면 평타 타격 그림은 빼서 겹치지 않게)
    const art = tier && stance.mid && stanceFxSrc(stance.mid, stance.n);
    spFrame(h, 'slashA'); spFlash(e); if (!art) spVfx('hit', 'spark small', 400); await wt(170);
    spFrame(h, 'slashB'); spFlash(e); if (!art) spVfx('hit', 'spark small', 400); spDust(46, -18, 2); await wt(170);
    spFrame(h, 'slashC'); skill(); land(); await wt(300);
  } else if (w === 'hidden') {                           // 암기: 제자리에서 던지기
    spFrame(h, 'slashA'); await wt(220);
    spFrame(h, 'slashB'); spDart(tier ? 3 : 1); await wt(200);
    skill(); land(); spFrame(h, 'slashC'); await wt(300);
  } else {                                               // 도 · 창 · 검 초식: 준비 → 타격 → 마무리
    spFrame(h, 'slashA'); await wt(160);
    spFrame(h, 'slashB'); spDust(48, -20, 3); spStreak(w === 'spear' ? 'thrust' : w === 'blade' ? 'chop' : 'slash'); skill(); land(); await wt(200);
    spFrame(h, 'slashC'); await wt(230);
  }
  if (tier === 2) spDaesungOff();
  if (M.dash) { h.classList.remove(M.dash); h.classList.add('retreat'); spFrame(h, 'idle'); await wt(300); h.classList.remove('retreat'); }
  else spFrame(h, 'idle');
  h.classList.add('idle');
}
/* 요수 차례: 반걸음 다가가 움츠렸다가 덮친다 */
async function spFoeAttack(f, gap) {
  const h = $('#spHero'), e = $('#spFoe'); if (!h || !e) return;
  const atk = e.querySelector('.sp-fatk');
  const k = Math.min(1, gap / 1000), w = ms => spWait(ms * k), fr = i => { atk.style.backgroundPositionX = i * 50 + '%'; };
  e.classList.remove('idle'); e.classList.add('striking', 'step'); fr(0); await w(260);
  fr(1); spDust(66, 20, 2); spImpact(f);
  if (f.k === 'dodge') { spFrame(h, 'dodge'); h.classList.add('back'); spNum('회피!', 'me', 'miss'); spVfx('dodge', 'dodge', 600); }
  else { spFrame(h, 'hurt'); spFlash(h); spNum(f.t, 'me', 'me'); }
  await w(300); fr(2); await w(240);
  e.classList.remove('striking', 'step'); h.classList.remove('back'); spFrame(h, 'idle'); await w(160); e.classList.add('idle');
}
/* 한 합 재생: 기록된 연출(fx) 순서대로 공격을 나눠 움직인다 */
async function spritePlayRound(r, last, win, ms, onHit) {
  if (!$('#spStage') || reduceMotion()) { if (onHit) onHit(); return; }
  spOnHit = onHit || null;
  const acts = [], rest = []; let stance = false;
  for (const f of r.fx || []) {
    if (f.side === 'banner') { stance = f; continue; }
    if (f.side === 'foe' && /hit|crit|miss/.test(f.k)) { acts.push(['me', f, stance && stance.k !== 'counter' ? stance : false, stance]); stance = false; }
    else if (f.side === 'me' && /hit|crit|dodge/.test(f.k)) acts.push(['foe', f]);
    else rest.push(f);
  }
  if (stance) acts.length ? 0 : rest.push(stance);   // 공격 없이 초식 이름만 있으면 그대로 띄운다
  if (rest.length) playFx(rest);
  if (!acts.length && spOnHit) { spOnHit(); spOnHit = null; }
  const gap = Math.min(900, (ms * .85) / Math.max(1, acts.length));
  for (const [who, f, st, banner] of acts) {
    if (!$('#spStage')) return;
    if (who === 'me') { if (banner && !st) playFx([banner]); await spHeroAttack(f, st, gap); } else await spFoeAttack(f, gap);
  }
  if (last) { const x = win ? $('#spFoe') : $('#spHero'); if (x) { x.classList.remove('idle'); x.classList.add('ko'); } }
}
