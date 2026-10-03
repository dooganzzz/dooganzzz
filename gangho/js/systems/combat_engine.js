/* [시스템] 자동 전투: 한 판을 끝까지 계산하고 합마다 기록을 남긴다 (리플레이용). 명중·치명·회피→반격 분기, 승패 정산 (DOM 조작 금지) */

/* ───────── 전투 (턴제) ───────── */
function dmgBase(atk, def) { return (atk * atk) / (atk + def); }
function dmgCalc(atk, def) { return Math.max(1, Math.round(dmgBase(atk, def) * rnd(0.9, 1.1))); }
function reaction(dmg, maxHp) { const r = dmg / maxHp; return HIT_TEXT.find(([t]) => r >= t); }

/* 투력 (정수). 기준 상대(CP_REF)마다 '쓰러지기 전까지 넣는 피해' = 공세(합당 피해) × 수세(버티는 합)를 실제 전투 규칙대로 기대값으로 계산하고,
   세 상대의 값을 기하평균한다. 활력만 높거나 공격만 높으면 곱이 작아 투력이 덜 오른다.
   player는 저장 상태 S (관리자 창에서는 받은 복사본). 다른 객체를 넘기면 그 상태로 잠시 바꿔 계산한다. */
function cpVersus(st, R, art) {
  const hit = Math.min(1, (Math.max(55, 95 - R.eva) + (st.acc || 0)) / 100);
  const def = Math.max(0, R.def * (1 - (st.armorPen || 0) / 100) - (st.pierce || 0));
  const critF = 1 + Math.min(100, st.crit || 0) / 100 * (COMBAT_RULES.critBase - 1 + (st.critDmg || 0) / 100);
  const elemF = 1 + (art.elem ? 0.2 * (st.elem || 0) / 100 : 0);           // 기공이 있으면 다섯 중 하나는 내가 극한다
  const basic = dmgBase(st.atk, def) * hit * critF * elemF;
  // 받는 피해: 회피 · 방어(최소 피해) · 치명(저항) · 연격, 충격으로 적이 쉬는 몫
  const foeHit = Math.max(40, 95 - (st.eva || 0)) / 100;
  const foeDmg = Math.max(dmgBase(R.atk, st.def), R.atk * COMBAT_RULES.minDmg);
  const foeCrit = 1 + Math.max(0, R.crit - (st.critRes || 0) / 2) / 100 * 0.5;
  const stun = Math.min(0.5, (st.shock || 0) / 100 * hit);
  let taken = foeDmg * foeHit * foeCrit * (1 + (R.hits - 1) * 0.6) * (1 - stun) * (1 - Math.min(100, st.block || 0) / 100 * COMBAT_RULES.blockCut);   // 막기
  // 초식: 발동 확률 × 셋 중 하나를 고르는 비율 · 내력이 버티는 만큼만
  let skill = 1, sustain = 1;
  if (art.moves) {
    const p = Math.min(1, (MOVE_START + (st.combo || 0)) / 100), qi = 1 + (st.qiDmg || 0);
    const tot = MOVE_PICK.slice(0, art.moves).reduce((a, v) => a + v, 0), w = i => i < art.moves ? MOVE_PICK[i] / tot : 0;
    const costPerRound = p * (w(0) * art.cost[0] + w(1) * art.cost[1] + w(2) * art.cost[2]);
    const roughRounds = Math.max(1, st.maxHp / Math.max(1, taken));
    const budget = st.maxMp + (st.mpRegen + st.maxMp * (st.mpRegenPct || 0) / 100) * roughRounds;
    sustain = costPerRound > 0 ? Math.min(1, budget / (costPerRound * roughRounds)) : 1;
    skill = 1 + sustain * p * (w(0) * (art.mult[0] * qi - 1) + w(1) * (art.mult[1] * qi - 1) + w(2) * (art.mult[2] * qi - 1));
  }
  const counter = Math.min(1, (st.counter || 0) / 100) * foeHit;              // 맞을 때마다 평타 한 번
  const offense = basic * skill + dmgBase(st.atk, def) * hit * critF * counter;
  taken = Math.max(taken * 0.1, taken - offense * (st.lifesteal || 0) / 100);
  const rounds = st.maxHp * (1 + (st.shield || 0) / 100) / Math.max(1, taken);   // 호신강기는 활력에 더한 몫
  const first = st.spd + (st.foe ? 0 : attrOf('agi')) + (st.first || 0) >= R.spd ? 0.5 : -0.5;   // 먼저 치면 한 번 더 (요수는 제자 민첩을 더하지 않음)
  return { offense, rounds, hit, critF, skill, sustain, counter, first, value: offense * Math.max(0.5, rounds + first) };
}
/* 기준 상대마다의 값(피해 곱)을 기하평균해 CP_EXP제곱으로 누른 투력 */
const cpFromValues = vs => Math.round(CP_SCALE * Math.pow(Math.exp(vs.reduce((a, v) => a + Math.log(Math.max(1e-6, v.value)), 0) / vs.length), CP_EXP));
function combatPowerParts(player = S) {
  if (!player) return { total: 0, ref: 0, offense: 0, rounds: 0, hit: 0, crit: 0, skill: 1, sustain: 1, counter: 0, vs: [] };
  const prev = S; S = player;
  try {
    const st = calcStats(), id = S.active.mugong, M = id && MANUALS[id], m = id && S.manuals[id];
    const moves = M && m && M.weapon === weaponType() ? unlockedMoves(m.star) : 0;
    const art = { elem: !!myElem(), moves };
    if (moves) {
      const g = GRADES[M.grade].mult, power = (M.power || COMBAT_RULES.powerBase) / COMBAT_RULES.powerBase, realm = m.star >= 6 ? 1.25 : 1;
      art.mult = MOVE_MULT.map(v => v * (1 + (g - 1) * 0.5) * realm * power);
      art.cost = [0, 1, 2].map(i => Math.max(1, Math.round((4 + m.star / 2 + i * (4 + m.star / 2)) * g * (1 - ((st.mpCost || 0) + (st.mpSave || 0)) / 100))));
    }
    const vs = CP_REF.map(R => cpVersus(st, R, art));
    const total = cpFromValues(vs);
    const ref = Math.max(0, Math.min(CP_REF.length - 1, ZONE_ORDER.indexOf(S.expedition.zone)));   // 내역은 지금 탐험지의 기준 상대로 보여 준다
    const mid = vs[ref];
    return { total, ref, offense: mid.offense, rounds: mid.rounds, hit: mid.hit, crit: mid.critF, skill: mid.skill, sustain: mid.sustain, counter: mid.counter, first: mid.first > 0, vs };
  } finally { S = prev; }
}
function calculateCombatPower(player = S) { return combatPowerParts(player).total; }
/* 요수 투력: 제자 투력과 같은 잣대 — 요수를 제자 자리에 세우고 같은 기준 상대(CP_REF)들과 겨뤄 기하평균 (무대 정보 창에 제자 투력과 나란히) */
function foeCombatPower(eid) {
  const E = ENEMIES[eid]; if (!E) return 0;
  const st = { atk: E.atk * (1 + ((E.hits || 1) - 1) * 0.6), def: E.def || 0, maxHp: E.hp, eva: E.eva || 0, crit: E.crit || 0, spd: E.spd || 0, foe: true };   // 연격은 공격력에 녹인다
  const vs = CP_REF.map(R => cpVersus(st, R, { elem: false, moves: 0 }));
  return cpFromValues(vs);
}
/* 장비를 잠깐 끼워 보고 투력 · 공세 · 수세가 얼마나 바뀌는지 (slot을 안 주면 그 장비가 들어갈 칸 중 가장 나은 칸) */
function cpTryGear(it, slot) {
  const base = combatPowerParts(S), slots = slot ? [slot] : SLOT_ORDER.filter(s => slotAccepts(s) === it.slot);
  let best = null;
  for (const s of slots) {
    const had = Object.prototype.hasOwnProperty.call(S.equip, s), prev = S.equip[s];
    S.equip[s] = it;
    try { const p = combatPowerParts(S); if (!best || p.total > best.total) best = p; }
    finally { if (had) S.equip[s] = prev; else delete S.equip[s]; }
  }
  return { cp: best ? best.total - base.total : 0 };
}

