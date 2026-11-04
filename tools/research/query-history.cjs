/* Examples: --year 1592 ; --entity 松平家忠 ; --year 1592 --entity 松平家忠 */
const fs=require('node:fs'),path=require('node:path'),{createHistoryIndex,queryHistory,indexSummary}=require('./history-index.cjs');
try{
 const {values}=require('node:util').parseArgs({options:{
  year:{type:'string'},entity:{type:'string'},
  'from-year':{type:'string'},'to-year':{type:'string'},
 }});
 const opts={entity:values.entity};
 for(const [flag,key] of [['year','year'],['from-year','fromYear'],['to-year','toYear']]){
  if(values[flag]===undefined)continue;
  if(!/^-?[0-9]+$/.test(values[flag]))throw Error('年は整数で指定する');
  opts[key]=Number(values[flag]);
 }
 const root=path.resolve(__dirname,'../../data/research'),read=name=>fs.readFileSync(path.join(root,name+'.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
 const index=createHistoryIndex({claims:read('claims'),locations:read('location-observations'),people:read('people'),places:read('places')});
 const matches=queryHistory(index,opts).map(r=>({...r,entityNames:r.entities.map(id=>index.labels.get(id)||id),interpretation:r.scope==='claim-applicability'?'命題の適用年代。指定年に発生した事件とは限らない。':r.scope==='attested-interval'?'記録に基づく関係の期間。毎日の現地滞在は保証しない。':'その年の記録。原記録の暦・精度を参照。'}));
 console.log(JSON.stringify({query:opts,index:indexSummary(index),matches,scope:'確認済み命題と所在観測の参照。年精度を特定日に変換せず、未記録の年は補完しない。'},null,2));
}catch(e){console.error(e.message);process.exitCode=1;}
