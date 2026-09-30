/* 강호견문록 — 초기화(Init)와 전역 상태(State): 새 게임, 저장/불러오기, 저장 이전(migration), 시간 흐름(한 시간 탐험 결산) */

const SAVE_KEY = 'ganghoKyeonmunrok_v2';

/* ───────── 상태 ─────────
   S: 저장되는 게임 상태 (localStorage). 화면 상태(탭·창·선택)는 ui/ui_tabs.js의 ui에 있다. */
let S = null;

/* 저장하지 않는 진행 상태: 계산 중인 전투, 탐험 한 걸음의 상세 기록(journal)을 모으는 통 */
const RT = { battle: null, journal: null };
const LOG_MAX = 400;

const DEFAULT_ATTR = () => Object.fromEntries(Object.keys(ATTRS).map(k => [k, ATTR_BASE]));

/* opts.attr: 4대 스탯 배분 {str, con, agi, int} · opts.talent: 주력 기예 'forge'(단조) | 'alchemy'(연단) (TALENTS) */
function newState(name, mugongId, opts = {}) {
  const st = {
    v: 8, name, created: now(), lastTick: now(),
    hp: 0, mp: 0, stamina: 100, silver: 30, contrib: 0, exp: 0,
    attr: validAttr(opts.attr) ? { ...opts.attr } : DEFAULT_ATTR(), talent: TALENTS[opts.talent] ? opts.talent : null,
    expedition: { zone: null, nextAt: null }, expeditions: [], zoneLog: {}, craftNotes: [], bestiary: {},
    manuals: {}, active: { mugong: null, simbeop: null, gyeonggong: null, gigong: null },
    inv: { saenghyeol: 3, herb: 2, ['bk_' + mugongId]: 1, bk_tonap: 1, bk_pocheolsak: 1, bk_cheolpo: 1 },
    gear: [], equip: {},
    shrine: { atk: 0, mp: 0, eva: 0, total: 0, pulls: 0 },
    perm: { maxHp: 0, maxMp: 0, attr: {} },
    crafts: { forge: { lv: 1, xp: 0 }, alchemy: { lv: 1, xp: 0 } },
    codex: [], hints: [], flags: {},
    buffs: [], missions: [], arin: {}, supplyDay: '', uid: 1, bossPity: {}, codexRewards: {},
    questRefreshCount: 0, lastQuestResetDate: '', statueResidueCount: 0,
    kills: 0, log: [],
  };
  st.equip.badge = shopGear('badge1', st);
  return st;
}

/* 자주 바뀌는 화면에서는 저장을 모아서 (0.6초 뒤 한 번) */
let saveT = null;
function saveSoon() { clearTimeout(saveT); saveT = setTimeout(save, 600); }
function save() {
  clearTimeout(saveT);
  if (!S) return;
  S.lastTick = now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 저장 불가 환경 */ }
}

/* 저장 백업 · 되돌리기 (운영자 AI 자동 플레이 전에 떠 둔다) · 다른 저장 들여오기 */
function backupSave(tag) { if (!S) return false; try { localStorage.setItem(SAVE_KEY + ':' + tag, JSON.stringify({ at: Date.now(), S })); return true; } catch (e) { return false; } }
function backupInfo(tag) { try { const raw = localStorage.getItem(SAVE_KEY + ':' + tag); return raw ? JSON.parse(raw).at : null; } catch (e) { return null; } }
function restoreSave(tag) {
  let raw = null; try { raw = localStorage.getItem(SAVE_KEY + ':' + tag); } catch (e) { /* 저장소 접근 불가 */ }
  if (!raw) return false;
  return importSave(JSON.parse(raw).S, false);
}
function importSave(st, keepBackup = true) {
  if (!st || typeof st !== 'object' || !st.manuals) return false;
  if (keepBackup) backupSave('import');
  S = migrate(st); save(); notify.refresh();
  return true;
}

function load() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) return JSON.parse(raw); } catch (e) { /* 무시 */ }
  return null;
}

