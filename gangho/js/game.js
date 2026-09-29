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
const hlItem = t => `<span class="hl-item">${t}</span>`;
const hlSilver = n => `<span class="hl-silver">은자 ${fmt(n)}냥</span>`;
const hlContrib = n => `<span class="hl-contrib">문파 공헌도 ${typeof n === 'number' ? fmt(n) : n}</span>`;
const label = (ko, hj) => `<b class="ko">${ko}</b><small class="hj">${hj}</small>`;

function josa(word, pair) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const has = code >= 0 && code <= 11171 && code % 28 !== 0;
  const [a, b] = { 이가: ['이', '가'], 은는: ['은', '는'], 을를: ['을', '를'], 과와: ['과', '와'], 으로: ['으로', '로'] }[pair];
  if (pair === '으로' && code % 28 === 8) return word + '로';
  return word + (has ? a : b);
}
const jo = (word, pair) => josa(word, pair).slice(word.length);

const SAVE_KEY = 'ganghoKyeonmunrok_v2';
const OFFLINE_CAP = 24 * 3600;
const REST_CD = 300;
const POT_MAX = 10;

/* ───────── 상태 ───────── */
let S = null;
let ui = { tab: 'hall', pot: {}, craft: 'alchemy', battle: null, modal: null, bagFilter: 'all', slotSel: null };

function newState(name, mugongId) {
  const st = {
    v: 3, name, created: now(), lastTick: now(),
    hp: 0, mp: 0, stamina: 100, silver: 30, contrib: 0, activeTrainingSkillId: null,
    manuals: {}, active: { mugong: mugongId, simbeop: 'tonap', gyeonggong: 'pocheolsak', gigong: 'cheolpo' },
    inv: { potionHp: 3, herb: 2 },
    gear: [], equip: {},
    shrine: { atk: 0, mp: 0, eva: 0, total: 0 },
    perm: { maxHp: 0, maxMp: 0 },
    crafts: { forge: { lv: 1, xp: 0 }, alchemy: { lv: 1, xp: 0 }, cook: { lv: 1, xp: 0 } },
    codex: [], hints: [], flags: {},
    zone: null, seen: {},
    buffs: [], missions: [], arin: {}, supplyDay: '', restCd: 0, uid: 1,
    kills: 0, log: [],
  };
  for (const id of [mugongId, 'tonap', 'pocheolsak', 'cheolpo']) st.manuals[id] = { star: 1, cxp: 0, txp: 0, gate: false };
  st.equip.badge = shopGear('badge1', st);
  return st;
}
function shopGear(id, st = S) {
  const g = SHOP_GEAR.find(x => x.id === id);
  return { uid: st.uid++, shop: id, slot: g.slot, name: g.name, rarity: g.rarity, stats: { ...g.stats }, unique: null };
}

function save() {
  if (!S) return;
  S.lastTick = now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 저장 불가 환경 */ }
}
function load() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) return JSON.parse(raw); } catch (e) { /* 무시 */ }
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
  const s = { atk: 10, def: 3, maxHp: 100, maxMp: 40, spd: 10, eva: 3, crit: 5, critRes: 0, counter: 10, mpRegen: 1, bag: 100, mpCost: 0, craft: 0, train: 0, maxSta: 100, combo: 0, lifesteal: 0, atkPct: 0, hpPct: 0, mpSave: 0, evaFlat: 0 };
  for (const cat of CAT_ORDER) {
    const id = S.active[cat]; const m = S.manuals[id];
    if (!m) continue;
    const g = GRADES[MANUALS[id].grade].mult, st = m.star, t = tri(st);
    if (cat === 'mugong') s.atk += (4 * st + 0.9 * t) * g;
    if (cat === 'simbeop') { s.maxMp += (12 * st + 1.5 * t) * g; s.atk += st * g; s.maxHp += 5 * st * g; s.mpRegen += 0.25 * st * g; }
    if (cat === 'gyeonggong') { s.spd += 0.8 * st * g; s.eva += 0.6 * st * g; s.crit += 0.3 * st * g; s.counter += 0.5 * st * g; }
    if (cat === 'gigong') { s.maxHp += (20 * st + 4 * t) * g; s.def += (1.5 * st + 0.35 * t) * g; s.counter += 1.2 * st * g; }
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
  s.counter = Math.min(60, Math.round(s.counter * 10) / 10);
  s.mpRegen = Math.round(s.mpRegen * 10) / 10;
  return s;
}
/* 수련 시간표: 1~4성 구간 성당 8시간, 5~8성 16시간, 9~12성 24시간 (기본 효율 기준) */
function trainHours(star) { return star <= 3 ? 8 : star <= 7 ? 16 : 24; }
function trainBonus(st) { st = st || calcStats(); return 1 + st.train / 100 + st.trainBuff; }
function trainRate(id, st) {
  const m = S.manuals[id]; if (!m || m.star >= MAX_STAR) return 0;
  return need(m.star) / (trainHours(m.star) * 3600) * trainBonus(st);
}
function fmtDur(sec) {
  if (!isFinite(sec) || sec <= 0) return '0분';
  const h = Math.floor(sec / 3600), mnt = Math.ceil((sec % 3600) / 60);
  return h ? `${h}시간 ${mnt}분` : `${mnt}분`;
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
      if (!m.gate) { m.gate = true; log(`《${M.name}》 ${m.star}성이 가득 찼습니다. ${GATE_NAME[m.star]}에 막혔습니다. ${ITEMS[GATES[m.star]].name}${jo(ITEMS[GATES[m.star]].name, '을를')} 복용하면 뚫을 수 있습니다.`, 'gold'); toast(`${M.name} — ${GATE_NAME[m.star]}`); }
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
  if (!m.gate || !pill || !has(pill)) return false;
  take(pill, 1);
  const n = need(m.star);
  m.cxp -= n; m.txp -= n; m.star++; m.gate = false;
  const lines = {
    4: '노벽송: "그래, 기혈이 한 겹 트였구나. 이제 초식이 초식을 부를 게야." — 제2초식 해금!',
    8: '노벽송: "흐음… 제법이군. 세 번째 초식은 몸이 먼저 안다." — 제3초식 해금!',
    12: '노벽송: "…대성(大成)이다. 이 늙은이가 가르칠 건 더 없구나."',
  };
  log(`${ITEMS[pill].icon} ${ITEMS[pill].name}의 약기운이 기혈을 뚫습니다. 《${M.name}》 ${GATE_NAME[m.star - 1]} 돌파! ${m.star}성.`, 'gold');
  if (M.cat === 'mugong' && lines[m.star]) log(lines[m.star], 'npc');
  toast(`${M.name} ${m.star}성 돌파!`);
  tryStar(id);
  return true;
}
function unlockedMoves(star) { return star >= 8 ? 3 : star >= 4 ? 2 : 1; }
function bestMugongStar() { return Math.max(0, ...Object.entries(S.manuals).filter(([id]) => MANUALS[id].cat === 'mugong').map(([, m]) => m.star)); }

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
function equipItem(uid) {
  const i = S.gear.findIndex(g => g.uid === uid); if (i < 0) return;
  const it = S.gear[i];
  S.gear.splice(i, 1);
  if (S.equip[it.slot]) S.gear.push(S.equip[it.slot]);
  S.equip[it.slot] = it;
  ui.slotSel = it.slot;
  log(`${it.name}${jo(it.name, '을를')} 착용했습니다.`);
  clampVitals(); render();
}
function unequip(slot) {
  const it = S.equip[slot]; if (!it) return;
  if (bagUsed() >= bagCap()) { toast('행낭이 가득 찼습니다.'); return; }
  S.gear.push(it); delete S.equip[slot];
  clampVitals(); render();
}
function discardGear(uid) {
  const i = S.gear.findIndex(g => g.uid === uid); if (i < 0) return;
  log(`${S.gear[i].name}${jo(S.gear[i].name, '을를')} 버렸습니다.`, 'muted');
  S.gear.splice(i, 1); render();
}
function clampVitals() {
  const st = calcStats();
  S.hp = clamp(S.hp, 0, st.maxHp); S.mp = clamp(S.mp, 0, st.maxMp); S.stamina = clamp(S.stamina, 0, st.maxSta);
}
function weaponType() { return S.equip.weapon ? S.equip.weapon.wtype : 'fist'; }

