/* [시스템] 행낭·무장·무공 장착, 소모 판정, 장비 강화 (DOM 조작 금지) */

/* ───────── 행낭 ───────── */
const has = (id, n = 1) => (S.inv[id] || 0) >= n;
const count = id => S.inv[id] || 0;
function bagUsed() { return Object.values(S.inv).filter(v => v > 0).length + S.gear.length; }
function bagCap() { return calcStats().bag; }

function give(id, n = 1, quiet = false) {
  if (!S.inv[id] && bagUsed() >= bagCap()) { log(`행낭이 가득 차 ${ITEMS[id].name}${jo(ITEMS[id].name, '을를')} 버렸습니다.`, 'bad'); return false; }
  S.inv[id] = (S.inv[id] || 0) + n;
  notify.trace('item+', `${id} ×${n} (${ITEMS[id].name}) → ${S.inv[id]}`);
  if (!quiet) log(`${ITEMS[id].icon} ${hlItem(ITEMS[id].name)} ×${n} 획득`, 'loot');
  return true;
}

function take(id, n = 1) { S.inv[id] -= n; notify.trace('item-', `${id} ×${n} (${ITEMS[id].name}) → ${Math.max(0, S.inv[id])}`); if (S.inv[id] <= 0) delete S.inv[id]; }

function giveGear(it, quiet) {
  if (bagUsed() >= bagCap()) { log(`행낭이 가득 차 ${it.name}${jo(it.name, '을를')} 두고 왔습니다.`, 'bad'); return false; }
  S.gear.push(it);
  notify.trace('item+', `장비 ${it.base || it.shop} [${RARITY[it.rarity].name}] ${it.name} uid=${it.uid}`);
  if (!quiet) log(`🗡️ [${RARITY[it.rarity].name}] ${hlItem(it.name)} 획득${it.unique ? ` — ${it.unique.text}` : ''}`, 'loot');
  return true;
}

function makeGear(base, tier, rarity, crafted) {
  const B = EQUIP_BASES[base];
  const mult = RARITY[rarity].mult;
  const stats = {};
  for (const [k, v] of Object.entries(B.stats[tier - 1])) stats[k] = PCT_STATS.has(k) ? Math.round(v * mult * 10) / 10 : Math.max(1, Math.round(v * mult));
  return {
    uid: S.uid++, base, tier, slot: B.slot, wtype: B.wtype || null,
    name: B.names[tier - 1], rarity, stats,
    unique: crafted ? { ...pick(UNIQUES) } : null, crafted: !!crafted,
  };
}

/* 이름 있는 장비 한 점: 하급 장비(GEAR_DB, 하급 고정) 또는 단조 장비(CRAFT_GEAR, 중급 고정) */
function makeNamedGear(id, st = S) {
  const crafted = !!CRAFT_GEAR[id], G = crafted ? CRAFT_GEAR[id] : GEAR_DB[id];
  return { uid: st.uid++, named: id, tier: crafted ? 2 : 1, slot: G.slot, wtype: G.wtype || null, name: G.name, rarity: crafted ? (G.rarity || 1) : 0, stats: { ...G.stats }, unique: null, crafted };
}
/* 드랍·공양·금고의 장비: 1티어 하급은 하급 장비 37종 중에서, 그 밖에는 기본형으로 */
function dropGear(tier, rarity) {
  if (tier === 1 && rarity === 0) return makeNamedGear(pick(Object.keys(GEAR_DB)));
  return makeGear(pick(Object.keys(EQUIP_BASES)), tier, rarity, false);
}
/* 전방 진열 한 줄의 사양: 하급 장비 id 또는 기본형 */
function gearSpec(key, tier = 1) {
  if (GEAR_DB[key]) { const G = GEAR_DB[key]; return { name: G.name, slot: G.slot, wtype: G.wtype || null, stats: G.stats, desc: G.desc }; }
  const B = EQUIP_BASES[key]; return { name: B.names[tier - 1], slot: B.slot, wtype: B.wtype || null, stats: B.stats[tier - 1], desc: '' };
}

