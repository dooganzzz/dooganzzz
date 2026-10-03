/* [시스템] 능력치 계산: 장비·비급·무신상·버프를 합산한다 (DOM 조작 금지) */

/* ───────── 능력치 ───────── */
/* 파(正 · 魔 · 邪): 장착한 공격 무공의 파 (없으면 정). schoolEdge: 내 파가 상대 파를 이기면 1, 지면 -1, 상대에게 파가 없으면(요수) 0 */
const schoolOf = mid => (MANUALS[mid] && MANUALS[mid].school) || 'jeong';
/* 서장 자동 지급 비급: 심법 · 경공 · 기공을 삼류 정파 비급 가운데 하나씩 무작위로 (10월 3일 유저) */
function starterGift(cat) {
  const ids = Object.keys(MANUALS).filter(id => MANUALS[id].cat === cat && MANUALS[id].grade === '삼류' && schoolOf(id) === 'jeong' && ITEMS['bk_' + id]);
  return ids.length ? 'bk_' + ids[Math.floor(Math.random() * ids.length)] : null;
}
const mySchool = () => S.active.mugong ? schoolOf(S.active.mugong) : 'jeong';
/* 성향: 익힌 비급 가운데 계열(무공 · 심법 · 경공 · 기공)마다 대표 한 권 — 가장 높은 등급, 같으면 가장 높은 성급 (10월 3일 유저: 장착을 바꿔 끼워도 흔들리지 않게).
   등급 · 성급까지 같은 후보가 여럿이면 유저가 고르고(S.schoolPick[계열] = { id, at }), 고른 뒤 SCHOOL_PICK_LOCK 동안은 다시 못 바꾼다. 고르지 않았으면 먼저 익힌 것 */