function useItem(id, inBattle) {
  const I = ITEMS[id]; if (!I.use || !has(id)) return;
  const u = I.use;
  if (inBattle && (I.kind === '음식' || u.gate)) return;
  if (u.gate) {
    const gated = Object.keys(S.manuals).filter(k => S.manuals[k].gate && S.manuals[k].star === u.gate);
    if (!gated.length) { toast(`${GATE_NAME[u.gate]}에 막힌 비급이 없습니다.`); return; }
    const target = gated.find(k => k === S.active.mugong) || gated.find(k => Object.values(S.active).includes(k)) || gated[0];
    breakthrough(target); render(); return;
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
  if (!inBattle) render();
}

/* ───────── 기예 ───────── */
function potKey(pot) { return Object.entries(pot).filter(([, v]) => v > 0).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}*${v}`).join('|'); }
const RECIPE_BY_KEY = {};
for (const r of RECIPES) RECIPE_BY_KEY[r.craft + ':' + potKey(r.in)] = r;

function potTotal() { return Object.values(ui.pot).reduce((a, b) => a + b, 0); }
function fireText(craft) {
  const lv = S.crafts[craft].lv;
  const t = {
    forge: ['풀무질이 서툴러 불길이 들쭉날쭉합니다.', '쇳물이 제법 붉게 달아오릅니다.', '불꽃이 하얗게 달아 망치 소리가 맑습니다.', '쇠가 먼저 제 모양을 알려 줍니다.'],
    alchemy: ['약탕 아래 불이 이리저리 흔들립니다.', '약향이 고르게 피어오릅니다.', '푸른 불꽃이 안정적으로 넘실댑니다.', '단로의 불이 손끝처럼 말을 듣습니다.'],
    cook: ['장작이 덜 말라 연기만 자욱합니다.', '솥이 보글보글 제법 소리를 냅니다.', '불 조절이 능숙해져 냄새부터 다릅니다.', '아린이 침을 흘리며 기웃거립니다.'],
  }[craft];
  return t[lv >= 8 ? 3 : lv >= 5 ? 2 : lv >= 2 ? 1 : 0];
}
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
  const ok = recipe && Math.random() * 100 < chance;
  lvl.xp += ok ? 10 : 6;
  while (lvl.xp >= lvl.lv * 30) { lvl.xp -= lvl.lv * 30; lvl.lv++; log(`${C.name} 솜씨가 한 단계 늘었습니다.`, 'good'); }
  let result;
  if (ok) {
    const first = !S.codex.includes(recipe.id);
    if (first) S.codex.push(recipe.id);
    if (recipe.out.startsWith('eq:')) {
      const [, base, tier] = recipe.out.split(':');
      const r = Math.random() * 100;
      const rar = r < 2 + st.craft / 3 ? 4 : r < 14 + st.craft + lvl.lv * 2 ? 3 : 2;
      const it = makeGear(base, +tier, rar, true);
      if (!giveGear(it, true)) S.gear.push(it);
      result = { ok: true, first, text: `[${RARITY[rar].name}] ${it.name}`, sub: it.unique.text, cls: 'r' + rar };
    } else {
      give(recipe.out, 1, true);
      result = { ok: true, first, text: `${ITEMS[recipe.out].icon} ${ITEMS[recipe.out].name}`, sub: ITEMS[recipe.out].desc };
    }
    log(`${C.name} 성공: ${hlItem(result.text)}${first ? ' — 도감에 새로 기록!' : ''}`, 'good');
  } else {
    const fail = C.fail;
    S.inv[fail] = (S.inv[fail] || 0) + 1;
    result = { ok: false, text: `${ITEMS[fail].icon} ${ITEMS[fail].name}`, sub: recipe ? '불길이 한순간 크게 일렁였습니다. 조합은 맞았던 것 같습니다…' : '재료들이 서로 어울리지 못하고 엉겨 붙었습니다.' };
    log(`${C.name} 실패… ${ITEMS[fail].name}${jo(ITEMS[fail].name, '이가')} 남았습니다.`, 'bad');
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
  log(`무신상에 ${ITEMS[id].name} ${n}개를 봉헌했습니다. ${o.text}${n > 1 ? ` ×${n}` : ''}`, 'gold');
  if (Math.floor(S.shrine.total / 10) > before) log('무신상의 눈이 희미하게 빛납니다… 치명타율 +2%', 'gold');
  render();
}

/* ───────── 강호행: 지도 ───────── */
const DIRS = [[-1, -1, '↖'], [0, -1, '↑'], [1, -1, '↗'], [-1, 0, '←'], [1, 0, '→'], [-1, 1, '↙'], [0, 1, '↓'], [1, 1, '↘']];

/* 지도 연결성 보장: 입구에서 8방향 BFS로 닿지 않는 노드가 있으면
   가장 가까운 도달 노드까지 빈칸(_)을 산길(o)로 메워 잇는다. 두목 노드도 여기서 보장된다. */
function reachable(grid, sx, sy) {
  const seen = new Set([`${sx},${sy}`]), q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, c = (grid[ny] || [])[nx];
      if (!c || c === '_' || seen.has(`${nx},${ny}`)) continue;
      seen.add(`${nx},${ny}`); q.push([nx, ny]);
    }
  }
  return seen;
}
function normalizeZone(Z) {
  const grid = Z.map.map(r => [...r.replace(/L/g, 'o')]);
  let sx = 0, sy = 0;
  grid.forEach((r, y) => { const x = r.indexOf('S'); if (x >= 0) { sx = x; sy = y; } });
  for (let guard = 0; guard < 100; guard++) {
    const seen = reachable(grid, sx, sy);
    const lost = [];
    grid.forEach((r, y) => r.forEach((c, x) => { if (c !== '_' && !seen.has(`${x},${y}`)) lost.push([x, y]); }));
    if (!lost.length) break;
    // 끊긴 노드 하나를 골라 가장 가까운 도달 노드 쪽으로 한 칸씩 길을 낸다
    const [lx, ly] = lost[0];
    let best = null, bd = Infinity;
    for (const k of seen) { const [x, y] = k.split(',').map(Number); const d = Math.max(Math.abs(x - lx), Math.abs(y - ly)); if (d < bd) { bd = d; best = [x, y]; } }
    let [cx, cy] = [lx, ly];
    while (Math.max(Math.abs(cx - best[0]), Math.abs(cy - best[1])) > 1) {
      cx += Math.sign(best[0] - cx); cy += Math.sign(best[1] - cy);
      if (grid[cy][cx] === '_') grid[cy][cx] = 'o';
    }
  }
  Z.grid = grid.map(r => r.join(''));
  Z.start = [sx, sy];
}
for (const Z of Object.values(ZONES)) normalizeZone(Z);

function tileAt(zid, x, y) {
  const Z = ZONES[zid], here = S && S.zone && S.zone.id === zid;
  const row = (here ? S.zone.layout : Z.grid)[y];
  if (!row || x < 0 || x >= row.length) return '_';
  if (here && S.zone.done[`${x},${y}`]) return 'o';
  return row[x];
}
/* 입장할 때마다 이벤트(적·채집·상자·기믹)를 길 위에 새로 흩뿌린다. 입구·두목·빈칸 모양은 그대로라 연결성은 유지된다. */
function shuffleLayout(Z) {
  const grid = Z.grid.map(r => [...r]);
  const cells = [], events = [];
  grid.forEach((r, y) => r.forEach((c, x) => { if (c !== '_' && c !== 'S' && c !== 'K') { cells.push([x, y]); if (c !== 'o') events.push(c); } }));
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  cells.forEach(([x, y], i) => { grid[y][x] = events[i] || 'o'; });
  return grid.map(r => r.join(''));
}
function passable(zid, x, y) { return tileAt(zid, x, y) !== '_'; }
function zoneUnlocked(zid) { const u = ZONES[zid].unlock; return !u || !!S.flags[u.boss]; }
function reveal(zid, x, y) {
  S.seen[zid] = S.seen[zid] || {};
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (passable(zid, x + dx, y + dy)) S.seen[zid][`${x + dx},${y + dy}`] = 1;
}
function enterZone(zid) {
  if (!zoneUnlocked(zid)) return;
  const [x, y] = ZONES[zid].start;
  S.zone = { id: zid, x, y, layout: shuffleLayout(ZONES[zid]), done: {} };
  S.seen[zid] = {};
  reveal(zid, S.zone.x, S.zone.y);
  log(`${ZONES[zid].name}(${ZONES[zid].hanja})에 들어섰습니다.`, 'place');
  ui.tab = 'field'; render();
}
function leaveZone() {
  if (ui.battle || !S.zone) return;
  log(`${ZONES[S.zone.id].name}${jo(ZONES[S.zone.id].name, '을를')} 떠나 청풍문으로 돌아왔습니다.`, 'place');
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
function nodeInfo(zid, x, y) {
  const c = tileAt(zid, x, y), Z = ZONES[zid];
  if ('123'.includes(c)) { const eid = Z.enemies[+c - 1]; return { type: 'battle', icon: '⚔️', label: ENEMIES[eid].name, enemy: eid }; }
  if (c === 'H') return { type: 'herb', icon: '🌿', label: '약초 군락' };
  if (c === 'M') return { type: 'mine', icon: '⛏️', label: '광맥' };
  if (c === 'C') return { type: 'chest', icon: '🎁', label: '보물상자' };
  if (c === 'G') return { type: 'gimmick', icon: '⚙️', label: Z.gimmick.name };
  if (c === 'K') return { type: 'boss', icon: '👹', label: ENEMIES[Z.boss].name, enemy: Z.boss };
  if (c === 'S') return { type: 'gate', icon: '🏯', label: '입구' };
  return { type: 'path', icon: '·', label: '산길' };
}
function spend(cost) {
  if (S.stamina < cost) { toast('기력이 부족합니다. 음식을 먹거나 뒷마당에서 쉬십시오.'); return false; }
  S.stamina -= cost; return true;
}
function rollTable(table) {
  const out = [];
  for (const [id, a, b, p] of table) if (Math.random() < (p ?? 1)) out.push([id, rint(a, b)]);
  return out;
}
function clearNode() { if (S.zone) S.zone.done[`${S.zone.x},${S.zone.y}`] = 1; }
function giveSilver(n) { S.silver += n; log(`${hlSilver(n)} 획득`, 'loot'); }
function interact() {
  if (!S.zone || ui.battle) return;
  const { id: zid, x, y } = S.zone, Z = ZONES[zid], info = nodeInfo(zid, x, y);
  if (info.type === 'battle') { if (spend(STAMINA_COST.battle)) startBattle(info.enemy); return; }
  if (info.type === 'boss') { if (spend(STAMINA_COST.boss)) startBattle(info.enemy); return; }
  if (info.type === 'herb' || info.type === 'mine') {
    if (!spend(STAMINA_COST[info.type])) return;
    log(info.type === 'herb' ? '약초낫으로 풀숲을 헤쳐 남김없이 거두었습니다.' : '곡괭이로 광맥을 남김없이 캐냈습니다.', 'muted');
    for (const [id, n] of rollTable(Z[info.type])) give(id, n);
    clearNode();
  }
  if (info.type === 'chest') {
    if (!spend(STAMINA_COST.chest)) return;
    log('녹슨 상자의 자물쇠를 비틀어 열었습니다.', 'muted');
    for (const [id, a, b] of Z.chest) { const n = rint(a, b); if (id === 'silver') giveSilver(n); else give(id, n); }
    clearNode();
  }
  if (info.type === 'gimmick') {
    if (!spend(STAMINA_COST.gimmick)) return;
    const st = calcStats(), g = Z.gimmick;
    if (st[g.stat] >= g.need) {
      log(`${g.name}: ${g.text}`, 'good');
      for (const [id, a, b] of g.reward) { const n = rint(a, b); if (id === 'silver') giveSilver(n); else give(id, n); }
      clearNode();
    } else log(`${g.name}: ${g.fail}`, 'bad');
  }
  render();
}

/* ───────── 전투 (턴제) ───────── */
function dmgBase(atk, def) { return (atk * atk) / (atk + def); }
function dmgCalc(atk, def) { return Math.max(1, Math.round(dmgBase(atk, def) * rnd(0.9, 1.1))); }
function reaction(dmg, maxHp) { const r = dmg / maxHp; return HIT_TEXT.find(([t]) => r >= t); }
function sense(eid) {
  const E = ENEMIES[eid], st = calcStats();
  const myTurns = E.hp / (dmgBase(st.atk, E.def) * 1.3);
  const foeTurns = st.maxHp / Math.max(1, dmgBase(E.atk, st.def) * (1 - st.eva / 100));
  const ratio = (foeTurns / myTurns) * (st.spd / E.spd);
  return SENSE_TEXT.find(([t]) => ratio >= t);
}

function startBattle(eid) {
  const E = ENEMIES[eid];
  ui.battle = { eid, e: { ...E, hpNow: E.hp }, pg: 0, eg: 0, lines: [], over: false, guard: false, waiting: false, st: calcStats() };
  bLine(`⚔️ ${josa(E.name, '이가')} 앞을 가로막습니다!`, 'head');
  const [, stext, scls] = sense(eid);
  bLine(stext, 'sense ' + scls);
  if (E.boss) {
    const quotes = { boarKing: '외눈 멧돼지왕이 콧김을 뿜으며 땅을 긁습니다.', jeokyeom: '적염도: "청풍문? 그 거지 문파에서 아직 사람이 나오나?"', galcheon: '갈천: "물 위에서 나를 이긴 자는 없다. 뭍에서도 마찬가지고."' };
    bLine(quotes[eid], 'npc');
  }
  const mt = MANUALS[S.active.mugong];
  if (mt.weapon !== weaponType()) bLine(`《${mt.name}》은 ${WEAPON_TYPES[mt.weapon]} 무공입니다. 병기가 맞지 않아 초식을 펼칠 수 없습니다.`, 'muted');
  advanceToPlayer(ui.battle);
  ui.tab = 'field';
  render();
}
function bLine(text, cls = '') { ui.battle.lines.push({ text, cls }); }
function advanceToPlayer(b) {
  let guard = 0;
  while (!b.over && guard++ < 50) {
    b.st = calcStats();
    while (b.pg < 100 && b.eg < 100) { b.pg += b.st.spd; b.eg += b.e.spd; }
    if (b.pg >= b.eg) { b.pg -= 100; b.waiting = true; return; }
    b.eg -= 100;
    enemyTurn(b);
    checkEnd(b);
  }
}
function checkEnd(b) {
  if (b.over) return;
  if (b.e.hpNow <= 0) winBattle(b);
  else if (S.hp <= 0) loseBattle(b);
}
function playerAction(kind) {
  const b = ui.battle; if (!b || b.over || !b.waiting) return;
  b.waiting = false; b.guard = false;
  b.st = calcStats();
  if (kind === 'attack') {
    playerAttack(b);
    S.mp = Math.min(b.st.maxMp, S.mp + b.st.mpRegen);
  } else if (kind === 'guard') {
    b.guard = true;
    S.mp = Math.min(b.st.maxMp, S.mp + b.st.mpRegen * 2);
    bLine('🛡️ 자세를 낮추고 기혈을 갈무리합니다. 상대의 빈틈을 노립니다.', 'guard');
  } else if (kind === 'flee') {
    const chance = (b.e.boss ? 0.3 : 0.55) + (b.st.spd - b.e.spd) * 0.03;
    if (Math.random() < chance) { bLine('💨 뒤도 돌아보지 않고 몸을 뺐습니다.', 'muted'); b.over = true; b.fled = true; }
    else bLine('💨 도주하려 했으나 퇴로가 막혔습니다!', 'bad');
  }
  checkEnd(b);
  if (!b.over) advanceToPlayer(b);
  renderBattle();
}
function playerHit(b, mult, text) {
  const e = b.e, st = b.st;
  const hitChance = Math.max(55, 95 - e.eva);
  if (Math.random() * 100 >= hitChance) { bLine(`${text} — ${josa(e.name, '이가')} 몸을 틀어 피했습니다. 허공을 가릅니다.`, 'miss'); return false; }
  let dmg = dmgCalc(st.atk, e.def) * mult;
  const crit = Math.random() * 100 < st.crit;
  if (crit) dmg *= 1.6;
  dmg = Math.round(dmg);
  e.hpNow = Math.max(0, e.hpNow - dmg);
  const [, txt, cls] = reaction(dmg, e.hp);
  bLine(`${text}${crit ? ' <b class="crit">치명!</b>' : ''} ${josa(e.name, '이가')} ${txt}`, cls);
  if (st.lifesteal) S.hp = Math.min(st.maxHp, S.hp + Math.round(dmg * st.lifesteal / 100));
  return true;
}
function playerAttack(b) {
  const st = b.st, id = S.active.mugong, M = MANUALS[id], m = S.manuals[id];
  const canCombo = M.weapon === weaponType();
  let comboDone = false;
  if (canCombo && Math.random() * 100 < 35 + st.combo) {
    const moves = unlockedMoves(m.star), g = GRADES[M.grade].mult;
    const mults = [1.6, 2.2, 3.2].map(v => v * (1 + (g - 1) * 0.5));
    const chain = [100, 50, 38];
    for (let i = 0; i < moves; i++) {
      if (i > 0 && Math.random() * 100 >= chain[i] + st.combo) break;
      const cost = Math.max(1, Math.round((5 + m.star + i * (6 + m.star)) * g * (1 - (st.mpCost + st.mpSave) / 100)));
      if (S.mp < cost) { if (i > 0) bLine(`내력이 바닥나 제${i + 1}초식으로 잇지 못했습니다.`, 'muted'); break; }
      S.mp -= cost;
      comboDone = true;
      const ok = playerHit(b, mults[i], `<b class="move m${i + 1}">【${M.moves[i]}】</b> 제${i + 1}초식!`);
      if (ok) addXp(id, 'cxp', 2 + i * 3);
      if (!ok || b.e.hpNow <= 0) break;
    }
  }
  if (!comboDone) {
    const ok = playerHit(b, 1, '⚔️ 평타(平打).');
    if (ok && canCombo) addXp(id, 'cxp', 1);
  }
}
function enemyTurn(b) {
  const e = b.e, st = b.st;
  const hitChance = Math.max(40, 95 - st.eva);
  if (Math.random() * 100 >= hitChance) { bLine(`${e.name}의 공격 — 경공으로 가볍게 흘려냈습니다.`, 'dodge'); addXp(S.active.gyeonggong, 'cxp', 1); return; }
  if (b.guard && Math.random() * 100 < st.counter) {
    bLine(`${e.name}의 공격을 비스듬히 흘려냈습니다!`, 'guard');
    playerHit(b, 1.2, '<b class="move counter">【반격(反擊)】</b>');
    addXp(S.active.gigong, 'cxp', 2);
    return;
  }
  let dmg = dmgCalc(e.atk, st.def);
  const crit = Math.random() * 100 < Math.max(0, 8 - st.critRes / 2);
  if (crit) dmg = Math.round(dmg * 1.5);
  let cut = 0;
  if (b.guard) { cut = rint(50, 70); dmg = Math.max(1, Math.round(dmg * (100 - cut) / 100)); }
  S.hp = Math.max(0, S.hp - dmg);
  const [, , cls] = reaction(dmg, st.maxHp);
  const feel = { h1: '살짝 스쳤습니다.', h2: '살갗이 찢어집니다.', h3: '뼈가 울립니다!', h4: '입가로 피가 흐릅니다!', h5: '기혈이 뒤집힙니다!' }[cls];
  bLine(`${e.name}의 공격${crit ? ' <b class="crit">치명!</b>' : ''}${b.guard ? ` — 🛡️ 막아내 피해 ${cut}% 경감,` : ' —'} ${feel} <span class="dmg">활력 -${fmt(dmg)}</span>`, 'taken');
}
function winBattle(b) {
  b.over = true; b.win = true;
  const E = ENEMIES[b.eid];
  bLine(`🏆 ${josa(E.name, '을를')} 쓰러뜨렸습니다!`, 'win');
  clearNode();
  for (const cat of CAT_ORDER) addXp(S.active[cat], 'cxp', E.xp);
  bLine(`실전 경험 +${E.xp} (4대 영역)`, 'muted');
  const silver = rint(...E.silver); S.silver += silver;
  bLine(`${hlSilver(silver)} 획득`, 'loot');
  log(`${E.name} 토벌. ${hlSilver(silver)}, 실전 경험 +${E.xp}`, 'good');
  for (const [id, p] of E.drops) if (Math.random() < p) { if (give(id, 1, true)) { bLine(`${ITEMS[id].icon} ${hlItem(ITEMS[id].name)} 획득`, 'loot'); log(`${ITEMS[id].icon} ${hlItem(ITEMS[id].name)} ×1 획득`, 'loot'); } }
  if (E.gear && Math.random() < E.gear[1]) {
    const it = makeGear(pick(Object.keys(EQUIP_BASES)), E.gear[0], rollDropRarity(!!E.boss), false);
    if (giveGear(it, true)) { bLine(`🗡️ [${RARITY[it.rarity].name}] ${hlItem(it.name)} 획득`, 'loot'); log(`🗡️ [${RARITY[it.rarity].name}] ${hlItem(it.name)} 획득`, 'loot'); }
  }
  S.kills++;
  progressMission(b.eid);
  if (E.boss && !S.flags[E.boss]) {
    S.flags[E.boss] = true;
    const reward = { boss1: 100, boss2: 200, boss3: 300 }[E.boss];
    S.contrib += reward;
    const msgs = {
      boss1: '외눈 멧돼지왕이 쓰러지자 청풍산에 고요가 찾아왔습니다. 염화채로 가는 길이 열렸습니다.',
      boss2: '채주 적염도가 무릎을 꿇었습니다. 염화채의 불길이 잦아듭니다. 적룡방으로 가는 길이 열렸습니다.',
      boss3: '방주 갈천이 강물 속으로 가라앉았습니다. 적룡방이 무너졌습니다. 이제 대성만이 남았습니다.',
    };
    bLine(msgs[E.boss], 'gold');
    bLine(`${hlContrib('+' + reward)}`, 'gold');
    log(`${hlContrib('+' + reward)}`, 'good');
    log(msgs[E.boss], 'gold');
    const mount = SHOP_GEAR.find(g => g.boss === E.boss);
    if (mount && giveGear(shopGear(mount.id), true)) { bLine(`🐴 두목이 부리던 ${hlItem(mount.name)}${jo(mount.name, '을를')} 얻었습니다.`, 'loot'); log(`🐴 ${hlItem(mount.name)} 획득 — 무장에서 탈것으로 착용하십시오.`, 'good'); }
  }
}
function loseBattle(b) {
  b.over = true; b.win = false;
  const lost = Math.floor(S.silver * 0.1);
  S.silver -= lost;
  bLine(`💀 눈앞이 캄캄해집니다… (은자 ${lost}냥을 잃었습니다)`, 'bad');
  log(`${b.e.name}에게 패했습니다. 조운 사형이 업고 돌아왔습니다. 은자 -${lost}`, 'bad');
}
function closeBattle() {
  const b = ui.battle; if (!b || !b.over) return;
  ui.battle = null;
  if (!b.win && !b.fled) {
    S.zone = null;
    S.hp = Math.max(1, Math.round(calcStats().maxHp * 0.1));
    ui.tab = 'yard';
  }
  save(); render();
}
function battleItem(id) {
  const b = ui.battle; if (!b || b.over || !b.waiting || !has(id)) return;
  useItem(id, true);
  bLine(`${ITEMS[id].icon} ${ITEMS[id].name}${jo(ITEMS[id].name, '을를')} 삼켰습니다.`, 'good');
  renderBattle();
}

/* ───────── 문파 임무 ───────── */
function genMission() {
  const zid = pick(ZONE_ORDER.filter(zoneUnlocked)), Z = ZONES[zid];
  if (Math.random() < 0.55) {
    const eid = pick(Z.enemies), E = ENEMIES[eid], n = rint(3, 6);
    return { type: 'kill', target: eid, n, prog: 0, contrib: Math.round(E.xp * n * 0.4 + 10), silver: Math.round(E.xp * n * 0.3), zone: zid };
  }
  const id = pick([...Z.herb, ...Z.mine].map(r => r[0]).filter(x => x !== 'wood')), n = rint(2, 5);
  return { type: 'deliver', target: id, n, prog: 0, contrib: Math.round(ITEMS[id].price * n + 10), silver: Math.round(ITEMS[id].price * n), zone: zid };
}
function ensureMissions() { while (S.missions.length < 3) S.missions.push(genMission()); }
function progressMission(target) { for (const m of S.missions) if (m.type === 'kill' && m.target === target && m.prog < m.n) m.prog++; }
function missionReady(m) { return m.type === 'kill' ? m.prog >= m.n : has(m.target, m.n); }
function completeMission(i) {
  const m = S.missions[i]; if (!m || !missionReady(m) || S.zone) return;
  if (m.type === 'deliver') take(m.target, m.n);
  S.contrib += m.contrib; S.silver += m.silver;
  log(`문파 임무 완료! ${hlContrib('+' + m.contrib)}, ${hlSilver(m.silver)}`, 'good');
  S.missions.splice(i, 1); ensureMissions(); render();
}
function rerollMissions() {
  if (S.silver < 5) { toast('은자가 부족합니다.'); return; }
  S.silver -= 5; S.missions = []; ensureMissions(); log('노벽송이 하품을 하며 새 임무 두루마리를 던져줍니다.', 'npc'); render();
}

/* ───────── 인물 ───────── */
function jounSupply() {
  if (S.supplyDay === today()) return;
  S.supplyDay = today(); S.flags.supplied = true;
  log(`조운: "${pick(['오늘 몫이다. 아껴 써라.', '창고 정리하다 나온 거다. 챙겨가.', '산에 들어갈 거면 이 정도는 들고 가야지.'])}"`, 'npc');
  const pool = [...SUPPLY];
  for (let k = 0; k < 3; k++) { const [id, a, b] = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; give(id, rint(a, b)); }
  render();
}
function arinSnack() {
  if (S.arin.snack === today()) return;
  S.arin.snack = today();
  give('arinSnack', 1, true);
  log(`아린: "${pick(['사형! 이거 몰래 구운 거예요. 조운 사형한텐 비밀!', '오늘 약과는 꿀을 두 배로 넣었어요!', '헤헤, 수련 힘들죠? 이거 먹어요!'])}" — 🍪 ${hlItem('아린표 약과')}를 받았습니다.`, 'npc');
  render();
}
function addHint(r) {
  log(`🔖 ${r.hint}`, 'hint');
  if (!S.codex.includes(r.id)) { S.codex.push(r.id); log(`📖 도감에 「${recipeName(r)}」 조합법이 기록되었습니다.`, 'gold'); }
}
function recipeName(r) { return r.out.startsWith('eq:') ? EQUIP_BASES[r.out.split(':')[1]].names[+r.out.split(':')[2] - 1] : ITEMS[r.out].name; }
function recipeIcon(r) { return r.out.startsWith('eq:') ? (EQUIP_BASES[r.out.split(':')[1]].slot === 'weapon' ? '🗡️' : '🛡️') : ITEMS[r.out].icon; }
function arinHint() {
  if (S.silver < 20) { toast('은자가 부족합니다.'); return; }
  const pool = RECIPES.filter(r => !S.codex.includes(r.id) && (r.hint.startsWith('아린') || r.hint.startsWith('조운')) && !/_[23]$/.test(r.id));
  if (!pool.length) { log('아린: "헤헤, 제가 아는 건 사형이 다 아는걸요?"', 'npc'); return; }
  S.silver -= 20;
  addHint(pick(pool));
  render();
}
function rest() {
  if (S.zone) return;
  const st = calcStats();
  S.hp = st.maxHp; S.mp = st.maxMp;
  if (S.restCd <= now()) {
    S.stamina = st.maxSta; S.restCd = now() + REST_CD * 1000;
    log('평상에 드러누워 한숨 푹 잤습니다. 활력·내력·기력이 모두 찼습니다.', 'good');
  } else log('평상에서 숨을 골랐습니다. 활력·내력이 찼습니다. 기력은 조금 더 쉬어야 돌아옵니다.', 'good');
  render();
}
function masterHint() {
  const gated = Object.entries(S.manuals).find(([, m]) => m.gate && !has(GATES[m.star]));
  const pill = gated ? GATES[gated[1].star] : questIndex() === 2 ? 'pillLow' : null;
  const r = pill && RECIPES.find(x => x.out === pill);
  if (r && !S.codex.includes(r.id)) { addHint(r); render(); return; }
  log(`노벽송: "${pick([
    '무공은 몸으로 치고, 머리로 되새기는 게야. 한쪽만 하면 막힌다.',
    '쯧, 늙은이 낮잠 방해 말고 연무장이나 가거라.',
    '실패한 쇳덩이도 버리지 마라. 무신상이 다 먹는다.',
    '초식은 이어질 때 무섭다. 내력통을 키워라.',
    '막는 것도 무공이다. 잘 막으면 칼이 저절로 나간다.',
  ])}"`, 'npc');
}
function buyManual(id) {
  const M = MANUALS[id];
  if (S.manuals[id] || !M.cost || S.contrib < M.cost) return;
  S.contrib -= M.cost;
  S.manuals[id] = { star: 1, cxp: 0, txp: 0, gate: false };
  log(`장경각에서 《${M.name}》 비급을 받았습니다. 연무장에서 수련 비급을 바꿀 수 있습니다.`, 'gold');
  render();
}
function ownsShop(id) { return S.gear.some(g => g.shop === id) || Object.values(S.equip).some(g => g && g.shop === id); }
function buyBadge(id) {
  const g = SHOP_GEAR.find(x => x.id === id);
  if (!g || !g.cost || S.contrib < g.cost || ownsShop(id)) return;
  if (!giveGear(shopGear(id), true)) return;
  S.contrib -= g.cost;
  log(`${hlItem(g.name)}${jo(g.name, '을를')} 받았습니다. 무장에서 착용하십시오.`, 'good');
  render();
}
function setActive(cat, id) {
  if (ui.battle) return;
  if (S.activeTrainingSkillId === S.active[cat]) S.activeTrainingSkillId = id;
  S.active[cat] = id; clampVitals(); render();
}
function canHasan() { return S.flags.boss3 && bestMugongStar() >= 12 && !S.flags.hasan; }
function doHasan() {
  if (!canHasan()) return;
  S.inv.hasanryeong = 1; S.flags.hasan = true;
  log('노벽송이 오래된 목갑에서 누런 종이 한 장을 꺼냅니다.', 'npc');
  log(`노벽송: "청풍문 제자 ${S.name}. 오늘부로 하산을 허한다. 낙양으로 가라. 강호는 넓고, 네 무공은 이제 시작이다."`, 'npc');
  log('📜 낙양성 하산령을 받았습니다! — 제1장 [청풍문 편] 완결', 'gold');
  ui.modal = 'ending';
  render();
}

