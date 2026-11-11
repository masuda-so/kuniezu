/* 支配の記録から、ある日の配置を導き出す。配置は保存しない。
   決まりは docs/designs/territory-control.md の「配置の導出」。
   ゲームの本体と evidence-store.cjs は読まない。暦の表（koyomi.js）だけを読む。 */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

const KOYOMI = (() => {
  const c = vm.createContext({});
  c.window = c;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../kuniezu/static/kuniezu/koyomi.js'), 'utf8'), c);
  return c.TK.KOYOMI;
})();
const ROW = new Map(KOYOMI.m.map((r, i) => [r[0] + '-' + r[1] + '-' + r[2], i]));
const LAST_YEAR = 1622; // 年の最後の日は翌年の正月朔日から出すので、表の最後の年（1623）は受けない

// 朝鮮の範囲（経度 130 度未満かつ緯度 34.6 度超）の外なら対象。
function inScope(point) {
  return !(point[0] < 130 && point[1] > 34.6);
}

function yearStart(y) {
  const i = ROW.get(y + '-1-0');
  if (i === undefined) throw Error('暦の表に無い年: ' + y);
  return KOYOMI.j0 + KOYOMI.m[i][3];
}
function yearSpan(y0, y1) {
  if (!Number.isInteger(y0) || !Number.isInteger(y1) || y0 > y1 || y1 > LAST_YEAR) throw Error('暦の表で両端を出せない年: ' + y0 + '〜' + y1);
  return { earliest: yearStart(y0), latest: yearStart(y1 + 1) - 1 };
}
function lunarJd(y, m, d, leap) {
  const i = ROW.get(y + '-' + m + '-' + (leap ? 1 : 0));
  if (i === undefined || y > LAST_YEAR) throw Error('暦の表に無い月: ' + [y, m, leap ? '閏' : '平'].join(' '));
  const days = KOYOMI.m[i + 1][3] - KOYOMI.m[i][3];
  if (!Number.isInteger(d) || d < 1 || d > days) throw Error('その月に無い日: ' + [y, m, d].join('-'));
  return KOYOMI.j0 + KOYOMI.m[i][3] + d - 1;
}

const isPeriod = t => !!t && t.kind === undefined && t.from !== undefined && t.to !== undefined;

// 記録の日付を、最早日と最遅日（ユリウス通日）に直す。
function span(time) {
  if (isPeriod(time)) {
    const r = { earliest: span(time.from).earliest, latest: span(time.to).latest };
    if (r.earliest > r.latest) throw Error('期間の始まりが終わりより後');
    return r;
  }
  if (time?.kind === 'dated-event') {
    const jd = lunarJd(time.date[0], time.date[1], time.date[2], time.leapMonth);
    return { earliest: jd, latest: jd };
  }
  if (time?.kind === 'year-window') return yearSpan(time.year, time.year);
  if (time?.kind === 'described-period') return yearSpan(time.indexYears[0], time.indexYears[1]);
  throw Error('受けない日付の形: ' + time?.kind);
}

const clan = id => (typeof id === 'string' && id.startsWith('clan:') ? id : null);

// 記録 1 件が、後の日へ示す状態と、前の日について前提とする家。
function afterOf(r) {
  if (r.type === 'change') return r.to === 'none' ? { kind: 'none' } : { kind: 'clan', clan: r.to };
  if (r.value === 'held') return { kind: 'clan', clan: r.holder };
  if (r.value === 'not-applicable') return { kind: 'none' };
  return { kind: 'open' }; // 係争・不明は、家を引き延ばさない
}
function beforeOf(r) {
  if (r.type === 'change') return r.from === 'none' ? 'none' : clan(r.from);
  return r.value === 'held' ? r.holder : null;
}

// 同じ順位の変化は、from と to がつながる順。決まらなければ id の順。
function chainOrder(group) {
  const rest = [...group].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)), out = [];
  while (rest.length) {
    let i = rest.findIndex(a => a.record?.type === 'change' && !rest.some(b => b !== a && b.record?.type === 'change' && b.record.to === a.record.from && clan(b.record.to)));
    if (i < 0) i = 0;
    out.push(rest.splice(i, 1)[0]);
  }
  return out;
}

