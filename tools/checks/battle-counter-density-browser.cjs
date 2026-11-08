/* 既存の密集表示検査の入口。名札・肖像・個別選択の検査実装を共有する。 */
process.env.BATTLE_TEST_TITLES ||= '関ヶ原の戦い|設楽原の戦い|大坂冬の陣|大坂夏の陣|伏見城の戦い';
require('./battle-label-cards-browser.cjs');
