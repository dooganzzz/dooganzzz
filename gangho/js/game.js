/* 강호견문록 — 게임 로직 & 화면 */
'use strict';

/* ───────── 유틸 ───────── */
const $ = sel => document.querySelector(sel);
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const tri = n => (n * (n + 1)) / 2;
const now = () => Date.now();
const fmt = n => Math.floor(n).toLocaleString('ko-KR');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);

function josa(word, pair) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const has = code >= 0 && code <= 11171 && code % 28 !== 0;
  const [a, b] = { 이가: ['이', '가'], 은는: ['은', '는'], 을를: ['을', '를'], 과와: ['과', '와'], 으로: ['으로', '로'] }[pair];
  if (pair === '으로' && code % 28 === 8) return word + '로';
  return word + (has ? a : b);
}

const SAVE_KEY = 'ganghoKyeonmunrok_v1';
const OFFLINE_CAP = 8 * 3600;

/* ───────── 상태 ───────── */
let S = null;
let ui = { tab: 'yeonmu', pot: {}, craft: 'alchemy', battle: null, fast: false, modal: null, bagFilter: 'all' };

function newState(name, mugongId) {
  const st = {
    v: 1, name, created: now(), lastTick: now(),
    hp: 0, mp: 0, stamina: 100, silver: 30,
    manuals: {}, active: { mugong: mugongId, simbeop: 'tonap', gyeonggong: 'dapseol', gigong: 'cheolpo' },
    inv: { potionHp: 3, herb: 2 },
    gear: [], equip: {},
    shrine: { atk: 0, mp: 0, eva: 0, total: 0 },
    perm: { maxHp: 0, maxMp: 0 },
    crafts: { forge: { lv: 1, xp: 0 }, alchemy: { lv: 1, xp: 0 }, cook: { lv: 1, xp: 0 } },
    codex: [], flags: {},
    zone: null, seen: {}, opened: {}, cleared: {}, gatherCd: {},
    buffs: [], missions: [], arin: {}, restCd: 0, uid: 1,
    kills: 0, log: [],
  };
  for (const id of [mugongId, 'tonap', 'dapseol', 'cheolpo']) st.manuals[id] = { star: 1, cxp: 0, txp: 0, gate: false };
  const badge = SHOP_GEAR.find(g => g.id === 'badge1');
  st.equip.badge = { uid: st.uid++, shop: 'badge1', slot: 'badge', name: badge.name, rarity: badge.rarity, stats: { ...badge.stats }, unique: null };
  return st;
}

function save() {
  if (!S) return;
  S.lastTick = now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 저장 불가 환경 */ }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* 무시 */ }
  return null;
}

function log(text, cls = '') {
  S.log.push({ t: now(), text, cls });
  if (S.log.length > 120) S.log.splice(0, S.log.length - 120);
  renderLog();
}
function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  $('#toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3200);
}

/* ───────── 능력치 ───────── */
function calcStats() {
  const s = { atk: 10, def: 3, maxHp: 100, maxMp: 40, spd: 10, eva: 3, crit: 5, critRes: 0, mpRegen: 1, bag: 30, mpCost: 0, craft: 0, train: 0, maxSta: 100, combo: 0, lifesteal: 0, atkPct: 0, hpPct: 0, mpSave: 0, evaFlat: 0 };
  for (const cat of CAT_ORDER) {
    const id = S.active[cat]; const m = S.manuals[id];
    if (!m) continue;
    const g = GRADES[MANUALS[id].grade].mult, st = m.star, t = tri(st);
    if (cat === 'mugong') s.atk += (4 * st + 0.9 * t) * g;
    if (cat === 'simbeop') { s.maxMp += (12 * st + 1.5 * t) * g; s.atk += st * g; s.maxHp += 5 * st * g; s.mpRegen += 0.25 * st * g; }
    if (cat === 'gyeonggong') { s.spd += 0.8 * st * g; s.eva += 0.6 * st * g; s.crit += 0.3 * st * g; }
    if (cat === 'gigong') { s.maxHp += (20 * st + 4 * t) * g; s.def += (1.5 * st + 0.35 * t) * g; }
  }
  for (const slot of SLOT_ORDER) {
    const it = S.equip[slot]; if (!it) continue;
    for (const [k, v] of Object.entries(it.stats)) s[k] = (s[k] || 0) + v;
    if (it.unique) s[it.unique.key] = (s[it.unique.key] || 0) + it.unique.val;
  }
  s.atk += S.shrine.atk; s.maxMp += S.shrine.mp; s.eva += S.shrine.eva; s.crit += Math.floor(S.shrine.total / 10) * 2;
  s.maxHp += S.perm.maxHp; s.maxMp += S.perm.maxMp;
  s.eva += s.evaFlat;
  let atkB = s.atkPct / 100, defB = 0;
  s.trainBuff = 0;
  for (const b of S.buffs) {
    if (b.key === 'atk') atkB += b.val;
    if (b.key === 'def') defB += b.val;
    if (b.key === 'train') s.trainBuff += b.val;
  }
  s.atk *= 1 + atkB; s.def *= 1 + defB; s.maxHp *= 1 + s.hpPct / 100;
  for (const k of ['atk', 'def', 'maxHp', 'maxMp', 'spd', 'maxSta']) s[k] = Math.round(s[k]);
  s.eva = Math.min(60, Math.round(s.eva * 10) / 10);
  s.crit = Math.min(75, Math.round(s.crit * 10) / 10);
  s.mpRegen = Math.round(s.mpRegen * 10) / 10;
  return s;
}
function trainRate(st) {
  st = st || calcStats();
  return (1 + st.train / 100 + st.trainBuff) * (S.zone ? 0.5 : 1);
}

/* ───────── 경험치 & 성(星) ───────── */
const need = star => Math.round(40 * Math.pow(1.28, star - 1));

function addXp(id, kind, amt) {
  const m = S.manuals[id];
  if (!m || m.star >= MAX_STAR) return;
  m[kind] = Math.min(m[kind] + amt, need(m.star) * 3);
  tryStar(id);
}
function tryStar(id) {
  const m = S.manuals[id], M = MANUALS[id];
  while (m.star < MAX_STAR) {
    const n = need(m.star);
    if (m.cxp < n || m.txp < n) break;
    if (GATES[m.star]) {
      if (!m.gate) { m.gate = true; log(`《${M.name}》 ${m.star}성 수련이 가득 찼습니다. ${GATE_NAME[m.star]}에 막혔습니다. 정청에서 ${ITEMS[GATES[m.star]].name}으로 돌파하십시오.`, 'gold'); toast(`${M.name} — ${GATE_NAME[m.star]} 도달`); }
      break;
    }
    m.cxp -= n; m.txp -= n; m.star++;
    log(`《${M.name}》 ${m.star}성에 올랐습니다!`, 'good');
    toast(`${M.name} ${m.star}성!`);
  }
}
function breakthrough(id) {
  const m = S.manuals[id], M = MANUALS[id];
  const pill = GATES[m.star];
  if (!m.gate || !pill) return;
  if (!has(pill)) { log(`${ITEMS[pill].name}이 없습니다.`, 'bad'); return; }
  take(pill, 1);
  const n = need(m.star);
  m.cxp -= n; m.txp -= n; m.star++; m.gate = false;
  const lines = {
    4: '노벽송: "그래, 기혈이 한 겹 트였구나. 이제 초식이 초식을 부를 게야." — 제2초식 해금!',
    8: '노벽송: "흐음… 제법이군. 세 번째 초식은 몸이 먼저 안다." — 제3초식 해금!',
    12: '노벽송: "…대성(大成)이다. 이 늙은이가 가르칠 건 더 없구나."',
  };
  log(`《${M.name}》 ${GATE_NAME[m.star - 1]} 돌파! ${m.star}성에 올랐습니다.`, 'gold');
  if (M.cat === 'mugong' && lines[m.star]) log(lines[m.star], 'npc');
  if (m.star === MAX_STAR) log(`《${M.name}》 12성 대성(大成)!`, 'gold');
  toast(`${M.name} ${m.star}성 돌파!`);
  tryStar(id);
  render();
}
function unlockedMoves(star) { return star >= 8 ? 3 : star >= 4 ? 2 : 1; }
function mugongStar() { const m = S.manuals[S.active.mugong]; return m ? m.star : 0; }
function bestMugongStar() { return Math.max(0, ...Object.entries(S.manuals).filter(([id]) => MANUALS[id].cat === 'mugong').map(([, m]) => m.star)); }

/* ───────── 행낭 ───────── */
const has = (id, n = 1) => (S.inv[id] || 0) >= n;
const count = id => S.inv[id] || 0;
function bagUsed() { return Object.values(S.inv).filter(v => v > 0).length + S.gear.length; }
function bagCap() { return calcStats().bag; }
function give(id, n = 1, quiet = false) {
  if (!S.inv[id] && bagUsed() >= bagCap()) { log(`행낭이 가득 차 ${ITEMS[id].name}${josa(ITEMS[id].name, '을를').slice(-1)} 버렸습니다.`, 'bad'); return false; }
  S.inv[id] = (S.inv[id] || 0) + n;
  if (!quiet) log(`${ITEMS[id].icon} ${ITEMS[id].name} ×${n} 획득`, 'loot');
  return true;
}
function take(id, n = 1) { S.inv[id] -= n; if (S.inv[id] <= 0) delete S.inv[id]; }
function giveGear(it) {
  if (bagUsed() >= bagCap()) { log(`행낭이 가득 차 ${it.name}을(를) 두고 왔습니다.`, 'bad'); return false; }
  S.gear.push(it);
  log(`🗡️ [${RARITY[it.rarity].name}] ${it.name} 획득${it.unique ? ` — ${it.unique.text}` : ''}`, 'loot r' + it.rarity);
  return true;
}

