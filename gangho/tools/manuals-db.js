/* 비급 DB 뽑기: data/skills.js의 모든 무공을 탭으로 나눈 표(docs/비급DB.tsv)로 뽑는다. 스프레드시트에 그대로 붙여 넣을 수 있다.
   쓰는 법: node gangho/tools/manuals-db.js — 무공을 고치거나 더하면 다시 돌린다 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), ctx = {};
vm.createContext(ctx);
for (const f of ['js/core.js', 'js/data/assets.js', 'js/data/items.js', 'js/data/martial_arts.js', 'js/data/skills.js'])
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n;globalThis.__M = typeof MANUALS !== "undefined" ? MANUALS : null; globalThis.__C = typeof CATS !== "undefined" ? CATS : null; globalThis.__W = typeof WEAPON_SHORT !== "undefined" ? WEAPON_SHORT : null; globalThis.__S = typeof STAT_NAMES !== "undefined" ? STAT_NAMES : null; globalThis.__P = typeof CAT_POEMS !== "undefined" ? CAT_POEMS : null; globalThis.__A = typeof MANUAL_ART !== "undefined" ? MANUAL_ART : null;', ctx, { filename: f });
const M = ctx.__M, CATS = ctx.__C || {}, W = ctx.__W || {}, SN = ctx.__S || {}, ART = ctx.__A || {};
const ELEM = { metal: '금', wood: '목', water: '수', fire: '화', earth: '토' };
const stats = o => Object.entries(o || {}).map(([k, v]) => `${SN[k] || k} +${v}`).join(', ');
const clean = s => String(s == null ? '' : s).replace(/[\t\r\n]+/g, ' ');
const head = ['ID', '이름', '한자', '갈래', '등급', '병기', '지형', '오행', '제1초식', '제2초식(소성)', '오의(대성)', '독파 보너스', '장착 고유 능력치', '파', '초식 그림', '시 제목', '시문', '설명'];
const rows = [head];
for (const [id, m] of Object.entries(M)) {
  const st = m.stances || [], poem = m.poem;
  rows.push([id, m.name, m.hanja, (CATS[m.cat] && CATS[m.cat].name) || m.cat, m.grade, m.weapon ? W[m.weapon] || m.weapon : '', m.terrain || '', ELEM[m.elem] || m.elem || '',
    st[0] ? `${st[0].name} — ${st[0].desc}` : '', st[1] ? `${st[1].name} — ${st[1].desc}` : '', st[2] ? `${st[2].name} — ${st[2].desc}` : '',
    stats(m.passiveBonus), stats(m.extra), ({ jeong: '정', ma: '마', sa: '사' })[m.school || 'jeong'], (ART[id] || []).join(' · '), poem ? poem.title : '', poem ? poem.lines.join(' / ') : '', m.desc].map(clean));
}
const out = path.join(ROOT, 'docs', '비급DB.tsv');
fs.writeFileSync(out, '﻿' + rows.map(r => r.join('\t')).join('\n') + '\n');
console.log(`비급 ${rows.length - 1}종 → ${path.relative(path.join(ROOT, '..'), out)}`);
