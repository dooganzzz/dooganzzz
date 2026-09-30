/* 운영자 통합 디버그 콘솔 (GM): 여닫기 · 유저 상태 · 행동 추적 · 아이템 DB · 조합법 · 쾌속 치트 */
'use strict';
const { ok, GAME_URL, watchErrors, VIEWPORTS, newPage, startEquipped } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);

    // 여닫기: 이름 입력칸에서 ` 를 쳐도 열리지 않는다
    await p.focus('#pname'); await p.keyboard.press('Backquote');
    ok('입력칸에서 ` 는 글자로 (콘솔 안 열림)', await p.evaluate(() => document.querySelector('#gmPanel').hidden && GM.open === false));
    await startEquipped(p);
    ok('기본은 닫힘 · 우측 하단 [GM] 버튼', await p.evaluate(() => { const r = document.querySelector('#gmToggle').getBoundingClientRect(); return document.querySelector('#gmPanel').hidden && r.right > innerWidth - 60 && r.bottom > innerHeight - 60 && getComputedStyle(document.querySelector('#gmToggle')).position === 'fixed'; }));
    await p.click('#gmToggle');
    const t0 = await p.evaluate(() => ({ open: !document.querySelector('#gmPanel').hidden, tabs: [...document.querySelectorAll('.gm-tab')].map(e => e.textContent).join('|'), pos: getComputedStyle(document.querySelector('#gmPanel')).position }));
    ok('[GM] 버튼으로 열림 · 5개 탭', t0.open && t0.tabs === '유저 상태|행동 추적|아이템 DB|조합법|쾌속 치트' && t0.pos === 'fixed', JSON.stringify(t0));
    await p.keyboard.press('Escape');
    ok('Esc로 닫힘', await p.evaluate(() => document.querySelector('#gmPanel').hidden));
    await p.keyboard.press('F1');
    ok('F1로 열림', await p.evaluate(() => GM.open));
    await p.keyboard.press('Backquote');
    ok('` 로 닫힘', await p.evaluate(() => !GM.open));
    await p.evaluate(() => { ui.modal = 'mart:' + S.active.mugong; render(); });
    await p.keyboard.press('F1'); await p.keyboard.press('Escape');
    ok('콘솔의 Esc는 게임 창을 닫지 않음', await p.evaluate(() => !GM.open && ui.modal && ui.modal.startsWith('mart:')));
    await p.evaluate(() => { ui.modal = null; render(); });

    // 1. 유저 상태
    await p.keyboard.press('F1');
    const s1 = await p.evaluate(() => { const raw = JSON.parse(document.querySelector('#gmRaw').textContent); return { silver: raw.silver, arts: [...document.querySelectorAll('#gmLive tbody tr')].map(r => r.children[1].textContent), inv: document.querySelectorAll('#gmLive .gm-chip').length, form: [...document.querySelectorAll('.gm-edit input')].map(i => i.name).join(',') }; });
    ok('1 원시 데이터(S) 표시', s1.silver === await p.evaluate(() => S.silver));
    ok('1 장착 무공 4종 ID·성급 표', s1.arts.length === 4 && s1.arts.every(t => t !== '—'), s1.arts.join(','));
    ok('1 행낭 목록 · 입력 칸 (은자·활력 …)', s1.inv > 0 && /silver/.test(s1.form) && /hp/.test(s1.form), JSON.stringify(s1));
    await p.evaluate(() => { S.silver = 4321; });
    await p.waitForTimeout(1200);
    ok('1 실시간 갱신 (1초 틱)', await p.evaluate(() => JSON.parse(document.querySelector('#gmRaw').textContent).silver === 4321 && /4,321/.test(document.querySelector('#gmLive').textContent)));
    await p.fill('.gm-edit input[name="silver"]', '777'); await p.fill('.gm-edit input[name="hp"]', '999999');
    await p.click('.gm-edit button[type="submit"]');
    const ap = await p.evaluate(() => ({ silver: S.silver, hp: S.hp, max: calcStats().maxHp, header: document.querySelector('#status').textContent.includes('777') }));
    ok('1 [적용]: 은자 반영 · 활력은 최대치로 제한 · 게임 화면도 갱신', ap.silver === 777 && ap.hp === ap.max && ap.header, JSON.stringify(ap));

    // 2. 행동 추적
    await p.click('.gm-tab[data-gmtab="trace"]');
    await p.keyboard.press('Escape');
    await p.click('[data-tab="status"]');
    await p.evaluate(() => { S.silver = 0; goTab('sect', 'shop'); render(); buyItem('potionHp'); enterZone('cheongpung'); startBattle('rabbit'); stopBattleTimer(); RT.battle.over = true; closeBattle(); leaveZone(); give('herb', 2); take('herb', 1); });
    await p.keyboard.press('F1');
    const tr = await p.evaluate(() => ({ kinds: GM.trace.map(r => r.kind), top: GM.trace[0].text, rows: document.querySelectorAll('#gmTrace li').length, first: document.querySelector('#gmTrace li span:last-child').textContent, time: document.querySelector('#gmTrace li time').textContent, inLog: S.log.some(l => /콘솔/.test(l.text)) }));
    ok('2 탭 전환·클릭 추적', tr.kinds.includes('tab') && tr.kinds.includes('click'), tr.kinds.slice(0, 12).join(','));
    ok('2 전투 조우·아이템 획득/소모 추적', tr.kinds.includes('battle') && tr.kinds.includes('item+') && tr.kinds.includes('item-'));
    ok('2 재화 부족 시도 → 경고', await p.evaluate(() => GM.trace.some(r => r.kind === 'warn' && /은자가 부족/.test(r.text))));
    ok('2 최신이 위 · 타임스탬프(초·밀리초)', /콘솔 열기/.test(tr.first) && /^\d\d:\d\d:\d\d\.\d{3}$/.test(tr.time) && tr.rows === tr.kinds.length, `${tr.first} ${tr.time}`);
    ok('2 견문록과 분리', !tr.inLog);
    await p.evaluate(() => setTimeout(() => { throw new Error('시험 예외'); }, 0)); await p.waitForTimeout(50);
    ok('2 예외 추적', await p.evaluate(() => GM.trace.some(r => r.kind === 'error' && /시험 예외/.test(r.text))));
    errs.length = 0;                                               // 일부러 낸 예외는 오류 집계에서 뺀다
    await p.click('[data-gm="cleartrace"]');
    ok('2 [로그 비우기]', await p.evaluate(() => GM.trace.length === 0 && /기록 없음/.test(document.querySelector('#gmTrace').textContent)));

    // 3. 아이템 DB
    await p.click('.gm-tab[data-gmtab="items"]');
    const it = await p.evaluate(() => ({ rows: document.querySelectorAll('#gmItemRows tr').length, total: Object.keys(ITEMS).length, head: [...document.querySelectorAll('.gm-table th')].map(e => e.textContent).slice(0, 4).join(',') }));
    ok('3 전체 아이템 표 (ID·이름·분류·가치)', it.rows === it.total && it.head === 'ID,이름,분류,가치', JSON.stringify(it));
    await p.fill('[data-gminput="itemQ"]', '금창');
    ok('3 검색', await p.evaluate(() => document.querySelectorAll('#gmItemRows tr').length === 1 && document.activeElement.dataset.gminput === 'itemQ'));
    const sp = await p.evaluate(() => { const n0 = count('potionHp'); document.querySelector('[data-gmspawn="potionHp"][data-n="1"]').click(); const n1 = count('potionHp'); document.querySelector('[data-gmspawn="potionHp"][data-n="10"]').click(); return [n1 - n0, count('potionHp') - n1]; });
    ok('3 [+1 소환] [+10 소환] → 행낭', sp[0] === 1 && sp[1] === 10, sp.join(','));

    // 4. 조합법
    await p.click('.gm-tab[data-gmtab="recipes"]');
    const rc = await p.evaluate(() => ({ rows: document.querySelectorAll('[data-gmmats]').length, total: RECIPES.length }));
    ok('4 모든 레시피 (재료·결과)', rc.rows === rc.total, JSON.stringify(rc));
    const mats = await p.evaluate(() => { const r = RECIPES.find(x => x.id === 'f_armor_2'); const before = Object.fromEntries(Object.keys(r.in).map(id => [id, count(id)])); document.querySelector('[data-gmmats="f_armor_2"]').click(); return Object.entries(r.in).every(([id, n]) => count(id) - before[id] === n); });
    ok('4 [필요 재료 지급] → 재료 세트가 행낭에', mats);
    await p.click('[data-gmcraft="cook"]');
    ok('4 기예별 거르기', await p.evaluate(() => document.querySelectorAll('[data-gmmats]').length === RECIPES.filter(r => r.craft === 'cook').length));

    // 5. 쾌속 치트
    await p.click('.gm-tab[data-gmtab="cheat"]');
    ok('5 수련 없으면 [수련 1시간 경과] 비활성', await p.$eval('[data-gm="train"]', e => e.disabled));
    const ch = await p.evaluate(() => { const s0 = S.silver; document.querySelector('[data-gm="silver"]').click(); S.hp = 1; S.mp = 0; document.querySelector('[data-gm="heal"]').click(); const st = calcStats(); return { silver: S.silver - s0, hp: S.hp === st.maxHp, mp: S.mp === st.maxMp }; });
    ok('5 [은자 +1,000냥] · [활력/내력 100% 회복]', ch.silver === 1000 && ch.hp && ch.mp, JSON.stringify(ch));
    const tn = await p.evaluate(() => {
      toggleTraining('mugong'); render(); gmRender();
      const id = S.activeTrainingSkillId, m = S.manuals[id], t0 = m.txp;
      document.querySelector('[data-gm="train"]').click();
      const gain = m.txp - t0;
      m.txp = need(m.star) - 10; m.cxp = needC(m.star); const star0 = m.star;
      document.querySelector('[data-gm="train"]').click();
      return { gain, rate: trainRate(id), star0, star1: m.star };
    });
    ok('5 [수련 1시간 경과] → 수련치 3600초 × 효율', Math.abs(tn.gain - 3600 * tn.rate) < 1, JSON.stringify(tn));
    ok('5 경과로 성 돌파 판정', tn.star1 === tn.star0 + 1, JSON.stringify(tn));
    await p.click('[data-gm="reset"]');
    ok('5 초기화는 두 번 눌러야 (첫 번째는 확인 요청)', await p.evaluate(() => !!S && /한 번 더/.test(document.querySelector('[data-gm="reset"]').textContent)));
    await Promise.all([p.waitForNavigation(), p.click('[data-gm="reset"]')]);
    ok('5 [데이터 완전 초기화] → 저장 삭제 · 시작 화면', await p.evaluate(() => !localStorage.getItem(SAVE_KEY) && !!document.querySelector('#begin')));

    ok('오류/가로스크롤 없음', errs.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), errs.join(' | '));
    await p.close();
  }
};
