/* [화면] 강호행 무대의 실시간 전투: 맞붙기 예약 · 순서 짜기 · 초식 · 피해 숫자 · 활력 막대 (무대는 ui_live.js, 오의는 ui_ougi.js) */
/* 맞붙는 모습 예약: ref = 강호행에서 방금 치른 전투 { rid, bi } — 그 기록(합 · 피해 · 회피 · 생혈고 · 초식 · 승패)을 무대에서 그대로 재생한다 */
function liveShowQueue(eid, real, boss, ref) {
  if (!eid || !ENEMIES[eid] || (liveAnim.show && liveAnim.show.real)) return;
  liveAnim.queued = { eid, real: !!real, boss: !!boss, ref };
  preloadImgs([SPRITE_SRC.foe(eid), SPRITE_SRC.foe(eid, 1)]);
  if (ref && ref.si !== undefined) {                  // 무대에서 맞붙는 동안 그 걸음(결과)은 견문록에 아직 안 띄운다
    const bt = (S.expeditions.find(x => x.id === ref.rid) || { battles: [] }).battles[ref.bi];
    liveAnim.hold = { rid: ref.rid, i: ref.si, until: now() + 40000, hp: bt && bt.start ? bt.start.me.hp : null };
    liveSideRefresh();
    const sc = document.getElementById('liveScene'); if (sc) sc.classList.remove('rest', 'dead');
  }
}
/* 화면에 띄울 걸음 수: 맞붙는 중인 전투 걸음부터는 숨긴다 (맞붙기가 끝나면 liveShowEnd가 풀고 다시 그린다) */
function liveShown(r) { const h = liveAnim.hold; return r && h && h.rid === r.id && now() < h.until ? Math.min(h.i, r.steps.length) : r ? r.steps.length : 0; }
/* 쓰러져 끝난 강호행(보상 받기 전): 무대에 쓰러진 제자와 놓친 병기를 눕힌다 */
function liveDead(r) { return !!r && r.end === 'dead' && !r.claimed && liveDone(r) && !liveHeld(r); }
function liveHeld(r) { return !!r && liveShown(r) < r.steps.length; }
/* 견문록 패널만 다시 그린다 */
function liveSideRefresh() { const box = document.getElementById('liveSide'); if (box) setHTML(box, liveSide()); }
function liveRelease() {
  if (!liveAnim.hold) return; liveAnim.hold = null;
  const q = liveAnim.gimQ; liveAnim.gimQ = null;             // 기다리던 기믹이 있으면 이어서 (그 결과는 다시 가린다)
  if (q && now() - q.at < 60000) { const r = findExpedition(q.rid); if (r && r.steps[q.si]) liveGimQueue(r, q.si); }
  liveSideRefresh();
  const sc = document.getElementById('liveScene'), lr = liveRec(); if (sc) { sc.classList.toggle('rest', liveDone(lr)); sc.classList.toggle('dead', liveDead(lr)); }
  if (typeof renderTabs === 'function') renderTabs();
}
/* 맞붙는 순서: 제자 공격 → 요수 반격(맞거나 피하거나) → … → 마무리 일격. at은 맞붙기 시작한 뒤 ms */
function liveShowPlan(sh, w) {
  const q = [], ranged = w === 'hidden', B = sh.rec;
  if (!B) { q.push({ at: 1500, k: 'mist' }, { at: 2800, k: 'end' }); return q; }
  // 긴 전투는 빨리 감아 15초 안팎에 끝나게 (한 동작 0.8초 기준)
  const acts = B.rounds.reduce((a, r) => a + r.fx.filter(f => f.side !== 'banner').length, 0);
  const k = clamp(15000 / Math.max(1, acts * 800), 0.3, 1), T = ms => Math.round(ms * k);
  const heroF = (at, f) => q.push({ at, k: 'hf', f });
  const heroAtk = (t0, ev) => {
    if (!ranged) { q.push({ at: t0, k: 'hx', x: LIVE_POS.lunge }); heroF(t0, 1); heroF(t0 + T(110), 2); heroF(t0 + T(220), 1); }
    const s = ranged ? t0 : t0 + T(330);
    // 암기: 손을 떠난 비표가 날아가 꽂힌 뒤에 맞는다 (날아가는 시간 T(260))
    const hitAt = ranged ? s + T(380) : s + T(150);
    heroF(s, 4); heroF(s + T(120), 5);
    if (ranged) q.push({ at: s + T(120), k: 'proj', dur: hitAt - (s + T(120)) });
    q.push({ ...ev, at: hitAt }); heroF(s + T(300), 6);
    if (!ranged) q.push({ at: s + T(520), k: 'hx', x: LIVE_POS.hero });
    heroF(s + T(560), 0);
    return s + T(700);
  };
  // 초식 일격: 제자는 제자리에서 칼을 휘두르고 (연속 때리기 무공은 아래에서 달려가 붙음)(돌진하는 평타 동작 없이), 칼끝에서 나간 검기가 요수에 닿을 때 맞는다
  const skillAtk = (t0, ev, sk) => {
    q.push({ at: t0, k: 'kiai' });   // 기를 모아 들어가기 직전 기합 (10월 3일 유저)
    const hitSnd = at => { const d = CO_HIT_SND[sk.n] || 0; if (d && ev.f.k !== 'miss') { ev.noSnd = true; q.push({ at: at + T(d), k: 'hs', crit: ev.f.k === 'crit' }); } };   // 타격음만 맞는 순간보다 당기거나 늦춘다 (유저 초식 타이밍)   // 타격음만 맞는 순간보다 당기거나 늦춘다 (유저 초식 타이밍)
    ev.art = !!(sk.mid && stanceFxSrc(sk.mid, sk.n || sk.tier));   // 초식 그림이 있으면 맞을 때 평타 타격 그림은 띄우지 않는다 (겹침 방지)
    if (!ranged && sk.mid && ASSET.hit(sk.mid) && stanceCutN(sk.n || sk.tier) === 1) {   // (제1초식만 — 제2초식은 손에서 뻗어 날아가는 기운)   // 연속 때리기(MANUAL_HIT): 달려가 붙어서 때리고, 맞는 자리에 초식 그림이 터진 뒤 돌아온다
      const N = ASSET.hitN(sk.mid);
      q.push({ at: t0, k: 'hx', x: Math.max(LIVE_POS.lunge, (sh.foeX || 0) - (N === 1 ? 22 : 13)) }); heroF(t0, 1); heroF(t0 + T(110), 2); heroF(t0 + T(220), 1);   // 주먹이 닿게 요수에 바짝 붙는다 (관수는 팔이 길어 그만큼 뒤에 선다)
      const s = t0 + T(330), hitAt = s + T(N > 1 ? 170 * (N - 1) + 40 : 150);
      if (N === 1) { heroF(s - T(90), 6); heroF(s, 11); }   // 한 번 깊게(철사장, 관수 11칸): 웅크렸다가 팔을 곧게 뻗어 찌른 채 멈춘다 (발차기 칸 없이)
      else { for (let i = 0; i < N; i++) { heroF(s + T(i * 170), 4); heroF(s + T(i * 170 + 85), 5); }   // 연타: 주먹이 뻗는 컷(5)마다 타격음 — 손발과 소리를 맞춘다 (유저)
        if (ev.f.k !== 'miss') { ev.noSnd = true; for (let i = 0; i < N; i++) q.push({ at: s + T(i * 170 + 85 + CO_MULTI_SND), k: 'hs', crit: ev.f.k === 'crit' && i === N - 1 }); } }   // 무공마다 횟수 (통비권 연타 세 번 · 철사장 한 번 깊게) — 초식 그림은 첫 손에 터져 끝까지 이어진다
      q.push({ at: s + T(40), k: 'skill', sk }); if (N === 1) hitSnd(hitAt); q.push({ ...ev, at: hitAt }); const e = hitAt + T(140); heroF(e, 6);
      q.push({ at: e + T(200), k: 'hx', x: LIVE_POS.hero }); heroF(e + T(240), 0);
      return e + T(380);
    }
    heroF(t0, 4); q.push({ at: t0 + T(90), k: 'skill', sk }); heroF(t0 + T(140), 5);
    const hitAt = t0 + T(sk.n >= 2 ? 560 : 450);
    hitSnd(hitAt); q.push({ ...ev, at: hitAt }); heroF(t0 + T(420), 6); heroF(t0 + T(900), 0);
    return t0 + T(1050);
  };
  const foeAtk = (t0, ev) => {
    q.push({ at: t0, k: 'fx', x: -9 }); q.push({ at: t0, k: 'fa', f: 0 }); q.push({ at: t0 + T(160), k: 'fa', f: 1 });
    q.push({ ...ev, at: t0 + T(230) }); q.push({ at: t0 + T(380), k: 'fa', f: 2 });
    q.push({ at: t0 + T(560), k: 'fa', f: -1 }); q.push({ at: t0 + T(560), k: 'fx', x: 0 }); heroF(t0 + T(620), 0);
    return t0 + T(760);
  };
  const num = t => +String(t).replace(/[^\d]/g, '') || 0;
  let t = 900, me = B.start.me.hp, foe = B.start.foe.hp;
  let pending = null, tagNext = '', heroLast = false;   // 반격 · 연격 표기 (10월 3일 유저): 반격 깃발 다음 일격 = 반격, 요수 공격 없이 제자가 잇달아 치면 = 연격
  for (const r of B.rounds) {
    const used = new Set();
    for (let i = 0; i < r.fx.length; i++) {
      const f = r.fx[i]; if (used.has(i)) continue;
      if (f.side === 'banner' && f.k === 'move' && f.mid && f.n >= 3 && typeof ougiPlay === 'function' && ougiHas(f.mid)) {   // 오의: 바로 뒤의 일격을 오의 연출로 (빗나가면 예전처럼 이름만)
        const j = r.fx.findIndex((g, k) => k > i && g.side === 'foe'), g = j > 0 ? r.fx[j] : null;
        const co = g && g.k !== 'miss' && typeof calloutOf === 'function' && calloutOn() && calloutOf(f.mid, f.n);
        if (co) { q.push({ at: t, k: 'callout', mid: f.mid, n: f.n }); t += T(200); }   // 오의 외침: 무공 시계(CO_MOVE_AT.ougi)가 되면 오의 막
        if (g && g.k !== 'miss') { used.add(j); const d = num(g.t); foe = Math.max(0, foe - d); q.push({ at: t, k: 'ougi', mid: f.mid, name: f.t, noName: !!co, dmg: d, hp: foe, kill: foe <= 0 }); t += T(200); continue; }
      }
      if (f.side === 'banner' && f.k === 'counter') { tagNext = '반격'; continue; }
      if (f.side === 'banner') {
        if (f.k === 'move' && f.mid && f.n) {
          const co = typeof calloutOf === 'function' && calloutOn() && calloutOf(f.mid, f.n);   // 초식 외침: 초식을 펼칠 때마다 (설정에서 끔)
          if (co) { q.push({ at: t, k: 'callout', mid: f.mid, n: f.n }); t += T(20); }   // 시문이 끝나 두루마리가 거둬지면 기합과 함께 초식
          pending = { mid: f.mid, n: f.n, tier: f.n >= 3 ? 2 : 1, name: f.t, noName: !!co };   // 초식은 바로 뒤의 일격에 실어 낸다 (평타 동작과 겹치지 않게)
        }
        continue;
      }
      if (f.side === 'foe') { if (f.k !== 'miss') foe = Math.max(0, foe - num(f.t)); const ev = { k: 'hitR', f, hp: foe, tag: tagNext || (heroLast ? '연격' : '') }; tagNext = ''; heroLast = true; t = pending ? skillAtk(t, ev, pending) : heroAtk(t, ev); pending = null; }
      else if (f.k === 'heal') { me = Math.min(B.start.me.maxHp, me + num(f.t)); q.push({ at: t, k: 'heal', f, hp: me }); t += T(520); }
      else { heroLast = false; if (f.k !== 'dodge') me = Math.max(0, me - num(f.t)); t = foeAtk(t, { k: 'hurtR', f, hp: me }); }
    }
    if (pending) { q.push({ at: t, k: 'skill', sk: pending }); t += T(420); pending = null; }   // 뒤따르는 일격이 없으면 그림만
    me = r.me.hp; foe = r.foe; q.push({ at: t, k: 'sync', me, foe, mp: r.me.mp });
    t += T(160);
  }
  q.push({ at: t + 200, k: B.win ? 'ko' : B.fled ? 'mist' : 'down' });
  q.push({ at: t + 1600, k: 'end' });
  return q.map((e, i) => [e, i]).sort((a, b) => a[0].at - b[0].at || a[1] - b[1]).map(x => x[0]);   // 시간순 (같은 시각은 넣은 순서대로)
}
/* 지금 무공에서 열린 가장 높은 초식 (없으면 null) */
function liveSkillOf() {
  const id = S.active.mugong, M = id && MANUALS[id]; if (!M || !M.weapon || !M.stances) return null;
  const n = unlockedMoves(S.manuals[id].star); if (!n) return null;
  return { mid: id, n, tier: n >= 3 ? 2 : 1, name: stanceShort(M.stances[n - 1].name) };   // tier: 화면 단계 (오의만 광휘)
}
function liveSkill(sc, sk) {
  const lab = document.createElement('div'); lab.className = `live-skname n${sk.tier}${sk.name.length > 9 ? ' long' : ''}`; lab.dataset.live = 1; lab.textContent = `「${sk.name}」`;
  const v = stanceFxEl(sc, sk.mid, sk.n || sk.tier, `live-skill n${sk.tier}`, document.getElementById('liveHero'), sc.querySelector('.live-foe')); if (v) v.dataset.live = 1;
  if (sk.noName) lab.hidden = true;                  // 방금 두루마리로 외친 초식은 이름 글자를 또 띄우지 않는다
  sc.append(lab, ...(v ? [v] : [])); setTimeout(() => { lab.remove(); if (v) v.remove(); }, sk.tier === 2 ? 1500 : 1200);
  if (sk.tier === 2 && v) liveShake(sc);   // 그림 없는 초식 · 오의는 평타처럼
}
function liveShake(sc) { sc.classList.remove('shake'); void sc.offsetWidth; sc.classList.add('shake'); clearTimeout(sc._shakeT); sc._shakeT = setTimeout(() => sc.classList.remove('shake'), 650); }
/* 피해 숫자 글자 그림 (힉스 확정본 · ui/dmg_0~9, 회심 ui/dmgc_0~9) */
const dmgDigits = (t, crit) => [...String(t)].map(d => `<img src="${ASSET.ui((crit ? 'dmgc_' : 'dmg_') + (d === '-' ? 'm' : d))}" alt="">`).join('');   // '-' = 빼기 글자 (dmg_m)
function liveNum(sc, t, left, cls) {
  const n = document.createElement('div'); n.className = `sp-num live-num ${cls || ''}`; n.dataset.live = 1; n.style.left = (left - 4 + Math.random() * 8) + '%';
  if (/^-?\d+$/.test(String(t))) { n.classList.add('dg'); n.setAttribute('aria-label', t); n.innerHTML = dmgDigits(t, /\bcrit\b/.test(cls || '')); } else n.textContent = t;   // 피해 숫자는 먹 붓글씨 글자 그림 (회심은 금빛)
  sc.appendChild(n); setTimeout(() => n.remove(), 1000);
}
/* 날아가는 비표: 제자 손에서 요수 몸통까지 살짝 휘어 날아간다 */
function liveProj(sc, sh, dur) {
  const el = document.createElement('img'); el.className = 'live-proj'; el.dataset.live = 1; el.src = ASSET.fx('dart'); el.alt = '';
  const x0 = LIVE_POS.hero + 18, y0 = 30, x1 = sh.foeX + LIVE_POS.foeW * sh.size * .45, y1 = 7.4 + LIVE_POS.foeW * sh.size * .8;
  el.style.left = x0 + '%'; el.style.bottom = y0 + '%'; sc.appendChild(el);
  const W = sc.offsetWidth || 1, H = sc.offsetHeight || 1, dx = (x1 - x0) / 100 * W, dy = -(y1 - y0) / 100 * H;
  if (el.animate) el.animate([{ transform: 'translate(0,0) rotate(-4deg)', opacity: 1 }, { transform: `translate(${dx * .5}px,${dy * .5 - H * .04}px) rotate(0deg)`, opacity: 1 }, { transform: `translate(${dx}px,${dy}px) rotate(5deg)`, opacity: 1 }], { duration: Math.max(120, dur), easing: 'linear', fill: 'forwards' });
  setTimeout(() => el.remove(), Math.max(120, dur) + 60);
}
function liveVfx(sc, name, left, cls) {
  const v = document.createElement('img'); v.className = `live-vfx ${cls || ''}`; v.dataset.live = 1; v.src = ASSET.vfx(name); v.alt = ''; v.style.left = left + '%';
  sc.appendChild(v); setTimeout(() => v.remove(), 650);
}
function liveShowStart(sc, sh) {
  const foe = sc.querySelector('.live-foe'); if (!foe) return null;
  const n = FOE_SHEET[sh.eid] || 6, size = Math.max(.8, foeSize(sh.eid));   // 작은 요수도 폰에서 보이게 0.8배 이상
  foe.className = 'sp-fighter sp-foe flip fsheet live-foe';
  foe.style.width = (LIVE_POS.foeW * size).toFixed(1) + '%'; foe.style.left = '104%';
  sh.foeX = 100 - LIVE_POS.foeR - LIVE_POS.foeW * size;  sh.size = size;   // 맞붙는 자리 (왼쪽 끝 %)
  const spr = foe.querySelector('.sp-fspr'), atk = foe.querySelector('.sp-fatk');
  spr.style.backgroundImage = `url('${SPRITE_SRC.foe(sh.eid)}')`; spr.style.backgroundSize = `${n * 100}% 100%`;
  atk.style.backgroundImage = `url('${SPRITE_SRC.foe(sh.eid, 1)}')`; atk.style.backgroundSize = '300% 100%';
  const sk = liveSkillOf(), src = sk && stanceFxSrc(sk.mid, sk.n); if (src) preloadImgs([src]);
  const R = sh.ref && findExpedition(sh.ref.rid), B = R && R.battles[sh.ref.bi];
  sh.rec = B && B.rounds && B.rounds.length ? B : null;
  for (const f of sh.rec ? sh.rec.rounds.flatMap(r => r.fx) : []) if (f.mid && f.n) { const src = stanceFxSrc(f.mid, f.n); if (src) preloadImgs([src]); if (typeof calloutPreload === 'function') calloutPreload(f.mid, f.n); }
  const og = sh.rec && sh.rec.rounds.flatMap(r => r.fx).find(f => f.mid && f.n >= 3);   // 오의가 나가는 전투: 오의 그림을 미리
  if (og && typeof ougiPreload === 'function') ougiPreload(weaponType(), og.mid);
  liveHp(sc, 'me', sh.rec ? sh.rec.start.me.hp : 1, sh.rec ? sh.rec.start.me.maxHp : 1, S.name, calculateCombatPower(S));
  liveMp(sc, sh.rec ? sh.rec.start.me.mp : S.mp, sh.rec ? sh.rec.start.me.maxMp : calcStats().maxMp);
  liveHp(sc, 'foe', sh.rec ? sh.rec.start.foe.hp : 1, sh.rec ? sh.rec.start.foe.maxHp : 1, ENEMIES[sh.eid].name, foeCombatPower(sh.eid));
  liveAnim.hpm.foe.face = `url('${ASSET.beast(sh.eid)}')`; const ff = sc.querySelector('.live-hp.foe .lh-face'); if (ff) ff.style.backgroundImage = liveAnim.hpm.foe.face;
  Object.assign(sh, { n, skill: sk, heavy: sh.boss || size >= 1.05, base: Math.max(4, Math.round(calculateCombatPower(S) / 12)), phase: 'approach', x0: liveAnim.x, t0: 0, q: null, bf: 0, bt: 0 });
  sc.classList.add('approach');
  return sh;
}
function liveShowStep(sc, sh, ts, dt) {
  for (const w of ['me', 'foe']) { const M = liveAnim.hpm && liveAnim.hpm[w], em = sc.querySelector(`.live-hp.${w} em`); if (M && em && !em.textContent) liveHp(sc, w, M.hp); }   // 다시 그려졌으면 체력패를 되살린다
  const foe = sc.querySelector('.live-foe'), hero = document.getElementById('liveHero');
  if (!foe || !hero) return true;
  sh.bt += dt; if (sh.bt > 170) { sh.bt = 0; foe.querySelector('.sp-fspr').style.backgroundPositionX = (sh.bf++ % sh.n) * 100 / (sh.n - 1) + '%'; }   // 요수 숨쉬기
  if (sh.phase === 'approach') {                      // 요수는 땅에 서 있고, 산길이 흐르며 다가온다
    const W = sc.offsetWidth || 1, left = 104 - (liveAnim.x - sh.x0) / W * 100;
    foe.style.left = left.toFixed(2) + '%';
    if (left > sh.foeX) return false;
    foe.style.left = sh.foeX + '%'; sh.phase = 'fight'; sh.t0 = ts; sh.q = liveShowPlan(sh, hero.dataset.w || weaponType());
    sc.classList.remove('approach'); sc.classList.add('fight');
    hero.style.left = LIVE_POS.hero + '%'; hero.dataset.f = 0;
    if (sh.boss) {                                    // 두목: 무대가 어두워지고 큰 깃발 · 땅울림
      const bn = sc.querySelector('.live-boss'); if (bn) bn.querySelector('b').textContent = ENEMIES[sh.eid].name;
      sc.classList.remove('boss'); void sc.offsetWidth; sc.classList.add('boss'); setTimeout(() => sc.classList.remove('boss'), 3200);
      liveShake(sc); setTimeout(() => liveShake(sc), 380); sfx('boss');
    } else { sc.classList.remove('enc'); void sc.offsetWidth; sc.classList.add('enc'); setTimeout(() => sc.classList.remove('enc'), 2600); }
    return false;
  }
  if (sh.hold) return false;                          // 오의를 펼치는 동안은 순서를 멈춘다 (끝나면 그만큼 미룬다)
  const el = ts - sh.t0;
  while (sh.q.length && sh.q[0].at <= el) {
    const e = sh.q.shift();
    if (e.k === 'hf') hero.dataset.f = e.f;
    else if (e.k === 'hx') hero.style.left = e.x + '%';
    else if (e.k === 'fx') foe.style.left = (sh.foeX + e.x * LIVE_POS.k) + '%';
    else if (e.k === 'fa') foe.classList.toggle('striking', e.f >= 0), e.f >= 0 && (foe.querySelector('.sp-fatk').style.backgroundPositionX = e.f * 50 + '%');
    else if (e.k === 'kiai') sfx('kiai');
    else if (e.k === 'hs') sfxHit(hero.dataset.w || weaponType(), e.crit);
    else if (e.k === 'skill') liveSkill(sc, e.sk);
    else if (e.k === 'ougi') {
      sh.hold = true; const t1 = performance.now(); sfx('kiai'); sfx('ougi');
      ougiPlay(sc, { w: hero.dataset.w || weaponType(), mid: e.mid, name: e.name, noName: e.noName, heroEl: hero, foeEl: foe, foeImg: ASSET.beast(sh.eid), dmg: e.dmg, kill: e.kill,
        onImpact: () => { sfxHit(hero.dataset.w || weaponType(), true); spFlash(foe); liveHp(sc, 'foe', e.hp); } }).then(() => { sh.hold = false; sh.t0 += performance.now() - t1; });
      return false;
    }
    else if (e.k === 'callout') {                     // 초식 외침: 시문이 끝나 두루마리가 다 거둬질 때까지 순서를 멈춘다 (그 뒤 기합과 함께 초식)
      sh.hold = true; const t1 = performance.now();
      sfx('scroll'); setTimeout(() => sfx('poem'), CO_TL.poem); calloutPlay(sc, e.mid, e.n).then(() => { sh.hold = false; sh.t0 += performance.now() - t1; });
      return false;
    }
    else if (e.k === 'proj') liveProj(sc, sh, e.dur);
    else if (e.k === 'hitR') {                        // 제자의 공격: 기록된 피해 · 회심 · 빗나감
      const f = e.f;
      if (e.tag) liveNum(sc, e.tag, sh.foeX - 2, 'tag');   // 반격 · 연격
      if (f.k === 'miss') { liveNum(sc, '빗나감', sh.foeX + 9, 'miss'); sfx('miss'); }
      else { if (!e.noSnd) sfxHit(hero.dataset.w || weaponType(), f.k === 'crit'); spFlash(foe); liveNum(sc, f.t, sh.foeX + 9, f.k === 'crit' ? 'crit' : ''); if (!e.art) liveVfx(sc, f.k === 'crit' || f.big ? 'crit' : 'hit', sh.foeX + 7, f.k === 'crit' || f.big ? 'crit' : ''); liveHp(sc, 'foe', e.hp); }
    }
    else if (e.k === 'hurtR') {                       // 요수의 공격: 기록된 피해 · 회피
      const f = e.f;
      if (sh.heavy) liveShake(sc);                    // 덩치 큰 요수 · 두목의 반격은 땅이 울린다
      if (f.k === 'dodge') { hero.dataset.f = 8; liveNum(sc, '회피', 22, 'miss'); sfx('miss'); }
      else { hero.dataset.f = 7; spFlash(hero); sfx('hurt'); liveVfx(sc, 'hit', 22, 'small'); liveNum(sc, f.t, 22, 'me'); liveHp(sc, 'me', e.hp); }
    }
    else if (e.k === 'heal') { sfx('salve'); liveNum(sc, `🩸${e.f.t}`, 22, 'heal'); liveHp(sc, 'me', e.hp); }
    else if (e.k === 'sync') { liveHp(sc, 'me', e.me); liveHp(sc, 'foe', e.foe); if (e.mp != null) liveMp(sc, e.mp); }
    else if (e.k === 'down') { sfx('ko'); hero.classList.add('ko'); liveNum(sc, '쓰러짐', 22, 'me'); }
    else if (e.k === 'ko') { sfx('ko'); foe.classList.add('ko'); }
    else if (e.k === 'mist') foe.classList.add('mist');
    else if (e.k === 'end') return true;
  }
  return false;
}
/* 무대 위 정보 창 (마른 붓 먹획 + 팔괘 얼굴 창): 막대 위 이름 · 막대 안 활력 숫자 · 막대 아래 투력. cp: 투력 (제자 · 요수 같은 잣대) */
/* 내 정보창의 내력 막대 (활력 막대 바로 아래 가는 푸른 막대) */
function liveMp(sc, mp, max) {
  const el = sc && sc.querySelector('.live-hp.me .lh-mp'); if (!el) return;
  const M = (liveAnim.hpm = liveAnim.hpm || {}).mp = { ...(liveAnim.hpm.mp || {}), ...(max ? { max } : {}), mp };
  const r = clamp(mp / (M.max || 1), 0, 1); el.querySelector('i').style.width = (r * 100).toFixed(1) + '%';
  el.title = `내력 ${fmt(Math.max(0, Math.round(mp)))} / ${fmt(M.max || 0)}`; el.querySelector('em').textContent = `${fmt(Math.max(0, Math.round(mp)))} / ${fmt(M.max || 0)}`;
  if (liveAnim.hold) {                                 // 옆 패널 내력 막대도 무대와 같이
    liveAnim.hold.mp = mp; const mx = calcStats().maxMp, bar = document.querySelector('#liveSide .live-prog.mp span'), tx = document.querySelector('#liveSide .live-vit-mp');
    if (bar) bar.style.width = clamp(mp / mx * 100, 0, 100).toFixed(1) + '%'; if (tx) tx.textContent = `내력 ${fmt(Math.round(mp))} / ${fmt(mx)}`;
  }
}
function liveHp(sc, who, hp, max, name, cp) {
  const el = sc.querySelector(`.live-hp.${who}`); if (!el) return;
  const M = (liveAnim.hpm = liveAnim.hpm || {})[who] = { ...(liveAnim.hpm[who] || {}), ...(max ? { max, name } : {}), ...(cp !== undefined ? { cp } : {}), hp };   // 다시 그려져도 이름 · 최대치 · 투력을 잃지 않게 기억
  if (M.name !== undefined) { const b = el.querySelector('.lh-nm'); if (b && b.textContent !== M.name) b.textContent = M.name; }
  if (M.cp !== undefined) { const c = el.querySelector('.lh-cp'), t = `투력 ${fmt(M.cp)}`; if (c && c.textContent !== t) c.textContent = t; }
  if (M.face) { const f = el.querySelector('.lh-face'); if (f && !f.style.backgroundImage) f.style.backgroundImage = M.face; }
  const m = M.max || 1, r = clamp(hp / m, 0, 1), w = (r * 100).toFixed(1) + '%';
  el.querySelector('.lh-bar .now').style.width = w; el.querySelector('.lh-bar .lag').style.width = w; el.classList.toggle('low', r < .3);   // 줄어든 몫은 잠깐 밝게 남았다가 따라 내려감 (CSS 지연)
  const n = el.querySelector('em'); if (n) n.textContent = `${fmt(Math.max(0, Math.round(hp)))} / ${fmt(m)}`;
  if (who === 'me' && liveAnim.hold) {                // 옆 패널 활력 막대도 무대와 같이
    liveAnim.hold.hp = hp; const mx = calcStats().maxHp, bar = document.querySelector('#liveSide .live-prog.hp span'), tx = document.querySelector('#liveSide .live-vit-hp');
    if (bar) bar.style.width = clamp(hp / mx * 100, 0, 100).toFixed(1) + '%'; if (tx) tx.textContent = `활력 ${fmt(Math.round(hp))} / ${fmt(mx)}`;
  }
}
function liveShowEnd(sc) {
  sc.classList.remove('fight', 'approach');
  const hero0 = document.getElementById('liveHero'); if (hero0) hero0.classList.remove('ko');
  const foe = sc.querySelector('.live-foe'); if (foe) foe.className = 'sp-fighter sp-foe flip fsheet live-foe';
  const hero = document.getElementById('liveHero'); if (hero) { hero.style.left = ''; hero.dataset.f = 0; }
  liveAnim.show = null; liveAnim.walkMs = 0; liveAnim.v = 0; liveRelease(); liveAnim.nextShow = 18000 + Math.random() * 14000;
}
