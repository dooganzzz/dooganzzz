/* [화면] 강호행: 탐험지 고르기 · 강호행 시작/귀환 · 탐험 기록, 결산 창, 전투 관찰(리플레이) */

/* 1초마다 흐른 시간만 바꿔 쓴다 (화면 전체를 다시 그리지 않는다) */
Bus.on('tick', () => {
  for (const el of document.querySelectorAll('[data-runclock]')) el.textContent = runClockText();
  const scn = $('#liveScene'); if (scn && scn.dataset.tod !== liveTod()) scn.dataset.tod = liveTod();   // 시간대 빛깔
  // 방금 치른 전투는 무대에서 기록 그대로 재생한다 (다시 그리기와 상관없이, 전투마다 한 번)
  { const lr = liveRec(), st = lr && lr.steps.length ? lr.steps[lr.steps.length - 1] : null, key = st && st.b !== undefined ? `${lr.id}:${st.b}` : null;
    if (scn && key && key !== liveAnim.lastBattle && now() - stepAt(lr, lr.steps.length - 1) < 6000) { liveAnim.lastBattle = key; const bt = lr.battles[st.b]; liveShowQueue(bt.eid, true, bt.boss, { rid: lr.id, bi: st.b }); } }
  const sig = liveSig(); if (sig === lastLiveSig) return; lastLiveSig = sig;   // 새 걸음이 드러났을 때만
  const box = $('#liveSide'); if (box) setHTML(box, liveSide());
  const sc = $('#liveScene'), lr = liveRec();
  if (sc) {
    sc.classList.toggle('rest', liveDone(lr));
    const wh = sc.querySelector('.live-where'), X = S.expedition; if (wh && (lr ? lr.zone : X.zone)) wh.textContent = stageName(lr ? lr.zone : X.zone, lr && lr.live ? lr.stage : X.stage || 1);
  }
  if (typeof ui !== 'undefined' && ui.tab === 'chronicle' && !ui.modal) render();
});

/* ───────── 실시간 강호행: 산길을 걷는 제자와 견문록 ───────── */
let lastLiveSig = '';
function liveSig() { const X = S && S.expedition; return S ? S.expeditions.map(r => `${r.id}:${r.steps.length}${r.live ? `L${r.stage}.${r.kills}` : ''}${r.claimed ? 'c' : ''}${r.battles.filter(b => b.seen !== false).length}`).join(',') + `|${X.zone || ''}|${X.stage}|${X.auto}|${stageCleared(X.zone)}|${count('saenghyeol')}` : ''; }
/* 단계 줄: 1~10단계 (돌파 ✔ · 지금 · 잠김). 강호행 전에는 출발 단계를 고르고, 강호행 중에는 그 단계로 옮겨 간다 */
function stageStrip() {
  const X = S.expedition, zid = X.zone; if (!zid) return '';
  const run = activeRun(), cur = run && run.zone === zid ? run.stage : X.stage, max = stageMax(zid), done = stageCleared(zid);
  const cells = Array.from({ length: STAGE.count }, (_, i) => { const n = i + 1, open = n <= max;
    return `<button class="stage-cell ${n === cur ? 'on' : ''} ${n <= done ? 'done' : ''} ${n === STAGE.count ? 'boss' : ''}" data-stage="${n}" ${open ? '' : 'disabled'} title="${open ? stageName(zid, n) : '앞 단계를 돌파하면 열립니다'}">${n === STAGE.count ? '頭' : n}</button>`; }).join('');
  const seen = { ...((S.zoneLog[zid] || {}).seen || {}) }; if (run) for (const b of run.battles) seen[b.eid] = 1;
  const foes = stageFoes(zid, cur).map(e => seen[e] ? ENEMIES[e].name : '？').join(' · ');
  return `<div class="stage-strip">${cells}</div>
    <p class="stage-info"><b>${stageName(zid, cur)}</b> <span class="muted">${cur >= STAGE.count ? '두목' : '요수'}: ${foes}</span>${run ? ` · 돌파까지 <b>${run.kills}</b> / ${stageNeed(run.stage)}승` : cur <= done ? ' <span class="good">돌파함</span>' : ''}
      <button class="chip sm ${X.auto !== false ? 'on' : ''}" data-stageauto>${X.auto !== false ? '돌파하면 다음 단계로' : '이 단계에 머물기'}</button></p>`;
}
const runClockText = () => { const r = activeRun(); return r ? hhmmss(now() - r.at) : '—'; };
/* 걷기: 병기별 걸음 시트 16칸이 두 걸음 한 주기(ms). 산길은 한 주기에 키(칸 높이)의 g배만큼 한 겹으로 흘러 발이 미끄러지지 않는다
   (주기와 g는 걷는 영상에서 디딘 발이 뒤로 밀리는 빠르기를 재어 정했다).
   강호행이 끝나면 멈춰 서서 숨을 고르며 초식을 연습한다 (대기 시트). 전투 걸음이 일어나면 그 전투 기록을 무대에서 그대로 재생한다 (견문록에는 결과와 [관찰]) */
