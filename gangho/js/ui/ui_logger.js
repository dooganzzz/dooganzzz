/* [화면] 견문록: 견문록 탭 하나에 모든 기록 (크게·날짜별·분류·걸음 상세). 옆 보조 견문록은 없앴다 */

/* 기록은 견문록 탭 한 곳에만 쌓인다. 견문록 탭을 보고 있으면 새 기록이 들어올 때 다시 그린다 (한 프레임에 한 번) */
let chronPending = false;
Bus.on('log', () => {
  if (typeof ui === 'undefined' || ui.tab !== 'chronicle' || chronPending) return;
  chronPending = true;
  requestAnimationFrame(() => { chronPending = false; if (ui.tab === 'chronicle') render(); });
});

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
/* 기록 속 기호(이모지)를 수묵 아이콘으로 바꿔 그린다. 저장된 기록은 그대로 두고 그릴 때만 바꾼다.
   아이템 기호+이름은 그 아이템 그림으로, 인물의 말은 얼굴로, 나머지 기호는 분류 아이콘으로 */
const CHRON_UI = { '⛰️': 'c_explore', '⛰': 'c_explore', '🏔️': 'c_explore', '👹': 'c_boss', '🔓': 'c_chest', '🚫': 'c_forbid', '🛒': 'c_shop', '🗿': 'c_shrine',
  '🔨': 'c_hammer', '⚙️': 'c_hammer', '✨': 'c_star', '🌟': 'c_star', '🪤': 'c_trap', '🧭': 'c_compass', '⌛': 'c_incense', '💀': 'c_skull', '💫': 'c_crit',
  '🩸': 'c_bleed', '🏘️': 'c_village', '🏆': 'c_trophy', '💰': 'h_silver', '☯': 'h_mp',
  '🚶': 'c_walk', '🏃': 'c_run', '🔥': 'c_burn', '💧': 'c_mppill', '🟢': 'c_pill', '🧪': 'c_antidote', '💥': 'c_forgefail', '📓': 'c_notes',
  '📚': 'c_bind', '🔷': 'c_rank2', '🎁': 'c_reward', '🏯': 'c_sect' };   // 힉스 아이콘 (10월 3일, 이모지 대신)
/* 알림 · 화면 글의 기호만 수묵 아이콘으로 (아이템 · 인물 처리 없이). html은 이미 이스케이프된 글 */
const emojiIcons = html => Object.entries(CHRON_UI).reduce((h, [e, f]) => h.includes(e) ? h.split(e).join(`<i class="chron-ico" style="background-image:url('${ASSET.ui(f)}')"></i>`) : h, html);
const CHRON_ITEM = { '📜': 'hasanryeong', '📖': 'book_g3', '📘': 'book_g3', '🔖': 'book_g3', '🗡️': 'w_sword', '🛡️': 's_armor', '💍': 's_ring', '🎗️': 's_belt',
  '🟩': 's_jade', '⛓️': 'roughOre', '🌿': 'herb' };
