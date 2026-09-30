/* [화면] 관찰 창 2D 스프라이트 무대 (시험): 옆모습 무대 위에서 제자와 요수가 기록된 합대로 움직인다.
   제자는 병기별 스프라이트시트(대기·공격·피격·회피 4칸), 요수는 도감 그림에 움직임만 준다.
   지금은 청풍산 · 검 · 흑비단독사 조합에서만 켠다 (SPRITE_TRIAL) */
const SPRITE_TRIAL = [{ zone: 'cheongpung', weapon: 'sword', eid: 'viper' }];
const SPRITE_SRC = { hero: w => `assets/art/sprites/hero_${w}.png`, stage: z => `assets/art/stages/${z}.jpg` };
const FOE_FACES_RIGHT = new Set(['viper']);                 // 원화가 오른쪽을 보는 요수는 뒤집어 제자를 보게
function spriteOn(zid, eid) { const w = weaponType(); return SPRITE_TRIAL.some(t => t.zone === zid && t.eid === eid && t.weapon === w); }
function spriteStage(zid, eid) {
  return `<div class="sprite-stage" id="spStage" style="background-image:url('${SPRITE_SRC.stage(zid)}')">
    <div class="sp-fighter sp-hero idle" id="spHero" data-f="0"><i class="sp-shadow"></i><div class="sp-spr" style="background-image:url('${SPRITE_SRC.hero(weaponType())}')"></div></div>
    <div class="sp-fighter sp-foe idle ${FOE_FACES_RIGHT.has(eid) ? 'flip' : ''}" id="spFoe"><i class="sp-shadow"></i><img src="${ART_SRC.beast(eid)}" alt=""></div>
  </div>`;
}
/* 무대 되돌리기 (처음부터) */
function spriteReset() {
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
/* 제자 스프라이트시트 칸: 0 대기 · 1~2 달리기 · 3 찌르기 · 4~6 가로베기(준비·베기·마무리) · 7 피격 · 8 회피 */
const SPF = { idle: 0, run1: 1, run2: 2, thrust: 3, slashA: 4, slashB: 5, slashC: 6, hurt: 7, dodge: 8 };
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
async function spHeroAttack(f, stance, gap) {
  const h = $('#spHero'), e = $('#spFoe'); if (!h || !e) return;
  const k = Math.min(1, gap / 1000), w = ms => spWait(ms * k);
  h.classList.remove('idle'); h.classList.add('dash'); spDust(20, -22);
  let n = 0; const legs = setInterval(() => { spFrame(h, n++ % 2 ? 'run2' : 'run1'); spDust(24 + n * 5, -14, 1); }, 110 * k);
  spFrame(h, 'run1'); await w(430); clearInterval(legs);
  const land = () => { if (f.k === 'miss') spNum('빗나감', 'foe', 'miss'); else { spFlash(e); spNum(f.t, 'foe', f.k === 'crit' ? 'crit' : ''); } };
  if (stance) {
    spFrame(h, 'slashA'); await w(150);
    spFrame(h, 'slashB'); spDust(48, -20, 3); spStreak('slash'); land(); await w(170);
    spFrame(h, 'slashC'); await w(230);
  } else {
    spFrame(h, 'thrust'); spDust(46, -24, 3); spStreak('thrust'); land(); await w(320);
  }
  h.classList.remove('dash'); h.classList.add('retreat'); spFrame(h, 'idle'); await w(300);
  h.classList.remove('retreat'); h.classList.add('idle');
}
async function spFoeAttack(f, gap) {
  const h = $('#spHero'), e = $('#spFoe'); if (!h || !e) return;
  e.classList.remove('idle'); e.classList.add('lunge'); spDust(70, 18, 2); await spWait(gap * .25);
  if (f.k === 'dodge') { spFrame(h, 'dodge'); h.classList.add('back'); spNum('회피!', 'me', 'miss'); }
  else { spFrame(h, 'hurt'); spFlash(h); spNum(f.t, 'me', 'me'); }
  await spWait(gap * .4); e.classList.remove('lunge'); h.classList.remove('back'); spFrame(h, 'idle'); await spWait(gap * .2); e.classList.add('idle');
}
/* 한 합 재생: 기록된 연출(fx) 순서대로 공격을 나눠 움직인다 */
async function spritePlayRound(r, last, win, ms) {
  if (!$('#spStage') || reduceMotion()) return;
  const acts = []; let stance = false;
  for (const f of r.fx || []) {
    if (f.side === 'banner') { stance = true; continue; }
    if (f.side === 'foe' && /hit|crit|miss/.test(f.k)) { acts.push(['me', f, stance]); stance = false; }
    else if (f.side === 'me' && /hit|crit|dodge/.test(f.k)) acts.push(['foe', f]);
  }
  const gap = Math.min(900, (ms * .85) / Math.max(1, acts.length));
  for (const [who, f, st] of acts) { if (!$('#spStage')) return; if (who === 'me') await spHeroAttack(f, st, gap); else await spFoeAttack(f, gap); }
  if (last) { const x = win ? $('#spFoe') : $('#spHero'); if (x) { x.classList.remove('idle'); x.classList.add('ko'); } }
}
