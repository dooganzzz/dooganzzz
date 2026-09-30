/* [화면] 강호행: 탐험지 고르기 · 다음 출발 · 탐험 기록, 결산 창, 전투 관찰(리플레이) */

/* 1초마다 남은 시간만 바꿔 쓴다 (화면 전체를 다시 그리지 않는다) */
Bus.on('tick', () => { for (const el of document.querySelectorAll('[data-countdown]')) el.textContent = countdownText(); });

const hhmmss = ms => { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return `${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(x).padStart(2, '0')}`; };
function countdownText() {
  const left = nextExpeditionIn();
  return left === null ? '탐험지 미정' : left <= 0 ? '곧 출발' : hhmmss(left);
}
const recTime = r => hhmm(r.at);
function recSummary(r) {
  const g = r.gain, items = Object.entries(g.items || {}).map(([id, n]) => `${ITEMS[id].icon}${ITEMS[id].name} ×${n}`);
  return { head: `${r.wins}승 ${r.losses}패 · 은자 ${g.silver >= 0 ? '+' : ''}${fmt(g.silver)} · 경험치 +${fmt(g.exp)}${g.contrib ? ` · 공헌 +${g.contrib}` : ''}`, items, gear: g.gear || [], used: Object.entries(g.used || {}).map(([id, n]) => `${ITEMS[id].name} ×${n}`) };
}

function vbar(cls, cur, prev, max, name, hideNum) {
  const p = v => max ? clamp(v / max * 100, 0, 100) : 0;
  return `<div class="bar thick ${cls}"><span class="bar-ghost" data-to="${p(cur)}" style="width:${p(Math.max(cur, prev))}%"></span><span class="bar-fill" style="width:${p(cur)}%"></span><span class="bar-text"><b>${name}</b>${hideNum ? '' : ` ${fmt(cur)} / ${fmt(max)}`}</span></div>`;
}
const sealChar = name => name.replace(/^(채주|방주|적룡방|화적|수적|외눈)\s*/, '').trim()[0] || name[0];

