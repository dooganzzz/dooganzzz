/* [화면] GM 콘솔의 탭 화면: 행동 추적 · 아이템 DB · 조합법 · 쾌속 치트 · 유저 · AI 자동 플레이 · 게임 DB
   (콘솔 뼈대 · 명령 · 별도 창 연결 · 입력은 ui_admin.js) */

/* 2. 행동 추적 */
function gmViewTrace() {
  const kinds = Object.keys(GM_KIND);
  return `<div class="gm-bar"><button class="gm-btn" data-gm="cleartrace">[로그 비우기]</button><small class="gm-muted">최신이 위 · 최대 ${GM_TRACE_MAX}줄 · 견문록과 별개</small></div>
    <div class="gm-legend">${kinds.map(k => `<span class="gm-k k-${k.replace(/\W/g, '')}">${GM_KIND[k]}</span>`).join('')}</div>
    <ol class="gm-trace" id="gmTrace"></ol>`;
}
function gmRenderTrace() {
  const el = $('#gmTrace'); if (!el) return;
  el.innerHTML = GM.trace.length ? GM.trace.map(r => `<li><time>${gmTime(r.t)}</time><span class="gm-k k-${r.kind.replace(/\W/g, '')}">${GM_KIND[r.kind] || r.kind}</span><span>${esc(r.text)}</span></li>`).join('') : '<li class="gm-muted">기록 없음</li>';
}

/* 3. 아이템 DB · 소환 */
function gmViewItems() {
  const kinds = ['all', ...new Set(Object.values(ITEMS).map(I => I.kind))];
  return `<div class="gm-bar"><input type="search" placeholder="ID·이름 검색" value="${esc(GM.itemQ)}" data-gminput="itemQ" aria-label="아이템 검색">
    <select data-gminput="itemKind" aria-label="분류">${kinds.map(k => `<option value="${k}" ${GM.itemKind === k ? 'selected' : ''}>${k === 'all' ? '전체 분류' : k}</option>`).join('')}</select></div>
    <table class="gm-table"><thead><tr><th>ID</th><th>이름</th><th>분류</th><th>가치</th><th>보유</th><th></th></tr></thead><tbody id="gmItemRows"></tbody></table>`;
}
function gmRenderItems() {
  const el = $('#gmItemRows'); if (!el) return;
  const q = GM.itemQ.trim().toLowerCase();
  const rows = Object.entries(ITEMS).filter(([id, I]) => (GM.itemKind === 'all' || I.kind === GM.itemKind) && (!q || id.toLowerCase().includes(q) || I.name.includes(q)));
  el.innerHTML = rows.map(([id, I]) => `<tr><td><code>${id}</code></td><td>${I.icon} ${I.name}</td><td>${I.kind}${I.craftType ? ' · ' + I.craftType : ''}</td><td class="gm-num">${I.price}</td><td class="gm-num">${count(id)}</td>
    <td class="gm-acts"><button class="gm-btn" data-gmspawn="${id}" data-n="1">+1 소환</button><button class="gm-btn" data-gmspawn="${id}" data-n="10">+10 소환</button></td></tr>`).join('')
    || '<tr><td colspan="6" class="gm-muted">맞는 아이템이 없습니다.</td></tr>';
}
function gmSpawn(id, n) { if (ITEMS[id]) gmDo('spawn', id, n); }

/* 4. 조합법 */
function gmViewRecipes() {
  const crafts = ['all', ...Object.keys(CRAFTS)];
  const list = RECIPES.filter(r => GM.recipeCraft === 'all' || r.craft === GM.recipeCraft);
  return `<div class="gm-bar">${crafts.map(c => `<button class="gm-btn ${GM.recipeCraft === c ? 'on' : ''}" data-gmcraft="${c}">${c === 'all' ? '전체' : CRAFTS[c].name}</button>`).join('')}<small class="gm-muted">${list.length}종</small></div>
    <table class="gm-table"><thead><tr><th>ID</th><th>기예</th><th>재료</th><th>결과</th><th>도감</th><th></th></tr></thead><tbody>${list.map(r => `<tr>
      <td><code>${r.id}</code></td><td>${CRAFTS[r.craft].name}</td>
      <td>${Object.entries(r.in).map(([id, n]) => `${ITEMS[id].name} ×${n}`).join(', ')}</td>
      <td>${recipeIcon(r)} ${recipeName(r)}</td><td>${S.codex.includes(r.id) ? '해금' : '—'}</td>
      <td class="gm-acts"><button class="gm-btn" data-gmmats="${r.id}">필요 재료 지급</button></td></tr>`).join('')}</tbody></table>`;
}
function gmGiveMats(rid) { gmDo('mats', rid); }