/* ───────── 3대 상성 (오행 · 병기) ───────── */
function myElem() { const id = S.active.gigong; return (id && MANUALS[id] && MANUALS[id].elem) || null; }
function elemRel(a, b) { if (!a || !b) return 0; return ELEM_BEATS[a] === b ? 1 : ELEM_BEATS[b] === a ? -1 : 0; }
function weaponRel(a, b) { if (!a || !b) return 0; return (WEAPON_ADV[WEAPON_CLASS[a]] || {})[WEAPON_CLASS[b]] || 0; }
/* 나와 적 사이의 상성. dealt: 내가 주는 피해 배율 · taken: 내가 받는 피해 배율 · myHit/foeHit: 명중 보정(%p) */
function affinity(eid, st = calcStats()) {
  const E = ENEMIES[eid], me = myElem(), wt = weaponType(), A = AFFINITY;
  const el = elemRel(me, E.elem), wp = weaponRel(wt, E.wtype);
  const up = A.elem + (st.elem || 0) / 100;                   // 지력: 내가 극할 때 오행술 위력
  const weak = E.weak && me === E.weak.elem ? E.weak.mult : 0;  // 요수 고유 약점 (예: 청령목괴는 화 기공에 취약)
  return {
    el, wp, me, foe: E.elem, wt, fwt: E.wtype || null, weak,
    dealt: (el > 0 ? 1 + up : el < 0 ? 1 - A.elem : 1) * (wp > 0 ? 1 + A.weapAtk : wp < 0 ? 1 - A.weapDown : 1) * (1 + weak),
    taken: (el > 0 ? 1 - A.elem : el < 0 ? (1 + Math.max(0, A.elem - (st.elemRes || 0) / 100)) * (1 + COMBAT_RULES.elemPenalty) : 1) * (wp < 0 ? 1 + A.weapAtk : wp > 0 ? 1 - A.weapDown : 1),
    myHit: wp > 0 ? A.weapHit : 0, foeHit: wp < 0 ? A.weapHit : 0,
  };
}
const NO_AFF = { dealt: 1, taken: 1, myHit: 0, foeHit: 0 };   // 상성이 없는 전투 (직접 꾸린 전투 기록 등)
/* 상성 한 줄 (관찰 창·심상수련장) */
function affinityText(a) {
  const E = x => x ? `${ELEMENTS[x].hanja}` : '無';
  const elem = a.el > 0 ? `<b class="good">상극 우세</b> (${E(a.me)}${'剋'}${E(a.foe)})` : a.el < 0 ? `<b class="warn">상극 열세</b> (${E(a.foe)}剋${E(a.me)})` : `보정 없음 (${E(a.me)}·${E(a.foe)})`;
  const wn = w => w ? WEAPON_CLASS_NAME[WEAPON_CLASS[w]] : '맨몸';
  const weap = !a.fwt ? '호각 (상대는 병기가 없음)' : a.wp > 0 ? `<b class="good">우세</b> (${wn(a.wt)} › ${wn(a.fwt)})` : a.wp < 0 ? `<b class="warn">열세</b> (${wn(a.wt)} ‹ ${wn(a.fwt)})` : `호각 (${wn(a.wt)} = ${wn(a.fwt)})`;
  return `오행 ${elem} · 병기 ${weap}${a.weak ? ` · <b class="good">약점 공략 (+${Math.round(a.weak * 100)}%)</b>` : ''}`;
}

