/* 계층 규칙 검사 (브라우저 없이 정적으로):
   - data/: 순수 정적 데이터. 함수·반복문·다른 파일 참조 없음
   - systems/·core.js: DOM 조작 금지, 화면 계층(ui/) 함수와 화면 상태(ui) 참조 금지
   - ui/: 시스템을 부를 수 있지만 저장소(localStorage)에 직접 손대지 않음
   - 그림 경로('assets/')는 data/assets.js 목록과 ui_assets.js(ASSET)에서만 */
'use strict';
const fs = require('fs'), path = require('path');
const JS = path.join(__dirname, '..', 'js');
const read = f => fs.readFileSync(path.join(JS, f), 'utf8');
const list = d => fs.readdirSync(path.join(JS, d)).filter(f => f.endsWith('.js')).map(f => d + '/' + f);
// 주석·문자열을 지운 코드 (템플릿 문자열 안의 ${...} 식은 남긴다)
function code(src) {
  let out = '', i = 0;
  const n = src.length;
  function tpl() {           // ` 안: ${ } 식만 남긴다
    i++;
    while (i < n && src[i] !== '`') {
      if (src[i] === '\\') { i += 2; continue; }
      if (src[i] === '$' && src[i + 1] === '{') { i += 2; let depth = 1; let inner = ''; while (i < n && depth) { if (src[i] === '`') { const save = out; out = ''; tpl(); inner += out; out = save; continue; } if (src[i] === '{') depth++; if (src[i] === '}') depth--; if (depth) inner += src[i]; i++; } out += ' ' + code(inner) + ' '; continue; }
      i++;
    }
    i++;
  }
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '*') { i = src.indexOf('*/', i + 2) + 2; continue; }
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === "'" || c === '"') { const q = c; i++; while (i < n && src[i] !== q) { if (src[i] === '\\') i++; i++; } i++; out += '""'; continue; }
    if (c === '`') { tpl(); out += '""'; continue; }
    out += c; i++;
  }
  return out;
}
const defs = f => [...read(f).matchAll(/^(?:function|const|let) ([\w$]+)/gm)].map(m => m[1]);
const bad = [];
const uiFiles = list('ui'), sysFiles = list('systems'), dataFiles = list('data');
const uiNames = new Set([...uiFiles, 'app.js'].flatMap(defs).filter(n => !['S', 'RT', 'log', 'SAVE_KEY', 'newState', 'lastFrame'].includes(n)));
// app.js의 상태(S·RT)와 log는 시스템이 쓰는 공용 상태 통로다
const DOM = /\b(document|window|localStorage|sessionStorage|location|matchMedia|requestAnimationFrame|HTMLElement|innerHTML|querySelector\w*|classList|addEventListener)\b/;
for (const f of [...sysFiles, 'core.js']) {
  const c = code(read(f));
  c.split('\n').forEach((line, i) => {
    if (DOM.test(line)) bad.push(`${f}:${i + 1} DOM 접근: ${line.trim().slice(0, 80)}`);
    if (/\bui\.\w/.test(line)) bad.push(`${f}:${i + 1} 화면 상태 ui 참조: ${line.trim().slice(0, 80)}`);
    for (const m of line.matchAll(/(?<![\w.$])([\w$]+)\s*\(/g)) if (uiNames.has(m[1])) bad.push(`${f}:${i + 1} 화면 함수 호출 ${m[1]}()`);
    if (/(?<![\w.$])\$\(/.test(line)) bad.push(`${f}:${i + 1} $() 사용`);
  });
}
for (const f of dataFiles) {
  const c = code(read(f));
  c.split('\n').forEach((line, i) => {
    if (/=>|\bfunction\b|\bfor\s*\(|\bwhile\s*\(|\bif\s*\(|\.push\(|\bMath\./.test(line)) bad.push(`${f}:${i + 1} 데이터 파일에 로직: ${line.trim().slice(0, 80)}`);
  });
}
for (const f of uiFiles) {
  const c = code(read(f));
  c.split('\n').forEach((line, i) => { if (/\blocalStorage\b/.test(line)) bad.push(`${f}:${i + 1} 화면에서 저장소 직접 접근`); });
}
// 그림 경로는 목록 한곳에서만 (주석은 빼고 문자열까지 본다)
for (const f of [...uiFiles, ...sysFiles, 'core.js', 'app.js'].filter(f => f !== 'ui/ui_assets.js')) {
  read(f).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').forEach((line, i) => { if (/assets\//.test(line.replace(/\/\/.*$/, ''))) bad.push(`${f}:${i + 1} 그림 경로 직접 사용 (ASSET으로): ${line.trim().slice(0, 60)}`); });
}
// index.html 읽는 순서: core → data → systems → ui → app
const html = fs.readFileSync(path.join(JS, '..', 'index.html'), 'utf8');
const order = [...html.matchAll(/<script src="js\/([^"?]+)/g)].map(m => m[1]);
const rank = f => f === 'core.js' ? 0 : f.startsWith('data/') ? 1 : f.startsWith('systems/') ? 2 : f.startsWith('ui/') ? 3 : f === 'app.js' ? 4 : 9;
if (order.some((f, i) => i && rank(f) < rank(order[i - 1]))) bad.push('index.html 스크립트 순서가 core → data → systems → ui → app 이 아님');
const all = ['core.js', ...dataFiles, ...sysFiles, ...uiFiles, 'app.js'];
for (const f of all) if (!order.includes(f)) bad.push(`index.html에 ${f}가 빠짐`);
module.exports = () => bad;
if (require.main === module) { console.log(bad.length ? bad.join('\n') : '계층 규칙 위반 없음'); process.exit(bad.length ? 1 : 0); }
