'use strict';
/* 史跡の候補を集める道具（tools/research/heritage-site-candidates.cjs）の絞り込みと、保存した目録の形を検査する。通信はしない。 */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = process.env.GAME_REPO_ROOT || path.resolve(__dirname, '../..');
const tool = require(path.join(root, 'tools/research/heritage-site-candidates.cjs'));

assert.deepEqual(tool.stems('岩村城'), ['岩村']);
assert.deepEqual(tool.stems('芥川山城'), ['芥川山', '芥川'], '山城は山を残した語幹と除いた語幹の両方');
assert.deepEqual(tool.stems('備中松山城'), ['備中松山', '備中松']);
assert.deepEqual(tool.stems('大友館'), ['大友']);
assert.deepEqual(tool.stems('堺'), ['堺'], '1 文字になる語幹は使わない');
assert.equal(tool.cleanTitle('嶋上郡衙跡\n　附　寺跡'), '嶋上郡衙跡');
assert.equal(Math.round(tool.km([135, 35], [135, 36])), 111);
assert.equal(tool.inJapan([129.03, 35.12]), false, '釜山は日本の範囲から外す');
assert.equal(tool.inJapan([130.4, 33.6]), true);

const item = (id, title, kind, lon, lat, extra = {}) => ({id, common: {title, coordinates: lon == null ? undefined : {lon, lat}, linkUrl: 'https://online.bunka.go.jp/db/heritages/detail/' + id, description: '解説文は保存しない'},
 'bunka-6-s': '解説文は保存しない', 'bunka-10-s': '大阪府', 'bunka-11-s': kind, 'bunka-13-s': '高槻市', 'bunka-15-s': '指定年月日:20221110\n管理団体名:', ...extra});
const site = {id: 'node:akutagawa', name: '芥川山城', point: [135.6, 34.87]};
const result = tool.candidates(site, [
 item('bunka-1', '芥川城跡', tool.KIND, 135.61, 34.875),
 item('bunka-1', '芥川城跡', tool.KIND, 135.61, 34.875),
 item('bunka-2', '芥川城図', '重要文化財', 135.6, 34.87),
 item('bunka-3', '芥川のシダレザクラ', tool.KIND, 135.6, 34.87),
 item('bunka-4', '芥川城の大カヤ', tool.KIND, 135.6, 34.87),
 item('bunka-5', '芥川館跡', tool.KIND, null, null),
 item('bunka-6', '芥川城跡', tool.KIND, 136.2, 34.87),
 item('bunka-7', '芥川城跡', tool.KIND, 139.7, 35.7),
 item('bunka-8', '嶋上郡衙跡\n　附　寺跡', tool.KIND, 135.6, 34.87)
], 5, 100);
assert.deepEqual(result.candidates.map(c => [c.id, c.match]), [['bunka-1', 'title-and-near'], ['bunka-6', 'title-only']], '近い順で、同じ ID は 1 回だけ');
assert.deepEqual(result.dropped, {otherKind: 1, noCoordinates: 1, titleMismatch: 3, tooFar: 1});
assert.deepEqual(Object.keys(result.candidates[0]).sort(), ['address', 'designated', 'id', 'kind', 'km', 'linkUrl', 'match', 'point', 'prefecture', 'title']);
assert.equal(result.candidates[0].designated, '20221110');
assert(!JSON.stringify(result).includes('解説文'), '解説文を候補に入れない');

// 保存した目録：解説文が無く、件数と結果が行と合う。
const file = path.join(root, 'data/research/source-notes/heritage-site-candidates.json'), raw = fs.readFileSync(file, 'utf8'), saved = JSON.parse(raw);
assert(!/"description"|bunka-6-s/.test(raw), '保存した目録に解説文の欄が無い');
assert.match(saved.checked, /^\d{4}-\d{2}-\d{2}$/);
assert.equal(saved.rows.length, saved.counts.sites);
const tally = {'title-and-near': 0, 'title-only': 0, none: 0};
const ids = new Set();
for (const row of saved.rows) {
 assert(!ids.has(row.id), 'duplicate site ' + row.id);ids.add(row.id);
 assert(tool.inJapan(row.point));
 assert.deepEqual(row.titles, tool.stems(row.name));
 assert.equal(row.result, row.candidates[0] ? row.candidates[0].match : 'none');
 tally[row.result]++;
 for (const c of row.candidates) {
  assert.equal(c.kind, tool.KIND);
  assert(row.titles.some(t => c.title.includes(t)), row.id + ' title ' + c.title);
  assert.match(c.linkUrl, /^https:\/\/online\.bunka\.go\.jp\/db\/heritages\/detail\/\d+$/);
  assert(Math.abs(tool.km(row.point, c.point) - c.km) < 0.006, 'distance differs');
 }
 assert.deepEqual(row.candidates.map(c => c.km), row.candidates.map(c => c.km).slice().sort((a, b) => a - b));
}
for (const key of Object.keys(tally)) assert.equal(saved.counts[key], tally[key], key);
// 目録は実装の一覧の日本の城系の拠点をちょうど 1 回ずつ含む。
const sites = fs.readFileSync(path.join(root, 'data/research/implemented-sites.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter(r => tool.isCastle(r) && tool.inJapan(r.point));
assert.deepEqual([...ids].sort(), sites.map(r => r.id).sort(), 'catalog covers the implemented Japanese castle sites');
console.log(`PASS: title-field filter, kind/suffix/distance rules, no description retained; ${saved.rows.length} sites, ${tally['title-and-near']} near, ${tally['title-only']} title-only, ${tally.none} none`);
