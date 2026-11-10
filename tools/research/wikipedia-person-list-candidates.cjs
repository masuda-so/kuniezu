/* Wikipedia の「戦国時代の人物一覧 (日本)」（固定版）と、人物のカテゴリ（取得時点）から人物の候補を取り、
   Wikidata・人物典拠・ゲームの名前に照らす。
   記事の本文は保存しない（CC BY-SA）。記事名・表示名・見出しの区分・カテゴリ名と、版番号・取得時刻だけを残す。
   出力は候補で、curated の people へは採用しない。網羅や別名の重複ゼロは示さない。 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {parseArgs} = require('node:util');

const UA = {'User-Agent': 'KuniezuResearch/1.0 (https://github.com/masuda-so/kuniezu)'};
const LIST_PAGE = '戦国時代の人物一覧_(日本)';
const ROOT_CATEGORIES = ['戦国武将', '戦国大名'];
const MAX_DEPTH = 3;
// カテゴリには名前から分類のヒントを付ける。外すのは後世の作品・題材の分類だけで、
// それも非人物の候補（次の便）へ渡すキューとして残す。話題・名数・人物神・氏族は人物の記事も混じるのでたどる。
const HINTS = [
 ['later-works', /作品|題材|登場する|フィクション|ゲーム|ドラマ|映画|小説|漫画|アニメ/],
 ['topics', /トピックス|関連/],
 ['named-group', /名数|衆$|四天王|七本槍|家臣団/],
 ['deified', /神$|人物神|日本の神/],
 ['clan-or-house', /氏$|氏族|一族|家$/],
 ['non-person-thing', /城$|城郭|合戦|の戦い|事件|一揆$/],
];
const hintOf = c => (HINTS.find(([, re]) => re.test(c)) || ['other'])[0];
const NOT_CRAWLED_FOR_PERSONS = new Set(['later-works']);
const PERIOD = [1534, 1615];
const requests = [];
async function getJson(url) {
 for (let attempt = 0; ; attempt++) {
  const response = await fetch(url, {headers: UA, signal: AbortSignal.timeout(60000)});
  if ((response.status === 429 || response.status >= 500) && attempt < 4) { await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); continue; }
  if (!response.ok) throw Error(`${response.status} ${url}`);
  const body = await response.json();
  if (body.error) {
   if (body.error.code === 'maxlag' && attempt < 4) { await new Promise(r => setTimeout(r, 5000)); continue; }
   throw Error(`API error ${body.error.code}: ${body.error.info} ${url}`);
  }
  requests.push({url, retrievedAt: new Date().toISOString()});
  return body;
 }
}
const wp = params => getJson('https://ja.wikipedia.org/w/api.php?' + new URLSearchParams({format: 'json', formatversion: '2', ...params}));
const years = claims => (claims || []).map(c => c.mainsnak?.datavalue?.value?.time).filter(Boolean).map(t => Number(t.slice(0, 1) === '-' ? -t.slice(1, 5) : t.slice(1, 5)));

// 箇条書きの最初のリンクを人物とし、見出しの区分を添える。
function parseList(wikitext) {
 const heads = [];
 const out = [];
 for (const line of wikitext.split('\n')) {
  const h = line.match(/^(={2,4})\s*(.*?)\s*\1\s*$/);
  if (h) {
   const level = h[1].length - 2;
   heads.length = level;
   heads[level] = h[2].replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').trim();
   continue;
  }
  if (!line.startsWith('*')) continue;
  const m = line.match(/\[\[([^\]|#]+)(?:\|([^\]]*))?\]\]/);
  if (!m || /^(?:Category|ファイル|File|画像):/i.test(m[1])) continue;
  out.push({title: m[1].trim().replace(/_/g, ' '), label: (m[2] || m[1]).trim(), section: heads.filter(Boolean).join(' / ')});
 }
 return out;
}

async function members(category, type) {
 const out = [];
 let cont = {};
 for (;;) {
  const r = await wp({action: 'query', list: 'categorymembers', cmtitle: `Category:${category}`, cmtype: type, cmnamespace: type === 'page' ? '0' : '14', cmlimit: '500', ...cont});
  out.push(...r.query.categorymembers.map(m => m.title.replace(/^Category:/, '')));
  if (!r.continue) return out;
  cont = r.continue;
 }
}

async function crawlCategories() {
 const visited = [], excluded = [], notCrawled = [];
 const pages = new Map(); // 記事名 → 入ったカテゴリ
 const seen = new Set();
 const queue = ROOT_CATEGORIES.map(c => ({category: c, depth: 0, via: null}));
 while (queue.length) {
  const {category, depth, via} = queue.shift();
  if (seen.has(category)) continue;
  seen.add(category);
  const hint = hintOf(category);
  if (depth > 0 && NOT_CRAWLED_FOR_PERSONS.has(hint)) { excluded.push({category, depth, via, hint, reason: '後世の作品・題材の分類。人物の候補には取らず、非人物の候補（作品と当時の事物を分ける）へ渡す', handOff: 'non-person-candidates'}); continue; }
  const titles = await members(category, 'page');
  for (const t of titles) {
   const s = pages.get(t) || new Set();
   s.add(`${category}|${hint}`);
   pages.set(t, s);
  }
  const subcats = await members(category, 'subcat');
  visited.push({category, depth, via, hint, pages: titles.length, subcategories: subcats.length});
  if (depth < MAX_DEPTH) for (const c of subcats) queue.push({category: c, depth: depth + 1, via: category});
  else for (const c of subcats) if (!seen.has(c)) notCrawled.push({category: c, depth: depth + 1, via: category, reason: `深さの上限（${MAX_DEPTH}）`});
 }
 // 別の親から深さの上限内でたどったカテゴリは、未走査に残さない（探索の後の訪問済みの集合で判定する）。
 const crawled = new Set([...visited, ...excluded].map(v => v.category));
 const pending = new Map();
 for (const n of notCrawled) if (!crawled.has(n.category) && !pending.has(n.category)) pending.set(n.category, n);
 return {visited, excluded, notCrawled: [...pending.values()], pages};
}

async function main() {
 const {values} = parseArgs({options: {output: {type: 'string'}, people: {type: 'string'}, reclassify: {type: 'string'}}});
 if (!values.output) throw Error('使い方: node tools/research/wikipedia-person-list-candidates.cjs --output 出力先の名前（.json と .jsonl.gz を作る） [--people curated/people のディレクトリ] [--reclassify 既存の出力の名前（通信せず、保存済みの記録から分類だけをやり直す）]');
 const base = path.resolve(values.output).replace(/\.jsonl?$/, '');
 for (const f of [`${base}.json`, `${base}.jsonl.gz`]) if (fs.existsSync(f)) throw Error(`出力先が存在します: ${f}`);
 const root = path.resolve(__dirname, '../..');
 const peopleDir = path.resolve(values.people || path.join(root, 'data/research/curated/people'));

 let revid, crawl, records, items = new Map(), previous = null;
 if (values.reclassify) {
  // 保存済みの記録から、取得した値をそのまま使い、分類だけをやり直す。ネットワークには出ない。
  const prev = path.resolve(values.reclassify).replace(/\.jsonl?(\.gz)?$|\.json$/, '');
  previous = JSON.parse(fs.readFileSync(`${prev}.json`, 'utf8'));
  revid = previous.sources.find(x => x.kind === 'list').revision;
  crawl = {visited: previous.visitedCategories, excluded: previous.categoriesHandedToNonPerson, notCrawled: previous.categoriesNotCrawled};
  const arrays = ['labels', 'listSections', 'categories', 'categoryHints', 'sourceTitles', 'instanceOf', 'wikidataAliases', 'birthYears', 'deathYears'];
  records = require('node:zlib').gunzipSync(fs.readFileSync(`${prev}.jsonl.gz`)).toString('utf8').trim().split('\n').map(line => {
   const r = JSON.parse(line);
   for (const k of arrays) r[k] ||= [];
   r.listOccurrences ||= 0; r.human = !!r.human; r.missing = !!r.missing;
   r.wikidataId ||= null; r.wikidataRevision ??= null; r.wikidataLabel ??= null;
   for (const k of ['names', 'namesSharedWithOtherRecords', 'personRecord', 'personRecordByNameOnly', 'personRecordsByNameOnly', 'inGameByName', 'status', 'handOff', 'entry', 'wikidataLifeVsCollectionPeriod']) delete r[k];
   return r;
  });
 } else {
 // 入口 1：一覧（固定版）
 const page = await wp({action: 'parse', page: LIST_PAGE, prop: 'wikitext|revid', redirects: '1'});
 revid = page.parse.revid;
 const entries = new Map();
 const entry = title => {
  if (!entries.has(title)) entries.set(title, {title, labels: [], listSections: [], listOccurrences: 0, categories: []});
  return entries.get(title);
 };
 for (const x of parseList(page.parse.wikitext)) {
  const e = entry(x.title);
  if (!e.labels.includes(x.label)) e.labels.push(x.label);
  if (!e.listSections.includes(x.section)) e.listSections.push(x.section);
  e.listOccurrences++;
 }
 // 入口 2：カテゴリ（取得時点。カテゴリには版番号が無いので取得時刻で示す）
 crawl = await crawlCategories();
 for (const [t, cats] of crawl.pages) {
  const e = entry(t);
  for (const c of [...cats].sort()) { const [category, hint] = c.split('|'); e.categories.push(category); if (!e.categoryHints) e.categoryHints = []; if (!e.categoryHints.includes(hint)) e.categoryHints.push(hint); }
 }

 // 記事名 → 転送先・Wikidata の項目
 const all = [...entries.values()];
 for (let i = 0; i < all.length; i += 50) {
  const batch = all.slice(i, i + 50);
  const q = await wp({action: 'query', prop: 'pageprops', ppprop: 'wikibase_item', redirects: '1', titles: batch.map(e => e.title).join('|')});
  const norm = new Map((q.query.normalized || []).map(n => [n.from, n.to]));
  const redir = new Map((q.query.redirects || []).map(r => [r.from, r.to]));
  const byTitle = new Map((q.query.pages || []).map(p => [p.title, p]));
  for (const e of batch) {
   let t = norm.get(e.title) || e.title;
   if (redir.has(t)) { e.redirectTo = redir.get(t); t = redir.get(t); }
   const p = byTitle.get(t);
   e.missing = !p || !!p.missing;
   e.wikidataId = p?.pageprops?.wikibase_item || null;
  }
 }
 // 同じ転送先・同じ QID はまとめ、元の記事名を残す
 const merged = new Map();
 for (const e of all) {
  const key = e.wikidataId ? `qid:${e.wikidataId}` : `title:${e.redirectTo || e.title}`;
  const m = merged.get(key);
  if (!m) { merged.set(key, {...e, title: e.redirectTo || e.title, sourceTitles: [e.title]}); continue; }
  m.sourceTitles.push(e.title);
  for (const k of ['labels', 'listSections', 'categories', 'categoryHints']) if (e[k]) for (const v of e[k]) if (!(m[k] ||= []).includes(v)) m[k].push(v);
  m.listOccurrences += e.listOccurrences;
 }
 records = [...merged.values()];

 // Wikidata の人間かどうか・生没年・日本語の名前と別名
 const qids = records.map(e => e.wikidataId).filter(Boolean);
 for (let i = 0; i < qids.length; i += 50) {
  const w = await getJson('https://www.wikidata.org/w/api.php?' + new URLSearchParams({action: 'wbgetentities', ids: qids.slice(i, i + 50).join('|'), props: 'info|labels|aliases|claims', languages: 'ja', format: 'json', maxlag: '5'}));
  for (const [id, x] of Object.entries(w.entities)) items.set(id, x);
 }
 for (const e of records) {
  const x = e.wikidataId ? items.get(e.wikidataId) : null;
  e.instanceOf = [...new Set((x?.claims?.P31 || []).map(c => c.mainsnak?.datavalue?.value?.id).filter(Boolean))];
  e.human = e.instanceOf.includes('Q5');
  e.wikidataRevision = x?.lastrevid ?? null;
  e.wikidataLabel = x?.labels?.ja?.value ?? null;
  e.wikidataAliases = (x?.aliases?.ja || []).map(a => a.value);
  e.birthYears = x ? years(x.claims?.P569) : [];
  e.deathYears = x ? years(x.claims?.P570) : [];
 }
 }
 // 人物典拠とゲームの名前
 const people = fs.readdirSync(peopleDir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(peopleDir, f), 'utf8')));
 const byQid = new Map(), byName = new Map();
 for (const p of people) {
  for (const id of p.authorityIds || []) if (id.startsWith('wikidata:')) byQid.set(id.slice(9), p.id);
  // 同じ名前の別の記録を上書きしないよう、名前ごとに全ての ID を残す
  for (const n of new Set([p.name, ...(p.gameNames || []), ...(p.aliases || [])])) if (n) (byName.get(n) || byName.set(n, new Set()).get(n)).add(p.id);
 }
 const {G, TK} = require('../checks/history-focus.cjs').model();
 // ゲームの名前：年表の appear と、全ての開始シナリオの初期の人物
 const gameNames = new Set(TK.HIST.filter(e => e.k === 'appear').map(e => e.g.split('|')[0]));
 const scenariosRead = [];
 for (const [id, sc] of Object.entries(TK.SCEN)) {
  const owners = Object.keys(sc.owners || TK.SCEN[sc.base]?.owners || {});
  const owner = owners.find(k => { try { G.newGame(id, k); return true; } catch { return false; } });
  if (owner === undefined) throw Error(`開始シナリオ ${id} を開けません`);
  for (const g of G.S().gens || []) if (g.n) gameNames.add(g.n);
  scenariosRead.push(id);
 }

 const nameUse = new Map();
 for (const e of records) {
  e.names = [...new Set([e.title.replace(/ \(.*\)$/, ''), ...e.labels, ...(e.wikidataLabel ? [e.wikidataLabel] : []), ...e.wikidataAliases])];
  for (const n of e.names) nameUse.set(n, (nameUse.get(n) || 0) + 1);
 }
 for (const e of records) {
  e.namesSharedWithOtherRecords = e.names.filter(n => nameUse.get(n) > 1);
  const nameMatches = [...new Set(e.names.flatMap(n => [...(byName.get(n) || [])]))].sort();
  e.personRecord = (e.wikidataId && byQid.get(e.wikidataId)) || null;
  e.personRecordByNameOnly = e.personRecord ? null : nameMatches.length ? nameMatches : null;
  e.inGameByName = e.names.some(n => gameNames.has(n));
  const b = e.birthYears.length ? Math.min(...e.birthYears) : null, d = e.deathYears.length ? Math.max(...e.deathYears) : null;
  e.wikidataLifeVsCollectionPeriod = b === null && d === null ? 'unknown' : (d !== null && d < PERIOD[0]) || (b !== null && b > PERIOD[1]) ? 'outside' : b !== null && d !== null ? 'overlaps' : 'partial-years-overlap-possible';
  // P31 が空（未設定・未取得）のものは人でないと断定せず、種別未判定として人物候補の再確認に残す
  e.status = !e.wikidataId || e.missing ? 'no-wikidata-item' : !e.instanceOf.length ? 'instance-of-unassessed' : !e.human ? 'not-a-human-item'
   : e.personRecord ? 'has-person-record' : e.inGameByName ? 'in-game-without-record' : 'not-in-game';
  e.gameRelevance = 'unassessed';
  e.adoption = 'candidate';
  if (e.status === 'not-a-human-item') e.handOff = 'non-person-candidates';
  e.entry = [e.listOccurrences ? 'list' : null, e.categories.length ? 'category' : null].filter(Boolean).join('+');
 }
 records.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
 const counts = {}, byEntry = {};
 for (const e of records) {
  const k = `${e.status}/${e.wikidataLifeVsCollectionPeriod}`;
  counts[k] = (counts[k] || 0) + 1;
  byEntry[e.entry] = (byEntry[e.entry] || 0) + 1;
 }
 const listUrl = `https://ja.wikipedia.org/w/index.php?title=${encodeURIComponent(LIST_PAGE)}&oldid=${revid}`;
 const compact = r => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== null && v !== false && !(Array.isArray(v) && !v.length)));
 fs.writeFileSync(`${base}.jsonl.gz`, require("node:zlib").gzipSync(records.map(r => JSON.stringify(compact(r))).join("\n") + "\n", {level: 9}));
 fs.writeFileSync(`${base}.json`, JSON.stringify({
  status: 'identity-candidates-not-adopted',
  sources: [
   {kind: 'list', title: '戦国時代の人物一覧 (日本)', url: listUrl, revision: revid},
   {kind: 'categories', roots: ROOT_CATEGORIES.map(c => `Category:${c}`), maxDepth: MAX_DEPTH, note: 'カテゴリには版番号が無いため、取得時刻（requests）で時点を示す'},
  ],
  license: 'Wikipedia は CC BY-SA 4.0、Wikidata は CC0。記事の本文は保存せず、記事名・表示名・見出しの区分・カテゴリ名だけを残す。',
  scope: '一覧の箇条書きの最初のリンクと、カテゴリの記事を人物の候補とした。全史実人物の網羅や別名の重複ゼロは示さない。年代は Wikidata の生没年で、年が無いものは unknown のまま推定しない。名前だけの一致（personRecordByNameOnly・inGameByName）は同一人物の判定ではない。curated の people へは採用しない。',
  extraction: {
   list: 'リスト行（*）の最初の [[リンク]]。Category・ファイルへのリンクは除く',
   categories: '根から深さ 3 まで子カテゴリをたどる。後世の作品・題材の分類だけは人物の候補に取らず categoriesHandedToNonPerson に残す。上限でたどらなかった子カテゴリは categoriesNotCrawled に残し、収集の完了とはしない。categoryHints は名前からの目安',
   dedupe: '記事名 → 転送先 → Wikidata の QID の順にまとめ、元の記事名（sourceTitles）・一覧の区分・カテゴリを全部残す',
   collectionPeriod: PERIOD,
   wikidataLifeVsCollectionPeriod: '収集の対象期間（1534〜1615 年）と Wikidata の生没年を比べた目安。overlaps は生年・没年とも有り重なる、partial-years-overlap-possible は片方だけで外れとは言えない、unknown は年が無い。どれもその期間に実在・活動したことの確認ではない',
   peopleDir: path.relative(root, peopleDir),
   gameNames: `年表の appear と、開始シナリオ ${scenariosRead.join('・')} の初期の人物の名前（${gameNames.size} 件）`,
  },
  records: path.basename(`${base}.jsonl.gz`), recordFormat: "1 行 1 候補の JSON を gzip（mtime 0）。空の配列・null・false の欄は省く",
  total: records.length, byEntry, counts,
  collectionComplete: false,
  gameRelevance: '全件 unassessed。名前の一致（inGameByName）はヒントで、関わりの評価ではない',
  visitedCategories: crawl.visited, categoriesHandedToNonPerson: crawl.excluded, categoriesNotCrawled: crawl.notCrawled,
  ...(previous ? {requests: previous.requests, firstRequestAt: previous.firstRequestAt, lastRequestAt: previous.lastRequestAt, reclassifiedFrom: `取得は ${previous.firstRequestAt}〜${previous.lastRequestAt}。${new Date().toISOString().slice(0, 10)} に保存済みの記録から分類だけをやり直した（通信なし）`}
   : {requests: requests.length, firstRequestAt: requests[0]?.retrievedAt, lastRequestAt: requests.at(-1)?.retrievedAt}),
  statusNotes: {'instance-of-unassessed': 'Wikidata の項目はあるが P31 が空。人でないとは断定せず、人物候補として再確認する。handOff しない', 'not-a-human-item': 'P31 があり、Q5（人間）を含まない。handOff: non-person-candidates'},
 }, null, 1) + '\n');
 console.log(JSON.stringify({revid, total: records.length, byEntry, counts, visited: crawl.visited.length, handedOff: crawl.excluded.length, notCrawled: crawl.notCrawled.length}));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
