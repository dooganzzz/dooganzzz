/* [시스템] 청풍문: 문파 임무·인물(조운·아린·장문인)·장경각·창고·하산 (DOM 조작 금지) */

/* ───────── 보조 퀘스트: 토벌 임무 (반복) ─────────
   장문인에게 탐험지 · 단계를 골라 하나씩 받는다 (S.subqCur = { zid, n, prog }). 그 단계에서 SUBQ.kills번 이기면 보상을 받고,
   보상을 받으면 다시 받을 수 있다. 보상은 하루 SUBQ.daily번까지 (모든 지역 합).
   보상: 공헌도 · 은자 · 수련치 · 생혈고 (단계에 비례 · 높은 탐험지일수록 tierUp만큼 소폭 더). 진행은 강호행에서 그 단계 전투를 이길 때마다 오른다 */
const SUBQ = { kills: 10, contrib: 3, contribBase: 5, silver: 4, exp: 12, pot: 1, daily: 5, tierUp: 0.2 };   // daily: 하루 보상 횟수(모든 지역 합) · tierUp: 탐험지 한 등급마다 +20%
function subqReward(zid, n) { const t = 1 + SUBQ.tierUp * (ZONES[zid].tier - 1); return { contrib: Math.round(SUBQ.contrib * n * t + SUBQ.contribBase), silver: Math.round(SUBQ.silver * n * t), exp: Math.round(SUBQ.exp * n * t), pot: SUBQ.pot }; }
const subqCur = () => { const q = S.subqCur; return q && ZONES[q.zid] ? q : null; };
function subqAdd(zid, n) { const q = subqCur(); if (q && q.zid === zid && q.n === n) q.prog = Math.min(SUBQ.kills, (q.prog || 0) + 1); }
/* 오늘 보상을 받은 횟수 (자정이 지나면 0부터) */
function subqToday() { const d = S.subqDay; return d && d.date === today() ? (d.total != null ? d.total : Object.values(d.n || {}).reduce((a, v) => a + v, 0)) : 0; }
const subqLeft = () => Math.max(0, SUBQ.daily - subqToday());
const subqReady = () => { const q = subqCur(); return !!q && (q.prog || 0) >= SUBQ.kills && subqLeft() > 0; };
const subqReadyCount = () => (subqReady() ? 1 : 0);
/* 장문인에게 토벌 임무 받기: 탐험지 → 단계 고르기 */
function subqAsk() {
  const q = subqCur();
  if (!subqLeft()) return log(`노벽송: "오늘 토벌은 ${SUBQ.daily}번 다 했다. 내일 오너라."`, 'npc');
  log(q ? `노벽송: "${stageName(q.zid, q.n)} 토벌을 맡고 있지 않느냐. 다른 곳으로 바꾸면 쌓은 것은 사라진다. 어디로 가겠느냐?"`
    : `노벽송: "토벌을 맡겠느냐? 어느 땅, 어느 길목에서 할지 골라라. 보상은 하루 ${SUBQ.daily}번이다. 높은 땅일수록 조금 더 얹어 주마."`, 'npc');
}
function subqPickZone(z) { if (!ZONES[z] || !zoneUnlocked(z)) return false; log(`노벽송: "${ZONES[z].name}이라… 어느 길목이냐?"`, 'npc'); return true; }
function acceptSubq(z, n) {
  if (!ZONES[z] || !zoneUnlocked(z) || n < 1 || n > stageMax(z) || !subqLeft()) return false;
  S.subqCur = { zid: z, n, prog: 0 };
  log(`노벽송: "좋다. ${stageName(z, n)}에서 ${SUBQ.kills}번 이기고 오너라."`, 'npc'); notify.refresh(); return true;
}
function claimSubq() {
  const q = subqCur(); if (!q || !subqReady()) return false;
  const r = subqReward(q.zid, q.n), done = subqToday();
  if (!S.subqDay || S.subqDay.date !== today()) S.subqDay = { date: today(), n: {} };
  S.subqDay.total = done + 1;
  S.subqCur = null; S.contrib += r.contrib; S.silver += r.silver; S.exp += r.exp; give('saenghyeol', r.pot, true);
  S.subqDone = (S.subqDone || 0) + 1;
  log(`📜 토벌 임무 완료 — ${stageName(q.zid, q.n)}: ${hlContrib('+' + r.contrib)}, ${hlSilver(r.silver)}, 수련치 +${r.exp}, 생혈고 ${r.pot}`, 'good');
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
  const ready = subqReadyCount();
  const tips = [
    [books, `비급이 ${books}권 있구나. 상태 탭의 무공에서 [ 익히기 ] 해라. 읽기만 해선 소용없다.`],
    [emptySlot, '익힌 무공은 상태 › 무공에서 장착해야 몸에 붙는다. 빈 자리가 있다.'],
    [!(S.expedition && S.expedition.zone), '아직 탐험지를 안 정했구나. 강호행에서 갈 곳을 정하고 [강호행 시작]을 눌러라. 쓰러질 때까지 알아서 나아간다.'],
    [Object.keys(S.manuals).some(id => !starUpBlock(id)), '수련치가 쌓였다. 상태 › 무공에서 성급을 올려라. 모아 두기만 하면 소용없다.'],
    [!has('saenghyeol', 3), '생혈고가 떨어져 간다. 탐험 중에 위급하면 그걸 바르니, 화로에서 달이든 전방에서 사든 넉넉히 챙겨라.'],
    [ready, `토벌 임무 ${ready}건을 채웠다. 정청 아래 토벌 임무 칸에서 보상을 받아라.`],
    [S.expeditions && S.expeditions.length && S.expeditions[S.expeditions.length - 1].defeats, '지난 강호행에서 쓰러졌다지? 한 단계 아래에서 토벌 임무를 채우며 생혈고와 은자를 모으고, 무공과 장비를 올린 뒤 다시 올라가라.'],
    [S.gear.length >= 3, '행낭에 안 쓰는 장비가 쌓였다. 청풍전방 왕 가에게 가면 은자로 바꿔 준다.'],
    [S.silver < 20, '은자가 궁하면 산에 들어가 금고를 열거나, 잡은 짐승 가죽을 전방에 팔아라.'],
  ];
  const hit = tips.find(([c]) => c);
  log(`조운: "${hit ? hit[1] : pick(['필요한 물건은 청풍전방 왕 가에게 사라. 난 장작이나 팬다.', '강호행 들어가기 전에 생혈고는 꼭 챙겨라.', '두목은 무작정 덤빌 상대가 아니다. 기척부터 살펴라.'])}"`, 'npc');
  notify.refresh();
}
function masterHint() {
  const gated = Object.entries(S.manuals).find(([, m]) => GATES[m.star] && !has(GATES[m.star]));   // 돌파단이 필요한 성에 이르렀는데 없을 때
  const pill = gated ? GATES[gated[1].star] : QUESTS[questIndex()] && QUESTS[questIndex()].pill || null;
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
  if (!LIBRARY_BOOKS.includes(id) || S.manuals[id] || has('bk_' + id) || !M.cost || S.contrib < M.cost) return;
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


/* ───────── 메인 퀘스트: 장문인의 가르침 ─────────
   한 줄로 이어진다. 지금 가르침을 이루면 장문인에게 [보상 받기] — 장비 · 비급 · 은자 · 생혈고를 받고 다음 가르침이 드러난다.
   S.mainQ = 보상까지 받은 가르침 수. 병기에 맞는 무기 · 비급은 받을 때의 병기로 정한다 */
const CP_BOOK = { fist: 'fs', sword: 'sw', blade: 'bd', spear: 'sp', hidden: 'hd' };   // 병기별 비급 갈래
/* 가르침 보상 비급: 삼류(유저 요청). 그 갈래의 삼류 셋 중 아직 없는 것부터 (모두 있으면 첫 권 → 공헌도로 대신) */
function questBook(R, w) {
  const p = R.book === 'weapon' ? CP_BOOK[w] : R.book, ids = ['a', 'b', 'c'].map(x => `${p}1${x}`).filter(id => MANUALS[id]);
  return ids.find(id => !S.manuals[id] && !has('bk_' + id)) || ids[0];
}
const st10 = (z, n) => () => stageCleared(z) >= n;
const allStar = n => () => CAT_ORDER.every(c => S.active[c] && S.manuals[S.active[c]] && S.manuals[S.active[c]].star >= n);   // 네 갈래 장착 무공이 모두 n성
const QUESTS = [
  { t: '비급 익히고 무공 장착하기', done: () => CAT_ORDER.every(c => S.active[c]), hint: '상태 탭의 무공에서 비급 네 권을 [ 익히기 ] 한 뒤 각각 장착하십시오.',
    talk: '비급은 읽기만 해선 소용없다. 행낭의 비급 네 권을 익히고, 상태 › 무공에서 네 자리에 모두 걸어라.', reward: { silver: 30, items: { saenghyeol: 5 } } },
  { t: '청풍산 초입 돌파', done: st10('cheongpung', 1), hint: '강호행 탭에서 청풍산을 정하고 [강호행 시작]. 1단계에서 5번 이기면 돌파합니다.',
    talk: '몸에 걸었으면 강호에 나가 부딪혀야지. 청풍산 초입부터 하나씩 꺾어 올라가거라. 생혈고를 넉넉히 챙기고.', reward: { gear: ['helmet', 1, 1] } },
  { t: '수련치로 무공 성급 올리기', done: () => Object.values(S.manuals).some(m => m.star >= 2), hint: '탐험에서 모은 수련치로 상태 › 무공에서 [ 성급 올리기 ]를 누르십시오.',
    talk: '싸우고 돌아오면 수련치가 쌓인다. 그걸로 상태 › 무공에서 성급을 올려라. 모아 두기만 하면 녹슨다.', reward: { silver: 50, items: { saenghyeol: 5 } } },
  { t: '조운 대사형에게 오늘의 보급품 받기', done: () => !!S.flags.supplied, hint: '정청의 조운에게 보급품을 받으십시오.',
    talk: '조운이 녀석이 보급품을 챙겨 뒀을 게다. 가서 받아 오너라. 하루에 한 번이다.', reward: { items: { saenghyeol: 3, potionMp: 2 } } },
  { t: '네 갈래 무공 모두 2성', done: allStar(2), hint: '장착한 무공 · 심법 · 경공 · 기공을 모두 2성 이상으로 올리십시오.',
    talk: '한 갈래만 키우면 절름발이다. 심법 · 경공 · 기공도 고루 2성까지 끌어올려라.', reward: { silver: 60, items: { potionMp: 3 } } },
  { t: '청풍산 산길 돌파 (2단계)', done: st10('cheongpung', 2), hint: '청풍산 2단계를 돌파하십시오.',
    talk: '초입은 맛보기였다. 한 단계 더 올라가 보거라. 이기면 이길수록 다음 걸음이 가볍다.', reward: { silver: 60, items: { saenghyeol: 5 } } },
  { t: '요수 30마리 쓰러뜨리기', done: () => (S.kills || 0) >= 30, hint: '강호행에서 요수를 모두 30마리 쓰러뜨리십시오.',
    talk: '칼은 휘둘러 봐야 손에 붙는다. 요수 서른을 쓰러뜨리고 오너라.', reward: { silver: 80, items: { gigeokdan: 1 } } },
  { t: '청풍산 3단계 돌파', done: st10('cheongpung', 3), hint: '청풍산 3단계를 돌파하십시오.',
    talk: '숨이 차느냐? 기력이 다하면 걸음이 느려진다. 기력단을 아끼지 말고 3단계를 넘어라.', reward: { gear: ['ring', 1, 1] } },
  { t: '청풍산 약초 비탈 돌파 (4단계)', done: st10('cheongpung', 4), hint: '청풍산 4단계 「약초 비탈」을 돌파하십시오. 막히면 아래 단계에서 토벌 임무를 채우며 힘을 기르십시오.',
    talk: '약초 비탈 너머부터는 흑풍채 놈들이 어슬렁댄다. 발이 가벼워야 산다.', reward: { gear: ['boots', 1, 1] } },
  { t: '화로에서 조합법 하나 알아내기', done: () => (S.codex || []).length >= 1, hint: '청풍문 › 화로에서 재료를 넣고 단조나 연단을 해 조합법을 알아내십시오.',
    talk: '약초 비탈에서 캔 것들을 썩히지 마라. 화로에 넣고 이것저것 섞다 보면 쓸 만한 게 나온다.', reward: { silver: 80, items: { wildGinseng: 2, treeSap: 2 } } },
  { t: '청풍산 흑풍채 초소 돌파 (5단계)', done: st10('cheongpung', 5), hint: '청풍산 5단계 「흑풍채 초소」를 돌파하십시오.',
    talk: '흑풍채 초소를 깨면 청풍문의 진짜 무공을 내주마. 네 병기에 맞는 것으로.', reward: { book: 'weapon' } },
  { t: '무공 3성', done: () => bestMugongStar() >= 3, hint: '공격 무공을 3성까지 올리십시오.',
    talk: '새 비급을 받았으면 손에 익혀야지. 공격 무공을 3성까지 올려라.', reward: { silver: 80, items: { saenghyeol: 5 } } },
  { t: '청풍산 6단계 돌파', done: st10('cheongpung', 6), hint: '청풍산 6단계를 돌파하십시오.',
    talk: '흑풍채 초소 너머는 놈들의 앞마당이다. 한 걸음씩 밀고 들어가라.', reward: { silver: 100, items: { saenghyeol: 5 } } },
  { t: '무신상에 열 번 공양하기', done: () => (S.shrine && S.shrine.pulls || 0) >= 10, hint: '청풍문 › 무신상에서 공양을 열 번 올리십시오.',
    talk: '무신상께 공양을 올려 보거라. 정성이 쌓이면 뜻밖의 것을 내리신다.', reward: { silver: 100 } },
  { t: '무공 5성 — 소성(小成) 관문에 이르기', done: () => bestMugongStar() >= 5, hint: '수련치로 무공 하나를 5성까지 올리십시오.',
    talk: '5성에 이르면 벽에 막힌다. 소성 돌파단이 있어야 넘는다. 5성에 닿으면 하나 내주마.', reward: { items: { pillLow: 1 }, silver: 80 } },
  { t: '청풍산 7단계 돌파', done: st10('cheongpung', 7), hint: '청풍산 7단계를 돌파하십시오.',
    talk: '이제 산의 중턱이다. 여기서부터는 요수도 독하다. 생혈고를 열 개는 챙겨라.', reward: { silver: 120, items: { gigeokdan: 1 } } },
  { t: '청풍산 안개 골짜기 돌파 (8단계)', done: st10('cheongpung', 8), hint: '청풍산 8단계 「안개 골짜기」를 돌파하십시오.',
    talk: '안개 골짜기에서는 갑옷이 목숨이다. 돌파하면 쓸 만한 걸 내주마.', reward: { gear: ['armor', 1, 2] } },
  { t: '좌선 고리 여섯 칸 밝히기', done: () => rankProgress().lit >= 6, hint: '네 갈래 삼류 무공의 성급을 올려 상태 › 무공 가운데 고리를 여섯 칸 밝히십시오.',
    talk: '좌선할 때 둘레에 푸른 불이 하나씩 켜지는 걸 보았느냐. 네 갈래가 고르게 자라야 불이 붙는다. 여섯 칸을 밝혀 보거라.', reward: { silver: 150 } },
  { t: '청풍산 9단계 돌파', done: st10('cheongpung', 9), hint: '청풍산 9단계를 돌파하십시오.',
    talk: '굴 앞이다. 호랑이 냄새가 나지? 마지막으로 숨을 고르고 9단계를 넘어라.', reward: { silver: 120, items: { saenghyeol: 10 } } },
  { t: '청풍산 두목 적염 호랑이 토벌 (10단계)', done: st10('cheongpung', 10), hint: '청풍산 10단계 「적염호 굴」에서 두목을 쓰러뜨리십시오.',
    talk: '청풍산 가장 깊은 굴에 적염 호랑이가 산다. 잡아 오면 청풍문의 병기를 내주마.', reward: { lib: 'weapon', silver: 150 } },
  { t: '무공 6성 — 소성(小成) 돌파', done: () => bestMugongStar() >= 6, hint: '5성 무공을 수련치와 소성 돌파단으로 올리십시오.',
    talk: '6성, 소성(小成)의 문턱을 넘어라. 수련치와 돌파단, 둘 다 필요하다.', reward: { book: 'sm' } },
  { t: '염화채 3단계 돌파', done: st10('yeomhwa', 3), hint: '탐험지를 염화채로 바꾸고 3단계를 돌파하십시오.',
    talk: '염화채는 불의 땅이다. 처음 들어서면 소성 돌파단 하나가 손에 들어올 게다. 3단계까지 밀고 가라.', reward: { silver: 150, items: { saenghyeol: 5 } } },
  { t: '염화채 벌목장 돌파 (5단계)', done: st10('yeomhwa', 5), hint: '탐험지를 염화채로 바꾸고 5단계 「벌목장」을 돌파하십시오.',
    talk: '호랑이를 잡았다니 대견하구나. 이제 염화채다. 불길 속에선 도포가 너를 지킨다.', reward: { lib: 'lg_armor' } },
  { t: '네 갈래 무공 모두 6성', done: allStar(6), hint: '장착한 무공 · 심법 · 경공 · 기공을 모두 6성 이상으로 올리십시오.',
    talk: '공격 무공만 소성이면 반쪽이다. 심법 · 경공 · 기공도 모두 6성에 올려라.', reward: { silver: 200, items: { pillLow: 1 } } },
  { t: '염화채 8단계 돌파', done: st10('yeomhwa', 8), hint: '염화채 8단계를 돌파하십시오.',
    talk: '채주의 대청이 멀지 않다. 놈들의 수가 많으니 기공으로 몸을 단단히 하라.', reward: { silver: 200, items: { saenghyeol: 10 } } },
  { t: '염화채주 적패천 토벌 (10단계)', done: st10('yeomhwa', 10), hint: '염화채 10단계 「채주의 대청」에서 적패천을 쓰러뜨리십시오.',
    talk: '산적 연합의 채주 적패천을 꺾어라. 꺾으면 청풍문 기공의 정수를 주마.', reward: { book: 'gi', lib: 'lg_jade' } },
  { t: '수룡방 강습대 초소 돌파 (3단계)', done: st10('suryong', 3), hint: '탐험지를 수룡방으로 바꾸고 3단계를 돌파하십시오.',
    talk: '물 위의 놈들은 빠르다. 바람을 타는 보법이 필요하다. 처음 들어서면 대성 돌파단 하나가 손에 들어올 게다.', reward: { book: 'gy', gear: ['ring', 2, 2] } },
  { t: '무공 9성', done: () => bestMugongStar() >= 9, hint: '공격 무공을 9성까지 올리십시오.',
    talk: '9성이면 강호에서도 제법 이름이 날 게다. 대성까지 세 걸음 남았다.', reward: { silver: 250, items: { gigeokdan: 2 } } },
  { t: '수룡방 6단계 돌파', done: st10('suryong', 6), hint: '수룡방 6단계를 돌파하십시오.',
    talk: '물살이 거세지는 곳이다. 발을 헛디디면 끝이다. 6단계를 넘어라.', reward: { silver: 250, items: { saenghyeol: 10 } } },
  { t: '수룡방주 벽해룡 토벌 (10단계)', done: st10('suryong', 10), hint: '수룡방 10단계 「수룡방 본채」에서 벽해룡을 쓰러뜨리십시오.',
    talk: '수룡방주 벽해룡. 물 위의 용이다. 꺾으면 한철로 벼린 병기를 내주마.', reward: { gear: ['weapon', 3, 2], silver: 500 } },
  { t: '무공 11성 — 대성(大成) 관문에 이르기', done: () => bestMugongStar() >= 11, hint: '수련치로 무공 하나를 11성까지 올리십시오.',
    talk: '11성이면 대성(大成)의 문턱이다. 대성 돌파단이 있어야 넘는다. 11성에 닿으면 하나 내주마.', reward: { items: { pillHigh: 1 }, silver: 300 } },
  { t: '무공 12성 — 대성(大成) 돌파', done: () => bestMugongStar() >= 12, hint: '11성 무공을 수련치와 대성 돌파단으로 올리십시오.',
    talk: '12성, 대성이다. 이 고비를 넘으면 초식의 끝, 오의가 열린다.', reward: { silver: 400, items: { pillHigh: 1 } } },
  { t: '이류무사로 승급하기', done: () => (S.rank || 0) >= 1, hint: '네 갈래 삼류 무공을 모두 12성(대성)으로 올려 좌선 고리를 다 밝히십시오.',
    talk: '네 갈래를 모두 대성에 올려 고리를 다 밝히면 이류무사다. 그날이 오면 나도 너를 제자라 부르지 않으마.', reward: { silver: 500 } },
  { t: '장문인에게 하산령 받기', done: () => !!S.flags.hasan, hint: '장문인을 찾아가십시오.', talk: '… 여기까지 왔구나. 나를 찾아와라. 하산을 허하마.', reward: null },
];
/* 가르침 2판(촘촘히 · 34개)으로 바꾸며 옛 저장 옮기기: 옛 S.mainQ(받은 수 0~16) → 새 목록에서 같은 다음 가르침의 자리 */
const QUEST_V2_MAP = [0, 1, 2, 3, 8, 10, 14, 16, 19, 20, 22, 25, 26, 29, 30, 33, 34];
/* 지금 가르침 번호 (보상까지 받은 수) */
function questIndex() { return Math.min(S.mainQ || 0, QUESTS.length); }
/* 보상 미리보기 문장 */
function questRewardText(q) {
  const R = q && q.reward; if (!R) return '';
  const w = weaponType(), out = [];
  if (R.gear) { const [b, t, r] = R.gear, base = b === 'weapon' ? w : b; out.push(`[${RARITY[r].name}] ${EQUIP_BASES[base].names[t - 1]}`); }
  if (R.lib) { const id = R.lib === 'weapon' ? `lg_${w}` : R.lib; out.push(`[이류] ${LIBRARY_GEAR[id].name}`); }
  if (R.book) { const id = questBook(R, w); out.push(`《${MANUALS[id].name}》 비급`); }
  for (const [id, n] of Object.entries(R.items || {})) out.push(`${ITEMS[id].name} ${n}`);
  if (R.silver) out.push(`은자 ${R.silver}냥`);
  return out.join(' · ');
}
function giveQuestReward(q) {
  const R = q.reward; if (!R) return;
  const w = weaponType();
  if (R.gear) { const [b, t, r] = R.gear; giveGear(makeGear(b === 'weapon' ? w : b, t, r, false)); }
  if (R.lib) { const id = R.lib === 'weapon' ? `lg_${w}` : R.lib; if (ownsShop(id)) S.silver += LIBRARY_GEAR[id].cost; else giveGear(libraryGear(id)); }
  if (R.book) { const id = questBook(R, w); if (S.manuals[id] || has('bk_' + id)) S.contrib += MANUALS[id].cost || 0; else give('bk_' + id, 1); }
  for (const [id, n] of Object.entries(R.items || {})) give(id, n, true);
  if (R.silver) S.silver += R.silver;
}
/* 장문인: 지금 가르침을 이루었으면 보상 받기, 아니면 가르침 · 귀띔 */
function tutorReady() { const q = QUESTS[questIndex()]; return !!(q && q.reward && q.done()); }
function masterTalk() {
  const qi = questIndex(), q = QUESTS[qi];
  if (!q) return masterHint();
  if (!tutorReady()) {
    log(`노벽송: "${q.talk}"`, 'npc');
    log(`[장문인의 가르침 ${qi + 1}/${QUESTS.length}] ${q.t}`, 'gold');
    const r = q.pill && RECIPES.find(x => x.out === q.pill);
    if (r && !S.codex.includes(r.id)) addHint(r);
    notify.refresh(); return;
  }
  const txt = questRewardText(q);
  giveQuestReward(q);
  S.mainQ = qi + 1;
  log(`노벽송: "${pick(['잘했다.', '제법이구나.', '허허, 벌써 해냈느냐.'])} 받아라."`, 'npc');
  log(`🏆 [장문인의 가르침 ${qi + 1}/${QUESTS.length}] ${q.t} — 보상: ${hlItem(txt)}`, 'gold');
  const nx = QUESTS[qi + 1];
  if (nx) { log(`노벽송: "${nx.talk}"`, 'npc'); const r = nx.pill && RECIPES.find(x => x.out === nx.pill); if (r && !S.codex.includes(r.id)) addHint(r); }
  notify.refresh();
}
