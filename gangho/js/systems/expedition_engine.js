/* [시스템] 자동 탐험: 매시 정각, 제자가 목적지로 나가 기력을 다 쓸 때까지 조우를 겪는다 (DOM 조작 금지)
   유저는 정각 전에 탐험지·무공·장비·소모품을 갖춰 둔다. 구역의 적정 전투력은 알려 주지 않는다 — 다녀온 경험(S.zoneLog)만 쌓인다.
   유저는 목적지만 고른다. 자리를 비운 동안의 탐험은 최대 EXPEDITION.maxQueue번까지 한꺼번에 결산하고,
   기록은 최근 EXPEDITION.keep번만 남긴다 (오래된 것부터 지움). 전투는 합마다 기록해 견문록 [관찰하기]로 다시 본다. */

function zoneUnlocked(zid) { const u = ZONES[zid].unlock; return !u || !!S.flags[u.boss]; }

/* 가중치 표에서 하나 고르기: { key: weight } */
/* 지형 상성: 장착 경공의 지형이 구역 지형(복합) 중 하나라도 맞으면 기력 소모 -20%, 하나도 안 맞으면 +20%, 경공이 없으면 보정 없음 */
function myTerrain() { const id = S.active.gyeonggong; return (id && MANUALS[id] && MANUALS[id].terrain) || null; }
function terrainMult(zid) { const t = myTerrain(), Z = ZONES[zid]; if (!t || !Z || !Z.terrain) return 1; return Z.terrain.includes(t) ? AFFINITY.terrainMatch : AFFINITY.terrainMiss; }

/* 이번 탐험에서 전투 조우 한 번이 두목일 확률 */
function bossChanceNow(zid) { const W = EXPEDITION; return Math.min(W.bossMax, W.bossChance + ((S.bossPity || {})[zid] || 0) * W.bossPity); }

function weighted(table) {
  let r = Math.random() * Object.values(table).reduce((a, b) => a + b, 0);
  for (const [k, w] of Object.entries(table)) { r -= w; if (r < 0) return k; }
  return Object.keys(table)[0];
}

/* 요수: 지역 요수 중 하나를 가중치로 고른다. 탐험 후반(기력을 절반 넘게 쓴 뒤)일수록 중형이 잦다 */
function pickBeast(Z) {
  const tiers = Object.fromEntries(Object.entries(TIER_WEIGHT).filter(([k]) => Z.enemies.some(e => (ENEMIES[e].tier || 2) === +k)));   // 이 구역에 있는 단계만
  const tier = +weighted(tiers);
  return pick(Z.enemies.filter(e => (ENEMIES[e].tier || 2) === tier));
}

/* ───────── 사냥터 사건 (기연) ───────── */
function eventPool(zid) { return EVENTS.filter(e => e.zones === 'all' || e.zones.includes(zid)); }

