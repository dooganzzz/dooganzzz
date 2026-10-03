/* 손맛 연출: 피해 숫자·섬광·잔떨림(관찰하기 창), 타자기, 움직임 줄이기 */
'use strict';
const { ok, GAME_URL, watchErrors, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await p.click('#begin');

    // 3. 타자기: 첫 조우 대사는 한 글자씩, 누르면 즉시 전부
    await p.click('.ground-tag[data-sub="hall"]');   // 새 제자는 청풍문 › 전경에서 시작 → 정청 이름표로 들어간다
    const tw0 = await p.evaluate(() => { const el = document.querySelector('[data-tw="npc"]'); return el && { typing: el.classList.contains('typing'), len: el.textContent.length, full: el.textContent }; });
    ok('3 인물 첫 대사가 타자기로 시작', tw0 && tw0.typing, JSON.stringify(tw0));
    await p.waitForTimeout(150);
    const tw1 = await p.evaluate(() => { const el = document.querySelector('[data-tw="npc"].typing'); return el ? el.textContent.length : -1; });
    ok('3 글자가 차례로 늘어남', tw1 > 0 && tw1 > tw0.len, `${tw0.len} → ${tw1}`);
    await p.mouse.click(5, 5);
    const tw2 = await p.evaluate(() => ({ typing: document.querySelectorAll('.typing').length, texts: [...document.querySelectorAll('[data-tw="npc"]')].map(e => e.textContent.length) }));
    ok('3 클릭하면 전부 즉시 표시', tw2.typing === 0 && tw2.texts.every(n => n > 10), JSON.stringify(tw2));
    await p.evaluate(() => { ui.tab = 'sect'; ui.sectSub = 'hall'; render(); });
    ok('3 두 번째 방문부터는 바로 전체 문장', (await p.$$('.typing')).length === 0);

    await p.evaluate(() => { for (const k of Object.keys(S.inv).filter(k => ITEMS[k].kind === '비급')) learnManual(k); for (const id of Object.keys(S.manuals)) equipManual(id); ui.tab = 'sect'; ui.sectSub = 'hall'; render(); });

    // 1. 전투 연출
    const logic = await p.evaluate(() => {
      const r0 = Math.random, out = {};
      const bt = { eid: 'boar', e: { ...ENEMIES.boar, hpNow: 1e9 }, lines: [], fx: [], st: calcStats(), over: false }; RT.battle = bt;
      Math.random = () => 0.999; enemyTurn(bt); out.dodge = bt.fx[0];
      bt.fx = []; Math.random = () => 0.5; S.hp = 9999; bt.st.critRes = 99; enemyTurn(bt); out.me = bt.fx.find(f => f.side === 'me');
      bt.fx = []; Math.random = () => 0; playerHit(bt, 1, '평타'); out.foe = bt.fx.find(f => f.side === 'foe');
      Math.random = r0; RT.battle = null;
      return out;
    });
    ok('1 회피 → "회피!" (dodge)', logic.dodge && logic.dodge.t === '회피!' && logic.dodge.k === 'dodge', JSON.stringify(logic.dodge));
    ok('1 약한 피격은 강타 아님', logic.me && logic.me.k === 'hit' && logic.me.big === false, JSON.stringify(logic.me));
    ok('1 치명타는 강타(big)', logic.foe && logic.foe.k === 'crit' && logic.foe.big === true, JSON.stringify(logic.foe));

    // 연출은 관찰하기(리플레이) 창에서 합마다 재생된다: 기록 하나를 만들어 한 합씩 넘겨 본다
    const vis = await p.evaluate(async () => {
      const R = (fx, foe) => ({ lines: [{ text: '합', cls: '' }], fx, me: { hp: 100, mp: 40 }, foe });
      S.expeditions.push({ id: 999999, at: now(), zone: 'cheongpung', steps: [], wins: 1, losses: 0, gain: {}, battles: [{ eid: 'boar', name: '멧돼지', boss: false, win: true, intro: [{ text: '⚔️ 시작', cls: 'head' }],
        start: { me: { hp: 100, mp: 40, maxHp: 100, maxMp: 40 }, foe: { hp: 140, maxHp: 140 } },
        rounds: [R([{ side: 'foe', t: '-12', k: 'hit' }], 128), R([{ side: 'foe', t: '-40', k: 'crit', big: true }, { side: 'me', t: '회피!', k: 'dodge' }], 88), R([], 0)], exp: 0, silver: 0 }] });
      openReplay('999999:0');
      for (let i = 0; i < 40 && !document.getElementById('pl-foe'); i++) await new Promise(r => setTimeout(r, 50));   // 무대 그림을 풀고 열린다
      replayStop(); RP.playing = false;
      const until = async sel => { for (let i = 0; i < 60 && !document.querySelector(sel); i++) await new Promise(r => setTimeout(r, 50)); };   // 무대 동작이 끝나야 숫자가 뜬다
      replayStep(); await until('#pl-foe .fx-num.hit');
      const foe = document.getElementById('pl-foe'), hit = foe.querySelector('.fx-num.hit');
      const o = {
        hitColor: getComputedStyle(hit).color, hitSize: parseFloat(getComputedStyle(hit).fontSize),
        flash: foe.classList.contains('flash-hit'), overlay: getComputedStyle(foe.querySelector('.seal-av'), '::after').animationName,
        overlayDur: getComputedStyle(foe.querySelector('.seal-av'), '::after').animationDuration, shakeOnHit: foe.classList.contains('shake'),
      };
      replayStep(); await until('#pl-foe .fx-num.crit'); await until('#pl-me .fx-num.dodge');
      const foe2 = document.getElementById('pl-foe'), crit = foe2.querySelector('.fx-num.crit'), dg = document.querySelector('#pl-me .fx-num.dodge');
      const cs = getComputedStyle(crit);
      Object.assign(o, {
        critSize: parseFloat(cs.fontSize), critColor: cs.color, critWeight: cs.fontWeight, critAnim: cs.animationName,
        shake: foe2.classList.contains('shake'), shakeAnim: getComputedStyle(foe2).animationName, shakeDur: getComputedStyle(foe2).animationDuration,
        dodgeColor: dg && getComputedStyle(dg).color, dodgeAnim: dg && getComputedStyle(dg).animationName,
        meShake: document.getElementById('pl-me').classList.contains('shake'),
      });
      return o;
    });
    ok('1 일반 피해 숫자는 주황·적색', /rgb\(255, 122, 77\)/.test(vis.hitColor), vis.hitColor);
    ok('1 적중 시 0.1초 섬광 오버레이', vis.flash && vis.overlay === 'hitOverlay' && vis.overlayDur === '0.1s', `${vis.overlay} ${vis.overlayDur}`);
    ok('1 일반 적중은 잔떨림 없음', !vis.shakeOnHit);
    ok('1 치명타 숫자 1.5배·굵은 금색·떨림', Math.abs(vis.critSize / vis.hitSize - 1.5) < 0.05 && vis.critWeight === '900' && /rgb\(255, 210, 74\)/.test(vis.critColor) && vis.critAnim === 'fxCrit', JSON.stringify([vis.critSize, vis.hitSize, vis.critColor, vis.critWeight, vis.critAnim]));
    ok('1 치명·강타 → 0.15초 shake', vis.shake && vis.shakeAnim === 'shake' && vis.shakeDur === '0.15s', `${vis.shakeAnim} ${vis.shakeDur}`);
    ok('1 회피는 청록색으로 솟구침·흔들림 없음', /rgb\(110, 231, 216\)/.test(vis.dodgeColor) && vis.dodgeAnim === 'fxRise' && !vis.meShake, `${vis.dodgeColor} ${vis.dodgeAnim}`);
    await p.evaluate(() => { replayStop(); ui.modal = null; S.expeditions.pop(); render(); });

    // 움직임 줄이기 설정 존중
    const rm = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    await rm.goto(GAME_URL); await rm.click('#begin'); await rm.evaluate(() => { S.settings = S.settings || {}; S.settings.calm = true; }); await rm.click('.ground-tag[data-sub="hall"]');   // 기기 설정이 아니라 게임 설정 '차분히'를 따른다
    ok('차분히 설정: 타자기 생략', await rm.evaluate(() => document.querySelectorAll('.typing').length === 0 && document.querySelector('[data-tw]').textContent.length > 10));
    await rm.close();

    ok('오류/가로스크롤 없음', errs.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), errs.join(' | '));
    await p.close();
  }
};
