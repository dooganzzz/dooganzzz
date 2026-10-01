/* [화면] 그림·모션: 사냥터 수묵 풍경 · 요수 실루엣 · 무신상 · 장비 칸 아이콘 (모두 인라인 SVG)
   그림 파일이 있으면 그 위에 덮어 보여 주고, 없으면 SVG 그대로 (assets/README.md 참고).
   화면 전환·화로 불길·공양·향 시계 같은 한 번짜리 연출도 여기서 붙인다. 움직임 줄이기 설정을 존중한다 */

/* ───────── 그림 파일 자리: 파일이 있으면 SVG 위에 얹는다 ───────── */
const ART_SRC = {
  zone: id => `assets/art/zones/${id}.jpg`,
  beast: id => `assets/art/beasts/${id}.png`,
  shrine: () => 'assets/art/shrine.png',
  meditation: () => 'assets/art/meditation.png',
  shrineAwake: () => 'assets/art/shrine_awake.png',
  forgeScene: () => 'assets/art/forge_scene.jpg',
  cauldron: () => 'assets/art/alchemy_cauldron.png',
};
const brokenArt = new Set();
function artFail(im) { brokenArt.add(im.getAttribute('src')); im.remove(); }
/* 한 번 뜬 그림은 기억해 두고, 다시 그릴 때 곧바로 'loaded'로 내보낸다 (자리 그림 → 그림으로 깜빡이지 않게) */
const artLoaded = new Set();
function artLoad(im) { artLoaded.add(im.getAttribute('src')); if (im.parentNode) im.parentNode.classList.add('loaded'); }
function artPic(src, svg, cls = '') {
  const done = artLoaded.has(src);
  const img = brokenArt.has(src) ? '' : `<img src="${src}" alt="" ${done ? 'decoding="sync"' : 'loading="lazy"'} onload="artLoad(this)" onerror="artFail(this)">`;
  return `<span class="art-frame ${cls}${done ? ' loaded' : ''}" aria-hidden="true">${svg}${img}</span>`;
}

