/* [시스템] AI 자동 플레이 (운영자 시험용, DOM 조작 금지)
   지금 캐릭터로 N일을 미리 살아 본다. 게임 시계(CLOCK.shift)를 N일 전으로 돌려 놓고 한 시간씩 감으며 강호행을 이어 가고,
   접속해 있는 시각에는 잘 아는 유저가 할 법한 일을 한다: 가르침 · 토벌 임무를 모두 받고, 화로 조합식(위키를 아는 유저처럼)으로
   돌파단 · 생혈고 · 장비를 빚고, 전방에서 물약과 더 나은 장비를 사고, 공헌도로 장경각의 가장 좋은 장비 · 비급 · 신분패를 바꾸고,
   지금 힘으로 수련치 · 은자를 가장 많이 버는 탐험지 · 단계에서 사냥한다. 밸런스 기준(표준 유저)으로 쓴다.
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
    rank: S.rank || 0, pills: `${count('pillLow')}/${count('pillHigh')}`, gear: Object.values(S.equip).filter(Boolean).map(g => `${g.tier || 1}${g.rarity}${g.enh ? '+' + g.enh : ''}`).join(' '),
    q: S.mainQ || 0, subq: S.subqDone || 0, wins: 0, losses: 0, defeats: 0, runs: 0, bosses: 0 };
}

/* 한 시각의 행동. note(text)로 눈에 띄는 일만 보고서에 남긴다 */
function aiAct(note) {
  const t = now();
  // 1. 전투를 다 관찰했다고 친다
  for (const r of S.expeditions) for (const b of r.battles) if (b.seen === false) b.seen = true;
  // 2. 인물: 장문인 가르침 · 조운 보급
  let tg = 0; while (tutorReady() && tg++ < 5) masterTalk();   // 받을 가르침은 모두 받는다
  if (S.supplyDay !== today()) jounSupply();
  // 3. 비급 읽기 → 무공 고르기
  for (const id of Object.keys(S.inv)) if (id.startsWith('bk_') && ITEMS[id].use && ITEMS[id].use.learn && !S.manuals[ITEMS[id].use.learn]) { const mid = ITEMS[id].use.learn; learnManual(id); note(`비급 습득: ${MANUALS[mid].name}`); }
  aiPickManuals(note);
  // 4. 장비: 투력이 오르면 갈아 끼우고, 행낭이 차면 못 쓰는 장비를 판다
  aiContrib(note);                                   // 공헌도: 장경각 장비 · 비급 · 신분패 중 가장 좋은 것
  aiCraftGear(note);                                 // 화로: 투력이 오르는 단조 장비
  aiShop(note);                                      // 전방: 투력이 오르는 하급 장비
  aiPickGear(note);
  aiEnhance(note);                                   // 단조 강화: 같은 장비를 재료로 (+7까지)
  // 5. 문파 임무 · 무신상 공양
  if (subqReady()) { const q = subqCur(); claimSubq(); note(`토벌 임무 완료 ${subqToday()}/${SUBQ.daily}: ${stageName(q.zid, q.n)}`); }
  aiSlag(note);                                      // 가르침이 공양을 바라면 찌꺼기를 일부러 만든다
  for (const E of encountersWaiting()) { const ev = EVENTS.find(x => x.id === E.ev), ok = encChoices(E).map((c, i) => [c, i]).filter(([c]) => !reqFail(c.req)); resolveEncounter(E.uid, (ok.find(([c]) => c.req) || ok[0] || [0, 0])[1]); }   // 기연은 쌓이므로 AI가 고른다
  if (count('slag') >= GACHA.cost) pray(Math.floor(count('slag') / GACHA.cost));
  // 6. 돌파단 · 생혈고
  aiPills(note);
  aiPotions(note);
  // 7. 성급: 무공 먼저, 낮은 것부터
  let guard = 0, up = true;
  while (up && guard++ < 40) {
    up = false;
    const order = CAT_ORDER.map(c => S.active[c]).filter(Boolean).sort((a, b) => (MANUALS[a].cat === 'mugong' ? -1 : 0) - (MANUALS[b].cat === 'mugong' ? -1 : 0) || S.manuals[a].star - S.manuals[b].star);
    for (const id of order) if (!starUpBlock(id)) { starUp(id); up = true; const st = S.manuals[id].star; if (st === 6 || st === MAX_STAR || st % 3 === 0) note(`《${MANUALS[id].name}》 ${st}성`); break; }
  }
  // 8. 탐험지: 두목을 쓰러뜨려 다음 구역이 열리면 올라간다
  aiZone(note);
  // 9. 강호행 조종: 토벌 임무가 있으면 그 자리에서, 없으면 앞길을 밀고, 막히면 가장 잘 버는 곳에서 사냥한다
  if (S.expedition.zone) aiDrive(t, note);
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
    for (const s of slots) {                               // 잠깐 끼워 보고 투력을 잰다
      const prev = S.equip[s]; S.equip[s] = it;
      const v = cp(); S.equip[s] = prev;
      if (prev === undefined) delete S.equip[s];
      if (v > bestCp) { bestCp = v; bestSlot = s; }
    }
    if (bestSlot) { equipItem(it.uid, bestSlot); note(`장비: ${it.name} 착용 (투력 ${fmt(bestCp)})`); }
  }
  if (bagUsed() >= bagCap() - 2) for (const it of [...S.gear]) if (gearSellPrice(it) && !Object.values(S.equip).some(e => enhSame(e, it))) sellGear(it.uid);   // 강화 재료는 남긴다
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
    const r = RECIPES.find(x => x.out === pill);   // 돌파단은 이제 조합으로 못 만든다 (가르침 · 첫 입장 · 금고)
    if (!r) { if (pill === 'pillLow' && aiPrayForPill(note)) continue; note(`${MANUALS[id].name} ${S.manuals[id].star}성: ${ITEMS[pill].name} 기다림`); continue; }
    aiBuyMats(r);
    let tries = 0;
    while (!has(pill) && aiCraftable(r) && tries++ < 4) { const res = doCraft(r.craft, { ...r.in }); if (res && res.ok) note(`연단: ${ITEMS[pill].name}`); }
    if (!has(pill)) note(`${MANUALS[id].name} ${S.manuals[id].star}성에서 ${ITEMS[pill].name} 재료 부족`);
  }
}
function aiPotions(note) {
  const r = RECIPES.find(x => x.out === 'saenghyeol');
  let guard = 0;
  while (count('saenghyeol') < 10 && guard++ < 20) {      // 강호행 동안 쓰러지지 않게 생혈고를 10개까지 채운다 (전방 5냥)
    if (S.silver >= 5) buyItem('saenghyeol');
    else if (r && aiCraftable(r)) doCraft(r.craft, { ...r.in });
    else break;
  }
  // 내력약 5개 · 기력단 2개: 생혈고 값을 남기고 산다 (싸우며 알아서 먹는다)
  for (const [id, want] of [['potionMp', 5], ['gigeokdan', 2]]) {
    const row = SHOP_STOCK.find(x => x[0] === id); let n = 0;
    while (row && count(id) < want && S.silver - row[1] >= 50 && buyItem(id)) n++;
    if (n && note) note(`전방: ${ITEMS[id].name} ${n}개`);
  }
}
function aiZone(note) {
  const cur = S.expedition.zone, i = ZONE_ORDER.indexOf(cur);
  const next = ZONE_ORDER[i + 1];
  if (next && zoneUnlocked(next) && stageCleared(cur) >= STAGE.count) { setDestination(next); note(`탐험지 이동 → ${ZONES[next].name} (${ZONES[cur].name} 평정)`); }
}

