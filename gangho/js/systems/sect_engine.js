/* [시스템] 청풍문: 문파 임무·인물(조운·아린·장문인)·장경각·창고·하산 (DOM 조작 금지) */

/* ───────── 서브 퀘스트: 단계별 토벌 (반복) ─────────
   열린 단계마다 '그 단계에서 SUBQ.kills번 이기기'. 다 채우면 정청에서 보상을 받고, 진행은 처음부터 다시 쌓인다 (몇 번이고).
   보상: 공헌도 · 은자 · 수련치 · 생혈고 (단계 × 탐험지 티어에 비례). 진행은 강호행에서 그 단계 전투를 이길 때마다 오른다 */
const SUBQ = { kills: 10, contrib: 3, contribBase: 5, silver: 4, exp: 12, pot: 1 };
const subqKey = (zid, n) => `${zid}:${n}`;
function subqReward(zid, n) { const t = ZONES[zid].tier; return { contrib: Math.round(SUBQ.contrib * n * t + SUBQ.contribBase), silver: Math.round(SUBQ.silver * n * t), exp: Math.round(SUBQ.exp * n * t), pot: SUBQ.pot }; }
function subqProg(zid, n) { return ((S.subq || {})[subqKey(zid, n)]) || 0; }
function subqAdd(zid, n) { S.subq = S.subq || {}; const k = subqKey(zid, n); S.subq[k] = Math.min(SUBQ.kills, (S.subq[k] || 0) + 1); }
const subqReady = (zid, n) => subqProg(zid, n) >= SUBQ.kills;
/* 지금 받을 수 있는 서브 퀘스트 목록: 열린 탐험지의 열린 단계 */
function subqList() { const out = []; for (const z of ZONE_ORDER) if (zoneUnlocked(z)) for (let n = 1; n <= stageMax(z); n++) out.push({ zid: z, n }); return out; }
function subqReadyCount() { return subqList().filter(q => subqReady(q.zid, q.n)).length; }
function claimSubq(zid, n) {
  if (!ZONES[zid] || !subqReady(zid, n)) return false;
  const r = subqReward(zid, n);
  S.subq[subqKey(zid, n)] = 0; S.contrib += r.contrib; S.silver += r.silver; S.exp += r.exp; give('saenghyeol', r.pot, true);
  S.subqDone = (S.subqDone || 0) + 1;
  log(`📜 토벌 임무 완료 — ${stageName(zid, n)}: ${hlContrib('+' + r.contrib)}, ${hlSilver(r.silver)}, 수련치 +${r.exp}, 생혈고 ${r.pot}`, 'good');
  notify.refresh();
  return true;
}
/* 예전 이름 (다른 곳에서 부르던 것) */
function ensureMissions() { S.missions = []; }
/* 자정 기록만 남긴다 (예전 문파 임무 초기화는 없어졌다) */
function checkDailyMidnightReset(t = now()) { const d = new Date(t).toLocaleDateString('ko-KR'); if (S.lastQuestResetDate === d) return false; S.lastQuestResetDate = d; return true; }

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
  const ready = subqReadyCount();
  const tips = [
    [books, `비급이 ${books}권 있구나. 상태 탭의 무공에서 [ 익히기 ] 해라. 읽기만 해선 소용없다.`],
    [emptySlot, '익힌 무공은 상태 › 무공에서 장착해야 몸에 붙는다. 빈 자리가 있다.'],
    [!(S.expedition && S.expedition.zone), '아직 탐험지를 안 정했구나. 강호행에서 갈 곳을 정하고 [강호행 시작]을 눌러라. 쓰러질 때까지 알아서 나아간다.'],
    [Object.keys(S.manuals).some(id => !starUpBlock(id)), '수련치가 쌓였다. 상태 › 무공에서 성급을 올려라. 모아 두기만 하면 소용없다.'],
    [!has('saenghyeol', 3), '생혈고가 떨어져 간다. 탐험 중에 위급하면 그걸 바르니, 화로에서 달이든 전방에서 사든 넉넉히 챙겨라.'],
    [ready, `토벌 임무 ${ready}건을 채웠구나. 정청 토벌 임무에서 보상을 받아 가라.`],
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


/* ───────── 메인 퀘스트: 장문인의 가르침 ─────────
   한 줄로 이어진다. 지금 가르침을 이루면 장문인에게 [보상 받기] — 장비 · 비급 · 은자 · 생혈고를 받고 다음 가르침이 드러난다.
   S.mainQ = 보상까지 받은 가르침 수. 병기에 맞는 무기 · 비급은 받을 때의 병기로 정한다 */
const CP_BOOK = { fist: 'cpGwon', sword: 'cpGeom', blade: 'cpDo', spear: 'cpChang', hidden: 'cpPyo' };
const st10 = (z, n) => () => stageCleared(z) >= n;
const QUESTS = [
  { t: '비급 익히고 무공 장착하기', done: () => CAT_ORDER.every(c => S.active[c]), hint: '상태 탭의 무공에서 비급 네 권을 [ 익히기 ] 한 뒤 각각 장착하십시오.',
    talk: '비급은 읽기만 해선 소용없다. 행낭의 비급 네 권을 익히고, 상태 › 무공에서 네 자리에 모두 걸어라.', reward: { silver: 30, items: { saenghyeol: 5 } } },
  { t: '청풍산 초입 돌파', done: st10('cheongpung', 1), hint: '강호행 탭에서 청풍산을 정하고 [강호행 시작]. 1단계에서 5번 이기면 돌파합니다.',
    talk: '몸에 걸었으면 강호에 나가 부딪혀야지. 청풍산 초입부터 하나씩 꺾어 올라가거라. 생혈고를 넉넉히 챙기고.', reward: { gear: ['helmet', 1, 1] } },
  { t: '수련치로 무공 성급 올리기', done: () => Object.values(S.manuals).some(m => m.star >= 2), hint: '탐험에서 모은 수련치로 상태 › 무공에서 [ 성급 올리기 ]를 누르십시오.',
    talk: '싸우고 돌아오면 수련치가 쌓인다. 그걸로 상태 › 무공에서 성급을 올려라. 모아 두기만 하면 녹슨다.', reward: { silver: 50, items: { saenghyeol: 5 } } },
  { t: '조운 대사형에게 오늘의 보급품 받기', done: () => !!S.flags.supplied, hint: '정청의 조운에게 보급품을 받으십시오.',
    talk: '조운이 녀석이 보급품을 챙겨 뒀을 게다. 가서 받아 오너라. 하루에 한 번이다.', reward: { items: { saenghyeol: 3, potionMp: 2 } } },
  { t: '청풍산 약초 비탈 돌파 (4단계)', done: st10('cheongpung', 4), hint: '청풍산 4단계 「약초 비탈」을 돌파하십시오. 막히면 아래 단계에서 토벌 임무를 채우며 힘을 기르십시오.',
    talk: '약초 비탈 너머부터는 흑풍채 놈들이 어슬렁댄다. 발이 가벼워야 산다.', reward: { gear: ['boots', 1, 1] } },
  { t: '청풍산 흑풍채 초소 돌파 (5단계)', done: st10('cheongpung', 5), hint: '청풍산 5단계 「흑풍채 초소」를 돌파하십시오.',
    talk: '흑풍채 초소를 깨면 청풍문의 진짜 무공을 내주마. 네 병기에 맞는 것으로.', reward: { book: 'weapon' } },
  { t: '화로에서 소성 돌파단 달이기', done: () => S.codex.includes('a_low') || bestMugongStar() >= 6, hint: '장문인에게 말을 걸면 귀띔해 줄지도 모릅니다.',
    talk: '5성에 이르면 벽에 막힌다. 소성 돌파단이 있어야 넘는다. 화로에서 직접 달여 보거라.', reward: { silver: 80 }, pill: 'pillLow' },
  { t: '청풍산 안개 골짜기 돌파 (8단계)', done: st10('cheongpung', 8), hint: '청풍산 8단계 「안개 골짜기」를 돌파하십시오.',
    talk: '안개 골짜기에서는 갑옷이 목숨이다. 돌파하면 쓸 만한 걸 내주마.', reward: { gear: ['armor', 1, 2] } },
  { t: '청풍산 두목 적염 호랑이 토벌 (10단계)', done: st10('cheongpung', 10), hint: '청풍산 10단계 「적염호 굴」에서 두목을 쓰러뜨리십시오.',
    talk: '청풍산 가장 깊은 굴에 적염 호랑이가 산다. 잡아 오면 청풍문의 병기를 내주마.', reward: { lib: 'weapon', silver: 150 } },
  { t: '무공 6성 — 소성(小成) 돌파', done: () => bestMugongStar() >= 6, hint: '5성 무공을 수련치와 소성 돌파단으로 올리십시오.',
    talk: '6성, 소성(小成)의 문턱을 넘어라. 수련치와 돌파단, 둘 다 필요하다.', reward: { book: 'cpSim' } },
  { t: '염화채 벌목장 돌파 (5단계)', done: st10('yeomhwa', 5), hint: '탐험지를 염화채로 바꾸고 5단계 「벌목장」을 돌파하십시오.',
    talk: '호랑이를 잡았다니 대견하구나. 이제 염화채다. 불길 속에선 도포가 너를 지킨다.', reward: { lib: 'lg_armor' } },
  { t: '염화채주 적패천 토벌 (10단계)', done: st10('yeomhwa', 10), hint: '염화채 10단계 「채주의 대청」에서 적패천을 쓰러뜨리십시오.',
    talk: '산적 연합의 채주 적패천을 꺾어라. 꺾으면 청풍문 기공의 정수를 주마.', reward: { book: 'cpGi', lib: 'lg_jade' } },
  { t: '수룡방 강습대 초소 돌파 (3단계)', done: st10('suryong', 3), hint: '탐험지를 수룡방으로 바꾸고 3단계를 돌파하십시오.',
    talk: '물 위의 놈들은 빠르다. 바람을 타는 보법이 필요하다.', reward: { book: 'cpGyeong', gear: ['ring', 2, 2] } },
  { t: '수룡방주 벽해룡 토벌 (10단계)', done: st10('suryong', 10), hint: '수룡방 10단계 「수룡방 본채」에서 벽해룡을 쓰러뜨리십시오.',
    talk: '수룡방주 벽해룡. 물 위의 용이다. 꺾으면 한철로 벼린 병기를 내주마.', reward: { gear: ['weapon', 3, 2], silver: 500 } },
  { t: '무공 12성 — 대성(大成) 돌파', done: () => bestMugongStar() >= 12, hint: '11성 무공을 수련치와 대성 돌파단으로 올리십시오.',
    talk: '12성, 대성(大成)이다. 대성 돌파단은 피와 물과 불, 셋이 서로를 다스려야 빚어진다.', reward: { silver: 300 }, pill: 'pillHigh' },
  { t: '장문인에게 하산령 받기', done: () => !!S.flags.hasan, hint: '장문인을 찾아가십시오.', talk: '… 여기까지 왔구나. 나를 찾아와라. 하산을 허하마.', reward: null },
];
/* 지금 가르침 번호 (보상까지 받은 수) */
function questIndex() { return Math.min(S.mainQ || 0, QUESTS.length); }
/* 보상 미리보기 문장 */
function questRewardText(q) {
  const R = q && q.reward; if (!R) return '';
  const w = weaponType(), out = [];
  if (R.gear) { const [b, t, r] = R.gear, base = b === 'weapon' ? w : b; out.push(`[${RARITY[r].name}] ${EQUIP_BASES[base].names[t - 1]}`); }
  if (R.lib) { const id = R.lib === 'weapon' ? `lg_${w}` : R.lib; out.push(`[이류] ${LIBRARY_GEAR[id].name}`); }
  if (R.book) { const id = R.book === 'weapon' ? CP_BOOK[w] : R.book; out.push(`《${MANUALS[id].name}》 비급`); }
  for (const [id, n] of Object.entries(R.items || {})) out.push(`${ITEMS[id].name} ${n}`);
  if (R.silver) out.push(`은자 ${R.silver}냥`);
  return out.join(' · ');
}
function giveQuestReward(q) {
  const R = q.reward; if (!R) return;
  const w = weaponType();
  if (R.gear) { const [b, t, r] = R.gear; giveGear(makeGear(b === 'weapon' ? w : b, t, r, false)); }
  if (R.lib) { const id = R.lib === 'weapon' ? `lg_${w}` : R.lib; if (ownsShop(id)) S.silver += LIBRARY_GEAR[id].cost; else giveGear(libraryGear(id)); }
  if (R.book) { const id = R.book === 'weapon' ? CP_BOOK[w] : R.book; if (S.manuals[id] || has('bk_' + id)) S.contrib += MANUALS[id].cost || 0; else give('bk_' + id, 1); }
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
