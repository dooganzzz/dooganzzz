/* [화면] 강호행: 탐험지 고르기 · 강호행 시작/귀환 · 탐험 기록, 결산 창 (무대는 ui_live.js, 관찰은 ui_replay.js) */

/* 1초마다 흐른 시간만 바꿔 쓴다 (화면 전체를 다시 그리지 않는다) */
Bus.on('tick', () => {
  for (const el of document.querySelectorAll('[data-runclock]')) el.textContent = runClockText();
  const scn = $('#liveScene'); if (scn && scn.dataset.tod !== liveTod()) scn.dataset.tod = liveTod();   // 시간대 빛깔
  // 방금 치른 전투는 무대에서 기록 그대로 재생한다 (다시 그리기와 상관없이, 전투마다 한 번)
  { const lr = liveRec(), st = lr && lr.steps.length ? lr.steps[lr.steps.length - 1] : null, key = st && st.b !== undefined ? `${lr.id}:${st.b}` : null;
    if (scn && key && key !== liveAnim.lastBattle && now() - stepAt(lr, lr.steps.length - 1) < 6000) { liveAnim.lastBattle = key; const bt = lr.battles[st.b]; liveShowQueue(bt.eid, true, bt.boss, { rid: lr.id, bi: st.b }); } }
  const sig = liveSig(); if (sig === lastLiveSig) return; lastLiveSig = sig;   // 새 걸음이 드러났을 때만
  const box = $('#liveSide'); if (box) setHTML(box, liveSide());
  const sc = $('#liveScene'), lr = liveRec();
  if (sc) {
    sc.classList.toggle('rest', liveDone(lr));
    const wh = sc.querySelector('.live-where'), X = S.expedition; if (wh && (lr ? lr.zone : X.zone)) wh.textContent = stageName(lr ? lr.zone : X.zone, lr && lr.live ? lr.stage : X.stage || 1);
  }
  if (typeof ui !== 'undefined' && ui.tab === 'chronicle' && !ui.modal) render();
});

