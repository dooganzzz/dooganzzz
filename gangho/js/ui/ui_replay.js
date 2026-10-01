/* [화면] 전투 관찰(리플레이): 견문록 [관찰]로 기록해 둔 전투를 합 단위로 다시 튼다 */
/* ───────── 관찰하기: 기록해 둔 전투를 합 단위로 다시 튼다 ───────── */
const RP = { key: null, i: -1, timer: null, speed: 1, playing: true };
/* 관찰하기 한 합의 간격: 1× 3초 · 2× 1.5초 · 4× 0.75초 */
const RP_MS = 3000;
function replayData(key) {
  if (key === 'sim') return ui.sim && ui.sim.b ? { rec: null, b: ui.sim.b } : null;   // 심상수련장
  const [rid, bi] = key.split(':').map(Number), rec = findExpedition(rid);
  return rec && rec.battles[bi] ? { rec, b: rec.battles[bi] } : null;
}
function openReplay(key) {
  if (!replayData(key)) { toast('오래된 탐험이라 기록이 지워졌습니다. (최근 8번만 남습니다)'); return; }
  replayStop();
  if (key !== 'sim') { const d = replayData(key); markSeen(d.rec, d.rec.battles.indexOf(d.b)); }   // 결과보기: 이제 결과가 적힌다
  Object.assign(RP, { key, i: -1, speed: RP.speed || 1, playing: true });
  const show = () => { if (RP.key !== key) return; ui.modal = 'replay:' + key; renderModal(); if ($('#spStage')) spBreathLoop(); };
  // 무대 그림(배경 · 제자 · 요수)을 먼저 풀어 두고 연다: 창이 뜬 뒤 그림이 하나씩 튀어나오지 않게 (늦어도 0.7초 안에 연다)
  const d = replayData(key), zid = d.rec ? d.rec.zone : zoneOfEnemy(d.b.eid);
  const urls = spriteOn(zid, d.b.eid) ? spriteUrls(zid, d.b.eid) : [];
  if (imgsReady(urls)) show(); else Promise.race([preloadImgs(urls), new Promise(r => setTimeout(r, 700))]).then(show);
}
function replayStop() { clearTimeout(RP.timer); RP.timer = null; }
/* 관찰 창 기록 한 줄: 누가 한 행동인지(제자 얼굴 · 요수 그림)와 결과(적중·빗나감·회피·치명·피해·상성·연격·중독·출혈)를 수묵 아이콘으로 */
const HERO_FACE = ASSET.portrait('hero');
const rpIco = src => `<i class="chron-ico rp-ico" style="background-image:url('${src}')"></i>`;
const rpUi = id => rpIco(ASSET.ui(id));
function rpLine(l, b, fresh) {
  const c = l.cls || '', t = l.text || '';
  let lead = '', text = t;
  if (/^⚔️\s*/.test(text)) { text = text.replace(/^⚔️\s*/, ''); lead = rpIco(HERO_FACE); }
  else if (/log-stance-title/.test(c)) lead = rpIco(HERO_FACE) + rpUi(/counter/.test(c) ? 'b_counter' : 'b_stance');
  else if (/\bfoe\b/.test(c)) lead = rpIco(ART_SRC.beast(b.eid)) + (/연격/.test(t) ? rpUi('b_combo') : '');
  else if (/aff-up/.test(c)) lead = rpUi('b_aff');
  else if (/\bdodge\b/.test(c)) lead = rpUi('b_dodge');
  else if (/\bmiss\b/.test(c)) lead = rpUi('b_miss');
  else if (/\bcrit\b/.test(c)) lead = rpUi('c_crit');
  else if (/\btaken\b/.test(c)) lead = rpUi('b_hurt');
  else if (/log-stance-result/.test(c)) lead = rpUi('b_hit');
  else if (/중독|독기/.test(t) && !/^\p{Extended_Pictographic}/u.test(t)) lead = rpUi('b_poison');
  else if (/출혈|열상/.test(t) && !/^\p{Extended_Pictographic}/u.test(t)) lead = rpUi('c_bleed');
  return `<p class="log-line ${c}${fresh ? ' fresh' : ''}">${lead}${chronDecor(text)}</p>`;
}
/* 합마다 칸을 나눠 쌓는다 */
const rpTurn = (label, html, cls = '') => `<section class="rp-turn ${cls}"><div class="turn-sep"><span>${label}</span></div>${html}</section>`;
/* 처음부터 다시: 쌓인 기록을 지우고 첫 합 앞으로 되돌린다 */
function replayRestart() {
  const d = replayData(RP.key), box = $('#rpBox'); if (!d || !box) return;
  replayStop();
  const { b } = d, s = b.start;
  RP.i = -1; RP.playing = true;
  box.classList.remove('won', 'lost'); spriteReset();
  $('#rpMe').innerHTML = vbar('hp', s.me.hp, s.me.hp, s.me.maxHp, '활력') + bar('mp', s.me.mp, s.me.maxMp, '내력');
  $('#rpFoe').innerHTML = vbar('hp foe', s.foe.hp, s.foe.hp, s.foe.maxHp, '기세', true);
  $('#rpLog').innerHTML = rpTurn('開戰 · 전투 시작', b.intro.map(l => rpLine(l, b)).join(''), 'intro');
  $('#rpRound').textContent = '준비'; $('#rpProg').textContent = `0 / ${b.rounds.length}합`; $('#rpToggle').textContent = '⏸ 멈춤';
  RP.timer = setTimeout(replayStep, 600);
}
function replayModal(key) {
  const d = replayData(key); if (!d) return '';
  const { rec, b } = d, s = b.start, zid = rec ? rec.zone : zoneOfEnemy(b.eid);
  return `<div class="sheet replay-sheet combat-modal-container" id="rpBox" data-key="${key}">
    <p class="eyebrow">${rec ? `觀察 · ${ZONES[rec.zone].name} 탐험 ${recTime(rec)}` : '心象 · 심상수련장 · 보상 없음'}</p>
    <div class="arena ${b.boss ? 'boss-in' : ''}">
      ${zid ? `<div class="arena-bg">${zoneArt(zid)}</div>` : ''}
      <div class="plaque me" id="pl-me"><div class="seal-av hero"><img class="hero-av" src="${HERO_FACE}" alt="" onerror="this.replaceWith(document.createTextNode('${esc(S.name[0] || '我')}'))"></div><div class="pl-info"><h3>${esc(S.name)}</h3><div id="rpMe">${vbar('hp', s.me.hp, s.me.hp, s.me.maxHp, '활력')}${bar('mp', s.me.mp, s.me.maxMp, '내력')}</div></div></div>
      <div class="vs"><span>對</span><small id="rpRound">준비</small></div>
      <div class="plaque foe ${b.boss ? 'boss' : ''}" id="pl-foe"><div class="seal-av foe">${ENEMIES[b.eid] ? beastArt(b.eid) : sealChar(b.name)}</div><div class="pl-info"><h3>${b.name}</h3><small>${b.boss ? '두목(頭目)' : '요수(妖獸)'} ${ENEMIES[b.eid] ? elemTag(ENEMIES[b.eid].elem) + weaponTag(ENEMIES[b.eid].wtype) : ''}</small><div id="rpFoe">${vbar('hp foe', s.foe.hp, s.foe.hp, s.foe.maxHp, '기세', true)}</div></div></div>
      <div class="move-banner" id="moveBanner" aria-hidden="true"></div>
    </div>
    ${spriteOn(zid, b.eid) ? spriteStage(zid, b.eid) : ''}
    <div class="blog combat-log-stream" id="rpLog">${rpTurn('開戰 · 전투 시작', b.intro.map(l => rpLine(l, b)).join(''), 'intro')}</div>
    <div class="rp-ctl">
      <button class="btn sm" data-rp="restart" title="기록을 지우고 첫 합부터">↺ 처음부터</button>
      <button class="btn sm" data-rp="toggle" id="rpToggle">${RP.playing ? '⏸ 멈춤' : '▶ 재생'}</button>
      <button class="btn ghost sm" data-rp="step" title="멈추고 한 합만 넘기기">한 합 ▶</button>
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
  // 막대 갱신: 스프라이트 무대가 있으면 첫 타격이 닿는 순간에, 없으면 곧바로
  const bars = () => { const me = $('#rpMe'), foe = $('#rpFoe'); if (!me || !foe) return;   // 그사이 창을 닫았으면 그만
    me.innerHTML = vbar('hp', r.me.hp, prev.me.hp, s.me.maxHp, '활력') + bar('mp', r.me.mp, s.me.maxMp, '내력');
    foe.innerHTML = vbar('hp foe', r.foe, prev.foe, s.foe.maxHp, '기세', true); };
  const sprite = !!$('#spStage') && !reduceMotion() && !RP.skip;
  if (!sprite) bars();
  const logEl = $('#rpLog');
  for (const t of logEl.querySelectorAll('.rp-turn.now')) t.classList.remove('now');
  logEl.insertAdjacentHTML('beforeend', rpTurn(`第${RP.i + 1}合 · 제${RP.i + 1}합`, r.lines.map(l => rpLine(l, b, true)).join(''), 'now'));
  logEl.scrollTop = logEl.scrollHeight;
  const last = RP.i >= b.rounds.length - 1;
  $('#rpRound').textContent = last ? (b.win ? '勝' : b.fled ? '和' : '敗') : `${RP.i + 1}합`;
  $('#rpProg').textContent = `${RP.i + 1} / ${b.rounds.length}합`;
  if (sprite) spritePlayRound(r, last, b.win, RP_MS / RP.speed, bars);   // 번쩍임·숫자·초식 이름은 칼·이빨이 닿는 순간에
  else { playFx(r.fx || []); if ($('#spStage') && last) spritePlayRound({ fx: [] }, last, b.win, RP_MS / RP.speed); }
  if (last) { box.classList.add(b.win ? 'won' : 'lost'); RP.playing = false; $('#rpToggle').textContent = '▶ 재생'; replayStop(); return; }
  if (RP.playing) RP.timer = setTimeout(replayStep, RP_MS / RP.speed);
}
function replayControl(what, x) {
  const d = replayData(RP.key); if (!d) return;
  if (what === 'speed') { RP.speed = +x; for (const c of document.querySelectorAll('[data-rp="speed"]')) c.classList.toggle('on', +c.dataset.x === RP.speed); return; }
  if (what === 'end') { replayStop(); RP.playing = false; RP.skip = true; while (RP.i < d.b.rounds.length - 1) replayStep(); RP.skip = false; return; }
  if (what === 'restart') return replayRestart();
  if (what === 'step') { replayStop(); RP.playing = false; $('#rpToggle').textContent = '▶ 재생'; if (RP.i < d.b.rounds.length - 1) replayStep(); return; }
  if (what === 'toggle') {
    if (RP.i >= d.b.rounds.length - 1) return replayRestart();              // 끝났으면 기록을 지우고 처음부터
    RP.playing = !RP.playing; $('#rpToggle').textContent = RP.playing ? '⏸ 멈춤' : '▶ 재생';
    if (RP.playing) replayStep(); else replayStop();
  }
}
