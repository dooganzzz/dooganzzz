/* [화면] 강호행 무대: 산길을 걷는 제자, 길가 소품, 조우한 실제 전투를 기록 그대로 재생 (ui_field.js의 강호행 화면이 부른다) */
/* 달리기: 병기별 달리기 시트 16칸이 한 주기. g는 한 주기에 디딘 발이 뒤로 밀리는 거리(키의 배수, 달리는 영상에서 잼).
   산길은 모든 병기가 같은 빠르기(RUN_SPEED 키/초)로 흐르고, 주기는 g / 빠르기로 맞춰 발이 미끄러지지 않는다.
   일류 이상 경공을 장착하면 1.3배 빠르게 달리며 잔상 두 겹과 바람 줄기가 남는다.
   강호행이 끝나면 멈춰 서서 숨을 고르며 초식을 연습한다 (대기 시트). 전투 걸음이 일어나면 그 전투 기록을 무대에서 그대로 재생한다 (견문록에는 결과와 [관찰]) */
const RUN_G = { sword: .759, blade: 1.047, spear: 2.172, fist: 2.006, hidden: .909 }, RUN_SPEED = 1.25, RUN_FAST = { k: 1.3, grades: ['일류', '절정'] };
function runFast() { const id = S.active.gyeonggong, g = id && MANUALS[id] && MANUALS[id].grade; return RUN_FAST.grades.includes(g); }
function walkMeta(w) { const g = RUN_G[w] || RUN_G.sword, k = runFast() ? RUN_FAST.k : 1; return { n: 16, g, ms: g / RUN_SPEED * 1000 / k }; }
/* 구도: 관찰 창 무대와 같다 — 제자는 왼쪽 10%, 요수는 오른쪽 10%, 베러 들어갈 때 38%.
   크기는 관찰 창(2.36:1)과 무대 높이 대비 같게 1.18배 (제자 폭 31.8%, 요수 21.2% × 크기).
   달릴 때 · 쉴 때도 제자는 같은 자리 */
