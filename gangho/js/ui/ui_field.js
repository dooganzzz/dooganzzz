/* [화면] 강호행: 탐험지 고르기 · 다음 출발 · 탐험 기록, 결산 창, 전투 관찰(리플레이) */

/* 1초마다 남은 시간만 바꿔 쓴다 (화면 전체를 다시 그리지 않는다) */
Bus.on('tick', () => {
  for (const el of document.querySelectorAll('[data-countdown]')) el.textContent = countdownText();
  const sig = liveSig(); if (sig === lastLiveSig) return; lastLiveSig = sig;   // 새 걸음이 드러났을 때만
  const box = $('#liveSide'); if (box) setHTML(box, liveSide());
  const sc = $('#liveScene'), lr = liveRec();
  if (sc) {
    sc.classList.toggle('rest', liveDone(lr));
    // 방금 드러난 걸음이 전투면 2.6초 동안 멈춰 서서 조우 연출
    const n = lr && lr.pend ? shownSteps(lr) : 0, st = n ? lr.steps[n - 1] : null;
    if (st && st.b !== undefined && !lr.shownAll && now() - stepAt(lr, n - 1) < 2600) sc.dataset.encUntil = stepAt(lr, n - 1) + 2600;
  }
  if (typeof ui !== 'undefined' && ui.tab === 'chronicle' && !ui.modal) render();
});

/* ───────── 실시간 강호행: 산길을 오르는 제자와 배속 견문록 ───────── */
let lastLiveSig = '';
function liveSig(t = now()) { return S ? S.expeditions.map(r => r.pend ? `${shownSteps(r, t)}${liveDone(r, t) ? 'd' : ''}${r.claimed ? 'c' : ''}${r.battles.filter(b => b.seen).length}` : '').join(',') + liveSpeed() : ''; }
const LIVE_SPEED_NAME = { 2: '2배속', 3: '3배속', 4: '4배속', 0: '일괄확인' };
/* 걷기: 병기별 8컷 걸음(닿기 · 내려앉기 · 지나가기 · 솟기 × 좌우). 산길은 발걸음 폭에 맞춰 흘러 발이 미끄러지지 않는다.
   다 돌아오면 멈춰 서서 숨쉬기 (대기 시트) */