function rollDropRarity(boss) {
  const r = Math.random();
  if (boss) return r < 0.05 ? 3 : r < 0.4 ? 2 : 1;
  return r < 0.05 ? 2 : r < 0.3 ? 1 : 0;
}

/* 장보각 이류 장비: 2티어 중급, shop 표시로 한 점만 교환 */
function libraryGear(id, st = S) {
  const G = LIBRARY_GEAR[id];
  return { uid: st.uid++, shop: id, named: id, tier: 2, slot: G.slot, wtype: G.wtype || null, name: G.name, rarity: 1, stats: { ...G.stats }, unique: null, grade: '이류' };
}
function shopGear(id, st = S) {
  const g = SHOP_GEAR.find(x => x.id === id);
  return { uid: st.uid++, shop: id, slot: g.slot, name: g.name, rarity: g.rarity, stats: { ...g.stats }, unique: null };
}

/* 장착 칸이 받는 장비 부위 (가락지 두 번째 칸은 가락지를 받는다) */
const slotAccepts = slot => SLOT_ACCEPTS[slot] || slot;
/* to: 넣을 장착 칸 (없으면 부위 칸. 가락지는 첫 칸이 차 있고 둘째 칸이 비었으면 둘째 칸으로) */
function equipItem(uid, to) {
  const i = S.gear.findIndex(g => g.uid === uid); if (i < 0) return;
  const it = S.gear[i];
  let slot = to && slotAccepts(to) === it.slot ? to : it.slot;
  if (!to && it.slot === 'ring' && S.equip.ring && !S.equip.ring2) slot = 'ring2';
  S.gear.splice(i, 1);
  if (S.equip[slot]) S.gear.push(S.equip[slot]);
  S.equip[slot] = it;
  notify.view({ slotSel: slot });
  log(`${it.name}${jo(it.name, '을를')} 착용했습니다.`);
  clampVitals(); notify.refresh();
}

/* 자동 장착: 칸마다 행낭 장비를 하나씩 넣어 보고 투력이 가장 많이 오르는 한 점부터 바꾼다 (더 오르는 것이 없을 때까지).
   빠진 장비는 행낭으로 돌아온다. 돌려주는 값: { from, to, names } */
function autoEquipBest() {
  const from = calculateCombatPower(S), names = [];
  for (let pass = 0; pass < SLOT_ORDER.length * 2; pass++) {
    let best = null, bestCp = calculateCombatPower(S);
    for (const slot of SLOT_ORDER) for (const it of S.gear) {
      if (it.slot !== slotAccepts(slot) || Object.values(S.equip).includes(it)) continue;
      const old = S.equip[slot]; S.equip[slot] = it;
      const cp = calculateCombatPower(S);
      if (old) S.equip[slot] = old; else delete S.equip[slot];
      if (cp > bestCp) { bestCp = cp; best = { it, slot }; }
    }
    if (!best) break;
    S.gear.splice(S.gear.indexOf(best.it), 1);
    if (S.equip[best.slot]) S.gear.push(S.equip[best.slot]);
    S.equip[best.slot] = best.it; names.push(best.it.name);
  }
  const to = calculateCombatPower(S);
  if (names.length) { log(`채비: ${names.join(' · ')} — 투력 ${fmt(from)} → ${fmt(to)}`); clampVitals(); notify.refresh(); }
  return { from, to, names };
}

/* 더 좋은 장비 알림: 행낭에 이 칸에 낄 수 있는 장비가 있고, 끼면 투력이 오르는 칸 { 칸: true } (빈 칸은 낄 것만 있으면 오름) */
function gearUpgradeSlots() {
  const base = calculateCombatPower(S), out = {};
  for (const slot of SLOT_ORDER) for (const it of S.gear) {
    if (out[slot] || it.slot !== slotAccepts(slot)) continue;
    const old = S.equip[slot]; S.equip[slot] = it;
    const cp = calculateCombatPower(S);
    if (old) S.equip[slot] = old; else delete S.equip[slot];
    if (cp > base) out[slot] = true;
  }
  return out;
}