/* ───────── 실시간 강호행: 산길을 걷는 제자와 견문록 ───────── */
let lastLiveSig = '';
function liveSig() { const X = S && S.expedition; return S ? S.expeditions.map(r => `${r.id}:${r.steps.length}${r.live ? `L${r.stage}.${r.kills}` : ''}${r.claimed ? 'c' : ''}${r.battles.filter(b => b.seen !== false).length}`).join(',') + `|${X.zone || ''}|${X.stage}|${X.auto}|${stageCleared(X.zone)}|${count('saenghyeol')}` : ''; }
/* 단계 줄: 1~10단계 (돌파 ✔ · 지금 · 잠김). 강호행 전에는 출발 단계를 고르고, 강호행 중에는 그 단계로 옮겨 간다 */
function stageStrip() {
  const X = S.expedition, zid = X.zone; if (!zid) return '';
  const run = activeRun(), cur = run && run.zone === zid ? run.stage : X.stage, max = stageMax(zid), done = stageCleared(zid);
  const cells = Array.from({ length: STAGE.count }, (_, i) => { const n = i + 1, open = n <= max;
    return `<button class="stage-cell ${n === cur ? 'on' : ''} ${n <= done ? 'done' : ''} ${n === STAGE.count ? 'boss' : ''}" data-stage="${n}" ${open ? '' : 'disabled'} title="${open ? stageName(zid, n) : '앞 단계를 돌파하면 열립니다'}">${n === STAGE.count ? '頭' : n}</button>`; }).join('');
  const seen = { ...((S.zoneLog[zid] || {}).seen || {}) }; if (run) for (const b of run.battles) seen[b.eid] = 1;
  const foes = stageFoes(zid, cur).map(e => seen[e] ? ENEMIES[e].name : '？').join(' · ');
  return `<div class="stage-strip">${cells}</div>
    <p class="stage-info"><b>${stageName(zid, cur)}</b> <span class="muted">${cur >= STAGE.count ? '두목' : '요수'}: ${foes}</span>${run ? ` · 돌파까지 <b>${run.kills}</b> / ${stageNeed(run.stage)}승` : cur <= done ? ' <span class="good">돌파함</span>' : ''}
      <button class="chip sm ${X.auto !== false ? 'on' : ''}" data-stageauto>${X.auto !== false ? '돌파하면 다음 단계로' : '이 단계에 머물기'}</button></p>`;
}
const runClockText = () => { const r = activeRun(); return r ? hhmmss(now() - r.at) : '—'; };
function liveStepRow(r, i, t) {
  const st = r.steps[i], seen = st.b === undefined || battleSeen(r, st.b);
  const btn = st.b !== undefined ? `<button class="watch" data-watch="${r.id}:${st.b}">관찰</button>` : '';
  return `<li class="${seen ? st.cls : 'enc'} ${t - stepAt(r, i) < 4000 && r.live ? 'fresh' : ''}"><time>${hhmm(stepAt(r, i))}</time><span>${chronDecor(stepText(r, st))}</span>${btn}</li>`;
}
function liveSide() {
  const r = liveRec(), t = now(), run = activeRun(), pend = pendingRecs(), X = S.expedition;
  const startBtn = `<button class="btn ${pend.length ? '' : 'primary'}" data-act="runstart" ${X.zone ? '' : 'disabled'}>강호행 시작</button>`;
  const claimBtn = pend.length ? `<button class="btn primary" data-act="claim">최종보상확인${pend.length > 1 ? ` (${pend.length}번)` : ''}${alertDot(true)}</button>` : '';
  const pots = `생혈고 <b class="${count('saenghyeol') < 3 ? 'warn' : ''}">${count('saenghyeol')}</b>개`;
  if (!r) return `${stageStrip()}<p class="muted live-empty">${X.zone ? `${josa(stageName(X.zone, X.stage || 1), '으로')} 떠날 준비가 되었습니다. [강호행 시작]을 누르면 단계를 하나씩 돌파하며, 쓰러질 때까지 쭉 나아갑니다. (${pots})` : '아래 탐험지에서 갈 곳을 먼저 정하십시오.'}</p><div class="btns live-btns">${startBtn}</div>`;
  const rows = [];
  for (let i = r.steps.length - 1; i >= 0; i--) rows.push(liveStepRow(r, i, t));
  const unseen = r.battles.filter(b => b.seen === false).length, st = calcStats(), hpP = clamp(S.hp / st.maxHp * 100, 0, 100);
  const nm = stageName(r.zone, r.stage || 1), cl = r.cleared && r.cleared.length ? ` · 돌파 ${r.cleared.length}번` : '';
  const state = run ? `강호행 중 · <span data-runclock>${runClockText()}</span> · 견문 ${r.steps.length} · 전투 ${r.battles.length}${cl}`
    : r.end === 'dead' ? `<b class="warn">${nm}에서 쓰러져 강호행이 끝났습니다.</b> 견문 ${r.steps.length} · 전투 ${r.battles.length}${cl}`
    : `<b>${nm}에서 돌아왔습니다.</b> 견문 ${r.steps.length} · 전투 ${r.battles.length}${cl}`;
  return `${stageStrip()}${run ? `<div class="live-prog hp" title="활력"><span style="width:${hpP.toFixed(1)}%"></span></div><p class="live-vit"><span>활력 ${fmt(Math.round(S.hp))} / ${fmt(st.maxHp)}</span><span>${pots}</span></p>` : ''}
    <p class="live-state">${state}${unseen ? ` · <span class="warn">안 본 전투 ${unseen}</span>` : ''}</p>
    <ol class="live-log">${rows.join('') || '<li class="muted">산문을 나섰습니다…</li>'}</ol>
    <div class="btns live-btns">
      ${run ? '<button class="btn ghost" data-act="runstop">귀환하기</button>' : `${claimBtn}${startBtn}`}
    </div>
    ${run ? '<small class="muted">전투에서 지면 쓰러지고 강호행이 끝납니다. 얻은 것은 끝난 뒤 [최종보상확인]으로 받습니다.</small>' : !X.zone ? '' : `<small class="muted">${pots} · 전방에서 개당 5냥</small>`}`;
}
function livePanel() {
  const r = liveRec(), run = activeRun();
  lastLiveSig = liveSig();
  return `<section class="panel live-panel">
    ${head('실시간 강호행', '江湖行 觀', `<span class="pill">${run ? '강호행 중' : '대기'}</span>`)}
    <div class="live-wrap">${liveScene(r)}<div class="live-side" id="liveSide">${liveSide()}</div></div>
  </section>`;
}
/* 최종보상확인: 받은 것을 펼쳐 보인다 */
function lootModal() {
  const g = ui.lootSum; if (!g) return '';
  const items = Object.entries(g.items).map(([id, n]) => `<li>${itemIco(id)}<b>${ITEMS[id].name}</b><span>×${n}</span></li>`).join('');
  const gear = g.gear.map(it => `<li><i class="chron-ico" style="background-image:url('${ASSET.ui('c_trophy')}')"></i><b>[${RARITY[it.rarity].name}] ${it.name}</b></li>`).join('');
  return `<div class="sheet loot-sheet">
    <p class="eyebrow">江湖行 · 최종 보상</p>
    <h2>${g.n > 1 ? `강호행 ${g.n}번에서 얻은 것` : '강호행에서 얻은 것'}</h2>
    <div class="settle-total"><span>${hlSilver(g.silver)}</span><span>수련치 +${fmt(g.exp)}</span>${g.contrib ? `<span>공헌 +${g.contrib}</span>` : ''}</div>
    ${items || gear ? `<ul class="loot-grid">${items}${gear}</ul>` : '<p class="muted">건진 물건은 없습니다.</p>'}
    <div class="btns"><button class="btn primary" data-act="closemodal">확인</button></div>
  </div>`;
}


