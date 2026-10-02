/* 3대 사냥터(청풍산·염화채·수룡방) · 요수 30종 · 특수 전투 규칙 · 화로 단조/단약 · 8품 단약 · 도감 4탭 · 숨은 기력과 탐험 루프 · 저장 이전 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

const FOES = {
  yeomhwa: [['화염 살모사', 'fire', 'hidden'], ['적토 늑대', 'earth', 'fist'], ['단애 독수리', 'metal', 'fist'], ['염화채 벌목수', 'wood', 'blade'], ['염화채 정예 도부수', 'fire', 'blade'], ['염화채 화포수', 'fire', 'hidden'], ['염화채 강행 돌격병', 'earth', 'spear'], ['열화 장갑병', 'metal', 'fist'], ['염화석괴', 'fire', 'fist'], ['염화채주 적패천', 'fire', 'blade']],
  suryong: [['수로 청어귀', 'water', 'hidden'], ['뻘밭 흑악어', 'earth', 'fist'], ['수룡방 뗏목 척후', 'water', 'spear'], ['수룡방 투망수', 'metal', 'hidden'], ['수룡방 강습대원', 'water', 'blade'], ['수룡방 수중 잠영수', 'water', 'hidden'], ['수룡방 철퇴수', 'metal', 'fist'], ['소택지 독지네', 'wood', 'spear'], ['빙화수요', 'water', 'hidden'], ['수룡방주 벽해룡', 'water', 'spear']],
};
// 단조 장비 위계: 2재료(중급) 공격 18~22·방어 7~9·스탯 +1 / 3재료(상급 이류) 공격 26~32·방어 12~15·스탯 +2
const GEAR = { c_fist: ['흑철 호수', { atk: 20, def: 8, str: 1 }], c_sword: ['청강검', { atk: 28, crit: 3, agi: 2 }], c_blade: ['혈문도', { atk: 32, str: 2 }], c_spear: ['벽파 삼지창', { atk: 30, pierce: 5, con: 2 }], c_hidden: ['칠성 투골정', { atk: 26, agi: 2 }], c_armor: ['청강 사슬갑', { def: 15, maxHp: 80, con: 2 }], c_ring: ['벽옥 지환', { maxMp: 40, atk: 5, int: 1 }], c_belt: ['웅모 포대', { def: 8, con: 1 }], c_jade: ['수정 영옥대', { qiPct: 6, elemRes: 5, int: 2 }],
  t2_sword: ['청풍 단련검', { atk: 19, agi: 1 }], t3_sword: ['청풍비검', { atk: 28, crit: 5, agi: 2 }], t3_jade: ['청풍보옥대', { def: 10, maxMp: 40, maxHp: 40 }] };

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
    ok('1 사냥터마다 요수 10종 · 핵심 재료 6종 이상', ar.every(z => z.n === 10 && z.mats >= 6), JSON.stringify(ar));
    await p.evaluate(() => { S.flags.boss1 = S.flags.boss2 = true; goTab('field'); render(); });
    ok('1 권장 전투력은 화면에 보이지 않음 (강호 지도)', await p.evaluate(() => { ui.modal = null; ui.tab = 'field'; ui.fieldMap = true; render(); const sh = document.querySelector('.map-sheet'), t = sh ? sh.textContent : ''; const ok = !!sh && !/권장|300~700|700~1/.test(t) && !!sh.querySelector('[aria-label="수룡방"]'); ui.modal = null; renderModal(); return ok; }));
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
      const g = S.active.gigong, fire = Object.keys(MANUALS).find(id => MANUALS[id].cat === 'gigong' && MANUALS[id].elem === 'fire'); S.manuals[fire] = S.manuals[fire] || { star: 1 }; S.active.gigong = fire; r.weak = affinity('treant').weak; S.active.gigong = g;
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
      for (let i = 0; i < 20 && !S.codex.includes('f_c_sword'); i++) { for (const [id, n] of Object.entries(rc.in)) S.inv[id] = (S.inv[id] || 0) + n; (S.hp = calcStats().maxHp, S.mp = calcStats().maxMp, doCraft)('forge', { ...rc.in }); }
      const it = S.gear.find(g => g.named === 'c_sword');
      r.made = !!it && RARITY[it.rarity].name === '상급' && S.codex.includes('f_c_sword');   // 3재료 조합은 상급(이류)
      // 실패 → 찌꺼기
      const s0 = count('slag'); S.inv.roughOre = (S.inv.roughOre || 0) + 1; (S.hp = calcStats().maxHp, S.mp = calcStats().maxMp, doCraft)('forge', { roughOre: 1 }); r.slag = count('slag') === s0 + (talentOf().slag || 1);
      r.saeng = Object.keys(RECIPES.find(x => x.out === 'saenghyeol').in).every(id => ZONES.cheongpung.mats.includes(id));   // 건의: 생혈고는 청풍산 재료만
      r.fistName = EQUIP_BASES.fist.names[1];                                                                              // 건의: 이름 겹침 해소
      return r;
    }, GEAR);
    ok('3 화로는 단조·단약 둘 · 조합식 단조 21 (기존 9 + 2재료 6 + 3재료 6) · 단약 8', fu.crafts === 'forge,alchemy' && fu.n.join() === '21,8' && fu.pillsKept, JSON.stringify(fu));
    ok('3 단조 장비 위계 수치 (2재료·3재료)', !fu.gear.length, fu.gear.join(','));
    ok('3 8품 단약 6종 · 기력 회복 아이템·음식 없음', fu.pills && fu.noSta, JSON.stringify(fu));
    ok('3 단조 성공 → 상급 장비 · 도감 등재 · 실패 → 찌꺼기 (주력 단조면 2배)', fu.made && fu.slag, JSON.stringify(fu));
    ok('3 생혈고 조합식은 청풍산 재료만 · 2티어 권장 기본형은 "흑철 수투"', fu.saeng && fu.fistName === '흑철 수투', JSON.stringify(fu));
    await p.evaluate(() => { goTab('sect', 'forge'); ui.craft = 'forge'; render(); });
    ok('3 화로 [단조] | [단약] | [연혼] 탭 · 품계 표시 · 비법 개수는 숨김', await p.evaluate(() => { const t = document.querySelector('.furnace .panel-head').textContent; return document.querySelectorAll('.furnace-tabs [data-craft]').length === 3 && /단조 \d품/.test(t) && !/비법 \d+\/\d+/.test(t); }));

    // 4. 도감 4탭
    await p.click('[data-tab="codex"]');
    const cx = await p.evaluate(() => ({ tabs: [...document.querySelectorAll('[data-codextab]')].map(e => e.querySelector('.ko').textContent).join('|') }));
    ok('4 도감: 강적 | 비급 | 단조 비법 | 연단 비법', cx.tabs === '강적|비급|단조 비법|연단 비법', cx.tabs);
    await p.click('[data-codextab="forge"]');
    const fr = await p.evaluate(() => ({ known: document.querySelectorAll('.recipe-row:not(.unknown)').length, unknown: document.querySelectorAll('.recipe-row.unknown').length, text: (document.querySelector('.recipe-row:not(.unknown)') || {}).textContent || '' }));
    ok('4 단조 비법: 발견한 것만 재료·결과와 함께 (못 찾은 비법은 숨김)', fr.known === 1 && fr.unknown === 0 && /청강검/.test(fr.text) && /조철광 ×3/.test(fr.text), JSON.stringify(fr));
    await p.click('[data-codextab="martial"]');
    ok('4 무공: 익힌 무공만 공개 (분류 탭마다)', await p.evaluate(() => { const cat = CAT_ORDER.find(c => Object.keys(S.manuals).some(id => MANUALS[id].cat === c)); return document.querySelectorAll('.codex-panel .beasts li:not(.unknown)').length === Object.keys(S.manuals).filter(id => MANUALS[id].cat === cat).length && !document.querySelector('.codex-panel .beasts li.unknown') && document.querySelectorAll('.codex-panel [data-codexcat]').length === CAT_ORDER.filter(c => Object.keys(S.manuals).some(id => MANUALS[id].cat === c)).length; }));
    await p.click('[data-codextab="monster"]');
    ok('4 몬스터: 만난 요수가 있는 사냥터만 탭 · ??? 없음', await p.evaluate(() => document.querySelectorAll('.codex-panel [data-codexzone]').length === ZONE_ORDER.filter(z => [...ZONES[z].enemies, ZONES[z].boss].some(e => S.bestiary[e])).length && !/\?\?\?/.test(document.querySelector('.codex-panel').textContent)));

    // 5. 쓰러지면 강호행은 거기서 끝 · 다음 출발은 한 단계 아래
    const dd = await p.evaluate(() => {
      S.expedition.zone = 'cheongpung'; S.stages = { cheongpung: 4 }; S.expedition.stage = 5;
      for (const e of ZONES.cheongpung.enemies) ENEMIES[e].atk *= 80;
      S.inv.saenghyeol = 0; const d = runExpedition(now(), 30);
      for (const e of ZONES.cheongpung.enemies) ENEMIES[e].atk /= 80;
      return { end: d.end, defeats: d.defeats, stage: d.stage, next: S.expedition.stage, live: d.live };
    });
    ok('5 쓰러지면 강호행 끝 · 다음 출발은 한 단계 아래', dd.end === 'dead' && dd.defeats === 1 && !dd.live && dd.next === Math.max(1, dd.stage - 1), JSON.stringify(dd));

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
