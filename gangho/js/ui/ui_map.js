/* [화면] 강호 지도: 강호행 탭을 열면(강호행 중이 아닐 때) 먼저 뜬다. 청풍문을 가운데로 세 탐험지가 펼쳐진 수묵 지도.
   탐험지에 손을 대면 대략적인 정보, 누르면 출발 준비(무장 · 무공 · 생혈고 · 단약 등) → [출발]하면 화면이 바뀌며 곧바로 강호행 */
const MAP_SPOTS = { cheongpung: { x: 24, y: 30 }, yeomhwa: { x: 76, y: 30 }, suryong: { x: 45, y: 78 } };   // 지도 그림 위 자리(%)
const MAP_HOME = { x: 50, y: 37 };
function mapModal() {
  const spots = Object.entries(MAP_SPOTS).filter(([z]) => ZONES[z]).map(([zid, p]) => {
    const Z = ZONES[zid], open = zoneUnlocked(zid), zl = (S.zoneLog || {})[zid];
    const tip = `<b>${Z.name}</b> <small>${Z.grade || ''}</small><br>권장 전투력 ${fmt(Z.cp[0])}~${fmt(Z.cp[1])} · 지형 ${zoneTerrainText(zid)}<br>${open ? `돌파 ${stageCleared(zid)} / ${STAGE.count}단계${zl ? ` · 다녀옴 ${zl.trips}번` : ''}` : '🔒 앞 구역 두목을 쓰러뜨리면 열림'}`;
    return `<button class="map-spot ${open ? '' : 'locked'} ${S.expedition.zone === zid ? 'here' : ''} ${p.x < 35 ? 'tip-l' : p.x > 65 ? 'tip-r' : ''}" style="left:${p.x}%;top:${p.y}%" data-mapzone="${zid}" ${open ? '' : 'aria-disabled="true"'}><span class="map-name">${Z.name}</span><span class="map-tip">${tip}</span></button>`;
  }).join('');
  return `<div class="sheet map-sheet">
    <div class="map-head"><h2>강호 지도 <small>江湖地圖</small></h2><button class="btn ghost sm" data-act="closemodal">닫기</button></div>
    <div class="map-box"><img src="${ASSET.scene('map')}" alt="청풍문과 세 탐험지 지도" draggable="false">${spots}
      <span class="map-home" style="left:${MAP_HOME.x}%;top:${MAP_HOME.y}%">청풍문</span></div>
    <p class="muted map-hint">탐험지에 손을 대면 대략적인 정보가, 누르면 출발 준비가 나옵니다.</p>
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