/* 기척 비율: 내가 버티는 합 수 ÷ 적을 쓰러뜨리는 데 드는 합 수 (속도 보정). 높을수록 내가 유리 */
function senseRatio(eid) {
  const E = ENEMIES[eid], st = calcStats(), a = affinity(eid, st);
  const myTurns = E.hp / (dmgBase(st.atk, E.def) * 1.3 * a.dealt);
  const foeTurns = st.maxHp / Math.max(1, dmgBase(E.atk, st.def) * a.taken * (1 - st.eva / 100) * (1 + ((E.hits || 1) - 1) * 0.6));
  return (foeTurns / myTurns) * (st.spd / E.spd);
}
function sense(eid) { const ratio = senseRatio(eid); return SENSE_TEXT.find(([t]) => ratio >= t); }

/* 한 판을 끝까지 계산한다. 속도가 빠른 쪽이 먼저 치고, 합마다 대사·연출·양쪽 활력을 기록해 두면
   화면(관찰하기)이 그 기록을 그대로 다시 튼다. opts.bonus: 기연 전투에서 이기면 받는 추가 보상
   opts.sim: 심상수련장의 가상 전투 (보상·기록·소모 없음. 생혈고·소환단은 가진 만큼 가상으로 쓴다)
   b.dot: 지속 피해 { me: [...], foe: [...] } — 중독(poison)·출혈/열상(bleed). 합이 시작될 때 들어간다 */
function fight(eid, opts = {}) {
  const E = ENEMIES[eid], st = calcStats();
  const b = { eid, name: E.name, boss: !!E.boss, e: { ...E, hpNow: E.hp }, over: false, win: false, round: 0, st, lines: [], fx: [], bonus: opts.bonus || null,
    start: { me: { hp: S.hp, mp: S.mp, maxHp: st.maxHp, maxMp: st.maxMp }, foe: { hp: E.hp, maxHp: E.hp } }, rounds: [], exp: 0, silver: 0, sim: !!opts.sim, pots: opts.sim ? { hp: count('saenghyeol'), mp: count('potionMp') } : null, aff: affinity(eid, st), dot: { me: [], foe: [] } };
  RT.battle = b;
  if (!b.sim) { const bs = S.bestiary = S.bestiary || {}, first = !bs[eid]; (bs[eid] = bs[eid] || { met: 0, kills: 0 }).met++; if (first) checkAreaEncyclopediaCompletion(zoneOfEnemy(eid)); }   // 요수 도감 (처음 만나면 지역 도감 완성 확인)
  notify.trace('battle', `조우: ${eid} (${E.name}) · 활력 ${Math.round(S.hp)}`);
  bLine(`⚔️ ${josa(E.name, '이가')} 모습을 드러냈습니다!`, 'head');
  const [, stext, scls] = sense(eid);
  bLine(stext, 'sense ' + scls);
  if (E.boss) {
    const quotes = { redTiger: '붉은 갈기의 호랑이가 낮게 으르렁거리자, 숲 전체가 숨을 죽입니다.', jeokpaecheon: '적패천: "청풍문? 그 거지 문파에서 아직 사람이 나오나? 내 패도(覇刀) 한 번이면 끝이다."', byeokhaeryong: '벽해룡: "이 물 위에서 나를 이긴 자는 없다. 뭍에서도 마찬가지고."' };
    bLine(quotes[eid], 'npc');
  }
  bLine(`☯ 상성 — ${affinityText(b.aff)}`, 'aff');
  battleOpening(b, E);
  const Q = MANUALS[S.active.gigong];
  if (Q && Q.stances) bLine(stanceCall(0, Q.stances[0].name), 'log-stance-desc qi');
  const mt = MANUALS[S.active.mugong];
  if (!mt) bLine('장착한 무공이 없어 맨손으로 맞섭니다.', 'muted');
  else if (mt.weapon !== weaponType()) bLine(`《${mt.name}》은 ${WEAPON_TYPES[mt.weapon]} 무공입니다. 병기가 맞지 않아 초식을 펼칠 수 없습니다.`, 'muted');
  b.intro = b.lines;
  while (!b.over && b.round < EXPEDITION.maxRounds) battleRound(b);
  if (!b.over) {                                             // 끝내 승부가 나지 않으면 서로 물러난다
    b.over = true; b.fled = true;
    b.rounds[b.rounds.length - 1].lines.push({ text: '끝내 승부가 나지 않아 서로 물러났습니다.', cls: 'muted' });
  }
  RT.battle = null;
  return b;
}