/* ───────── 순차 가이드 ───────── */
const QUESTS = [
  ['조운 대사형에게 오늘의 보급품 받기', () => !!S.flags.supplied, '정청의 조운에게 보급품을 받으십시오.'],
  ['청풍산에서 첫 사냥', () => S.kills > 0, '강호행에서 청풍산으로 가, ⚔️ 기척이 있는 곳에서 싸우십시오.'],
  ['화로에서 하급 돌파단 달이기', () => S.codex.includes('a_low') || bestMugongStar() >= 4, '장문인에게 말을 걸면 귀띔해 줄지도 모릅니다.'],
  ['무공 4성 — 소관문 돌파', () => bestMugongStar() >= 4, '3성을 가득 채운 뒤 하급 돌파단을 복용하십시오.'],
  ['청풍산 두목 외눈 멧돼지왕 토벌', () => !!S.flags.boss1, '청풍산 가장 깊은 곳, 👹 표시가 두목의 거처입니다.'],
  ['염화채 채주 적염도 토벌', () => !!S.flags.boss2, '화적패의 소굴 가장 깊은 곳에 채주가 있습니다.'],
  ['무공 8성 — 중관문 돌파', () => bestMugongStar() >= 8, '7성을 채운 뒤 중급 돌파단을 복용하십시오.'],
  ['적룡방 방주 갈천 토벌', () => !!S.flags.boss3, '적룡방 가장 깊은 곳에 방주의 거처가 있습니다.'],
  ['무공 12성 대성 — 대관문 돌파', () => bestMugongStar() >= 12, '11성을 채운 뒤 상급 돌파단을 복용하십시오.'],
  ['장문인에게 하산령 받기', () => !!S.flags.hasan, '장문인을 찾아가십시오.'],
];
function questIndex() { const i = QUESTS.findIndex(q => !q[1]()); return i < 0 ? QUESTS.length : i; }

