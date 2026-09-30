/* 무공 DB(skills.js) 25종 · 3단계 전투 묘사 · 청풍산 요수 10종 · 5대 지형 · 장비 등급 6단계 · 하급 장비 37종 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

const MUGONG = { fist: ['파석권', '쇄골장', '연환통배권'], sword: ['청풍검법', '낙엽검법', '추풍검'], blade: ['오호단문도', '벽력도법', '단수도'], spear: ['육합창법', '철기창', '풍운점혈창'], hidden: ['비연표', '산화철질려', '투골정'] };
const GYEONG = { grass: '초상비', water: '답수보', earth: '지행보', wood: '등수보', plain: '미종보' };
const GIGONG = { wood: '목령진기', fire: '벽화공', earth: '후토공', metal: '백금결', water: '유수심법' };
const FOES = [['살쾡이', 'wood', 'fist'], ['사나운 멧돼지', 'earth', 'spear'], ['흑비단독사', 'water', 'hidden'], ['청풍산 산토끼', 'wood', 'fist'], ['흑풍채 척후병', 'metal', 'blade'], ['흑풍채 탈영병', 'earth', 'spear'], ['흑풍채 투석수', 'fire', 'hidden'], ['바위 등껍질 거북', 'earth', 'fist'], ['청령목괴', 'wood', 'spear'], ['적염 호랑이', 'fire', 'fist']];
const WEAPONS = { fist: ['무명 붕대', '거친 가죽 토수', '무쇠 징 권갑', '목인갑', '동선 장갑'], sword: ['녹슨 연습검', '날 무딘 철검', '청동 세검', '단풍목 목검', '직도형 박검'], blade: ['이가 빠진 마도', '무쇠 낭도', '흑철 박도', '벌목용 벌채도', '두정 단도'], spear: ['대나무 죽창', '녹슨 편곤창', '백랍목 장창', '철침 단창', '사냥용 삼지창'], hidden: ['무딘 철표창', '자갈 주머니', '녹슨 비도', '조잡한 철질려', '목제 비연침'] };
const ACC = { armor: ['해진 삼베 도포', '질긴 사냥꾼 가죽옷', '청풍문 규격 도포'], ring: ['무쇠 가락지', '흑각 가락지', '청동 가락지'], belt: ['거친 삼베 허리띠', '무두질한 가죽 요대', '흑사 편직 요대'], jade: ['탁한 청옥대', '투박한 백옥대', '운문 연옥대'] };

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    // 1. 무공 DB
    const db = await p.evaluate(({ MUGONG, GYEONG, GIGONG }) => {
      const byName = n => Object.entries(MANUALS).find(([, M]) => M.name === n);
      const r = { missing: [], bad: [] };
      for (const [wt, names] of Object.entries(MUGONG)) for (const n of names) { const e = byName(n); if (!e) { r.missing.push(n); continue; } const [id, M] = e; if (M.cat !== 'mugong' || M.weapon !== wt || M.grade !== '삼류' || M.stances.length !== 3 || !M.stances.every(s => s.name && /\{attacker\}/.test(s.desc)) || !ITEMS['bk_' + id] || !GACHA.books.includes(id)) r.bad.push(n); }
      for (const [t, n] of Object.entries(GYEONG)) { const e = byName(n); if (!e) { r.missing.push(n); continue; } const [id, M] = e; if (M.cat !== 'gyeonggong' || M.terrain !== t || !M.stances.length || !ITEMS['bk_' + id] || !GACHA.books.includes(id)) r.bad.push(n); }
      for (const [el, n] of Object.entries(GIGONG)) { const e = byName(n); if (!e) { r.missing.push(n); continue; } const [id, M] = e; if (M.cat !== 'gigong' || M.elem !== el || !M.stances.length || !ITEMS['bk_' + id] || !GACHA.books.includes(id)) r.bad.push(n); }
      r.src = [...document.scripts].some(s => /skills\.js/.test(s.src)) || typeof STANCE_DEFAULT === 'object';
      r.old = ['yeolhwa', 'suryu', 'hwangto', 'deungpyeong'].some(k => MANUALS[k]);
      r.starters = STARTERS.every(id => MANUALS[id].stances.length === 3);
      return r;
    }, { MUGONG, GYEONG, GIGONG });
    ok('1 삼류 무공 25종 (권장·검·도·창·암기 각 3 · 경공 5대 지형 · 기공 오행 5)', !db.missing.length && !db.bad.length, JSON.stringify(db));
    ok('1 무공 DB는 skills.js · 입문 무공도 초식 템플릿(stances)', db.src && db.starters && !db.old, JSON.stringify(db));
    const fill = await p.evaluate(() => [stanceFill('{attacker}{이가} {weapon}{을를} 쥔다 · {target}{은는}', { attacker: '청운', weapon: '목검', target: '살쾡이' }), stanceFill('{attacker}{이가} {weapon}{을를}', { attacker: '하나', weapon: '표창', target: '' })]);
    ok('1 초식 지문: 받침에 맞춰 조사', fill[0] === '청운이 목검을 쥔다 · 살쾡이는' && fill[1] === '하나가 표창을', fill.join(' / '));

    // 2. 3단계 전투 묘사
    const lg = await p.evaluate(() => {
      const R = Math.random, r = {};
      const mk = eid => ({ eid, e: { ...ENEMIES[eid], hpNow: 1e9 }, lines: [], fx: [], st: calcStats(), over: false, aff: affinity(eid) });
      S.mp = 9999;
      // 초식 (발동·명중·치명 없음)
      let seq = [0, 0.5, 0.99, 0.5]; Math.random = () => seq.length ? seq.shift() : 0.5;
      const bt = mk('rabbit'); RT.battle = bt; bt.st.crit = 0; playerAttack(bt);   // 산토끼(권장) — 검은 열세라 [상성 우위] 없음
      const M = MANUALS[S.active.mugong];
      r.title = bt.lines[0]; r.desc = bt.lines[1]; r.res = bt.lines.find(l => /log-stance-result/.test(l.cls));
      r.expectTitle = `【 ${M.name} - ${M.stances[0].name} !! 】`;
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
    ok('2 1단계 초식 선언: 【 무공명 - 초식명 !! 】 (.log-stance-title)', lg.title.text === lg.expectTitle && /log-stance-title/.test(lg.title.cls), JSON.stringify(lg.title));
    ok('2 2단계 기세·호흡 지문: 제자 이름과 병기 (.log-stance-desc)', /log-stance-desc/.test(lg.desc.cls) && lg.desc.text.includes(lg.name) && lg.desc.text.includes(lg.weapon), lg.desc.text);
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
      r.stats = { iron: by('무쇠 가락지').atk, horn: by('흑각 가락지').staSave, leather: by('무두질한 가죽 요대').def, dull: by('탁한 청옥대').qiPct, white: by('투박한 백옥대').maxMp, cp: by('청풍문 규격 도포').maxMp > 0 };
      r.named = G.every(g => g.desc);
      const it = makeNamedGear('g_hornRing'); r.item = [it.rarity, RARITY[it.rarity].name, it.named];
      r.slots = [SLOTS.ring.name, SLOTS.belt.name, SLOTS.jade.name].join();
      r.starter = [S.equip.weapon.named, S.equip.armor && S.equip.armor.named];
      return r;
    }, { WEAPONS, ACC });
    ok('4 장비 등급 하급 < 중급 < 상급 < 진품 < 명품 < 극품', eq.grades === '하급<중급<상급<진품<명품<극품', eq.grades);
    ok('4 하급 장비 37종 (무기 25 · 방어구 3 · 장신구 9)', eq.total === 37 && !eq.miss.length && eq.named, JSON.stringify(eq.miss));
    ok('4 지정 능력치 (무쇠 가락지 공격 +2 · 흑각 기력 -2% · 가죽 요대 방어 +3 · 청옥대 기공 +3% · 백옥대 내력 +15)', eq.stats.iron === 2 && eq.stats.horn === 2 && eq.stats.leather === 3 && eq.stats.dull === 3 && eq.stats.white === 15 && eq.stats.cp, JSON.stringify(eq.stats));
    ok('4 하급 고정 등급 · 슬롯 가락지/허리띠/옥대 · 입문 무기·해진 삼베 도포로 시작', eq.item[1] === '하급' && eq.slots === '가락지,허리띠,옥대' && /^g_/.test(eq.starter[0]) && eq.starter[1] === 'g_hempRobe', JSON.stringify(eq));
    const fx = await p.evaluate(() => {
      const r = {}, eqp = slot => S.equip[slot];
      const keep = { ring: eqp('ring'), jade: eqp('jade'), belt: eqp('belt') };
      // 기공 위력 +3%
      const gm = S.manuals[S.active.gigong], star0 = gm.star; gm.star = 11;       // 반올림 오차를 줄이려고 성급을 높여 비교
      S.equip.jade = null; const q0 = manualBonus(S.active.gigong, gm.star).def, d0 = calcStats().def;
      S.equip.jade = makeNamedGear('g_dullJade'); r.qi = [calcStats().def - d0, Math.round(q0 * 0.03 * 100) / 100];   // [실제 증가(반올림), 기공 방어력의 3%]
      gm.star = star0;
      // 오행 내성: 극당할 때 받는 피해
      S.equip.jade = null; const t0 = affinity('slinger').taken; S.equip.jade = makeNamedGear('g_cloudJade'); const t1 = affinity('slinger').taken; r.res = [affinity('slinger').el, t0, t1];
      // 기력 소모 감소 2%
      S.equip.ring = null; S.expedition.zone = 'cheongpung'; S.stamina = 100; const a = runExpedition(now());
      S.equip.ring = makeNamedGear('g_hornRing'); S.stamina = 100; const c = runExpedition(now());
      const per = rec => rec.terrain.mult; r.sta = [per(a), per(c)];
      // 흑사 편직 요대: 숨 고르기
      S.equip.belt = makeNamedGear('g_silkBelt'); r.breathe = calcStats().breathe;
      Object.assign(S.equip, keep); ui.modal = null;
      return r;
    });
    ok('4 옥대 기공 위력 +3% → 기공 능력치에 곱해짐', fx.qi[0] > 0 && Math.abs(fx.qi[0] - fx.qi[1]) <= 1, JSON.stringify(fx));
    ok('4 운문 연옥대: 극당할 때 받는 피해 감소', fx.res[0] === -1 && fx.res[2] < fx.res[1], JSON.stringify(fx.res));
    ok('4 흑각 가락지: 탐험 기력 소모 ×0.98 · 흑사 편직 요대: 숨 고르기', Math.abs(fx.sta[1] / fx.sta[0] - 0.98) < 0.002 && fx.breathe === 2, JSON.stringify(fx));
    const drop = await p.evaluate(() => { const n = {}; for (let i = 0; i < 60; i++) { const it = dropGear(1, 0); n[it.named ? 'named' : 'base']= (n[it.named ? 'named' : 'base'] || 0) + 1; } const hi = dropGear(2, 1); return { n, hi: !hi.named && hi.tier === 2 }; });
    ok('4 청풍산(1티어) 하급 드랍·공양은 하급 장비 37종에서 · 그 밖은 기본형', drop.n.named === 60 && drop.hi, JSON.stringify(drop));
    await p.evaluate(() => { goTab('sect', 'shop'); render(); });
    ok('4 전방에 하급 장비 진열 ([하급] 이름 · 설명)', await p.evaluate(() => [...document.querySelectorAll('[data-buygear]')].length >= 10 && /\[하급\] 직도형 박검/.test(document.querySelector('.shop-panel').textContent)));

    // 5. 화면: 무공 상세 초식 · 관찰 창 3단계
    await p.evaluate(() => { S.manuals.paseok = { star: 12 }; ui.modal = 'mart:paseok'; renderModal(); });
    ok('5 무공 상세: 새 무공의 초식 이름', await p.evaluate(() => ['파석일권', '붕산권', '쇄석연타'].every(n => document.querySelector('.sheet .moves').textContent.includes(n))));
    await p.evaluate(() => { ui.modal = null; S.hp = 99999; setDestination('cheongpung'); ui.modal = null; render(); });
    const rp = await p.evaluate(() => { const r = S.expeditions[S.expeditions.length - 1]; const i = r.battles.findIndex(x => x.rounds.some(q => q.lines.some(l => /log-stance-title m/.test(l.cls)))); openReplay(r.id + ':' + Math.max(0, i)); return i; });
    await p.click('[data-rp="end"]');
    ok('5 관찰 창에 3단계 줄 (제목·지문·결과)', await p.evaluate(() => ['.log-stance-desc', '.log-stance-result'].every(s => document.querySelector('#rpLog ' + s))));
    await p.evaluate(() => { replayStop(); ui.modal = null; render(); });

    // 6. 저장 이전
    const mig = await p.evaluate(() => {
      const old = JSON.parse(JSON.stringify(S));
      old.manuals.yeolhwa = { star: 4 }; old.active.gigong = 'yeolhwa'; old.inv.bk_suryu = 1; delete old.manuals.byeokhwa;
      old.missions = [{ type: 'kill', target: 'dog', n: 3, prog: 0 }, { type: 'kill', target: 'rabbit', n: 3, prog: 0 }];
      old.bestiary = { dog: { met: 2, kills: 2 }, rabbit: { met: 1, kills: 1 } };
      const st = migrate(old);
      return { star: st.manuals.byeokhwa && st.manuals.byeokhwa.star, active: st.active.gigong, book: st.inv.bk_yusu, old: 'yeolhwa' in st.manuals || 'bk_suryu' in st.inv, missions: st.missions.map(m => m.target).join(), best: Object.keys(st.bestiary).join() };
    });
    ok('6 이전 저장: 열화기공→벽화공(성급 유지) · 수류 비급→유수심법 · 들개 임무/도감 정리', mig.star === 4 && mig.active === 'byeokhwa' && mig.book === 1 && !mig.old && mig.missions === 'rabbit' && mig.best === 'rabbit', JSON.stringify(mig));

    ok('오류/가로스크롤 없음', !errs.length && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), errs.join(';'));
    await p.close();
  }
};
