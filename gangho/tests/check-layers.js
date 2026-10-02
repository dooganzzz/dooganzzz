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
// 초식 그림은 ui_sprite.js의 stanceFxSrc · stanceFxEl 한 곳에서만 고른다 (화면마다 따로 고르면 그림을 바꿔도 옛 그림이 다른 화면에 남는다)
for (const f of [...uiFiles, 'app.js'].filter(f => f !== 'ui/ui_sprite.js')) {
  read(f).split('\n').forEach((line, i) => { if (/\bmanualFx\(|['"`]cut_\$\{/.test(line)) bad.push(`${f}:${i + 1} 초식 그림을 직접 고름 — stanceFxEl · stanceFxSrc를 쓸 것`); });
}
// 오의 그림 · 설정은 ui_ougi.js의 ougiCfg 한 곳에서만 고른다 (무공 제 오의가 병기 공용 오의와 겹치지 않게)
for (const f of [...uiFiles, 'app.js'].filter(f => f !== 'ui/ui_ougi.js')) {
  read(f).split('\n').forEach((line, i) => { if (/\bOG_CFG\b|\bOG_MANUAL\b|['"`]ougi_/.test(line)) bad.push(`${f}:${i + 1} 오의 그림을 직접 고름 — ui_ougi.js의 ougiCfg를 쓸 것`); });
}
// 무공 고유 그림(manual/무공id/)은 그 무공 자신에게만: ASSET.manual은 초식 · 오의를 고르는 두 함수(ui_sprite.js · ui_ougi.js)에서만,
// 무공 id를 글자로 박아 넣지 않고(다른 무공 그림을 빌려 쓰지 않게) 부른다. 공용 그림은 common/ (ASSET.common)
for (const f of [...uiFiles, ...sysFiles, 'app.js']) {
  read(f).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').forEach((line, i) => {
    const c = line.replace(/\/\/.*$/, '');
    if (/ASSET\.manual\(/.test(c) && !['ui/ui_sprite.js', 'ui/ui_ougi.js', 'ui/ui_assets.js'].includes(f)) bad.push(`${f}:${i + 1} 무공 고유 그림을 다른 곳에서 씀 — stanceFxSrc · ougiCfg로만`);
    if (/ASSET\.manual\(\s*['"`]/.test(c)) bad.push(`${f}:${i + 1} 무공 고유 그림을 무공 id를 박아 넣어 씀 (다른 무공이 빌려 쓰게 됨)`);
  });
}
// 무공 폴더 ↔ MANUAL_ART 목록이 같아야 한다 (목록에 없는 그림 · 그림 없는 목록 · 없는 무공 id)
{
  const ART = path.join(JS, '..', 'assets', 'art', 'manual'), list = {};
  for (const m of read('data/assets.js').matchAll(/^\s+(\w+): \[([^\]]*)\],/gm)) list[m[1]] = [...m[2].matchAll(/'(\w+)'/g)].map(x => x[1]);
  const ids = new Set([...read('data/skills.js').matchAll(/^\s{2}(\w+): \{ name:/gm)].map(m => m[1]));
  const dirs = fs.existsSync(ART) ? fs.readdirSync(ART) : [];
  for (const d of dirs) {
    if (!ids.has(d)) bad.push(`assets/art/manual/${d}: 없는 무공 id`);
    const files = fs.readdirSync(path.join(ART, d)).map(f => f.replace(/\.webp$/, ''));
    for (const f of files) if (!(list[d] || []).includes(f)) bad.push(`assets/art/manual/${d}/${f}: MANUAL_ART에 없음`);
    for (const f of list[d] || []) if (!files.includes(f)) bad.push(`MANUAL_ART.${d}.${f}: 그림 파일이 없음`);
  }
  for (const d of Object.keys(list)) if (!dirs.includes(d)) bad.push(`MANUAL_ART.${d}: 폴더가 없음`);
}
const html = fs.readFileSync(path.join(JS, '..', 'index.html'), 'utf8');
const order = [...html.matchAll(/<script src="js\/([^"?]+)/g)].map(m => m[1]);
const rank = f => f === 'core.js' ? 0 : f.startsWith('data/') ? 1 : f.startsWith('systems/') ? 2 : f.startsWith('ui/') ? 3 : f === 'app.js' ? 4 : 9;
if (order.some((f, i) => i && rank(f) < rank(order[i - 1]))) bad.push('index.html 스크립트 순서가 core → data → systems → ui → app 이 아님');
const all = ['core.js', ...dataFiles, ...sysFiles, ...uiFiles, 'app.js'];
for (const f of all) if (!order.includes(f)) bad.push(`index.html에 ${f}가 빠짐`);
module.exports = () => bad;
if (require.main === module) { console.log(bad.length ? bad.join('\n') : '계층 규칙 위반 없음'); process.exit(bad.length ? 1 : 0); }
