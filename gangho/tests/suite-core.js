/* 핵심 규칙: 탭, 성장, 강호행, 전투, 무장, 도감, 견문록, 테마 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
  console.log(`\n=== ${w}px ===`);
  const p = await newPage(b, w, h);
  const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && !/ERR_CERT|ERR_FILE_NOT_FOUND/.test(m.text()) && errs.push(m.text()));
  await p.goto(GAME_URL);
  await startEquipped(p);
  // 1
  const tabs = await p.$$eval('.tab .ko', els => els.map(e => e.textContent).join(','));
  ok('1 탭 순서', tabs === '청풍문,상태,행낭,강호행,견문록,도감', tabs);
  ok('1 첫 화면=청풍문 › 정청', await p.$eval('.tab.on .ko', e => e.textContent) === '청풍문' && await p.$eval('.subtab.on .ko', e => e.textContent) === '정청');
  // 2 성장: 연무장·비급별 수련치 없음, 경험치로 성급 올리기
  const t = await p.evaluate(() => {
    const r = {}, id = S.active.simbeop, m = S.manuals[id];
    r.noTrainFields = !('txp' in m) && !('cxp' in m) && !('activeTrainingSkillId' in S) && typeof toggleTraining === 'undefined';
    r.noYeonmu = !SECT_SUBS.some(([k]) => k === 'yeonmu');
    r.cost = starCost(id); r.block = starUpBlock(id);
    S.exp = r.cost; r.up = starUp(id); r.star = m.star; r.left = S.exp;
    return r;
  });
  ok('2 연무장·수련치 제거', t.noTrainFields && t.noYeonmu);
  ok('2 경험치 부족하면 막힘 → 채우면 성급 +1, 경험치 차감', /경험치 60 필요/.test(t.block) && t.up && t.star === 2 && t.left === 0, JSON.stringify(t));
  // 3 강호행: 지도 없음, 탐험지 선택
  await p.click('[data-tab="field"]');
  const zones = await p.$$eval('.zone h3', els => els.map(e => e.textContent).join(' | '));
  ok('3 성급 표기 없음', !/성/.test(zones.replace(/평정/g, '')), zones);
  ok('3 지도 없음 · 구역 3곳(잠김 2)', !(await p.$('.map, .cell, .dpad')) && (await p.$$('.zone')).length === 3 && (await p.$$('.zone.locked')).length === 2);
  // 4 전투 (fight: 한 판을 끝까지 계산해 기록)
  const bt = await p.evaluate(() => {
    const r = {}; S.hp = 99999;
    const b = fightSync('boar');
    r.sense = SENSE_TEXT.some(([, t]) => b.intro.some(l => l.text.includes(t)));
    r.noStats = !b.intro.some(l => /활력 \d|공격 \d|방어 \d/.test(l.text));
    r.rounds = b.rounds.length > 0 && b.rounds.every(x => Array.isArray(x.lines) && typeof x.foe === 'number');
    let counter = false;
    for (let i = 0; i < 15 && !counter; i++) { S.hp = 99999; counter = fightSync('boar').rounds.some(x => x.lines.some(l => l.text.includes('반격(反擊)'))); }
    r.counter = counter; S.hp = calcStats().maxHp;
    return r;
  });
  ok('4 적 수치 비노출', bt.noStats); ok('4 육감 지문', bt.sense);
  ok('4 합마다 기록 (리플레이용)', bt.rounds);
  ok('4 반격 발생 (반격 스탯)', bt.counter);
  // 5
  await p.click('[data-tab="status"]'); await p.click('[data-sub="gear"]');
  const bag = await p.evaluate(() => ({ cap: bagCap(), top: [...document.querySelectorAll('.paperdoll .dslot small')].map(e=>e.textContent).join(','), bottom: [...document.querySelectorAll('.acc-row .dslot small')].map(e=>e.textContent).join(','), img: !!document.querySelector('.martial-artist-img'), head: document.querySelector('.panel-head .ko').textContent }));
  ok('5 무장 명칭', bag.head === '무장'); ok('5 행낭 100칸', bag.cap === 100);
  ok('5 상단 슬롯', bag.top === '투구,무기,옥패,호갑', bag.top); ok('5 하단 가로 5슬롯', bag.bottom === '신발,요대,가락지,신분패,탈것', bag.bottom); ok('5 실루엣 이미지', bag.img);
  // 7 + 6
  await p.evaluate(() => { S.silver = 100; render(); });
  await p.click('[data-tab="sect"]'); await p.click('[data-sub="yard"]');
  ok('7 아린 힌트 버튼 제거됨', !(await p.$('[data-act="hint"]')));
  await p.evaluate(() => { S.inv.herb = 2; ui.tab = 'sect'; ui.sectSub = 'forge'; ui.craft = 'alchemy'; S.crafts.alchemy.lv = 99; for (let i = 0; i < 20 && !S.codex.includes('a_hp'); i++) { S.inv.herb = 2; ui.pot = { herb: 2 }; doCraft(ui.craft, ui.pot); } });   // 성공률 상한 98%라 한 번에 실패할 수 있음
  await p.click('[data-tab="codex"]');
  ok('6 안내문 없음', !(await p.$('.codex ~ .lede, .panel .lede')) && !(await p.content()).includes('아직 아무것도 모릅니다'));
  await p.click('.ctile.locked'); const toast = await p.$$eval('.toast', e => e[e.length - 1].textContent);
  ok('6 미해금 토스트', toast.includes('아직 발견하지 못한 비전'), toast);
  await p.click('.ctile.known');
  const modalBtn = await p.$eval('.sheet [data-fill]', e => e.textContent.trim());
  ok('6 조합법 모달 + 화로로 가기', modalBtn === '[ 화로로 가기 ]' && !!(await p.$('.mats-list li')), modalBtn);
  await p.click('.sheet [data-fill]');
  ok('6 화로 이동·재료 투입', await p.evaluate(() => ui.tab === 'sect' && ui.sectSub === 'forge' && potTotal(ui.pot) > 0));
  ok('9 성공률 % 비노출', !(await p.$eval('#main', e => /\d+%/.test(e.textContent))));
  ok('9 화로 10칸', (await p.$$('.pot-slots .slot')).length === 10);
  // 7 portraits + quest
  await p.click('[data-tab="sect"]'); await p.click('[data-sub="hall"]');
  ok('7 초상화 컨테이너', (await p.$$('.npc-portrait')).length === 2);
  ok('7 퀘스트 1개만', (await p.$$('.quest > b')).length === 1);
  // 8
  await p.evaluate(() => { give('herb', 2); S.silver += 5; log(`${hlSilver(5)} 획득`, 'loot'); log(`${hlContrib('+10')}`, 'good'); });
  const logc = await p.evaluate(() => { const i = document.querySelector('.log .hl-item'), s = document.querySelector('.log .hl-silver'), c = document.querySelector('.log .hl-contrib'); const cs = el => el && getComputedStyle(el).color; return [cs(i), cs(s), cs(c)].join(' | '); });
  ok('8 획득 하이라이트 색', logc === 'rgb(251, 191, 36) | rgb(253, 224, 71) | rgb(52, 211, 153)', logc);
  await p.waitForTimeout(200);
  const hs = await p.evaluate(() => ({ main: document.querySelector('#main').offsetHeight, side: document.querySelector('.side').offsetHeight, logScroll: document.querySelector('#log').scrollTop === 0, ov: getComputedStyle(document.querySelector('#log')).overflowY }));
  ok('8 견문록 높이 동기화', w > 960 ? Math.abs(hs.main - hs.side) <= 2 : hs.side === 280, `main ${hs.main} / side ${hs.side}`);
  ok('8 최신 기록이 맨 위 (scrollTop 0) + overflow auto', hs.logScroll && hs.ov === 'auto');
  // 10
  const th = await p.evaluate(() => ({ body: getComputedStyle(document.body).backgroundImage.includes('radial-gradient(circle at 50% 15%') ? 'radial-gradient' : 'missing', panel: getComputedStyle(document.querySelector('.panel')).backgroundColor, blur: getComputedStyle(document.querySelector('.panel')).backdropFilter, border: getComputedStyle(document.querySelector('.panel')).borderTopColor }));
  ok('10 먹빛 글래스', th.body.includes('radial-gradient') && th.panel === 'rgba(18, 22, 29, 0.85)' && th.blur === 'blur(10px)' && th.border === 'rgba(212, 175, 55, 0.15)', JSON.stringify(th));
  ok('무신상 탭 독립', await p.evaluate(() => { ui.tab = 'sect'; ui.sectSub = 'shrine'; render(); return !!document.querySelector('.altar'); }));
  const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
  }
};
