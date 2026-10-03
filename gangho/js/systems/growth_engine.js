/* [시스템] 무공 성장: 탐험에서 모은 수련치로 원하는 비급의 성급을 올린다 (DOM 조작 금지)
   1~5성 입문 → (소성 돌파단) → 6~11성 소성 → (대성 돌파단) → 12성 대성.
   비급마다 따로 쌓이던 수련·실전 수련치는 없다. 수련치는 하나의 주머니(S.exp)에 모인다. */

/* s성 → s+1성에 드는 수련치 (등급 계수 반영) */
function starCost(id) {
  const m = S.manuals[id]; if (!m || m.star >= MAX_STAR) return 0;
  return Math.round(STAR_EXP[m.star - 1] * GRADES[MANUALS[id].grade].mult);
}

/* 올릴 수 없으면 이유를, 올릴 수 있으면 빈 문자열을 돌려준다 */
function starUpBlock(id) {
  const m = S.manuals[id]; if (!m) return '익히지 않은 무공';
  if (m.star >= MAX_STAR) return '대성';
  const pill = GATES[m.star];
  if (S.exp < starCost(id)) return `수련치 ${fmt(starCost(id))} 필요`;
  if (pill && !has(pill)) return `${ITEMS[pill].name} 필요`;
  return '';
}

/* 품계 게이지: 네 자리에 장착한 무공의 성급(최대 12, 빈 자리는 0) — 합 / 48. 장착 무공이 모두 12성이면 다 차고 이류무사 (10월 3일 유저) */
function rankProgress() {
  const per = CAT_ORDER.map(c => { const id = S.active && S.active[c], m = id && S.manuals[id]; return m ? Math.min(MAX_STAR, m.star) : 0; });
  const sum = per.reduce((a, v) => a + v, 0), max = CAT_ORDER.length * MAX_STAR;
  return { per, sum, frac: sum / max, lit: Math.floor(sum / (max / WARRIOR_RANK.lamps)) };   // lit = 켜진 불 수 (24칸)
}
const warriorRank = () => WARRIOR_RANK.ranks[Math.min(S.rank || 0, WARRIOR_RANK.ranks.length - 1)];
/* 돌파: 게이지가 다 차고 파관단이 있으면 삼켜 이류무사가 된다. loud면 모자랄 때 알린다 (성급을 올린 직후) */
function checkRankUp(loud) {
  if ((S.rank || 0) >= 1 || rankProgress().frac < 1) return false;
  const P = WARRIOR_RANK.pill, have = count(P.id);
  if (have < P.n) { if (loud) notify.toast(`장착한 네 무공을 모두 대성했습니다. 이류무사로 돌파하려면 ${ITEMS[P.id].name} ${P.n}알이 필요합니다 (가진 것 ${have}알).`); return false; }
  take(P.id, P.n);
  S.rank = 1; const R = warriorRank();
  log(`🔷 ${ITEMS[P.id].name} ${P.n}알로 끊어지려는 기를 이어 가며 운공을 마쳤습니다 — 장착한 네 무공을 모두 대성하여 ${R.name}로 돌파했습니다! 공격 · 방어 · 활력 · 내력 · 속도 +${Math.round((R.mult - 1) * 100)}%`, 'gold');
  notify.banner(R.name, `전체 능력치 +${Math.round((R.mult - 1) * 100)}%`, 'gold');
  notify.view({ modal: 'rankup' });   // 승급 연출 창
  return true;
}
function starUp(id) {
  const why = starUpBlock(id);
  if (why) { notify.toast(why); return false; }
  const m = S.manuals[id], M = MANUALS[id], cost = starCost(id), pill = GATES[m.star];
  S.exp -= cost;
  if (pill) take(pill, 1);
  m.star++;
  if (pill) {
    log(`${ITEMS[pill].icon} ${ITEMS[pill].name}의 약기운이 기혈을 뚫습니다. 《${M.name}》 ${GATE_NAME[m.star - 1]} 돌파! ${m.star}성. (수련치 -${fmt(cost)})`, 'gold');
    const lines = {
      6: '노벽송: "소성(小成)이로구나. 이제야 무공이 네 몸을 알아보는 게야." — 기본 위력 상향!',
      12: '노벽송: "…대성(大成)이다. 극의에 닿았으니 이 늙은이가 가르칠 건 더 없구나."',
    };
    if (lines[m.star]) log(lines[m.star], 'npc');
  } else log(`《${M.name}》 ${m.star}성에 올랐습니다. (수련치 -${fmt(cost)})`, 'good');
  if (m.star === 6) { log(`✨ 《${M.name}》 소성(小成) — 장착 능력치 30% 상향${M.cat === 'mugong' ? ', 초식 위력 25% 상향' : ''}.`, 'gold'); notify.banner('小成 · 소성', `《${M.name}》 6성`, 'jade'); }
  if (m.star === MAX_STAR) { log(`🌟 《${M.name}》 대성(大成 / 極意) — ${DAESUNG_PASSIVE[M.cat].text}`, 'gold'); notify.banner('大成 · 대성', `《${M.name}》 극의(極意)`, 'gold'); }
  if (M.stances && (m.star === 6 || m.star === MAX_STAR)) { const i = m.star === 6 ? 1 : 2; log(`《${M.name}》 ${MOVE_NAME[i]} 「${M.stances[i].name}」${M.cat === 'mugong' ? '이 열렸습니다' : '의 경지에 올랐습니다'}.`, 'good'); }
  notify.toast(`${M.name} ${m.star}성!`);
  checkRankUp(true);
  notify.trace('sys', `성급: ${id} → ${m.star}성 (수련치 -${cost})`);
  notify.refresh();
  return true;
}

/* 적을 쓰러뜨려 얻는 수련치: 신분패·음식·영단의 '정진' 보정을 곱한다 */
function expGain(base, st) { st = st || calcStats(); return Math.round(base * (1 + st.train / 100 + st.trainBuff)); }

/* 공격 무공 초식: 비급을 익히면 제1초식, 소성(6성)에 제2초식, 대성(12성)에 오의(奧義) */
function unlockedMoves(star) { return star >= MAX_STAR ? 3 : star >= 6 ? 2 : star >= 1 ? 1 : 0; }
const MOVE_NAME = ['제1초식', '제2초식', '오의'];
/* 품계 제한: 이류 비급은 이류무사(S.rank 1)가 되어야 익힌다 */
const manualRankLocked = id => !!MANUALS[id] && MANUALS[id].grade === '이류' && (S.rank || 0) < 1;
const manualSealed = id => !!MANUALS[id] && !OPEN_GRADES.includes(MANUALS[id].grade);   // 1장 봉인 (일류 이상)
function bestMugongStar() { return Math.max(0, ...Object.entries(S.manuals).filter(([id]) => MANUALS[id].cat === 'mugong').map(([, m]) => m.star)); }