const WALK_META = { sword: { n: 16, ms: 1375, g: .64 }, blade: { n: 16, ms: 1500, g: .631 }, spear: { n: 16, ms: 1417, g: .592 }, fist: { n: 16, ms: 1333, g: .587 }, hidden: { n: 16, ms: 1167, g: .764 } }, WALK_DEF = { n: 16, ms: 1375, g: .64 };
const walkMeta = w => WALK_META[w] || WALK_DEF;
let liveAnim = { f: 0, last: 0, acc: 0, x: 0, raf: 0, breath: 0, walkMs: 0, nextShow: 0, show: null, queued: null };
/* 연출 전투 예약: real = 방금 드러난 실제 전투 (그 요수로, 끝은 안개 속으로 — 승패는 견문록에서) */
/* 산길 시간대: 지금 시각으로 새벽 · 낮 · 해 질 녘 · 밤 */
function liveTod(t = now()) { const h = new Date(t).getHours(); return h >= 5 && h < 7 ? 'dawn' : h >= 7 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'dusk' : 'night'; }
/* 맞붙는 모습 예약: ref = 강호행에서 방금 치른 전투 { rid, bi } — 그 기록(합 · 피해 · 회피 · 생혈고 · 초식 · 승패)을 무대에서 그대로 재생한다 */
function liveShowQueue(eid, real, boss, ref) {
  if (!eid || !ENEMIES[eid] || (liveAnim.show && liveAnim.show.real)) return;
  liveAnim.queued = { eid, real: !!real, boss: !!boss, ref };
  preloadImgs([SPRITE_SRC.foe(eid), SPRITE_SRC.foe(eid, 1)]);
}
function liveShowPick(zid) {
  const Z = ZONES[zid]; if (!Z) return null;
  const pool = Z.enemies.filter(e => ENEMIES[e]);
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
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
    if (!ranged) { q.push({ at: t0, k: 'hx', x: 36 }); heroF(t0, 1); heroF(t0 + T(110), 2); heroF(t0 + T(220), 1); }
    const s = ranged ? t0 : t0 + T(330);
    heroF(s, 4); heroF(s + T(120), 5); q.push({ ...ev, at: s + T(150) }); heroF(s + T(300), 6);
    if (!ranged) q.push({ at: s + T(520), k: 'hx', x: 22 });
    heroF(s + T(560), 0);
    return s + T(700);
  };
  const foeAtk = (t0, ev) => {
    q.push({ at: t0, k: 'fx', x: -9 }); q.push({ at: t0, k: 'fa', f: 0 }); q.push({ at: t0 + T(160), k: 'fa', f: 1 });
    q.push({ ...ev, at: t0 + T(230) }); q.push({ at: t0 + T(380), k: 'fa', f: 2 });
    q.push({ at: t0 + T(560), k: 'fa', f: -1 }); q.push({ at: t0 + T(560), k: 'fx', x: 0 }); heroF(t0 + T(620), 0);
    return t0 + T(760);
  };
  const num = t => +String(t).replace(/[^\d]/g, '') || 0;
  let t = 900, me = B.start.me.hp, foe = B.start.foe.hp;
  for (const r of B.rounds) {
    for (const f of r.fx) {
      if (f.side === 'banner') { if (f.k === 'move' && f.mid && f.n) { q.push({ at: t, k: 'skill', sk: { mid: f.mid, tier: Math.min(2, f.n), name: f.t } }); t += T(f.n >= 2 ? 700 : 420); } continue; }
      if (f.side === 'foe') { if (f.k !== 'miss') foe = Math.max(0, foe - num(f.t)); t = heroAtk(t, { k: 'hitR', f, hp: foe }); }
      else if (f.k === 'heal') { me = Math.min(B.start.me.maxHp, me + num(f.t)); q.push({ at: t, k: 'heal', f, hp: me }); t += T(520); }
      else { if (f.k !== 'dodge') me = Math.max(0, me - num(f.t)); t = foeAtk(t, { k: 'hurtR', f, hp: me }); }
    }
    me = r.me.hp; foe = r.foe; q.push({ at: t, k: 'sync', me, foe });
    t += T(160);
  }
  q.push({ at: t + 200, k: B.win ? 'ko' : B.fled ? 'mist' : 'down' });
  q.push({ at: t + 1600, k: 'end' });
  return q;
}
/* 지금 무공에서 열린 가장 높은 초식 (없으면 null) */
function liveSkillOf() {
  const id = S.active.mugong, M = id && MANUALS[id]; if (!M || !M.weapon || !M.stances) return null;
  const tier = unlockedMoves(S.manuals[id].star); if (!tier) return null;
  return { mid: id, tier, name: M.stances[tier - 1].name };
}
function liveSkill(sc, sk) {
  const lab = document.createElement('div'); lab.className = `live-skname n${sk.tier}`; lab.textContent = `「${sk.name}」`;
  const v = document.createElement('img'); v.className = `live-skill n${sk.tier}`; v.src = SPRITE_SRC.fx(`${sk.mid}_${sk.tier}`); v.alt = '';
  sc.append(lab, v); setTimeout(() => { lab.remove(); v.remove(); }, sk.tier === 2 ? 1500 : 1200);
  if (sk.tier === 2) liveShake(sc);
}
function liveShake(sc) { sc.classList.remove('shake'); void sc.offsetWidth; sc.classList.add('shake'); clearTimeout(sc._shakeT); sc._shakeT = setTimeout(() => sc.classList.remove('shake'), 650); }
function liveNum(sc, t, left, cls) {
  const n = document.createElement('div'); n.className = `sp-num live-num ${cls || ''}`; n.textContent = t; n.style.left = (left - 4 + Math.random() * 8) + '%';
  sc.appendChild(n); setTimeout(() => n.remove(), 1000);
}
function liveVfx(sc, name, left, cls) {
  const v = document.createElement('img'); v.className = `live-vfx ${cls || ''}`; v.src = SPRITE_SRC.fx(name); v.alt = ''; v.style.left = left + '%';
  sc.appendChild(v); setTimeout(() => v.remove(), 650);
}
function liveShowStart(sc, sh) {
  const foe = sc.querySelector('.live-foe'); if (!foe) return null;
  const n = FOE_SHEET[sh.eid] || 6, size = foeSize(sh.eid);
  foe.className = 'sp-fighter sp-foe flip fsheet live-foe';
  foe.style.width = (29 * size).toFixed(1) + '%'; foe.style.left = '104%';
  const spr = foe.querySelector('.sp-fspr'), atk = foe.querySelector('.sp-fatk');
  spr.style.backgroundImage = `url('${SPRITE_SRC.foe(sh.eid)}')`; spr.style.backgroundSize = `${n * 100}% 100%`;
  atk.style.backgroundImage = `url('${SPRITE_SRC.foe(sh.eid, 1)}')`; atk.style.backgroundSize = '300% 100%';
  const sk = liveSkillOf(); if (sk) preloadImgs([SPRITE_SRC.fx(`${sk.mid}_${sk.tier}`)]);
  const R = sh.ref && findExpedition(sh.ref.rid), B = R && R.battles[sh.ref.bi];
  sh.rec = B && B.rounds && B.rounds.length ? B : null;
  for (const f of sh.rec ? sh.rec.rounds.flatMap(r => r.fx) : []) if (f.mid && f.n) preloadImgs([SPRITE_SRC.fx(`${f.mid}_${Math.min(2, f.n)}`)]);
  liveHp(sc, 'me', sh.rec ? sh.rec.start.me.hp : 1, sh.rec ? sh.rec.start.me.maxHp : 1);
  liveHp(sc, 'foe', sh.rec ? sh.rec.start.foe.hp : 1, sh.rec ? sh.rec.start.foe.maxHp : 1, ENEMIES[sh.eid].name);
  Object.assign(sh, { n, skill: sk, heavy: sh.boss || size >= 1.05, base: Math.max(4, Math.round(calculateCombatPower(S) / 12)), phase: 'approach', x0: liveAnim.x, t0: 0, q: null, bf: 0, bt: 0 });
  sc.classList.add('approach');
  return sh;
}
function liveShowStep(sc, sh, ts, dt) {
  const foe = sc.querySelector('.live-foe'), hero = document.getElementById('liveHero');
  if (!foe || !hero) return true;
  sh.bt += dt; if (sh.bt > 170) { sh.bt = 0; foe.querySelector('.sp-fspr').style.backgroundPositionX = (sh.bf++ % sh.n) * 100 / (sh.n - 1) + '%'; }   // 요수 숨쉬기
  if (sh.phase === 'approach') {                      // 요수는 땅에 서 있고, 산길이 흐르며 다가온다
    const W = sc.offsetWidth || 1, left = 104 - (liveAnim.x - sh.x0) / W * 100;
    foe.style.left = left.toFixed(2) + '%';
    if (left > 60) return false;
    foe.style.left = '60%'; sh.phase = 'fight'; sh.t0 = ts; sh.q = liveShowPlan(sh, hero.dataset.w || weaponType());
    sc.classList.remove('approach'); sc.classList.add('fight');
    hero.style.left = '22%'; hero.dataset.f = 0;
    if (sh.boss) {                                    // 두목: 무대가 어두워지고 큰 깃발 · 땅울림
      const bn = sc.querySelector('.live-boss'); if (bn) bn.querySelector('b').textContent = ENEMIES[sh.eid].name;
      sc.classList.remove('boss'); void sc.offsetWidth; sc.classList.add('boss'); setTimeout(() => sc.classList.remove('boss'), 3200);
      liveShake(sc); setTimeout(() => liveShake(sc), 380);
    } else { sc.classList.remove('enc'); void sc.offsetWidth; sc.classList.add('enc'); setTimeout(() => sc.classList.remove('enc'), 2600); }
    return false;
  }
  const el = ts - sh.t0;
  while (sh.q.length && sh.q[0].at <= el) {
    const e = sh.q.shift();
    if (e.k === 'hf') hero.dataset.f = e.f;
    else if (e.k === 'hx') hero.style.left = e.x + '%';
    else if (e.k === 'fx') foe.style.left = (60 + e.x) + '%';
    else if (e.k === 'fa') foe.classList.toggle('striking', e.f >= 0), e.f >= 0 && (foe.querySelector('.sp-fatk').style.backgroundPositionX = e.f * 50 + '%');
    else if (e.k === 'skill') liveSkill(sc, e.sk);
    else if (e.k === 'hitR') {                        // 제자의 공격: 기록된 피해 · 치명타 · 빗나감
      const f = e.f;
      if (f.k === 'miss') liveNum(sc, '빗나감', 70, 'miss');
      else { spFlash(foe); liveNum(sc, f.t.replace('-', ''), 70, f.k === 'crit' ? 'crit' : ''); liveVfx(sc, f.k === 'crit' || f.big ? 'crit' : 'hit', 66, f.k === 'crit' || f.big ? 'crit' : ''); liveHp(sc, 'foe', e.hp); }
    }
    else if (e.k === 'hurtR') {                       // 요수의 공격: 기록된 피해 · 회피
      const f = e.f;
      if (sh.heavy) liveShake(sc);                    // 덩치 큰 요수 · 두목의 반격은 땅이 울린다
      if (f.k === 'dodge') { hero.dataset.f = 8; liveNum(sc, '회피', 30, 'miss'); }
      else { hero.dataset.f = 7; spFlash(hero); liveVfx(sc, 'hit', 30, 'small'); liveNum(sc, f.t.replace('-', ''), 30, 'me'); liveHp(sc, 'me', e.hp); }
    }
    else if (e.k === 'heal') { liveNum(sc, `🩸${e.f.t}`, 30, 'heal'); liveHp(sc, 'me', e.hp); }
    else if (e.k === 'sync') { liveHp(sc, 'me', e.me); liveHp(sc, 'foe', e.foe); }
    else if (e.k === 'down') { hero.classList.add('ko'); liveNum(sc, '쓰러짐', 30, 'me'); }
    else if (e.k === 'ko') foe.classList.add('ko');
    else if (e.k === 'mist') foe.classList.add('mist');
    else if (e.k === 'end') return true;
  }
  return false;
}
/* 무대 위 활력 막대 (맞붙는 동안만): who = me · foe */
function liveHp(sc, who, hp, max, name) {
  const el = sc.querySelector(`.live-hp.${who}`); if (!el) return;
  if (max) { el.dataset.max = max; if (name !== undefined) el.querySelector('b').textContent = name; }
  const m = +el.dataset.max || 1; el.querySelector('i').style.width = clamp(hp / m * 100, 0, 100).toFixed(1) + '%';
}
function liveShowEnd(sc) {
  sc.classList.remove('fight', 'approach');
  const hero0 = document.getElementById('liveHero'); if (hero0) hero0.classList.remove('ko');
  const foe = sc.querySelector('.live-foe'); if (foe) foe.className = 'sp-fighter sp-foe flip fsheet live-foe';
  const hero = document.getElementById('liveHero'); if (hero) { hero.style.left = ''; hero.dataset.f = 0; }
  liveAnim.show = null; liveAnim.walkMs = 0; liveAnim.nextShow = 18000 + Math.random() * 14000;
}
/* 길가 소품: 걷는 동안 가끔 표지석 · 돌탑 · 이정표 · 사당 · 주막 깃발이 땅과 같은 빠르기로 지나간다 (h = 제자 키 대비 높이) */
const LIVE_PROPS = { stele: .5, cairn: .42, signpost: .56, shrine: .5, tavern: 1.05 };
const LIVE_PROP_ZONE = { cheongpung: ['stele', 'cairn', 'signpost', 'shrine', 'tavern'], suryong: ['stele', 'cairn', 'signpost', 'tavern'], yeomhwa: ['stele', 'signpost', 'cairn'] };
function liveProps(sc, walker, dt) {
  const W = sc.offsetWidth || 1, h = walker ? walker.offsetHeight : 120;
  for (const p of sc.querySelectorAll('.live-prop')) {
    const x = +p.dataset.x0 - (liveAnim.x - +p.dataset.at);
    if (x < -p.offsetWidth - 10) p.remove(); else p.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
  }
  liveAnim.propMs = (liveAnim.propMs || 0) + dt;
  if (!liveAnim.nextProp) liveAnim.nextProp = 4000 + Math.random() * 6000;
  if (liveAnim.propMs < liveAnim.nextProp) return;
  liveAnim.propMs = 0; liveAnim.nextProp = 9000 + Math.random() * 12000;
  const pool = LIVE_PROP_ZONE[sc.dataset.zone] || LIVE_PROP_ZONE.cheongpung, k = pool[Math.floor(Math.random() * pool.length)];
  const im = document.createElement('img'); im.className = 'live-prop'; im.src = `assets/art/props/${k}.webp`; im.alt = '';
  im.style.height = (h * LIVE_PROPS[k]).toFixed(0) + 'px'; im.dataset.x0 = W + 10; im.dataset.at = liveAnim.x;
  im.style.transform = `translate3d(${W + 10}px,0,0)`; sc.appendChild(im);
}
function liveLoop(ts) {
  liveAnim.raf = requestAnimationFrame(liveLoop);
  const sc = document.getElementById('liveScene'); if (!sc) { cancelAnimationFrame(liveAnim.raf); liveAnim.raf = 0; liveAnim.show = null; return; }
  const dt = liveAnim.last ? Math.min(100, ts - liveAnim.last) : 16; liveAnim.last = ts;
  const walker = sc.querySelector('.live-walker'), hero = document.getElementById('liveHero'), strip = sc.querySelector('.live-strip');
  const rest = sc.classList.contains('rest'), still = reduceMotion();
  if (liveAnim.show) { sc.classList.toggle('fight', liveAnim.show.phase === 'fight'); sc.classList.toggle('approach', liveAnim.show.phase === 'approach'); }   // 다시 그려져도 연출 상태를 잇는다
  if (liveAnim.show && liveAnim.show.phase === 'fight') { if (liveShowStep(sc, liveAnim.show, ts, dt)) liveShowEnd(sc); return; }   // 맞붙는 동안 산길은 멈춘다
  if (rest || still) {                                // 쉬는 중: 숨을 고르다가 몇 초마다 제자리에서 초식을 연습한다 (다음 출발까지 남은 시간은 무대 위에)
    if (liveAnim.show) liveShowEnd(sc);
    if (rest && !still && hero) {
      liveAnim.kataMs = (liveAnim.kataMs || 0) + dt;
      const k = liveAnim.kataMs - 5200;               // 5.2초 숨 고르기 → 초식 한 번 (준비 · 베기 · 마무리 · 거두기)
      if (k >= 0) {
        const f = k < 260 ? 4 : k < 420 ? 5 : k < 700 ? 6 : 0;
        if (+hero.dataset.f !== f) { hero.dataset.f = f; if (f === 5) liveVfx(sc, 'hit', 62, 'small kata'); }
        if (k > 1200) liveAnim.kataMs = Math.random() * 1500;
        return;
      }
    }
    liveAnim.acc += dt; if (liveAnim.acc > 260) { liveAnim.acc = 0; if (hero) hero.dataset.f = BREATH[liveAnim.breath++ % BREATH.length]; }
    return;
  }
  // 걷기: 시트 칸을 걸음 주기에 고르게 나눠 넘긴다
  const W = walkMeta(walker && walker.dataset.w), N = W.n;
  liveAnim.acc = (liveAnim.acc + dt) % W.ms;
  const fr = Math.floor(liveAnim.acc / (W.ms / N)) % N;
  if (fr !== liveAnim.f && walker) { liveAnim.f = fr; walker.querySelector('.walk-spr').style.backgroundPositionX = (fr * 100 / (N - 1)) + '%'; }
  // 산길 한 겹: 한 주기에 키의 g배만큼 흐른다 (그림 한 장 폭마다 되감는다)
  if (strip && walker) {
    const img = strip.firstElementChild, h = walker.offsetHeight || 120, wImg = img && img.offsetWidth;
    liveAnim.x += dt * (h * W.g) / W.ms;
    if (wImg) strip.style.transform = `translate3d(${-(liveAnim.x % wImg).toFixed(1)}px,0,0)`;
  }
  liveProps(sc, walker, dt);
  // 맞붙는 모습: 전투 걸음이 드러나면 그 요수로
  if (liveAnim.show) { liveShowStep(sc, liveAnim.show, ts, dt); return; }
  const q = liveAnim.queued;
  if (q && imgsReady([SPRITE_SRC.foe(q.eid), SPRITE_SRC.foe(q.eid, 1)])) { liveAnim.queued = null; liveAnim.show = liveShowStart(sc, { ...q }); }
}
function liveScene(r) {
  const zid = (r && r.zone) || S.expedition.zone || 'cheongpung', w = weaponType(), N = walkMeta(w).n;
  const img = () => `<img src="assets/art/travel/${zid}.jpg" alt="">`;   // 끝과 처음이 이어지게 다듬은 그림 (이음매 없이 되풀이)
  if (!liveAnim.raf) liveAnim.raf = requestAnimationFrame(liveLoop);
  return `<div class="live-scene ${liveDone(r) ? 'rest' : ''}" id="liveScene" data-zone="${zid}" data-tod="${liveTod()}">
    <div class="live-world"><div class="live-strip" data-anim>${img()}${img()}</div></div>
    <div class="sp-fighter live-walker" id="liveWalker_${w}" data-w="${w}"><i class="sp-shadow"></i><div class="walk-spr" data-anim style="background-image:url('assets/art/sprites/walk_${w}.webp');background-size:${N * 100}% 100%"></div></div>
    <div class="sp-fighter sp-hero live-hero" id="liveHero" data-f="0" data-w="${w}" data-anim><i class="sp-shadow"></i><div class="sp-spr" style="background-image:url('${SPRITE_SRC.hero(w)}')"></div></div>
    <div class="sp-fighter sp-foe flip fsheet live-foe" id="liveFoe" data-anim><i class="sp-shadow"></i><div class="sp-fspr" data-anim></div><div class="sp-fatk" data-anim></div></div>
    <div class="live-hp me" data-anim><b>${esc(S.name)}</b><i></i></div><div class="live-hp foe" data-anim><b></b><i></i></div>
    <i class="live-tint"></i>
    <img class="live-enc" src="assets/art/ui/b_encounter.png" alt="">
    <div class="live-boss"><small>頭目 出現</small><b></b></div>
    <span class="live-where">${stageName(zid, r && r.live ? r.stage : S.expedition.stage || 1)}</span>
    <span class="live-rest">${r && r.end === 'dead' && !r.claimed ? '쓰러져 돌아왔습니다' : '산문에서 대기 중'}</span>
  </div>`;
}
function liveStepRow(r, i, t) {
  const st = r.steps[i], seen = st.b === undefined || battleSeen(r, st.b);
  const btn = st.b !== undefined ? `<button class="watch" data-watch="${r.id}:${st.b}">관찰</button>` : '';
  return `<li class="${seen ? st.cls : 'enc'} ${t - stepAt(r, i) < 4000 && r.live ? 'fresh' : ''}"><time>${hhmm(stepAt(r, i))}</time><span>${chronDecor(stepText(r, st))}</span>${btn}</li>`;
}
function liveSide() {
  const r = liveRec(), t = now(), run = activeRun(), pend = pendingRecs(), X = S.expedition;
  const startBtn = `<button class="btn ${pend.length ? '' : 'primary'}" data-act="runstart" ${X.zone ? '' : 'disabled'}>강호행 시작</button>`;
  const claimBtn = pend.length ? `<button class="btn primary" data-act="claim">최종보상확인${pend.length > 1 ? ` (${pend.length}번)` : ''}${alertDot(true)}</button>` : '';
  const pots = `생혈고 <b class="${count('saenghyeol') < 3 ? 'warn' : ''}">${count('saenghyeol')}</b>개`;
  if (!r) return `${stageStrip()}<p class="muted live-empty">${X.zone ? `${josa(stageName(X.zone, X.stage || 1), '으로')} 떠날 준비가 되었습니다. [강호행 시작]을 누르면 단계를 하나씩 돌파하며, 쓰러질 때까지 쭉 나아갑니다. (${pots})` : '아래 탐험지에서 갈 곳을 먼저 정하십시오.'}</p><div class="btns live-btns">${startBtn}</div>`;
  const rows = [];
  for (let i = r.steps.length - 1; i >= 0; i--) rows.push(liveStepRow(r, i, t));
  const unseen = r.battles.filter(b => b.seen === false).length, st = calcStats(), hpP = clamp(S.hp / st.maxHp * 100, 0, 100);
  const nm = stageName(r.zone, r.stage || 1), cl = r.cleared && r.cleared.length ? ` · 돌파 ${r.cleared.length}번` : '';
  const state = run ? `강호행 중 · <span data-runclock>${runClockText()}</span> · 견문 ${r.steps.length} · 전투 ${r.battles.length}${cl}`
    : r.end === 'dead' ? `<b class="warn">${nm}에서 쓰러져 강호행이 끝났습니다.</b> 견문 ${r.steps.length} · 전투 ${r.battles.length}${cl}`
    : `<b>${nm}에서 돌아왔습니다.</b> 견문 ${r.steps.length} · 전투 ${r.battles.length}${cl}`;
  return `${stageStrip()}${run ? `<div class="live-prog hp" title="활력"><span style="width:${hpP.toFixed(1)}%"></span></div><p class="live-vit"><span>활력 ${fmt(Math.round(S.hp))} / ${fmt(st.maxHp)}</span><span>${pots}</span></p>` : ''}
    <p class="live-state">${state}${unseen ? ` · <span class="warn">안 본 전투 ${unseen}</span>` : ''}</p>
    <ol class="live-log">${rows.join('') || '<li class="muted">산문을 나섰습니다…</li>'}</ol>
    <div class="btns live-btns">
      ${run ? '<button class="btn ghost" data-act="runstop">귀환하기</button>' : `${claimBtn}${startBtn}`}
    </div>
    ${run ? '<small class="muted">전투에서 지면 쓰러지고 강호행이 끝납니다. 얻은 것은 끝난 뒤 [최종보상확인]으로 받습니다.</small>' : !X.zone ? '' : `<small class="muted">${pots} · 전방에서 개당 5냥</small>`}`;
}
function livePanel() {
  const r = liveRec(), run = activeRun();
  lastLiveSig = liveSig();
  return `<section class="panel live-panel">
    ${head('실시간 강호행', '江湖行 觀', `<span class="pill">${run ? '강호행 중' : '대기'}</span>`)}
    <div class="live-wrap">${liveScene(r)}<div class="live-side" id="liveSide">${liveSide()}</div></div>
  </section>`;
}
/* 최종보상확인: 받은 것을 펼쳐 보인다 */
function lootModal() {
  const g = ui.lootSum; if (!g) return '';
  const items = Object.entries(g.items).map(([id, n]) => `<li>${itemIco(id)}<b>${ITEMS[id].name}</b><span>×${n}</span></li>`).join('');
  const gear = g.gear.map(it => `<li><i class="chron-ico" style="background-image:url('assets/art/ui/c_trophy.png')"></i><b>[${RARITY[it.rarity].name}] ${it.name}</b></li>`).join('');
  return `<div class="sheet loot-sheet">
    <p class="eyebrow">江湖行 · 최종 보상</p>
    <h2>${g.n > 1 ? `강호행 ${g.n}번에서 얻은 것` : '강호행에서 얻은 것'}</h2>
    <div class="settle-total"><span>${hlSilver(g.silver)}</span><span>수련치 +${fmt(g.exp)}</span>${g.contrib ? `<span>공헌 +${g.contrib}</span>` : ''}</div>
    ${items || gear ? `<ul class="loot-grid">${items}${gear}</ul>` : '<p class="muted">건진 물건은 없습니다.</p>'}
    <div class="btns"><button class="btn primary" data-act="closemodal">확인</button></div>
  </div>`;
}