/* ───────── 사냥터 풍경 (400×140, 먹빛 수묵) ───────── */
const pines = (xs, y) => xs.map(x => `<path d="M${x} ${y}l5-13 5 13z M${x + 2} ${y - 8}l3-9 3 9z"/>`).join('');
const embers = n => Array.from({ length: n }, (_, i) => `<circle class="ember" cx="${30 + i * 47 % 360}" cy="${120 - i * 7 % 30}" r="${1 + i % 2}" style="animation-delay:${(i * 0.7) % 4}s"/>`).join('');
const ZONE_SCENE = {
  cheongpung: `<defs><linearGradient id="zs-cp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d2b2a"/><stop offset="1" stop-color="#0d1312"/></linearGradient></defs>
    <rect width="400" height="140" fill="url(#zs-cp)"/>
    <circle cx="318" cy="32" r="15" fill="#e8e2c8" opacity=".5"/>
    <path d="M0 92L40 58 70 78 112 34 150 70 190 48 232 80 272 42 312 70 352 50 400 74V140H0Z" fill="#2d3f3a" opacity=".75"/>
    <g class="mist"><rect x="-60" y="74" width="240" height="9" rx="4.5" fill="#d7e0d6" opacity=".09"/><rect x="200" y="86" width="260" height="8" rx="4" fill="#d7e0d6" opacity=".07"/></g>
    <path d="M0 110L52 82 92 100 142 68 200 104 250 80 300 102 352 76 400 96V140H0Z" fill="#1c2925"/>
    <g fill="#121b18">${pines([118, 132, 146, 250, 262, 330, 344], 104)}</g>
    <g class="mist m2"><rect x="40" y="104" width="220" height="7" rx="3.5" fill="#d7e0d6" opacity=".08"/></g>
    <path d="M0 126Q100 112 200 124T400 118V140H0Z" fill="#0e1513"/>`,
  yeomhwa: `<defs><linearGradient id="zs-yh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1210"/><stop offset=".7" stop-color="#3a1a10"/><stop offset="1" stop-color="#140807"/></linearGradient>
      <radialGradient id="zs-yhg" cx=".5" cy="1" r=".6"><stop offset="0" stop-color="#ff7a2e" stop-opacity=".45"/><stop offset="1" stop-color="#ff7a2e" stop-opacity="0"/></radialGradient></defs>
    <rect width="400" height="140" fill="url(#zs-yh)"/>
    <rect class="glow" width="400" height="140" fill="url(#zs-yhg)"/>
    <path d="M0 96L30 60 48 70 70 30 96 64 120 52 150 84 400 84V140H0Z" fill="#4a1d14" opacity=".85"/>
    <path d="M230 84V58h8l4-8 4 8h10l4-8 4 8h10l4-8 4 8h10l4-8 4 8h8V84Z" fill="#1d0c09"/>
    <path d="M292 50V26" stroke="#1d0c09" stroke-width="2"/><path class="flag" d="M292 26h16l-4 5 4 5h-16z" fill="#b8321f"/>
    <path d="M0 116L60 94 120 108 190 88 260 104 330 90 400 102V140H0Z" fill="#23100b"/>
    <g class="flames" fill="#ff8a3a" opacity=".55"><path d="M60 118q4-12 8-4q2-10 7 0q3-6 5 4z"/><path d="M300 116q4-14 9-4q2-9 6 1q3-5 4 3z"/></g>
    <g fill="#ffb15e">${embers(9)}</g>
    <path d="M0 130Q120 120 220 130T400 126V140H0Z" fill="#120706"/>`,
  suryong: `<defs><linearGradient id="zs-sr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101d2e"/><stop offset=".55" stop-color="#16293d"/><stop offset="1" stop-color="#0a1320"/></linearGradient></defs>
    <rect width="400" height="140" fill="url(#zs-sr)"/>
    <circle cx="90" cy="30" r="13" fill="#dfe8f0" opacity=".45"/>
    <path d="M0 76Q60 62 120 72T260 66 400 72V80H0Z" fill="#1f344a" opacity=".8"/>
    <rect y="78" width="400" height="62" fill="#0e1c2c"/>
    <g class="waves" stroke="#8fb6d8" stroke-width="1" opacity=".28" fill="none">
      <path d="M-20 92q20-4 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0"/><path d="M-10 108q20-4 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0"/><path d="M-30 124q20-4 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0"/></g>
    <rect x="84" y="82" width="12" height="2" fill="#dfe8f0" opacity=".25" class="glint"/>
    <g class="boat"><path d="M262 96h56l-8 8h-40z" fill="#081018"/><path d="M288 96V62l22 30z" fill="#152538"/><path d="M288 62v34" stroke="#081018" stroke-width="2"/></g>
    <g stroke="#1b2d24" stroke-width="2" stroke-linecap="round"><path d="M14 140q2-30 8-52"/><path d="M24 140q0-26-4-46"/><path d="M34 140q4-24 12-40"/><path d="M372 140q-2-24-8-40"/><path d="M384 140q2-30-2-50"/></g>`,
};
function zoneArt(zid) {
  const svg = `<svg class="scene scene-${zid}" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid slice">${ZONE_SCENE[zid] || ''}</svg>`;
  return artPic(ART_SRC.zone(zid), svg, 'zone-art');
}

