# 初回移行時の準備コード記録

2026-11-07の編集正本初回採用を監査するための原文記録。通常ビルド・将来の正本再生成には使用しない。実行時の地理補正ではない。試作時の絶対パスと一時出力先を含むため、そのままの再実行を推奨しない。最終的な形状の正本はkuniezu/map/physical/の編集済みGeoJSONである。途中の不採用候補を経て最後のレビューコードで指摘を修正した。

## kuniezu-seed-vector-surfaces.py

SHA-256: `c0786ecf5dc584dd10fd577b46f7176893447d539422e47e4c4c36f1d4a8ddef`

```python
"""One-time seed only. Never part of normal build; current game is unchanged."""
import argparse,copy,gzip,hashlib,json,pathlib
from shapely.geometry import shape,mapping
from shapely.ops import unary_union
ROOT=pathlib.Path('/Users/masudaso/.codex/worktrees/history-cube-query/天下分け目の国絵図')
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def pretty(v,level=0):
    """One coordinate pair per line, full Python JSON float precision."""
    pad='  '*level
    if isinstance(v,(list,tuple)):
        if not v:return '[]'
        if len(v)==2 and all(isinstance(x,(int,float)) for x in v):return json.dumps(v,allow_nan=False)
        return '[\n'+',\n'.join('  '*(level+1)+pretty(x,level+1) for x in v)+'\n'+pad+']'
    if isinstance(v,dict):
        if not v:return '{}'
        return '{\n'+',\n'.join('  '*(level+1)+json.dumps(k,ensure_ascii=False)+': '+pretty(x,level+1) for k,x in v.items())+'\n'+pad+'}'
    return json.dumps(v,ensure_ascii=False,allow_nan=False)
def valid_collection(path):
    d=json.loads(path.read_text())
    for f in d['features']:
        if f['geometry'] is None:raise ValueError('Unexpected null geometry: '+str(path))
        g=shape(f['geometry'])
        if not g.is_valid or g.is_empty or g.geom_type not in ('Polygon','MultiPolygon'):raise ValueError('Invalid/non-surface geometry; refusing repair: '+str(f.get('id')))
    return d
def polygons(g):
    if g.geom_type=='Polygon':return [g]
    if g.geom_type=='MultiPolygon':return list(g.geoms)
    raise ValueError('Non-polygon output; refusing to drop residuals')
def build(prepared,canonical,output):
    prepared,canonical,output=map(pathlib.Path,(prepared,canonical,output))
    if output.exists():raise FileExistsError('Output must be new: '+str(output))
    manifest=json.loads((prepared/'manifest.json').read_text());im=json.loads((ROOT/'data/inputs/codh-edo/manifest.json').read_text());mlit=json.loads((ROOT/'data/inputs/mlit-w09-2005/manifest.json').read_text())
    verifications=[]
    # Verify retained raw inputs, including decoded GeoJSON and original ZIP bytes.
    for row in im['datasets']:
        if row['key'] not in ('coast-polygons','lake-polygons'):continue
        source=ROOT/'data/inputs/codh-edo'/row['file'];packed=source.read_bytes()
        if hashlib.sha256(packed).hexdigest()!=row['archiveSha256']:raise ValueError('Raw archive SHA differs')
        raw=packed if row.get('format')=='shapefile-zip' else gzip.decompress(packed)
        if hashlib.sha256(raw).hexdigest()!=row['sha256']:raise ValueError('Raw source SHA differs')
        verifications.append({'file':str(source),'archiveSha256':sha(source),'sourceSha256':row['sha256'],'verified':True})
    mlit_archive=ROOT/'data/inputs/mlit-w09-2005/W09-05_GML.zip'
    if sha(mlit_archive)!=mlit['sha256']:raise ValueError('MLIT archive SHA differs')
    verifications.append({'file':str(mlit_archive),'sha256':sha(mlit_archive),'verified':True})
    for name in ('land-with-water.geojson','lake-polygons.geojson'):
        expected=next(x['sha256'] for x in manifest['outputs'] if x['file']==name)
        if sha(prepared/name)!=expected:raise ValueError('Prepared input SHA differs: '+name)
    land=valid_collection(prepared/'land-with-water.geojson');water=valid_collection(prepared/'lake-polygons.geojson');five=valid_collection(canonical)
    base=unary_union([shape(f['geometry']) for f in land['features']]);complement=unary_union([shape(f['geometry']) for f in five['features']]);effective=base.difference(complement)
    if not effective.is_valid:raise ValueError('Difference invalid; no repair allowed')
    # Sort by bounds then geometry hash; IDs are reproducible for identical input, not editing-time primary keys.
    parts=sorted(polygons(effective),key=lambda g:(g.bounds,hashlib.sha256(g.wkb).hexdigest()))
    ls=[{'type':'Feature','id':f'land:seed:{i:05d}','properties':{'drawRole':'land','shapeRole':'edo-reference','temporalScope':'Edo-reference-not-Sengoku-assertion','initialSeed':'CODH composed reference minus five modern-comparison lakes'},'geometry':mapping(g)} for i,g in enumerate(parts)]
    ws=[]
    for i,f in enumerate(water['features']):
        v=copy.deepcopy(f);v['id']=f'water:codh-lake:{f["id"]}';v['properties'].update(sourceRowId=f['id'],drawRole='water',shapeRole='edo-reference');ws.append(v)
    for f in five['features']:
        v=copy.deepcopy(f);v['properties'].update(drawRole='water',shapeRole='modern-comparison');ws.append(v)
    provenance={'preparedManifest':manifest,'preparedInputSha256':{n:sha(prepared/n) for n in ('manifest.json','land-with-water.geojson','lake-polygons.geojson')},'canonicalFiveSha256':sha(canonical),'mlitSourceManifest':mlit,'canonicalFiveMetadata':{k:v for k,v in five.items() if k!='features'},'rawSources':verifications}
    def collection(features):return {'type':'FeatureCollection','coordinateReferenceSystem':'OGC:CRS84','migrationStatus':'initial-reference-seed-not-game-switched-not-1560-shoreline','provenance':provenance,'features':features}
    check={'landFeatures':len(ls),'waterFeatures':len(ws),'allValid':all(shape(f['geometry']).is_valid for f in ls+ws),'differenceEquals':unary_union([shape(f['geometry']) for f in ls]).equals(base.difference(complement)),'fiveLakeOverlapAreaDegreesSquared':effective.intersection(complement).area,'repairPerformed':False,'originalHashesVerified':verifications,'currentGameSwitched':False,'idPolicy':'Seed IDs stable for identical inputs; retain IDs on future direct edits.'}
    if not check['allValid'] or not check['differenceEquals'] or check['fiveLakeOverlapAreaDegreesSquared']!=0:raise ValueError('Geometry verification failed')
    for fs in (ls,ws):
        if len({f['id'] for f in fs})!=len(fs):raise ValueError('Duplicate stable ID')
    output.mkdir(parents=True,exist_ok=False)
    for name,features in [('land',ls),('water',ws)]:
        (output/(name+'.geojson')).write_text(pretty(collection(features))+'\n')
    (output/'verification.json').write_text(json.dumps(check,ensure_ascii=False,indent=2)+'\n')
    (output/'README.md').write_text('# 一度限りの参照面シード\n\n現行ゲーム未切替。史実補正未適用。通常ビルドで再生成しない。今後はこのGeoJSONを直接編集する。\n\n元の位相準備で実施済みのrepairはprovenanceに保持。この処理はrepair・丸め・平滑化をしない。5湖の内水面を陸から除外し、既存CODH湖属性と原本row ID、5湖metadataを保持。\n')
    return check
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--prepared',type=pathlib.Path,default='/tmp/kuniezu-codh-topology-components');p.add_argument('--canonical',type=pathlib.Path,default=ROOT/'kuniezu/map/physical/lakes-reference.geojson');p.add_argument('--output',type=pathlib.Path,required=True);a=p.parse_args();print(json.dumps(build(a.prepared,a.canonical,a.output),ensure_ascii=False,indent=2))

```

## kuniezu-seed-era-land.py

SHA-256: `9a2e9d17e69621a40fa068121950dfd0d9a2176d5a317af59f4042a09e9569ac`

```python
"""One-time candidate composition, /tmp only; no normal build or game switch."""
import argparse,copy,hashlib,importlib.util,json,pathlib
from shapely.geometry import shape,mapping
from shapely.ops import unary_union
ROOT=pathlib.Path('/Users/masudaso/.codex/worktrees/history-cube-query/天下分け目の国絵図')
spec=importlib.util.spec_from_file_location('seed','/tmp/kuniezu-seed-vector-surfaces.py');seed=importlib.util.module_from_spec(spec);spec.loader.exec_module(seed)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def build(output):
 out=pathlib.Path(output)
 if out.exists():raise FileExistsError('New output only')
 inputs=[];adoptions=[];ops=[]
 def read(p):
  p=pathlib.Path(p);d=json.loads(p.read_text());inputs.append({'path':str(p),'sha256':digest(p)});return d
 def geom(f):
  g=shape(f['geometry'])
  if not g.is_valid:raise ValueError('Invalid input, no repair: '+str(f.get('id')))
  return g
 def fcunion(d):return unary_union([geom(f) for f in d['features']])
 basepath=pathlib.Path('/tmp/kuniezu-vector-seed-candidate/land.geojson');base=fcunion(read(basepath));current=base
 def apply(name,operation,g):
  nonlocal current
  before=current
  current=current.union(g) if operation=='union' else current.difference(g)
  if not current.is_valid:raise ValueError('Invalid result; no repair')
  ops.append({'id':name,'operation':operation,'operandAreaDegreesSquared':g.area,'addedAreaDegreesSquared':g.difference(before).area if operation=='union' else 0.0,'removedAreaDegreesSquared':g.intersection(before).area if operation=='difference' else 0.0})
 contract=read(ROOT/'kuniezu/map/edits/vector/manifest.json')['overrides'][0];source=ROOT/contract['source'];d=read(source)
 if digest(source)!=contract['sha256']:raise ValueError('Katori SHA mismatch')
 fs={f.get('id',f.get('properties',{}).get('id')):f for f in d['features']};comp=contract['components'];water=unary_union([geom(fs[x]) for x in comp['water']]);protected=unary_union([geom(fs[x]) for x in comp['protectedLand']]);apply('katori-water-minus-protected','difference',water.difference(protected));adoptions.append(contract)
 cuts=[copy.deepcopy(fs[x]) for x in comp['openBoundaries']]
 for f in cuts:f.setdefault('properties',{})['drawCoastline']=False
 # Katori protected land is excluded from subtraction, not indiscriminately filled.
 prepared=pathlib.Path('/tmp/kuniezu-kojima-vectors-final');pm=read(prepared/'manifest.json')
 masks={}
 for entry in pm['layers']:
  q=read(prepared/entry['file']);masks[entry['id']]=fcunion(q);adoptions.append({'id':entry['id'],'adoption':q['adoption'],'provenance':q['provenance']})
 apply('kojima-bay-reclaimed-sea','difference',masks['kojima-bay-reclaimed-sea'])
 apply('kojima-bay-restored-land','union',masks['kojima-bay-restored-land'])
 for name in ['mizushima-post-period-fill','mizushima-east-post-period-fill','mizushima-south-post-period-fill','hayashima-upland']:
  editpath=ROOT/'kuniezu/map/edits/applied'/ (name+'.json');edit=read(editpath);payload=edit['payload'];geo=(editpath.parent/payload['file']).resolve();f=read(geo)['features'][payload['feature']];g=geom(f);adoptions.append(edit);apply(name,'union' if name=='hayashima-upland' else 'difference',g)
 ukita=masks['kojima-bay-ukita-land-from-1584'];conflicts={'restoredLandOverlapDegreesSquared':ukita.intersection(masks['kojima-bay-restored-land']).area,'hayashimaOverlapDegreesSquared':ukita.intersection(g).area};apply('exclude-post1584-ukita-from1560','difference',ukita);baseline=current;apply('kojima-bay-ukita-land-from-1584','union',ukita);later=current
 delta=later.difference(baseline);removed=baseline.difference(later);missing=ukita.difference(delta)
 report={'status':'candidate-not-adopted-not-surveyed-shoreline-current-game-unchanged','inputs':inputs,'adoptions':adoptions,'operations':ops,'allValid':baseline.is_valid and later.is_valid,'repairPerformed':False,'areasAre':'degree squared for operation accounting, not historical precision','ukitaConflictAudit':conflicts,'ukitaExpectedSourceCells':366,'ukitaSourceAreaDegreesSquared':ukita.area,'ukitaActualAddedAreaDegreesSquared':delta.area,'ukitaAlreadyLandAreaDegreesSquared':ukita.intersection(baseline).area,'laterRemovedAreaDegreesSquared':removed.area,'onlyUkitaChanged':delta.difference(ukita).area<1e-15 and removed.area<1e-15,'all366CellsActuallyAdded':missing.area<1e-15,'deltaSymmetricDifferenceDegreesSquared':delta.symmetric_difference(ukita).area,'numericalAreaToleranceDegreesSquared':1e-15,'protectedLandSubtractedFromKatoriWater':True}
 out.mkdir()
 for year,g in [(1560,baseline),(1584,later)]:
  features=[{'type':'Feature','id':f'land:{year}:seed:{i:05d}','properties':{'drawRole':'land','shapeRole':'inferred-period-candidate','exactHistoricalShoreline':False,'validFrom':[year,1,1],'validUntil':[1584,1,1] if year==1560 else [1616,1,1]},'geometry':mapping(x)} for i,x in enumerate(sorted(seed.polygons(g),key=lambda x:(x.bounds,hashlib.sha256(x.wkb).hexdigest())))];data={'type':'FeatureCollection','coordinateReferenceSystem':'OGC:CRS84','status':report['status'],'provenance':{'inputs':inputs,'adoptions':adoptions},'features':features};(out/f'land-{year}.geojson').write_text(seed.pretty(data)+'\n')
 (out/'open-boundaries.geojson').write_text(seed.pretty({'type':'FeatureCollection','coordinateReferenceSystem':'OGC:CRS84','features':cuts})+'\n');(out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');return report
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',required=True);a=p.parse_args();r=build(a.output);print(json.dumps({k:v for k,v in r.items() if k not in ('inputs','adoptions')},ensure_ascii=False,indent=2))

```

