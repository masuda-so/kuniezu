# Battle scale source survey

111 battles;109 geographic and2 schematic;0 survey errors. The compact JSON is89500 bytes. Source hashes are fixed and checked again after measurement. No game/source files changed.

## Interpretation

- No small/medium/large thresholds or labels are assigned. This is input for a later user decision.
- allTime is the sampled union across replay, not a simultaneous formation. maxInstant uses only units visible at that same instant.
- recorded/estimatedMotion/estimatedPlacement follow runtime positionBasis. Recorded means tagged in the current code, not independently verified historical coordinates. sourceAnchors and phaseReference are separate.
- Normalized replay0..100 is sampled every1 plus window/declared boundaries; it is not a calendar date. Sampled maxima can miss continuous extrema.
- Distances use actual longitude/latitude great-circle km(radius6371.0088). This diagnostic spherical approximation and3decimal output do not establish historical precision.
- No active game save is assumed. Opponent-home-dependent fallback is disabled. Estimated motion/placement can differ in a running save; do not use it as a historical scale measurement.
- Schematic geographic metrics are null, never0km. Empty/unplaced geometry is also null. A0 for a single recorded point only means zero measured spread of available points, not a tiny historical battle.
- Known troop sums omit unknown unit tr values; unknown is not0. Unplaced counts refer to runtime visibility/placement, not proof the troops did not participate.

## Reproduce

Run survey.cjs with BATTLE_ATLAS_CANDIDATE pointing at the fixed current battle-atlas.js. The script uses the existing lightweight Canvas fixture, samples unitStates without full frame rendering, and preserves actual atlas bounds. It outputs summary.json in this packet directory. No browser, terrain image decoding, server or historical game simulation is run. Exact script/JS hashes allow drift checks.

