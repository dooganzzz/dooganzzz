/* [시스템] 강호행: 유저가 [강호행 시작]을 누르면 제자가 탐험지로 나가 쓰러지거나 귀환할 때까지 조우를 이어 간다 (DOM 조작 금지)
   유저는 떠나기 전에 탐험지·무공·장비·생혈고를 갖춰 둔다. 구역의 적정 투력은 알려 주지 않는다 — 다녀온 경험(S.zoneLog)만 쌓인다.
   기록은 최근 EXPEDITION.keep번만 남긴다 (오래된 것부터 지움). 전투는 합마다 기록해 견문록 [관찰하기]로 다시 본다. */

function zoneUnlocked(zid) { const u = ZONES[zid].unlock; return !u || !!S.flags[u.boss]; }

/* 가중치 표에서 하나 고르기: { key: weight } */
/* 지형 상성: 장착 경공의 지형이 구역 지형(복합) 중 하나라도 맞으면 기력 소모 -20%, 하나도 안 맞으면 +20%, 경공이 없으면 보정 없음 */
/* 걸음 간격: 장착 경공 경지가 높을수록 조금 짧다 */
function stepMsNow() { const id = S.active.gyeonggong, g = id && MANUALS[id] && MANUALS[id].grade; return Math.round(EXPEDITION.stepMs * ((g && EXPEDITION.stepGrade[g]) || 1)); }
function myTerrain() { const id = S.active.gyeonggong; return (id && MANUALS[id] && MANUALS[id].terrain) || null; }
function terrainMult(zid) { const t = myTerrain(), Z = ZONES[zid]; if (!t || !Z || !Z.terrain) return 1; return Z.terrain.includes(t) ? AFFINITY.terrainMatch : AFFINITY.terrainMiss; }

function weighted(table) {
  let r = Math.random() * Object.values(table).reduce((a, b) => a + b, 0);
  for (const [k, w] of Object.entries(table)) { r -= w; if (r < 0) return k; }
  return Object.keys(table)[0];
}

/* ───────── 스테이지 ───────── */
/* 탐험지 요수를 약한 순서로 (활력 × 공격 × 방어 보정) */
const foePower = e => { const E = ENEMIES[e]; return E.hp * E.atk * (1 + E.def / 50); };
function zoneLadder(zid) { return ZONES[zid].enemies.filter(e => ENEMIES[e]).sort((a, b) => foePower(a) - foePower(b)); }
const stageName = (zid, n) => `${ZONES[zid].name} ${(STAGE_NAMES[zid] || [])[n - 1] || `${n}단계`}`;
const stageCleared = zid => (S.stages || {})[zid] || 0;
/* 고를 수 있는 가장 높은 단계: 돌파한 단계의 다음 (10단계까지) */
const stageMax = zid => Math.min(STAGE.count, stageCleared(zid) + 1);
const stageNeed = n => n >= STAGE.count ? 1 : STAGE.kills;
/* n단계의 요수: n번째로 약한 요수를 주로(newFoe), 바로 앞 단계 요수를 가끔. 10단계는 두목 */
function stageFoes(zid, n) {
  if (n >= STAGE.count) return [ZONES[zid].boss];
  const L = zoneLadder(zid), i = Math.min(L.length - 1, n - 1);
  return i > 0 ? [L[i], L[i - 1]] : [L[0]];
}
function pickStageFoe(zid, n) { const f = stageFoes(zid, n); return f.length > 1 && Math.random() >= STAGE.newFoe ? f[1] : f[0]; }

/* ───────── 사냥터 사건 (기연) ───────── */
function eventPool(zid) { return EVENTS.filter(e => e.zones === 'all' || e.zones.includes(zid)); }

/* 선택지 조건: 부족하면 이유를 돌려준다 */
function reqFail(req) {
  if (!req) return '';
  if (req.item && !has(req.item[0], req.item[1])) return `${ITEMS[req.item[0]].name} ${req.item[1]}개 필요`;
  if (req.silver && S.silver < req.silver) return `은자 ${req.silver}냥 필요`;
  if (req.bag && bagUsed() >= bagCap()) return '행낭이 가득 참';
  if (req.stamina && S.stamina < req.stamina) return `기력 ${req.stamina} 필요`;
  if (req.stat && calcStats()[req.stat[0]] < req.stat[1]) return `${STAT_NAMES[req.stat[0]]} ${req.stat[1]} 이상`;
  if (req.star && bestMugongStar() < req.star) return `무공 ${req.star}성 이상`;
  return '';
}

const reqLabel = req => !req ? '' : req.item ? `${ITEMS[req.item[0]].name} ×${req.item[1]}` : req.silver ? `은자 ${req.silver}냥` : req.stamina ? `기력 ${req.stamina}` : req.stat ? `${STAT_NAMES[req.stat[0]]} ${req.stat[1]}+` : req.star ? `무공 ${req.star}성+` : '';

