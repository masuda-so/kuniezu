import json,re,os,sys
sys.path.insert(0,'/home/claude/faces')
from yd import yunet
from PIL import Image,ImageFilter,ImageOps
import numpy as np
T=128;DT=0.165*T;CY=0.54;CX=0.5   # 目〜口の長さ、顔の中心の置き所
s=open('/home/claude/game/hist.js').read()
F=json.loads(re.search(r"TK\.FACES=(\{.*?\});",s).group(1))
crops=json.load(open('crops.json'));meta=json.load(open('meta.json'))
ovr=json.load(open('override.json')) if os.path.exists('override.json') else {}
cellim=Image.open('/home/claude/faces/faces_v25.webp').convert('RGB')
def geom(r):
  E=np.mean([r['le'],r['re']],0);M=np.mean([r['ml'],r['mr']],0);N=np.array(r['nose'])
  d=np.linalg.norm(M-E);cx=(E[0]+N[0]+M[0])/3;cy=(E[1]+M[1])/2;return cx,cy,d
CUR=[None]
CORR=json.load(open('corr.json')) if os.path.exists('corr.json') else {}
def cut(img,cx,cy,d):
  k=CORR.get(CUR[0])
  if k:
    side0=T/(DT/d);cx+=k[1]/T*side0;cy+=k[2]/T*side0;d=d*k[0]
  sc=DT/d;side=T/sc;x0=cx-CX*side;y0=cy-CY*side
  W,H=img.size;pad=int(side)+2
  big=ImageOps.expand(img,border=pad,fill=None) if False else Image.fromarray(np.pad(np.array(img),((pad,pad),(pad,pad),(0,0)),mode='edge'))
  return big.crop((x0+pad,y0+pad,x0+pad+side,y0+pad+side)).resize((T,T),Image.LANCZOS)
out={};log=[]
for n,i in sorted(F.items(),key=lambda x:x[1]):
  CUR[0]=n
  if os.path.exists(f'hr/n_{n}.jpg') or (n=='秋山信友' and os.path.exists('hr/n_秋山虎繁.jpg')):
    im=Image.open(f'hr/n_{n}.jpg' if os.path.exists(f'hr/n_{n}.jpg') else 'hr/n_秋山虎繁.jpg').convert('RGB');r=yunet(im,.4)
    if r:out[i]=cut(im,*geom(r));log.append((i,n,'new'));continue
  src=None;r=None;how=''
  p=f'raw/{n}.jpg'
  o=ovr.get(n)
  if o=='cell':p=None
  if isinstance(o,list) and o[0]=='qy':
    im=Image.open(f'hr/q_{o[1]}.jpg').convert('RGB');r=yunet(im,.35);out[i]=cut(im,*geom(r));log.append((i,n,'q'));continue
  if isinstance(o,list) and o[0]=='q':
    im=Image.open(f'hr/q_{o[1]}.jpg').convert('RGB');W=im.size[0];out[i]=cut(im,o[2]*W,o[3]*W,0.36*o[4]*W);log.append((i,n,'q'));continue
  if isinstance(o,list) and o[0]=='my':
    im=Image.open(f'hr/m_{n}.jpg').convert('RGB');r=yunet(im,.5);out[i]=cut(im,*geom(r));log.append((i,n,'m'));continue
  if isinstance(o,list) and o[0]=='m':
    im=Image.open(f'hr/m_{n}.jpg').convert('RGB');W=im.size[0];out[i]=cut(im,o[1]*W,o[2]*W,0.36*o[3]*W);log.append((i,n,'m'));continue
  if isinstance(o,list) and o[0]=='hr':
    im=Image.open(f'hr/{n}.jpg').convert('RGB');W=im.size[0];out[i]=cut(im,o[1]*W,o[2]*W,0.36*o[3]*W);log.append((i,n,'hr'));continue
  if o is None and os.path.exists(f'hr/lo_{n}.jpg'):
    im=Image.open(f'hr/lo_{n}.jpg').convert('RGB');R=im.size[0];sub=im.crop((R*.2,R*.2,R*.8,R*.8));r=yunet(sub,.4)
    if r:
      r={k:([v[0]+R*.2,v[1]+R*.2] if k in('le','re','nose','ml','mr') else v) for k,v in r.items()};out[i]=cut(im,*geom(r));log.append((i,n,f'hires {r["score"]:.2f}'));continue
  if p and os.path.exists(p):
    im=Image.open(p).convert('RGB');W,H=im.size
    if n in crops:  # 以前に選んだ顔のまわりだけで探す
      cx,cy,rr=crops[n];R=rr*max(W,H)*1.8;box=(max(0,cx*W-R),max(0,cy*H-R),min(W,cx*W+R),min(H,cy*H+R))
      sub=im.crop(box);r=yunet(sub,.45)
      if r:r={k:([v[0]+box[0],v[1]+box[1]] if k in('le','re','nose','ml','mr') else v) for k,v in r.items()}
    else:r=yunet(im,.45)
    if r and r['score']>=.45:out[i]=cut(im,*geom(r));how=f'raw {r["score"]:.2f}'
  if i not in out:
    x,y=(i%10)*96,(i//10)*96;c=cellim.crop((x,y,x+96,y+96)).resize((192,192),Image.LANCZOS)
    r=yunet(c,.5)
    if r and o is None:out[i]=cut(c,*geom(r));how=f'cell {r["score"]:.2f}'
    else:out[i]=c.resize((T,T),Image.LANCZOS);how='asis'
  log.append((i,n,how))
N=len(out);cols=10;rows=(N+cols-1)//cols
sheet=Image.new('RGB',(cols*T,rows*T))
for i,im in out.items():sheet.paste(im,((i%cols)*T,(i//cols)*T))
sheet.save('faces_new.webp',quality=86)
json.dump(log,open('build_log.json','w'),ensure_ascii=False)
print(sum(1 for l in log if l[2].startswith('raw')),'raw',sum(1 for l in log if l[2].startswith('cell')),'cell',[l for l in log if l[2]=='asis'])
