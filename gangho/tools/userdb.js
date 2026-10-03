#!/usr/bin/env node
/* 웹 유저 기록(Supabase) 보기 — 읽기 전용.
   주소·공개 키는 js/ui/ui_supa.js에서 읽고, 운영자 암호는 환경 변수 GANGHO_GM_PASS에서 읽는다 (코드·저장소에 암호를 두지 않는다).
   쓰는 법:  node tools/userdb.js            → 유저 목록 요약
            node tools/userdb.js --json     → 원본 JSON
            node tools/userdb.js --save <id> → 그 유저의 저장(JSON)을 출력 */
'use strict';
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'ui', 'ui_supa.js'), 'utf8');
const url = (src.match(/url:\s*'([^']+)'/) || [])[1], key = (src.match(/key:\s*'([^']+)'/) || [])[1];
const pass = process.env.GANGHO_GM_PASS;
if (!url || !key) { console.error('ui_supa.js에 SUPA.url · SUPA.key가 없습니다.'); process.exit(1); }
if (!pass) { console.error('환경 변수 GANGHO_GM_PASS(운영자 암호)가 없습니다.'); process.exit(1); }
async function rpc(fn, body) {
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: key, ...(/^sb_/.test(key) ? {} : { Authorization: `Bearer ${key}` }), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const t = await r.text(); if (!r.ok) throw new Error(`${r.status} ${t}`); return t ? JSON.parse(t) : null;
}
const ZONE = { cheongpung: '청풍산', yeomhwa: '염화채', suryong: '수룡방' };
const ago = t => { const m = Math.round((Date.now() - new Date(t)) / 60000); return m < 1 ? '방금' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.floor(m / 60)}시간 전` : `${Math.floor(m / 1440)}일 전`; };
(async () => {
  const a = process.argv.slice(2);
  if (a[0] === '--save') { console.log(JSON.stringify(await rpc('gangho_player_save', { p_pass: pass, p_id: a[1] }), null, 1)); return; }
  const list = await rpc('gangho_players', { p_pass: pass });
  if (a[0] === '--json') { console.log(JSON.stringify(list, null, 1)); return; }
  const on = list.filter(p => Date.now() - new Date(p.last_seen) < 150000).length;
  console.log(`전체 ${list.length}명 · 접속 중 ${on}명 (조회 ${new Date().toISOString()})`);
  for (const p of list) console.log([Date.now() - new Date(p.last_seen) < 150000 ? '●' : '○', p.id.slice(0, 8), p.name || '—', `전투력 ${p.cp ?? '—'}`, `${p.mugong || '—'} ${p.star || 0}성`, `은자 ${p.silver ?? 0}`, ZONE[p.zone] || '—', `탐험 ${p.runs || 0} · 두목 ${p.bosses || 0}`, p.ip || '—', p.device || '—', p.source || '—', `가입 ${ago(p.created_at)}`, `마지막 ${ago(p.last_seen)}`].join(' | '));
})().catch(e => { console.error('실패:', e.message); process.exit(1); });