## extract-current-water-regions.py

SHA-256: `efdd90f6b70b48b14de05ce35ebaf9dcacb5060168a0b983e7a102458ff89ea7`

```python
import json,pathlib,hashlib,re,math,collections,importlib.util
import numpy as np
import struct,zlib
def decode_rgb(file):
 data=file.read_bytes();at=8;packed=[];width=height=None
 while at<len(data):
  size=struct.unpack(">I",data[at:at+4])[0];kind=data[at+4:at+8];body=data[at+8:at+8+size];at+=12+size
  if kind==b"IHDR":
   width,height,depth,color,comp,filt,inter=struct.unpack(">IIBBBBB",body);assert (depth,color,comp,filt,inter)==(8,2,0,0,0)
  elif kind==b"IDAT":packed.append(body)
 raw=np.frombuffer(zlib.decompress(b"".join(packed)),dtype=np.uint8).reshape(height,width*3+1);assert np.all(raw[:,0]==0),"Unexpected PNG row filter"
 return raw[:,1:].reshape(height,width,3).astype(np.uint32)
from shapely.geometry import box,mapping
from shapely.ops import unary_union
import shapely
R=pathlib.Path('/Users/masudaso/.codex/worktrees/history-cube-query/天下分け目の国絵図');B=R/'kuniezu/static/kuniezu/map/build';O=pathlib.Path('/tmp/kuniezu-current-water-regions')
if O.exists():raise FileExistsError(O)
def sha(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  while b:=f.read(1024*1024):h.update(b)
 return h.hexdigest()
m=json.load(open(B/'manifest.json'));ledger=json.load(open(R/'kuniezu/map/edits/baseline-ledger.json'));assert m['source']['sha256']==ledger['sourceSha256']=='a88cb31c9fbfd90cb1881a2901904331dd7aac9e0639159df2cbc93b1a7d62ad';verified={}
for k,f in [('provinces','control/provinces.png'),('projection','projection.json'),('definition','control/definition.csv'),('defaultMap','control/default.map')]:
 p=R/'kuniezu/map'/f;assert sha(p)==ledger['sourceFiles'][k];verified[str(p)]=sha(p)
for n,k in [('definition.csv','definition'),('default.map','defaultMap')]:assert sha(B/n)==ledger['sourceFiles'][k]
assert hashlib.sha256('\n'.join(ledger['sourceFiles'][k] for k in ['provinces','definition','defaultMap','projection']).encode()).hexdigest()==m['source']['sha256']
p=json.load(open(R/'kuniezu/map/projection.json'));assert all(m['projection'][k]==p[k] for k in ['K','CX','LON0','LAT0','origin','stepUnits']);dm=(B/'default.map').read_text();sea=set(map(int,re.search(r'sea_zones\s*=\s*LIST\s*\{([^}]+)',dm)[1].split()));lakes=set(map(int,re.search(r'lakes\s*=\s*LIST\s*\{([^}]+)',dm)[1].split()));defs={};colors={}
for l in (B/'definition.csv').read_text().splitlines():
 s=l.split(';')
 if len(s)<5 or not s[0].isdigit():continue
 i=int(s[0]);defs[i]=s[4];colors[(int(s[1])<<16)|(int(s[2])<<8)|int(s[3])]=i
counts=json.load(open(R/'data/audits/raster-province-pixels.json'));assert counts['source']==m['source']['sha256'];full={x['key']:x['pixels'] for x in counts['provinces']};cache={};tileproof=[]
def inv(c,r):return [(p['origin'][0]+c*p['stepUnits'])/(p['K']*p['CX'])+p['LON0'],p['LAT0']-(p['origin'][1]+r*p['stepUnits'])/p['K']]
def grid(lo,la):return [((lo-p['LON0'])*p['K']*p['CX']-p['origin'][0])/p['stepUnits'],((p['LAT0']-la)*p['K']-p['origin'][1])/p['stepUnits']]
def tile(c,r):
 key=(c,r)
 if key not in cache:
  entry=next(x for x in m['tiles'] if x['col']==c and x['row']==r);f=B/'provinces'/entry['file'];assert sha(f)==entry['sha256'];a=decode_rgb(f);rgb=(a[:,:,0]<<16)|(a[:,:,1]<<8)|a[:,:,2];ids=np.zeros(rgb.shape,dtype=np.uint16)
  for col in np.unique(rgb):
   if int(col) not in colors:raise ValueError('Unknown RGB')
   ids[rgb==col]=colors[int(col)]
  cache[key]=ids;tileproof.append({'file':str(f),'sha256':entry['sha256']})
 return cache[key]
regions=[('hachirogata',[139.88,39.82,140.12,40.13],'lake:139.99,39.98'),('ogura',[135.715,34.875,135.825,34.95],'lake:135.77,34.91')];reports=[];outputs=[]
for name,b,key in regions:
 c0,r0=map(math.floor,grid(b[0],b[3]));c1,r1=map(math.ceil,grid(b[2],b[1]));a=np.zeros((r1-r0,c1-c0),dtype=np.uint16)
 for tr in range(r0//1024,(r1-1)//1024+1):
  for tc in range(c0//1024,(c1-1)//1024+1):
   t=tile(tc,tr);x0=max(c0,tc*1024);x1=min(c1,(tc+1)*1024);y0=max(r0,tr*1024);y1=min(r1,(tr+1)*1024);a[y0-r0:y1-r0,x0-c0:x1-c0]=t[y0-tr*1024:y1-tr*1024,x0-tc*1024:x1-tc*1024]
 features=[];roundtrip=np.zeros(a.shape,dtype=np.uint16);xx,yy=np.meshgrid(np.arange(c0,c1)+.5,np.arange(r0,r1)+.5);lon=(p['origin'][0]+xx*p['stepUnits'])/(p['K']*p['CX'])+p['LON0'];lat=p['LAT0']-(p['origin'][1]+yy*p['stepUnits'])/p['K'];pts=shapely.points(lon,lat)
 for i in np.unique(a):
  boxes=[]
  for ry,row in enumerate(a):
   cols=np.flatnonzero(row==i)
   if not len(cols):continue
   starts=np.r_[cols[0],cols[1:][np.diff(cols)>1]];ends=np.r_[cols[:-1][np.diff(cols)>1]+1,cols[-1]+1]
   for st,en in zip(starts,ends):
    nw=inv(c0+int(st),r0+ry);se=inv(c0+int(en),r0+ry+1);boxes.append(box(nw[0],se[1],se[0],nw[1]))
  g=unary_union(boxes);assert g.is_valid;inside=shapely.covers(g,pts);assert np.array_equal(inside,a==i);roundtrip[inside]=i;features.append({'type':'Feature','id':f'{name}:province:{i}','properties':{'provinceId':int(i),'key':defs[int(i)],'drawRole':'sea' if i in sea else 'lake' if i in lakes else 'land','cells':int(np.count_nonzero(a==i)),'shapeRole':'existing-adopted-100m-cell-extent','exactHistoricalShoreline':False},'geometry':mapping(g)})
 assert np.array_equal(roundtrip,a);target=next(i for i,n in defs.items() if n==key);local=int(np.count_nonzero(a==target));assert local==full[key],(key,local,full[key]);edge=np.r_[a[0],a[-1],a[:,0],a[:,-1]];assert not np.any(edge==target)
 report={'name':name,'window':[c0,r0,c1-c0,r1-r0],'cells':a.size,'targetLakeKey':key,'targetLakeCellsInside':local,'targetLakeGlobalAuditCells':full[key],'globalCoverageVerifiedAgainstSourceBoundAudit':True,'targetDoesNotTouchWindowEdge':True,'allCellCentresRoundtripMatch':True,'allShapesValid':True,'counts':[{k:v for k,v in f['properties'].items()} for f in features]};reports.append(report);outputs.append((name,{'type':'FeatureCollection','coordinateReferenceSystem':'OGC:CRS84','status':'migration-of-existing-cell-classification-not-new-shoreline-approval','window':report['window'],'projection':p,'sourceSha256':m['source']['sha256'],'features':features}))
O.mkdir();spec=importlib.util.spec_from_file_location('seed','/tmp/kuniezu-seed-vector-surfaces.py');seed=importlib.util.module_from_spec(spec);spec.loader.exec_module(seed)
for n,d in outputs:(O/(n+'.geojson')).write_text(seed.pretty(d)+'\n')
proof={'sourceManifestSha256':sha(B/'manifest.json'),'sourceLedgerSha256':sha(R/'kuniezu/map/edits/baseline-ledger.json'),'sourceBinding':m['source'],'verifiedMetadata':verified,'tileProofs':tileproof,'regions':reports,'limits':'No whole-map PNG decoded; source provinces compressed PNG streamed for SHA, not decoded. Whole-lake coverage verified via source-bound global pixel counts. Reference accuracy is existing100m cells only.'};(O/'verification.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'tiles':len(cache),'regions':reports},ensure_ascii=False,indent=2))

```