/* ───────── 요수 실루엣 (64×64). 몸빛은 오행, 사람은 병기를 든다 ───────── */
const INK = '#0d0f12';
const eye = (x, y, r = 1.4, c = INK) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const leg = (x, y, h = 9) => `<rect x="${x}" y="${y}" width="3.2" height="${h}" rx="1.6"/>`;
const line = (d, w = 3, c = 'currentColor') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const BEAST_SHAPE = {
  cat: `<ellipse cx="30" cy="40" rx="16" ry="8.5"/><circle cx="46" cy="30" r="8"/><path d="M40 25l2-8 5 6zM47 23l5-6 1 8z"/>${line('M14 38q-9-4-6-15')}${leg(19, 44)}${leg(36, 44)}${eye(49, 29)}`,
  tiger: `<ellipse cx="29" cy="39" rx="19" ry="10"/><circle cx="48" cy="29" r="9"/><path d="M41 23l2-8 5 6zM49 21l5-6 1 8z"/>${line('M10 36q-8-6-4-17', 3.5)}${leg(16, 44, 11)}${leg(36, 44, 11)}${line('M22 31l3 9M29 30l2 11M36 31l2 9', 2, INK)}${eye(51, 28, 1.6, '#ffd27a')}`,
  boar: `<path d="M8 42q2-17 23-17q15 0 21 8l6 2q2 4-2 6h-6q-4 9-19 9q-19 0-23-8z"/>${line('M16 27l3-5 2 5 3-6 2 6 3-5 2 5', 2)}${line('M52 41q5-2 5-8', 2, '#ecebe6')}${leg(15, 46)}${leg(40, 46)}${eye(48, 33)}`,
  snake: `${line('M8 52q10-14 20-3t20-5q8-3 8-14', 6.5)}<ellipse cx="56" cy="28" rx="5.5" ry="4.2"/>${line('M61 26l3-2M61 26l3 1', 1.2, '#d25a44')}${eye(57, 27, 1.1)}`,
  rabbit: `<ellipse cx="29" cy="44" rx="13" ry="10"/><circle cx="42" cy="33" r="7"/><ellipse cx="39" cy="19" rx="2.7" ry="9" transform="rotate(-12 39 19)"/><ellipse cx="46" cy="20" rx="2.7" ry="9" transform="rotate(14 46 20)"/><circle cx="16" cy="42" r="3.6"/>${eye(45, 32)}`,
  turtle: `<path d="M11 45q0-21 23-21t23 21z"/>${line('M22 34h24M34 25v20M17 41h34', 1.6, INK)}<circle cx="59" cy="42" r="4.6"/><rect x="15" y="43" width="7" height="7" rx="2.5"/><rect x="42" y="43" width="7" height="7" rx="2.5"/>${eye(60, 41, 1)}`,
  tree: `<path d="M32 7q14 0 16 12q8 4 4 12q-4 6-12 4H24q-8 2-12-4q-4-8 4-12q2-12 16-12z" opacity=".85"/><path d="M26 58q2-16 0-25h12q-2 9 0 25z"/>${line('M26 41q-8-2-13 5M38 41q8-2 13 5', 3)}${eye(29, 43, 1.8)}${eye(35, 43, 1.8)}${line('M29 50q3 2 6 0', 1.2, INK)}`,
  wolf: `<path d="M16 52q-2-14 12-18l3-11 4 8 3-8 2 11q5 2 9 7l9 2-2 4h-8q-4 6-12 6q2 7-4 9z"/>${line('M16 50q-9 1-9-9', 3.5)}${leg(22, 50, 8)}${leg(34, 50, 8)}${eye(41, 33, 1.3, '#ffd27a')}`,
  bird: `<path d="M32 31q-10-13-29-10q12 4 16 12q-10 0-14 6q12-2 20 0l7 7 7-7q8-2 20 0q-4-6-14-6q4-8 16-12q-19-3-29 10z"/><circle cx="32" cy="28" r="4.2"/><path d="M32 30l3 4-3 1z" fill="#f0cf82"/>${eye(33, 27, .9)}`,
  golem: `<path d="M17 27l10-9h10l9 9v12l-6 8H23l-6-8z"/><path d="M8 31l9-3 2 15-9 4zM56 31l-9-3-2 15 9 4z"/><rect x="21" y="46" width="8" height="12" rx="2"/><rect x="35" y="46" width="8" height="12" rx="2"/>${line('M27 22l4 6-3 5M40 36l-5 4', 1.2, INK)}${eye(28, 31, 2.1, '#ffd27a')}${eye(37, 31, 2.1, '#ffd27a')}`,
  fish: `<path d="M8 32q17-17 37-4l13-8-2 12 2 12-13-8q-21 13-37-4z"/><path d="M26 22q6-6 12 0z"/>${eye(17, 30, 1.6)}${line('M24 26q3 6 0 12', 1.2, INK)}`,
  croc: `<path d="M3 38q10-7 23-7h18q11 0 18 4l-2 3q-7-1-13 0H23q-12 2-20 1z"/>${line('M15 31l3-4 3 4 3-4 3 4 3-4 3 4 3-4 3 4', 1.6)}${line('M4 38l3 2 3-2 3 2 3-2', 1, '#ecebe6')}${leg(24, 38, 7)}${leg(40, 38, 7)}${eye(12, 34, 1.2, '#ffd27a')}`,
  centipede: `${[[10, 44], [17, 38], [25, 34], [33, 33], [41, 35], [48, 40], [54, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.6"/>${line(`M${x} ${y}l-3 8M${x} ${y}l3 8`, 1.3)}`).join('')}${line('M8 42l-5-6M8 42l-6-1', 1.3)}${eye(9, 42, 1)}`,
  spirit: `<path d="M32 5q15 16 13 31q-2 16-13 21q-11-5-13-21q-2-15 13-31z" opacity=".85"/>${line('M32 14v34M22 31h20M25 22l14 18M39 22L25 40', 1, '#dff4ff')}${eye(28, 30, 1.8, '#dff4ff')}${eye(36, 30, 1.8, '#dff4ff')}`,
};
/* 사람(도적·병사·두목): 머리·도포 위에 병기 */
const HUMAN_BODY = `<circle cx="28" cy="15" r="6.5"/><path d="M17 58l4-31q7-5 14 0l4 31z"/>${line('M21 32l-6 12M35 32l7 8', 3.2)}<rect x="22" y="12" width="12" height="2.4" fill="${INK}" opacity=".45"/>`;
const HUMAN_WEAPON = {
  blade: `<path d="M41 42q14-10 16-31q-3 15-18 28z" fill="#cfd5dd"/>${line('M39 43l4-2', 3, '#8a6a3a')}`,
  sword: `${line('M42 42L56 11', 2.2, '#cfd5dd')}${line('M39 38l7 4', 2.2, '#8a6a3a')}`,
  spear: `${line('M45 61L51 7', 2, '#8a6a3a')}<path d="M51 3l3 7h-6z" fill="#cfd5dd"/><path d="M50 12l-3 4" stroke="#b8321f" stroke-width="2"/>`,
  hidden: `<path d="M48 18l3 3-3 3-3-3zM56 27l3 3-3 3-3-3zM51 37l2.5 2.5-2.5 2.5-2.5-2.5z" fill="#cfd5dd"/>${line('M43 40l4-2', 2, '#cfd5dd')}`,
  fist: `<circle cx="14" cy="45" r="4.2" fill="#cfd5dd"/><circle cx="43" cy="41" r="4.2" fill="#cfd5dd"/>`,
};
const BOSS_CROWN = `<path d="M21 9l3-6 4 4 4-4 3 6z" fill="#f0cf82"/><path d="M17 30q-6 14-4 28h6z" opacity=".6"/>`;
const BEAST_KIND = {
  wildcat: 'cat', boar: 'boar', viper: 'snake', rabbit: 'rabbit', turtle: 'turtle', treant: 'tree', redTiger: 'tiger',
  fireViper: 'snake', redWolf: 'wolf', eagle: 'bird', magmaGolem: 'golem', scaleFish: 'fish', crocodile: 'croc', centipede: 'centipede', iceSpirit: 'spirit',
};
function beastSvg(eid) {
  const E = ENEMIES[eid]; if (!E) return '';
  const kind = BEAST_KIND[eid];
  const body = kind ? BEAST_SHAPE[kind] : HUMAN_BODY + (HUMAN_WEAPON[E.wtype] || '') + (E.boss ? BOSS_CROWN : '');
  return `<svg class="beast-ico el-${E.elem || 'none'} ${E.boss ? 'boss' : ''}" viewBox="0 0 64 64" role="img" aria-label="${E.name}"><circle class="beast-disc" cx="32" cy="32" r="31"/><g fill="currentColor">${body}</g></svg>`;
}
const beastArt = (eid, cls = '') => artPic(ART_SRC.beast(eid), beastSvg(eid), 'beast-art ' + cls);

/* ───────── 무신상 (나): 이끼 낀 석상 · 향로와 향연기. 공양하면 눈이 빛난다. awake: 각성 때 눈을 뜬 모습 ───────── */
function shrineArt(awake = false) {
  const svg = `<svg class="statue" viewBox="0 0 200 230">
    <defs><radialGradient id="st-halo" cx=".5" cy=".4" r=".5"><stop offset="0" stop-color="#f0cf82" stop-opacity=".35"/><stop offset="1" stop-color="#f0cf82" stop-opacity="0"/></radialGradient></defs>
    <circle class="halo" cx="100" cy="92" r="80" fill="url(#st-halo)"/>
    <g class="stone" fill="#5b5a55">
      <rect x="44" y="176" width="112" height="22" rx="3" fill="#44433f"/><rect x="36" y="196" width="128" height="14" rx="3" fill="#3a3935"/>
      <path d="M58 176q-2-40 16-58q10-8 26-8t26 8q18 18 16 58z"/>
      <g transform="translate(0 16)"><circle cx="100" cy="72" r="24"/><path d="M84 52q16-14 32 0l-4-12q-12-6-24 0z" fill="#4c4b46"/></g>
      <path d="M70 148q30 14 60 0l-6 20q-24 8-48 0z" fill="#4c4b46"/>
      <path d="M78 128q22-10 44 0" stroke="#3e3d39" stroke-width="3" fill="none"/>
    </g>
    <g class="eyes" transform="translate(0 16)"><path d="M89 72h8M103 72h8" stroke="#2b2a27" stroke-width="3" stroke-linecap="round"/></g>
    <g fill="#4f6b3f" opacity=".75"><path d="M60 170q8-10 18-4q-6 8-18 4z"/><path d="M120 110q10-4 14 4q-8 4-14-4z"/><path d="M84 66q6-6 12-2q-6 5-12 2z"/><path d="M140 186q8-6 14 0q-7 5-14 0z"/></g>
    <path d="M112 90l-6 12 4 8-3 10M70 140l8 6-2 9" stroke="#2e2d2a" stroke-width="1.5" fill="none"/>
    <g class="burner"><path d="M84 210h32l-4 12H88z" fill="#6b4a2a"/><rect x="82" y="206" width="36" height="5" rx="2" fill="#8a6a3a"/>
      <path d="M94 206v-16M100 206v-20M106 206v-16" stroke="#8a4a2a" stroke-width="1.6"/><circle cx="94" cy="190" r="1.4" fill="#ff8a3a"/><circle cx="100" cy="186" r="1.4" fill="#ff8a3a"/><circle cx="106" cy="190" r="1.4" fill="#ff8a3a"/></g>
    <g class="smoke" stroke="#c9ccd2" stroke-width="1.4" fill="none" opacity=".45"><path d="M94 188q-6-10 0-20t0-20"/><path d="M100 184q6-10 0-20t0-20"/><path d="M106 188q-6-10 0-20t0-20"/></g>
  </svg>`;
  return artPic(awake ? ART_SRC.shrineAwake() : ART_SRC.shrine(), svg, 'shrine-art' + (awake ? ' awake' : ''));
}

/* ───────── 장비 칸 아이콘 (24×24 선화). 무기는 병기 종류를 따른다 ───────── */
const SLOT_ICON = {
  helmet: 'M5 15a7 7 0 0 1 14 0v3H5zM12 5v3M9 18v2M15 18v2',
  armor: 'M7 4l5 2 5-2 3 4-2 3v9H6v-9L4 8zM12 6v14',
  jade: 'M4 10h16v4H4zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
  boots: 'M8 3v11l-4 3v3h13l3-3-5-2V3z',
  belt: 'M3 10h18v4H3zM10 9h4v6h-4z',
  ring: 'M12 9a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM10 9l2-5 2 5',
  badge: 'M7 3h10v18l-5-3-5 3zM10 8h4M10 11h4',
  mount: 'M6 20l2-8-3-4 4-4 5 2 5 6-2 2-4-2-1 8M9 7l1-3',
  ring2: 'M12 9a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM10 9l2-5 2 5',
  'w-blade': 'M5 19c8-3 12-9 14-16-4 5-9 9-13 11zM4 20l3-3',
  'w-sword': 'M19 3L7 15M5 13l6 6M4 20l3-3',
  'w-spear': 'M4 20L18 6M18 6l2-4-4 2zM14 7l3 3',
  'w-hidden': 'M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z',
  'w-fist': 'M6 11V7a2 2 0 0 1 4 0v4M10 10V6a2 2 0 0 1 4 0v4M14 10V7a2 2 0 0 1 4 0v6c0 4-3 7-7 7s-5-3-5-6v-3',
};
function slotIcon(slot) {
  if (S.equip[slot]) return gearIco(S.equip[slot], 'slot-ico');
  const w = slot === 'weapon' && S.equip.weapon ? 'w-' + (S.equip.weapon.wtype || 'sword') : null;
  const d = SLOT_ICON[w] || SLOT_ICON[slot] || SLOT_ICON['w-sword'];
  return `<svg class="slot-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

