/* [화면] 강호행 무대: 산길을 걷는 제자 · 길가 소품 · 발자국 · 기믹 걸음 · 무대 루프 (ui_field.js의 강호행 화면이 부른다)
   하늘(하루의 빛 · 날씨)은 ui_live_sky.js, 조우한 실제 전투를 기록 그대로 재생하는 것은 ui_live_fight.js */
/* 달리기: 병기별 달리기 시트 16칸이 한 주기. g는 한 주기에 디딘 발이 뒤로 밀리는 거리(키의 배수, 달리는 영상에서 잼).
   산길은 모든 병기가 같은 빠르기(RUN_SPEED 키/초)로 흐르고, 주기는 g / 빠르기로 맞춰 발이 미끄러지지 않는다.
   일류 이상 경공을 장착하면 1.3배 빠르게 달리며 잔상 두 겹과 바람 줄기가 남는다.
   강호행이 끝나면 멈춰 서서 숨을 고르며 초식을 연습한다 (대기 시트). 전투 걸음이 일어나면 그 전투 기록을 무대에서 그대로 재생한다 (견문록에는 결과와 [관찰]) */
const RUN_G = { sword: .759, blade: 1.047, spear: 2.172, fist: 2.006, hidden: .909 }, RUN_SPEED = 1.25, RUN_FAST = { k: 1.3, grades: ['일류', '절정'] };
function runFast() { const id = S.active.gyeonggong, g = id && MANUALS[id] && MANUALS[id].grade; return RUN_FAST.grades.includes(g); }
/* 걷기 시트(기력이 다했을 때): 주기와 g는 걷는 영상에서 잰 값 */
const WALK_META = { sword: { ms: 1375, g: .64 }, blade: { ms: 1500, g: .631 }, spear: { ms: 1417, g: .592 }, fist: { ms: 1333, g: .587 }, hidden: { ms: 1167, g: .764 } };
const liveMode = () => { const r = typeof activeRun === 'function' && activeRun(); return r && r.mode === 'walk' ? 'walk' : 'run'; };
function walkMeta(w, mode = 'run') {
  if (mode === 'walk') return { n: 16, ...(WALK_META[w] || WALK_META.sword) };
  const g = RUN_G[w] || RUN_G.sword, k = runFast() ? RUN_FAST.k : 1; return { n: 16, g, ms: g / RUN_SPEED * 1000 / k };
}
/* 구도: 관찰 창 무대와 같다 — 제자는 왼쪽 10%, 요수는 오른쪽 10%, 베러 들어갈 때 38%.
   크기는 관찰 창(2.36:1)과 무대 높이 대비 같게 1.18배 (제자 폭 31.8%, 요수 21.2% × 크기).
   달릴 때 · 쉴 때도 제자는 같은 자리 */
const LIVE_POS = { hero: 10, lunge: 38, foeR: 10, foeW: 21.2, k: .72 }, LIVE_FAR = .35;
let liveAnim = { f: 0, last: 0, acc: 0, x: 0, raf: 0, breath: 0, walkMs: 0, nextShow: 0, show: null, queued: null };
/* 길가 소품: 걷는 동안 가끔 길가 구조물이 땅과 같은 빠르기로 지나간다 (h = 제자 키 대비 높이, 발밑 그림자 여백 PROP_PAD 제외).
   그림마다 발치를 땅으로 스미게 지우고 그림자를 함께 그려 두었다(tools/props_ground.py). 멀리 놓인 것은 조금 작고 높게 · 옅게 */
