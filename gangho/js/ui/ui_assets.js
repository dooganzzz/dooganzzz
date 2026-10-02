/* [화면] 그림 경로: data/assets.js 목록으로 ASSET.종류(이름) 경로를 만든다. 화면 코드는 그림 경로를 이것으로만 얻는다 */
const assetUrl = (kind, id) => { const k = ASSET_KIND[kind]; return `${ASSET_ROOT}${k.dir}${id}.${ASSET_EXT[`${kind}:${id}`] || k.ext}`; };
const ASSET = Object.fromEntries(Object.keys(ASSET_KIND).map(k => [k, id => assetUrl(k, id)]));
ASSET.foe = (e, atk) => assetUrl('foe', atk ? `${e}_atk` : e);
/* 타격 그림: 평타(hit · crit)는 공용 폴더, 그 밖(회피 등)은 fx */
ASSET.vfx = name => name === 'hit' || name === 'crit' ? assetUrl('common', 'strike_' + name) : assetUrl('fx', name);
/* 무공 고유 그림: 그 무공(mid)의 폴더에 있는 것만. 없으면 null (공용 그림으로 대신하는 것은 부르는 쪽이 정한다) */
ASSET.ink = mid => MANUAL_INK.includes(mid);   // 먹빛 그림의 무공인가 (초식 컷 · 오의 막에 .ink)
ASSET.manual = (mid, name) => MANUAL_ART[mid] && MANUAL_ART[mid].includes(name) ? `${ASSET_ROOT}manual/${mid}/${name}.webp` : null;
/* 화면별로 한 번에 미리 불러올 그림 묶음 */
const ASSET_SET = {
  battle: (zid, eid, w) => [ASSET.stage(zid), ASSET.hero(w), ASSET.foe(eid), ASSET.foe(eid, 1), ASSET.beast(eid), ASSET.portrait('hero')],
  live: (zid, w) => [ASSET.stage(zid), ASSET.hero(w), ASSET.run(w), ASSET.walk(w), ASSET.travel(zid), ASSET.ground(zid), ASSET.portrait('hero'), ASSET.vfx('hit'), ASSET.vfx('crit')],
};
