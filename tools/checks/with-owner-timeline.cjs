/* 既存の検査を、城の持ち主の区間（fixtures/owners-trial.js）を読ませた model で流す。
   使い方：node tools/checks/with-owner-timeline.cjs tools/checks/castle-era-position.cjs
   公開版は史実 DB の書き出しを読むので、古い保存の移行がその年表でも動くことを確かめる（設計の項目 43）。 */
const path=require('node:path'),fs=require('node:fs');
const focus=require('./history-focus.cjs');
const trial=fs.readFileSync(path.join(__dirname,'fixtures/owners-trial.js'),'utf8');
const original=focus.model;
focus.model=(options={})=>original({...options,sourceOverrides:{'history/owners.js':trial,...(options.sourceOverrides||{})}});
const target=process.argv[2];if(!target){console.error('検査のファイルを指定する');process.exit(2);}
process.argv.splice(2,1);
require(path.resolve(target));
