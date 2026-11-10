/* 現行の棚卸しから対象別作業を生成。出典の存在だけで完了へ変更しない。 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),work=path.join(root,'docs/work'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
function syncRequests(catalog,requests){
 const byId=new Map(requests.map(r=>[r.id,r]));if(byId.size!==requests.length)throw Error('duplicate request ID');
 const seen=new Set();const next=catalog.map(row=>{if(row.kind!=='request')return row;
  const id=row.requestIds?.[0],r=byId.get(id);if(!r||seen.has(id))throw Error('missing or duplicate request: '+id);
  if(row.area!==r.area)throw Error('request area changed: '+id);seen.add(id);
  return {...row,subject:r.title,acceptance:r.acceptance,context:{...row.context,priority:r.priority}};
 });if(seen.size!==requests.length)throw Error('request inventory changed');return next;
}
function policyMetadata(bytes,updatedAt=new Date().toISOString()){return {requestPolicyUpdatedAt:updatedAt,requestPolicySha256:crypto.createHash('sha256').update(bytes).digest('hex')};}
if(require.main!==module)module.exports={syncRequests};
else if(process.argv.includes('--requests-only')){
 const file=path.join(work,'catalog.jsonl'),old=fs.readFileSync(file,'utf8'),requests=read('docs/work/requests.json').requests;
 const next=syncRequests(old.trim().split('\n').map(JSON.parse),requests).map(r=>JSON.stringify(r)).join('\n')+'\n';
 const manifest=read('docs/work/catalog-manifest.json'),policy=policyMetadata(fs.readFileSync(path.join(work,'requests.json')));
 if(process.argv.includes('--check')){if(next!==old||manifest.requestPolicySha256!==policy.requestPolicySha256)throw Error('request policy is not synchronized');}
 else{Object.assign(manifest,policy);fs.writeFileSync(file,next);fs.writeFileSync(path.join(work,'catalog-manifest.json'),JSON.stringify(manifest,null,2)+'\n');}
 console.log('PASS: request policies synchronized; subject IDs, non-request rows and task state preserved');
}else{
const coverage=read('data/audits/coverage-review.json'),atlas=read('data/audits/deployment-audit.json'),rows=[];
const period=read('docs/work/requests.json').period||[1560,1615];
function add(kind,key,subject,area,requestIds,checks,context={}){rows.push({id:kind+'-'+crypto.createHash('sha256').update(String(key)).digest('hex').slice(0,12),kind,subject,area,requestIds,acceptance:checks,context});}
for(const s of coverage.sites)add('site',s.id,s.name,'history',['H01','H02'],['位置の同定と出典',`${period[0]}～${period[1]}年内の存在・名称・領主と主支城の役割`,'実装との差異の修正','該当年代の表示確認'],{siteId:s.id,positionReference:s.reference,periodStatus:s.period});
for(const p of coverage.people)add('person',p.name,p.name,'history',['H03'],['同名異人・別名の同定','生没・仕官・所在の適用年代','表示・年表・合戦参加の対応','出典と実装先の記録'],{portrait:p.portrait??null});
for(const r of coverage.roads)add('road',r.name,r.name,'geography',['G03','M01'],['史料上の回廊・成立年代の確認','現代比較線と史実経路の区別','直線・海上混入・接続・重複の検査','経路上の行軍・向き・速度を実画面確認'],{points:r.points,reference:r.reference});
for(const e of coverage.links)add('link',e.a+'|'+e.b,e.a+' → '+e.b,'movement',['M01','M02'],['陸路・海路・渡河・峠の区別','直線代替と寄城の妥当性','同じ道路線で描画と移動','停止・日跨ぎ・帰還・保存復元で連続'],e);
// 台帳の構造差に依存せず、111図の正規一覧は atlas-audit から取る。
const battleData=read('data/audits/battle-atlas-audit.json');const battles=atlas.battles.map(b=>({...b,terrainFile:battleData[b.title]?.file}));
for(const b of battles){const title=b.title||b.battle||b.name;if(!title)continue;add('battle',title,title,'battles',['B01','B02'],['同時期の参加者と別戦線を区別','地形・城郭・河川・布陣の出典','経過・内応・移陣と再生の対応','読込・顔・駒・全幅・自然終了を実画面確認'],{sourceInventory:b.sources||b.sourceIds||null});}
const transfers=read('data/audits/territory-transfer-review.json');for(const e of transfers.events||[])add('transfer',JSON.stringify([e.date,e.kind,e.title,e.clan,e.castles]),e.date.join('/')+' '+e.title,'history',['H02','H04','H06'],['移転の各拠点と領主を資料の指定箇所で照合','明渡し・行政再配分・戦闘と日付精度を区別','既存イベントの重複・先取り・一括移転を修正','全期間の所有者と旧保存を検査'],e);
const waterText=fs.readFileSync(path.join(root,'kuniezu/static/kuniezu/lake-baselines.js'),'utf8'),lakes=JSON.parse(waterText.slice(waterText.indexOf('['),waterText.lastIndexOf(']')+1));
for(const name of new Set([...lakes.map(l=>l.name),'香取海','椿海','飯沼','見沼','日本の海岸','朝鮮半島の海岸','遼東の海陸']))add('water',name,name,'geography',['G01','G02'],['史料の年代と対象地物を確認','同縮尺比較・基準点・誤差・採否を保存','単純な輪郭・現代の干拓埋立先取り・重複を修正','対象年代・拡縮で実画面確認']);
for(const r of read('docs/work/requests.json').requests)add('request',r.id,r.title,r.area,[r.id],r.acceptance,{priority:r.priority});
const manifest={generatedAt:new Date().toISOString(),...policyMetadata(fs.readFileSync(path.join(work,'requests.json'))),scope:'登録スナップショットと要望の対象別作業。歴史上の全件の網羅を証明しない。',inputs:['data/audits/coverage-review.json','data/audits/battle-atlas-audit.json','docs/work/requests.json'],counts:{sites:coverage.sites.length,people:coverage.people.length,roads:coverage.roads.length,links:coverage.links.length,battles:rows.filter(r=>r.kind==='battle').length,transfers:rows.filter(r=>r.kind==='transfer').length,waters:rows.filter(r=>r.kind==='water').length,requests:rows.filter(r=>r.kind==='request').length,total:rows.length}};
if(manifest.counts.battles!==111)throw Error('合戦台帳の読取形式を点検: '+manifest.counts.battles);
fs.writeFileSync(path.join(work,'catalog.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');fs.writeFileSync(path.join(work,'catalog-manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(manifest.counts);

}
