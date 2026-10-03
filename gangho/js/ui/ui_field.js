/* [화면] 강호행: 탐험지 고르기 · 강호행 시작/귀환, 결산 창 (무대는 ui_live.js, 관찰은 ui_replay.js) */

/* 1초마다 흐른 시간만 바꿔 쓴다 (화면 전체를 다시 그리지 않는다) */
Bus.on('tick', () => {
  for (const el of document.querySelectorAll('[data-runclock]')) el.textContent = runClockText();
  const scn = $('#liveScene'); liveTodApply(scn);   // 시간대 빛깔 (서울 시각에 따라 서서히)
  // 방금 치른 전투는 무대에서 기록 그대로 재생한다 (다시 그리기와 상관없이, 전투마다 한 번)
  { const lr = liveRec(), st = lr && lr.steps.length ? lr.steps[lr.steps.length - 1] : null, key = st && st.b !== undefined ? `${lr.id}:${st.b}` : null;
    if (scn && key && key !== liveAnim.lastBattle && now() - stepAt(lr, lr.steps.length - 1) < 6000) { liveAnim.lastBattle = key; const bt = lr.battles[st.b]; liveShowQueue(bt.eid, true, bt.boss, { rid: lr.id, bi: st.b, si: lr.steps.length - 1 }); } }
  if (liveAnim.hold && now() >= liveAnim.hold.until) liveRelease();   // 맞붙기를 못 보여 줬으면 결과를 바로
  { const lr = liveRec(), i = lr ? lr.steps.length - 1 : -1, st = i >= 0 ? lr.steps[i] : null, key = st ? `${lr.id}:${i}` : null;   // 기믹 걸음도 무대에
    if (scn && st && st.b === undefined && key !== liveAnim.lastGim && now() - stepAt(lr, i) < 6000) { liveAnim.lastGim = key; liveGimQueue(lr, i); } }
  const sig = liveSig(); if (sig === lastLiveSig) return; lastLiveSig = sig;   // 새 걸음이 드러났을 때만
  liveSideRefresh();
  const sc = $('#liveScene'), lr = liveRec();
  if (sc) {
    sc.classList.toggle('rest', liveDone(lr) && !liveHeld(lr)); sc.classList.toggle('dead', liveDead(lr));
    const wh = document.querySelector('.live-panel .live-where'), X = S.expedition; const wz = lr ? lr.zone : X.zone, wn = lr && lr.live ? lr.stage : X.stage || 1;
    if (wh && wz && wh.dataset.k !== wz + wn) wh.outerHTML = liveWhere(wz, wn);   // 지역 이름 붓글씨 (단계가 바뀔 때만)
  }
  if (typeof ui !== 'undefined' && ui.tab === 'chronicle' && !ui.modal) render();
});