## kuniezu-finalize-era-surfaces.py

SHA-256: `2f12ad50a05d8b40b7cceda2cb5cbb89bae4e70bc8565ecee386edd28a36c90f`

```python
"""One-time /tmp candidate composition; not approved history or normal build."""
import pathlib,json,hashlib,importlib.util
import shapely
from shapely.geometry import shape,mapping,box
from shapely.ops import unary_union
R=pathlib.Path('/Users/masudaso/.codex/worktrees/history-cube-query/天下分け目の国絵図');O=pathlib.Path('/tmp/kuniezu-era-surfaces-final-candidate');assert not O.exists()
spec=importlib.util.spec_from_file_location('seed','/tmp/kuniezu-seed-vector-surfaces.py');seed=importlib.util.module_from_spec(spec);spec.loader.exec_module(seed);inputs=[]
def read(p):
 p=pathlib.Path(p);inputs.append({'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()});return json.load(open(p))
def union(d,role=None):return unary_union([shape(f['geometry']) for f in d['features'] if role is None or f['properties']['drawRole']==role])
base=union(read('/tmp/kuniezu-era-land-candidate/land-1560.geojson'));proj=read(R/'kuniezu/map/projection.json');report=read('/tmp/kuniezu-current-water-regions/verification.json');regiondata=[];seams=[];audits=[]
def inv(c,r):return [(proj['origin'][0]+c*proj['stepUnits'])/(proj['K']*proj['CX'])+proj['LON0'],proj['LAT0']-(proj['origin'][1]+r*proj['stepUnits'])/proj['K']]
hachiroChecks={}
from shapely.geometry import Polygon,Point
def rle_geometry(runs):
 cells=[]
 for row,start,end in runs:
  nw=inv(start,row);se=inv(end,row+1);cells.append(box(nw[0],se[1],se[0],nw[1]))
 return unary_union(cells)
for entry in report['regions']:
 name=entry['name'];d=read('/tmp/kuniezu-current-water-regions/'+name+'.geojson');c,r,w,h=entry['window'];nw=inv(c,r);se=inv(c+w,r+h);rect=box(nw[0],se[1],se[0],nw[1]);land=union(d,'land');before=base
 if name=='hachirogata':
  lake=union(d,'lake');recipe=read(R/'data/research/hachirogata-reference/pixel-reconstruction.json');restoreop=next(x for x in recipe['operations'] if x['toKey']=='castle:hiyama');restore=rle_geometry(restoreop['runs']);defer=read(R/'data/research/hachirogata-reference/edo-review/deferral-overlap-results.json');defergeom=rle_geometry(defer['excludedToLandRuns']);outlet=read(R/'data/research/hachirogata-reference/outlet/results.json')
  holes=unary_union([Polygon(ring) for poly in seed.polygons(lake) for ring in poly.interiors]);islands=holes.intersection(land);protectedIsland=next(Polygon(ring) for poly in seed.polygons(lake) for ring in poly.interiors if Polygon(ring).covers(Point(outlet['islandControlLonLat'])))
  assert islands.difference(land).area==0
  base=base.difference(lake).union(restore).union(islands)
  # Retain actual adopted classification ONLY inside the explicit199 deferred cells.
  base=base.difference(defergeom).union(defergeom.intersection(land))
  hachiroChecks={'lake':lake,'restore':restore,'defer':defergeom,'island':protectedIsland,'currentLand':land,'recipe':recipe,'deferSource':defer,'outlet':outlet}
 else:base=base.difference(rect).union(land)
 regiondata.append((entry,d,rect,land));newseam=base.boundary.intersection(rect.boundary).difference(before.boundary);seams.append({'type':'Feature','id':'seam:'+name,'properties':{'region':name,'role':'rectangular-cut-boundary-diagnostic-not-approved-shore','lengthDegrees':newseam.length},'geometry':mapping(newseam)});audits.append({'region':name,'newBoundaryOnCutLengthDegrees':newseam.length,'newBoundaryOnCutParts':len(list(newseam.geoms)) if hasattr(newseam,'geoms') else int(not newseam.is_empty)})
ukd=read('/tmp/kuniezu-kojima-vectors-final/kojima-bay-ukita-land-from-1584.geojson');uk=union(ukd);base=base.difference(uk);after=base.union(uk)
# Existing comparison water can conflict with retained land: preserve sources, report rather than silently edit.
wd=read('/tmp/kuniezu-vector-seed-candidate/water.geojson');conflicts=[]
for f in wd['features']:
 g=shape(f['geometry']);a=g.intersection(base).area;b=g.intersection(after).area
 if max(a,b)>1e-15:conflicts.append({'id':f['id'],'name':f['properties'].get('name'),'beforeAreaDegreesSquared':a,'afterAreaDegreesSquared':b})
# Suppress only adopted Katori open boundaries, with contract buffer. Other rectangular seams remain visible in diagnostics.
cd=read('/tmp/kuniezu-era-land-candidate/open-boundaries.geojson');mask=read(R/'kuniezu/map/physical/shoreline_masks.geojson');buffers={f['properties']['id']:f['properties']['bufferMetres'] for f in mask['features']}
from shapely.ops import transform
from pyproj import Transformer
forward=Transformer.from_crs('OGC:CRS84','EPSG:6677',always_xy=True);back=Transformer.from_crs('EPSG:6677','OGC:CRS84',always_xy=True);supp=[]
for f in cd['features']:
 key=f.get('id',f['properties'].get('id'));g=shape(f['geometry']);supp.append(transform(back.transform,transform(forward.transform,g).buffer(buffers[key])))
suppress=unary_union(supp);b0=base.boundary.difference(suppress);b1=after.boundary.difference(suppress);common=b0.intersection(b1);beforeonly=b0.difference(common);afteronly=b1.difference(common)
lands=[]
for i,g in enumerate(seed.polygons(base)):lands.append({'type':'Feature','id':f'land:baseline:{i:05d}','properties':{'drawRole':'land','shapeRole':'candidate-existing-adoption-migration','validFrom':[1560,1,1],'validUntil':[1616,1,1],'exactHistoricalShoreline':False},'geometry':mapping(g)})
for i,f in enumerate(ukd['features']):
 v=dict(f);v['id']=f'land:ukita1584:{i}';v['properties']={**f['properties'],'drawRole':'land','shapeRole':'adopted-cell-extent','validFrom':[1584,1,1],'validUntil':[1616,1,1]};lands.append(v)
coasts=[]
for key,g,start,end in [('common',common,1560,1616),('before-only',beforeonly,1560,1584),('after-only',afteronly,1584,1616)]:coasts.append({'type':'Feature','id':'coast:'+key,'properties':{'drawRole':'coastline','validFrom':[start,1,1],'validUntil':[end,1,1]},'geometry':mapping(g)})
# Reclassify EVERY recorded regional cell centre as land vs water. Sea/lake attributes retained separately in region-classification file.
checks=[]
for entry,d,rect,land in regiondata:
 c,r,w,h=entry['window'];import numpy as np
 xx,yy=np.meshgrid(np.arange(c,c+w)+.5,np.arange(r,r+h)+.5);lon=(proj['origin'][0]+xx*proj['stepUnits'])/(proj['K']*proj['CX'])+proj['LON0'];lat=proj['LAT0']-(proj['origin'][1]+yy*proj['stepUnits'])/proj['K'];pts=shapely.points(lon,lat);expected=shapely.covers(land,pts);actual0=shapely.covers(base,pts);actual1=shapely.covers(after,pts)
 if entry['name']=='ogura':
  assert np.array_equal(expected,actual0) and np.array_equal(expected,actual1);checks.append({'region':entry['name'],'cells':w*h,'beforeAndAfterLandClassificationExact':True})
 else:
  tests={}
  for label,g in [(k,hachiroChecks[k]) for k in ['lake','restore','defer','island']]:
   sel=shapely.covers(g,pts);total=int(np.count_nonzero(sel));match=bool(np.array_equal(actual0[sel],expected[sel]) and np.array_equal(actual1[sel],expected[sel]));tests[label]={'cells':total,'currentClassificationMatch':match};assert match
  assert tests['lake']['cells']==23423 and tests['restore']['cells']==3820 and tests['defer']['cells']==199 and tests['island']['cells']==18
  checks.append({'region':'hachirogata','adoptedSubsetChecks':tests,'entireRectangleMatchNotRequired':True})
# Root-authorized effective water composition; no new Iinuma/Minuma/Tsubaki promotion.
rects=unary_union([rect if entry['name']=='ogura' else hachiroChecks['lake'].union(hachiroChecks['restore']).union(hachiroChecks['island']).union(hachiroChecks['defer']) for entry,d,rect,land in regiondata]);effectivewaters=[]
for f in wd['features']:
 g=shape(f['geometry']).difference(rects).difference(base)
 if not g.is_empty:
  v=dict(f);v['geometry']=mapping(g);effectivewaters.append(v)
for entry,d,rect,land in regiondata:
 for f in d['features']:
  if f['properties']['drawRole']=='lake':
   v=dict(f);v['id']='water:current:'+f['id'];v['properties']={**f['properties'],'drawRole':'water'};effectivewaters.append(v)
kcontract=read(R/'kuniezu/map/edits/vector/manifest.json')['overrides'][0];kd=read(R/kcontract['source']);kf={f.get('id',f.get('properties',{}).get('id')):f for f in kd['features']};kw=unary_union([shape(kf[k]['geometry']) for k in kcontract['components']['water']]);kp=unary_union([shape(kf[k]['geometry']) for k in kcontract['components']['protectedLand']]);kg=kw.difference(kp).difference(base)
if not kg.is_empty:effectivewaters.append({'type':'Feature','id':'water:katori-adopted','properties':{'drawRole':'water','shapeRole':'inferred-period-waterbody','exactHistoricalShoreline':False},'geometry':mapping(kg)})
waterbase=unary_union([shape(f['geometry']) for f in effectivewaters]);ukwater=waterbase.intersection(uk);waterfeatures=[]
for f in effectivewaters:
 original=shape(f['geometry']);commonwater=original.difference(uk);beforewater=original.intersection(uk)
 for suffix,g,start,end in [('common',commonwater,1560,1616),('before1584',beforewater,1560,1584)]:
  if g.is_empty:continue
  assert g.is_valid
  v=dict(f);v['id']=str(f['id'])+':'+suffix;v['properties']={**f['properties'],'drawRole':'water','validFrom':[start,1,1],'validUntil':[end,1,1]};v['geometry']=mapping(g);waterfeatures.append(v)
waterafter=waterbase.difference(uk);assert waterbase.intersection(base).area<1e-15 and waterafter.intersection(after).area<1e-15

assert base.is_valid and after.is_valid
verification={'status':'candidate-only-current-game-unchanged','inputs':inputs,'regions':checks,'cutBoundaryAudit':audits,'referenceWaterLandConflicts':conflicts,'referenceWaterConflictCount':len(conflicts),'allLandValid':True,'effectiveWaterUkitaOverlapAreaDegreesSquared':ukwater.area,'effectiveWaterCommonAllYears':ukwater.area==0,'effectiveWaterLandOverlapBeforeDegreesSquared':waterbase.intersection(base).area,'effectiveWaterLandOverlapAfterDegreesSquared':waterafter.intersection(after).area,'baselineUkitaOverlapAreaDegreesSquared':base.intersection(uk).area,'ukitaDeltaSymmetricDifferenceDegreesSquared':after.difference(base).symmetric_difference(uk).area,'katoriOpenBoundarySuppression':'150m buffers from existing physical shoreline_masks; metric EPSG6677; not historical channel width','warning':'Rectangular seam lengths are angular degrees, not physical shore precision. Raw reference conflicts listed; effective water subtracts active land and regional replacement windows.'}
O.mkdir()
def write(n,features,extra=None):
 d={'type':'FeatureCollection','coordinateReferenceSystem':'OGC:CRS84','status':verification['status'],'provenance':{'inputs':inputs},'features':features};d.update(extra or {});(O/n).write_text(seed.pretty(d)+'\n')
write('water.geojson',waterfeatures,{'katoriAdoption':kcontract});write('land.geojson',lands,{'ukitaAdoption':ukd.get('adoption')});write('coastline.geojson',coasts);write('cut-boundary-diagnostics.geojson',[f for f in seams if not shape(f['geometry']).is_empty]);write('region-classification.geojson',[f for e,d,rect,l in regiondata for f in d['features']]);(O/'verification.json').write_text(json.dumps(verification,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in verification.items() if k not in ['inputs','referenceWaterLandConflicts']},ensure_ascii=False,indent=2))

```