/* ───────── 강호행 탭 ───────── */
function viewField() {
  const X = S.expedition, st = calcStats(), cur = X.zone && ZONES[X.zone];
  const buffs = S.buffs.map(b => b.name);
  const extraSta = Math.max(0, Math.round(S.stamina - st.maxSta));
  const zones = ZONE_ORDER.map(zid => {
    const Z = ZONES[zid], open = zoneUnlocked(zid), here = X.zone === zid, B = ENEMIES[Z.boss];
    return `<div class="zone ${open ? '' : 'locked'} ${here ? 'here' : ''}">
      <div class="zone-top"><h3>${label(Z.name, Z.hanja)}</h3><span class="pill">${'★'.repeat(Z.tier)}</span></div>
      <p class="story">${Z.desc}</p>
      <small class="muted">요수: ${Z.enemies.map(e => ENEMIES[e].name).join(' · ')} · 두목: ${B.name}${S.flags[B.boss] ? ' <b class="gold">토벌</b>' : ''}</small>
      <div>${!open ? `<button class="btn sm" disabled>🔒 ${ENEMIES[ZONES[ZONE_ORDER[ZONE_ORDER.indexOf(zid) - 1]].boss].name} 토벌 후</button>`
        : here ? '<span class="pill here-pill">현재 탐험지</span>' : `<button class="btn ${X.zone ? '' : 'primary'} sm" data-dest="${zid}">${X.zone ? '탐험지로 정하기' : '이곳으로 첫 탐험 떠나기'}</button>`}</div>
    </div>`;
  }).join('');
  const recs = [...S.expeditions].reverse().map(r => {
    const sm = recSummary(r), Z = ZONES[r.zone];
    return `<details class="exp-rec ${r.end === 'defeat' ? 'defeat' : ''}">
      <summary><time>${recTime(r)}</time><b>${Z.name}</b><span>${sm.head}</span>${r.end === 'defeat' ? '<em class="warn">쓰러져 귀환</em>' : ''}</summary>
      ${sm.items.length || sm.gear.length ? `<p class="exp-loot">${[...sm.items, ...sm.gear].map(t => `<span>${t}</span>`).join('')}</p>` : ''}
      <ol class="exp-steps">${r.steps.map(s => `<li class="${s.cls}">${s.t}${s.b !== undefined ? ` <button class="watch" data-watch="${r.id}:${s.b}">관찰하기</button>` : ''}</li>`).join('')}</ol>
    </details>`;
  }).join('');
  return `<section class="panel">
    ${head('강호행', '江湖行', `<span class="pill">${cur ? `⛰️ ${cur.name}` : '탐험지 미정'}</span>`)}
    <div class="exp-status">
      <div class="exp-next"><small>다음 출발</small><b data-countdown>${countdownText()}</b></div>
      <div class="exp-sta">${bar('sta', Math.min(S.stamina, st.maxSta), st.maxSta, '기력')}<small class="muted">${extraSta ? `음식으로 더 채운 기력 +${extraSta} · ` : ''}${buffs.length ? `다음 탐험 효과: ${buffs.join(', ')}` : '한 시간이면 기력이 다시 가득 찹니다'}</small></div>
    </div>
    <p class="story">${cur ? `제자가 한 시간마다 ${josa(cur.name, '으로')} 나가 기력이 다할 때까지 싸우고 줍고 돌아옵니다. 자리를 비워도 최대 ${EXPEDITION.maxQueue}번까지 쌓였다가 돌아오면 한꺼번에 결산됩니다.` : '탐험지를 고르면 제자가 곧바로 첫 탐험을 떠납니다. 그 뒤로는 한 시간마다 스스로 나갑니다.'}</p>
  </section>
  <section class="panel">${head('탐험지', '行先')}<div class="zones">${zones}</div></section>
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
    <div class="settle-total"><span>${tot.w}승 ${tot.l}패</span><span>${hlSilver(tot.s)}</span><span>경험치 +${fmt(tot.e)}</span></div>
    <ol class="settle-list">${recs.map(r => { const sm = recSummary(r); return `<li class="${r.end === 'defeat' ? 'defeat' : ''}">
      <div><time>${recTime(r)}</time> <b>${ZONES[r.zone].name}</b> <span>${sm.head}</span>${r.end === 'defeat' ? ' <em class="warn">쓰러져 귀환</em>' : ''}</div>
      ${sm.items.length || sm.gear.length ? `<small>${[...sm.items, ...sm.gear].join(' · ')}</small>` : ''}
      <div class="settle-watch">${r.battles.map((b, i) => `<button class="watch ${b.win ? '' : 'lost'} ${b.boss ? 'boss' : ''}" data-watch="${r.id}:${i}" title="${b.name} — ${b.win ? '승리' : '패배'}">${b.boss ? '👹' : ''}${sealChar(b.name)}</button>`).join('')}</div>
    </li>`; }).join('')}</ol>
    <p class="muted">전투마다 견문록의 [관찰하기]로 다시 볼 수 있습니다. 경험치로 상태 › 무공에서 성급을 올리십시오.</p>
    <div class="btns"><button class="btn primary" data-act="closemodal">확인</button><button class="btn ghost" data-tab="status" data-sub="martial">성급 올리러 가기</button></div>
  </div>`;
}

