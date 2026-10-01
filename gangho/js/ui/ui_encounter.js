/* [화면] 기연: 강호행에서 만난 기연이 여기 쌓인다. 유저가 원할 때 골라서 결과를 받는다 (기다리는 것은 ENCOUNTER_KEEP개까지) */
function encGainText(D) {
  const parts = [];
  if (D.silver) parts.push(`은자 ${D.silver > 0 ? '+' : ''}${fmt(D.silver)}`);
  for (const [id, n] of Object.entries(D.items || {})) parts.push(`${ITEMS[id] ? ITEMS[id].name : id} ${n > 0 ? '+' : ''}${n}`);
  if (D.hp) parts.push(`활력 ${D.hp > 0 ? '+' : ''}${D.hp}`);
  return parts.join(' · ');
}
function viewEncounters() {
  const all = S.encounters || [], wait = encountersWaiting(), done = all.filter(e => e.done).reverse();
  const card = E => {
    const ev = EVENTS.find(x => x.id === E.ev); if (!ev) return '';
    const btns = ev.choices.map((c, i) => { const why = reqFail(c.req);
      return `<button class="btn ${why ? 'ghost' : c.req ? 'primary' : ''} sm enc-choice" data-encpick="${E.uid}:${i}" ${why ? 'disabled' : ''}>${esc(c.label)}${c.req ? ` <small>(${reqLabel(c.req)})</small>` : ''}${why ? ` <small class="warn">— ${why}</small>` : ''}</button>`; }).join('');
    return `<div class="enc-card"><div class="enc-top"><b>「${ev.title}」</b><small class="muted">${ZONES[E.zone] ? ZONES[E.zone].name : ''} · ${hhmm(E.at)} · <span class="warn">남은 시간 ${fmtDur(Math.ceil(encLeft(E) / 1000))}</span></small></div>
      <p class="story">${ev.text}</p><div class="enc-btns">${btns}</div></div>`;
  };
  const past = E => { const ev = EVENTS.find(x => x.id === E.ev), D = E.done, g = encGainText(D);
    return `<li><b>「${ev ? ev.title : '?'}」</b> ▸ ${esc(D.label)} — ${esc(D.text)}${D.fight ? ` <span class="warn">${D.fight}</span>` : ''}${g ? ` <span class="gold">${g}</span>` : ''}</li>`; };
  return `<section class="panel enc-panel">${head('기연', '奇緣', `<span class="pill">${wait.length ? `기다리는 기연 ${wait.length}` : '없음'}</span>`)}
      <p class="muted">강호행에서 만난 기연이 여기 쌓입니다. 원할 때 골라 결과를 받으십시오. (기연은 ${ENCOUNTER_TTL / 3600000}시간 안에 골라야 사라지지 않습니다. 기다리는 기연은 ${ENCOUNTER_KEEP}개까지, 넘치면 가장 오래된 것이 지나갑니다)</p>
      ${wait.length ? wait.map(card).join('') : '<p class="story muted">기다리는 기연이 없습니다. 강호를 다니다 보면 만납니다.</p>'}
    </section>
    ${done.length ? `<section class="panel">${head('지난 기연', '往緣')}<ol class="enc-log">${done.map(past).join('')}</ol></section>` : ''}`;
}
