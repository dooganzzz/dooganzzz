/* 회피·반격 분기, 기척 지문, 금고 내용물, 견문록 역순, 정청 접기/펼치기 */
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
        const b = { eid: 'boar', e: { ...ENEMIES.boar, hpNow: 1e9 }, lines: [], fx: [], over: false }; RT.battle = b; S.hp = 1e9;
        const lines = [];
        for (let i = 0; i < 40; i++) { b.st = calcStats(); b.st.eva = eva; b.st.counter = counter; b.st.spd = 1; const n = b.lines.length; enemyTurn(b); lines.push(b.lines.slice(n).map(l => l.text)); }
        RT.battle = null;
        return lines;
      };
      // 회피율 최대(적 명중 하한 40%) + 반격 100%
      const allDodge = run(1000, 100);
      // 회피 0 + 반격 100%
      const noDodge = run(-1000, 100);
      return {
        dodges: allDodge.filter(t => t.some(x => x.includes('비스듬히 흘려냈습니다'))).length,
        dodgeTexts: allDodge.filter(t => t.some(x => x.includes('비스듬히 흘려냈습니다'))).every(t => t.length === 2),   // 적의 공격 지문 + 회피 결과
        dodgeNoCounter: allDodge.filter(t => t.some(x => x.includes('비스듬히 흘려냈습니다'))).every(t => !t.some(x => x.includes('반격'))),
        hitThenCounter: noDodge.every(t => t.length >= 3 && t[1].includes('활력 -') && t[2].includes('반격(反擊)')),
      };
    });
    ok('1 회피 성공: 적의 공격 지문 + "비스듬히 흘려냈습니다" 결과만', cb.dodges > 5 && cb.dodgeTexts, `회피 ${cb.dodges}회 / 40턴`);
    ok('1 회피 성공 시 반격 판정 없음', cb.dodgeNoCounter);
    ok('1 반격은 피격 뒤에만 발동', cb.hitThenCounter);

    // 2. 기척 지문: 3단계 (제자가 두목을 피할지 가늠하는 데도 쓴다)
    const so = await p.evaluate(() => {
      const r = { tiers: SENSE_TEXT.map(t => t[2]).join(','), weak: sense('rabbit')[2], strong: sense('byeokhaeryong')[2] };
      r.colors = ['weak', 'even', 'strong'].map(c => { const el = document.createElement('p'); el.className = 'sense ' + c; document.body.appendChild(el); const col = getComputedStyle(el).color; el.remove(); return col; }).join(' | ');
      S.hp = 1e9; const b = fightSync('rabbit'); r.intro = b.intro.some(l => /^sense /.test(l.cls));
      return r;
    });
    ok('2 기척 지문 3단계', so.tiers === 'weak,even,strong' && so.weak === 'weak' && so.strong === 'strong');
    ok('2 지문 색: 녹색·황금·적색', so.colors === 'rgb(108, 195, 138) | rgb(240, 207, 130) | rgb(224, 104, 90)', so.colors);
    ok('2 전투 기록 첫머리에 기척 지문', so.intro);

    // 3. 금고
    const vault = await p.evaluate(() => {
      const Z = ZONES.cheongpung, kinds = {}; let silverOk = true, bookSeen = false, alchemyOnly = true, forgeOnly = true, cookOnly = true;
      for (let i = 0; i < 600; i++) {
        const inv0 = { ...S.inv }, sil0 = S.silver;
        const v = openVault(Z).name; kinds[v] = (kinds[v] || 0) + 1;
        const gained = Object.keys(S.inv).filter(k => (S.inv[k] || 0) > (inv0[k] || 0));
        if (v === '은자 궤' && !(S.silver - sil0 >= 2 && S.silver - sil0 <= 4)) silverOk = false;   // 15~35냥 × 원정 보상 1/10
        if (v === '약재 궤' && gained.some(k => ITEMS[k].craftType !== 'alchemy')) alchemyOnly = false;
        if (v === '철물 궤' && gained.some(k => ITEMS[k].craftType !== 'forge')) forgeOnly = false;
        if (v === '비급/장비 궤' && gained.some(k => ITEMS[k].kind === '비급')) bookSeen = true;
        if (bagUsed() > 80) for (const k of Object.keys(S.inv)) if (ITEMS[k].kind === '재료') delete S.inv[k];
      }
      return { kinds, silverOk, alchemyOnly, forgeOnly, cookOnly, bookSeen };
    });
    ok('3 네 종류 무작위 (비급/장비 궤가 가장 드묾)', Object.keys(vault.kinds).length === 4 && vault.kinds['비급/장비 궤'] < vault.kinds['은자 궤'], JSON.stringify(vault.kinds));
    ok('3 은자 궤 2~4냥(1/10) · 약재 궤 단약 · 철물 궤 단조 재료만', vault.silverOk && vault.alchemyOnly && vault.forgeOnly);
    ok('3 비급/장비 궤에서 미습득 삼류 비급', vault.bookSeen);

    // 4. 견문록 역순
    await p.evaluate(() => { ui.tab = 'chronicle'; ui.chronFilter = 'all'; render(); });
    const lg = await p.evaluate(async () => {
      const frame = () => new Promise(r => requestAnimationFrame(() => r()));
      const rows = () => [...document.querySelectorAll('.chron .chron-row .chron-text')].map(e => e.textContent);
      log('첫 번째 확인 기록', 'good'); log('두 번째 확인 기록', 'good'); await frame(); await frame();
      const [first, second] = rows();
      render();
      return { first, second, afterRender: rows()[0] };
    });
    ok('4 견문록 탭: 새 기록이 맨 위', lg.first === '두 번째 확인 기록' && lg.second === '첫 번째 확인 기록', lg.first);
    ok('4 다시 그려도 최신이 맨 위', lg.afterRender === '두 번째 확인 기록');

    // 5. 정청 접기/펼치기
    await p.evaluate(() => { ui.tab = 'sect'; ui.sectSub = 'hall'; render(); });
    const state = () => p.evaluate(() => ['hq', 'library'].map(k => document.querySelector(`[data-foldbody="${k}"]`).classList.contains('collapsed') ? '접힘' : '펼침').join(','));
    const s0 = await state();
    ok('5 기본: 정청 두 구역(토벌 임무는 장문인 안) 모두 접힘', s0 === '접힘,접힘', s0);
    await p.click('[data-fold="library"]');
    const s1 = await state();
    const arrows = await p.$$eval('.fold-arrow', e => e.map(x => x.textContent).join(''));
    ok('5 헤더 클릭으로 토글 + 화살표 ▼/▲', s1 === '접힘,펼침' && arrows === '▼▲', `${s1} ${arrows}`);
    await p.waitForTimeout(450);
    const fh = await p.evaluate(() => ({ collapsed: document.querySelector('[data-foldbody="hq"]').getBoundingClientRect().height, cursor: getComputedStyle(document.querySelector('.fold-head')).cursor, trans: getComputedStyle(document.querySelector('.fold-body')).transitionProperty }));
    ok('5 접힌 구역은 높이 0, max-height 전환, 포인터 커서', fh.collapsed < 1 && /max-height/.test(fh.trans) && fh.cursor === 'pointer', JSON.stringify(fh));

    const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
    await p.close();
  }
};
