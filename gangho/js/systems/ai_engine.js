/* [시스템] AI 자동 플레이 (운영자 시험용, DOM 조작 금지)
   지금 캐릭터로 N일을 미리 살아 본다. 게임 시계(CLOCK.shift)를 N일 전으로 돌려 놓고 한 시간씩 감으며 강호행을 이어 가고,
   접속해 있는 시각에는 유저가 할 법한 일(보상 받기 · 성급 · 돌파단 · 생혈고 · 장비 · 무공 · 임무 · 공양 · 탐험지)을 한다.
   자리를 비운 시각에는 아무것도 하지 않고, 돌아오면 쌓인 탐험을 한꺼번에 결산한다 (최대 8번 규칙 그대로).
   끝나면 시계는 지금으로 돌아오고, 날마다의 기록(보고서)을 돌려준다. 되돌리기(백업)는 화면 계층이 맡는다. */

/* 접속 패턴: life = 아침 · 점심 · 저녁에 접속 (밤엔 잔다) · always = 늘 켜 둠 */
const AI_PATTERNS = {
  life:   { name: '생활 패턴 (아침·점심·저녁 접속, 밤 수면)', on: h => [7, 8, 12, 13, 18, 19, 20, 21, 22, 23].includes(h) },
  always: { name: '상시 접속 (24시간)', on: () => true },
};
const AI_HOUR = 3600000;

function aiSnapshot() {
  const best = Object.entries(S.manuals).filter(([id]) => MANUALS[id].cat === 'mugong').sort((a, b) => b[1].star - a[1].star)[0];
  return { cp: calculateCombatPower(S), silver: S.silver, exp: S.exp, contrib: S.contrib, zone: S.expedition.zone, stage: S.expedition.zone ? stageCleared(S.expedition.zone) : 0,
    star: best ? best[1].star : 0, stars: Object.fromEntries(CAT_ORDER.map(c => [c, S.active[c] ? S.manuals[S.active[c]].star : 0])),
    wins: 0, losses: 0, defeats: 0, runs: 0, bosses: 0 };
}

/* 한 시각의 행동. note(text)로 눈에 띄는 일만 보고서에 남긴다 */
function aiAct(note) {
  const t = now();
  // 1. 전투를 다 관찰했다고 치고, 끝난 강호행의 최종보상확인
  for (const r of S.expeditions) for (const b of r.battles) if (b.seen === false) b.seen = true;
  if (pendingRecs().length) claimRewards();
  // 2. 인물: 장문인 가르침 · 조운 보급
  if (tutorReady()) masterTalk();
  if (S.supplyDay !== today()) jounSupply();
  // 3. 비급 읽기 → 무공 고르기
  for (const id of Object.keys(S.inv)) if (id.startsWith('bk_') && ITEMS[id].use && ITEMS[id].use.learn && !S.manuals[ITEMS[id].use.learn]) { const mid = ITEMS[id].use.learn; learnManual(id); note(`비급 습득: ${MANUALS[mid].name}`); }
  aiPickManuals(note);
  // 4. 장비: 전투력이 오르면 갈아 끼우고, 행낭이 차면 못 쓰는 장비를 판다
  aiPickGear(note);
  // 5. 문파 임무 · 무신상 공양
  for (const q of subqList()) if (subqReady(q.zid, q.n)) claimSubq(q.zid, q.n);
  if (count('slag') >= GACHA.cost) pray(Math.floor(count('slag') / GACHA.cost));
  // 6. 돌파단 · 생혈고
  aiPills(note);
  aiPotions();
  // 7. 성급: 무공 먼저, 낮은 것부터
  let guard = 0, up = true;
  while (up && guard++ < 40) {
    up = false;
    const order = CAT_ORDER.map(c => S.active[c]).filter(Boolean).sort((a, b) => (MANUALS[a].cat === 'mugong' ? -1 : 0) - (MANUALS[b].cat === 'mugong' ? -1 : 0) || S.manuals[a].star - S.manuals[b].star);
    for (const id of order) if (!starUpBlock(id)) { starUp(id); up = true; const st = S.manuals[id].star; if (st === 6 || st === MAX_STAR || st % 3 === 0) note(`《${MANUALS[id].name}》 ${st}성`); break; }
  }
  // 8. 탐험지: 두목을 쓰러뜨려 다음 구역이 열리고 최근 탐험이 순조로우면 올라가고, 거듭 쓰러지면 내려온다
  aiZone(note);
  // 9. 강호행 중이 아니면 다시 떠난다: 쓰러진 단계보다 한 단계 아래에서 (자동 진행 켬)
  if (!activeRun() && S.expedition.zone) {
    const X = S.expedition, last = S.expeditions.filter(r => r.zone === X.zone && !r.live).slice(-1)[0];
    X.auto = true; X.stage = last && last.end === 'dead' && !(last.cleared || []).length ? Math.max(1, last.stage - 1) : stageMax(X.zone);
    startRun(t);
  }
}

