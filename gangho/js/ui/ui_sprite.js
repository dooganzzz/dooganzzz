/* [화면] 관찰 창 2D 스프라이트 무대 (시험): 옆모습 무대 위에서 제자와 요수가 기록된 합대로 움직인다.
   제자는 병기별 스프라이트시트(대기·공격·피격·회피 4칸), 요수는 도감 그림에 움직임만 준다.
   지금은 청풍산 · 검 · 흑비단독사 조합에서만 켠다 (SPRITE_TRIAL) */
const SPRITE_TRIAL = [{ zone: 'cheongpung', weapon: 'sword', eid: 'viper' }];
const SPRITE_SRC = { hero: w => `assets/art/sprites/hero_${w}.png`, stage: z => `assets/art/stages/${z}.jpg` };
const FOE_FACES_RIGHT = new Set(['viper']);
/* 요수 숨쉬기 스프라이트 (칸 수). 똬리를 늘렸다 줄였다 하는 식으로 바닥은 제자리 */
const FOE_SHEET = { viper: 8 };
/* 요수 공격 스프라이트 (움츠림 · 물기 · 고개 들기). 칸은 숨쉬기 칸의 두 배 폭, 똬리 위치는 같다 */
const FOE_ATK = { viper: 3 };                 // 원화가 오른쪽을 보는 요수는 뒤집어 제자를 보게
function spriteOn(zid, eid) { const w = weaponType(); return SPRITE_TRIAL.some(t => t.zone === zid && t.eid === eid && t.weapon === w); }
function spriteStage(zid, eid) {
  return `<div class="sprite-stage" id="spStage" style="background-image:url('${SPRITE_SRC.stage(zid)}')">
    <div class="sp-fighter sp-hero idle" id="spHero" data-f="0"><i class="sp-shadow"></i><div class="sp-spr" style="background-image:url('${SPRITE_SRC.hero(weaponType())}')"></div></div>
    <div class="sp-fighter sp-foe idle ${FOE_FACES_RIGHT.has(eid) ? 'flip' : ''} ${FOE_SHEET[eid] ? 'fsheet' : ''}" id="spFoe" data-f="0"><i class="sp-shadow"></i>${FOE_SHEET[eid]
      ? `<div class="sp-fspr" style="background-image:url('assets/art/sprites/foe_${eid}.png');background-size:${FOE_SHEET[eid] * 100}% 100%"></div>${FOE_ATK[eid] ? `<div class="sp-fatk" style="background-image:url('assets/art/sprites/foe_${eid}_atk.png');background-size:${FOE_ATK[eid] * 100}% 100%"></div>` : ''}`
      : `<img src="${ART_SRC.beast(eid)}" alt="">`}</div>
  </div>`;
}
/* 무대 되돌리기 (처음부터) */
function spriteReset() {
  spBreathLoop();
  const h = $('#spHero'), f = $('#spFoe'); if (!h || !f) return;
  h.className = 'sp-fighter sp-hero idle'; spFrame(h, 'idle'); f.className = f.className.replace(/\b(ko|lunge|hit)\b/g, '').trim() + ' idle';
}
const spWait = ms => new Promise(r => setTimeout(r, ms));
const spFlash = el => { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); };
function spNum(t, side, cls) {
  const st = $('#spStage'); if (!st) return;
  const n = document.createElement('div'); n.className = `sp-num ${cls || ''}`; n.textContent = t;
  n.style.left = side === 'foe' ? '70%' : '20%'; st.appendChild(n); setTimeout(() => n.remove(), 1000);
}
function spSlash(gold) {
  const st = $('#spStage'); if (!st) return;
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 200 120'); s.setAttribute('class', 'sp-slash' + (gold ? ' gold' : ''));
  s.innerHTML = [0, 1, 2].map(i => `<path style="animation-delay:${i * 80}ms,${i * 80}ms" d="M${18 + i * 14} ${104 - i * 10}Q${96 + i * 6} ${8 + i * 12} ${186 - i * 8} ${26 + i * 16}"/>`).join('');
  st.appendChild(s); setTimeout(() => s.remove(), 1100);
}
/* 제자 스프라이트시트 칸: 0 대기 · 1~2 달리기 · 3 찌르기 · 4~6 가로베기(준비·베기·마무리) · 7 피격 · 8 회피 · 9~11 호흡(가슴 들썩) */
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
    spFoeT = setInterval(() => { if (!n.isConnected) { clearInterval(spFoeT); return; } if (e.classList.contains('idle')) n.style.backgroundPositionX = (j++ % N) * 100 / (N - 1) + '%'; }, 170); }
}
function spFrame(h, k) { h.dataset.f = SPF[k]; }
function spStreak(kind) {
  const st = $('#spStage'); if (!st) return;
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 200 120'); s.setAttribute('class', `sp-streak ${kind}`);
  s.innerHTML = kind === 'thrust'
    ? '<path d="M8 60H192"/><path class="tip" d="M150 52L196 60 150 68"/>'
    : '<path d="M10 78Q100 30 192 62"/><path class="thin" style="animation-delay:60ms,60ms" d="M20 90Q104 46 186 76"/>';
  st.appendChild(s); setTimeout(() => s.remove(), 900);
}
/* 발밑 흙먼지 (x: 무대 가로 %, 방향 dx) */
function spDust(x, dx = -18, n = 2) {
  const st = $('#spStage'); if (!st) return;
  for (let i = 0; i < n; i++) { const d = document.createElement('i'); d.className = 'sp-dust'; d.style.left = (x + i * 2) + '%'; d.style.bottom = (19 + Math.random() * 2) + '%'; d.style.setProperty('--dx', (dx * (1 + i * .6)) + 'px'); d.style.animationDelay = (i * 60) + 'ms'; st.appendChild(d); setTimeout(() => d.remove(), 900); }
}
/* 달려가서: 평타는 힘껏 찌르기, 초식은 삼재검법 가로베기(준비 → 베기 → 마무리) */
let spOnHit = null;   // 이번 합의 첫 타격 순간에 한 번 (체력 막대 갱신)
const spImpact = f => { if (spOnHit) { spOnHit(); spOnHit = null; } playFx([f]); };
async function spHeroAttack(f, stance, gap) {
  const h = $('#spHero'), e = $('#spFoe'); if (!h || !e) return;
  const k = Math.min(1, gap / 1000), w = ms => spWait(ms * k);
  h.classList.remove('idle'); h.classList.add('dash'); spDust(20, -22);
  let n = 0; const legs = setInterval(() => { spFrame(h, n++ % 2 ? 'run2' : 'run1'); spDust(24 + n * 5, -14, 1); }, 110 * k);
  spFrame(h, 'run1'); await w(430); clearInterval(legs);
  const land = () => { spImpact(f); if (f.k === 'miss') spNum('빗나감', 'foe', 'miss'); else { spFlash(e); spNum(f.t, 'foe', f.k === 'crit' ? 'crit' : ''); } };
  if (stance) {
    spFrame(h, 'slashA'); await w(150);
    spFrame(h, 'slashB'); if (stance.t) playFx([stance]); spDust(48, -20, 3); spStreak('slash'); land(); await w(170);
    spFrame(h, 'slashC'); await w(230);
  } else {
    spFrame(h, 'thrust'); spDust(46, -24, 3); spStreak('thrust'); land(); await w(320);
  }
  h.classList.remove('dash'); h.classList.add('retreat'); spFrame(h, 'idle'); await w(300);
  h.classList.remove('retreat'); h.classList.add('idle');
}
async function spFoeAttack(f, gap) {
  const h = $('#spHero'), e = $('#spFoe'); if (!h || !e) return;
  const atk = e.querySelector('.sp-fatk');
  if (atk) return spFoeStrike(f, gap, h, e, atk);
  e.classList.remove('idle'); e.classList.add('lunge'); spDust(70, 18, 2); await spWait(gap * .25); spImpact(f);
  if (f.k === 'dodge') { spFrame(h, 'dodge'); h.classList.add('back'); spNum('회피!', 'me', 'miss'); }
  else { spFrame(h, 'hurt'); spFlash(h); spNum(f.t, 'me', 'me'); }
  await spWait(gap * .4); e.classList.remove('lunge'); h.classList.remove('back'); spFrame(h, 'idle'); await spWait(gap * .2); e.classList.add('idle');
}
/* 공격 스프라이트가 있는 요수: 반걸음 다가가 움츠렸다가 목을 쭉 뻗어 문다 */
async function spFoeStrike(f, gap, h, e, atk) {
  const k = Math.min(1, gap / 1000), w = ms => spWait(ms * k), fr = i => { atk.style.backgroundPositionX = i * 50 + '%'; };
  e.classList.remove('idle'); e.classList.add('striking', 'step'); fr(0); await w(260);
  fr(1); spDust(66, 20, 2); spImpact(f);
  if (f.k === 'dodge') { spFrame(h, 'dodge'); h.classList.add('back'); spNum('회피!', 'me', 'miss'); }
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
    if (f.side === 'foe' && /hit|crit|miss/.test(f.k)) { acts.push(['me', f, stance]); stance = false; }
    else if (f.side === 'me' && /hit|crit|dodge/.test(f.k)) acts.push(['foe', f]);
    else rest.push(f);
  }
  if (stance) acts.length ? 0 : rest.push(stance);   // 공격 없이 초식 이름만 있으면 그대로 띄운다
  if (rest.length) playFx(rest);
  if (!acts.length && spOnHit) { spOnHit(); spOnHit = null; }
  const gap = Math.min(900, (ms * .85) / Math.max(1, acts.length));
  for (const [who, f, st] of acts) { if (!$('#spStage')) return; if (who === 'me') await spHeroAttack(f, st, gap); else await spFoeAttack(f, gap); }
  if (last) { const x = win ? $('#spFoe') : $('#spHero'); if (x) { x.classList.remove('idle'); x.classList.add('ko'); } }
}