const LIVE_PROPS = { stele: .5, cairn: .42, signpost: .56, shrine: .5, tavern: 1.05, jangseung: .95, stone_lantern: .62, well: .55, haystack: .45, cart: .5, haetae: .45, pagoda: .9, gate: 1.2, jars: .42, sword_rock: .5 };
const LIVE_PROP_ZONE = {
  cheongpung: ['stele', 'cairn', 'signpost', 'shrine', 'tavern', 'jangseung', 'stone_lantern', 'well', 'haystack', 'haetae', 'pagoda', 'gate', 'sword_rock'],
  suryong: ['stele', 'cairn', 'signpost', 'tavern', 'well', 'haystack', 'cart', 'jars', 'jangseung', 'stone_lantern'],
  yeomhwa: ['stele', 'signpost', 'cairn', 'cart', 'jars', 'sword_rock', 'haetae', 'pagoda', 'gate'],
}, PROP_PAD = .05;
function liveProps(sc, walker, dt) {
  const W = sc.offsetWidth || 1, h = walker ? walker.offsetHeight : 120;
  for (const p of sc.querySelectorAll('.live-prop')) {
    const x = +p.dataset.x0 - (liveAnim.x - +p.dataset.at);
    if (x < -p.offsetWidth - 10) p.remove(); else p.style.transform = `translate3d(${x.toFixed(1)}px,${(PROP_PAD / (1 + PROP_PAD) * 100).toFixed(2)}%,0)`;
  }
  liveAnim.propMs = (liveAnim.propMs || 0) + dt;
  if (!liveAnim.nextProp) liveAnim.nextProp = 4000 + Math.random() * 6000;
  if (liveAnim.propMs < liveAnim.nextProp) return;
  liveAnim.propMs = 0; liveAnim.nextProp = 9000 + Math.random() * 12000;
  const pool = (LIVE_PROP_ZONE[sc.dataset.zone] || LIVE_PROP_ZONE.cheongpung).filter(n => n !== liveAnim.lastProp), k = pool[Math.floor(Math.random() * pool.length)], far = Math.random();   // 같은 것이 잇달아 나오지 않게
  const im = document.createElement('img'); im.className = 'live-prop'; im.dataset.live = 1; im.src = ASSET.prop(k); im.alt = '';
  liveAnim.lastProp = k; im.style.height = (h * LIVE_PROPS[k] * (1 + PROP_PAD) * (1 - far * .12)).toFixed(0) + 'px'; im.dataset.x0 = W + 10; im.dataset.at = liveAnim.x;
  im.style.bottom = (11 + far * 2.5).toFixed(2) + '%'; im.style.opacity = (1 - far * .18).toFixed(2);
  im.style.transform = `translate3d(${W + 10}px,${(PROP_PAD / (1 + PROP_PAD) * 100).toFixed(2)}%,0)`; sc.appendChild(im);
}
/* 발자국: 시트에서 발이 땅에 닿는 칸(잰 값)에, 그 발 밑창 자리에 찍는다. 땅과 같은 빠르기로 뒤로 흘러가며 옅어진다.
   STEP_CONTACT[모드][병기] = [[칸, 발 가운데 x(400px 칸 기준)], ...] · 발바닥 높이 STEP_SOLE_Y(380px 칸 기준) */
