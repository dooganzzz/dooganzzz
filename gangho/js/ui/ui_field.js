/* [화면] 강호행 지도(먹선 아이콘·산길 선)와 전투 무대 */

Bus.on('battle', () => renderBattle());   // 전투 한 합마다 무대만 다시 그린다

/* 지도용 먹선 아이콘 (이모지 대신 테마에 맞는 선화) */
const ICON = {
  beast: '<path d="M6 4c3 5 3 11 0 16M11 3c3 6 3 12 0 18M16 4c3 5 3 11 0 16"/>',
  chest: '<rect x="3" y="9" width="18" height="11" rx="1.5"/><path d="M3 9c0-3 2-5 5-5h8c3 0 5 2 5 5M3 13h18M11 12h2v3h-2z"/>',
  boss: '<path d="M4 3l3.5 4.5M20 3l-3.5 4.5"/><path d="M5 9c0 6 3 11 7 11s7-5 7-11c-2-1-4-1.5-7-1.5S7 8 5 9z"/><path d="M8.5 13l2 1M15.5 13l-2 1M10 17h4"/>',
  gate: '<path d="M2 5.5h20M4 5.5v14.5M20 5.5v14.5M3.5 9.5h17M9 9.5V20M15 9.5V20M1.5 3.5l2 2M22.5 3.5l-2 2"/>',
  gimmick: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/><circle cx="12" cy="12" r="2.4"/>',
  event: '<path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7"/><path d="M7 3a2 2 0 0 0-2 2v2h4V5a2 2 0 0 0-2-2z"/><path d="M10 10.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1.1.8-1.1 1.6M12.3 17.2h.01"/>',
  path: '',
};

const ico = k => ICON[k] ? `<svg class="ico ico-${k}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>` : '<i class="dot"></i>';

/* 큰 지도에서 현재 위치를 스크롤 영역 가운데로 */
/* 밝혀진 칸끼리 8방향으로 잇는 산길 선 */
function drawMapLinks() {
  const svg = document.querySelector('.map-links'); if (!svg || !S.zone) return;
  const map = svg.parentElement, cells = {};
  for (const c of map.querySelectorAll('.cell[data-xy]')) cells[c.dataset.xy] = c;
  svg.setAttribute('width', map.scrollWidth); svg.setAttribute('height', map.scrollHeight);
  const ctr = el => [el.offsetLeft + el.offsetWidth / 2, el.offsetTop + el.offsetHeight / 2];
  const hereKey = `${S.zone.x},${S.zone.y}`;
  let out = '';
  for (const [k, el] of Object.entries(cells)) {
    const [x, y] = k.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
      const n = cells[`${x + dx},${y + dy}`]; if (!n) continue;
      const [x1, y1] = ctr(el), [x2, y2] = ctr(n);
      const near = k === hereKey || `${x + dx},${y + dy}` === hereKey;
      out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${near ? 'near' : ''}"/>`;
    }
  }
  svg.innerHTML = out;
}

function centerMap() {
  const box = $('#mapScroll'), here = box && box.querySelector('.cell.here');
  if (!here) return;
  box.scrollLeft = here.offsetLeft - (box.clientWidth - here.offsetWidth) / 2;
  box.scrollTop = here.offsetTop - (box.clientHeight - here.offsetHeight) / 2;
}