const hhmmss = ms => { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return `${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(x).padStart(2, '0')}`; };
const recTime = r => hhmm(r.at);
function recSummary(r) {
  const g = r.gain, items = Object.entries(g.items || {}).map(([id, n]) => `${ITEMS[id].icon}${ITEMS[id].name} ×${n}`);
  return { head: `${r.wins}승 ${r.losses}패 · 은자 ${g.silver >= 0 ? '+' : ''}${fmt(g.silver)} · 수련치 +${fmt(g.exp)}${g.contrib ? ` · 공헌 +${g.contrib}` : ''}`, items, gear: g.gear || [], used: Object.entries(g.used || {}).map(([id, n]) => `${ITEMS[id].name} ×${n}`) };
}

/* 지형 상성 결산: 구역 지형과 경공 지형이 맞았는지, 그만큼 덜(더) 쓴 기력 */
const zoneTerrainText = zid => (ZONES[zid].terrain || []).map(t => `${TERRAINS[t].name}(${TERRAINS[t].hanja})`).join('·');
function terrainLine(r) {
  const T = r.terrain; if (!T || typeof T.match === 'number' || T.match === null) return '';   // 예전 기록 · 경공 없음
  return `지형 ${zoneTerrainText(r.zone)} · 경공 ${TERRAINS[T.mine].name} ${T.match ? '일치' : '불일치'} (기력 ${T.extra > 0 ? `+${Math.round(T.extra * 10) / 10} 더 씀` : `${Math.round(-T.extra * 10) / 10} 아낌`})`;
}

function vbar(cls, cur, prev, max, name, hideNum) {
  const p = v => max ? clamp(v / max * 100, 0, 100) : 0;
  return `<div class="bar thick ${cls}"><span class="bar-ghost" data-to="${p(cur)}" style="width:${p(Math.max(cur, prev))}%"></span><span class="bar-fill" style="width:${p(cur)}%"></span><span class="bar-text"><b>${name}</b>${hideNum ? '' : ` ${fmt(cur)} / ${fmt(max)}`}</span></div>`;
}
const sealChar = name => name.replace(/^(염화채주|수룡방주|염화채|수룡방|흑풍채|청풍산|적염|사나운|흑비단|바위 등껍질|청령|화염|적토|단애|열화|수로|뻘밭|소택지)\s*/, '').trim()[0] || name[0];

