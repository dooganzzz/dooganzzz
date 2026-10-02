/* [화면] 입력 바인딩: 클릭·변경·키보드를 시스템 함수로 연결한다 */

/* ───────── 이벤트 ───────── */
/* 문서 전체에 한 번만 건다. 버튼의 data-* 속성으로 어떤 시스템 함수를 부를지 고른다. */
/* 인물에게 말을 걸면 그 사이에 오간 말(견문록에 남는 줄)을 대화 창으로 띄운다 */
function npcTalk(who, fn) {
  const last = S.log[S.log.length - 1];
  fn();
  const from = S.log.lastIndexOf(last) + 1;
  ui.npcTalk = { who, lines: S.log.slice(from).map(e => ({ text: e.text, cls: e.cls })) };
  if (ui.npcTalk.lines.length) ui.modal = 'npc';
  render();
}

function bindInput() {
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('input', e => {                          // 슬라이더: 대량 구매 개수 · 설정 값
    const t = e.target;
    if (t.dataset.buyqty) { ui.buyQty = +t.value; const w = t.closest('.buy-qty'); w.querySelector('.qty-n').textContent = `${t.value}개`; w.querySelector('.qty-sum').textContent = fmt(t.value * t.dataset.buyqty); }
    if (t.dataset.setting === 'potionAt') { const v = +t.value; S.settings = { ...(S.settings || {}), potionAt: v / 100 }; t.parentElement.querySelector('.set-val').textContent = `활력 ${v}% 이하`; notify.save(); }
  });
  document.addEventListener('keydown', e => { const c = e.target.closest && e.target.closest('[data-manual], [data-mart], [data-artslot], [data-fold]'); if (c && e.target === c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); if (c.dataset.fold) return toggleFold(c.dataset.fold); if (c.dataset.artslot) { ui.modal = 'artslot:' + c.dataset.artslot; return renderModal(); } ui.modal = c.dataset.mart ? 'mart:' + c.dataset.mart : 'manual:' + c.dataset.manual; renderModal(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.modal && ui.modal !== 'ending') { ui.modal = null; render(); } });
}

