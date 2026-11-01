import argparse,csv,json,re,math
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--poi',required=True);parser.add_argument('--sites',required=True);parser.add_argument('--output',required=True);args=parser.parse_args()
rows=list(csv.DictReader(open(args.poi)));data=json.load(open(args.sites))
def norm(s):return re.sub('跡$','',s).replace('ヶ','ケ').replace('ケ','が').replace('ノ','の').replace('之','の').replace('城址','城')
def distance(a,b):return math.hypot((a[0]-b[0])*math.cos(math.radians(a[1])),a[1]-b[1])*111.32
idx={}
for r in rows:
 for n in r['名称'].split('・'):idx.setdefault(norm(n),[]).append(r)
alias={'清洲城':'清須城','檜山城':'檜山安東氏城館跡','稲葉山城':'岐阜城','岩付城':'岩槻城','砥石城':'戸石城','月山富田城':'富田城','備中松山城':'松山城','吉田郡山城':'郡山城','長島願証寺':'願証寺','越後高田城':'高田城','讃岐高松城':'高松城','伊予松山城':'松山城','越前大野城':'大野城','大和郡山城':'郡山城','備中高松城':'高松城','美作岩屋城':'岩屋城','石見七尾城':'七尾城','阿波一宮城':'一宮城','肥後田中城':'田中城','紀伊亀山城':'亀山城','越中宮崎城':'宮崎城','能登末森城':'末森城','信濃松尾城':'松尾城','伊豆長浜城':'長浜城','河越城':'川越城','古河御所':'古河城','厩橋城':'前橋城','黒川城':'若松城','深志城':'松本城','今川館':'駿府城','布勢天神山城':'天神山城','平泉中尊寺':'中尊寺'}
out=[]
for kind,items in [('main',data['castles']),('facility',data['facilities'])]:
 for i,a in enumerate(items):
  ident,name,old=(a[0],a[1],[a[4],a[5]]) if kind=='main' else (i,a[0],[a[2],a[3]])
  if kind=='main':
   xy=data['cpos'].get(ident)
   if xy:old=[xy[0]/data['K']/data['CX']+data['LON0'],data['LAT0']-xy[1]/data['K']]
  options=idx.get(norm(alias.get(name,name)),[])
  cand=sorted([dict(r,km=distance(old,[float(r['経度']),float(r['緯度'])])) for r in options],key=lambda r:r['km'])
  row=dict(kind=kind,id=ident,name=name,old=old)
  if cand:
   c=cand[0];row.update(candidate=c['名称'],ref=c['id'],address=c['住所'],point=[float(c['経度']),float(c['緯度'])],km=round(c['km'],3),ambiguous=len(cand)>1 and cand[1]['km']<20 and distance([float(c['経度']),float(c['緯度'])],[float(cand[1]['経度']),float(cand[1]['緯度'])])>.05)
  out.append(row)
Path(args.output).write_text(json.dumps(out,ensure_ascii=False,indent=2))
print('all',len(out),'matched',sum('ref'in r for r in out))
for r in out:
 if 'km'in r and r['km']>.3:print(r['kind'],r['id'],r['name'],r['km'],r['address'],r['point'],r['ambiguous'])
print('unmatched',[(r['kind'],r['id'],r['name']) for r in out if 'ref'not in r])