/* 견문록 기록은 상태에 남기고, 화면에는 신호로 알린다.
   탐험을 계산하는 동안(RT.journal)에는 견문록 대신 그 걸음의 상세 기록으로 모은다. t: 기록 시각(탐험 시각) */
function log(text, cls = '', t = now(), ref) {
  if (RT.journal) { RT.journal.push({ text, cls }); return; }
  const entry = { t, text, cls };
  if (ref) entry.ref = ref;                                // 탐험 걸음과 이어 둔다 (견문록 탭에서 상세 보기)
  S.log.push(entry);
  if (S.log.length > LOG_MAX) S.log.splice(0, S.log.length - LOG_MAX);
  Bus.emit('log', entry);
}

/* 새 게임: 프롤로그 뒤 제자 설정(이름·4대 스탯·입문 무공·기예)을 마치면 부른다 */
function startNewGame(name, mugongId, opts = {}) {
  S = newState(name, mugongId, opts);
  const wt = MANUALS[mugongId].weapon;
  S.equip.weapon = makeNamedGear(STARTER_GEAR[wt]);
  S.equip.armor = makeNamedGear(STARTER_GEAR.armor);
  const st = calcStats(); S.hp = st.maxHp; S.mp = st.maxMp;
  S.tutorShown = 0;                                  // 장문인에게 말을 걸어야 첫 가르침이 드러난다
  ensureMissions(); checkDailyMidnightReset();
  log('🗿 청풍문 무신상의 돌 눈꺼풀 너머로, 새 제자 하나가 산문을 들어섭니다. 당신의 목소리는 오직 그 제자에게만 들립니다.', 'gold');
  if (S.talent) log(`주력 기예 ${hlItem(TALENTS[S.talent].name)}: ${TALENTS[S.talent].desc}`, 'good');
  log(`${name}, 청풍문의 제자가 되었습니다. ${hlItem(`《${MANUALS[mugongId].name}》 비급`)}과 ${hlItem('토납법·포철삭·철포삼 비급')}을 행낭에 받았습니다.`, 'gold');
  log('노벽송: "비급은 읽기만 해선 소용없다. 익히고, 몸에 걸고, 강호에 나가 부딪혀라."', 'npc');
  log(`조운: "${WEAPON_TYPES[wt]}${jo(WEAPON_TYPES[wt], '이가')} 필요하겠지. 이거라도 쥐고 다녀라." — ${S.equip.weapon.name} 착용`, 'npc');
  log('아린: "새 사형이다! 비급부터 익혀요. 상태 탭의 무공에 있어요!"', 'npc');
}

/* 사라진 아이템의 옛 가격 (저장 이전 때 은자로 돌려준다) */
const OLD_ITEM_PRICE = {
  rice: 3, salt: 3, water: 1, wildGreens: 2, chili: 6, fish: 8, rabbitMeat: 2, boarMeat: 4,
  jumeokbap: 5, rabbitRoast: 6, boarSuyuk: 20, lingzhiBap: 25, fireStew: 40, fishRoast: 18, fishCongee: 50, arinSnack: 0,
  iron: 3, blackiron: 12, coldiron: 35, jadeStone: 15, wood: 1, rabbitHide: 2, dogFang: 3, roughHide: 4, boarHide: 5, boarTusk: 6,
  bandanaSilk: 12, emberStone: 15, scale: 30, viperFang: 6, tigerBone: 40, pillMid: 150, fireElixir: 80, bloodPill: 120,
  twistedIron: 0, burntAsh: 0, dregs: 0,
};

/* 예전 저장을 지금 규칙에 맞게 옮긴다.
   v8: 지도·연무장·비급별 수련/실전 수련치가 사라졌다. 쌓아 둔 진행 비율만큼 수련치 주머니(S.exp)로 돌려준다. */