const SCHOOL_PICK_LOCK = 24 * 3600 * 1000;
const repScore = id => GRADES[MANUALS[id].grade].mult * 1000 + ((S.manuals[id] && S.manuals[id].star) || 0);
function schoolCands(cat) {
  const ids = Object.keys(S.manuals || {}).filter(id => MANUALS[id] && MANUALS[id].cat === cat);
  const top = Math.max(-1, ...ids.map(repScore));
  return ids.filter(id => repScore(id) === top);
}
function schoolRep(cat) {
  const c = schoolCands(cat), p = S.schoolPick && S.schoolPick[cat];
  return p && c.includes(p.id) ? p.id : c[0];
}
const schoolReps = () => CAT_ORDER.map(schoolRep).filter(Boolean);
/* 고른 지 하루가 안 지났으면 남은 시간(ms), 바꿀 수 있으면 0. 고른 비급이 더는 후보가 아니면(더 높은 비급이 생김) 바로 바꿀 수 있다 */
function schoolPickWait(cat) {
  const p = S.schoolPick && S.schoolPick[cat];
  return p && schoolCands(cat).includes(p.id) ? Math.max(0, p.at + SCHOOL_PICK_LOCK - now()) : 0;
}
function setSchoolPick(cat, id) {
  if (!schoolCands(cat).includes(id) || schoolRep(cat) === id || schoolPickWait(cat) > 0) return false;
  S.schoolPick = { ...(S.schoolPick || {}), [cat]: { id, at: now() } };
  return true;
}
const schoolCount = () => schoolReps().reduce((n, id) => (n[schoolOf(id)]++, n), { jeong: 0, ma: 0, sa: 0 });
function schoolEdge(mine, theirs) { if (!theirs || !SCHOOLS[theirs]) return 0; return SCHOOLS[mine].beats === theirs ? 1 : SCHOOLS[theirs].beats === mine ? -1 : 0; }
function calcStats() {
  const s = { atk: 10, def: 3, maxHp: 100, maxMp: 40, spd: 10, eva: 3, crit: 7.4, critRes: 0, counter: 10, mpRegen: 1, bag: 150, mpCost: 0, craft: 0, train: 0, maxSta: 100, combo: 0, lifesteal: 0, atkPct: 0, hpPct: 0, mpPct: 0, mpSave: 0, evaFlat: 0, elem: 0, staSave: 0, breathe: 0, qiPct: 0, elemRes: 0, bleed: 0, pierce: 0, acc: 0, qiDmg: 0, healPct: 0 };
  // 단련 스탯: 기준값(ATTR_BASE)에서 한 점마다 더하거나 뺀다. 짝 자질의 계수(scale)는 단련 한 점당 증가량에 곱한다 (기준값 몫은 그대로라 평균 제자는 변함없음)
  const aptPair = Object.fromEntries(Object.entries(APTS).map(([k, P]) => [P.pair, k]));
  for (const [a, D] of Object.entries(ATTRS)) {
    const v0 = attrOf(a), P = APTS[aptPair[a]], ad = aptOf(aptPair[a]) - APT_MID;
    for (const [k, v] of Object.entries(D.per)) s[k] = (s[k] || 0) + v * (v0 * (1 + ((P && P.scale[k]) || 0) * ad) - ATTR_BASE);
    for (const [k, v] of Object.entries(D.abs || {})) s[k] += v * v0;       // 민첩: 수치 그대로
  }
  // 자질: 가운데 값(APT_MID)에서 한 점 벗어날 때마다
  for (const [a, P] of Object.entries(APTS)) { const d = aptOf(a) - APT_MID; for (const [k, v] of Object.entries(P.per)) s[k] = (s[k] || 0) + v * d; }
  for (const [k, v] of Object.entries(codexBonus().stats)) s[k] = (s[k] || 0) + v;   // 지역 도감 완성 보상
  for (const [k, v] of Object.entries(manualPassive().stats)) s[k] = (s[k] || 0) + v;
  for (const [k, v] of Object.entries(titleStats())) s[k] = (s[k] || 0) + v;   // 별호: 습득 보너스(영구) + 새긴 별호의 착용 보너스  // 비급 독파 영구 보너스 (장착 여부 무관)
  // 옥대의 기공 위력(qiPct)은 기공 능력치에 곱하므로 먼저 모은다
  const qi = SLOT_ORDER.reduce((a, slot) => a + ((S.equip[slot] && S.equip[slot].stats.qiPct) || 0), 0);
  for (const cat of CAT_ORDER) {
    const id = S.active[cat]; if (!id || !S.manuals[id]) continue;
    const q = cat === 'gigong' ? 1 + qi / 100 : 1;
    for (const [k, v] of Object.entries(manualBonus(id, S.manuals[id].star))) s[k] = (s[k] || 0) + v * q;
  }
  for (const cat of CAT_ORDER) {   // 대성 극의: 그 갈래의 비급을 하나라도 12성에 올렸으면 영구 (더 높은 등급 비급으로 갈아타도 유지된다)
    if (Object.keys(S.manuals).some(id => MANUALS[id] && MANUALS[id].cat === cat && S.manuals[id].star >= MAX_STAR))
      for (const [k, v] of Object.entries(DAESUNG_PASSIVE[cat].stats)) s[k] = (s[k] || 0) + v;
  }
  for (const slot of SLOT_ORDER) {
    const it = S.equip[slot]; if (!it) continue;
    for (const [k, v] of Object.entries(gearStats(it))) if (!ATTRS[k]) s[k] = (s[k] || 0) + v;   // 4대 스탯 보정은 attrOf에서
    if (it.unique) s[it.unique.key] = (s[it.unique.key] || 0) + it.unique.val;
  }
  s.atk += S.shrine.atk; s.maxMp += S.shrine.mp; s.eva += S.shrine.eva; s.crit += Math.floor(S.shrine.total / 10) * 2;
  s.maxHp += S.perm.maxHp; s.maxMp += S.perm.maxMp;
  { const B = (SECTS[S.sect] || SECTS[SECT_DEFAULT]).bonus; for (const k in B) s[k] = (s[k] || 0) + B[k]; }   // 소속 보너스
  s.eva += s.evaFlat;
  let atkB = s.atkPct / 100, defB = 0;
  s.trainBuff = 0;
  for (const b of S.buffs) {
    if (b.key === 'atk') atkB += b.val;
    if (b.key === 'def') defB += b.val;
    if (b.key === 'defFlat') s.def += b.val;                // 철골단
    if (b.key === 'critGuard') s.critRes += b.val * 2;     // 청심단: 적의 치명 확률 -val%p (회심 방비 2 = 1%p)
    if (b.key === 'qiDmg') s.qiDmg = (s.qiDmg || 0) + b.val;   // 통맥환: 초식 피해
    if (b.key === 'train') s.trainBuff += b.val;
  }
  s.atk *= 1 + atkB; s.def *= 1 + defB; s.maxHp *= 1 + s.hpPct / 100; s.maxMp *= 1 + s.mpPct / 100;
  { const m = WARRIOR_RANK.ranks[Math.min(S.rank || 0, WARRIOR_RANK.ranks.length - 1)].mult; if (m !== 1) for (const k of ['atk', 'def', 'maxHp', 'maxMp', 'spd']) s[k] *= m; }   // 무사 품계 (이류무사 +20%)
  for (const k of ['atk', 'def', 'maxHp', 'maxMp', 'spd', 'maxSta', 'bag']) s[k] = Math.round(s[k]);
  s.eva = Math.min(60, Math.round(s.eva * 10) / 10);
  s.crit = Math.min(75, Math.round(s.crit * 10) / 10);
  s.counter = Math.min(60, Math.round(s.counter * 10) / 10);
  s.mpRegen = Math.round(s.mpRegen * 10) / 10;
  { const n = schoolCount(); for (const k of Object.keys(n)) { const f = SCHOOLS[k].step; s[f] = (s[f] || 0) + n[k] * SCHOOL_RULES.step[f]; } }   // 성향: 같은 파 한 칸마다 그 파 효과 한 단계
  for (const k of ['block', 'shield', 'critRes', 'critDmg', 'aura', 'craft', 'mpSave']) s[k] = Math.max(0, Math.round((s[k] || 0) * 10) / 10);   // 심력 · 자질이 기준보다 낮아도 음수로 내려가지 않는다
  return s;
}

