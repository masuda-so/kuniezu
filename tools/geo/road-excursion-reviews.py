"""個別確認済みの参照閉路だけを描画設定へ生成。史実データへは転記しない。"""
import pathlib,json
root=pathlib.Path(__file__).resolve().parents[2]
rows=json.loads((root/'data/inputs/road-excursion-reviews.json').read_text())['reviews'];out={}
for r in rows:
 assert r['basis']=='modern-routing-observation'
 assert len(r['junction'])==2 and len(r['lengthRange'])==2 and 0<r['lengthRange'][0]<r['lengthRange'][1]
 out.setdefault(r['road'],[]).append({'junction':r['junction'],'lengthRange':r['lengthRange']})
p=root/'kuniezu/static/kuniezu/road-display.js';s=p.read_text();a=' /* reference-excursion-reviews:start */';b=' /* reference-excursion-reviews:end */';assert s.count(a)==s.count(b)==1
start=s.index(a)+len(a);end=s.index(b);p.write_text(s[:start]+'\n const reviewedExcursions='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n'+s[end:])
print('generated',len(rows),'reviewed reference excursions')