/* 장비 하나를 끼웠을 때 오르는 투력 (가장 좋은 칸 기준). 무공과 맞지 않는 병기는 0 */
function aiGearGain(it) {
  const mu = S.active.mugong && MANUALS[S.active.mugong];
  if (it.slot === 'weapon' && mu && mu.weapon && it.wtype && it.wtype !== mu.weapon) return 0;
  const base = calculateCombatPower(S); let best = 0;
  for (const s of SLOT_ORDER.filter(x => slotAccepts(x) === it.slot)) {
    const prev = S.equip[s]; S.equip[s] = it;
    const v = calculateCombatPower(S) - base;
    if (prev === undefined) delete S.equip[s]; else S.equip[s] = prev;
    if (v > best) best = v;
  }
  return best;
}
const AI_RESERVE = 80;   // 물약 값으로 남겨 두는 은자

/* 전방: 남는 은자로 투력이 가장 많이 오르는 하급 장비를 산다 (값 대비) */
function aiShop(note) {
  for (let guard = 0; guard < 4; guard++) {
    let best = null;
    for (const [base, tier, price] of SHOP_GEAR_STOCK) {
      if (S.silver - price < AI_RESERVE) continue;
      const it = GEAR_DB[base] ? makeNamedGear(base) : makeGear(base, tier, 0, false), g = aiGearGain(it);
      if (g > 0 && (!best || g / price > best.v)) best = { base, tier, price, v: g / price, name: it.name };
    }
    if (!best || !buyGear(best.base, best.tier)) return;
    note(`전방: ${best.name} 구입 (${best.price}냥)`); aiPickGear(note);
  }
}