/* 요수의 경지(탐험지 단계 − 1) · 기세. 탐험지 밖의 요수(떠돌이)는 경지 0 */
const foeRealm = eid => Math.max(0, ((ZONES[zoneOfEnemy(eid)] || {}).tier || 1) - 1);
function foeAura(eid) { const E = ENEMIES[eid], A = COMBAT_RULES.aura; return A.foeTier * Math.max(0, (E.tier || 2) - 1) + A.foeZone * foeRealm(eid) + (E.boss ? A.foeBoss : 0); }
const myAura = st => COMBAT_RULES.aura.base + COMBAT_RULES.aura.perRank * (S.rank || 0) + (st.aura || 0);
/* 전투 시작: 경지 압제(b.realm) · 호신강기(b.shield) · 기세 싸움(약한 쪽 공격력이 꺾인다) */
function battleOpening(b, E) {
  const R = COMBAT_RULES.realm, d = Math.max(-R.cap, Math.min(R.cap, (S.rank || 0) - foeRealm(b.eid)));
  b.realm = d;
  if (d) bLine(d > 0 ? `⛰ 경지 압제 — 한 수 아래의 상대입니다. (주는 피해 +${d * R.step * 100}% · 받는 피해 -${d * R.step * 100}%)` : `⛰ 경지 압제 — 상대의 경지가 높아 숨이 막힙니다. (주는 피해 ${d * R.step * 100}% · 받는 피해 +${-d * R.step * 100}%)`, d > 0 ? 'aff-up' : 'muted');
  b.shield = Math.round(b.st.maxHp * (b.st.shield || 0) / 100);
  if (b.shield) bLine(`🛡 호신강기가 몸을 감쌉니다. (${fmt(b.shield)})`, 'log-stance-desc qi');
  const A = COMBAT_RULES.aura, me = myAura(b.st), foe = foeAura(b.eid), cut = Math.min(A.max, Math.abs(me - foe) * A.cut);
  if (cut >= 1) {
    if (me > foe) { b.e.atk *= 1 - cut / 100; bLine(`🔥 기세 싸움 — ${josa(E.name, '이가')} 제자의 기세에 눌려 움츠러듭니다. (상대 공격력 -${Math.round(cut)}%)`, 'aff-up'); }
    else { b.st = { ...b.st, atk: b.st.atk * (1 - cut / 100) }; bLine(`🔥 기세 싸움 — ${E.name}의 위압에 손끝이 굳습니다. (공격력 -${Math.round(cut)}%)`, 'muted'); }
  }
}

/* 전투 기록 한 줄 (견문록이 아니라 전투 기록에만 남는다) */
function bLine(text, cls = '') { RT.battle.lines.push({ text, cls }); }

function battleRound(b) {
  b.round++;
  b.lines = []; b.fx = [];
  b.st = calcStats();
  tickDots(b); checkEnd(b);
  if (b.over) { b.rounds.push({ lines: b.lines, fx: b.fx, me: { hp: Math.round(S.hp), mp: Math.round(S.mp) }, foe: Math.round(b.e.hpNow) }); return; }
  autoPotion(b);
  const order = !b.e.first && b.st.spd + attrOf('agi') + (b.st.first || 0) >= b.e.spd ? ['me', 'foe'] : ['foe', 'me'];   // 위험 강적은 선공 고정   // 선공: 내 속도 + 민첩 + 선공 보정 vs 요수 속도
  for (const who of order) {
    if (b.over) break;
    if (who === 'me') playerAttack(b); else enemyTurn(b);
    checkEnd(b);
  }
  if (!b.over) S.mp = Math.min(b.st.maxMp, S.mp + b.st.mpRegen + b.st.maxMp * (b.st.mpRegenPct || 0) / 100);   // 내력 회복 + 회복률(최대 내력 %)
  b.rounds.push({ lines: b.lines, fx: b.fx, me: { hp: Math.round(S.hp), mp: Math.round(S.mp) }, foe: Math.round(b.e.hpNow) });
}

/* 위급하면 제자가 알아서 단약을 쓴다: 활력이 바닥나면 생혈고, 내력이 바닥나면 소환단 */
function autoPotion(b) {
  const use = (id, k) => { if (b.sim) { if (b.pots[k] <= 0) return false; b.pots[k]--; return true; } if (!has(id)) return false; take(id, 1); return true; };
  // 한 전투에 생혈고는 EXPEDITION.potionPerFight개까지 (이길 수 없는 상대에게 가진 것을 다 쏟아붓지 않는다)
  if (S.hp < b.st.maxHp * ((S.settings && S.settings.potionAt != null) ? S.settings.potionAt : EXPEDITION.potionAt) && (b.potHp || 0) < EXPEDITION.potionPerFight && use('saenghyeol', 'hp')) {
    b.potHp = (b.potHp || 0) + 1;
    const v = Math.round(b.st.maxHp * ITEMS.saenghyeol.use.hp * (1 + (talentOf().pill || 0)) * (1 + (b.st.healPct || 0) / 100));   // 사 성향: 회복 효과   // 기예 단약: 단약 효과 +15%
    S.hp = Math.min(b.st.maxHp, S.hp + v);
    bLine(`🩸 숨을 고르며 상처에 생혈고를 발랐습니다. <span class="heal">활력 +${fmt(v)}</span>`, 'good');
    b.fx.push({ side: 'me', t: `+${fmt(v)}`, k: 'heal' });
  }
  if (S.active.mugong && S.mp < b.st.maxMp * 0.2 && use('potionMp', 'mp')) {
    const v = Math.round(b.st.maxMp * ITEMS.potionMp.use.mp * (1 + (talentOf().pill || 0)) * (1 + (b.st.healPct || 0) / 100));
    S.mp = Math.min(b.st.maxMp, S.mp + v);
    bLine(`💧 소환단을 삼켜 흐트러진 내력을 추슬렀습니다. <span class="heal">내력 +${fmt(v)}</span>`, 'good');
  }
}

