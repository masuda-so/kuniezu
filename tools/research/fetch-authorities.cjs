/* 登録人物のWikidata IDを一括取得。出力は同定候補で、curated入力の採否は別工程。 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {parseArgs} = require('node:util');

async function main() {
 const {values} = parseArgs({options: {output: {type: 'string'}}});
 if(!values.output)throw Error('使い方: node tools/research/fetch-authorities.cjs --output 出力先.json');
 const output = path.resolve(values.output);
 if(fs.existsSync(output))throw Error('出力先が存在します。別のファイル名を指定してください。');
 const peopleDir = path.resolve(__dirname, '../../data/research/curated/people');
 const people = fs.readdirSync(peopleDir).filter(name=>name.endsWith('.json'))
  .map(name=>JSON.parse(fs.readFileSync(path.join(peopleDir,name),'utf8')));
 const ids = [...new Set(people.flatMap(person=>person.authorityIds||[])
  .filter(id=>/^wikidata:Q[1-9][0-9]*$/.test(id)).map(id=>id.slice('wikidata:'.length)))].sort();
 const records = [];
 const requests = [];
 for(let offset=0;offset<ids.length;offset+=50) {
  const batch = ids.slice(offset,offset+50);
  const url = new URL('https://www.wikidata.org/w/api.php');
  url.search = new URLSearchParams({
   action:'wbgetentities',ids:batch.join('|'),
   props:'info|labels|descriptions|aliases|claims',languages:'ja',
   format:'json',maxlag:'5',
  });
  const response = await fetch(url, {
   headers:{'User-Agent':'KuniezuResearch/1.0 (https://github.com/masuda-so/kuniezu)'},
   signal:AbortSignal.timeout(30000),
  });
  if(!response.ok)throw Error('Wikidata HTTP '+response.status);
  const data = await response.json();
  if(data.error)throw Error('Wikidata API '+data.error.code);
  if(!data.entities)throw Error('Wikidata応答にentitiesがありません');
  const retrievedAt = new Date().toISOString();
  requests.push({url:String(url),retrievedAt});
  for(const id of batch) {
   const item = data.entities[id];
   if(!item)throw Error('Wikidata応答に対象IDがありません: '+id);
   records.push({
    id,revision:item.lastrevid??null,missing:'missing' in item,
    label:item.labels?.ja?.value??null,
    description:item.descriptions?.ja?.value??null,
    aliases:(item.aliases?.ja||[]).map(alias=>alias.value),
    identityClaims:Object.fromEntries(['P31','P349'].map(property=>[property,item.claims?.[property]||[]])),
   });
  }
 }
 const result = {
  status:'identity-candidates-not-adopted',
  people:people.length,requestedIds:ids.length,requests,records,
 };
 fs.mkdirSync(path.dirname(output),{recursive:true});
 const temporary = output+'.'+process.pid+'.tmp';
 let temporaryCreated = false;
 try {
  fs.writeFileSync(temporary,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  temporaryCreated = true;
  fs.linkSync(temporary,output);
 } finally {
  if(temporaryCreated)fs.unlinkSync(temporary);
 }
 console.log('saved '+records.length+' identity candidates in '+requests.length+' requests: '+output);
}

main().catch(error=>{console.error(error.message);process.exitCode=1;});