/* 강호행 */
function viewField() {
  if (RT.battle) return viewBattle();
  if (!S.zone) {
    return `<section class="panel">
      ${head('강호행', '江湖行')}
      <p class="story">산문을 나서면 강호입니다. 길을 걷는 데는 힘이 들지 않지만, 싸우고 캐고 여는 데는 기력이 듭니다. 기력은 저절로 돌아오지 않습니다.</p>
      <div class="zones">${ZONE_ORDER.filter(zoneUnlocked).map(zid => {
        const Z = ZONES[zid], open = zoneUnlocked(zid);
        return `<article class="zone ${open ? '' : 'locked'} t${Z.tier}">
          <h3>${label(Z.name, Z.hanja)}${S.flags[ENEMIES[Z.boss].boss] ? ' <span class="pill">평정</span>' : ''}</h3>
          <p class="story">${open ? Z.desc : '짙은 안개가 길을 가리고 있습니다.'}</p>
          ${open ? `<div><button class="btn primary" data-zone="${zid}">${Z.name}${jo(Z.name, '으로')}</button></div>` : `<p class="muted">${Z.unlock.text}</p>`}
        </article>`;
      }).join('')}</div>
    </section>`;
  }
  const { id: zid, x, y } = S.zone, Z = ZONES[zid], seen = S.seen[zid] || {}, cols = MAP_W;
  let grid = '';
  for (let yy = 0; yy < MAP_H; yy++) for (let xx = 0; xx < cols; xx++) {
    if (!passable(zid, xx, yy)) { grid += '<div class="cell void"></div>'; continue; }
    if (!seen[`${xx},${yy}`]) { grid += '<div class="cell fog" aria-hidden="true"></div>'; continue; }
    const here = xx === x && yy === y;
    const adj = Math.abs(xx - x) <= 1 && Math.abs(yy - y) <= 1 && !here;
    const info = nodeInfo(zid, xx, yy);
    grid += `<button class="cell ${info.type} ${here ? 'here' : ''} ${adj ? 'adj' : ''}" data-xy="${xx},${yy}" ${adj ? `data-move="${xx - x},${yy - y}"` : 'disabled'} title="${info.label}" aria-label="${info.label}">${ico(info.type)}</button>`;
  }
  const info = nodeInfo(zid, x, y);
  const pad = DIRS.map(([dx, dy, a]) => `<button class="dir" data-move="${dx},${dy}" ${passable(zid, x + dx, y + dy) ? '' : 'disabled'} aria-label="${a}">${a}</button>`);
  pad.splice(4, 0, `<div class="dir mid">${ico(info.type)}</div>`);
  const cost = STAMINA_COST[info.type];
  let action;
  if (info.type === 'beast') {
    S.zone.foes = S.zone.foes || {};
    const eid = S.zone.foes[`${x},${y}`] || (S.zone.foes[`${x},${y}`] = pickBeast());
    const E = ENEMIES[eid], [, stext, scls] = sense(eid);
    action = `<div class="standoff"><p class="eyebrow-s">대치(對峙)</p><p class="story"><b>${E.name}</b>${jo(E.name, '이가')} 낮게 몸을 웅크리고 노려봅니다.</p><p class="story sense ${scls}">${stext}</p>
      <div><button class="btn primary" data-act="interact">⚔️ 결투 시작 <small>기력 ${STAMINA_COST.battle}</small></button></div></div>`;
  }
  else if (info.type === 'boss') {
    const E = ENEMIES[info.enemy], [, stext, scls] = sense(info.enemy);
    action = `<div class="standoff boss"><p class="eyebrow-s">대치(對峙) · 두목</p><p class="story"><b>${E.name}</b>의 거처입니다.</p><p class="story sense ${scls}">${stext}</p><div><button class="btn danger" data-act="interact">⚔️ 결투 시작 <small>기력 ${cost}</small></button></div></div>`;
  } else if (info.type === 'herb' || info.type === 'mine') {
    action = `<p class="story">${info.type === 'herb' ? '약초가 무성합니다.' : '반짝이는 광맥이 드러나 있습니다.'}</p><div><button class="btn primary" data-act="interact">${info.type === 'herb' ? '🌿 채집' : '⛏️ 채광'} <small>기력 ${cost}</small></button></div>`;
  } else if (info.type === 'event') action = `<p class="story">무언가 일이 벌어지고 있는 곳입니다.</p><div><button class="btn primary" data-act="interact">📜 살펴본다</button></div>`;
  else if (info.type === 'chest') action = `<p class="story">묵직한 금고가 풀숲에 반쯤 묻혀 있습니다.</p><div><button class="btn primary" data-act="interact">📦 [ 금고 열기 ] <small>기력 ${cost}</small></button></div>`;
  else if (info.type === 'gimmick') action = `<p class="story">${Z.gimmick.name}${jo(Z.gimmick.name, '이가')} 길가에 버티고 있습니다. 무언가 숨겨져 있을 것 같습니다.</p><div><button class="btn primary" data-act="interact">⚙️ 풀어본다 <small>기력 ${cost}</small></button></div>`;
  else if (info.type === 'gate') action = '<p class="story">산문으로 돌아가는 길목입니다.</p>';
  else action = '<p class="story muted">바람 소리만 들립니다. 이곳의 일은 끝났습니다. 청풍문으로 돌아갔다가 다시 오면 산의 기척이 새로 바뀝니다.</p>';
  return `<section class="panel field">
    ${head(Z.name, Z.hanja, '<button class="btn ghost sm" data-act="leave">청풍문으로 귀환</button>')}
    <div class="field-grid">
      <div class="map-scroll" id="mapScroll"><div class="map" style="grid-template-columns:repeat(${cols},var(--cell))"><svg class="map-links" aria-hidden="true"></svg>${grid}</div></div>
      <div class="control">
        <div class="dpad">${pad.join('')}</div>
        <div class="here-box"><h4>${ico(info.type)} ${info.label}</h4>${action}</div>
        <div class="chips">${['potionHp', 'potionMp', 'clearPill'].filter(id => has(id)).map(id => `<button class="chip" data-use="${id}">${ITEMS[id].icon} ${ITEMS[id].name} <b>${count(id)}</b></button>`).join('')}</div>
      </div>
    </div>
  </section>`;
}