function makeGear(base, tier, rarity, crafted) {
  const B = EQUIP_BASES[base];
  const mult = RARITY[rarity].mult;
  const stats = {};
  for (const [k, v] of Object.entries(B.stats(tier))) stats[k] = PCT_STATS.has(k) ? Math.round(v * mult * 10) / 10 : Math.max(1, Math.round(v * mult));
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
function gearValue(it) { return Math.round((it.tier || 1) * 12 * RARITY[it.rarity].mult * (it.crafted ? 1.5 : 1)); }
function equipItem(uid) {
  const i = S.gear.findIndex(g => g.uid === uid); if (i < 0) return;
  const it = S.gear[i];
  S.gear.splice(i, 1);
  if (S.equip[it.slot]) S.gear.push(S.equip[it.slot]);
  S.equip[it.slot] = it;
  log(`${it.name}${josa(it.name, '을를').slice(-1)} 착용했습니다.`);
  clampVitals(); render();
}
function unequip(slot) {
  const it = S.equip[slot]; if (!it) return;
  if (bagUsed() >= bagCap()) { toast('행낭이 가득 찼습니다.'); return; }
  S.gear.push(it); delete S.equip[slot];
  clampVitals(); render();
}
function clampVitals() {
  const st = calcStats();
  S.hp = clamp(S.hp, 0, st.maxHp); S.mp = clamp(S.mp, 0, st.maxMp); S.stamina = clamp(S.stamina, 0, st.maxSta);
}
function weaponType() { return S.equip.weapon ? S.equip.weapon.wtype : 'fist'; }

function useItem(id, inBattle) {
  const I = ITEMS[id]; if (!I.use || !has(id)) return;
  const st = calcStats(); const u = I.use;
  if (inBattle && I.kind === '음식') return;
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
  log(`${I.icon} ${I.name} 사용 — ${parts.join(', ')}`, 'good');
  if (!inBattle) render();
}

/* ───────── 기예 ───────── */
function potKey(pot) { return Object.entries(pot).filter(([, v]) => v > 0).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}*${v}`).join('|'); }
const RECIPE_BY_KEY = {};
for (const r of RECIPES) RECIPE_BY_KEY[r.craft + ':' + potKey(r.in)] = r;

function potTotal() { return Object.values(ui.pot).reduce((a, b) => a + b, 0); }
function doCraft() {
  if (S.zone) return;
  const pot = ui.pot, total = potTotal();
  if (!total) { toast('화로에 재료를 넣으십시오.'); return; }
  for (const [id, n] of Object.entries(pot)) if (!has(id, n)) { toast('재료가 부족합니다.'); return; }
  const C = CRAFTS[ui.craft], lvl = S.crafts[ui.craft];
  for (const [id, n] of Object.entries(pot)) take(id, n);
  const recipe = RECIPE_BY_KEY[ui.craft + ':' + potKey(pot)];
  const st = calcStats();
  const chance = Math.min(98, 78 + lvl.lv * 3 + st.craft);
  let ok = recipe && Math.random() * 100 < chance;
  lvl.xp += ok ? 10 : 6;
  while (lvl.xp >= lvl.lv * 30) { lvl.xp -= lvl.lv * 30; lvl.lv++; log(`${C.name} 숙련도 ${lvl.lv}단계!`, 'good'); }
  let result;
  if (ok) {
    const first = !S.codex.includes(recipe.id);
    if (first) S.codex.push(recipe.id);
    if (recipe.out.startsWith('eq:')) {
      const [, base, tier] = recipe.out.split(':');
      const r = Math.random() * 100;
      const rar = r < 2 + st.craft / 3 ? 4 : r < 14 + st.craft + lvl.lv * 2 ? 3 : 2;
      const it = makeGear(base, +tier, rar, true);
      if (!giveGear(it)) { S.gear.push(it); }
      result = { ok: true, first, text: `[${RARITY[rar].name}] ${it.name}`, sub: it.unique.text, cls: 'r' + rar };
    } else {
      give(recipe.out, 1, true);
      result = { ok: true, first, text: `${ITEMS[recipe.out].icon} ${ITEMS[recipe.out].name}`, sub: ITEMS[recipe.out].desc };
    }
    log(`${C.name} 성공: ${result.text}${first ? ' — 도감에 새로 기록!' : ''}`, 'good');
  } else {
    const fail = C.fail;
    S.inv[fail] = (S.inv[fail] || 0) + 1;
    result = { ok: false, text: `${ITEMS[fail].icon} ${ITEMS[fail].name}`, sub: recipe ? '불 조절에 실패했습니다. 조합은 맞았던 것 같습니다…' : '어울리지 않는 조합입니다. 부산물만 남았습니다.' };
    log(`${C.name} 실패… ${ITEMS[fail].name}${josa(ITEMS[fail].name, '이가').slice(-1)} 남았습니다.`, 'bad');
  }
  ui.craftResult = result;
  ui.pot = {};
  render();
}

/* 무신상 봉헌 */
const OFFER = {
  twistedIron: { key: 'atk', val: 1, text: '공격력 +1' },
  burntAsh:    { key: 'mp',  val: 4, text: '최대 내력 +4' },
  dregs:       { key: 'eva', val: 0.3, text: '회피율 +0.3%' },
};
function offer(id, all) {
  if (S.zone || !has(id)) return;
  const n = all ? count(id) : 1;
  take(id, n);
  const o = OFFER[id];
  S.shrine[o.key] = Math.round((S.shrine[o.key] + o.val * n) * 10) / 10;
  const before = Math.floor(S.shrine.total / 10);
  S.shrine.total += n;
  log(`무명 무신상에 ${ITEMS[id].name} ${n}개를 봉헌했습니다. ${o.text}${n > 1 ? ` ×${n}` : ''}`, 'gold');
  if (Math.floor(S.shrine.total / 10) > before) log('무신상의 눈이 희미하게 빛납니다… 치명타율 +2%', 'gold');
  render();
}

/* ───────── 강호행: 지도 ───────── */
const DIRS = [[-1, -1, '↖'], [0, -1, '↑'], [1, -1, '↗'], [-1, 0, '←'], [1, 0, '→'], [-1, 1, '↙'], [0, 1, '↓'], [1, 1, '↘']];
function tileAt(zid, x, y) { const row = ZONES[zid].map[y]; if (!row || x < 0 || x >= row.length) return '_'; return row[x]; }
function passable(zid, x, y) { const c = tileAt(zid, x, y); if (c === '_') return false; if (c === 'L' && !S.cleared[zid]) return false; return true; }
function zoneUnlocked(zid) { const u = ZONES[zid].unlock; return !u || (S.flags[u.boss] && bestMugongStar() >= u.star); }
function reveal(zid, x, y) {
  S.seen[zid] = S.seen[zid] || {};
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (tileAt(zid, x + dx, y + dy) !== '_') S.seen[zid][`${x + dx},${y + dy}`] = 1;
}
function enterZone(zid) {
  if (!zoneUnlocked(zid)) return;
  if (!S.flags.tools) { toast('대사형 조운에게 먼저 기본 도구를 받으십시오.'); return; }
  const map = ZONES[zid].map;
  for (let y = 0; y < map.length; y++) { const x = map[y].indexOf('S'); if (x >= 0) S.zone = { id: zid, x, y }; }
  reveal(zid, S.zone.x, S.zone.y);
  log(`${ZONES[zid].name}(${ZONES[zid].hanja})에 들어섰습니다.`, 'place');
  ui.tab = 'field'; render();
}
function leaveZone() {
  if (ui.battle) return;
  log(`${ZONES[S.zone.id].name}을(를) 떠나 청풍문으로 돌아왔습니다.`, 'place');
  S.zone = null; render();
}
function move(dx, dy) {
  if (!S.zone || ui.battle) return;
  const nx = S.zone.x + dx, ny = S.zone.y + dy;
  if (!passable(S.zone.id, nx, ny)) return;
  S.zone.x = nx; S.zone.y = ny;
  reveal(S.zone.id, nx, ny);
  render();
}
function nodeKey() { return `${S.zone.id}:${S.zone.x},${S.zone.y}`; }
function nodeInfo(zid, x, y) {
  const c = tileAt(zid, x, y), Z = ZONES[zid], key = `${zid}:${x},${y}`;
  if ('123'.includes(c)) { const e = ENEMIES[Z.enemies[+c - 1]]; return { type: 'battle', icon: '⚔️', label: e.name, enemy: Z.enemies[+c - 1] }; }
  if (c === 'H') return { type: 'herb', icon: '🌿', label: '약초 군락', cd: S.gatherCd[key] };
  if (c === 'M') return { type: 'mine', icon: '⛏️', label: '광맥', cd: S.gatherCd[key] };
  if (c === 'C') return { type: 'chest', icon: S.opened[key] ? '📦' : '🎁', label: S.opened[key] ? '빈 상자' : '보물상자', done: S.opened[key] };
  if (c === 'G') return { type: 'gimmick', icon: '⚙️', label: Z.gimmick.name, done: S.cleared[zid] };
  if (c === 'K') return { type: 'boss', icon: '👹', label: ENEMIES[Z.boss].name, enemy: Z.boss };
  if (c === 'S') return { type: 'gate', icon: '🏯', label: '입구' };
  if (c === 'L') return { type: 'path', icon: S.cleared[zid] ? '·' : '🚧', label: S.cleared[zid] ? '트인 길' : '막힌 길' };
  return { type: 'path', icon: '·', label: '산길' };
}
function spend(cost) {
  if (S.stamina < cost) { toast(`기력이 부족합니다 (필요 ${cost}). 뒷마당에서 쉬거나 음식을 드십시오.`); return false; }
  S.stamina -= cost; return true;
}
function rollTable(table) {
  const out = [];
  for (const [id, a, b, p] of table) if (Math.random() < (p ?? 1)) out.push([id, rint(a, b)]);
  return out;
}
function interact() {
  if (!S.zone || ui.battle) return;
  const { id: zid, x, y } = S.zone, Z = ZONES[zid], info = nodeInfo(zid, x, y), key = nodeKey();
  if (info.type === 'battle') { if (spend(STAMINA_COST.battle)) startBattle(info.enemy); return; }
  if (info.type === 'boss') { if (spend(STAMINA_COST.boss)) startBattle(info.enemy); return; }
  if (info.type === 'herb' || info.type === 'mine') {
    if (info.cd && info.cd > now()) return;
    if (!spend(STAMINA_COST[info.type])) return;
    const got = rollTable(Z[info.type]);
    log(info.type === 'herb' ? '약초낫으로 풀숲을 헤쳤습니다.' : '곡괭이로 광맥을 두드렸습니다.', 'muted');
    for (const [id, n] of got) give(id, n);
    S.gatherCd[key] = now() + 90 * 1000;
    progressMission('gather');
  }
  if (info.type === 'chest') {
    if (info.done || !spend(STAMINA_COST.chest)) return;
    S.opened[key] = 1;
    log('녹슨 상자의 자물쇠를 비틀어 열었습니다.', 'muted');
    for (const [id, a, b] of Z.chest) {
      const n = rint(a, b);
      if (id === 'silver') { S.silver += n; log(`은자 ${n}냥 획득`, 'loot'); } else give(id, n);
    }
  }
  if (info.type === 'gimmick') {
    if (info.done || !spend(STAMINA_COST.gimmick)) return;
    const st = calcStats(), g = Z.gimmick;
    if (st[g.stat] >= g.need) { S.cleared[zid] = 1; log(`${g.name}: ${g.text} 막힌 길이 열렸습니다.`, 'good'); }
    else log(`${g.name}: ${g.fail}`, 'bad');
  }
  render();
}

/* ───────── 전투 ───────── */
function dmgCalc(atk, def) { return Math.max(1, Math.round((atk * atk) / (atk + def) * rnd(0.9, 1.1))); }
function reaction(dmg, maxHp) { const r = dmg / maxHp; return HIT_TEXT.find(([t]) => r >= t); }

function startBattle(eid) {
  const E = ENEMIES[eid];
  const st = calcStats();
  ui.battle = { eid, e: { ...E, hpNow: E.hp }, pg: 0, eg: 0, lines: [], over: false, turn: 0, st };
  bLine(`⚔️ ${josa(E.name, '이가')} 앞을 가로막습니다!`, 'head');
  if (E.boss) {
    const quotes = { boarKing: '외눈 멧돼지왕이 콧김을 뿜으며 땅을 긁습니다.', jeokyeom: '적염도: "청풍문? 그 거지 문파에서 아직 사람이 나오나?"', galcheon: '갈천: "물 위에서 나를 이긴 자는 없다. 뭍에서도 마찬가지고."' };
    bLine(quotes[eid], 'npc');
  }
  const mt = MANUALS[S.active.mugong];
  if (mt && mt.weapon !== weaponType()) bLine(`(《${mt.name}》은 ${WEAPON_TYPES[mt.weapon]} 무공입니다. 병기가 맞지 않아 초식을 펼칠 수 없습니다.)`, 'muted');
  render();
  scheduleBattle();
}
function bLine(text, cls = '') { ui.battle.lines.push({ text, cls }); }
function scheduleBattle() {
  clearTimeout(ui.btimer);
  if (!ui.battle || ui.battle.over) return;
  ui.btimer = setTimeout(battleStep, ui.fast ? 220 : 650);
}
function battleStep() {
  const b = ui.battle; if (!b || b.over) return;
  b.st = calcStats();
  const pSpd = b.st.spd, eSpd = b.e.spd;
  while (b.pg < 100 && b.eg < 100) { b.pg += pSpd; b.eg += eSpd; }
  if (b.pg >= b.eg) { b.pg -= 100; playerTurn(b); }
  else { b.eg -= 100; enemyTurn(b); }
  b.turn++;
  if (b.e.hpNow <= 0) winBattle(b);
  else if (S.hp <= 0) loseBattle(b);
  renderBattle();
  scheduleBattle();
}
function playerHit(b, mult, label) {
  const e = b.e, st = b.st;
  const hitChance = Math.max(55, 95 - e.eva);
  if (Math.random() * 100 >= hitChance) { bLine(`${label} — ${josa(e.name, '이가')} 몸을 틀어 피했습니다. 허공을 가릅니다.`, 'miss'); return false; }
  let dmg = dmgCalc(st.atk, e.def) * mult;
  const crit = Math.random() * 100 < st.crit;
  if (crit) dmg *= 1.6;
  dmg = Math.round(dmg);
  e.hpNow = Math.max(0, e.hpNow - dmg);
  const [, txt, cls] = reaction(dmg, e.hp);
  bLine(`${label}${crit ? ' <b class="crit">치명!</b>' : ''} <span class="dmg">${fmt(dmg)}</span>의 피해. ${josa(e.name, '이가')} ${txt}`, cls);
  if (st.lifesteal) { const heal = Math.round(dmg * st.lifesteal / 100); S.hp = Math.min(st.maxHp, S.hp + heal); }
  return true;
}
function playerTurn(b) {
  const st = b.st, id = S.active.mugong, M = MANUALS[id], m = S.manuals[id];
  const canCombo = M && M.weapon === weaponType();
  let comboDone = false;
  if (canCombo && Math.random() * 100 < 35 + st.combo) {
    const moves = unlockedMoves(m.star), g = GRADES[M.grade].mult;
    const mults = [1.6, 2.2, 3.2].map(v => v * (1 + (g - 1) * 0.5));
    const chain = [100, 50, 38];
    for (let i = 0; i < moves; i++) {
      if (i > 0 && Math.random() * 100 >= chain[i] + st.combo) break;
      const cost = Math.max(1, Math.round((5 + m.star + i * (6 + m.star)) * g * (1 - (st.mpCost + st.mpSave) / 100)));
      if (S.mp < cost) { if (i === 0) break; bLine(`내력이 바닥나 제${i + 1}초식으로 잇지 못했습니다.`, 'muted'); break; }
      S.mp -= cost;
      comboDone = true;
      const ok = playerHit(b, mults[i], `<b class="move m${i + 1}">【${M.moves[i]}】</b> 제${i + 1}초식!`);
      if (ok) addXp(id, 'cxp', 2 + i * 3);
      if (!ok || b.e.hpNow <= 0) break;
    }
  }
  if (!comboDone) {
    const ok = playerHit(b, 1, '평타(平打)');
    if (ok && canCombo) addXp(id, 'cxp', 1);
  }
  S.mp = Math.min(st.maxMp, S.mp + st.mpRegen);
}
function enemyTurn(b) {
  const e = b.e, st = b.st;
  const hitChance = Math.max(40, 95 - st.eva);
  if (Math.random() * 100 >= hitChance) { bLine(`${e.name}의 공격 — 경공으로 가볍게 흘려냈습니다.`, 'dodge'); addXp(S.active.gyeonggong, 'cxp', 1); return; }
  let dmg = dmgCalc(e.atk, st.def);
  const crit = Math.random() * 100 < Math.max(0, 8 - st.critRes / 2);
  if (crit) dmg = Math.round(dmg * 1.5);
  S.hp = Math.max(0, S.hp - dmg);
  bLine(`${e.name}의 공격${crit ? ' <b class="crit">치명!</b>' : ''} — 활력 <span class="dmg taken">-${fmt(dmg)}</span>`, 'taken');
}
function winBattle(b) {
  b.over = true; b.win = true;
  const E = ENEMIES[b.eid];
  bLine(`🏆 ${josa(E.name, '을를')} 쓰러뜨렸습니다!`, 'win');
  for (const cat of CAT_ORDER) addXp(S.active[cat], 'cxp', E.xp);
  bLine(`실전 경험치 +${E.xp} (4대 영역)`, 'muted');
  const silver = rint(...E.silver); S.silver += silver;
  bLine(`은자 ${silver}냥`, 'loot');
  log(`${E.name} 토벌. 은자 +${silver}, 실전 경험 +${E.xp}`, 'good');
  for (const [id, p] of E.drops) if (Math.random() < p) { if (give(id, 1)) bLine(`${ITEMS[id].icon} ${ITEMS[id].name}`, 'loot'); }
  if (E.gear && Math.random() < E.gear[1]) {
    const bases = Object.keys(EQUIP_BASES);
    const it = makeGear(pick(bases), E.gear[0], rollDropRarity(!!E.boss), false);
    if (giveGear(it)) bLine(`🗡️ [${RARITY[it.rarity].name}] ${it.name}`, 'loot r' + it.rarity);
  }
  S.kills++;
  progressMission('kill', b.eid);
  if (E.boss && !S.flags[E.boss]) {
    S.flags[E.boss] = true;
    const msgs = {
      boss1: '외눈 멧돼지왕이 쓰러지자 청풍산에 고요가 찾아왔습니다. 조운 사형이 염화채 이야기를 꺼낼 때가 되었습니다.',
      boss2: '채주 적염도가 무릎을 꿇었습니다. 염화채의 불길이 잦아듭니다. 장문인이 이류 비급을 풀어줄 것입니다.',
      boss3: '방주 갈천이 강물 속으로 가라앉았습니다. 적룡방이 무너졌습니다. 이제 대성만이 남았습니다.',
    };
    bLine(msgs[E.boss], 'gold');
    log(msgs[E.boss], 'gold');
  }
}
function loseBattle(b) {
  b.over = true; b.win = false;
  const lost = Math.floor(S.silver * 0.1);
  S.silver -= lost;
  bLine(`💀 눈앞이 캄캄해집니다… (은자 ${lost}냥을 잃었습니다)`, 'bad');
  log(`${b.e.name}에게 패했습니다. 조운 사형이 업고 돌아왔습니다. 은자 -${lost}`, 'bad');
}
function fleeBattle() {
  const b = ui.battle; if (!b || b.over) return;
  const chance = (b.e.boss ? 0.3 : 0.55) + (b.st.spd - b.e.spd) * 0.03;
  if (Math.random() < chance) { bLine('💨 뒤도 돌아보지 않고 몸을 뺐습니다.', 'muted'); b.over = true; b.fled = true; }
  else { bLine('도주에 실패했습니다!', 'bad'); b.eg += 60; }
  renderBattle();
}
function closeBattle() {
  const b = ui.battle; if (!b || !b.over) return;
  clearTimeout(ui.btimer);
  ui.battle = null;
  if (!b.win && !b.fled) {
    S.zone = null;
    const st = calcStats(); S.hp = Math.round(st.maxHp * 0.3);
    ui.tab = 'yard';
  }
  save(); render();
}
function battleItem(id) {
  const b = ui.battle; if (!b || b.over || !has(id)) return;
  useItem(id, true);
  bLine(`${ITEMS[id].icon} ${ITEMS[id].name}을(를) 삼켰습니다.`, 'good');
  renderBattle();
}

/* ───────── 문파 임무 ───────── */
function genMission() {
  const zones = ZONE_ORDER.filter(zoneUnlocked);
  const zid = pick(zones), Z = ZONES[zid];
  if (Math.random() < 0.55) {
    const eid = pick(Z.enemies), E = ENEMIES[eid], n = rint(3, 6);
    return { type: 'kill', target: eid, n, prog: 0, reward: Math.round(E.xp * n * 0.9 + 10), zone: zid };
  }
  const pool = [...Z.herb, ...Z.mine].map(r => r[0]).filter(id => !['wood'].includes(id));
  const id = pick(pool), n = rint(2, 5);
  return { type: 'deliver', target: id, n, prog: 0, reward: Math.round(ITEMS[id].price * n * 2.5 + 10), zone: zid };
}
function ensureMissions() { while (S.missions.length < 3) S.missions.push(genMission()); }
function progressMission(kind, target) {
  for (const m of S.missions) if (m.type === 'kill' && kind === 'kill' && m.target === target && m.prog < m.n) m.prog++;
}
function missionReady(m) { return m.type === 'kill' ? m.prog >= m.n : has(m.target, m.n); }
function completeMission(i) {
  const m = S.missions[i]; if (!m || !missionReady(m) || S.zone) return;
  if (m.type === 'deliver') take(m.target, m.n);
  S.silver += m.reward;
  log(`문파 임무 완료! 은자 +${m.reward}`, 'good');
  if (Math.random() < 0.35) give(pick(['potionHp', 'potionMp', 'lingzhi']), 1);
  S.missions.splice(i, 1); ensureMissions(); render();
}
function rerollMissions() {
  if (S.silver < 5) { toast('은자가 부족합니다.'); return; }
  S.silver -= 5; S.missions = []; ensureMissions(); log('노벽송이 하품을 하며 새 임무 두루마리를 던져줍니다.', 'npc'); render();
}

/* ───────── NPC ───────── */
function talkJoun() {
  if (!S.flags.tools) {
    S.flags.tools = true;
    log('조운: "산에 들어가려면 연장은 챙겨야지. 약초낫이랑 곡괭이다. 잃어버리지 말고."', 'npc');
    log('🧰 약초낫, 곡괭이를 받았습니다. 이제 채집(🌿)과 채광(⛏️)을 할 수 있습니다.', 'good');
    const mt = MANUALS[S.active.mugong];
    if (mt.weapon !== 'fist') {
      const base = mt.weapon; const it = makeGear(base, 1, 0, false);
      S.equip.weapon = it;
      log(`조운: "${mt.name}을 익힌다고? 그럼 이거라도 쥐고 다녀라." — ${it.name} [하품] 착용`, 'npc');
    }
    give('potionHp', 2);
    render(); return;
  }
  const st = calcStats();
  const lines = ZONE_ORDER.filter(zoneUnlocked).map(zid => {
    const Z = ZONES[zid]; const boss = ENEMIES[Z.boss];
    const power = st.atk * 2 + st.def * 3 + st.maxHp / 10;
    const bp = boss.atk * 2 + boss.def * 3 + boss.hp / 10;
    const r = power / bp;
    const verdict = r > 1.4 ? '이제 네게 위험하진 않다. 다만 방심은 금물.' : r > 1.0 ? '해볼 만하다. 금창약은 넉넉히.' : r > 0.7 ? '아직 두목은 버겁다. 졸개들로 몸을 더 만들어라.' : '가지 마라. 진심이다.';
    return `${Z.name}: ${verdict}`;
  });
  log(`조운: "${pick(['내가 먼저 돌아봤다.', '위험도를 알려주마.', '밥은 먹고 다니냐.'])}" ${lines.join(' / ')}`, 'npc');
}
function buyFromJoun(id) {
  const g = SHOP_GEAR.find(x => x.id === id);
  if (!g || S.silver < g.price || (g.req && !S.flags[g.req])) return;
  if (bagUsed() >= bagCap()) { toast('행낭이 가득 찼습니다.'); return; }
  S.silver -= g.price;
  S.gear.push({ uid: S.uid++, shop: g.id, slot: g.slot, name: g.name, rarity: g.rarity, stats: { ...g.stats }, unique: null });
  log(`${g.name}을(를) 은자 ${g.price}냥에 들였습니다. 행낭에서 착용하십시오.`, 'good');
  render();
}
function sellItem(id, all) {
  const n = all ? count(id) : 1; if (!n) return;
  const p = Math.max(1, Math.floor(ITEMS[id].price / 2)) * n;
  if (ITEMS[id].kind === '부산물' || ITEMS[id].kind === '증표') return;
  take(id, n); S.silver += p;
  log(`${ITEMS[id].name} ${n}개를 조운에게 넘기고 은자 ${p}냥을 받았습니다.`);
  render();
}
function sellGear(uid) {
  const i = S.gear.findIndex(g => g.uid === uid); if (i < 0) return;
  const it = S.gear[i]; const p = it.shop ? Math.floor((SHOP_GEAR.find(g => g.id === it.shop).price || 0) / 3) : gearValue(it);
  S.gear.splice(i, 1); S.silver += p;
  log(`${it.name}을(를) 은자 ${p}냥에 팔았습니다.`);
  render();
}
function arinSnack() {
  if (S.arin.snack === today()) return;
  S.arin.snack = today();
  give('arinSnack', 1, true);
  log(`아린: "${pick(['사형! 이거 몰래 구운 거예요. 조운 사형한텐 비밀!', '오늘 약과는 꿀을 두 배로 넣었어요!', '헤헤, 수련 힘들죠? 이거 먹어요!'])}" — 🍪 아린표 약과를 받았습니다.`, 'npc');
  render();
}
function arinHint() {
  const free = S.arin.hint !== today();
  if (!free && S.silver < 20) { toast('은자가 부족합니다.'); return; }
  const pool = RECIPES.filter(r => !S.codex.includes(r.id) && (r.hint.startsWith('아린') || r.hint.startsWith('조운')) && !/_[23]$/.test(r.id));
  if (!pool.length) { log('아린: "헤헤, 제가 아는 건 사형이 다 아는걸요?"', 'npc'); return; }
  if (free) S.arin.hint = today(); else S.silver -= 20;
  const r = pick(pool);
  log(`🔖 ${r.hint}`, 'hint');
  S.hints = S.hints || []; if (!S.hints.includes(r.id)) S.hints.push(r.id);
  render();
}
function barter(i) {
  const b = BARTER[i];
  for (const [id, n] of Object.entries(b.give)) if (!has(id, n)) return;
  for (const [id, n] of Object.entries(b.give)) take(id, n);
  for (const [id, n] of Object.entries(b.get)) give(id, n);
  log('아린: "거래 성립! 물리기 없기예요!"', 'npc');
  render();
}
function arinBuy(id) {
  const s = ARIN_SHOP.find(x => x.id === id);
  if (S.silver < s.price) { toast('은자가 부족합니다.'); return; }
  if (give(id, 1, true)) { S.silver -= s.price; render(); }
}
function rest() {
  if (S.zone) return;
  const st = calcStats();
  S.hp = st.maxHp; S.mp = st.maxMp;
  if (S.restCd <= now()) {
    S.stamina = Math.min(st.maxSta, S.stamina + 15); S.restCd = now() + 180 * 1000;
    log('평상에 드러누워 한숨 돌렸습니다. 활력·내력 회복, 기력 +15', 'good');
  } else log('평상에서 숨을 골랐습니다. 활력·내력 회복', 'good');
  render();
}
function masterHint() {
  const gated = Object.entries(S.manuals).find(([, m]) => m.gate && !has(GATES[m.star]));
  if (gated) {
    const pill = GATES[gated[1].star];
    const r = RECIPES.find(x => x.out === pill);
    log(`🔖 ${r.hint}`, 'hint');
    S.hints = S.hints || []; if (!S.hints.includes(r.id)) S.hints.push(r.id);
  } else {
    log(`노벽송: "${pick([
      '무공은 몸으로 치고, 머리로 되새기는 게야. 한쪽만 하면 막힌다.',
      '쯧, 늙은이 낮잠 방해 말고 연무장이나 가거라.',
      '실패한 쇳덩이도 버리지 마라. 저 무신상이 다 먹는다.',
      '초식은 이어질 때 무섭다. 내력통을 키워라.',
      '경공이 빠르면 칼이 두 번 나간다. 기억해 둬.',
    ])}"`, 'npc');
  }
}
function buyManual(id) {
  const M = MANUALS[id];
  if (S.manuals[id] || S.silver < M.price || (M.req && !S.flags[M.req])) return;
  S.silver -= M.price;
  S.manuals[id] = { star: 1, cxp: 0, txp: 0, gate: false };
  log(`《${M.name}》 비급을 얻었습니다. 연무장에서 수련 비급을 바꿀 수 있습니다.`, 'gold');
  render();
}
function setActive(cat, id) {
  if (ui.battle) return;
  S.active[cat] = id; clampVitals(); render();
}
function canHasan() { return S.flags.boss3 && Object.entries(S.manuals).some(([id, mm]) => MANUALS[id].cat === 'mugong' && mm.star >= 12) && !has('hasanryeong'); }
function doHasan() {
  if (!canHasan()) return;
  S.inv.hasanryeong = 1; S.flags.hasan = true;
  log('노벽송이 오래된 목갑에서 누런 종이 한 장을 꺼냅니다.', 'npc');
  log('노벽송: "청풍문 제자 ' + S.name + '. 오늘부로 하산을 허한다. 낙양으로 가라. 강호는 넓고, 네 무공은 이제 시작이다."', 'npc');
  log('📜 낙양성 하산령을 받았습니다! — 제1장 [청풍문 편] 완결', 'gold');
  ui.modal = 'ending';
  render();
}

