/* 例: node tools/research/query-locations.cjs 武田勝頼 1573 */
const fs=require('node:fs'),{queryLocations}=require('./location-store.cjs');
try{const read=f=>fs.readFileSync('data/research/'+f+'.jsonl','utf8').trim().split('\n').filter(Boolean).map(JSON.parse),args=process.argv.slice(2),person=args[0]||'',l=args.indexOf('--lunar'),lunarDate=l>=0?args[l+1]?.split('-').map(Number):undefined,year=args[1]&&!args[1].startsWith('--')?Number(args[1]):undefined;
 if(l>=0&&!lunarDate)throw Error('--lunar YYYY-M-D が必要');const result=queryLocations({people:read('people'),places:read('places'),locations:read('location-observations')},{person,year,lunarDate,leapMonth:args.includes('--leap')});console.log(JSON.stringify({person,year:year??null,lunarDate:lunarDate??null,...result},null,2));
}catch(e){console.error(e.message);process.exitCode=1;}