/* 사건 결과 적용. 받은 것을 사람이 읽을 문장 목록으로 돌려준다 */
function applyFx(fx) {
  const out = [], st = calcStats();
  if (fx.silver) { S.silver = Math.max(0, S.silver + fx.silver); out.push(`${fx.silver > 0 ? '+' : ''}은자 ${fx.silver}냥`); }
  for (const [id, n] of Object.entries(fx.items || {})) if (give(id, n, true)) out.push(`${ITEMS[id].icon} ${ITEMS[id].name} ×${n}`);
  if (fx.named && giveGear(makeNamedGear(fx.named), true)) out.push(`[하급] ${GEAR_DB[fx.named].name}`);
  if (fx.hpPct) { const d = Math.round(st.maxHp * fx.hpPct); S.hp = clamp(S.hp + d, 1, st.maxHp); out.push(`활력 ${d > 0 ? '+' : ''}${d}`); }
  if (fx.stamina < 0) S.stamina = Math.max(0, S.stamina + fx.stamina);   // 기력은 숨겨진 능력치: 깎이기만 하고 회복되지 않는다
  if (fx.contrib) { S.contrib += fx.contrib; out.push(`문파 공헌도 +${fx.contrib}`); }
  if (fx.exp) { const v = expGain(fx.exp, st); S.exp += v; out.push(`수련치 +${v}`); }
  if (fx.buff) { S.buffs = S.buffs.filter(b => b.key !== fx.buff.key); S.buffs.push({ key: fx.buff.key, val: fx.buff.val, name: fx.buff.name }); out.push(`${fx.buff.name} (이번 탐험 동안)`); }
  for (const [k, v] of Object.entries(fx.perm || {})) { S.perm[k] += v; out.push(`${STAT_NAMES[k]} 영구 +${v}`); }
  if (fx.book) { const books = STARTERS.filter(id => !S.manuals[id] && !has('bk_' + id)); if (books.length) { const b = pick(books); give('bk_' + b, 1, true); out.push(`📘 《${MANUALS[b].name}》 비급`); } }
  if (fx.gear) { const it = makeGear(pick(Object.keys(EQUIP_BASES)), fx.gear[0], fx.gear[1], false); if (giveGear(it, true)) out.push(`🗡️ [${RARITY[it.rarity].name}] ${it.name}`); }
  if (out.length) log(`↳ ${out.map(hlItem).join(', ')}`, 'loot');
  clampVitals();
  return out;
}

/* 금고: 은자 궤·약재 궤·철물 궤·식재 궤·비급/장비 궤 중 하나 */
function openVault(Z) {
  let r = Math.random() * VAULTS.reduce((a, v) => a + v.w, 0), v = VAULTS[0];
  for (const x of VAULTS) { r -= x.w; if (r < 0) { v = x; break; } }
  log(`🔓 금고를 열자 ${v.icon} ${hlItem(v.name)}${jo(v.name, '이가')} 나왔습니다.`, 'good');
  const t = Z.tier;
  const R = EXPEDITION.rewardMult;
  if (v.name === '은자 궤') giveSilver(Math.max(1, Math.round(rint(15, 35) * t * R)));
  if (v.name === '약재 궤') {                         // 연단 재료 다량
    for (const [id, , , p = 1] of Z.herb.filter(r => ITEMS[r[0]].craftType === 'alchemy')) if (Math.random() < p * EXPEDITION.dropMult * 5) give(id, 1);   // 1개씩, 드물게 (표의 확률 × 0.5)
  }
  if (v.name === '철물 궤') {                         // 주조 재료 다량
    for (const [id, , , p = 1] of Z.mine.filter(r => ITEMS[r[0]].craftType === 'forge')) if (Math.random() < p * EXPEDITION.dropMult * 5) give(id, 1);
  }
  if (v.name === '비급/장비 궤') {                    // 희귀: 아직 익히지 않은 삼류 비급(공양 비급 목록), 없으면 장비
    const books = GACHA.books.filter(id => !S.manuals[id] && !has('bk_' + id));
    if (books.length && Math.random() < 0.6) give('bk_' + pick(books), 1);
    else giveGear(dropGear(t, 0));
  }
  return v;
}