/* ───────── 지속 피해: 중독(해독산으로 막음) · 출혈/열상 ───────── */
const DOT_NAME = { poison: '중독', bleed: '출혈' };
function addDot(b, side, kind, spec) {
  const [chance, pct, turns] = spec;
  if (Math.random() >= chance) return;
  if (side === 'me' && kind === 'poison') {
    const A = S.buffs.find(x => x.key === 'antidote' && x.val > 0);
    if (A) { bLine('🧪 해독산의 기운이 독을 밀어냅니다. (중독 면역)', 'log-stance-desc qi'); return; }
  }
  const max = side === 'me' ? b.st.maxHp : b.e.hp;
  const list = b.dot[side], cur = list.find(d => d.kind === kind);
  const dmg = Math.max(1, Math.round(max * pct));
  if (cur) { cur.turns = Math.max(cur.turns, turns); cur.dmg = Math.max(cur.dmg, dmg); } else list.push({ kind, dmg, turns });
  const who = side === 'me' ? S.name : b.e.name;
  bLine(`${kind === 'poison' ? '🟢' : '🩸'} ${josa(who, '이가')} ${kind === 'poison' ? '중독되었습니다' : b.e.elem === 'fire' && side === 'me' ? '열상을 입었습니다' : '출혈을 일으켰습니다'}! (${turns}합)`, 'log-stance-result dot');
}
function tickDots(b) {
  for (const side of ['me', 'foe']) {
    for (const d of b.dot[side]) {
      if (side === 'me') { S.hp = Math.max(0, S.hp - d.dmg); b.lastBlow = 'dot'; } else b.e.hpNow = Math.max(0, b.e.hpNow - d.dmg);
      bLine(`${d.kind === 'poison' ? '🟢' : '🩸'} ${side === 'me' ? '독과 상처가 몸을 파고듭니다' : `${b.e.name}의 상처에서 피가 흐릅니다`} — ${DOT_NAME[d.kind]} <span class="dmg">(-${fmt(d.dmg)})</span>`, 'log-stance-result dot');
      if (b.fx) b.fx.push({ side, t: `-${fmt(d.dmg)}`, k: 'hit' });
      d.turns--;
    }
    b.dot[side] = b.dot[side].filter(d => d.turns > 0);
  }
  // 해독산: 전투 한 합마다 남은 합이 준다 (다음 원정 동안 30합)
  if (!b.sim) { const A = S.buffs.find(x => x.key === 'antidote'); if (A && A.val > 0) A.val--; }
}

function checkEnd(b) {
  if (b.over) return;
  if (b.e.hpNow <= 0) winBattle(b);
  else if (S.hp <= 0) loseBattle(b);
}

/* ───────── 전투 묘사: 초식 선언 → 기세/호흡 → 타격/후폭풍 (3단계) ─────────
   지문 템플릿의 {attacker}·{weapon}·{target} 뒤 {이가}·{을를}·{은는}·{과와}는 받침에 맞춰 조사를 붙인다 */