/* ───────── 진행 목표 ───────── */
function goals() {
  const ms = bestMugongStar();
  return [
    ['대사형 조운에게 기본 도구 받기', !!S.flags.tools],
    ['무공 4성 — 하급 돌파단으로 소관문 돌파', ms >= 4],
    ['청풍산 두목 외눈 멧돼지왕 토벌', !!S.flags.boss1],
    ['염화채 채주 적염도 토벌', !!S.flags.boss2],
    ['무공 8성 — 중급 돌파단으로 중관문 돌파', ms >= 8],
    ['적룡방 방주 갈천 토벌', !!S.flags.boss3],
    ['무공 12성 대성 — 상급 돌파단으로 대관문 돌파', ms >= 12],
    ['장문인에게 낙양성 하산령 받기', !!S.flags.hasan],
  ];
}

/* ───────── 시간 흐름 ───────── */
function advance(sec, offline) {
  const st = calcStats();
  const rate = trainRate(st);
  for (const cat of CAT_ORDER) addXp(S.active[cat], 'txp', rate * sec);
  S.stamina = Math.min(st.maxSta, S.stamina + sec / 15);
  if (!S.zone && !ui.battle) {
    S.hp = Math.min(st.maxHp, S.hp + st.maxHp * 0.01 * sec);
    S.mp = Math.min(st.maxMp, S.mp + st.maxMp * 0.01 * sec);
  }
  const t = now();
  const before = S.buffs.length;
  S.buffs = S.buffs.filter(b => b.until > t);
  if (!offline && S.buffs.length < before) log('음식 효과가 사라졌습니다.', 'muted');
}
let lastFrame = now();
function tick() {
  if (!S) return;
  const t = now(), dt = (t - lastFrame) / 1000; lastFrame = t;
  advance(Math.min(dt, 5), false);
  renderHeader();
  renderLive();
}