function unequip(slot) {
  const it = S.equip[slot]; if (!it) return;
  if (bagUsed() >= bagCap()) { notify.toast('행낭이 가득 찼습니다.'); return; }
  S.gear.push(it); delete S.equip[slot];
  clampVitals(); notify.refresh();
}

function discardGear(uid) {
  const i = S.gear.findIndex(g => g.uid === uid); if (i < 0) return;
  log(`${S.gear[i].name}${jo(S.gear[i].name, '을를')} 버렸습니다.`, 'muted');
  S.gear.splice(i, 1); notify.refresh();
}

/* 소모품 사용. 회복 단약은 즉시, 증강 단약은 '다음 탐험' 동안 (기력은 숨겨진 능력치라 어떤 아이템으로도 회복되지 않는다) */
function useItem(id) {
  const I = ITEMS[id]; if (!I.use || !has(id)) return;
  const u = I.use;
  if (u.learn) { learnManual(id); return; }
  const st = calcStats();
  take(id, 1);
  const parts = [];
  const boost = I.kind === '단약' ? 1 + (talentOf().pill || 0) : 1;     // 기예 단약: 단약 섭취 효과 +15%
  if (u.hp) { const v = Math.round(st.maxHp * u.hp * boost); S.hp = Math.min(st.maxHp, S.hp + v); parts.push(`활력 +${v}`); }
  if (u.mp) { const v = Math.round(st.maxMp * u.mp * boost); S.mp = Math.min(st.maxMp, S.mp + v); parts.push(`내력 +${v}`); }
  if (u.sta) { S.stamina = st.maxSta; const r = activeRun(); if (r) { r.mode = 'run'; r.staAt = now(); } parts.push('기력이 가득 차 다시 달립니다'); }
  if (u.perm) { for (const [k, v] of Object.entries(u.perm)) { S.perm[k] += v; parts.push(`${STAT_NAMES[k]} 영구 +${v}`); } }
  if (u.buff) {
    S.buffs = S.buffs.filter(b => b.key !== u.buff.key);
    S.buffs.push({ key: u.buff.key, val: Math.round(u.buff.val * boost * 1000) / 1000, name: u.buff.name });
    parts.push(`${u.buff.name} (다음 탐험 동안)`);
  }
  log(`${I.icon} ${I.name} — ${parts.join(', ')}`, 'good');
  notify.refresh();
}

function learnManual(bookId) {
  const mid = ITEMS[bookId].use.learn, M = MANUALS[mid];
  if (manualSealed(mid)) { notify.toast(`봉인된 비급입니다: ${M.name}`); return; }
  if (S.manuals[mid]) { notify.toast(`이미 익힌 무공입니다: ${M.name}`); return; }
  if (manualRankLocked(mid)) { notify.toast(`이류무사가 되어야 익힐 수 있는 이류 비급입니다: ${M.name}`); return; }
  take(bookId, 1);
  S.manuals[mid] = { star: 1 };
  const pb = Object.entries(M.passiveBonus || {}).map(([k, v]) => `${STAT_NAMES[k]} +${v}${PCT_STATS.has(k) ? '%' : ''}`).join(' · ');
  log(`📘 《${M.name}》 비급을 끝까지 읽고 익혔습니다. 「관조 › 무공」에서 장착할 수 있습니다.${pb ? ` 몸에 영구히 각인: ${pb}` : ''}`, 'gold');
  clampVitals();
  notify.toast(`${M.name} 습득`);
  notify.refresh();
}

function equipManual(id) {
  if (!S.manuals[id]) return;
  const cat = MANUALS[id].cat, prev = S.active[cat];
  if (prev === id) return;
  S.active[cat] = id; clampVitals();
  log(`《${MANUALS[id].name}》${jo(MANUALS[id].name, '을를')} ${CATS[cat].name} 자리에 운용합니다.`, 'good');
  notify.refresh();
}

function unequipManual(cat) {
  const id = S.active[cat]; if (!id) return;
  S.active[cat] = null; clampVitals();
  log(`《${MANUALS[id].name}》 운용을 거두었습니다.`, 'muted');
  notify.refresh();
}