const STEP_CONTACT = {
  run: { sword: [[0, 220], [8, 217]], blade: [[4, 262], [12, 252]], spear: [[1, 201], [5, 201], [9, 211], [13, 195]], fist: [[2, 189], [5, 232], [10, 207], [14, 178]], hidden: [[2, 236], [10, 222]] },
  walk: { sword: [[11, 255], [3, 255]], blade: [[4, 269], [14, 241]], spear: [[13, 227], [5, 227]], fist: [[4, 242], [12, 242]], hidden: [[0, 227], [7, 244]] },
}, STEP_SOLE_Y = 371;
function liveSteps(sc, walker, W, mode) {
  for (const p of sc.querySelectorAll('.live-step')) {
    const x = +p.dataset.x0 - (liveAnim.x - +p.dataset.at);
    if (x < -30) p.remove(); else p.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
  }
  if (!walker || liveAnim.v < .2) return;
  const fr = liveAnim.f, list = (STEP_CONTACT[mode] || STEP_CONTACT.run)[walker.dataset.w] || STEP_CONTACT.run.sword, hit = list.find(c => c[0] === fr);
  if (!hit) { liveAnim.stepF = -1; return; }
  if (liveAnim.stepF === fr) return;
  liveAnim.stepF = fr;
  sfx('step', { run: mode === 'run', ground: sfxGround() });         // 발소리 (눈 · 젖은 땅 · 흙)
  const el = document.createElement('i'); el.className = `live-step ${mode}`; el.dataset.live = 1;
  el.style.backgroundImage = `url('${ASSET.fx('footprint_' + (sc.dataset.zone || 'cheongpung'))}')`;   // 헝겊신 밑창 자국 (탐험지 흙빛)
  sc.appendChild(el);
  const fw = el.offsetWidth, fh = el.offsetHeight;
  const fx = walker.offsetLeft + walker.offsetWidth * hit[1] / 400, fy = walker.offsetTop + walker.offsetHeight * STEP_SOLE_Y / 380;
  const x0 = fx - fw / 2;
  el.style.top = (fy - fh / 2).toFixed(1) + 'px';
  el.dataset.x0 = x0; el.dataset.at = liveAnim.x; el.style.transform = `translate3d(${x0.toFixed(1)}px,0,0)`;
  el.addEventListener('animationend', () => el.remove());
  for (let i = 0; i < (mode === 'run' ? 4 : 2); i++) {              // 흙먼지: 발이 닿는 자리에서 뒤로 살짝 튄다
    const d = document.createElement('i'); d.className = 'live-dust'; d.dataset.live = 1;
    d.style.left = (fx - 6 + Math.random() * 10).toFixed(1) + 'px'; d.style.top = (fy - 4).toFixed(1) + 'px';
    d.style.setProperty('--dx', (-12 - Math.random() * 18).toFixed(0) + 'px'); d.style.setProperty('--dy', (-5 - Math.random() * 12).toFixed(0) + 'px');
    d.style.animationDelay = (i * 25) + 'ms';
    sc.appendChild(d); setTimeout(() => d.remove(), 700);
  }
}
/* 기믹 걸음(덫 · 금고 · 장치 · 기연)도 무대에: 오른쪽 끝에서 땅과 같이 다가와 제자에게 닿으면 이펙트와 얻은 것('+1')을 띄운다.
   닿기 전까지 견문록에는 그 걸음을 아직 안 띄운다 (맞붙기와 같은 hold) */