const hhmmss = ms => { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return `${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(x).padStart(2, '0')}`; };
const recTime = r => hhmm(r.at);
function recSummary(r) {
  const g = r.gain, items = Object.entries(g.items || {}).map(([id, n]) => `${ITEMS[id].icon}${ITEMS[id].name} ×${n}`);
  return { head: `${r.wins}승 ${r.losses}패 · 은자 ${g.silver >= 0 ? '+' : ''}${fmt(g.silver)} · 수련치 +${fmt(g.exp)}${g.contrib ? ` · 공헌 +${g.contrib}` : ''}`, items, gear: g.gear || [], used: Object.entries(g.used || {}).map(([id, n]) => `${ITEMS[id].name} ×${n}`) };
}

/* 지형 상성 결산: 구역 지형과 경공 지형이 맞았는지, 그만큼 덜(더) 쓴 기력 */
const zoneTerrainText = zid => (ZONES[zid].terrain || []).map(t => `${TERRAINS[t].name}(${TERRAINS[t].hanja})`).join('·');
function terrainLine(r) {
  const T = r.terrain; if (!T || typeof T.match === 'number' || T.match === null) return '';   // 예전 기록 · 경공 없음
  return `지형 ${zoneTerrainText(r.zone)} · 경공 ${TERRAINS[T.mine].name} ${T.match ? '일치' : '불일치'} (기력 ${T.extra > 0 ? `+${Math.round(T.extra * 10) / 10} 더 씀` : `${Math.round(-T.extra * 10) / 10} 아낌`})`;
}

