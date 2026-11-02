/* 旧候補を消さず、独立地点の記号誤読を訂正して内陸図を検証する。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'../..'),dir=path.join(root,'data/inputs/rokujurigo-review');
const old=JSON.parse(fs.readFileSync(path.join(dir,'registration-candidate.json'))),m=old.matrixLocalMetresToPixels,c=old.independentControls[0],pixel=[378,901],residual=Math.hypot(c.predictedPixel[0]-pixel[0],c.predictedPixel[1]-pixel[1]);
assert.ok(residual<8,'independent station symbol tolerance');
const result={status:'accepted-inland-sheet',previousCandidate:'registration-candidate.json',reason:'旧[352,904]は長崎の地名・市街部分で、鉄道上の駅記号ではなかった。原図を4倍表示し、鉄道上の駅記号の中心を[378,901]と再読。図記号の8px幅を保持する。',control:{...c,sourcePixel:pixel,residualPixels:residual,accepted:true},fitControls:old.controls,origin:old.origin,matrixLocalMetresToPixels:m,inlandRuns:old.inlandCandidateRuns,limits:'1:200000の現地調査図に示す旧街道の概略。現代駅を登録基準に用いる。ゲーム年代の全線中心線・道幅を保証しない。庄内側の登録・接合は別に検証する。'};
fs.writeFileSync(path.join(dir,'inland-registration-accepted.json'),JSON.stringify(result,null,2)+'\n');console.log({independentResidualPixels:residual,vertices:result.inlandRuns[0].length});
const target=path.join(root,'game/modern-road-reference.js'),marker='/* rokujurigo-inland-reference:',begin=marker+'start */',end=marker+'end */',line=composeRoad(result),block=begin+'\nTK.MODERN_ROAD_REFERENCE["六十里越街道"]='+JSON.stringify(line)+';\n'+end;
let source=fs.readFileSync(target,'utf8');const start=source.indexOf(begin),finish=source.indexOf(end);source=start<0?source+'\n'+block+'\n':source.slice(0,start)+block+source.slice(finish+end.length);fs.writeFileSync(target,source);

function composeRoad(inland){
 const {TK}=require('../checks/history-focus.cjs').model(),shonai=JSON.parse(fs.readFileSync(path.join(dir,'shonai-registration-accepted.json'))),north=JSON.parse(fs.readFileSync(path.join(dir,'connection-north.json'))),south=JSON.parse(fs.readFileSync(path.join(dir,'connection-south.json'))),a=TK.cleanReferenceExcursions(north.response.routes[0].geometry.coordinates),b=TK.cleanReferenceExcursions(south.response.routes[0].geometry.coordinates);
 const chunks=[[[139.83,38.73]],a.points,...shonai.runs,inland.inlandRuns[0],b.points,[[140.33,38.25]]],points=[];
 for(const chunk of chunks)for(const p of chunk)if(!points.length||p[0]!==points.at(-1)[0]||p[1]!==points.at(-1)[1])points.push(p);
 fs.writeFileSync(path.join(dir,'composite-road-review.json'),JSON.stringify({status:'mixed-source-partial',vertices:points.length,mappedVertices:shonai.vertices+inland.inlandRuns[0].length,northRemovedExcursions:a.excursions,southRemovedExcursions:b.excursions,sourceGaps:shonai.gaps,seam:{from:shonai.runs.at(-1).at(-1),to:inland.inlandRuns[0][0],basis:'図外の接続は概略。現代歩行候補29.487kmは過大迂回のため不採用。'},sources:['rokujurigoSakata','rokujurigoInlandMap','rokujurigoShonaiMap','rokujurigoApproachReference']},null,2)+'\n');return points;
}
