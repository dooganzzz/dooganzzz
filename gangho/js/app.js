/* 강호견문록 — 초기화(Init)와 전역 상태(State): 새 게임, 저장/불러오기, 저장 이전(migration), 시간 흐름(한 시간 탐험 결산) */

const SAVE_KEY = 'ganghoKyeonmunrok_v2';

/* ───────── 상태 ─────────
   S: 저장되는 게임 상태 (localStorage). 화면 상태(탭·창·선택)는 ui/ui_tabs.js의 ui에 있다. */
let S = null;

/* 저장하지 않는 진행 상태: 계산 중인 전투, 탐험 한 걸음의 상세 기록(journal)을 모으는 통 */
const RT = { battle: null, journal: null };
const LOG_MAX = 100;

const DEFAULT_ATTR = () => Object.fromEntries(Object.keys(ATTRS).map(k => [k, ATTR_BASE]));

/* opts.attr: 4대 스탯 배분 {str, con, agi, int} · opts.talent: 주력 기예 'forge'(단조) | 'alchemy'(연단) (TALENTS) */
function newState(name, mugongId, opts = {}) {
  const st = {
    v: 8, name, created: now(), lastTick: now(),
    hp: 0, mp: 0, stamina: 100, silver: 30, contrib: 0, exp: 0,
    attr: validAttr(opts.attr) ? { ...opts.attr } : DEFAULT_ATTR(), talent: TALENTS[opts.talent] ? opts.talent : null,
    expedition: { zone: null, run: null, stage: 1, auto: true }, stages: {}, expeditions: [], potGift: true, zoneLog: {}, craftNotes: [], bestiary: {},
    manuals: {}, active: { mugong: null, simbeop: null, gyeonggong: null, gigong: null },
    inv: { saenghyeol: 10, herb: 2, ['bk_' + mugongId]: 1, bk_sm1a: 1, bk_gy1a: 1, bk_gi1a: 1 },
    gear: [], equip: {},
    shrine: { atk: 0, mp: 0, eva: 0, total: 0, pulls: 0 },
    perm: { maxHp: 0, maxMp: 0, attr: {} },
    crafts: { forge: { lv: 1, xp: 0 }, alchemy: { lv: 1, xp: 0 } },
    codex: [], hints: [], flags: {},
    buffs: [], arin: {}, supplyDay: '', uid: 1, codexRewards: {},
    statueResidueCount: 0,
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
  try { localStorage.setItem(saveKey(), JSON.stringify(S)); } catch (e) { /* 저장 불가 환경 */ }
  if (AUTH.id) cloudSaveSoon();
}

/* ───────── 계정: 인터넷에 올린 게임은 아이디로 로그인하고, 캐릭터는 그 아이디의 서버 저장에 묶인다 ─────────
   파일로 연 게임 · claude.ai 아티팩트 · localhost는 예전처럼 이 기기에만 저장한다 (로그인 없음).
   세션(아이디 · 토큰 · 게임 버전)은 이 기기에 둔다. 새 버전이 배포되면 버전이 달라 모두 로그아웃되고, 다시 들어오면 진행 중이던 강호행은 끝난다 */
const GAME_VER = (document.querySelector('meta[name="game-ver"]') || {}).content || 'dev';
const SESSION_KEY = 'gangho_session', NOTICE_KEY = 'gangho_notice';
const AUTH = { id: null, token: null };
function authMode() { return /^https?:$/.test(location.protocol) && !/claude/.test(location.hostname) && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && typeof supaOn === 'function' && supaOn(); }
const saveKey = () => AUTH.id ? `${SAVE_KEY}@${AUTH.id}` : SAVE_KEY;
function sessionGet() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; } }
function sessionSet(v) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(v)); } catch (e) { /* 저장 불가 */ } }
function sessionClear() { try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* 저장 불가 */ } }
function popNotice() { try { const n = sessionStorage.getItem(NOTICE_KEY); sessionStorage.removeItem(NOTICE_KEY); return n || ''; } catch (e) { return ''; } }
function readSave(key) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
const validSave = st => !!(st && typeof st === 'object' && st.manuals);
/* 서버 저장은 모아서 (1분에 한 번 · 창을 내릴 때 한 번). 견문록은 최근 200줄만 */
let cloudT = null, cloudDirty = false, cloudBusy = false;
function cloudSaveSoon() { cloudDirty = true; if (!cloudT) cloudT = setTimeout(cloudSaveNow, 60000); }
async function cloudSaveNow() {
  clearTimeout(cloudT); cloudT = null;
  if (!AUTH.id || !S || !cloudDirty || cloudBusy) return;
  cloudBusy = true; cloudDirty = false;
  try { await accountSave(AUTH.id, AUTH.token, { ...S, log: S.log.slice(-200) }); }
  catch (e) { if (/logged out/.test(e.message)) forceLogout('다른 곳에서 로그인했거나, 운영자가 전체 로그아웃을 했습니다. 다시 로그인하십시오.'); else cloudDirty = true; }
  cloudBusy = false;
}
document.addEventListener('visibilitychange', () => { if (document.hidden && AUTH.id) { save(); cloudSaveNow(); } });
function forceLogout(msg) {
  try { sessionStorage.setItem(NOTICE_KEY, msg); } catch (e) { /* 무시 */ }
  sessionClear(); AUTH.id = null; S = null; window.removeEventListener('beforeunload', save);
  location.reload();
}
async function logout() {
  if (AUTH.id && S) { save(); cloudDirty = true; await cloudSaveNow(); }
  forceLogout('로그아웃했습니다.');
}
/* 로그인 · 회원가입이 끝나면 (화면 쪽에서 부른다) */
function authSignedIn(res) {
  AUTH.id = res.id; AUTH.token = res.token;
  sessionSet({ id: res.id, token: res.token, ver: GAME_VER });
  enterGame(res.save);
}
/* 서버 저장과 이 기기에 남은 같은 아이디의 저장 중 더 최근 것으로 시작한다. 둘 다 없으면 예전(로그인 전) 캐릭터를 옮겨 올지 묻는다 */
function enterGame(server) {
  const local = readSave(saveKey()), pickS = [server, local].filter(validSave).sort((a, b) => (b.lastTick || 0) - (a.lastTick || 0))[0];
  hideAuth();
  if (pickS) return startGame(migrate(pickS));
  const legacy = readSave(SAVE_KEY);
  if (validSave(legacy)) return authLegacyOffer(legacy, () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 무시 */ } startGame(migrate(legacy)); save(); cloudDirty = true; cloudSaveNow(); }, () => startGame(null));
  startGame(null);
}
/* 로그인 없이 (서버를 쓸 수 없을 때) */
function startGuest() { AUTH.id = null; hideAuth(); startGame(migrate(load())); }

