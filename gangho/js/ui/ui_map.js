/* [화면] 강호 지도: 강호행 탭을 열면(강호행 중이 아닐 때) 먼저 뜬다. 청풍문을 가운데로 세 탐험지가 펼쳐진 수묵 지도.
   지도에는 탐험지 이름과 지금 있는 곳만(자세한 건 다녀오며 알아 간다), 누르면 출발 준비(무장 · 무공 · 생혈고 · 단약 등) → [출발]하면 화면이 바뀌며 곧바로 강호행 */
const MAP_SPOTS = { cheongpung: { x: 25, y: 33 }, yeomhwa: { x: 76, y: 33 }, suryong: { x: 45, y: 74 } };   // 지도 그림 위 자리(%)
/* 사냥터: px · py = 손을 대면 황금 기둥이 솟는 밑동(%), poly = 누르는 자리(그림의 윤곽) */
const MAP_HIT = {
  cheongpung: { px: 27, py: 40, poly: '11% 30%,12% 25%,13.5% 19%,14.5% 18.5%,16% 20%,17.5% 15%,19% 12%,20.5% 13%,21.5% 16%,22.5% 15%,24% 9%,25.5% 6.5%,27% 7.5%,28.5% 11%,29.5% 15%,30.5% 16%,32% 12%,33.5% 13%,35% 16.5%,36.5% 14%,38% 14.5%,39.5% 18%,41.5% 21%,43.5% 24%,44% 27%,42% 30%,40% 33%,38% 37%,36.5% 41%,33% 44%,28% 45.5%,24% 46.5%,20% 45.5%,16% 44%,13% 40%,11% 35%' },
  yeomhwa: { px: 78, py: 40, poly: '65% 42%,65.5% 33%,66.3% 31%,67.5% 32%,69.5% 28%,70.6% 28%,71.5% 26%,72% 21.5%,73.2% 21%,74% 19.5%,75% 17.5%,75.5% 15.5%,76.2% 17%,78% 18.5%,79.5% 18.5%,80% 14%,80.6% 14.5%,81% 19%,82.3% 20%,83% 23.5%,84.5% 26%,86.3% 27%,87.5% 27%,88% 29%,89.2% 29%,89.7% 31%,90.5% 34%,91.5% 37%,92% 41%,91% 45%,88% 48%,84% 50%,78% 51%,72% 51%,68% 48.5%,66% 45.5%' },
  suryong: { px: 58, py: 86, poly: '24% 80%,27% 76%,31% 73%,36% 72%,41% 73%,46% 74%,50% 72%,54% 70.5%,58% 72%,61% 76%,66% 78%,70% 82%,71% 88%,67% 92%,60% 95%,52% 96%,44% 95.5%,36% 94%,30% 92%,26% 88%,23.5% 84%' },
};
/* 별가루: 기둥이 다 솟는 순간(임팩트) 기둥 가운데쯤에서 곁으로 튀어올랐다가 포물선으로 가까이 내려앉는다. 앞 14알은 임팩트와 함께, 나머지는 이어서 되풀이
   [옆으로(px), 튀어오르는 높이(px), 내려앉는 깊이(px), 기둥 안 높이(%), 지연(s), 한 번 도는 시간(s), 크기(px), 별 모양?] — 자리 고정 */