function vbar(cls, cur, prev, max, name, hideNum) {
  const p = v => max ? clamp(v / max * 100, 0, 100) : 0;
  return `<div class="bar thick ${cls}"><span class="bar-ghost" data-to="${p(cur)}" style="width:${p(Math.max(cur, prev))}%"></span><span class="bar-fill" style="width:${p(cur)}%"></span><span class="bar-text"><b>${name}</b>${hideNum ? '' : ` ${fmt(cur)} / ${fmt(max)}`}</span></div>`;
}
const sealChar = name => name.replace(/^(염화채주|수룡방주|염화채|수룡방|흑풍채|청풍산|적염|사나운|흑비단|바위 등껍질|청령|화염|적토|단애|열화|수로|뻘밭|소택지)\s*/, '').trim()[0] || name[0];

/* ───────── 강호행 탭 ───────── */
const clockHM = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

/* 구역 카드: 적정 전투력·난이도는 보여 주지 않는다. 내가 다녀오며 겪은 것만 적힌다 */
function zoneCard(zid) {
  const X = S.expedition, Z = ZONES[zid], open = zoneUnlocked(zid), here = X.zone === zid;
  const zl = (S.zoneLog || {})[zid], B = ENEMIES[Z.boss];
  const seen = zl ? Object.keys(zl.seen).filter(e => !ENEMIES[e].boss) : [];
  const exp = !zl ? '<small class="muted">다녀온 적이 없습니다. 무엇이 기다리는지 모릅니다.</small>'
    : `<div class="zone-log">
        <span>다녀옴 <b>${zl.trips}</b>번</span><span><b>${zl.wins}</b>승 <b class="${zl.losses ? 'warn' : ''}">${zl.losses}</b>패</span>
        ${zl.defeats ? `<span class="warn">쓰러짐 ${zl.defeats}</span>` : ''}${zl.retreats ? `<span>마을 치료 ${zl.retreats}</span>` : ''}
      </div>
      <small class="muted">만난 요수: ${seen.length ? seen.map(e => ENEMIES[e].name).join(' · ') : '—'} · 두목: ${zl.bossMet ? `${B.name}${S.flags[B.boss] ? ' <b class="gold">토벌</b>' : zl.bossWon ? '' : ' (아직 못 이김)'}` : '？'}</small>`;
  return `<div class="zone ${open ? '' : 'locked'} ${here ? 'here' : ''}">
    <div class="zone-scene">${zoneArt(zid)}</div>
    <div class="zone-top"><h3>${label(Z.name, Z.hanja)}</h3>${here ? '<span class="pill here-pill">현재 탐험지</span>' : ''}</div>
    <p class="story">${Z.desc}</p>
    <p class="zone-terrain">지형 ${(Z.terrain || []).map(terrainTag).join('')}</p>
    ${open ? exp : '<small class="muted">🔒 앞 구역의 두목을 쓰러뜨리면 길이 열립니다.</small>'}
    <div>${!open || here ? '' : `<button class="btn ${X.zone ? '' : 'primary'} sm" data-dest="${zid}">탐험지로 정하기</button>`}</div>
  </div>`;
}

