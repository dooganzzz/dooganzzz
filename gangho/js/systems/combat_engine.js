/* [시스템] 자동 전투: 한 판을 끝까지 계산하고 합마다 기록을 남긴다 (리플레이용). 명중·치명·회피→반격 분기, 승패 정산 (DOM 조작 금지) */

/* ───────── 전투 (턴제) ───────── */
function dmgBase(atk, def) { return (atk * atk) / (atk + def); }
function dmgCalc(atk, def) { return Math.max(1, Math.round(dmgBase(atk, def) * rnd(0.9, 1.1))); }
function reaction(dmg, maxHp) { const r = dmg / maxHp; return HIT_TEXT.find(([t]) => r >= t); }

/* 종합 전투력 (정수). 능력치는 calcStats 합계를 쓰므로 장비·무공·무신상·영약·버프가 모두 반영된다.
   player는 저장 상태 S (관리자 창에서는 받은 복사본). 다른 객체를 넘기면 그 상태로 잠시 바꿔 계산한다. */
function combatPowerParts(player = S) {
  if (!player) return { base: 0, gear: 0, arts: 0, total: 0 };
  const prev = S; S = player;
  try {
    const st = calcStats(), W = CP_WEIGHTS;
    const base = st.maxHp * W.maxHp + st.maxMp * W.maxMp;
    const gear = st.atk * W.atk + st.def * W.def;
    const arts = CAT_ORDER.reduce((a, c) => { const id = S.active[c], m = id && S.manuals[id]; return a + (m ? GRADES[MANUALS[id].grade].mult * m.star * W.art : 0); }, 0);
    return { base: Math.round(base), gear: Math.round(gear), arts: Math.round(arts), total: Math.round(base + gear + arts) };
  } finally { S = prev; }
}
function calculateCombatPower(player = S) { return combatPowerParts(player).total; }

