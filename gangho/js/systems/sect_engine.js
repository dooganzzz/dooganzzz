/* [시스템] 청풍문: 문파 임무·인물(조운·아린·장문인)·장경각·창고·하산 (DOM 조작 금지) */

/* ───────── 문파 임무: 토벌만. 해금된 사냥터의 요수를 3~6마리 (강한 요수일수록 적게) ─────────
   공헌 보상은 예전 계산값의 절반. 새 임무 갱신은 10냥부터 한 번 할 때마다 10냥씩 오르고, 매일 자정에 초기화된다 */
const MISSION_N = { 1: [5, 6], 2: [4, 5], 3: [3, 4], 4: [3, 3] };
function genMission() {
  const zid = pick(ZONE_ORDER.filter(zoneUnlocked)), Z = ZONES[zid];
  const eid = pick(Z.enemies), E = ENEMIES[eid], [lo, hi] = MISSION_N[E.tier || 2], n = rint(lo, hi);
  return { type: 'kill', target: eid, n, prog: 0, contrib: Math.floor((E.xp * n * 0.4 + 10) * 0.5), silver: Math.round(E.xp * n * 0.3), zone: zid };
}

function ensureMissions() { while (S.missions.length < 3) S.missions.push(genMission()); }
function progressMission(target) { for (const m of S.missions) if (m.type === 'kill' && m.target === target && m.prog < m.n) m.prog++; }
function missionReady(m) { return m.prog >= m.n; }

function completeMission(i) {
  const m = S.missions[i]; if (!m || !missionReady(m)) return;
  S.contrib += m.contrib; S.silver += m.silver;
  log(`문파 임무 완료! ${hlContrib('+' + m.contrib)}, ${hlSilver(m.silver)}`, 'good');
  S.missions.splice(i, 1); ensureMissions(); notify.refresh();
}

