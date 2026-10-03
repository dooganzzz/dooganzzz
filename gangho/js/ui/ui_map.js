/* [화면] 강호 지도: 강호행 탭을 열면(강호행 중이 아닐 때 — 대기 · 쓰러짐) 강호행 화면 대신 지도 화면이 뜬다 (팝업 아님). 강호행 중이면 곧바로 강호행 화면. 청풍문을 가운데로 세 탐험지가 펼쳐진 수묵 지도.
   지도에는 탐험지 이름과 지금 있는 곳만(자세한 건 다녀오며 알아 간다), 누르면 출발 준비(무장 · 무공 · 생혈고 · 단약 등) → [출발]하면 화면이 바뀌며 곧바로 강호행 */
const MAP_SPOTS = { cheongpung: { x: 18, y: 25 }, yeomhwa: { x: 76, y: 22 }, suryong: { x: 52, y: 80 } };   // 지도 그림 위 자리(%) — 강호 지도 확정본(위에서 내려다본 좌판, 10월 3일)   // 지도 그림 위 자리(%)
/* 누르는 자리(그림의 윤곽, %): 손을 대면 그 자리 붓글씨 이름이 떠오른다 (빛무리 없음, 10월 3일) — home은 청풍문(누르면 문파로 돌아감) */
const MAP_HIT = {
  cheongpung: { poly: '2% 4%,37% 3%,39% 22%,36% 36%,30% 46%,18% 54%,3% 52%' },
  yeomhwa: { poly: '51% 4%,96% 5%,97% 40%,84% 47%,68% 44%,58% 36%,52% 24%' },
  home: { poly: '41% 30%,59% 30%,59% 54%,41% 54%' },
  suryong: { poly: '17% 64%,34% 61%,47% 58%,62% 61%,88% 65%,86% 92%,60% 97%,30% 97%,16% 86%' },
};
/* 붓글씨 이름 자리(%): 각 그림의 머리 위쪽 */
const MAP_LABELS = { cheongpung: { x: 19, y: 14 }, yeomhwa: { x: 79, y: 13 }, suryong: { x: 36, y: 72 }, home: { x: 50, y: 26 } };
function mapScreen() {
  const spots = Object.entries(MAP_SPOTS).filter(([z]) => ZONES[z]).map(([zid, p]) => {
    const Z = ZONES[zid], open = zoneUnlocked(zid);   // 자세한 정보는 다녀오며 알아 간다 — 지도에는 붓글씨 이름만
    const L = MAP_LABELS[zid];
    const M = MAP_HIT[zid];
    return `<button class="map-spot ${open ? '' : 'locked'}" style="clip-path:polygon(${M.poly})" data-mapzone="${zid}" aria-label="${Z.name}" ${open ? '' : 'aria-disabled="true"'}></button>`
      + `<img class="map-word ${open ? '' : 'locked'}" style="left:${L.x}%;top:${L.y}%" src="${ASSET.ui('map_' + zid)}" alt="">`;
  }).join('');
  return `<section class="panel map-sheet">
    <div class="map-head"><h2>강호 지도 <small>江湖地圖</small></h2></div>
    <div class="map-box"><img src="${ASSET.scene('gangho_map')}" alt="청풍문과 세 탐험지 지도" draggable="false">${spots}
      <button class="map-spot" style="clip-path:polygon(${MAP_HIT.home.poly})" data-tab="sect" data-sub="grounds" aria-label="청풍문으로 돌아가기"></button><img class="map-word home" style="left:${MAP_LABELS.home.x}%;top:${MAP_LABELS.home.y}%" src="${ASSET.ui('map_home')}" alt=""></div>
  </section>`;
}
function mapGoModal(zid) {
  const Z = ZONES[zid], st = calcStats();
  return `<div class="sheet map-go">
    <p class="eyebrow">江湖行 · 出發</p><h2>${josa(Z.name, '으로')} 떠날까요?</h2>
    <p class="story">${Z.desc}</p>
    <p class="map-vit">활력 <b>${fmt(Math.round(S.hp))} / ${fmt(st.maxHp)}</b> · 기력 <b>${Math.round(S.stamina / (st.maxSta || 100) * 100)}%</b> · 생혈고 <b>${count('saenghyeol')}</b> · 기력단 <b>${count('gigeokdan')}</b> · 출발 단계 <b>${stageName(zid, S.expedition.stage || 1)}</b></p>
    ${prepPanel()}
    <div class="btns"><button class="btn primary big" data-act="mapgo">출발</button><button class="btn ghost" data-act="mapback">다른 곳 고르기</button></div>
  </div>`;
}

/* ───────── 청풍문 › 전경: 위에서 내려다본 좌판. 갈래 메뉴 없이 그림 위 이름표(구름 바탕)를 눌러서만 옮겨 다닌다 (10월 3일 유저) ─────────
   x · y = 이름표 가운데 자리(%) — 임시 자리, 유저가 연출 미리보기 슬라이더로 정한다. 청풍문 탭을 다시 누르면 전경으로 돌아온다 */
const GROUNDS_SPOTS = {
  hall:   { name: '정청', hanja: '正廳', x: 50, y: 27, go: 'data-tab="sect" data-sub="hall"' },
  forge:  { name: '화로', hanja: '火爐', x: 73, y: 8, go: 'data-tab="sect" data-sub="forge"', bld: { x: 73, y: 21, w: 14 } },
  shrine: { name: '무신상', hanja: '武神像', x: 27.5, y: 8, go: 'data-tab="sect" data-sub="shrine"', bld: { x: 27.5, y: 21, w: 13.5 } },
  shop:   { name: '전방', hanja: '廛房', x: 36.5, y: 27, go: 'data-tab="sect" data-sub="shop"', bld: { x: 36.5, y: 39, w: 14 } },
  yeonmu: { name: '연무장', hanja: '演武場', x: 70, y: 54, go: 'data-tab="sect" data-sub="yeonmu"', bld: { x: 70, y: 67, w: 19.5 } },
  gate:   { name: '산문', hanja: '山門', x: 50, y: 80, go: 'data-tab="field"' },
};   // bld = 건물 그림 자리 · 크기(전경 폭 대비 %, 유저 슬라이더 값 10월 3일) · 이름표 x · y는 임시
function viewGrounds() {
  const blds = Object.entries(GROUNDS_SPOTS).filter(([, G]) => G.bld).map(([k, G]) => `<button class="ground-bld" data-spot="${k}" style="left:${G.bld.x}%;top:${G.bld.y}%;width:${G.bld.w}%" ${G.go} aria-label="${G.name}"><img src="${ASSET.building(k)}" alt="" draggable="false"></button>`).join('');
  const tags = Object.entries(GROUNDS_SPOTS).map(([k, G]) => `<button class="ground-tag" data-spot="${k}" style="left:${G.x}%;top:${G.y}%" ${G.go} aria-label="${G.name}"><img src="${ASSET.ui('ground_tag')}" alt="" aria-hidden="true"><span>${G.name}<small>${G.hanja}</small></span>${k === 'hall' ? alertDot(questAlert()) : ''}</button>`).join('');
  return `<section class="panel map-sheet">
    <div class="map-box grounds"><img src="${ASSET.scene('sect_grounds')}" alt="청풍문 전경" draggable="false">${blds}${tags}</div>
  </section>`;
}
