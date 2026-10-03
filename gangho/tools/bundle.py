"""한 파일 번들: index.html → <out>/gangho.html, admin.html → <out>/admin.html (css · js를 안에 넣음).
   아티팩트(게임) 올리기 전에 만든다. 쓰는 법: python3 gangho/tools/bundle.py <출력 폴더(scratchpad)>"""
import re, sys, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); out = sys.argv[1]
for name, dst in [('index.html', 'gangho.html'), ('admin.html', 'admin.html')]:
    s = open(f'{root}/{name}').read()
    s = re.sub(r'<link rel="stylesheet" href="(css/[^"?]+)(?:\?[^"]*)?">', lambda m: '<style>\n' + open(f'{root}/{m.group(1)}').read() + '\n</style>', s)
    s = re.sub(r'<script src="(js/[^"?]+)(?:\?[^"]*)?"></script>', lambda m: '<script>\n' + open(f'{root}/{m.group(1)}').read().replace('</script', '<\\/script') + '\n</script>', s)
    assert 'src="js/' not in s and 'href="css/' not in s
    open(f'{out}/{dst}', 'w').write(s)
print('ok')
