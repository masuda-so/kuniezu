# Existing sprite face-position audit; requires Pillow, numpy and OpenCV.
# Writes metadata only; no portrait pixels are synthesized or edited.
import pathlib,json,re,sys
from PIL import Image
import numpy as np
root=pathlib.Path(__file__).resolve().parents[2];folder=root/'tools/faces';ns={};exec((folder/'yd.py').read_text().replace('/home/claude/faces/yunet.onnx',str(folder/'yunet.onnx')),ns);detect=ns['yunet']
f=json.loads(re.search(r'TK.FACES=(\{.*?\});',(root/'kuniezu/static/kuniezu/hist.js').read_text()).group(1));sheet=Image.open(root/'kuniezu/static/kuniezu/faces.webp').convert('RGB');audit=[];adjust={}
for n,i in f.items():
 im=sheet.crop((i%10*128,i//10*128,i%10*128+128,i//10*128+128));r=detect(im,.75)
 row={'name':n,'index':i,'cell':[128,128],'detected':bool(r)}
 if r:
  e=np.mean([r['le'],r['re']],0);m=np.mean([r['ml'],r['mr']],0);d=float(np.linalg.norm(m-e));cx=float((e[0]+r['nose'][0]+m[0])/3);cy=float((e[1]+m[1])/2);row.update({'confidence':float(r['score']),'center':[cx,cy],'eyeMouth':d})
  if r['score']>=.85 and 12<d<32:
   scale=max(.85,min(1.15,21.12/d));adjust[n]={'scale':scale,'x':max(-8,min(8,64-cx*scale)),'y':max(-8,min(8,69.12-cy*scale))}
 audit.append(row)
# Report only: reviewed runtime crops and higher-detail sources are never overwritten.
import argparse
parser=argparse.ArgumentParser(description='既存153肖像の検出候補を出力。確認済みの表示設定・画像は変更しません。')
parser.add_argument('--output',default='/tmp/kuniezu-portrait-candidates.json')
args=parser.parse_args()
PathOutput=pathlib.Path(args.output)
if PathOutput.resolve() in {(root/'data/audits/portrait-audit.json').resolve(),(root/'kuniezu/static/kuniezu/portrait-layout.js').resolve()}:
 raise SystemExit('確認済み台帳への上書きは拒否しました')
PathOutput.write_text(json.dumps({'existing':audit,'candidateAdjustments':adjust,'notice':'自動検出候補。人物・文字の誤検出は目視確認する。実行時設定は変更しない。'},ensure_ascii=False,indent=2))
print('audited',len(audit),'candidates',len(adjust),'report',str(PathOutput))
