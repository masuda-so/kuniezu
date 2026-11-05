/* ゲームのページ（kuniezu/templates/index.html）を Node の道具から読む。
   Django が埋めるのは <base> の URL だけなので、同じ 4 つのタグを埋めれば同じ HTML になる
   （テンプレートにこの 4 つ以外の記法が無いことは tests/test_game_page.py が確かめる）。 */
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const ROOT=path.resolve(__dirname,'../..'),TEMPLATE='kuniezu/templates/index.html',STATIC='kuniezu/static/kuniezu',STATIC_URL='/static/kuniezu/';
/* root の作業ツリーのページを、<base> を base に向けて描く。既定は Django と同じ /static/kuniezu/。 */
function render(root=ROOT,base=STATIC_URL){
  const html=fs.readFileSync(path.join(root,TEMPLATE),'utf8');
  const out=html.replace('{% load static %}','').replace("{% static 'kuniezu/' %}",base).replace('{% verbatim %}','').replace('{% endverbatim %}','');
  const left=out.match(/{%.*?%}|{{.*?}}|{#.*?#}/);
  if(left)throw new Error(TEMPLATE+' に、この道具が知らないテンプレートの記法がある: '+left[0]);
  return out;
}
/* サーバーなしで開くページ。<base> を静的ファイルのフォルダに向けた HTML を dir に書き、その file URL を返す。 */
function writeLocalPage(dir,root=ROOT){
  const file=path.join(dir,'index.html');
  fs.writeFileSync(file,render(root,pathToFileURL(path.join(root,STATIC)).href+'/'));
  return pathToFileURL(file).href;
}
module.exports={TEMPLATE,STATIC,STATIC_URL,render,writeLocalPage};