function migrate(st) {
  if (!st) return null;
  if ((st.v || 0) < 8) {
    let exp = 0;
    for (const [id, m] of Object.entries(st.manuals || {})) {
      if (m.star < MAX_STAR) {
        const T = (m.star <= 5 ? 8 : 16) * 3600, C = m.star <= 5 ? 10 : 20;
        const frac = m.gate ? 1 : clamp(((m.txp || 0) / T + (m.cxp || 0) / C) / 2, 0, 1);
        exp += Math.round(frac * STAR_EXP[m.star - 1] * GRADES[MANUALS[id].grade].mult);
      }
      delete m.txp; delete m.cxp; delete m.gate;
    }
    st.exp = (st.exp || 0) + exp;
    for (const k of ['zone', 'seen', 'activeTrainingSkillId', 'training', 'gatherCd', 'opened', 'cleared']) delete st[k];
    st.expedition = { zone: null, nextAt: null }; st.expeditions = [];
    st.buffs = [];                                          // 시간제 음식 효과는 '다음 탐험' 효과로 바뀌었다
    st.v = 8;
    st.migratedExp = exp;
  }
  // 세계관 개편: 3대 스탯(기본 배분)·보조 기예 없음·요수 도감(구역 기록에서)·실패 부산물 → 검게 탄 찌꺼기
  if (!st.attr) st.attr = DEFAULT_ATTR();
  if (!('talent' in st)) st.talent = null;
  if (!st.bestiary) { st.bestiary = {}; for (const z of Object.values(st.zoneLog || {})) for (const [e, n] of Object.entries(z.seen || {})) { const b = st.bestiary[e] = st.bestiary[e] || { met: 0, kills: 0 }; b.met += n; } }
  if (st.inv) for (const id of ['twistedIron', 'burntAsh', 'dregs']) if (st.inv[id]) { st.inv.slag = (st.inv.slag || 0) + st.inv[id]; delete st.inv[id]; }
  if (st.shrine && st.shrine.pulls === undefined) st.shrine.pulls = 0;
  // 무공 DB 통합: 지난번 공양 비급 5종 → 새 삼류 무공으로 (성급 유지)
  const REMAP = { yeolhwa: 'byeokhwa', suryu: 'yusu', hwangto: 'huto', deungpyeong: 'dapsu' };
  for (const [o, n] of Object.entries(REMAP)) {
    if (st.manuals && st.manuals[o]) { if (!st.manuals[n]) st.manuals[n] = st.manuals[o]; delete st.manuals[o]; }
    if (st.active) for (const c of Object.keys(st.active)) if (st.active[c] === o) st.active[c] = n;
    if (st.inv && st.inv['bk_' + o]) { st.inv['bk_' + n] = (st.inv['bk_' + n] || 0) + st.inv['bk_' + o]; delete st.inv['bk_' + o]; }
  }
  // 청풍산 요수 교체: 들개·외눈 멧돼지왕은 사라졌다 (도감·임무에서 정리)
  for (const gone of ['dog', 'boarKing']) { if (st.bestiary) delete st.bestiary[gone]; for (const z of Object.values(st.zoneLog || {})) if (z.seen) delete z.seen[gone]; }
  if (st.missions) st.missions = st.missions.filter(m => m.type !== 'kill' || ENEMIES[m.target]);
  // 3대 사냥터 개편: 적룡방 → 수룡방, 염화채·수룡방 요수 교체 (사라진 요수는 도감·임무에서 정리)
  const zmap = z => z === 'jeokryong' ? 'suryong' : z;
  if (st.expedition) st.expedition.zone = st.expedition.zone && zmap(st.expedition.zone);
  if (st.zoneLog && st.zoneLog.jeokryong) { st.zoneLog.suryong = st.zoneLog.jeokryong; delete st.zoneLog.jeokryong; }
  for (const r of st.expeditions || []) r.zone = zmap(r.zone);
  for (const m of st.missions || []) m.zone = zmap(m.zone);
  if (st.bestiary) for (const e of Object.keys(st.bestiary)) if (!ENEMIES[e]) delete st.bestiary[e];
  for (const z of Object.values(st.zoneLog || {})) for (const e of Object.keys(z.seen || {})) if (!ENEMIES[e]) delete z.seen[e];
  if (st.missions) st.missions = st.missions.filter(m => (m.type !== 'kill' || ENEMIES[m.target]) && (m.type !== 'deliver' || ITEMS[m.target]));
  // 화로 개편(단조·단약): 조리·음식·기력 아이템과 옛 제작 재료는 사라졌다. 금창약은 생혈고로, 나머지는 전방 값만큼 은자로 돌려준다
  if (st.inv) {
    if (st.inv.potionHp) { st.inv.saenghyeol = (st.inv.saenghyeol || 0) + st.inv.potionHp; delete st.inv.potionHp; }
    let refund = 0;
    for (const id of Object.keys(st.inv)) if (!ITEMS[id]) { refund += (OLD_ITEM_PRICE[id] || 0) * st.inv[id]; delete st.inv[id]; }
    if (refund) { st.silver = (st.silver || 0) + refund; st.migratedRefund = refund; }
  }
  if (st.crafts) delete st.crafts.cook;
  if (st.talent === 'chef') st.talent = null;
  // 4대 스탯 · 기예 2종 · 신분패 하향 · 두목 천장 · 도감 보상
  if (st.attr && st.attr.agi === undefined) st.attr.agi = ATTR_BASE;                 // 민첩은 기본 6 (합계 24)
  st.talent = { smelt: 'forge', medic: 'alchemy', forge: 'forge', alchemy: 'alchemy' }[st.talent] || null;   // 채집은 주력 없음
  for (const it of [...Object.values(st.equip || {}), ...(st.gear || [])]) if (it && (it.shop === 'badge2' || it.shop === 'badge3')) it.stats = { ...SHOP_GEAR.find(g => g.id === it.shop).stats };
  st.bossPity = st.bossPity || {}; st.codexRewards = st.codexRewards || {};
  delete st.restCd;
  // 문파 임무는 토벌만 · 비급/무신상 영구 보너스
  if (st.missions) st.missions = st.missions.filter(m => m.type === 'kill');
  st.questRefreshCount = st.questRefreshCount || 0; if (st.lastQuestResetDate === undefined) st.lastQuestResetDate = '';
  // 장경각 장비 이름 정리 (단조 장비와 이름이 겹치지 않게)
  for (const it of [...Object.values(st.equip || {}), ...(st.gear || [])]) if (it && it.shop && LIBRARY_GEAR[it.shop]) it.name = LIBRARY_GEAR[it.shop].name;
  // 장비 위계 재조정: 하급 장비 37종·단조 장비는 지금 데이터 수치로 맞춘다 (강화 단계는 유지)
  for (const it of [...Object.values(st.equip || {}), ...(st.gear || [])]) {
    if (!it || !it.named) continue;
    if (it.crafted && CRAFT_GEAR[it.named]) { it.stats = { ...CRAFT_GEAR[it.named].stats }; it.rarity = CRAFT_GEAR[it.named].rarity || 1; }
    else if (!it.crafted && GEAR_DB[it.named]) it.stats = { ...GEAR_DB[it.named].stats };
  }
  for (const it of [...Object.values(st.equip || {}), ...(st.gear || [])]) if (it && it.base && it.tier === 1 && EQUIP_BASES[it.base]) {   // 기본형 1티어
    const mult = RARITY[it.rarity].mult; it.stats = {};
    for (const [k, v] of Object.entries(EQUIP_BASES[it.base].stats[0])) it.stats[k] = PCT_STATS.has(k) ? Math.round(v * mult * 10) / 10 : Math.max(1, Math.round(v * mult));
  }
  st.perm = st.perm || { maxHp: 0, maxMp: 0 }; st.perm.attr = st.perm.attr || {}; st.statueResidueCount = st.statueResidueCount || 0;
  if (st.codex) st.codex = st.codex.filter(id => RECIPES.some(r => r.id === id));
  const outOk = o => !o || (o.startsWith('gear:') ? !!CRAFT_GEAR[o.slice(5)] : !!ITEMS[o]);
  if (st.craftNotes) st.craftNotes = st.craftNotes.filter(n => CRAFTS[n.craft] && Object.keys(n.mats).every(id => ITEMS[id]) && outOk(n.out));
  // 조합 단서는 없어졌다 (연구 노트로 대체). 구역 경험 기록·정각 일정
  delete st.knownMats;
  st.zoneLog = st.zoneLog || {}; st.craftNotes = st.craftNotes || [];
  if (st.expedition && st.expedition.nextAt && new Date(st.expedition.nextAt).getMinutes() + new Date(st.expedition.nextAt).getSeconds() !== 0 && st.expedition.nextAt > Date.now()) st.expedition.nextAt = nextTopOfHour(Date.now());
  return st;
}

