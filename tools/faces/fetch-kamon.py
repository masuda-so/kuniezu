import json,pathlib,subprocess,urllib.parse,concurrent.futures,hashlib
root=pathlib.Path(__file__).resolve().parents[2];out=root/'kuniezu/static/kuniezu/kamon';out.mkdir(exist_ok=True)
files={'oda':'Japanese Crest Oda ka.svg','tokugawa':'Tokugawa family crest.svg','takeda':'Japanese Crest Takedabishi.svg','hojo':'Japanese Crest Houjou Uroko.svg','sanada':'Japanese Crest rokumonsen.svg','uesugi':'Japanese Crest Uesugi Sasa.svg','imagawa':'Japanese crest Imagawa Akadori.svg','hashiba':'Japanese Crest Maru ni Goshichi no Kiri.svg','asakura':'Japanese Crest mitumori mokkou.svg','ashikaga':'Japanese Crest Marunouti ni Futatu Hiki.svg','akechi':'Japanese crest Kikyou.svg','hosokawa':'Japanese Crest Hosokawa Kuyou.svg','maeda':'Japanese crest Kaga Umebachi.svg','kuroda':'Japanese Crest Kuroda Fuji tomoe.svg','shimazu':'Japanese Crest maru ni jyuji.svg','rokkaku':'Japanese crest Yotumeyui.svg'}
api='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode({'action':'query','format':'json','titles':'|'.join('File:'+s for s in files.values())+'|File:Shima Sakon.jpg','prop':'imageinfo','iiprop':'url|extmetadata'})
raw=subprocess.run(['curl','-sfL','--max-time','40',api],check=True,capture_output=True).stdout;data=json.loads(raw);pages={p['title']:p for p in data['query']['pages'].values()};records={}
def fetch(item):
 key,title=item;p=pages['File:'+title];info=p.get('imageinfo',[None])[0]
 if not info:return key,None
 ext=info['extmetadata'];suffix=pathlib.Path(title).suffix;dest=(root/'kuniezu/static/kuniezu/portraits/島清興.jpg')if key=='sakon'else out/(key+suffix);data=dest.read_bytes()if dest.exists()else subprocess.run(['curl','-sfL','--retry-all-errors','--retry','3','--max-time','60',info['url'].split('?')[0]],check=True,capture_output=True).stdout;dest.write_bytes(data)
 return key,{'src':str(dest.relative_to(root/'kuniezu/static/kuniezu')),'source':info['descriptionurl'],'license':ext.get('LicenseShortName',{}).get('value',''),'artist':ext.get('Artist',{}).get('value',''),'licenseUrl':ext.get('LicenseUrl',{}).get('value',''),'sha256':hashlib.sha256(data).hexdigest()}
with concurrent.futures.ThreadPoolExecutor(max_workers=3)as pool:
 for k,r in pool.map(fetch,list(files.items())+[('sakon','Shima Sakon.jpg')]):
  if r:records[k]=r
(out/'sources.json').write_text(json.dumps(records,ensure_ascii=False,indent=2));print('downloaded',len(records));(root/'kuniezu/static/kuniezu/kamon-data.js').write_text('"use strict";\nTK.KAMON_FILES='+json.dumps({k:v for k,v in records.items()if k!='sakon'},ensure_ascii=False,separators=(',',':'))+';\n')