/* ───────── 화면 ───────── */
const TABS = [
  ['yeonmu', '연무장', '演武場'],
  ['forge', '화로와 풀무', '火爐'],
  ['yard', '뒷마당', '後院'],
  ['hall', '정청', '正廳'],
  ['field', '강호행', '江湖行'],
  ['bag', '행낭', '行囊'],
  ['codex', '도감', '圖鑑'],
];
const BASE_TABS = new Set(['forge', 'yard', 'hall']);

function bar(cls, cur, max, label) {
  const p = max ? clamp(cur / max * 100, 0, 100) : 0;
  return `<div class="bar ${cls}" title="${label}"><span class="bar-fill" style="width:${p}%"></span><span class="bar-text"><b>${label}</b> ${fmt(cur)} / ${fmt(max)}</span></div>`;
}
function renderHeader() {
  const st = calcStats();
  const where = S.zone ? `${ZONES[S.zone.id].name}` : '청풍문';
  $('#status').innerHTML = `
    <div class="who"><span class="name">${esc(S.name)}</span><span class="sect">청풍문 제자 · ${where}</span></div>
    <div class="bars">
      ${bar('hp', S.hp, st.maxHp, '활력')}
      ${bar('mp', S.mp, st.maxMp, '내력')}
      ${bar('sta', S.stamina, st.maxSta, '기력')}
    </div>
    <div class="purse"><span class="coin">銀</span> ${fmt(S.silver)}<small>냥</small></div>`;
}
function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([id, name, hanja]) => {
    const locked = (ui.battle && id !== 'field');
    return `<button class="tab ${ui.tab === id ? 'on' : ''}" data-tab="${id}" ${locked ? 'disabled' : ''}><span class="hj">${hanja}</span>${name}</button>`;
  }).join('');
}
function renderLog() {
  const el = $('#log'); if (!el || !S) return;
  el.innerHTML = S.log.slice(-60).map(l => `<p class="${l.cls}">${l.text}</p>`).join('');
  el.scrollTop = el.scrollHeight;
}
function render() {
  if (!S) return;
  renderHeader(); renderTabs();
  const main = $('#main');
  if (BASE_TABS.has(ui.tab) && S.zone) {
    main.innerHTML = `<section class="panel away"><h2>${TABS.find(t => t[0] === ui.tab)[1]}</h2><p>지금은 ${ZONES[S.zone.id].name}에 나와 있습니다. 청풍문으로 귀환해야 이용할 수 있습니다.</p><button class="btn" data-act="leave">청풍문으로 귀환</button></section>`;
  } else {
    main.innerHTML = ({ yeonmu: viewYeonmu, forge: viewForge, yard: viewYard, hall: viewHall, field: viewField, bag: viewBag, codex: viewCodex })[ui.tab]();
  }
  renderLog();
  renderModal();
  save();
}