const LIVE_POS = { hero: 10, lunge: 38, foeR: 10, foeW: 21.2, k: .72 }, LIVE_FAR = .35;
let liveAnim = { f: 0, last: 0, acc: 0, x: 0, raf: 0, breath: 0, walkMs: 0, nextShow: 0, show: null, queued: null };
/* 연출 전투 예약: real = 방금 드러난 실제 전투 (그 요수로, 끝은 안개 속으로 — 승패는 견문록에서) */
/* 산길 시간대: 지금 시각으로 새벽 · 낮 · 해 질 녘 · 밤 */
function liveTod(t = now()) { const h = new Date(t).getHours(); return h >= 5 && h < 7 ? 'dawn' : h >= 7 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'dusk' : 'night'; }
/* 맞붙는 모습 예약: ref = 강호행에서 방금 치른 전투 { rid, bi } — 그 기록(합 · 피해 · 회피 · 생혈고 · 초식 · 승패)을 무대에서 그대로 재생한다 */
function liveShowQueue(eid, real, boss, ref) {
  if (!eid || !ENEMIES[eid] || (liveAnim.show && liveAnim.show.real)) return;
  liveAnim.queued = { eid, real: !!real, boss: !!boss, ref };
  preloadImgs([SPRITE_SRC.foe(eid), SPRITE_SRC.foe(eid, 1)]);
  if (ref && ref.si !== undefined) {                  // 무대에서 맞붙는 동안 그 걸음(결과)은 견문록에 아직 안 띄운다
    const bt = (S.expeditions.find(x => x.id === ref.rid) || { battles: [] }).battles[ref.bi];
    liveAnim.hold = { rid: ref.rid, i: ref.si, until: now() + 40000, hp: bt && bt.start ? bt.start.me.hp : null };
    const box = document.getElementById('liveSide'); if (box) setHTML(box, liveSide());
    const sc = document.getElementById('liveScene'); if (sc) sc.classList.remove('rest');
  }
}
/* 화면에 띄울 걸음 수: 맞붙는 중인 전투 걸음부터는 숨긴다 (맞붙기가 끝나면 liveShowEnd가 풀고 다시 그린다) */
function liveShown(r) { const h = liveAnim.hold; return r && h && h.rid === r.id && now() < h.until ? Math.min(h.i, r.steps.length) : r ? r.steps.length : 0; }
function liveHeld(r) { return !!r && liveShown(r) < r.steps.length; }
function liveRelease() {
  if (!liveAnim.hold) return; liveAnim.hold = null;
  const box = document.getElementById('liveSide'); if (box) setHTML(box, liveSide());
  const sc = document.getElementById('liveScene'), lr = liveRec(); if (sc) sc.classList.toggle('rest', liveDone(lr));
  if (typeof renderTabs === 'function') renderTabs();
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
    if (!ranged) { q.push({ at: t0, k: 'hx', x: LIVE_POS.lunge }); heroF(t0, 1); heroF(t0 + T(110), 2); heroF(t0 + T(220), 1); }
    const s = ranged ? t0 : t0 + T(330);
    heroF(s, 4); heroF(s + T(120), 5); q.push({ ...ev, at: s + T(150) }); heroF(s + T(300), 6);
    if (!ranged) q.push({ at: s + T(520), k: 'hx', x: LIVE_POS.hero });
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
  foe.style.width = (LIVE_POS.foeW * size).toFixed(1) + '%'; foe.style.left = '104%';
  sh.foeX = 100 - LIVE_POS.foeR - LIVE_POS.foeW * size;   // 맞붙는 자리 (왼쪽 끝 %)
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
    if (left > sh.foeX) return false;
    foe.style.left = sh.foeX + '%'; sh.phase = 'fight'; sh.t0 = ts; sh.q = liveShowPlan(sh, hero.dataset.w || weaponType());
    sc.classList.remove('approach'); sc.classList.add('fight');
    hero.style.left = LIVE_POS.hero + '%'; hero.dataset.f = 0;
    livePlaceHp(sc, hero, foe, sh.eid);              // 제자 · 요수가 보인 뒤에 머리 위 자리를 잰다
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
    else if (e.k === 'fx') foe.style.left = (sh.foeX + e.x * LIVE_POS.k) + '%';
    else if (e.k === 'fa') foe.classList.toggle('striking', e.f >= 0), e.f >= 0 && (foe.querySelector('.sp-fatk').style.backgroundPositionX = e.f * 50 + '%');
    else if (e.k === 'skill') liveSkill(sc, e.sk);
    else if (e.k === 'hitR') {                        // 제자의 공격: 기록된 피해 · 치명타 · 빗나감
      const f = e.f;
      if (f.k === 'miss') liveNum(sc, '빗나감', sh.foeX + 9, 'miss');
      else { spFlash(foe); liveNum(sc, f.t.replace('-', ''), sh.foeX + 9, f.k === 'crit' ? 'crit' : ''); liveVfx(sc, f.k === 'crit' || f.big ? 'crit' : 'hit', sh.foeX + 7, f.k === 'crit' || f.big ? 'crit' : ''); liveHp(sc, 'foe', e.hp); }
    }
    else if (e.k === 'hurtR') {                       // 요수의 공격: 기록된 피해 · 회피
      const f = e.f;
      if (sh.heavy) liveShake(sc);                    // 덩치 큰 요수 · 두목의 반격은 땅이 울린다
      if (f.k === 'dodge') { hero.dataset.f = 8; liveNum(sc, '회피', 22, 'miss'); }
      else { hero.dataset.f = 7; spFlash(hero); liveVfx(sc, 'hit', 22, 'small'); liveNum(sc, f.t.replace('-', ''), 22, 'me'); liveHp(sc, 'me', e.hp); }
    }
    else if (e.k === 'heal') { liveNum(sc, `🩸${e.f.t}`, 22, 'heal'); liveHp(sc, 'me', e.hp); }
    else if (e.k === 'sync') { liveHp(sc, 'me', e.me); liveHp(sc, 'foe', e.foe); }
    else if (e.k === 'down') { hero.classList.add('ko'); liveNum(sc, '쓰러짐', 22, 'me'); }
    else if (e.k === 'ko') foe.classList.add('ko');
    else if (e.k === 'mist') foe.classList.add('mist');
    else if (e.k === 'end') return true;
  }
  return false;
}
/* 무대 위 활력 막대 (맞붙는 동안만): who = me · foe */
/* 체력바를 인물 머리 위에 (그림 칸 안 머리 높이는 FOE_TOP · 제자 0.03) */
function livePlaceHp(sc, hero, foe, eid) {
  const R = sc.getBoundingClientRect(); if (!R.width) return;
  for (const [el, who, top] of [[hero, 'me', .03], [foe, 'foe', FOE_TOP[eid] ?? .1]]) {
    const b = sc.querySelector(`.live-hp.${who}`), r = el && el.getBoundingClientRect(); if (!b || !r || !r.width) continue;
    const cx = (r.left + r.width * (who === 'me' ? .43 : .5) - R.left) / R.width * 100, y = (r.top + r.height * top - R.top) / R.height * 100;
    b.style.left = clamp(cx - 11, 1, 77) + '%'; b.style.top = 'auto'; b.style.bottom = clamp(100 - y + .5, 0, 88) + '%';
  }
}
function liveHp(sc, who, hp, max, name) {
  const el = sc.querySelector(`.live-hp.${who}`); if (!el) return;
  if (max) { el.dataset.max = max; if (name !== undefined) el.querySelector('b').textContent = name; }
  const m = +el.dataset.max || 1; el.querySelector('i').style.width = clamp(hp / m * 100, 0, 100).toFixed(1) + '%';
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
  const im = document.createElement('img'); im.className = 'live-prop'; im.src = ASSET.prop(k); im.alt = '';
  im.style.height = (h * LIVE_PROPS[k]).toFixed(0) + 'px'; im.dataset.x0 = W + 10; im.dataset.at = liveAnim.x;
  im.style.transform = `translate3d(${W + 10}px,0,0)`; sc.appendChild(im);
}
function liveLoop(ts) {
  liveAnim.raf = requestAnimationFrame(liveLoop);
  const sc = document.getElementById('liveScene'); if (!sc) { cancelAnimationFrame(liveAnim.raf); liveAnim.raf = 0; liveAnim.show = null; return; }
  const dt = liveAnim.last ? Math.min(100, ts - liveAnim.last) : 16; liveAnim.last = ts;
  const walker = sc.querySelector('.live-walker'), hero = document.getElementById('liveHero'), strips = sc.querySelectorAll('.live-strip');
  const rest = sc.classList.contains('rest'), still = reduceMotion();
  if (liveAnim.show) { sc.classList.toggle('fight', liveAnim.show.phase === 'fight'); sc.classList.toggle('approach', liveAnim.show.phase === 'approach'); }   // 다시 그려져도 연출 상태를 잇는다
  if (liveAnim.show && liveAnim.show.phase === 'fight') { if (liveShowStep(sc, liveAnim.show, ts, dt)) liveShowEnd(sc); return; }   // 맞붙는 동안 산길은 멈춘다
  if (rest || still) {                                // 쉬는 중: 숨을 고르다가 몇 초마다 제자리에서 초식을 연습한다 (다음 출발까지 남은 시간은 무대 위에)
    if (liveAnim.show) liveShowEnd(sc);
    if (still && liveAnim.hold) { liveAnim.queued = null; liveRelease(); }   // 움직임 줄이기: 맞붙는 모습 없이 결과를 바로
    if (rest && !still && hero) {
      liveAnim.kataMs = (liveAnim.kataMs || 0) + dt;
      const k = liveAnim.kataMs - 5200;               // 5.2초 숨 고르기 → 초식 한 번 (준비 · 베기 · 마무리 · 거두기)
      if (k >= 0) {
        const f = k < 260 ? 4 : k < 420 ? 5 : k < 700 ? 6 : 0;
        if (+hero.dataset.f !== f) { hero.dataset.f = f; if (f === 5) liveVfx(sc, 'hit', 36, 'small kata'); }
        if (k > 1200) liveAnim.kataMs = Math.random() * 1500;
        return;
      }
    }
    liveAnim.acc += dt; if (liveAnim.acc > 260) { liveAnim.acc = 0; if (hero) hero.dataset.f = BREATH[liveAnim.breath++ % BREATH.length]; }
    return;
  }
  // 걷기: 시트 칸을 걸음 주기에 고르게 나눠 넘긴다
  const W = walkMeta(walker && walker.dataset.w), N = W.n;
  // 멀미 줄이기: 출발은 천천히 붙고, 요수 앞에서는 미리 늦춘다 (걸음 칸과 산길이 같은 v로 움직여 발은 미끄러지지 않는다)
  const sh0 = liveAnim.show, near = sh0 && sh0.phase === 'approach' && parseFloat((sc.querySelector('.live-foe') || {}).style?.left) < ((sh0 && sh0.foeX) || 70) + 14;
  liveAnim.v = (liveAnim.v || 0) + ((near ? .35 : 1) - (liveAnim.v || 0)) * Math.min(1, dt / 450);
  const vdt = dt * liveAnim.v;
  liveAnim.acc = (liveAnim.acc + vdt) % W.ms;
  const fr = Math.floor(liveAnim.acc / (W.ms / N)) % N;
  if (fr !== liveAnim.f && walker) {
    liveAnim.f = fr; walker.querySelector('.walk-spr').style.backgroundPositionX = (fr * 100 / (N - 1)) + '%';
    const gh = walker.querySelectorAll('.walk-ghost');                // 경공 잔상: 조금 전 칸을 뒤에 흐리게
    if (gh.length) { (liveAnim.hist = liveAnim.hist || []).unshift(fr); liveAnim.hist.length = 9; gh.forEach((g, i) => { g.style.backgroundPositionX = ((liveAnim.hist[(i + 1) * 4] ?? fr) * 100 / (N - 1)) + '%'; }); }
  }
  if (walker && walker.dataset.fast && (liveAnim.windMs = (liveAnim.windMs || 0) + dt) > 160) {   // 바람 줄기
    liveAnim.windMs = 0; const l = document.createElement('i'); l.className = 'live-wind';
    l.style.left = (30 + Math.random() * 40) + '%'; l.style.top = (30 + Math.random() * 45) + '%'; l.style.width = (8 + Math.random() * 10) + '%';
    sc.appendChild(l); setTimeout(() => l.remove(), 550);
  }
  // 산길 두 겹(원근): 발밑 땅은 한 주기에 키의 g배만큼(발이 미끄러지지 않게), 먼 산 · 숲은 LIVE_FAR배로 느리게 흐른다
  if (strips.length && walker) {
    const img = strips[0].firstElementChild, h = walker.offsetHeight || 120, wImg = img && img.offsetWidth;
    liveAnim.x += vdt * (h * W.g) / W.ms;
    if (wImg) for (const s of strips) s.style.transform = `translate3d(${-((liveAnim.x * (s.dataset.far ? LIVE_FAR : 1)) % wImg).toFixed(2)}px,0,0)`;
  }
  liveProps(sc, walker, vdt);
  // 맞붙는 모습: 전투 걸음이 드러나면 그 요수로
  if (liveAnim.show) { liveShowStep(sc, liveAnim.show, ts, dt); return; }
  const q = liveAnim.queued;
  if (q && imgsReady([SPRITE_SRC.foe(q.eid), SPRITE_SRC.foe(q.eid, 1)])) { liveAnim.queued = null; liveAnim.show = liveShowStart(sc, { ...q }); }
}
function liveScene(r) {
  const zid = (r && r.zone) || S.expedition.zone || 'cheongpung', w = weaponType(), N = walkMeta(w).n, fast = runFast();
  const spr = cls => `<div class="${cls}" data-anim style="background-image:url('${ASSET.run(w)}');background-size:${N * 100}% 100%"></div>`;
  const img = () => `<img src="${ASSET.travel(zid)}" alt="">`;   // 끝과 처음이 이어지게 다듬은 그림 (이음매 없이 되풀이)
  if (!liveAnim.raf) liveAnim.raf = requestAnimationFrame(liveLoop);
  return `<div class="live-scene ${liveDone(r) && !liveHeld(r) ? 'rest' : ''}" id="liveScene" data-zone="${zid}" data-tod="${liveTod()}">
    <div class="live-world far"><div class="live-strip" data-far="1" data-anim>${img()}${img()}</div></div>
    <div class="live-world near"><div class="live-strip" data-anim>${img()}${img()}</div></div>
    <i class="live-mist"></i>
    <div class="sp-fighter live-walker ${fast ? 'fast' : ''}" id="liveWalker_${w}${fast ? '_f' : ''}" data-w="${w}" ${fast ? 'data-fast="1"' : ''}>${fast ? spr('walk-spr walk-ghost g1') + spr('walk-spr walk-ghost g2') : ''}<i class="sp-shadow"></i>${spr('walk-spr')}</div>
    <div class="sp-fighter sp-hero live-hero" id="liveHero" data-f="0" data-w="${w}" data-anim><i class="sp-shadow"></i><div class="sp-spr" style="background-image:url('${SPRITE_SRC.hero(w)}')"></div></div>
    <div class="sp-fighter sp-foe flip fsheet live-foe" id="liveFoe" data-anim><i class="sp-shadow"></i><div class="sp-fspr" data-anim></div><div class="sp-fatk" data-anim></div></div>
    <div class="live-hp me" data-anim><b>${esc(S.name)}</b><i></i></div><div class="live-hp foe" data-anim><b></b><i></i></div>
    <i class="live-tint"></i>
    <img class="live-enc" src="${ASSET.ui('b_encounter')}" alt="">
    <div class="live-boss"><small>頭目 出現</small><b></b></div>
    <span class="live-where">${stageName(zid, r && r.live ? r.stage : S.expedition.stage || 1)}</span>
    <span class="live-rest">${r && r.end === 'dead' && !r.claimed ? '쓰러져 돌아왔습니다' : '산문에서 대기 중'}</span>
  </div>`;
}