const WALK_FRAMES = 8, WALK_MS = 125;                  // 한 걸음 주기 1초
let liveAnim = { f: 0, last: 0, acc: 0, x: 0, raf: 0, breath: 0 };
function liveLoop(ts) {
  liveAnim.raf = requestAnimationFrame(liveLoop);
  const sc = document.getElementById('liveScene'); if (!sc) { cancelAnimationFrame(liveAnim.raf); liveAnim.raf = 0; return; }
  const dt = liveAnim.last ? Math.min(100, ts - liveAnim.last) : 16; liveAnim.last = ts;
  const walker = sc.querySelector('.live-walker'), hero = document.getElementById('liveHero'), far = sc.querySelector('.live-strip.far'), near = sc.querySelector('.live-strip.near');
  const enc = now() < (+sc.dataset.encUntil || 0);                             // 조우: 멈춰 서서 칼을 겨눈다
  sc.classList.toggle('enc', enc);
  if (enc) { if (hero) hero.dataset.f = 4; return; }
  if (sc.classList.contains('rest') || reduceMotion()) {                      // 쉬는 중: 대기 시트로 가슴만 들썩
    liveAnim.acc += dt; if (liveAnim.acc > 260) { liveAnim.acc = 0; if (hero) hero.dataset.f = BREATH[liveAnim.breath++ % BREATH.length]; }
    return;
  }
  liveAnim.acc += dt;
  while (liveAnim.acc >= WALK_MS) { liveAnim.acc -= WALK_MS; liveAnim.f = (liveAnim.f + 1) % WALK_FRAMES; if (walker) walker.querySelector('.walk-spr').style.backgroundPositionX = (liveAnim.f * 100 / (WALK_FRAMES - 1)) + '%'; }
  // 산길 두 겹: 가까운 땅은 한 걸음 주기에 키의 0.7배만큼(발이 미끄러지지 않게), 먼 산은 그 3분의 1 빠르기로 (그림 한 장 폭마다 되감는다)
  if (near && walker) {
    const img = near.firstElementChild, h = walker.offsetHeight || 120, wImg = img && img.offsetWidth;
    liveAnim.x += dt * (h * 0.7) / (WALK_MS * WALK_FRAMES);
    if (wImg) {
      near.style.transform = `translate3d(${-(liveAnim.x % wImg).toFixed(1)}px,0,0)`;
      if (far) far.style.transform = `translate3d(${-((liveAnim.x * 0.33) % wImg).toFixed(1)}px,0,0)`;
    }
  }
}
function liveScene(r) {
  const zid = (r && r.zone) || S.expedition.zone || 'cheongpung', w = weaponType();
  const img = () => `<img src="assets/art/travel/${zid}.jpg" alt="">`;   // 끝과 처음이 이어지게 다듬은 그림 (이음매 없이 되풀이)
  if (!liveAnim.raf) liveAnim.raf = requestAnimationFrame(liveLoop);
  return `<div class="live-scene ${liveDone(r) ? 'rest' : ''}" id="liveScene">
    <div class="live-world"><div class="live-strip far" data-anim>${img()}${img()}${img()}</div><div class="live-strip near" data-anim>${img()}${img()}${img()}</div></div>
    <div class="sp-fighter live-walker" id="liveWalker_${w}"><i class="sp-shadow"></i><div class="walk-spr" data-anim style="background-image:url('assets/art/sprites/walk_${w}.webp')"></div></div>
    <div class="sp-fighter sp-hero live-hero" id="liveHero" data-f="0"><i class="sp-shadow"></i><div class="sp-spr" style="background-image:url('${SPRITE_SRC.hero(w)}')"></div></div>
    <img class="live-enc" src="assets/art/ui/b_encounter.png" alt="">
    <span class="live-where">${ZONES[zid].name}</span>
  </div>`;
}
function liveStepRow(r, i, t) {
  const st = r.steps[i], seen = st.b === undefined || battleSeen(r, st.b);
  const btn = st.b !== undefined ? `<button class="watch ${seen ? '' : 'unseen'}" data-watch="${r.id}:${st.b}">${seen ? '다시보기' : '결과보기'}</button>` : '';
  return `<li class="${seen ? st.cls : 'enc'} ${t - stepAt(r, i) < 4000 && !r.shownAll ? 'fresh' : ''}"><time>${hhmm(Math.min(stepAt(r, i), r.shownAt || Infinity))}</time><span>${chronDecor(stepText(r, st))}</span>${btn}</li>`;
}
function liveSide() {
  const r = liveRec(), t = now(), sp = liveSpeed();
  const speeds = `<div class="chips live-speed">${LIVE_SPEEDS.map(v => `<button class="chip ${sp === v ? 'on' : ''}" data-livespeed="${v}">${LIVE_SPEED_NAME[v]}</button>`).join('')}</div>`;
  if (!r || !r.pend) return `${speeds}<p class="muted live-empty">${S.expedition.zone ? '다음 정각에 제자가 길을 떠나면, 이곳에서 강호행을 실시간으로 지켜볼 수 있습니다.' : '탐험지를 정하면 제자가 길을 떠납니다.'}</p>`;
  const n = shownSteps(r, t), done = liveDone(r, t), pend = pendingRecs();
  const pct = done ? 100 : Math.min(100, (t - r.at) / Math.max(1, liveDur()) * 100);
  const rows = [];
  for (let i = n - 1; i >= 0; i--) rows.push(liveStepRow(r, i, t));
  const unseen = r.battles.filter(b => b.seen === false).length;
  return `${speeds}
    <div class="live-prog"><span style="width:${pct.toFixed(1)}%"></span></div>
    <p class="live-state">${done ? `<b>강호행을 마치고 돌아왔습니다.</b>` : `<b>${ZONES[r.zone].name}</b>을 오르는 중 · 견문 ${n} / ${r.steps.length} · ${hhmm(liveEndAt(r))} 무렵 귀환`}${unseen ? ` · <span class="warn">안 본 전투 ${unseen}</span>` : ''}</p>
    <ol class="live-log">${rows.join('') || '<li class="muted">산문을 나섰습니다…</li>'}</ol>
    <div class="btns live-btns">
      ${pend.length ? `<button class="btn ${canClaim(t) ? 'primary' : ''}" data-act="claim" ${canClaim(t) ? '' : 'disabled'}>최종보상확인${pend.length > 1 ? ` (${pend.length}번)` : ''}</button>` : '<span class="muted">받을 보상이 없습니다.</span>'}
      ${!done && sp !== 0 ? '<button class="btn ghost sm" data-act="revealall">지금 모두 보기</button>' : ''}
    </div>
    ${pend.length && !canClaim(t) ? '<small class="muted">견문이 끝나면 얻은 것을 받을 수 있습니다.</small>' : ''}`;
}
function livePanel() {
  const r = liveRec();
  lastLiveSig = liveSig();
  return `<section class="panel live-panel">
    ${head('실시간 강호행', '江湖行 觀', `<span class="pill">${LIVE_SPEED_NAME[liveSpeed()]}</span>`)}
    <div class="live-wrap">${liveScene(r)}<div class="live-side" id="liveSide">${liveSide()}</div></div>
  </section>`;
}
/* 최종보상확인: 받은 것을 펼쳐 보인다 */
function lootModal() {
  const g = ui.lootSum; if (!g) return '';
  const items = Object.entries(g.items).map(([id, n]) => `<li>${itemIco(id)}<b>${ITEMS[id].name}</b><span>×${n}</span></li>`).join('');
  const gear = g.gear.map(it => `<li><i class="chron-ico" style="background-image:url('assets/art/ui/c_trophy.png')"></i><b>[${RARITY[it.rarity].name}] ${it.name}</b></li>`).join('');
  return `<div class="sheet loot-sheet">
    <p class="eyebrow">江湖行 · 최종 보상</p>
    <h2>${g.n > 1 ? `강호행 ${g.n}번에서 얻은 것` : '강호행에서 얻은 것'}</h2>
    <div class="settle-total"><span>${hlSilver(g.silver)}</span><span>수련치 +${fmt(g.exp)}</span>${g.contrib ? `<span>공헌 +${g.contrib}</span>` : ''}</div>
    ${items || gear ? `<ul class="loot-grid">${items}${gear}</ul>` : '<p class="muted">건진 물건은 없습니다.</p>'}
    <div class="btns"><button class="btn primary" data-act="closemodal">확인</button></div>
  </div>`;
}