/* 5. 쾌속 치트 */
function gmViewCheat() {
  const zone = S && S.expedition.zone;
  return `<div class="gm-cheats">
    <button class="gm-btn big" data-gm="silver" ${S ? '' : 'disabled'}>[은자 +1,000냥]</button>
    <button class="gm-btn big" data-gm="exp" ${S ? '' : 'disabled'}>[수련치 +1,000]</button>
    <div class="gm-moves">초식 100%: ${[['off', '끔(35%)'], ['mix', '매번 · 60/30/10'], ['0', '제1초식만'], ['1', '제2초식만'], ['2', '오의만']].map(([k, t]) =>
      `<button class="gm-btn ${S && String(S.gmMove == null ? 'off' : S.gmMove) === k ? 'on' : ''}" data-gm="move_${k}" ${S ? '' : 'disabled'}>${t}</button>`).join('')}</div>
    <button class="gm-btn big" data-gm="heal" ${S ? '' : 'disabled'}>[활력/내력 100% 회복]</button>
    <button class="gm-btn big" data-gm="stamina" ${S ? '' : 'disabled'}>[기력 가득]</button>
    <button class="gm-btn big" data-gm="expedite" ${S ? '' : 'disabled'}>[강호행 시작 · 다음 걸음 즉시]</button>
    <button class="gm-btn big" data-gm="hour" ${zone ? '' : 'disabled'}>[1시간 경과 (강호행 중)]</button>
    <button class="gm-btn big" data-gm="hours8" ${zone ? '' : 'disabled'}>[8시간 경과 (강호행 중)]</button>
    <button class="gm-btn big danger ${GM.resetArm ? 'armed' : ''}" data-gm="reset">${GM.resetArm ? '[정말 초기화 — 한 번 더 누르기]' : '[데이터 완전 초기화]'}</button>
  </div>
  <p class="gm-muted">${zone ? `탐험지 ${zone} · 기력 ${Math.round(S.stamina)}` : '탐험지가 없으면 [탐험 즉시 1회]는 청풍산으로 보냅니다.'}</p>`;
}
function gmCheat(what) {
  if (what === 'reset' && !GM.resetArm) { GM.resetArm = true; gmRender(); return; }
  GM.resetArm = false;
  gmDo('cheat', what);
}