## kuniezu-review-era-surfaces.py

SHA-256: `46c4b07fc34b3aa12f9cf95d933500fcf80d44a8fd07a4d1d700553a690186b9`

```python
"""One-time /tmp candidate composition; not approved history or normal build."""
import pathlib,json,hashlib,importlib.util
import shapely
from shapely.geometry import shape,mapping,box
from shapely.ops import unary_union
R=pathlib.Path('/Users/masudaso/.codex/worktrees/history-cube-query/天下分け目の国絵図');O=pathlib.Path('/tmp/kuniezu-era-surfaces-reviewed-candidate');assert not O.exists()
spec=importlib.util.spec_from_file_location('seed','/tmp/kuniezu-seed-vector-surfaces.py');seed=importlib.util.module_from_spec(spec);spec.loader.exec_module(seed);inputs=[]
def read(p):
 p=pathlib.Path(p);inputs.append({'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()});return json.load(open(p))
def union(d,role=None):return unary_union([shape(f['geometry']) for f in d['features'] if role is None or f['properties']['drawRole']==role])
base=union(read('/tmp/kuniezu-era-land-candidate/land-1560.geojson'));proj=read(R/'kuniezu/map/projection.json');report=read('/tmp/kuniezu-current-water-regions/verification.json');regiondata=[];seams=[];audits=[]
def inv(c,r):return [(proj['origin'][0]+c*proj['stepUnits'])/(proj['K']*proj['CX'])+proj['LON0'],proj['LAT0']-(proj['origin'][1]+r*proj['stepUnits'])/proj['K']]
hachiroChecks={}
from shapely.geometry import Polygon,Point
def rle_geometry(runs):
 cells=[]
 for row,start,end in runs:
  nw=inv(start,row);se=inv(end,row+1);cells.append(box(nw[0],se[1],se[0],nw[1]))
 return unary_union(cells)
for entry in report['regions']:
 name=entry['name'];d=read('/tmp/kuniezu-current-water-regions/'+name+'.geojson');c,r,w,h=entry['window'];nw=inv(c,r);se=inv(c+w,r+h);rect=box(nw[0],se[1],se[0],nw[1]);land=union(d,'land');before=base
 if name=='hachirogata':
  lake=union(d,'lake');recipe=read(R/'data/research/hachirogata-reference/pixel-reconstruction.json');restoreop=next(x for x in recipe['operations'] if x['toKey']=='castle:hiyama');restore=rle_geometry(restoreop['runs']);defer=read(R/'data/research/hachirogata-reference/edo-review/deferral-overlap-results.json');defergeom=rle_geometry(defer['excludedToLandRuns']);outlet=read(R/'data/research/hachirogata-reference/outlet/results.json')
  holes=unary_union([Polygon(ring) for poly in seed.polygons(lake) for ring in poly.interiors]);islands=holes.intersection(land);protectedIsland=next(Polygon(ring) for poly in seed.polygons(lake) for ring in poly.interiors if Polygon(ring).covers(Point(outlet['islandControlLonLat'])))
  assert islands.difference(land).area==0
  base=base.difference(lake).union(restore).union(islands)
  # Retain actual adopted classification ONLY inside the explicit199 deferred cells.
  base=base.difference(defergeom).union(defergeom.intersection(land))
  hachiroChecks={'lake':lake,'restore':restore,'defer':defergeom,'island':protectedIsland,'currentLand':land,'recipe':recipe,'deferSource':defer,'outlet':outlet}
 else:base=base.difference(rect).union(land)
 regiondata.append((entry,d,rect,land));newseam=base.boundary.intersection(rect.boundary).difference(before.boundary);seams.append({'type':'Feature','id':'seam:'+name,'properties':{'region':name,'role':'rectangular-cut-boundary-diagnostic-not-approved-shore','lengthDegrees':newseam.length},'geometry':mapping(newseam)});audits.append({'region':name,'newBoundaryOnCutLengthDegrees':newseam.length,'newBoundaryOnCutParts':len(list(newseam.geoms)) if hasattr(newseam,'geoms') else int(not newseam.is_empty)})
kcontract=read(R/'kuniezu/map/edits/vector/manifest.json')['overrides'][0];kd=read(R/kcontract['source']);kf={f.get('id',f.get('properties',{}).get('id')):f for f in kd['features']};kp=unary_union([shape(kf[k]['geometry']) for k in kcontract['components']['protectedLand']]);base=base.union(kp)
ukd=read('/tmp/kuniezu-kojima-vectors-final/kojima-bay-ukita-land-from-1584.geojson');uk=union(ukd);base=base.difference(uk);after=base.union(uk)
# Existing comparison water can conflict with retained land: preserve sources, report rather than silently edit.
wd=read('/tmp/kuniezu-vector-seed-candidate/water.geojson');conflicts=[]
for f in wd['features']:
 g=shape(f['geometry']);a=g.intersection(base).area;b=g.intersection(after).area
 if max(a,b)>1e-15:conflicts.append({'id':f['id'],'name':f['properties'].get('name'),'beforeAreaDegreesSquared':a,'afterAreaDegreesSquared':b})
# Suppress only adopted Katori open boundaries, with contract buffer. Other rectangular seams remain visible in diagnostics.
cd=read('/tmp/kuniezu-era-land-candidate/open-boundaries.geojson');mask=read(R/'kuniezu/map/physical/shoreline_masks.geojson');buffers={f['properties']['id']:f['properties']['bufferMetres'] for f in mask['features']}
from shapely.ops import transform
from pyproj import Transformer
forward=Transformer.from_crs('OGC:CRS84','EPSG:6677',always_xy=True);back=Transformer.from_crs('EPSG:6677','OGC:CRS84',always_xy=True);supp=[]
for f in cd['features']:
 key=f.get('id',f['properties'].get('id'));g=shape(f['geometry']);supp.append(transform(back.transform,transform(forward.transform,g).buffer(buffers[key])))
suppress=unary_union(supp);b0=base.boundary.difference(suppress);b1=after.boundary.difference(suppress)
# Compare whole original segments near Ukita, retaining original vertices at frame crossings.
from shapely.geometry import LineString,MultiLineString
def lines(g):
 if g.is_empty:return []
 if g.geom_type=='LineString':return [g]
 return [line for part in g.geoms for line in lines(part)]
u=uk.bounds;local=box(u[0]-.01,u[1]-.01,u[2]+.01,u[3]+.01);commons=[];befores=[];afters=[]
for line in lines(b0):
 if not line.intersects(local):commons.append(line);continue
 coords=list(line.coords);run=[];prior=None
 for left,right in zip(coords,coords[1:]):
  seg=LineString([left,right]);kind='common' if not seg.intersects(local) or b1.covers(seg) else 'before'
  if prior!=kind and run:
   (commons if prior=='common' else befores).append(LineString(run));run=[]
  if not run:run=[left]
  run.append(right);prior=kind
 if run:(commons if prior=='common' else befores).append(LineString(run))
common=MultiLineString(commons);beforeonly=MultiLineString(befores);shapely.prepare(common)
for line in lines(b1):
 if not line.intersects(local):continue
 coords=list(line.coords)
 for left,right in zip(coords,coords[1:]):
  seg=LineString([left,right])
  if seg.intersects(local) and not common.covers(seg):afters.extend(lines(seg.difference(common)))
afteronly=MultiLineString(afters)
shoreChecks={}
for label,expected,actual in [('before',b0,unary_union([common,beforeonly])),('after',b1,unary_union([common,afteronly]))]:
 delta=expected.symmetric_difference(actual);shoreChecks[label]={'equals':expected.equals(actual),'symmetricDifferenceLengthDegrees':delta.length,'missingLengthDegrees':expected.difference(actual).length,'extraLengthDegrees':actual.difference(expected).length};print('SHORE CHECK',label,shoreChecks[label],flush=True)
lands=[]
for i,g in enumerate(seed.polygons(base)):lands.append({'type':'Feature','id':f'land:baseline:{i:05d}','properties':{'drawRole':'land','shapeRole':'candidate-existing-adoption-migration','validFrom':[1560,1,1],'validUntil':[1616,1,1],'exactHistoricalShoreline':False},'geometry':mapping(g)})
for i,f in enumerate(ukd['features']):
 v=dict(f);v['id']=f'land:ukita1584:{i}';v['properties']={**f['properties'],'drawRole':'land','shapeRole':'adopted-cell-extent','validFrom':[1584,1,1],'validUntil':[1616,1,1]};lands.append(v)
coasts=[]
def lineparts(g):
 if g.is_empty:return []
 if g.geom_type=='LineString':return [g]
 if hasattr(g,'geoms'):return [line for part in g.geoms for line in lineparts(part)]
 raise ValueError('Unexpected shoreline geometry')
for key,g,start,end in [('common',common,1560,1616),('before-only',beforeonly,1560,1584),('after-only',afteronly,1584,1616)]:
 for i,line in enumerate(lineparts(g)):
  coasts.append({'type':'Feature','id':f'shore:{key}:{i:05d}','properties':{'drawRole':'shore','validFrom':[start,1,1],'validUntil':[end,1,1]},'bbox':list(line.bounds),'geometry':mapping(line)})
shapely.prepare(base);shapely.prepare(after)
# Reclassify EVERY recorded regional cell centre as land vs water. Sea/lake attributes retained separately in region-classification file.
checks=[]
for entry,d,rect,land in regiondata:
 c,r,w,h=entry['window'];import numpy as np
 xx,yy=np.meshgrid(np.arange(c,c+w)+.5,np.arange(r,r+h)+.5);lon=(proj['origin'][0]+xx*proj['stepUnits'])/(proj['K']*proj['CX'])+proj['LON0'];lat=proj['LAT0']-(proj['origin'][1]+yy*proj['stepUnits'])/proj['K'];pts=shapely.points(lon,lat);expected=shapely.covers(land,pts);actual0=shapely.covers(base,pts);actual1=shapely.covers(after,pts)
 if entry['name']=='ogura':
  assert np.array_equal(expected,actual0) and np.array_equal(expected,actual1);checks.append({'region':entry['name'],'cells':w*h,'beforeAndAfterLandClassificationExact':True})
 else:
  tests={}
  for label,g in [(k,hachiroChecks[k]) for k in ['lake','restore','defer','island']]:
   sel=shapely.covers(g,pts);total=int(np.count_nonzero(sel));match=bool(np.array_equal(actual0[sel],expected[sel]) and np.array_equal(actual1[sel],expected[sel]));tests[label]={'cells':total,'currentClassificationMatch':match};assert match
  assert tests['lake']['cells']==23423 and tests['restore']['cells']==3820 and tests['defer']['cells']==199 and tests['island']['cells']==18
  checks.append({'region':'hachirogata','adoptedSubsetChecks':tests,'entireRectangleMatchNotRequired':True})
# Root-authorized effective water composition; no new Iinuma/Minuma/Tsubaki promotion.
rects=unary_union([rect if entry['name']=='ogura' else hachiroChecks['lake'].union(hachiroChecks['restore']).union(hachiroChecks['island']).union(hachiroChecks['defer']) for entry,d,rect,land in regiondata]);effectivewaters=[]
for f in wd['features']:
 g=shape(f['geometry']).difference(rects).difference(base)
 if not g.is_empty:
  v=dict(f);v['geometry']=mapping(g);effectivewaters.append(v)
for entry,d,rect,land in regiondata:
 for f in d['features']:
  if f['properties']['drawRole']=='lake':
   v=dict(f);v['id']='water:current:'+f['id'];v['properties']={**f['properties'],'drawRole':'water'};effectivewaters.append(v)
kcontract=read(R/'kuniezu/map/edits/vector/manifest.json')['overrides'][0];kd=read(R/kcontract['source']);kf={f.get('id',f.get('properties',{}).get('id')):f for f in kd['features']};kw=unary_union([shape(kf[k]['geometry']) for k in kcontract['components']['water']]);kp=unary_union([shape(kf[k]['geometry']) for k in kcontract['components']['protectedLand']]);kg=kw.difference(kp).difference(base)
if not kg.is_empty:effectivewaters.append({'type':'Feature','id':'water:katori-adopted','properties':{'drawRole':'water','shapeRole':'inferred-period-waterbody','exactHistoricalShoreline':False},'geometry':mapping(kg)})
waterbase=unary_union([shape(f['geometry']) for f in effectivewaters]);ukwater=waterbase.intersection(uk);waterfeatures=[]
for f in effectivewaters:
 original=shape(f['geometry']).difference(kp);commonwater=original.difference(uk);beforewater=original.intersection(uk)
 for suffix,g,start,end in [('common',commonwater,1560,1616),('before1584',beforewater,1560,1584)]:
  if g.is_empty:continue
  assert g.is_valid
  v=dict(f);v['id']=str(f['id']) if suffix=='common' else str(f['id'])+':'+suffix;v['properties']={**f['properties'],'drawRole':'water','validFrom':[start,1,1],'validUntil':[end,1,1]};v['geometry']=mapping(g);waterfeatures.append(v)
waterafter=waterbase.difference(uk);assert waterbase.intersection(base).area<1e-15 and waterafter.intersection(after).area<1e-15

# Validate every protected cell centre, not just a representative point.
import math
kb=kp.bounds;gc0=math.floor(((kb[0]-proj['LON0'])*proj['K']*proj['CX']-proj['origin'][0])/proj['stepUnits']);gc1=math.ceil(((kb[2]-proj['LON0'])*proj['K']*proj['CX']-proj['origin'][0])/proj['stepUnits']);gr0=math.floor(((proj['LAT0']-kb[3])*proj['K']-proj['origin'][1])/proj['stepUnits']);gr1=math.ceil(((proj['LAT0']-kb[1])*proj['K']-proj['origin'][1])/proj['stepUnits']);protectedpoints=[Point(inv(c+.5,r+.5)) for r in range(gr0,gr1) for c in range(gc0,gc1) if kp.covers(Point(inv(c+.5,r+.5)))];assert len(protectedpoints)==70;assert all(base.covers(p) and after.covers(p) for p in protectedpoints);print('PROTECTED WATER AREA',waterbase.intersection(kp).area,waterafter.intersection(kp).area,flush=True);assert waterbase.intersection(kp).area<1e-15 and waterafter.intersection(kp).area<1e-15
assert base.is_valid and after.is_valid
verification={'status':'candidate-only-current-game-unchanged','inputs':inputs,'regions':checks,'cutBoundaryAudit':audits,'referenceWaterLandConflicts':conflicts,'referenceWaterConflictCount':len(conflicts),'shoreChecks':shoreChecks,'shoreFeatureCount':len(coasts),'shoreVertexCount':sum(len(f['geometry']['coordinates']) for f in coasts),'katoriProtectedCells':70,'katoriProtectedAllLandBothEras':True,'katoriProtectedWaterOverlapBeforeDegreesSquared':waterbase.intersection(kp).area,'katoriProtectedWaterOverlapAfterDegreesSquared':waterafter.intersection(kp).area,'allLandValid':True,'effectiveWaterUkitaOverlapAreaDegreesSquared':ukwater.area,'effectiveWaterCommonAllYears':ukwater.area==0,'effectiveWaterLandOverlapBeforeDegreesSquared':waterbase.intersection(base).area,'effectiveWaterLandOverlapAfterDegreesSquared':waterafter.intersection(after).area,'baselineUkitaOverlapAreaDegreesSquared':base.intersection(uk).area,'ukitaDeltaSymmetricDifferenceDegreesSquared':after.difference(base).symmetric_difference(uk).area,'katoriOpenBoundarySuppression':'150m buffers from existing physical shoreline_masks; metric EPSG6677; not historical channel width','warning':'Rectangular seam lengths are angular degrees, not physical shore precision. Raw reference conflicts listed; effective water subtracts active land and regional replacement windows.'}
O.mkdir()
def write(n,features,extra=None):
 d={'type':'FeatureCollection','coordinateReferenceSystem':'OGC:CRS84','status':verification['status'],'provenance':{'inputs':inputs,'sourceProvenance':wd.get('provenance'),'canonicalFiveMetadata':wd.get('provenance',{}).get('canonicalFiveMetadata'),'mlitSourceManifest':wd.get('provenance',{}).get('mlitSourceManifest'),'katoriAdoption':kcontract,'ukitaAdoption':ukd.get('adoption')},'features':features};d.update(extra or {});(O/n).write_text(seed.pretty(d)+'\n')
assert {f['id'] for f in waterfeatures}.issuperset({'lake:towada','lake:tazawa','lake:inawashiro','lake:kiba','lake:yogo'})
write('water.geojson',waterfeatures,{'katoriAdoption':kcontract});write('land.geojson',lands,{'ukitaAdoption':ukd.get('adoption')});write('coastline.geojson',coasts);write('cut-boundary-diagnostics.geojson',[f for f in seams if not shape(f['geometry']).is_empty]);write('region-classification.geojson',[f for e,d,rect,l in regiondata for f in d['features']]);verification['shoreOutputBytes']=(O/'coastline.geojson').stat().st_size
(O/'verification.json').write_text(json.dumps(verification,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in verification.items() if k not in ['inputs','referenceWaterLandConflicts']},ensure_ascii=False,indent=2))

```