/* ───────── 실시간 강호행: 산길을 걷는 제자와 견문록 ───────── */
let lastLiveSig = '';
function liveSig() { const X = S && S.expedition; return S ? `${Math.round(S.stamina)}${(activeRun() || {}).mode || ''}${count('gigeokdan')}|` + S.expeditions.map(r => `${r.id}:${r.steps.length}${r.live ? `L${r.stage}.${r.kills}` : ''}${r.battles.filter(b => b.seen !== false).length}`).join(',') + `|${X.zone || ''}|${X.stage}|${X.auto}|${stageCleared(X.zone)}|${count('saenghyeol')}|${(activeRun() || {}).ready ? 1 : 0}` : ''; }
/* 단계 줄: 1~10단계 (돌파 ✔ · 지금 · 잠김). 강호행 전에는 출발 단계를 고르고, 강호행 중에는 그 단계로 옮겨 간다 */
function stageStrip() {
  const X = S.expedition, zid = X.zone; if (!zid) return '';
  const run = activeRun(), cur = run && run.zone === zid ? run.stage : X.stage, max = stageMax(zid), done = stageCleared(zid);
  const cells = Array.from({ length: STAGE.count }, (_, i) => { const n = i + 1, open = n <= max;
    return `<button class="stage-cell ${n === cur ? 'on' : ''} ${n <= done ? 'done' : ''} ${n === STAGE.count ? 'boss' : ''}" data-stage="${n}" ${open ? '' : 'disabled'} title="${open ? stageName(zid, n) : '앞 단계를 돌파하면 열립니다'}">${n === STAGE.count ? '頭' : n}</button>`; }).join('');
  const seen = { ...((S.zoneLog[zid] || {}).seen || {}) }; if (run) for (const b of run.battles) seen[b.eid] = 1;
  const foes = stageFoes(zid, cur).map(e => seen[e] ? ENEMIES[e].name : '？').join(' · ');
  return `<div class="stage-strip">${cells}</div>
    <p class="stage-info"><b>${stageName(zid, cur)}</b> <span class="muted">${cur >= STAGE.count ? '두목' : '요수'}: ${foes}</span>${!run && cur <= done ? ' <span class="good">돌파함</span>' : ''}
      ${cur < STAGE.count ? `<button class="chip sm ${run && run.ready ? 'on' : 'dim'}" data-stagebreak aria-disabled="${!(run && run.ready)}">돌파하기${alertDot(run && run.ready)}</button>` : ''}</p>`;
}
const runClockText = () => { const r = activeRun(); return r ? hhmmss(now() - r.at) : '—'; };
function liveStepRow(r, i, t) {
  const st = r.steps[i], seen = st.b === undefined || battleSeen(r, st.b);
  return `<li class="${seen ? st.cls : 'enc'} ${t - stepAt(r, i) < 4000 && r.live ? 'fresh' : ''}"><time>${hhmm(stepAt(r, i))}</time><span>${chronDecor(stepText(r, st))}</span>${seen ? stepGot(st) : ''}</li>`;   // 전투 관찰은 견문록 탭에서만 (유저 요청)
}
/* 얻은 것 칩: 은자 · 수련치 · 공헌 · 아이템 · 장비. lootChips = 이번 강호행 합계(출정 준비 칸), stepGot = 한 걸음에서 얻은 것(견문 줄 옆) */
const gotChip = (txt, ico = '', cls = '') => `<span class="loot-chip ${cls}">${ico}${txt}</span>`;
function lootChips(g) {
  if (!g) return '';
  const gear = {}; for (const n of g.gear || []) gear[n] = (gear[n] || 0) + 1;
  return [g.silver ? gotChip(hlSilver(g.silver)) : '', g.exp ? gotChip(`수련치 +${fmt(g.exp)}`) : '', g.contrib ? gotChip(`공헌 +${fmt(g.contrib)}`) : '',
    ...Object.entries(g.items || {}).filter(([id]) => ITEMS[id]).map(([id, n]) => gotChip(`${ITEMS[id].name} ×${fmt(n)}`, itemIco(id, 'sm'))),
    ...Object.entries(gear).map(([n, k]) => gotChip(`${n}${k > 1 ? ` ×${k}` : ''}`, '', 'gear'))].filter(Boolean).join('');
}
const stepGot = st => st.got ? `<span class="step-got">${lootChips({ silver: st.got.silver, exp: st.got.exp, items: st.got.items, gear: st.got.gn || [] })}</span>` : '';
function liveSide() {
  const r = liveRec(), t = now(), run = activeRun(), X = S.expedition;
  const startBtn = `<button class="btn primary" data-act="runstart" ${X.zone ? '' : 'disabled'}>강호행 시작</button>`;
  const pots = `생혈고 <b class="${count('saenghyeol') < 3 ? 'warn' : ''}">${count('saenghyeol')}</b>개`;
  if (!r) return `${stageStrip()}<p class="muted live-empty">${X.zone ? `${josa(stageName(X.zone, X.stage || 1), '으로')} 떠날 준비가 되었습니다. [강호행 시작]을 누르면 단계를 하나씩 돌파하며, 쓰러질 때까지 쭉 나아갑니다. (${pots})` : '아래 탐험지에서 갈 곳을 먼저 정하십시오.'}</p><div class="btns live-btns">${startBtn}</div>`;
  const rows = [], shown = liveShown(r), held = shown < r.steps.length;   // 맞붙는 중인 전투의 결과는 끝난 뒤에
  const fighting = !!((liveAnim.show && liveAnim.show.real) || (liveAnim.queued && liveAnim.queued.real));   // 무대에서 아직 싸우는 중 (결과는 미리 나와 있어도 연출이 끝날 때까지 버튼을 숨긴다)
  const homeBtn = '<button class="btn primary" data-act="runhome">귀환하기</button>';   // 끝난 강호행: 산문으로 돌아와 지도에서 다음 갈 곳을 고른다
  for (let i = shown - 1; i >= 0; i--) rows.push(liveStepRow(r, i, t));
  const HELD = { trap: '발밑이 수상합니다…', vault: '길가에 궤짝이 보입니다…', gimmick: '무언가 눈에 띕니다…', event: '기이한 기운이 느껴집니다…' }, hs = held && r.steps[shown];
  if (held) rows.unshift(`<li class="enc fresh"><time>${hhmm(stepAt(r, shown))}</time><span>${hs && hs.b === undefined && HELD[hs.k] || '요수와 맞붙었습니다…'}</span></li>`);
  const nb = r.steps.slice(0, shown).filter(s => s.b !== undefined).length;
  const hpNow = held && liveAnim.hold.hp != null ? liveAnim.hold.hp : S.hp;   // 맞붙는 동안은 무대의 활력
  const mpNow = held && liveAnim.hold.mp != null ? liveAnim.hold.mp : S.mp;   // 내력도 무대와 같이
  const unseen = r.battles.filter(b => b.seen === false).length, st = calcStats(), hpP = clamp(hpNow / st.maxHp * 100, 0, 100);
  const nm = stageName(r.zone, r.stage || 1), cl = r.cleared && r.cleared.length ? ` · 돌파 ${r.cleared.length}번` : '';
  const state = run || held ? `견문 ${shown} · 전투 ${nb}${cl}`
    : r.end === 'dead' ? `<b class="warn">${nm}에서 쓰러져 강호행이 끝났습니다.</b> 견문 ${r.steps.length} · 전투 ${r.battles.length}${cl}`
    : `<b>${nm}에서 돌아왔습니다.</b> 견문 ${r.steps.length} · 전투 ${r.battles.length}${cl}`;
  return `${stageStrip()}${run || held ? `<div class="live-prog hp" title="활력"><span style="width:${hpP.toFixed(1)}%"></span></div><p class="live-vit"><span class="live-vit-hp">활력 ${fmt(Math.round(hpNow))} / ${fmt(st.maxHp)}</span><span>${pots}</span></p>
    <div class="live-prog mp" title="내력"><span style="width:${clamp(mpNow / (st.maxMp || 1) * 100, 0, 100).toFixed(1)}%"></span></div><p class="live-vit"><span class="live-vit-mp">내력 ${fmt(Math.round(mpNow))} / ${fmt(st.maxMp)}</span></p>
    <div class="live-prog sta" title="기력"><span style="width:${clamp(S.stamina / (st.maxSta || 100) * 100, 0, 100).toFixed(1)}%"></span></div>
    <p class="live-vit"><span>기력 ${Math.round(S.stamina / (st.maxSta || 100) * 100)}% · ${r.mode === 'walk' ? `${uiIco('c_walk', 'vit-ico')} 걷는 중 — 기력이 차면 다시 달립니다` : `${uiIco('c_run', 'vit-ico')} 달리는 중`}</span><button class="chip sm" data-act="gigeok" ${count('gigeokdan') ? '' : 'disabled'} title="기력을 가득 채워 곧바로 다시 달립니다 (전방 50냥)">기력단 ${count('gigeokdan')}</button></p>` : ''}
    <p class="live-state">${state}${unseen ? ` · <span class="warn">안 본 전투 ${unseen}</span>` : ''}</p>
    <ol class="live-log">${rows.join('') || '<li class="muted">산문을 나섰습니다…</li>'}</ol>
    <div class="btns live-btns">
      ${run ? '<button class="btn ghost" data-act="runstop">귀환하기</button>' : held || fighting ? '' : homeBtn}
    </div>
    ${run ? '<small class="muted">전투에서 지면 쓰러지고 강호행이 끝납니다. 요수를 물리치면 얻은 것을 바로 받습니다.</small>' : !X.zone ? '' : `<small class="muted">${pots} · 전방에서 개당 5냥</small>`}`;
}
function livePanel() {
  const r = liveRec(), run = activeRun();
  lastLiveSig = liveSig();
  return `<section class="panel live-panel ${ui.enterAt && now() - ui.enterAt < 1200 ? 'enter' : ''}">
    <div class="panel-head"><h2>${label('강호행', '江湖行')}${(r || S.expedition).zone ? liveWhere((r || S.expedition).zone, r && r.live ? r.stage : S.expedition.stage || 1) : ''}</h2></div>
    <div class="live-wrap">${liveScene(r)}<div class="live-side" id="liveSide">${liveSide()}</div></div>
  </section>`;
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

/* 구역 카드: 적정 투력·난이도는 보여 주지 않는다. 내가 다녀오며 겪은 것만 적힌다 */

/* 출정 준비: 떠나기 전에 갖춰 둘 것들 (탐험지·무공·병기·장비·생혈고·상성·단약) */
function prepPanel() {
  const X = S.expedition, st = calcStats(), mu = S.active.mugong, M = mu && MANUALS[mu];
  const worn = SLOT_ORDER.filter(k => S.equip[k]).length;
  const row = (ok, label, value, link) => `<li class="${ok ? 'ok' : 'warn'}"><span class="prep-mark">${ok ? '✔' : '！'}</span><span class="prep-k">${label}</span><span class="prep-v">${value}</span>${link || ''}</li>`;
  const go = (tab, sub, text) => `<button class="btn ghost sm" data-tab="${tab}"${sub ? ` data-sub="${sub}"` : ''}>${text}</button>`;
  const arts = CAT_ORDER.map(c => S.active[c] ? `${CATS[c].name} 《${MANUALS[S.active[c]].name}》 ${S.manuals[S.active[c]].star}성` : `<span class="warn nw">${CATS[c].name} 비어 있음</span>`).join(' · ');
  const wOk = !M || M.weapon === weaponType();
  return `<ul class="prep">
    ${row(!!X.zone, '탐험지', X.zone ? ZONES[X.zone].name : '정하지 않음')}
    ${row(CAT_ORDER.every(c => S.active[c]), '무공', arts, go('status', 'martial', '무공'))}
    ${row(!!S.equip.weapon && wOk, '병기', S.equip.weapon ? `${gearName(S.equip.weapon)}${wOk ? '' : ` <span class="warn">— 《${M.name}》은 ${WEAPON_TYPES[M.weapon]} 무공이라 초식이 나가지 않음</span>`}` : '맨손', go('status', 'gear', '무장'))}
    ${row(worn >= 5, '장비', `${worn} / ${SLOT_ORDER.length}칸 착용 · 투력 ${fmt(calculateCombatPower(S))}`, go('bag', null, '행낭'))}
    ${row(has('saenghyeol', 5), '생혈고', `${count('saenghyeol')}개 (활력 ${potionAtNow()}% 아래에서 자동 사용 · 「설정」에서 바꿈 · 떨어지면 쓰러지기 쉽다 · 전방 개당 5냥) · 소환단 ${count('potionMp')}개`, go('sect', 'shop', '전방'))}
    ${(() => { const e = myElem(), t = myTerrain(), m = X.zone ? terrainMult(X.zone) : 1, Z = X.zone && ZONES[X.zone];
      const win = e ? ELEM_BEATS[e] : null, lose = e ? Object.keys(ELEM_BEATS).find(k => ELEM_BEATS[k] === e) : null;
      const tv = !t ? '<span class="warn">지형 없음 — 경공 무공을 익히고 장착하십시오</span>'
        : `${terrainTag(t)} <small>걷는 땅의 성질. 탐험지 지형과 맞으면 기력이 덜 듭니다.</small>${Z ? `<br><small>${Z.name} 지형 ${zoneTerrainText(X.zone)} → ${m < 1 ? '<b class="good">일치 · 기력 -20%</b>' : m > 1 ? '<span class="warn">불일치 · 기력 +20%</span>' : '영향 없음'}</small>` : ''}`;
      const ev = !e ? '<span class="warn">오행 없음 — 기공 무공을 익히고 장착하십시오</span>'
        : `${elemTag(e)} <small>싸울 때의 기운. 요수의 오행과 맞물려 피해가 달라집니다.</small><br><small>${ELEMENTS[win].hanja} 속성 요수에게 <b class="good">주는 피해 +25% · 받는 피해 -25%</b><br><small>${ELEMENTS[lose].hanja} 속성 요수에게는 <span class="warn">주는 피해 -25% · 받는 피해 +40%</span></small>`;
      return row(!!t && m <= 1, '경공 · 지형', tv, go('status', 'martial', '무공')) + row(!!e, '기공 · 오행', ev, go('status', 'martial', '무공')); })()}
    ${(() => { const lr = liveRec(), c = lr && lootChips(lr.gain); return lr ? row(true, '전리품', c ? `<div class="loot-chips">${c}</div>` : '<span class="muted">아직 없음</span>') : ''; })()}
    ${row(true, '준비한 단약', S.buffs.length ? S.buffs.map(b => b.name).join(', ') : '없음 (철골단·통맥환·해독산·청심단은 다음 강호행 동안 효과)', go('bag', null, '행낭'))}
  </ul>`;
}

function viewField() {
  const X = S.expedition, st = calcStats(), cur = X.zone && ZONES[X.zone];
  const run = activeRun();
  return `${livePanel()}<section class="panel">
    ${head('강호행', '江湖行', `<span class="pill">${cur ? `⛰️ ${cur.name}` : '탐험지 미정'}</span>`)}
    ${run ? '' : `<div class="exp-status">
      <div class="exp-next"><small>산문에서 대기 중</small><b data-runclock>${runClockText()}</b></div>
      <div class="exp-sta"><small class="muted">떠나기 전에 아래 준비를 갖춰 두십시오.</small></div>
    </div>`}
    <h4 class="prep-head">출정 준비</h4>
    ${prepPanel()}
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