/* 출정 준비: 떠나기 전에 갖춰 둘 것들 (탐험지·무공·병기·장비·생혈고·상성·단약) */
function prepPanel() {
  const X = S.expedition, st = calcStats(), mu = S.active.mugong, M = mu && MANUALS[mu];
  const worn = SLOT_ORDER.filter(k => S.equip[k]).length;
  const row = (ok, label, value, link) => `<li class="${ok ? 'ok' : 'warn'}"><span class="prep-mark">${ok ? '✔' : '！'}</span><span class="prep-k">${label}</span><span class="prep-v">${value}</span>${link || ''}</li>`;
  const go = (tab, sub, text) => `<button class="btn ghost sm" data-tab="${tab}"${sub ? ` data-sub="${sub}"` : ''}>${text}</button>`;
  const arts = CAT_ORDER.map(c => S.active[c] ? `${CATS[c].name} 《${MANUALS[S.active[c]].name}》 ${S.manuals[S.active[c]].star}성` : `<span class="warn">${CATS[c].name} 비어 있음</span>`).join(' · ');
  const wOk = !M || M.weapon === weaponType();
  return `<ul class="prep">
    ${row(!!X.zone, '탐험지', X.zone ? ZONES[X.zone].name : '정하지 않음')}
    ${row(CAT_ORDER.every(c => S.active[c]), '무공', arts, go('status', 'martial', '무공'))}
    ${row(!!S.equip.weapon && wOk, '병기', S.equip.weapon ? `${gearName(S.equip.weapon)}${wOk ? '' : ` <span class="warn">— 《${M.name}》은 ${WEAPON_TYPES[M.weapon]} 무공이라 초식이 나가지 않음</span>`}` : '맨손', go('status', 'gear', '무장'))}
    ${row(worn >= 5, '장비', `${worn} / ${SLOT_ORDER.length}칸 착용 · 전투력 ${fmt(calculateCombatPower(S))}`, go('bag', null, '행낭'))}
    ${row(has('saenghyeol', 5), '생혈고', `${count('saenghyeol')}개 (활력 35% 아래에서 자동 사용 · 떨어지면 쓰러지기 쉽다 · 전방 개당 5냥) · 소환단 ${count('potionMp')}개`, go('sect', 'shop', '전방'))}
    ${(() => { const e = myElem(), t = myTerrain(), m = X.zone ? terrainMult(X.zone) : 1;
      const tz = X.zone ? ` — ${ZONES[X.zone].name} ${zoneTerrainText(X.zone)} ${m < 1 ? '<b class="good">일치 · 기력 -20%</b>' : m > 1 ? '<span class="warn">불일치 · 기력 +20%</span>' : ''}` : '';
      return row(!!(e && t) && m <= 1, '상성', `기공 ${e ? elemTag(e) : '<span class="warn">오행 없음</span>'} · 경공 ${t ? terrainTag(t) : '<span class="warn">지형 없음</span>'}${tz} · 병기 ${weaponTag(weaponType())}`, go('status', 'martial', '무공')); })()}
    ${row(true, '준비한 단약', S.buffs.length ? S.buffs.map(b => b.name).join(', ') : '없음 (골계단·통맥환·해독산·청심단은 다음 원정 동안 효과)', go('bag', null, '행낭'))}
  </ul>`;
}