function vbar(cls, cur, prev, max, name, hideNum) {
  const p = v => max ? clamp(v / max * 100, 0, 100) : 0;
  return `<div class="bar thick ${cls}"><span class="bar-ghost" data-to="${p(cur)}" style="width:${p(Math.max(cur, prev))}%"></span><span class="bar-fill" style="width:${p(cur)}%"></span><span class="bar-text"><b>${name}</b>${hideNum ? '' : ` ${fmt(cur)} / ${fmt(max)}`}</span></div>`;
}

const sealChar = name => name.replace(/^(채주|방주|적룡방|화적|수적|외눈)\s*/, '').trim()[0] || name[0];

function viewBattle() {
  const b = RT.battle, e = b.e, st = calcStats();
  const M = MANUALS[S.active.mugong], mm = M && S.manuals[S.active.mugong];
  const items = ['potionHp', 'potionMp', 'clearPill'].filter(id => has(id));
  const prev = b.prev || { me: S.hp, foe: e.hpNow };
  queueMicrotask(() => { b.shown = b.lines.length; });
  return `<section class="panel battle ${b.over ? (b.win ? 'won' : 'lost') : ''}">
    <div class="arena">
      <div class="plaque me" id="pl-me">
        <div class="seal-av">${esc(S.name[0] || '我')}</div>
        <div class="pl-info"><h3>${esc(S.name)}</h3><small>${M ? `《${M.name}》 ${mm.star}성 ${realmTag(mm.star)}` : '무공 미장착'}</small>
          ${vbar('hp', S.hp, prev.me, st.maxHp, '활력')}${bar('mp', S.mp, st.maxMp, '내력')}</div>
      </div>
      <div class="vs"><span>對</span><small>${b.over ? (b.win ? '勝' : '敗') : `${b.round}합`}</small></div>
      <div class="plaque foe ${e.boss ? 'boss' : ''}" id="pl-foe">
        <div class="seal-av foe">${sealChar(e.name)}</div>
        <div class="pl-info"><h3>${e.name}</h3><small>${e.boss ? '두목(頭目)' : '요수(妖獸)'}</small>
          ${vbar('hp foe', e.hpNow, prev.foe, e.hp, '기세', true)}</div>
      </div>
      <div class="move-banner" id="moveBanner" aria-hidden="true"></div>
    </div>
    <div class="blog" id="blog">${b.lines.map((l, i) => `<p class="${l.cls}${i >= (b.shown || 0) ? ' fresh' : ''}">${l.text}</p>`).join('')}</div>
    <div class="bctl">
      ${b.over ? `<button class="btn primary big" data-act="closebattle">${b.win ? '전리품을 챙긴다' : '정신을 잃는다…'}</button>` : `
        <div class="phase"><span class="phase-bar" style="animation-duration:${BATTLE_MS}ms"></span><small>${Math.round(BATTLE_MS / 1000)}초마다 공방이 오갑니다 · 공격을 맞으면 반격 ${st.counter}%</small></div>
        ${items.length ? `<div class="chips">${items.map(id => `<button class="chip" data-bitem="${id}">${ITEMS[id].icon} ${ITEMS[id].name} <b>${count(id)}</b></button>`).join('')}</div>` : ''}`}
    </div>
  </section>`;
}

function renderBattle() {
  if (ui.tab !== 'field' || !RT.battle) return render();
  const b = RT.battle;
  $('#main').innerHTML = viewBattle();
  renderHeader();
  const bl = $('#blog'); if (bl) bl.scrollTop = bl.scrollHeight;
  playFx(b.fx || []);
  b.fx = [];
}
