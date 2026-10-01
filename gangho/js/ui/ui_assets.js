/* [화면] 그림 경로: data/assets.js 목록으로 ASSET.종류(이름) 경로를 만든다. 화면 코드는 그림 경로를 이것으로만 얻는다 */
const assetUrl = (kind, id) => { const k = ASSET_KIND[kind]; return `${ASSET_ROOT}${k.dir}${id}.${ASSET_EXT[`${kind}:${id}`] || k.ext}`; };
const ASSET = Object.fromEntries(Object.keys(ASSET_KIND).map(k => [k, id => assetUrl(k, id)]));
ASSET.foe = (e, atk) => assetUrl('foe', atk ? `${e}_atk` : e);
/* 화면별로 한 번에 미리 불러올 그림 묶음 */
const ASSET_SET = {
  battle: (zid, eid, w) => [ASSET.stage(zid), ASSET.hero(w), ASSET.foe(eid), ASSET.foe(eid, 1), ASSET.beast(eid), ASSET.portrait('hero')],
  live: (zid, w) => [ASSET.stage(zid), ASSET.hero(w), ASSET.walk(w), ASSET.travel(zid), ASSET.portrait('hero'), ASSET.fx('hit'), ASSET.fx('crit')],
};
