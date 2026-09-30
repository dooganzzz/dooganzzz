/* 강호견문록 — 초기화(Init)와 전역 상태(State): 새 게임, 저장/불러오기, 저장 이전(migration), 시간 흐름(한 시간 탐험 결산) */

const SAVE_KEY = 'ganghoKyeonmunrok_v2';

/* ───────── 상태 ─────────
   S: 저장되는 게임 상태 (localStorage). 화면 상태(탭·창·선택)는 ui/ui_tabs.js의 ui에 있다. */
let S = null;

/* 저장하지 않는 진행 상태: 계산 중인 전투, 탐험 한 걸음의 상세 기록(journal)을 모으는 통 */
const RT = { battle: null, journal: null };
const LOG_MAX = 400;

const DEFAULT_ATTR = () => Object.fromEntries(Object.keys(ATTRS).map(k => [k, ATTR_BASE]));

/* opts.attr: 3대 스탯 배분 {str, con, int} · opts.talent: 보조 기예 (TALENTS) */
function newState(name, mugongId, opts = {}) {
  const st = {
    v: 8, name, created: now(), lastTick: now(),
    hp: 0, mp: 0, stamina: 100, silver: 30, contrib: 0, exp: 0,
    attr: validAttr(opts.attr) ? { ...opts.attr } : DEFAULT_ATTR(), talent: TALENTS[opts.talent] ? opts.talent : null,
    expedition: { zone: null, nextAt: null }, expeditions: [], zoneLog: {}, craftNotes: [], bestiary: {},
    manuals: {}, active: { mugong: null, simbeop: null, gyeonggong: null, gigong: null },
    inv: { potionHp: 3, herb: 2, ['bk_' + mugongId]: 1, bk_tonap: 1, bk_pocheolsak: 1, bk_cheolpo: 1 },
    gear: [], equip: {},
    shrine: { atk: 0, mp: 0, eva: 0, total: 0, pulls: 0 },
    perm: { maxHp: 0, maxMp: 0 },
    crafts: { forge: { lv: 1, xp: 0 }, alchemy: { lv: 1, xp: 0 }, cook: { lv: 1, xp: 0 } },
    codex: [], hints: [], flags: {},
    buffs: [], missions: [], arin: {}, supplyDay: '', restCd: 0, uid: 1,
    kills: 0, log: [],
  };
  const T = st.talent && TALENTS[st.talent];
  if (T && T.craft) st.crafts[T.craft].lv = T.lv;
  st.equip.badge = shopGear('badge1', st);
  return st;
}

function save() {
  if (!S) return;
  S.lastTick = now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 저장 불가 환경 */ }
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

/* 새 게임: 프롤로그 뒤 제자 설정(이름·3대 스탯·입문 무공·보조 기예)을 마치면 부른다 */
function startNewGame(name, mugongId, opts = {}) {
  S = newState(name, mugongId, opts);
  const wt = MANUALS[mugongId].weapon;
  S.equip.weapon = makeNamedGear(STARTER_GEAR[wt]);
  S.equip.armor = makeNamedGear(STARTER_GEAR.armor);
  const st = calcStats(); S.hp = st.maxHp; S.mp = st.maxMp;
  ensureMissions();
  log('🗿 청풍문 무신상의 돌 눈꺼풀 너머로, 새 제자 하나가 산문을 들어섭니다. 당신의 목소리는 오직 그 제자에게만 들립니다.', 'gold');
  if (S.talent) log(`보조 기예 ${hlItem(TALENTS[S.talent].name)}: ${TALENTS[S.talent].desc}`, 'good');
  log(`${name}, 청풍문의 제자가 되었습니다. ${hlItem(`《${MANUALS[mugongId].name}》 비급`)}과 ${hlItem('토납법·포철삭·철포삼 비급')}을 행낭에 받았습니다.`, 'gold');
  log('노벽송: "비급은 읽기만 해선 소용없다. 익히고, 몸에 걸고, 강호에 나가 부딪혀라."', 'npc');
  log(`조운: "${WEAPON_TYPES[wt]}${jo(WEAPON_TYPES[wt], '이가')} 필요하겠지. 이거라도 쥐고 다녀라." — ${S.equip.weapon.name} 착용`, 'npc');
  log('아린: "새 사형이다! 비급부터 익혀요. 상태 탭의 무공에 있어요!"', 'npc');
}

/* 예전 저장을 지금 규칙에 맞게 옮긴다.
   v8: 지도·연무장·비급별 수련/실전 경험치가 사라졌다. 쌓아 둔 진행 비율만큼 경험치 주머니(S.exp)로 돌려준다. */
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
  // 조합 단서는 없어졌다 (연구 노트로 대체). 구역 경험 기록·정각 일정
  delete st.knownMats;
  st.zoneLog = st.zoneLog || {}; st.craftNotes = st.craftNotes || [];
  if (st.expedition && st.expedition.nextAt && new Date(st.expedition.nextAt).getMinutes() + new Date(st.expedition.nextAt).getSeconds() !== 0 && st.expedition.nextAt > Date.now()) st.expedition.nextAt = nextTopOfHour(Date.now());
  return st;
}

/* 시간 흐름: 1초마다 기력이 조금씩 차오르고(한 시간이면 가득), 탐험 시각이 되면 결산한다 */
let lastFrame = now();
function tick() {
  if (!S) return;
  const t = now(), dt = Math.min(5, (t - lastFrame) / 1000); lastFrame = t;
  const maxSta = calcStats().maxSta;
  if (S.stamina < maxSta) S.stamina = Math.min(maxSta, S.stamina + maxSta * dt / 3600);
  const recs = settleExpeditions(t);
  if (recs.length) {
    const r = recs[recs.length - 1];
    notify.toast(`⛰️ 탐험에서 돌아왔습니다 — ${r.wins}승 ${r.losses}패 · 은자 ${r.gain.silver >= 0 ? '+' : ''}${r.gain.silver}${r.end === 'defeat' ? ' · 쓰러져 귀환' : ''}`);
  }
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
    if (S.migratedExp !== undefined) {
      log(`📜 청풍문의 수련 방식이 바뀌었습니다. 연무장이 문을 닫고, 제자는 한 시간마다 강호로 나가 경험을 쌓습니다. 그동안의 수련은 경험치 ${fmt(S.migratedExp)}(으)로 돌려받았습니다. 강호행에서 탐험지를 정하십시오.`, 'gold');
      delete S.migratedExp;
    }
    ensureMissions();
    // 자리를 비운 동안의 탐험을 한꺼번에 결산하고 (최대 8번) 결산 창을 띄운다
    const recs = settleExpeditions();
    if (recs.length) notify.view({ modal: 'settle:' + recs.map(r => r.id).join(',') });
    notify.refresh();
  }
  syncSide();
  lastFrame = now();
  setInterval(tick, 1000);
  setInterval(save, 10000);
  window.addEventListener('beforeunload', save);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
