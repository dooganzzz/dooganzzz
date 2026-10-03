"""데스크톱판(스팀) 앞단 만들기: 게임 파일(index.html · js · css · assets · version.json)을 desktop/dist로 모은다.
   운영자 페이지(admin.html)는 넣지 않는다. 쓰는 법: python3 gangho/tools/desktop-dist.py → cd gangho/desktop && npx @tauri-apps/cli@2 build"""
import os, shutil
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); out = f'{root}/desktop/dist'
shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
for f in ['index.html', 'version.json']: shutil.copy(f'{root}/{f}', out)
for d in ['js', 'css', 'assets']: shutil.copytree(f'{root}/{d}', f'{out}/{d}')
n = sum(len(fs) for _, _, fs in os.walk(out)); mb = sum(os.path.getsize(os.path.join(p, f)) for p, _, fs in os.walk(out) for f in fs) / 1e6
print(f'desktop/dist: 파일 {n}개 · {mb:.1f}MB')