const prepared = new WeakMap();
function prepare(records, site) {
  let bySite = prepared.get(records);
  if (!bySite) prepared.set(records, bySite = new Map());
  if (bySite.has(site)) return bySite.get(site);
  const mine = records.filter(r => r.site === site).map(r => {
    const s = span(r.time), wide = s.latest > s.earliest;
    const sure = r.type === 'observation' && (!wide || (isPeriod(r.time) && r.boundsAsserted === true));
    return { id: r.id, record: r, ...s, wide, sure };
  });
  // 束：variantOf でつながる記録の全体。
  const byId = new Map(mine.map(e => [e.id, e])), root = new Map(mine.map(e => [e.id, e.id]));
  const find = id => { while (root.get(id) !== id) id = root.get(id); return id; };
  for (const e of mine) for (const v of e.record.variantOf || []) if (byId.has(v)) root.set(find(e.id), find(v));
  const groups = new Map();
  for (const e of mine) { const k = find(e.id); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); }
  const bundles = [], anchors = [], windows = [];
  for (const members of groups.values()) {
    if (members.length > 1) {
      const afters = members.map(m => JSON.stringify(afterOf(m.record))), befores = members.map(m => beforeOf(m.record));
      const b = {
        id: members.map(m => m.id).sort()[0], bundle: true, ids: members.map(m => m.id).sort(), members,
        earliest: Math.min(...members.map(m => m.earliest)), latest: Math.max(...members.map(m => m.latest)),
        after: afters.every(a => a === afters[0]) ? JSON.parse(afters[0]) : { kind: 'undecided' },
        before: befores.every(x => x === befores[0]) ? befores[0] : null,
      };
      b.candidates = [...new Set(members.map(m => { const a = afterOf(m.record); return a.kind === 'clan' ? a.clan : a.kind === 'none' ? 'none' : 'unknown'; }))];
      bundles.push(b); anchors.push(b);
      continue;
    }
    const e = members[0];
    if (e.record.type === 'change' || e.sure) { e.after = afterOf(e.record); e.before = beforeOf(e.record); e.ids = [e.id]; anchors.push(e); }
    else windows.push(e);
  }
  // 並べ方：（最遅日、最早日）、同じ順位はつながる順。
  anchors.sort((a, b) => a.latest - b.latest || a.earliest - b.earliest);
  const ordered = [];
  for (let i = 0; i < anchors.length;) {
    let j = i + 1;
    while (j < anchors.length && anchors[j].latest === anchors[i].latest && anchors[j].earliest === anchors[i].earliest) j++;
    ordered.push(...chainOrder(anchors.slice(i, j)));
    i = j;
  }
  const out = { mine, bundles, anchors: ordered, windows };
  bySite.set(site, out);
  return out;
}

const hit = (e, jd) => e.earliest <= jd && jd <= e.latest;
const result = (category, o = {}) => ({ category, holder: null, candidates: [], evidence: [], conflictWith: null, ...o });

function resolve(records, site, jd) {
  const p = prepare(records, site);
  // 1. 束の幅の中
  const b = p.bundles.find(x => hit(x, jd));
  if (b) return result('variant', { candidates: b.candidates, evidence: b.ids });
  // 2. 確かな観察（不明は 5）
  const solo = p.anchors.filter(a => !a.bundle && hit(a, jd));
  const sure = solo.filter(a => a.sure && a.record.value !== 'undetermined');
  if (sure.length) {
    const r = sure[0].record, evidence = sure.map(a => a.id);
    if (r.value === 'held') return result('confirmed', { holder: r.holder, evidence });
    if (r.value === 'contested') return result('contested', { candidates: [...r.claimants], evidence });
    return result('not-applicable', { evidence });
  }
  // 3. 幅が 2 日以上ある変化の幅の中
  const wide = solo.filter(a => a.record.type === 'change' && a.wide);
  if (wide.length) return result('transition-window', { candidates: [...new Set(wide.flatMap(a => [a.record.from, a.record.to]))], evidence: wide.map(a => a.id) });
  // 4. 窓の観察
  const win = p.windows.filter(w => hit(w, jd));
  if (win.length) return result('window-observation', { candidates: win.map(w => ({ value: w.record.value, holder: w.record.holder || null })), evidence: win.map(w => w.id) });
  // 5. 不明の観察
  const und = solo.filter(a => a.sure && a.record.value === 'undetermined');
  if (und.length) return result('undetermined', { evidence: und.map(a => a.id) });
  // 6. 前の根拠で決める
  let prev = null, next = null;
  for (const a of p.anchors) if (a.latest <= jd) prev = a;
  for (const a of p.anchors) if (a.earliest > jd && (!next || a.earliest < next.earliest)) next = a;
  if (!prev) return result('unsurveyed');
  if (prev.after.kind === 'open') return result('unsurveyed', { evidence: prev.ids });
  if (prev.after.kind === 'undecided') return result('variant', { candidates: prev.candidates, evidence: prev.ids });
  if (prev.after.kind === 'none') return result('not-applicable', { evidence: prev.ids });
  const holder = prev.after.clan;
  if (next && next.before === holder) return result('bracketed', { holder, evidence: [...prev.ids, ...next.ids], _days: next.earliest - prev.latest });
  return result('carried', { holder, evidence: prev.ids, conflictWith: next && next.before && next.before !== holder ? next.id : null, _from: prev.latest });
}

// 1 日の区分・支配者（または候補）・根拠の記録の ID。
function controlOn(records, site, jd) {
  const { _days, _from, ...r } = resolve(records, site, jd);
  return r;
}

// ノードの期間を、区分つきの区間の一覧に分ける。両端の日を含む。
function intervals(records, site, startJd, endJd) {
  const p = prepare(records, site), cuts = new Set([startJd]);
  for (const e of [...p.mine, ...p.bundles]) for (const jd of [e.earliest, e.latest + 1]) if (startJd < jd && jd <= endJd) cuts.add(jd);
  const starts = [...cuts].sort((a, b) => a - b), out = [];
  const key = r => JSON.stringify([r.category, r.holder, r.candidates, r.evidence, r.conflictWith]);
  starts.forEach((s, i) => {
    const r = resolve(records, site, s), e = i + 1 < starts.length ? starts[i + 1] - 1 : endJd, last = out[out.length - 1];
    if (last && last._key === key(r)) { last.endJd = e; return; }
    out.push({ startJd: s, endJd: e, ...r, _key: key(r) });
  });
  return out.map(({ _key, _days, _from, ...r }) => ({ ...r, days: r.category === 'bracketed' ? _days : r.category === 'carried' ? r.endJd - _from : null }));
}

module.exports = { inScope, span, controlOn, intervals };
