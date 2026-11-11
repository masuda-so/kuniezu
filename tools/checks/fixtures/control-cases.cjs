/* 台帳の検査の固定の入力。値は架空で、史実ではない。
   家の鍵（aaa・bbb・ccc）とノード（node:x）も架空で、ゲームを読まない。
   expect の at は日付、plus はそこからの日数。書いた項目だけを比べる。 */
const D = (y, m, d, leap = false) => ({ kind: 'dated-event', date: [y, m, d], calendar: 'Japanese-lunisolar', leapMonth: leap, precision: 'day' });
const Y = y => ({ kind: 'year-window', year: y, calendar: 'Japanese-year', precision: 'year' });
const P = (from, to) => ({ from, to });
const A = 'clan:aaa', B = 'clan:bbb', C = 'clan:ccc';
const yearOf = t => (t.kind === undefined ? yearOf(t.from) : t.kind === 'dated-event' ? t.date[0] : t.kind === 'year-window' ? t.year : t.indexYears[0]);
const base = { summary: '架空の記録。', checked: '2026-11-11', checkedBy: '固定の入力' };
const cited = { evidenceDepth: 'kobun-heading', source: 'srcA', locator: '架空の箇所' };
const id = (n, time) => 'control:x-' + yearOf(time) + '-' + n;
const chg = (n, time, from, to, extra = {}) => ({ id: id(n, time), type: 'change', site: 'node:x', from, to, time, cause: 'fall', dateKind: 'event', ...cited, ...base, ...extra });
const obs = (n, time, value, extra = {}) => ({ id: id(n, time), type: 'observation', site: 'node:x', value, time, ...(time.kind === undefined ? { boundsAsserted: true } : {}), ...(value === 'undetermined' ? {} : cited), ...base, ...extra });
const und = (n, y0, y1, extra = {}) => obs(n, P(Y(y0), Y(y1)), 'undetermined', { searched: [{ source: 'srcA', query: 'x', date: '2026-11-11', years: [y0, y1] }], ...extra });

const d70 = D(1570, 6, 28), d75 = D(1575, 5, 21), d72 = D(1572, 3, 3), d73 = D(1573, 4, 4);