/* 시간 흐름: 탐험 시각이 되면 결산한다 (기력은 정각 출발 때만 가득 찬다) */
let lastFrame = now();
function tick() {
  if (!S) return;
  const t = now(), dt = Math.min(5, (t - lastFrame) / 1000); lastFrame = t;
  const recs = settleExpeditions(t);
  if (recs.length) {
    const r = recs[recs.length - 1];
    notify.toast(`⛰️ 제자가 ${ZONES[r.zone].name}(으)로 길을 떠났습니다 — 강호행 탭에서 지켜보십시오`);
  }
  checkDailyMidnightReset(t);
  Bus.emit('tick');
}

/* 처음부터 다시: 저장을 지우고 새로 불러온다. beforeunload가 현재 상태를 다시 저장하지 않게 먼저 뗀다. */
function doReset() {
  S = null;
  window.removeEventListener('beforeunload', save);
  try { localStorage.clear(); } catch (e) { /* 저장소 접근 불가 */ }
  location.reload();
}

Bus.on('save', save);

/* 전투력은 늘 계산해서 쓰고, 저장 상태에는 거울 값으로만 둔다. 능력치·장비·무공이 바뀌는 모든 조작은
   refresh 신호를 보내고, 탐험 결산도 refresh를 보낸다. 틱에서도 한 번 더 맞춘다. */