/* 공헌도: 익힐 수 있는 장경각 비급(지금 것보다 높은 등급)을 먼저, 그다음 투력이 가장 많이 오르는 장경각 장비 · 신분패 */
function aiContrib(note) {
  const w = weaponType();
  for (const id of LIBRARY_BOOKS) {
    const M = MANUALS[id]; if (S.manuals[id] || has('bk_' + id) || manualRankLocked(id) || S.contrib < M.cost) continue;
    if (M.cat === 'mugong' && M.weapon && M.weapon !== w) continue;
    const cur = S.active[M.cat] && MANUALS[S.active[M.cat]];
    if (cur && GRADES[cur.grade].mult >= GRADES[M.grade].mult) continue;
    buyManual(id); if (has('bk_' + id)) { learnManual('bk_' + id); note(`장경각 비급: ${M.name} (공헌 ${M.cost})`); }
  }
  for (let guard = 0; guard < 3; guard++) {
    let best = null;
    for (const [id, G] of Object.entries(LIBRARY_GEAR)) if (!ownsShop(id) && S.contrib >= G.cost) { const g = aiGearGain(libraryGear(id)); if (g > 0 && (!best || g / G.cost > best.v)) best = { id, v: g / G.cost, name: G.name, cost: G.cost, buy: buyLibraryGear }; }
    for (const G of SHOP_GEAR) if (G.cost && !ownsShop(G.id) && S.contrib >= G.cost) { const g = aiGearGain(shopGear(G.id)); if (g > 0 && (!best || g / G.cost > best.v)) best = { id: G.id, v: g / G.cost, name: G.name, cost: G.cost, buy: buyBadge }; }
    if (!best) return;
    best.buy(best.id); note(`장경각: ${best.name} (공헌 ${best.cost})`); aiPickGear(note);
  }
}

/* 화로 단조: 조합식을 아는 유저처럼, 재료가 있고(모자란 것은 전방에서 사고) 투력이 오르는 중급 장비를 빚는다 */
function aiCraftGear(note) {
  for (const r of RECIPES) {
    if (r.craft !== 'forge' || !r.out.startsWith('gear:')) continue;
    const id = r.out.slice(5);
    if (S.gear.some(g => g.named === id) || Object.values(S.equip).some(g => g && g.named === id)) continue;
    if (aiGearGain(makeNamedGear(id)) <= 0) continue;
    aiBuyMats(r);
    let tries = 0;
    while (aiCraftable(r) && tries++ < 3 && S.hp > craftCost('forge') && !S.gear.some(g => g.named === id)) { const res = doCraft('forge', { ...r.in }); if (res && res.ok) note(`단조: ${CRAFT_GEAR[id].name}`); }
  }
  aiPickGear(note);
}

/* 단조 강화: 차고 있는 장비와 같은 장비(강화 안 된 것)가 행낭에 있으면 재료로 쓴다. 부서질 수 있는 +8부터는 하지 않고, 은자는 50냥 남긴다 */
function aiEnhance(note) {
  for (const it of Object.values(S.equip)) {
    if (!it) continue;
    let r;
    while ((r = enhRule(it)) && !r.boom && enhMaterials(it).length && S.silver - enhCost(it) >= 50) {
      const res = forgeEnhance(it.uid, enhMaterials(it)[0].uid);
      if (!res) break;
      if (res.kind === 'ok') note(`강화: ${it.name} +${it.enh}`);
    }
  }
}

/* 다음 강호행 자리. 강호행은 쓰러질 때까지 이어지므로, 앞길(가장 높은 열린 단계)을 두 번 밀어도 더 열리지 않으면 막힌 것으로 보고
   6시간 동안은 시간당 벌이(수련치 + 은자 2배)가 가장 좋았던 단계에서 사냥하며 힘을 기른 뒤 다시 민다 */
