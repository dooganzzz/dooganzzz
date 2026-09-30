/* 강호견문록 — 초기화(Init)와 전역 상태(State): 새 게임, 저장/불러오기, 저장 이전(migration), 시간 흐름 */

const SAVE_KEY = 'ganghoKyeonmunrok_v2';

/* ───────── 상태 ─────────
   S: 저장되는 게임 상태 (localStorage). 화면 상태(탭·창·선택)는 ui/ui_tabs.js의 ui에 있다. */
let S = null;

/* 저장하지 않는 진행 상태: 진행 중인 전투와 3초 전투 타이머 */
const RT = { battle: null, btimer: null };

function newState(name, mugongId) {
  const st = {
    v: 7, name, created: now(), lastTick: now(),
    hp: 0, mp: 0, stamina: 100, silver: 30, contrib: 0, activeTrainingSkillId: null,
    manuals: {}, active: { mugong: null, simbeop: null, gyeonggong: null, gigong: null },
    inv: { potionHp: 3, herb: 2, ['bk_' + mugongId]: 1, bk_tonap: 1, bk_pocheolsak: 1, bk_cheolpo: 1 },
    gear: [], equip: {},
    shrine: { atk: 0, mp: 0, eva: 0, total: 0 },
    perm: { maxHp: 0, maxMp: 0 },
    crafts: { forge: { lv: 1, xp: 0 }, alchemy: { lv: 1, xp: 0 }, cook: { lv: 1, xp: 0 } },
    codex: [], hints: [], flags: {},
    zone: null, seen: {},
    buffs: [], missions: [], arin: {}, supplyDay: '', restCd: 0, uid: 1,
    kills: 0, log: [],
  };
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

/* 견문록 기록은 상태에 남기고, 화면에는 신호로 알린다 */
function log(text, cls = '') {
  const entry = { t: now(), text, cls };
  S.log.push(entry);
  if (S.log.length > 120) S.log.splice(0, S.log.length - 120);
  Bus.emit('log', entry);
}

/* 새 게임: 시작 화면에서 이름과 입문 비급을 고른 뒤 부른다 */
function startNewGame(name, mugongId) {
  S = newState(name, mugongId);
  const wt = MANUALS[mugongId].weapon;
  S.equip.weapon = makeGear(wt, 1, 0, false);
  const st = calcStats(); S.hp = st.maxHp; S.mp = st.maxMp;
  ensureMissions();
  log(`${name}, 청풍문의 제자가 되었습니다. ${hlItem(`《${MANUALS[mugongId].name}》 비급`)}과 ${hlItem('토납법·포철삭·철포삼 비급')}을 행낭에 받았습니다.`, 'gold');
  log('노벽송: "비급은 읽기만 해선 소용없다. 익히고, 몸에 걸고, 수련해라."', 'npc');
  log(`조운: "${WEAPON_TYPES[wt]}${jo(WEAPON_TYPES[wt], '이가')} 필요하겠지. 이거라도 쥐고 다녀라." — ${S.equip.weapon.name} 착용`, 'npc');
  log('아린: "새 사형이다! 비급부터 익혀요. 상태 탭의 무공에 있어요!"', 'npc');
}

/* 예전 저장을 지금 규칙에 맞게 옮긴다. 비율을 유지해 진행도를 잃지 않는다.
   tryStar가 전역 S를 보므로 S에 담은 뒤 부른다. */
function migrate(st) {
  if (!st) return null;
  if ((st.v || 0) < 3) {
    st.activeTrainingSkillId = null; delete st.training; delete st.gatherCd; delete st.opened; delete st.cleared;
    st.v = 3;
  }
  if ((st.v || 0) < 5) st.v = 5;
  if (st.v < 6) {
    // 수련 경험치 눈금이 '초'로 바뀌었으므로 진행 비율을 유지한 채 환산한다
    const oldNeed = n => Math.round(40 * Math.pow(1.28, n - 1));
    for (const m of Object.values(st.manuals)) if (m.star < MAX_STAR) m.txp = m.txp / oldNeed(m.star) * need(m.star);
    st.v = 6;
  }
  if (st.v < 7) {
    // 경계가 3개(3·7·11성)에서 2개(5·11성)로, 수련·실전 눈금도 바뀌었으므로 진행 비율을 유지해 환산한다
    const oldT = n => Math.round((n <= 3 ? 4 / 3 : n <= 7 ? 2 : 6) * 3600), oldC = n => n <= 3 ? 10 : n <= 7 ? 20 : 40;
    for (const m of Object.values(st.manuals)) {
      if (m.star >= MAX_STAR) continue;
      m.txp = m.txp / oldT(m.star) * need(m.star); m.cxp = m.cxp / oldC(m.star) * needC(m.star);
      m.gate = false;
    }
    for (const id of Object.keys(st.manuals)) tryStar(id);
    if (st.zone) st.zone = null;
    st.v = 7;
  }
  if (st.zone && (!st.zone.layout || !st.zone.start || st.zone.layout.length !== MAP_H)) st.zone = null;
  return st;
}

/* 시간 흐름: 1초마다 수련을 쌓고, 화면에는 신호만 보낸다 */
let lastFrame = now();
function tick() {
  if (!S) return;
  const t = now(), dt = (t - lastFrame) / 1000; lastFrame = t;
  advance(Math.min(dt, 5), false);
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

function boot() {
  bindInput();
  S = load();
  S = migrate(S);
  if (!S) showIntro();
  else {
    const away = Math.min(OFFLINE_CAP, (now() - S.lastTick) / 1000);
    if (away > 30 && S.activeTrainingSkillId) {
      advance(away, true);
      log(`자리를 비운 ${Math.floor(away / 60)}분 동안 폐관수련이 이어졌습니다.`, 'gold');
    }
    ensureMissions();
    notify.refresh();
  }
  syncSide();
  lastFrame = now();
  setInterval(tick, 1000);
  setInterval(save, 10000);
  window.addEventListener('beforeunload', save);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