function starRow(m) {
  let h = '';
  for (let i = 1; i <= MAX_STAR; i++) {
    const cls = i <= m.star ? 'on' : '';
    const gate = GATES[i - 1] ? ' gate' : '';
    h += `<i class="st ${cls}${gate}" title="${i}성${GATES[i - 1] ? ' (관문)' : ''}">★</i>`;
  }
  return `<div class="stars">${h}</div>`;
}
function xpBars(id) {
  const m = S.manuals[id];
  if (m.star >= MAX_STAR) return '<div class="daesung">大成 · 12성 대성</div>';
  const n = need(m.star);
  const pc = m.cxp / n * 100, pt = m.txp / n * 100;
  const status = m.gate ? `<span class="warn">${GATE_NAME[m.star]} — ${ITEMS[GATES[m.star]].name} 필요</span>`
    : pc >= 100 && pt < 100 ? '<span class="muted">실전은 찼으나 수련이 모자라 정체 중</span>'
    : pt >= 100 && pc < 100 ? '<span class="muted">수련은 찼으나 실전이 모자라 정체 중</span>' : '';
  return `
    <div class="xp" data-live="${id}">
      <div class="xprow"><span>실전</span><div class="xpbar c"><span style="width:${Math.min(100, pc)}%"></span>${pc > 100 ? `<em style="width:${Math.min(100, pc - 100)}%"></em>` : ''}</div><b>${Math.floor(pc)}%</b></div>
      <div class="xprow"><span>수련</span><div class="xpbar t"><span style="width:${Math.min(100, pt)}%"></span>${pt > 100 ? `<em style="width:${Math.min(100, pt - 100)}%"></em>` : ''}</div><b>${Math.floor(pt)}%</b></div>
      <div class="xpstatus">${status}</div>
    </div>`;
}
function renderLive() {
  if (ui.tab !== 'yeonmu') return;
  for (const el of document.querySelectorAll('[data-live]')) {
    const id = el.dataset.live, m = S.manuals[id]; if (!m || m.star >= MAX_STAR) continue;
    const n = need(m.star);
    const [c, t] = el.querySelectorAll('.xprow');
    const set = (row, v) => { const f = row.querySelector('.xpbar > span'); f.style.width = Math.min(100, v) + '%'; row.querySelector('b').textContent = Math.floor(v) + '%'; };
    set(c, m.cxp / n * 100); set(t, m.txp / n * 100);
  }
  const star = document.querySelector('[data-starcheck]');
  if (star && star.dataset.starcheck !== Object.values(S.manuals).map(m => m.star + (m.gate ? 'g' : '')).join()) render();
}

function viewYeonmu() {
  const st = calcStats();
  const rate = trainRate(st);
  const cards = CAT_ORDER.map(cat => {
    const id = S.active[cat], M = MANUALS[id], m = S.manuals[id], C = CATS[cat];
    const owned = Object.keys(S.manuals).filter(k => MANUALS[k].cat === cat);
    const moves = M.moves ? `<div class="moves">${M.moves.map((mv, i) => `<span class="${i < unlockedMoves(m.star) ? 'open' : 'lock'}">${i + 1}. ${mv}${i >= unlockedMoves(m.star) ? ` <small>${i === 1 ? '4성' : '8성'}</small>` : ''}</span>`).join('<i>→</i>')}</div>` : '';
    const wmatch = M.weapon ? (M.weapon === weaponType() ? `<small class="muted">병기: ${WEAPON_TYPES[M.weapon]}</small>` : `<small class="warn">병기 불일치: ${WEAPON_TYPES[M.weapon]} 필요</small>`) : '';
    return `
      <article class="art">
        <header><span class="cat-hj">${C.hanja}</span><div><h3>${C.name}</h3><small>${C.desc}</small></div></header>
        <div class="mname"><span class="grade ${GRADES[M.grade].cls}">${M.grade}</span> 《${M.name}》 <b>${m.star}성</b></div>
        ${starRow(m)}
        ${moves}${wmatch}
        ${xpBars(id)}
        ${owned.length > 1 ? `<label class="sel">수련 비급 <select data-setactive="${cat}">${owned.map(k => `<option value="${k}" ${k === id ? 'selected' : ''}>${MANUALS[k].name} (${S.manuals[k].star}성)</option>`).join('')}</select></label>` : ''}
      </article>`;
  }).join('');
  const offers = Object.entries(OFFER).map(([id, o]) => `
    <div class="offer"><span>${ITEMS[id].icon} ${ITEMS[id].name} <b>×${count(id)}</b></span><small>${o.text}</small>
      <div class="btns"><button class="btn sm" data-offer="${id}" ${!has(id) || S.zone ? 'disabled' : ''}>봉헌</button><button class="btn sm ghost" data-offerall="${id}" ${count(id) < 2 || S.zone ? 'disabled' : ''}>모두</button></div></div>`).join('');
  return `
    <section class="panel" data-starcheck="${Object.values(S.manuals).map(m => m.star + (m.gate ? 'g' : '')).join()}">
      <div class="panel-head"><h2>황폐한 연무장 <small>演武場</small></h2>
        <p class="lede">4대 영역 폐관수련이 쉬지 않고 이어집니다. 수련 경험치 <b>${rate.toFixed(2)}/초</b>${S.zone ? ' (강호행 중이라 절반)' : ''}. 자리를 비워도 최대 8시간까지 쌓입니다. 한 성을 올리려면 <b>실전</b>과 <b>수련</b>이 모두 100%여야 하며, 넘친 경험치는 다음 성으로 이월됩니다.</p></div>
      <div class="arts">${cards}</div>
    </section>
    <section class="panel shrine">
      <div class="panel-head"><h2>무명 무신상 <small>無名武神像</small></h2>
        <p class="lede">이름 모를 무신의 석상. 기예 실패로 남은 부산물을 바치면 영구적인 힘을 내려줍니다. 봉헌 10회마다 치명타율 +2%.</p></div>
      <div class="shrine-stats"><span>공격력 +${S.shrine.atk}</span><span>최대 내력 +${S.shrine.mp}</span><span>회피율 +${S.shrine.eva}%</span><span>치명타율 +${Math.floor(S.shrine.total / 10) * 2}%</span><span class="muted">누적 봉헌 ${S.shrine.total}회</span></div>
      <div class="offers">${offers}</div>
    </section>`;
}

