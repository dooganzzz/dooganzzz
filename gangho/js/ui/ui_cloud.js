/* [화면] 클라우드 동기화 · 접속자: claude.ai 아티팩트로 열었을 때만 켜진다 (파일로 직접 열면 조용히 꺼진 채로 동작)
   - db:   players/<유저 id> 한 문서에 캐릭터 요약과 저장(길이를 줄인 것)을 올린다. 운영자(주인·편집자)만 모두를 읽는다.
   - room: 지금 이 게임을 열어 둔 사람들(접속자)과 각자의 캐릭터·보는 화면을 presence로 나눈다.
   - user: 유저 id(익명 토큰)와 이름(프로필). id는 저장·비교에만 쓰고 화면에는 이름으로 풀어 보인다.
   IP 주소는 claude.ai가 페이지에 주지 않는다 (알 수 있는 방법이 없다). */
const CLOUD = { on: false, db: null, room: null, user: null, uid: null, admin: false, players: [], peers: [], names: {}, lastSig: '', lastPres: '', writing: false, syncedAt: 0, note: '클라우드에 연결하는 중…' };

const cloudUA = () => { const u = navigator.userAgent; const os = /Android/.test(u) ? 'Android' : /iPhone|iPad/.test(u) ? 'iOS' : /Windows/.test(u) ? 'Windows' : /Mac OS/.test(u) ? 'macOS' : /Linux/.test(u) ? 'Linux' : '기타';
  const br = /Edg\//.test(u) ? 'Edge' : /Chrome\//.test(u) ? 'Chrome' : /Firefox\//.test(u) ? 'Firefox' : /Safari\//.test(u) ? 'Safari' : '브라우저'; return `${os} · ${br}${/Mobi/.test(u) ? ' (모바일)' : ''}`; };

/* 올릴 요약: 바뀐 게 있을 때만 쓴다 (시계로 바뀌는 값은 넣지 않는다) */
function cloudSummary() {
  if (!S) return null;
  const mu = S.active.mugong;
  return { name: S.name, cp: calculateCombatPower(S), silver: Math.floor(S.silver), exp: Math.floor(S.exp), contrib: Math.floor(S.contrib),
    zone: S.expedition.zone || null, mugong: mu ? MANUALS[mu].name : null, star: mu ? S.manuals[mu].star : 0, bestStar: bestMugongStar(),
    runs: (S.zoneLog ? Object.values(S.zoneLog).reduce((a, z) => a + z.trips, 0) : 0), bosses: ['boss1', 'boss2', 'boss3'].filter(k => S.flags[k]).length, weapon: weaponType() };
}
function cloudSaveBlob() {
  let blob = JSON.stringify({ ...S, log: S.log.slice(-60), expeditions: S.expeditions.slice(-2) });
  if (blob.length > 200000) blob = JSON.stringify({ ...S, log: [], expeditions: [] });
  return blob.length > 240000 ? null : blob;
}
async function cloudSync(force) {
  if (!CLOUD.db || !CLOUD.uid || !S || CLOUD.writing) return;
  const sum = cloudSummary(), sig = JSON.stringify(sum);
  if (!force && sig === CLOUD.lastSig) return;
  CLOUD.writing = true;
  try {
    await CLOUD.db.doc('players/' + CLOUD.uid).set({ ...sum, device: cloudUA(), syncedAt: Date.now(), save: cloudSaveBlob() });
    CLOUD.lastSig = sig; CLOUD.syncedAt = Date.now();
  } catch (e) { CLOUD.note = `동기화 실패: ${e && e.code || e}`; }
  CLOUD.writing = false;
  gmCloudChanged();
}
/* 접속자에게 보이는 내 상태 (바뀔 때만) */
function cloudPresence() {
  if (!CLOUD.room || !S) return;
  const p = { char: S.name, cp: calculateCombatPower(S), zone: S.expedition.zone || '', tab: typeof ui !== 'undefined' ? ui.tab : '', device: cloudUA(), uid: CLOUD.uid };
  const sig = JSON.stringify(p); if (sig === CLOUD.lastPres) return;
  CLOUD.lastPres = sig; CLOUD.room.presence(p).catch(() => {});
}
async function cloudNames(ids) {
  if (!CLOUD.user || !ids.length) return;
  const miss = ids.filter(id => id && !(id in CLOUD.names)); if (!miss.length) return;
  const ps = await CLOUD.user.profiles(miss);
  for (const id of miss) CLOUD.names[id] = (ps[id] && ps[id].name) || '';
  gmCloudChanged();
}
/* 운영자 콘솔 유저 탭이 열려 있으면 다시 그린다 */
function gmCloudChanged() { if (typeof GM !== 'undefined' && GM.open && GM.tab === 'users') gmRender(); }

async function cloudInit() {
  const C = window.claude;
  if (!C || typeof C.use !== 'function') { CLOUD.note = '클라우드 없음 — 파일로 직접 연 게임에서는 접속자·DB를 볼 수 없습니다 (claude.ai 아티팩트에서 여십시오).'; return; }
  const [db, room, user] = await Promise.all(['db', 'room', 'user'].map(n => C.use(n).catch(() => null)));
  Object.assign(CLOUD, { db, room, user, on: !!(db || room) });
  if (user) { CLOUD.uid = await user.id(); CLOUD.admin = (await user.isOwner()) || (await user.canEdit()); }
  CLOUD.note = CLOUD.on ? '' : '이 화면에서는 클라우드 기능을 쓸 수 없습니다.';
  if (room) {
    room.onPeers(ch => { CLOUD.peers = ch.peers.filter(p => p.kind === 'viewer'); cloudNames(CLOUD.peers.map(p => p.by || p.presence.uid).filter(Boolean)); gmCloudChanged(); });
    cloudPresence();
    setInterval(cloudPresence, 5000);
  }
  if (db && CLOUD.admin) {
    db.collection('players').onSnapshot(snap => { CLOUD.players = snap.docs.map(d => ({ id: d.id, ...d.data() })); cloudNames(CLOUD.players.map(p => p.id)); gmCloudChanged(); },
      e => { CLOUD.note = `유저 DB를 읽지 못했습니다: ${e.code}`; gmCloudChanged(); });
  }
  if (db && CLOUD.uid) { cloudSync(); setInterval(cloudSync, 60000); }   // 1분마다 확인하고, 바뀐 게 있을 때만 쓴다
}
if (!window.GM_REMOTE) setTimeout(cloudInit, 0);
