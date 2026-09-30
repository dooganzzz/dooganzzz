/* [시스템] 능력치 계산: 장비·비급·무신상·버프를 합산한다 (DOM 조작 금지) */

/* ───────── 능력치 ───────── */
function calcStats() {
  const s = { atk: 10, def: 3, maxHp: 100, maxMp: 40, spd: 10, eva: 3, crit: 5, critRes: 0, counter: 10, mpRegen: 1, bag: 100, mpCost: 0, craft: 0, train: 0, maxSta: 100, combo: 0, lifesteal: 0, atkPct: 0, hpPct: 0, mpPct: 0, mpSave: 0, evaFlat: 0, elem: 0, staSave: 0, breathe: 0, qiPct: 0, elemRes: 0, bleed: 0, pierce: 0, acc: 0, qiDmg: 0 };
  // 3대 기본 스탯: 기준값(ATTR_BASE)에서 한 점마다 더하거나 뺀다
  for (const [a, D] of Object.entries(ATTRS)) {
    const d = attrOf(a) - ATTR_BASE; for (const [k, v] of Object.entries(D.per)) s[k] += v * d;
    for (const [k, v] of Object.entries(D.abs || {})) s[k] += v * attrOf(a);       // 민첩: 수치 그대로
  }
  for (const [k, v] of Object.entries(codexBonus().stats)) s[k] = (s[k] || 0) + v;   // 지역 도감 완성 보상
  for (const [k, v] of Object.entries(manualPassive().stats)) s[k] = (s[k] || 0) + v;  // 비급 독파 영구 보너스 (장착 여부 무관)
  // 옥대의 기공 위력(qiPct)은 기공 능력치에 곱하므로 먼저 모은다
  const qi = SLOT_ORDER.reduce((a, slot) => a + ((S.equip[slot] && S.equip[slot].stats.qiPct) || 0), 0);
  for (const cat of CAT_ORDER) {
    const id = S.active[cat]; if (!id || !S.manuals[id]) continue;
    const q = cat === 'gigong' ? 1 + qi / 100 : 1;
    for (const [k, v] of Object.entries(manualBonus(id, S.manuals[id].star))) s[k] = (s[k] || 0) + v * q;
  }
  for (const slot of SLOT_ORDER) {
    const it = S.equip[slot]; if (!it) continue;
    for (const [k, v] of Object.entries(gearStats(it))) if (!ATTRS[k]) s[k] = (s[k] || 0) + v;   // 4대 스탯 보정은 attrOf에서
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
    if (b.key === 'defFlat') s.def += b.val;                // 골계단
    if (b.key === 'critGuard') s.critRes += b.val * 2;     // 청심단: 적의 치명 확률 -val%p (치명 저항 2 = 1%p)
    if (b.key === 'qiDmg') s.qiDmg = (s.qiDmg || 0) + b.val;   // 통맥환: 초식 피해
    if (b.key === 'train') s.trainBuff += b.val;
  }
  s.atk *= 1 + atkB; s.def *= 1 + defB; s.maxHp *= 1 + s.hpPct / 100; s.maxMp *= 1 + s.mpPct / 100;
  for (const k of ['atk', 'def', 'maxHp', 'maxMp', 'spd', 'maxSta', 'bag']) s[k] = Math.round(s[k]);
  s.eva = Math.min(60, Math.round(s.eva * 10) / 10);
  s.crit = Math.min(75, Math.round(s.crit * 10) / 10);
  s.counter = Math.min(60, Math.round(s.counter * 10) / 10);
  s.mpRegen = Math.round(s.mpRegen * 10) / 10;
  return s;
}

/* 비급 하나가 장착 시 주는 능력치 (성급 기준) */
function manualBonus(id, star) {
  const M = MANUALS[id], g = GRADES[M.grade].mult, st = star, t = tri(st), b = {};
  if (M.cat === 'mugong') b.atk = (4 * st + 0.9 * t) * g;
  if (M.cat === 'simbeop') Object.assign(b, { maxMp: (12 * st + 1.5 * t) * g, atk: st * g, maxHp: 5 * st * g, mpRegen: 0.25 * st * g });
  if (M.cat === 'gyeonggong') Object.assign(b, { spd: 0.8 * st * g, eva: 0.6 * st * g, crit: 0.3 * st * g, counter: 0.5 * st * g });
  if (M.cat === 'gigong') Object.assign(b, { maxHp: (20 * st + 4 * t) * g, def: (1.5 * st + 0.35 * t) * g, counter: 1.2 * st * g });
  if (st >= 6) for (const k of Object.keys(b)) b[k] *= 1.3;              // 소성: 기본 위력 계수 상향
  if (st >= MAX_STAR) for (const [k, v] of Object.entries(DAESUNG_PASSIVE[M.cat].stats)) b[k] = (b[k] || 0) + v;   // 대성 극의
  for (const [k, v] of Object.entries(M.extra || {})) b[k] = (b[k] || 0) + v;       // 무공 고유 능력치
  return b;
}


function gearStats(it) {
  const mult = 1 + 0.1 * (it.enh || 0), out = {};
  for (const [k, v] of Object.entries(it.stats)) out[k] = PCT_STATS.has(k) ? Math.round(v * mult * 10) / 10 : Math.round(v * mult);
  return out;
}

function realmOf(star) { return [...REALMS].reverse().find(r => star >= r.min); }

function clampVitals() {
  const st = calcStats();
  S.hp = clamp(S.hp, 0, st.maxHp); S.mp = clamp(S.mp, 0, st.maxMp); S.stamina = Math.max(0, S.stamina);
}

/* 기본 스탯: 배분한 값 + 지역 도감 완성 보상 + 비급 독파 보너스 + 장비 + 무신상 각성(영구) */
function attrOf(a) {
  const gear = SLOT_ORDER.reduce((n, slot) => n + ((S.equip[slot] && S.equip[slot].stats[a]) || 0), 0);
  return ((S.attr && S.attr[a]) || ATTR_BASE) + (codexBonus().attr[a] || 0) + (manualPassive().attr[a] || 0) + gear + ((S.perm && S.perm.attr && S.perm.attr[a]) || 0);
}
/* 비급 독파 영구 보너스: 익힌 비급마다 passiveBonus를 장착 여부와 무관하게 더한다 */
function manualPassive() {
  const out = { attr: {}, stats: {} };
  for (const id of Object.keys((S && S.manuals) || {})) { const P = MANUALS[id] && MANUALS[id].passiveBonus; if (!P) continue;
    for (const [k, v] of Object.entries(P)) { const o = ATTRS[k] ? out.attr : out.stats; o[k] = (o[k] || 0) + v; } }
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
/* 기예 솜씨 품계: 1단계 = 9품 … CRAFT_GRADE_TOP단계 이상 = 1품 */
const craftGrade = lv => `${Math.max(1, CRAFT_GRADE_TOP + 1 - lv)}품`;
const talentOf = () => (S.talent && TALENTS[S.talent]) || {};
/* 캐릭터 생성 배분이 규칙에 맞는지 (4대 스탯 합계 ATTR_TOTAL · 한 스탯 ATTR_MIN~ATTR_MAX) */
function validAttr(A) { return !!A && Object.keys(ATTRS).every(k => Number.isInteger(A[k]) && A[k] >= ATTR_MIN && A[k] <= ATTR_MAX) && Object.keys(ATTRS).reduce((a, k) => a + A[k], 0) === ATTR_TOTAL; }

function weaponType() { return S.equip.weapon ? S.equip.weapon.wtype : 'fist'; }
