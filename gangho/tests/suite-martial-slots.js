/* 무공 탭: 비급 습득·장착/해제 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
  console.log(`\n=== ${w}px ===`);
  const p = await newPage(b, w, h);
  const errs = watchErrors(p);
  await p.goto(GAME_URL);
  await p.click('[data-starter="bd1a"]'); await p.click('#begin');
  const tabs = await p.$$eval('.tab .ko', e => e.map(x => x.textContent).join(','));
  ok('1 1차 탭 순서', tabs === '청풍문,관조,행낭,강호행,견문록,기연,도감,설정', tabs);
  const st0 = await p.evaluate(() => ({ learned: Object.keys(S.manuals).length, active: Object.values(S.active).filter(Boolean).length, books: Object.keys(S.inv).filter(k => ITEMS[k].kind === '비급').sort().join(',') }));
  ok('2 시작 시 장착·습득 없음', st0.learned === 0 && st0.active === 0);
  const gifts = await p.evaluate(() => Object.keys(S.inv).filter(k => ITEMS[k].kind === '비급' && k !== 'bk_bd1a').map(k => [MANUALS[k.slice(3)].cat, MANUALS[k.slice(3)].grade, schoolOf(k.slice(3))].join('/')).sort().join(','));
  ok('2 비급 4권 지급 (입문 무공 + 삼류 정파 심법 · 경공 · 기공 무작위)', st0.books.split(',').length === 4 && gifts === 'gigong/삼류/jeong,gyeonggong/삼류/jeong,simbeop/삼류/jeong', gifts);
  // 빈 슬롯 상태: 연무장·전투
  const bare = await p.evaluate(() => { S.hp = 9999; return fightSync('rabbit').win; });
  ok('무공 없이도 맨손 전투 가능', bare === true);
  // 행낭에서 익히기
  await p.click('[data-tab="bag"]'); await p.click('[data-filter="etc"]');
  const btns = await p.$$eval('.items .item button[data-use^="bk_"]', e => e.map(x => x.textContent));
  ok('2 행낭 비급 [익히기] 버튼', btns.length === 4 && btns.every(t => t === '익히기'), btns.join(','));
  await p.evaluate(() => { learnManual('bk_bd1a'); render(); });
  const l1 = await p.evaluate(() => ({ learned: !!S.manuals.bd1a, left: count('bk_bd1a') }));
  ok('2 익히기: 소모 + 습득 목록 등록', l1.learned && l1.left === 0);
  for (const k of await p.evaluate(() => Object.keys(S.inv).filter(k => ITEMS[k].kind === '비급'))) { await p.evaluate(k => { learnManual(k); render(); }, k); }   // 익히기 단추는 무공 탭에서 뺌 (행낭에서 익힘)
  // 관조 › 무공
  await p.click('[data-tab="status"]'); await p.click('[data-sub="martial"]');
  const m1 = await p.evaluate(() => ({ slots: [...document.querySelectorAll('.mslot .mslot-cat .ko')].map(e => e.textContent).join(','), empty: document.querySelectorAll('.mslot.empty').length, cards: [...document.querySelectorAll('.mrow .mrow-name')].map(e => e.textContent).join(','), total: (document.querySelector('.total-count-badge') || {}).textContent }));
  ok('3 방위 4대 슬롯 (빈 상태 · 12시 심법 9시 무공 3시 기공 6시 경공)', m1.slots === '심법,무공,기공,경공' && m1.empty === 4, m1.slots);
  ok('3 습득 비급: [무공] 탭에 《단풍도법》 · 전체 4권', m1.cards === '《단풍도법》' && /4/.test(m1.total || ''), JSON.stringify(m1));
  await p.click('.mrow-name >> text=《단풍도법》');
  const md = await p.evaluate(() => { const sh = document.querySelector('.sheet'); return { title: sh.querySelector('h2').textContent, prog: sh.querySelector('p.num').textContent, desc: sh.querySelector('p.story').textContent, bonus: [...sh.querySelectorAll('.kv span')].map(e => e.textContent).slice(0, 2).join(','), btn: sh.querySelector('[data-equipm]') && sh.querySelector('[data-equipm]').textContent }; });
  ok('4 명칭·등급', md.title.includes('《단풍도법》') && md.title.includes('[삼류 무공]'), md.title);
  ok('4 성급·다음 성까지 수련치', /^현재 1성 \/ 다음 성까지 수련치 60 \(보유 \d+\)$/.test(md.prog), md.prog);
  ok('4 설명문', md.desc.length > 20, md.desc.slice(0, 30) + '…');
  ok('4 보너스 효과', md.bonus.startsWith('공격력'), md.bonus);
  ok('4 미장착 → [ 장착하기 ]', md.btn === '[ 장착하기 ]');
  const atk0 = await p.evaluate(() => calcStats().atk);
  await p.click('.sheet [data-equipm]');
  const e1 = await p.evaluate(() => ({ active: S.active.mugong, atk: calcStats().atk, btn: document.querySelector('.sheet [data-unequipm]') && document.querySelector('.sheet [data-unequipm]').textContent }));
  ok('4 장착 → 슬롯 반영·능력치 상승', e1.active === 'bd1a' && e1.atk > atk0, `공격력 ${atk0}→${e1.atk}`);
  ok('4 장착 상태 → [ 장착 해제 ]', e1.btn === '[ 장착 해제 ]');
  await p.click('[data-act="closemodal"]');
  for (const [id, tab] of [['sm1a', 'heart'], ['gy1a', 'agility'], ['gi1a', 'aura']]) { await p.click(`[data-skilltab="${tab}"]`); await p.click(`.mrow-name[data-mart="${id}"]`); await p.click('.sheet [data-equipm]'); await p.click('[data-act="closemodal"]'); }
  ok('3 네 슬롯 모두 장착', (await p.$$('.mslot.empty')).length === 0);
  // 장착 슬롯의 [▲ 성급] 단추: 수련치가 모자라면 비활성, 채우면 올라감
  ok('3 습득 비급 목록에 성급 올리기 단추 (수련치 부족 → 비활성)', await p.evaluate(() => { ui.skillTab = 'heart'; render(); const b = document.querySelector('.mrow [data-starup="sm1a"]'); return !!b && b.disabled; }));
  await p.evaluate(() => { S.exp = 500; render(); });
  await p.evaluate(() => { ui.skillTab = 'heart'; render(); }); await p.click('.mrow [data-starup="sm1a"]'); await p.click('[data-act="confirmok"]');
  ok('3 [▲ 성급] 누르면 2성 · 수련치 차감', await p.evaluate(() => S.manuals.sm1a.star === 2 && S.exp === 500 - Math.round(60 * GRADES[MANUALS.sm1a.grade].mult)));
  await p.evaluate(() => { ui.skillTab = 'heart'; render(); }); await p.click('.mrow [data-unequipm="simbeop"]');
  const u = await p.evaluate(() => ({ slot: S.active.simbeop, keep: !!S.manuals.sm1a }));
  ok('3 장착 해제 → 빈 슬롯, 습득은 유지', u.slot === null && u.keep, JSON.stringify(u));
  // 장보각 → 비급서
  const shop = await p.evaluate(() => { S.contrib = 999; buyManual('bd2b'); return { book: count('bk_bd2b'), learned: !!S.manuals.bd2b }; });
  ok('장보각 구매 → 행낭 비급서', shop.book === 1 && !shop.learned);
  const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
  }
};
