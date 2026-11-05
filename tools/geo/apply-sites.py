"""site-audit の同定候補から、同地域・非曖昧の代表点を反映。年月・城域は別の考証。"""
import argparse,json,pathlib
root=pathlib.Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser();parser.add_argument('audit');args=parser.parse_args()
rows=json.load(open(args.audit));out=[]
for r in rows:
 ok='km'in r and r['km']<20 and not r['ambiguous'] and r['name'] not in ['大友館']
 r['decision']='同地域・同名項目の代表点を採用' if ok else '別地域候補または未同定のため位置を保持'
 r['scope']='城域・築城年代・移転年代・城主の同定とは別。資料自体にも位置推定の誤差がある。'
 if ok:out.append({k:r[k] for k in ['kind','id','name','point','ref']})
(root/'data/audits/site-coordinate-audit.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
(root/'kuniezu/static/kuniezu/site-coordinates.js').write_text('''"use strict";
/* 『日本歴史地名大系』施設・地点項目データセット（CODH作成）
 doi:10.20676/00000456 / 2025-05-15 / CC BY 4.0。代表点であり城域の測量値ではない。 */
(function(){
 TK.SITE_COORDINATES='''+json.dumps(out,ensure_ascii=False,separators=(',',':'))+''';
 TK.SITE_STABLE_IDS=Object.fromEntries(TK.YOSHO.map(y=>[y[0],'yosho:'+y[0]+':'+y[2]+':'+y[3]]));
 TK.RESEARCH_SOURCES.codhSites={author:'人文学オープンデータ共同利用センター（CODH）',title:'日本歴史地名大系 施設・地点項目データセット',year:'2025年5月15日版',url:'https://geoshape.ex.nii.ac.jp/nrct-poi/',locator:'doi:10.20676/00000456・各項目ID',accessed:'2026-10-31',scope:'地域と名称を照合した代表座標。数十〜数百メートルの推定誤差がある。後世の遺構・移転先や城郭範囲を保証しない。'};
 TK.SITE_POSITION_EVIDENCE={};
 for(const r of TK.SITE_COORDINATES){const [lon,lat]=r.point;TK.SITE_POSITION_EVIDENCE[r.name]={...r,url:'https://geoshape.ex.nii.ac.jp/nrct-poi/resource/'+r.ref.slice(0,2)+'/'+r.ref+'.html'};
  if(r.kind==='main'){const a=TK.CASTLES.find(c=>c[0]===r.id);a[4]=lon;a[5]=lat;TKGEO.cpos[r.id]=[(lon-TKGEO.LON0)*TKGEO.K*TKGEO.CX,(TKGEO.LAT0-lat)*TKGEO.K];TK.CASTLE_FIX=(TK.CASTLE_FIX||[]).filter(c=>c[0]!==r.id);}
  else {const y=TK.YOSHO[r.id];if(y&&y[0]===r.name){y[2]=lon;y[3]=lat;}}
 }
})();
''')
print('applied',len(out),'main',sum(r['kind']=='main' for r in out),'facility',sum(r['kind']=='facility' for r in out))
