/* 시문 문서 만들기: data/skills.js의 무공 · 초식 · 시(poem)와 갈래별 시(CAT_POEMS)를 docs/시문.md로 뽑는다.
   시문은 무공 그림(초식 · 오의)의 바탕이므로, 시나 초식을 고치면 다시 돌린다. 쓰는 법: node gangho/tools/poems-doc.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), ctx = {};
vm.createContext(ctx);
for (const f of ['js/core.js', 'js/data/assets.js', 'js/data/martial_arts.js', 'js/data/skills.js'])
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n;globalThis.__M = typeof MANUALS !== "undefined" ? MANUALS : null; globalThis.__P = typeof CAT_POEMS !== "undefined" ? CAT_POEMS : null; globalThis.__A = typeof MANUAL_ART !== "undefined" ? MANUAL_ART : null; globalThis.__C = typeof CATS !== "undefined" ? CATS : null; globalThis.__W = typeof WEAPON_SHORT !== "undefined" ? WEAPON_SHORT : null;', ctx, { filename: f });
const M = ctx.__M, P = ctx.__P, ART = ctx.__A || {}, CATS = ctx.__C || {}, W = ctx.__W || {};
const catName = k => W[k] ? W[k] + '법' : (CATS[k] && CATS[k].name) || k;
const out = ['# 강호견문록 시문 (詩文)', '', '> 자동 생성: `node gangho/tools/poems-doc.js` — 원본은 `js/data/skills.js` (무공의 `poem` · `stances`, 갈래별 `CAT_POEMS`).',
  '> 규칙(유저 확정): 모든 무공의 초식 · 오의 그림은 이 시문(과 무공 이름)을 바탕으로 그린다. 두루마리 외침에 무공 이름 · 초식 이름 · 시구가 나온다.',
  '> 그림 있는 무공: ' + (Object.entries(ART).map(([k, v]) => `${k}(${v.join(' · ')})`).join(', ') || '없음') + ' — 그림이 없는 초식 · 오의는 평타가 나간다.', ''];
const byGrade = {};
for (const [id, m] of Object.entries(M)) { if (!m.poem && !m.stances) continue; (byGrade[m.grade] = byGrade[m.grade] || []).push([id, m]); }
for (const [g, list] of Object.entries(byGrade)) {
  out.push(`## ${g}`, '');
  for (const [id, m] of list) {
    out.push(`### ${m.name} ${m.hanja || ''} \`${id}\`${ART[id] ? ' 🎨' : ''}`);
    out.push(`- 갈래: ${(CATS[m.cat] && CATS[m.cat].name) || m.cat}${m.weapon ? ' · 병기 ' + (W[m.weapon] || m.weapon) : ''}`);
    if (m.stances) m.stances.forEach((s, i) => out.push(`- ${['제1초식', '제2초식', '오의'][i] || `제${i + 1}초식`}: **${s.name}** — ${s.desc}`));
    if (m.poem) { out.push(`- 시 「${m.poem.title}」`); m.poem.lines.forEach(l => out.push(`  > ${l}`)); }
    out.push('');
  }
}
if (P) {
  out.push('## 갈래별 시 (검법 외 비급 — [짧은 시(삼류 · 이류) · 보통 시(일류 · 절정) · 긴 시(초절정)])', '');
  for (const [cat, arr] of Object.entries(P)) {
    out.push(`### ${catName(cat)} \`${cat}\``);
    arr.forEach((p, i) => { const t = p.title || ['짧은 시', '보통 시', '긴 시'][i]; out.push(`- 「${t}」`); (p.lines || p).forEach(l => out.push(`  > ${l}`)); });
    out.push('');
  }
}
fs.writeFileSync(path.join(ROOT, 'docs', '시문.md'), out.join('\n'));
console.log('docs/시문.md', out.length, '줄');
