/* [시스템] 강호행: 사냥터 생성·이동·함정·금고·기연 사건 (DOM 조작 금지) */

/* 입구에서 8방향 BFS. 거리 맵을 돌려준다. */
function bfs(grid, sx, sy) {
  const dist = new Map([[`${sx},${sy}`, 0]]), q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift(), d = dist.get(`${x},${y}`);
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, c = (grid[ny] || [])[nx];
      if (!c || c === '_' || dist.has(`${nx},${ny}`)) continue;
      dist.set(`${nx},${ny}`, d + 1); q.push([nx, ny]);
    }
  }
  return dist;
}

function reachable(grid, sx, sy) { return new Set(bfs(grid, sx, sy).keys()); }
const neighbors8 = (x, y) => DIRS.map(([dx, dy]) => [x + dx, y + dy]).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < MAP_W && ny < MAP_H);

/* 12×10 사냥터 생성
   1) 입구(좌측 하단)→두목(우측 상단 끝) 사이에 굽이진 주 통로를 먼저 판다
   2) 통로 밖 일부를 절벽(빈칸)으로 막는다
   3) BFS로 끊긴 칸이 있으면 가장 가까운 도달 칸까지 산길로 잇는다
   4) 이벤트를 서로 붙지 않게(8방향 이웃 금지) 흩뿌리고, 나머지는 모두 산길로 둔다 */
function generateLayout(Z) {
  const W = MAP_W, H = MAP_H, R = (a, b) => rint(a, b);
  const grid = Array.from({ length: H }, () => Array(W).fill('o'));
  const S0 = [R(0, 1), R(H - 3, H - 1)], K0 = [W - 1, 0];
  const main = new Set();
  let [x, y] = S0;
  main.add(`${x},${y}`);
  while (x !== K0[0] || y !== K0[1]) {
    const opts = [];
    if (x < K0[0]) opts.push([1, 0], [1, 0]);
    if (y > K0[1]) opts.push([0, -1], [0, -1]);
    if (x < K0[0] && y > K0[1]) opts.push([1, -1]);
    if (y < H - 1 && Math.random() < 0.15) opts.push([0, 1]);
    const [dx, dy] = pick(opts); x += dx; y += dy;
    main.add(`${x},${y}`);
  }
  const near = (px, py, [qx, qy]) => Math.max(Math.abs(px - qx), Math.abs(py - qy)) <= 1;
  const cells = [];
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (!main.has(`${xx},${yy}`) && !near(xx, yy, S0) && !near(xx, yy, K0)) cells.push([xx, yy]);
  const voidN = Math.round(W * H * rnd(...MAP_SPEC.void));
  for (const [vx, vy] of cells.sort(() => Math.random() - 0.5).slice(0, voidN)) grid[vy][vx] = '_';
  grid[S0[1]][S0[0]] = 'S'; grid[K0[1]][K0[0]] = 'K';
  // 끊긴 칸 잇기
  for (let guard = 0; guard < 200; guard++) {
    const seen = reachable(grid, ...S0), lost = [];
    grid.forEach((r, yy) => r.forEach((c, xx) => { if (c !== '_' && !seen.has(`${xx},${yy}`)) lost.push([xx, yy]); }));
    if (!lost.length) break;
    const [lx, ly] = lost[0];
    let best = null, bd = Infinity;
    for (const k of seen) { const [kx, ky] = k.split(',').map(Number); const d = Math.max(Math.abs(kx - lx), Math.abs(ky - ly)); if (d < bd) { bd = d; best = [kx, ky]; } }
    let [cx, cy] = [lx, ly];
    while (Math.max(Math.abs(cx - best[0]), Math.abs(cy - best[1])) > 1) { cx += Math.sign(best[0] - cx); cy += Math.sign(best[1] - cy); if (grid[cy][cx] === '_') grid[cy][cx] = 'o'; }
  }
  // 이벤트 배치: 산길이 약 50%가 되도록 채우되, 한 칸 주변 8칸에 이벤트가 몰리지 않게 흩뿌린다
  const dist = bfs(grid, ...S0), maxD = Math.max(...dist.values());
  const isEvent = c => 'YHMCGE'.includes(c);
  const evNeighbors = ([fx, fy]) => neighbors8(fx, fy).filter(([nx, ny]) => isEvent(grid[ny][nx])).length;
  const nearGate = ([fx, fy]) => neighbors8(fx, fy).some(([nx, ny]) => 'SK'.includes(grid[ny][nx]));
  const paths = () => { const out = []; grid.forEach((r, yy) => r.forEach((c, xx) => { if (c === 'o') out.push([xx, yy]); })); return out.sort(() => Math.random() - 0.5); };
  const deg = ([dx, dy]) => neighbors8(dx, dy).filter(([nx, ny]) => grid[ny][nx] !== '_').length;
  const depth = c => (dist.get(`${c[0]},${c[1]}`) || 0) / maxD;
  const place = (ch, n, sort) => {
    let placed = 0;
    for (const maxAdj of [0, 1, 2, 3]) {                       // 먼저 외따로, 모자라면 조금씩 허용
      let pool = paths().filter(c => !nearGate(c));
      if (sort) pool.sort(sort);
      for (const c of pool) {
        if (placed >= n) return placed;
        if (grid[c[1]][c[0]] !== 'o' || evNeighbors(c) > maxAdj) continue;
        // 이미 놓인 이웃 이벤트도 주변 8칸 중 이벤트가 3개를 넘지 않게 한다
        if (neighbors8(c[0], c[1]).some(([nx, ny]) => isEvent(grid[ny][nx]) && evNeighbors([nx, ny]) >= 3)) continue;
        grid[c[1]][c[0]] = ch; placed++;
      }
    }
    return placed;
  };
  const deadEnd = (a, b) => deg(a) - deg(b) || depth(b) - depth(a);
  place('E', R(...MAP_SPEC.event), deadEnd);   // 기연: 막다른 쪽
  place('C', R(...MAP_SPEC.chest));
  place('Y', R(...MAP_SPEC.beast));
  // 함정은 산길 칸에 숨긴다 (보이는 모습은 산길과 같다)
  let traps = R(...MAP_SPEC.trap);
  for (const c of paths()) { if (!traps) break; if (nearGate(c) || grid[c[1]][c[0]] !== 'o') continue; grid[c[1]][c[0]] = 'T'; traps--; }
  return { layout: grid.map(r => r.join('')), start: S0 };
}