/* 웹 기록(Supabase)용 익명 id와 비밀값: 저장마다 한 번 만든다 */
function randHex(n) { const a = new Uint8Array(n); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => { a[i] = Math.random() * 256; }); return [...a].map(b => b.toString(16).padStart(2, '0')).join(''); }
function ensureCloudId(st) { if (st && !st.cloudId) { st.cloudId = 'g' + randHex(12); st.cloudToken = randHex(16); } }

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
  if (keepBackup) { delete st.cloudId; delete st.cloudToken; }   // 남의 저장을 들여오면 새 익명 id로 (원래 주인의 기록을 덮지 않게)
  if (keepBackup) backupSave('import');
  S = migrate(st); save(); notify.refresh();
  return true;
}

function load() { return readSave(saveKey()); }

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
  S = newState(name, mugongId, opts); ensureCloudId(S); S.gameVer = GAME_VER;
  const wt = MANUALS[mugongId].weapon;
  S.equip.weapon = makeNamedGear(STARTER_GEAR[wt]);
  S.equip.armor = makeNamedGear(STARTER_GEAR.armor);
  const st = calcStats(); S.hp = st.maxHp; S.mp = st.maxMp;
  S.mainQ = 0; S.qv = 2;                             // 장문인에게 말을 걸어야 첫 가르침이 드러난다 (qv: 가르침 목록 판)
  log('🗿 청풍문 무신상의 돌 눈꺼풀 너머로, 새 제자 하나가 산문을 들어섭니다. 당신의 목소리는 오직 그 제자에게만 들립니다.', 'gold');
  if (S.talent) log(`주력 기예 ${hlItem(TALENTS[S.talent].name)}: ${TALENTS[S.talent].desc}`, 'good');
  log(`${name}, 청풍문의 제자가 되었습니다. ${hlItem(`《${MANUALS[mugongId].name}》 비급`)}과 ${hlItem('토납법·초상비·철포삼 비급')}을 행낭에 받았습니다.`, 'gold');
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
/* 장비 이름을 지금 데이터의 이름으로 맞춘다 (이름을 고쳐도 예전에 얻은 장비가 옛 이름으로 남지 않게) */
/* 비급 120종 개편 (10월 1일): 옛 비급 id → 새 비급 id. 둘이 한 비급으로 모이면 성급 · 수련치가 높은 쪽을 남긴다 */
const OLD_MANUAL = { samjaeGwon: 'fs1a', paseok: 'fs1b', swaegol: 'fs1c', yeonhwan: 'fs1c', cpGwon: 'fs2a', samjaeGeom: 'sw1a', cpGeombeop: 'sw1b', nakyeop: 'sw1c', chupung: 'sw1c', cpGeom: 'sw2a', samjaeDo: 'bd1a', ohodanmun: 'bd1b', byeokryeok: 'bd1c', dansu: 'bd1c', cpDo: 'bd2a', samjaeChang: 'sp1a', yukhap: 'sp1b', cheolgi: 'sp1c', pungun: 'sp1c', cpChang: 'sp2a', samjaePyo: 'hd1a', biyeon: 'hd1b', sanhwa: 'hd1c', tugol: 'hd1c', cpPyo: 'hd2a', tonap: 'sm1a', cpSim: 'sm2a', pocheolsak: 'gy1a', chosangbi: 'gy1a', mijong: 'gy1b', dapsu: 'gy1b', jihaeng: 'gy1c', deungsu: 'gy1c', cpGyeong: 'gy2a', cheolpo: 'gi1a', baekgeum: 'gi1a', huto: 'gi1b', mokryeong: 'gi1c', byeokhwa: 'gi1c', yusu: 'gi1c', cpGi: 'gi2a' };
/* 더 예전 공양 비급 5종의 이름 바꿈 (무공 DB 통합 때) — OLD_MANUAL보다 먼저 거친다 */
const OLDER_MANUAL = { yeolhwa: 'byeokhwa', suryu: 'yusu', hwangto: 'huto', deungpyeong: 'dapsu' };
function migrateManuals(st) {
  for (const [o, n] of Object.entries(OLDER_MANUAL)) {
    if (st.manuals && st.manuals[o]) { if (!st.manuals[n] || (st.manuals[o].star || 0) > (st.manuals[n].star || 0)) st.manuals[n] = st.manuals[o]; delete st.manuals[o]; }
    if (st.active) for (const c of Object.keys(st.active)) if (st.active[c] === o) st.active[c] = n;
    if (st.inv && st.inv['bk_' + o]) { st.inv['bk_' + n] = (st.inv['bk_' + n] || 0) + st.inv['bk_' + o]; delete st.inv['bk_' + o]; }
  }
  const nu = {};
  for (const [id, m] of Object.entries(st.manuals || {})) { const to = OLD_MANUAL[id] || id; if (!MANUALS[to]) continue; const a = nu[to]; if (!a || (m.star || 0) > (a.star || 0)) nu[to] = m; }
  st.manuals = nu;
  for (const [c, id] of Object.entries(st.active || {})) if (id && OLD_MANUAL[id]) st.active[c] = OLD_MANUAL[id];
  for (const [c, id] of Object.entries(st.active || {})) if (id && !MANUALS[id]) st.active[c] = null;
  for (const k of Object.keys(st.inv || {})) { const id = k.startsWith('bk_') && k.slice(3); if (id && OLD_MANUAL[id]) { st.inv['bk_' + OLD_MANUAL[id]] = (st.inv['bk_' + OLD_MANUAL[id]] || 0) + st.inv[k]; delete st.inv[k]; } }
}
function gearNameNow(it) {
  if (!it) return;
  const G = it.named && (GEAR_DB[it.named] || CRAFT_GEAR[it.named] || LIBRARY_GEAR[it.named]);
  if (G) it.name = G.name;
  else if (it.base && EQUIP_BASES[it.base]) it.name = EQUIP_BASES[it.base].names[(it.tier || 1) - 1] || it.name;
  else { const B = SHOP_GEAR.find(g => g.id === it.id || g.id === it.named); if (B) it.name = B.name; }
}
function migrate(st) {
  if (!st) return null;
  migrateManuals(st);   // 비급 120종 개편: 옛 비급 → 같은 갈래 · 등급의 새 비급 (성급은 높은 쪽)
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
    st.expedition = { zone: null, run: null }; st.expeditions = [];
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
  // 청풍산 요수 교체: 들개·외눈 멧돼지왕은 사라졌다 (도감·임무에서 정리)
  for (const gone of ['dog', 'boarKing']) { if (st.bestiary) delete st.bestiary[gone]; for (const z of Object.values(st.zoneLog || {})) if (z.seen) delete z.seen[gone]; }
  // 3대 사냥터 개편: 적룡방 → 수룡방, 염화채·수룡방 요수 교체 (사라진 요수는 도감·임무에서 정리)
  const zmap = z => z === 'jeokryong' ? 'suryong' : z;
  if (st.expedition) st.expedition.zone = st.expedition.zone && zmap(st.expedition.zone);
  if (st.zoneLog && st.zoneLog.jeokryong) { st.zoneLog.suryong = st.zoneLog.jeokryong; delete st.zoneLog.jeokryong; }
  for (const r of st.expeditions || []) r.zone = zmap(r.zone);
  if (st.bestiary) for (const e of Object.keys(st.bestiary)) if (!ENEMIES[e]) delete st.bestiary[e];
  for (const z of Object.values(st.zoneLog || {})) for (const e of Object.keys(z.seen || {})) if (!ENEMIES[e]) delete z.seen[e];
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
  st.codexRewards = st.codexRewards || {};
  delete st.restCd;
  // 예전 문파 임무(토벌 · 배달 · 갱신비)는 없어졌다 — 장문인 토벌 임무(subq)로 바뀜
  delete st.missions; delete st.questRefreshCount; delete st.lastQuestResetDate;
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
  // 강호행 개편: 매시 정각 · 배속이 없어지고 [강호행 시작]부터 쓰러질 때까지 이어진다. 생혈고 10개를 한 번 지급한다
  if (st.expedition) { delete st.expedition.nextAt; if (st.expedition.run === undefined) st.expedition.run = null; }
  delete st.liveSpeed;
  // 스테이지 개편: 이미 두목을 쓰러뜨린 탐험지는 10단계까지 돌파한 것으로
  if (!st.stages) { st.stages = {}; for (const [z, f] of [['cheongpung', 'boss1'], ['yeomhwa', 'boss2'], ['suryong', 'boss3']]) if (st.flags && st.flags[f]) st.stages[z] = 10; }
  if (st.expedition) { if (!st.expedition.stage) st.expedition.stage = Math.min(10, (st.stages[st.expedition.zone] || 0) + 1); if (st.expedition.auto === undefined) st.expedition.auto = true; }
  delete st.bossPity;
  for (const r of st.expeditions || []) { if (r.live === undefined) r.live = false; delete r.shownAll; delete r.shownAt; for (const b of r.battles || []) b.seen = true; }   // 전투 결과는 이제 곧바로 보인다
  // 강호행 보상 즉시 획득 개편: 보관만 하고 아직 받지 않은 것(끝난 · 진행 중인 강호행 모두)은 바로 넣는다
  for (const r of st.expeditions || []) { const P = r.pend; if (!P) continue;
    if (!r.claimed) { st.silver = (st.silver || 0) + (P.silver || 0); st.exp = (st.exp || 0) + (P.exp || 0); st.contrib = (st.contrib || 0) + (P.contrib || 0);
      for (const [id, n] of Object.entries(P.items || {})) st.inv[id] = (st.inv[id] || 0) + n; st.gear = [...(st.gear || []), ...(P.gear || [])]; }
    delete r.pend; delete r.claimed; }
  if (!st.potGift) { st.potGift = true; st.inv.saenghyeol = (st.inv.saenghyeol || 0) + 10; st.migratedPot = true; }
  ensureCloudId(st);
  for (const it of [...(st.gear || []), ...Object.values(st.equip || {})]) gearNameNow(it);   // 장비 이름 고증 개편 (예전 이름 → 지금 이름)
  return st;
}

