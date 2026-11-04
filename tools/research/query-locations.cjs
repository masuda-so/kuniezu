/* 例: node tools/research/query-locations.cjs --place 伏見 --from-year 1598 --to-year 1600 */
const fs = require('node:fs');
const path = require('node:path');
const {parseArgs} = require('node:util');
const {queryLocations} = require('./location-store.cjs');

try {
 const {values, positionals} = parseArgs({
  allowPositionals: true,
  options: {
   place: {type: 'string'},
   'from-year': {type: 'string'},
   'to-year': {type: 'string'},
   lunar: {type: 'string'},
   leap: {type: 'boolean'},
  },
 });
 if(positionals.length>2)throw Error('位置引数は人物名と年の2つまで');
 const [person='', rawYear] = positionals;
 const parseYear = value => {
  if(value===undefined)return undefined;
  if(!/^\d{4}$/.test(value))throw Error('年は西暦表記で4桁を指定してください');
  return Number(value);
 };
 const year = parseYear(rawYear);
 const fromYear = parseYear(values['from-year']);
 const toYear = parseYear(values['to-year']);
 const lunarDate = values.lunar?.split('-').map(Number);
 const place = values.place??'';
 const read = name => fs.readFileSync(path.join(__dirname,'../../data/research',name+'.jsonl'),'utf8')
  .split('\n').filter(Boolean).map(JSON.parse);
 const result = queryLocations({
  people: read('people'), places: read('places'), locations: read('location-observations'),
 }, {person, place, year, fromYear, toYear, lunarDate, leapMonth: values.leap});
 console.log(JSON.stringify({
  person, place, year: year??null, fromYear: fromYear??null, toYear: toYear??null,
  lunarDate: lunarDate??null, ...result,
 },null,2));
} catch(error) {
 console.error(error.message);
 process.exitCode = 1;
}