/* ───────── 아이템 그림 (assets/art/items): 수묵담채 · 투명 배경. 파일이 없으면 이모지로 ─────────
   장비는 부위(무기는 병기 종류)마다 한 장. 비급은 등급별 표지 위에 분류 문양을 얹는다
   (무공은 병기 문양 · 심법 · 경공 두 발 · 기공 가부좌와 보호막) */
const ITEM_ART = id => `assets/art/items/${id}.png`;
const BOOK_COVER = { '삼류': 'book_g3', '이류': 'book_g2', '일류': 'book_g1' };
function icoFail(im) { brokenArt.add(im.getAttribute('src')); const s = im.closest('.item-ico'); if (s) { s.classList.add('fb'); s.textContent = s.dataset.fb || ''; } }
const icoImg = (src, cls = '') => `<img class="${cls}" src="${src}" alt="" loading="lazy" onerror="icoFail(this)">`;
function icoWrap(srcs, fb, cls) {
  if (srcs.some(x => brokenArt.has(x[0]))) return `<span class="item-ico fb ${cls}" aria-hidden="true">${fb}</span>`;
  return `<span class="item-ico ${cls}" data-fb="${esc(fb)}" aria-hidden="true">${srcs.map(([src, c]) => icoImg(src, c)).join('')}</span>`;
}
function manualIco(mid, cls = '') {
  const M = MANUALS[mid]; if (!M) return '📘';
  const emb = M.cat === 'mugong' ? (M.weapon || 'fist') : M.cat;
  const cover = BOOK_COVER[M.grade] || 'book_g3';
  return icoWrap([[ITEM_ART(cover), 'cover'], [ITEM_ART('emb_' + emb), 'emb']], '📘', `book ${cover.slice(5)} ${cls}`);
}
function itemIco(id, cls = '') {
  const I = ITEMS[id]; if (!I) return '';
  if (I.use && I.use.learn) return manualIco(I.use.learn, cls);
  return icoWrap([[ITEM_ART(id)]], I.icon, cls);
}
const gearArtId = g => g.slot === 'weapon' ? 'w_' + (g.wtype || 'sword') : 's_' + (g.slot === 'ring2' ? 'ring' : g.slot);
/* 장비 그림 둘레에 등급 빛 (하급은 빛 없음 · 중급 초록 … 극품 빨강) */
const gearIco = (g, cls = '', r = g.rarity || 0) => icoWrap([[ITEM_ART(gearArtId(g))]], '', `gear-ico gr${r} ${cls}`);