/* 비급 하나가 장착 시 주는 능력치 (성급 기준) */
function manualBonus(id, star) {
  const M = MANUALS[id], P = MANUAL_POWER, st = star, b = {};
  const k = P.K * P.grade[M.grade] * (1 + P.star * (st - 1) / (MAX_STAR - 1)) * (st >= 6 ? P.soseong : 1);   // 등급은 크게 · 성급은 작게 (MANUAL_POWER)
  if (M.cat === 'mugong') b.atk = 4.9 * k;
  if (M.cat === 'simbeop') Object.assign(b, { maxMp: 13.5 * k, atk: 1 * k, maxHp: 5 * k, mpRegen: 0.25 * k });
  if (M.cat === 'gyeonggong') Object.assign(b, { spd: 0.8 * k, eva: 0.6 * k, crit: 0.3 * k, counter: 0.5 * k });
  if (M.cat === 'gigong') Object.assign(b, { maxHp: 24 * k, def: 1.85 * k, counter: 1.2 * k });
  for (const [k, v] of Object.entries(M.extra || {})) b[k] = (b[k] || 0) + v;       // 무공 고유 능력치
  return b;
}


const GEAR_SCALED = new Set(['atk', 'def', 'maxHp', 'maxMp']);   // 장비 배율(gearScale)을 받는 수치
function gearStats(it) {
  const up = BALANCE.enhStep * (it.enh || 0), out = {};   // 강화: 단계마다 enhStep (+7 ≈ 한 등급 위), 작은 수치는 반올림
  for (const [k, v0] of Object.entries(it.stats)) {
    const pct = PCT_STATS.has(k), v = pct || !GEAR_SCALED.has(k) ? v0 : v0 * BALANCE.gearScale, b = (pct ? 10 : 1) * v * up;   // 더할 몫 (퍼센트는 0.1 단위)
    out[k] = (Math.round(v * (pct ? 10 : 1)) + (v >= 5 ? Math.ceil(b - 1e-9) : Math.round(b))) / (pct ? 10 : 1);   // 큰 수치(5 이상)는 올림 → +1부터 오른다
  }
  return out;
}

function realmOf(star) { return [...REALMS].reverse().find(r => star >= r.min); }