function viewField() {
  const X = S.expedition, st = calcStats(), cur = X.zone && ZONES[X.zone];
  const run = activeRun();
  const recs = [...S.expeditions].reverse().filter(r => liveDone(r)).map(r => {
    const sm = recSummary(r), Z = ZONES[r.zone];
    if (r.pend && !r.claimed) return `<details class="exp-rec"><summary><time>${recTime(r)}</time><b>${Z.name}</b><span>보상을 아직 받지 않았습니다</span><button class="watch claim" data-act="claim">최종보상확인</button></summary></details>`;
    return `<details class="exp-rec ${r.defeats ? 'defeat' : ''}">
      <summary><time>${recTime(r)}</time><b>${Z.name}</b><span>${sm.head}</span>${r.defeats ? `<em class="warn">쓰러짐</em>` : r.end === 'recall' ? '<em>귀환</em>' : ''}</summary>
      ${sm.items.length || sm.gear.length ? `<p class="exp-loot">${[...sm.items, ...sm.gear].map(t => `<span>${t}</span>`).join('')}</p>` : ''}
      ${terrainLine(r) ? `<p class="muted tr-line">⛰ ${terrainLine(r)}</p>` : ''}
      <ol class="exp-steps">${r.steps.map(s => { const seen = s.b === undefined || battleSeen(r, s.b); return `<li class="${seen ? s.cls : 'enc'}">${stepText(r, s)}${s.b !== undefined ? ` <button class="watch ${seen ? '' : 'unseen'}" data-watch="${r.id}:${s.b}">관찰</button>` : ''}</li>`; }).join('')}</ol>
    </details>`;
  }).join('');
  return `${livePanel()}<section class="panel">
    ${head('강호행', '江湖行', `<span class="pill">${cur ? `⛰️ ${cur.name}` : '탐험지 미정'}</span>`)}
    <div class="exp-status">
      <div class="exp-next"><small>${run ? `${ZONES[run.zone].name} 강호행 중` : '산문에서 대기 중'}</small><b data-runclock>${runClockText()}</b></div>
      <div class="exp-sta">${run ? '<button class="btn ghost sm" data-act="runstop">귀환하기</button>' : `<button class="btn primary sm" data-act="runstart" ${X.zone ? '' : 'disabled'}>강호행 시작</button>`}<small class="muted">${run ? '쓰러지거나 귀환할 때까지 이어집니다.' : '떠나기 전에 아래 준비를 갖춰 두십시오.'}</small></div>
    </div>
    <h4 class="prep-head">출정 준비</h4>
    ${prepPanel()}
    <p class="story">${cur ? `탐험지마다 10단계가 있습니다. 단계마다 ${STAGE.kills}번 이기면 돌파하고 다음 단계가 열리며, 10단계에는 두목이 기다립니다. [강호행 시작]을 누르면 제자가 고른 단계에서 ${EXPEDITION.stepMs / 1000}초마다 한 걸음씩 싸우고 줍습니다. 활력은 걸음 사이에 차지 않고, 위급하면 생혈고를 바릅니다. 전투에서 지면 쓰러지고 강호행은 끝납니다. 자리를 비워도 최대 ${EXPEDITION.catchUp / 3600000}시간까지 이어지고, 얻은 것은 끝난 뒤 [최종보상확인]으로 받습니다.` : '아래에서 탐험지를 고른 뒤 [강호행 시작]을 누르십시오.'}</p>
  </section>
  <section class="panel">${head('탐험지', '行先')}<p class="muted">어느 곳이 얼마나 위험한지는 알려 주지 않습니다. 다녀오며 몸으로 익히십시오.</p><div class="zones">${ZONE_ORDER.map(zoneCard).join('')}</div></section>
  <section class="panel">${head('탐험 기록', '見聞', `<span class="num muted">최근 ${S.expeditions.length} / ${EXPEDITION.keep}번</span>`)}
    ${recs || '<p class="story muted">아직 다녀온 탐험이 없습니다.</p>'}
  </section>`;
}