/* ───────── 운기조식: 가부좌를 틀고 단전에 기운을 모으는 무림인 (상태 › 무공 가운데) ───────── */
function meditationArt() {
  return artPic(ART_SRC.meditation(), meditationSvg(), 'meditation-art');
}
function meditationSvg() {
  return `<svg class="meditation-svg" viewBox="0 0 80 80" role="img" aria-label="가부좌 운기조식">
    <g fill="#d8c59a" opacity=".9">
      <circle cx="40" cy="17" r="7"/><path d="M36 11q4-6 8 0l-1-4q-3-2-6 0z" opacity=".8"/>
      <path d="M31 27q9-5 18 0l3 20q-12 5-24 0z"/>
      <path d="M31 30q-7 8-8 17q4 3 10 1l1-5q-4-1-3-4zM49 30q7 8 8 17q-4 3-10 1l-1-5q4-1 3-4z"/>
      <path d="M16 58q4-10 24-10t24 10q-8 7-24 7t-24-7z"/>
    </g>
    <circle class="dantian" cx="40" cy="44" r="3.2" fill="#f0cf82"/>
    <g class="qi-flow" fill="none" stroke="#f0cf82" stroke-width="1" opacity=".7"><path d="M40 44q-14-10-6-26"/><path d="M40 44q14-10 6-26"/></g>
  </svg>`;
}