/* ───────── 시간 흐름 ───────── */
function advance(sec, offline) {
  const id = S.activeTrainingSkillId;
  if (id && S.manuals[id]) {
    // 성이 오르면 속도가 바뀌므로 1분 단위로 나눠 누적한다
    let left = sec;
    while (left > 0) {
      const step = Math.min(left, 60); left -= step;
      if (S.manuals[id].star >= MAX_STAR) { S.activeTrainingSkillId = null; log(`《${MANUALS[id].name}》 대성. 폐관수련을 마칩니다.`, 'gold'); break; }
      addXp(id, 'txp', trainRate(id) * step);
    }
  }
  const t = now(), before = S.buffs.length;
  S.buffs = S.buffs.filter(b => b.until > t);
  if (!offline && S.buffs.length < before) log('음식 효과가 사라졌습니다.', 'muted');
}
function toggleTraining(cat) {
  const id = S.active[cat];
  if (S.activeTrainingSkillId === id) {
    S.activeTrainingSkillId = null;
    log(`《${MANUALS[id].name}》 수련을 멈추고 눈을 뜹니다.`, 'muted');
  } else {
    if (S.manuals[id].star >= MAX_STAR) { toast('이미 대성한 비급입니다.'); return; }
    S.activeTrainingSkillId = id;
    log(`가부좌를 틀고 《${MANUALS[id].name}》 폐관수련에 들어갑니다.`, 'muted');
  }
  render();
}
let lastFrame = now();
function tick() {
  if (!S) return;
  const t = now(), dt = (t - lastFrame) / 1000; lastFrame = t;
  advance(Math.min(dt, 5), false);
  renderHeader();
  renderLive();
}

/* ───────── 이미지 (없으면 대체 그림) ───────── */
const IMG = {
  doll: 'assets/character_silhouette.png',
  master: 'assets/portraits/npc_nobyeoksong.png',
  joun: 'assets/portraits/npc_joun.png',
  arin: 'assets/portraits/npc_arin.png',
};
const brokenImg = new Set();
function imgOr(src, cls, fallback, alt = '') {
  if (brokenImg.has(src)) return fallback;
  return `<img src="${src}" class="${cls}" alt="${alt}" data-fb="${encodeURIComponent(fallback)}">`;
}
function wireImages() {
  for (const im of document.querySelectorAll('img[data-fb]:not([data-wired])')) {
    im.dataset.wired = '1';
    const fail = () => { brokenImg.add(im.getAttribute('src')); im.outerHTML = decodeURIComponent(im.dataset.fb); };
    if (im.complete && im.naturalWidth === 0) fail(); else im.addEventListener('error', fail, { once: true });
  }
}
function portrait(who, seal, name) {
  return imgOr(IMG[who], 'npc-portrait', `<div class="npc-portrait fallback ${who}" role="img" aria-label="${name}">${seal}</div>`, name);
}