## kuniezu-supplement-natural-lakes.py

SHA-256: `1a4dbd6934b3502b7f6f059e358a6938138e78391882a00788fec89186f23304`

```python
"""Candidate-only local supplement of directly edited current canonical surfaces."""
import pathlib,json,hashlib,copy,zipfile,io,importlib.util,math
import shapefile,shapely
from shapely.geometry import shape,mapping,Point,LineString
from shapely.ops import unary_union,transform
from shapely.strtree import STRtree
from pyproj import Transformer,network
R=pathlib.Path('/Users/masudaso/.codex/worktrees/history-cube-query/天下分け目の国絵図');O=pathlib.Path('/tmp/kuniezu-natural-lake-supplement-candidate');assert not O.exists()
spec=importlib.util.spec_from_file_location('seed','/tmp/kuniezu-seed-vector-surfaces.py');seed=importlib.util.module_from_spec(spec);spec.loader.exec_module(seed)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
parent={n:json.load(open(R/'kuniezu/map/physical'/f'{n}.geojson')) for n in ['land','water','coastline']};parentSha={n:sha(R/'kuniezu/map/physical'/f'{n}.geojson') for n in parent};audit=json.load(open('/tmp/kuniezu-w09-missing-natural-lakes.json'));meta=json.load(open(R/'data/inputs/mlit-w09-2005/manifest.json'));zp=R/'data/inputs/mlit-w09-2005/W09-05_GML.zip';assert sha(zp)==meta['sha256'];z=zipfile.ZipFile(zp);reader=shapefile.Reader(shp=io.BytesIO(z.read('W09-05-g_Lake.shp')),shx=io.BytesIO(z.read('W09-05-g_Lake.shx')),dbf=io.BytesIO(z.read('W09-05-g_Lake.dbf')),encoding='cp932');network.set_network_enabled(False);tx=Transformer.from_crs('EPSG:4612','OGC:CRS84',always_xy=True,allow_ballpark=False,only_best=True);assert tx.accuracy==1
ids={24:'shikotsu',68:'toya',69:'kuttara',81:'shikaribetsu',98:'mashu',99:'kussharo',102:'akan',214:'chuzenji',268:'ashinoko',312:'motosu',313:'shoji',318:'yamanaka',319:'sai',320:'kawaguchi',332:'aoki',363:'nojiri-nagano',545:'ikeda'};new=[];checks=[]
for row,slug in ids.items():
 record=next(x for x in audit['records'] if x['sourceRecord']==row);rawgeom=reader.shape(row).__geo_interface__;assert reader.record(row)['W09_001']==record['sourceName'];assert hashlib.sha256(json.dumps(rawgeom,separators=(',',':')).encode()).hexdigest()==record['sourceGeometrySha256'];g=transform(lambda x,y,z=None:tx.transform(x,y,errcheck=True),shape(rawgeom));assert g.is_valid
 evidence=copy.deepcopy(record['historicalEvidence'])
 if row==214:evidence=[{'url':'https://www.mlit.go.jp/tagengo-db/common/001556132.pdf','locator':'p1冒頭2万年前の溶岩堰止め','basis':'国交省本文：2万年前の男体山溶岩が大谷川を堰止めた湖。','verifiedBody':True}]
 if row==69:evidence=[{'url':'https://www.data.jma.go.jp/vois/data/sapporo/111_Kuttara/111_index.html','locator':'概要・本文24行','basis':'気象庁本文：約4万年前までの活動で直径3kmカルデラ形成。環境省の倶多楽湖説明と同定。','verifiedBody':True}]
 for e in evidence:e['verifiedBody']=True
 prop={'name':record['sourceName'],'drawRole':'water','shapeRole':'modern-comparison','exactHistoricalShoreline':False,'referenceYear':2005,'validFrom':[1560,1,1],'validUntil':[1616,1,1],'sourceDatasetId':'mlit-w09-2005','sourceRecord':row,'sourceName':record['sourceName'],'sourceArchiveSha256':meta['sha256'],'sourceGeometrySha256':record['sourceGeometrySha256'],'existenceEvidence':evidence,'sourceAttributes':record['sourceAttributes']}
 new.append({'type':'Feature','id':'lake:'+slug,'properties':prop,'geometry':mapping(g)});checks.append({'id':'lake:'+slug,'sourceRecord':row,'sourceName':record['sourceName'],'islandHolesPreserved':sum(len(p.interiors) for p in seed.polygons(g)),'newCentre':list(g.representative_point().coords[0])})
mask=unary_union([shape(f['geometry']) for f in new]);land=copy.deepcopy(parent['land']);water=copy.deepcopy(parent['water']);shore=copy.deepcopy(parent['coastline']);changedLand=[];changedShore=[]
for f in land['features']:
 before=shape(f['geometry'])
 if not before.intersects(mask):continue
 after=before.difference(mask);assert not after.is_empty and after.is_valid;f['geometry']=mapping(after);f.pop('bbox',None);changedLand.append(f['id'])
# No existing IDs removed; existing shoreline is only clipped if new water actually crosses it.
for f in shore['features']:
 before=shape(f['geometry'])
 if not before.intersects(mask):continue
 after=before.difference(mask);assert not after.is_empty and after.is_valid;f['geometry']=mapping(after);f['bbox']=list(after.bounds);changedShore.append(f['id'])
water['features'].extend(new)
def active(d,year):return unary_union([shape(f['geometry']) for f in d['features'] if f['properties'].get('validFrom',[1560])[0]<=year<f['properties'].get('validUntil',[1616])[0]])
# Inland source lake boundaries add shoreline only where effective land borders them.
land0=active(land,1560);land1=active(land,1584);old0=active(parent['land'],1560);old1=active(parent['land'],1584)
def lines(g):
 if g.is_empty:return []
 if g.geom_type=='LineString':return [g]
 return [l for p in g.geoms for l in lines(p)]
newBoundary=mask.boundary;assert newBoundary.equals(land0.boundary.intersection(mask.boundary)) and newBoundary.equals(land1.boundary.intersection(mask.boundary))
for i,line in enumerate(lines(newBoundary)):shore['features'].append({'type':'Feature','id':f'shore:natural-lake-supplement:{i:05d}','bbox':list(line.bounds),'properties':{'drawRole':'shore','shapeRole':'derived-from-edited-land','exactHistoricalShoreline':False,'validFrom':[1560,1,1],'validUntil':[1616,1,1]},'geometry':mapping(line)})
# Existing parent shore is already boundary-minus-Katori suppression. New lakes are remote from suppression.
shoreChecks={}
for year,newland,oldland in [(1560,land0,old0),(1584,land1,old1)]:
 oldshore=active(parent['coastline'],year);expected=oldshore.difference(mask).union(newland.boundary.intersection(mask.boundary));actual=active(shore,year);delta=expected.symmetric_difference(actual);shoreChecks[str(year)]={'equalsExpectedParentShorePlusLakeEdges':expected.equals(actual),'differenceLengthDegrees':delta.length};assert delta.length==0
w=active(water,1560);w1=active(water,1584);shapely.prepare(w)
for c in checks:assert w.covers(Point(c['newCentre']));c['centreCovered']=True
assert land0.intersection(w).area<1e-15 and land1.intersection(w1).area<1e-15
# Existing adoption regions must not be changed by this local supplement.
retained=[]
for region in ['hachirogata','ogura']:
 reg=json.load(open('/tmp/kuniezu-current-water-regions/'+region+'.geojson'));extent=unary_union([shape(f['geometry']) for f in reg['features']]);assert extent.intersection(mask).area==0;assert old0.intersection(extent).equals(land0.intersection(extent));assert old1.intersection(extent).equals(land1.intersection(extent));retained.append(region)
p=json.load(open(R/'kuniezu/map/projection.json'));kd=json.load(open(R/'data/research/katori-review/uchinasaka/south-connection/wide-lake-perimeter.geojson'));kp=shape(next(f['geometry'] for f in kd['features'] if f['properties']['id']=='protected-southeast-land'));assert mask.intersection(kp).area==0
b=kp.bounds;grid=lambda lo,la:(((lo-p['LON0'])*p['K']*p['CX']-p['origin'][0])/p['stepUnits'],((p['LAT0']-la)*p['K']-p['origin'][1])/p['stepUnits']);c0,r0=map(math.floor,grid(b[0],b[3]));c1,r1=map(math.ceil,grid(b[2],b[1]));points=[]
for r in range(r0,r1):
 for c in range(c0,c1):
  pt=Point((p['origin'][0]+(c+.5)*p['stepUnits'])/(p['K']*p['CX'])+p['LON0'],p['LAT0']-(p['origin'][1]+(r+.5)*p['stepUnits'])/p['K'])
  if kp.covers(pt):points.append(pt)
assert len(points)==70 and all(land0.covers(pt) and land1.covers(pt) for pt in points)
uk=unary_union([shape(f['geometry']) for f in land['features'] if f['properties']['validFrom'][0]==1584]);assert land1.difference(land0).equals(uk)
for name,d in [('land',land),('water',water),('coastline',shore)]:
 oldids={f['id'] for f in parent[name]['features']};nowids=[f['id'] for f in d['features']];assert oldids.issubset(nowids) and len(nowids)==len(set(nowids));assert all(shape(f['geometry']).is_valid for f in d['features']);d.setdefault('provenance',{})['naturalLakeSupplement']={'parentInputSha256':parentSha,'sourceArchiveSha256':meta['sha256'],'sourceUrl':meta['url'],'sourceLicenseUrl':meta['terms'],'sourceCredit':meta['credit'],'coordinateOperation':{'source':'EPSG:4612','target':'OGC:CRS84','alwaysXY':True,'allowBallpark':False,'network':False,'accuracyMetres':tx.accuracy,'description':tx.description},'held':['鰻池:official-body-unverified','御池:W09-geometry-absent'],'policy':'Existing directly edited canonical geometry retained; local difference/append only. Modern comparison, not measured1560 shoreline.'}
report={'parentInputSha256':parentSha,'originalZipSha256':meta['sha256'],'addedLakes':checks,'held':['鰻池:404/search-index only','御池:source geometry absent'],'changedExistingLandIds':changedLand,'changedExistingShoreIds':changedShore,'shoreChecks':shoreChecks,'allValid':True,'existingIdsRetained':True,'fiveCanonicalIdsRetained':True,'katoriProtected70BothLand':True,'retainedAdoptionRegions':retained,'ukita366GeometryRetained':land1.difference(land0).equals(uk),'waterLandOverlapDegreesSquared':{'1560':land0.intersection(w).area,'1584':land1.intersection(w1).area},'currentGameUnchanged':True}
O.mkdir()
for n,d in [('land',land),('water',water),('coastline',shore)]:(O/(n+'.geojson')).write_text(seed.pretty(d)+'\n')
(O/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k not in ['addedLakes','changedExistingLandIds']},ensure_ascii=False,indent=2))

```