function stanceFill(t, v) {
  return t.replace(/\{(attacker|weapon|target)\}(?:\{(이가|을를|은는|과와)\})?/g, (_, k, j) => v[k] + (j ? jo(v[k], j) : ''));
}
function stanceVars(b, foe) {
  const me = S.name || '제자', weapon = S.equip.weapon ? S.equip.weapon.name : '맨주먹';
  return foe ? { attacker: b.e.name, weapon: '', target: me } : { attacker: me, weapon, target: b.e.name };
}
/* 초식이 발동할 때 외치는 문구: '제1초식 응한 (凝寒) !' (설명 없이 이름만) */
const stanceCall = (i, name) => `${MOVE_NAME[i] || ''} ${name.replace(/\s*\(/, ' (')} !`.trim();
/* 한 번의 타격. o: { title, desc, cls, banner } (문자열이면 지문만 · desc가 없으면 지문 줄 없음) */
function playerHit(b, mult, o) {
  if (typeof o === 'string') o = { desc: o };
  const e = b.e, st = b.st, A = b.aff || NO_AFF, v = stanceVars(b);
  const hitChance = Math.max(55, 95 - e.eva) + A.myHit + (st.acc || 0);
  if (o.banner && b.fx) b.fx.push({ side: 'banner', t: o.banner, k: o.cls === 'counter' ? 'counter' : 'move', w: o.w || weaponType(), n: o.n || 0, mid: o.mid });   // w·n: 관찰 창 초식 연출(병기 · 몇 번째 초식)
  if (o.title) bLine(o.title, `log-stance-title ${o.cls || ''}`);
  if (o.desc) bLine(stanceFill(o.desc, v), 'log-stance-desc');
  if (A.wp > 0 && !b.affSaid) { b.affSaid = true; bLine('[상성 우위] 병기의 이점을 살린 궤적이 적의 빈틈을 파고든다!', 'log-stance-desc aff-up'); }
  if (Math.random() * 100 >= hitChance) {
    bLine(`${josa(e.name, '이가')} 몸을 틀어 궤적을 벗어났다. 허공만 가른다. <span class="dmg">(빗나감)</span>`, 'log-stance-result miss');
    if (b.fx) b.fx.push({ side: 'foe', t: '빗나감', k: 'miss' });
    return false;
  }
  const def = Math.max(0, e.def * (1 - (st.armorPen || 0) / 100) - (st.pierce || 0));   // 파갑(%) → 관통력
  let dmg = dmgCalc(st.atk, def) * mult * A.dealt * (o.title && o.cls !== 'counter' ? 1 + (st.qiDmg || 0) : 1);   // 통맥환(초식)
  const crit = Math.random() * 100 < st.crit + (o.critUp || 0);
  if (crit) dmg *= COMBAT_RULES.critBase + (st.critDmg || 0) / 100;   // 회심 위력
  dmg = Math.round(dmg * (1 + (b.realm || 0) * COMBAT_RULES.realm.step) * (1 + schoolEdge(mySchool(), e.school) * SCHOOL_RULES.edge));   // 경지 압제 · 정마사 상성(요수는 없음)
  e.hpNow = Math.max(0, e.hpNow - dmg);
  if (e.hpNow <= 0) b.finisher = !!(o.title && o.cls !== 'counter');   // 초식(오의 포함)으로 마무리했는가 — 수련치 보너스
  if (b.fx) b.fx.push({ side: 'foe', t: `-${fmt(dmg)}`, k: crit ? 'crit' : 'hit', big: crit || dmg >= e.hp * 0.2 });
  const [, txt, cls] = reaction(dmg, e.hp);
  bLine(`${crit ? '<b class="crit">회심의 일격!</b> 급소를 정확히 꿰뚫었다! ' : ''}${josa(e.name, '이가')} ${txt} <span class="dmg">(-${fmt(dmg)})</span>`, `log-stance-result ${cls}${crit ? ' crit' : ''}`);
  if (st.lifesteal) S.hp = Math.min(st.maxHp, S.hp + Math.round(dmg * st.lifesteal / 100 * (1 + (st.healPct || 0) / 100)));   // 사 성향: 회복 효과
  if (st.bleed && b.dot && e.hpNow > 0) addDot(b, 'foe', 'bleed', [st.bleed / 100, 0.04, 3]);   // 혈문도·유엽표: 출혈
  if (o.stanceBleed && b.dot && e.hpNow > 0) addDot(b, 'foe', 'bleed', [1, 0.04, o.stanceBleed]);   // 추영표: 초식 적중 시 출혈
  if (o.weaken && e.hpNow > 0) {                                                                      // 벽력도: 기세(공격력) 깎기
    const floor = ENEMIES[b.eid].atk * (1 - COMBAT_RULES.weakenMax);
    if (e.atk > floor) { e.atk = Math.max(floor, e.atk * (1 - o.weaken / 100)); bLine(`${e.name}의 기세가 꺾여 손끝이 무뎌집니다.`, 'log-stance-desc aff-up'); }
  }
  if (st.shock && e.hpNow > 0 && !e.stunned && Math.random() * 100 < st.shock) {                     // 권갑: 충격
    e.stunned = true; bLine(`💫 충격! ${josa(e.name, '이가')} 몸이 굳어 한 합 움직이지 못합니다.`, 'log-stance-desc aff-up');
  }
  return true;
}

/* 초식명에서 한자 괄호를 뗀 짧은 이름 (화면 현판용. 기록에는 한자까지 다 쓴다) */
const stanceShort = n => n.replace(/\s*\([^)]*\)\s*$/, '');
function playerAttack(b) {
  const st = b.st, id = S.active.mugong, M = MANUALS[id], m = S.manuals[id];
  const canCombo = !!M && M.weapon === weaponType();
  let comboDone = false;
  b.affSaid = false;                                        // 상성 우위 지문은 한 턴에 한 번
  const gm = S.gmMove;
  const moves = canCombo && m ? (gm != null ? 3 : unlockedMoves(m.star)) : 0;   // GM 초식 시험: 어느 무공이든 성급과 상관없이 세 초식 모두                                      // GM 초식 시험: 'mix' = 매번 발동(60 · 30 · 10) · 0 · 1 · 2 = 그 초식만 매번
  if (moves && (gm != null || Math.random() * 100 < MOVE_START + st.combo)) {
    const g = GRADES[M.grade].mult;
    const realmMult = m.star >= 6 ? 1.25 : 1;                 // 소성 이후 초식 위력 상향
    const power = (M.power || COMBAT_RULES.powerBase) / COMBAT_RULES.powerBase;   // 장보각 무공 고유 피해 배율
    const mults = MOVE_MULT.map(v => v * (1 + (g - 1) * 0.5) * realmMult * power);
    let r = Math.random() * MOVE_PICK.slice(0, moves).reduce((a, v) => a + v, 0), i = 0;   // 셋 중 하나 (안 열린 초식은 빼고)
    while (i < moves - 1 && r >= MOVE_PICK[i]) r -= MOVE_PICK[i++];
    if (typeof gm === 'number') i = Math.min(gm, moves - 1);
    const cost = Math.max(1, Math.round((4 + m.star / 2 + i * (4 + m.star / 2)) * g * (1 - (st.mpCost + st.mpSave) / 100)));
    if (S.mp < cost && gm == null) bLine(`내력이 모자라 ${MOVE_NAME[i]}${i === 2 ? '를' : '을'} 펼치지 못했습니다.`, 'muted');
    else {
      S.mp = Math.max(0, S.mp - cost);                         // GM 초식 시험 중에는 내력이 모자라도 펼친다
      comboDone = true;
      const sc = M.stances[i];
      const ok = playerHit(b, mults[i], { title: stanceCall(i, sc.name), cls: `m${i + 1}`, banner: (i === 2 ? '奧義 · ' : '') + stanceShort(sc.name), w: M.weapon, n: i + 1, mid: id,
        critUp: (M.chainCrit || 0) * (b.moveRow || 0), weaken: M.weaken, stanceBleed: M.stanceBleed });
      b.moveRow = ok ? (b.moveRow || 0) + 1 : 0;                // 초식이 잇달아 맞을수록 치명 상승 (chainCrit 무공)
    }
  }
  if (!comboDone) playerHit(b, 1, { desc: '⚔️ 평타(平打) — ' + STANCE_DEFAULT.basic });
}

