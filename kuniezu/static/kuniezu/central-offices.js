"use strict";
/* 家の所属と、政権で担う役職は別の軸で保持する。 */
(function(){
 TK.RESEARCH_SOURCES.toyotomiOffices={"author": "白峰旬／別府大学史学研究会", "title": "『十六・七世紀イエズス会日本報告集』における五大老・五奉行に関する記載についての考察（その2）", "url": "https://ndlsearch.ndl.go.jp/books/R000000004-I026713046", "year": "2015年3月", "locator": "史学論叢45号17～36頁、国立国会図書館書誌の要約", "scope": "秀吉没後の五大老・五奉行の構成、利家死去後の利長。任命日の確定や政権内の全役職網羅ではない。", "accessed": "2026-11-01"};
 TK.CENTRAL_OFFICES=[
  ...['徳川家康','前田利家','毛利輝元','宇喜多秀家','上杉景勝','前田利長'].map(name=>({name,office:'五大老',polity:'豊臣政権',source:'toyotomiOffices'})),
  ...['石田三成','前田玄以','増田長盛','長束正家','浅野長政'].map(name=>({name,office:'五奉行',polity:'豊臣政権',source:'toyotomiOffices'}))
 ];
 G.centralOfficeRecords=function(){const s=G.S();if(!s)return [];const start=TK.HIST.find(e=>e.k==='death'&&/秀吉/.test(e.n||e.title||'')),end=TK.HIST.find(e=>e.title==='関ヶ原の戦い'&&e.k!=='premarch');if(!start||!end||s.t<G.evT(start)||s.t>=G.evT(end))return [];
  const death=TK.HIST.find(e=>e.k==='death'&&(e.n==='前田利家'||e.title==='前田利家の死')),succeeded=death&&s.t>=G.evT(death);
  return TK.CENTRAL_OFFICES.filter(r=>(r.name!=='前田利家'||!succeeded)&&(r.name!=='前田利長'||succeeded)).map(r=>({...r}));
 };
 G.centralOffice=name=>G.centralOfficeRecords().find(r=>r.name===name)||null;
})();
