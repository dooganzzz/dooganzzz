/* 운영자 관리자 창 (admin.html): 게임 창과 BroadcastChannel로 연결 · 상태 복사 · 추적 전달 · 명령 실행 · 재연결 */
'use strict';
const path = require('path');
const { ok, GAME_URL, watchErrors } = require('./lib');
const ADMIN_URL = 'file://' + path.resolve(__dirname, '..', 'admin.html');

module.exports = async (b) => {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const game = await ctx.newPage(), gErr = watchErrors(game);
  await game.goto(GAME_URL);
  const admin = await ctx.newPage(), aErr = watchErrors(admin);
  await admin.goto(ADMIN_URL);

  // 시작 화면에서도 연결
  await admin.waitForFunction(() => /연결됨/.test(document.querySelector('#gmConn').textContent), null, { timeout: 5000 });
  ok('별도 창: 게임 창과 연결 (시작 화면)', await admin.evaluate(() => /시작 화면/.test(document.querySelector('#gmConn').textContent) && S === null));
  ok('별도 창: 창 전체를 쓰는 독립 페이지 · 5개 탭 · 닫기/새 창 버튼 없음', await admin.evaluate(() => getComputedStyle(document.querySelector('#gmPanel')).position === 'static' && document.querySelectorAll('.gm-tab').length === 5 && !document.querySelector('[data-gm="close"], [data-gm="popout"], #gmToggle')));
  ok('별도 창은 게임 화면 계층·app.js를 읽지 않음', await admin.evaluate(() => typeof render === 'undefined' && typeof boot === 'undefined' && typeof calcStats === 'function'));

  // 게임 시작 → 상태 복사본
  await game.click('#begin');
  await game.evaluate(() => { for (const k of Object.keys(S.inv).filter(k => ITEMS[k].kind === '비급')) learnManual(k); for (const id of Object.keys(S.manuals)) equipManual(id); S.silver = 1234; render(); });
  await admin.waitForFunction(() => S && S.silver === 1234, null, { timeout: 4000 });
  const st = await admin.evaluate(() => ({ name: /연결됨 · /.test(document.querySelector('#gmConn').textContent), arts: [...document.querySelectorAll('#gmLive tbody tr')].map(r => r.children[1].textContent), raw: JSON.parse(document.querySelector('#gmRaw').textContent).silver, maxHp: calcStats().maxHp }));
  const gMax = await game.evaluate(() => calcStats().maxHp);
  ok('1 상태: 게임 S가 1초 안에 복사되어 표시', st.name && st.raw === 1234 && st.arts.every(a => a !== '—'), JSON.stringify(st));
  ok('1 복사본으로 능력치 계산도 게임과 같음', st.maxHp === gMax, `${st.maxHp} / ${gMax}`);

  // 명령: 적용·소환·재료·치트는 게임 쪽에서 실행
  await admin.fill('.gm-edit input[name="silver"]', '50'); await admin.click('.gm-edit button[type="submit"]');
  await game.waitForFunction(() => S.silver === 50, null, { timeout: 3000 });
  ok('1 [적용] → 게임의 은자가 바뀜 · 게임 화면 갱신', await game.evaluate(() => /50/.test(document.querySelector('#status').textContent)));
  await admin.click('.gm-tab[data-gmtab="items"]');
  const n0 = await game.evaluate(() => count('lingzhi'));
  await admin.click('[data-gmspawn="lingzhi"][data-n="10"]');
  await game.waitForFunction(n => count('lingzhi') === n + 10, n0, { timeout: 3000 });
  await admin.waitForFunction(n => count('lingzhi') === n + 10, n0, { timeout: 3000 });
  ok('3 [+10 소환] → 게임 행낭 +10 · 관리자 표도 갱신', await admin.evaluate(() => [...document.querySelectorAll('#gmItemRows tr')].some(r => r.textContent.includes('lingzhi') && r.children[4].textContent === String(count('lingzhi')))));
  await admin.click('.gm-tab[data-gmtab="recipes"]');
  await admin.click('[data-gmmats="a_high"]');
  ok('4 [필요 재료 지급] → 게임 행낭에 재료', await game.waitForFunction(() => has('bloodginseng') && has('lotus') && has('firegrass'), null, { timeout: 3000 }).then(() => true, () => false));
  await admin.click('.gm-tab[data-gmtab="cheat"]');
  await admin.click('[data-gm="silver"]');
  await game.waitForFunction(() => S.silver === 1050, null, { timeout: 3000 });
  ok('5 [은자 +1,000냥] → 게임에 반영', true);

  // 추적: 게임의 행동이 관리자 창으로 넘어온다
  await admin.click('.gm-tab[data-gmtab="trace"]');
  await game.click('[data-tab="status"]');
  await game.evaluate(() => { S.hp = 1e9; fight('rabbit'); });
  await admin.waitForFunction(() => GM.trace.some(r => r.kind === 'battle' && /rabbit/.test(r.text)), null, { timeout: 3000 });
  const tr = await admin.evaluate(() => ({ kinds: GM.trace.slice(0, 20).map(r => r.kind), top: document.querySelector('#gmTrace li span:last-child').textContent, cmd: GM.trace.some(r => /관리자 창 명령: spawn/.test(r.text)) }));
  ok('2 게임의 클릭·탭·전투가 관리자 창에 실시간 추적', tr.kinds.includes('click') && tr.kinds.includes('tab') && tr.kinds.slice(0, 3).includes('battle'), tr.kinds.join(','));
  ok('2 관리자 창에서 보낸 명령도 추적에 남음', tr.cmd);
  await game.evaluate(() => { S.expedition.zone = 'cheongpung'; S.stamina = 100; runExpedition(now()); });
  await admin.waitForFunction(() => S && S.expeditions.length === 1, null, { timeout: 3000 });
  ok('1 탐험 기록도 복사', true);

  // 게임 새로고침 → 관리자 창은 살아 있고 다시 연결, 추적 기록 유지
  const before = await admin.evaluate(() => GM.trace.length);
  await game.reload();
  await admin.waitForFunction(() => GM.trace.some(r => r.kind === 'sys' && r.text === '콘솔 준비') && GM.trace.findIndex(r => r.text === '콘솔 준비') < 3, null, { timeout: 4000 });
  const re = await admin.evaluate(n => ({ len: GM.trace.length, kept: GM.trace.length >= n, conn: /연결됨/.test(document.querySelector('#gmConn').textContent) }), before);
  ok('게임 새로고침 뒤 자동 재연결 · 이전 추적 유지', re.kept && re.conn, JSON.stringify(re));

  // 게임 창이 닫히면 '기다리는 중'
  await game.close();
  await admin.waitForFunction(() => /기다리는/.test(document.querySelector('#gmConn').textContent), null, { timeout: 5000 });
  ok('게임 창이 없으면 연결 대기 표시', true);

  // 오버레이의 [새 창 ↗] 로 관리자 창 띄우기
  const g2 = await ctx.newPage(); await g2.goto(GAME_URL);                  // 같은 저장을 이어서 연다
  await g2.keyboard.press('F1');
  ok('오버레이는 그대로 (F1) + [새 창 ↗] 버튼', await g2.evaluate(() => GM.open && !!document.querySelector('[data-gm="popout"]')));
  const [pop] = await Promise.all([ctx.waitForEvent('page'), g2.click('[data-gm="popout"]')]);
  await pop.waitForLoadState();
  ok('[새 창 ↗] → admin.html 새 창 · 오버레이는 닫힘', /admin\.html$/.test(pop.url()) && await g2.evaluate(() => !GM.open));
  await pop.waitForFunction(() => /연결됨/.test(document.querySelector('#gmConn').textContent), null, { timeout: 5000 });
  ok('띄운 창도 곧바로 연결', true);

  // 쾌속 치트: 초기화는 관리자 창에서도 두 번 눌러야
  await pop.click('.gm-tab[data-gmtab="cheat"]');
  await pop.click('[data-gm="reset"]');
  ok('관리자 창 초기화도 두 번 확인', await pop.evaluate(() => GM.resetArm) && await g2.evaluate(() => !!S));
  await Promise.all([g2.waitForNavigation(), pop.click('[data-gm="reset"]')]);
  ok('관리자 창 [데이터 완전 초기화] → 게임 저장 삭제·시작 화면', await g2.evaluate(() => !localStorage.getItem(SAVE_KEY) && !!document.querySelector('#begin')));

  ok('게임·관리자 창 오류 없음', gErr.length === 0 && aErr.length === 0, [...gErr, ...aErr].join(' | '));
  await ctx.close();
};