const derive = [
  { name: '変化の前は未調査、当日は受けた家、後は持ち越し',
    records: [chg(1, d70, A, B)],
    expect: [
      { at: d70, plus: -1, category: 'unsurveyed', evidence: [] },
      { at: d70, category: 'carried', holder: B, evidence: [id(1, d70)], conflictWith: null },
      { at: d70, plus: 400, category: 'carried', holder: B },
    ],
    intervals: [{ at: d70, plus: 400, days: { from: d70, toEnd: true } }] },
  { name: '前後が同じ家なら、出来事で挟まれる',
    records: [chg(1, d70, A, B), chg(1, d75, B, C)],
    expect: [
      { at: d70, plus: 100, category: 'bracketed', holder: B, evidence: [id(1, d70), id(1, d75)] },
      { at: d75, category: 'carried', holder: C },
    ],
    intervals: [{ at: d70, plus: 100, days: { from: d70, to: d75 } }] },
  { name: '後ろの根拠が別の家を示すと、食い違いの印',
    records: [chg(1, d70, A, B), chg(1, d75, C, A)],
    expect: [{ at: d70, plus: 100, category: 'carried', holder: B, conflictWith: id(1, d75) }] },
  { name: 'from=unknown は食い違いにしない',
    records: [chg(1, d70, A, B), chg(1, d75, 'unknown', A)],
    expect: [{ at: d70, plus: 100, category: 'carried', holder: B, conflictWith: null }] },
  { name: '確かな観察：保持は直接確認、翌日からは持ち越し',
    records: [obs(1, d70, 'held', { holder: A })],
    expect: [
      { at: d70, category: 'confirmed', holder: A },
      { at: d70, plus: 1, category: 'carried', holder: A },
      { at: d70, plus: -1, category: 'unsurveyed' },
    ] },
  { name: '確かな観察：係争の後は、家を引き延ばさず未調査',
    records: [chg(1, d70, A, B), obs(1, P(d72, d73), 'contested', { claimants: [B, C] })],
    expect: [
      { at: d72, plus: 10, category: 'contested', candidates: [B, C] },
      { at: d73, plus: 1, category: 'unsurveyed', evidence: [id(1, P(d72, d73))] },
      { at: d70, plus: 10, category: 'carried', holder: B, conflictWith: null },
    ] },
  { name: '確かな観察：対象外は、次の根拠まで続く',
    records: [obs(1, P(d70, d72), 'not-applicable'), chg(1, d75, 'none', A, { cause: 'construction' })],
    expect: [
      { at: d70, plus: 5, category: 'not-applicable' },
      { at: d73, category: 'not-applicable', evidence: [id(1, P(d70, d72))] },
      { at: d75, category: 'carried', holder: A },
    ] },
  { name: '廃城（to=none）の後は対象外',
    records: [chg(1, d70, A, 'none', { cause: 'abandonment' })],
    expect: [{ at: d70, category: 'not-applicable' }, { at: d70, plus: 900, category: 'not-applicable' }] },
  { name: '年だけの時点の観察は窓で、直接確認にしない。窓は根拠にしない',
    records: [obs(1, Y(1570), 'held', { holder: A })],
    expect: [
      { at: d70, category: 'window-observation', candidates: [{ value: 'held', holder: A }] },
      { at: D(1571, 2, 1), category: 'unsurveyed', evidence: [] },
    ] },
  { name: '両端を述べていない期間の観察も窓',
    records: [obs(1, P(d70, d72), 'held', { holder: A, boundsAsserted: false })],
    expect: [{ at: d70, plus: 30, category: 'window-observation' }, { at: d72, plus: 1, category: 'unsurveyed' }] },
  { name: '年精度の変化：幅の中は切り替えの幅の中、年が明けたら受けた家',
    records: [chg(1, Y(1570), A, B)],
    expect: [
      { at: d70, category: 'transition-window', candidates: [A, B] },
      { at: D(1571, 1, 1), category: 'carried', holder: B },
      { at: D(1569, 12, 1), category: 'unsurveyed' },
    ] },
  { name: '同じ年の年精度の変化 2 件：候補は両方、後はつながる順の最後の家',
    records: [chg(1, Y(1570), B, C), chg(2, Y(1570), A, B)],
    expect: [
      { at: d70, category: 'transition-window', candidates: [A, B, C] },
      { at: D(1571, 1, 1), category: 'carried', holder: C },
    ] },
  { name: '同じ日の A→B と B→C は、つながる順に並べる',
    records: [chg(1, d70, B, C), chg(2, d70, A, B)],
    expect: [{ at: d70, category: 'carried', holder: C, evidence: [id(1, d70)] }] },
  { name: '手順の優先：確かな観察 ＞ 変化の幅 ＞ 窓 ＞ 不明',
    records: [
      chg(1, Y(1570), A, B),
      obs(2, d70, 'held', { holder: C }),
      obs(3, P(Y(1570), Y(1572)), 'held', { holder: A, boundsAsserted: false }),
      und(1, 1572, 1574),
    ],
    expect: [
      { at: d70, category: 'confirmed', holder: C },
      { at: d70, plus: 1, category: 'transition-window' },
      { at: D(1571, 3, 1), category: 'window-observation' },
      { at: d72, category: 'window-observation' },
      { at: d73, category: 'undetermined' },
    ] },
  { name: '不明の期間の中は不明、後は未調査',
    records: [chg(1, d70, A, B), und(1, 1575, 1579)],
    expect: [
      { at: d75, category: 'undetermined', evidence: [id(1, P(Y(1575), Y(1579)))] },
      { at: D(1580, 1, 1), category: 'unsurveyed' },
    ] },
  { name: '束：A–B・B–C は 1 つの束。成員の間の日も異説あり。示す家が同じなら後は持ち越し',
    records: [
      chg(1, d70, A, B, { variantOf: [id(1, d72)] }),
      chg(1, d72, A, B, { variantOf: [id(1, d70), id(1, d73)] }),
      chg(1, d73, A, B, { variantOf: [id(1, d72)] }),
    ],
    expect: [
      { at: D(1571, 5, 5), category: 'variant', candidates: [B], evidence: [id(1, d70), id(1, d72), id(1, d73)] },
      { at: d73, plus: 1, category: 'carried', holder: B },
      { at: d70, plus: -1, category: 'unsurveyed' },
    ] },
  { name: '束：示す家が決まらないと、幅の後も異説あり',
    records: [chg(1, d70, A, B, { variantOf: [id(1, d72)] }), chg(1, d72, A, C, { variantOf: [id(1, d70)] })],
    expect: [{ at: d73, category: 'variant', candidates: [B, C] }] },
  { name: '束：同じ家を示す束と、その家からの変化で挟まれる',
    records: [chg(1, d70, A, B, { variantOf: [id(1, d72)] }), chg(1, d72, A, B, { variantOf: [id(1, d70)] }), chg(1, d75, B, C)],
    expect: [{ at: d73, category: 'bracketed', holder: B }] },
  { name: '0 件でも通る', records: [], expect: [{ at: d70, category: 'unsurveyed' }] },
];

