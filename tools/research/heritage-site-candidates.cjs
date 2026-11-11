/* ゲームの城系の拠点について、国指定の史跡（文化庁「国指定文化財等データベース」）の候補をジャパンサーチの API から集める。
   出力は位置の根拠の候補で、存在年代・城域・所在の史実命題には採用しない（採否は史料での確認の別工程）。
   保存するのは ID・名称・種別・所在地・指定年月日・座標・URL だけで、解説文は保存しない。 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {parseArgs} = require('node:util');

const API = 'https://jpsearch.go.jp/api/item/search/jps-cross';
const UA = {'User-Agent': 'KuniezuResearch/1.0 (https://github.com/masuda-so/kuniezu)'};
const KIND = '史跡名勝天然記念物';
// 城・館などの遺構を表す語。題名にこれが無い史跡（寺・古墳・庭園など）は、語が解説文に出ただけの雑音として落とす。
const FORT = /城|館|砦|陣屋|陣跡|台場|御所|要害|チャシ|グスク/;
const SUFFIX = /(城|館|砦|御所|要害)$/;
// 題名の終わりが遺構を表すもの。同じ種別には名勝・天然記念物も入るので、「角館のシダレザクラ」「名古屋城のカヤ」「旧徳島城表御殿庭園」のような題名を落とす。
const SITE_END = /(跡|城|館|遺跡|台場|チャシ|グスク|群)$/;

// 朝鮮の範囲（パイロットと同じ境界）を除いた、日本の城系の拠点。
const inJapan = point => !(point[0] < 130 && point[1] > 34.6);
const isCastle = row => row.kind === '城' || row.kind === 'castle-node';

// 「岩村城」→「岩村」。語幹が 1 文字になる名前（「堺」など）は、そのままの名前で照合する。
function stem(name) {
 const cut = name.replace(SUFFIX, '');
 return cut.length >= 2 ? cut : name;
}
// 「芥川山城」は史跡の題名が「芥川城跡」なので、「山城」を除いた語幹でも探す。「備中松山城」のように山が地名の一部のこともあるので、両方を使う。
function stems(name) {
 const first = stem(name), out = [first];
 if (/山城$/.test(name)) { const second = name.replace(/山城$/, ''); if (second.length >= 2 && second !== first) out.push(second); }
 return out;
}
// 題名の改行・空白・「附」以下・括弧書きを外す。
const cleanTitle = title => String(title || '').split(/\n|附/)[0].replace(/[\s　]/g, '').replace(/[（(].*?[）)]/g, '');

function km(a, b) {
 const rad = Math.PI / 180, dLat = (b[1] - a[1]) * rad, dLon = (b[0] - a[0]) * rad;
 const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
 return 6371.0088 * 2 * Math.asin(Math.sqrt(h));
}

// API の 1 件から、保存してよい項目だけを取り出す。解説文（description・bunka-6-s）は取り出さない。
function pick(item) {
 const c = item.common || {}, point = c.coordinates && Number.isFinite(c.coordinates.lon) && Number.isFinite(c.coordinates.lat) ? [c.coordinates.lon, c.coordinates.lat] : null;
 const designated = /指定年月日:(\d{8})/.exec(item['bunka-15-s'] || '');
 return {id: item.id, title: cleanTitle(c.title), kind: item['bunka-11-s'] || null, prefecture: item['bunka-10-s'] || null,
  address: item['bunka-13-s'] || null, designated: designated ? designated[1] : null, point, linkUrl: c.linkUrl || null};
}

// 種別が史跡名勝天然記念物で、題名に拠点の語幹と城・館などの語があり、座標があるものを候補にする。
function candidates(site, items, nearKm, farKm) {
 const keys = stems(site.name), out = [], dropped = {otherKind: 0, noCoordinates: 0, titleMismatch: 0, tooFar: 0};
 const seen = new Set();
 for (const item of items) {
  const row = pick(item);
  if (seen.has(row.id)) continue;
  seen.add(row.id);
  if (row.kind !== KIND) { dropped.otherKind++; continue; }
  if (!keys.some(key => row.title.includes(key)) || !FORT.test(row.title) || !SITE_END.test(row.title)) { dropped.titleMismatch++; continue; }
  if (!row.point) { dropped.noCoordinates++; continue; }
  const distance = km(site.point, row.point);
  if (distance > farKm) { dropped.tooFar++; continue; }
  out.push({...row, km: Math.round(distance * 100) / 100, match: distance <= nearKm ? 'title-and-near' : 'title-only'});
 }
 out.sort((a, b) => a.km - b.km || a.id.localeCompare(b.id));
 return {candidates: out, dropped};
}

// q-bunka-1-s は題名の欄だけを探す。keyword で探すと解説文に語が出ただけの文化財が大量に混じる。
async function search(title, size, from = 0) {
 const url = new URL(API);
 url.search = new URLSearchParams({'q-bunka-1-s': title, 'f-db': 'bunka', size: String(size), from: String(from)});
 const response = await fetch(url, {headers: UA, signal: AbortSignal.timeout(30000)});
 // 取得の失敗を「候補なし」として保存しない。
 if (!response.ok) throw Error(`${response.status} ${url}`);
 const body = await response.json();
 // size が上限（500）を超えると、HTTP 200 のまま message: e-search-limit-error と hit 0 が返る。これも失敗として扱う。
 if (body.message) throw Error(`Japan Search error ${body.message} ${url}`);
 if (!Array.isArray(body.list) || typeof body.hit !== 'number') throw Error(`list missing ${url}`);
 return body;
}

async function main() {
 const {values} = parseArgs({options: {output: {type: 'string'}, checked: {type: 'string'}, sites: {type: 'string'}, near: {type: 'string'}, far: {type: 'string'}, size: {type: 'string'}, pages: {type: 'string'}, wait: {type: 'string'}, limit: {type: 'string'}}});
 if (!values.output || !/^\d{4}-\d{2}-\d{2}$/.test(values.checked || '')) throw Error('使い方: node tools/research/heritage-site-candidates.cjs --output 出力先.json --checked YYYY-MM-DD');
 const root = path.resolve(__dirname, '../..'), sitesPath = path.resolve(values.sites || path.join(root, 'data/research/implemented-sites.jsonl'));
 const nearKm = Number(values.near || 5), farKm = Number(values.far || 30), size = Number(values.size || 500), wait = Number(values.wait || 300), pages = Number(values.pages || 4);
 if (!(size >= 1 && size <= 500)) throw Error('--size は 1〜500（API の上限）');
 const all = fs.readFileSync(sitesPath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
 let sites = all.filter(row => isCastle(row) && Array.isArray(row.point) && inJapan(row.point)).sort((a, b) => a.id.localeCompare(b.id));
 if (values.limit) sites = sites.slice(0, Number(values.limit));
 const rows = [], counts = {sites: sites.length, 'title-and-near': 0, 'title-only': 0, none: 0, truncated: 0};
 for (const site of sites) {
  const titles = stems(site.name), items = [];let hits = 0, truncated = false;
  for (const title of titles) {
   // 1 回で取り切れないときは from をずらして続きを取る。pages 回で打ち切ったら truncated に残す。
   for (let page = 0, got = 0; ; page++) {
    const body = await search(title, size, got);
    if (!page) hits += body.hit;
    items.push(...body.list);got += body.list.length;
    await new Promise(resolve => setTimeout(resolve, wait));
    if (got >= body.hit || !body.list.length) break;
    if (page + 1 >= pages) { truncated = true; break; }
   }
  }
  const result = candidates(site, items, nearKm, farKm), best = result.candidates[0], status = !best ? 'none' : best.match;
  counts[status]++;
  if (truncated) counts.truncated++;
  rows.push({id: site.id, name: site.name, kind: site.kind, point: site.point, titles, hits, fetched: items.length, truncated, result: status, candidates: result.candidates, dropped: result.dropped});
 }
 const out = {checked: values.checked,
  scope: 'ゲームの城系の拠点（日本）について、国指定の史跡の候補を集めた目録。位置の根拠の候補で、存在年代・城域・所在の史実命題には採用しない。国指定でない史跡（都道府県・市町村の指定）はこのデータベースに無い。',
  source: {api: API, database: 'bunka（文化庁 国指定文化財等データベース）', stored: 'ID・名称・種別・都道府県・所在地・指定年月日・座標・URL。解説文は保存しない'},
  selection: {sites: 'implemented-sites.jsonl の kind が「城」または castle-node で、朝鮮の範囲（lon<130 かつ lat>34.6）を除く', titles: '題名の欄（q-bunka-1-s）を、拠点の名前から末尾の 城・館・砦・御所・要害 を除いた語幹で探す（2 文字未満になる名前はそのまま）。名前が「山城」で終わるときは「山城」を除いた語幹でも探す',
   filter: `種別が${KIND}、題名に語幹と城・館などの語があり、題名の終わりが 跡・城・館・遺跡・台場・チャシ・グスク・群 のいずれか、座標がある、拠点から ${farKm}km 以内`, near: `${nearKm}km 以内を title-and-near、それより遠いものを title-only とする`, size},
  counts, rows};
 fs.writeFileSync(path.resolve(values.output), JSON.stringify(out, null, 1) + '\n');
 console.log(`sites ${counts.sites}; near ${counts['title-and-near']}; title-only ${counts['title-only']}; none ${counts.none}; truncated ${counts.truncated}`);
}

module.exports = {stem, stems, cleanTitle, km, pick, candidates, inJapan, isCastle, KIND};
if (require.main === module) main().catch(error => { console.error(error.message); process.exit(1); });
