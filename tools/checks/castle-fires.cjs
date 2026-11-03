const assert = require('node:assert/strict');
const {G, TK} = require('./history-focus.cjs').model();

G.newGame('s1560', 'oda');
assert.equal(G.castleFires().length, 0, 'older saves can omit the fire list');

const id = 'tsutsuji';
const construction = TK.JOKAKU.find(e => e.title === '新府城');
const fire = TK.JOKAKU.find(e => e.title === '新府城炎上');
const state = G.S();
state.castles[id].owner = 'takeda';
G.buildNow(id, construction, true);
const {x, y} = G.C[id];

state.t = G.evT(fire);
state.ji = TK.JOKAKU.indexOf(fire);
G.jokaku();

assert.equal(G.cname(id), '躑躅ヶ崎館');
assert.notEqual(G.C[id].x, x);
assert.equal(G.castleFires().length, 1);
const expected = {x, y, start: state.t, until: state.t + 3};

for (let day = 0; day < 3; day++) {
  G.setS(JSON.parse(JSON.stringify(G.S())));
  assert.deepEqual(G.castleFires()[0], expected);
  G.S().t++;
  G.jokaku();
}
assert.equal(G.castleFires().length, 0);
assert(G.S().ruins.some(ruin => ruin.n === '新府城' && ruin.x === x && ruin.y === y));

console.log('PASS: Shinpu fire stays at the old site through save/load and expires after three game days');