function tileAt(zid, x, y) {
  if (!S || !S.zone || S.zone.id !== zid) return '_';
  const row = S.zone.layout[y];
  if (!row || x < 0 || x >= row.length) return '_';
  if (S.zone.done[`${x},${y}`]) return 'o';
  return row[x];
}

function passable(zid, x, y) { return tileAt(zid, x, y) !== '_'; }
function zoneUnlocked(zid) { const u = ZONES[zid].unlock; return !u || !!S.flags[u.boss]; }

function reveal(zid, x, y) {
  S.seen[zid] = S.seen[zid] || {};
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (passable(zid, x + dx, y + dy)) S.seen[zid][`${x + dx},${y + dy}`] = 1;
}

function enterZone(zid) {
  if (!zoneUnlocked(zid)) return;
  const { layout, start } = generateLayout(ZONES[zid]);
  const [x, y] = start;
  S.zone = { id: zid, x, y, layout, start, done: {} };
  S.seen[zid] = {};
  reveal(zid, S.zone.x, S.zone.y);
  log(`${ZONES[zid].name}(${ZONES[zid].hanja})에 들어섰습니다.`, 'place');
  notify.view({ tab: 'field' }); notify.refresh();
}

function leaveZone() {
  if (RT.battle || !S.zone) return;
  log(`${ZONES[S.zone.id].name}${jo(ZONES[S.zone.id].name, '을를')} 떠나 청풍문으로 돌아왔습니다.`, 'place');
  S.zone = null; notify.refresh();
}

function move(dx, dy) {
  if (!S.zone || RT.battle) return;
  const nx = S.zone.x + dx, ny = S.zone.y + dy, zid = S.zone.id;
  if (!passable(zid, nx, ny)) return;
  const c = tileAt(zid, nx, ny);
  S.zone.x = nx; S.zone.y = ny; notify.view({ stepTo: `${nx},${ny}` });
  reveal(zid, nx, ny);
  if (c === 'T') return springTrap();
  if (c === 'E') return openEvent(`${nx},${ny}`);
  if (c === 'Y') {
    const key = `${nx},${ny}`;
    S.zone.foes = S.zone.foes || {};
    if (!S.zone.foes[key]) S.zone.foes[key] = pickBeast();   // 대치 상대는 한 번 정해지면 바뀌지 않는다
    log(`🐾 ${josa(ENEMIES[S.zone.foes[key]].name, '이가')} 앞길을 막아섭니다. 대치(對峙) 중입니다.`, 'place');
  }
  notify.refresh();
}