/* ───────── 탐험 한 걸음 ───────── */
function stepBattle(rec, eid, bonus) {
  const b = fight(eid, { bonus });
  if (b.win) { const st = calcStats(); S.hp = Math.min(st.maxHp, S.hp + Math.round(st.maxHp * (EXPEDITION.breathe + (st.breathe || 0) / 100))); }   // 숨 고르기 (흑사 요대 등)
  rec.battles.push({ eid, seen: true, name: b.name, boss: b.boss, win: b.win, fled: !!b.fled, intro: b.intro, start: b.start, rounds: b.rounds, exp: b.exp, silver: b.silver, cause: b.cause || null });
  const res = b.win ? '승리' : b.fled ? '무승부' : '패배';
  return { t: `${b.boss ? '👹' : '⚔️'} ${josa(b.name, '과와')} 전투에서 ${res}${b.cause ? ` — ${b.cause}` : ''}`, enc: `${b.boss ? '👹' : '⚔️'} ${josa(b.name, '과와')} 조우했습니다`, cls: b.win ? (b.boss ? 'gold' : 'good') : 'bad', b: rec.battles.length - 1, lost: !b.win && !b.fled };
}
function stepVault(Z) {
  const v = openVault(Z);
  return { t: `🔓 금고를 열었습니다 — ${v.icon} ${v.name}`, cls: 'loot' };
}
function stepTrap() {
  const st = calcStats(), hpLoss = Math.max(1, Math.round(st.maxHp * TRAP.hpPct));
  S.hp = Math.max(1, S.hp - hpLoss); S.stamina = Math.max(0, S.stamina - TRAP.stamina);
  log(`🪤 ${TRAP.text} 활력 -${hpLoss}`, 'bad');
  return { t: `🪤 ${TRAP.text} (활력 -${hpLoss})`, cls: 'bad' };
}
function stepGimmick(Z) {
  const st = calcStats(), g = Z.gimmick;
  if (st[g.stat] < g.need) { log(`${g.name}: ${g.fail}`, 'muted'); return { t: `⚙️ ${g.name} — 힘이 모자라 지나쳤습니다`, cls: 'muted' }; }
  log(`${g.name}: ${g.text}`, 'good');
  for (const [id, a, b] of g.reward) { if (id === 'silver') giveSilver(Math.max(1, Math.round(rint(a, b) * EXPEDITION.rewardMult))); else if (Math.random() < EXPEDITION.dropMult * 5) give(id, 1); }
  return { t: `⚙️ ${g.name} — 숨겨진 것을 찾아냈습니다`, cls: 'good' };
}
/* 기연: 만나면 바로 정하지 않고 기연 탭에 쌓아 둔다 — 유저가 나중에 직접 고른다 (S.encounters, 기다리는 것은 ENCOUNTER_KEEP개까지 · ENCOUNTER_TTL이 지나면 사라짐) */
const ENCOUNTER_KEEP = 10, ENCOUNTER_LOG = 10, ENCOUNTER_TTL = 24 * 3600000;
const encLeft = E => E.at + ENCOUNTER_TTL - now();
function stepEncounter(rec, zid, used) {
  const pool = eventPool(zid).filter(e => !used.has(e.id)), ev = pick(pool.length ? pool : eventPool(zid));
  used.add(ev.id);
  S.encounters = (S.encounters || []).filter(e => e.done || encLeft(e) > 0);   // 기한이 지난 기연은 지나갔다
  const at = rec.next || now();
  S.encounters.push({ uid: S.uid++, ev: ev.id, zone: zid, at, wares: ev.wares ? peddlerRoll() : undefined });
  S.encNext = at + rnd(EXPEDITION.encounterGap[0], EXPEDITION.encounterGap[1]);
  const wait = encountersWaiting();
  if (wait.length > ENCOUNTER_KEEP) S.encounters.splice(S.encounters.indexOf(wait[0]), 1);   // 너무 쌓이면 가장 오래된 것은 지나간다
  log(`📜 기연 「${ev.title}」 — ${ev.text}`, 'npc');
  return { t: `📜 기연 「${ev.title}」 — 기연 탭에 쌓였습니다`, cls: 'npc' };
}
/* 약장수 등짐: 종류를 확률로 고르고(kinds), 그 안에서 1가지 — 비급 · 장비는 비쌀수록 드물게, 익혔거나 가진 비급은 빼고 */
function peddlerRoll() {
  const W = PEDDLER_WARES, wpick = (arr, wf) => { const wt = arr.map(wf); let r = Math.random() * wt.reduce((a, b) => a + b, 0), i = 0; while (i < arr.length - 1 && (r -= wt[i]) >= 0) i++; return arr[i]; };
  const K = wpick(W.kinds, k => k.w);
  let w;
  if (K.rare) {
    let pool = K.rare === 'books' ? W.books.filter(([id]) => { const u = ITEMS[id].use; return !(S.manuals[u.learn] || count(id)); }).map(([id, pr]) => ({ id, n: 1, pr })) : [];
    if (!pool.length) pool = W.gear.map(([id, pr]) => ({ id, n: 1, pr, gear: 1 }));   // 비급을 다 익혔으면 장비로
    w = wpick(pool, x => (W.rare / x.pr) ** 2);
  } else { const [id, n, pr] = pick(K.list); w = { id, n, pr }; }
  return [{ ...w, pr: Math.round(w.pr * (1 - W.off)), list: w.pr }];
}
/* 기연의 선택지: 약장수는 등짐 물건을 [손사래] 앞에 끼운다 */
function encChoices(E) {
  const ev = EVENTS.find(x => x.id === E.ev); if (!ev) return [];
  if (!E.wares || !E.wares.length) return ev.choices;
  const sell = E.wares.map(w => { const name = w.gear ? GEAR_DB[w.id].name : ITEMS[w.id].name, n = w.n || 1, what = n > 1 ? `${name} ${n}개` : `${name}${jo(name, '을를')}`;
    return { label: `${what} ${w.pr}냥에 산다 (정가 ${w.list}냥)`, req: { silver: w.pr, bag: 1 }, take: true,
      out: [{ w: 1, text: `약장수가 등짐에서 ${n > 1 ? `${name} ${n}개를` : what} 꺼내 건넵니다.`, fx: w.gear ? { named: w.id } : { items: { [w.id]: n } } }] }; });
  return [...ev.choices.slice(0, -1), ...sell, ev.choices[ev.choices.length - 1]];
}
const encountersWaiting = () => (S.encounters || []).filter(e => !e.done && encLeft(e) > 0);
/* 기연 고르기: 조건 확인 → 값 치르기 → 결과(확률) → 효과 · 싸움. 얻고 잃은 것을 기록해 기연 탭에 남긴다 */
function resolveEncounter(uid, ci) {
  const E = (S.encounters || []).find(e => e.uid === uid && !e.done); if (!E) return null;
  if (encLeft(E) <= 0) return { fail: '기한이 지나 기연이 사라졌습니다' };
  const ev = EVENTS.find(x => x.id === E.ev), ch = encChoices(E)[ci]; if (!ch) return null;
  const why = reqFail(ch.req); if (why) return { fail: why };
  const b = { silver: S.silver, inv: { ...S.inv }, hp: S.hp };
  if (ch.take && ch.req) { if (ch.req.item) take(ch.req.item[0], ch.req.item[1]); if (ch.req.silver) S.silver -= ch.req.silver; }
  let r = Math.random() * ch.out.reduce((a, o) => a + o.w, 0), out = ch.out[0];
  for (const o of ch.out) { r -= o.w; if (r < 0) { out = o; break; } }
  log(`📜 「${ev.title}」 ▸ ${ch.label} — ${out.text}`, 'npc');
  applyFx(out.fx || {});
  let fightRes = null;
  if (out.fight) { const f = fight(out.fight, { bonus: out.bonus }); if (S.hp < 1) S.hp = 1; fightRes = `${josa(f.name, '과와')} 싸워 ${f.win ? '이겼습니다' : '졌습니다'}`; }
  const items = invDelta(b.inv);
  E.done = { ci, label: ch.label, text: out.text, fight: fightRes, gear: out.fx && out.fx.named ? GEAR_DB[out.fx.named].name : '', silver: S.silver - b.silver, hp: Math.round(S.hp - b.hp), items, at: now() };
  const doneList = S.encounters.filter(e => e.done); while (doneList.length > ENCOUNTER_LOG) S.encounters.splice(S.encounters.indexOf(doneList.shift()), 1);
  notify.refresh(); notify.save();
  return E.done;
}

