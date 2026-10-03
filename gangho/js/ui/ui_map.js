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
    <p class="muted map-hint">탐험지에 손을 대면 이름이 떠오르고, 누르면 출발 준비가 나옵니다. 청풍문을 누르면 문파로 돌아갑니다.</p>
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

/* ───────── 청풍문 › 전경: 위에서 내려다본 좌판 (배경 한 장 + 누르는 자리). 빈 터에는 나중에 건물 그림을 한 채씩 얹는다 ─────────
   poly = 누르는 자리(%), lx · ly = 손을 대면 떠오르는 이름 자리(%) */
const GROUNDS_SPOTS = {
  hall: { name: '정청', hanja: '正廳', lx: 50, ly: 25, poly: '43% 2%,57% 2%,58% 14%,56% 24%,44% 24%,42% 14%', go: 'data-tab="sect" data-sub="hall"' },
  gate: { name: '산문', hanja: '山門', lx: 50, ly: 66, poly: '44% 73%,56% 73%,56% 93%,44% 93%', go: 'data-tab="field"' },
};
function viewGrounds() {
  const spots = Object.entries(GROUNDS_SPOTS).map(([k, G]) => `<button class="map-spot" style="clip-path:polygon(${G.poly})" ${G.go} aria-label="${G.name}"></button><span class="ground-word" style="left:${G.lx}%;top:${G.ly}%">${G.name}<small>${G.hanja}</small></span>`).join('');
  return `<section class="panel map-sheet">
    <div class="map-box grounds"><img src="${ASSET.scene('sect_grounds')}" alt="청풍문 전경" draggable="false">${spots}</div>
    <p class="muted map-hint">정청을 누르면 정청으로, 산문을 누르면 강호 지도로 나갑니다. 빈 터에는 문파가 커지며 전각이 들어섭니다.</p>
  </section>`;
}