/* ───────── 결산 창: 자리를 비운 동안의 탐험을 한꺼번에 ───────── */
function settleModal(ids) {
  const recs = ids.map(findExpedition).filter(Boolean);
  if (!recs.length) return '';
  const tot = recs.reduce((a, r) => ({ w: a.w + r.wins, l: a.l + r.losses, s: a.s + r.gain.silver, e: a.e + r.gain.exp }), { w: 0, l: 0, s: 0, e: 0 });
  return `<div class="sheet settle-sheet">
    <p class="eyebrow">見聞錄 · 탐험 결산</p>
    <h2>${recs.length > 1 ? `탐험 ${recs.length}번의 결산` : '탐험에서 돌아왔습니다'}</h2>
    <div class="settle-total"><span>${tot.w}승 ${tot.l}패</span><span>${hlSilver(tot.s)}</span><span>수련치 +${fmt(tot.e)}</span></div>
    <ol class="settle-list">${recs.map(r => { const sm = recSummary(r); return `<li class="${r.defeats ? 'defeat' : ''}">
      <div><time>${recTime(r)}</time> <b>${ZONES[r.zone].name}</b> <span>${sm.head}</span>${r.defeats ? ` <em class="warn">쓰러짐 ${r.defeats}</em>` : ''}</div>
      ${sm.items.length || sm.gear.length ? `<small>${[...sm.items, ...sm.gear].join(' · ')}</small>` : ''}
      ${terrainLine(r) ? `<small class="muted tr-line">⛰ ${terrainLine(r)}</small>` : ''}
      <div class="settle-watch">${r.battles.map((b, i) => `<button class="watch ${b.win ? '' : 'lost'} ${b.boss ? 'boss' : ''}" data-watch="${r.id}:${i}" title="${b.name} — ${b.win ? '승리' : '패배'}">${b.boss ? '👹' : ''}${sealChar(b.name)}</button>`).join('')}</div>
    </li>`; }).join('')}</ol>
    <p class="muted">전투마다 견문록의 [관찰하기]로 상세 전투 과정을 복기할 수 있습니다.</p>
    <div class="btns"><button class="btn primary" data-act="closemodal">확인</button><button class="btn ghost" data-act="gochron" data-rec="${recs[recs.length - 1].id}">견문록 보기</button></div>
  </div>`;
}