const ok = chg(1, d70, A, B);
const rejects = [
  { name: '必須の項目の欠け', records: [{ ...ok, summary: undefined }], rejects: 'summary' },
  { name: '語彙の外の値', records: [{ ...ok, cause: 'conquest' }], rejects: 'cause' },
  { name: '知らない項目', records: [{ ...ok, lord: 'x' }], rejects: '知らない項目' },
  { name: '存在しないノード', records: [{ ...ok, site: 'node:zzz', id: 'control:zzz-1570-1' }], rejects: '対象のノード' },
  { name: '支城', records: [{ ...ok, site: 'castle:branch', id: 'control:branch-1570-1' }], rejects: '対象のノード' },
  { name: '一覧に無い家の鍵', records: [{ ...ok, to: 'clan:zzz' }], rejects: '家の鍵' },
  { name: '登録されていない出典', records: [{ ...ok, source: 'srcZ' }], rejects: 'source' },
  { name: '登録されていない命題', records: [{ ...ok, claim: 'no-such-claim' }], rejects: 'claim' },
  { name: 'id の年が最早日の年と合わない', records: [{ ...ok, id: 'control:x-1571-1' }], rejects: 'id' },
  { name: '探した範囲の無い不明', records: [und(1, 1575, 1579, { searched: [] })], rejects: 'searched' },
  { name: '探した範囲からはみ出す不明', records: [und(1, 1575, 1579, { searched: [{ source: 'srcA', query: 'x', date: '2026-11-11', years: [1575, 1577] }] })], rejects: 'はみ出す' },
  { name: '期間でない不明', records: [obs(1, d70, 'undetermined', { searched: [{ source: 'srcA', query: 'x', date: '2026-11-11', years: [1570, 1570] }] })], rejects: '不明は期間' },
  { name: '争う家が 1 つの係争', records: [obs(1, d70, 'contested', { claimants: [A] })], rejects: 'claimants' },
  { name: '保持に家が無い', records: [obs(1, d70, 'held')], rejects: 'holder' },
  { name: '期間に boundsAsserted が無い', records: [{ ...obs(1, P(d70, d72), 'held', { holder: A }), boundsAsserted: undefined }], rejects: 'boundsAsserted' },
  { name: '片側だけの variantOf', records: [chg(1, d70, A, B, { variantOf: [id(1, d72)] }), chg(1, d72, A, B)], rejects: '相互' },
  { name: '確かな観察の食い違い', records: [obs(1, d70, 'held', { holder: A }), obs(2, d70, 'held', { holder: B })], rejects: '食い違う' },
  { name: '不明の期間の中の変化', records: [und(1, 1569, 1571), ok], rejects: '不明の期間の中' },
  { name: 'dated-components', records: [{ ...ok, time: { kind: 'dated-components', calendar: 'CE-year', precision: 'year', components: [{ year: 1570, entities: [] }] } }], rejects: '受けない日付の形' },
  { name: '年の calendar が CE-year', records: [{ ...ok, time: { ...Y(1570), calendar: 'CE-year' } }], rejects: 'year-window' },
  { name: 'その月に無い日', records: [{ ...ok, time: D(1570, 6, 31) }], rejects: 'その月に無い日' },
  { name: '存在しない閏月', records: [{ ...ok, time: D(1570, 6, 5, true) }], rejects: '暦の表に無い月' },
  { name: '暦の表で両端を出せない年', records: [{ ...ok, time: Y(1623), id: 'control:x-1623-1' }], rejects: '両端を出せない年' },
  { name: '逆転した期間', records: [obs(1, P(d72, d70), 'held', { holder: A })], rejects: '始まりが終わりより後' },
];

const warns = [
  { name: '同じ日のつながらない変化 2 件は、拒まず警告', records: [chg(1, d70, A, B), chg(2, d70, C, B)], warns: 'つながらない変化' },
];

module.exports = { derive, rejects, warns, clanKeys: new Set(['aaa', 'bbb', 'ccc']), nodeIds: new Set(['node:x']), sources: new Set(['srcA']), claimIds: new Set(['claim-1']), D, Y };