/* 선택지 조건: 부족하면 이유를 돌려준다 */
function reqFail(req) {
  if (!req) return '';
  if (req.item && !has(req.item[0], req.item[1])) return `${ITEMS[req.item[0]].name} ${req.item[1]}개 필요`;
  if (req.silver && S.silver < req.silver) return `은자 ${req.silver}냥 필요`;
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
  if (b.win) { const st = calcStats(); S.hp = Math.min(st.maxHp, S.hp + Math.round(st.maxHp * (EXPEDITION.breathe + (st.breathe || 0) / 100))); }   // 숨 고르기 (흑사 편직 요대 등)
  rec.battles.push({ eid, name: b.name, boss: b.boss, win: b.win, fled: !!b.fled, intro: b.intro, start: b.start, rounds: b.rounds, exp: b.exp, silver: b.silver, cause: b.cause || null });
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
/* 기연: 제자가 조건을 채운 선택지 가운데 하나를 스스로 고른다 */
function stepEvent(rec, zid, used) {
  const pool = eventPool(zid).filter(e => !used.has(e.id)), ev = pick(pool.length ? pool : eventPool(zid));
  used.add(ev.id);
  const options = ev.choices.filter(c => !reqFail(c.req)), ch = pick(options.length ? options : ev.choices);
  if (ch.take && ch.req && !reqFail(ch.req)) { if (ch.req.item) take(ch.req.item[0], ch.req.item[1]); if (ch.req.silver) S.silver -= ch.req.silver; }
  let r = Math.random() * ch.out.reduce((a, o) => a + o.w, 0), out = ch.out[0];
  for (const o of ch.out) { r -= o.w; if (r < 0) { out = o; break; } }
  log(`📜 ${ev.text}`, 'npc');
  log(`▸ ${ch.label} — ${out.text}`, 'npc');
  applyFx(out.fx || {});
  const head = `📜 기연 「${ev.title}」 — ${ch.label}`;
  if (!out.fight) return { t: head, cls: 'npc' };
  const fb = stepBattle(rec, out.fight, out.bonus);
  return { ...fb, t: `${head} → ${fb.t}`, enc: `${head} → ${fb.enc}` };
}

/* ───────── 탐험 한 번 ───────── */
function runExpedition(at = now()) {
  const W = EXPEDITION, zid = S.expedition.zone, Z = ZONES[zid];
  const st0 = calcStats();
  S.hp = st0.maxHp; S.mp = st0.maxMp;                      // 몸을 추스르고 출발
  const budget = Math.max(S.stamina, W.minStamina);
  const rec = { id: S.uid++, at, zone: zid, budget, steps: [], battles: [], end: 'tired', gain: {} };
  const before = { silver: S.silver, exp: S.exp, contrib: S.contrib, inv: { ...S.inv }, gear: S.gear.length };
  const used = new Set();
  let bossSeen = false, guard = 0;
  const step = (k, fn) => { RT.journal = []; const r = fn() || {}; rec.steps.push({ k, t: r.t, enc: r.enc, cls: r.cls || '', b: r.b, d: RT.journal }); return r; };
  const COST = { beast: STAMINA_COST.battle, vault: STAMINA_COST.chest, event: STAMINA_COST.battle, trap: 0, gimmick: STAMINA_COST.gimmick };
  // 지형 상성(구역 단위)과 기력 소모 감소(장비)를 걸음마다의 기력에 곱한다
  const tm = terrainMult(zid), mult = tm * (1 - (st0.staSave || 0) / 100);
  rec.terrain = { zone: [...(Z.terrain || [])], mine: myTerrain(), match: tm < 1 ? true : tm > 1 ? false : null, mult: Math.round(mult * 1000) / 1000, extra: 0 };
  const spend = base => { const c = base * mult; S.stamina = Math.max(0, S.stamina - c); rec.terrain.extra += c - base; };
  const recover = () => { const st = calcStats(); S.hp = st.maxHp; S.mp = st.maxMp; };
  // 이번 탐험에서 겪을 전투·금고 횟수를 정해 둔다
  const plan = rec.plan = { battles: rint(...W.battles), vaults: rint(...W.vaults) };
  let vaults = 0, extras = 0;
  rec.defeats = 0; rec.villages = 0;
  try {
    while (guard++ < 300) {
      const nB = rec.battles.length, needB = nB < W.battles[0], needV = vaults < W.vaults[0];
      const doneB = nB >= plan.battles, doneV = vaults >= plan.vaults;
      if (doneB && doneV) break;                                  // 정한 만큼 다 겪었다
      const tired = S.stamina < W.minStamina;
      if (tired && !needB && !needV) break;                       // 기력이 바닥났고 최소 횟수도 채웠다
      const depth = Math.max(1 - S.stamina / budget, (nB + vaults) / (plan.battles + plan.vaults));
      if (S.hp < calcStats().maxHp * W.villageAt && !has('saenghyeol')) {      // 마을 치료: 기력을 써서 활력·내력을 채우고 다시 오른다
        spend(W.villageSta); recover(); rec.villages++;
        step('village', () => { log(EXP_TEXT.village, 'muted'); return { t: '🏘️ 마을로 내려가 상처를 치료하고 다시 올랐습니다 (기력 소모)', cls: 'muted' }; });
        continue;
      }
      const lost = () => {                                    // 패배: 기력을 크게 잃고, 추슬러 다시 사냥
        rec.defeats++; spend(W.defeatSta); recover();
        rec.steps[rec.steps.length - 1].d.push({ text: EXP_TEXT.defeat, cls: 'bad' });
      };
      let k;
      if (tired) k = needB ? 'beast' : 'vault';                   // 지친 몸으로 최소 횟수만 채운다
      else {
        const wt = {};
        if (!doneB) wt.beast = W.weights.beast;
        if (!doneV) wt.vault = W.weights.vault;
        if (extras < W.extras) { if (!doneB && !used.size) wt.event = W.weights.event; wt.trap = W.weights.trap; wt.gimmick = W.weights.gimmick; }
        k = weighted(wt);
        if (S.stamina < COST[k] * mult) {                          // 기력이 모자라면: 최소 횟수가 남았으면 그것부터, 아니면 돌아온다
          if (!needB && !needV) break;
          k = needB ? 'beast' : 'vault';
        }
      }
      // 두목(히든 강적): 전투 조우 한 번마다 낮은 확률. 못 만난 탐험이 쌓일수록 조금씩 오른다 (천장). 만나면 피하지 않고 싸운다
      if (k === 'beast' && Z.boss && !bossSeen && Math.random() < bossChanceNow(zid)) {
        bossSeen = true;
        spend(STAMINA_COST.boss);
        if (step('boss', () => stepBattle(rec, Z.boss)).lost) lost();
        continue;
      }
      if (k === 'vault') vaults++; else if (k !== 'beast') extras++;
      spend(COST[k]);
      const r = step(k, () => k === 'beast' ? stepBattle(rec, pickBeast(Z, depth))
        : k === 'vault' ? stepVault(Z) : k === 'event' ? stepEvent(rec, zid, used) : k === 'trap' ? stepTrap() : stepGimmick(Z));
      if (r.lost) lost();
    }
  } finally { RT.journal = null; }
  // 결산
  const g = { silver: S.silver - before.silver, exp: S.exp - before.exp, contrib: S.contrib - before.contrib, items: {}, used: {}, gear: S.gear.slice(before.gear).map(it => `[${RARITY[it.rarity].name}] ${it.name}`) };
  for (const id of new Set([...Object.keys(S.inv), ...Object.keys(before.inv)])) {
    const d = (S.inv[id] || 0) - (before.inv[id] || 0);
    if (d > 0) g.items[id] = d; else if (d < 0) g.used[id] = -d;
  }
  rec.gain = g;
  holdRewards(rec, S.gear.slice(before.gear));
  S.bossPity = S.bossPity || {};
  S.bossPity[zid] = bossSeen ? 0 : (S.bossPity[zid] || 0) + 1;       // 두목 천장: 만나면 초기화
  rec.terrain.extra = Math.round(rec.terrain.extra * 10) / 10;
  rec.wins = rec.battles.filter(b => b.win).length; rec.losses = rec.battles.filter(b => !b.win && !b.fled).length;
  S.stamina = 0;                                            // 남은 기력은 다음 탐험 전까지 다시 찬다
  S.buffs = [];                                             // 증강 단약 효과는 이번 탐험으로 끝
  // 구역에서 겪은 것 (정답 대신 경험만 남는다)
  const zl = S.zoneLog[zid] = S.zoneLog[zid] || { trips: 0, wins: 0, losses: 0, defeats: 0, retreats: 0, seen: {}, bossMet: 0, bossWon: 0, lastAt: 0 };
  zl.trips++; zl.wins += rec.wins; zl.losses += rec.losses; zl.lastAt = at;
  zl.defeats += rec.defeats; zl.retreats += rec.villages;
  for (const b of rec.battles) { zl.seen[b.eid] = (zl.seen[b.eid] || 0) + 1; if (b.boss) { zl.bossMet++; if (b.win) zl.bossWon++; } }
  S.expeditions.push(rec);
  while (S.expeditions.length > W.keep) S.expeditions.shift();   // 오래된 기록부터 지운다
  writeExpeditionLog(rec);
  notify.trace('sys', `탐험 ${zid}: ${rec.steps.length}걸음 · ${rec.wins}승 ${rec.losses}패 · 은자 ${g.silver} · 수련치 ${g.exp}${rec.defeats ? ` · 쓰러짐 ${rec.defeats}` : ''}`);
  return rec;
}

/* 견문록에는 걸음마다 한 줄. 전투에는 [결과보기] 단추를 붙인다 (탐험 시각으로 찍고, 드러나는 시각은 stepAt).
   최신이 위에 오도록 걸음을 먼저 적고, 머리줄(요약)을 마지막에 적는다. */
function writeExpeditionLog(rec) {
  const Z = ZONES[rec.zone], g = rec.gain;
  for (const s of rec.steps) {
    const watch = s.b !== undefined ? ` <button class="watch" data-watch="${rec.id}:${s.b}">결과보기</button>` : '';
    log(`${stepText(rec, s)}${watch}`, `exp-step ${s.b !== undefined && !battleSeen(rec, s.b) ? '' : s.cls}`, rec.at, { r: rec.id, s: rec.steps.indexOf(s) });
  }
  const items = Object.entries(g.items).map(([id, n]) => `${ITEMS[id].name} ×${n}`);
  log(`⛰️ ${Z.name} 탐험 — ${rec.wins}승 ${rec.losses}패 · ${hlSilver(g.silver)}${g.exp ? ` · 수련치 +${fmt(g.exp)}` : ''}${items.length ? ` · ${hlItem(items.slice(0, 3).join(', ') + (items.length > 3 ? ` 외 ${items.length - 3}종` : ''))}` : ''}${rec.defeats ? ` · <b class="warn">쓰러짐 ${rec.defeats}번</b>` : ''}${rec.villages ? ` · 마을 치료 ${rec.villages}번` : ''}`, 'exp-head', rec.at, { r: rec.id });
}

/* ───────── 일정: 매시 정각, 최대 8번까지 쌓임 ───────── */
/* t 이후 처음 오는 정각 (현지 시각) */
function nextTopOfHour(t = now()) { const d = new Date(t); d.setMinutes(0, 0, 0); let h = d.getTime(); while (h <= t) h += EXPEDITION.interval; return h; }
function settleExpeditions(t = now()) {
  const X = S.expedition, W = EXPEDITION;
  if (!X || !X.zone || !X.nextAt || t < X.nextAt) return [];
  let n = Math.floor((t - X.nextAt) / W.interval) + 1;
  const skipped = Math.max(0, n - W.maxQueue); n -= skipped;
  let at = X.nextAt + skipped * W.interval;
  if (skipped) log(`⌛ 자리를 오래 비워 탐험 ${skipped}번이 그냥 지나갔습니다. (최대 ${W.maxQueue}번까지만 쌓입니다)`, 'muted', at);
  const recs = [];
  for (let i = 0; i < n; i++, at += W.interval) {
    S.stamina = calcStats().maxSta;                        // 정각마다 기력이 다시 가득 찬다 (숨겨진 능력치)
    recs.push(runExpedition(at));
  }
  X.nextAt = nextTopOfHour(t);                              // 다음 탐험은 지금 이후 첫 정각
  notify.refresh(); notify.save();
  return recs;
}
const nextExpeditionIn = (t = now()) => S.expedition && S.expedition.nextAt ? Math.max(0, S.expedition.nextAt - t) : null;
const findExpedition = id => S.expeditions.find(r => r.id === id);

/* 목적지 정하기. 캐릭터의 첫 탐험만 곧바로 떠나고(길 익히기), 그 뒤로는 매시 정각에 떠난다 */
function setDestination(zid) {
  if (!ZONES[zid] || !zoneUnlocked(zid)) return [];
  const X = S.expedition, first = !X.nextAt;
  if (X.zone === zid && !first) return [];
  X.zone = zid;
  log(`🧭 탐험지를 ${josa(ZONES[zid].name, '으로')} 정했습니다.${first ? ' 제자가 곧바로 길을 떠납니다.' : ''}`, 'place');
  let recs = [];
  if (first) {
    S.stamina = Math.max(S.stamina, calcStats().maxSta);
    recs = [runExpedition(now())];
    X.nextAt = nextTopOfHour();
    notify.view({ tab: 'field' });
  }
  notify.refresh();
  return recs;
}

/* ───────── 실시간 강호행: 한 시간 탐험을 배속으로 지켜본다 ─────────
   결과(보상 · 기록)는 정각에 한 번에 정해진다. 견문록은 걸음마다 드러나는 시각이 있어, 배속(2 · 3 · 4배)만큼 빨리 차례로 보인다.
   전투는 미리 결과를 적지 않고 '조우했습니다'만 적는다. [결과보기]로 관찰해야 결과가 적힌다.
   얻은 것은 곧바로 들어오지 않고 보관해 두었다가, [최종보상확인]을 누를 때 한꺼번에 받는다 */
const LIVE_SPEEDS = [2, 3, 4, 0];                           // 0 = 일괄확인
function liveSpeed() { const v = S.liveSpeed; return LIVE_SPEEDS.includes(v) ? v : 3; }
function setLiveSpeed(v) { if (LIVE_SPEEDS.includes(v)) { S.liveSpeed = v; notify.refresh(); } }
/* 이 탐험의 견문이 다 드러나는 데 걸리는 시간 (ms) */
function liveDur() { const v = liveSpeed(); return v ? EXPEDITION.interval / v : 0; }
/* i번째 걸음이 드러나는 시각. 마지막 걸음이 끝나는 시각에 요약이 뜬다 */
function stepAt(rec, i) { const n = rec.steps.length; return rec.at + (n ? (i + 1) / (n + 1) : 1) * liveDur(); }
function liveEndAt(rec) { return rec.at + liveDur(); }
function stepShown(rec, i, t = now()) { return rec.shownAll || t >= stepAt(rec, i); }
function liveDone(rec, t = now()) { return !rec || rec.shownAll || t >= liveEndAt(rec); }
function shownSteps(rec, t = now()) { let n = 0; while (n < rec.steps.length && stepShown(rec, n, t)) n++; return n; }
/* 지금 지켜보는 탐험: 가장 최근 탐험 */
function liveRec() { return S.expeditions.length ? S.expeditions[S.expeditions.length - 1] : null; }
/* 일괄확인: 지금 진행 중인 견문을 모두 드러낸다 */
function revealAll() { for (const r of S.expeditions) { if (!r.shownAll && !r.shownAt) r.shownAt = now(); r.shownAll = true; } notify.refresh(); }
/* 전투 결과: 관찰하기로 본 전투만 결과가 적힌다 */
function battleSeen(rec, bi) { const b = rec && rec.battles[bi]; return !b || b.seen !== false; }
function markSeen(rec, bi) { const b = rec && rec.battles[bi]; if (b && b.seen === false) { b.seen = true; notify.save(); } }
function stepText(rec, s) { return s.b !== undefined && !battleSeen(rec, s.b) && s.enc ? s.enc : s.t; }

/* 얻은 것은 보관해 둔다 (쓴 것은 이미 쓴 채로). 새 탐험의 전투는 모두 '아직 안 봄' */
function holdRewards(rec, newGear) {
  const g = rec.gain, P = rec.pend = { silver: Math.max(0, g.silver), exp: Math.max(0, g.exp), contrib: Math.max(0, g.contrib), items: { ...g.items }, gear: newGear };
  S.silver -= P.silver; S.exp -= P.exp; S.contrib -= P.contrib;
  for (const [id, n] of Object.entries(P.items)) take(id, Math.min(n, S.inv[id] || 0));
  if (newGear.length) S.gear = S.gear.filter(it => !newGear.includes(it));
  for (const b of rec.battles) b.seen = false;
}
function pendingRecs() { return S.expeditions.filter(r => r.pend && !r.claimed); }
/* 받을 수 있는가: 보관 중인 탐험의 견문이 모두 끝났을 때 */
function canClaim(t = now()) { const p = pendingRecs(); return p.length > 0 && p.every(r => liveDone(r, t)); }
/* 최종보상확인: 보관한 것을 모두 받는다. 행낭이 차 있어도 버리지 않는다. 받은 것을 돌려준다 */
function claimRewards() {
  const recs = pendingRecs(), sum = { silver: 0, exp: 0, contrib: 0, items: {}, gear: [], n: recs.length };
  for (const r of recs) {
    const P = r.pend;
    S.silver += P.silver; S.exp += P.exp; S.contrib += P.contrib;
    sum.silver += P.silver; sum.exp += P.exp; sum.contrib += P.contrib;
    for (const [id, n] of Object.entries(P.items)) { S.inv[id] = (S.inv[id] || 0) + n; sum.items[id] = (sum.items[id] || 0) + n; }
    for (const it of P.gear) { S.gear.push(it); sum.gear.push(it); }
    r.claimed = true; r.shownAll = true;
  }
  if (recs.length) {
    const items = Object.entries(sum.items).map(([id, n]) => `${ITEMS[id].icon} ${ITEMS[id].name} ×${n}`);
    log(`🏆 강호행에서 얻은 것을 챙겼습니다 — ${hlSilver(sum.silver)}${sum.exp ? ` · 수련치 +${fmt(sum.exp)}` : ''}${sum.contrib ? ` · 공헌 +${sum.contrib}` : ''}${items.length ? ` · ${hlItem(items.join(', '))}` : ''}${sum.gear.length ? ` · 장비 ${sum.gear.length}점` : ''}`, 'gold');
    notify.refresh(); notify.save();
  }
  return sum;
}
