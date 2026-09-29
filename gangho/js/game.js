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
let ui = { fold: { hq: false, missions: false, library: true }, tab: 'hall', pot: {}, craft: 'alchemy', battle: null, modal: null, bagFilter: 'all', slotSel: null };

function newState(name, mugongId) {
  const st = {
    v: 7, name, created: now(), lastTick: now(),
    hp: 0, mp: 0, stamina: 100, silver: 30, contrib: 0, activeTrainingSkillId: null,
    manuals: {}, active: { mugong: null, simbeop: null, gyeonggong: null, gigong: null },
    inv: { potionHp: 3, herb: 2, ['bk_' + mugongId]: 1, bk_tonap: 1, bk_pocheolsak: 1, bk_cheolpo: 1 },
    gear: [], equip: {},
    shrine: { atk: 0, mp: 0, eva: 0, total: 0 },
    perm: { maxHp: 0, maxMp: 0 },
    crafts: { forge: { lv: 1, xp: 0 }, alchemy: { lv: 1, xp: 0 }, cook: { lv: 1, xp: 0 } },
    codex: [], hints: [], flags: {},
    zone: null, seen: {},
    buffs: [], missions: [], arin: {}, supplyDay: '', restCd: 0, uid: 1,
    kills: 0, log: [],
  };
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
  // 새 기록은 맨 위에 붙인다 (최신이 항상 위)
  const el = $('#log'); if (!el) return;
  const p = document.createElement('p');
  p.className = cls; p.innerHTML = text;
  el.prepend(p);
  while (el.children.length > 60) el.lastElementChild.remove();
  el.scrollTop = 0;
}
function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  const box = $('#toasts');
  while (box.children.length >= 2) box.firstChild.remove();
  box.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3200);
}

/* ───────── 능력치 ───────── */
function calcStats() {
  const s = { atk: 10, def: 3, maxHp: 100, maxMp: 40, spd: 10, eva: 3, crit: 5, critRes: 0, counter: 10, mpRegen: 1, bag: 100, mpCost: 0, craft: 0, train: 0, maxSta: 100, combo: 0, lifesteal: 0, atkPct: 0, hpPct: 0, mpPct: 0, mpSave: 0, evaFlat: 0 };
  for (const cat of CAT_ORDER) {
    const id = S.active[cat]; if (!id || !S.manuals[id]) continue;
    for (const [k, v] of Object.entries(manualBonus(id, S.manuals[id].star))) s[k] += v;
  }
  for (const slot of SLOT_ORDER) {
    const it = S.equip[slot]; if (!it) continue;
    for (const [k, v] of Object.entries(gearStats(it))) s[k] = (s[k] || 0) + v;
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
  s.atk *= 1 + atkB; s.def *= 1 + defB; s.maxHp *= 1 + s.hpPct / 100; s.maxMp *= 1 + s.mpPct / 100;
  for (const k of ['atk', 'def', 'maxHp', 'maxMp', 'spd', 'maxSta']) s[k] = Math.round(s[k]);
  s.eva = Math.min(60, Math.round(s.eva * 10) / 10);
  s.crit = Math.min(75, Math.round(s.crit * 10) / 10);
  s.counter = Math.min(60, Math.round(s.counter * 10) / 10);
  s.mpRegen = Math.round(s.mpRegen * 10) / 10;
  return s;
}
/* 수련 시간표: 1~4성 구간 성당 8시간, 5~8성 16시간, 9~12성 24시간 (기본 효율 기준) */
/* 진행 속도 (기본 효율 기준)
   1~5성 (입문)  : 성당 수련 8시간 · 실전 승리 10회 → 5성이 차면 소성 관문
   6~11성 (소성) : 성당 수련 16시간 · 실전 승리 20회 → 11성이 차면 대성 관문
   12성 (대성)   : 수련 완성, 분류별 극의 패시브 개방 */
const segOf = star => star <= 5 ? 0 : 1;
function trainHours(star) { return star <= 5 ? 8 : 16; }
const CXP_NEED = [10, 20];
function realmOf(star) { return [...REALMS].reverse().find(r => star >= r.min); }
const realmTag = star => { const r = realmOf(star); return `<span class="realm ${r.cls}">${r.name} <small>${r.hanja}</small></span>`; };
function trainBonus(st) { st = st || calcStats(); return 1 + st.train / 100 + st.trainBuff; }
/* 비급 하나가 장착 시 주는 능력치 (성급 기준) */
function manualBonus(id, star) {
  const M = MANUALS[id], g = GRADES[M.grade].mult, st = star, t = tri(st), b = {};
  if (M.cat === 'mugong') b.atk = (4 * st + 0.9 * t) * g;
  if (M.cat === 'simbeop') Object.assign(b, { maxMp: (12 * st + 1.5 * t) * g, atk: st * g, maxHp: 5 * st * g, mpRegen: 0.25 * st * g });
  if (M.cat === 'gyeonggong') Object.assign(b, { spd: 0.8 * st * g, eva: 0.6 * st * g, crit: 0.3 * st * g, counter: 0.5 * st * g });
  if (M.cat === 'gigong') Object.assign(b, { maxHp: (20 * st + 4 * t) * g, def: (1.5 * st + 0.35 * t) * g, counter: 1.2 * st * g });
  if (st >= 6) for (const k of Object.keys(b)) b[k] *= 1.3;              // 소성: 기본 위력 계수 상향
  if (st >= MAX_STAR) for (const [k, v] of Object.entries(DAESUNG_PASSIVE[M.cat].stats)) b[k] = (b[k] || 0) + v;   // 대성 극의
  return b;
}
function trainRate(id, st) {
  const m = S.manuals[id]; if (!m || m.star >= MAX_STAR) return 0;
  return trainBonus(st);
}
function fmtDur(sec) {
  if (!isFinite(sec) || sec <= 0) return '0분';
  const h = Math.floor(sec / 3600), mnt = Math.ceil((sec % 3600) / 60);
  return h ? `${h}시간 ${mnt}분` : `${mnt}분`;
}

/* ───────── 경험치 & 성(星) ───────── */
const need = star => Math.round(trainHours(star) * 3600);           // 수련: 성당 필요한 수련 초(기본 효율 1초 = 1)
const needC = star => CXP_NEED[segOf(star)];                          // 실전: 성당 필요 승리 수
const needOf = (kind, star) => kind === 'cxp' ? needC(star) : need(star);
/* 쌓아 둘 수 있는 한도: 다음 관문까지 필요한 양 전부 + 한 성 여유. 수련만 먼저 해 둬도 버려지지 않는다. */
function xpCap(kind, star) {
  const gateStar = star <= 5 ? 5 : 11;
  let cap = 0;
  for (let k = star; k <= gateStar; k++) cap += needOf(kind, k);
  return cap + needOf(kind, Math.min(MAX_STAR - 1, gateStar + 1));
}

function addXp(id, kind, amt) {
  const m = S.manuals[id];
  if (!m || m.star >= MAX_STAR) return;
  m[kind] = Math.min(m[kind] + amt, xpCap(kind, m.star));
  tryStar(id);
}
function tryStar(id) {
  const m = S.manuals[id], M = MANUALS[id];
  while (m.star < MAX_STAR) {
    const nc = needC(m.star), nt = need(m.star);
    if (m.cxp < nc || m.txp < nt) break;
    if (GATES[m.star]) {
      if (!m.gate) { m.gate = true; log(`《${M.name}》 ${m.star}성이 가득 찼습니다. ${GATE_NAME[m.star]}에 막혔습니다. ${ITEMS[GATES[m.star]].name}${jo(ITEMS[GATES[m.star]].name, '을를')} 복용하면 뚫을 수 있습니다.`, 'gold'); toast(`${M.name} — ${GATE_NAME[m.star]}`); }
      break;
    }
    m.cxp -= nc; m.txp -= nt; m.star++;
    log(`《${M.name}》 ${m.star}성에 올랐습니다!`, 'good');
    toast(`${M.name} ${m.star}성!`);
  }
}
function breakthrough(id) {
  const m = S.manuals[id], M = MANUALS[id];
  const pill = GATES[m.star];
  if (!m.gate || !pill || !has(pill)) return false;
  take(pill, 1);
  m.cxp -= needC(m.star); m.txp -= need(m.star); m.star++; m.gate = false;
  const lines = {
    6: '노벽송: "소성(小成)이로구나. 이제야 무공이 네 몸을 알아보는 게야." — 기본 위력 상향!',
    12: '노벽송: "…대성(大成)이다. 극의에 닿았으니 이 늙은이가 가르칠 건 더 없구나."',
  };
  log(`${ITEMS[pill].icon} ${ITEMS[pill].name}의 약기운이 기혈을 뚫습니다. 《${M.name}》 ${GATE_NAME[m.star - 1]} 돌파! ${m.star}성.`, 'gold');
  if (lines[m.star]) log(lines[m.star], 'npc');
  if (m.star === 6) log(`✨ 《${M.name}》 소성(小成) — 장착 능력치 30% 상향${M.cat === 'mugong' ? ', 초식 위력 25% 상향' : ''}.`, 'gold');
  if (m.star === MAX_STAR) log(`🌟 《${M.name}》 대성(大成 / 極意) — ${DAESUNG_PASSIVE[M.cat].text}`, 'gold');
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
  if (u.learn) { learnManual(id); return; }
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
    revealMaterials(recipe);
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

/* 재료 단서: 조합에 성공하면 그 조합에 쓴 재료마다 '이 재료가 들어가는 다른 조합식'이 도감에 드러난다.
   완성품 이름과 이미 아는 재료만 보이고, 나머지 재료는 가려진다. (유저끼리 정보를 나누며 채워 가는 구조) */
function revealMaterials(recipe) {
  S.knownMats = S.knownMats || {};
  for (const mat of Object.keys(recipe.in)) {
    if (S.knownMats[mat]) continue;
    S.knownMats[mat] = 1;
    const uses = RECIPES.filter(r => r.in[mat] && !S.codex.includes(r.id));
    if (uses.length) log(`🔍 ${hlItem(ITEMS[mat].name)}${jo(ITEMS[mat].name, '이가')} 쓰이는 조합식 ${uses.length}개가 도감에 단서로 드러났습니다.`, 'hint');
  }
}
const isClue = r => !S.codex.includes(r.id) && Object.keys(r.in).some(m => (S.knownMats || {})[m]);

/* 기예 ↔ 재료 분류 */
const CRAFT_TYPE = { forge: 'forge', alchemy: 'alchemy', cook: 'cooking' };

/* 무신상 봉헌 */
const OFFER = {
  twistedIron: { key: 'atk', val: 1, text: '공격력 +1' },
  burntAsh:    { key: 'mp',  val: 4, text: '최대 내력 +4' },
  dregs:       { key: 'eva', val: 0.3, text: '회피율 +0.3%' },
  kingTusk:    { key: 'atk', val: 3, text: '공격력 +3' },
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

/* 입구에서 8방향 BFS. 거리 맵을 돌려준다. */
function bfs(grid, sx, sy) {
  const dist = new Map([[`${sx},${sy}`, 0]]), q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift(), d = dist.get(`${x},${y}`);
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, c = (grid[ny] || [])[nx];
      if (!c || c === '_' || dist.has(`${nx},${ny}`)) continue;
      dist.set(`${nx},${ny}`, d + 1); q.push([nx, ny]);
    }
  }
  return dist;
}
function reachable(grid, sx, sy) { return new Set(bfs(grid, sx, sy).keys()); }
const neighbors8 = (x, y) => DIRS.map(([dx, dy]) => [x + dx, y + dy]).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < MAP_W && ny < MAP_H);