/* ───────── 강호행: [강호행 시작]을 누르면 쓰러지거나 귀환할 때까지 쭉 이어진다 ─────────
   걸음은 EXPEDITION.stepMs마다 하나(전투 · 금고 · 기연 · 덫 · 장치). 활력은 걸음 사이에 차지 않는다 —
   이기면 숨을 조금 고르고(breathe), 위급하면 생혈고를 스스로 바른다. 전투에서 지면 쓰러지고 강호행은 거기서 끝난다.
   기력은 달리는 동안 닳고(EXPEDITION.run, 경공 지형 상성 · 기력 소모 감소 반영), 다 닳으면 걸으며 차오른다 — 걷는 동안은 걸음이 느리다. 기력단을 먹으면 곧바로 다시 달린다.
   자리를 비워도 이어지고(최대 EXPEDITION.catchUp만큼 따라잡음), 얻은 것은 보관했다가 끝난 뒤 [최종보상확인]으로 받는다.
   전투는 실시간 강호행 무대에서 기록 그대로 재생되고, 견문록에는 결과와 [관찰](전투 장면 · 합 로그)이 남는다 */
const findExpedition = id => S.expeditions.find(r => r.id === id);
function activeRun() { const id = S.expedition && S.expedition.run, r = id != null ? findExpedition(id) : null; return r && r.live ? r : null; }
/* 행낭이 전과 견줘 얼마나 바뀌었나 ({아이템: 늘어난 수(줄면 음수)}) */
function invDelta(before) { const d = {}; for (const id of new Set([...Object.keys(S.inv), ...Object.keys(before)])) { const n = (S.inv[id] || 0) - (before[id] || 0); if (n) d[id] = n; } return d; }
const runSnap = () => ({ silver: S.silver, exp: S.exp, contrib: S.contrib, inv: { ...S.inv }, gear: S.gear.length, hp: S.hp });
/* 한 걸음에서 얻은 것은 보관함(pend)으로 옮기고, 쓴 것(생혈고 등)은 쓴 채로 둔다 */
function holdStep(rec, b) {
  const g = rec.gain, P = rec.pend, one = { items: {} };       // one = 이 걸음에서 얻은 것 (무대에 '+1'로 띄움)
  for (const k of ['silver', 'exp', 'contrib']) { const d = S[k] - b[k]; if (d > 0) { S[k] -= d; P[k] += d; if (k === 'silver') one.silver = d; } g[k] += d; }
  for (const [id, d] of Object.entries(invDelta(b.inv))) {
    if (d > 0) { take(id, d); P.items[id] = (P.items[id] || 0) + d; g.items[id] = (g.items[id] || 0) + d; one.items[id] = d; }
    else if (d < 0) g.used[id] = (g.used[id] || 0) - d;
  }
  const ng = S.gear.slice(b.gear);
  if (ng.length) { S.gear = S.gear.slice(0, b.gear); P.gear.push(...ng); g.gear.push(...ng.map(it => `[${RARITY[it.rarity].name}] ${it.name}`)); one.gear = ng.length; }
  return one;
}
function startRun(t = now()) {
  const X = S.expedition; if (!X.zone || !zoneUnlocked(X.zone) || activeRun()) return null;
  const zid = X.zone, Z = ZONES[zid], st = calcStats(), tm = terrainMult(zid);
  if (S.hp <= 0) S.hp = st.maxHp;                                  // 출발할 때 따로 채우지 않는다 (쓰러졌다 오면 반만 회복한 채로)
  const stage = clamp(X.stage || 1, 1, stageMax(zid));
  const rec = { id: S.uid++, at: t, zone: zid, stage, startStage: stage, kills: 0, live: true, mode: S.stamina > 0 ? 'run' : 'walk', staAt: t, next: t + EXPEDITION.firstMs, steps: [], battles: [], used: [],
    gain: { silver: 0, exp: 0, contrib: 0, items: {}, used: {}, gear: [] }, pend: { silver: 0, exp: 0, contrib: 0, items: {}, gear: [] },
    defeats: 0, villages: 0, rests: 0, wins: 0, losses: 0,
    terrain: { zone: [...(Z.terrain || [])], mine: myTerrain(), match: tm < 1 ? true : tm > 1 ? false : null, mult: Math.round(tm * (1 - (st.staSave || 0) / 100) * 1000) / 1000, extra: 0 } };
  X.run = rec.id; S.expeditions.push(rec);
  // 기록은 최근 EXPEDITION.keep번만 (받지 않은 보상이 있는 기록은 남긴다)
  while (S.expeditions.length > EXPEDITION.keep) { const i = S.expeditions.findIndex(r => !r.live && (!r.pend || r.claimed)); if (i < 0) break; S.expeditions.splice(i, 1); }
  log(`⛰️ ${josa(stageName(zid, stage), '으로')} 강호행을 떠납니다. ${pick(EXP_TEXT.depart)}`, 'place', t);
  notify.refresh(); notify.save();
  return rec;
}
function runStep(rec, t) {
  const W = EXPEDITION, zid = rec.zone, Z = ZONES[zid], st0 = calcStats();
  const mult = terrainMult(zid) * (1 - (st0.staSave || 0) / 100);
  const b = runSnap(); let k, r;
  RT.journal = [];
  try {
    if (rec.stage >= STAGE.count) {                                // 10단계: 두목과 맞선다
      k = 'boss';
      r = stepBattle(rec, Z.boss);
    } else {
      k = weighted(t < (S.encNext || 0) ? { ...W.weights, event: 0 } : W.weights);   // 기연은 하루 1~2번
      if (k === 'event') { const used = new Set(rec.used); r = stepEncounter(rec, zid, used); rec.used = [...used]; if (rec.used.length >= eventPool(zid).length) rec.used = []; }
      else r = k === 'beast' ? stepBattle(rec, pickStageFoe(zid, rec.stage)) : k === 'vault' ? stepVault(Z) : k === 'trap' ? stepTrap() : stepGimmick(Z);
    }
  } finally { r = r || {}; rec.steps.push({ k, at: t, t: r.t, enc: r.enc, cls: r.cls || '', b: r.b, d: RT.journal || [] }); RT.journal = null; }
  const one = holdStep(rec, b);
  const si = rec.steps.length - 1, s = rec.steps[si];
  s.stage = rec.stage;
  if (s.b === undefined) {                                     // 기믹 걸음: 무대에 보일 얻은 것 · 잃은 활력
    if (Object.keys(one.items).length || one.silver || one.gear) s.g = one;
    const dh = Math.round(S.hp - b.hp); if (dh < 0) s.dh = dh;
    const ds = Math.round(S.silver - b.silver); if (ds < 0) s.ds = ds;   // 기연에서 쓴 은자
  }
  log(`${stepText(rec, s)}`, `exp-step ${s.b !== undefined ? '' : s.cls}`, t, { r: rec.id, s: si });
  if (r.b !== undefined && rec.battles[r.b].win && (k === 'beast' || k === 'boss')) { subqAdd(zid, rec.stage); rec.kills++; if (rec.kills >= stageNeed(rec.stage)) stageClear(rec, t); }   // 서브 퀘스트(단계 토벌) 진행
  if (r.lost) { rec.defeats = 1; s.d.push({ text: EXP_TEXT.defeat, cls: 'bad' }); endRun(rec, t, 'dead'); }
  return s;
}
/* 단계 돌파: 처음이면 보상 · 다음 단계가 열린다. 자동 진행이면 올라가고, 아니면 머물며 계속 사냥한다 */
function stageClear(rec, t) {
  const zid = rec.zone, n = rec.stage, Z = ZONES[zid], first = n > stageCleared(zid);
  rec.kills = 0; rec.cleared = rec.cleared || []; rec.cleared.push(n);
  if (first) {
    S.stages = S.stages || {}; S.stages[zid] = n;
    const silver = Math.round(STAGE.firstSilver * n * Z.tier), exp = Math.round(STAGE.firstExp * n * Z.tier);
    S.silver += silver; S.exp += exp; give('saenghyeol', STAGE.firstPot, true);
    rec.steps[rec.steps.length - 1].d.push({ text: `🏯 ${stageName(zid, n)} 첫 돌파 — 은자 ${silver} · 수련치 ${exp} · 생혈고 ${STAGE.firstPot}`, cls: 'gold' });
    log(`🏯 ${stageName(zid, n)}${n >= STAGE.count ? '의 두목을 쓰러뜨려 탐험지를 평정했습니다' : '을 돌파했습니다'}! 첫 돌파 보상: ${hlSilver(silver)} · 수련치 +${exp} · 생혈고 ${STAGE.firstPot}`, 'gold', t);
  }
  if (n < STAGE.count && S.expedition.auto !== false) stageGo(rec, n + 1, t);
  // 두목은 한 강호행에 한 번: 쓰러뜨리면 굴을 나와 9단계로 (다시 맞서려면 새 강호행을 10단계에서)
  else if (n >= STAGE.count) { rec.stage = STAGE.count - 1; rec.kills = 0; S.expedition.stage = STAGE.count - 1; log(`⛰️ 두목의 굴을 나와 ${josa(stageName(zid, STAGE.count - 1), '으로')} 내려옵니다. 두목에게 다시 맞서려면 새 강호행을 10단계에서 떠나십시오.`, 'place', t); }
}
function stageGo(rec, n, t = now()) {
  if (!rec || !rec.live || n < 1 || n > stageMax(rec.zone) || n === rec.stage) return false;
  const up = n > rec.stage;
  rec.stage = n; rec.kills = 0; S.expedition.stage = n;
  log(`⛰️ ${josa(stageName(rec.zone, n), '으로')} ${up ? '올라갑니다' : '내려갑니다'}.`, 'place', t);
  notify.refresh();
  return true;
}
/* 강호행 끝: dead = 쓰러짐 · recall = 귀환 */
function endRun(rec, t, why) {
  if (!rec || !rec.live) return;
  rec.live = false; rec.endAt = t; rec.end = why; delete rec.next;
  rec.wins = rec.battles.filter(b => b.win).length; rec.losses = rec.battles.filter(b => !b.win && !b.fled).length;
  rec.terrain.extra = Math.round(rec.terrain.extra * 10) / 10;
  if (S.expedition.run === rec.id) S.expedition.run = null;
  S.buffs = []; S.staAt = t;                                       // 증강 단약 효과는 이번 강호행으로 끝 · 기력은 그대로 (산문에서 천천히 찬다)
  { const st = calcStats(), k = why === 'dead' ? .5 : 1;          // 귀환하면 몸을 추스르고, 쓰러지면 실려 와 반만 회복한다
    S.hp = Math.max(1, Math.round(st.maxHp * k)); S.mp = Math.round(st.maxMp * k); }
  // 쓰러지면 다음 출발 단계를 한 단계 낮춘다 (아래에서 토벌 임무를 채우며 생혈고 · 은자를 모으고 다시 오르도록)
  if (why === 'dead' && S.expedition.zone === rec.zone) { const back = Math.max(1, rec.stage - 1); S.expedition.stage = back; rec.backTo = back; }
  const zid = rec.zone, zl = S.zoneLog[zid] = S.zoneLog[zid] || { trips: 0, wins: 0, losses: 0, defeats: 0, retreats: 0, seen: {}, bossMet: 0, bossWon: 0, lastAt: 0 };
  zl.trips++; zl.wins += rec.wins; zl.losses += rec.losses; zl.lastAt = t; zl.defeats += rec.defeats;
  for (const b of rec.battles) { zl.seen[b.eid] = (zl.seen[b.eid] || 0) + 1; if (b.boss) { zl.bossMet++; if (b.win) zl.bossWon++; } }
  const g = rec.gain, items = Object.entries(g.items).map(([id, n]) => `${ITEMS[id].name} ×${n}`);
  log(`${why === 'dead' ? '💀' : '🏯'} ${stageName(zid, rec.stage)}에서 ${why === 'dead' ? '쓰러져 실려 돌아왔습니다' : '스스로 돌아왔습니다'}${rec.cleared && rec.cleared.length ? ` · 돌파 ${rec.cleared.length}번` : ''} · ${rec.wins}승 ${rec.losses}패 · ${hlSilver(Math.max(0, rec.pend.silver))}${rec.pend.exp ? ` · 수련치 +${fmt(rec.pend.exp)}` : ''}${items.length ? ` · ${hlItem(items.slice(0, 3).join(', ') + (items.length > 3 ? ` 외 ${items.length - 3}종` : ''))}` : ''}`, 'exp-head', t, { r: rec.id });
  if (rec.backTo && rec.backTo < rec.stage) log(`↳ 다음 강호행은 한 단계 아래 ${stageName(zid, rec.backTo)}에서 시작합니다. 토벌 임무를 채우며 생혈고와 은자를 모으고 다시 오르십시오. (강호행 탭 단계 줄에서 바꿀 수 있습니다)`, 'muted', t);
  notify.trace('sys', `강호행 ${zid} 끝(${why}): ${rec.steps.length}걸음 · ${rec.wins}승 ${rec.losses}패 · 은자 ${rec.pend.silver} · 수련치 ${rec.pend.exp}`);
  notify.refresh(); notify.save();
}
function recallRun(t = now()) { const rec = activeRun(); if (rec) endRun(rec, t, 'recall'); return rec; }
/* 시각 t까지 밀린 걸음을 차례로 치른다 (자리를 비운 시간은 EXPEDITION.catchUp까지만 따라잡는다) */
/* 기력: 달리는 동안 닳고(지형 · 기력 소모 감소 반영), 다 닳으면 걷기로 바뀌어 차오르고, 가득 차면 다시 달린다 */
function staTick(rec, t) {
  if (rec.staAt === undefined) { rec.staAt = t; rec.mode = rec.mode || 'run'; }
  let dt = t - rec.staAt; if (dt <= 0) return; rec.staAt = t;
  const st = calcStats(), max = st.maxSta || 100, R = EXPEDITION.run, mult = terrainMult(rec.zone) * (1 - (st.staSave || 0) / 100);
  for (let g = 0; dt > 0 && g < 100; g++) {
    if (rec.mode !== 'walk') {
      const rate = max / R.drainMs * mult, need = S.stamina / rate, used = Math.min(dt, need) * rate;
      rec.terrain.extra += used * (1 - 1 / terrainMult(rec.zone));   // 지형 상성 때문에 더 쓴(+) · 아낀(-) 기력
      if (dt < need) { S.stamina -= dt * rate; dt = 0; } else { dt -= need; S.stamina = 0; rec.mode = 'walk'; rec.walks = (rec.walks || 0) + 1; log('🚶 기력이 다해 걸음을 늦춥니다. 기력이 차면 다시 달립니다.', 'muted', t - dt); }
    } else {
      const rate = max / R.regenMs, need = (max - S.stamina) / rate;
      if (dt < need) { S.stamina += dt * rate; dt = 0; } else { dt -= need; S.stamina = max; rec.mode = 'run'; log('🏃 기력이 돌아와 다시 달립니다.', 'muted', t - dt); }
    }
  }
}
/* 강호행 중이 아닐 때: 산문에서 기력이 걷기와 같은 빠르기(EXPEDITION.run.regenMs)로 차오른다 */
function restTick(t) {
  const max = calcStats().maxSta || 100, from = S.staAt || t; S.staAt = t;
  if (t > from && S.stamina < max) S.stamina = Math.min(max, S.stamina + (t - from) * max / EXPEDITION.run.regenMs);
}
function advanceRun(t = now()) {
  const rec = activeRun(); if (!rec) { restTick(t); return null; }
  const W = EXPEDITION; let n = 0;
  if (t - rec.next > W.catchUp) { log(`⌛ 자리를 오래 비워 ${Math.round((t - rec.next - W.catchUp) / 3600000)}시간 남짓은 그냥 흘러갔습니다. (최대 ${W.catchUp / 3600000}시간까지 이어집니다)`, 'muted', rec.next); rec.next = t - W.catchUp; }
  while (rec.live && rec.next <= t && n++ < 5000) {
    const at = rec.next; staTick(rec, at); runStep(rec, at);
    if (rec.live) rec.next = at + stepMsNow() * (rec.mode === 'walk' ? W.run.walkStep : 1);   // 걷는 동안은 걸음이 느리다
  }
  if (rec.live) staTick(rec, t);
  if (n) { notify.refresh(); notify.save(); }
  return n ? rec : null;
}

