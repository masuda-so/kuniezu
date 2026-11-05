"use strict";
/* 表示上の衝突だけを解く。軍勢の実座標・兵数は変更しない。 */
(function(root){
 function arrange(items,{width=1000,height=700,w=96,h=44,pad=5}={}){
  const boxes=[],out=[];
  for(const p of items){let x=p.x,y=p.y,found=false;
   const limit=Math.ceil(Math.max(width/(w+pad),height/(h+pad)))+2;
   for(let ring=0;ring<limit&&!found;ring++)for(let row=-ring;row<=ring&&!found;row++)for(let col=-ring;col<=ring;col++){
    if(Math.max(Math.abs(row),Math.abs(col))!==ring)continue;
    const nx=p.x+col*(w+pad),ny=p.y+row*(h+pad);
    if(nx<w/2+pad||nx>width-w/2-pad||ny<h/2+pad||ny>height-h/2-pad)continue;
    if(boxes.some(b=>Math.abs(nx-b.x)<w+pad&&Math.abs(ny-b.y)<h+pad))continue;
    x=nx;y=ny;found=true;break;
   }
   // 密集して画面に収まらない場合も、元の位置に重ねず縦に並べる。
   if(!found){x=Math.max(w/2+pad,Math.min(width-w/2-pad,p.x));y=height+h/2+out.length*(h+pad);}
   const q={...p,x,y,anchorX:p.x,anchorY:p.y};boxes.push(q);out.push(q);
  }
  return out;
 }
 function viewport(items,{left,top,width,height,w=100,h=86}){
  const inside=[],outside={left:[],right:[],top:[],bottom:[],more:[]};
  for(const p of items){const x=p.x-left,y=p.y-top;
   if(x>=0&&x<=width&&y>=0&&y<=height)inside.push({...p,x,y});
   else{const dx=(x-width/2)/(width/2),dy=(y-height/2)/(height/2);outside[Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'top':'bottom'].push(p);}}
  const visible=[];for(const p of arrange(inside,{width,height,w,h})){
   if(p.y+h/2>height||p.y-h/2<0||p.x-w/2<0||p.x+w/2>width){outside.more.push({...p,x:p.anchorX+left,y:p.anchorY+top});continue;}
   visible.push({...p,x:p.x+left,y:p.y+top,anchorX:p.anchorX+left,anchorY:p.anchorY+top});
  }return {visible,outside};
 }
 // 位置をずらさず、近接する軍を一つの地点札へまとめる。連鎖的に遠い隊まで吸収しない。
 function cluster(items,{left=0,top=0,width=1000,height=700,radius=46,zoom=1}={}){
  const visible=[],outside={left:[],right:[],top:[],bottom:[],more:[]};
  // 引いた地図では札をまとめ、拡大時は凸駒の衝突に必要な幅まで縮める。
  // 実位置が重なる隊は位置をずらさず、UI側で地点内の個別表示へ展開する。
  const detail=Math.max(1,Number.isFinite(zoom)?zoom:1),gapX=Math.max(64,Math.max(radius,104)/detail),gapY=Math.max(60,Math.max(radius,76)/detail);
  for(const p of items){const x=p.x-left,y=p.y-top;
   if(x<0||x>width||y<0||y>height){const dx=(x-width/2)/width,dy=(y-height/2)/height;outside[Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'top':'bottom'].push(p);continue;}
   const group=visible.find(q=>Math.abs(q.x-p.x)<gapX&&Math.abs(q.y-p.y)<gapY);
   if(group)group.members.push(p);else visible.push({...p,anchorX:p.x,anchorY:p.y,members:[p]});
  }return {visible,outside};
 }
 const api={arrange,viewport,cluster};if(typeof module!=='undefined')module.exports=api;root.TKLayout=api;
})(typeof window!=='undefined'?window:globalThis);