/* ───────── 화면 ───────── */
const TABS = [
  ['hall', '정청', '正廳'],
  ['yeonmu', '연무장', '演武場'],
  ['forge', '화로', '火爐'],
  ['yard', '뒷마당', '後院'],
  ['bag', '무장', '武裝'],
  ['field', '강호행', '江湖行'],
  ['shrine', '무신상', '武神像'],
  ['codex', '도감', '圖鑑'],
];
const BASE_TABS = new Set(['shrine', 'forge', 'yard', 'hall']);

function bar(cls, cur, max, name, hideNum) {
  const p = max ? clamp(cur / max * 100, 0, 100) : 0;
  return `<div class="bar ${cls}"><span class="bar-fill" style="width:${p}%"></span><span class="bar-text"><b>${name}</b>${hideNum ? '' : ` ${fmt(cur)} / ${fmt(max)}`}</span></div>`;
}
function renderHeader() {
  const st = calcStats();
  $('#status').innerHTML = `
    <div class="who"><span class="name">${esc(S.name)}</span><span class="sect">청풍문 제자 · ${S.zone ? ZONES[S.zone.id].name : '청풍문'}</span></div>
    <div class="bars">${bar('hp', S.hp, st.maxHp, '활력')}${bar('mp', S.mp, st.maxMp, '내력')}${bar('sta', S.stamina, st.maxSta, '기력')}</div>
    <div class="purse"><span title="은자"><i class="coin">銀</i>${fmt(S.silver)}</span><span title="문파 공헌도"><i class="coin c2">功</i>${fmt(S.contrib)}</span></div>`;
}
function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([id, ko, hj]) => `<button class="tab ${ui.tab === id ? 'on' : ''}" data-tab="${id}" ${ui.battle && id !== 'field' ? 'disabled' : ''}>${label(ko, hj)}</button>`).join('');
}
function renderLog() {
  const el = $('#log'); if (!el || !S) return;
  el.innerHTML = S.log.slice(-60).map(l => `<p class="${l.cls}">${l.text}</p>`).join('');
  el.scrollTop = el.scrollHeight;
}
function head(ko, hj, extra = '') { return `<div class="panel-head"><h2>${label(ko, hj)}</h2>${extra}</div>`; }
function render() {
  if (!S) return;
  renderHeader(); renderTabs();
  const main = $('#main');
  if (BASE_TABS.has(ui.tab) && S.zone) {
    const [, ko, hj] = TABS.find(t => t[0] === ui.tab);
    main.innerHTML = `<section class="panel">${head(ko, hj)}<p class="story">지금은 ${ZONES[S.zone.id].name}에 나와 있습니다. 청풍문으로 돌아가야 이곳을 쓸 수 있습니다.</p><div><button class="btn" data-act="leave">청풍문으로 귀환</button></div></section>`;
  } else {
    main.innerHTML = ({ yeonmu: viewYeonmu, shrine: viewShrine, forge: viewForge, yard: viewYard, hall: viewHall, field: viewField, bag: viewBag, codex: viewCodex })[ui.tab]();
  }
  renderLog();
  renderModal();
  wireImages();
  save();
}

/* 연무장 */
function xpRows(id) {
  const m = S.manuals[id];
  if (m.star >= MAX_STAR) return '<div class="daesung">大成</div>';
  const n = need(m.star), pc = m.cxp / n * 100, pt = m.txp / n * 100;
  return `<div class="xp" data-live="${id}">
    <div class="xprow"><span>실전</span><div class="xpbar c"><span style="width:${Math.min(100, pc)}%"></span></div><b>${Math.min(100, Math.floor(pc))}%</b></div>
    <div class="xprow"><span>수련</span><div class="xpbar t"><span style="width:${Math.min(100, pt)}%"></span></div><b>${Math.min(100, Math.floor(pt))}%</b></div>
  </div>`;
}
function starSig() { return Object.values(S.manuals).map(m => m.star + (m.gate ? 'g' : '')).join(); }
function renderLive() {
  if (ui.tab !== 'yeonmu' && !(ui.modal || '').startsWith('manual:')) return;
  if (ui.tab === 'yeonmu' && S.activeTrainingSkillId && Math.floor(now() / 1000) % 30 === 0 && !ui.modal) { render(); return; }
  for (const el of document.querySelectorAll('[data-live]')) {
    const m = S.manuals[el.dataset.live]; if (!m || m.star >= MAX_STAR) continue;
    const n = need(m.star);
    const rows = el.querySelectorAll('.xprow');
    [m.cxp, m.txp].forEach((v, i) => { const p = v / n * 100; rows[i].querySelector('.xpbar > span').style.width = Math.min(100, p) + '%'; rows[i].querySelector('b').textContent = Math.min(100, Math.floor(p)) + '%'; });
  }
  const sig = document.querySelector('[data-starsig]');
  if (sig && sig.dataset.starsig !== starSig()) render();
}
function viewYeonmu() {
  const tid = S.activeTrainingSkillId;
  const cards = CAT_ORDER.map(cat => {
    const id = S.active[cat], M = MANUALS[id], m = S.manuals[id], C = CATS[cat];
    const on = tid === id;
    const left = on ? (need(m.star) - m.txp) / trainRate(id) : 0;
    return `<div class="art ${on ? 'training' : ''}" data-manual="${cat}" role="button" tabindex="0">
      <div class="art-top"><span class="art-cat">${label(C.name, C.hanja)}</span><span class="art-star">${m.star}<small>성</small></span></div>
      <div class="art-name">《${M.name}》${m.gate ? ' <span class="pill warn">관문</span>' : ''}</div>
      ${xpRows(id)}
      <div class="art-foot">
        <small class="muted">${m.star >= MAX_STAR ? '대성' : on ? (m.txp >= need(m.star) ? '수련 가득 참 · 실전 필요' : `다음 성까지 약 ${fmtDur(left)}`) : `성당 ${trainHours(m.star)}시간`}</small>
        <button class="btn sm ${on ? 'primary' : ''}" data-train="${cat}" ${m.star >= MAX_STAR ? 'disabled' : ''}>${on ? '[ 수련 중지 ]' : '[ 수련하기 ]'}</button>
      </div>
    </div>`;
  }).join('');
  const tm = tid && MANUALS[tid];
  return `<section class="panel" data-starsig="${starSig()}">
    ${head('연무장', '演武場', `<span class="pill ${tid ? '' : 'idle'}">${tid ? '수련 중' : '수련 정지'}</span>`)}
    <p class="story">${tm ? `향이 타들어 갑니다. 《${tm.name}》 한 가지에만 온 정신을 모읍니다. 1~4성은 성마다 8시간, 5~8성은 16시간, 9~12성은 24시간이 걸립니다.` : '연무장이 고요합니다. 수련할 비급 하나를 골라 [ 수련하기 ]를 누르십시오. 한 번에 한 비급만 수련할 수 있습니다.'}</p>
    <div class="arts">${cards}</div>
  </section>`;
}
function manualModal(cat) {
  const id = S.active[cat], M = MANUALS[id], m = S.manuals[id], n = need(m.star);
  const owned = Object.keys(S.manuals).filter(k => MANUALS[k].cat === cat);
  const moves = M.moves ? `<h4>초식</h4><ol class="moves">${M.moves.map((mv, i) => { const open = i < unlockedMoves(m.star); return `<li class="${open ? 'open' : 'lock'}"><b>${mv}</b><small>${['제1초식 · 시동', '제2초식 · 연계', '제3초식 · 결착'][i]}${open ? '' : ` — ${i === 1 ? '4성' : '8성'} 돌파 시 해금`}</small></li>`; }).join('')}</ol>
    <p class="${M.weapon === weaponType() ? 'muted' : 'warn'}">필요 병기: ${WEAPON_TYPES[M.weapon]}${M.weapon === weaponType() ? '' : ' (지금 병기로는 초식이 나가지 않습니다)'}</p>` : '';
  const pill = GATES[m.star];
  let gateInfo;
  if (m.star < MAX_STAR) {
    const over = v => Math.max(0, Math.floor(v - n));
    gateInfo = `<h4>${m.star}성 → ${m.star + 1}성</h4>
      <div class="kv"><span>실전 경험</span><b>${Math.floor(m.cxp)} / ${n}</b></div>
      <div class="kv"><span>수련 경험</span><b>${Math.floor(m.txp)} / ${n}</b></div>
      <div class="kv"><span>이월 예정</span><b>실전 +${over(m.cxp)} · 수련 +${over(m.txp)}</b></div>
      ${pill ? `<p class="${m.gate ? 'warn' : 'muted'}">${GATE_NAME[m.star]} — ${ITEMS[pill].name} 필요${m.gate && !has(pill) ? ' (가지고 있지 않습니다)' : ''}</p>` : ''}
      ${m.gate && has(pill) ? `<div><button class="btn primary" data-pill="${pill}">${ITEMS[pill].icon} ${ITEMS[pill].name} 복용</button></div>` : ''}`;
  } else gateInfo = '<p class="daesung">12성 대성(大成)</p>';
  return `<div class="sheet">
    <div class="sheet-head"><div><small class="muted">${CATS[cat].name} ${CATS[cat].hanja} · ${M.grade}</small><h2>${label(M.name, M.hanja)}</h2></div><div class="art-star">${m.star}<small>/12성</small></div></div>
    ${xpRows(id)}
    ${moves}${gateInfo}
    ${owned.length > 1 ? `<label class="sel" for="sel-${cat}">수련 비급 <select id="sel-${cat}" data-setactive="${cat}">${owned.map(k => `<option value="${k}" ${k === id ? 'selected' : ''}>${MANUALS[k].name} (${S.manuals[k].star}성)</option>`).join('')}</select></label>` : ''}
    <div class="btns"><button class="btn ghost" data-act="closemodal">닫기</button></div>
  </div>`;
}

/* 무신상 */
function viewShrine() {
  const offers = Object.entries(OFFER).map(([id, o]) => `
    <div class="offer"><span class="offer-icon">${ITEMS[id].icon}</span><b>${ITEMS[id].name}</b><span class="num">${count(id)}개</span><small>봉헌 1회 · ${o.text}</small>
      <div class="btns"><button class="btn sm" data-offer="${id}" ${has(id) ? '' : 'disabled'}>봉헌</button><button class="btn sm ghost" data-offerall="${id}" ${count(id) < 2 ? 'disabled' : ''}>모두</button></div></div>`).join('');
  return `<section class="panel altar">
    ${head('무신상', '武神像')}
    <p class="story">이름도 전해지지 않는 무신의 석상. 화로에서 실패하고 남은 부산물을 바치면, 석상은 말없이 힘을 내려줍니다. 열 번 바칠 때마다 눈빛이 한 번씩 밝아집니다.</p>
    <div class="blessings">
      <div><small>공격력</small><b>+${S.shrine.atk}</b></div><div><small>최대 내력</small><b>+${S.shrine.mp}</b></div>
      <div><small>회피율</small><b>+${S.shrine.eva}%</b></div><div><small>치명타율</small><b>+${Math.floor(S.shrine.total / 10) * 2}%</b></div>
      <div><small>누적 봉헌</small><b>${S.shrine.total}회</b></div>
    </div>
    <div class="offers">${offers}</div>
  </section>`;
}

