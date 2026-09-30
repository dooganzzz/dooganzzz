/* 손맛 연출: 피해 숫자·섬광·잔떨림, 수련 광원·기운 입자, 타자기, 지도 호버·도착 스케일 */
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
    const tw0 = await p.evaluate(() => { const el = document.querySelector('[data-tw="npc"]'); return el && { typing: el.classList.contains('typing'), len: el.textContent.length, full: el.textContent }; });
    ok('3 인물 첫 대사가 타자기로 시작', tw0 && tw0.typing, JSON.stringify(tw0));
    await p.waitForTimeout(150);
    const tw1 = await p.evaluate(() => { const el = document.querySelector('[data-tw="npc"].typing'); return el ? el.textContent.length : -1; });
    ok('3 글자가 차례로 늘어남', tw1 > 0 && tw1 > tw0.len, `${tw0.len} → ${tw1}`);
    await p.mouse.click(5, 5);
    const tw2 = await p.evaluate(() => ({ typing: document.querySelectorAll('.typing').length, texts: [...document.querySelectorAll('[data-tw="npc"]')].map(e => e.textContent.length) }));
    ok('3 클릭하면 전부 즉시 표시', tw2.typing === 0 && tw2.texts.every(n => n > 10), JSON.stringify(tw2));
    await p.evaluate(() => { ui.tab = 'sect'; ui.sectSub = 'yard'; render(); ui.tab = 'sect'; ui.sectSub = 'hall'; render(); });
    ok('3 두 번째 방문부터는 바로 전체 문장', (await p.$$('.typing')).length === 0);

    await p.evaluate(() => { for (const k of Object.keys(S.inv).filter(k => ITEMS[k].kind === '비급')) learnManual(k); for (const id of Object.keys(S.manuals)) equipManual(id); ui.tab = 'sect'; ui.sectSub = 'hall'; render(); });

    // 1. 전투 연출
    const logic = await p.evaluate(() => {
      const r0 = Math.random, out = {};
      startBattle('boar'); stopBattleTimer();
      const bt = RT.battle; bt.fx = [];
      Math.random = () => 0.999; enemyTurn(bt); out.dodge = bt.fx[0];
      bt.fx = []; Math.random = () => 0.5; S.hp = 9999; bt.st.critRes = 99; enemyTurn(bt); out.me = bt.fx.find(f => f.side === 'me');
      bt.fx = []; Math.random = () => 0; playerHit(bt, 1, '평타'); out.foe = bt.fx.find(f => f.side === 'foe');
      Math.random = r0;
      return out;
    });
    ok('1 회피 → "회피!" (dodge)', logic.dodge && logic.dodge.t === '회피!' && logic.dodge.k === 'dodge', JSON.stringify(logic.dodge));
    ok('1 약한 피격은 강타 아님', logic.me && logic.me.k === 'hit' && logic.me.big === false, JSON.stringify(logic.me));
    ok('1 치명타는 강타(big)', logic.foe && logic.foe.k === 'crit' && logic.foe.big === true, JSON.stringify(logic.foe));

    const vis = await p.evaluate(async () => {
      RT.battle.fx = [{ side: 'foe', t: '-12', k: 'hit' }]; renderBattle();
      await new Promise(r => setTimeout(r, 30));
      const foe = document.getElementById('pl-foe'), hit = foe.querySelector('.fx-num.hit');
      const o = {
        hitColor: getComputedStyle(hit).color, hitSize: parseFloat(getComputedStyle(hit).fontSize),
        flash: foe.classList.contains('flash-hit'), overlay: getComputedStyle(foe.querySelector('.seal-av'), '::after').animationName,
        overlayDur: getComputedStyle(foe.querySelector('.seal-av'), '::after').animationDuration, shakeOnHit: foe.classList.contains('shake'),
      };
      RT.battle.fx = [{ side: 'foe', t: '-40', k: 'crit', big: true }, { side: 'me', t: '회피!', k: 'dodge' }]; renderBattle();
      await new Promise(r => setTimeout(r, 30));
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
    await p.evaluate(() => { stopBattleTimer(); RT.battle = null; });

    // 2. 연무장
    await p.evaluate(() => { ui.tab = 'sect'; ui.sectSub = 'yeonmu'; render(); });
    await p.click('[data-train]');
    const art = await p.evaluate(() => {
      const t = document.querySelector('.art.training'), q = t && t.querySelector('.qi-rise');
      return { n: document.querySelectorAll('.art.training').length, anim: t && getComputedStyle(t).animationName, parts: q ? q.querySelectorAll('i').length : 0,
        partAnim: q && getComputedStyle(q.querySelector('i')).animationName, haze: q && getComputedStyle(q, '::before').animationName,
        others: document.querySelectorAll('.art:not(.training) .qi-rise').length, clip: t && getComputedStyle(t).overflow };
    });
    ok('2 수련 카드 광원이 숨 쉬듯 (auraBreath)', art.n === 1 && art.anim === 'auraBreath', art.anim);
    ok('2 아래서 위로 기운 입자·아지랑이', art.parts >= 6 && art.partAnim === 'qiUp' && art.haze === 'hazeRise' && art.clip === 'hidden', JSON.stringify(art));
    ok('2 수련 안 하는 카드엔 입자 없음', art.others === 0);
    await p.click('.art.training [data-train]');
    ok('2 수련 중지 시 광원·입자 해제', (await p.$$('.art.training, .qi-rise')).length === 0);

    // 3. 기연 문구도 타자기
    const ev = await p.evaluate(() => {
      if (S.zone) leaveZone(); enterZone('cheongpung'); S.stamina = 100;
      const key = S.zone.layout.flatMap((row, y) => [...row].map((c, x) => c === 'E' ? `${x},${y}` : null)).find(Boolean);
      openEvent(key);
      const el = document.querySelector('.ev-text');
      return { tw: el.dataset.tw, typing: el.classList.contains('typing'), title: document.querySelector('.event-sheet h2').textContent };
    });
    ok('3 기연 문구 타자기', ev.tw === 'ev' && ev.typing, JSON.stringify(ev));
    await p.click('.ev-text');
    ok('3 문구 클릭 → 즉시 전부', await p.evaluate(() => !document.querySelector('.ev-text').classList.contains('typing') && document.querySelector('.ev-text').textContent.length > 10));
    await p.evaluate(() => { ui.modal = null; S.zone.evResult = S.zone.evResult || {}; render(); });

    // 4. 지도
    const mp = await p.evaluate(() => {
      const L = S.zone.layout, pos = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = S.zone.x + dx, ny = S.zone.y + dy;
        if (passable(S.zone.id, nx, ny) && !['T', 'E', 'Y'].includes(tileAt(S.zone.id, nx, ny))) { pos.push([dx, dy]); break; }
      }
      if (!pos.length) return { none: true };
      move(...pos[0]);
      const here = document.querySelector('.map-scroll .cell.here');
      return { step: here.classList.contains('step'), anim: getComputedStyle(here).animationName, dur: getComputedStyle(here).animationDuration };
    });
    ok('4 이동 시 도착 칸 0.2초 scale', mp.none || (mp.step && /stepPop/.test(mp.anim) && /^0\.2s/.test(mp.dur)), JSON.stringify(mp));
    await p.waitForTimeout(320);
    ok('4 도착 연출 뒤 step 해제', (await p.$$('.cell.here.step')).length === 0);
    const hov = {};
    for (const t of ['beast', 'chest', 'gimmick']) {
      await p.evaluate(tp => { const S0 = S.seen[S.zone.id]; S.zone.layout.forEach((row, y) => [...row].forEach((c, x) => { if (c !== '_') S0[`${x},${y}`] = 1; })); render(); }, t);
      const sel = `.map-scroll .cell.${t}:not(.here)`;
      const el = await p.$(sel); if (!el) continue;
      await el.scrollIntoViewIfNeeded(); await el.hover(); await p.waitForTimeout(260);
      hov[t] = await el.evaluate(e => ({ tf: getComputedStyle(e).transform, sh: getComputedStyle(e).boxShadow }));
    }
    const lift = v => v && /matrix\(1, 0, 0, 1, 0, -2\)/.test(v.tf);
    ok('4 호버 시 위로 2px', ['beast', 'chest'].every(k => lift(hov[k])), JSON.stringify(Object.fromEntries(Object.entries(hov).map(([k, v]) => [k, v.tf]))));
    ok('4 요수 붉은빛 광채', hov.beast && /rgba\(230, 80, 60/.test(hov.beast.sh), hov.beast && hov.beast.sh);
    ok('4 금고 황금빛 광채', hov.chest && /rgba\(240, 200, 80/.test(hov.chest.sh), hov.chest && hov.chest.sh);
    ok('4 채집지(기관) 초록빛 광채', !hov.gimmick || /rgba\(110, 210, 120/.test(hov.gimmick.sh), hov.gimmick && hov.gimmick.sh);

    // 움직임 줄이기 설정 존중
    const rm = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    await rm.goto(GAME_URL); await rm.click('#begin');
    ok('움직임 줄이기: 타자기 생략', await rm.evaluate(() => document.querySelectorAll('.typing').length === 0 && document.querySelector('[data-tw]').textContent.length > 10));
    await rm.close();

    ok('오류/가로스크롤 없음', errs.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), errs.join(' | '));
    await p.close();
  }
};
