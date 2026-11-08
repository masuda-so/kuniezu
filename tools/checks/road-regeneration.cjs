/* Python標準ライブラリとNode。一時フォルダで直接編集の保持とメタデータ再生成を確認する。 */
const {spawnSync}=require('node:child_process'),path=require('node:path');
const result=spawnSync(process.env.PYTHON||'python3',['-m','unittest','tests.test_road_regeneration'],{cwd:path.resolve(__dirname,'../..'),stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