/* 적의 공격: 회피 → 반격(반격 스탯 확률로 흘리고 되받아침) → 피격. 연격 요수는 hits번 (두 번째부터 위력 60%) */
function enemyTurn(b) {
  const e = b.e, st = b.st, A = b.aff || NO_AFF;
  const hitChance = Math.max(40, 95 - st.eva) + A.foeHit + (e.acc || 0);
  const hits = e.hits || 1;
  if (e.stunned) { e.stunned = false; bLine(`${josa(e.name, '이가')} 충격에서 헤어나지 못해 공격하지 못합니다.`, 'log-stance-desc'); return; }
  bLine(`${josa(e.name, '이가')} ${e.atkText || FOE_ATK_TEXT[e.wtype || 'none']}!`, 'log-stance-desc foe');
  let hitAny = false;
  for (let h = 0; h < hits && S.hp > 0; h++) {
    if (h > 0) bLine(`<b class="crit">연격!</b> 숨 돌릴 틈도 없이 ${h + 1}번째 공격이 이어집니다.`, 'log-stance-desc foe');
    // 1) 회피 성공: 피해 0 (경공 지문)
    if (Math.random() * 100 >= hitChance) {
      const G = MANUALS[S.active.gyeonggong], sc = G && G.stances && G.stances[0];
      bLine(`${sc ? stanceCall(0, sc.name) + ' ' : ''}공격을 비스듬히 흘려냈습니다! <span class="dmg">(회피)</span>`, 'log-stance-result dodge');
      if (b.fx) b.fx.push({ side: 'me', t: '회피!', k: 'dodge' });
      continue;
    }
    // 2) 피격
    // 방어가 높아도 공격력의 20%는 그대로 들어온다 (안전지대 방지)
    let dmg = Math.max(1, Math.round(Math.max(dmgCalc(e.atk, Math.max(0, st.def - (e.pierce || 0))), e.atk * COMBAT_RULES.minDmg) * A.taken * (h > 0 ? 0.6 : 1)));
    const crit = Math.random() * 100 < Math.max(0, (e.crit || 8) - st.critRes / 2);
    if (crit) dmg = Math.round(dmg * 1.5);
    dmg = Math.max(1, Math.round(dmg * (1 - (b.realm || 0) * COMBAT_RULES.realm.step) * (1 - schoolEdge(mySchool(), e.school) * SCHOOL_RULES.edge)));   // 경지 압제 · 정마사 상성
    if (st.block && Math.random() * 100 < st.block) {                                       // 막기: 일부만 받는다
      dmg = Math.max(1, Math.round(dmg * (1 - COMBAT_RULES.blockCut)));
      bLine(`🛡 막기! 팔을 세워 공격을 받아 냅니다. (피해 -${COMBAT_RULES.blockCut * 100}%)`, 'log-stance-desc aff-up');
    }
    if (b.shield > 0) {                                                                        // 호신강기: 활력보다 먼저 깎인다
      const soak = Math.min(b.shield, dmg); b.shield -= soak; dmg -= soak;
      bLine(`호신강기가 ${fmt(soak)}만큼 막아 냅니다.${b.shield ? '' : ' 호신강기가 흩어졌습니다.'}`, 'log-stance-desc qi');
    }
    if (e.drain && dmg > 0) e.hpNow = Math.min(e.hp, e.hpNow + Math.round(dmg * e.drain / 100));   // 요수 흡혈
    S.hp = Math.max(0, S.hp - dmg);
    b.lastBlow = crit ? 'crit' : h > 0 ? 'combo' : A.el < 0 ? 'elem' : dmg >= st.maxHp * 0.2 ? 'heavy' : 'grind';
    hitAny = true;
    if (b.fx) b.fx.push({ side: 'me', t: `-${fmt(dmg)}`, k: crit ? 'crit' : 'hit', big: crit || dmg >= st.maxHp * 0.2 });
    const [, , cls] = reaction(dmg, st.maxHp);
    const feel = { h1: '살짝 스쳤습니다.', h2: '살갗이 찢어집니다.', h3: '뼈가 울립니다!', h4: '입가로 피가 흐릅니다!', h5: '기혈이 뒤집힙니다!' }[cls];
    bLine(`${crit ? '<b class="crit">회심의 일격!</b> ' : ''}${feel} <span class="dmg">(활력 -${fmt(dmg)})</span>`, 'log-stance-result taken');
    if (b.dot && S.hp > 0) { if (e.poison) addDot(b, 'me', 'poison', e.poison); if (e.bleed) addDot(b, 'me', 'bleed', e.bleed); }
  }
  // 3) 한 번이라도 맞았으면 반격 판정 (회피만 했으면 반격 없음)
  if (hitAny && S.hp > 0 && Math.random() * 100 < st.counter) playerHit(b, 1.0, { title: '【 반격(反擊) !! 】', desc: '{attacker}{이가} 맞은 틈을 파고들어 되받아친다!', cls: 'counter', banner: '반격(反擊)' });
}