const hhmmss = ms => { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return `${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(x).padStart(2, '0')}`; };
function countdownText() {
  const left = nextExpeditionIn();
  return left === null ? '탐험지 미정' : left <= 0 ? '곧 출발' : hhmmss(left);
}
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
    <div>${!open || here ? '' : `<button class="btn ${X.zone ? '' : 'primary'} sm" data-dest="${zid}">${X.zone ? '탐험지로 정하기' : '이곳으로 첫 탐험 떠나기'}</button>`}</div>
  </div>`;
}

/* 출정 준비: 정각 전에 갖춰 둘 것들 (탐험지·무공·병기·장비·생혈고·상성·단약) */
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
    ${row(has('saenghyeol', 3), '생혈고', `${count('saenghyeol')}개 (활력 35% 아래에서 자동 사용) · 소환단 ${count('potionMp')}개`, go('sect', 'forge', '화로'))}
    ${(() => { const e = myElem(), t = myTerrain(), m = X.zone ? terrainMult(X.zone) : 1;
      const tz = X.zone ? ` — ${ZONES[X.zone].name} ${zoneTerrainText(X.zone)} ${m < 1 ? '<b class="good">일치 · 기력 -20%</b>' : m > 1 ? '<span class="warn">불일치 · 기력 +20%</span>' : ''}` : '';
      return row(!!(e && t) && m <= 1, '상성', `기공 ${e ? elemTag(e) : '<span class="warn">오행 없음</span>'} · 경공 ${t ? terrainTag(t) : '<span class="warn">지형 없음</span>'}${tz} · 병기 ${weaponTag(weaponType())}`, go('status', 'martial', '무공')); })()}
    ${row(true, '준비한 단약', S.buffs.length ? S.buffs.map(b => b.name).join(', ') : '없음 (골계단·통맥환·해독산·청심단은 다음 원정 동안 효과)', go('bag', null, '행낭'))}
  </ul>`;
}