/* 숨은 함정: 밟는 순간 발동하고 곧바로 산길이 된다 */
function springTrap() {
  const st = calcStats(), hpLoss = Math.max(1, Math.round(st.maxHp * TRAP.hpPct));
  S.hp = Math.max(1, S.hp - hpLoss); S.stamina = Math.max(0, S.stamina - TRAP.stamina);
  log(`🪤 ${TRAP.text} 활력 -${hpLoss}, 기력 -${TRAP.stamina}`, 'bad');
  notify.toast(TRAP.text);
  clearNode(); notify.refresh();
}

/* 요수: 밟는 순간 지역 요수 중 하나를 가중치로 고른다. 깊은 곳일수록 중형이 잦다. */
function pickBeast() {
  const Z = ZONES[S.zone.id], dist = bfs(S.zone.layout, ...S.zone.start);
  const maxD = Math.max(...dist.values()), d = (dist.get(`${S.zone.x},${S.zone.y}`) || 0) / maxD;
  const w = d >= 0.5 ? BEAST_WEIGHT.deep : BEAST_WEIGHT.shallow;
  let r = Math.random() * w.reduce((a, b) => a + b);
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return Z.enemies[i]; }
  return Z.enemies[0];
}

function nodeInfo(zid, x, y) {
  const c = tileAt(zid, x, y), Z = ZONES[zid];
  if (c === 'Y') return { type: 'beast', label: '요수(妖獸)' };
  if (c === 'H') return { type: 'herb', icon: '🌿', label: '약초 군락' };
  if (c === 'M') return { type: 'mine', icon: '⛏️', label: '광맥' };
  if (c === 'C') return { type: 'chest', label: '금고(金庫)' };
  if (c === 'E') return { type: 'event', label: '기연(奇緣)' };
  if (c === 'G') return { type: 'gimmick', label: Z.gimmick.name };
  if (c === 'K') return { type: 'boss', label: ENEMIES[Z.boss].name, enemy: Z.boss };
  if (c === 'S') return { type: 'gate', label: '입구' };
  return { type: 'path', label: '산길(山徑)' };   // 함정(T)도 산길과 똑같이 보인다
}

function rollTable(table) {
  const out = [];
  for (const [id, a, b, p] of table) if (Math.random() < (p ?? 1)) out.push([id, rint(a, b)]);
  return out;
}

/* ───────── 사냥터 사건 (기연) ───────── */
function eventPool(zid) { return EVENTS.filter(e => e.zones === 'all' || e.zones.includes(zid)); }

function eventAt(key) {
  S.zone.events = S.zone.events || {};
  if (!S.zone.events[key]) {
    const used = new Set(Object.values(S.zone.events));
    const pool = eventPool(S.zone.id).filter(e => !used.has(e.id));
    S.zone.events[key] = pick(pool.length ? pool : eventPool(S.zone.id)).id;   // 한 번 들어간 사냥터에서는 겹치지 않게
  }
  return EVENTS.find(e => e.id === S.zone.events[key]);
}

function openEvent(key) {
  const ev = eventAt(key);
  if (!(S.zone.evResult || {})[key]) log(`📜 기연(奇緣) — ${ev.title}`, 'place');
  notify.view({ modal: 'event:' + key }); notify.refresh();
}

/* 선택지 조건: 부족하면 이유를 돌려준다 */
function reqFail(req) {
  if (!req) return '';
  if (req.item && !has(req.item[0], req.item[1])) return `${ITEMS[req.item[0]].name} ${req.item[1]}개 필요`;
  if (req.silver && S.silver < req.silver) return `은자 ${req.silver}냥 필요`;
  if (req.stamina && S.stamina < req.stamina) return `기력 ${req.stamina} 필요`;
  if (req.stat && calcStats()[req.stat[0]] < req.stat[1]) return `${STAT_NAMES[req.stat[0]]} ${req.stat[1]} 이상`;
  if (req.star && bestMugongStar() < req.star) return `무공 ${req.star}성 이상`;
  return '';
}