/* ───────── 관찰하기: 기록해 둔 전투를 합 단위로 다시 튼다 ───────── */
const RP = { key: null, i: -1, timer: null, speed: 1, playing: true };
/* 관찰하기 한 합의 간격: 1× 3초 · 2× 1.5초 · 4× 0.75초 */
const RP_MS = 3000;
function replayData(key) {
  if (key === 'sim') return ui.sim && ui.sim.b ? { rec: null, b: ui.sim.b } : null;   // 심상수련장
  const [rid, bi] = key.split(':').map(Number), rec = findExpedition(rid);
  return rec && rec.battles[bi] ? { rec, b: rec.battles[bi] } : null;
}
function openReplay(key) {
  if (!replayData(key)) { toast('오래된 탐험이라 기록이 지워졌습니다. (최근 8번만 남습니다)'); return; }
  replayStop();
  if (key !== 'sim') { const d = replayData(key); markSeen(d.rec, d.rec.battles.indexOf(d.b)); }   // 결과보기: 이제 결과가 적힌다
  Object.assign(RP, { key, i: -1, speed: RP.speed || 1, playing: true });
  const show = () => { if (RP.key !== key) return; ui.modal = 'replay:' + key; renderModal(); if ($('#spStage')) spBreathLoop(); };
  // 무대 그림(배경 · 제자 · 요수)을 먼저 풀어 두고 연다: 창이 뜬 뒤 그림이 하나씩 튀어나오지 않게 (늦어도 0.7초 안에 연다)
  const d = replayData(key), zid = d.rec ? d.rec.zone : zoneOfEnemy(d.b.eid);
  const urls = spriteOn(zid, d.b.eid) ? spriteUrls(zid, d.b.eid) : [];
  if (imgsReady(urls)) show(); else Promise.race([preloadImgs(urls), new Promise(r => setTimeout(r, 700))]).then(show);
}
function replayStop() { clearTimeout(RP.timer); RP.timer = null; }
/* 관찰 창 기록 한 줄: 누가 한 행동인지(제자 얼굴 · 요수 그림)와 결과(적중·빗나감·회피·치명·피해·상성·연격·중독·출혈)를 수묵 아이콘으로 */
const HERO_FACE = 'assets/portraits/hero.png';
const rpIco = src => `<i class="chron-ico rp-ico" style="background-image:url('${src}')"></i>`;
const rpUi = id => rpIco(`assets/art/ui/${id}.png`);
function rpLine(l, b, fresh) {
  const c = l.cls || '', t = l.text || '';
  let lead = '', text = t;
  if (/^⚔️\s*/.test(text)) { text = text.replace(/^⚔️\s*/, ''); lead = rpIco(HERO_FACE); }
  else if (/log-stance-title/.test(c)) lead = rpIco(HERO_FACE) + rpUi(/counter/.test(c) ? 'b_counter' : 'b_stance');
  else if (/\bfoe\b/.test(c)) lead = rpIco(ART_SRC.beast(b.eid)) + (/연격/.test(t) ? rpUi('b_combo') : '');
  else if (/aff-up/.test(c)) lead = rpUi('b_aff');
  else if (/\bdodge\b/.test(c)) lead = rpUi('b_dodge');
  else if (/\bmiss\b/.test(c)) lead = rpUi('b_miss');
  else if (/\bcrit\b/.test(c)) lead = rpUi('c_crit');
  else if (/\btaken\b/.test(c)) lead = rpUi('b_hurt');
  else if (/log-stance-result/.test(c)) lead = rpUi('b_hit');
  else if (/중독|독기/.test(t) && !/^\p{Extended_Pictographic}/u.test(t)) lead = rpUi('b_poison');
  else if (/출혈|열상/.test(t) && !/^\p{Extended_Pictographic}/u.test(t)) lead = rpUi('c_bleed');
  return `<p class="log-line ${c}${fresh ? ' fresh' : ''}">${lead}${chronDecor(text)}</p>`;
}
/* 합마다 칸을 나눠 쌓는다 */
const rpTurn = (label, html, cls = '') => `<section class="rp-turn ${cls}"><div class="turn-sep"><span>${label}</span></div>${html}</section>`;
/* 처음부터 다시: 쌓인 기록을 지우고 첫 합 앞으로 되돌린다 */
function replayRestart() {
  const d = replayData(RP.key), box = $('#rpBox'); if (!d || !box) return;
  replayStop();
  const { b } = d, s = b.start;
  RP.i = -1; RP.playing = true;
  box.classList.remove('won', 'lost'); spriteReset();
  $('#rpMe').innerHTML = vbar('hp', s.me.hp, s.me.hp, s.me.maxHp, '활력') + bar('mp', s.me.mp, s.me.maxMp, '내력');
  $('#rpFoe').innerHTML = vbar('hp foe', s.foe.hp, s.foe.hp, s.foe.maxHp, '기세', true);
  $('#rpLog').innerHTML = rpTurn('開戰 · 전투 시작', b.intro.map(l => rpLine(l, b)).join(''), 'intro');
  $('#rpRound').textContent = '준비'; $('#rpProg').textContent = `0 / ${b.rounds.length}합`; $('#rpToggle').textContent = '⏸ 멈춤';
  RP.timer = setTimeout(replayStep, 600);
}
function replayModal(key) {
  const d = replayData(key); if (!d) return '';
  const { rec, b } = d, s = b.start, zid = rec ? rec.zone : zoneOfEnemy(b.eid);
  return `<div class="sheet replay-sheet combat-modal-container" id="rpBox" data-key="${key}">
    <p class="eyebrow">${rec ? `觀察 · ${ZONES[rec.zone].name} 탐험 ${recTime(rec)}` : '心象 · 심상수련장 · 보상 없음'}</p>
    <div class="arena ${b.boss ? 'boss-in' : ''}">
      ${zid ? `<div class="arena-bg">${zoneArt(zid)}</div>` : ''}
      <div class="plaque me" id="pl-me"><div class="seal-av hero"><img class="hero-av" src="${HERO_FACE}" alt="" onerror="this.replaceWith(document.createTextNode('${esc(S.name[0] || '我')}'))"></div><div class="pl-info"><h3>${esc(S.name)}</h3><div id="rpMe">${vbar('hp', s.me.hp, s.me.hp, s.me.maxHp, '활력')}${bar('mp', s.me.mp, s.me.maxMp, '내력')}</div></div></div>
      <div class="vs"><span>對</span><small id="rpRound">준비</small></div>
      <div class="plaque foe ${b.boss ? 'boss' : ''}" id="pl-foe"><div class="seal-av foe">${ENEMIES[b.eid] ? beastArt(b.eid) : sealChar(b.name)}</div><div class="pl-info"><h3>${b.name}</h3><small>${b.boss ? '두목(頭目)' : '요수(妖獸)'} ${ENEMIES[b.eid] ? elemTag(ENEMIES[b.eid].elem) + weaponTag(ENEMIES[b.eid].wtype) : ''}</small><div id="rpFoe">${vbar('hp foe', s.foe.hp, s.foe.hp, s.foe.maxHp, '기세', true)}</div></div></div>
      <div class="move-banner" id="moveBanner" aria-hidden="true"></div>
    </div>
    ${spriteOn(zid, b.eid) ? spriteStage(zid, b.eid) : ''}
    <div class="blog combat-log-stream" id="rpLog">${rpTurn('開戰 · 전투 시작', b.intro.map(l => rpLine(l, b)).join(''), 'intro')}</div>
    <div class="rp-ctl">
      <button class="btn sm" data-rp="restart" title="기록을 지우고 첫 합부터">↺ 처음부터</button>
      <button class="btn sm" data-rp="toggle" id="rpToggle">${RP.playing ? '⏸ 멈춤' : '▶ 재생'}</button>
      <button class="btn ghost sm" data-rp="step" title="멈추고 한 합만 넘기기">한 합 ▶</button>
      ${[1, 2, 4].map(x => `<button class="chip ${RP.speed === x ? 'on' : ''}" data-rp="speed" data-x="${x}">${x}×</button>`).join('')}
      <button class="btn ghost sm" data-rp="end">끝까지 ⏭</button>
      <span class="rp-prog" id="rpProg">0 / ${b.rounds.length}합</span>
      <button class="btn ghost sm" data-act="closemodal">닫기</button>
    </div>
  </div>`;
}
/* 한 합 진행: 양쪽 활력 막대(잔상 포함)·대사·연출 */
function replayStep() {
  const box = $('#rpBox'); const d = box && box.dataset.key === RP.key && replayData(RP.key);
  if (!d) return replayStop();
  const { b } = d; if (RP.i >= b.rounds.length - 1) return replayStop();
  const prev = RP.i < 0 ? { me: { hp: b.start.me.hp, mp: b.start.me.mp }, foe: b.start.foe.hp } : b.rounds[RP.i];
  RP.i++;
  const r = b.rounds[RP.i], s = b.start;
  // 막대 갱신: 스프라이트 무대가 있으면 첫 타격이 닿는 순간에, 없으면 곧바로
  const bars = () => { $('#rpMe').innerHTML = vbar('hp', r.me.hp, prev.me.hp, s.me.maxHp, '활력') + bar('mp', r.me.mp, s.me.maxMp, '내력');
    $('#rpFoe').innerHTML = vbar('hp foe', r.foe, prev.foe, s.foe.maxHp, '기세', true); };
  const sprite = !!$('#spStage') && !reduceMotion() && !RP.skip;
  if (!sprite) bars();
  const logEl = $('#rpLog');
  for (const t of logEl.querySelectorAll('.rp-turn.now')) t.classList.remove('now');
  logEl.insertAdjacentHTML('beforeend', rpTurn(`第${RP.i + 1}合 · 제${RP.i + 1}합`, r.lines.map(l => rpLine(l, b, true)).join(''), 'now'));
  logEl.scrollTop = logEl.scrollHeight;
  const last = RP.i >= b.rounds.length - 1;
  $('#rpRound').textContent = last ? (b.win ? '勝' : b.fled ? '和' : '敗') : `${RP.i + 1}합`;
  $('#rpProg').textContent = `${RP.i + 1} / ${b.rounds.length}합`;
  if (sprite) spritePlayRound(r, last, b.win, RP_MS / RP.speed, bars);   // 번쩍임·숫자·초식 이름은 칼·이빨이 닿는 순간에
  else { playFx(r.fx || []); if ($('#spStage') && last) spritePlayRound({ fx: [] }, last, b.win, RP_MS / RP.speed); }
  if (last) { box.classList.add(b.win ? 'won' : 'lost'); RP.playing = false; $('#rpToggle').textContent = '▶ 재생'; replayStop(); return; }
  if (RP.playing) RP.timer = setTimeout(replayStep, RP_MS / RP.speed);
}
function replayControl(what, x) {
  const d = replayData(RP.key); if (!d) return;
  if (what === 'speed') { RP.speed = +x; for (const c of document.querySelectorAll('[data-rp="speed"]')) c.classList.toggle('on', +c.dataset.x === RP.speed); return; }
  if (what === 'end') { replayStop(); RP.playing = false; RP.skip = true; while (RP.i < d.b.rounds.length - 1) replayStep(); RP.skip = false; return; }
  if (what === 'restart') return replayRestart();
  if (what === 'step') { replayStop(); RP.playing = false; $('#rpToggle').textContent = '▶ 재생'; if (RP.i < d.b.rounds.length - 1) replayStep(); return; }
  if (what === 'toggle') {
    if (RP.i >= d.b.rounds.length - 1) return replayRestart();              // 끝났으면 기록을 지우고 처음부터
    RP.playing = !RP.playing; $('#rpToggle').textContent = RP.playing ? '⏸ 멈춤' : '▶ 재생';
    if (RP.playing) replayStep(); else replayStop();
  }
}