function onClick(e) {
  if (typing.size) skipTyping(e.timeStamp);       // 아무 곳이나 누르면 타자 연출을 건너뛴다
  const t = e.target.closest('button, [data-tab], [data-manual], [data-mart], [data-artslot], [data-fold]');
  if (!t || t.disabled) return;
  if (t.dataset.act === 'reset') return askReset();
  if (t.dataset.act === 'doreset') return doReset();
  if (!S) return;
  const d = t.dataset;
  if (d.tab) { if (ui.modal && ui.modal.startsWith('settle:')) { replayStop(); ui.modal = null; } goTab(d.tab, d.sub); if (d.tab === 'field') ui.fieldMap = !activeRun(); render(); return; }   // 강호행 탭: 먼저 지도
  if (d.encpick) {                                               // 기연 고르기
    const [uid, ci] = d.encpick.split(':').map(Number), r = resolveEncounter(uid, ci);
    if (r && r.fail) toast(r.fail); else if (r) { const g = encGainText(r); toast(`📜 ${r.text}${g ? ` (${g})` : ''}`); }
    render(); return;
  }
  if (d.mapzone) { if (!zoneUnlocked(d.mapzone)) return toast('앞 구역의 두목을 쓰러뜨리면 길이 열립니다.'); setDestination(d.mapzone); ui.modal = `mapgo:${d.mapzone}`; render(); return; }
  if (d.dest) return setDestination(d.dest);
  if (d.stage) { const n = +d.stage, run = activeRun(), X = S.expedition; if (run && run.zone === X.zone) stageGo(run, n); else if (n <= stageMax(X.zone)) { X.stage = n; } notify.save(); return render(); }
  if (d.stageauto !== undefined) { S.expedition.auto = S.expedition.auto === false; notify.save(); return render(); }
  if (d.chron) { ui.chronFilter = d.chron; return render(); }
  if (d.codextab) { ui.codexTab = d.codextab; return render(); }
  if (d.codexzone) { ui.codexZone = d.codexzone; return render(); }
  if (d.simzone) { ui.simZone = d.simzone; return render(); }
  if (d.codexcat) { ui.codexCat = d.codexcat; return render(); }
  if (d.watch) return openReplay(d.watch);
  if (d.rp) return replayControl(d.rp, d.x);
  if (d.starup) return askStarUp(d.starup);
  if (d.fold) return toggleFold(d.fold);
  if (d.shopmode) { ui.shopMode = d.shopmode; return render(); }
  if (d.shopbuy) { ui.shopBuy = d.shopbuy; return render(); }
  if (d.shopgear) { ui.shopGear = d.shopgear; return render(); }
  if (d.buy) return askBuy(d.buy);
  if (d.buygear) { const [base, t] = d.buygear.split(':'); return askBuyGear(base, +t); }
  if (d.sell || d.sellall) {                                 // 판매는 재확인
    const id = d.sell || d.sellall, n = d.sell ? 1 : count(id), I = ITEMS[id];
    return showConfirmModal({ title: '판매 확인', message: `${I.icon} <b>${esc(I.name)}</b> ${n}개를 ${hlSilver(itemSellPrice(id) * n)}에 팔까요?`, confirmText: '판매', cancelText: '취소', onConfirm: () => sellItem(id, n) });
  }
  if (d.sellgear) {
    const it = S.gear.find(g => g.uid === +d.sellgear); if (!it) return;
    return showConfirmModal({ title: '판매 확인', message: `[${RARITY[it.rarity].name}] <b>${esc(gearName(it))}</b>을(를) ${hlSilver(gearSellPrice(it))}에 팔까요? 판 장비는 되찾을 수 없습니다.`, confirmText: '판매', cancelText: '취소', onConfirm: () => sellGear(it.uid) });
  }
  if (d.enhance) return askEnhance(d.enhance);
  if (d.equipm) { equipManual(d.equipm); if (ui.modal && !ui.modal.startsWith('artslot:')) { ui.modal = 'mart:' + d.equipm; renderModal(); } return; }   // 무공 칸 창에서는 창을 그대로 둔다
  if (d.unequipm) { const id = S.active[d.unequipm]; unequipManual(d.unequipm); if (ui.modal && id && !ui.modal.startsWith('artslot:')) { ui.modal = 'mart:' + id; renderModal(); } return; }
  if (d.artslot) { ui.modal = 'artslot:' + d.artslot; return renderModal(); }
  if (d.mart) { ui.modal = 'mart:' + d.mart; return renderModal(); }
  if (d.manual) { ui.modal = 'manual:' + d.manual; return renderModal(); }
  if (d.use) return askUse(d.use);
  if (d.pray) return askPray(+d.pray);
  if (d.sim) { const b = simulate(d.sim); if (b) { ui.sim = { ...(ui.sim || {}), b }; openReplay('sim'); } return; }
  if (d.simx) { const r = simulateMany(d.simx, 10); if (r) { ui.sim = { ...(ui.sim || {}), many: r }; render(); } return; }
  if (d.craft) { ui.craft = d.craft; ui.pot = {}; ui.craftResult = null; return render(); }
  if (d.bind) { if (count(d.bind) < STUDY.need) return; const scrap = d.bind, id = studyBind(scrap); if (!id) return; ui.modal = null; render();   // 엮은 뒤 연출 (비급이 명경을 깨고 나옴) → 알림
    return studyBindFx(document.querySelector('.furnace-stage.study'), scrap, id).then(() => { toast(`📚 《${MANUALS[id].name}》 비급을 엮었습니다 — 행낭에서 확인하십시오`); render(); }); }
  if (d.add) { if (!getFilteredMaterials(ui.craft).includes(d.add)) return; if (potTotal(ui.pot) >= POT_MAX) return toast(`화로에는 ${POT_MAX}개까지만 들어갑니다.`); if ((ui.pot[d.add] || 0) >= count(d.add)) return; ui.pot[d.add] = (ui.pot[d.add] || 0) + 1; ui.craftResult = null; return render(); }
  if (d.rem) { ui.pot[d.rem]--; if (ui.pot[d.rem] <= 0) delete ui.pot[d.rem]; return render(); }
  if (d.subq) { claimSubq(); return; }
  if (d.subqzone) { const z = d.subqzone; npcTalk('master', () => subqPickZone(z)); if (ui.npcTalk) { ui.npcTalk.stages = z; render(); } return; }
  if (d.subqstage) { const [z, n] = d.subqstage.split(':'); npcTalk('master', () => acceptSubq(z, +n)); return; }
  if (d.buymanual) { const M = MANUALS[d.buymanual]; return askContrib(`《${M.name}》 비급`, M.cost, () => buyManual(d.buymanual), '비급은 행낭에 들어가고, [ 익히기 ]로 독파하면 영구 각인이 새겨집니다.'); }
  if (d.buybadge) { const g = SHOP_GEAR.find(x => x.id === d.buybadge); return askContrib(g.name, g.cost, () => buyBadge(d.buybadge), '신분패는 행낭에 들어갑니다. 무장에서 착용하십시오.'); }
  if (d.buylib) { const G = LIBRARY_GEAR[d.buylib]; return askContrib(`이류 장비 ${G.name}`, G.cost, () => buyLibraryGear(d.buylib), bonusText(G.stats)); }
  if (d.libtab) { ui.libTab = d.libtab; return render(); }
  if (d.skilltab) { ui.skillTab = d.skilltab; return render(); }
  if (d.slot) { ui.modal = 'equip:' + d.slot; return renderModal(); }   // 장비 칸 → 그 부위 장비 목록
  if (d.equip) return equipItem(+d.equip, d.to);
  if (d.unequip) return unequip(d.unequip);
  if (d.discard) { const it = S.gear.find(g => g.uid === +d.discard); if (!it) return; return requestActionConfirm({ title: '장비 버리기', description: `<b>${esc(gearName(it))}</b>을(를) 버립니다. 버린 장비는 되찾을 수 없습니다.`, details: ['은자 없이 사라짐'], confirmText: '버리기', onConfirm: () => discardGear(it.uid) }); }
  if (d.filter) { ui.bagFilter = d.filter; return render(); }
  if (d.fill) return fillPot(d.fill);
  if (d.recipe) return openRecipe(d.recipe);
  const acts = {
    craft: () => askCraft(),
    confirmok: confirmAccept, calm: toggleCalm, mirror: () => { ui.modal = 'mirror'; render(); }, callout: toggleCallout, talk: () => { ui.npcTalk = { who: 'arin', offer: true, lines: [{ text: `아린: "${pick(ARIN_TALK)}"` }, { text: '죽을 마시면 활력·내력이 모두 회복됩니다.', cls: 'offer' }] }; ui.modal = 'npc'; render(); },
    arineat: () => npcTalk('arin', arinCare), arinno: () => { ui.npcTalk = { who: 'arin', lines: [{ text: '아린: "힝… 그럼 다음에 꼭 드셔야 해요!"' }] }; render(); }, masterhint: () => npcTalk('master', masterTalk), subqask: () => { npcTalk('master', subqAsk); if (ui.npcTalk && subqLeft()) { ui.npcTalk.zones = true; render(); } }, jounguide: () => npcTalk('joun', jounGuide), supply: () => npcTalk('joun', jounSupply),
    hasan: () => requestActionConfirm({ title: '하산', description: '장문인께 하산을 청합니다. 제1장이 끝나며 되돌릴 수 없습니다.', details: ['낙양성 하산령 획득 · 제1장 완결'], confirmText: '하산을 청한다', onConfirm: doHasan }),
    runstart: () => { ui.modal = null; ui.fieldMap = true; goTab('field'); render(); },          // 강호행 시작은 지도에서 탐험지를 고르고 [출발]
    mapback: () => { ui.modal = null; ui.fieldMap = true; render(); },
    mapgo: () => {                                           // 강호행 시작: 쓰러지거나 귀환할 때까지 이어진다
      if (!S.expedition.zone) return toast('탐험지를 먼저 정하십시오.');
      ui.modal = null;
      const go = () => { if (startRun()) { ui.fieldMap = false; toast(`⛰️ 제자가 ${ZONES[S.expedition.zone].name}(으)로 길을 떠났습니다`); ui.enterAt = now(); goTab('field'); render(); } };   // 지도에서 떠나면 무대가 먹빛에서 밝아지며 열린다
      const warn = [!S.active.mugong && '무공을 하나도 펼치지 않았습니다 — 상태 탭 › 무공에서 비급을 익히고 펼치십시오', !has('saenghyeol') && '생혈고가 하나도 없습니다 — 전방에서 개당 5냥'].filter(Boolean);
      if (warn.length) return requestActionConfirm({ title: '이대로 떠날까요?', description: '준비가 모자라면 금방 쓰러질 수 있습니다. 쓰러지면 강호행은 끝납니다.', details: warn, confirmText: '그래도 떠난다', onConfirm: go });
      go();
    },
    logout: () => requestActionConfirm({ title: '로그아웃', description: '저장을 서버에 올리고 로그아웃합니다. 진행 중인 강호행은 다음에 로그인하면 이어집니다.', details: [], confirmText: '로그아웃', onConfirm: logout }),
    gigeok: () => { if (!has('gigeokdan')) { toast('기력단이 없습니다. 전방에서 50냥에 팝니다.'); return; } useItem('gigeokdan'); render(); },
    runstop: () => requestActionConfirm({ title: '귀환', description: '강호행을 멈추고 산문으로 돌아옵니다. 지금까지 얻은 것은 이미 받았습니다.', details: [], confirmText: '귀환한다', onConfirm: () => { recallRun(); render(); } }),
    closemodal: () => { if (ui.modal === 'confirm') return confirmCancel(); replayStop(); ui.modal = null; render(); },
    gochron: () => {                                          // 결산 창 → 견문록 탭, 방금 탐험의 결산을 펼쳐 보인다
      replayStop(); ui.modal = null; goTab('chronicle'); ui.chronFilter = 'all'; ui.chronOpen = +d.rec; render();
      const el = document.querySelector('.chron-row.chron-open'); if (el) el.scrollIntoView({ block: 'center' });
    },
    reset: askReset,
    doreset: doReset,
  };
  if (d.act && acts[d.act]) acts[d.act]();
}

