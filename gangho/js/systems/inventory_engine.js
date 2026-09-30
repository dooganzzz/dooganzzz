/* [시스템] 행낭·무장·무공 장착, 소모 판정, 장비 강화 (DOM 조작 금지) */

/* ───────── 행낭 ───────── */
const has = (id, n = 1) => (S.inv[id] || 0) >= n;
const count = id => S.inv[id] || 0;
function bagUsed() { return Object.values(S.inv).filter(v => v > 0).length + S.gear.length; }
function bagCap() { return calcStats().bag; }

function give(id, n = 1, quiet = false) {
  if (!S.inv[id] && bagUsed() >= bagCap()) { log(`행낭이 가득 차 ${ITEMS[id].name}${jo(ITEMS[id].name, '을를')} 버렸습니다.`, 'bad'); return false; }
  S.inv[id] = (S.inv[id] || 0) + n;
  if (!quiet) log(`${ITEMS[id].icon} ${hlItem(ITEMS[id].name)} ×${n} 획득`, 'loot');
  return true;
}

function take(id, n = 1) { S.inv[id] -= n; if (S.inv[id] <= 0) delete S.inv[id]; }

function giveGear(it, quiet) {
  if (bagUsed() >= bagCap()) { log(`행낭이 가득 차 ${it.name}${jo(it.name, '을를')} 두고 왔습니다.`, 'bad'); return false; }
  S.gear.push(it);
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

function rollDropRarity(boss) {
  const r = Math.random();
  if (boss) return r < 0.05 ? 3 : r < 0.4 ? 2 : 1;
  return r < 0.05 ? 2 : r < 0.3 ? 1 : 0;
}

function shopGear(id, st = S) {
  const g = SHOP_GEAR.find(x => x.id === id);
  return { uid: st.uid++, shop: id, slot: g.slot, name: g.name, rarity: g.rarity, stats: { ...g.stats }, unique: null };
}

function equipItem(uid) {
  const i = S.gear.findIndex(g => g.uid === uid); if (i < 0) return;
  const it = S.gear[i];
  S.gear.splice(i, 1);
  if (S.equip[it.slot]) S.gear.push(S.equip[it.slot]);
  S.equip[it.slot] = it;
  notify.view({ slotSel: it.slot });
  log(`${it.name}${jo(it.name, '을를')} 착용했습니다.`);
  clampVitals(); notify.refresh();
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

function useItem(id, inBattle) {
  const I = ITEMS[id]; if (!I.use || !has(id)) return;
  const u = I.use;
  if (inBattle && (I.kind === '음식' || u.gate)) return;
  if (u.learn) { learnManual(id); return; }
  if (u.gate) {
    const gated = Object.keys(S.manuals).filter(k => S.manuals[k].gate && S.manuals[k].star === u.gate);
    if (!gated.length) { notify.toast(`${GATE_NAME[u.gate]}에 막힌 비급이 없습니다.`); return; }
    const target = gated.find(k => k === S.active.mugong) || gated.find(k => Object.values(S.active).includes(k)) || gated[0];
    breakthrough(target); notify.refresh(); return;
  }
  const st = calcStats();
  take(id, 1);
  const parts = [];
  if (u.hp) { const v = Math.round(st.maxHp * u.hp); S.hp = Math.min(st.maxHp, S.hp + v); parts.push(`활력 +${v}`); }
  if (u.mp) { const v = Math.round(st.maxMp * u.mp); S.mp = Math.min(st.maxMp, S.mp + v); parts.push(`내력 +${v}`); }
  if (u.stamina) { S.stamina = Math.min(st.maxSta, S.stamina + u.stamina); parts.push(`기력 +${u.stamina}`); }
  if (u.perm) { for (const [k, v] of Object.entries(u.perm)) { S.perm[k] += v; parts.push(`${STAT_NAMES[k]} 영구 +${v}`); } }
  if (u.buff) {
    S.buffs = S.buffs.filter(b => b.key !== u.buff.key);
    S.buffs.push({ ...u.buff, until: now() + u.buff.dur * 1000 });
    parts.push(`${u.buff.name} ${Math.round(u.buff.dur / 60)}분`);
  }
  log(`${I.icon} ${I.name} — ${parts.join(', ')}`, 'good');
  if (!inBattle) notify.refresh();
}

function learnManual(bookId) {
  const mid = ITEMS[bookId].use.learn, M = MANUALS[mid];
  if (S.manuals[mid]) { notify.toast(`이미 익힌 무공입니다: ${M.name}`); return; }
  take(bookId, 1);
  S.manuals[mid] = { star: 1, cxp: 0, txp: 0, gate: false };
  log(`📘 《${M.name}》 비급을 끝까지 읽고 익혔습니다. 상태 탭의 무공에서 장착할 수 있습니다.`, 'gold');
  notify.toast(`${M.name} 습득`);
  notify.refresh();
}

function equipManual(id) {
  if (RT.battle || !S.manuals[id]) return;
  const cat = MANUALS[id].cat, prev = S.active[cat];
  if (prev === id) return;
  if (prev && S.activeTrainingSkillId === prev) S.activeTrainingSkillId = null;
  S.active[cat] = id; clampVitals();
  log(`《${MANUALS[id].name}》${jo(MANUALS[id].name, '을를')} ${CATS[cat].name} 자리에 운용합니다.`, 'good');
  notify.refresh();
}

function unequipManual(cat) {
  if (RT.battle) return;
  const id = S.active[cat]; if (!id) return;
  if (S.activeTrainingSkillId === id) { S.activeTrainingSkillId = null; log(`《${MANUALS[id].name}》 수련도 함께 멈췄습니다.`, 'muted'); }
  S.active[cat] = null; clampVitals();
  log(`《${MANUALS[id].name}》 운용을 거두었습니다.`, 'muted');
  notify.refresh();
}

function setActive(cat, id) {
  if (RT.battle) return;
  if (S.activeTrainingSkillId === S.active[cat]) S.activeTrainingSkillId = id;
  S.active[cat] = id; clampVitals(); notify.refresh();
}

const enhCost = it => Math.round(15 * (it.tier || 1) * Math.pow((it.enh || 0) + 1, 1.6));
const enhChance = it => Math.max(30, 100 - (it.enh || 0) * 8);

function enhanceGear(slot) {
  const it = S.equip[slot]; if (!it || S.zone) return;
  if ((it.enh || 0) >= ENH_MAX) { notify.toast('더 이상 벼릴 수 없습니다.'); return; }
  const cost = enhCost(it);
  if (S.silver < cost) { notify.toast('은자가 부족합니다.'); return; }
  S.silver -= cost;
  if (Math.random() * 100 < enhChance(it)) {
    it.enh = (it.enh || 0) + 1;
    log(`🔨 ${hlItem(it.name)} 강화 성공! +${it.enh} (${hlSilver(cost)} 사용)`, 'good');
  } else log(`🔨 ${hlItem(it.name)} 강화 실패… 쇠가 버티지 못했습니다. (${hlSilver(cost)} 사용)`, 'bad');
  clampVitals(); notify.refresh();
}

const gearName = it => `${it.name}${it.enh ? ` +${it.enh}` : ''}`;
function giveSilver(n) { S.silver += n; log(`${hlSilver(n)} 획득`, 'loot'); }

function spend(cost) {
  if (S.stamina < cost) { notify.toast('기력이 부족합니다. 음식을 먹거나 뒷마당에서 쉬십시오.'); return false; }
  S.stamina -= cost; return true;
}