const LIVE_GIM = { trap: 'gim_trap', vault: 'gim_vault', gimmick: 'gim_gimmick', event: 'gim_event' };   // props/ 아래 기믹 전용 그림
function liveGimQueue(rec, si) {
  const st = rec.steps[si], sc = document.getElementById('liveScene');
  if (!sc || !LIVE_GIM[st.k] || reduceMotion()) return;
  if (liveAnim.show || liveAnim.queued || liveAnim.gim) { liveAnim.gimQ = { rid: rec.id, si, at: now() }; return; }   // 무대가 바쁘면 맞붙기가 끝난 뒤에
  const el = document.createElement('img'); el.className = `live-gim ${st.k}`; el.dataset.live = 1; el.src = ASSET.prop(LIVE_GIM[st.k]); el.alt = ''; el.style.left = '104%';
  sc.appendChild(el);
  liveAnim.gim = { el, st, x0: liveAnim.x, fired: 0 };
  liveAnim.hold = { rid: rec.id, i: si, until: now() + 25000 };
  liveSideRefresh();
}
/* 얻은 것 · 잃은 것을 제자 머리 위로 차례로 띄운다 */
function liveGain(sc, text, ico, cls, delay) {
  setTimeout(() => {
    const g = document.createElement('div'); g.className = `live-gain ${cls || ''}`; g.dataset.live = 1;
    g.innerHTML = `${ico ? `<img src="${ico}" alt="">` : ''}<span>${esc(text)}</span>`;
    sc.appendChild(g); setTimeout(() => g.remove(), 1900);
  }, delay || 0);
}
function liveGimFire(sc, G) {
  const st = G.st, walker = sc.querySelector('.live-walker'); G.el.classList.add('hit');
  let d = 0;
  if (st.k === 'trap') { sfx('trap'); liveVfx(sc, 'hit', 24, 'small'); if (walker) spFlash(walker); liveShake(sc); liveGain(sc, `활력 ${st.dh || ''}`.trim(), '', 'bad', 0); d = 1; }
  else if (st.k === 'event') {                       // 기연: 이름 → 제자가 고른 선택 → 쓴 은자 → 얻은 것
    const m = (st.t || '').match(/「([^」]+)」\s*—\s*([^→]+)/);
    liveVfx(sc, 'crit', 26, 'small kata');
    liveGain(sc, m ? `기연 「${m[1]}」` : '기연', ASSET.ui('c_star'), 'npc', 0); d = 1;
    if (m) liveGain(sc, `▸ ${m[2].trim()}`, '', 'npc', d++ * 420);
    if (st.ds) liveGain(sc, `은자 ${fmt(st.ds)}`, ASSET.ui('h_silver'), 'bad', d++ * 420);
    toast(`📜 기연${m ? ` 「${m[1]}」` : ''} — 「기연」에서 ${ENCOUNTER_TTL / 3600000}시간 안에 고르십시오`);
  }
  else liveVfx(sc, 'crit', 26, 'small kata');
  const g = st.g;
  if (g) {
    for (const [id, n] of Object.entries(g.items || {})) liveGain(sc, `${ITEMS[id] ? ITEMS[id].name : id} +${n}`, ASSET.item(id), 'good', d++ * 420);
    if (g.silver) liveGain(sc, `은자 +${fmt(g.silver)}`, ASSET.ui('h_silver'), 'good', d++ * 420);
    if (g.gear) liveGain(sc, `장비 +${g.gear}`, ASSET.ui('c_trophy'), 'good', d++ * 420);
  } else if (st.k !== 'trap' && st.k !== 'event') liveGain(sc, st.cls === 'muted' ? '그냥 지나쳤습니다' : '빈손', '', 'muted', 0);
  G.release = now() + 900 + d * 420;
}
function liveGimStep(sc, walker) {
  const G = liveAnim.gim; if (!G) return;
  if (!G.el.isConnected) { liveAnim.gim = null; liveRelease(); return; }
  const W = sc.offsetWidth || 1, left = 104 - (liveAnim.x - G.x0) / W * 100;
  G.el.style.left = left.toFixed(2) + '%';
  if (!G.fired && left <= 27) { G.fired = 1; liveGimFire(sc, G); }
  if (G.release && now() >= G.release) { G.release = 0; liveRelease(); }
  if (left < -20) { G.el.remove(); liveAnim.gim = null; liveRelease(); }
}
function liveLoop(ts) {
  liveAnim.raf = requestAnimationFrame(liveLoop);
  const sc = document.getElementById('liveScene'); if (!sc) { cancelAnimationFrame(liveAnim.raf); liveAnim.raf = 0; liveAnim.show = null; return; }
  const dt = liveAnim.last ? Math.min(100, ts - liveAnim.last) : 16; liveAnim.last = ts;
  const walker = sc.querySelector('.live-walker'), hero = document.getElementById('liveHero'), strips = sc.querySelectorAll(':scope > .live-world > .live-strip');   // 책장 넘김(.live-page) 속 복사본은 움직이지 않는다
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
  const mode = liveMode();                            // 기력이 다하면 걷기 시트로, 차오르면 다시 달리기 시트로
  if (walker && walker._md !== mode) {                 // (다시 그려도 시트 그림은 남으므로 요소에 기억한 값으로 비교)
    walker._md = mode; walker.dataset.mode = mode; walker.classList.toggle('walking', mode === 'walk');
    for (const e of walker.querySelectorAll('.walk-spr')) e.style.backgroundImage = `url('${ASSET[mode](walker.dataset.w)}')`;
  }
  const W = walkMeta(walker && walker.dataset.w, mode), N = W.n;
  // 멀미 줄이기: 출발은 천천히 붙고, 요수 앞에서는 미리 늦춘다 (걸음 칸과 산길이 같은 v로 움직여 발은 미끄러지지 않는다)
  const sh0 = liveAnim.show, app = sh0 && sh0.phase === 'approach', near = app && parseFloat((sc.querySelector('.live-foe') || {}).style?.left) < ((sh0 && sh0.foeX) || 70) + 14;
  // 요수가 다가오는 동안은 천천히 달려 오른쪽 끝에서부터 다가오는 모습이 보이게, 코앞에서는 더 늦춘다
  liveAnim.v = (liveAnim.v || 0) + ((near ? .3 : app ? .55 : 1) - (liveAnim.v || 0)) * Math.min(1, dt / 450);
  const vdt = dt * liveAnim.v;
  liveAnim.acc = (liveAnim.acc + vdt) % W.ms;
  const fr = Math.floor(liveAnim.acc / (W.ms / N)) % N;
  if (fr !== liveAnim.f && walker) {
    liveAnim.f = fr; walker.querySelector('.walk-spr').style.backgroundPositionX = (fr * 100 / (N - 1)) + '%';
    const gh = walker.querySelectorAll('.walk-ghost');                // 경공 잔상: 조금 전 칸을 뒤에 흐리게
    if (gh.length) { (liveAnim.hist = liveAnim.hist || []).unshift(fr); liveAnim.hist.length = 9; gh.forEach((g, i) => { g.style.backgroundPositionX = ((liveAnim.hist[(i + 1) * 4] ?? fr) * 100 / (N - 1)) + '%'; }); }
  }
  if (walker && walker.dataset.fast && mode === 'run' && (liveAnim.windMs = (liveAnim.windMs || 0) + dt) > 160) {   // 바람 줄기
    liveAnim.windMs = 0; const l = document.createElement('i'); l.className = 'live-wind'; l.dataset.live = 1;
    l.style.left = (30 + Math.random() * 40) + '%'; l.style.top = (30 + Math.random() * 45) + '%'; l.style.width = (8 + Math.random() * 10) + '%';
    sc.appendChild(l); setTimeout(() => l.remove(), 550);
  }
  // 산길 두 겹(원근): 발밑 땅은 한 주기에 키의 g배만큼(발이 미끄러지지 않게), 먼 산 · 숲은 LIVE_FAR배로 느리게 흐른다
  if (strips.length && walker) {
    const img = strips[0].firstElementChild, h = walker.offsetHeight || 120, wImg = img && img.offsetWidth;
    liveAnim.x += vdt * (h * W.g) / W.ms;
    if (wImg) for (const s of strips) s.style.transform = `translate3d(${-((liveAnim.x * (s.dataset.far ? LIVE_FAR : 1)) % wImg).toFixed(2)}px,0,0)`;
    const mb = sc.querySelector('.live-moonbox');                     // 달 가리개도 먼 겹과 같이 흘러야 산 뒤로 숨는다
    if (mb && wImg) mb.style.webkitMaskPosition = mb.style.maskPosition = `${-((liveAnim.x * LIVE_FAR) % wImg).toFixed(2)}px 0`;
  }
  liveProps(sc, walker, vdt);
  liveSteps(sc, walker, W, mode);
  liveGimStep(sc, walker);
  // 맞붙는 모습: 전투 걸음이 드러나면 그 요수로
  if (liveAnim.show) { liveShowStep(sc, liveAnim.show, ts, dt); return; }
  const q = liveAnim.queued;
  if (q && imgsReady([SPRITE_SRC.foe(q.eid), SPRITE_SRC.foe(q.eid, 1)])) { liveAnim.queued = null; liveAnim.show = liveShowStart(sc, { ...q }); }
}
/* 강호행 제목 옆 지역 이름: 붓글씨 폰트(Gangho Brush, 537글자 — 10월 3일 이름 글자 60자 · 별호 글자 더함)로 쓴다 — 머리 배너 '강호견문록'도 이 폰트. 폰트에 없는 글자는 기본 글씨로 */
// 붓글씨 폰트를 받기 전에는 그 글씨를 숨겨 둔다 (기본 글씨로 먼저 보였다가 바뀌지 않게, 10월 3일 유저). 받으면(또는 3초가 지나면) html.brush-ok
{ const ok = () => document.documentElement.classList.add('brush-ok'); setTimeout(ok, 3000);
  if (typeof FontFace === 'function' && document.fonts) new FontFace('Gangho Brush', `url(${ASSET.font('gangho_brush_537')})`).load().then(f => { document.fonts.add(f); ok(); }).catch(ok); else ok(); }