function viewForge() {
  const C = CRAFTS[ui.craft], lvl = S.crafts[ui.craft], st = calcStats();
  const mats = Object.keys(S.inv).filter(id => ITEMS[id].kind === '재료').sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name));
  const potItems = Object.entries(ui.pot).filter(([, n]) => n > 0);
  const res = ui.craftResult;
  return `
    <section class="panel">
      <div class="panel-head"><h2>잡탕 화로와 풀무 <small>火爐</small></h2>
        <p class="lede">레시피는 어디에도 적혀 있지 않습니다. 재료를 직접 섞어 보십시오. 맞는 조합을 찾으면 도감에 영구히 기록됩니다. 틀리면 부산물이 남고, 부산물은 무신상이 받아줍니다.</p></div>
      <div class="crafts">${Object.entries(CRAFTS).map(([k, c]) => `<button class="craft-pick ${ui.craft === k ? 'on' : ''}" data-craft="${k}"><span class="hj">${c.hanja}</span>${c.name}<small>숙련 ${S.crafts[k].lv}단계</small></button>`).join('')}</div>
      <div class="forge">
        <div class="mats">
          <h4>재료 <small>눌러서 화로에 넣기</small></h4>
          ${mats.length ? `<div class="chips">${mats.map(id => { const left = count(id) - (ui.pot[id] || 0); return `<button class="chip" data-add="${id}" ${left <= 0 ? 'disabled' : ''}>${ITEMS[id].icon} ${ITEMS[id].name} <b>${left}</b></button>`; }).join('')}</div>` : '<p class="muted">재료가 없습니다. 강호행에서 채집하거나 아린에게 구하십시오.</p>'}
        </div>
        <div class="pot">
          <h4>${C.name} 화로 <small>최대 4개 · 성공률 ${Math.min(98, 78 + lvl.lv * 3 + st.craft)}% (맞는 조합일 때)</small></h4>
          <div class="pot-slots">${[0, 1, 2, 3].map(i => { const flat = potItems.flatMap(([id, n]) => Array(n).fill(id)); const id = flat[i]; return id ? `<button class="slot full" data-rem="${id}">${ITEMS[id].icon}<small>${ITEMS[id].name}</small></button>` : '<div class="slot">＋</div>'; }).join('')}</div>
          <div class="btns"><button class="btn primary" data-act="craft" ${!potTotal() ? 'disabled' : ''}>${C.name} 시도</button><button class="btn ghost" data-act="clearpot" ${!potTotal() ? 'disabled' : ''}>비우기</button></div>
          ${res ? `<div class="result ${res.ok ? 'ok' : 'fail'}"><b class="${res.cls || ''}">${res.ok ? '성공' : '실패'} — ${res.text}</b>${res.first ? '<span class="new">도감 등재</span>' : ''}<small>${esc(res.sub || '')}</small></div>` : ''}
        </div>
      </div>
    </section>`;
}

function viewYard() {
  const st = calcStats();
  const foods = Object.keys(S.inv).filter(id => ITEMS[id].use && ITEMS[id].kind !== '영단');
  const restReady = S.restCd <= now();
  return `
    <section class="panel">
      <div class="panel-head"><h2>뒷마당 평상 · 숙소 <small>後院</small></h2>
        <p class="lede">청풍문에 있는 동안 활력과 내력은 저절로 차오릅니다. 기력은 어디서나 15초에 1씩 돌아오고, 음식을 먹으면 곧바로 찹니다.</p></div>
      <div class="row">
        <div class="card">
          <h4>평상에 눕기</h4>
          <p class="muted">활력·내력을 가득 채웁니다. ${restReady ? '지금 쉬면 기력도 +15.' : `기력 회복은 ${Math.ceil((S.restCd - now()) / 1000)}초 뒤.`}</p>
          <button class="btn" data-act="rest">한숨 돌리기</button>
        </div>
        <div class="card">
          <h4>음식·영약 먹기</h4>
          ${foods.length ? `<div class="chips">${foods.map(id => `<button class="chip" data-use="${id}" title="${esc(ITEMS[id].desc)}">${ITEMS[id].icon} ${ITEMS[id].name} <b>${count(id)}</b></button>`).join('')}</div>` : '<p class="muted">먹을 것이 없습니다. 화로에서 조리해 보십시오.</p>'}
          ${S.buffs.length ? `<p class="buffs">${S.buffs.map(b => `<span class="pill">${b.name} ${Math.ceil((b.until - now()) / 60000)}분</span>`).join('')}</p>` : ''}
        </div>
      </div>
    </section>
    <section class="panel npc">
      <div class="npc-head"><div class="portrait arin">璘</div><div><h3>사매 아린</h3><small>붉은 댕기 머리의 말괄량이. 청풍문의 마스코트.</small></div></div>
      <div class="row">
        <div class="card">
          <h4>오늘의 간식</h4>
          <button class="btn" data-act="snack" ${S.arin.snack === today() ? 'disabled' : ''}>${S.arin.snack === today() ? '내일 또 주겠대요' : '약과 받기'}</button>
          <h4>레시피 귀띔</h4>
          <p class="muted">아린이 주워들은 조합을 알려줍니다. 하루 한 번 무료, 이후 은자 20냥.</p>
          <button class="btn" data-act="hint">${S.arin.hint === today() ? '은자 20냥 주고 묻기' : '살짝 물어보기'}</button>
        </div>
        <div class="card">
          <h4>잡템 물물교환</h4>
          <ul class="barter">${BARTER.map((b, i) => { const ok = Object.entries(b.give).every(([id, n]) => has(id, n)); return `<li><span>${Object.entries(b.give).map(([id, n]) => `${ITEMS[id].icon}${ITEMS[id].name}×${n}`).join(' ')} → ${Object.entries(b.get).map(([id, n]) => `${ITEMS[id].icon}${ITEMS[id].name}×${n}`).join(' ')}</span><button class="btn sm" data-barter="${i}" ${ok ? '' : 'disabled'}>교환</button></li>`; }).join('')}</ul>
          <h4>아린의 광주리</h4>
          <div class="chips">${ARIN_SHOP.map(s => `<button class="chip" data-arinbuy="${s.id}" ${S.silver < s.price ? 'disabled' : ''}>${ITEMS[s.id].icon} ${ITEMS[s.id].name} <b>${s.price}냥</b></button>`).join('')}</div>
        </div>
      </div>
    </section>`;
}

function viewHall() {
  const gated = Object.entries(S.manuals).filter(([, m]) => m.gate);
  const g = goals();
  const manualShop = Object.entries(MANUALS).filter(([id, M]) => M.price > 0 && !S.manuals[id]);
  return `
    <section class="panel">
      <div class="npc-head"><div class="portrait master">松</div><div><h3>장문인 노벽송</h3><small>게으르고 헐렁한 노인. 낮잠이 무공보다 길다. 하지만 결정적인 순간엔 누구보다 날카롭다.</small></div><button class="btn ghost sm" data-act="masterhint">말 걸기</button></div>
      <div class="row">
        <div class="card">
          <h4>관문 돌파 시험</h4>
          ${gated.length ? gated.map(([id, m]) => { const pill = GATES[m.star]; return `<div class="gate-row"><span>《${MANUALS[id].name}》 ${m.star}성 · ${GATE_NAME[m.star]}</span><button class="btn primary sm" data-break="${id}" ${has(pill) ? '' : 'disabled'}>${ITEMS[pill].icon} ${ITEMS[pill].name}${has(pill) ? '으로 돌파' : ' 없음'}</button></div>`; }).join('') : '<p class="muted">관문에 막힌 비급이 없습니다. 3성·7성·11성이 가득 차면 이곳에서 돌파단으로 관문을 넘습니다.</p>'}
          ${canHasan() ? '<div class="hasan"><p>노벽송이 조용히 눈을 뜹니다.</p><button class="btn primary" data-act="hasan">하산 허가를 청한다</button></div>' : ''}
        </div>
        <div class="card">
          <h4>제1장 청풍문 편</h4>
          <ol class="goals">${g.map(([t, d]) => `<li class="${d ? 'done' : ''}">${t}</li>`).join('')}</ol>
        </div>
      </div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>문파 임무 <small>門派任務</small></h2><button class="btn ghost sm" data-act="reroll">새 임무 (5냥)</button></div>
      <ul class="missions">${S.missions.map((m, i) => {
        const tname = m.type === 'kill' ? ENEMIES[m.target].name : ITEMS[m.target].name;
        const prog = m.type === 'kill' ? m.prog : Math.min(count(m.target), m.n);
        return `<li><div><b>${m.type === 'kill' ? '토벌' : '납품'}</b> ${tname} ${m.n}${m.type === 'kill' ? '마리' : '개'} <small class="muted">${ZONES[m.zone].name}</small></div><div class="mprog"><span style="width:${prog / m.n * 100}%"></span></div><span class="tabnum">${prog}/${m.n}</span><span class="reward">${m.reward}냥</span><button class="btn sm" data-mission="${i}" ${missionReady(m) ? '' : 'disabled'}>완료</button></li>`;
      }).join('')}</ul>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>장경각 서가 <small>藏經閣</small></h2><p class="lede">문파의 비급과 신분패. 이류 비급은 염화채 채주를 꺾은 뒤에야 내준다고 합니다.</p></div>
      <div class="shop">${manualShop.map(([id, M]) => { const locked = M.req && !S.flags[M.req]; return `<div class="shop-item"><span class="grade ${GRADES[M.grade].cls}">${M.grade}</span><b>《${M.name}》</b><small>${CATS[M.cat].name}${M.weapon ? ' · ' + WEAPON_TYPES[M.weapon] : ''}</small><button class="btn sm" data-buymanual="${id}" ${locked || S.silver < M.price ? 'disabled' : ''}>${locked ? '잠김' : M.price + '냥'}</button></div>`; }).join('')}
      ${SHOP_GEAR.filter(x => x.slot === 'badge' && x.price > 0).map(gg => { const locked = gg.req && !S.flags[gg.req]; return `<div class="shop-item"><span class="grade r${gg.rarity}">${RARITY[gg.rarity].name}</span><b>${gg.name}</b><small>수련 효율 +${gg.stats.train}%</small><button class="btn sm" data-buygear="${gg.id}" ${locked || S.silver < gg.price ? 'disabled' : ''}>${locked ? '잠김' : gg.price + '냥'}</button></div>`; }).join('')}</div>
    </section>
    <section class="panel npc">
      <div class="npc-head"><div class="portrait joun">雲</div><div><h3>대사형 조운</h3><small>문파의 살림을 도맡은 듬직한 맏형. 사냥터 사정을 훤히 꿰고 있다.</small></div><button class="btn ${S.flags.tools ? 'ghost' : 'primary'} sm" data-act="joun">${S.flags.tools ? '사냥터 위험도 묻기' : '기본 도구 받기'}</button></div>
      <div class="row">
        <div class="card"><h4>마구간</h4><div class="shop">${SHOP_GEAR.filter(x => x.slot === 'mount').map(gg => { const locked = gg.req && !S.flags[gg.req]; return `<div class="shop-item"><span class="grade r${gg.rarity}">${RARITY[gg.rarity].name}</span><b>${gg.name}</b><small>최대 기력 +${gg.stats.maxSta}</small><button class="btn sm" data-buygear="${gg.id}" ${locked || S.silver < gg.price ? 'disabled' : ''}>${locked ? '잠김' : gg.price + '냥'}</button></div>`; }).join('')}</div></div>
        <div class="card"><h4>살림 정리</h4><p class="muted">행낭에서 재료와 장비를 조운에게 넘겨 은자로 바꿀 수 있습니다.</p><button class="btn ghost sm" data-tab="bag">행낭 열기</button></div>
      </div>
    </section>`;
}

