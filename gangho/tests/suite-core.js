/* 핵심 규칙: 탭, 연무장, 강호행, 전투, 무장, 도감, 견문록, 테마 */
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
  ok('1 탭 순서', tabs === '정청,무공,연무장,화로,뒷마당,무장,강호행,무신상,도감', tabs);
  ok('1 첫 화면=정청', await p.$eval('.tab.on .ko', e => e.textContent) === '정청');
  // 2
  const t = await p.evaluate(() => {
    const r = {}; r.default = S.activeTrainingSkillId;
    const snap = () => CAT_ORDER.map(c => Math.round(S.manuals[S.active[c]].txp * 1000) / 1000).join('/');
    const a = snap(); advance(600, true); r.idleUnchanged = a === snap();
    toggleTraining('simbeop'); r.id = S.activeTrainingSkillId;
    const before = CAT_ORDER.map(c => S.manuals[S.active[c]].txp); advance(3600, true);
    const after = CAT_ORDER.map(c => S.manuals[S.active[c]].txp);
    r.changed = CAT_ORDER.filter((c, i) => after[i] !== before[i]);
    r.segs = [1, 5, 6, 11].map(st => trainHours(st));
    r.perStarBase = need(1) / (trainRate('tonap') / trainBonus()) / 3600;
    return r;
  });
  ok('2 기본 수련 정지', t.default === null);
  ok('2 정지 시 경험치 불변', t.idleUnchanged);
  ok('2 단일 비급만 누적', t.changed.length === 1 && t.changed[0] === 'simbeop', t.changed.join(','));
  ok('2 성당 수련 시간 (1~5성 8h, 6~11성 16h)', t.segs.join('/') === '8/8/16/16' && Math.abs(t.perStarBase - 8) < 0.01, `1·5·6·11성 ${t.segs.join('/')}h`);
  await p.click('[data-tab="yeonmu"]');
  ok('2 수련 중 카드 1개만 금빛', (await p.$$('.art.training')).length === 1);
  // 3
  await p.click('[data-tab="field"]');
  const zones = await p.$$eval('.zone h3', els => els.map(e => e.textContent).join(' | '));
  ok('3 성급 표기 없음', !/성/.test(zones.replace(/평정/g,'')), zones);
  ok('3 염화채·적룡방 숨김', (await p.$$('.zone')).length === 1);
  await p.click('[data-zone="cheongpung"]');
  const f = await p.evaluate(() => {
    const r = {}; const L1 = S.zone.layout.join('/');
    r.bossReach = reachable(S.zone.layout, ...S.zone.start); let k; S.zone.layout.forEach((row,y)=>[...row].forEach((c,x)=>{ if(c==='K') k=`${x},${y}`; })); r.bossReach = r.bossReach.has(k);
    // 인접한 이벤트 노드 하나 처리
    const [sx, sy] = S.zone.start; let target = null;
    for (const [dx,dy] of DIRS) { const c = tileAt('cheongpung', sx+dx, sy+dy); if (c === 'C') { target = [sx+dx, sy+dy, c]; break; } }
    if (!target) for (const [dx,dy] of DIRS) { const c = tileAt('cheongpung', sx+dx, sy+dy); if (c !== '_' ) { S.zone.layout = S.zone.layout.map((row,y)=> y===sy+dy ? row.slice(0,sx+dx)+'C'+row.slice(sx+dx+1) : row); target=[sx+dx,sy+dy,'C']; break; } }
    move(target[0]-sx, target[1]-sy); interact();
    r.cleared = tileAt('cheongpung', target[0], target[1]) === 'o';
    const hp = S.hp, sta = S.stamina; move(sx - target[0], sy - target[1]); move(target[0]-sx, target[1]-sy);
    r.noRegen = S.hp === hp && S.stamina === sta;
    r.stillCleared = tileAt('cheongpung', target[0], target[1]) === 'o';
    leaveZone(); enterZone('cheongpung');
    r.doneReset = Object.keys(S.zone.done).length === 0;
    r.reshuffled = S.zone.layout.join('/') !== L1;
    return r;
  });
  ok('3 보스 도달 보장', f.bossReach); ok('3 처리한 노드→산길', f.cleared); ok('3 필드 안에서는 리젠 없음', f.stillCleared);
  ok('3 이동 시 자동 회복 없음', f.noRegen); ok('3 재입장 시 초기화', f.doneReset); ok('3 재입장 시 재배치', f.reshuffled);
  // 4
  const bt = await p.evaluate(() => {
    startBattle('boar'); stopBattleTimer(); const r = {};
    r.noStats = !/활력 \d|공격 \d|방어 \d/.test(document.querySelector('.bar.foe').textContent + document.querySelector('.blog').textContent);
    r.sense = SENSE_TEXT.some(([, t]) => document.querySelector('.blog').textContent.includes(t));
    r.cmds = document.querySelectorAll('[data-bact], [data-act="auto"]').length;
    r.phase = !!document.querySelector('.phase-bar');
    S.hp = 99999; ui.battle.e.hpNow = 1e9;
    for (let i = 0; i < 60; i++) battleRound();
    r.counter = ui.battle.lines.some(l => l.text.includes('반격(反擊)'));
    ui.battle.over = true; closeBattle();
    return r;
  });
  ok('4 적 수치 비노출', bt.noStats); ok('4 육감 지문', bt.sense);
  ok('4 수동 선택지 없음 (자동 공방)', bt.cmds === 0 && bt.phase);
  ok('4 반격 발생 (반격 스탯)', bt.counter);
  // 5
  await p.evaluate(() => { leaveZone(); });
  await p.click('[data-tab="bag"]');
  const bag = await p.evaluate(() => ({ cap: bagCap(), top: [...document.querySelectorAll('.paperdoll .dslot small')].map(e=>e.textContent).join(','), bottom: [...document.querySelectorAll('.acc-row .dslot small')].map(e=>e.textContent).join(','), img: !!document.querySelector('.martial-artist-img'), head: document.querySelector('.panel-head .ko').textContent }));
  ok('5 무장 명칭', bag.head === '무장'); ok('5 행낭 100칸', bag.cap === 100);
  ok('5 상단 슬롯', bag.top === '투구,무기,옥패,호갑', bag.top); ok('5 하단 가로 5슬롯', bag.bottom === '신발,요대,가락지,신분패,탈것', bag.bottom); ok('5 실루엣 이미지', bag.img);
  // 7 + 6
  await p.evaluate(() => { S.silver = 100; render(); });
  await p.click('[data-tab="yard"]');
  ok('7 아린 힌트 버튼 제거됨', !(await p.$('[data-act="hint"]')));
  await p.evaluate(() => { S.inv.herb = 2; ui.tab = 'forge'; ui.craft = 'alchemy'; ui.pot = { herb: 2 }; S.crafts.alchemy.lv = 99; doCraft(); });
  await p.click('[data-tab="codex"]');
  ok('6 안내문 없음', !(await p.$('.codex ~ .lede, .panel .lede')) && !(await p.content()).includes('아직 아무것도 모릅니다'));
  await p.click('.ctile.locked'); const toast = await p.$$eval('.toast', e => e[e.length - 1].textContent);
  ok('6 미해금 토스트', toast.includes('아직 발견하지 못한 비전'), toast);
  await p.click('.ctile.known');
  const modalBtn = await p.$eval('.sheet [data-fill]', e => e.textContent.trim());
  ok('6 조합법 모달 + 화로로 가기', modalBtn === '[ 화로로 가기 ]' && !!(await p.$('.mats-list li')), modalBtn);
  await p.click('.sheet [data-fill]');
  ok('6 화로 이동·재료 투입', await p.evaluate(() => ui.tab === 'forge' && potTotal() > 0));
  ok('9 성공률 % 비노출', !(await p.$eval('#main', e => /\d+%/.test(e.textContent))));
  ok('9 화로 10칸', (await p.$$('.pot-slots .slot')).length === 10);
  // 7 portraits + quest
  await p.click('[data-tab="hall"]');
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
  ok('무신상 탭 독립', await p.evaluate(() => { ui.tab = 'shrine'; render(); return !!document.querySelector('.altar'); }));
  const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
  }
};
