/* 年表に登場する人物のうち人物典拠の無い人を、Wikidataの名前検索で候補にする。
   出力は同定候補で、curated の people へは採用しない（採否は公的出典での同定の別工程）。 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {parseArgs} = require('node:util');

const UA = {'User-Agent': 'KuniezuResearch/1.0 (https://github.com/masuda-so/kuniezu)'};
const API = 'https://www.wikidata.org/w/api.php';
const year = claims => (claims || []).map(c => c.mainsnak?.datavalue?.value?.time)
 .filter(Boolean).map(t => Number(t.slice(1, 5)));

async function get(params) {
 const url = new URL(API);
 url.search = new URLSearchParams({...params, format: 'json', maxlag: '5'});
 const response = await fetch(url, {headers: UA, signal: AbortSignal.timeout(30000)});
 if (!response.ok) throw Error(`${response.status} ${url}`);
 return {url: url.toString(), body: await response.json()};
}

async function main() {
 const {values} = parseArgs({options: {output: {type: 'string'}}});
 if (!values.output) throw Error('使い方: node tools/research/appear-authority-candidates.cjs --output 出力先.json');
 const output = path.resolve(values.output);
 if (fs.existsSync(output)) throw Error('出力先が存在します。別のファイル名を指定してください。');
 const root = path.resolve(__dirname, '../..');
 const {G, TK} = require('../checks/history-focus.cjs').model();
 G.newGame('s1560', 'oda');
 const peopleDir = path.join(root, 'data/research/curated/people');
 const known = new Set();
 for (const name of fs.readdirSync(peopleDir).filter(n => n.endsWith('.json'))) {
  const person = JSON.parse(fs.readFileSync(path.join(peopleDir, name), 'utf8'));
  for (const n of [person.name, ...(person.gameNames || []), ...(person.aliases || [])]) if (n) known.add(n);
 }
 const people = [];
 for (const event of TK.HIST.filter(e => e.k === 'appear')) {
  const [name, , , , , born] = event.g.split('|');
  if (known.has(name) || people.some(p => p.name === name)) continue;
  people.push({name, gameBirthYear: Number(born), appear: event.d, clan: event.clan});
 }
 const requests = [];
 for (const person of people) {
  const search = await get({action: 'wbsearchentities', search: person.name, language: 'ja', uselang: 'ja', type: 'item', limit: '7'});
  requests.push({url: search.url, retrievedAt: new Date().toISOString()});
  const ids = (search.body.search || []).map(x => x.id);
  person.candidates = [];
  if (!ids.length) continue;
  const entities = await get({action: 'wbgetentities', ids: ids.join('|'), props: 'info|labels|descriptions|claims', languages: 'ja'});
  requests.push({url: entities.url, retrievedAt: new Date().toISOString()});
  for (const id of ids) {
   const x = entities.body.entities[id];
   const human = (x.claims?.P31 || []).some(c => c.mainsnak?.datavalue?.value?.id === 'Q5');
   if (!human) continue;
   const born = year(x.claims?.P569), died = year(x.claims?.P570);
   person.candidates.push({id, revision: x.lastrevid, label: x.labels?.ja?.value || null,
    description: x.descriptions?.ja?.value || null, birthYears: born, deathYears: died,
    birthYearMatchesGame: born.includes(person.gameBirthYear)});
  }
  person.status = person.candidates.filter(c => c.birthYearMatchesGame).length === 1 ? 'one-candidate-with-matching-birth-year'
   : person.candidates.some(c => c.birthYearMatchesGame) ? 'several-candidates-with-matching-birth-year' : 'no-candidate-with-matching-birth-year';
 }
 const counts = {};
 for (const p of people) counts[p.status || 'no-candidate-with-matching-birth-year'] = (counts[p.status || 'no-candidate-with-matching-birth-year'] || 0) + 1;
 fs.writeFileSync(output, JSON.stringify({status: 'identity-candidates-not-adopted',
  scope: '年表の登場（appear）の人物のうち、curated/people に典拠の無い人。名前の検索とゲームの生年の一致だけで、同定ではない。',
  people: people.length, counts, requests, records: people}, null, 1) + '\n');
 console.log(JSON.stringify(counts));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
