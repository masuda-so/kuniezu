/* Python標準ライブラリのみ。一時フォルダで再生成順を変え、作業ツリーを変更しない。 */
const {spawnSync}=require('node:child_process'),path=require('node:path');
const result=spawnSync(process.env.PYTHON||'python3',['-m','unittest','tests.test_road_regeneration'],{cwd:path.resolve(__dirname,'../..'),stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
