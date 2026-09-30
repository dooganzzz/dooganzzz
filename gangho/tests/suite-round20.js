/* 세계관 개편: 프롤로그·제자 만들기(3대 스탯·입문 무공·보조 기예) · 3대 상성(지형·오행·병기) · 찌꺼기 공양 가챠 · 심상수련장 · 요수 도감 */
'use strict';
const { ok, GAME_URL, watchErrors, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);

    // 1. 프롤로그 · 제자 만들기
    const i0 = await p.evaluate(() => ({ pro: [...document.querySelectorAll('.prologue p')].map(e => e.textContent).join(' '), rows: document.querySelectorAll('.attr-row').length, plus: [...document.querySelectorAll('[data-attr][data-d="1"]')].every(e => e.disabled), begin: !document.querySelector('#begin').disabled, talents: document.querySelectorAll('[data-talent]').length, starters: document.querySelectorAll('[data-starter]').length }));
    ok('1 프롤로그: 소설 속 청풍문 무신상에 빙의한 나', /강호견문록/.test(i0.pro) && /무신상/.test(i0.pro) && /청풍문/.test(i0.pro) && /제자/.test(i0.pro), i0.pro.slice(0, 60));
    ok('1 4대 스탯(근력·체력·민첩·지력) · 입문 무공 5종 · 기예 2종(단조·단약)', i0.rows === 4 && i0.starters === 5 && i0.talents === 2, JSON.stringify(i0));
    ok('1 처음엔 남은 점수 0 → ＋ 막힘, 바로 시작 가능', i0.plus && i0.begin);
    await p.click('[data-attr="int"][data-d="-1"]');
    const i1 = await p.evaluate(() => ({ left: document.querySelector('#attrLeft').textContent, begin: document.querySelector('#begin').disabled, plus: !document.querySelector('[data-attr="str"][data-d="1"]').disabled }));
    ok('1 한 점 빼면 남은 점수 1 · 시작 막힘 · ＋ 열림', i1.left === '1' && i1.begin && i1.plus, JSON.stringify(i1));
    await p.click('[data-attr="str"][data-d="1"]');
    for (let i = 0; i < 4; i++) await p.click('[data-attr="con"][data-d="-1"]').catch(() => {});
    ok('1 한 스탯은 3 아래로 못 내림', await p.evaluate(() => document.querySelector('[data-attrrow="con"] .attr-val').textContent === '3' && document.querySelector('[data-attr="con"][data-d="-1"]').disabled));
    for (let i = 0; i < 3; i++) await p.click('[data-attr="str"][data-d="1"]');
    ok('1 효과 미리보기', await p.evaluate(() => /공격력 \+8/.test(document.querySelector('[data-attrrow="str"] .attr-eff').textContent)));
    await p.click('[data-starter="samjaeChang"]'); await p.click('[data-talent="alchemy"]');
    await p.fill('#pname', '석상제자');
    await p.click('#begin');
    const s0 = await p.evaluate(() => { const st = calcStats(); return { attr: S.attr, talent: S.talent, alch: S.crafts.alchemy.lv, forge: S.crafts.forge.lv, name: S.name, weapon: S.equip.weapon.wtype, atk: st.atk, hp: st.maxHp, mp: st.maxMp, log: S.log.some(l => /무신상/.test(l.text)) }; });
    ok('1 배분 반영: 근력 10 · 체력 3 · 민첩 6 · 지력 5', s0.attr.str === 10 && s0.attr.con === 3 && s0.attr.agi === 6 && s0.attr.int === 5, JSON.stringify(s0.attr));
    ok('1 주력 기예 단약 → 두 기예 모두 9품(1단계)부터', s0.talent === 'alchemy' && s0.alch === 1 && s0.forge === 1, JSON.stringify(s0));
    ok('1 입문 무공 = 첫 병기 (창) · 첫 기록은 석상 시점', s0.weapon === 'spear' && s0.name === '석상제자' && s0.log, JSON.stringify(s0));
    const st = await p.evaluate(() => {
      const base = () => { const s = calcStats(); return { atk: s.atk, hp: s.maxHp, mp: s.maxMp, def: s.def, bag: s.bag }; };
      const keep = { ...S.attr }; S.attr = { str: 6, con: 6, agi: 6, int: 6 }; const a = base();
      S.attr = { str: 7, con: 6, agi: 6, int: 5 }; const b2 = base(); S.attr = { str: 6, con: 8, agi: 6, int: 4 }; const c = base(); S.attr = keep;
      const bad = [validAttr({ str: 10, con: 10, agi: 10, int: 10 }), validAttr({ str: 2, con: 8, agi: 6, int: 8 }), validAttr({ str: 6, con: 6, agi: 6, int: 6 })];
      const ns = newState('x', 'samjaeGeom', { attr: { str: 20, con: 0, agi: 6, int: -2 }, talent: 'nope' });
      return { d: { atk: b2.atk - a.atk, bag: b2.bag - a.bag, mp: b2.mp - a.mp }, c: { hp: c.hp - a.hp, def: c.def - a.def }, bad, ns: { attr: ns.attr, talent: ns.talent } };
    });
    ok('1 근력 +1 → 공격력 +2 · 적재량 +6 / 지력 -1 → 내력 -6', st.d.atk === 2 && st.d.bag === 6 && st.d.mp === -6, JSON.stringify(st.d));
    ok('1 체력 +2 → 활력 +24 · 방어 증가', st.c.hp === 24 && st.c.def >= 1, JSON.stringify(st.c));
    ok('1 배분 검증 (합계 24 · 3~10) · 잘못된 값은 기본 6/6/6/6', st.bad.join() === 'false,false,true' && st.ns.attr.str === 6 && st.ns.attr.agi === 6 && st.ns.talent === null, JSON.stringify(st));

    await p.evaluate(() => { for (const k of Object.keys(S.inv).filter(k => ITEMS[k].kind === '비급')) learnManual(k); for (const id of Object.keys(S.manuals)) equipManual(id); ui.modal = null; render(); });

    // 2. 오행 상성
    const el = await p.evaluate(() => {
      const r = {};
      r.beats = Object.entries(ELEM_BEATS).map(([a, b]) => `${ELEMENTS[a].hanja}剋${ELEMENTS[b].hanja}`).join(',');
      r.rel = [elemRel('metal', 'wood'), elemRel('wood', 'metal'), elemRel('earth', 'metal'), elemRel(null, 'wood')].join();
      r.me = myElem();                                  // 철포삼 = 金
      const keepInt = S.attr.int; S.attr.int = 6;         // 지력 기준값에서 비교
      // 청령목괴 = 木·창, 내 병기 = 창 → 병기는 호각이라 오행만 본다
      const A = affinity('treant'), B = affinity('eliteAxe'), C = affinity('boar');
      r.up = Math.round((1 + AFFINITY.elem + calcStats().elem / 100) * 1000) / 1000;   // 지력·비급 각인의 오행 위력 포함
      r.rabbit = [A.el, Math.round(A.dealt * 1000) / 1000, A.taken, A.wp]; r.bandit = [B.el, B.foe]; r.boar = C.el;
      S.attr.int = 10; r.int = affinity('treant').dealt; S.attr.int = 6;
      // 같은 난수로 한 대: 상극 우세 vs 상성 없음
      const R = Math.random; Math.random = () => 0.5;
      const mk = eid => ({ eid, e: { ...ENEMIES[eid], hpNow: 1e9 }, lines: [], fx: [], st: calcStats(), over: false, aff: affinity(eid) });
      const hit = bt => { RT.battle = bt; playerHit(bt, 1, '평타'); return 1e9 - bt.e.hpNow; };
      const x = mk('treant'), y = mk('treant'); y.aff = NO_AFF; r.ratio = Math.round(hit(x) / hit(y) * 100) / 100;
      Math.random = R; RT.battle = null; S.attr.int = keepInt;
      return r;
    });
    ok('2 오행 상극: 木剋土 · 火剋金 · 土剋水 · 金剋木 · 水剋火', el.beats.split(',').sort().join() === '木剋土,水剋火,火剋金,土剋水,金剋木'.split(',').sort().join(), el.beats);
    ok('2 극하면 1, 극당하면 -1, 상생·무속성 0', el.rel === '1,-1,0,0', el.rel);
    ok('2 金 기공 vs 木 청령목괴: 주는 피해 ×(1.25 + 오행 위력) · 받는 피해 ×0.75', el.me === 'metal' && el.rabbit[0] === 1 && el.rabbit[1] === el.up && el.up >= 1.25 && el.rabbit[2] === 0.75 && el.rabbit[3] === 0, JSON.stringify(el));
    ok('2 金 기공 vs 火 정예 도부수: 극당함', el.bandit[0] === -1 && el.bandit[1] === 'fire', JSON.stringify(el));
    ok('2 지력이 높으면 극할 때 위력 추가', el.int > el.up, String(el.int));
    ok('2 실제 타격에 반영 (같은 난수 기준 주는 피해 배율만큼)', Math.abs(el.ratio - el.up) < 0.03, `${el.ratio} / ${el.up}`);

    // 3. 병기 상성
    const wp = await p.evaluate(() => {
      const pairs = [['fist', 'blade'], ['fist', 'hidden'], ['fist', 'spear'], ['spear', 'fist'], ['spear', 'blade'], ['spear', 'hidden'], ['sword', 'hidden'], ['blade', 'spear'], ['blade', 'fist'], ['hidden', 'fist'], ['hidden', 'blade'], ['hidden', 'spear'], ['sword', 'blade']];
      const m = pairs.map(([a, b]) => weaponRel(a, b));
      const anti = Object.keys(WEAPON_ADV).every(a => Object.keys(WEAPON_ADV).every(b => a === b || weaponRel(a, b) === -weaponRel(b, a)));
      const keep = S.equip.weapon.wtype, r = {};
      S.equip.weapon.wtype = 'spear'; const A = affinity('diver'); r.spearVsHidden = [A.wp, A.myHit];   // 향주 = 암기
      S.equip.weapon.wtype = 'sword'; const B = affinity('diver'); r.swordVsHidden = [B.wp, B.myHit, Math.round(B.dealt / (B.el > 0 ? 1.25 : B.el < 0 ? 0.75 : 1) * 100) / 100];
      S.equip.weapon.wtype = 'fist'; const C = affinity('eliteAxe'); r.fistVsBlade = C.wp;
      S.equip.weapon.wtype = 'hidden'; const D = affinity('eliteAxe'); r.hiddenVsBlade = [D.wp, D.foeHit];
      const E = affinity('wildcat'); r.beast = [E.wp, E.fwt];   // 살쾡이 = 권장(발톱), 내 병기 = 암기
      S.equip.weapon.wtype = keep;
      return { m: m.join(), anti, r };
    });
    ok('3 권장›검/도 · 권장‹암기 · 창›권장 · 창‹검/도 · 창=암기 · 검/도›암기·창 · 검/도‹권장 · 암기›권장 · 암기‹검/도', wp.m === '1,-1,-1,1,-1,0,1,1,-1,1,-1,0,0', wp.m);
    ok('3 상성표가 서로 맞물림 (한쪽 우세 = 다른 쪽 열세)', wp.anti);
    ok('3 우세: 공격력 +15% · 명중 +10', wp.r.swordVsHidden[0] === 1 && wp.r.swordVsHidden[1] === 10 && wp.r.swordVsHidden[2] === 1.15, JSON.stringify(wp.r));
    ok('3 열세: 상대 명중 보정 · 호각은 보정 없음', wp.r.hiddenVsBlade[0] === -1 && wp.r.hiddenVsBlade[1] === 10 && wp.r.spearVsHidden[0] === 0 && wp.r.spearVsHidden[1] === 0, JSON.stringify(wp.r));
    ok('3 짐승도 병기 계열이 있다 (살쾡이 발톱 = 권장 → 암기 우세)', wp.r.beast[0] === 1 && wp.r.beast[1] === 'fist', JSON.stringify(wp.r));

    // 4. 지형 상성 (기력 소모)
    const tr = await p.evaluate(() => {
      const r = { terr: myTerrain(), terrains: Object.keys(TERRAINS).join(), zones: ZONE_ORDER.map(z => ZONES[z].terrain.join('/')) };
      r.mult = ZONE_ORDER.map(terrainMult).join();              // 포철삭(흙): 청풍산 흙·풀·나무 일치, 염화채 흙·평 일치, 적룡방 물·나무 불일치
      const g = S.active.gyeonggong; S.active.gyeonggong = null; r.none = terrainMult('cheongpung'); S.active.gyeonggong = g;
      const run = () => { S.expedition.zone = 'cheongpung'; S.stamina = 100; S.inv.saenghyeol = 20; return runExpedition(now()); };
      const a = [], m = [];
      for (let i = 0; i < 4; i++) a.push(run());
      S.manuals.dapsu = { star: 1 }; equipManual('dapsu');     // 답수보(물) → 청풍산 불일치
      r.dapsu = terrainMult('cheongpung');
      for (let i = 0; i < 4; i++) m.push(run());
      S.manuals.deungsu = { star: 1 }; equipManual('deungsu'); r.deungsu = terrainMult('cheongpung');   // 등수보(나무) → 복합 지형 중 하나 일치
      equipManual('pocheolsak');
      const steps = rs => rs.reduce((x, rec) => x + rec.steps.filter(s => s.k !== 'trap' && s.k !== 'retreat' && s.k !== 'avoid').length, 0) / rs.length;
      r.match = { mult: a[0].terrain.mult, steps: steps(a), extra: a.every(x => x.terrain.extra < 0), rec: a[0].terrain.match === true && a[0].terrain.zone.join() === 'earth,grass,wood' };
      r.miss = { mult: m[0].terrain.mult, steps: steps(m), extra: m.every(x => x.terrain.extra > 0), rec: m[0].terrain.match === false };
      return r;
    });
    ok('4 5대 지형 (풀·물·흙·나무·평) · 청풍산 = 흙/풀/나무 복합', tr.terrains === 'grass,water,earth,wood,plain' && tr.zones[0] === 'earth/grass/wood', JSON.stringify(tr));
    ok('4 경공 지형이 구역 지형 중 하나라도 맞으면 ×0.8, 아니면 ×1.2, 경공 없으면 보정 없음', tr.terr === 'earth' && tr.mult === '0.8,0.8,1.2' && tr.none === 1 && tr.dapsu === 1.2 && tr.deungsu === 0.8, JSON.stringify(tr));
    ok('4 탐험 기록에 지형 일치 여부 · 기력 증감', tr.match.rec && tr.miss.rec && tr.match.extra && tr.miss.extra, JSON.stringify(tr));
    ok('4 지형이 맞으면 같은 걸음에 기력을 덜 쓴다 (×0.8 / ×1.2)', tr.match.mult < 1 && tr.miss.mult > 1 && tr.match.mult < tr.miss.mult && tr.match.extra && tr.miss.extra, JSON.stringify(tr));
    await p.evaluate(() => { ui.modal = null; goTab('field'); render(); });
    ok('4 탐험 기록 결산 줄 · 구역 카드 지형 표식', await p.evaluate(() => /지형 흙\(土\)·풀\(草\)·나무\(木\) · 경공 (흙|물|나무) (일치|불일치)/.test(document.querySelector('.tr-line').textContent) && document.querySelectorAll('.zone-terrain .aff-tag.tr').length >= 3));
    ok('4 출정 준비에 상성 줄 (기공 오행 · 경공 지형 · 병기)', await p.evaluate(() => { const li = [...document.querySelectorAll('.prep li')].find(l => l.querySelector('.prep-k').textContent === '상성'); return !!li && /金/.test(li.textContent) && /흙/.test(li.textContent) && /창/.test(li.textContent); }));
    ok('4 전투 기록 첫머리에 상성 한 줄', await p.evaluate(() => S.expeditions.some(r => r.battles.some(bt => bt.intro.some(l => l.cls === 'aff' && /오행/.test(l.text) && /병기/.test(l.text))))));

    // 5. 조합 실패물 → 검게 탄 찌꺼기 · 무신상 공양
    const gc = await p.evaluate(() => {
      const r = {};
      r.fails = [...new Set(Object.values(CRAFTS).map(c => c.fail))].join();
      r.old = ['twistedIron', 'burntAsh', 'dregs'].some(k => ITEMS[k]);
      S.inv.slag = 0; for (const c of Object.keys(CRAFTS)) { S.inv.herb = (S.inv.herb || 0) + 3; doCraft(c, { herb: 3 }); }
      r.slag = count('slag');
      S.inv.slag = 2; r.none = pray(1);
      S.inv.slag = 14; const p0 = S.shrine.pulls || 0;
      const got = pray(10); r.got = got.length; r.left = count('slag'); r.pulls = S.shrine.pulls - p0;
      r.kinds = got.every(g => GACHA.table.some(e => e.k === g.k) && g.text);
      // 많이 돌려 분포 확인 (비급은 가진 것 제외)
      S.inv.slag = 3 * 400; const all = pray(400); for (let i = 0; i < 39; i++) all.push(...pray(400) || []);
      r.dist = {}; for (const g of all) r.dist[g.k] = (r.dist[g.k] || 0) + 1;
      r.books = Object.keys(S.inv).filter(k => /^bk_/.test(k)); r.nBooks = GACHA.books.length;
      return r;
    });
    ok('5 모든 기예의 실패물은 검게 탄 찌꺼기 하나', gc.fails === 'slag' && !gc.old && gc.slag === 2, JSON.stringify(gc));
    ok('5 찌꺼기가 모자라면 공양 불가', gc.none === null);
    ok('5 [공양 10회]: 찌꺼기가 모자라면 되는 만큼 (14개 → 4회)', gc.got === 4 && gc.left === 2 && gc.pulls === 4, JSON.stringify(gc));
    ok('5 결과는 약재·소모품·광석·장비·영단·비급 중 하나', gc.kinds && ['herb', 'supply', 'ore', 'gear'].every(k => gc.dist[k] > 0), JSON.stringify(gc.dist));
    ok('5 비급은 드물게 · 같은 비급은 두 번 나오지 않음', (gc.dist.book || 0) <= gc.nBooks && new Set(gc.books).size === gc.books.length, JSON.stringify(gc.books));
    await p.evaluate(() => { S.inv.slag = 7; S.statueResidueCount = 0; ui.modal = null; goTab('sect', 'shrine'); render(); });   // 위 표본 공양으로 무신이 깨어났으면 창을 닫는다
    const sh = await p.evaluate(() => ({ one: !document.querySelector('[data-pray="1"]').disabled, ten: !document.querySelector('[data-pray="10"]').disabled, me: /나/.test(document.querySelector('.altar .pill').textContent), rate: document.querySelectorAll('.gacha-table li').length, purify: !!document.querySelector('.purify') }));
    await p.click('[data-pray="1"]'); await p.click('[data-act="confirmok"]');
    const sh2 = await p.evaluate(() => ({ res: document.querySelectorAll('.gacha-res li').length, slag: count('slag'), log: /공양/.test(S.log[S.log.length - 1].text) }));
    ok('5 무신상(나) 화면: 공양 1회/10회 · 확률표 없음 · 탁기 정화 게이지', sh.one && sh.ten && sh.me && sh.rate === 0 && sh.purify, JSON.stringify(sh));
    ok('5 공양하면 돌아온 것 표시 · 견문록 기록', sh2.res === 1 && sh2.slag === 4 && sh2.log, JSON.stringify(sh2));

    // 6. 심상수련장
    await p.click('.subtabs [data-sub="yeonmu"]');
    const ym = await p.evaluate(() => ({ view: !!document.querySelector('.yeonmu'), rows: [...document.querySelectorAll('.sim-row')].map(r => r.querySelector('b').textContent), met: Object.keys(S.bestiary).map(e => ENEMIES[e].name) }));
    ok('6 연무장 › 심상수련장: 만나 본 상대만 목록에', ym.view && ym.rows.length === ym.met.length && ym.rows.every(n => ym.met.includes(n)) && !ym.rows.includes('수룡방주 벽해룡'), JSON.stringify(ym));
    const sim = await p.evaluate(() => {
      const snap = () => JSON.stringify({ hp: S.hp, mp: S.mp, exp: S.exp, silver: S.silver, inv: S.inv, best: S.bestiary, log: S.log.length, sta: S.stamina, kills: S.kills });
      S.inv.saenghyeol = 5; const before = snap();
      const foe = Object.keys(S.bestiary)[0], bt = simulate(foe), many = simulateMany(foe, 10);
      return { same: snap() === before, sim: bt.sim, over: bt.over, unknown: simulate('byeokhaeryong'), many };
    });
    ok('6 가상 전투: 기력·수련치·은자·행낭·도감·견문록 모두 그대로', sim.same && sim.sim && sim.over, JSON.stringify(sim));
    ok('6 만나 본 적 없는 상대는 불러낼 수 없음', sim.unknown === null);
    ok('6 10판 모의: 승·패·평균 합', sim.many.n === 10 && sim.many.wins + sim.many.draws <= 10 && sim.many.rounds > 0, JSON.stringify(sim.many));
    await p.click('.sim-row [data-simx]');
    ok('6 [10판 모의] → 결과 줄', await p.evaluate(() => /10판 모의: \d+승/.test(document.querySelector('.sim-stat').textContent)));
    await p.click('.sim-row [data-sim]');
    const rp = await p.evaluate(() => ({ modal: ui.modal, eyebrow: document.querySelector('#rpBox .eyebrow').textContent, aff: [...document.querySelectorAll('#rpLog p')].some(l => /상성/.test(l.textContent)), tag: !!document.querySelector('#pl-foe .aff-tag') }));
    ok('6 [겨루기] → 관찰 창으로 재생 (심상 · 보상 없음 · 상성 줄)', rp.modal === 'replay:sim' && /心象/.test(rp.eyebrow) && rp.aff && rp.tag, JSON.stringify(rp));
    await p.click('[data-rp="end"]'); await p.click('#rpBox [data-act="closemodal"]');

    // 7. 요수 도감 · 무공 상성 표식
    await p.click('[data-tab="codex"]');
    const cx = await p.evaluate(() => ({ known: document.querySelectorAll('.beasts li:not(.unknown)').length, unknown: document.querySelectorAll('.beasts li.unknown').length, met: Object.keys(S.bestiary).filter(e => ZONE_ORDER.some(z => [...ZONES[z].enemies, ZONES[z].boss].includes(e))).length, total: document.querySelectorAll('.beasts li').length, tag: !!document.querySelector('.beasts .aff-tag') }));
    ok('7 요수 도감: 만난 요수만 오행·병기와 함께 (못 만난 요수·총수 숨김)', cx.known === cx.met && cx.unknown === 0 && cx.total === cx.met && cx.tag, JSON.stringify(cx));
    await p.click('[data-tab="status"]'); await p.click('[data-sub="martial"]');
    ok('7 무공 칸에 기공 오행 · 경공 지형 표식', await p.evaluate(() => /金/.test(document.querySelector('.mslot .aff-tag.el-metal').textContent) && !!document.querySelector('.mslot .aff-tag.tr')));
    await p.evaluate(() => { ui.modal = 'mart:' + S.active.gigong; renderModal(); });
    ok('7 기공 상세: 극하는 오행 · 극당하는 오행', await p.evaluate(() => /木 속성 적에게 피해 \+25%/.test(document.querySelector('.sheet').textContent) && /火 속성 적에게는 -25%/.test(document.querySelector('.sheet').textContent)));
    await p.evaluate(() => { ui.modal = null; ui.statusSub = 'gear'; render(); });
    ok('7 전투력 카드 아래 4대 스탯 · 주력 기예', ...(await p.evaluate(() => { const t = document.querySelector('.cp-attr').textContent; return [t.includes(`근력 ${attrOf('str')}`) && t.includes(`민첩 ${attrOf('agi')}`) && /기예 단약/.test(t), t + ' / 민첩 ' + attrOf('agi')]; })));   // 비급 각인이 더해진 값

    // 8. 주력 기예 효과
    const tl = await p.evaluate(() => {
      const r = {}, keep = S.talent;
      const heal = t => { S.talent = t; const bt = { st: calcStats(), fx: [], lines: [], sim: true, pots: { hp: 1, mp: 0 } }; RT.battle = bt; S.hp = 1; autoPotion(bt); RT.battle = null; return S.hp - 1; };
      r.alchemy = heal('alchemy'); r.plain = heal(null);
      r.noChef = !TALENTS.chef && !CRAFTS.cook;
      S.talent = 'forge'; r.forge = talentOf().rate === 10 && talentOf().craft === 'forge' && talentOf().slag === 2;
      S.talent = 'alchemy'; r.alch = talentOf().rate === 10 && talentOf().craft === 'alchemy';
      r.keys = Object.keys(TALENTS).join();
      S.talent = keep;
      return r;
    });
    ok('8 단약: 생혈고 회복 +15%', Math.abs(tl.alchemy / tl.plain - 1.15) < 0.03, JSON.stringify(tl));
    ok('8 조리 기예·보조 기예 조리 없음', tl.noChef, JSON.stringify(tl));
    ok('8 기예는 단조·단약 둘: 성공률 +10 · 단조는 찌꺼기 2배', tl.keys === 'forge,alchemy' && tl.forge && tl.alch, JSON.stringify(tl));

    // 9. 예전 저장 이전
    const mig = await p.evaluate(() => {
      const old = JSON.parse(JSON.stringify(S)); delete old.attr; delete old.talent; delete old.bestiary; delete old.shrine.pulls;
      old.inv.twistedIron = 2; old.inv.burntAsh = 1; old.inv.dregs = 3; old.inv.slag = 1;
      old.zoneLog = { cheongpung: { trips: 1, wins: 3, losses: 0, defeats: 0, retreats: 0, seen: { rabbit: 2, wildcat: 1 }, bossMet: 0, bossWon: 0 } };
      const st = migrate(old);
      return { attr: st.attr, talent: st.talent, slag: st.inv.slag, old: ['twistedIron', 'burntAsh', 'dregs'].some(k => k in st.inv), best: st.bestiary, pulls: st.shrine.pulls };
    });
    ok('9 이전 저장: 스탯 6/6/6 · 기예 없음 · 부산물 → 찌꺼기 · 도감은 구역 기록에서', mig.attr.str === 6 && mig.talent === null && mig.slag === 7 && !mig.old && mig.best.rabbit.met === 2 && mig.best.wildcat.met === 1 && mig.pulls === 0, JSON.stringify(mig));

    ok('오류/가로스크롤 없음', !errs.length && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), errs.join(';'));
    await p.close();
  }
};