/* 시간 흐름: 강호행 중이면 때가 된 걸음을 치른다. 쓰러지면 알린다 */
let lastFrame = now();
function tick() {
  if (!S) return;
  const t = now(); lastFrame = t;
  const r = advanceRun(t);
  if (r && !r.live) notify.toast(r.end === 'dead' ? `💀 제자가 ${ZONES[r.zone].name}에서 쓰러져 강호행이 끝났습니다 — 강호행 탭에서 보상을 받으십시오` : `🏯 강호행을 마쳤습니다`);
  Bus.emit('tick');
}

/* 처음부터 다시: 저장을 지우고 새로 불러온다. beforeunload가 현재 상태를 다시 저장하지 않게 먼저 뗀다. */
async function doReset() {
  S = null;
  window.removeEventListener('beforeunload', save);
  if (AUTH.id) {                                         // 계정: 이 아이디의 저장만 지운다 (서버도)
    try { for (const k of Object.keys(localStorage)) if (k.startsWith(saveKey())) localStorage.removeItem(k); } catch (e) { /* 무시 */ }
    try { await accountSave(AUTH.id, AUTH.token, { reset: true }); } catch (e) { /* 무시 */ }
  } else { try { const ses = localStorage.getItem(SESSION_KEY); localStorage.clear(); if (ses) localStorage.setItem(SESSION_KEY, ses); } catch (e) { /* 저장소 접근 불가 */ } }
  location.reload();
}