/* ───────── 움직임 줄이기: 기기 설정 또는 게임 설정(바닥글) ───────── */
const calmOn = () => !!(S && S.settings && S.settings.calm);
function reduceMotion() { return calmOn() || matchMedia('(prefers-reduced-motion: reduce)').matches; }
function toggleCalm() {
  S.settings = { ...(S.settings || {}), calm: !calmOn() };
  toast(calmOn() ? '움직임을 줄였습니다.' : '움직임을 다시 켰습니다.');
  render();
}

/* ───────── 한 번짜리 연출: 화면 전환 · 화로 결과 · 공양 ───────── */
Bus.on('view', patch => {
  if (patch.craftResult) ui.fxOnce = patch.craftResult.ok ? 'craft-ok' : 'craft-fail';
  if (patch.gachaResult) ui.fxOnce = 'gacha';
});
let lastScreen = null;
const replay = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
function artAfterRender() {
  document.documentElement.classList.toggle('calm', calmOn());
  const cb = $('[data-act="calm"]'); if (cb) cb.textContent = `움직임 줄이기: ${calmOn() ? '켬' : '끔'}`;
  const scr = screen(), main = $('#main');
  if (scr !== lastScreen) { lastScreen = scr; if (main) main.scrollTop = 0; }   // 화면 전환은 번짐 연출 없이 곧바로 (서서히 나타나기는 게임 시작 때 한 번뿐)
  const fx = ui.fxOnce; ui.fxOnce = null;
  if (!fx || reduceMotion()) return;
  if (fx === 'craft-ok' || fx === 'craft-fail') { replay($('.furnace .pot'), fx === 'craft-ok' ? 'burst-ok' : 'burst-fail'); craftFx(fx === 'craft-ok'); }
  if (fx === 'gacha') replay($('.altar'), 'blessing');
}
/* 시작 연출(app-reveal)은 본문이 다 나타나면 떼어 낸다: 다시 그려도 되풀이되지 않게 */
document.addEventListener('animationend', e => { if (e.animationName === 'inkReveal' && e.target.classList && e.target.classList.contains('main')) { const app = e.target.closest('.app'); if (app) app.classList.remove('app-reveal'); } });

