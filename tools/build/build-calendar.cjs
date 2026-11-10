'use strict';
// 元データの西暦は先発グレゴリオ暦。ゲームの改暦前ユリウス暦へ直接渡さない。
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const input=path.join(root,'data/inputs/japanese-calendar');
const manifest=JSON.parse(fs.readFileSync(path.join(input,'manifest.json'),'utf8'));
const raw=fs.readFileSync(path.join(input,'month-starts.tsv'));
assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),manifest.subsetSha256);
const starts=[],lookup=new Map();
for(const line of raw.toString('utf8').trimEnd().split('\n')){
  const m=line.match(/^(\d{4})-(\d{2})-(\d{2})\t(\d{4})-(\d{2})(')?-01$/);
  assert.ok(m,'Invalid month-start row');
  const [,y,month,day,ly,lm,leap]=m;
  const jd=Math.floor(Date.UTC(+y,+month-1,+day)/86400000)+2440588;
  const row=[+ly,+lm,leap?1:0,jd],key=row.slice(0,3).join('/');
  assert.ok(!lookup.has(key),'Duplicate lunisolar month');
  if(starts.length)assert.ok([29,30].includes(jd-starts.at(-1)[3]),'Invalid month length');
  starts.push(row);lookup.set(key,jd);
}
const legacy=JSON.parse(fs.readFileSync(path.join(input,'legacy-month-starts.json'),'utf8'));
assert.equal(legacy.m.length,manifest.legacy.months);
for(const [y,m,l,offset] of legacy.m)assert.equal(lookup.get([y,m,l].join('/')),legacy.j0+offset,'Existing date changed');
const j0=starts[0][3],months=starts.map(([y,m,l,jd])=>[y,m,l,jd-j0]);
const output='"use strict";\n/* ===== 旧暦（宣明暦）の暦日 =====\n'+
  '   manakai/data-locale の固定版から生成。出典と利用条件は data/inputs/japanese-calendar/。\n'+
  '   生成: node tools/build/build-calendar.cjs（実行時の通信なし）。\n'+
  '   KOYOMI.j0：最初の月の朔日のユリウス通日。m：[年, 月, 閏(1), 朔日のユリウス通日との差] */\n'+
  'window.TK=window.TK||{};\nTK.KOYOMI={j0:'+j0+',m:'+JSON.stringify(months)+'};\n';
const target=path.join(root,'kuniezu/static/kuniezu/koyomi.js');
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8'),output,'Run build-calendar.cjs');
else fs.writeFileSync(target,output);
console.log('PASS: '+months.length+' consecutive month starts; '+legacy.m.length+' existing absolute dates preserved');