const CHRON_NPC = [['노벽송', 'master'], ['조운', 'joun'], ['아린', 'arin'], ['왕 가', 'merchant']];
let chronItemRe = null;
function chronDecor(html) {
  if (!chronItemRe) {
    const pairs = Object.entries(ITEMS).sort((a, b) => b[1].name.length - a[1].name.length);
    const escRe = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    chronItemRe = { re: new RegExp(`(${[...new Set(pairs.map(([, I]) => escRe(I.icon)))].join('|')})(\\s*)((?:<[^>]+>)?)(${pairs.map(([, I]) => escRe(I.name)).join('|')})`, 'g'),
      byKey: new Map(pairs.map(([id, I]) => [I.icon + '|' + I.name, id])) };
  }
  let out = html.replace(chronItemRe.re, (m, ic, sp, tag, name) => { const id = chronItemRe.byKey.get(ic + '|' + name); return id ? `${itemIco(id, 'sm')}${tag}${name}` : m; });
  // 태그 밖 글자에서만 기호를 바꾼다 (아이템 그림의 속성에 든 기호는 건드리지 않게)
  const ico = src => `<i class="chron-ico" style="background-image:url('${src}')"></i>`;
  const lose = /패배|쓰러/.test(html);
  out = out.split(/(<[^>]+>)/).map(part => {
    if (part.startsWith('<')) return part;
    part = part.replace(/⚔️/g, () => ico(ASSET.ui(lose ? 'c_lose' : 'c_win')));
    for (const [e, f] of Object.entries(CHRON_UI)) if (part.includes(e)) part = part.split(e).join(ico(ASSET.ui(f)));
    for (const [e, f] of Object.entries(CHRON_ITEM)) if (part.includes(e)) part = part.split(e).join(ico(ITEM_ART(f)));
    return part.replace(/「([^」]+)」/g, '<b class="kw-place">「$1」</b>');   // 「기연」 · 「상태 › 무공」: 가야 할 곳은 금빛으로
  }).join('');
  const who = CHRON_NPC.find(([n]) => out.startsWith(n + ':') || out.startsWith(n + '이 ') || out.startsWith(n + '가 '));
  if (who && IMG[who[1]]) out = `<i class="npc-face" style="background-image:url('${IMG[who[1]]}')"></i>` + out;
  return out;
}
const dayLabel = t => { const d = new Date(t); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
/* 탐험 걸음·요약의 상세 (기록이 남아 있을 때만: 최근 8번) */
function chronDetail(e) {
  if (!e.ref) return '';
  const rec = findExpedition(e.ref.r);
  if (!rec) return '<small class="muted chron-gone">오래된 탐험이라 상세 기록은 지워졌습니다.</small>';
  if (e.ref.s !== undefined && rec.steps[e.ref.s] && rec.steps[e.ref.s].b !== undefined && !battleSeen(rec, rec.steps[e.ref.s].b)) return '';   // 안 본 전투의 속내는 숨긴다
  if (e.ref.s === undefined) {
    const g = rec.gain, part = (o, f) => Object.entries(o || {}).map(([id, n]) => `${itemIco(id, 'sm')}${ITEMS[id].name} ×${n}`).join(' · ') || f;
    return `<details class="chron-more" ${ui.chronOpen === rec.id ? 'open' : ''}><summary>결산 보기</summary><dl class="chron-gain">
      <dt>전투</dt><dd>${rec.wins}승 ${rec.losses}패 (걸음 ${rec.steps.length}${rec.defeats ? ` · 쓰러짐 ${rec.defeats}` : ''}${rec.villages ? ` · 마을 치료 ${rec.villages}` : ''})</dd>
      <dt>은자</dt><dd>${g.silver >= 0 ? '+' : ''}${fmt(g.silver)}</dd>
      <dt>수련치</dt><dd>+${fmt(g.exp)}</dd>
      <dt>얻은 것</dt><dd>${part(g.items, '—')}${(g.gear || []).length ? ` · ${g.gear.join(' · ')}` : ''}</dd>
      <dt>쓴 것</dt><dd>${part(g.used, '—')}</dd>
    </dl></details>`;
  }
  const st = rec.steps[e.ref.s];
  if (!st || !st.d || !st.d.length) return '';
  return `<details class="chron-more"><summary>자세히</summary><div class="chron-detail">${st.d.map(l => `<p class="${l.cls}">${chronDecor(l.text)}</p>`).join('')}</div></details>`;
}
/* 강호행 기록: 진행 중인 강호행의 머리줄(요약)은 끝난 뒤에 보이고, 전투는 본 것만 결과를 적는다. 없으면 null */
function chronLive(e) {
  if (!e.ref) return e;
  const rec = findExpedition(e.ref.r);
  if (!rec || !rec.steps) return e;                                         // 예전 탐험 기록
  if (e.ref.s === undefined) return liveDone(rec) ? e : null;
  const st = rec.steps[e.ref.s];
  if (!st) return null;
  const seen = st.b === undefined || battleSeen(rec, st.b);
  const btn = st.b !== undefined ? ` <button class="watch ${seen ? '' : 'unseen'}" data-watch="${rec.id}:${st.b}">관찰</button>` : '';
  return { ...e, t: stepAt(rec, e.ref.s), text: stepText(rec, st) + btn, cls: `exp-step ${seen ? st.cls : 'enc'}` };
}
function viewChronicle() {
  const f = ui.chronFilter || 'all', t = now();
  const list = S.log.map(e => chronLive(e)).filter(e => e && chronMatch(e, f)).reverse().map((e, i) => [e, i]).sort((a, b) => b[0].t - a[0].t || a[1] - b[1]).map(x => x[0]);
  let day = '';
  const rows = list.map(e => {
    const dl = dayLabel(e.t), sep = dl !== day ? `<li class="chron-day">${dl}</li>` : '';
    day = dl;
    return `${sep}<li class="chron-row ${e.cls}${e.ref && e.ref.s === undefined && e.ref.r === ui.chronOpen ? ' chron-open' : ''}"><time>${hhmm(e.t)}</time><div class="chron-body"><div class="chron-text">${chronDecor(e.text)}</div>${chronDetail(e)}</div></li>`;
  }).join('');
  return `<section class="panel chronicle">
    ${head('견문록', '見聞錄', `<span class="num muted">${list.length} / ${S.log.length}줄 · 최근 ${LOG_MAX}줄까지 남습니다</span>`)}
    <div class="chips chron-filters">${CHRON_FILTERS.map(([k, n]) => `<button class="chip ${f === k ? 'on' : ''}" data-chron="${k}">${n}</button>`).join('')}</div>
    ${rows ? `<ol class="chron">${rows}</ol>` : '<p class="story muted">이 분류의 기록이 없습니다.</p>'}
  </section>`;
}