/* 화로 결과 연출: 단조 성공은 모루에서 불똥이 사방으로 튀고, 연단 성공은 단로 뚜껑에서 금빛 김이 솟는다.
   실패는 검은 연기가 피어오르고 무대가 흔들린다 (2.6초 뒤 걷힘) */
function craftFx(ok) {
  const stage = $('.furnace-stage'); if (!stage) return;
  const forge = stage.classList.contains('forge');
  const n = ok ? (forge ? 28 : 16) : 9, rnd = (a, b) => a + Math.random() * (b - a);
  const bits = Array.from({ length: n }, () => forge && ok
    ? `<i style="--a:${rnd(-170, -10).toFixed(0)}deg;--d:${rnd(60, 190).toFixed(0)}px;--t:${rnd(.6, 1.2).toFixed(2)}s;--dl:${rnd(0, .25).toFixed(2)}s"></i>`
    : `<i style="--dx:${rnd(-60, 60).toFixed(0)}px;--h:${rnd(90, 190).toFixed(0)}px;--t:${rnd(1.2, 2.1).toFixed(2)}s;--dl:${rnd(0, .5).toFixed(2)}s;--s:${rnd(.7, 1.5).toFixed(2)}"></i>`).join('');
  const fx = document.createElement('div');
  fx.className = `craft-fx ${forge ? 'forge' : 'alchemy'} ${ok ? 'ok' : 'fail'}`;
  fx.setAttribute('aria-hidden', 'true');
  fx.innerHTML = `<b class="fx-flash"></b>${bits}`;
  stage.appendChild(fx);
  if (!ok) replay(stage, 'fx-shake');
  setTimeout(() => fx.remove(), 2600);
}

/* 화로 불길: 단조는 주황 쇠불, 연단은 푸른 단화(丹火) */
function furnaceFire(craft) {
  return `<div class="furnace-fire ${craft}" aria-hidden="true"><svg viewBox="0 0 120 60" preserveAspectRatio="xMidYMax meet">
    <path class="fl f1" d="M40 60q-6-18 8-30q-2 12 6 16q2-14 12-24q-2 16 8 22q4-8 2-16q12 12 6 32z"/>
    <path class="fl f2" d="M50 60q-2-12 6-18q0 8 5 10q2-8 8-12q0 10 4 12q4-6 3-10q6 8 2 18z"/>
    <path d="M26 58h68l-6 2H32z" fill="#2a1e14"/></svg>${Array.from({ length: 6 }, (_, i) => `<i style="left:${34 + i * 6}%;animation-delay:${i * 0.45}s"></i>`).join('')}</div>`;
}

