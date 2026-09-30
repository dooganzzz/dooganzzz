/* [시스템] 청풍문: 문파 임무·인물(조운·아린·장문인)·장경각·창고·하산 (DOM 조작 금지) */

/* ───────── 문파 임무 ───────── */
function genMission() {
  const zid = pick(ZONE_ORDER.filter(zoneUnlocked)), Z = ZONES[zid];
  if (Math.random() < 0.55) {
    const eid = pick(Z.enemies), E = ENEMIES[eid], n = rint(3, 6);
    return { type: 'kill', target: eid, n, prog: 0, contrib: Math.round(E.xp * n * 0.4 + 10), silver: Math.round(E.xp * n * 0.3), zone: zid };
  }
  const id = pick(Z.mats), n = rint(2, 5);
  return { type: 'deliver', target: id, n, prog: 0, contrib: Math.round(ITEMS[id].price * n + 10), silver: Math.round(ITEMS[id].price * n), zone: zid };
}

function ensureMissions() { while (S.missions.length < 3) S.missions.push(genMission()); }
function progressMission(target) { for (const m of S.missions) if (m.type === 'kill' && m.target === target && m.prog < m.n) m.prog++; }
function missionReady(m) { return m.type === 'kill' ? m.prog >= m.n : has(m.target, m.n); }

function completeMission(i) {
  const m = S.missions[i]; if (!m || !missionReady(m)) return;
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

function addHint(r) {
  log(`🔖 ${r.hint}`, 'hint');
  if (!S.codex.includes(r.id)) { S.codex.push(r.id); log(`📖 도감에 「${recipeName(r)}」 조합법이 기록되었습니다.`, 'gold'); }
}

function arinTalk() { log(`아린: "${pick(ARIN_TALK)}"`, 'npc'); }

function rest() {
  const st = calcStats();
  S.hp = st.maxHp; S.mp = st.maxMp;
  log('평상에 드러누워 숨을 골랐습니다. 활력·내력이 찼습니다.', 'good');
  notify.refresh();
}

/* 조운(대사형): 문파 안내 전담. 지금 상태를 보고 다음에 할 일을 짚어 준다 (거래는 전방 왕 가) */
function jounGuide() {
  const books = Object.keys(S.inv).filter(k => ITEMS[k].kind === '비급').length;
  const emptySlot = CAT_ORDER.some(c => !S.active[c]) && Object.keys(S.manuals).length;
  const ready = S.missions.filter(missionReady).length;
  const tips = [
    [books, `비급이 ${books}권 있구나. 상태 탭의 무공에서 [ 익히기 ] 해라. 읽기만 해선 소용없다.`],
    [emptySlot, '익힌 무공은 상태 › 무공에서 장착해야 몸에 붙는다. 빈 자리가 있다.'],
    [!(S.expedition && S.expedition.zone), '아직 탐험지를 안 정했구나. 강호행에서 갈 곳을 정해 두면 한 시간마다 알아서 다녀온다.'],
    [Object.keys(S.manuals).some(id => !starUpBlock(id)), '경험치가 쌓였다. 상태 › 무공에서 성급을 올려라. 모아 두기만 하면 소용없다.'],
    [!has('saenghyeol', 3), '생혈고가 떨어져 간다. 탐험 중에 위급하면 그걸 바르니, 화로에서 달이든 전방에서 사든 넉넉히 챙겨라.'],
    [ready, `문파 임무 ${ready}건은 바로 완료할 수 있다. 정청 문파 임무에서 공헌도를 받아 가라.`],
    [S.expeditions && S.expeditions.length && S.expeditions[S.expeditions.length - 1].defeats, '지난 탐험에서 쓰러졌다지? 쓰러질 때마다 기력이 크게 샌다. 탐험지를 낮추든지, 무공과 장비를 더 올려라.'],
    [S.gear.length >= 3, '행낭에 안 쓰는 장비가 쌓였다. 청풍전방 왕 가에게 가면 은자로 바꿔 준다.'],
    [S.silver < 20, '은자가 궁하면 산에 들어가 금고를 열거나, 잡은 짐승 가죽을 전방에 팔아라.'],
  ];
  const hit = tips.find(([c]) => c);
  log(`조운: "${hit ? hit[1] : pick(['필요한 물건은 청풍전방 왕 가에게 사라. 난 장작이나 팬다.', '강호행 들어가기 전에 생혈고는 꼭 챙겨라.', '두목은 무작정 덤빌 상대가 아니다. 기척부터 살펴라.'])}"`, 'npc');
  notify.refresh();
}
function masterHint() {
  const gated = Object.entries(S.manuals).find(([, m]) => GATES[m.star] && !has(GATES[m.star]));   // 돌파단이 필요한 성에 이르렀는데 없을 때
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
  log(`장경각에서 ${hlItem(`《${M.name}》 비급`)}을 받았습니다. 상태 탭의 무공에서 [ 익히기 ] 하십시오.`, 'gold');
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


/* ───────── 순차 가이드 ───────── */
const QUESTS = [
  ['비급 익히고 무공 장착하기', () => CAT_ORDER.every(c => S.active[c]), '상태 탭의 무공에서 비급 네 권을 [ 익히기 ] 한 뒤 각각 장착하십시오.'],
  ['강호행에서 탐험지 정하기', () => !!(S.expedition && S.expedition.zone), '강호행 탭에서 청풍산을 탐험지로 정하십시오. 제자가 곧바로 첫 탐험을 떠나고, 그 뒤로는 한 시간마다 스스로 나갑니다.'],
  ['경험치로 무공 성급 올리기', () => Object.values(S.manuals).some(m => m.star >= 2), '탐험에서 모은 경험치로 상태 › 무공에서 [ 성급 올리기 ]를 누르십시오.'],
  ['조운 대사형에게 오늘의 보급품 받기', () => !!S.flags.supplied, '정청의 조운에게 보급품을 받으십시오.'],
  ['화로에서 소성 돌파단 달이기', () => S.codex.includes('a_low') || bestMugongStar() >= 6, '장문인에게 말을 걸면 귀띔해 줄지도 모릅니다.'],
  ['청풍산 두목 적염 호랑이 토벌', () => !!S.flags.boss1, '탐험 후반에 두목과 마주칩니다. 기척이 너무 무거우면 제자가 알아서 피하니, 더 강해진 뒤 다시 보내십시오.'],
  ['염화채주 적패천 토벌', () => !!S.flags.boss2, '탐험지를 염화채로 바꾸십시오. 산적 연합의 소굴 깊은 곳에 채주가 있습니다.'],
  ['무공 6성 — 소성(小成) 돌파', () => bestMugongStar() >= 6, '5성 무공을 경험치와 소성 돌파단으로 올리십시오.'],
  ['수룡방주 벽해룡 토벌', () => !!S.flags.boss3, '탐험지를 수룡방으로 바꾸십시오.'],
  ['무공 12성 — 대성(大成) 돌파', () => bestMugongStar() >= 12, '11성 무공을 경험치와 대성 돌파단으로 올리십시오.'],
  ['장문인에게 하산령 받기', () => !!S.flags.hasan, '장문인을 찾아가십시오.'],
];

function questIndex() { const i = QUESTS.findIndex(q => !q[1]()); return i < 0 ? QUESTS.length : i; }