/* 화로 */
function viewForge() {
  const C = CRAFTS[ui.craft];
  const mats = Object.keys(S.inv).filter(id => ITEMS[id].kind === '재료').sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name));
  const flat = Object.entries(ui.pot).filter(([, n]) => n > 0).flatMap(([id, n]) => Array(n).fill(id));
  const res = ui.craftResult;
  return `<section class="panel">
    ${head('화로', '火爐')}
    <div class="crafts">${Object.entries(CRAFTS).map(([k, c]) => `<button class="craft-pick ${ui.craft === k ? 'on' : ''}" data-craft="${k}">${label(c.name, `(${c.hanja})`)}</button>`).join('')}</div>
    <div class="forge">
      <div class="pot">
        <p class="story flame">${fireText(ui.craft)}</p>
        <div class="pot-slots">${Array.from({ length: POT_MAX }, (_, i) => flat[i] ? `<button class="slot full" data-rem="${flat[i]}" title="${ITEMS[flat[i]].name} 빼기">${ITEMS[flat[i]].icon}<small>${ITEMS[flat[i]].name}</small></button>` : '<div class="slot"></div>').join('')}</div>
        <div class="btns"><button class="btn primary" data-act="craft" ${flat.length ? '' : 'disabled'}>${C.name}</button><button class="btn ghost" data-act="clearpot" ${flat.length ? '' : 'disabled'}>비우기</button></div>
        ${res ? `<div class="result ${res.ok ? 'ok' : 'fail'}"><b class="${res.cls || ''}">${res.ok ? '성공' : '실패'} — ${res.text}</b>${res.first ? '<span class="new">도감 등재</span>' : ''}<small>${esc(res.sub || '')}</small></div>` : ''}
      </div>
      <div class="mats">
        <h4>재료</h4>
        <div class="chips">${mats.map(id => { const left = count(id) - (ui.pot[id] || 0); return `<button class="chip" data-add="${id}" ${left <= 0 ? 'disabled' : ''}>${ITEMS[id].icon} ${ITEMS[id].name} <b>${left}</b></button>`; }).join('')}</div>
      </div>
    </div>
  </section>`;
}

/* 뒷마당 */
function viewYard() {
  const foods = Object.keys(S.inv).filter(id => ITEMS[id].use);
  const restReady = S.restCd <= now();
  return `<section class="panel">
    ${head('뒷마당', '後院')}
    <div class="row">
      <div class="card">
        <h3>평상에 누워 휴식</h3>
        <p class="story">${restReady ? '햇볕이 좋습니다. 한숨 자고 나면 활력·내력·기력이 모두 돌아올 것 같습니다.' : `아직 눈이 말똥말똥합니다. 활력·내력은 채울 수 있지만, 기력은 ${Math.ceil((S.restCd - now()) / 60000)}분쯤 더 지나야 돌아옵니다.`}</p>
        <div><button class="btn primary" data-act="rest">휴식</button></div>
      </div>
      <div class="card">
        <h3>음식·영약 먹기</h3>
        <div class="chips">${foods.map(id => `<button class="chip" data-use="${id}" title="${esc(ITEMS[id].desc)}">${ITEMS[id].icon} ${ITEMS[id].name} <b>${count(id)}</b></button>`).join('')}</div>
        ${S.buffs.length ? `<div class="chips">${S.buffs.map(b => `<span class="pill">${b.name} ${Math.ceil((b.until - now()) / 60000)}분</span>`).join('')}</div>` : ''}
      </div>
    </div>
  </section>
  <section class="panel npc">
    <div class="npc-head">${portrait('arin', '璘', '아린')}<div><h3>${label('아린', '사매')}</h3><p class="story">붉은 댕기를 휘날리며 뛰어옵니다. "사형! 사형! 오늘은 뭐 해요?"</p></div></div>
    <div class="btns">
      <button class="btn" data-act="snack" ${S.arin.snack === today() ? 'disabled' : ''}>🍪 ${S.arin.snack === today() ? '약과는 내일 또' : '일일 약과 받기'}</button>
      <button class="btn" data-act="hint" ${S.silver < 20 ? 'disabled' : ''}>🔖 조합법 물어보기 (은자 20냥)</button>
    </div>
  </section>`;
}

/* 정청 */
function viewHall() {
  const qi = questIndex(), q = QUESTS[qi];
  const shopManuals = Object.entries(MANUALS).filter(([, M]) => M.cost);
  const badges = SHOP_GEAR.filter(g => g.cost);
  const supplied = S.supplyDay === today();
  return `<section class="panel npc">
    ${head('정청', '正廳')}
    <div class="npc-head">${portrait('master', '松', '노벽송')}<div><h3>${label('노벽송', '장문인')}</h3><p class="story">의자에 기대 반쯤 졸고 있습니다. 가끔 실눈을 뜨고 제자를 훑어봅니다.</p></div><button class="btn ghost sm" data-act="masterhint">말 걸기</button></div>
    <div class="quest">
      ${q ? `<small class="muted">지금 할 일 · ${qi + 1}/${QUESTS.length}</small><b>${q[0]}</b><p class="story">${q[2]}</p>` : '<b>제1장 완결</b><p class="story">낙양으로 가는 길이 열려 있습니다.</p>'}
      ${canHasan() ? '<div><button class="btn primary" data-act="hasan">하산 허가를 청한다</button></div>' : ''}
    </div>
    <div class="npc-head">${portrait('joun', '雲', '조운')}<div><h3>${label('조운', '대사형')}</h3><p class="story">장작을 패다 말고 이마의 땀을 훔칩니다. "왔냐. 필요한 건 챙겨놨다."</p></div>
      <button class="btn ${supplied ? 'ghost' : 'primary'}" data-act="supply" ${supplied ? 'disabled' : ''}>${supplied ? '오늘은 받았음' : '[ 오늘의 보급품 받기 ]'}</button></div>
  </section>
  <section class="panel">
    ${head('문파 임무', '門派任務', '<button class="btn ghost sm" data-act="reroll">새 임무 (은자 5냥)</button>')}
    <ul class="missions">${S.missions.map((m, i) => {
      const tname = m.type === 'kill' ? ENEMIES[m.target].name : ITEMS[m.target].name;
      const prog = m.type === 'kill' ? m.prog : Math.min(count(m.target), m.n);
      return `<li><div><b>${m.type === 'kill' ? '토벌' : '납품'}</b> ${tname} ${m.n}${m.type === 'kill' ? '마리' : '개'} <small class="muted">${ZONES[m.zone].name}</small></div><div class="mprog"><span style="width:${prog / m.n * 100}%"></span></div><span class="num">${prog}/${m.n}</span><span class="reward">공헌 ${m.contrib}</span><button class="btn sm" data-mission="${i}" ${missionReady(m) ? '' : 'disabled'}>완료</button></li>`;
    }).join('')}</ul>
  </section>
  <section class="panel">
    ${head('장경각', '藏經閣', `<span class="num gold">공헌도 ${fmt(S.contrib)}</span>`)}
    <div class="shop">${shopManuals.map(([id, M]) => { const own = !!S.manuals[id]; return `<div class="shop-item"><b>${M.name}</b><small>${CATS[M.cat].name}${M.weapon ? ' · ' + WEAPON_SHORT[M.weapon] : ''}</small><button class="btn sm" data-buymanual="${id}" ${own || S.contrib < M.cost ? 'disabled' : ''}>${own ? '보유' : `공헌 ${M.cost}`}</button></div>`; }).join('')}
    ${badges.map(g => { const own = ownsShop(g.id); return `<div class="shop-item"><b class="r${g.rarity}">${g.name}</b><small>신분패 · 수련 효율 +${g.stats.train}%</small><button class="btn sm" data-buybadge="${g.id}" ${own || S.contrib < g.cost ? 'disabled' : ''}>${own ? '보유' : `공헌 ${g.cost}`}</button></div>`; }).join('')}</div>
  </section>`;
}

