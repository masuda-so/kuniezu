# 設楽原の局地戦図検証

2026-11-08。専用Chrome、許可済み8000番へ候補だけを差し替えた。940px／335pxで親子遷移、11隊・3経過・日付、地形と連吾川、元14隊の保持、同じ地形のキャッシュ再利用、幅変更後の地理位置を確認。例外0件。finalとaspectでは、自軍・同日のキューだけ自動表示し、別日と北条家のキューを除外する検査も合格。aspectは東西・南北の縮尺を揃えた最終版。

`GAME_OVERRIDE_ROOT=<この作業ツリー> GAME_TEST_OUTPUT=data/verification/codex-shitaragahara-aspect node tools/checks/local-battle-scene-browser.cjs`

画像と詳細JSONはローカルに保持しGit対象外。検査は描画と時計・導線の整合を確認するもので、各隊の位置・兵数・再生パーセントの史実を新たに確定するものではない。