/* 6. 유저: 접속 중인 사람(room) · DB에 동기화된 모든 캐릭터(db). 게임 창 오버레이에서만 (별도 창은 아티팩트 기능이 없다) */
function gmViewUsers() {
  if (GM_REMOTE || typeof CLOUD === 'undefined') return '<p class="gm-muted">claude.ai 접속자 · DB는 게임 창의 GM 오버레이에서만 보입니다.</p>' + gmSupaSection();
  const nm = id => (id && CLOUD.names[id]) || '이름 비공개';
  const since = t => { if (!t) return '—'; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? '방금' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.floor(m / 60)}시간 전` : `${Math.floor(m / 1440)}일 전`; };
  const onlineIds = new Set(CLOUD.peers.map(p => p.by || p.presence.uid).filter(Boolean));
  const ZN = z => (z && ZONES[z] ? ZONES[z].name : '—');
  const peers = CLOUD.peers.map((p, i) => `<tr><td>${i + 1}</td><td>${esc(nm(p.by || p.presence.uid))}${p.isMe ? ' <b class="gm-me">나</b>' : ''}${p.guest ? ' <small>(외부)</small>' : ''}</td><td>${esc(p.presence.char || '—')}</td><td class="gm-num">${p.presence.cp ? fmt(p.presence.cp) : '—'}</td><td>${ZN(p.presence.zone)}</td><td>${esc(p.presence.tab || '—')}</td><td>${esc(p.presence.device || '—')}</td></tr>`).join('');
  const players = [...CLOUD.players].sort((a, b) => (b.syncedAt || 0) - (a.syncedAt || 0)).map((p, i) => `<tr>
    <td>${i + 1}</td><td>${onlineIds.has(p.id) ? '<b class="gm-on">●</b>' : '<span class="gm-off">○</span>'} ${esc(nm(p.id))}${p.id === CLOUD.uid ? ' <b class="gm-me">나</b>' : ''}</td>
    <td>${esc(p.name || '—')}</td><td class="gm-num">${p.cp ? fmt(p.cp) : '—'}</td><td>${esc(p.mugong || '—')} ${p.star || 0}성</td><td class="gm-num">${fmt(p.silver || 0)}</td><td>${ZN(p.zone)}</td>
    <td class="gm-num">${p.runs || 0}번 · 두목 ${p.bosses || 0}</td><td>${esc(p.device || '—')}</td><td>${since(p.syncedAt)}</td>
    <td class="gm-acts">${p.save && p.id !== CLOUD.uid ? `<button class="gm-btn" data-gmimport="${esc(p.id)}" title="이 유저의 저장을 지금 게임으로 가져옵니다 (지금 저장은 백업)">저장 불러오기</button>` : ''}</td></tr>`).join('');
  return `<div class="gm-kv"><div><span>접속 중</span><b>${CLOUD.peers.length}명</b></div><div><span>DB 유저</span><b>${CLOUD.admin ? CLOUD.players.length + '명' : '권한 없음'}</b></div><div><span>내 동기화</span><b>${since(CLOUD.syncedAt)}</b></div></div>
    <div class="gm-bar"><button class="gm-btn primary" data-gm="cloudsync" ${CLOUD.db ? '' : 'disabled'}>[지금 DB 동기화]</button>${typeof backupInfo === 'function' && backupInfo('import') ? '<button class="gm-btn" data-gm="importundo">[불러오기 전으로 되돌리기]</button>' : ''}<small class="gm-muted">${esc(CLOUD.note || '저장이 바뀔 때마다(1분 간격 확인) players DB에 올라갑니다.')}</small></div>
    <h4 class="gm-h">지금 접속 중</h4>
    <table class="gm-table"><thead><tr><th>#</th><th>유저</th><th>캐릭터</th><th>투력</th><th>탐험지</th><th>보는 화면</th><th>기기</th></tr></thead><tbody>${peers || '<tr><td colspan="7" class="gm-muted">접속자 정보가 없습니다.</td></tr>'}</tbody></table>
    <h4 class="gm-h">전체 유저 (DB)</h4>
    <table class="gm-table"><thead><tr><th>#</th><th>유저</th><th>캐릭터</th><th>투력</th><th>무공</th><th>은자</th><th>탐험지</th><th>탐험</th><th>기기</th><th>마지막 동기화</th><th></th></tr></thead><tbody>${players || `<tr><td colspan="11" class="gm-muted">${CLOUD.admin ? '아직 동기화된 유저가 없습니다.' : '주인·편집자만 전체 유저를 볼 수 있습니다.'}</td></tr>`}</tbody></table>
    <p class="gm-muted">claude.ai 유저 ID는 익명 토큰이라 화면에는 이름으로 풀어 보입니다 (claude.ai는 IP를 알려 주지 않습니다). IP는 아래 웹 유저(Supabase) 기록에만 남습니다.</p>
    ${gmSupaSection()}`;
}

/* 7. AI 자동 플레이: 지금 캐릭터로 1 · 2 · 3일을 미리 살아 본다 (실행 전 저장은 백업) */
function gmViewAI() {
  const R = GM.aiReport, bk = typeof backupInfo === 'function' ? backupInfo('ai') : null;
  const pats = Object.entries(AI_PATTERNS).map(([k, P]) => `<button class="gm-btn ${GM.aiPattern === k ? 'on' : ''}" data-gmaipat="${k}">${P.name}</button>`).join('');
  const d = (a, b, f = fmt) => `${f(a)} → <b>${f(b)}</b>`;
  const rep = !R ? '<p class="gm-muted">아직 돌린 기록이 없습니다.</p>' : `
    <div class="gm-kv"><div><span>기간</span><b>${R.days}일</b></div><div><span>패턴</span><b>${R.pattern.split(' (')[0]}</b></div><div><span>투력</span><b>${d(R.before.cp, R.after.cp)}</b></div><div><span>무공 성</span><b>${R.before.star} → ${R.after.star}</b></div><div><span>가르침</span><b>${R.before.q} → ${R.after.q} / ${QUESTS.length}</b></div><div><span>토벌 임무</span><b>${R.after.subq - R.before.subq}번</b></div><div><span>은자</span><b>${d(R.before.silver, R.after.silver)}</b></div><div><span>공헌도</span><b>${d(R.before.contrib, R.after.contrib)}</b></div><div><span>탐험지</span><b>${ZONES[R.before.zone] ? ZONES[R.before.zone].name : '—'} → ${ZONES[R.after.zone] ? ZONES[R.after.zone].name : '—'}</b></div><div><span>계산 시간</span><b>${R.ms}ms</b></div></div>
    <table class="gm-table"><thead><tr><th>날</th><th>탐험</th><th>승</th><th>패</th><th>쓰러짐</th><th>두목</th><th>투력</th><th>무공</th><th>심법·경공·기공</th><th>은자</th><th>수련치</th><th>탐험지</th></tr></thead><tbody>${R.daily.map(x => `<tr><td>${x.label}</td><td class="gm-num">${x.runs}</td><td class="gm-num">${x.wins}</td><td class="gm-num">${x.losses}</td><td class="gm-num">${x.defeats}</td><td class="gm-num">${x.bosses}</td><td class="gm-num">${fmt(x.end.cp)}</td><td>${x.end.stars.mugong}성</td><td>${x.end.stars.simbeop}·${x.end.stars.gyeonggong}·${x.end.stars.gigong}성</td><td class="gm-num">${fmt(x.end.silver)}</td><td class="gm-num">${fmt(x.end.exp)}</td><td>${ZONES[x.end.zone] ? ZONES[x.end.zone].name : '—'}</td></tr>`).join('')}</tbody></table>
    <h4 class="gm-h">있었던 일</h4><ol class="gm-notes">${R.notes.map(n => `<li><time>${n.day}일 ${hhmm(n.t)}</time><span>${esc(n.text)}</span></li>`).join('') || '<li class="gm-muted">특별한 일이 없었습니다.</li>'}</ol>`;
  return `<p class="gm-muted">지금 캐릭터로 며칠을 미리 살아 봅니다. 시계를 그만큼 앞당겨 강호행이 실제 규칙 그대로 이어지고(쓰러지면 AI가 보상을 받고 다시 떠남), 접속한 시각마다 AI가 잘 아는 유저처럼 움직입니다: 가르침 · 토벌 임무(하루 5번)를 모두 깨고, 화로 조합식으로 장비 · 생혈고를 빚고, 전방에서 물약 · 더 나은 장비를 사고, 공헌도로 장경각의 가장 좋은 장비 · 비급 · 신분패를 바꾸고, 버티면서 가장 많이 버는 탐험지 · 단계에서 사냥합니다(막히면 내려가 힘을 기르고 다시 밉니다). 밸런스 기준으로 씁니다. 실행 전 저장은 백업됩니다.</p>
    <div class="gm-bar">${pats}</div>
    <div class="gm-cheats">${[1, 3, 7].map(n => `<button class="gm-btn big primary" data-gmai="${n}" ${S && !GM.aiBusy ? '' : 'disabled'}>[${n}일 돌리기]</button>`).join('')}
      <button class="gm-btn big" data-gm="airestore" ${bk ? '' : 'disabled'}>[AI 실행 전으로 되돌리기]${bk ? ` <small>${hhmm(bk)} 백업</small>` : ''}</button></div>
    ${GM.aiBusy ? '<p class="gm-muted">AI가 강호를 누비는 중…</p>' : ''}
    ${rep}`;
}

/* 요수 DB 편집: 고칠 수 있는 능력치 (값이 비면 그 특수 규칙을 뺀다) */
const GM_ENEMY_KEYS = { hp: '활력', atk: '공격', def: '방어', spd: '속도', eva: '회피', crit: '치명', acc: '명중', hits: '연격', pierce: '관통', xp: '수련치' };
function gmEnemyOrig() { if (GM.orig) return; GM.orig = {}; for (const [id, E] of Object.entries(ENEMIES)) { GM.orig[id] = {}; for (const k of Object.keys(GM_ENEMY_KEYS)) GM.orig[id][k] = E[k]; } }
/* 8. 게임 DB: 지금 게임에 들어 있는 데이터 전체 (요수 · 무공 · 탐험지 · 그림 연결) */
function gmViewDB() {
  const tabs = [['monsters', `요수 ${Object.keys(ENEMIES).length}`], ['manuals', `무공 ${Object.keys(MANUALS).length}`], ['zones', `탐험지 ${ZONE_ORDER.length}`]];
  const bar = `<div class="gm-bar">${tabs.map(([k, n]) => `<button class="gm-btn ${GM.dbTab === k ? 'on' : ''}" data-gmdbtab="${k}">${n}</button>`).join('')}<small class="gm-muted">데이터 파일(js/data)을 그대로 읽어 보여 줍니다</small></div>`;
  if (GM.dbTab === 'manuals') return bar + `<table class="gm-table"><thead><tr><th>ID</th><th>이름</th><th>분류</th><th>등급</th><th>병기·속성</th><th>초식 (제1 · 소성 제2 · 대성 오의)</th><th>초식 그림</th></tr></thead><tbody>${Object.entries(MANUALS).map(([id, M]) => `<tr><td><code>${id}</code></td><td>${M.name}</td><td>${CATS[M.cat].name}</td><td>${M.grade}</td><td>${M.weapon ? WEAPON_TYPES[M.weapon] : M.terrain || M.elem || '—'}</td><td>${(M.stances || []).map(x => x.name).join(' · ')}</td><td>${M.cat === 'mugong' && M.weapon ? `<code>fx/${id}_1 · _2</code>` : '—'}</td></tr>`).join('')}</tbody></table>`;
  if (GM.dbTab === 'zones') return bar + `<table class="gm-table"><thead><tr><th>ID</th><th>이름</th><th>단계</th><th>요수</th><th>두목</th><th>열림 조건</th><th>무대 · 산길</th></tr></thead><tbody>${ZONE_ORDER.map(z => { const Z = ZONES[z]; return `<tr><td><code>${z}</code></td><td>${Z.name}</td><td>${Z.tier}</td><td>${Z.enemies.map(e => ENEMIES[e].name).join(', ')}</td><td>${ENEMIES[Z.boss] ? ENEMIES[Z.boss].name : '—'}</td><td>${Z.unlock ? Z.unlock.boss : '처음부터'}</td><td><code>stages/${z}.jpg · travel/${z}.jpg</code></td></tr>`; }).join('')}</tbody></table>`;
  // 요수: 주요 능력치를 바로 고치고 '적용'으로 지금 게임에 넣는다 (GM_ENEMY_KEYS · gmEnemyOrig는 처음 연 순간의 원래 값)
  gmEnemyOrig();
  const n = Object.values(GM.edits).reduce((a, o) => a + Object.keys(o).length, 0), changed = Object.keys(GM.applied).length;
  const tools = `<div class="gm-bar"><button class="gm-btn primary" data-gm="enemyapply" ${n ? '' : 'disabled'}>적용 <b id="gmEditN">${n}</b>건</button><button class="gm-btn" data-gm="enemyrevert" ${changed ? '' : 'disabled'}>원래 값으로 (${changed}종)</button><button class="gm-btn" data-gm="enemycopy" ${changed ? '' : 'disabled'}>바뀐 값 복사</button><small class="gm-muted">칸을 고친 뒤 '적용'을 누르면 다음 전투부터 바로 쓰입니다. 이 게임(브라우저)에만 적용되고 새로 고치면 원래 값으로 돌아갑니다</small></div>`;
  const cell = (id, k) => { const v = GM.edits[id] && GM.edits[id][k] !== undefined ? GM.edits[id][k] : ENEMIES[id][k] ?? ''; const ch = (GM.edits[id] && GM.edits[id][k] !== undefined) ? 'edit' : GM.applied[id] && GM.applied[id].includes(k) ? 'done' : ''; return `<td><input class="gm-in ${ch}" type="number" step="any" inputmode="decimal" data-gmstat="${id}|${k}" value="${v ?? ''}" aria-label="${ENEMIES[id].name} ${GM_ENEMY_KEYS[k]}"></td>`; };
  return bar + tools + `<div class="gm-scroll"><table class="gm-table gm-edit"><thead><tr><th>ID</th><th>이름</th><th>단계</th><th>탐험지</th>${Object.values(GM_ENEMY_KEYS).map(t => `<th>${t}</th>`).join('')}<th>투력</th></tr></thead><tbody>${Object.entries(ENEMIES).map(([id, E]) => `<tr><td><code>${id}</code></td><td>${E.boss ? '👹 ' : ''}${E.name}</td><td>${E.tier || '—'}</td><td>${(ZONES[zoneOfEnemy(id)] || {}).name || '—'}</td>${Object.keys(GM_ENEMY_KEYS).map(k => cell(id, k)).join('')}<td class="gm-num">${fmt(foeCombatPower(id))}</td></tr>`).join('')}</tbody></table></div>`;
}