function aiPickManuals(note) {
  const w = weaponType();
  for (const c of CAT_ORDER) {
    const own = Object.keys(S.manuals).filter(id => MANUALS[id].cat === c && (c !== 'mugong' || !MANUALS[id].weapon || MANUALS[id].weapon === w));
    if (!own.length) continue;
    const score = id => GRADES[MANUALS[id].grade].mult * 100 + S.manuals[id].star;
    const best = own.sort((a, b) => score(b) - score(a))[0];
    if (S.active[c] !== best && (!S.active[c] || score(best) > score(S.active[c]) + 50)) { equipManual(best); note(`${CATS[c].name} 교체: ${MANUALS[best].name}`); }
  }
}

function aiPickGear(note) {
  const cp = () => calculateCombatPower(S), mu = S.active.mugong && MANUALS[S.active.mugong];
  for (const it of [...S.gear]) {
    if (it.slot === 'weapon' && mu && mu.weapon && it.wtype !== mu.weapon) continue;   // 무공과 맞지 않는 병기는 들지 않는다
    const slots = SLOT_ORDER.filter(s => slotAccepts(s) === it.slot);
    let bestSlot = null, bestCp = cp();
    for (const s of slots) {                               // 잠깐 끼워 보고 전투력을 잰다
      const prev = S.equip[s]; S.equip[s] = it;
      const v = cp(); S.equip[s] = prev;
      if (prev === undefined) delete S.equip[s];
      if (v > bestCp) { bestCp = v; bestSlot = s; }
    }
    if (bestSlot) { equipItem(it.uid, bestSlot); note(`장비: ${it.name} 착용 (전투력 ${fmt(bestCp)})`); }
  }
  if (bagUsed() >= bagCap() - 2) for (const it of [...S.gear]) if (gearSellPrice(it)) sellGear(it.uid);
}

function aiCraftable(r) { return Object.entries(r.in).every(([id, n]) => has(id, n)); }
/* 재료가 모자라면 전방에서 살 수 있는 것은 산다 */
function aiBuyMats(r) {
  for (const [id, n] of Object.entries(r.in)) {
    const row = SHOP_STOCK.find(x => x[0] === id); if (!row) continue;
    while (count(id) < n && S.silver >= row[1]) if (!buyItem(id)) break;
  }
}
function aiPills(note) {
  for (const c of CAT_ORDER) {
    const id = S.active[c]; if (!id) continue;
    const pill = GATES[S.manuals[id].star]; if (!pill || has(pill)) continue;
    const r = RECIPES.find(x => x.out === pill);
    if (!S.codex.includes(r.id)) { masterHint(); if (!S.codex.includes(r.id)) continue; }
    aiBuyMats(r);
    let tries = 0;
    while (!has(pill) && aiCraftable(r) && tries++ < 4) { const res = doCraft(r.craft, { ...r.in }); if (res && res.ok) note(`연단: ${ITEMS[pill].name}`); }
    if (!has(pill)) note(`${MANUALS[id].name} ${S.manuals[id].star}성에서 ${ITEMS[pill].name} 재료 부족`);
  }
}
function aiPotions() {
  const r = RECIPES.find(x => x.out === 'saenghyeol');
  let guard = 0;
  while (count('saenghyeol') < 10 && guard++ < 20) {      // 강호행 동안 쓰러지지 않게 생혈고를 10개까지 채운다 (전방 5냥)
    if (S.silver >= 5) buyItem('saenghyeol');
    else if (r && S.codex.includes(r.id) && aiCraftable(r)) doCraft(r.craft, { ...r.in });
    else break;
  }
}
function aiZone(note) {
  const cur = S.expedition.zone, i = ZONE_ORDER.indexOf(cur);
  const next = ZONE_ORDER[i + 1];
  if (next && zoneUnlocked(next) && stageCleared(cur) >= STAGE.count) { setDestination(next); note(`탐험지 이동 → ${ZONES[next].name} (${ZONES[cur].name} 평정)`); }
}