const reqLabel = req => !req ? '' : req.item ? `${ITEMS[req.item[0]].name} ×${req.item[1]}` : req.silver ? `은자 ${req.silver}냥` : req.stamina ? `기력 ${req.stamina}` : req.stat ? `${STAT_NAMES[req.stat[0]]} ${req.stat[1]}+` : req.star ? `무공 ${req.star}성+` : '';

function chooseEvent(key, idx) {
  const ev = eventAt(key), ch = ev.choices[idx];
  if (!ch || (S.zone.evResult || {})[key] || reqFail(ch.req)) return;
  if (ch.take && ch.req) { if (ch.req.item) take(ch.req.item[0], ch.req.item[1]); if (ch.req.silver) S.silver -= ch.req.silver; }
  let r = Math.random() * ch.out.reduce((a, o) => a + o.w, 0), out = ch.out[0];
  for (const o of ch.out) { r -= o.w; if (r < 0) { out = o; break; } }
  const gains = applyFx(out.fx || {});
  log(`📜 ${ev.title} — ${ch.label}: ${out.text}`, 'npc');
  S.zone.evResult = S.zone.evResult || {};
  S.zone.evResult[key] = { choice: ch.label, text: out.text, gains, fight: out.fight || null };
  const [x, y] = key.split(',').map(Number);
  S.zone.done[key] = 1;                                     // 사건이 끝난 칸은 산길이 된다
  if (out.fight) {
    notify.view({ modal: null });
    startBattle(out.fight);
    if (out.bonus) RT.battle.bonus = out.bonus;
    return;
  }
  notify.refresh();
}

/* 사건 결과 적용. 받은 것을 사람이 읽을 문장 목록으로 돌려준다 */
function applyFx(fx) {
  const out = [], st = calcStats();
  if (fx.silver) { S.silver = Math.max(0, S.silver + fx.silver); out.push(`${fx.silver > 0 ? '+' : ''}은자 ${fx.silver}냥`); }
  for (const [id, n] of Object.entries(fx.items || {})) if (give(id, n, true)) out.push(`${ITEMS[id].icon} ${ITEMS[id].name} ×${n}`);
  if (fx.hpPct) { const d = Math.round(st.maxHp * fx.hpPct); S.hp = clamp(S.hp + d, 1, st.maxHp); out.push(`활력 ${d > 0 ? '+' : ''}${d}`); }
  if (fx.stamina) { S.stamina = clamp(S.stamina + fx.stamina, 0, st.maxSta); out.push(`기력 ${fx.stamina > 0 ? '+' : ''}${fx.stamina}`); }
  if (fx.contrib) { S.contrib += fx.contrib; out.push(`문파 공헌도 +${fx.contrib}`); }
  if (fx.trainHours) {
    const id = S.activeTrainingSkillId || S.active.mugong || Object.values(S.active).find(Boolean);
    if (id) { addXp(id, 'txp', fx.trainHours * 3600); out.push(`《${MANUALS[id].name}》 수련 ${fx.trainHours}시간 분량`); }
  }
  if (fx.buff) { S.buffs = S.buffs.filter(b => b.key !== fx.buff.key); S.buffs.push({ ...fx.buff, until: now() + fx.buff.dur * 1000 }); out.push(`${fx.buff.name} ${Math.round(fx.buff.dur / 60)}분`); }
  for (const [k, v] of Object.entries(fx.perm || {})) { S.perm[k] += v; out.push(`${STAT_NAMES[k]} 영구 +${v}`); }
  if (fx.reveal && S.zone) { S.zone.layout.forEach((row, y) => [...row].forEach((c, x) => { if (c !== '_') S.seen[S.zone.id][`${x},${y}`] = 1; })); out.push('사냥터 지형이 모두 드러남'); }
  if (fx.clue) {
    S.knownMats = S.knownMats || {};
    const unknown = [...new Set(RECIPES.flatMap(r => Object.keys(r.in)))].filter(m => !S.knownMats[m]);
    if (unknown.length) { const m = pick(unknown); revealMaterials({ in: { [m]: 1 } }); out.push(`재료 단서: ${ITEMS[m].name}`); }
  }
  if (fx.book) { const books = STARTERS.filter(id => !S.manuals[id] && !has('bk_' + id)); if (books.length) { const b = pick(books); give('bk_' + b, 1, true); out.push(`📘 《${MANUALS[b].name}》 비급`); } }
  if (fx.gear) { const it = makeGear(pick(Object.keys(EQUIP_BASES)), fx.gear[0], fx.gear[1], false); if (giveGear(it, true)) out.push(`🗡️ [${RARITY[it.rarity].name}] ${it.name}`); }
  if (out.length) log(`↳ ${out.map(hlItem).join(', ')}`, 'loot');
  clampVitals();
  return out;
}

