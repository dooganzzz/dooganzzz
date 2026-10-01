/* 그림 점검: assets/art 파일 중 코드 · 데이터 어디에도 이름이 나오지 않는 것(안 쓰는 후보)과 용량을 보여 준다.
   이름은 접두어(hero_ · foe_ · walk_)와 꼬리(_atk · _1 · _2)를 떼고 찾는다. 지우기 전에 눈으로 한 번 더 확인할 것.
   쓰는 법: node gangho/tools/assets-check.js */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), ART = path.join(ROOT, 'assets', 'art');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const src = [...walk(path.join(ROOT, 'js')), ...walk(path.join(ROOT, 'css')), path.join(ROOT, 'index.html')]
  .filter(f => /\.(js|css|html)$/.test(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n');
const has = id => new RegExp(`['"\`\\s{,(]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`:\\s,)_]`).test(src);
let total = 0, unused = 0; const rows = [];
for (const f of walk(ART)) {
  if (!/\.(png|jpe?g|webp|gif|svg)$/.test(f)) continue;
  const size = fs.statSync(f).size; total += size;
  const stem = path.basename(f).replace(/\.\w+$/, ''), id = stem.replace(/^(hero|foe|walk|emb|w|s|b|h)_/, '').replace(/_(atk|[12])$/, '');
  if (!has(stem) && !has(id)) { unused += size; rows.push(`${(size / 1024).toFixed(0).padStart(6)}KB  ${path.relative(ROOT, f)}`); }
}
console.log(rows.length ? `안 쓰는 후보 ${rows.length}개:\n${rows.join('\n')}` : '안 쓰는 그림 없음');
console.log(`전체 ${(total / 1048576).toFixed(1)}MB · 안 쓰는 후보 ${(unused / 1048576).toFixed(1)}MB`);