function viewField() {
  if (ui.battle) return viewBattle();
  if (!S.zone) {
    return `
      <section class="panel">
        <div class="panel-head"><h2>강호행 <small>江湖行</small></h2><p class="lede">산문을 나서 사냥터로 향합니다. 길을 걷는 데는 기력이 들지 않지만, 싸우고 캐고 여는 데는 기력이 듭니다.</p></div>
        <div class="zones">${ZONE_ORDER.map(zid => {
          const Z = ZONES[zid], open = zoneUnlocked(zid);
          return `<article class="zone ${open ? '' : 'locked'} t${Z.tier}">
            <div class="zone-name"><span class="hj">${Z.hanja}</span><h3>${Z.name}</h3><small>${Z.range}</small></div>
            <p>${Z.desc}</p>
            <p class="muted">출몰: ${Z.enemies.map(e => ENEMIES[e].name).join(', ')} · 두목 ${ENEMIES[Z.boss].name}${S.flags[ENEMIES[Z.boss].boss] ? ' <span class="pill">토벌함</span>' : ''}</p>
            ${open ? `<button class="btn primary" data-zone="${zid}">${Z.name}으로</button>` : `<p class="warn">입장 조건: ${Z.unlock.text}</p>`}
          </article>`;
        }).join('')}</div>
      </section>`;
  }
  const { id: zid, x, y } = S.zone, Z = ZONES[zid];
  const seen = S.seen[zid] || {};
  let grid = '';
  for (let yy = 0; yy < Z.map.length; yy++) for (let xx = 0; xx < Z.map[yy].length; xx++) {
    const c = tileAt(zid, xx, yy);
    if (c === '_') { grid += '<div class="cell void"></div>'; continue; }
    const k = `${xx},${yy}`;
    const here = xx === x && yy === y;
    const adj = Math.abs(xx - x) <= 1 && Math.abs(yy - y) <= 1 && !here && passable(zid, xx, yy);
    if (!seen[k]) { grid += `<div class="cell fog">?</div>`; continue; }
    const info = nodeInfo(zid, xx, yy);
    const cd = info.cd && info.cd > now();
    grid += `<button class="cell ${info.type} ${here ? 'here' : ''} ${adj ? 'adj' : ''} ${info.done || cd ? 'spent' : ''}" ${adj ? `data-move="${xx - x},${yy - y}"` : 'disabled'} title="${info.label}"><span>${info.icon}</span><small>${info.label}</small></button>`;
  }
  const info = nodeInfo(zid, x, y);
  const pad = DIRS.map(([dx, dy, a]) => `<button class="dir" data-move="${dx},${dy}" ${passable(zid, x + dx, y + dy) ? '' : 'disabled'}>${a}</button>`);
  pad.splice(4, 0, `<div class="dir mid">${info.icon}</div>`);
  let action = '';
  const cost = STAMINA_COST[info.type];
  if (info.type === 'battle') { const E = ENEMIES[info.enemy]; action = `<p><b>${E.name}</b>의 기척이 느껴집니다. <span class="muted">활력 ${E.hp} · 공격 ${E.atk} · 방어 ${E.def}</span></p><button class="btn primary" data-act="interact">⚔️ 싸운다 (기력 -${cost})</button>`; }
  else if (info.type === 'boss') { const E = ENEMIES[info.enemy]; action = `<p class="warn">두목 <b>${E.name}</b>의 거처입니다. <span class="muted">활력 ${E.hp} · 공격 ${E.atk} · 방어 ${E.def}</span></p><button class="btn danger" data-act="interact">👹 도전한다 (기력 -${STAMINA_COST.boss})</button>`; }
  else if (info.type === 'herb' || info.type === 'mine') { const cd = info.cd && info.cd > now(); action = cd ? `<p class="muted">이미 훑었습니다. ${Math.ceil((info.cd - now()) / 1000)}초 뒤 다시 자랍니다.</p>` : `<p>${info.type === 'herb' ? '약초가 무성합니다.' : '반짝이는 광맥이 드러나 있습니다.'}</p><button class="btn primary" data-act="interact">${info.type === 'herb' ? '🌿 채집' : '⛏️ 채광'} (기력 -${cost})</button>`; }
  else if (info.type === 'chest') action = info.done ? '<p class="muted">텅 빈 상자입니다.</p>' : `<p>이끼 낀 상자가 반쯤 묻혀 있습니다.</p><button class="btn primary" data-act="interact">🎁 연다 (기력 -${cost})</button>`;
  else if (info.type === 'gimmick') action = info.done ? '<p class="muted">이미 풀어낸 기관입니다.</p>' : `<p>${Z.gimmick.name}이(가) 길을 막고 있습니다.</p><button class="btn primary" data-act="interact">⚙️ 풀어본다 (기력 -${cost})</button>`;
  else if (info.type === 'gate') action = '<p>산문으로 돌아가는 길목입니다.</p>';
  else action = '<p class="muted">바람 소리만 들립니다. 둘러보는 데는 기력이 들지 않습니다.</p>';
  return `
    <section class="panel field">
      <div class="panel-head"><h2>${Z.name} <small>${Z.hanja} · ${Z.range}</small></h2><button class="btn ghost sm" data-act="leave">청풍문으로 귀환</button></div>
      <div class="field-grid">
        <div class="map" style="grid-template-columns:repeat(${Z.map[0].length},1fr)">${grid}</div>
        <div class="control">
          <div class="dpad">${pad.join('')}</div>
          <div class="here-box"><h4>${info.icon} ${info.label}</h4>${action}</div>
          <div class="quick">${['potionHp', 'potionMp', 'clearPill'].filter(id => has(id)).map(id => `<button class="chip" data-use="${id}">${ITEMS[id].icon} ${ITEMS[id].name} <b>${count(id)}</b></button>`).join('')}</div>
        </div>
      </div>
    </section>`;
}

function viewBattle() {
  const b = ui.battle, e = b.e, st = calcStats();
  const M = MANUALS[S.active.mugong];
  return `
    <section class="panel battle">
      <div class="versus">
        <div class="fighter me"><h3>${esc(S.name)}</h3><small>《${M.name}》 ${S.manuals[S.active.mugong].star}성</small>${bar('hp', S.hp, st.maxHp, '활력')}${bar('mp', S.mp, st.maxMp, '내력')}</div>
        <div class="vs">對</div>
        <div class="fighter foe ${e.boss ? 'boss' : ''}"><h3>${e.name}</h3><small>${e.boss ? '두목' : '적'}</small>${bar('hp foe', e.hpNow, e.hp, '활력')}</div>
      </div>
      <div class="blog" id="blog">${b.lines.map(l => `<p class="${l.cls}">${l.text}</p>`).join('')}</div>
      <div class="bctl">
        ${b.over ? `<button class="btn primary" data-act="closebattle">${b.win ? '전리품을 챙긴다' : b.fled ? '숨을 고른다' : '정신을 잃는다…'}</button>` : `
          ${['potionHp', 'potionMp', 'clearPill'].filter(id => has(id)).map(id => `<button class="chip" data-bitem="${id}">${ITEMS[id].icon} ${ITEMS[id].name} <b>${count(id)}</b></button>`).join('')}
          <button class="btn ghost sm" data-act="fast">${ui.fast ? '보통 속도' : '빠르게'}</button>
          <button class="btn danger sm" data-act="flee">도주</button>`}
      </div>
    </section>`;
}
function renderBattle() {
  if (ui.tab !== 'field' || !ui.battle) return render();
  $('#main').innerHTML = viewBattle();
  renderHeader();
  const bl = $('#blog'); if (bl) bl.scrollTop = bl.scrollHeight;
}