function clampVitals() {
  const st = calcStats();
  S.hp = clamp(S.hp, 0, st.maxHp); S.mp = clamp(S.mp, 0, st.maxMp); S.stamina = Math.max(0, S.stamina);
}

/* 기본 스탯: 배분한 값 + 지역 도감 완성 보상 + 비급 독파 보너스 + 장비 + 무신상 각성(영구) */
/* 자질: 서장 주사위 값 + 영구 상승(S.perm.apt — 영약 · 기연 · 경지 돌파) */
function aptOf(a) { return ((S.apt && S.apt[a]) || APT_MID) + ((S.perm && S.perm.apt && S.perm.apt[a]) || 0); }
/* 자질 주사위: 넷 모두 APT_MIN~APT_MAX, 합계 APT_TOTAL (조건에 맞을 때까지 다시 굴린다 — 가능한 조합마다 같은 확률) */
/* 후천(後天) 단련 4종도 서장에서 주사위로 — 한 스탯 ATTR_MIN~ATTR_MAX, 합계는 늘 ATTR_TOTAL (10월 3일) */
function rollAttr() {
  const ks = Object.keys(ATTRS), n = ATTR_MAX - ATTR_MIN + 1;
  for (;;) { const r = ks.map(() => ATTR_MIN + Math.floor(Math.random() * n)); if (r.reduce((a, b) => a + b, 0) === ATTR_TOTAL) return Object.fromEntries(ks.map((k, i) => [k, r[i]])); }
}
function rollApt() {
  const ks = Object.keys(APTS), n = APT_MAX - APT_MIN + 1;
  for (;;) { const r = ks.map(() => APT_MIN + Math.floor(Math.random() * n)); if (r.reduce((a, b) => a + b, 0) === APT_TOTAL) return Object.fromEntries(ks.map((k, i) => [k, r[i]])); }
}
const validApt = A => !!A && Object.keys(APTS).every(k => Number.isInteger(A[k]) && A[k] >= APT_MIN && A[k] <= APT_MAX) && Object.keys(APTS).reduce((a, k) => a + A[k], 0) === APT_TOTAL;
function attrOf(a) {
  const gear = SLOT_ORDER.reduce((n, slot) => n + ((S.equip[slot] && S.equip[slot].stats[a]) || 0), 0);
  return ((S.attr && S.attr[a]) || ATTR_BASE) + (codexBonus().attr[a] || 0) + (manualPassive().attr[a] || 0) + gear + ((S.perm && S.perm.attr && S.perm.attr[a]) || 0);
}
/* 비급 독파 영구 보너스: 익힌 비급마다 passiveBonus를 장착 여부와 무관하게 더한다 */
function manualPassive() {
  const out = { attr: {}, stats: {} };
  for (const id of Object.keys((S && S.manuals) || {})) { const P = MANUALS[id] && MANUALS[id].passiveBonus; if (!P) continue;
    for (const [k, v] of Object.entries(P)) { const o = ATTRS[k] ? out.attr : out.stats; o[k] = (o[k] || 0) + v * MANUAL_POWER.passive; } }
  return out;
}
/* 받은 지역 도감 완성 보상의 합 */
function codexBonus() {
  const out = { attr: {}, stats: {} };
  for (const z of Object.keys((S && S.codexRewards) || {})) { const R = CODEX_REWARDS[z]; if (!R) continue;
    for (const [k, v] of Object.entries(R.attr)) out.attr[k] = (out.attr[k] || 0) + v;
    for (const [k, v] of Object.entries(R.stats)) out.stats[k] = (out.stats[k] || 0) + v; }
  return out;
}
const talentOf = () => (S.talent && TALENTS[S.talent]) || {};
/* 캐릭터 생성 배분이 규칙에 맞는지 (4대 스탯 합계 ATTR_TOTAL · 한 스탯 ATTR_MIN~ATTR_MAX) */
function validAttr(A) { return !!A && Object.keys(ATTRS).every(k => Number.isInteger(A[k]) && A[k] >= ATTR_MIN && A[k] <= ATTR_MAX) && Object.keys(ATTRS).reduce((a, k) => a + A[k], 0) === ATTR_TOTAL; }

function weaponType() { return S.equip.weapon ? S.equip.weapon.wtype : 'fist'; }
