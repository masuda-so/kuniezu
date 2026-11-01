import json,base64,io,sys,glob,os
from PIL import Image
os.makedirs('raw',exist_ok=True)
meta=json.load(open('meta.json')) if os.path.exists('meta.json') else {}
for f in sys.argv[1:]:
    arr=json.load(open(f));t=arr[0]['text']
    s=json.JSONDecoder().raw_decode(t)[0] if t.startswith('"') else t
    if '::END' not in s: print('TRUNCATED',f);continue
    s=s[s.index(':')+1:s.rindex('::END')]
    for n,file,d in json.loads(s):
        if not d: print('nodata',n);continue
        im=Image.open(io.BytesIO(base64.b64decode(d.split(',',1)[1]))).convert('RGB');im.save(f'raw/{n}.jpg',quality=95);meta[n]=[file,im.size]
json.dump(meta,open('meta.json','w'),ensure_ascii=False);print(len(meta))
