/* 地形差替えで本州が消える不具合、折点の移動、塩津潟の水域誤表示を検査。 */
const assert=require('node:assert/strict');
const {G,TK,TKGEO}=require('./history-focus.cjs').model();
assert.equal(TK.HISTORIC_WATERS.length,4);
assert.equal(TK.HISTORIC_WATERS.find(w=>w.id==='shiunji').poly,undefined);
assert.ok(!TKGEO.lakes.some(([r])=>r[0]===1645.8&&r[1]===751.4));
for(const water of TK.HISTORIC_WATERS){assert.ok(!TKGEO.lakes.includes(water.poly),'uncertain historical water must be separate');assert.ok(TK.RESEARCH_SOURCES['water-'+water.id]);}
assert.equal(TK.HISTORIC_WATERS.find(w=>w.id==='minuma').kind,'marsh');
function inside([x,y],ring){let yes=false;for(let i=0,j=ring.length-2;i<ring.length;j=i,i+=2){const a=[ring[i],ring[i+1]],b=[ring[j],ring[j+1]];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
for(const [name,lon,lat] of [['仙台',140.87,38.26],['東京',139.75,35.70],['名古屋',136.90,35.18],['京都',135.77,35.01],['広島',132.46,34.40],['高知',133.53,33.56],['鹿児島',130.55,31.60],['函館',140.73,41.78],['漢城',126.98,37.57]]){
 assert.ok(TKGEO.land.some(p=>inside(G.PJ(lon,lat),p[0])),name+' must remain land');
 if(lon>132)assert.ok(TKGEO.japanLand.some(p=>inside(G.PJ(lon,lat),p[0])),name+' must retain Japanese relief');
}
for(const name of ['美濃路','京・大津道']){const raw=TK.ROADS.find(r=>r[0]===name)[1],r=G.ROADS.find(r=>r.name===name);for(const p of raw){const q=G.PJ(...p);assert.ok(r.pts.some(v=>Math.hypot(v[0]-q[0],v[1]-q[1])<1e-8),name+' waypoint shifted');}assert.deepEqual(Array.from(r.pts[0]),Array.from(G.PJ(...raw[0])));assert.deepEqual(Array.from(r.pts.at(-1)),Array.from(G.PJ(...raw.at(-1))));}
for(const point of require('../../data/verification/shiunji/land-points.json').points){
 const location=G.PJ(point.longitude,point.latitude);
 assert.ok(!TKGEO.lakes.some(poly=>poly.reduce((wet,ring)=>wet!==inside(location,ring),false)),point.id+' must not be inside a solid lake');
}
const shibata=TKGEO.terr.shibata[0];
const inShibata=point=>shibata.reduce((included,ring)=>included!==inside(point,ring),false);
assert.ok(inShibata([1638,755]),'old Shiunji cutout must not leave an unpainted land patch');
assert.ok(!inShibata([1626,773]),'other lagoon cutout must remain');
console.log('PASS: land anchors, revised road waypoints and Shiunji land points');