/* ───────── 강호행 탭 ───────── */
const clockHM = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

/* 구역 카드: 적정 전투력·난이도는 보여 주지 않는다. 내가 다녀오며 겪은 것만 적힌다 */
function zoneCard(zid) {
  const X = S.expedition, Z = ZONES[zid], open = zoneUnlocked(zid), here = X.zone === zid;
  const zl = (S.zoneLog || {})[zid], B = ENEMIES[Z.boss];
  const seen = zl ? Object.keys(zl.seen).filter(e => !ENEMIES[e].boss) : [];
  const exp = !zl ? '<small class="muted">다녀온 적이 없습니다. 무엇이 기다리는지 모릅니다.</small>'
    : `<div class="zone-log">
        <span>다녀옴 <b>${zl.trips}</b>번</span><span><b>${zl.wins}</b>승 <b class="${zl.losses ? 'warn' : ''}">${zl.losses}</b>패</span>
        ${zl.defeats ? `<span class="warn">쓰러짐 ${zl.defeats}</span>` : ''}${zl.retreats ? `<span>마을 치료 ${zl.retreats}</span>` : ''}
      </div>
      <small class="muted">만난 요수: ${seen.length ? seen.map(e => ENEMIES[e].name).join(' · ') : '—'} · 두목: ${zl.bossMet ? `${B.name}${S.flags[B.boss] ? ' <b class="gold">토벌</b>' : zl.bossWon ? '' : ' (아직 못 이김)'}` : '？'}</small>`;
  return `<div class="zone ${open ? '' : 'locked'} ${here ? 'here' : ''}">
    <div class="zone-scene">${zoneArt(zid)}</div>
    <div class="zone-top"><h3>${label(Z.name, Z.hanja)}</h3>${here ? '<span class="pill here-pill">현재 탐험지</span>' : ''}</div>
    <p class="story">${Z.desc}</p>
    <p class="zone-terrain">지형 ${(Z.terrain || []).map(terrainTag).join('')}</p>
    ${open ? exp : '<small class="muted">🔒 앞 구역의 두목을 쓰러뜨리면 길이 열립니다.</small>'}
    <div>${!open || here ? '' : `<button class="btn ${X.zone ? '' : 'primary'} sm" data-dest="${zid}">탐험지로 정하기</button>`}</div>
  </div>`;
}

