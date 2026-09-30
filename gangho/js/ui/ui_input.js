/* [화면] 입력 바인딩: 클릭·변경·키보드를 시스템 함수로 연결한다 */

/* ───────── 이벤트 ───────── */
/* 문서 전체에 한 번만 건다. 버튼의 data-* 속성으로 어떤 시스템 함수를 부를지 고른다. */
function bindInput() {
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('keydown', e => { const c = e.target.closest && e.target.closest('[data-manual], [data-mart], [data-fold]'); if (c && e.target === c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); if (c.dataset.fold) return toggleFold(c.dataset.fold); ui.modal = c.dataset.mart ? 'mart:' + c.dataset.mart : 'manual:' + c.dataset.manual; renderModal(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.modal && ui.modal !== 'ending') { ui.modal = null; render(); } });
}

function onClick(e) {
  if (typing.size) skipTyping(e.timeStamp);       // 아무 곳이나 누르면 타자 연출을 건너뛴다
  const t = e.target.closest('button, [data-tab], [data-manual], [data-mart], [data-fold]');
  if (!t || t.disabled) return;
  if (t.dataset.act === 'reset') return askReset();
  if (t.dataset.act === 'doreset') return doReset();
  if (!S) return;
  const d = t.dataset;
  if (d.tab) { if (ui.modal && ui.modal.startsWith('settle:')) { replayStop(); ui.modal = null; } goTab(d.tab, d.sub); render(); return; }
  if (d.dest) return setDestination(d.dest);
  if (d.chron) { ui.chronFilter = d.chron; return render(); }
  if (d.watch) return openReplay(d.watch);
  if (d.rp) return replayControl(d.rp, d.x);
  if (d.starup) { starUp(d.starup); if (ui.modal && ui.modal.startsWith('mart:')) renderModal(); return; }
  if (d.fold) return toggleFold(d.fold);
  if (d.shopmode) { ui.shopMode = d.shopmode; return render(); }
  if (d.buy) return buyItem(d.buy);
  if (d.buygear) { const [base, t] = d.buygear.split(':'); return buyGear(base, +t); }
  if (d.sell) return sellItem(d.sell, 1);
  if (d.sellall) return sellItem(d.sellall, count(d.sellall));
  if (d.sellgear) return sellGear(+d.sellgear);
  if (d.enhance) return enhanceGear(d.enhance);
  if (d.equipm) { equipManual(d.equipm); if (ui.modal) { ui.modal = 'mart:' + d.equipm; renderModal(); } return; }
  if (d.unequipm) { const id = S.active[d.unequipm]; unequipManual(d.unequipm); if (ui.modal && id) { ui.modal = 'mart:' + id; renderModal(); } return; }
  if (d.mart) { ui.modal = 'mart:' + d.mart; return renderModal(); }
  if (d.manual) { ui.modal = 'manual:' + d.manual; return renderModal(); }
  if (d.use) return useItem(d.use);
  if (d.pray) return pray(+d.pray);
  if (d.sim) { const b = simulate(d.sim); if (b) { ui.sim = { ...(ui.sim || {}), b }; openReplay('sim'); } return; }
  if (d.simx) { const r = simulateMany(d.simx, 10); if (r) { ui.sim = { ...(ui.sim || {}), many: r }; render(); } return; }
  if (d.craft) { ui.craft = d.craft; ui.pot = {}; ui.craftResult = null; return render(); }
  if (d.add) { if (ITEMS[d.add].craftType !== CRAFT_TYPE[ui.craft]) return; if (potTotal(ui.pot) >= POT_MAX) return toast(`화로에는 ${POT_MAX}개까지만 들어갑니다.`); if ((ui.pot[d.add] || 0) >= count(d.add)) return; ui.pot[d.add] = (ui.pot[d.add] || 0) + 1; ui.craftResult = null; return render(); }
  if (d.rem) { ui.pot[d.rem]--; if (ui.pot[d.rem] <= 0) delete ui.pot[d.rem]; return render(); }
  if (d.mission) return completeMission(+d.mission);
  if (d.buymanual) return buyManual(d.buymanual);
  if (d.buybadge) return buyBadge(d.buybadge);
  if (d.slot) { ui.slotSel = ui.slotSel === d.slot ? null : d.slot; return render(); }
  if (d.equip) return equipItem(+d.equip);
  if (d.unequip) return unequip(d.unequip);
  if (d.discard) return discardGear(+d.discard);
  if (d.filter) { ui.bagFilter = d.filter; return render(); }
  if (d.fill) return fillPot(d.fill);
  if (d.recipe) return openRecipe(d.recipe);
  const acts = {
    craft: () => doCraft(ui.craft, ui.pot), clearpot: () => { ui.pot = {}; render(); },
    rest, snack: arinSnack, talk: arinTalk, masterhint: masterHint, jounguide: jounGuide, supply: jounSupply, reroll: rerollMissions,
    hasan: doHasan, closemodal: () => { replayStop(); ui.modal = null; render(); },
    reset: askReset,
    doreset: doReset,
  };
  if (d.act && acts[d.act]) acts[d.act]();
}

function onChange(e) {
  const t = e.target;
  if (t.dataset.setactive) setActive(t.dataset.setactive, t.value);
}
