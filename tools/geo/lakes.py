"""国土数値情報 W09-05 GMLから現代湖岸の比較用ベクトルを抽出。戦国期復元ではない。
使い方: python3 tools/geo/lakes.py /path/to/W09-05-g.xml
"""
import xml.etree.ElementTree as ET
import json,sys,pathlib
r=ET.parse(sys.argv[1]).getroot();g='{http://www.opengis.net/gml/3.2}';k='{http://nlftp.mlit.go.jp/ksj/schemas/ksj-app}';x='{http://www.w3.org/1999/xlink}'
ids={e.attrib[g+'id']:e for e in r.iter() if g+'id' in e.attrib}
def curve(ref):
 e=ids[ref.lstrip('#')]
 if e.tag==g+'OrientableCurve':
  p=curve(e.find(g+'baseCurve').attrib[x+'href']);return p[::-1] if e.attrib.get('orientation')=='-' else p
 a=list(map(float,e.find('.//'+g+'posList').text.split()));return [[round(a[i+1],6),round(a[i],6)] for i in range(0,len(a),2)]
out=[]
for e in r.findall(k+'Lake'):
 n=e.findtext(k+'lakeName')
 if n and n.startswith('十和田湖'):n='十和田湖'
 if n not in ['霞ヶ浦','北浦','牛久沼','印旛沼','手賀沼','諏訪湖','河北潟','柴山潟','木場潟','余呉湖','三方湖','水月湖','久々子湖','日向湖','菅湖','宍道湖','中海','浜名湖','琵琶湖','十三湖','八郎潟','猪苗代湖','田沢湖','小川原湖','十和田湖']:continue
 surf=ids[e.find(k+'bounds').attrib[x+'href'][1:]];rings=[]
 for ring in surf.findall('.//'+g+'Ring'):
  p=[]
  for c in ring.findall(g+'curveMember'):p+=curve(c.attrib[x+'href'])
  rings.append(p)
 out.append({'name':n,'rings':rings})
p=pathlib.Path(__file__).resolve().parents[2]/'game/lake-baselines.js'
p.write_text('"use strict";\n/* 国土交通省 国土数値情報 湖沼データ W09-05、2005年。現代の比較湖岸。 */\nTK.MODERN_LAKES='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
print([(a['name'],sum(map(len,a['rings']))) for a in out])