// 품계 한자(一 · 二 · 三 · 流 · 武 · 士)만 담은 붓글씨 (Ma Shan Zheng, OFL — 6자 부분 글꼴). 'Gangho Brush'에 없는 글자만 이 글꼴로
if (typeof FontFace === 'function' && document.fonts) new FontFace('Gangho Brush', `url(${ASSET.font('rank_hanja')})`, { unicodeRange: 'U+4E00, U+4E09, U+4E8C, U+58EB, U+6B66, U+6D41' }).load().then(f => document.fonts.add(f)).catch(() => {});
function liveWhere(zid, n) {
  return `<span class="live-where" data-k="${zid}${n}">${esc(stageName(zid, n))}</span>`;
}
/* 단계가 바뀌면 무대가 책장 넘기듯 (10월 3일 유저): 지금 무대를 한 장 떠서 왼쪽으로 넘긴다 (뒤로 가면 반대로) */
function livePageCheck(zid, n) {
  const k = `${zid}:${n}`, old = liveAnim.pageKey; liveAnim.pageKey = k;
  if (!old || old === k || old.split(':')[0] !== zid) return;
  setTimeout(() => livePageTurn(n > +old.split(':')[1] ? 1 : -1), 0);
}
function livePageTurn(dir) {
  const sc = $('#liveScene'); if (!sc || reduceMotion()) return;
  sc.querySelectorAll('.live-page').forEach(e => e.remove());
  const pg = document.createElement('div'), face = document.createElement('div'), back = document.createElement('i');
  pg.className = `live-page ${dir < 0 ? 'rev' : ''}`; pg.setAttribute('aria-hidden', 'true'); face.className = 'lp-face'; back.className = 'lp-back';
  for (const el of sc.querySelectorAll(':scope > .live-world, :scope > .live-mist, :scope > .live-sun, :scope > .live-sky, :scope > .live-moonbox, :scope > .live-tint')) { const c = el.cloneNode(true); c.querySelectorAll('[data-anim]').forEach(x => x.removeAttribute('data-anim')); face.appendChild(c); }
  pg.dataset.live = '1'; pg.append(face, back); sc.appendChild(pg); sfx('page');   // data-live: 다시 그려도 그대로 (넘김은 rAF로 — 떼었다 붙여도 처음부터 다시 돌지 않게)
  const t0 = performance.now(), D = 1100, ease = x => x < .5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
  const step = () => { const x = Math.min(1, (performance.now() - t0) / D), e = ease(x);
    pg.style.setProperty('--p', e.toFixed(4));   // 넘긴 정도 0→1: 옛 장은 넘김 모서리까지만 보이고, 그 모서리에 종이 뒷면이 말려 따라간다
    if (x < 1) requestAnimationFrame(step); else pg.remove(); };
  requestAnimationFrame(step);
}
function liveScene(r) {
  const zid = (r && r.zone) || S.expedition.zone || 'cheongpung', w = weaponType(), N = walkMeta(w).n, fast = runFast();
  const md = liveMode(), spr = cls => `<div class="${cls}" data-anim style="background-image:url('${ASSET[md](w)}');background-size:${N * 100}% 100%"></div>`;
  const img = () => `<img src="${ASSET.travel(zid)}" alt="">`, gnd = () => `<img src="${ASSET.ground(zid)}" alt="">`;   // 먼 겹 = 산길 전체, 앞 겹 = 땅만 (같은 크기라 이음매 없이 되풀이)   // 끝과 처음이 이어지게 다듬은 그림 (이음매 없이 되풀이)
  livePageCheck(zid, r && r.live ? r.stage : S.expedition.stage || 1);
  if (!liveAnim.raf) liveAnim.raf = requestAnimationFrame(liveLoop);
  return `<div class="live-scene ${liveDone(r) && !liveHeld(r) ? 'rest' : ''} ${liveDead(r) ? 'dead' : ''}" id="liveScene" data-zone="${zid}" data-tod="${liveTod()}" style="${liveTodVars()}">
    <div class="live-world far"><div class="live-strip" data-far="1" data-anim>${img()}${img()}</div></div>
    <div class="live-world near"><div class="live-strip" data-anim>${gnd()}${gnd()}</div></div>
    <i class="live-mist"></i>
    <div class="sp-fighter live-walker ${fast ? 'fast' : ''} ${md === 'walk' ? 'walking' : ''}" id="liveWalker_${w}${fast ? '_f' : ''}" data-w="${w}" data-mode="${md}" ${fast ? 'data-fast="1"' : ''}>${fast ? spr('walk-spr walk-ghost g1') + spr('walk-spr walk-ghost g2') : ''}<i class="sp-shadow"></i>${spr('walk-spr')}</div>
    <div class="sp-fighter sp-hero live-hero" id="liveHero" data-f="0" data-w="${w}" data-anim><i class="sp-shadow"></i><div class="sp-spr" style="background-image:url('${SPRITE_SRC.hero(w)}')"></div></div>
    <div class="live-fallen" aria-hidden="true"><i class="sp-shadow"></i><img class="lf-body" src="${ASSET.hero('fallen')}" alt="">${w === 'fist' ? '' : `<img class="lf-weapon w-${w}" src="${w === 'spear' ? ASSET.hero('fallen_spear') : ASSET.item('w_' + w)}" alt="">`}</div>
    <div class="sp-fighter sp-foe flip fsheet live-foe" id="liveFoe" data-anim><i class="sp-shadow"></i><div class="sp-fspr" data-anim></div><div class="sp-fatk" data-anim></div></div>
    <div class="live-hp me" data-anim><i class="lh-face" style="background-image:url('${ASSET.portrait('hero')}')"></i><img class="lh-frame" src="${ASSET.ui('hp_me')}" alt=""><div class="lh-bar"><i class="lag"></i><i class="now"></i><em></em></div><div class="lh-mp" aria-label="내력"><i></i><em></em></div><b class="lh-nm">${esc(S.name)}</b><small class="lh-cp"></small></div>
    <div class="live-hp foe" data-anim><i class="lh-face"></i><img class="lh-frame" src="${ASSET.ui('hp_foe')}" alt=""><div class="lh-bar"><i class="lag"></i><i class="now"></i><em></em></div><b class="lh-nm"></b><small class="lh-cp"></small></div>
    <i class="live-sun"></i><i class="live-sky"></i><i class="live-moonbox" style="-webkit-mask-image:url('${ASSET.skymask(zid)}');mask-image:url('${ASSET.skymask(zid)}')"><i class="live-moon"><i class="moon-shade"></i></i></i><i class="live-fog" style="background-image:url('${ASSET.fx('wx_fog')}')"></i><i class="live-rain" style="background-image:url('${ASSET.fx('wx_rain')}')"></i><i class="live-snow" style="background-image:url('${ASSET.fx('wx_snow')}')"></i><i class="live-tint"></i>
    <i class="live-flies" style="opacity:var(--fly,0)">${LIVE_FLIES.map(([x, y, d]) => `<i style="left:${x}%;top:${y}%;animation-delay:-${d}s,-${(d * 1.7).toFixed(1)}s"></i>`).join('')}</i>
    <img class="live-enc" src="${ASSET.ui('b_encounter')}" alt="">
    <div class="live-boss"><small>頭目 出現</small><b></b></div>
    ${r && r.end === 'dead' && !r.claimed ? '' : '<span class="live-rest">산문에서 대기 중</span>'}
  </div>`;
}