function winBattle(b) {
  notify.trace('battle', `승리: ${b.eid} · ${b.round}합`);
  b.over = true; b.win = true;
  const E = ENEMIES[b.eid];
  bLine(`🏆 ${josa(E.name, '을를')} 쓰러뜨렸습니다!`, 'win');
  if (b.sim) return;                                        // 심상수련장: 보상 없음
  S.bestiary[b.eid].kills++;
  const R = EXPEDITION.rewardMult;                           // 원정 보상 배율 (1/10)
  // 두목은 처음 한 번만 두목 보상. 다시 잡으면 그 탐험지 9단계 일반 요수와 같은 수련치 · 은자 · 드랍 (10월 3일 유저)
  const again = E.boss && S.flags[E.boss], Zb = again && Object.values(ZONES).find(z => z.boss === b.eid);
  const rid = Zb ? Zb.enemies[Zb.enemies.length - 1] : b.eid, RE = ENEMIES[rid] || E, rBoss = !!E.boss && !again;
  if (E.xp) { const fin = b.finisher ? COMBAT_RULES.finisherExp : 1; b.exp = Math.round(expGain(RE.xp, b.st) * EXPEDITION.expMult * fin); S.exp += b.exp; if (b.exp) bLine(`수련치 +${fmt(b.exp)}${fin > 1 ? ` <small>(초식으로 마무리 +${Math.round((fin - 1) * 100)}%)</small>` : ''}`, 'loot'); }
  b.silver = Math.round(rint(...RE.silver) * R); S.silver += b.silver;
  if (b.silver) bLine(`${hlSilver(b.silver)} 획득`, 'loot');
  // 이 적에게 귀속된 드랍 테이블만 순회한다
  const luck = 1 + (b.st.luck || 0) / 100;                    // 기연: 드랍 확률 배율
  if (!HUMANOID.has(b.eid)) { let q = foeRealm(b.eid) + ((E.tier || 0) >= 4 ? 1 : 0) + (rBoss ? 1 : 0); if (Math.random() * 100 < (b.st.luck || 0)) q++; const nd = NAEDAN[Math.min(NAEDAN.length - 1, q)]; if (give(nd, 1, true)) bLine(`${ITEMS[nd].icon} ${hlItem(ITEMS[nd].name)} 획득`, 'loot'); }   // 내단
  for (const [id, p] of DROPS[rid] || []) if (Math.random() < (rBoss ? p : p * EXPEDITION.dropMult) * luck) { if (give(id, 1, true)) bLine(`${ITEMS[id].icon} ${hlItem(ITEMS[id].name)} 획득`, 'loot'); }
  if (RE.gear && Math.random() < RE.gear[1] * EXPEDITION.gearMult * luck) {
    const it = dropGear(RE.gear[0], rollDropRarity(rBoss));
    if (giveGear(it, true)) bLine(`🗡️ [${RARITY[it.rarity].name}] ${hlItem(it.name)} 획득`, 'loot');
  }
  if (b.bonus) { bLine(`📜 ${b.bonus.text}`, 'gold'); for (const g of applyFx(b.bonus.fx || {})) bLine(`↳ ${hlItem(g)}`, 'loot'); }
  S.kills++;
  if (E.boss && !S.flags[E.boss]) {
    S.flags[E.boss] = true;
    const reward = { boss1: 100, boss2: 200, boss3: 300 }[E.boss];
    S.contrib += reward;
    const msgs = {
      boss1: '적염 호랑이가 쓰러지자 청풍산에 고요가 찾아왔습니다. 염화채로 가는 길이 열렸습니다.',
      boss2: '염화채주 적패천이 무릎을 꿇었습니다. 염화채의 불길이 잦아듭니다. 수룡방으로 가는 길이 열렸습니다.',
      boss3: '수룡방주 벽해룡이 호수 속으로 가라앉았습니다. 수룡방이 무너졌습니다. 이제 대성만이 남았습니다.',
    };
    bLine(msgs[E.boss], 'gold');
    notify.banner('頭目討伐 · 두목 토벌', `${E.name}`, 'seal');
    bLine(`${hlContrib('+' + reward)}`, 'gold');
  }
}

function loseBattle(b) {
  notify.trace('battle', `패배: ${b.eid} · ${b.round}합`);
  b.over = true; b.win = false;
  b.cause = DEFEAT_CAUSE[b.lastBlow || 'grind'];
  bLine(`💀 무릎이 꺾입니다… — ${b.cause}`, 'bad');
}

/* ───────── 심상수련장: 만나 본 요수와 기력 소모 없이 겨룬다 ─────────
   활력·내력은 가득 찬 상태로 시작하고, 끝나면 원래대로 돌린다. 보상·도감·기록에 남지 않는다. */
function simulate(eid) {
  if (!(S.bestiary || {})[eid]) { notify.toast('아직 만나 본 적 없는 상대입니다.'); return null; }
  const keep = { hp: S.hp, mp: S.mp }, st = calcStats();
  S.hp = st.maxHp; S.mp = st.maxMp;
  try { return fight(eid, { sim: true }); } finally { S.hp = keep.hp; S.mp = keep.mp; }
}
function simulateMany(eid, n = 10) {
  const out = { eid, n, wins: 0, rounds: 0, hpLeft: 0, draws: 0 };
  for (let i = 0; i < n; i++) {
    const b = simulate(eid); if (!b) return null;
    if (b.win) { out.wins++; out.hpLeft += b.rounds[b.rounds.length - 1].me.hp / b.start.me.maxHp; } else if (b.fled) out.draws++;
    out.rounds += b.rounds.length;
  }
  out.rounds = Math.round(out.rounds / n * 10) / 10; out.hpLeft = out.wins ? Math.round(out.hpLeft / out.wins * 100) : 0;
  return out;
}