function setActive(cat, id) {
  S.active[cat] = id; clampVitals(); notify.refresh();
}

/* 같은 장비 강화: 본템(행낭 · 착용 중) + 재료(행낭의 같은 이름 · 같은 등급 · 강화 안 된 장비). 재료는 사라져 본템에 흡수된다 */
const enhRule = it => ENH_RULE.find(r => (it.enh || 0) + 1 <= r.to) || null;
const enhCost = it => { const r = enhRule(it); return r ? r.cost * Math.pow(2, it.rarity || 0) : 0; };   // 등급마다 2배
const enhSame = (a, b) => !!a && !!b && a.uid !== b.uid && a.name === b.name && a.rarity === b.rarity && a.slot === b.slot && !b.enh && !b.shop;
const enhMaterials = it => S.gear.filter(g => enhSame(it, g));
const gearByUid = uid => S.gear.find(g => g.uid === uid) || Object.values(S.equip).find(g => g && g.uid === uid) || null;
function forgeEnhance(mainUid, matUid) {
  const it = gearByUid(mainUid), mat = S.gear.find(g => g.uid === matUid), r = it && enhRule(it);
  if (!it || !mat || !enhSame(it, mat)) { notify.toast('같은 이름 · 같은 등급의 강화 안 된 장비가 재료로 있어야 합니다.'); return null; }
  if (!r || (it.enh || 0) >= ENH_MAX) { notify.toast('더 이상 벼릴 수 없습니다.'); return null; }
  const cost = enhCost(it); if (S.silver < cost) { notify.toast('은자가 부족합니다.'); return null; }
  S.silver -= cost; S.gear = S.gear.filter(g => g.uid !== mat.uid);   // 재료는 부서져 본템에 흡수
  const roll = Math.random() * 100, before = gearName(it);
  let kind = 'same';
  if (roll < r.ok) { it.enh = (it.enh || 0) + 1; kind = 'ok'; log(`🔨 ${hlItem(before)} 강화 성공! → ${hlItem(gearName(it))} (${hlSilver(cost)})`, 'good'); }
  else if (roll < r.ok + r.boom) {
    kind = 'boom'; S.gear = S.gear.filter(g => g.uid !== it.uid);
    for (const k of Object.keys(S.equip)) if (S.equip[k] && S.equip[k].uid === it.uid) delete S.equip[k];
    log(`💥 ${hlItem(before)} 강화 실패 — 쇠가 견디지 못하고 부서졌습니다. (${hlSilver(cost)})`, 'bad');
  } else log(`🔨 ${hlItem(before)} — 재료만 녹아들고 아무 일도 일어나지 않았습니다. (${hlSilver(cost)})`, 'muted');
  clampVitals(); notify.refresh();
  return { kind, name: gearName(it), cost };
}

/* 정렬 (유저 확정): 등급이 높은 것이 앞, 같은 등급이면 가나다순. 목록마다 이 두 함수만 쓴다 */
const koCmp = (a, b) => String(a).localeCompare(String(b), 'ko');
const gearSort = list => [...list].sort((a, b) => b.rarity - a.rarity || koCmp(a.name, b.name) || (b.enh || 0) - (a.enh || 0));
function itemRank(id) {                                           // 비급은 무공 등급, 조각은 조각 등급, 단약은 품(1품이 최상), 그 밖은 같은 등급
  const I = ITEMS[id], L = I.use && I.use.learn;
  if (L && MANUALS[L]) return Object.keys(GRADES).indexOf(MANUALS[L].grade) + 1;
  if (/^scrap\d$/.test(id)) return +id.slice(5);
  const q = /^(\d+)품$/.exec(I.grade || ''); return q ? 10 - +q[1] : 0;
}
const itemSort = ids => [...ids].sort((a, b) => itemRank(b) - itemRank(a) || koCmp(ITEMS[a].name, ITEMS[b].name));
const gearName = it => `${it.name}${it.enh ? ` +${it.enh}` : ''}`;
/* ───────── 전방(상점) 거래 ─────────
   은자는 S.silver, 소지품은 S.inv{아이템: 개수}, 보관 장비는 S.gear[]. 청풍문 안에서만 거래한다. */