/* ───────── 관찰하기: 기록해 둔 전투를 합 단위로 다시 튼다 ───────── */
const RP = { key: null, i: -1, timer: null, speed: 1, playing: true };
const RP_MS = 900;
function replayData(key) {
  const [rid, bi] = key.split(':').map(Number), rec = findExpedition(rid);
  return rec && rec.battles[bi] ? { rec, b: rec.battles[bi] } : null;
}
function openReplay(key) {
  if (!replayData(key)) { toast('오래된 탐험이라 기록이 지워졌습니다. (최근 8번만 남습니다)'); return; }
  replayStop();
  Object.assign(RP, { key, i: -1, speed: RP.speed || 1, playing: true });
  ui.modal = 'replay:' + key; renderModal();
}
function replayStop() { clearTimeout(RP.timer); RP.timer = null; }
function replayModal(key) {
  const d = replayData(key); if (!d) return '';
  const { rec, b } = d, s = b.start;
  return `<div class="sheet replay-sheet" id="rpBox" data-key="${key}">
    <p class="eyebrow">觀察 · ${ZONES[rec.zone].name} 탐험 ${recTime(rec)}</p>
    <div class="arena">
      <div class="plaque me" id="pl-me"><div class="seal-av">${esc(S.name[0] || '我')}</div><div class="pl-info"><h3>${esc(S.name)}</h3><div id="rpMe">${vbar('hp', s.me.hp, s.me.hp, s.me.maxHp, '활력')}${bar('mp', s.me.mp, s.me.maxMp, '내력')}</div></div></div>
      <div class="vs"><span>對</span><small id="rpRound">준비</small></div>
      <div class="plaque foe ${b.boss ? 'boss' : ''}" id="pl-foe"><div class="seal-av foe">${sealChar(b.name)}</div><div class="pl-info"><h3>${b.name}</h3><small>${b.boss ? '두목(頭目)' : '요수(妖獸)'}</small><div id="rpFoe">${vbar('hp foe', s.foe.hp, s.foe.hp, s.foe.maxHp, '기세', true)}</div></div></div>
      <div class="move-banner" id="moveBanner" aria-hidden="true"></div>
    </div>
    <div class="blog" id="rpLog">${b.intro.map(l => `<p class="${l.cls}">${l.text}</p>`).join('')}</div>
    <div class="rp-ctl">
      <button class="btn sm" data-rp="toggle" id="rpToggle">${RP.playing ? '⏸ 멈춤' : '▶ 재생'}</button>
      ${[1, 2, 4].map(x => `<button class="chip ${RP.speed === x ? 'on' : ''}" data-rp="speed" data-x="${x}">${x}×</button>`).join('')}
      <button class="btn ghost sm" data-rp="end">끝까지 ⏭</button>
      <span class="rp-prog" id="rpProg">0 / ${b.rounds.length}합</span>
      <button class="btn ghost sm" data-act="closemodal">닫기</button>
    </div>
  </div>`;
}
/* 한 합 진행: 양쪽 활력 막대(잔상 포함)·대사·연출 */
function replayStep() {
  const box = $('#rpBox'); const d = box && box.dataset.key === RP.key && replayData(RP.key);
  if (!d) return replayStop();
  const { b } = d; if (RP.i >= b.rounds.length - 1) return replayStop();
  const prev = RP.i < 0 ? { me: { hp: b.start.me.hp, mp: b.start.me.mp }, foe: b.start.foe.hp } : b.rounds[RP.i];
  RP.i++;
  const r = b.rounds[RP.i], s = b.start;
  $('#rpMe').innerHTML = vbar('hp', r.me.hp, prev.me.hp, s.me.maxHp, '활력') + bar('mp', r.me.mp, s.me.maxMp, '내력');
  $('#rpFoe').innerHTML = vbar('hp foe', r.foe, prev.foe, s.foe.maxHp, '기세', true);
  const logEl = $('#rpLog');
  logEl.insertAdjacentHTML('beforeend', r.lines.map(l => `<p class="${l.cls} fresh">${l.text}</p>`).join(''));
  logEl.scrollTop = logEl.scrollHeight;
  const last = RP.i >= b.rounds.length - 1;
  $('#rpRound').textContent = last ? (b.win ? '勝' : b.fled ? '和' : '敗') : `${RP.i + 1}합`;
  $('#rpProg').textContent = `${RP.i + 1} / ${b.rounds.length}합`;
  playFx(r.fx || []);
  if (last) { box.classList.add(b.win ? 'won' : 'lost'); RP.playing = false; $('#rpToggle').textContent = '↺ 다시'; replayStop(); return; }
  if (RP.playing) RP.timer = setTimeout(replayStep, RP_MS / RP.speed);
}
function replayControl(what, x) {
  const d = replayData(RP.key); if (!d) return;
  if (what === 'speed') { RP.speed = +x; for (const c of document.querySelectorAll('[data-rp="speed"]')) c.classList.toggle('on', +c.dataset.x === RP.speed); return; }
  if (what === 'end') { replayStop(); RP.playing = false; while (RP.i < d.b.rounds.length - 1) replayStep(); return; }
  if (what === 'toggle') {
    if (RP.i >= d.b.rounds.length - 1) { openReplay(RP.key); return; }        // 끝났으면 처음부터
    RP.playing = !RP.playing; $('#rpToggle').textContent = RP.playing ? '⏸ 멈춤' : '▶ 재생';
    if (RP.playing) replayStep(); else replayStop();
  }
}