Bus.on('save', save);

/* 투력은 늘 계산해서 쓰고, 저장 상태에는 거울 값으로만 둔다. 능력치·장비·무공이 바뀌는 모든 조작은
   refresh 신호를 보내고, 탐험 결산도 refresh를 보낸다. 틱에서도 한 번 더 맞춘다. */
function syncCombatPower() { if (S) S.combatPower = calculateCombatPower(S); }
Bus.on('refresh', syncCombatPower);
Bus.on('tick', syncCombatPower);

/* 새 버전 알아채기 (인터넷에 올린 게임에서만): 브라우저가 옛 페이지를 들고 있으면 옛 코드와 새 그림이 섞인다.
   version.json을 캐시 없이 읽어 이 페이지의 game-ver와 다르면, 저장한 뒤 ?v=새버전 주소로 다시 연다 (같은 버전 주소로 이미 열었으면 되풀이하지 않는다) */
function checkVersion() {
  if (!/^https?:$/.test(location.protocol) || /claude/.test(location.hostname) || typeof fetch !== 'function') return;
  const meta = document.querySelector('meta[name="game-ver"]'), cur = meta && meta.content; if (!cur) return;
  fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(j => {
    if (!j || !j.v || j.v === cur || new URLSearchParams(location.search).get('v') === j.v) return;
    if (S) save();
    location.replace(`${location.pathname}?v=${j.v}${location.hash}`);
  }).catch(() => {});
}
function boot() {
  bindInput();
  gmInit();                                              // 운영자 콘솔 (GM_ENABLED일 때만)
  lastFrame = now();
  setInterval(tick, 1000);
  checkVersion(); setInterval(checkVersion, 600000);
  setInterval(save, 10000);
  window.addEventListener('beforeunload', save);
  if (!authMode()) return startGame(migrate(load()));
  const ses = sessionGet();
  if (!ses || !ses.id || ses.ver !== GAME_VER) {         // 처음이거나, 새 버전이 배포되어 모두 로그아웃
    const notice = popNotice() || (ses && ses.id ? '새 버전이 배포되어 다시 로그인해야 합니다. 진행 중이던 강호행은 마친 것으로 정리됩니다.' : '');
    sessionClear();
    return showAuth(notice, ses && ses.id);
  }
  AUTH.id = ses.id; AUTH.token = ses.token;
  showAuthBusy(`${ses.id} — 불러오는 중…`);
  accountLoad(ses.id, ses.token).then(sv => enterGame(sv), e => {
    if (/logged out/.test(e.message)) { sessionClear(); AUTH.id = null; showAuth('다른 곳에서 로그인했거나, 운영자가 전체 로그아웃을 했습니다. 다시 로그인하십시오.', ses.id); }
    else enterGame(null);                                // 서버에 닿지 않으면 이 기기의 저장으로 (나중에 다시 올린다)
  });
}
/* 저장으로 게임을 연다 (없으면 서장) */
function startGame(st) {
  S = st;
  if (!S) { showIntro(); authFooter(); return; }
  checkRankUp();   // 예전 저장: 이미 네 갈래 삼류를 대성했으면 곧바로 이류무사
  if (S.migratedRefund) { log(`📜 화로가 단조·단약으로 바뀌며 쓰임을 잃은 옛 재료와 음식을 전방에 넘기고 ${hlSilver(S.migratedRefund)}을 받았습니다.`, 'gold'); delete S.migratedRefund; }
  if (S.migratedExp !== undefined) {
    log(`📜 청풍문의 수련 방식이 바뀌었습니다. 연무장이 문을 닫고, 제자는 강호로 나가 경험을 쌓습니다. 그동안의 수련은 수련치 ${fmt(S.migratedExp)}(으)로 돌려받았습니다. 강호행에서 탐험지를 정하십시오.`, 'gold');
    delete S.migratedExp;
  }
  // 메인 퀘스트 개편: 예전 저장은 이미 이룬 가르침까지를 지난 것으로 (보상 없이)
  if (S.mainQ === undefined) { let i = 0; while (i < QUESTS.length - 1 && QUESTS[i].done()) i++; S.mainQ = i; delete S.tutorShown; S.qv = 2; }
  if (S.qv !== 2) { S.mainQ = QUEST_V2_MAP[Math.min(S.mainQ || 0, QUEST_V2_MAP.length - 1)]; S.qv = 2; }   // 가르침 2판: 옛 자리 → 새 자리
  for (const z of ZONE_ORDER) checkAreaEncyclopediaCompletion(z);   // 예전 저장: 이미 다 만났으면 도감 완성 보상
  if (S.migratedPot) { log('📜 강호행이 바뀌었습니다. 이제 정각마다 떠나지 않고, [강호행 시작]을 누르면 쓰러질 때까지 쭉 이어집니다. 조운이 생혈고 10개를 챙겨 주었습니다.', 'gold'); delete S.migratedPot; }
  // 자리를 비운 동안에도 강호행은 이어졌다 (최대 8시간). 새 버전이 배포되었으면 그 강호행은 여기서 마친다
  const run = activeRun(), n0 = run ? run.steps.length : 0, r = advanceRun();
  const verChanged = S.gameVer && S.gameVer !== GAME_VER && GAME_VER !== 'dev';
  if (verChanged && activeRun()) { endRun(activeRun(), now(), 'recall'); log('📜 새 버전이 배포되어 진행 중이던 강호행을 마쳤습니다. 얻은 것은 이미 받았습니다.', 'gold'); notify.toast('📜 새 버전 배포로 강호행을 마쳤습니다'); }
  else if (r) notify.toast(r.live ? `⛰️ 자리를 비운 동안 견문 ${r.steps.length - n0}걸음 — 강호행은 계속됩니다` : `💀 자리를 비운 동안 강호행이 끝났습니다 — 강호행 탭에서 견문과 보상을 확인하십시오`);
  S.gameVer = GAME_VER;
  authFooter();
  notify.refresh(); save();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