/* ───────── 3대 상성 (오행 · 병기) ───────── */
function myElem() { const id = S.active.gigong; return (id && MANUALS[id] && MANUALS[id].elem) || null; }
function elemRel(a, b) { if (!a || !b) return 0; return ELEM_BEATS[a] === b ? 1 : ELEM_BEATS[b] === a ? -1 : 0; }
function weaponRel(a, b) { if (!a || !b) return 0; return (WEAPON_ADV[WEAPON_CLASS[a]] || {})[WEAPON_CLASS[b]] || 0; }
/* 나와 적 사이의 상성. dealt: 내가 주는 피해 배율 · taken: 내가 받는 피해 배율 · myHit/foeHit: 명중 보정(%p) */
function affinity(eid, st = calcStats()) {
  const E = ENEMIES[eid], me = myElem(), wt = weaponType(), A = AFFINITY;
  const el = elemRel(me, E.elem), wp = weaponRel(wt, E.wtype);
  const up = A.elem + (st.elem || 0) / 100;                   // 지력: 내가 극할 때 오행술 위력
  return {
    el, wp, me, foe: E.elem, wt, fwt: E.wtype || null,
    dealt: (el > 0 ? 1 + up : el < 0 ? 1 - A.elem : 1) * (wp > 0 ? 1 + A.weapAtk : wp < 0 ? 1 - A.weapDown : 1),
    taken: (el > 0 ? 1 - A.elem : el < 0 ? 1 + Math.max(0, A.elem - (st.elemRes || 0) / 100) : 1) * (wp < 0 ? 1 + A.weapAtk : wp > 0 ? 1 - A.weapDown : 1),
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
  return `오행 ${elem} · 병기 ${weap}`;
}

function sense(eid) {
  const E = ENEMIES[eid], st = calcStats(), a = affinity(eid, st);
  const myTurns = E.hp / (dmgBase(st.atk, E.def) * 1.3 * a.dealt);
  const foeTurns = st.maxHp / Math.max(1, dmgBase(E.atk, st.def) * a.taken * (1 - st.eva / 100));
  const ratio = (foeTurns / myTurns) * (st.spd / E.spd);
  return SENSE_TEXT.find(([t]) => ratio >= t);
}

/* 한 판을 끝까지 계산한다. 속도가 빠른 쪽이 먼저 치고, 합마다 대사·연출·양쪽 활력을 기록해 두면
   화면(관찰하기)이 그 기록을 그대로 다시 튼다. opts.bonus: 기연 전투에서 이기면 받는 추가 보상
   opts.sim: 심상수련장의 가상 전투 (보상·기록·소모 없음. 금창약은 가진 만큼 가상으로 쓴다) */
function fight(eid, opts = {}) {
  const E = ENEMIES[eid], st = calcStats();
  const b = { eid, name: E.name, boss: !!E.boss, e: { ...E, hpNow: E.hp }, over: false, win: false, round: 0, st, lines: [], fx: [], bonus: opts.bonus || null,
    start: { me: { hp: S.hp, mp: S.mp, maxHp: st.maxHp, maxMp: st.maxMp }, foe: { hp: E.hp, maxHp: E.hp } }, rounds: [], exp: 0, silver: 0, sim: !!opts.sim, pots: opts.sim ? count('potionHp') : 0, aff: affinity(eid, st) };
  RT.battle = b;
  if (!b.sim) { const bs = S.bestiary = S.bestiary || {}; (bs[eid] = bs[eid] || { met: 0, kills: 0 }).met++; }   // 요수 도감
  notify.trace('battle', `조우: ${eid} (${E.name}) · 활력 ${Math.round(S.hp)}`);
  bLine(`⚔️ ${josa(E.name, '이가')} 모습을 드러냈습니다!`, 'head');
  const [, stext, scls] = sense(eid);
  bLine(stext, 'sense ' + scls);
  if (E.boss) {
    const quotes = { redTiger: '붉은 갈기의 호랑이가 낮게 으르렁거리자, 숲 전체가 숨을 죽입니다.', jeokyeom: '적염도: "청풍문? 그 거지 문파에서 아직 사람이 나오나?"', galcheon: '갈천: "물 위에서 나를 이긴 자는 없다. 뭍에서도 마찬가지고."' };
    bLine(quotes[eid], 'npc');
  }
  bLine(`☯ 상성 — ${affinityText(b.aff)}`, 'aff');
  const Q = MANUALS[S.active.gigong];
  if (Q && Q.stances) bLine(stanceFill(Q.stances[0].desc, stanceVars(b)), 'log-stance-desc qi');
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

/* 전투 기록 한 줄 (견문록이 아니라 전투 기록에만 남는다) */
function bLine(text, cls = '') { RT.battle.lines.push({ text, cls }); }

function battleRound(b) {
  b.round++;
  b.lines = []; b.fx = [];
  b.st = calcStats();
  autoPotion(b);
  const order = b.st.spd >= b.e.spd ? ['me', 'foe'] : ['foe', 'me'];
  for (const who of order) {
    if (b.over) break;
    if (who === 'me') playerAttack(b); else enemyTurn(b);
    checkEnd(b);
  }
  if (!b.over) S.mp = Math.min(b.st.maxMp, S.mp + b.st.mpRegen);
  b.rounds.push({ lines: b.lines, fx: b.fx, me: { hp: Math.round(S.hp), mp: Math.round(S.mp) }, foe: Math.round(b.e.hpNow) });
}

/* 활력이 바닥나면 제자가 알아서 금창약을 먹는다 */
function autoPotion(b) {
  if (S.hp >= b.st.maxHp * EXPEDITION.potionAt || (b.sim ? b.pots <= 0 : !has('potionHp'))) return;
  const v = Math.round(b.st.maxHp * ITEMS.potionHp.use.hp * (1 + (talentOf().potion || 0)));   // 의술: 금창약 회복 +30%
  if (b.sim) b.pots--; else take('potionHp', 1); S.hp = Math.min(b.st.maxHp, S.hp + v);
  bLine(`🩹 숨을 고르며 금창약을 삼켰습니다. <span class="heal">활력 +${fmt(v)}</span>`, 'good');
  b.fx.push({ side: 'me', t: `+${fmt(v)}`, k: 'heal' });
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
/* 한 번의 타격. o: { title, desc, cls, banner } (문자열이면 지문만) */
function playerHit(b, mult, o) {
  if (typeof o === 'string') o = { desc: o };
  const e = b.e, st = b.st, A = b.aff || NO_AFF, v = stanceVars(b);
  const hitChance = Math.max(55, 95 - e.eva) + A.myHit;
  if (o.banner && b.fx) b.fx.push({ side: 'banner', t: o.banner, k: o.cls === 'counter' ? 'counter' : 'move' });
  if (o.title) bLine(o.title, `log-stance-title ${o.cls || ''}`);
  bLine(stanceFill(o.desc, v), 'log-stance-desc');
  if (A.wp > 0 && !b.affSaid) { b.affSaid = true; bLine('[상성 우위] 병기의 이점을 살린 궤적이 적의 빈틈을 파고든다!', 'log-stance-desc aff-up'); }
  if (Math.random() * 100 >= hitChance) {
    bLine(`${josa(e.name, '이가')} 몸을 틀어 궤적을 벗어났다. 허공만 가른다. <span class="dmg">(빗나감)</span>`, 'log-stance-result miss');
    if (b.fx) b.fx.push({ side: 'foe', t: '빗나감', k: 'miss' });
    return false;
  }
  let dmg = dmgCalc(st.atk, e.def) * mult * A.dealt;
  const crit = Math.random() * 100 < st.crit;
  if (crit) dmg *= 1.6;
  dmg = Math.round(dmg);
  e.hpNow = Math.max(0, e.hpNow - dmg);
  if (b.fx) b.fx.push({ side: 'foe', t: `-${fmt(dmg)}`, k: crit ? 'crit' : 'hit', big: crit || dmg >= e.hp * 0.2 });
  const [, txt, cls] = reaction(dmg, e.hp);
  bLine(`${crit ? '<b class="crit">회심의 일격!</b> 급소를 정확히 꿰뚫었다! ' : ''}${josa(e.name, '이가')} ${txt} <span class="dmg">(-${fmt(dmg)})</span>`, `log-stance-result ${cls}${crit ? ' crit' : ''}`);
  if (st.lifesteal) S.hp = Math.min(st.maxHp, S.hp + Math.round(dmg * st.lifesteal / 100));
  return true;
}

function playerAttack(b) {
  const st = b.st, id = S.active.mugong, M = MANUALS[id], m = S.manuals[id];
  const canCombo = !!M && M.weapon === weaponType();
  let comboDone = false;
  b.affSaid = false;                                        // 상성 우위 지문은 한 턴에 한 번
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
      const sc = M.stances[i];
      const ok = playerHit(b, mults[i], { title: `【 ${M.name} - ${sc.name} !! 】`, desc: sc.desc || STANCE_DEFAULT[M.weapon][i], cls: `m${i + 1}`, banner: sc.name });
      if (!ok || b.e.hpNow <= 0) break;
    }
  }
  if (!comboDone) playerHit(b, 1, { desc: '⚔️ 평타(平打) — ' + STANCE_DEFAULT.basic });
}

/* 적의 공격: 회피 → 반격(반격 스탯 확률로 흘리고 되받아침) → 피격 */
function enemyTurn(b) {
  const e = b.e, st = b.st, A = b.aff || NO_AFF;
  const hitChance = Math.max(40, 95 - st.eva) + A.foeHit;
  bLine(`${josa(e.name, '이가')} ${e.atkText || FOE_ATK_TEXT[e.wtype || 'none']}!`, 'log-stance-desc foe');
  // 1) 회피 성공: 피해 0, 반격 판정 없이 적 턴 종료 (경공 지문)
  if (Math.random() * 100 >= hitChance) {
    const G = MANUALS[S.active.gyeonggong], sc = G && G.stances && G.stances[0];
    bLine(`${sc ? stanceFill(sc.desc, stanceVars(b)) + ' ' : ''}공격을 비스듬히 흘려냈습니다! <span class="dmg">(회피)</span>`, 'log-stance-result dodge');
    if (b.fx) b.fx.push({ side: 'me', t: '회피!', k: 'dodge' });
    return;
  }
  // 2) 회피 실패: 피격 후에만 반격 판정
  let dmg = Math.max(1, Math.round(dmgCalc(e.atk, st.def) * A.taken));
  const crit = Math.random() * 100 < Math.max(0, 8 - st.critRes / 2);
  if (crit) dmg = Math.round(dmg * 1.5);
  S.hp = Math.max(0, S.hp - dmg);
  if (b.fx) b.fx.push({ side: 'me', t: `-${fmt(dmg)}`, k: crit ? 'crit' : 'hit', big: crit || dmg >= st.maxHp * 0.2 });
  const [, , cls] = reaction(dmg, st.maxHp);
  const feel = { h1: '살짝 스쳤습니다.', h2: '살갗이 찢어집니다.', h3: '뼈가 울립니다!', h4: '입가로 피가 흐릅니다!', h5: '기혈이 뒤집힙니다!' }[cls];
  bLine(`${crit ? '<b class="crit">회심의 일격!</b> ' : ''}${feel} <span class="dmg">(활력 -${fmt(dmg)})</span>`, 'log-stance-result taken');
  if (S.hp > 0 && Math.random() * 100 < st.counter) playerHit(b, 1.0, { title: '【 반격(反擊) !! 】', desc: '{attacker}{이가} 맞은 틈을 파고들어 되받아친다!', cls: 'counter', banner: '반격(反擊)' });
}

function winBattle(b) {
  notify.trace('battle', `승리: ${b.eid} · ${b.round}합`);
  b.over = true; b.win = true;
  const E = ENEMIES[b.eid];
  bLine(`🏆 ${josa(E.name, '을를')} 쓰러뜨렸습니다!`, 'win');
  if (b.sim) return;                                        // 심상수련장: 보상 없음
  S.bestiary[b.eid].kills++;
  if (E.xp) { b.exp = expGain(E.xp, b.st); S.exp += b.exp; bLine(`경험치 +${fmt(b.exp)}`, 'loot'); }
  b.silver = rint(...E.silver); S.silver += b.silver;
  bLine(`${hlSilver(b.silver)} 획득`, 'loot');
  // 이 적에게 귀속된 드랍 테이블만 순회한다
  for (const [id, p] of E.drops) if (Math.random() < p + (talentOf().drop || 0)) { if (give(id, 1, true)) bLine(`${ITEMS[id].icon} ${hlItem(ITEMS[id].name)} 획득`, 'loot'); }
  if (E.gear && Math.random() < E.gear[1]) {
    const it = dropGear(E.gear[0], rollDropRarity(!!E.boss));
    if (giveGear(it, true)) bLine(`🗡️ [${RARITY[it.rarity].name}] ${hlItem(it.name)} 획득`, 'loot');
  }
  if (b.bonus) { bLine(`📜 ${b.bonus.text}`, 'gold'); for (const g of applyFx(b.bonus.fx || {})) bLine(`↳ ${hlItem(g)}`, 'loot'); }
  S.kills++;
  progressMission(b.eid);
  if (E.boss && !S.flags[E.boss]) {
    S.flags[E.boss] = true;
    const reward = { boss1: 100, boss2: 200, boss3: 300 }[E.boss];
    S.contrib += reward;
    const msgs = {
      boss1: '적염 호랑이가 쓰러지자 청풍산에 고요가 찾아왔습니다. 염화채로 가는 길이 열렸습니다.',
      boss2: '채주 적염도가 무릎을 꿇었습니다. 염화채의 불길이 잦아듭니다. 적룡방으로 가는 길이 열렸습니다.',
      boss3: '방주 갈천이 강물 속으로 가라앉았습니다. 적룡방이 무너졌습니다. 이제 대성만이 남았습니다.',
    };
    bLine(msgs[E.boss], 'gold');
    notify.banner('頭目討伐 · 두목 토벌', `${E.name}`, 'seal');
    bLine(`${hlContrib('+' + reward)}`, 'gold');
    const mount = SHOP_GEAR.find(g => g.boss === E.boss);
    if (mount && giveGear(shopGear(mount.id), true)) { bLine(`🐴 두목이 부리던 ${hlItem(mount.name)}${jo(mount.name, '을를')} 얻었습니다. 무장에서 탈것으로 착용하십시오.`, 'loot'); }
  }
}

function loseBattle(b) {
  notify.trace('battle', `패배: ${b.eid} · ${b.round}합`);
  b.over = true; b.win = false;
  bLine('💀 무릎이 꺾입니다…', 'bad');
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