/* 강호행 */
function viewField() {
  if (ui.battle) return viewBattle();
  if (!S.zone) {
    return `<section class="panel">
      ${head('강호행', '江湖行')}
      <p class="story">산문을 나서면 강호입니다. 길을 걷는 데는 힘이 들지 않지만, 싸우고 캐고 여는 데는 기력이 듭니다. 기력은 저절로 돌아오지 않습니다.</p>
      <div class="zones">${ZONE_ORDER.map(zid => {
        const Z = ZONES[zid], open = zoneUnlocked(zid);
        return `<article class="zone ${open ? '' : 'locked'} t${Z.tier}">
          <h3>${label(Z.name, Z.hanja)}${S.flags[ENEMIES[Z.boss].boss] ? ' <span class="pill">평정</span>' : ''}</h3>
          <p class="story">${open ? Z.desc : '짙은 안개가 길을 가리고 있습니다.'}</p>
          ${open ? `<div><button class="btn primary" data-zone="${zid}">${Z.name}${jo(Z.name, '으로')}</button></div>` : `<p class="muted">${Z.unlock.text}</p>`}
        </article>`;
      }).join('')}</div>
    </section>`;
  }
  const { id: zid, x, y } = S.zone, Z = ZONES[zid], seen = S.seen[zid] || {}, cols = Z.grid[0].length;
  let grid = '';
  for (let yy = 0; yy < Z.grid.length; yy++) for (let xx = 0; xx < cols; xx++) {
    if (!passable(zid, xx, yy)) { grid += '<div class="cell void"></div>'; continue; }
    if (!seen[`${xx},${yy}`]) { grid += '<div class="cell fog"></div>'; continue; }
    const here = xx === x && yy === y;
    const adj = Math.abs(xx - x) <= 1 && Math.abs(yy - y) <= 1 && !here;
    const info = nodeInfo(zid, xx, yy);
    grid += `<button class="cell ${info.type} ${here ? 'here' : ''} ${adj ? 'adj' : ''}" ${adj ? `data-move="${xx - x},${yy - y}"` : 'disabled'} title="${info.label}"><span>${info.icon}</span><small>${info.label}</small></button>`;
  }
  const info = nodeInfo(zid, x, y);
  const pad = DIRS.map(([dx, dy, a]) => `<button class="dir" data-move="${dx},${dy}" ${passable(zid, x + dx, y + dy) ? '' : 'disabled'} aria-label="${a}">${a}</button>`);
  pad.splice(4, 0, `<div class="dir mid">${info.icon}</div>`);
  const cost = STAMINA_COST[info.type];
  let action;
  if (info.type === 'battle' || info.type === 'boss') {
    const E = ENEMIES[info.enemy], [, stext, scls] = sense(info.enemy);
    action = `<p class="story">${info.type === 'boss' ? '두목 ' : ''}<b>${E.name}</b>의 기척이 느껴집니다.</p><p class="story sense ${scls}">${stext}</p><div><button class="btn ${info.type === 'boss' ? 'danger' : 'primary'}" data-act="interact">⚔️ 맞선다 <small>기력 ${cost}</small></button></div>`;
  } else if (info.type === 'herb' || info.type === 'mine') {
    action = `<p class="story">${info.type === 'herb' ? '약초가 무성합니다.' : '반짝이는 광맥이 드러나 있습니다.'}</p><div><button class="btn primary" data-act="interact">${info.type === 'herb' ? '🌿 채집' : '⛏️ 채광'} <small>기력 ${cost}</small></button></div>`;
  } else if (info.type === 'chest') action = `<p class="story">이끼 낀 상자가 반쯤 묻혀 있습니다.</p><div><button class="btn primary" data-act="interact">🎁 연다 <small>기력 ${cost}</small></button></div>`;
  else if (info.type === 'gimmick') action = `<p class="story">${Z.gimmick.name}${jo(Z.gimmick.name, '이가')} 길가에 버티고 있습니다. 무언가 숨겨져 있을 것 같습니다.</p><div><button class="btn primary" data-act="interact">⚙️ 풀어본다 <small>기력 ${cost}</small></button></div>`;
  else if (info.type === 'gate') action = '<p class="story">산문으로 돌아가는 길목입니다.</p>';
  else action = '<p class="story muted">바람 소리만 들립니다. 이곳의 일은 끝났습니다. 청풍문으로 돌아갔다가 다시 오면 산의 기척이 새로 바뀝니다.</p>';
  return `<section class="panel field">
    ${head(Z.name, Z.hanja, '<button class="btn ghost sm" data-act="leave">청풍문으로 귀환</button>')}
    <div class="field-grid">
      <div class="map" style="grid-template-columns:repeat(${cols},1fr)">${grid}</div>
      <div class="control">
        <div class="dpad">${pad.join('')}</div>
        <div class="here-box"><h4>${info.icon} ${info.label}</h4>${action}</div>
        <div class="chips">${['potionHp', 'potionMp', 'clearPill'].filter(id => has(id)).map(id => `<button class="chip" data-use="${id}">${ITEMS[id].icon} ${ITEMS[id].name} <b>${count(id)}</b></button>`).join('')}</div>
      </div>
    </div>
  </section>`;
}
function viewBattle() {
  const b = ui.battle, e = b.e, st = calcStats();
  const M = MANUALS[S.active.mugong];
  const items = ['potionHp', 'potionMp', 'clearPill'].filter(id => has(id));
  queueMicrotask(() => { b.shown = b.lines.length; });
  return `<section class="panel battle">
    <div class="versus">
      <div class="fighter"><h3>${esc(S.name)}</h3><small>《${M.name}》 ${S.manuals[S.active.mugong].star}성</small>${bar('hp', S.hp, st.maxHp, '활력')}${bar('mp', S.mp, st.maxMp, '내력')}</div>
      <div class="vs">對</div>
      <div class="fighter foe ${e.boss ? 'boss' : ''}"><h3>${e.name}</h3><small>${e.boss ? '두목' : '적'}</small>${bar('hp foe', e.hpNow, e.hp, '기세', true)}</div>
    </div>
    <div class="blog" id="blog">${b.lines.map((l, i) => `<p class="${l.cls}${i >= (b.shown || 0) ? ' fresh' : ''}">${l.text}</p>`).join('')}</div>
    <div class="bctl">
      ${b.over ? `<button class="btn primary" data-act="closebattle">${b.win ? '전리품을 챙긴다' : b.fled ? '숨을 고른다' : '정신을 잃는다…'}</button>` : `
        <div class="acts">
          <button class="btn act-atk" data-bact="attack">⚔️ 공격</button>
          <button class="btn act-def" data-bact="guard">🛡️ 방어</button>
          <button class="btn act-run" data-bact="flee">💨 도주</button>
        </div>
        ${items.length ? `<div class="chips">${items.map(id => `<button class="chip" data-bitem="${id}">${ITEMS[id].icon} ${ITEMS[id].name} <b>${count(id)}</b></button>`).join('')}</div>` : ''}
        <small class="muted">방어하면 받는 피해가 50~70% 줄고, 반격 ${st.counter}% 확률로 흘려낸 뒤 되받아칩니다.</small>`}
    </div>
  </section>`;
}
function renderBattle() {
  if (ui.tab !== 'field' || !ui.battle) return render();
  $('#main').innerHTML = viewBattle();
  renderHeader();
  const bl = $('#blog'); if (bl) bl.scrollTop = bl.scrollHeight;
}

/* 무장 · 행낭 */
function statLine(it) { return Object.entries(it.stats).map(([k, v]) => `${STAT_NAMES[k]} +${v}${PCT_STATS.has(k) ? '%' : ''}`).join(' · '); }
const DOLL_SVG = `<svg class="martial-artist-img fallback" viewBox="0 0 240 360" role="img" aria-label="무인 실루엣">
  <defs><linearGradient id="dollInk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5361"/><stop offset="1" stop-color="#1b2027"/></linearGradient></defs>
  <g fill="url(#dollInk)" stroke="rgba(212,175,55,.35)" stroke-width="1.2" stroke-linejoin="round">
    <path d="M58 22 L66 18 L196 318 L188 322 Z"/>
    <path d="M52 16 h22 v8 h-22z"/>
    <ellipse cx="120" cy="34" rx="10" ry="8"/>
    <path d="M128 36 q22 4 30 22 q-14 -8 -28 -10z"/>
    <circle cx="120" cy="62" r="22"/>
    <path d="M110 82 h20 v14 h-20z"/>
    <path d="M86 98 q34 -12 68 0 l10 70 l-6 12 l14 146 h-104 l14 -146 l-6 -12z"/>
    <path d="M86 100 q-22 18 -30 70 q-4 32 -2 50 l30 6 q-2 -40 10 -86z"/>
    <path d="M154 100 q22 18 30 70 q4 32 2 50 l-30 6 q2 -40 -10 -86z"/>
    <path d="M86 170 h68 v14 h-68z"/>
    <path d="M100 184 q-6 30 -16 44 l8 2 q10 -16 16 -44z"/>
    <path d="M94 326 h22 v18 h-26z M124 326 h22 l4 18 h-26z"/>
  </g>
</svg>`;
function viewBag() {
  const st = calcStats();
  const slot = s => {
    const it = S.equip[s];
    return `<button class="dslot ${ui.slotSel === s ? 'sel' : ''} ${it ? 'r' + it.rarity : 'empty'}" data-slot="${s}" style="grid-area:${s}"><small>${SLOTS[s].name}</small>${it ? `<b>${it.name}</b>` : ''}</button>`;
  };
  const acc = s => {
    const it = S.equip[s];
    return `<button class="dslot ${ui.slotSel === s ? 'sel' : ''} ${it ? 'r' + it.rarity : 'empty'}" data-slot="${s}"><small>${SLOTS[s].name}</small>${it ? `<b>${it.name}</b>` : ''}</button>`;
  };
  const sel = ui.slotSel && S.equip[ui.slotSel];
  const statList = ['atk', 'def', 'maxHp', 'maxMp', 'spd', 'eva', 'crit', 'critRes', 'counter', 'mpRegen', 'mpCost', 'train', 'craft', 'maxSta'].map(k => `<div><span>${STAT_NAMES[k]}</span><b>${st[k]}${PCT_STATS.has(k) ? '%' : ''}</b></div>`).join('');
  const kinds = ['all', '재료', '영약', '영단', '음식', '부산물', '증표'];
  const items = Object.keys(S.inv).filter(id => ui.bagFilter === 'all' || ITEMS[id].kind === ui.bagFilter);
  return `<section class="panel">
    ${head('무장', '武裝')}
    <div class="bag-top">
      <div class="armory">
        <div class="paperdoll">
          ${['helmet', 'weapon', 'jade', 'armor'].map(slot).join('')}
          <div class="doll-wrap" style="grid-area:doll">${imgOr(IMG.doll, 'martial-artist-img', DOLL_SVG, '무인 실루엣')}</div>
        </div>
        <div class="acc-row">${['boots', 'belt', 'ring', 'badge', 'mount'].map(acc).join('')}</div>
      </div>
      <div class="side-col">
        ${sel ? `<div class="gear r${sel.rarity}"><div class="gtop"><span class="grade r${sel.rarity}">${RARITY[sel.rarity].name}</span><b>${sel.name}</b></div><small>${statLine(sel)}</small>${sel.unique ? `<small class="uniq">✦ ${sel.unique.text}</small>` : ''}<div class="btns"><button class="btn ghost sm" data-unequip="${sel.slot}">해제</button></div></div>` : ''}
        <div class="statsheet">${statList}</div>
      </div>
    </div>
  </section>
  <section class="panel">
    ${head('행낭', '行囊', `<span class="num muted">${bagUsed()} / ${bagCap()}칸</span>`)}
    ${S.gear.length ? `<div class="gears">${S.gear.map(it => `<div class="gear r${it.rarity}"><div class="gtop"><span class="grade r${it.rarity}">${RARITY[it.rarity].name}</span><b>${it.name}</b><small class="muted">${SLOTS[it.slot].name}</small></div><small>${statLine(it)}</small>${it.unique ? `<small class="uniq">✦ ${it.unique.text}</small>` : ''}<div class="btns"><button class="btn sm" data-equip="${it.uid}">착용</button><button class="btn ghost sm" data-discard="${it.uid}">버리기</button></div></div>`).join('')}</div>` : ''}
    <div class="chips">${kinds.map(k => `<button class="chip ${ui.bagFilter === k ? 'on' : ''}" data-filter="${k}">${k === 'all' ? '전체' : k}</button>`).join('')}</div>
    <div class="items">${items.map(id => { const I = ITEMS[id]; return `<div class="item"><span class="icon">${I.icon}</span><div><b>${I.name}</b> <span class="num">×${count(id)}</span><small>${I.desc}</small></div>${I.use ? `<button class="btn sm" data-use="${id}">사용</button>` : '<span></span>'}</div>`; }).join('')}</div>
  </section>`;
}