/* 금고: 은자 궤·약재 상자·철물 상자·장비 궤 중 하나 */
function openVault(Z) {
  let r = Math.random() * VAULTS.reduce((a, v) => a + v.w, 0), v = VAULTS[0];
  for (const x of VAULTS) { r -= x.w; if (r < 0) { v = x; break; } }
  log(`🔓 금고를 열자 ${v.icon} ${hlItem(v.name)}${jo(v.name, '이가')} 나왔습니다.`, 'good');
  const t = Z.tier;
  if (v.name === '은자 궤') giveSilver(rint(15, 35) * t);
  if (v.name === '약재 궤') {                         // 연단 재료 다량
    for (const id of Z.herb.map(r => r[0]).filter(id => ITEMS[id].craftType === 'alchemy')) give(id, rint(2, 4));
  }
  if (v.name === '철물 궤') {                         // 주조 재료 다량
    for (const id of Z.mine.map(r => r[0]).filter(id => ITEMS[id].craftType === 'forge')) give(id, rint(2, 4));
  }
  if (v.name === '식재 궤') {                         // 조리 재료
    const pool = [...new Set([...Z.herb.map(r => r[0]), 'rice', 'salt'])].filter(id => ITEMS[id].craftType === 'cooking');
    for (const id of pool) give(id, rint(1, 3));
  }
  if (v.name === '비급/장비 궤') {                    // 희귀: 아직 익히지 않은 입문(하품) 비급, 없으면 기본 장비
    const books = STARTERS.filter(id => !S.manuals[id] && !has('bk_' + id));
    if (books.length) give('bk_' + pick(books), 1);
    else giveGear(makeGear(pick(Object.keys(EQUIP_BASES)), t, 0, false));
  }
}

function clearNode() { if (S.zone) S.zone.done[`${S.zone.x},${S.zone.y}`] = 1; }

function interact() {
  if (!S.zone || RT.battle) return;
  const { id: zid, x, y } = S.zone, Z = ZONES[zid], info = nodeInfo(zid, x, y);
  if (info.type === 'event') return openEvent(`${x},${y}`);
  if (info.type === 'beast') {
    const key = `${x},${y}`; S.zone.foes = S.zone.foes || {};
    const eid = S.zone.foes[key] || (S.zone.foes[key] = pickBeast());
    if (spend(STAMINA_COST.battle)) startBattle(eid);
    return;
  }
  if (info.type === 'boss') { if (spend(STAMINA_COST.boss)) startBattle(info.enemy); return; }
  if (info.type === 'herb' || info.type === 'mine') {
    if (!spend(STAMINA_COST[info.type])) return;
    log(info.type === 'herb' ? '약초낫으로 풀숲을 헤쳐 남김없이 거두었습니다.' : '곡괭이로 광맥을 남김없이 캐냈습니다.', 'muted');
    for (const [id, n] of rollTable(Z[info.type])) give(id, n);
    clearNode();
  }
  if (info.type === 'chest') {
    if (!spend(STAMINA_COST.chest)) return;
    openVault(Z);
    clearNode();
  }
  if (info.type === 'gimmick') {
    if (!spend(STAMINA_COST.gimmick)) return;
    const st = calcStats(), g = Z.gimmick;
    if (st[g.stat] >= g.need) {
      log(`${g.name}: ${g.text}`, 'good');
      for (const [id, a, b] of g.reward) { const n = rint(a, b); if (id === 'silver') giveSilver(n); else give(id, n); }
      clearNode();
    } else log(`${g.name}: ${g.fail}`, 'bad');
  }
  notify.refresh();
}
