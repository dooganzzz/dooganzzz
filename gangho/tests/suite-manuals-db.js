/* 무공 DB(skills.js) 168종 · 전투 묘사(선언 · 결과) · 청풍산 요수 10종 · 5대 지형 · 장비 등급 6단계 · 하급 장비 37종 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

const FOES = [['살쾡이', 'wood', 'fist'], ['사나운 멧돼지', 'earth', 'spear'], ['흑비단독사', 'water', 'hidden'], ['청풍산 산토끼', 'wood', 'fist'], ['흑풍채 척후병', 'metal', 'blade'], ['흑풍채 탈영병', 'earth', 'spear'], ['흑풍채 투석수', 'fire', 'hidden'], ['바위 등껍질 거북', 'earth', 'fist'], ['청령목괴', 'wood', 'spear'], ['적염 호랑이', 'fire', 'fist']];
const WEAPONS = { fist: ['무명 박수포', '가죽 호완', '징 박은 철수투', '목인장 수투', '동사 수투'], sword: ['녹슨 수련검', '날 무딘 철검', '청동 세검', '도목검', '협봉검'], blade: ['이 빠진 마도', '무쇠 안령도', '흑철 박도', '산채 벌도', '요도'], spear: ['대나무 죽창', '녹슨 구겸창', '백랍목 장창', '점강 단창', '사냥꾼 삼고차'], hidden: ['무딘 유엽표', '비황석 주머니', '녹슨 비도', '거친 철질려', '목제 매화침'] };
const ACC = { armor: ['해진 삼베 도포', '사냥꾼 피의', '청풍문 수련 도포'], ring: ['무쇠 지환', '흑각 지환', '청동 지환'], belt: ['삼베 요대', '우피 요대', '흑사 요대'], jade: ['탁한 청옥대', '백옥대', '운문 옥대'] };

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    // 1. 무공 DB
    const db = await p.evaluate(() => {
      // 8분류(검·도·창·권장·암기 · 경공·기공·심법) × 5등급(삼류~초절정) × 3종 = 120종 + 신규 48종(삼류 d·e·f · 이류 d·e · 일류 d). 공격 무공은 초식 3개, 경공은 지형, 기공은 오행
      const PRE = { sword: 'sw', blade: 'bd', spear: 'sp', fist: 'fs', hidden: 'hd', gyeonggong: 'gy', gigong: 'gi', simbeop: 'sm' }, G = ['삼류', '이류', '일류', '절정', '초절정'];
      const r = { n: Object.keys(MANUALS).length, missing: [], bad: [] };
      for (const [k, pre] of Object.entries(PRE)) for (let g = 1; g <= 5; g++) for (const v of ({ 1: 'abcdef', 2: 'abcde', 3: 'abcd' }[g] || 'abc')) {   // 신규 48종: 삼류 d·e·f · 이류 d·e · 일류 d
        const id = pre + g + v, M = MANUALS[id]; if (!M) { r.missing.push(id); continue; }
        const cat = ['gyeonggong', 'gigong', 'simbeop'].includes(k) ? k : 'mugong';
        if (M.cat !== cat || M.grade !== G[g - 1] || (cat === 'mugong' && (M.weapon !== k || M.stances.length !== 3)) || (cat === 'gyeonggong' && !TERRAINS[M.terrain]) || (cat === 'gigong' && !ELEMENTS[M.elem]) || !ITEMS['bk_' + id]) r.bad.push(id);
      }
      r.gacha = GACHA.books.every(id => MANUALS[id] && MANUALS[id].grade === '삼류');
      r.src = [...document.scripts].some(s => /skills\.js/.test(s.src)) || typeof STANCE_DEFAULT === 'object';
      r.old = ['yeolhwa', 'suryu', 'hwangto', 'deungpyeong', 'samjaeGeom', 'tonap'].some(k => MANUALS[k]);
      r.starters = STARTERS.every(id => MANUALS[id].stances.length === 3);
      return r;
    });
    ok('1 비급 168종 (8분류 × 5등급 × 3 + 신규 삼류 3 · 이류 2 · 일류 1) · 비급서 · 경공 지형 · 기공 오행 · 공양 비급은 삼류', db.n === 168 && !db.missing.length && !db.bad.length && db.gacha, JSON.stringify(db));
    const pm = await p.evaluate(() => { const bad = []; const chk = (id, L) => { if (!L || !L.length || L.length > 4 || L.some(l => !l || l.length > 40)) bad.push(id + ':' + (L ? L.length : 0)); }; for (const [id, M] of Object.entries(MANUALS)) if (M.poem) chk(id, M.poem.lines); for (const [k, a] of Object.entries(CAT_POEMS)) a.forEach((L, i) => chk('CAT.' + k + i, L));
      const one = MANUALS.sw1a, many = MANUALS.sw3a; return { bad, o1: poemFor(many, 1), o2: poemFor(many, 2), o3: poemFor(many, 3), single: poemFor({ poem: { lines: ['한 줄'] } }, 3) }; });
    ok('1 시문 규칙: 시는 최대 4줄(한 줄 40자 이내) · 두루마리는 1초식 한 줄 · 2초식 한 줄 · 오의 두 줄', !pm.bad.length && pm.o1.length === 1 && pm.o2.length === 1 && pm.o3.length === 2 && pm.single.length === 1, JSON.stringify(pm));
    ok('1 무공 DB는 skills.js · 입문 무공도 초식 템플릿(stances)', db.src && db.starters && !db.old, JSON.stringify(db));
    const fill = await p.evaluate(() => [stanceFill('{attacker}{이가} {weapon}{을를} 쥔다 · {target}{은는}', { attacker: '청운', weapon: '목검', target: '살쾡이' }), stanceFill('{attacker}{이가} {weapon}{을를}', { attacker: '하나', weapon: '표창', target: '' })]);
    ok('1 초식 지문: 받침에 맞춰 조사', fill[0] === '청운이 목검을 쥔다 · 살쾡이는' && fill[1] === '하나가 표창을', fill.join(' / '));

    // 2. 3단계 전투 묘사
    const lg = await p.evaluate(() => {
      const R = Math.random, r = {};
      const mk = eid => ({ eid, e: { ...ENEMIES[eid], hpNow: 1e9 }, lines: [], fx: [], st: calcStats(), over: false, aff: affinity(eid) });
      S.mp = 9999;
      // 초식 (발동·명중·치명 없음)
      Math.random = () => 0;   // 늘 0: 초식 발동 · 제1초식 · 명중 (치명은 crit 0, 반격 · 충격도 0이라 안 나옴). 무대 타이머가 순서 있는 값을 가로채지 않게 고정값
      const bt = mk('rabbit'); RT.battle = bt; bt.st.crit = 0; playerAttack(bt);   // 산토끼(권장) — 검은 열세라 [상성 우위] 없음
      const M = MANUALS[S.active.mugong];
      r.title = bt.lines[0]; r.desc = bt.lines[1]; r.res = bt.lines.find(l => /log-stance-result/.test(l.cls));
      r.expectTitle = stanceCall(0, M.stances[0].name);
      // 치명
      Math.random = () => 0; const c = mk('treant'); RT.battle = c; c.st.crit = 100; playerHit(c, 1, { desc: STANCE_DEFAULT.basic }); r.crit = c.lines[c.lines.length - 1];
      // 빗나감
      Math.random = () => 0.999; const m = mk('wildcat'); RT.battle = m; playerHit(m, 1, { desc: STANCE_DEFAULT.basic }); r.miss = m.lines[m.lines.length - 1];
      // 병기 우위: 검 vs 청령목괴(창)
      Math.random = () => 0.5; const a = mk('treant'); RT.battle = a; a.st.crit = 0; playerAttack(a); r.aff = a.lines.map(l => l.text); r.affWp = a.aff.wp;
      // 적의 공격 지문 · 반격 제목
      Math.random = () => 0; const f = mk('redTiger'); RT.battle = f; f.st.counter = 100; S.hp = 1e9; enemyTurn(f); r.foe = f.lines.map(l => `${l.cls}|${l.text}`);
      Math.random = R; RT.battle = null; S.hp = calcStats().maxHp;
      r.name = S.name; r.weapon = S.equip.weapon.name;
      return r;
    });
    ok('2 초식 선언: 제1초식 초식명 ! (.log-stance-title)', lg.title.text === lg.expectTitle && /log-stance-title/.test(lg.title.cls), JSON.stringify(lg.title));
    ok('2 초식 설명 줄 없이 선언 뒤 바로 결과', !/log-stance-desc/.test(lg.desc.cls), lg.desc.text);
    ok('2 3단계 결과 지문 + (-피해) (.log-stance-result)', /log-stance-result/.test(lg.res.cls) && /\(-[\d,]+\)/.test(lg.res.text), lg.res.text);
    ok('2 치명타는 "회심의 일격"', /회심의 일격/.test(lg.crit.text) && /crit/.test(lg.crit.cls), lg.crit.text);
    ok('2 회피는 빗나감 지문', /빗나감/.test(lg.miss.text) && /miss/.test(lg.miss.cls), lg.miss.text);
    ok('2 병기 상성 우위면 [상성 우위] 지문 자동 삽입 (한 턴 한 번)', lg.affWp === 1 && lg.aff.filter(t => t.startsWith('[상성 우위] 병기의 이점을 살린 궤적이 적의 빈틈을 파고든다!')).length === 1, JSON.stringify(lg.aff));
    ok('2 적의 공격 지문 · 반격도 3단계', lg.foe[0].includes('적염 호랑이가 붉은 갈기') && lg.foe.some(l => l.startsWith('log-stance-title counter|【 반격(反擊) !! 】')), JSON.stringify(lg.foe));
    const css = await p.evaluate(() => {
      const box = document.createElement('div'); box.className = 'blog'; box.innerHTML = '<p class="log-stance-title">t</p><p class="log-stance-desc">d</p><p class="log-stance-result">r <span class="dmg">(-3)</span></p>'; document.body.appendChild(box);
      const [t, d, r] = box.children, g = e => getComputedStyle(e);
      const out = { tw: g(t).fontWeight, tc: g(t).color, ds: g(d).fontStyle, dmg: g(r.querySelector('.dmg')).color };
      box.remove(); return out;
    });
    ok('2 CSS: 제목 금색 굵게 · 지문 기울임 · 피해 붉은색', +css.tw >= 700 && /rgb\(240, 207, 130\)/.test(css.tc) && css.ds === 'italic' && /rgb\(210, 90, 68\)/.test(css.dmg), JSON.stringify(css));

    // 3. 청풍산 요수 10종 · 5대 지형
    const mo = await p.evaluate(FOES => {
      const Z = ZONES.cheongpung, all = [...Z.enemies, Z.boss];
      const got = all.map(e => [ENEMIES[e].name, ENEMIES[e].elem, ENEMIES[e].wtype]);
      return { n: all.length, missing: FOES.filter(f => !got.some(g => g.join() === f.join())).map(f => f[0]), boss: ENEMIES[Z.boss].name, bossFlag: ENEMIES[Z.boss].boss, terr: Z.terrain.join(), gone: ['dog', 'boarKing'].some(k => ENEMIES[k]) };
    }, FOES);
    ok('3 청풍산 요수 10종 (오행·병기 지정)', mo.n === 10 && !mo.missing.length && !mo.gone, JSON.stringify(mo));
    ok('3 두목 적염 호랑이(火·권장) · 청풍산 지형 흙/풀/나무', mo.boss === '적염 호랑이' && mo.bossFlag === 'boss1' && mo.terr === 'earth,grass,wood', JSON.stringify(mo));

    // 4. 장비 등급 · 하급 장비 37종
    const eq = await p.evaluate(({ WEAPONS, ACC }) => {
      const G = Object.values(GEAR_DB), r = { grades: RARITY.map(x => x.name).join('<'), total: G.length, miss: [] };
      for (const [wt, names] of Object.entries(WEAPONS)) for (const n of names) if (!G.some(g => g.name === n && g.slot === 'weapon' && g.wtype === wt)) r.miss.push(n);
      for (const [slot, names] of Object.entries(ACC)) for (const n of names) if (!G.some(g => g.name === n && g.slot === slot)) r.miss.push(n);
      const by = n => G.find(g => g.name === n).stats;
      r.stats = { iron: by('무쇠 지환').atk, horn: by('흑각 지환').staSave, leather: by('우피 요대').def, dull: by('탁한 청옥대').qiPct, white: by('백옥대').maxMp, cp: by('청풍문 수련 도포').maxMp > 0 };
      r.named = G.every(g => g.desc);
      const it = makeNamedGear('g_hornRing'); r.item = [it.rarity, RARITY[it.rarity].name, it.named];
      r.slots = [SLOTS.ring.name, SLOTS.belt.name, SLOTS.jade.name].join();
      r.starter = [S.equip.weapon.named, S.equip.armor && S.equip.armor.named];
      return r;
    }, { WEAPONS, ACC });
    ok('4 장비 등급 하급 < 중급 < 상급 < 진품 < 명품 < 극품', eq.grades === '하급<중급<상급<진품<명품<극품', eq.grades);
    ok('4 하급 장비 37종 (무기 25 · 방어구 3 · 장신구 9)', eq.total === 37 && !eq.miss.length && eq.named, JSON.stringify(eq.miss));
    ok('4 지정 능력치 (무쇠 지환 공격 +2 · 흑각 기력 -2% · 가죽 요대 방어 +3 · 청옥대 기공 +3% · 백옥대 내력 +15)', eq.stats.iron === 2 && eq.stats.horn === 2 && eq.stats.leather === 3 && eq.stats.dull === 3 && eq.stats.white === 15 && eq.stats.cp, JSON.stringify(eq.stats));
    ok('4 하급 고정 등급 · 슬롯 가락지/요대/옥대 · 입문 무기·해진 삼베 도포로 시작', eq.item[1] === '하급' && eq.slots === '가락지,요대,옥대' && /^g_/.test(eq.starter[0]) && eq.starter[1] === 'g_hempRobe', JSON.stringify(eq));
    const fx = await p.evaluate(() => {
      const r = {}, eqp = slot => S.equip[slot];
      const keep = { ring: eqp('ring'), jade: eqp('jade'), belt: eqp('belt') };
      // 기공 위력 +3%
      const gm = S.manuals[S.active.gigong], star0 = gm.star; gm.star = 11;       // 반올림 오차를 줄이려고 성급을 높여 비교
      S.equip.jade = null; const q0 = manualBonus(S.active.gigong, gm.star).maxHp, d0 = calcStats().maxHp;
      S.equip.jade = makeNamedGear('g_dullJade'); r.qi = [calcStats().maxHp - d0, Math.round(q0 * 0.03 * 100) / 100];   // [실제 증가(반올림), 기공 체력의 3%]
      gm.star = star0;
      // 오행 내성: 극당할 때 받는 피해
      S.equip.jade = null; const t0 = affinity('slinger').taken; S.equip.jade = makeNamedGear('g_cloudJade'); const t1 = affinity('slinger').taken; r.res = [affinity('slinger').el, t0, t1];
      // 기력 소모 감소 2%
      S.equip.ring = null; S.expedition.zone = 'cheongpung'; S.stamina = 100; const a = runExpedition(now());
      S.equip.ring = makeNamedGear('g_hornRing'); S.stamina = 100; const c = runExpedition(now());
      const per = rec => rec.terrain.mult; r.sta = [per(a), per(c)];
      // 흑사 요대: 숨 고르기
      S.equip.belt = makeNamedGear('g_silkBelt'); r.breathe = calcStats().breathe;
      Object.assign(S.equip, keep); ui.modal = null;
      return r;
    });
    ok('4 옥대 기공 위력 +3% → 기공 능력치에 곱해짐', fx.qi[0] > 0 && Math.abs(fx.qi[0] - fx.qi[1]) <= 1, JSON.stringify(fx));
    ok('4 운문 옥대: 극당할 때 받는 피해 감소', fx.res[0] === -1 && fx.res[2] < fx.res[1], JSON.stringify(fx.res));
    ok('4 흑각 지환: 탐험 기력 소모 ×0.98 · 흑사 요대: 숨 고르기', Math.abs(fx.sta[1] / fx.sta[0] - 0.98) < 0.002 && fx.breathe === 2, JSON.stringify(fx));
    const drop = await p.evaluate(() => { const n = {}; for (let i = 0; i < 60; i++) { const it = dropGear(1, 0); n[it.named ? 'named' : 'base']= (n[it.named ? 'named' : 'base'] || 0) + 1; } const hi = dropGear(2, 1); return { n, hi: !hi.named && hi.tier === 2 }; });
    ok('4 청풍산(1티어) 하급 드랍·공양은 하급 장비 37종에서 · 그 밖은 기본형', drop.n.named === 60 && drop.hi, JSON.stringify(drop));
    await p.evaluate(() => { goTab('sect', 'shop'); render(); });
    ok('4 전방 › 구매 › 장비에 하급 장비 진열 (이름 · 하급 뱃지 · 설명, 무기·갑옷·장신구 탭 합계 10종 이상)', await p.evaluate(() => { let n = 0; for (const t of Object.keys(SHOP_GEAR_TABS)) { ui.shopBuy = 'gear'; ui.shopGear = t; render(); n += document.querySelectorAll('[data-buygear]').length; } ui.shopGear = 'weapon'; render(); const w = [...document.querySelectorAll('.shop-panel .ware')].find(e => /협봉검/.test(e.textContent)); return n >= 10 && !!w && /하급/.test(w.textContent); }));

    // 5. 화면: 무공 상세 초식 · 관찰 창 3단계
    await p.evaluate(() => { S.manuals.fs1b = { star: 12 }; ui.modal = 'mart:fs1b'; renderModal(); });
    ok('5 무공 상세: 무공의 초식 이름', await p.evaluate(() => MANUALS.fs1b.stances.every(sc => document.querySelector('.sheet .moves').textContent.includes(sc.name.replace(/\s*\(.*$/, '')))));
    await p.evaluate(() => { ui.modal = null; S.hp = 99999; setDestination('cheongpung'); runExpedition(now(), 12); ui.modal = null; render(); });
    const rp = await p.evaluate(() => { const r = S.expeditions[S.expeditions.length - 1]; const i = r.battles.findIndex(x => x.rounds.some(q => q.lines.some(l => /log-stance-title m/.test(l.cls)))); openReplay(r.id + ':' + Math.max(0, i)); return i; });
    await p.waitForSelector('#rpBox', { timeout: 3000 }); await p.click('[data-rp="end"]');
    ok('5 관찰 창에 초식 줄 (선언 · 결과)', await p.evaluate(() => ['.log-stance-title', '.log-stance-result'].every(s => document.querySelector('#rpLog ' + s))));
    await p.evaluate(() => { replayStop(); ui.modal = null; render(); });

    // 6. 저장 이전
    const mig = await p.evaluate(() => {
      const old = JSON.parse(JSON.stringify(S));
      old.manuals.yeolhwa = { star: 4 }; old.active.gigong = 'yeolhwa'; old.inv.bk_suryu = 1; delete old.manuals.gi1c;
      old.missions = [{ type: 'kill', target: 'dog', n: 3, prog: 0 }, { type: 'kill', target: 'rabbit', n: 3, prog: 0 }];
      old.bestiary = { dog: { met: 2, kills: 2 }, rabbit: { met: 1, kills: 1 } };
      const st = migrate(old);
      return { star: st.manuals.gi1c && st.manuals.gi1c.star, active: st.active.gigong, book: st.inv.bk_gi1c, old: 'yeolhwa' in st.manuals || 'bk_suryu' in st.inv, missions: 'missions' in st, best: Object.keys(st.bestiary).join() };
    });
    ok('6 이전 저장: 옛 공양 비급(열화·수류) → 새 비급(성급 유지) · 옛 임무 · 들개 도감 정리', mig.star === 4 && mig.active === 'gi1c' && mig.book === 1 && !mig.old && !mig.missions && mig.best === 'rabbit', JSON.stringify(mig));

    ok('오류/가로스크롤 없음', !errs.length && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), errs.join(';'));
    await p.close();
  }
};