/* 목적지 정하기. 강호행 중이면 다음 강호행부터 그곳으로 간다 */
function setDestination(zid) {
  if (!ZONES[zid] || !zoneUnlocked(zid)) return false;
  const X = S.expedition; if (X.zone === zid) return false;
  X.zone = zid; X.stage = stageMax(zid);
  log(`🧭 탐험지를 ${josa(ZONES[zid].name, '으로')} 정했습니다.${activeRun() ? ' 지금 강호행을 마치면 다음부터 그곳으로 갑니다.' : ' 강호행 탭에서 [강호행 시작]을 누르면 길을 떠납니다.'}`, 'place');
  notify.refresh();
  return true;
}

/* 실시간 강호행 보기: 걸음은 일어나는 즉시 드러난다 */
function stepAt(rec, i) { const s = rec.steps[i]; return (s && s.at) || rec.at; }
function liveDone(rec) { return !rec || !rec.live; }
/* 지금 지켜보는 강호행: 진행 중인 것, 없으면 가장 최근 것 */
function liveRec() { return activeRun() || (S.expeditions.length ? S.expeditions[S.expeditions.length - 1] : null); }
/* 전투 결과: 관찰하기로 본 전투만 결과가 적힌다 */
function battleSeen(rec, bi) { const b = rec && rec.battles[bi]; return !b || b.seen !== false; }
function markSeen(rec, bi) { const b = rec && rec.battles[bi]; if (b && b.seen === false) { b.seen = true; notify.save(); } }
function stepText(rec, s) { return s.b !== undefined && !battleSeen(rec, s.b) && s.enc ? s.enc : s.t; }

