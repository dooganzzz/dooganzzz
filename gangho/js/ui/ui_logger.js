/* [화면] 견문록: 곁의 작은 견문록(최신이 맨 위), 견문록 탭(크게·날짜별·걸음 상세), 본문 높이 맞춤 */

/* 새 기록은 맨 위에 붙인다 (최신이 항상 위) */
Bus.on('log', entry => {
  const el = $('#log'); if (!el) return;
  const p = document.createElement('p');
  p.className = entry.cls; p.innerHTML = entry.text; p.dataset.time = hhmm(entry.t);
  el.prepend(p);
  while (el.children.length > 60) el.lastElementChild.remove();
  el.scrollTop = 0;
});

function renderLog() {
  const el = $('#log'); if (!el || !S) return;
  el.innerHTML = S.log.slice(-60).reverse().map(l => `<p class="${l.cls}" data-time="${hhmm(l.t)}">${l.text}</p>`).join('');
  el.scrollTop = 0;
}

/* 견문록 높이를 왼쪽 본문 패널과 1:1로 맞춘다 (넓은 화면에서만) */
function syncSide() {
  const main = $('#main'), side = $('.side');
  const apply = () => {
    if (innerWidth <= 960) { side.style.height = ''; return; }
    side.style.height = Math.max(320, main.offsetHeight) + 'px';
    const el = $('#log'); if (el) el.scrollTop = 0;
  };
  if (window.ResizeObserver) new ResizeObserver(apply).observe(main);
  addEventListener('resize', apply);
  apply();
}

/* ───────── 견문록 탭: 크게, 날짜별로, 걸음마다 상세를 펼쳐 본다 ───────── */
const CHRON_FILTERS = [['all', '전체'], ['exp', '탐험'], ['battle', '전투'], ['loot', '획득'], ['npc', '인물'], ['warn', '경고']];
function chronMatch(e, f) {
  if (f === 'all') return true;
  if (f === 'exp') return /\bexp-/.test(e.cls);
  if (f === 'battle') return e.text.includes('data-watch');
  if (f === 'loot') return /\b(loot|gold|good)\b/.test(e.cls) && !/\bexp-/.test(e.cls);
  if (f === 'npc') return /\bnpc\b/.test(e.cls);
  if (f === 'warn') return /\bbad\b/.test(e.cls) || e.text.includes('class="warn"');
  return true;
}
const dayLabel = t => { const d = new Date(t); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
/* 탐험 걸음·요약의 상세 (기록이 남아 있을 때만: 최근 8번) */
function chronDetail(e) {
  if (!e.ref) return '';
  const rec = findExpedition(e.ref.r);
  if (!rec) return '<small class="muted chron-gone">오래된 탐험이라 상세 기록은 지워졌습니다.</small>';
  if (e.ref.s === undefined) {
    const g = rec.gain, part = (o, f) => Object.entries(o || {}).map(([id, n]) => `${ITEMS[id].icon} ${ITEMS[id].name} ×${n}`).join(' · ') || f;
    return `<details class="chron-more"><summary>결산 보기</summary><dl class="chron-gain">
      <dt>전투</dt><dd>${rec.wins}승 ${rec.losses}패 (걸음 ${rec.steps.length}${rec.defeats ? ` · 쓰러짐 ${rec.defeats}` : ''}${rec.villages ? ` · 마을 치료 ${rec.villages}` : ''})</dd>
      <dt>은자</dt><dd>${g.silver >= 0 ? '+' : ''}${fmt(g.silver)}</dd>
      <dt>경험치</dt><dd>+${fmt(g.exp)}</dd>
      <dt>얻은 것</dt><dd>${part(g.items, '—')}${(g.gear || []).length ? ` · ${g.gear.join(' · ')}` : ''}</dd>
      <dt>쓴 것</dt><dd>${part(g.used, '—')}</dd>
    </dl></details>`;
  }
  const st = rec.steps[e.ref.s];
  if (!st || !st.d || !st.d.length) return '';
  return `<details class="chron-more"><summary>자세히</summary><div class="chron-detail">${st.d.map(l => `<p class="${l.cls}">${l.text}</p>`).join('')}</div></details>`;
}
function viewChronicle() {
  const f = ui.chronFilter || 'all';
  const list = S.log.filter(e => chronMatch(e, f)).slice().reverse();
  let day = '';
  const rows = list.map(e => {
    const dl = dayLabel(e.t), sep = dl !== day ? `<li class="chron-day">${dl}</li>` : '';
    day = dl;
    return `${sep}<li class="chron-row ${e.cls}"><time>${hhmm(e.t)}</time><div class="chron-body"><div class="chron-text">${e.text}</div>${chronDetail(e)}</div></li>`;
  }).join('');
  return `<section class="panel chronicle">
    ${head('견문록', '見聞錄', `<span class="num muted">${list.length} / ${S.log.length}줄 · 최근 ${LOG_MAX}줄까지 남습니다</span>`)}
    <div class="chips chron-filters">${CHRON_FILTERS.map(([k, n]) => `<button class="chip ${f === k ? 'on' : ''}" data-chron="${k}">${n}</button>`).join('')}</div>
    ${rows ? `<ol class="chron">${rows}</ol>` : '<p class="story muted">이 분류의 기록이 없습니다.</p>'}
  </section>`;
}