/* 12×10 사냥터 생성
   1) 입구(좌측 하단)→두목(우측 상단 끝) 사이에 굽이진 주 통로를 먼저 판다
   2) 통로 밖 일부를 절벽(빈칸)으로 막는다
   3) BFS로 끊긴 칸이 있으면 가장 가까운 도달 칸까지 산길로 잇는다
   4) 이벤트를 서로 붙지 않게(8방향 이웃 금지) 흩뿌리고, 나머지는 모두 산길로 둔다 */
function generateLayout(Z) {
  const W = MAP_W, H = MAP_H, R = (a, b) => rint(a, b);
  const grid = Array.from({ length: H }, () => Array(W).fill('o'));
  const S0 = [R(0, 1), R(H - 3, H - 1)], K0 = [W - 1, 0];
  const main = new Set();
  let [x, y] = S0;
  main.add(`${x},${y}`);
  while (x !== K0[0] || y !== K0[1]) {
    const opts = [];
    if (x < K0[0]) opts.push([1, 0], [1, 0]);
    if (y > K0[1]) opts.push([0, -1], [0, -1]);
    if (x < K0[0] && y > K0[1]) opts.push([1, -1]);
    if (y < H - 1 && Math.random() < 0.15) opts.push([0, 1]);
    const [dx, dy] = pick(opts); x += dx; y += dy;
    main.add(`${x},${y}`);
  }
  const near = (px, py, [qx, qy]) => Math.max(Math.abs(px - qx), Math.abs(py - qy)) <= 1;
  const cells = [];
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (!main.has(`${xx},${yy}`) && !near(xx, yy, S0) && !near(xx, yy, K0)) cells.push([xx, yy]);
  const voidN = Math.round(W * H * rnd(...MAP_SPEC.void));
  for (const [vx, vy] of cells.sort(() => Math.random() - 0.5).slice(0, voidN)) grid[vy][vx] = '_';
  grid[S0[1]][S0[0]] = 'S'; grid[K0[1]][K0[0]] = 'K';
  // 끊긴 칸 잇기
  for (let guard = 0; guard < 200; guard++) {
    const seen = reachable(grid, ...S0), lost = [];
    grid.forEach((r, yy) => r.forEach((c, xx) => { if (c !== '_' && !seen.has(`${xx},${yy}`)) lost.push([xx, yy]); }));
    if (!lost.length) break;
    const [lx, ly] = lost[0];
    let best = null, bd = Infinity;
    for (const k of seen) { const [kx, ky] = k.split(',').map(Number); const d = Math.max(Math.abs(kx - lx), Math.abs(ky - ly)); if (d < bd) { bd = d; best = [kx, ky]; } }
    let [cx, cy] = [lx, ly];
    while (Math.max(Math.abs(cx - best[0]), Math.abs(cy - best[1])) > 1) { cx += Math.sign(best[0] - cx); cy += Math.sign(best[1] - cy); if (grid[cy][cx] === '_') grid[cy][cx] = 'o'; }
  }
  // 이벤트 배치: 산길이 약 50%가 되도록 채우되, 한 칸 주변 8칸에 이벤트가 몰리지 않게 흩뿌린다
  const dist = bfs(grid, ...S0), maxD = Math.max(...dist.values());
  const isEvent = c => 'YHMCG'.includes(c);
  const evNeighbors = ([fx, fy]) => neighbors8(fx, fy).filter(([nx, ny]) => isEvent(grid[ny][nx])).length;
  const nearGate = ([fx, fy]) => neighbors8(fx, fy).some(([nx, ny]) => 'SK'.includes(grid[ny][nx]));
  const paths = () => { const out = []; grid.forEach((r, yy) => r.forEach((c, xx) => { if (c === 'o') out.push([xx, yy]); })); return out.sort(() => Math.random() - 0.5); };
  const deg = ([dx, dy]) => neighbors8(dx, dy).filter(([nx, ny]) => grid[ny][nx] !== '_').length;
  const depth = c => (dist.get(`${c[0]},${c[1]}`) || 0) / maxD;
  const place = (ch, n, sort) => {
    let placed = 0;
    for (const maxAdj of [0, 1, 2, 3]) {                       // 먼저 외따로, 모자라면 조금씩 허용
      let pool = paths().filter(c => !nearGate(c));
      if (sort) pool.sort(sort);
      for (const c of pool) {
        if (placed >= n) return placed;
        if (grid[c[1]][c[0]] !== 'o' || evNeighbors(c) > maxAdj) continue;
        // 이미 놓인 이웃 이벤트도 주변 8칸 중 이벤트가 3개를 넘지 않게 한다
        if (neighbors8(c[0], c[1]).some(([nx, ny]) => isEvent(grid[ny][nx]) && evNeighbors([nx, ny]) >= 3)) continue;
        grid[c[1]][c[0]] = ch; placed++;
      }
    }
    return placed;
  };
  const deadEnd = (a, b) => deg(a) - deg(b) || depth(b) - depth(a);
  place('G', MAP_SPEC.gimmick, deadEnd);
  place('C', R(...MAP_SPEC.chest), deadEnd);
  place('Y', R(...MAP_SPEC.beast));
  place('H', R(...MAP_SPEC.herb));
  place('M', R(...MAP_SPEC.mine));
  // 함정은 산길 칸에 숨긴다 (보이는 모습은 산길과 같다)
  let traps = R(...MAP_SPEC.trap);
  for (const c of paths()) { if (!traps) break; if (nearGate(c) || grid[c[1]][c[0]] !== 'o') continue; grid[c[1]][c[0]] = 'T'; traps--; }
  return { layout: grid.map(r => r.join('')), start: S0 };
}