function syncCombatPower() { if (S) S.combatPower = calculateCombatPower(S); }
Bus.on('refresh', syncCombatPower);
Bus.on('tick', syncCombatPower);

function boot() {
  bindInput();
  gmInit();                                              // 운영자 콘솔 (GM_ENABLED일 때만)
  S = load();
  S = migrate(S);
  if (!S) showIntro();
  else {
    if (S.migratedRefund) { log(`📜 화로가 단조·단약으로 바뀌며 쓰임을 잃은 옛 재료와 음식을 전방에 넘기고 ${hlSilver(S.migratedRefund)}을 받았습니다.`, 'gold'); delete S.migratedRefund; }
    if (S.migratedExp !== undefined) {
      log(`📜 청풍문의 수련 방식이 바뀌었습니다. 연무장이 문을 닫고, 제자는 한 시간마다 강호로 나가 경험을 쌓습니다. 그동안의 수련은 수련치 ${fmt(S.migratedExp)}(으)로 돌려받았습니다. 강호행에서 탐험지를 정하십시오.`, 'gold');
      delete S.migratedExp;
    }
    ensureMissions(); checkDailyMidnightReset();
    for (const z of ZONE_ORDER) checkAreaEncyclopediaCompletion(z);   // 예전 저장: 이미 다 만났으면 도감 완성 보상
    // 자리를 비운 동안의 탐험을 한꺼번에 치른다 (최대 8번). 얻은 것은 강호행 탭의 [최종보상확인]으로 받는다
    const recs = settleExpeditions();
    if (recs.length) notify.toast(`⛰️ 자리를 비운 동안 강호행 ${recs.length}번 — 강호행 탭에서 견문과 보상을 확인하십시오`);
    notify.refresh();
  }
  lastFrame = now();
  setInterval(tick, 1000);
  setInterval(save, 10000);
  window.addEventListener('beforeunload', save);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
