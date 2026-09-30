/* [시스템] 청풍문: 문파 임무·인물(조운·아린·장문인)·장경각·창고·하산 (DOM 조작 금지) */

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
  S.missions.splice(i, 1); ensureMissions(); notify.refresh();
}

function rerollMissions() {
  if (S.silver < 5) { notify.toast('은자가 부족합니다.'); return; }
  S.silver -= 5; S.missions = []; ensureMissions(); log('노벽송이 하품을 하며 새 임무 두루마리를 던져줍니다.', 'npc'); notify.refresh();
}

/* ───────── 인물 ───────── */
function jounSupply() {
  if (S.supplyDay === today()) return;
  S.supplyDay = today(); S.flags.supplied = true;
  log(`조운: "${pick(['오늘 몫이다. 아껴 써라.', '창고 정리하다 나온 거다. 챙겨가.', '산에 들어갈 거면 이 정도는 들고 가야지.'])}"`, 'npc');
  const pool = [...SUPPLY];
  for (let k = 0; k < 3; k++) { const [id, a, b] = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; give(id, rint(a, b)); }
  notify.refresh();
}

function arinSnack() {
  if (S.arin.snack === today()) return;
  S.arin.snack = today();
  give('arinSnack', 1, true);
  log(`아린: "${pick(['사형! 이거 몰래 구운 거예요. 조운 사형한텐 비밀!', '오늘 약과는 꿀을 두 배로 넣었어요!', '헤헤, 수련 힘들죠? 이거 먹어요!'])}" — 🍪 ${hlItem('아린표 약과')}를 받았습니다.`, 'npc');
  notify.refresh();
}

function addHint(r) {
  log(`🔖 ${r.hint}`, 'hint');
  if (!S.codex.includes(r.id)) { S.codex.push(r.id); log(`📖 도감에 「${recipeName(r)}」 조합법이 기록되었습니다.`, 'gold'); }
}

function arinTalk() { log(`아린: "${pick(ARIN_TALK)}"`, 'npc'); }

function rest() {
  if (S.zone) return;
  const st = calcStats();
  S.hp = st.maxHp; S.mp = st.maxMp;
  if (S.restCd <= now()) {
    S.stamina = st.maxSta; S.restCd = now() + REST_CD * 1000;
    log('평상에 드러누워 한숨 푹 잤습니다. 활력·내력·기력이 모두 찼습니다.', 'good');
  } else log('평상에서 숨을 골랐습니다. 활력·내력이 찼습니다. 기력은 조금 더 쉬어야 돌아옵니다.', 'good');
  notify.refresh();
}

function masterHint() {
  const gated = Object.entries(S.manuals).find(([, m]) => m.gate && !has(GATES[m.star]));
  const pill = gated ? GATES[gated[1].star] : QUESTS[questIndex()] && QUESTS[questIndex()][0].includes('소성 돌파단') ? 'pillLow' : null;
  const r = pill && RECIPES.find(x => x.out === pill);
  if (r && !S.codex.includes(r.id)) { addHint(r); notify.refresh(); return; }
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
  notify.refresh();
}

function ownsShop(id) { return S.gear.some(g => g.shop === id) || Object.values(S.equip).some(g => g && g.shop === id); }

function buyBadge(id) {
  const g = SHOP_GEAR.find(x => x.id === id);
  if (!g || !g.cost || S.contrib < g.cost || ownsShop(id)) return;
  if (!giveGear(shopGear(id), true)) return;
  S.contrib -= g.cost;
  log(`${hlItem(g.name)}${jo(g.name, '을를')} 받았습니다. 무장에서 착용하십시오.`, 'good');
  notify.refresh();
}

function canHasan() { return S.flags.boss3 && bestMugongStar() >= 12 && !S.flags.hasan; }

function doHasan() {
  if (!canHasan()) return;
  S.inv.hasanryeong = 1; S.flags.hasan = true;
  log('노벽송이 오래된 목갑에서 누런 종이 한 장을 꺼냅니다.', 'npc');
  log(`노벽송: "청풍문 제자 ${S.name}. 오늘부로 하산을 허한다. 낙양으로 가라. 강호는 넓고, 네 무공은 이제 시작이다."`, 'npc');
  log('📜 낙양성 하산령을 받았습니다! — 제1장 [청풍문 편] 완결', 'gold');
  notify.view({ modal: 'ending' });
  notify.refresh();
}

function buyStore(id) {
  const row = JOUN_SHOP.find(r => r[0] === id); if (!row || S.zone) return;
  if (S.silver < row[1]) { notify.toast('은자가 부족합니다.'); return; }
  if (!give(id, 1, true)) return;
  S.silver -= row[1];
  log(`조운의 창고에서 ${hlItem(ITEMS[id].name)}${jo(ITEMS[id].name, '을를')} ${hlSilver(row[1])}에 샀습니다.`, 'loot');
  notify.refresh();
}

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