/* 전방에서 파는 물건은 사들이는 값의 절반에 되판다. 전방에 없는 물건은 제 값(price) */
const itemSellPrice = id => { const row = SHOP_STOCK.find(r => r[0] === id); return row ? Math.floor(row[1] / 2) : ITEMS[id].price || 0; };   // 비급·증표·약과처럼 값이 0이면 팔 수 없다
function gearSellPrice(it) {
  if (it.shop) return 0;                                           // 신분패는 문파 물건이라 팔 수 없다
  const row = SHOP_GEAR_STOCK.find(r => (r[0] === it.named || r[0] === it.base) && r[1] === (it.tier || 1));
  if (row) return Math.round(row[2] / 2 * GEAR_SELL.rar[it.rarity] * (1 + (it.enh || 0) * GEAR_SELL.enh));   // 전방에서 파는 장비: 사들이는 값의 절반
  return Math.round(GEAR_SELL.tier[(it.tier || 1) - 1] * GEAR_SELL.rar[it.rarity] * (1 + (it.enh || 0) * GEAR_SELL.enh));
}
function shopPoor(price, name) {
  log(`🚫 은자가 부족해 ${name}${jo(name, '을를')} 살 수 없습니다. (필요 ${fmt(price)}냥 · 소지 ${fmt(S.silver)}냥) 왕 가: ${MERCHANT.poor}`, 'bad');
  notify.refresh();
}
function buyItem(id, n = 1) {
  const row = SHOP_STOCK.find(r => r[0] === id); if (!row) return false;
  n = Math.max(1, Math.floor(n)); const price = row[1] * n, name = ITEMS[id].name;
  if (S.silver < price) { shopPoor(price, name); return false; }
  if (!give(id, n, true)) { notify.refresh(); return false; }
  S.silver -= price;
  log(`🛒 전방에서 ${hlItem(name)}${n > 1 ? ` ${n}개` : ''}${jo(n > 1 ? '개' : name, '을를')} ${hlSilver(price)}에 샀습니다. 왕 가: ${pick(MERCHANT.buyLines)}`, 'loot');
  notify.refresh();
  return true;
}
function buyGear(base, tier) {
  const row = SHOP_GEAR_STOCK.find(r => r[0] === base && r[1] === tier); if (!row) return false;
  const price = row[2], name = gearSpec(base, tier).name;
  if (S.silver < price) { shopPoor(price, name); return false; }
  if (!giveGear(GEAR_DB[base] ? makeNamedGear(base) : makeGear(base, tier, 0, false), true)) { notify.refresh(); return false; }
  S.silver -= price;
  log(`🛒 전방에서 [하급] ${hlItem(name)}${jo(name, '을를')} ${hlSilver(price)}에 샀습니다. 행낭에서 착용하십시오.`, 'loot');
  notify.refresh();
  return true;
}
function sellItem(id, n = 1) {
  const price = itemSellPrice(id); if (!price || !has(id)) return 0;
  n = Math.min(n, count(id));
  take(id, n); S.silver += price * n;
  log(`💰 ${hlItem(ITEMS[id].name)} ×${n}을 팔아 ${hlSilver(price * n)}을 받았습니다. 왕 가: ${pick(MERCHANT.sellLines)}`, 'loot');
  notify.refresh();
  return price * n;
}
function sellGear(uid) {
  const i = S.gear.findIndex(g => g.uid === uid); if (i < 0) return 0;
  const it = S.gear[i], price = gearSellPrice(it); if (!price) return 0;
  S.gear.splice(i, 1); S.silver += price;
  log(`💰 [${RARITY[it.rarity].name}] ${hlItem(gearName(it))}${jo(gearName(it), '을를')} 팔아 ${hlSilver(price)}을 받았습니다.`, 'loot');
  notify.refresh();
  return price;
}

function giveSilver(n) { S.silver += n; log(`${hlSilver(n)} 획득`, 'loot'); }
