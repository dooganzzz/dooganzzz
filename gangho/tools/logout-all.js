#!/usr/bin/env node
/* 모든 유저 로그아웃(서버): 배포할 때 한 번 돌린다 — 모든 계정의 접속 토큰을 무효로 만든다.
   (게임은 새 버전이 뜨면 세션의 버전이 달라 자기도 로그아웃하지만, 열려 있는 옛 화면까지 바로 끊으려면 서버 토큰을 지운다.)
   주소·공개 키는 js/ui/ui_supa.js에서, 운영자 암호는 환경 변수 GANGHO_GM_PASS에서만 읽는다 (코드·저장소에 암호를 두지 않는다).
   쓰는 법: node tools/logout-all.js */
'use strict';
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'ui', 'ui_supa.js'), 'utf8');
const url = (src.match(/url:\s*'([^']+)'/) || [])[1], key = (src.match(/key:\s*'([^']+)'/) || [])[1];
const pass = process.env.GANGHO_GM_PASS;
if (!url || !key) { console.error('ui_supa.js에 SUPA.url · SUPA.key가 없습니다.'); process.exit(1); }
if (!pass) { console.error('환경 변수 GANGHO_GM_PASS(운영자 암호)가 없습니다. 전체 로그아웃은 건너뜁니다 (게임의 버전 로그아웃은 그대로 작동).'); process.exit(2); }
(async () => {
  const r = await fetch(`${url}/rest/v1/rpc/gangho_logout_all`, { method: 'POST', headers: { apikey: key, ...(/^sb_/.test(key) ? {} : { Authorization: `Bearer ${key}` }), 'Content-Type': 'application/json' }, body: JSON.stringify({ p_pass: pass }) });
  const t = await r.text(); if (!r.ok) throw new Error(`${r.status} ${t}`);
  console.log('전체 로그아웃 완료', t ? JSON.parse(t) : '');
})().catch(e => { console.error('실패:', e.message); process.exit(1); });