/* 도감 */
function viewCodex() {
  const cols = Object.keys(CRAFTS).map(c => {
    const all = RECIPES.filter(r => r.craft === c);
    const known = all.filter(r => S.codex.includes(r.id)).length;
    const tiles = all.map(r => S.codex.includes(r.id)
      ? `<button class="ctile known" data-recipe="${r.id}"><span>${recipeIcon(r)}</span><b>${recipeName(r)}</b></button>`
      : `<button class="ctile locked" data-recipe="${r.id}" aria-label="미발견"><span>？</span></button>`).join('');
    return `<article class="codex-col"><h3>${label(CRAFTS[c].name, CRAFTS[c].hanja)} <span class="num muted">${known}/${all.length}</span></h3><div class="ctiles">${tiles}</div></article>`;
  }).join('');
  return `<section class="panel">${head('도감', '圖鑑')}<div class="codex">${cols}</div></section>`;
}
function openRecipe(rid) {
  if (!S.codex.includes(rid)) { toast('아직 발견하지 못한 비전입니다.'); return; }
  ui.modal = 'recipe:' + rid; renderModal();
}
function recipeModal(rid) {
  const r = RECIPES.find(x => x.id === rid), C = CRAFTS[r.craft];
  let body;
  if (r.out.startsWith('eq:')) {
    const [, base, tier] = r.out.split(':'), B = EQUIP_BASES[base];
    const stats = Object.entries(B.stats(+tier)).map(([k, v]) => `<div class="kv"><span>${STAT_NAMES[k]}</span><b>+${PCT_STATS.has(k) ? Math.round(v * RARITY[2].mult * 10) / 10 + '%' : Math.round(v * RARITY[2].mult)}</b></div>`).join('');
    body = `<p class="story">${SLOTS[B.slot].name}${B.wtype ? ' · ' + WEAPON_TYPES[B.wtype] : ''}. 제작하면 상품 이상으로 나오고, 고유 옵션이 하나 붙습니다.</p><h4>능력치 (상품 기준)</h4>${stats}`;
  } else {
    const I = ITEMS[r.out];
    body = `<p class="story">${I.desc}</p><div class="kv"><span>분류</span><b>${I.kind}</b></div><div class="kv"><span>보유</span><b>${count(r.out)}개</b></div>`;
  }
  const mats = Object.entries(r.in).map(([id, n]) => `<li><span>${ITEMS[id].icon} ${ITEMS[id].name} × ${n}</span><b class="${count(id) >= n ? '' : 'warn'}">보유 ${count(id)}</b></li>`).join('');
  return `<div class="sheet">
    <div class="sheet-head"><div><small class="muted">${C.name} ${C.hanja}</small><h2>${recipeIcon(r)} ${recipeName(r)}</h2></div></div>
    ${body}
    <h4>필요 재료</h4><ul class="mats-list">${mats}</ul>
    <div class="btns"><button class="btn primary" data-fill="${r.id}" ${S.zone ? 'disabled' : ''}>[ 화로로 가기 ]</button><button class="btn ghost" data-act="closemodal">닫기</button></div>
    ${S.zone ? '<small class="muted">화로는 청풍문에 돌아가야 쓸 수 있습니다.</small>' : ''}
  </div>`;
}
function fillPot(rid) {
  if (S.zone) return;
  const r = RECIPES.find(x => x.id === rid);
  ui.craft = r.craft; ui.pot = { ...r.in }; ui.tab = 'forge'; ui.craftResult = null; ui.modal = null; render();
}

function renderModal() {
  const m = $('#modal');
  if (!ui.modal) { if (!m.dataset.intro) m.hidden = true; return; }
  m.hidden = false;
  if (ui.modal.startsWith('manual:')) m.innerHTML = manualModal(ui.modal.slice(7));
  if (ui.modal.startsWith('recipe:')) m.innerHTML = recipeModal(ui.modal.slice(7));
  if (ui.modal === 'ending') m.innerHTML = `<div class="sheet ending"><p class="eyebrow">제1장 완결</p><h2>${label('청풍문 편', '淸風門')}</h2><p class="story">시골 하급 문파의 밑바닥 제자였던 ${esc(S.name)}. 청풍산의 들개를 쫓던 손이 이제 적룡방 방주를 꺾었습니다.</p><p class="story">장문인 노벽송이 건넨 누런 종이 한 장, <b>낙양성 하산령</b>. 산문 밖으로 난 길은 낙양으로 이어집니다.</p><p class="muted">제2장 [낙양성 편]은 준비 중입니다.</p><div><button class="btn primary" data-act="closemodal">산문을 바라본다</button></div></div>`;
  wireImages();
  if (ui.modal === 'reset') m.innerHTML = `<div class="sheet"><h2>처음부터 다시</h2><p>모든 진행이 사라집니다. 정말 새로 시작하시겠습니까?</p><div class="btns"><button class="btn danger" data-act="doreset">새로 시작</button><button class="btn ghost" data-act="closemodal">그만두기</button></div></div>`;
}

/* 견문록 높이를 왼쪽 본문 패널과 1:1로 맞춘다 (넓은 화면에서만) */
function syncSide() {
  const main = $('#main'), side = $('.side');
  const apply = () => {
    if (innerWidth <= 960) { side.style.height = ''; return; }
    side.style.height = Math.max(320, main.offsetHeight) + 'px';
    const el = $('#log'); if (el) el.scrollTop = el.scrollHeight;
  };
  if (window.ResizeObserver) new ResizeObserver(apply).observe(main);
  addEventListener('resize', apply);
  apply();
}

/* ───────── 시작 화면 ───────── */
function showIntro() {
  let chosen = 'samjaeGeom';
  const m = $('#modal'); m.hidden = false; m.dataset.intro = '1';
  const draw = () => {
    const name = $('#pname') ? $('#pname').value : '이름 없는 제자';
    m.innerHTML = `<div class="sheet intro">
      <p class="eyebrow">江湖見聞錄</p>
      <h1>강호견문록</h1>
      <p class="story">청풍산 기슭, 무너져 가는 하급 문파 <b>청풍문</b>. 장문인은 낮잠을 자고, 대사형은 장작을 패고, 사매는 약과를 굽는다. 그리고 오늘, 새 제자 한 명이 산문을 두드린다.</p>
      <label class="field-l" for="pname">이름</label>
      <input id="pname" maxlength="8" value="${esc(name)}" autocomplete="off">
      <p class="field-l">입문 비급</p>
      <div class="starters">${STARTERS.map(id => { const M = MANUALS[id]; return `<button class="starter ${chosen === id ? 'on' : ''}" data-starter="${id}"><b>${M.name}</b><small>[${WEAPON_SHORT[M.weapon]}]</small></button>`; }).join('')}</div>
      <button class="btn primary big" id="begin">산문에 들어선다</button>
    </div>`;
  };
  draw();
  m.onclick = e => {
    const s = e.target.closest('[data-starter]');
    if (s) { chosen = s.dataset.starter; draw(); return; }
    if (e.target.closest('#begin')) {
      const name = ($('#pname').value || '').trim().slice(0, 8) || '무명';
      S = newState(name, chosen);
      const wt = MANUALS[chosen].weapon;
      S.equip.weapon = makeGear(wt, 1, 0, false);
      const st = calcStats(); S.hp = st.maxHp; S.mp = st.maxMp;
      ensureMissions();
      m.onclick = null; delete m.dataset.intro; m.hidden = true;
      log(`${name}, 청풍문의 제자가 되었습니다. 《${MANUALS[chosen].name}》과 토납법·포철삭·철포삼을 받았습니다.`, 'gold');
      log(`조운: "${WEAPON_TYPES[wt]}${jo(WEAPON_TYPES[wt], '이가')} 필요하겠지. 이거라도 쥐고 다녀라." — ${S.equip.weapon.name} 착용`, 'npc');
      log('아린: "새 사형이다! 정청에 가서 조운 사형한테 보급품부터 받아요!"', 'npc');
      ui.tab = 'hall';
      render();
    }
  };
}

/* ───────── 이벤트 ───────── */
function onClick(e) {
  const t = e.target.closest('button, [data-tab], [data-manual]');
  if (!t || t.disabled || !S) return;
  const d = t.dataset;
  if (d.tab) { if (ui.battle && d.tab !== 'field') return; ui.tab = d.tab; ui.craftResult = null; render(); return; }
  if (d.move) { const [dx, dy] = d.move.split(',').map(Number); return move(dx, dy); }
  if (d.zone) return enterZone(d.zone);
  if (d.train) return toggleTraining(d.train);
  if (d.manual) { ui.modal = 'manual:' + d.manual; return renderModal(); }
  if (d.pill) return useItem(d.pill, false);
  if (d.use) return useItem(d.use, false);
  if (d.bact) return playerAction(d.bact);
  if (d.bitem) return battleItem(d.bitem);
  if (d.offer) return offer(d.offer, false);
  if (d.offerall) return offer(d.offerall, true);
  if (d.craft) { ui.craft = d.craft; ui.pot = {}; ui.craftResult = null; return render(); }
  if (d.add) { if (potTotal() >= POT_MAX) return toast(`화로에는 ${POT_MAX}개까지만 들어갑니다.`); if ((ui.pot[d.add] || 0) >= count(d.add)) return; ui.pot[d.add] = (ui.pot[d.add] || 0) + 1; ui.craftResult = null; return render(); }
  if (d.rem) { ui.pot[d.rem]--; if (ui.pot[d.rem] <= 0) delete ui.pot[d.rem]; return render(); }
  if (d.mission) return completeMission(+d.mission);
  if (d.buymanual) return buyManual(d.buymanual);
  if (d.buybadge) return buyBadge(d.buybadge);
  if (d.slot) { ui.slotSel = ui.slotSel === d.slot ? null : d.slot; return render(); }
  if (d.equip) return equipItem(+d.equip);
  if (d.unequip) return unequip(d.unequip);
  if (d.discard) return discardGear(+d.discard);
  if (d.filter) { ui.bagFilter = d.filter; return render(); }
  if (d.fill) return fillPot(d.fill);
  if (d.recipe) return openRecipe(d.recipe);
  const acts = {
    leave: leaveZone, interact, craft: doCraft, clearpot: () => { ui.pot = {}; render(); },
    rest, snack: arinSnack, hint: arinHint, masterhint: masterHint, supply: jounSupply, reroll: rerollMissions,
    hasan: doHasan, closemodal: () => { ui.modal = null; render(); },
    closebattle: closeBattle,
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
  document.addEventListener('keydown', e => { const c = e.target.closest && e.target.closest('[data-manual]'); if (c && e.target === c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ui.modal = 'manual:' + c.dataset.manual; renderModal(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.modal && ui.modal !== 'ending') { ui.modal = null; render(); } });
  S = load();
  if (S && (S.v || 0) < 3) {
    S.activeTrainingSkillId = null; delete S.training; delete S.gatherCd; delete S.opened; delete S.cleared;
    S.v = 3;
  }
  if (S && S.zone && !S.zone.layout) S.zone = null;
  if (!S) showIntro();
  else {
    const away = Math.min(OFFLINE_CAP, (now() - S.lastTick) / 1000);
    if (away > 30 && S.activeTrainingSkillId) {
      advance(away, true);
      log(`자리를 비운 ${Math.floor(away / 60)}분 동안 폐관수련이 이어졌습니다.`, 'gold');
    }
    ensureMissions();
    render();
  }
  syncSide();
  lastFrame = now();
  setInterval(tick, 1000);
  setInterval(save, 10000);
  window.addEventListener('beforeunload', save);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