/* 출정 준비: 떠나기 전에 갖춰 둘 것들 (탐험지·무공·병기·장비·생혈고·상성·단약) */
function prepPanel() {
  const X = S.expedition, st = calcStats(), mu = S.active.mugong, M = mu && MANUALS[mu];
  const worn = SLOT_ORDER.filter(k => S.equip[k]).length;
  const row = (ok, label, value, link) => `<li class="${ok ? 'ok' : 'warn'}"><span class="prep-mark">${ok ? '✔' : '！'}</span><span class="prep-k">${label}</span><span class="prep-v">${value}</span>${link || ''}</li>`;
  const go = (tab, sub, text) => `<button class="btn ghost sm" data-tab="${tab}"${sub ? ` data-sub="${sub}"` : ''}>${text}</button>`;
  const arts = CAT_ORDER.map(c => S.active[c] ? `${CATS[c].name} 《${MANUALS[S.active[c]].name}》 ${S.manuals[S.active[c]].star}성` : `<span class="warn">${CATS[c].name} 비어 있음</span>`).join(' · ');
  const wOk = !M || M.weapon === weaponType();
  return `<ul class="prep">
    ${row(!!X.zone, '탐험지', X.zone ? ZONES[X.zone].name : '정하지 않음')}
    ${row(CAT_ORDER.every(c => S.active[c]), '무공', arts, go('status', 'martial', '무공'))}
    ${row(!!S.equip.weapon && wOk, '병기', S.equip.weapon ? `${gearName(S.equip.weapon)}${wOk ? '' : ` <span class="warn">— 《${M.name}》은 ${WEAPON_TYPES[M.weapon]} 무공이라 초식이 나가지 않음</span>`}` : '맨손', go('status', 'gear', '무장'))}
    ${row(worn >= 5, '장비', `${worn} / ${SLOT_ORDER.length}칸 착용 · 전투력 ${fmt(calculateCombatPower(S))}`, go('bag', null, '행낭'))}
    ${row(has('saenghyeol', 5), '생혈고', `${count('saenghyeol')}개 (활력 35% 아래에서 자동 사용 · 떨어지면 쓰러지기 쉽다 · 전방 개당 5냥) · 소환단 ${count('potionMp')}개`, go('sect', 'shop', '전방'))}
    ${(() => { const e = myElem(), t = myTerrain(), m = X.zone ? terrainMult(X.zone) : 1;
      const tz = X.zone ? ` — ${ZONES[X.zone].name} ${zoneTerrainText(X.zone)} ${m < 1 ? '<b class="good">일치 · 기력 -20%</b>' : m > 1 ? '<span class="warn">불일치 · 기력 +20%</span>' : ''}` : '';
      return row(!!(e && t) && m <= 1, '상성', `기공 ${e ? elemTag(e) : '<span class="warn">오행 없음</span>'} · 경공 ${t ? terrainTag(t) : '<span class="warn">지형 없음</span>'}${tz} · 병기 ${weaponTag(weaponType())}`, go('status', 'martial', '무공')); })()}
    ${row(true, '준비한 단약', S.buffs.length ? S.buffs.map(b => b.name).join(', ') : '없음 (골계단·통맥환·해독산·청심단은 다음 원정 동안 효과)', go('bag', null, '행낭'))}
  </ul>`;
}

function viewField() {
  const X = S.expedition, st = calcStats(), cur = X.zone && ZONES[X.zone];
  const run = activeRun();
  const recs = [...S.expeditions].reverse().filter(r => liveDone(r)).map(r => {
    const sm = recSummary(r), Z = ZONES[r.zone];
    if (r.pend && !r.claimed) return `<details class="exp-rec"><summary><time>${recTime(r)}</time><b>${Z.name}</b><span>보상을 아직 받지 않았습니다</span><button class="watch claim" data-act="claim">최종보상확인</button></summary></details>`;
    return `<details class="exp-rec ${r.defeats ? 'defeat' : ''}">
      <summary><time>${recTime(r)}</time><b>${Z.name}</b><span>${sm.head}</span>${r.defeats ? `<em class="warn">쓰러짐</em>` : r.end === 'recall' ? '<em>귀환</em>' : ''}</summary>
      ${sm.items.length || sm.gear.length ? `<p class="exp-loot">${[...sm.items, ...sm.gear].map(t => `<span>${t}</span>`).join('')}</p>` : ''}
      ${terrainLine(r) ? `<p class="muted tr-line">⛰ ${terrainLine(r)}</p>` : ''}
      <ol class="exp-steps">${r.steps.map(s => { const seen = s.b === undefined || battleSeen(r, s.b); return `<li class="${seen ? s.cls : 'enc'}">${stepText(r, s)}${s.b !== undefined ? ` <button class="watch ${seen ? '' : 'unseen'}" data-watch="${r.id}:${s.b}">관찰</button>` : ''}</li>`; }).join('')}</ol>
    </details>`;
  }).join('');
  return `${livePanel()}<section class="panel">
    ${head('강호행', '江湖行', `<span class="pill">${cur ? `⛰️ ${cur.name}` : '탐험지 미정'}</span>`)}
    <div class="exp-status">
      <div class="exp-next"><small>${run ? `${ZONES[run.zone].name} 강호행 중` : '산문에서 대기 중'}</small><b data-runclock>${runClockText()}</b></div>
      <div class="exp-sta">${run ? '<button class="btn ghost sm" data-act="runstop">귀환하기</button>' : `<button class="btn primary sm" data-act="runstart" ${X.zone ? '' : 'disabled'}>강호행 시작</button>`}<small class="muted">${run ? '쓰러지거나 귀환할 때까지 이어집니다.' : '떠나기 전에 아래 준비를 갖춰 두십시오.'}</small></div>
    </div>
    <h4 class="prep-head">출정 준비</h4>
    ${prepPanel()}
    <p class="story">${cur ? `탐험지마다 10단계가 있습니다. 단계마다 ${STAGE.kills}번 이기면 돌파하고 다음 단계가 열리며, 10단계에는 두목이 기다립니다. [강호행 시작]을 누르면 제자가 고른 단계에서 ${EXPEDITION.stepMs / 1000}초마다 한 걸음씩 싸우고 줍습니다. 활력은 걸음 사이에 차지 않고, 위급하면 생혈고를 바릅니다. 전투에서 지면 쓰러지고 강호행은 끝납니다. 자리를 비워도 최대 ${EXPEDITION.catchUp / 3600000}시간까지 이어지고, 얻은 것은 끝난 뒤 [최종보상확인]으로 받습니다.` : '아래에서 탐험지를 고른 뒤 [강호행 시작]을 누르십시오.'}</p>
  </section>
  <section class="panel">${head('탐험지', '行先')}<p class="muted">어느 곳이 얼마나 위험한지는 알려 주지 않습니다. 다녀오며 몸으로 익히십시오.</p><div class="zones">${ZONE_ORDER.map(zoneCard).join('')}</div></section>
  <section class="panel">${head('탐험 기록', '見聞', `<span class="num muted">최근 ${S.expeditions.length} / ${EXPEDITION.keep}번</span>`)}
    ${recs || '<p class="story muted">아직 다녀온 탐험이 없습니다.</p>'}
  </section>`;
}