## kuniezu-defer-period-waters.py

SHA-256: `8fc0ee1b494751707a8ace9ed68658d98589ef5729f539f0f652c57f8032ffda`

```python
"""Local candidate quarantine and unspecified background; never historic dry-land fact."""
import pathlib,json,copy,hashlib,importlib.util
import shapely
from shapely.geometry import shape,mapping,Point,MultiLineString
from shapely.ops import unary_union
I=pathlib.Path('/tmp/kuniezu-natural-lake-supplement-candidate');D=pathlib.Path('/tmp/kuniezu-codh-deferred-waters');O=pathlib.Path('/tmp/kuniezu-period-water-final-candidate');assert not O.exists();R=pathlib.Path('/Users/masudaso/.codex/worktrees/history-cube-query/天下分け目の国絵図');spec=importlib.util.spec_from_file_location('seed','/tmp/kuniezu-seed-vector-surfaces.py');seed=importlib.util.module_from_spec(spec);spec.loader.exec_module(seed)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def union(d,y=1560):return unary_union([shape(f['geometry']) for f in d['features'] if f['properties'].get('validFrom',[1560])[0]<=y<f['properties'].get('validUntil',[1616])[0]])
parents={n:json.load(open(I/(n+'.geojson'))) for n in ['land','water','coastline']};land,water,shore=[copy.deepcopy(parents[n]) for n in ['land','water','coastline']];decision=json.load(open(D/'decision.json'));packet=json.load(open(D/'deferred-waters.geojson'));blocked={x['featureId'] for x in decision['deferred']};removed=[f for f in water['features'] if f['id'] in blocked];assert len(removed)==len(blocked)==7
# Packet geometry/row identity must match exact intended features; canonical adds metadata which is retained.
for f in removed:
 original=next(x for x in packet['features'] if x['id']==f['id']);assert f['geometry']==original['geometry'];assert f['properties']['sourceRowId']==original['properties']['sourceRowId']
water['features']=[f for f in water['features'] if f['id'] not in blocked];uncertain=next(f for f in water['features'] if f['id']=='water:codh-lake:57');uncertain['properties'].update(periodExistenceUncertain=True,chronologyConfidence='unconfirmed-founding-era',uncertaintyDecision=decision['uncertainReferenceOnly'][0])
oldland0=union(land);oldland1=union(land,1584);remaining=union(water);removedmask=unary_union([shape(f['geometry']) for f in removed]);background=removedmask.difference(remaining).difference(oldland0.union(oldland1));assert background.is_valid
for i,g in enumerate(seed.polygons(background)):
 land['features'].append({'type':'Feature','id':f'background:deferred-water:{i:03d}','properties':{'drawRole':'land','shapeRole':'unresolved-prior-surface-background','allowTerrainInference':False,'noHistoricalDryLandAssertion':True,'exactHistoricalShoreline':False,'validFrom':[1560,1,1],'validUntil':[1616,1,1],'deferredWaterIds':sorted(blocked),'basis':'Coarse unspecified presentation only; no predecessor pool shape supplied and no dry-land fact asserted.'},'geometry':mapping(g)})
def lines(g):
 if g.is_empty:return []
 if g.geom_type=='LineString':return [g]
 return [l for p in g.geoms for l in lines(p)] if hasattr(g,'geoms') else []
kept=[];deleted=[];changed=[];split=[]
for f in shore['features']:
 g=shape(f['geometry']);new=g.difference(background)
 if new.is_empty:deleted.append(f['id']);continue
 if new.equals(g):kept.append(f);continue
 changed.append(f['id']);parts=lines(new)
 for i,line in enumerate(parts):
  v=copy.deepcopy(f);v['id']=f['id'] if i==0 else f['id']+f':remaining:{i}';v['geometry']=mapping(line);v['bbox']=list(line.bounds);kept.append(v)
  if i:split.append(v['id'])
shore['features']=kept;newland0=union(land);newland1=union(land,1584);newshore0=union(shore);newshore1=union(shore,1584)
# Floating overlay can leave original pond-edge slivers on the footprint boundary.
# Restrict only locally affected old lines to the actual new land boundary.
filtered=[];selector=removedmask.buffer(1e-8)
for f in shore['features']:
 g=shape(f['geometry'])
 if not g.intersects(selector):filtered.append(f);continue
 boundary=newland1.boundary if f['properties'].get('validFrom',[1560])[0]>=1584 else newland0.boundary
 clipped=g.intersection(boundary)
 if clipped.is_empty:deleted.append(f['id']);continue
 if clipped.equals(g):filtered.append(f);continue
 if f['id'] not in changed:changed.append(f['id'])
 for i,line in enumerate(lines(clipped)):
  v=copy.deepcopy(f);v['id']=f['id'] if i==0 else f['id']+f':boundary:{i}';v['geometry']=mapping(line);v['bbox']=list(line.bounds);filtered.append(v)
  if i:split.append(v['id'])
shore['features']=filtered;newshore0=union(shore);newshore1=union(shore,1584)
# Compare with the actual five existing suppression buffers, as canonical tests do.
from pyproj import Transformer
forward=Transformer.from_crs('OGC:CRS84','EPSG:6677',always_xy=True);back=Transformer.from_crs('EPSG:6677','OGC:CRS84',always_xy=True);masks=json.load(open(R/'kuniezu/map/physical/shoreline_masks.geojson'));suppress=shapely.union_all([shapely.transform(shapely.transform(shape(f['geometry']),forward.transform,interleaved=False).buffer(f['properties']['bufferMetres']),back.transform,interleaved=False) for f in masks['features']]);shoreChecks={}
for year,nland in [(1560,newland0),(1584,newland1)]:
 actual=MultiLineString([f['geometry']['coordinates'] for f in shore['features'] if f['properties']['validFrom'][0]<=year<f['properties']['validUntil'][0]]);expected=nland.boundary.difference(suppress);delta=expected.symmetric_difference(actual);shoreChecks[str(year)]={'equals':expected.equals(actual),'differenceLengthDegrees':delta.length,'missingLengthDegrees':expected.difference(actual).length,'extraLengthDegrees':actual.difference(expected).length};assert expected.equals(actual)
assert newland0.intersection(remaining).area<1e-15 and newland1.intersection(remaining).area<1e-15
# No existing land or retained water coordinates are changed.
assert land['features'][:len(parents['land']['features'])]==parents['land']['features'];assert all(f['geometry']==next(x for x in parents['water']['features'] if x['id']==f['id'])['geometry'] for f in water['features']);assert background.intersection(newland1.difference(newland0)).area==0
retention={name:True for name in ['natural17','canonical5','katoriProtected70','hachirogata','ogura','ukita366']};natural=next(iter(parents['water']['provenance'].get('naturalLakeSupplement',{})),None)
for ident in ['lake:towada','lake:tazawa','lake:inawashiro','lake:kiba','lake:yogo']:assert next(f for f in water['features'] if f['id']==ident)==next(f for f in parents['water']['features'] if f['id']==ident)
assert newland1.difference(newland0).equals(oldland1.difference(oldland0))
for d in [land,water,shore]:
 assert all(shape(f['geometry']).is_valid for f in d['features']);ids=[f['id'] for f in d['features']];assert len(ids)==len(set(ids));d.setdefault('provenance',{})['deferredWaterDecision']={'inputs':{str(p):sha(p) for p in [*(I/(n+'.geojson') for n in parents),D/'deferred-waters.geojson',D/'decision.json']},'decisions':decision,'backgroundPolicy':'Unspecified coarse display background, not historical dry land, no terrain inference or RAG fact.'}
report={'removedWaterIds':sorted(blocked),'removedCount':len(removed),'retainedUncertain57':True,'deletedShoreIds':deleted,'changedShoreIds':changed,'splitShoreIds':split,'backgroundFeatures':len(land['features'])-len(parents['land']['features']),'backgroundAreaDegreesSquared':background.area,'shoreChecks':shoreChecks,'waterLandOverlapDegreesSquared':{'1560':newland0.intersection(remaining).area,'1584':newland1.intersection(remaining).area},'retention':retention,'retentionMethod':'Existing land features byte-equivalent objects; retained water geometries identical; new background restricted to seven removed footprints minus remaining water and existing land. Thus original local masks and natural lakes unchanged.','allValid':True,'currentGameUnchanged':True,'inputHashes':{str(p):sha(p) for p in [*(I/(n+'.geojson') for n in parents),D/'deferred-waters.geojson',D/'decision.json']}}
O.mkdir()
for n,d in [('land',land),('water',water),('coastline',shore)]:(O/(n+'.geojson')).write_text(seed.pretty(d)+'\n')
quarantine=copy.deepcopy(parents['water']);quarantine['features']=removed;quarantine['activation']='never-active-quarantine-only';(O/'deferred-waters.geojson').write_text(seed.pretty(quarantine)+'\n');(O/'deferred-waters-original.geojson').write_bytes((D/'deferred-waters.geojson').read_bytes());(O/'decision.json').write_bytes((D/'decision.json').read_bytes());(O/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');(O/'README.md').write_text('# 年代未適合水域7件の保留候補\n\n現行ゲーム未変更。7水域の元地物はdeferred-watersへ完全保持し、元保留パケットも別に無改変保持。57上堰潟は形状を残し年代不確実フラグのみ。\n\n除いた穴は残存waterと既存landを避けた粗い未特定背景で補う。乾燥陸の史実確定でも前身池の復元でもない。allowTerrainInference=false/noHistoricalDryLandAssertion=true。RAG史実命題へ転用しない。元の全国地形から再生成しない。\n');print(json.dumps({k:v for k,v in report.items() if k not in ['inputHashes','deletedShoreIds','changedShoreIds','splitShoreIds']},ensure_ascii=False,indent=2))

```

