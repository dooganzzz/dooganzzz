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
  h.className = 'sp-fighter sp-hero idle'; h.dataset.f = 0; f.className = f.className.replace(/\b(ko|lunge|hit)\b/g, '').trim() + ' idle';
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
async function spHeroAttack(f, stance, gap) {
  const h = $('#spHero'), e = $('#spFoe'); if (!h || !e) return;
  h.classList.remove('idle'); h.classList.add('lunge'); await spWait(gap * .25); h.dataset.f = 1; spSlash(stance);
  await spWait(gap * .1);
  if (f.k === 'miss') spNum('빗나감', 'foe', 'miss'); else { spFlash(e); spNum(f.t, 'foe', f.k === 'crit' ? 'crit' : ''); }
  await spWait(gap * .35); h.dataset.f = 0; h.classList.remove('lunge'); await spWait(gap * .2); h.classList.add('idle');
}
async function spFoeAttack(f, gap) {
  const h = $('#spHero'), e = $('#spFoe'); if (!h || !e) return;
  e.classList.remove('idle'); e.classList.add('lunge'); await spWait(gap * .25);
  if (f.k === 'dodge') { h.dataset.f = 3; h.classList.add('back'); spNum('회피!', 'me', 'miss'); }
  else { h.dataset.f = 2; spFlash(h); spNum(f.t, 'me', 'me'); }
  await spWait(gap * .4); e.classList.remove('lunge'); h.classList.remove('back'); h.dataset.f = 0; await spWait(gap * .2); e.classList.add('idle');
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
