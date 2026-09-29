/* 회피·반격 분기, 요수 대치, 금고, 견문록 역순, 정청 접기/펼치기 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    // 1. 회피 성공 시 반격 없음 / 피격 후에만 반격
    const cb = await p.evaluate(() => {
      const run = (eva, counter) => {
        startBattle('boar'); stopBattleTimer();
        const b = ui.battle; S.hp = 1e9; b.e.hpNow = 1e9;
        const lines = [];
        for (let i = 0; i < 40; i++) { b.st = calcStats(); b.st.eva = eva; b.st.counter = counter; b.st.spd = 1; const n = b.lines.length; enemyTurn(b); lines.push(b.lines.slice(n).map(l => l.text)); }
        b.over = true; b.win = true; closeBattle();
        return lines;
      };
      // 회피율 최대(적 명중 하한 40%) + 반격 100%
      const allDodge = run(1000, 100);
      // 회피 0 + 반격 100%
      const noDodge = run(-1000, 100);
      return {
        dodges: allDodge.filter(t => t[0].includes('비스듬히 흘려냈습니다')).length,
        dodgeTexts: allDodge.filter(t => t[0].includes('비스듬히 흘려냈습니다')).every(t => t.length === 1),
        dodgeNoCounter: allDodge.filter(t => t[0].includes('비스듬히 흘려냈습니다')).every(t => !t.some(x => x.includes('반격'))),
        hitThenCounter: noDodge.every(t => t.length >= 2 && t[0].includes('활력 -') && t[1].includes('반격(反擊)')),
      };
    });
    ok('1 회피 성공: "비스듬히 흘려냈습니다" 한 줄만', cb.dodges > 5 && cb.dodgeTexts, `회피 ${cb.dodges}회 / 40턴`);
    ok('1 회피 성공 시 반격 판정 없음', cb.dodgeNoCounter);
    ok('1 반격은 피격 뒤에만 발동', cb.hitThenCounter);

    // 2. 요수 대치
    const so = await p.evaluate(() => {
      enterZone('cheongpung'); S.stamina = 999;
      const [sx, sy] = S.zone.start; const [tx, ty] = DIRS.map(([dx, dy]) => [sx + dx, sy + dy]).find(([x, y]) => passable('cheongpung', x, y));
      S.zone.layout = S.zone.layout.map((row, y) => y === ty ? row.slice(0, tx) + 'Y' + row.slice(tx + 1) : row);
      const st0 = S.stamina;
      move(tx - sx, ty - sy);
      const panel = document.querySelector('.standoff');
      const r = { noBattle: !ui.battle, noCost: S.stamina === st0, panel: !!panel, btn: panel && panel.querySelector('[data-act="interact"]').textContent.trim(), sense: panel && panel.querySelector('.sense').className, text: panel && panel.querySelector('.sense').textContent };
      // 다시 그려도 같은 요수
      const foe1 = S.zone.foes[`${tx},${ty}`]; render(); r.stable = S.zone.foes[`${tx},${ty}`] === foe1;
      document.querySelector('.standoff [data-act="interact"]').click();
      r.started = !!ui.battle && ui.battle.eid === foe1; r.cost = st0 - S.stamina;
      stopBattleTimer(); ui.battle.over = true; ui.battle.win = true; closeBattle();
      // 세 단계 지문
      const st = calcStats();
      r.tiers = SENSE_TEXT.map(t => t[2]).join(',');
      r.weak = sense('rabbit')[2]; r.strong = sense('galcheon')[2];
      r.colors = ['weak', 'even', 'strong'].map(c => { const el = document.createElement('p'); el.className = 'sense ' + c; document.body.appendChild(el); const col = getComputedStyle(el).color; el.remove(); return col; }).join(' | ');
      return r;
    });
    ok('2 요수 칸을 밟아도 바로 싸우지 않음 (기력도 그대로)', so.noBattle && so.noCost);
    ok('2 대치 패널 + [ ⚔️ 결투 시작 ]', so.panel && /결투 시작/.test(so.btn), so.btn);
    ok('2 대치 지문 3단계', so.tiers === 'weak,even,strong' && so.weak === 'weak' && so.strong === 'strong', so.text);
    ok('2 지문 색: 녹색·황금·적색', so.colors === 'rgb(108, 195, 138) | rgb(240, 207, 130) | rgb(224, 104, 90)', so.colors);
    ok('2 대치 상대는 고정, 버튼을 눌러야 전투·기력 소모', so.stable && so.started && so.cost === 4);

    // 3. 금고
    const vault = await p.evaluate(() => {
      const stat = { counts: [], icons: new Set() };
      for (let i = 0; i < 200; i++) { const { layout } = generateLayout(ZONES.cheongpung); stat.counts.push(layout.join('').split('C').length - 1); }
      if (!S.zone) enterZone('cheongpung');
      const [sx, sy] = [S.zone.x, S.zone.y]; const [tx, ty] = DIRS.map(([dx, dy]) => [sx + dx, sy + dy]).find(([x, y]) => passable('cheongpung', x, y) && !'YK'.includes(tileAt('cheongpung', x, y)));
      move(tx - sx, ty - sy);
      const kinds = {}; let silverOk = true, bookSeen = false, alchemyOnly = true, forgeOnly = true;
      S.stamina = 9999;
      for (let i = 0; i < 300; i++) {
        S.zone.layout = S.zone.layout.map((row, y) => y === ty ? row.slice(0, tx) + 'C' + row.slice(tx + 1) : row); delete S.zone.done[`${tx},${ty}`];
        const inv0 = { ...S.inv }, sil0 = S.silver, last = S.log[S.log.length - 1];
        interact();
        const l = S.log.slice(S.log.lastIndexOf(last) + 1).find(x => x.text.includes('금고를 열자'));
        const v = VAULTS.find(v => l.text.includes(v.name)).name; kinds[v] = (kinds[v] || 0) + 1;
        const gained = Object.keys(S.inv).filter(k => (S.inv[k] || 0) > (inv0[k] || 0));
        if (v === '은자 궤' && !(S.silver - sil0 >= 15 && S.silver - sil0 <= 35)) silverOk = false;
        if (v === '약재 궤' && gained.some(k => ITEMS[k].craftType !== 'alchemy')) alchemyOnly = false;
        if (v === '철물 궤' && gained.some(k => ITEMS[k].craftType !== 'forge')) forgeOnly = false;
        if (v === '비급/장비 궤' && gained.some(k => ITEMS[k].kind === '비급')) bookSeen = true;
      }
      const after = tileAt('cheongpung', tx, ty);
      return { min: Math.min(...stat.counts), max: Math.max(...stat.counts), kinds, silverOk, alchemyOnly, forgeOnly, bookSeen, after, label: nodeInfo('cheongpung', 0, 0) && '금고(金庫)' };
    });
    ok('3 금고 3~4개 배치', vault.min >= 3 && vault.max <= 4, `${vault.min}~${vault.max}`);
    ok('3 네 종류 무작위 (비급/장비 궤가 가장 드묾)', Object.keys(vault.kinds).length === 4 && vault.kinds['비급/장비 궤'] < vault.kinds['은자 궤'], JSON.stringify(vault.kinds));
    ok('3 은자 궤 15~35냥 · 약재 궤 연단 재료 · 철물 궤 주조 재료', vault.silverOk && vault.alchemyOnly && vault.forgeOnly);
    ok('3 비급/장비 궤에서 미습득 하품 비급', vault.bookSeen);
    ok('3 연 금고는 산길로 전환', vault.after === 'o');
    await p.evaluate(() => { if (S.zone) leaveZone(); });

    // 4. 견문록 역순
    const lg = await p.evaluate(() => {
      log('첫 번째 확인 기록', 'good'); log('두 번째 확인 기록', 'good');
      const el = document.querySelector('#log');
      const first = el.firstElementChild.textContent, second = el.children[1].textContent;
      render();
      return { first, second, afterRender: el.firstElementChild.textContent, top: el.scrollTop };
    });
    ok('4 새 기록이 맨 위 (prepend)', lg.first === '두 번째 확인 기록' && lg.second === '첫 번째 확인 기록', lg.first);
    ok('4 다시 그려도 최신이 맨 위, scrollTop 0', lg.afterRender === '두 번째 확인 기록' && lg.top === 0);

    // 5. 정청 접기/펼치기
    await p.evaluate(() => { ui.tab = 'hall'; render(); });
    const state = () => p.evaluate(() => ['hq', 'missions', 'library'].map(k => document.querySelector(`[data-foldbody="${k}"]`).classList.contains('collapsed') ? '접힘' : '펼침').join(','));
    const s0 = await state();
    ok('5 기본: 정청 본부 펼침, 문파 임무 펼침, 장경각 접힘', s0 === '펼침,펼침,접힘', s0);
    await p.click('[data-fold="library"]'); await p.click('[data-fold="missions"]');
    const s1 = await state();
    const arrows = await p.$$eval('.fold-arrow', e => e.map(x => x.textContent).join(''));
    ok('5 헤더 클릭으로 토글 + 화살표 ▼/▲', s1 === '펼침,접힘,펼침' && arrows === '▲▼▲', `${s1} ${arrows}`);
    await p.waitForTimeout(450);
    const fh = await p.evaluate(() => ({ collapsed: document.querySelector('[data-foldbody="missions"]').getBoundingClientRect().height, cursor: getComputedStyle(document.querySelector('.fold-head')).cursor, trans: getComputedStyle(document.querySelector('.fold-body')).transitionProperty }));
    ok('5 접힌 구역은 높이 0, max-height 전환, 포인터 커서', fh.collapsed < 1 && /max-height/.test(fh.trans) && fh.cursor === 'pointer', JSON.stringify(fh));

    const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
    await p.close();
  }
};
