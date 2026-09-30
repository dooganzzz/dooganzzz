/* [시스템] 연무장: 수련 카운트업, 성(星) 경험치, 관문·경계 돌파 (DOM 조작 금지) */

/* 진행 속도 (기본 효율 기준)
   1~5성 (입문)  : 성당 수련 8시간 · 실전 승리 10회 → 5성이 차면 소성 관문
   6~11성 (소성) : 성당 수련 16시간 · 실전 승리 20회 → 11성이 차면 대성 관문
   12성 (대성)   : 수련 완성, 분류별 극의 패시브 개방 */
const segOf = star => star <= 5 ? 0 : 1;
function trainHours(star) { return star <= 5 ? 8 : 16; }

function trainRate(id, st) {
  const m = S.manuals[id]; if (!m || m.star >= MAX_STAR) return 0;
  return trainBonus(st);
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
      if (!m.gate) { m.gate = true; log(`《${M.name}》 ${m.star}성이 가득 찼습니다. ${GATE_NAME[m.star]}에 막혔습니다. ${ITEMS[GATES[m.star]].name}${jo(ITEMS[GATES[m.star]].name, '을를')} 복용하면 뚫을 수 있습니다.`, 'gold'); notify.toast(`${M.name} — ${GATE_NAME[m.star]}`); }
      break;
    }
    m.cxp -= nc; m.txp -= nt; m.star++;
    log(`《${M.name}》 ${m.star}성에 올랐습니다!`, 'good');
    notify.toast(`${M.name} ${m.star}성!`);
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
  if (m.star === 6) { log(`✨ 《${M.name}》 소성(小成) — 장착 능력치 30% 상향${M.cat === 'mugong' ? ', 초식 위력 25% 상향' : ''}.`, 'gold'); notify.banner('小成 · 소성', `《${M.name}》 6성`, 'jade'); }
  if (m.star === MAX_STAR) { log(`🌟 《${M.name}》 대성(大成 / 極意) — ${DAESUNG_PASSIVE[M.cat].text}`, 'gold'); notify.banner('大成 · 대성', `《${M.name}》 극의(極意)`, 'gold'); }
  notify.toast(`${M.name} ${m.star}성 돌파!`);
  tryStar(id);
  return true;
}

function unlockedMoves(star) { return star >= 8 ? 3 : star >= 4 ? 2 : 1; }
function bestMugongStar() { return Math.max(0, ...Object.entries(S.manuals).filter(([id]) => MANUALS[id].cat === 'mugong').map(([, m]) => m.star)); }

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
  if (!id) { notify.toast('먼저 상태 탭의 무공에서 비급을 장착하십시오.'); return; }
  if (S.activeTrainingSkillId === id) {
    S.activeTrainingSkillId = null;
    log(`《${MANUALS[id].name}》 수련을 멈추고 눈을 뜹니다.`, 'muted');
  } else {
    if (S.manuals[id].star >= MAX_STAR) { notify.toast('이미 대성한 비급입니다.'); return; }
    S.activeTrainingSkillId = id;
    log(`가부좌를 틀고 《${MANUALS[id].name}》 폐관수련에 들어갑니다.`, 'muted');
  }
  notify.refresh();
}
