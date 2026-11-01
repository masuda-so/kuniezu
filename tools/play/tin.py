print(pg.evaluate("""(()=>{const PJ=(lon,lat)=>[(lon-129.2)*200*Math.cos(36*Math.PI/180),(41.75-lat)*200];const [x,y]=PJ(137.725,34.712);const out=[];
for(const id in TKGEO.terr){const T=TKGEO.terr[id];let c=false;for(const poly of T)for(const r of poly){for(let i=0,j=r.length-2;i<r.length;j=i,i+=2){const xi=r[i],yi=r[i+1],xj=r[j],yj=r[j+1];if(((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c;}}if(c)out.push(id);}
let inLand=false;return JSON.stringify({x,y,out,cpos:TKGEO.cpos.hikuma});})()"""))