/* ───────── 결산 창: 자리를 비운 동안의 탐험을 한꺼번에 ───────── */
function settleModal(ids) {
  const recs = ids.map(findExpedition).filter(Boolean);
  if (!recs.length) return '';
  const tot = recs.reduce((a, r) => ({ w: a.w + r.wins, l: a.l + r.losses, s: a.s + r.gain.silver, e: a.e + r.gain.exp }), { w: 0, l: 0, s: 0, e: 0 });
  return `<div class="sheet settle-sheet">
    <p class="eyebrow">見聞錄 · 탐험 결산</p>
    <h2>${recs.length > 1 ? `탐험 ${recs.length}번의 결산` : '탐험에서 돌아왔습니다'}</h2>
    <div class="settle-total"><span>${tot.w}승 ${tot.l}패</span><span>${hlSilver(tot.s)}</span><span>수련치 +${fmt(tot.e)}</span></div>
    <ol class="settle-list">${recs.map(r => { const sm = recSummary(r); return `<li class="${r.defeats ? 'defeat' : ''}">
      <div><time>${recTime(r)}</time> <b>${ZONES[r.zone].name}</b> <span>${sm.head}</span>${r.defeats ? ` <em class="warn">쓰러짐 ${r.defeats}</em>` : ''}</div>
      ${sm.items.length || sm.gear.length ? `<small>${[...sm.items, ...sm.gear].join(' · ')}</small>` : ''}
      ${terrainLine(r) ? `<small class="muted tr-line">⛰ ${terrainLine(r)}</small>` : ''}
      <div class="settle-watch">${r.battles.map((b, i) => `<button class="watch ${b.win ? '' : 'lost'} ${b.boss ? 'boss' : ''}" data-watch="${r.id}:${i}" title="${b.name} — ${b.win ? '승리' : '패배'}">${b.boss ? '👹' : ''}${sealChar(b.name)}</button>`).join('')}</div>
    </li>`; }).join('')}</ol>
    <p class="muted">전투마다 견문록의 [관찰하기]로 상세 전투 과정을 복기할 수 있습니다.</p>
    <div class="btns"><button class="btn primary" data-act="closemodal">확인</button><button class="btn ghost" data-act="gochron" data-rec="${recs[recs.length - 1].id}">견문록 보기</button></div>
  </div>`;
}
