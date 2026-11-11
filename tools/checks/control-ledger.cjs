/* 支配の記録の台帳の検査。固定の入力（値は架空）で、入力の検査と配置の導出を確かめる。
   引数なしではゲームを読み込まない。決まりは docs/designs/territory-control.md。 */
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), vm = require('node:vm');
const { loadControl } = require('../research/evidence-store.cjs');
const { span, controlOn, intervals, inScope } = require('../research/control-derive.cjs');
const cases = require('./fixtures/control-cases.cjs');

// 固定の入力を一時のディレクトリに 1 件 1 ファイルで置き、入力の検査に通す。
function load(records) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'control-ledger-'));
  try {
    for (const r of records) fs.writeFileSync(path.join(dir, String(r.id).replace(/^control:/, '') + '.json'), JSON.stringify(r));
    return loadControl({ controlDir: dir, sources: cases.sources, claimIds: cases.claimIds, clanKeys: cases.clanKeys, nodeIds: cases.nodeIds });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
const START = span(cases.Y(1560)).earliest, END = span(cases.Y(1615)).latest;
const jdOf = e => span(e.at).earliest + (e.plus || 0);

// 日付の幅：ゲームの暦の関数（calendar.js）で、知られた日と照らす。
const cal = vm.createContext({}); cal.window = cal;
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../kuniezu/static/kuniezu/calendar.js'), 'utf8'), cal);
const { toJD } = cal.TKCalendar;
assert.deepEqual(span(cases.D(1582, 6, 2)), { earliest: toJD(1582, 6, 21), latest: toJD(1582, 6, 21) }, '天正 10 年 6 月 2 日はユリウス暦 1582 年 6 月 21 日');
assert.equal(span(cases.D(1600, 9, 15)).earliest, toJD(1600, 10, 21), '慶長 5 年 9 月 15 日はグレゴリオ暦 1600 年 10 月 21 日');
assert.ok(span(cases.D(1534, 1, 1, true)).earliest > span(cases.D(1534, 1, 1)).earliest && span(cases.D(1534, 1, 1, true)).earliest < span(cases.D(1534, 2, 1)).earliest, '閏正月は正月と 2 月の間');
assert.equal(span(cases.Y(1570)).earliest, span(cases.D(1570, 1, 1)).earliest, '年の最初の日は旧暦の正月朔日');
assert.equal(span(cases.Y(1570)).latest + 1, span(cases.D(1571, 1, 1)).earliest, '年の最後の日は翌年の正月朔日の前日');
assert.deepEqual(span({ from: cases.Y(1570), to: cases.D(1572, 3, 3) }), { earliest: span(cases.Y(1570)).earliest, latest: span(cases.D(1572, 3, 3)).latest });
assert.equal(inScope([129.04, 35.12]), false, '釜山は対象外');
assert.equal(inScope([129.9, 33.5]), true, '九州北部は対象');
assert.equal(inScope([137.0, 35.2]), true);

const seen = new Set();
for (const c of cases.derive) {
  const { records, warnings } = load(c.records);
  assert.deepEqual(warnings, [], c.name);
  for (const e of c.expect) {
    const got = controlOn(records, 'node:x', jdOf(e));
    seen.add(got.category);
    for (const k of ['category', 'holder', 'candidates', 'evidence', 'conflictWith']) if (k in e) assert.deepEqual(got[k], e[k], c.name + '：' + JSON.stringify(e.at.date || e.at) + ' の ' + k);
  }
  // 区間の一覧は、隙間も重なりも無く、全ての日で 1 日の導出と一致する。
  const list = intervals(records, 'node:x', START, END);
  assert.equal(list[0].startJd, START, c.name); assert.equal(list[list.length - 1].endJd, END, c.name);
  list.forEach((iv, i) => {
    if (i) assert.equal(iv.startJd, list[i - 1].endJd + 1, c.name + '：区間がつながる');
    const { startJd, endJd, days, ...rest } = iv;
    for (const jd of new Set([startJd, endJd, startJd + Math.floor((endJd - startJd) / 2)])) assert.deepEqual(controlOn(records, 'node:x', jd), rest, c.name + '：区間と 1 日の導出が一致');
    assert.equal(days !== null, ['carried', 'bracketed'].includes(iv.category), c.name + '：days は持ち越しと挟まれるだけ');
  });
  for (const jd of [START, END]) assert.ok(controlOn(records, 'node:x', jd));
  for (const e of c.intervals || []) {
    const iv = list.find(x => x.startJd <= jdOf(e) && jdOf(e) <= x.endJd);
    assert.equal(iv.days, (e.days.toEnd ? iv.endJd : span(e.days.to).earliest) - span(e.days.from).latest, c.name + '：days');
  }
}
// 全ての日での一致は、記録の多い場合 1 つで確かめる。
{
  const { records } = load(cases.derive.find(c => c.name.startsWith('手順の優先')).records);
  const list = intervals(records, 'node:x', START, END);
  for (const iv of list) { const { startJd, endJd, days, ...rest } = iv; for (let jd = startJd; jd <= endJd; jd++) assert.deepEqual(controlOn(records, 'node:x', jd), rest); }
}
assert.deepEqual([...seen].sort(), ['bracketed', 'carried', 'confirmed', 'contested', 'not-applicable', 'transition-window', 'undetermined', 'unsurveyed', 'variant', 'window-observation'], '区分 10 種を全て確かめる');

for (const c of cases.rejects) assert.throws(() => load(c.records), e => e.message.includes(c.rejects), c.name + '：拒む（' + c.rejects + '）');
for (const c of cases.warns) assert.ok(load(c.records).warnings.some(w => w.includes(c.warns)), c.name);
assert.deepEqual(loadControl({ controlDir: path.join(os.tmpdir(), 'no-such-control-dir'), sources: cases.sources, claimIds: cases.claimIds, clanKeys: cases.clanKeys, nodeIds: cases.nodeIds }), { records: [], warnings: [] }, 'ディレクトリが無くても通る');

console.log('ok: control ledger', cases.derive.length, 'derivation cases,', cases.rejects.length, 'rejections,', cases.warns.length, 'warning');
