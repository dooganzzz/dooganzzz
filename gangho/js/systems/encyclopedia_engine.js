/* [시스템] 지역 도감: 사냥터의 요수 10종(두목 포함)을 모두 만나면 영구 보상 (DOM 조작 금지) */

/* 요수가 사는 사냥터 (기연 전용 요수는 없음) */
function zoneOfEnemy(eid) { return ZONE_ORDER.find(z => ZONES[z].enemies.includes(eid) || ZONES[z].boss === eid) || null; }
const areaMonsters = zid => [...ZONES[zid].enemies, ZONES[zid].boss];
function areaDiscovered(zid) { const bs = S.bestiary || {}; return areaMonsters(zid).filter(e => bs[e]).length; }
const areaComplete = zid => areaDiscovered(zid) >= areaMonsters(zid).length;

/* 처음 만난 요수가 생길 때마다 부른다. 아직 보상을 받지 않았고 10종을 다 채웠으면 한 번 지급 */
function checkAreaEncyclopediaCompletion(zid) {
  if (!zid || !CODEX_REWARDS[zid]) return false;
  S.codexRewards = S.codexRewards || {};
  if (S.codexRewards[zid] || !areaComplete(zid)) return false;
  S.codexRewards[zid] = true;
  const R = CODEX_REWARDS[zid];
  log(`📖 [도감 완성] ${ZONES[zid].name}의 모든 요수를 파악했습니다! ${R.flavor}. 영구 능력치가 오릅니다 — ${R.text}`, 'gold');
  notify.banner('圖鑑完成 · 도감 완성', ZONES[zid].name, 'seal');
  clampVitals();
  notify.refresh();                                           // 전투력·능력치는 새로 계산된다
  return true;
}