const MAP_DUST = [[25, 20, 32, 53.1, 0.75, 1.8, 6, 1], [-29, 28, 18, 62.3, 0.66, 1.5, 6, 0], [29, 18, 26, 62.9, 0.66, 1.4, 6, 0], [-20, 20, 25, 43.3, 0.72, 1.9, 6, 0], [22, 26, 19, 48.6, 0.68, 1.9, 8, 1], [-19, 26, 32, 65.7, 0.78, 1.5, 5, 0], [20, 34, 33, 46.0, 0.72, 2.0, 6, 0], [-10, 16, 19, 59.6, 0.67, 2.0, 7, 0], [18, 31, 28, 46.7, 0.66, 1.7, 6, 1], [-12, 31, 28, 56.7, 0.78, 1.7, 8, 0], [21, 25, 23, 52.6, 0.77, 1.5, 7, 0], [-8, 26, 30, 42.0, 0.68, 1.8, 6, 0], [20, 33, 25, 64.1, 0.7, 1.9, 8, 1], [-21, 29, 31, 46.0, 0.82, 1.7, 6, 0], [30, 19, 26, 64.7, 1.52, 1.6, 5, 0], [-6, 21, 36, 42.1, 2.01, 1.9, 6, 0], [14, 20, 40, 60.6, 1.91, 1.7, 6, 1], [-25, 19, 23, 61.1, 2.46, 1.6, 5, 0], [26, 31, 30, 51.2, 2.36, 1.9, 7, 0], [-23, 28, 33, 43.8, 2.09, 1.6, 6, 0], [25, 25, 19, 46.4, 1.66, 1.9, 8, 1], [-25, 24, 18, 48.8, 1.13, 1.6, 8, 0], [24, 15, 38, 61.7, 2.57, 1.7, 8, 0], [-30, 34, 19, 57.3, 1.76, 1.7, 6, 0], [22, 17, 30, 60.2, 2.07, 1.4, 8, 1], [-7, 27, 35, 63.9, 1.35, 1.8, 5, 0], [18, 22, 27, 45.1, 2.21, 1.6, 6, 0], [-21, 17, 37, 52.5, 2.12, 1.9, 8, 0]];
/* 붓글씨 이름 자리(%): 각 그림의 머리 위쪽 */
const MAP_LABELS = { cheongpung: { x: 19, y: 20 }, yeomhwa: { x: 88, y: 20 }, suryong: { x: 50, y: 79 }, home: { x: 51, y: 27 } };
function mapModal() {
  const spots = Object.entries(MAP_SPOTS).filter(([z]) => ZONES[z]).map(([zid, p]) => {
    const Z = ZONES[zid], open = zoneUnlocked(zid);   // 자세한 정보는 다녀오며 알아 간다 — 지도에는 붓글씨 이름만
    const L = MAP_LABELS[zid];
    const M = MAP_HIT[zid];
    return `<button class="map-spot ${open ? '' : 'locked'}" style="clip-path:polygon(${M.poly})" data-mapzone="${zid}" aria-label="${Z.name}" ${open ? '' : 'aria-disabled="true"'}></button>`
      + `<span class="map-pillar ${open ? '' : 'locked'}" style="left:${M.px}%;top:${M.py}%"><img src="${ASSET.fx('gold_pillar')}" alt="">`
      + `<i class="map-dust">${MAP_DUST.map(([x, up, fall, h, d, t, z, st]) => `<i class="${st ? 'st' : ''}" style="top:${h}%;--sx:${x}px;--up:${up}px;--fall:${fall}px;--z:${z}px;animation-delay:${d}s;animation-duration:${t}s"></i>`).join('')}</i>`
      + `<i class="map-flash"></i><i class="map-ring"></i></span>`
      + `<img class="map-word ${open ? '' : 'locked'}" style="left:${L.x}%;top:${L.y}%" src="${ASSET.ui('map_' + zid)}" alt="">`;
  }).join('');
  return `<div class="sheet map-sheet">
    <div class="map-head"><h2>강호 지도 <small>江湖地圖</small></h2><button class="btn ghost sm" data-act="closemodal">닫기</button></div>
    <div class="map-box"><img src="${ASSET.scene('map')}" alt="청풍문과 세 탐험지 지도" draggable="false">${spots}
      <img class="map-word home" style="left:${MAP_LABELS.home.x}%;top:${MAP_LABELS.home.y}%" src="${ASSET.ui('map_home')}" alt="청풍문"></div>
    <p class="muted map-hint">탐험지를 누르면 출발 준비가 나옵니다.</p>
  </div>`;
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
