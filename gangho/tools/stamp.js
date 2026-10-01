/* 배포 전에 한 번: index.html · admin.html의 css/js 주소 끝에 ?v=버전을 붙이고(바꾸고) <meta name="game-ver">와 version.json을 같은 버전으로 쓴다.
   게임은 열릴 때와 10분마다 version.json을 캐시 없이 읽어, 페이지 버전과 다르면 새 주소(?v=)로 다시 열어 옛 페이지가 남지 않게 한다.
   GitHub Pages는 파일을 10분 동안 캐시하므로, 버전이 바뀌어야 폰에서도 곧바로 새 파일을 받는다.
   쓰는 법: node tools/stamp.js   (버전은 지금 시각 YYYYMMDDHHmm) */
const fs = require('fs'), path = require('path');
const d = new Date(), p = n => String(n).padStart(2, '0');
const v = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;
for (const f of ['index.html', 'admin.html']) {
  const file = path.join(__dirname, '..', f);
  let s = fs.readFileSync(file, 'utf8').replace(/((?:src|href)="(?:css|js)\/[^"?]+)(?:\?v=[^"]*)?"/g, `$1?v=${v}"`);
  s = /<meta name="game-ver"/.test(s) ? s.replace(/<meta name="game-ver" content="[^"]*">/, `<meta name="game-ver" content="${v}">`) : s.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta name="game-ver" content="${v}">`);
  fs.writeFileSync(file, s);
}
// 열려 있는 게임이 새 버전을 알아채도록 (app.js가 캐시 없이 읽는다)
fs.writeFileSync(path.join(__dirname, '..', 'version.json'), JSON.stringify({ v }) + '\n');
console.log('버전', v);