const AI_FRONT = { key: '', tries: 0, at: 0 };
/* 사냥 · 토벌 자리 사다리: 모든 탐험지의 1~9단계를 한 줄로 세우고(낮은 땅 → 높은 땅), 이미 돌파한 곳 안에서
   강호행이 토벌 한 번(SUBQ.kills)도 못 채우고 쓰러지면 한 칸 내려가고, 세 번 몫을 넘게 버티면 한 칸 올라간다.
   이렇게 '버티면서 가장 높은 땅'이 곧 시간당 벌이가 가장 좋은 자리다 */
const AI_LADDER = () => ZONE_ORDER.filter(z => zoneUnlocked(z)).flatMap(z => Array.from({ length: Math.min(stageCleared(z), STAGE.count - 1) }, (_, k) => ({ zone: z, stage: k + 1 })));
const AI_FARM = { pos: -1, seen: 0 };
function aiFarmStage() {
  const L = AI_LADDER(); if (!L.length) return { zone: S.expedition.zone, stage: 1, farm: true };
  for (const r of S.expeditions) if (!r.live && r.endAt && r.id > AI_FARM.seen) {   // 끝난 사냥 · 토벌 강호행으로 자리를 고친다
    AI_FARM.seen = r.id; if (!r.farm) continue;
    if (r.wins < SUBQ.kills) AI_FARM.pos--; else if (r.wins >= SUBQ.kills * 3) AI_FARM.pos++;
  }
  const live = activeRun();                          // 쓰러지지 않는 사냥은 끝나지 않으므로, 세 번 몫을 넘게 버티면 그 자리에서 한 칸 올린다
  if (live && live.farm) { const w = live.battles.filter(b => b.win).length; if (w - (live.aiBase || 0) >= SUBQ.kills * 3) { live.aiBase = w; AI_FARM.pos++; } }
  AI_FARM.pos = AI_FARM.pos < 0 ? (AI_FARM.init ? 0 : L.length - 1) : Math.min(AI_FARM.pos, L.length - 1); AI_FARM.init = 1;   // 처음엔 가장 높은 곳부터
  return { ...L[AI_FARM.pos], farm: true };
}
function aiTarget(note) {
  const X = S.expedition, front = stageMax(X.zone), key = X.zone + ':' + front, t = now();
  if (AI_FRONT.key !== key) { AI_FRONT.key = key; AI_FRONT.tries = 0; }   // 새 단계가 열렸다
  if (AI_FRONT.tries >= 2 && t - AI_FRONT.at < 6 * AI_HOUR) { const tg = aiFarmStage(); note(`사냥터: ${ZONES[tg.zone].name} ${tg.stage}단계 (앞길 ${front}단계가 막혀 힘을 기름)`); return tg; }
  if (AI_FRONT.tries >= 2) AI_FRONT.tries = 0;               // 쉬었으니 다시 민다
  if (stageCleared(X.zone) >= STAGE.count) return aiFarmStage();   // 다 평정했고 다음 땅이 없으면 (두목만 거듭 치지 않고) 사냥
  return { zone: X.zone, stage: front, push: true };
}
/* 한 시각마다 강호행을 원하는 자리로 옮긴다 (유저가 단계를 바꾸는 것과 같다) */
function aiDrive(t, note) {
  if (!subqCur() && subqLeft()) { const f = aiFarmStage(); acceptSubq(f.zone, f.stage); }   // 토벌은 사다리의 지금 자리(버티는 가장 높은 땅)로 받는다
  const q = subqCur(), want = q ? { zone: q.zid, stage: q.n } : aiTarget(note);
  S.expedition.auto = !!want.push;                           // 앞길을 밀 때만 이기며 올라간다
  let run = activeRun();
  if (run && run.zone !== want.zone) { recallRun(t); run = null; }
  if (!run) {
    if (S.expedition.zone !== want.zone) setDestination(want.zone);
    if (S.hp < calcStats().maxHp * .7 && (arinFree() || S.silver >= ARIN_CARE + AI_RESERVE)) arinCare();   // 쓰러져 반만 찬 채로 나가지 않는다: 아린의 죽 (하루 첫 그릇 공짜, 그 뒤 10냥)
    S.expedition.stage = want.stage; const nr = startRun(t); if (nr) nr.farm = !want.push;
    if (want.push) { AI_FRONT.tries++; AI_FRONT.at = t; }
  } else if (want.push ? run.stage < want.stage : run.stage !== want.stage) {
    stageGo(run, want.stage, t);
    if (want.push) { AI_FRONT.tries++; AI_FRONT.at = t; }
  }
}

