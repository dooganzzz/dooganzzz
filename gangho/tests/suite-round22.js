/* 3대 사냥터(청풍산·염화채·수룡방) · 요수 30종 · 특수 전투 규칙 · 화로 단조/단약 · 8품 단약 · 도감 4탭 · 숨은 기력과 탐험 루프 · 저장 이전 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

const FOES = {
  yeomhwa: [['화염 살모사', 'fire', 'hidden'], ['적토 늑대', 'earth', 'fist'], ['단애 독수리', 'metal', 'fist'], ['염화채 벌목수', 'wood', 'blade'], ['염화채 정예 도부수', 'fire', 'blade'], ['염화채 화포수', 'fire', 'hidden'], ['염화채 강행 돌격병', 'earth', 'spear'], ['열화 장갑병', 'metal', 'fist'], ['염화석괴', 'fire', 'fist'], ['염화채주 적패천', 'fire', 'blade']],
  suryong: [['수로 청어귀', 'water', 'hidden'], ['뻘밭 흑악어', 'earth', 'fist'], ['수룡방 뗏목 척후', 'water', 'spear'], ['수룡방 투망수', 'metal', 'hidden'], ['수룡방 강습대원', 'water', 'blade'], ['수룡방 수중 잠영수', 'water', 'hidden'], ['수룡방 철퇴수', 'metal', 'fist'], ['소택지 독지네', 'wood', 'spear'], ['빙화수요', 'water', 'hidden'], ['수룡방주 벽해룡', 'water', 'spear']],
};
const GEAR = { c_fist: ['흑철 권갑', { atk: 22, def: 8 }], c_sword: ['청강검', { atk: 28, crit: 3 }], c_blade: ['혈문도', { atk: 32 }], c_spear: ['벽파 삼지창', { atk: 30, pierce: 5 }], c_hidden: ['칠성 투골정', { atk: 25 }], c_armor: ['청강 사슬갑', { def: 24, maxHp: 80 }], c_ring: ['벽옥환', { maxMp: 40, atk: 5 }], c_belt: ['웅모 포대', { def: 10 }], c_jade: ['수정 영옥대', { qiPct: 6, elemRes: 5 }] };

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    // 1. 3대 사냥터
    const ar = await p.evaluate(() => ZONE_ORDER.map(z => ({ id: z, name: ZONES[z].name, terr: ZONES[z].terrain.join('/'), cp: ZONES[z].cp.join('~'), n: ZONES[z].enemies.length + 1, mats: ZONES[z].mats.length })));
    ok('1 청풍산(흙/풀/나무) · 염화채(흙/일반) · 수룡방(물/일반)', ar.map(z => `${z.name}:${z.terr}`).join() === '청풍산:earth/grass/wood,염화채:earth/plain,수룡방:water/plain', JSON.stringify(ar));
    ok('1 권장 전투력 50~300 · 300~700 · 700~1200 (데이터)', ar.map(z => z.cp).join() === '50~300,300~700,700~1200', JSON.stringify(ar));
    ok('1 사냥터마다 요수 10종 · 핵심 재료 6종', ar.every(z => z.n === 10 && z.mats === 6), JSON.stringify(ar));
    await p.evaluate(() => { S.flags.boss1 = S.flags.boss2 = true; goTab('field'); render(); });
    ok('1 권장 전투력은 화면에 보이지 않음', await p.evaluate(() => { const t = [...document.querySelectorAll('.zone')].map(z => z.textContent).join(' '); return !/권장|300~700|700~1/.test(t) && /수룡방/.test(t); }));
    await p.evaluate(() => { S.flags.boss1 = S.flags.boss2 = false; render(); });

    // 2. 요수 30종 · 특수 규칙
    const mo = await p.evaluate(FOES => {
      const r = { miss: [] };
      for (const [z, list] of Object.entries(FOES)) { const Z = ZONES[z], all = [...Z.enemies, Z.boss].map(e => [ENEMIES[e].name, ENEMIES[e].elem, ENEMIES[e].wtype].join()); for (const f of list) if (!all.includes(f.join())) r.miss.push(f[0]); }
      r.drops = Object.keys(ENEMIES).filter(e => e !== 'ronin').every(e => DROPS[e] && DROPS[e].length);
      r.zoneMats = ZONE_ORDER.every(z => ZONES[z].enemies.every(e => DROPS[e].every(([id]) => ZONES[z].mats.includes(id))));
      const R = Math.random, mk = eid => ({ eid, e: { ...ENEMIES[eid], hpNow: 1e9 }, lines: [], fx: [], st: calcStats(), over: false, aff: affinity(eid), dot: { me: [], foe: [] } });
      // 2연격: 척후병은 공격 두 번
      Math.random = () => 0; S.hp = 1e9; let bt = mk('scout'); RT.battle = bt; bt.st.counter = 0; enemyTurn(bt);
      r.hits = bt.lines.filter(l => /활력 -/.test(l.text)).length; r.combo = bt.lines.some(l => /연격/.test(l.text));
      // 중독: 흑비단독사 → 다음 합에 지속 피해, 해독산이면 면역
      bt = mk('viper'); RT.battle = bt; bt.st.counter = 0; enemyTurn(bt); r.poisoned = bt.dot.me.some(d => d.kind === 'poison');
      const hp0 = S.hp; tickDots(bt); r.tick = S.hp < hp0;
      S.buffs = [{ key: 'antidote', val: 30, name: '해독산' }]; bt = mk('viper'); RT.battle = bt; bt.st.counter = 0; enemyTurn(bt); r.immune = !bt.dot.me.length && bt.lines.some(l => /중독 면역/.test(l.text)); S.buffs = [];
      // 출혈: 혈문도 착용 시 적중하면 적에게 출혈
      const keep = S.equip.weapon; S.equip.weapon = makeNamedGear('c_blade'); bt = mk('rabbit'); RT.battle = bt; playerHit(bt, 1, '평타'); r.bleed = bt.dot.foe.some(d => d.kind === 'bleed'); S.equip.weapon = keep;
      // 고유 약점: 청령목괴는 화 기공에 취약
      const g = S.active.gigong; S.manuals.byeokhwa = { star: 1 }; S.active.gigong = 'byeokhwa'; r.weak = affinity('treant').weak; S.active.gigong = g;
      Math.random = R; RT.battle = null; S.hp = calcStats().maxHp;
      return r;
    }, FOES);
    ok('2 염화채·수룡방 요수 각 10종 (오행·병기)', !mo.miss.length, mo.miss.join(','));
    ok('2 요수마다 드랍 표 · 사냥터 재료만', mo.drops && mo.zoneMats, JSON.stringify(mo));
    ok('2 연격: 한 턴에 두 번 공격', mo.hits === 2 && mo.combo, JSON.stringify(mo));
    ok('2 중독: 지속 피해 · 해독산이면 면역', mo.poisoned && mo.tick && mo.immune, JSON.stringify(mo));
    ok('2 혈문도: 적에게 출혈 · 청령목괴는 화 기공에 약점', mo.bleed && mo.weak === 0.25, JSON.stringify(mo));

    // 3. 화로 단조·단약 · 비밀 조합식 · 중급 장비 9종 · 8품 단약 6종
    const fu = await p.evaluate(GEAR => {
      const r = {};
      r.crafts = Object.keys(CRAFTS).join(); r.n = [RECIPES.filter(x => x.craft === 'forge').length, RECIPES.filter(x => x.craft === 'alchemy').length];
      r.gear = Object.entries(GEAR).filter(([id, [name, st]]) => !CRAFT_GEAR[id] || CRAFT_GEAR[id].name !== name || Object.entries(st).some(([k, v]) => CRAFT_GEAR[id].stats[k] !== v)).map(([id]) => id);
      r.pills = ['potionMp', 'saenghyeol', 'golgye', 'tongmaek', 'haedok', 'clearPill'].every(id => ITEMS[id] && ITEMS[id].grade === '8품' && ITEMS[id].kind === '단약');
      r.noSta = !Object.values(ITEMS).some(I => I.use && I.use.stamina) && !Object.values(ITEMS).some(I => I.kind === '음식');
      r.pillsKept = ['pillLow', 'pillHigh'].every(id => RECIPES.some(x => x.out === id));
      // 단조 성공: 중급 장비, 도감 등재
      S.crafts.forge.lv = 99; const rc = RECIPES.find(x => x.id === 'f_c_sword');
      for (let i = 0; i < 20 && !S.codex.includes('f_c_sword'); i++) { for (const [id, n] of Object.entries(rc.in)) S.inv[id] = (S.inv[id] || 0) + n; doCraft('forge', { ...rc.in }); }
      const it = S.gear.find(g => g.named === 'c_sword');
      r.made = !!it && RARITY[it.rarity].name === '중급' && S.codex.includes('f_c_sword');
      // 실패 → 찌꺼기
      const s0 = count('slag'); S.inv.roughOre = (S.inv.roughOre || 0) + 1; doCraft('forge', { roughOre: 1 }); r.slag = count('slag') === s0 + (talentOf().slag || 1);
      r.saeng = Object.keys(RECIPES.find(x => x.out === 'saenghyeol').in).every(id => ZONES.cheongpung.mats.includes(id));   // 건의: 생혈고는 청풍산 재료만
      r.fistName = EQUIP_BASES.fist.names[1];                                                                              // 건의: 이름 겹침 해소
      return r;
    }, GEAR);
    ok('3 화로는 단조·단약 둘 · 조합식 단조 9 · 단약 8 (8품 6 + 돌파단 2)', fu.crafts === 'forge,alchemy' && fu.n.join() === '9,8' && fu.pillsKept, JSON.stringify(fu));
    ok('3 단조 중급 장비 9종 (지시서 능력치)', !fu.gear.length, fu.gear.join(','));
    ok('3 8품 단약 6종 · 기력 회복 아이템·음식 없음', fu.pills && fu.noSta, JSON.stringify(fu));
    ok('3 단조 성공 → 중급 장비 · 도감 등재 · 실패 → 찌꺼기 (주력 단조면 2배)', fu.made && fu.slag, JSON.stringify(fu));
    ok('3 생혈고 조합식은 청풍산 재료만 · 2티어 권장 기본형은 "흑철 수투"', fu.saeng && fu.fistName === '흑철 수투', JSON.stringify(fu));
    await p.evaluate(() => { goTab('sect', 'forge'); ui.craft = 'forge'; render(); });
    ok('3 화로 [단조] | [단약] 탭 · 품계 표시 · 비법 개수는 숨김', await p.evaluate(() => { const t = document.querySelector('.furnace .panel-head').textContent; return document.querySelectorAll('.furnace-tabs [data-craft]').length === 2 && /단조 \d품/.test(t) && !/비법 \d+\/\d+/.test(t); }));

    // 4. 도감 4탭
    await p.click('[data-tab="codex"]');
    const cx = await p.evaluate(() => ({ tabs: [...document.querySelectorAll('[data-codextab]')].map(e => e.querySelector('.ko').textContent).join('|') }));
    ok('4 도감: 몬스터 | 무공 | 단조 비법 | 단약 비법', cx.tabs === '몬스터|무공|단조 비법|단약 비법', cx.tabs);
    await p.click('[data-codextab="forge"]');
    const fr = await p.evaluate(() => ({ known: document.querySelectorAll('.recipe-row:not(.unknown)').length, unknown: document.querySelectorAll('.recipe-row.unknown').length, text: (document.querySelector('.recipe-row:not(.unknown)') || {}).textContent || '' }));
    ok('4 단조 비법: 발견한 것만 재료·결과와 함께 (못 찾은 비법은 숨김)', fr.known === 1 && fr.unknown === 0 && /청강검/.test(fr.text) && /거친 철광석 ×3/.test(fr.text), JSON.stringify(fr));
    await p.click('[data-codextab="martial"]');
    ok('4 무공: 익힌 무공만 공개', await p.evaluate(() => document.querySelectorAll('.codex-panel .beasts li:not(.unknown)').length === Object.keys(S.manuals).length && !document.querySelector('.codex-panel .beasts li.unknown')));
    await p.click('[data-codextab="monster"]');
    ok('4 몬스터: 만난 요수가 있는 사냥터만 · ??? 없음', await p.evaluate(() => document.querySelectorAll('.codex-panel .codex-col').length === ZONE_ORDER.filter(z => [...ZONES[z].enemies, ZONES[z].boss].some(e => S.bestiary[e])).length && !/\?\?\?/.test(document.querySelector('.codex-panel').textContent)));

    // 5. 탐험 루프: 기력이 다할 때까지 (조우·패배·마을 치료가 모두 기력을 깎는다)
    const lp = await p.evaluate(() => {
      const r = {};
      r.costs = JSON.stringify(STAMINA_COST); r.def = EXPEDITION.defeatSta; r.vil = EXPEDITION.villageSta;
      S.expedition.zone = 'cheongpung'; const recs = [];
      for (let i = 0; i < 6; i++) { S.stamina = calcStats().maxSta; S.inv.saenghyeol = 3; recs.push(runExpedition(now())); }
      r.steps = recs.map(x => x.steps.length); r.allTired = recs.every(x => x.end === 'tired' && S.stamina <= EXPEDITION.minStamina + 0.001 || x.end === 'tired');
      // 패배해도 끝나지 않고 기력이 크게 줄어든다
      for (const e of ZONES.cheongpung.enemies) ENEMIES[e].atk *= 80;
      S.stamina = 100; const d = runExpedition(now());
      for (const e of ZONES.cheongpung.enemies) ENEMIES[e].atk /= 80;
      r.defeats = d.defeats; r.drained = d.end === 'tired' && S.stamina <= EXPEDITION.minStamina + 0.001;
      return r;
    });
    ok('5 한 번 탐험의 조우는 10걸음 안팎 (기력 소모 상향)', lp.steps.every(n => n >= 5 && n <= 18), JSON.stringify(lp.steps));
    ok('5 쓰러져도 탐험은 이어지고 기력이 다할 때까지 간다', lp.defeats >= 2 && lp.drained, JSON.stringify(lp));
    const bp = await p.evaluate(() => { const keep = S.bossPity; S.bossPity = {}; const r = [bossChanceNow('cheongpung')]; S.bossPity.cheongpung = 5; r.push(bossChanceNow('cheongpung')); S.bossPity.cheongpung = 999; r.push(bossChanceNow('cheongpung')); S.bossPity = keep; return { r: r.map(x => Math.round(x * 1000) / 1000), noAvoid: !('bossAvoid' in EXPEDITION) }; });
    ok('5 두목: 기척 회피 없음 · 2.5%에서 못 만날수록 +3%p (최대 50%)', bp.noAvoid && bp.r.join() === '0.025,0.175,0.5', JSON.stringify(bp));

    // 6. 저장 이전
    const mig = await p.evaluate(() => {
      const old = JSON.parse(JSON.stringify(S));
      old.expedition.zone = 'jeokryong'; old.zoneLog.jeokryong = { trips: 2, wins: 5, losses: 1, defeats: 0, retreats: 0, seen: { pirate: 3 }, bossMet: 0, bossWon: 0 };
      old.inv.potionHp = 4; old.inv.jumeokbap = 2; old.inv.iron = 10; old.crafts.cook = { lv: 3, xp: 0 }; old.talent = 'chef'; old.restCd = 5;
      const s0 = old.silver, st = migrate(old);
      return { zone: st.expedition.zone, zl: !!st.zoneLog.suryong && !st.zoneLog.jeokryong && !st.zoneLog.suryong.seen.pirate, saeng: st.inv.saenghyeol, gone: ['potionHp', 'jumeokbap', 'iron'].every(k => !(k in st.inv)), refund: st.silver - s0, cook: 'cook' in st.crafts, talent: st.talent, rest: 'restCd' in st };
    });
    ok('6 이전 저장: 적룡방 → 수룡방 · 금창약 → 생혈고 · 옛 재료·음식은 은자로 · 조리 정리', mig.zone === 'suryong' && mig.zl && mig.saeng >= 4 && mig.gone && mig.refund === 5 * 2 + 3 * 10 && !mig.cook && mig.talent === null && !mig.rest, JSON.stringify(mig));

    ok('오류/가로스크롤 없음', !errs.length && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), errs.join(';'));
    await p.close();
  }
};