function tileAt(zid, x, y) {
  if (!S || !S.zone || S.zone.id !== zid) return '_';
  const row = S.zone.layout[y];
  if (!row || x < 0 || x >= row.length) return '_';
  if (S.zone.done[`${x},${y}`]) return 'o';
  return row[x];
}
function passable(zid, x, y) { return tileAt(zid, x, y) !== '_'; }
function zoneUnlocked(zid) { const u = ZONES[zid].unlock; return !u || !!S.flags[u.boss]; }
function reveal(zid, x, y) {
  S.seen[zid] = S.seen[zid] || {};
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (passable(zid, x + dx, y + dy)) S.seen[zid][`${x + dx},${y + dy}`] = 1;
}
function enterZone(zid) {
  if (!zoneUnlocked(zid)) return;
  const { layout, start } = generateLayout(ZONES[zid]);
  const [x, y] = start;
  S.zone = { id: zid, x, y, layout, start, done: {} };
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
  const nx = S.zone.x + dx, ny = S.zone.y + dy, zid = S.zone.id;
  if (!passable(zid, nx, ny)) return;
  const c = tileAt(zid, nx, ny);
  S.zone.x = nx; S.zone.y = ny;
  reveal(zid, nx, ny);
  if (c === 'T') return springTrap();
  if (c === 'Y') {
    const key = `${nx},${ny}`;
    S.zone.foes = S.zone.foes || {};
    if (!S.zone.foes[key]) S.zone.foes[key] = pickBeast();   // 대치 상대는 한 번 정해지면 바뀌지 않는다
    log(`🐾 ${josa(ENEMIES[S.zone.foes[key]].name, '이가')} 앞길을 막아섭니다. 대치(對峙) 중입니다.`, 'place');
  }
  render();
}
/* 숨은 함정: 밟는 순간 발동하고 곧바로 산길이 된다 */
function springTrap() {
  const st = calcStats(), hpLoss = Math.max(1, Math.round(st.maxHp * TRAP.hpPct));
  S.hp = Math.max(1, S.hp - hpLoss); S.stamina = Math.max(0, S.stamina - TRAP.stamina);
  log(`🪤 ${TRAP.text} 활력 -${hpLoss}, 기력 -${TRAP.stamina}`, 'bad');
  toast(TRAP.text);
  clearNode(); render();
}
/* 요수: 밟는 순간 지역 요수 중 하나를 가중치로 고른다. 깊은 곳일수록 중형이 잦다. */
function pickBeast() {
  const Z = ZONES[S.zone.id], dist = bfs(S.zone.layout, ...S.zone.start);
  const maxD = Math.max(...dist.values()), d = (dist.get(`${S.zone.x},${S.zone.y}`) || 0) / maxD;
  const w = d >= 0.5 ? BEAST_WEIGHT.deep : BEAST_WEIGHT.shallow;
  let r = Math.random() * w.reduce((a, b) => a + b);
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return Z.enemies[i]; }
  return Z.enemies[0];
}
function nodeInfo(zid, x, y) {
  const c = tileAt(zid, x, y), Z = ZONES[zid];
  if (c === 'Y') return { type: 'beast', icon: '🐾', label: '요수(妖獸)' };
  if (c === 'H') return { type: 'herb', icon: '🌿', label: '약초 군락' };
  if (c === 'M') return { type: 'mine', icon: '⛏️', label: '광맥' };
  if (c === 'C') return { type: 'chest', icon: '📦', label: '금고(金庫)' };
  if (c === 'G') return { type: 'gimmick', icon: '⚙️', label: Z.gimmick.name };
  if (c === 'K') return { type: 'boss', icon: '👹', label: ENEMIES[Z.boss].name, enemy: Z.boss };
  if (c === 'S') return { type: 'gate', icon: '🏯', label: '입구' };
  return { type: 'path', icon: '·', label: '산길(山徑)' };   // 함정(T)도 산길과 똑같이 보인다
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
/* 금고: 은자 궤·약재 상자·철물 상자·장비 궤 중 하나 */
function openVault(Z) {
  let r = Math.random() * VAULTS.reduce((a, v) => a + v.w, 0), v = VAULTS[0];
  for (const x of VAULTS) { r -= x.w; if (r < 0) { v = x; break; } }
  log(`🔓 금고를 열자 ${v.icon} ${hlItem(v.name)}${jo(v.name, '이가')} 나왔습니다.`, 'good');
  const t = Z.tier;
  if (v.name === '은자 궤') giveSilver(rint(15, 35) * t);
  if (v.name === '약재 궤') {                         // 연단 재료 다량
    for (const id of Z.herb.map(r => r[0]).filter(id => ITEMS[id].craftType === 'alchemy')) give(id, rint(2, 4));
  }
  if (v.name === '철물 궤') {                         // 주조 재료 다량
    for (const id of Z.mine.map(r => r[0]).filter(id => ITEMS[id].craftType === 'forge')) give(id, rint(2, 4));
  }
  if (v.name === '비급/장비 궤') {                    // 희귀: 아직 익히지 않은 입문(하품) 비급, 없으면 기본 장비
    const books = STARTERS.filter(id => !S.manuals[id] && !has('bk_' + id));
    if (books.length) give('bk_' + pick(books), 1);
    else giveGear(makeGear(pick(Object.keys(EQUIP_BASES)), t, 0, false));
  }
}
function clearNode() { if (S.zone) S.zone.done[`${S.zone.x},${S.zone.y}`] = 1; }
function giveSilver(n) { S.silver += n; log(`${hlSilver(n)} 획득`, 'loot'); }
function interact() {
  if (!S.zone || ui.battle) return;
  const { id: zid, x, y } = S.zone, Z = ZONES[zid], info = nodeInfo(zid, x, y);
  if (info.type === 'beast') {
    const key = `${x},${y}`; S.zone.foes = S.zone.foes || {};
    const eid = S.zone.foes[key] || (S.zone.foes[key] = pickBeast());
    if (spend(STAMINA_COST.battle)) startBattle(eid);
    return;
  }
  if (info.type === 'boss') { if (spend(STAMINA_COST.boss)) startBattle(info.enemy); return; }
  if (info.type === 'herb' || info.type === 'mine') {
    if (!spend(STAMINA_COST[info.type])) return;
    log(info.type === 'herb' ? '약초낫으로 풀숲을 헤쳐 남김없이 거두었습니다.' : '곡괭이로 광맥을 남김없이 캐냈습니다.', 'muted');
    for (const [id, n] of rollTable(Z[info.type])) give(id, n);
    clearNode();
  }
  if (info.type === 'chest') {
    if (!spend(STAMINA_COST.chest)) return;
    openVault(Z);
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

/* 3초마다 한 번씩 공방(속도가 빠른 쪽이 먼저)이 오간다. 선택지는 없다. */
let BATTLE_MS = 3000;
function startBattle(eid) {
  const E = ENEMIES[eid];
  stopBattleTimer();
  ui.battle = { eid, e: { ...E, hpNow: E.hp }, lines: [], over: false, round: 0, st: calcStats() };
  bLine(`⚔️ ${josa(E.name, '이가')} 모습을 드러냈습니다!`, 'head');
  const [, stext, scls] = sense(eid);
  bLine(stext, 'sense ' + scls);
  if (E.boss) {
    const quotes = { boarKing: '외눈 멧돼지왕이 콧김을 뿜으며 땅을 긁습니다.', jeokyeom: '적염도: "청풍문? 그 거지 문파에서 아직 사람이 나오나?"', galcheon: '갈천: "물 위에서 나를 이긴 자는 없다. 뭍에서도 마찬가지고."' };
    bLine(quotes[eid], 'npc');
  }
  const mt = MANUALS[S.active.mugong];
  if (!mt) bLine('장착한 무공이 없어 맨손으로 맞섭니다.', 'muted');
  else if (mt.weapon !== weaponType()) bLine(`《${mt.name}》은 ${WEAPON_TYPES[mt.weapon]} 무공입니다. 병기가 맞지 않아 초식을 펼칠 수 없습니다.`, 'muted');
  ui.tab = 'field';
  render();
  ui.btimer = setInterval(battleRound, BATTLE_MS);
}
function stopBattleTimer() { if (ui.btimer) { clearInterval(ui.btimer); ui.btimer = null; } }
/* 전투 로그는 전투 창과 견문록에 함께 남긴다 */
function bLine(text, cls = '') { ui.battle.lines.push({ text, cls }); log(text, 'battle ' + cls); }
function battleRound() {
  const b = ui.battle;
  if (!b || b.over) { stopBattleTimer(); return; }
  b.round++;
  b.st = calcStats();
  const order = b.st.spd >= b.e.spd ? ['me', 'foe'] : ['foe', 'me'];
  for (const who of order) {
    if (b.over) break;
    if (who === 'me') playerAttack(b); else enemyTurn(b);
    checkEnd(b);
  }
  if (!b.over) S.mp = Math.min(b.st.maxMp, S.mp + b.st.mpRegen);
  else stopBattleTimer();
  renderBattle();
}
function checkEnd(b) {
  if (b.over) return;
  if (b.e.hpNow <= 0) winBattle(b);
  else if (S.hp <= 0) loseBattle(b);
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
  const canCombo = !!M && M.weapon === weaponType();
  let comboDone = false;
  if (canCombo && Math.random() * 100 < 35 + st.combo) {
    const moves = unlockedMoves(m.star), g = GRADES[M.grade].mult;
    const realmMult = m.star >= 6 ? 1.25 : 1;                 // 소성 이후 초식 위력 상향
    const mults = [1.6, 2.2, 3.2].map(v => v * (1 + (g - 1) * 0.5) * realmMult);
    const chain = [100, 50, 38];
    for (let i = 0; i < moves; i++) {
      if (i > 0 && Math.random() * 100 >= chain[i] + st.combo) break;
      const cost = Math.max(1, Math.round((5 + m.star + i * (6 + m.star)) * g * (1 - (st.mpCost + st.mpSave) / 100)));
      if (S.mp < cost) { if (i > 0) bLine(`내력이 바닥나 제${i + 1}초식으로 잇지 못했습니다.`, 'muted'); break; }
      S.mp -= cost;
      comboDone = true;
      const ok = playerHit(b, mults[i], `<b class="move m${i + 1}">【${M.moves[i]}】</b> 제${i + 1}초식!`);
      if (!ok || b.e.hpNow <= 0) break;
    }
  }
  if (!comboDone) playerHit(b, 1, '⚔️ 평타(平打).');
}
/* 적의 공격: 회피 → 반격(반격 스탯 확률로 흘리고 되받아침) → 피격 */
function enemyTurn(b) {
  const e = b.e, st = b.st;
  const hitChance = Math.max(40, 95 - st.eva);
  // 1) 회피 성공: 피해 0, 반격 판정 없이 적 턴 종료
  if (Math.random() * 100 >= hitChance) { bLine(`${e.name}의 공격을 비스듬히 흘려냈습니다!`, 'dodge'); return; }
  // 2) 회피 실패: 피격 후에만 반격 판정
  let dmg = dmgCalc(e.atk, st.def);
  const crit = Math.random() * 100 < Math.max(0, 8 - st.critRes / 2);
  if (crit) dmg = Math.round(dmg * 1.5);
  S.hp = Math.max(0, S.hp - dmg);
  const [, , cls] = reaction(dmg, st.maxHp);
  const feel = { h1: '살짝 스쳤습니다.', h2: '살갗이 찢어집니다.', h3: '뼈가 울립니다!', h4: '입가로 피가 흐릅니다!', h5: '기혈이 뒤집힙니다!' }[cls];
  bLine(`${e.name}의 공격${crit ? ' <b class="crit">치명!</b>' : ''} — ${feel} <span class="dmg">활력 -${fmt(dmg)}</span>`, 'taken');
  if (S.hp > 0 && Math.random() * 100 < st.counter) playerHit(b, 1.0, '<b class="move counter">【반격(反擊)】</b> 맞은 틈을 파고들어 되받아칩니다.');
}
function winBattle(b) {
  b.over = true; b.win = true;
  const E = ENEMIES[b.eid];
  bLine(`🏆 ${josa(E.name, '을를')} 쓰러뜨렸습니다!`, 'win');
  clearNode();
  const worn = CAT_ORDER.filter(c => S.active[c]);
  for (const cat of worn) addXp(S.active[cat], 'cxp', 1);
  if (worn.length) bLine(`실전 경험 +1 (${worn.map(c => CATS[c].name).join('·')})`, 'muted');
  const silver = rint(...E.silver); S.silver += silver;
  bLine(`${hlSilver(silver)} 획득`, 'loot');
  // 이 적에게 귀속된 드랍 테이블만 순회한다
  for (const [id, p] of E.drops) if (Math.random() < p) { if (give(id, 1, true)) bLine(`${ITEMS[id].icon} ${hlItem(ITEMS[id].name)} 획득`, 'loot'); }
  if (E.gear && Math.random() < E.gear[1]) {
    const it = makeGear(pick(Object.keys(EQUIP_BASES)), E.gear[0], rollDropRarity(!!E.boss), false);
    if (giveGear(it, true)) bLine(`🗡️ [${RARITY[it.rarity].name}] ${hlItem(it.name)} 획득`, 'loot');
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
    const mount = SHOP_GEAR.find(g => g.boss === E.boss);
    if (mount && giveGear(shopGear(mount.id), true)) { bLine(`🐴 두목이 부리던 ${hlItem(mount.name)}${jo(mount.name, '을를')} 얻었습니다. 무장에서 탈것으로 착용하십시오.`, 'loot'); }
  }
}
function loseBattle(b) {
  b.over = true; b.win = false;
  const lost = Math.floor(S.silver * 0.1);
  S.silver -= lost;
  bLine(`💀 눈앞이 캄캄해집니다… 조운 사형이 업고 돌아왔습니다. (은자 ${lost}냥을 잃었습니다)`, 'bad');
}
function closeBattle() {
  const b = ui.battle; if (!b || !b.over) return;
  stopBattleTimer();
  ui.battle = null;
  if (!b.win) {
    S.zone = null;
    S.hp = Math.max(1, Math.round(calcStats().maxHp * 0.1));
    ui.tab = 'yard';
  }
  save(); render();
}
function battleItem(id) {
  const b = ui.battle; if (!b || b.over || !has(id)) return;
  useItem(id, true);
  b.lines.push({ text: `${ITEMS[id].icon} ${ITEMS[id].name}${jo(ITEMS[id].name, '을를')} 삼켰습니다.`, cls: 'good' });
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
const ARIN_TALK = [
  '사형, 조운 사형이 또 장작 패다 도끼 자루 부러뜨렸대요. 헤헤.',
  '장문인 할아버지 오늘도 낮잠이에요. 코 고는 소리가 연무장까지 들려요!',
  '청풍산 들토끼는 귀엽지만… 고기는 맛있어요.',
  '저도 언젠가 낙양 구경 가 보고 싶어요. 사형이 먼저 가면 얘기해 줘요!',
  '무신상 앞에 쇳덩이 놓고 절하는 사형 봤어요. 진짜 효과 있어요?',
  '화로 쓸 때 불 조심해요! 지난번에 조운 사형 눈썹 탔었어요.',
];
function arinTalk() { log(`아린: "${pick(ARIN_TALK)}"`, 'npc'); }
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
  const pill = gated ? GATES[gated[1].star] : QUESTS[questIndex()] && QUESTS[questIndex()][0].includes('소성 돌파단') ? 'pillLow' : null;
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
  if (S.manuals[id] || has('bk_' + id) || !M.cost || S.contrib < M.cost) return;
  if (!give('bk_' + id, 1, true)) return;
  S.contrib -= M.cost;
  log(`장경각에서 ${hlItem(`《${M.name}》 비급`)}을 받았습니다. 무장 탭 행낭에서 [ 익히기 ] 하십시오.`, 'gold');
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
function learnManual(bookId) {
  const mid = ITEMS[bookId].use.learn, M = MANUALS[mid];
  if (S.manuals[mid]) { toast(`이미 익힌 무공입니다: ${M.name}`); return; }
  take(bookId, 1);
  S.manuals[mid] = { star: 1, cxp: 0, txp: 0, gate: false };
  log(`📘 《${M.name}》 비급을 끝까지 읽고 익혔습니다. 무공 탭에서 장착할 수 있습니다.`, 'gold');
  toast(`${M.name} 습득`);
  render();
}
function equipManual(id) {
  if (ui.battle || !S.manuals[id]) return;
  const cat = MANUALS[id].cat, prev = S.active[cat];
  if (prev === id) return;
  if (prev && S.activeTrainingSkillId === prev) S.activeTrainingSkillId = null;
  S.active[cat] = id; clampVitals();
  log(`《${MANUALS[id].name}》${jo(MANUALS[id].name, '을를')} ${CATS[cat].name} 자리에 운용합니다.`, 'good');
  render();
}
function unequipManual(cat) {
  if (ui.battle) return;
  const id = S.active[cat]; if (!id) return;
  if (S.activeTrainingSkillId === id) { S.activeTrainingSkillId = null; log(`《${MANUALS[id].name}》 수련도 함께 멈췄습니다.`, 'muted'); }
  S.active[cat] = null; clampVitals();
  log(`《${MANUALS[id].name}》 운용을 거두었습니다.`, 'muted');
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

/* 조운의 창고: 은자로 사는 소모품·재료 */
const JOUN_SHOP = [
  ['potionHp', 15], ['potionMp', 20], ['jumeokbap', 12], ['rice', 4], ['salt', 4], ['water', 2],
  ['wildGreens', 4], ['herb', 6], ['wood', 3], ['iron', 8], ['rabbitHide', 5], ['boarHide', 9],
];
function buyStore(id) {
  const row = JOUN_SHOP.find(r => r[0] === id); if (!row || S.zone) return;
  if (S.silver < row[1]) { toast('은자가 부족합니다.'); return; }
  if (!give(id, 1, true)) return;
  S.silver -= row[1];
  log(`조운의 창고에서 ${hlItem(ITEMS[id].name)}${jo(ITEMS[id].name, '을를')} ${hlSilver(row[1])}에 샀습니다.`, 'loot');
  render();
}

/* 장비 강화: +1마다 기본 능력치 10% 상승, 최대 +10. 실패해도 등급은 떨어지지 않고 은자만 사라진다. */
const ENH_MAX = 10;
const enhCost = it => Math.round(15 * (it.tier || 1) * Math.pow((it.enh || 0) + 1, 1.6));
const enhChance = it => Math.max(30, 100 - (it.enh || 0) * 8);
function gearStats(it) {
  const mult = 1 + 0.1 * (it.enh || 0), out = {};
  for (const [k, v] of Object.entries(it.stats)) out[k] = PCT_STATS.has(k) ? Math.round(v * mult * 10) / 10 : Math.round(v * mult);
  return out;
}
function enhanceGear(slot) {
  const it = S.equip[slot]; if (!it || S.zone) return;
  if ((it.enh || 0) >= ENH_MAX) { toast('더 이상 벼릴 수 없습니다.'); return; }
  const cost = enhCost(it);
  if (S.silver < cost) { toast('은자가 부족합니다.'); return; }
  S.silver -= cost;
  if (Math.random() * 100 < enhChance(it)) {
    it.enh = (it.enh || 0) + 1;
    log(`🔨 ${hlItem(it.name)} 강화 성공! +${it.enh} (${hlSilver(cost)} 사용)`, 'good');
  } else log(`🔨 ${hlItem(it.name)} 강화 실패… 쇠가 버티지 못했습니다. (${hlSilver(cost)} 사용)`, 'bad');
  clampVitals(); render();
}
const gearName = it => `${it.name}${it.enh ? ` +${it.enh}` : ''}`;

/* ───────── 순차 가이드 ───────── */
const QUESTS = [
  ['비급 익히고 무공 장착하기', () => CAT_ORDER.every(c => S.active[c]), '무장 탭 행낭에서 비급 네 권을 [ 익히기 ] 한 뒤, 무공 탭에서 각각 장착하십시오.'],
  ['조운 대사형에게 오늘의 보급품 받기', () => !!S.flags.supplied, '정청의 조운에게 보급품을 받으십시오.'],
  ['청풍산에서 첫 사냥', () => S.kills > 0, '강호행에서 청풍산으로 가, 🐾 요수(妖獸) 칸을 밟으면 싸움이 시작됩니다.'],
  ['화로에서 소성 돌파단 달이기', () => S.codex.includes('a_low') || bestMugongStar() >= 6, '장문인에게 말을 걸면 귀띔해 줄지도 모릅니다.'],
  ['청풍산 두목 외눈 멧돼지왕 토벌', () => !!S.flags.boss1, '청풍산 가장 깊은 곳, 👹 표시가 두목의 거처입니다.'],
  ['염화채 채주 적염도 토벌', () => !!S.flags.boss2, '화적패의 소굴 가장 깊은 곳에 채주가 있습니다.'],
  ['무공 6성 — 소성(小成) 돌파', () => bestMugongStar() >= 6, '5성을 가득 채운 뒤 소성 돌파단을 복용하십시오.'],
  ['적룡방 방주 갈천 토벌', () => !!S.flags.boss3, '적룡방 가장 깊은 곳에 방주의 거처가 있습니다.'],
  ['무공 12성 — 대성(大成) 돌파', () => bestMugongStar() >= 12, '11성을 채운 뒤 대성 돌파단을 복용하십시오.'],
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
  if (!id) { toast('먼저 무공 탭에서 비급을 장착하십시오.'); return; }
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
  ['martial', '무공', '武功'],
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
  el.innerHTML = S.log.slice(-60).reverse().map(l => `<p class="${l.cls}">${l.text}</p>`).join('');
  el.scrollTop = 0;
}
/* 접기/펼치기 구역: 헤더를 누르면 본문에 .collapsed가 토글된다 (다시 그리지 않아 전환이 부드럽다) */
function foldHead(key, ko, hj, extra = '') {
  const shut = ui.fold[key];
  return `<div class="panel-head fold-head" data-fold="${key}" role="button" tabindex="0" aria-expanded="${!shut}"><h2>${label(ko, hj)} <span class="fold-arrow">${shut ? '▼' : '▲'}</span></h2>${extra}</div>`;
}
const foldBody = (key, html) => `<div class="fold-body ${ui.fold[key] ? 'collapsed' : ''}" data-foldbody="${key}"><div class="fold-inner">${html}</div></div>`;
function toggleFold(key) {
  ui.fold[key] = !ui.fold[key];
  const body = document.querySelector(`[data-foldbody="${key}"]`), h = document.querySelector(`[data-fold="${key}"]`);
  if (body) body.classList.toggle('collapsed', ui.fold[key]);
  if (h) { h.setAttribute('aria-expanded', String(!ui.fold[key])); h.querySelector('.fold-arrow').textContent = ui.fold[key] ? '▼' : '▲'; }
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
    main.innerHTML = ({ martial: viewMartial, yeonmu: viewYeonmu, shrine: viewShrine, forge: viewForge, yard: viewYard, hall: viewHall, field: viewField, bag: viewBag, codex: viewCodex })[ui.tab]();
  }
  renderLog();
  renderModal();
  wireImages();
  centerMap();
  save();
}
/* 큰 지도에서 현재 위치를 스크롤 영역 가운데로 */
function centerMap() {
  const box = $('#mapScroll'), here = box && box.querySelector('.cell.here');
  if (!here) return;
  box.scrollLeft = here.offsetLeft - (box.clientWidth - here.offsetWidth) / 2;
  box.scrollTop = here.offsetTop - (box.clientHeight - here.offsetHeight) / 2;
}

/* 연무장 */
function xpRows(id) {
  const m = S.manuals[id], on = S.activeTrainingSkillId === id;
  if (m.star >= MAX_STAR) return '<div class="daesung">大成</div>';
  const pc = m.cxp / needC(m.star) * 100, pt = m.txp / need(m.star) * 100;
  return `<div class="xp" data-live="${id}">
    <div class="xprow"><span>실전</span><div class="xpbar c"><span style="width:${Math.min(100, pc)}%"></span></div><b>${Math.min(100, Math.floor(pc))}%</b></div>
    <div class="xprow"><span>수련</span><div class="xpbar t"><span class="progress-fill${on ? ' training-active' : ''}" style="width:${Math.min(100, pt)}%"></span></div><b>${Math.min(100, Math.floor(pt))}%</b></div>
  </div>`;
}
function starSig() { return Object.values(S.manuals).map(m => m.star + (m.gate ? 'g' : '')).join(); }
function renderLive() {
  if (ui.tab !== 'yeonmu' && !/^(manual|mart):/.test(ui.modal || '')) return;
  if (ui.tab === 'yeonmu' && S.activeTrainingSkillId && Math.floor(now() / 1000) % 30 === 0 && !ui.modal) { render(); return; }
  for (const el of document.querySelectorAll('[data-live]')) {
    const m = S.manuals[el.dataset.live]; if (!m || m.star >= MAX_STAR) continue;
    const rows = el.querySelectorAll('.xprow');
    [m.cxp / needC(m.star), m.txp / need(m.star)].forEach((r, i) => { const p = r * 100; rows[i].querySelector('.xpbar > span').style.width = Math.min(100, p) + '%'; rows[i].querySelector('b').textContent = Math.min(100, Math.floor(p)) + '%'; });
  }
  const sig = document.querySelector('[data-starsig]');
  if (sig && sig.dataset.starsig !== starSig()) render();
}
function viewYeonmu() {
  const tid = S.activeTrainingSkillId;
  const cards = CAT_ORDER.map(cat => {
    const id = S.active[cat], M = MANUALS[id], m = S.manuals[id], C = CATS[cat];
    if (!id) return `<div class="art empty-art">
      <div class="art-top"><span class="art-cat">${label(C.name, C.hanja)}</span></div>
      <p class="story muted">운용 중인 ${C.name}${jo(C.name, '이가')} 없습니다.</p>
      <div><button class="btn sm" data-tab="martial">무공 탭에서 장착</button></div>
    </div>`;
    const on = tid === id;
    const left = on ? (need(m.star) - m.txp) / trainRate(id) : 0;
    return `<div class="art ${on ? 'training' : ''}" data-manual="${cat}" role="button" tabindex="0">
      <div class="art-top"><span class="art-cat">${label(C.name, C.hanja)}</span><span class="art-star">${m.star}<small>성</small></span></div>
      <div class="art-name">《${M.name}》 ${realmTag(m.star)}${m.gate ? ' <span class="pill warn">관문</span>' : ''}</div>
      ${xpRows(id)}
      <div class="art-foot">
        <small class="muted">${m.star >= MAX_STAR ? '대성' : on ? (m.txp >= need(m.star) ? `수련 가득 참 · 실전 ${Math.max(0, needC(m.star) - Math.floor(m.cxp))}승 더` : `다음 성까지 약 ${fmtDur(left)}`) : `성당 수련 ${fmtDur(trainHours(m.star) * 3600)}`}</small>
        <button class="btn sm ${on ? 'primary' : ''}" data-train="${cat}" ${m.star >= MAX_STAR ? 'disabled' : ''}>${on ? '[ 수련 중지 ]' : '[ 수련하기 ]'}</button>
      </div>
    </div>`;
  }).join('');
  const tm = tid && MANUALS[tid];
  return `<section class="panel" data-starsig="${starSig()}">
    ${head('연무장', '演武場', `<span class="pill ${tid ? '' : 'idle'}">${tid ? '수련 중' : '수련 정지'}</span>`)}
    <p class="story">${tm ? `향이 타들어 갑니다. 《${tm.name}》 한 가지에만 온 정신을 모읍니다. 1~5성은 성마다 8시간, 소성 이후 6~11성은 16시간이 걸립니다.` : '연무장이 고요합니다. 수련할 비급 하나를 골라 [ 수련하기 ]를 누르십시오. 한 번에 한 비급만 수련할 수 있습니다.'}</p>
    <div class="arts">${cards}</div>
  </section>`;
}
function manualModal(cat) {
  return martialModal(S.active[cat]);
}
function martialModal(id) {
  const M = MANUALS[id], m = S.manuals[id], nc = needC(m.star), nt = need(m.star), cat = M.cat;
  const worn = S.active[cat] === id;
  const bonus = Object.entries(manualBonus(id, m.star)).map(([k, v]) => `<div class="kv"><span>${STAT_NAMES[k]}</span><b>+${PCT_STATS.has(k) || k === 'mpRegen' ? Math.round(v * 10) / 10 : Math.round(v)}${PCT_STATS.has(k) ? '%' : ''}</b></div>`).join('');
  const pc = Math.min(100, Math.floor(m.cxp / nc * 100)), pt = Math.min(100, Math.floor(m.txp / nt * 100));
  const moves = M.moves ? `<h4>초식</h4><ol class="moves">${M.moves.map((mv, i) => { const open = i < unlockedMoves(m.star); return `<li class="${open ? 'open' : 'lock'}"><b>${mv}</b><small>${['제1초식 · 시동', '제2초식 · 연계', '제3초식 · 결착'][i]}${open ? '' : ` — ${i === 1 ? '4성' : '8성'} 돌파 시 해금`}</small></li>`; }).join('')}</ol>
    <p class="${M.weapon === weaponType() ? 'muted' : 'warn'}">필요 병기: ${WEAPON_TYPES[M.weapon]}${M.weapon === weaponType() ? '' : ' (지금 병기로는 초식이 나가지 않습니다)'}</p>` : '';
  const pill = GATES[m.star];
  let gateInfo;
  if (m.star < MAX_STAR) {
    const over = (v, n) => Math.max(0, Math.floor(v - n));
    gateInfo = `<h4>${m.star}성 → ${m.star + 1}성</h4>
      <div class="kv"><span>실전 (전투 승리)</span><b>${Math.floor(m.cxp)} / ${nc}승</b></div>
      <div class="kv"><span>수련 (기본 효율 성당 ${fmtDur(trainHours(m.star) * 3600)})</span><b>${Math.floor(m.txp)} / ${nt}</b></div>
      <div class="kv"><span>이월 예정</span><b>실전 +${over(m.cxp, nc)} · 수련 +${over(m.txp, nt)}</b></div>
      ${pill ? `<p class="${m.gate ? 'warn' : 'muted'}">${GATE_NAME[m.star]} — ${ITEMS[pill].name} 필요${m.gate && !has(pill) ? ' (가지고 있지 않습니다)' : ''}</p>` : ''}
      ${m.gate && has(pill) ? `<div><button class="btn primary" data-pill="${pill}">${ITEMS[pill].icon} ${ITEMS[pill].name} 복용</button></div>` : ''}`;
  } else gateInfo = '<p class="daesung">12성 대성(大成)</p>';
  return `<div class="sheet">
    <div class="sheet-head"><div><small class="muted">${CATS[cat].name} ${CATS[cat].hanja}</small><h2>《${M.name}》 <small class="grade-tag">[${M.grade} ${CATS[cat].name}]</small></h2>${realmTag(m.star)}</div><div class="art-star">${m.star}<small>/12성</small></div></div>
    <p class="num muted">현재 ${m.star}성 / 실전 ${pc}% / 수련 ${pt}%</p>
    ${xpRows(id)}
    <p class="story">${M.desc}</p>
    <h4>보너스 효과 (장착 시)</h4>${bonus}
    <p class="${m.star >= MAX_STAR ? 'gold' : 'muted'}">${m.star >= MAX_STAR ? '🌟 ' : '대성 시 개방 — '}${DAESUNG_PASSIVE[cat].text}</p>
    ${m.star < 6 ? '<p class="muted">소성(6성)에 이르면 장착 능력치가 30% 오릅니다.</p>' : ''}
    ${moves}${gateInfo}
    <div class="btns">${worn ? `<button class="btn danger" data-unequipm="${cat}">[ 장착 해제 ]</button>` : `<button class="btn primary" data-equipm="${id}">[ 장착하기 ]</button>`}<button class="btn ghost" data-act="closemodal">닫기</button></div>
  </div>`;
}

/* 무공 탭 */
function viewMartial() {
  const slots = CAT_ORDER.map(cat => {
    const id = S.active[cat], C = CATS[cat];
    if (!id) return `<div class="mslot empty"><div class="mslot-cat">${label(C.name, C.hanja)}</div><small class="muted">${C.desc}</small><p class="muted">비어 있음</p></div>`;
    const M = MANUALS[id], m = S.manuals[id];
    return `<div class="mslot" data-mart="${id}" role="button" tabindex="0">
      <div class="mslot-cat">${label(C.name, C.hanja)}</div>
      <b class="mslot-name">《${M.name}》</b>${realmTag(m.star)}
      <span class="art-star">${m.star}<small>성</small></span>
      <button class="btn ghost sm" data-unequipm="${cat}">장착 해제</button>
    </div>`;
  }).join('');
  const learned = Object.keys(S.manuals).sort((a, b) => CAT_ORDER.indexOf(MANUALS[a].cat) - CAT_ORDER.indexOf(MANUALS[b].cat));
  const books = Object.keys(S.inv).filter(k => ITEMS[k].kind === '비급');
  const cards = learned.map(id => {
    const M = MANUALS[id], m = S.manuals[id], worn = S.active[M.cat] === id;
    return `<button class="mcard ${worn ? 'worn' : ''}" data-mart="${id}"><small>${CATS[M.cat].name} · ${M.grade}</small><b>《${M.name}》</b>${realmTag(m.star)}<span class="art-star">${m.star}<small>성</small></span>${worn ? '<span class="pill">운용 중</span>' : ''}</button>`;
  }).join('');
  return `<section class="panel">
    ${head('무공', '武功')}
    <div class="mslots">${slots}</div>
  </section>
  <section class="panel">
    ${head('익힌 무공', '習得', `<span class="num muted">${learned.length}종</span>`)}
    ${learned.length ? `<div class="mcards">${cards}</div>` : `<p class="story">아직 익힌 무공이 없습니다. ${books.length ? `행낭에 비급 ${books.length}권이 있습니다. 무장 탭 행낭에서 [ 익히기 ] 하십시오.` : ''}</p>`}
    ${books.length ? `<div class="chips">${books.map(k => `<button class="chip" data-use="${k}">📘 ${ITEMS[k].name} 익히기</button>`).join('')}</div>` : ''}
  </section>`;
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
  const ctype = CRAFT_TYPE[ui.craft];
  const mats = Object.keys(S.inv).filter(id => ITEMS[id].craftType === ctype).sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name));
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
        <h4>${C.name} 재료</h4>
        <div class="chips">${mats.map(id => { const left = count(id) - (ui.pot[id] || 0); return `<button class="chip" data-add="${id}" ${left <= 0 ? 'disabled' : ''}>${ITEMS[id].icon} ${ITEMS[id].name} <b>${left}</b></button>`; }).join('')}</div>
      </div>
    </div>
  </section>`;
}

/* 뒷마당 */
function viewYard() {
  const foods = Object.keys(S.inv).filter(id => ITEMS[id].use && ITEMS[id].kind !== '비급');
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
      <button class="btn" data-act="talk">💬 이야기 나누기</button>
    </div>
  </section>`;
}

/* 정청 */
function viewHall() {
  const qi = questIndex(), q = QUESTS[qi];
  const shopManuals = Object.entries(MANUALS).filter(([, M]) => M.cost);
  const ownsBook = id => !!S.manuals[id] || has('bk_' + id);
  const badges = SHOP_GEAR.filter(g => g.cost);
  const supplied = S.supplyDay === today();
  const hq = `
    <div class="npc-head">${portrait('master', '松', '노벽송')}<div><h3>${label('노벽송', '장문인')}</h3><p class="story">의자에 기대 반쯤 졸고 있습니다. 가끔 실눈을 뜨고 제자를 훑어봅니다.</p></div><button class="btn ghost sm" data-act="masterhint">말 걸기</button></div>
    <div class="quest">
      ${q ? `<small class="muted">지금 할 일 · ${qi + 1}/${QUESTS.length}</small><b>${q[0]}</b><p class="story">${q[2]}</p>` : '<b>제1장 완결</b><p class="story">낙양으로 가는 길이 열려 있습니다.</p>'}
      ${canHasan() ? '<div><button class="btn primary" data-act="hasan">하산 허가를 청한다</button></div>' : ''}
    </div>
    <div class="npc-head">${portrait('joun', '雲', '조운')}<div><h3>${label('조운', '대사형')}</h3><p class="story">장작을 패다 말고 이마의 땀을 훔칩니다. "왔냐. 필요한 건 챙겨놨다."</p></div>
      <button class="btn ${supplied ? 'ghost' : 'primary'}" data-act="supply" ${supplied ? 'disabled' : ''}>${supplied ? '오늘은 받았음' : '[ 오늘의 보급품 받기 ]'}</button></div>
    <div class="store"><h4>조운의 창고 <small>은자로 삽니다</small></h4><div class="chips">${JOUN_SHOP.map(([id, pr]) => `<button class="chip" data-store="${id}" ${S.silver < pr ? 'disabled' : ''}>${ITEMS[id].icon} ${ITEMS[id].name} <b>${pr}냥</b></button>`).join('')}</div></div>`;
  const missions = `
    <div class="btns"><button class="btn ghost sm" data-act="reroll">새 임무 (은자 5냥)</button></div>
    <ul class="missions">${S.missions.map((m, i) => {
      const tname = m.type === 'kill' ? ENEMIES[m.target].name : ITEMS[m.target].name;
      const prog = m.type === 'kill' ? m.prog : Math.min(count(m.target), m.n);
      return `<li><div><b>${m.type === 'kill' ? '토벌' : '납품'}</b> ${tname} ${m.n}${m.type === 'kill' ? '마리' : '개'} <small class="muted">${ZONES[m.zone].name}</small></div><div class="mprog"><span style="width:${prog / m.n * 100}%"></span></div><span class="num">${prog}/${m.n}</span><span class="reward">공헌 ${m.contrib}</span><button class="btn sm" data-mission="${i}" ${missionReady(m) ? '' : 'disabled'}>완료</button></li>`;
    }).join('')}</ul>`;
  const library = `
    <div class="shop">${shopManuals.map(([id, M]) => { const own = ownsBook(id); return `<div class="shop-item"><b>${M.name}</b><small>${CATS[M.cat].name}${M.weapon ? ' · ' + WEAPON_SHORT[M.weapon] : ''}</small><button class="btn sm" data-buymanual="${id}" ${own || S.contrib < M.cost ? 'disabled' : ''}>${own ? '보유' : `공헌 ${M.cost}`}</button></div>`; }).join('')}
    ${badges.map(g => { const own = ownsShop(g.id); return `<div class="shop-item"><b class="r${g.rarity}">${g.name}</b><small>신분패 · 수련 효율 +${g.stats.train}%</small><button class="btn sm" data-buybadge="${g.id}" ${own || S.contrib < g.cost ? 'disabled' : ''}>${own ? '보유' : `공헌 ${g.cost}`}</button></div>`; }).join('')}</div>`;
  return `<section class="panel npc fold">${foldHead('hq', '정청 본부', '正廳')}${foldBody('hq', hq)}</section>
  <section class="panel fold">${foldHead('missions', '문파 임무', '門派任務', `<span class="num muted">${S.missions.filter(missionReady).length}건 완료 가능</span>`)}${foldBody('missions', missions)}</section>
  <section class="panel fold">${foldHead('library', '장경각', '藏經閣', `<span class="num gold">공헌도 ${fmt(S.contrib)}</span>`)}${foldBody('library', library)}</section>`;
}

/* 강호행 */
function viewField() {
  if (ui.battle) return viewBattle();
  if (!S.zone) {
    return `<section class="panel">
      ${head('강호행', '江湖行')}
      <p class="story">산문을 나서면 강호입니다. 길을 걷는 데는 힘이 들지 않지만, 싸우고 캐고 여는 데는 기력이 듭니다. 기력은 저절로 돌아오지 않습니다.</p>
      <div class="zones">${ZONE_ORDER.filter(zoneUnlocked).map(zid => {
        const Z = ZONES[zid], open = zoneUnlocked(zid);
        return `<article class="zone ${open ? '' : 'locked'} t${Z.tier}">
          <h3>${label(Z.name, Z.hanja)}${S.flags[ENEMIES[Z.boss].boss] ? ' <span class="pill">평정</span>' : ''}</h3>
          <p class="story">${open ? Z.desc : '짙은 안개가 길을 가리고 있습니다.'}</p>
          ${open ? `<div><button class="btn primary" data-zone="${zid}">${Z.name}${jo(Z.name, '으로')}</button></div>` : `<p class="muted">${Z.unlock.text}</p>`}
        </article>`;
      }).join('')}</div>
    </section>`;
  }
  const { id: zid, x, y } = S.zone, Z = ZONES[zid], seen = S.seen[zid] || {}, cols = MAP_W;
  let grid = '';
  for (let yy = 0; yy < MAP_H; yy++) for (let xx = 0; xx < cols; xx++) {
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
  if (info.type === 'beast') {
    S.zone.foes = S.zone.foes || {};
    const eid = S.zone.foes[`${x},${y}`] || (S.zone.foes[`${x},${y}`] = pickBeast());
    const E = ENEMIES[eid], [, stext, scls] = sense(eid);
    action = `<div class="standoff"><p class="eyebrow-s">대치(對峙)</p><p class="story"><b>${E.name}</b>${jo(E.name, '이가')} 낮게 몸을 웅크리고 노려봅니다.</p><p class="story sense ${scls}">${stext}</p>
      <div><button class="btn primary" data-act="interact">⚔️ 결투 시작 <small>기력 ${STAMINA_COST.battle}</small></button></div></div>`;
  }
  else if (info.type === 'boss') {
    const E = ENEMIES[info.enemy], [, stext, scls] = sense(info.enemy);
    action = `<div class="standoff boss"><p class="eyebrow-s">대치(對峙) · 두목</p><p class="story"><b>${E.name}</b>의 거처입니다.</p><p class="story sense ${scls}">${stext}</p><div><button class="btn danger" data-act="interact">⚔️ 결투 시작 <small>기력 ${cost}</small></button></div></div>`;
  } else if (info.type === 'herb' || info.type === 'mine') {
    action = `<p class="story">${info.type === 'herb' ? '약초가 무성합니다.' : '반짝이는 광맥이 드러나 있습니다.'}</p><div><button class="btn primary" data-act="interact">${info.type === 'herb' ? '🌿 채집' : '⛏️ 채광'} <small>기력 ${cost}</small></button></div>`;
  } else if (info.type === 'chest') action = `<p class="story">묵직한 금고가 풀숲에 반쯤 묻혀 있습니다.</p><div><button class="btn primary" data-act="interact">📦 [ 금고 열기 ] <small>기력 ${cost}</small></button></div>`;
  else if (info.type === 'gimmick') action = `<p class="story">${Z.gimmick.name}${jo(Z.gimmick.name, '이가')} 길가에 버티고 있습니다. 무언가 숨겨져 있을 것 같습니다.</p><div><button class="btn primary" data-act="interact">⚙️ 풀어본다 <small>기력 ${cost}</small></button></div>`;
  else if (info.type === 'gate') action = '<p class="story">산문으로 돌아가는 길목입니다.</p>';
  else action = '<p class="story muted">바람 소리만 들립니다. 이곳의 일은 끝났습니다. 청풍문으로 돌아갔다가 다시 오면 산의 기척이 새로 바뀝니다.</p>';
  return `<section class="panel field">
    ${head(Z.name, Z.hanja, '<button class="btn ghost sm" data-act="leave">청풍문으로 귀환</button>')}
    <div class="field-grid">
      <div class="map-scroll" id="mapScroll"><div class="map" style="grid-template-columns:repeat(${cols},var(--cell))">${grid}</div></div>
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
  const M = MANUALS[S.active.mugong], mm = M && S.manuals[S.active.mugong];
  const items = ['potionHp', 'potionMp', 'clearPill'].filter(id => has(id));
  queueMicrotask(() => { b.shown = b.lines.length; });
  return `<section class="panel battle">
    <div class="versus">
      <div class="fighter"><h3>${esc(S.name)}</h3><small>${M ? `《${M.name}》 ${mm.star}성` : '무공 미장착'}</small>${bar('hp', S.hp, st.maxHp, '활력')}${bar('mp', S.mp, st.maxMp, '내력')}</div>
      <div class="vs">對</div>
      <div class="fighter foe ${e.boss ? 'boss' : ''}"><h3>${e.name}</h3><small>${e.boss ? '두목' : '적'}</small>${bar('hp foe', e.hpNow, e.hp, '기세', true)}</div>
    </div>
    <div class="blog" id="blog">${b.lines.map((l, i) => `<p class="${l.cls}${i >= (b.shown || 0) ? ' fresh' : ''}">${l.text}</p>`).join('')}</div>
    <div class="bctl">
      ${b.over ? `<button class="btn primary" data-act="closebattle">${b.win ? '전리품을 챙긴다' : b.fled ? '숨을 고른다' : '정신을 잃는다…'}</button>` : `
        <div class="phase"><span class="phase-bar" style="animation-duration:${BATTLE_MS}ms"></span><small>${b.round + 1}합 · ${Math.round(BATTLE_MS / 1000)}초마다 공방이 오갑니다</small></div>
        ${items.length ? `<div class="chips">${items.map(id => `<button class="chip" data-bitem="${id}">${ITEMS[id].icon} ${ITEMS[id].name} <b>${count(id)}</b></button>`).join('')}</div>` : ''}
        <small class="muted">공격을 맞으면 반격 ${st.counter}% 확률로 되받아칩니다.</small>`}
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
function statLine(it) { return Object.entries(gearStats(it)).map(([k, v]) => `${STAT_NAMES[k]} +${v}${PCT_STATS.has(k) ? '%' : ''}`).join(' · '); }
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
    return `<button class="dslot ${ui.slotSel === s ? 'sel' : ''} ${it ? 'r' + it.rarity : 'empty'}" data-slot="${s}" style="grid-area:${s}"><small>${SLOTS[s].name}</small>${it ? `<b>${gearName(it)}</b>` : ''}</button>`;
  };
  const acc = s => {
    const it = S.equip[s];
    return `<button class="dslot ${ui.slotSel === s ? 'sel' : ''} ${it ? 'r' + it.rarity : 'empty'}" data-slot="${s}"><small>${SLOTS[s].name}</small>${it ? `<b>${gearName(it)}</b>` : ''}</button>`;
  };
  const sel = ui.slotSel && S.equip[ui.slotSel];
  const statList = ['atk', 'def', 'maxHp', 'maxMp', 'spd', 'eva', 'crit', 'critRes', 'counter', 'mpRegen', 'mpCost', 'train', 'craft', 'maxSta'].map(k => `<div><span>${STAT_NAMES[k]}</span><b>${st[k]}${PCT_STATS.has(k) ? '%' : ''}</b></div>`).join('');
  const kinds = ['all', '비급', '재료', '영약', '영단', '음식', '부산물', '증표'];
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
        ${sel ? `<div class="gear r${sel.rarity}"><div class="gtop"><span class="grade r${sel.rarity}">${RARITY[sel.rarity].name}</span><b>${gearName(sel)}</b></div><small>${statLine(sel)}</small>${sel.unique ? `<small class="uniq">✦ ${sel.unique.text}</small>` : ''}
          <div class="btns"><button class="btn sm" data-enhance="${sel.slot}" ${(sel.enh || 0) >= ENH_MAX || S.zone || S.silver < enhCost(sel) ? 'disabled' : ''}>🔨 ${(sel.enh || 0) >= ENH_MAX ? '강화 완료' : `강화 +${(sel.enh || 0) + 1} · ${hlSilver(enhCost(sel))} · ${enhChance(sel)}%`}</button><button class="btn ghost sm" data-unequip="${sel.slot}">해제</button></div></div>` : ''}
        <div class="statsheet">${statList}</div>
      </div>
    </div>
  </section>
  <section class="panel">
    ${head('행낭', '行囊', `<span class="num muted">${bagUsed()} / ${bagCap()}칸</span>`)}
    ${S.gear.length ? `<div class="gears">${S.gear.map(it => `<div class="gear r${it.rarity}"><div class="gtop"><span class="grade r${it.rarity}">${RARITY[it.rarity].name}</span><b>${it.name}</b><small class="muted">${SLOTS[it.slot].name}</small></div><small>${statLine(it)}</small>${it.unique ? `<small class="uniq">✦ ${it.unique.text}</small>` : ''}<div class="btns"><button class="btn sm" data-equip="${it.uid}">착용</button><button class="btn ghost sm" data-discard="${it.uid}">버리기</button></div></div>`).join('')}</div>` : ''}
    <div class="chips">${kinds.map(k => `<button class="chip ${ui.bagFilter === k ? 'on' : ''}" data-filter="${k}">${k === 'all' ? '전체' : k}</button>`).join('')}</div>
    <div class="items">${items.map(id => { const I = ITEMS[id]; return `<div class="item"><span class="icon">${I.icon}</span><div><b>${I.name}</b> <span class="num">×${count(id)}</span><small>${I.desc}</small></div>${I.use ? `<button class="btn sm" data-use="${id}">${I.kind === '비급' ? '익히기' : '사용'}</button>` : '<span></span>'}</div>`; }).join('')}</div>
  </section>`;
}

/* 도감 */
function viewCodex() {
  const cols = Object.keys(CRAFTS).map(c => {
    const all = RECIPES.filter(r => r.craft === c);
    const known = all.filter(r => S.codex.includes(r.id)).length;
    const clues = all.filter(isClue).length;
    const tiles = all.map(r => S.codex.includes(r.id)
      ? `<button class="ctile known" data-recipe="${r.id}"><span>${recipeIcon(r)}</span><b>${recipeName(r)}</b></button>`
      : isClue(r)
        ? `<button class="ctile clue" data-recipe="${r.id}"><span>${recipeIcon(r)}</span><b>${recipeName(r)}</b><small>${Object.keys(r.in).map(m => S.knownMats[m] ? ITEMS[m].icon : '？').join(' ')}</small></button>`
        : `<button class="ctile locked" data-recipe="${r.id}" aria-label="미발견"><span>？</span></button>`).join('');
    return `<article class="codex-col"><h3>${label(CRAFTS[c].name, CRAFTS[c].hanja)} <span class="num muted">${known}/${all.length}${clues ? ` · 단서 ${clues}` : ''}</span></h3><div class="ctiles">${tiles}</div></article>`;
  }).join('');
  return `<section class="panel">${head('도감', '圖鑑')}<div class="codex">${cols}</div></section>`;
}
function openRecipe(rid) {
  const r = RECIPES.find(x => x.id === rid);
  if (!S.codex.includes(rid) && !isClue(r)) { toast('아직 발견하지 못한 비전입니다.'); return; }
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
  const full = S.codex.includes(r.id);
  const knownIn = Object.entries(r.in).filter(([id]) => full || (S.knownMats || {})[id]);
  const hidden = Object.keys(r.in).length - knownIn.length;
  const mats = knownIn.map(([id, n]) => `<li><span>${ITEMS[id].icon} ${ITEMS[id].name} × ${n}</span><b class="${count(id) >= n ? '' : 'warn'}">보유 ${count(id)}</b></li>`).join('')
    + (hidden ? `<li class="hidden-mat"><span>？ 아직 모르는 재료 ${hidden}가지</span><b class="muted">강호의 소문을 모아 보십시오</b></li>` : '');
  return `<div class="sheet">
    <div class="sheet-head"><div><small class="muted">${C.name} ${C.hanja}</small><h2>${recipeIcon(r)} ${recipeName(r)}</h2></div></div>
    ${body}
    <h4>${full ? '필요 재료' : '재료 단서'}</h4><ul class="mats-list">${mats}</ul>
    <div class="btns"><button class="btn primary" data-fill="${r.id}" ${S.zone ? 'disabled' : ''}>[ 화로로 가기 ]</button><button class="btn ghost" data-act="closemodal">닫기</button></div>
    ${S.zone ? '<small class="muted">화로는 청풍문에 돌아가야 쓸 수 있습니다.</small>' : ''}
  </div>`;
}
function fillPot(rid) {
  if (S.zone) return;
  const r = RECIPES.find(x => x.id === rid);
  const full = S.codex.includes(r.id);
  ui.craft = r.craft; ui.pot = Object.fromEntries(Object.entries(r.in).filter(([id]) => full || (S.knownMats || {})[id])); ui.tab = 'forge'; ui.craftResult = null; ui.modal = null; render();
}

function renderModal() {
  const m = $('#modal');
  if (!ui.modal) { if (!m.dataset.intro) m.hidden = true; return; }
  m.hidden = false;
  if (ui.modal.startsWith('manual:')) m.innerHTML = S.active[ui.modal.slice(7)] ? manualModal(ui.modal.slice(7)) : (ui.modal = null, '');
  if (ui.modal && ui.modal.startsWith('mart:')) m.innerHTML = martialModal(ui.modal.slice(5));
  if (!ui.modal) { m.hidden = true; return; }
  if (ui.modal.startsWith('recipe:')) m.innerHTML = recipeModal(ui.modal.slice(7));
  if (ui.modal === 'ending') m.innerHTML = `<div class="sheet ending"><p class="eyebrow">제1장 완결</p><h2>${label('청풍문 편', '淸風門')}</h2><p class="story">시골 하급 문파의 밑바닥 제자였던 ${esc(S.name)}. 청풍산의 들개를 쫓던 손이 이제 적룡방 방주를 꺾었습니다.</p><p class="story">장문인 노벽송이 건넨 누런 종이 한 장, <b>낙양성 하산령</b>. 산문 밖으로 난 길은 낙양으로 이어집니다.</p><p class="muted">제2장 [낙양성 편]은 준비 중입니다.</p><div><button class="btn primary" data-act="closemodal">산문을 바라본다</button></div></div>`;
  wireImages();
  if (ui.modal === 'reset') m.innerHTML = `<div class="sheet"><h2>처음부터 다시</h2><p>${RESET_MSG}</p><div class="btns"><button class="btn danger" data-act="doreset">새로 시작</button><button class="btn ghost" data-act="closemodal">그만두기</button></div></div>`;
}

/* 견문록 높이를 왼쪽 본문 패널과 1:1로 맞춘다 (넓은 화면에서만) */
function syncSide() {
  const main = $('#main'), side = $('.side');
  const apply = () => {
    if (innerWidth <= 960) { side.style.height = ''; return; }
    side.style.height = Math.max(320, main.offsetHeight) + 'px';
    const el = $('#log'); if (el) el.scrollTop = 0;
  };
  if (window.ResizeObserver) new ResizeObserver(apply).observe(main);
  addEventListener('resize', apply);
  apply();
}

/* 처음부터 다시: 브라우저 확인창을 먼저 쓰고, 확인창이 막힌 환경(즉시 false 반환)에서는 화면 안 확인창으로 대신한다.
   이전에는 저장을 지운 뒤 새로고침 직전 beforeunload가 현재 상태를 다시 저장해 초기화가 되지 않았다. */
const RESET_MSG = '모든 강호의 기록을 지우고 처음부터 다시 시작하시겠습니까?';
function askReset() {
  const t0 = performance.now();
  let ok = false;
  try { ok = window.confirm(RESET_MSG); } catch (e) { ok = false; }
  if (ok) return doReset();
  if (performance.now() - t0 < 30) { ui.modal = 'reset'; renderModal(); }
}
function doReset() {
  S = null;
  window.removeEventListener('beforeunload', save);
  try { localStorage.clear(); } catch (e) { /* 저장소 접근 불가 */ }
  location.reload();
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
      log(`${name}, 청풍문의 제자가 되었습니다. ${hlItem(`《${MANUALS[chosen].name}》 비급`)}과 ${hlItem('토납법·포철삭·철포삼 비급')}을 행낭에 받았습니다.`, 'gold');
      log('노벽송: "비급은 읽기만 해선 소용없다. 익히고, 몸에 걸고, 수련해라."', 'npc');
      log(`조운: "${WEAPON_TYPES[wt]}${jo(WEAPON_TYPES[wt], '이가')} 필요하겠지. 이거라도 쥐고 다녀라." — ${S.equip.weapon.name} 착용`, 'npc');
      log('아린: "새 사형이다! 비급부터 익혀요. 무장 탭 행낭에 있어요!"', 'npc');
      ui.tab = 'hall';
      render();
    }
  };
}

/* ───────── 이벤트 ───────── */
function onClick(e) {
  const t = e.target.closest('button, [data-tab], [data-manual], [data-mart], [data-fold]');
  if (!t || t.disabled) return;
  if (t.dataset.act === 'reset') return askReset();
  if (t.dataset.act === 'doreset') return doReset();
  if (!S) return;
  const d = t.dataset;
  if (d.tab) { if (ui.battle && d.tab !== 'field') return; ui.tab = d.tab; ui.craftResult = null; render(); return; }
  if (d.move) { const [dx, dy] = d.move.split(',').map(Number); return move(dx, dy); }
  if (d.zone) return enterZone(d.zone);
  if (d.fold) return toggleFold(d.fold);
  if (d.train) return toggleTraining(d.train);
  if (d.store) return buyStore(d.store);
  if (d.enhance) return enhanceGear(d.enhance);
  if (d.equipm) { equipManual(d.equipm); if (ui.modal) { ui.modal = 'mart:' + d.equipm; renderModal(); } return; }
  if (d.unequipm) { const id = S.active[d.unequipm]; unequipManual(d.unequipm); if (ui.modal && id) { ui.modal = 'mart:' + id; renderModal(); } return; }
  if (d.mart) { ui.modal = 'mart:' + d.mart; return renderModal(); }
  if (d.manual) { ui.modal = 'manual:' + d.manual; return renderModal(); }
  if (d.pill) return useItem(d.pill, false);
  if (d.use) return useItem(d.use, false);
  if (d.bitem) return battleItem(d.bitem);
  if (d.offer) return offer(d.offer, false);
  if (d.offerall) return offer(d.offerall, true);
  if (d.craft) { ui.craft = d.craft; ui.pot = {}; ui.craftResult = null; return render(); }
  if (d.add) { if (ITEMS[d.add].craftType !== CRAFT_TYPE[ui.craft]) return; if (potTotal() >= POT_MAX) return toast(`화로에는 ${POT_MAX}개까지만 들어갑니다.`); if ((ui.pot[d.add] || 0) >= count(d.add)) return; ui.pot[d.add] = (ui.pot[d.add] || 0) + 1; ui.craftResult = null; return render(); }
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
    rest, snack: arinSnack, talk: arinTalk, masterhint: masterHint, supply: jounSupply, reroll: rerollMissions,
    hasan: doHasan, closemodal: () => { ui.modal = null; render(); },
    closebattle: closeBattle,
    reset: askReset,
    doreset: doReset,
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
  document.addEventListener('keydown', e => { const c = e.target.closest && e.target.closest('[data-manual], [data-mart], [data-fold]'); if (c && e.target === c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); if (c.dataset.fold) return toggleFold(c.dataset.fold); ui.modal = c.dataset.mart ? 'mart:' + c.dataset.mart : 'manual:' + c.dataset.manual; renderModal(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.modal && ui.modal !== 'ending') { ui.modal = null; render(); } });
  S = load();
  if (S && (S.v || 0) < 3) {
    S.activeTrainingSkillId = null; delete S.training; delete S.gatherCd; delete S.opened; delete S.cleared;
    S.v = 3;
  }
  if (S && (S.v || 0) < 5) S.v = 5;
  if (S && S.v < 6) {
    // 수련 경험치 눈금이 '초'로 바뀌었으므로 진행 비율을 유지한 채 환산한다
    const oldNeed = st => Math.round(40 * Math.pow(1.28, st - 1));
    for (const m of Object.values(S.manuals)) if (m.star < MAX_STAR) m.txp = m.txp / oldNeed(m.star) * need(m.star);
    S.v = 6;
  }
  if (S && S.v < 7) {
    // 경계가 3개(3·7·11성)에서 2개(5·11성)로, 수련·실전 눈금도 바뀌었으므로 진행 비율을 유지해 환산한다
    const oldT = st => Math.round((st <= 3 ? 4 / 3 : st <= 7 ? 2 : 6) * 3600), oldC = st => st <= 3 ? 10 : st <= 7 ? 20 : 40;
    for (const m of Object.values(S.manuals)) {
      if (m.star >= MAX_STAR) continue;
      m.txp = m.txp / oldT(m.star) * need(m.star); m.cxp = m.cxp / oldC(m.star) * needC(m.star);
      m.gate = false;
    }
    for (const id of Object.keys(S.manuals)) tryStar(id);
    if (S.zone) S.zone = null;
    S.v = 7;
  }
  if (S && S.zone && (!S.zone.layout || !S.zone.start || S.zone.layout.length !== MAP_H)) S.zone = null;
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
