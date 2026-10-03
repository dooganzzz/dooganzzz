/* 핵심 규칙: 탭, 성장, 강호행, 전투, 무장, 도감, 견문록, 테마 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
  console.log(`\n=== ${w}px ===`);
  const p = await newPage(b, w, h);
  const errs = watchErrors(p);
  await p.goto(GAME_URL);
  await startEquipped(p);
  // 1
  const tabs = await p.$$eval('.tab .ko', els => els.map(e => e.textContent).join(','));
  ok('1 탭 순서', tabs === '청풍문,관조,행낭,강호행,견문록,기연,도감,설정', tabs);
  ok('1 새 제자로 시작하면 청풍문 › 정청 (장문인에게서 시작)', await p.$eval('.tab.on .ko', e => e.textContent) === '청풍문' && await p.evaluate(() => ui.sectSub === 'hall'));
  // 2 성장: 연무장·비급별 수련치 없음, 수련치로 성급 올리기
  const t = await p.evaluate(() => {
    const r = {}, id = S.active.simbeop, m = S.manuals[id];
    r.noTrainFields = !('txp' in m) && !('cxp' in m) && !('activeTrainingSkillId' in S) && typeof toggleTraining === 'undefined';
    r.noYeonmu = SECT_SUBS.some(([k]) => k === 'yeonmu') && typeof viewYeonmu === 'function' && !('training' in S);   // 연무장은 심상수련장만 (방치 수련 없음)
    r.cost = starCost(id); r.block = starUpBlock(id);
    S.exp = r.cost; r.up = starUp(id); r.star = m.star; r.left = S.exp;
    return r;
  });
  ok('2 수련치 제거 · 연무장은 심상수련장만', t.noTrainFields && t.noYeonmu);
  ok('2 수련치 부족하면 막힘 → 채우면 성급 +1, 수련치 차감', /수련치 60 필요/.test(t.block) && t.up && t.star === 2 && t.left === 0, JSON.stringify(t));
  // 3 강호행: 강호행 중이 아니면 탭을 누르면 강호 지도 화면 (탐험지 3곳 · 처음엔 2곳 잠김)
  await p.click('[data-tab="field"]');
  ok('3 강호행 탭 → 강호 지도 화면 · 구역 3곳(잠김 2)', await p.evaluate(() => !ui.modal && !!document.querySelector('#main .map-sheet')) && (await p.$$('.map-spot[data-mapzone]')).length === 3 && (await p.$$('.map-spot.locked')).length === 2);
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
  await p.evaluate(() => { goTab('status', 'gear'); render(); });
  const bag = await p.evaluate(() => ({ cap: bagCap(), top: [...document.querySelectorAll('.paperdoll .dslot small')].map(e=>e.textContent).join(','), bottom: [...document.querySelectorAll('.acc-row .dslot small')].map(e=>e.textContent).join(','), img: !!document.querySelector('.character-portrait-card .portrait-img'), head: [...document.querySelectorAll('.panel-head .ko')].map(e => e.textContent) }));
  ok('5 무장 명칭 (호패 · 무장 · 능력치)', bag.head.includes('무장'), bag.head.join()); ok('5 행낭 100칸 이상 (근력 각인·장비로 늘어남)', bag.cap >= 100, String(bag.cap));
  ok('5 몸 둘레 슬롯 (왼쪽 가락지·무기·요대 · 가운데 투구 · 오른쪽 옥대·호갑·가락지)', bag.top === '가락지,무기,요대,투구,옥대,호갑,가락지', bag.top); ok('5 하단 가로 2슬롯 (탈것 없음)', bag.bottom === '신발,신분패', bag.bottom); ok('5 초상 카드 이미지', bag.img);
  // 7 + 6
  await p.evaluate(() => { S.silver = 100; render(); });
  await p.evaluate(() => { goTab('sect', 'hall'); render(); });
  ok('7 아린 힌트 버튼 제거됨', !(await p.$('[data-act="hint"]')));
  await p.evaluate(() => { ui.tab = 'sect'; ui.sectSub = 'forge'; ui.craft = 'alchemy'; S.crafts.alchemy.lv = 99; for (let i = 0; i < 20 && !S.codex.includes('a_haedok'); i++) { Object.assign(S.inv, { silentReed: 2, centipedeLeg: 1 }); ui.pot = { silentReed: 2, centipedeLeg: 1 }; (S.hp = calcStats().maxHp, S.mp = calcStats().maxMp, doCraft)(ui.craft, ui.pot); } });
  await p.click('[data-tab="codex"]'); await p.click('[data-codextab="alchemy"]');
  ok('6 안내문 없음', !(await p.$('.codex ~ .lede, .panel .lede')) && !(await p.content()).includes('아직 아무것도 모릅니다'));
  ok('6 미발견 비법은 숨김 (??? · 개수 없음)', await p.evaluate(() => document.querySelectorAll('.recipe-row').length === 1 && !document.querySelector('.recipe-row.unknown') && !/\?\?\?/.test(document.querySelector('#main').textContent)));
  await p.click('.recipe-row [data-recipe="a_haedok"]');
  const modalBtn = await p.$eval('.sheet [data-fill]', e => e.textContent.trim());
  ok('6 조합법 모달 + 화로로 가기', modalBtn === '[ 화로로 가기 ]' && !!(await p.$('.mats-list li')), modalBtn);
  await p.click('.sheet [data-fill]');
  ok('6 화로 이동·재료 투입', await p.evaluate(() => ui.tab === 'sect' && ui.sectSub === 'forge' && potTotal(ui.pot) > 0));
  ok('9 성공률 % 비노출', !(await p.$eval('#main', e => /\d+%/.test(e.textContent))));
  ok('9 화로 8칸 (솥 둘레)', (await p.$$('.fslot')).length === 8);
  // 7 portraits + quest
  await p.evaluate(() => { goTab('sect', 'hall'); render(); });
  ok('7 초상화 컨테이너 (정청: 노벽송·조운·아린)', (await p.$$('.npc-portrait')).length === 3);
  ok('7 퀘스트 1개만', (await p.$$('.quest > b')).length === 1);
  // 8
  await p.evaluate(() => { give('herb', 2); S.silver += 5; log(`${hlSilver(5)} 획득`, 'loot'); log(`${hlContrib('+10')}`, 'good'); });
  await p.click('[data-tab="chronicle"]');
  const logc = await p.evaluate(() => { const i = document.querySelector('.chron .hl-item'), s = document.querySelector('.chron .hl-silver'), c = document.querySelector('.chron .hl-contrib'); const cs = el => el && getComputedStyle(el).color; return [cs(i), cs(s), cs(c)].join(' | '); });
  ok('8 획득 하이라이트 색', logc === 'rgb(251, 191, 36) | rgb(253, 224, 71) | rgb(52, 211, 153)', logc);
  ok('8 옆 견문록 없음 · 초기화는 설정 탭', await p.evaluate(() => { const r = !document.querySelector('.side') && !document.querySelector('#log') && !document.querySelector('.footer [data-act="reset"]'); ui.tab = 'settings'; render(); const ok = r && !!document.querySelector('#main [data-act="reset"]'); ui.tab = 'sect'; render(); return ok; }));
  // 10
  const th = await p.evaluate(() => ({ body: getComputedStyle(document.body).backgroundImage.includes('radial-gradient(circle at 50% 15%') ? 'radial-gradient' : 'missing', panel: getComputedStyle(document.querySelector('.panel')).backgroundColor, blur: getComputedStyle(document.querySelector('.panel')).backdropFilter, border: getComputedStyle(document.querySelector('.panel')).borderTopColor }));
  ok('10 먹빛 글래스', th.body.includes('radial-gradient') && th.panel === 'rgba(18, 22, 29, 0.85)' && th.blur === 'blur(10px)' && th.border === 'rgba(212, 175, 55, 0.15)', JSON.stringify(th));
  ok('무신상 탭 독립', await p.evaluate(() => { ui.tab = 'sect'; ui.sectSub = 'shrine'; render(); return !!document.querySelector('.altar'); }));
  const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
  }
};