/* 소성 돌파단을 기다리면 (아는 유저처럼) 일부러 연단을 그르쳐 찌꺼기를 만들고 무신상에 공양해 돌파단을 노린다.
   한 시각에 찌꺼기 6개(공양 2번)까지, 생혈고 값(AI_RESERVE)은 남긴다. 돌파단이 나오면 true */
function aiPrayForPill(note) {
  let n = 0;
  while (n < 6 && S.mp >= craftCost('alchemy') && (has('herb') || (S.silver >= 6 + AI_RESERVE && buyItem('herb')))) { doCraft('alchemy', { herb: 1 }); n++; }
  const k = Math.floor(count('slag') / GACHA.cost); if (!k) return false;
  const before = count('pillLow'); pray(k);
  const got = count('pillLow') > before;
  note(`무신상 공양 ${k}번 (돌파단을 노림)${got ? ' — 소성 돌파단!' : ''}`);
  return got;
}

/* 가르침이 무신상 공양을 바라면, 전방에서 산 약재 하나로 일부러 연단을 그르쳐 검게 탄 찌꺼기를 만든다 (아는 유저의 방법) */
function aiSlag(note) {
  const q = QUESTS[questIndex()]; if (!q || !/공양/.test(q.t) || q.done()) return;
  const need = (10 - ((S.shrine && S.shrine.pulls) || 0)) * GACHA.cost - count('slag'); let n = 0;
  while (n < need && S.mp >= craftCost('alchemy') && (has('herb') || (S.silver >= 6 + AI_RESERVE && buyItem('herb')))) { doCraft('alchemy', { herb: 1 }); n++; }
  if (n) note(`공양 준비: 일부러 연단을 그르쳐 찌꺼기 ${n}개`);
}

/* N일 자동 플레이. onDay(report, dayIndex)로 하루씩 알린다. 끝나면 시계를 지금으로 돌린다 */
function aiRun(days, patternKey = 'life') {
  const P = AI_PATTERNS[patternKey] || AI_PATTERNS.life;
  const hours = days * 24, start = Date.now();
  const report = { days, pattern: P.name, startedAt: start, before: aiSnapshot(), daily: [], notes: [], after: null };
  Bus.mute(true); AI_FRONT.key = ''; AI_FRONT.tries = 0; AI_FARM.pos = -1; AI_FARM.init = 0; AI_FARM.seen = Math.max(0, ...S.expeditions.map(r => r.id));
  try {
    // 진행 중인 강호행은 지금(실제 시각)에 귀환시키고 시작한다. 그대로 두면 다음 걸음 시각이 '지금'이라 N일 전으로 돌린 시계에서는
    // 끝까지 오지 않아, 강호행 · 수련치 · 토벌이 하나도 진행되지 않았다 (10월 2일, 7일 돌려도 0탐험)
    if (activeRun()) { recallRun(now()); report.notes.push({ t: now(), day: 1, text: 'AI 시작: 진행 중이던 강호행을 귀환시키고 새로 떠남' }); }
    CLOCK.shift = -hours * AI_HOUR;
    if (!S.expedition.zone) S.expedition.zone = ZONE_ORDER[0];
    let day = null;
    const mark = new Set(S.expeditions.filter(r => !r.live).map(r => r.id));
    const tally = d => { for (const r of S.expeditions) if (!r.live && !mark.has(r.id)) { mark.add(r.id); d.runs++; d.wins += r.wins; d.losses += r.losses; d.defeats += r.defeats; d.bosses += r.battles.filter(b => b.boss && b.win).length; } };
    for (let h = 0; h <= hours; h++) {
      CLOCK.shift = -(hours - h) * AI_HOUR;
      const t = now(), hr = new Date(t).getHours(), di = Math.min(days - 1, Math.floor(h / 24));
      if (!day || day.i !== di) { if (day) { tally(day); report.daily.push({ ...day, end: aiSnapshot() }); } day = { i: di, label: `${di + 1}일째`, runs: 0, wins: 0, losses: 0, defeats: 0, bosses: 0 }; }
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
  log(`🤖 AI 자동 플레이 ${days}일 (${P.name}) — 투력 ${fmt(report.before.cp)} → ${fmt(report.after.cp)}, 무공 ${report.before.star}성 → ${report.after.star}성`, 'gold');
  notify.refresh(); notify.save();
  return report;
}