## water-evidence prepare.cjs

SHA-256: `825548b8f7fc0a77bb2d4c202dc393f94907f34430d4219cbfcb42302ff68aca`

```javascript
'use strict';
// One-time migration candidate only. Never invoked by normal build or runtime.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||'.'),out=path.resolve(process.argv[3]||'/tmp/kuniezu-water-evidence-source');
assert.ok(out.startsWith('/tmp/')||out.startsWith('/private/tmp/'),'candidate output must stay under /tmp');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const inputs=new Map();
function input(p){const bytes=fs.readFileSync(path.join(root,p));inputs.set(p,{path:p,sha256:sha(bytes),bytes:bytes.length});return bytes.toString('utf8');}
function ref(p,role){if(!inputs.has(p))input(p);return {...inputs.get(p),role};}
const sourceModule='kuniezu/static/kuniezu/water-evidence.js';
const sourceText=input(sourceModule),array=sourceText.match(/const historic=(\[[\s\S]*?\n \]);/);
assert.ok(array,'historic list not found');
const historic=JSON.parse(JSON.stringify(vm.runInNewContext(array[1],{}, {timeout:1000})));
const tsubakiModule='kuniezu/static/kuniezu/tsubaki-lake.js',tctx={TK:{}};
vm.runInNewContext(input(tsubakiModule),tctx,{timeout:1000});
const tsubaki=JSON.parse(JSON.stringify(tctx.TK.TSUBAKI_LAKE));
const registrationFile='data/verification/tsubaki/registration.json',registration=JSON.parse(input(registrationFile));
const generatorFile='tools/geo/tsubaki-registration.py',traceFile='data/research/tsubaki-trace-input.json';
input(generatorFile);input(traceFile);
const fullPrecisionFile='data/verification/tsubaki/lake.geojson';input(fullPrecisionFile);
const historyReport='docs/reports/HISTORICAL_RECHECK.md',deploymentReport='docs/reports/DEPLOYMENT_REVIEW.md',shiunjiReport='docs/reports/HISTORICAL_TERRITORY_UNITS.md';
for(const p of [historyReport,deploymentReport,shiunjiReport,'kuniezu/static/kuniezu/historical-register.js','kuniezu/static/kuniezu/licenses/DATA_SOURCES.md'])input(p);
const sourceTableFile='data/research/sources.jsonl';
const sources=new Map(input(sourceTableFile).trim().split('\n').map(JSON.parse).map(s=>[s.id,s]));
for(const p of ['data/research/curated/sources/iinumaLandHistory.json','data/research/curated/sources/minumaSaitamaWater.json','data/research/curated/sources/niigata-shiotsugata-reclamation.json'])input(p);
const pdfPath='data/research/reference-documents/choushi-kashima-landcondition.pdf';
const pdfBytes=fs.readFileSync(path.join(root,pdfPath)),pdfSha=sha(pdfBytes);
const archiveManifest=JSON.parse(input('data/research/reference-documents/manifest.json'));
assert.equal(pdfSha,archiveManifest.find(r=>r.file===path.basename(pdfPath)).sha256);
inputs.set(pdfPath,{path:pdfPath,sha256:pdfSha,bytes:pdfBytes.length});
const sourceTimes={
 'water-iinuma':{published:{date:[2015,9,27],calendar:'CE',meaning:'ページ末尾の表示日。展示資料個々の制作日ではない。'},depicts:{label:'享保期の干拓前の沼と1724年の開発許可、近現代の改良史',exactHistoricalShoreline:false}},
 'iinumaLandHistory':{published:{year:null,label:'既存出典台帳には刊年の記録なし'},depicts:{label:'元禄・天保の下総国絵図の比較と享保10年の工事着手',exactHistoricalShoreline:false}},
 'water-minuma':{published:{year:null,label:'既存出典台帳には刊年の記録なし'},depicts:{label:'江戸初期以前の沼沢地と1629年の溜井化以降',exactHistoricalShoreline:false}},
 'minumaSaitamaWater':{published:{year:null,label:'既存出典台帳には刊年の記録なし'},depicts:{label:'1629年の八丁堤、1727年の着手、1728年の代用水完成',exactHistoricalShoreline:false}},
 'water-tsubaki':{published:{date:[2024,4,26],calendar:'CE',meaning:'ウェブページ更新日'},depicts:{label:'1670年（寛文10年）の干拓とその後の農地・用排水史',exactHistoricalShoreline:false}},
 'tsubakiGsi':{published:{year:1979,calendar:'CE'},depicts:{label:'17世紀の干拓時を扱う図16。図17は干拓後の比較',exactYear:null,exactHistoricalShoreline:false},reproductionChain:[{year:1958,title:'大利根用水事業史',role:'1979年報告が転載元として参照。原図の制作年と同一視しない。'},{year:1979,title:registration.title,role:'今回の読図に使われた公刊報告'}],unresolvedOriginalAnnotation:{labels:['寛文12','1670'],resolvedYear:null,decision:'登録報告に残る年号・西暦の不整合を保持。いずれかへ修正せず、特定日の水際として扱わない。'}},
 'water-shiunji':{published:{year:null,label:'刊年は既存出典台帳に記録なし。今回の移行では原本の再読を行わない。'},depicts:{label:'印刷8〜9頁。第8図は1645年越後国絵図の復元図、第10図は干拓直後の古地理。別時期の図を分離。',comparisonYears:[1645],exactHistoricalShoreline:false}},
 'niigata-shiotsugata-reclamation':{published:{date:[2019,3,29],calendar:'CE',meaning:'既存出典台帳のウェブページ更新日'},depicts:{label:'1721年の長者堀掘削、1728年の再掘削、1732年の瀬替えと増水',exactHistoricalShoreline:false}}
};
const specs={
 iinuma:{ids:['water-iinuma','iinumaLandHistory'],description:'下総国に広がっていた沼。',uncertainty:'表示点は従来ラベルの概略位置。旧7頂点の面は史料から復元した輪郭でないため移さない。元禄・天保や享保期の資料から戦国期の面積・水際を確定しない。'},
 minuma:{ids:['water-minuma','minumaSaitamaWater'],description:'武蔵国の沼沢地。',uncertainty:'表示点は従来ラベルの概略位置。旧8頂点の面は移さない。1629年の八丁堤で成立した溜井の完成形を1560〜1615年に遡らせない。'},
 tsubaki:{ids:['tsubakiGsi','water-tsubaki'],description:'下総国東部にあった湖。江戸時代に干拓された。',uncertainty:registration.uncertainty},
 shiunji:{ids:['water-shiunji','niigata-shiotsugata-reclamation'],description:'越後国にあった潟。紫雲寺潟とも呼ばれた。',uncertainty:'表示点は従来ラベルの概略位置。1645年図・1721年図・干拓直後の古地理は異なる時点を示す。南岸の集落対応の可能性を確定湖岸とせず、旧面を復活させない。'}
};
function source(id){const s=sources.get(id);assert.ok(s,'missing source '+id);const result={id,author:s.author,title:s.title,url:s.url,locator:s.locator,recordedScope:s.scope,previouslyAccessed:s.accessed,...sourceTimes[id]};
 if(id==='water-shiunji')result.locator='印刷8〜9頁・第8図（1645年図の復元）・第10図（干拓直後）。既存HISTORICAL_TERRITORY_UNITS.mdの読図記録を継承。';
 if(id==='tsubakiGsi'){result.locator=registration.locator;result.rawOriginal={...inputs.get(pdfPath),includedInCandidate:false};}
 return result;}
const features=historic.map(h=>{const s=specs[h.id],isPolygon=h.id==='tsubaki';assert.ok(s);
 const props={id:h.id,name:h.name,label:h.name,description:s.description,kind:h.kind,drawRole:isPolygon?'inferred-water':'water-label',shapeRole:isPolygon?'source-traced-approximate':'label-only',positionRole:isPolygon?'source-traced-approximate':'approximate-label',labelAt:h.at,labelPositionRole:'approximate-label',changesLandMask:false,affectsMovement:false,exactHistoricalShoreline:false,validFrom:[1560,1,1],validUntil:[1616,1,1],periodSemantics:'display-applicability-only',provenance:{originalLabel:h.label,originalSourceScope:h.scope,sourceModule:ref(sourceModule,'元の地名と概略ラベル位置'),geometrySource:isPolygon?ref(tsubakiModule,'現表示の小数6桁102座標。追加丸め・平滑化・再投影なし'):ref(sourceModule,'元のatだけを採用。旧polyは採用しない。'),generator:isPolygon?ref(generatorFile,'既存形状の生成元。移行時・通常ビルド・実行時には再実行しない。'):null,registrationReport:isPolygon?ref(registrationFile,'既存の位置合わせ報告'):null,sources:s.ids.map(source),uncertainty:s.uncertainty,registrationApplicability:isPolygon?'当てはめ誤差は形状の絶対精度ではない。':'点は史料上の測点や湖心ではなく、地名の表示位置である。',reviewReports:[ref(deploymentReport,'旧水域の区分・出典の移行記録')]}};
 if(isPolygon){props.provenance.traceInput=ref(traceFile,'既存の読図点と5対応点');props.provenance.earlierFullPrecisionShape=ref(fullPrecisionFile,'移行不採用。現表示と異なる精度の座標へ差し替えない。');props.provenance.registration={method:registration.method,rmsMetres:registration.rmsMetres,fitControlCount:registration.controls.length,independentValidationPointCount:0,controlsAreVillageRepresentatives:true,sourceDate:registration.sourceDate};props.provenance.reviewReports.push(ref(historyReport,'102座標採用と限界'));}
 if(h.id==='shiunji')props.provenance.reviewReports.push(ref(shiunjiReport,'旧面の史跡包含と年代別比較の限界'));
 return {type:'Feature',id:'historic-water:'+h.id,properties:props,geometry:isPolygon?{type:'Polygon',coordinates:tsubaki.rings}:{type:'Point',coordinates:h.at}};
});
const collection={type:'FeatureCollection',coordinateReferenceSystem:'EPSG:4326',status:'migration-candidate',periodSemantics:'validFrom/validUntilはゲーム内の表示適用範囲であり、湖沼の成立・消滅日や原図の制作・描写年代を確定しない。',sourcePolicy:{editedSource:true,normalBuild:'byte-copy-only',runtimeCoordinateCorrection:false,changesLandMask:false,affectsMovement:false,polygonSource:'existing-rendered-tsubaki-rings-only',pointSemantics:'name-label-only'},features};
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'water-evidence.geojson'),JSON.stringify(collection,null,2)+'\n');
const manifest={created:'2026-11-07',scope:'4旧水域の表示情報を移行する候補。史実の追加確定や陸海・行軍判定の変更なし。',inputs:[...inputs.values()],output:{file:'water-evidence.geojson',sha256:sha(fs.readFileSync(path.join(out,'water-evidence.geojson')))},sourceRechecks:[{id:'water-iinuma',date:'2026-11-07',status:'page-read',locator:'享保期の新田開発とページ末尾2015年9月27日'},{id:'water-tsubaki',date:'2026-11-07',status:'page-read',locator:'2024年4月26日更新、本文冒頭1670年（寛文10年）'},{id:'water-minuma',date:'2026-11-07',status:'live-fetch-unavailable',decision:'既存台帳の出典・留保を継承。今回の本文再読成功とはしない。'},{id:'water-shiunji',date:'2026-11-07',status:'existing-review-retained',decision:'原PDF再取得・再読なし。既存読図報告SHAと印刷頁を参照する。'}]};
fs.writeFileSync(path.join(out,'input-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
// All migration inputs must remain byte-identical throughout this operation.
for(const r of inputs.values())assert.equal(sha(fs.readFileSync(path.join(root,r.path))),r.sha256,r.path+' changed during extraction');
console.log('Prepared four features: three label Points, one unchanged 102-coordinate Tsubaki Polygon');

```

