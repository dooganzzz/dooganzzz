/* [시스템] 3초 주기 자동 전투: 명중·치명·회피→반격 분기, 승패 정산 (DOM 조작 금지) */

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
  RT.battle = { eid, e: { ...E, hpNow: E.hp }, lines: [], over: false, round: 0, st: calcStats(), fx: [], prev: { me: S.hp, foe: E.hp } };
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
  notify.view({ tab: 'field' });
  notify.refresh();
  RT.btimer = setInterval(battleRound, BATTLE_MS);
}

function stopBattleTimer() { if (RT.btimer) { clearInterval(RT.btimer); RT.btimer = null; } }

/* 전투 로그는 전투 창과 견문록에 함께 남긴다 */
function bLine(text, cls = '') { RT.battle.lines.push({ text, cls }); log(text, 'battle ' + cls); }

function battleRound() {
  const b = RT.battle;
  if (!b || b.over) { stopBattleTimer(); return; }
  b.round++;
  b.prev = { me: S.hp, foe: b.e.hpNow };
  b.fx = [];
  b.st = calcStats();
  const order = b.st.spd >= b.e.spd ? ['me', 'foe'] : ['foe', 'me'];
  for (const who of order) {
    if (b.over) break;
    if (who === 'me') playerAttack(b); else enemyTurn(b);
    checkEnd(b);
  }
  if (!b.over) S.mp = Math.min(b.st.maxMp, S.mp + b.st.mpRegen);
  else stopBattleTimer();
  notify.battle();
}

function checkEnd(b) {
  if (b.over) return;
  if (b.e.hpNow <= 0) winBattle(b);
  else if (S.hp <= 0) loseBattle(b);
}

function playerHit(b, mult, text) {
  const e = b.e, st = b.st;
  const hitChance = Math.max(55, 95 - e.eva);
  const mv = (text.match(/【(.+?)】/) || [])[1];
  if (mv && b.fx) b.fx.push({ side: 'banner', t: mv, k: /반격/.test(mv) ? 'counter' : 'move' });
  if (Math.random() * 100 >= hitChance) { bLine(`${text} — ${josa(e.name, '이가')} 몸을 틀어 피했습니다. 허공을 가릅니다.`, 'miss'); if (b.fx) b.fx.push({ side: 'foe', t: '빗나감', k: 'miss' }); return false; }
  let dmg = dmgCalc(st.atk, e.def) * mult;
  const crit = Math.random() * 100 < st.crit;
  if (crit) dmg *= 1.6;
  dmg = Math.round(dmg);
  e.hpNow = Math.max(0, e.hpNow - dmg);
  if (b.fx) b.fx.push({ side: 'foe', t: `-${fmt(dmg)}`, k: crit ? 'crit' : 'hit', big: crit || dmg >= e.hp * 0.2 });
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
  if (Math.random() * 100 >= hitChance) { bLine(`${e.name}의 공격을 비스듬히 흘려냈습니다!`, 'dodge'); if (b.fx) b.fx.push({ side: 'me', t: '회피!', k: 'dodge' }); return; }
  // 2) 회피 실패: 피격 후에만 반격 판정
  let dmg = dmgCalc(e.atk, st.def);
  const crit = Math.random() * 100 < Math.max(0, 8 - st.critRes / 2);
  if (crit) dmg = Math.round(dmg * 1.5);
  S.hp = Math.max(0, S.hp - dmg);
  if (b.fx) b.fx.push({ side: 'me', t: `-${fmt(dmg)}`, k: crit ? 'crit' : 'hit', big: crit || dmg >= st.maxHp * 0.2 });
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
  if (b.bonus) { bLine(`📜 ${b.bonus.text}`, 'gold'); applyFx(b.bonus.fx || {}); }
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
    notify.banner('頭目討伐 · 두목 토벌', `${E.name}`, 'seal');
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
  const b = RT.battle; if (!b || !b.over) return;
  stopBattleTimer();
  RT.battle = null;
  if (!b.win) {
    S.zone = null;
    S.hp = Math.max(1, Math.round(calcStats().maxHp * 0.1));
    notify.view({ tab: 'yard' });
  }
  notify.save(); notify.refresh();
}

function battleItem(id) {
  const b = RT.battle; if (!b || b.over || !has(id)) return;
  useItem(id, true);
  b.lines.push({ text: `${ITEMS[id].icon} ${ITEMS[id].name}${jo(ITEMS[id].name, '을를')} 삼켰습니다.`, cls: 'good' });
  notify.battle();
}