function gearCard(it, where) {
  const R = RARITY[it.rarity];
  const stats = Object.entries(it.stats).map(([k, v]) => `${STAT_NAMES[k]} +${v}${PCT_STATS.has(k) ? '%' : ''}`).join(' · ');
  return `<div class="gear r${it.rarity}">
    <div class="gtop"><span class="grade r${it.rarity}">${R.name}</span><b>${it.name}</b>${it.crafted ? '<span class="pill">제작</span>' : ''}</div>
    <small>${SLOTS[it.slot].name}${it.wtype ? ' · ' + WEAPON_TYPES[it.wtype] : ''} — ${stats}</small>
    ${it.unique ? `<small class="uniq">✦ ${it.unique.text}</small>` : ''}
    <div class="btns">${where === 'bag' ? `<button class="btn sm" data-equip="${it.uid}">착용</button>${!S.zone ? `<button class="btn ghost sm" data-sellgear="${it.uid}">팔기</button>` : ''}` : `<button class="btn ghost sm" data-unequip="${it.slot}">해제</button>`}</div>
  </div>`;
}
function viewBag() {
  const st = calcStats();
  const slots = SLOT_ORDER.map(s => `<div class="eslot"><span class="slabel">${SLOTS[s].name}<small>${SLOTS[s].desc}</small></span>${S.equip[s] ? gearCard(S.equip[s], 'eq') : '<div class="empty">비어 있음</div>'}</div>`).join('');
  const statList = ['atk', 'def', 'maxHp', 'maxMp', 'spd', 'eva', 'crit', 'critRes', 'mpRegen', 'mpCost', 'train', 'craft', 'maxSta'].map(k => `<div><span>${STAT_NAMES[k]}</span><b>${st[k]}${PCT_STATS.has(k) ? '%' : ''}</b></div>`).join('');
  const kinds = ['all', '재료', '영약', '영단', '음식', '부산물', '증표'];
  const items = Object.keys(S.inv).filter(id => ui.bagFilter === 'all' || ITEMS[id].kind === ui.bagFilter);
  return `
    <section class="panel">
      <div class="panel-head"><h2>장비 <small>裝備</small></h2></div>
      <div class="bag-top"><div class="eslots">${slots}</div><div class="statsheet"><h4>능력치</h4>${statList}</div></div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>행낭 <small>行囊 · ${bagUsed()}/${bagCap()}칸</small></h2></div>
      ${S.gear.length ? `<div class="gears">${S.gear.map(it => gearCard(it, 'bag')).join('')}</div>` : ''}
      <div class="filters">${kinds.map(k => `<button class="chip ${ui.bagFilter === k ? 'on' : ''}" data-filter="${k}">${k === 'all' ? '전체' : k}</button>`).join('')}</div>
      <div class="items">${items.map(id => { const I = ITEMS[id]; const sellable = !S.zone && I.price > 0 && !['부산물', '증표'].includes(I.kind); return `<div class="item"><span class="icon">${I.icon}</span><div><b>${I.name}</b> <span class="tabnum">×${count(id)}</span><small>${I.kind} · ${I.desc}</small></div><div class="btns">${I.use ? `<button class="btn sm" data-use="${id}">사용</button>` : ''}${sellable ? `<button class="btn ghost sm" data-sell="${id}" title="1개 ${Math.max(1, Math.floor(I.price / 2))}냥">팔기</button>` : ''}</div></div>`; }).join('') || '<p class="muted">비어 있습니다.</p>'}</div>
    </section>`;
}
function viewCodex() {
  const byCraft = Object.keys(CRAFTS).map(c => {
    const all = RECIPES.filter(r => r.craft === c);
    const known = all.filter(r => S.codex.includes(r.id));
    const hinted = all.filter(r => !S.codex.includes(r.id) && (S.hints || []).includes(r.id));
    return `<article class="codex-col"><h3><span class="hj">${CRAFTS[c].hanja}</span>${CRAFTS[c].name} <small>${known.length}/${all.length}</small></h3>
      ${known.map(r => { const outName = r.out.startsWith('eq:') ? EQUIP_BASES[r.out.split(':')[1]].names[+r.out.split(':')[2] - 1] : ITEMS[r.out].icon + ' ' + ITEMS[r.out].name; return `<div class="rec"><b>${outName}</b><small>${Object.entries(r.in).map(([id, n]) => `${ITEMS[id].name}×${n}`).join(' + ')}</small><button class="btn sm ghost" data-fill="${r.id}" ${S.zone ? 'disabled' : ''}>화로에 담기</button></div>`; }).join('')}
      ${hinted.map(r => `<div class="rec hinted"><small>🔖 ${r.hint}</small></div>`).join('')}
      ${!known.length && !hinted.length ? '<p class="muted">아직 아무것도 모릅니다.</p>' : ''}
    </article>`;
  }).join('');
  return `<section class="panel"><div class="panel-head"><h2>기예 도감 <small>圖鑑</small></h2><p class="lede">성공한 조합과 귀띔받은 단서가 여기에 쌓입니다.</p></div><div class="codex">${byCraft}</div></section>`;
}
function fillPot(rid) {
  const r = RECIPES.find(x => x.id === rid);
  ui.craft = r.craft; ui.pot = { ...r.in }; ui.tab = 'forge'; ui.craftResult = null; render();
}

function renderModal() {
  const m = $('#modal');
  if (!ui.modal) { m.hidden = true; return; }
  m.hidden = false;
  if (ui.modal === 'ending') {
    m.innerHTML = `<div class="sheet ending"><p class="eyebrow">제1장 완결</p><h2>청풍문 편</h2><p>시골 하급 문파의 밑바닥 제자였던 ${esc(S.name)}. 청풍산의 들개를 쫓던 손이 이제 적룡방 방주를 꺾었습니다.</p><p>장문인 노벽송이 건넨 누런 종이 한 장, <b>낙양성 하산령</b>. 산문 밖으로 난 길은 낙양으로 이어집니다.</p><p class="muted">제2장 [낙양성 편]은 준비 중입니다. 계속 청풍문에 머물며 비급을 대성해 둘 수 있습니다.</p><button class="btn primary" data-act="closemodal">산문을 바라본다</button></div>`;
  }
  if (ui.modal === 'reset') {
    m.innerHTML = `<div class="sheet"><h2>처음부터 다시</h2><p>모든 진행이 사라집니다. 정말 새로 시작하시겠습니까?</p><div class="btns"><button class="btn danger" data-act="doreset">새로 시작</button><button class="btn ghost" data-act="closemodal">그만두기</button></div></div>`;
  }
}

/* ───────── 시작 화면 ───────── */
function showIntro() {
  const starters = ['tongbae', 'samjae', 'ohodan', 'jungpyeong', 'tuseok'];
  let chosen = 'samjae';
  const m = $('#modal'); m.hidden = false;
  const draw = () => {
    m.innerHTML = `<div class="sheet intro">
      <p class="eyebrow">江湖見聞錄</p>
      <h1>강호견문록</h1>
      <p>청풍산 기슭, 무너져 가는 하급 문파 <b>청풍문(淸風門)</b>. 장문인은 낮잠을 자고, 대사형은 장작을 패고, 사매는 약과를 굽는다. 그리고 오늘, 새 제자 한 명이 산문을 두드린다.</p>
      <label class="field-l" for="pname">이름</label>
      <input id="pname" maxlength="8" value="이름 없는 제자" autocomplete="off">
      <p class="field-l">노벽송: "뭘 배우고 싶으냐. 이 늙은이가 삼류 비급 하나는 내주마."</p>
      <div class="starters">${starters.map(id => { const M = MANUALS[id]; return `<button class="starter ${chosen === id ? 'on' : ''}" data-starter="${id}"><b>${M.name}</b><small>${WEAPON_TYPES[M.weapon]}</small><span>${M.moves.join(' → ')}</span></button>`; }).join('')}</div>
      <button class="btn primary big" id="begin">산문에 들어선다</button>
    </div>`;
  };
  draw();
  m.onclick = e => {
    const s = e.target.closest('[data-starter]');
    if (s) { const name = $('#pname').value; chosen = s.dataset.starter; draw(); $('#pname').value = name; return; }
    if (e.target.closest('#begin')) {
      const name = ($('#pname').value || '').trim().slice(0, 8) || '무명';
      S = newState(name, chosen);
      const st = calcStats(); S.hp = st.maxHp; S.mp = st.maxMp;
      ensureMissions();
      m.onclick = null; m.hidden = true;
      log(`${name}, 청풍문의 제자가 되었습니다. 《${MANUALS[chosen].name}》을(를) 받았습니다.`, 'gold');
      log('아린: "새 사형이다! 조운 사형한테 가서 연장부터 받아요. 정청에 있어요!"', 'npc');
      ui.tab = 'hall';
      render();
    }
  };
}

/* ───────── 이벤트 ───────── */
function onClick(e) {
  const t = e.target.closest('button, [data-tab]');
  if (!t || t.disabled || !S) return;
  const d = t.dataset;
  if (d.tab) { if (ui.battle && d.tab !== 'field') return; ui.tab = d.tab; ui.craftResult = null; render(); return; }
  if (d.move) { const [dx, dy] = d.move.split(',').map(Number); move(dx, dy); return; }
  if (d.zone) return enterZone(d.zone);
  if (d.use) return useItem(d.use, false);
  if (d.bitem) return battleItem(d.bitem);
  if (d.offer) return offer(d.offer, false);
  if (d.offerall) return offer(d.offerall, true);
  if (d.craft) { ui.craft = d.craft; ui.pot = {}; ui.craftResult = null; return render(); }
  if (d.add) { if (potTotal() >= 4) return toast('화로에는 네 가지까지만 들어갑니다.'); if ((ui.pot[d.add] || 0) >= count(d.add)) return; ui.pot[d.add] = (ui.pot[d.add] || 0) + 1; ui.craftResult = null; return render(); }
  if (d.rem) { ui.pot[d.rem]--; if (ui.pot[d.rem] <= 0) delete ui.pot[d.rem]; return render(); }
  if (d.break) return breakthrough(d.break);
  if (d.mission) return completeMission(+d.mission);
  if (d.buymanual) return buyManual(d.buymanual);
  if (d.buygear) return buyFromJoun(d.buygear);
  if (d.barter) return barter(+d.barter);
  if (d.arinbuy) return arinBuy(d.arinbuy);
  if (d.equip) return equipItem(+d.equip);
  if (d.unequip) return unequip(d.unequip);
  if (d.sellgear) return sellGear(+d.sellgear);
  if (d.sell) return sellItem(d.sell, false);
  if (d.filter) { ui.bagFilter = d.filter; return render(); }
  if (d.fill) return fillPot(d.fill);
  const acts = {
    leave: leaveZone, interact, craft: doCraft, clearpot: () => { ui.pot = {}; render(); },
    rest, snack: arinSnack, hint: arinHint, masterhint: masterHint, joun: talkJoun, reroll: rerollMissions,
    hasan: doHasan, closemodal: () => { ui.modal = null; render(); },
    flee: fleeBattle, closebattle: closeBattle, fast: () => { ui.fast = !ui.fast; renderBattle(); },
    reset: () => { ui.modal = 'reset'; renderModal(); },
    doreset: () => { try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* 무시 */ } location.reload(); },
  };
  if (d.act && acts[d.act]) acts[d.act]();
}
function onChange(e) {
  const t = e.target;
  if (t.dataset.setactive) setActive(t.dataset.setactive, t.value);
}

function boot() {
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  S = load();
  if (!S) { showIntro(); }
  else {
    const away = Math.min(OFFLINE_CAP, (now() - S.lastTick) / 1000);
    if (away > 30) {
      advance(away, true);
      log(`자리를 비운 ${Math.floor(away / 60)}분 동안 폐관수련이 이어졌습니다.`, 'gold');
    }
    ensureMissions();
    render();
  }
  lastFrame = now();
  setInterval(tick, 1000);
  setInterval(save, 10000);
  window.addEventListener('beforeunload', save);
}
document.addEventListener('DOMContentLoaded', boot);