function viewField() {
  const X = S.expedition, st = calcStats(), cur = X.zone && ZONES[X.zone];
  const recs = [...S.expeditions].reverse().filter(r => liveDone(r)).map(r => {
    const sm = recSummary(r), Z = ZONES[r.zone];
    if (r.pend && !r.claimed) return `<details class="exp-rec"><summary><time>${recTime(r)}</time><b>${Z.name}</b><span>보상을 아직 받지 않았습니다</span><button class="watch claim" data-act="claim">최종보상확인</button></summary></details>`;
    return `<details class="exp-rec ${r.defeats ? 'defeat' : ''}">
      <summary><time>${recTime(r)}</time><b>${Z.name}</b><span>${sm.head}</span>${r.defeats ? `<em class="warn">쓰러짐 ${r.defeats}</em>` : ''}</summary>
      ${sm.items.length || sm.gear.length ? `<p class="exp-loot">${[...sm.items, ...sm.gear].map(t => `<span>${t}</span>`).join('')}</p>` : ''}
      ${terrainLine(r) ? `<p class="muted tr-line">⛰ ${terrainLine(r)}</p>` : ''}
      <ol class="exp-steps">${r.steps.map(s => { const seen = s.b === undefined || battleSeen(r, s.b); return `<li class="${seen ? s.cls : 'enc'}">${stepText(r, s)}${s.b !== undefined ? ` <button class="watch ${seen ? '' : 'unseen'}" data-watch="${r.id}:${s.b}">${seen ? '다시보기' : '결과보기'}</button>` : ''}</li>`; }).join('')}</ol>
    </details>`;
  }).join('');
  return `${livePanel()}<section class="panel">
    ${head('강호행', '江湖行', `<span class="pill">${cur ? `⛰️ ${cur.name}` : '탐험지 미정'}</span>`)}
    <div class="exp-status">
      <div class="exp-next"><small>다음 출발 ${X.nextAt ? `<b class="clock">${clockHM(X.nextAt)}</b>` : ''}</small><b data-countdown>${countdownText()}</b>${X.nextAt ? incenseClock() : ''}</div>
      <div class="exp-sta"><small class="muted">매시 정각, 제자가 이 준비 그대로 떠납니다. 그 전에 갖춰 두십시오.</small></div>
    </div>
    <h4 class="prep-head">출정 준비</h4>
    ${prepPanel()}
    <p class="story">${cur ? `매시 정각마다 제자가 ${josa(cur.name, '으로')} 나가 지칠 때까지 싸우고 줍고 돌아옵니다. 한 시간의 강호행은 위 '실시간 강호행'에 배속으로 펼쳐지고, 얻은 것은 [최종보상확인]으로 받습니다. 자리를 비워도 최대 ${EXPEDITION.maxQueue}번까지 쌓입니다.` : '탐험지를 고르면 제자가 첫 탐험을 곧바로 떠납니다. 그 뒤로는 매시 정각에 스스로 나갑니다.'}</p>
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
const HERO_FACE = 'assets/portraits/hero.png';
const rpIco = src => `<i class="chron-ico rp-ico" style="background-image:url('${src}')"></i>`;
const rpUi = id => rpIco(`assets/art/ui/${id}.png`);
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
  const bars = () => { $('#rpMe').innerHTML = vbar('hp', r.me.hp, prev.me.hp, s.me.maxHp, '활력') + bar('mp', r.me.mp, s.me.maxMp, '내력');
    $('#rpFoe').innerHTML = vbar('hp foe', r.foe, prev.foe, s.foe.maxHp, '기세', true); };
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