/* ───────── 되돌릴 수 없는 행동: 무엇을 쓰고 무엇이 바뀌는지 요약해 동의를 받는다 ─────────
   (모자라서 어차피 못 하는 경우는 확인 없이 바로 넘겨, 시스템이 이유를 알려 주게 한다) */
function askStarUp(id) {
  const back = () => { if (ui.modal && ui.modal.startsWith('mart:')) renderModal(); };
  if (starUpBlock(id)) { starUp(id); return back(); }
  const M = MANUALS[id], m = S.manuals[id], pill = GATES[m.star];
  requestActionConfirm({ title: '성급 올리기', description: `《${M.name}》을(를) ${m.star}성에서 ${m.star + 1}성으로 올립니다. 쓴 수련치는 돌려받을 수 없습니다.`,
    details: [`수련치 -${fmt(starCost(id))}`, ...(pill ? [`${ITEMS[pill].name} -1`] : [])], confirmText: '성급 올리기', onConfirm: () => { starUp(id); back(); } });
}
function askBuy(id) {
  const row = SHOP_STOCK.find(r => r[0] === id); if (!row || S.silver < row[1]) return buyItem(id);
  const max = clamp(Math.floor(S.silver / row[1]), 1, 20); ui.buyQty = 1;   // 1~20개 (가진 은자만큼까지)
  requestActionConfirm({ title: '구매', description: `${ITEMS[id].icon} <b>${esc(ITEMS[id].name)}</b>을(를) 몇 개 살까요?
    <label class="buy-qty"><input type="range" min="1" max="${max}" value="1" data-buyqty="${row[1]}" aria-label="살 개수"><span><b class="qty-n">1개</b> · 은자 <b class="qty-sum">${row[1]}</b>냥</span></label>`,
    details: [`가진 은자 ${fmt(S.silver)}냥 · 한 번에 최대 ${max}개`], confirmText: '구매', onConfirm: () => buyItem(id, ui.buyQty || 1) });
}
function askBuyGear(base, tier) {
  const row = SHOP_GEAR_STOCK.find(r => r[0] === base && r[1] === tier); if (!row || S.silver < row[2]) return buyGear(base, tier);
  const sp = gearSpec(base, tier);
  requestActionConfirm({ title: '장비 구매', description: `<b>${esc(sp.name)}</b>을(를) 사서 행낭에 넣습니다.`, details: [`은자 -${row[2]}냥`, bonusText(sp.stats)], confirmText: '구매', onConfirm: () => buyGear(base, tier) });
}
function askEnhance(slot) {
  const it = S.equip[slot]; if (!it || (it.enh || 0) >= ENH_MAX || S.silver < enhCost(it)) return enhanceGear(slot);
  const back = ui.modal;
  requestActionConfirm({ title: '장비 강화', description: `<b>${esc(gearName(it))}</b>을(를) +${(it.enh || 0) + 1}로 벼립니다. 실패해도 은자는 돌아오지 않습니다.`,
    details: [`은자 -${fmt(enhCost(it))}냥`, `성공 확률 ${enhChance(it)}%`], confirmText: '강화', onConfirm: () => { enhanceGear(slot); if (back && back.startsWith('equip:')) { ui.modal = back; renderModal(); } } });
}
function askUse(id) {
  const I = ITEMS[id]; if (!I || !I.use || !has(id)) return useItem(id);
  if (I.use.learn) { const M = MANUALS[I.use.learn];
    if (S.manuals[I.use.learn]) return useItem(id);
    return requestActionConfirm({ title: '비급 독파', description: `《${M.name}》 비급을 끝까지 읽어 익힙니다. 비급은 사라지고 무공이 몸에 남습니다.`, details: [`${I.name} -1`, `영구 각인: ${bonusText(M.passiveBonus)}`], confirmText: '독파', onConfirm: () => useItem(id) }); }
  requestActionConfirm({ title: '단약 사용', description: `${I.icon} <b>${esc(I.name)}</b>을(를) 씁니다. ${esc(I.desc || '')}`, details: [`${I.name} -1`], confirmText: '사용', onConfirm: () => useItem(id) });
}
function askPray(times) {
  const n = Math.min(times, Math.floor(count('slag') / GACHA.cost)); if (n < 1) return pray(times);
  const left = GACHA.awaken - (S.statueResidueCount || 0);
  requestActionConfirm({ title: '무신상 공양', description: `검게 탄 찌꺼기를 무신상에 바칩니다. 무엇이 돌아올지는 알 수 없습니다.`,
    details: [`검게 탄 찌꺼기 -${n * GACHA.cost}개 (공양 ${n}회)`, `탁기 정화 +${n * GACHA.cost}${n * GACHA.cost >= left ? ' · 무신이 깨어납니다!' : ` (각성까지 ${left}개)`}`], confirmText: '공양', onConfirm: () => pray(times) });
}
function askCraft() {
  const flat = Object.entries(ui.pot).filter(([, n]) => n > 0); if (!flat.length) return doCraft(ui.craft, ui.pot);
  const C = CRAFTS[ui.craft], forge = ui.craft === 'forge', cost = craftCost(ui.craft);
  requestActionConfirm({ title: `${C.name} 시도`, description: '조합이 맞으면 완성품이 나오고, 틀리면 재료가 모두 타 버립니다.',
    details: [flat.map(([id, n]) => `${ITEMS[id].name} ×${n}`).join(' + ') + ' 소모', `${forge ? '체력' : '내력'} -${fmt(cost)} (최대의 10%)`, `실패 시 검게 탄 찌꺼기 ${talentOf().craft === 'forge' && ui.craft === 'forge' ? 2 : 1}개`], confirmText: forge ? '두드린다' : '내력을 주입한다', onConfirm: () => doCraft(ui.craft, ui.pot) });
}
function askContrib(name, cost, fn, note = '') {
  if (S.contrib < cost) return fn();
  requestActionConfirm({ title: '장경각 교환', description: `<b>${esc(name)}</b>을(를) 문파 공헌도로 교환합니다.${note ? ` ${note}` : ''}`, details: [`공헌도 -${fmt(cost)} (남는 공헌 ${fmt(S.contrib - cost)})`], confirmText: '교환', onConfirm: fn });
}

function onChange(e) {
  const t = e.target;
  if (t.dataset.setactive) setActive(t.dataset.setactive, t.value);
}
