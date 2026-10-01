/* 배포 전에 한 번: index.html · admin.html의 css/js 주소 끝에 ?v=버전을 붙여(바꿔) 브라우저가 옛 파일을 쓰지 않게 한다.
   GitHub Pages는 파일을 10분 동안 캐시하므로, 버전이 바뀌어야 폰에서도 곧바로 새 파일을 받는다.
   쓰는 법: node tools/stamp.js   (버전은 지금 시각 YYYYMMDDHHmm) */
const fs = require('fs'), path = require('path');
const d = new Date(), p = n => String(n).padStart(2, '0');
const v = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;
for (const f of ['index.html', 'admin.html']) {
  const file = path.join(__dirname, '..', f);
  const s = fs.readFileSync(file, 'utf8').replace(/((?:src|href)="(?:css|js)\/[^"?]+)(?:\?v=[^"]*)?"/g, `$1?v=${v}"`);
  fs.writeFileSync(file, s);
}
console.log('버전', v);