/* N일 자동 플레이. onDay(report, dayIndex)로 하루씩 알린다. 끝나면 시계를 지금으로 돌린다 */
function aiRun(days, patternKey = 'life') {
  const P = AI_PATTERNS[patternKey] || AI_PATTERNS.life;
  const hours = days * 24, start = Date.now();
  const report = { days, pattern: P.name, startedAt: start, before: aiSnapshot(), daily: [], notes: [], after: null };
  Bus.mute(true);
  try {
    CLOCK.shift = -hours * AI_HOUR;
    if (!S.expedition.zone) S.expedition.zone = ZONE_ORDER[0];
    const cur = activeRun(); if (cur) cur.next = Math.max(cur.next, now());   // 진행 중인 강호행은 앞당긴 시계에서 이어 간다
    let day = null;
    const mark = new Set(S.expeditions.filter(r => !r.live).map(r => r.id));
    const tally = d => { for (const r of S.expeditions) if (!r.live && !mark.has(r.id)) { mark.add(r.id); d.runs++; d.wins += r.wins; d.losses += r.losses; d.defeats += r.defeats; d.bosses += r.battles.filter(b => b.boss && b.win).length; } };
    for (let h = 0; h <= hours; h++) {
      CLOCK.shift = -(hours - h) * AI_HOUR;
      const t = now(), hr = new Date(t).getHours(), di = Math.min(days - 1, Math.floor(h / 24));
      if (!day || day.i !== di) { if (day) { tally(day); report.daily.push({ ...day, end: aiSnapshot() }); } day = { i: di, label: `${di + 1}일째`, runs: 0, wins: 0, losses: 0, defeats: 0, bosses: 0 }; }
      checkDailyMidnightReset(t);
      if (!P.on(hr) && h < hours) continue;           // 자는 동안은 밀렸다가, 깨면 한꺼번에 (최대 8시간) 따라잡는다
      advanceRun(t);
      tally(day);
      aiAct(text => report.notes.push({ t, day: di + 1, text }));
    }
    tally(day); report.daily.push({ ...day, end: aiSnapshot() });
  } finally {
    CLOCK.shift = 0;
    const r = activeRun(); if (r) r.next = Math.max(r.next, now() + EXPEDITION.firstMs);   // 시계를 되돌렸으니 다음 걸음은 지금부터
    Bus.mute(false);
  }
  report.after = aiSnapshot();
  report.ms = Date.now() - start;
  // 보고서에 같은 줄이 겹치면 줄인다
  const seen = new Set(); report.notes = report.notes.filter(n => { const k = n.day + n.text; if (seen.has(k)) return false; seen.add(k); return true; });
  log(`🤖 AI 자동 플레이 ${days}일 (${P.name}) — 전투력 ${fmt(report.before.cp)} → ${fmt(report.after.cp)}, 무공 ${report.before.star}성 → ${report.after.star}성`, 'gold');
  notify.refresh(); notify.save();
  return report;
}