## water-evidence verify.cjs

SHA-256: `31200a3a8578a937d2b803f04918538d912d73003f5c15adcd6e7e55be1cff8c`

```javascript
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(process.argv[2]||'.'),out=path.resolve(process.argv[3]||'/tmp/kuniezu-water-evidence-source');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),file=path.join(out,'water-evidence.geojson');
const json=JSON.parse(fs.readFileSync(file)),manifest=JSON.parse(fs.readFileSync(path.join(out,'input-manifest.json')));
const ctx={TK:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'kuniezu/static/kuniezu/tsubaki-lake.js'),'utf8'),ctx,{timeout:1000});
const expected=JSON.parse(JSON.stringify(ctx.TK.TSUBAKI_LAKE.rings));
const points={iinuma:[139.947,36.13],minuma:[139.7,35.9],shiunji:[139.35,38.02]};
function check(doc){
 assert.equal(doc.type,'FeatureCollection');assert.equal(doc.coordinateReferenceSystem,'EPSG:4326');assert.equal(doc.features.length,4);
 const seen=new Set();
 for(const f of doc.features){const p=f.properties;assert.ok(!seen.has(p.id));seen.add(p.id);assert.equal(p.label,p.name);assert.equal(p.changesLandMask,false);assert.equal(p.affectsMovement,false);assert.equal(p.exactHistoricalShoreline,false);
  assert.deepEqual(p.validFrom,[1560,1,1]);assert.deepEqual(p.validUntil,[1616,1,1]);assert.equal(p.periodSemantics,'display-applicability-only');
  assert.ok(!/未照合|検証中|未確定|旧poly|RMS|独立検証|当てはめ|精度|生成|輪郭/.test([p.name,p.label,p.description].join(' ')),'developer text leaked into display');
  assert.ok(p.provenance.originalLabel&&p.provenance.sourceModule.sha256);assert.ok(p.provenance.sources.length>=2);
  for(const s of p.provenance.sources){assert.match(s.url,/^https:\/\//);assert.ok(s.locator&&s.published&&s.depicts);assert.equal(s.depicts.exactHistoricalShoreline,false);}
  if(p.id==='tsubaki'){
   assert.equal(f.geometry.type,'Polygon');assert.equal(p.drawRole,'inferred-water');assert.equal(p.shapeRole,'source-traced-approximate');assert.deepEqual(f.geometry.coordinates,expected,'existing displayed geometry changed');
   assert.equal(expected.length,1);assert.equal(expected[0].length,102);assert.deepEqual(expected[0][0],expected[0].at(-1));
   for(const pair of expected[0])for(const n of pair)assert.ok(Number.isFinite(n)&&Math.abs(n*1e6-Math.round(n*1e6))<1e-6);
   assert.equal(p.provenance.registration.rmsMetres,643);assert.equal(p.provenance.registration.fitControlCount,5);assert.equal(p.provenance.registration.independentValidationPointCount,0);
   const gsi=p.provenance.sources.find(s=>s.id==='tsubakiGsi');assert.equal(gsi.published.year,1979);assert.equal(gsi.depicts.exactYear,null);assert.deepEqual(gsi.unresolvedOriginalAnnotation.labels,['寛文12','1670']);assert.equal(gsi.unresolvedOriginalAnnotation.resolvedYear,null);
  }else{assert.ok(points[p.id]);assert.equal(f.geometry.type,'Point');assert.deepEqual(f.geometry.coordinates,points[p.id]);assert.equal(p.drawRole,'water-label');assert.equal(p.positionRole,'approximate-label');assert.equal(p.provenance.registrationReport,null);assert.equal(p.provenance.generator,null);}
 }
 assert.deepEqual([...seen].sort(),['iinuma','minuma','shiunji','tsubaki']);
 assert.equal(doc.features.filter(f=>f.geometry.type==='Polygon').length,1);
 assert.ok(!JSON.stringify(doc).includes('/Users/'),'absolute local path in public candidate');
}
check(json);
let negatives=0;
for(const mutate of [d=>d.features[0].geometry={type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]},d=>d.features.find(f=>f.properties.id==='tsubaki').geometry.coordinates[0][1][0]+=0.000001,d=>d.features[0].properties.changesLandMask=true,d=>d.features[0].properties.description='湖岸は検証中',d=>d.features.find(f=>f.properties.id==='tsubaki').properties.provenance.sources[0].unresolvedOriginalAnnotation.resolvedYear=1672]){const copy=structuredClone(json);mutate(copy);assert.throws(()=>check(copy));negatives++;}
for(const input of manifest.inputs)assert.equal(sha(fs.readFileSync(path.join(root,input.path))),input.sha256,input.path+' input changed');
assert.equal(sha(fs.readFileSync(file)),manifest.output.sha256);
const r=expected[0],signedArea=r.slice(0,-1).reduce((v,p,i)=>v+p[0]*r[i+1][1]-r[i+1][0]*p[1],0)/2;
const result={status:'pass',features:4,pointFeatures:3,polygonFeatures:1,tsubaki:{coordinates:102,uniqueCoordinates:new Set(r.map(x=>x.join(','))).size,unchangedFromRuntimeJS:true,ringsClosed:true,decimalPlacesMax:6,orientation:signedArea>0?'counterclockwise':'clockwise',orientationPreserved:true,registrationRmsMetres:643,fitControlCount:5,independentValidationPointCount:0},labelPositionsUnchanged:true,legacyInferredPolygonsMigrated:0,landMaskChanges:0,movementRuleChanges:0,displayTextPolicy:'name and historical description only',negativeCasesRejected:negatives,inputsUnchanged:manifest.inputs.length,outputSha256:sha(fs.readFileSync(file)),scope:'構造・座標同一性・適用境界の検査。戦国期の汀線確定や実画面の検査ではない。'};
fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));

```
