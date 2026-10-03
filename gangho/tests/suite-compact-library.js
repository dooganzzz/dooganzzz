/* 원스크린 컴팩트 · 비급 각인 · 관찰 창 확대 · 토벌 임무 · 장보각 3탭 · 무신상 각성 · 요수 4단계 · 행동 확인 창 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    // 1. 비급 독파 영구 각인: 장착 여부와 무관, 도감 탭 이름은 비급
    const pb = await p.evaluate(() => {
      const r = { all: Object.values(MANUALS).every(M => M.passiveBonus && Object.keys(M.passiveBonus).length) };
      const a0 = attrOf('agi'); unequipManual('gyeonggong'); r.keep = attrOf('agi') === a0; equipManual('gy1a');
      r.rules = [MANUALS.fs1a.passiveBonus, MANUALS.sp1a.passiveBonus, MANUALS.sm1a.passiveBonus, MANUALS.gy1a.passiveBonus, MANUALS.gi1a.passiveBonus].map(o => JSON.stringify(o)).join(' ');
      return r;
    });
    ok('1 모든 비급에 passiveBonus · 장착 해제해도 각인 유지', pb.all && pb.keep, JSON.stringify(pb));
    ok('1 계열 규칙: 권장 근력·방어 · 창 체력·관통 · 심법 내력·회복률 · 경공 민첩·회피 · 기공 지력·오행', pb.rules === '{"str":1,"def":2} {"con":1,"pierce":2} {"maxMp":15,"mpRegenPct":2} {"agi":1,"eva":0.5} {"int":1,"elem":3}', pb.rules);
    await p.click('[data-tab="codex"]'); await p.click('[data-codextab="martial"]');
    const cx = await p.evaluate(() => ({ tab: document.querySelector('[data-codextab="martial"] .ko').textContent, lede: document.querySelector('.codex-panel p.muted').textContent, sum: !!document.querySelector('.passive-sum') }));
    ok('1 도감 [비급 秘笈] · 영구 각인 안내 · 합계', cx.tab === '비급' && /몸에 영구히 각인/.test(cx.lede) && cx.sum, JSON.stringify(cx));

    // 2. 장문인 토벌 임무: 단계마다 SUBQ.kills번 이기면 보상 · 하루 SUBQ.daily번까지
    const ms = await p.evaluate(() => {
      const r = {}, c0 = S.contrib; S.subqCur = null; S.subqDay = null;
      r.noQuest = !subqReady(); acceptSubq('cheongpung', 1);
      for (let i = 0; i < SUBQ.kills; i++) subqAdd('cheongpung', 1);
      r.ready = subqReady(); r.got = claimSubq() && S.contrib > c0 && !subqCur();
      let n = 1; for (let k = 0; k < SUBQ.daily + 2; k++) { acceptSubq('cheongpung', 1); for (let i = 0; i < SUBQ.kills; i++) subqAdd('cheongpung', 1); if (claimSubq()) n++; }
      r.n = n; r.daily = SUBQ.daily; r.left = subqLeft(); r.blocked = !acceptSubq('cheongpung', 1);
      return r;
    });
    ok('2 토벌 임무: 장문인에게 받아 다 채우면 보상 · 공헌도 오름', ms.noQuest && ms.ready && ms.got, JSON.stringify(ms));
    ok('2 토벌 임무는 하루 정해진 횟수까지 (다 하면 더 못 받음)', ms.n === ms.daily && ms.left === 0 && ms.blocked, JSON.stringify(ms));

    // 3. 장보각 3탭 · 이류 장비 (4대 스탯 보정 포함) · 공헌도
    await p.evaluate(() => { S.contrib = 1000; goTab('sect', 'hall'); ui.fold.library = false; render(); });
    const lt = {};
    for (const t of ['equipment', 'skills', 'tokens']) { await p.click(`[data-libtab="${t}"]`); lt[t] = await p.evaluate(() => [...document.querySelectorAll('.lib-grid .lib-item b')].map(e => e.textContent).join(',')); }
    const ir = await p.evaluate(() => LIBRARY_BOOKS.map(id => MANUALS[id]).filter(M => M.grade === '이류').map(M => M.name));   // 이류 비급, 분류마다 하나씩
    ok('3 장보각 [장비] 7 · [무공] 이류 분류마다 하나(8) · [제자패] 2', lt.equipment.split(',').length === 7 && ir.length === 8 && lt.skills.split(',').length === ir.length && ir.every(n => lt.skills.includes(n)) && lt.tokens.split(',').length === 2, JSON.stringify(lt));
    ok('3 제자패 공헌도 120 · 350', await p.evaluate(() => SHOP_GEAR.find(g => g.id === 'badge2').cost === 120 && SHOP_GEAR.find(g => g.id === 'badge3').cost === 350));
    await p.click('[data-libtab="equipment"]');
    await p.click('[data-buylib="lg_sword"]');
    const cf = await p.evaluate(() => ({ modal: ui.modal, details: [...document.querySelectorAll('.confirm-details li')].map(e => e.textContent).join(' / ') }));
    ok('3 교환 전 확인 창: 공헌도 소모 요약', cf.modal === 'confirm' && /공헌도 -300/.test(cf.details), JSON.stringify(cf));
    await p.click('[data-act="confirmok"]');
    const lg = await p.evaluate(() => { const it = S.gear.find(g => g.shop === 'lg_sword'); const a0 = attrOf('agi'); equipItem(it.uid); return { got: !!it, contrib: S.contrib, agi: attrOf('agi') - a0, rarity: it.rarity, tier: it.tier }; });
    ok('3 청풍비검: 공헌 -300 · 중급(이류) · 민첩 +1', lg.got && lg.contrib === 700 && lg.agi === 1 && lg.rarity === 1 && lg.tier === 2, JSON.stringify(lg));

    // 4. 새 전투 규칙: 충격 · 선공 · 방어 무시 · 최소 피해 20% · 역상성 +15%
    const cb = await p.evaluate(() => {
      const r = {};
      const E = ENEMIES.turtle, keep = { ...E };
      S.hp = 99999; const mk = { ...S.equip };
      r.minDmg = COMBAT_RULES.minDmg === 0.2 && COMBAT_RULES.elemPenalty === 0.15;
      const a = affinity('slinger');   // 火 투석수 vs 金 기공 → 역상성
      const wpF = a.wp < 0 ? 1 + AFFINITY.weapAtk : a.wp > 0 ? 1 - AFFINITY.weapDown : 1;
      r.inverse = a.el === -1 && Math.abs(a.taken - (1 + AFFINITY.elem) * 1.15 * wpF) < 0.01;
      r.first = !ENEMIES.slinger.first && !ENEMIES.slinger.hits && ENEMIES.slinger.pierce > 0 && Object.values(ENEMIES).some(e => e.first === true);   // 투석수: 초보 벽이라 선공 · 연투를 뺌 (10월 2일), 선공 규칙은 다른 요수가 씀
      Object.assign(E, keep); S.equip = mk; S.hp = calcStats().maxHp;
      return r;
    });
    ok('4 강적 최소 피해 20% · 역상성 받는 피해 +15% · 위험 강적 선공·관통', cb.minDmg && cb.inverse && cb.first, JSON.stringify(cb));
    const lose = await p.evaluate(() => { const k = ENEMIES.slinger.atk; ENEMIES.slinger.atk = 999; S.hp = 50; const bt = fight('slinger', { sim: true }); ENEMIES.slinger.atk = k; S.hp = calcStats().maxHp; return { win: bt.win, cause: bt.cause, known: Object.values(DEFEAT_CAUSE).includes(bt.cause) }; });
    ok('4 패배하면 원인을 남긴다', !lose.win && lose.known, JSON.stringify(lose));

    // 5. 무신상: 확률표 없음 · 탁기 정화 300 · 각성 보상
    await p.evaluate(() => { S.inv.slag = 30; S.statueResidueCount = 290; ui.modal = null; goTab('sect', 'shrine'); render(); });
    ok('5 확률표 없음 · 탁기 정화 게이지', await p.evaluate(() => !document.querySelector('.gacha-table') && /290 \/ 300/.test(document.querySelector('.purify').textContent)));
    const hp0 = await p.evaluate(() => S.perm.maxHp);
    await p.click('[data-pray="10"]'); await p.click('[data-act="confirmok"]');
    const aw = await p.evaluate(() => ({ modal: ui.modal, left: S.statueResidueCount, hp: S.perm.maxHp, scraps: count('scrap2') + count('scrap3'), log: S.log.some(l => /무신의 응답/.test(l.text)) }));
    ok('5 누적 300 → 각성: 초과분 보존 · 영구 능력치 없음 · 비급 조각 1장 · 각성 창', aw.modal === 'awaken' && aw.left === 20 && aw.hp === hp0 && aw.scraps === 1 && aw.log, JSON.stringify(aw));
    // 5-1. 화로 › 연혼: 조각 8장 → 그 등급 비급 한 권 (이류 90% · 일류 10%)
    const st = await p.evaluate(() => { const T = GACHA.awakenScrap; S.inv.scrap2 = 7; const no = studyBind('scrap2'); S.inv.scrap2 = 8; const id = studyBind('scrap2'); return { T, no, grade: id && MANUALS[id].grade, left: count('scrap2'), book: id && count('bk_' + id) }; });
    ok('5 연혼: 조각 7장은 못 엮음 · 8장 → 이류 비급 1권 · 확률 90/10', st.no === null && st.grade === '이류' && st.left === 0 && st.book >= 1 && st.T.scrap2 === 90 && st.T.scrap3 === 10, JSON.stringify(st));
    await p.click('.awaken-sheet [data-act="closemodal"]');

    // 6. 관찰 창: 크게, 로그가 대부분
    await p.evaluate(() => { S.expedition.zone = 'cheongpung'; S.hp = 1e9; const r = runExpedition(now(), 12); openReplay(r.id + ':0'); });
    await p.waitForSelector('#rpBox', { timeout: 3000 }); await p.waitForTimeout(600);   // 무대 그림을 풀고 열린다 (여는 연출이 끝난 뒤 잰다)
    const rp = await p.evaluate(() => { const bx = document.querySelector('#rpBox').getBoundingClientRect(), lg = document.querySelector('.combat-log-stream').getBoundingClientRect(); return { w: bx.width, h: bx.height, vw: innerWidth, vh: innerHeight, log: lg.height, line: !!document.querySelector('#rpLog .log-line') }; });
    ok('6 관찰 창 폭 92vw(최대 820) · 높이 85vh 안팎 · 무대 아래 로그 칸', rp.w >= Math.min(820, rp.vw * 0.9) - 2 && rp.h >= rp.vh * 0.8 && rp.log > rp.h * 0.25 && rp.line, JSON.stringify(rp));
    await p.evaluate(() => { replayStop(); ui.modal = null; render(); });

    // 7. 행동 확인 창: 되돌릴 수 없는 것만, 취소하면 그대로
    await p.evaluate(() => { S.exp = 9999; goTab('status', 'martial'); render(); });
    const e0 = await p.evaluate(() => S.exp);
    await p.click('.mrow [data-starup]:not([disabled])');
    await p.click('.confirm-sheet [data-act="closemodal"]');
    ok('7 성급 올리기 확인 창 → 취소하면 수련치 그대로', await p.evaluate(e => S.exp === e && !ui.modal, e0));
    await p.evaluate(() => { goTab('sect', 'forge'); ui.craft = 'forge'; S.inv.roughOre = 3; render(); });
    await p.click('[data-add="roughOre"]');
    ok('7 재료 넣기는 확인 없이 바로', await p.evaluate(() => ui.modal === null && potTotal(ui.pot) === 1));
    await p.click('[data-act="craft"]');
    ok('7 단조 시도는 확인 창 (소모 재료 요약)', await p.evaluate(() => ui.modal === 'confirm' && /조철광 ×1/.test(document.querySelector('.confirm-details').textContent)));
    await p.click('.confirm-sheet [data-act="closemodal"]');

    // 8. 컴팩트: 헤더 칩 · 무공 카드
    const cp = await p.evaluate(() => { goTab('status', 'observe'); render(); const b = document.querySelector('#vitals .chip-badge'), bs = { f: parseFloat(getComputedStyle(b).fontSize), h: b.getBoundingClientRect().height }; goTab('status', 'martial'); render(); const s = document.querySelector('.mslot'); return { badge: bs.f, bh: bs.h, pad: getComputedStyle(s).paddingTop, minh: getComputedStyle(s).minHeight }; });
    ok('8 관조 정보 칸 이름 11~12px·한 줄 · 무공 방위 카드는 좁은 여백(10px 이하)', cp.badge >= 10 && cp.badge <= 12 && cp.bh <= 20 && parseFloat(cp.pad) <= 10, JSON.stringify(cp));

    const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
    await p.close();
  }
};