|Battle|Mode|Units|All-time width x height km|Sampled max pair km|One-instant max pair km|Never located|
|---|---|---:|---|---:|---:|---:|
|桶狭間の戦い|geographic|10|2.975 x 2.989|3.481|3.481|0|
|第四次川中島の戦い|geographic|10|2.811 x 2.791|3.22|2.833|1|
|長篠の戦い|geographic|14|6.369 x 1.455|6.369|6.186|0|
|関ヶ原の戦い|geographic|45|9.462 x 5.003|10.703|10.703|0|
|姉川の戦い|geographic|8|1.71 x 1.369|1.883|1.616|0|
|三方ヶ原の戦い|geographic|10|1.572 x 1.608|1.896|1.896|0|
|本能寺の変|geographic|7|1.553 x 1.422|1.702|1.582|0|
|山崎の戦い|geographic|10|1.55 x 3.447|3.71|2.934|0|
|賤ヶ岳の戦い|geographic|8|3.455 x 6.859|7.239|6.232|0|
|小牧・長久手の戦い|geographic|9|15.864 x 15.734|19.697|19.024|0|
|耳川の戦い|geographic|8|3.052 x 7.988|8.053|7.181|0|
|沖田畷の戦い|geographic|6|1.53 x 3.173|3.441|3.208|0|
|第一次上田合戦|geographic|5|4.117 x 2.382|4.264|4.264|0|
|摺上原の戦い|geographic|7|3.172 x 0.734|3.181|2.889|0|
|小田原征伐|geographic|7|4.087 x 2.335|4.345|4.125|3|
|大坂夏の陣|geographic|10|2.53 x 5.292|5.498|4.886|0|
|大坂冬の陣|geographic|17|6.218 x 3.944|6.811|6.811|3|
|伏見城の戦い|schematic|11|unknown|unknown|unknown|not-geographic|
|大津城の戦い|geographic|3|1.095 x 0.491|1.2|1.2|0|
|第二次上田合戦|geographic|6|1.864 x 2.13|2.83|2.83|0|
|田辺城の戦い|geographic|5|1.145 x 1.399|1.73|1.73|0|
|長谷堂城の戦い|geographic|2|1.424 x 1.045|1.501|1.374|0|
|高遠城の戦い|geographic|2|1.464 x 0.116|1.468|1.468|0|
|長尾景虎の関東出兵|geographic|2|0.542 x 0.225|0.587|0.587|0|
|小田原城の戦い|geographic|2|1.468 x 0|1.468|1.468|0|
|牛久保城攻め|geographic|2|1.259 x 0|1.259|1.259|0|
|森部の戦い|geographic|3|0 x 0|0|0|0|
|第二次国府台合戦|geographic|2|1.762 x 0|1.762|1.762|0|
|三河平定|geographic|3|0 x 0|0|0|0|
|永禄の変|geographic|6|1.762 x 0.881|1.762|1.762|0|
|箕輪城落城|geographic|2|1.468 x 0|1.468|1.468|0|
|月山富田城開城|geographic|2|1.561 x 1.338|2.056|2.056|0|
|休松の戦い|geographic|2|2.937 x 0|2.937|2.937|0|
|稲葉山城の戦い|geographic|2|1.259 x 0|1.259|1.259|0|
|信長上洛|geographic|4|1.037 x 0.691|1.246|1.236|1|
|掛川城開城|geographic|3|1.888 x 0|1.888|1.888|0|
|大河内城の戦い|geographic|3|1.187 x 1.302|1.762|1.762|0|
|三増峠の戦い|geographic|3|0 x 0|0|0|0|
|手這坂の戦い|geographic|2|0 x 0|0|0|0|
|金ヶ崎の退き口|geographic|4|2.516 x 0|2.516|2.516|2|
|石山合戦はじまる|geographic|2|0 x 0|0|0|0|
|木崎原の戦い|geographic|2|3.805 x 1.808|3.92|3.92|0|
|朝倉氏滅亡|geographic|2|15.721 x 0|15.721|15.721|0|
|小谷城落城|geographic|2|1.468 x 0|1.468|1.468|0|
|長島一向一揆の平定|geographic|2|3.776 x 0|3.776|3.776|0|
|備中兵乱|geographic|2|0.913 x 5.004|5.086|5.086|0|
|四万十川の戦い|geographic|2|1.493 x 0.222|1.509|1.509|0|
|天王寺の戦い|geographic|2|2.056 x 0|2.056|2.056|0|
|第一次木津川口の戦い|geographic|2|0 x 0|0|0|0|
|七尾城の戦い|geographic|2|1.762 x 0|1.762|1.762|0|
|手取川の戦い|geographic|2|0 x 0|0|0|0|
|信貴山城の戦い|geographic|6|1.468 x 2.072|2.072|2.072|0|
|中国攻め|geographic|2|14.684 x 0|14.684|14.684|0|
|御館の乱|geographic|2|2.659 x 2.335|3.538|3.538|0|
|上月城の戦い|geographic|6|2.932 x 3.315|3.315|3.315|0|
|第二次木津川口の戦い|geographic|2|0 x 0|0|0|0|
|丹波・丹後平定|geographic|4|0 x 0|0|0|0|
|有岡城の戦い|geographic|6|0.582 x 1.269|1.396|1.396|0|
|三木の干殺し|geographic|5|0.295 x 3.729|3.729|3.729|0|
|高天神城の戦い|geographic|6|3.245 x 6.826|7.164|7.164|2|
|天正伊賀の乱|geographic|2|6.293 x 0|6.293|6.293|0|
|鳥取の渇え殺し|geographic|2|2.987 x 0.334|3.005|3.005|0|
|甲州征伐|geographic|2|32.766 x 10.769|34.49|34.49|0|
|備中高松城の水攻め|geographic|2|0.555 x 0.753|0.935|0.935|0|
|神流川の戦い|geographic|2|0 x 0|0|0|0|
|若神子の対陣|geographic|2|0.112 x 6.655|6.656|6.656|0|
|中富川の戦い|geographic|2|0 x 0|0|0|0|
|黒駒合戦|geographic|2|1.989 x 2.224|2.984|2.984|0|
|岐阜城の開城|geographic|2|1.678 x 0|1.678|1.678|0|
|松ヶ島城の戦い|geographic|2|1.678 x 0|1.678|1.678|0|
|紀州征伐|geographic|3|13.139 x 12.676|15.391|15.391|0|
|宇喜多勢の讃岐攻め|geographic|2|8.38 x 0|8.38|8.38|0|
|小早川隆景の伊予攻め|geographic|2|12.583 x 0|12.583|12.583|0|
|四国攻め|geographic|2|13.081 x 6.227|14.487|14.487|0|
|富山の役|geographic|2|5.244 x 0|5.244|5.244|0|
|人取橋の戦い|geographic|2|0 x 0|0|0|0|
|岩屋城の戦い|geographic|2|0.854 x 1.195|1.468|1.468|0|
|戸次川の戦い|geographic|5|0 x 0|0|0|0|
|九州平定|geographic|3|9.413 x 95.739|96.201|96.201|0|
|根白坂の戦い|geographic|2|2.937 x 0|2.937|2.937|0|
|新発田城落城|geographic|2|1.049 x 0|1.049|1.049|0|
|韮山城の戦い|geographic|2|1.762 x 0|1.762|1.762|0|
|北国勢の上野攻め|geographic|3|1.047 x 0.487|1.155|1.141|0|
|鉢形城の開城|geographic|3|1.762 x 0.766|1.803|1.803|0|
|小田原開城|geographic|4|0.492 x 6.215|6.215|6.215|0|
|文禄の役|geographic|3|1.612 x 1.71|2.35|2.35|0|
|尚州の戦い|geographic|2|0.703 x 1.405|1.47|1.335|0|
|忠州の戦い|geographic|2|0.888 x 1.557|1.792|1.792|0|
|玉浦海戦|geographic|2|0 x 0|0|0|0|
|閑山島海戦|geographic|4|0 x 0|0|0|0|
|第一次晋州城の戦い|geographic|3|1.762 x 0.766|1.803|1.803|0|
|平壌の戦い|geographic|3|3.818 x 1.66|3.907|3.907|0|
|碧蹄館の戦い|geographic|5|0.352 x 2.669|2.692|2.692|0|
|幸州山城の戦い|geographic|7|2.123 x 1.664|2.132|2.123|0|
|第二次晋州城の戦い|geographic|4|1.762 x 0.766|1.803|1.803|0|
|慶長の役・漆川梁海戦|geographic|7|2.937 x 5.801|5.801|5.801|0|
|南原城の戦い|geographic|14|2.056 x 2.901|2.901|2.901|0|
|鳴梁海戦|geographic|2|0 x 0|0|0|0|
|蔚山城の戦い|geographic|4|1.864 x 2.13|2.56|2.56|0|
|露梁海戦|geographic|7|0 x 0|0|0|1|
|会津征伐|geographic|2|43.736 x 0|43.736|43.736|0|
|浅井畷の戦い|geographic|2|0 x 0|0|0|0|
|岐阜城の戦い|geographic|3|0.394 x 4.972|4.972|4.972|0|
|安濃津城の戦い|geographic|7|0 x 0|0|0|4|
|石垣原の戦い|geographic|5|0 x 0|0|0|1|
|佐和山城落城|geographic|3|1.049 x 0|1.049|1.049|0|
|木津川口の戦い|schematic|4|unknown|unknown|unknown|not-geographic|
|今福・鴫野の戦い|geographic|6|0.731 x 1.446|1.62|1.62|0|
|真田丸の戦い|geographic|4|0.839 x 1.657|1.657|1.657|0|
|道明寺の戦い|geographic|5|1.648 x 1.001|1.707|1.707|0|
|八尾・若江の戦い|geographic|4|1.189 x 3.113|3.333|3.333|0|