function pendingRecs() { return S.expeditions.filter(r => r.pend && !r.claimed && !r.live); }
/* 받을 수 있는가: 끝난 강호행에 받지 않은 보상이 있을 때 */
function canClaim() { return pendingRecs().length > 0; }
/* 최종보상확인: 보관한 것을 모두 받는다. 행낭이 차 있어도 버리지 않는다. 받은 것을 돌려준다 */
function claimRewards() {
  const recs = pendingRecs(), sum = { silver: 0, exp: 0, contrib: 0, items: {}, gear: [], n: recs.length };
  for (const r of recs) {
    const P = r.pend;
    S.silver += P.silver; S.exp += P.exp; S.contrib += P.contrib;
    sum.silver += P.silver; sum.exp += P.exp; sum.contrib += P.contrib;
    for (const [id, n] of Object.entries(P.items)) { S.inv[id] = (S.inv[id] || 0) + n; sum.items[id] = (sum.items[id] || 0) + n; }
    for (const it of P.gear) { S.gear.push(it); sum.gear.push(it); }
    r.claimed = true;
  }
  if (recs.length) {
    const items = Object.entries(sum.items).map(([id, n]) => `${ITEMS[id].icon} ${ITEMS[id].name} ×${n}`);
    log(`🏆 강호행에서 얻은 것을 챙겼습니다 — ${hlSilver(sum.silver)}${sum.exp ? ` · 수련치 +${fmt(sum.exp)}` : ''}${sum.contrib ? ` · 공헌 +${sum.contrib}` : ''}${items.length ? ` · ${hlItem(items.join(', '))}` : ''}${sum.gear.length ? ` · 장비 ${sum.gear.length}점` : ''}`, 'gold');
    notify.refresh(); notify.save();
  }
  return sum;
}
