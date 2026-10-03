/* [화면] 강호 지도: 강호행 탭을 열면(강호행 중이 아닐 때 — 대기 · 쓰러짐) 강호행 화면 대신 지도 화면이 뜬다 (팝업 아님). 강호행 중이면 곧바로 강호행 화면. 청풍문을 가운데로 세 탐험지가 펼쳐진 수묵 지도.
   지도에는 탐험지 이름과 지금 있는 곳만(자세한 건 다녀오며 알아 간다), 누르면 출발 준비(무장 · 무공 · 생혈고 · 단약 등) → [출발]하면 화면이 바뀌며 곧바로 강호행 */
const MAP_SPOTS = { cheongpung: { x: 25, y: 33 }, yeomhwa: { x: 76, y: 33 }, suryong: { x: 45, y: 74 } };   // 지도 그림 위 자리(%)
/* 누르는 자리(그림의 윤곽, %): 손을 대면 그 자리 붓글씨 이름이 떠오른다 (빛무리 없음, 10월 3일) — home은 청풍문(누르면 문파로 돌아감) */
const MAP_HIT = {
  cheongpung: { poly: '11% 30%,12% 25%,13.5% 19%,14.5% 18.5%,16% 20%,17.5% 15%,19% 12%,20.5% 13%,21.5% 16%,22.5% 15%,24% 9%,25.5% 6.5%,27% 7.5%,28.5% 11%,29.5% 15%,30.5% 16%,32% 12%,33.5% 13%,35% 16.5%,36.5% 14%,38% 14.5%,39.5% 18%,41.5% 21%,43.5% 24%,44% 27%,42% 30%,40% 33%,38% 37%,36.5% 41%,33% 44%,28% 45.5%,24% 46.5%,20% 45.5%,16% 44%,13% 40%,11% 35%' },
  yeomhwa: { poly: '65% 42%,65.5% 33%,66.3% 31%,67.5% 32%,69.5% 28%,70.6% 28%,71.5% 26%,72% 21.5%,73.2% 21%,74% 19.5%,75% 17.5%,75.5% 15.5%,76.2% 17%,78% 18.5%,79.5% 18.5%,80% 14%,80.6% 14.5%,81% 19%,82.3% 20%,83% 23.5%,84.5% 26%,86.3% 27%,87.5% 27%,88% 29%,89.2% 29%,89.7% 31%,90.5% 34%,91.5% 37%,92% 41%,91% 45%,88% 48%,84% 50%,78% 51%,72% 51%,68% 48.5%,66% 45.5%' },
  home: { poly: '41% 31%,45% 25%,51% 23%,57% 25%,61% 32%,62% 45%,58% 55%,53% 66%,47% 66%,42% 56%,39% 45%' },
  suryong: { poly: '24% 80%,27% 76%,31% 73%,36% 72%,41% 73%,46% 74%,50% 72%,54% 70.5%,58% 72%,61% 76%,66% 78%,70% 82%,71% 88%,67% 92%,60% 95%,52% 96%,44% 95.5%,36% 94%,30% 92%,26% 88%,23.5% 84%' },
};
/* 붓글씨 이름 자리(%): 각 그림의 머리 위쪽 */
const MAP_LABELS = { cheongpung: { x: 19, y: 20 }, yeomhwa: { x: 88, y: 20 }, suryong: { x: 50, y: 79 }, home: { x: 51, y: 27 } };
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
    <div class="map-box"><img src="${ASSET.scene('map')}" alt="청풍문과 세 탐험지 지도" draggable="false">${spots}
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
