/* [시스템] 별호: 조건을 채우면 얻고(습득 보너스는 영구), 호패에 하나를 새겨 쓴다(착용 보너스). 1장은 최하 · 하만 (TITLE_OPEN_TIER) */
const ownedTitles = () => S.titles || {};
const titleOpen = id => TITLES[id] && !TITLES[id].sealed && TITLES[id].tier <= TITLE_OPEN_TIER;
/* 조건 진행: { cur, need } */
function titleProgress(id) {
  const C = TITLES[id].cond || {}, n = C.n || 1;
  const learned = Object.keys(S.manuals || {}).filter(m => MANUALS[m]);
  const cur = C.k === 'start' ? 1
    : C.k === 'runs' ? (S.expeditions || []).filter(r => r.end).length
    : C.k === 'kills' ? Object.values(S.bestiary || {}).reduce((a, b) => a + (b.kills || 0), 0)
    : C.k === 'killOf' ? ((S.bestiary || {})[C.e] || {}).kills || 0
    : C.k === 'manuals' ? learned.length
    : C.k === 'school' ? learned.filter(m => schoolOf(m) === C.s).length
    : C.k === 'craft' ? ((S.crafts || {})[C.c] || {}).lv || 1
    : C.k === 'shrine' ? (S.shrine || {}).pulls || 0
    : C.k === 'star' ? Math.max(0, ...Object.values(S.manuals || {}).map(m => m.star || 0))
    : C.k === 'attr' ? (S.attr || {})[C.a] || 0
    : C.k === 'silver' ? S.silver || 0 : 0;
  return { cur: Math.min(cur, n), need: n };
}
/* 새로 채운 별호를 얻는다 (얻은 별호 id 목록을 돌려준다) */
function checkTitles(loud = true) {
  S.titles = S.titles || {};
  const got = [];
  for (const id of Object.keys(TITLES)) {
    if (S.titles[id] || !titleOpen(id)) continue;
    const p = titleProgress(id); if (p.cur < p.need) continue;
    S.titles[id] = now(); got.push(id);
    if (loud) log(`별호 「${TITLES[id].name}」를 얻었습니다. ${bonusLine(TITLES[id].gain)} (호패에 새기면 ${bonusLine(TITLES[id].wear)})`, 'gold');
  }
  return got;
}
const bonusLine = o => Object.entries(o || {}).map(([k, v]) => `${STAT_NAMES[k] || k} +${v}${PCT_STATS.has(k) ? '%' : ''}`).join(' · ');
/* 호패에 새길 별호를 고른다 */
function equipTitle(id) {
  if (!ownedTitles()[id]) return false;
  S.title = id; S.alias = TITLES[id].name;
  log(`호패에 별호 「${TITLES[id].name}」를 새겼습니다.`, 'gold');
  return true;
}
/* 능력치: 얻은 별호 모두의 습득 보너스 + 새긴 별호의 착용 보너스 */
function titleStats() {
  const out = {};
  const add = o => { for (const [k, v] of Object.entries(o || {})) out[k] = (out[k] || 0) + v; };
  for (const id of Object.keys(ownedTitles())) if (TITLES[id]) add(TITLES[id].gain);
  if (S.title && ownedTitles()[S.title] && TITLES[S.title]) add(TITLES[S.title].wear);
  return out;
}
