/* 무공 탭: 비급 습득·장착/해제 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
  console.log(`\n=== ${w}px ===`);
  const p = await newPage(b, w, h);
  const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && !/ERR_CERT|ERR_FILE_NOT_FOUND/.test(m.text()) && errs.push(m.text()));
  await p.goto(GAME_URL);
  await p.click('[data-starter="samjaeDo"]'); await p.click('#begin');
  const tabs = await p.$$eval('.tab .ko', e => e.map(x => x.textContent).join(','));
  ok('1 1차 탭 5개 순서', tabs === '청풍문,상태,행낭,강호행,도감', tabs);
  const st0 = await p.evaluate(() => ({ learned: Object.keys(S.manuals).length, active: Object.values(S.active).filter(Boolean).length, books: Object.keys(S.inv).filter(k => ITEMS[k].kind === '비급').sort().join(',') }));
  ok('2 시작 시 장착·습득 없음', st0.learned === 0 && st0.active === 0);
  ok('2 비급 4권 지급', st0.books === 'bk_cheolpo,bk_pocheolsak,bk_samjaeDo,bk_tonap', st0.books);
  // 빈 슬롯 상태: 연무장·전투
  await p.click('[data-tab="sect"]'); await p.click('[data-sub="yeonmu"]');
  ok('3 미장착이면 연무장 수련 불가', (await p.$$('[data-train]')).length === 0 && (await p.$$('.empty-art')).length === 4);
  const bare = await p.evaluate(() => { S.hp = 9999; enterZone('cheongpung'); const r = fightSync('rabbit').win; RT.battle.over = true; closeBattle(); leaveZone(); return r; });
  ok('무공 없이도 맨손 전투 가능', bare === true);
  // 행낭에서 익히기
  await p.click('[data-tab="bag"]'); await p.click('[data-filter="비급"]');
  const btns = await p.$$eval('.items .item button', e => e.map(x => x.textContent));
  ok('2 행낭 비급 [익히기] 버튼', btns.length === 4 && btns.every(t => t === '익히기'), btns.join(','));
  await p.click('[data-use="bk_samjaeDo"]');
  const l1 = await p.evaluate(() => ({ learned: !!S.manuals.samjaeDo, left: count('bk_samjaeDo') }));
  ok('2 익히기: 소모 + 습득 목록 등록', l1.learned && l1.left === 0);
  for (const k of ['bk_tonap', 'bk_pocheolsak', 'bk_cheolpo']) await p.click(`[data-use="${k}"]`);
  // 상태 › 무공
  await p.click('[data-tab="status"]'); await p.click('[data-sub="martial"]');
  const m1 = await p.evaluate(() => ({ slots: [...document.querySelectorAll('.mslot .mslot-cat .ko')].map(e => e.textContent).join(','), empty: document.querySelectorAll('.mslot.empty').length, cards: [...document.querySelectorAll('.mcard b')].map(e => e.textContent).join(',') }));
  ok('3 상단 4대 슬롯 (빈 상태)', m1.slots === '무공,심법,경공,기공' && m1.empty === 4, m1.slots);
  ok('3 하단 익힌 무공 카드', m1.cards === '《삼재도법》,《토납법》,《포철삭》,《철포삼》', m1.cards);
  await p.click('.mcard >> text=《삼재도법》');
  const md = await p.evaluate(() => { const sh = document.querySelector('.sheet'); return { title: sh.querySelector('h2').textContent, prog: sh.querySelector('p.num').textContent, desc: sh.querySelector('p.story').textContent, bonus: [...sh.querySelectorAll('.kv span')].map(e => e.textContent).slice(0, 2).join(','), btn: sh.querySelector('[data-equipm]') && sh.querySelector('[data-equipm]').textContent }; });
  ok('4 명칭·등급', md.title.includes('《삼재도법》') && md.title.includes('[삼류 무공]'), md.title);
  ok('4 성급·숙련도', md.prog === '현재 1성 / 실전 0% / 수련 0%', md.prog);
  ok('4 설명문', md.desc.length > 20, md.desc.slice(0, 30) + '…');
  ok('4 보너스 효과', md.bonus.startsWith('공격력'), md.bonus);
  ok('4 미장착 → [ 장착하기 ]', md.btn === '[ 장착하기 ]');
  const atk0 = await p.evaluate(() => calcStats().atk);
  await p.click('[data-equipm]');
  const e1 = await p.evaluate(() => ({ active: S.active.mugong, atk: calcStats().atk, btn: document.querySelector('.sheet [data-unequipm]') && document.querySelector('.sheet [data-unequipm]').textContent }));
  ok('4 장착 → 슬롯 반영·능력치 상승', e1.active === 'samjaeDo' && e1.atk > atk0, `공격력 ${atk0}→${e1.atk}`);
  ok('4 장착 상태 → [ 장착 해제 ]', e1.btn === '[ 장착 해제 ]');
  await p.click('[data-act="closemodal"]');
  for (const id of ['tonap', 'pocheolsak', 'cheolpo']) { await p.click(`.mcard[data-mart="${id}"]`); await p.click('[data-equipm]'); await p.click('[data-act="closemodal"]'); }
  ok('3 네 슬롯 모두 장착', (await p.$$('.mslot.empty')).length === 0);
  // 수련 → 해제 시 수련 정지
  await p.evaluate(() => toggleTraining('simbeop'));
  await p.click('.mslot [data-unequipm="simbeop"]');
  const u = await p.evaluate(() => ({ slot: S.active.simbeop, train: S.activeTrainingSkillId, keep: !!S.manuals.tonap }));
  ok('3 장착 해제 → 빈 슬롯, 수련 정지, 습득은 유지', u.slot === null && u.train === null && u.keep, JSON.stringify(u));
  ok('3 해제된 비급은 연무장 수련 불가', await p.evaluate(() => { ui.tab = 'sect'; ui.sectSub = 'yeonmu'; render(); return !document.querySelector('[data-train="simbeop"]'); }));
  // 장경각 → 비급서
  const shop = await p.evaluate(() => { S.contrib = 999; buyManual('cpDo'); return { book: count('bk_cpDo'), learned: !!S.manuals.cpDo }; });
  ok('장경각 구매 → 행낭 비급서', shop.book === 1 && !shop.learned);
  const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
  }
};