const questDay = (t = now()) => new Date(t).toLocaleDateString('ko-KR');
/* 오늘 새 임무를 받는 값: 10냥 + 오늘 갱신한 횟수 × 10냥 */
function getQuestRefreshCost() { return 10 + (S.questRefreshCount || 0) * 10; }
function rerollMissions() {
  const cost = getQuestRefreshCost();
  if (S.silver < cost) { notify.toast(`은자가 부족합니다. (새 임무 ${cost}냥)`); return; }
  S.silver -= cost; S.questRefreshCount = (S.questRefreshCount || 0) + 1;
  S.missions = []; ensureMissions();
  log(`노벽송이 하품을 하며 새 토벌 임무 두루마리를 던져줍니다. ${hlSilver(-cost)} (다음 갱신 ${getQuestRefreshCost()}냥)`, 'npc'); notify.refresh();
}
/* 자정이 지나면 토벌 임무 3종을 새로 받고 갱신 비용이 10냥으로 돌아간다 */
function checkDailyMidnightReset(t = now()) {
  const today = questDay(t);
  if (S.lastQuestResetDate === today) return false;
  const first = !S.lastQuestResetDate;
  S.lastQuestResetDate = today; S.questRefreshCount = 0;
  if (first) return false;                                   // 처음 기록할 때는 지금 임무를 그대로 둔다
  S.missions = []; ensureMissions();
  log('[문파] 자정이 지나 문파 토벌 임무와 갱신 비용이 초기화되었습니다.', 'npc');
  notify.refresh();
  return true;
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

/* 아린(사매): 죽 한 그릇으로 활력·내력을 모두 채워 준다 (뒷마당 휴식을 대신한다).
   하루 첫 그릇은 공짜, 그 뒤로는 한 그릇에 은자 10냥 */
const ARIN_CARE = 10;
const arinFree = () => S.arinFreeDay !== today();
function arinCare() {
  const free = arinFree();
  if (!free && S.silver < ARIN_CARE) { log(`아린: "사형, 쌀값은 받아야죠… 은자 ${ARIN_CARE}냥이에요. 헤헤."`, 'npc'); return false; }
  const st = calcStats();
  if (free) S.arinFreeDay = today(); else S.silver -= ARIN_CARE;
  S.hp = st.maxHp; S.mp = st.maxMp;
  log(`아린: "${free ? '오늘 첫 그릇은 공짜예요! 뜨거우니까 천천히 드세요.' : '맛있게 드세요, 사형!'}"`, 'npc');
  log(`아린이 끓여 온 죽을 마셨습니다. 활력·내력이 모두 회복되었습니다.${free ? '' : ` ${hlSilver(-ARIN_CARE)}`}`, 'good');
  notify.refresh();
  return true;
}

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
    [Object.keys(S.manuals).some(id => !starUpBlock(id)), '수련치가 쌓였다. 상태 › 무공에서 성급을 올려라. 모아 두기만 하면 소용없다.'],
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

/* 장경각 이류 장비 교환 (공헌도) */
function buyLibraryGear(id) {
  const G = LIBRARY_GEAR[id];
  if (!G || S.contrib < G.cost || ownsShop(id)) return;
  if (!giveGear(libraryGear(id), true)) return;
  S.contrib -= G.cost;
  log(`장경각에서 이류 장비 ${hlItem(G.name)}${jo(G.name, '을를')} 받았습니다. 무장에서 착용하십시오.`, 'good');
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
  ['수련치로 무공 성급 올리기', () => Object.values(S.manuals).some(m => m.star >= 2), '탐험에서 모은 수련치로 상태 › 무공에서 [ 성급 올리기 ]를 누르십시오.'],
  ['조운 대사형에게 오늘의 보급품 받기', () => !!S.flags.supplied, '정청의 조운에게 보급품을 받으십시오.'],
  ['화로에서 소성 돌파단 달이기', () => S.codex.includes('a_low') || bestMugongStar() >= 6, '장문인에게 말을 걸면 귀띔해 줄지도 모릅니다.'],
  ['청풍산 두목 적염 호랑이 토벌', () => !!S.flags.boss1, '두목은 좀처럼 모습을 드러내지 않는 강적입니다. 마주치면 피하지 않고 맞서니, 쓰러져도 강해진 뒤 다시 보내십시오.'],
  ['염화채주 적패천 토벌', () => !!S.flags.boss2, '탐험지를 염화채로 바꾸십시오. 산적 연합의 소굴 깊은 곳에 채주가 있습니다.'],
  ['무공 6성 — 소성(小成) 돌파', () => bestMugongStar() >= 6, '5성 무공을 수련치와 소성 돌파단으로 올리십시오.'],
  ['수룡방주 벽해룡 토벌', () => !!S.flags.boss3, '탐험지를 수룡방으로 바꾸십시오.'],
  ['무공 12성 — 대성(大成) 돌파', () => bestMugongStar() >= 12, '11성 무공을 수련치와 대성 돌파단으로 올리십시오.'],
  ['장문인에게 하산령 받기', () => !!S.flags.hasan, '장문인을 찾아가십시오.'],
];

function questIndex() { const i = QUESTS.findIndex(q => !q[1]()); return i < 0 ? QUESTS.length : i; }

/* 장문인의 가르침(튜토리얼): 장문인에게 말을 걸어야 다음 할 일이 드러난다.
   S.tutorShown = 지금까지 드러난 할 일 수. 지금 할 일을 이루면 말 걸기 단추가 다시 켜진다 */
const QUEST_TALK = [
  '비급은 읽기만 해선 소용없다. 행낭의 비급 네 권을 익히고, 상태 › 무공에서 네 자리에 모두 걸어라.',
  '몸에 걸었으면 강호에 나가 부딪혀야지. 강호행에서 청풍산을 탐험지로 정하거라. 한 시간마다 알아서 다녀올 게다.',
  '싸우고 돌아오면 수련치가 쌓인다. 그걸로 상태 › 무공에서 성급을 올려라. 모아 두기만 하면 녹슨다.',
  '조운이 녀석이 보급품을 챙겨 뒀을 게다. 가서 받아 오너라. 하루에 한 번이다.',
  '5성에 이르면 벽에 막힌다. 소성 돌파단이 있어야 넘는다. 화로에서 직접 달여 보거라.',
  '청풍산 깊은 곳에 적염 호랑이가 산다. 두목이다. 만나면 피하지 말고, 지면 강해져서 다시 가라.',
  '호랑이를 잡았다니 대견하구나. 이제 염화채다. 산적 연합의 채주 적패천을 꺾어라.',
  '6성, 소성(小成)의 문턱을 넘어라. 수련치와 돌파단, 둘 다 필요하다.',
  '수룡방주 벽해룡. 물 위의 용이다. 탐험지를 수룡방으로 바꾸어라.',
  '12성, 대성(大成)이다. 대성 돌파단은 피와 물과 불, 셋이 서로를 다스려야 빚어진다.',
  '… 여기까지 왔구나. 나를 찾아와라. 하산을 허하마.',
];
const tutorShown = () => S.tutorShown === undefined ? questIndex() + 1 : S.tutorShown;
/* 장문인에게 새로 들을 가르침이 있는가 (지금 할 일이 아직 드러나지 않았으면) */
function tutorReady() { const qi = questIndex(); return qi < QUESTS.length && tutorShown() <= qi; }
function masterTalk() {
  const qi = questIndex();
  if (!tutorReady()) return masterHint();
  if (qi > 0 && tutorShown() === qi) log(`노벽송: "${pick(['잘했다.', '제법이구나.', '허허, 벌써 해냈느냐.'])} 다음 가르침을 주마."`, 'npc');
  S.tutorShown = qi + 1;
  log(`노벽송: "${QUEST_TALK[qi]}"`, 'npc');
  log(`[장문인의 가르침 ${qi + 1}/${QUESTS.length}] ${QUESTS[qi][0]}`, 'gold');
  const pill = /소성 돌파단/.test(QUESTS[qi][0]) ? 'pillLow' : /대성/.test(QUESTS[qi][0]) ? 'pillHigh' : null;
  const r = pill && RECIPES.find(x => x.out === pill);
  if (r && !S.codex.includes(r.id)) addHint(r);
  notify.refresh();
}
