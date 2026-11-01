# 非史実ルートの保管

2026年10月31日の依頼により、現行版は史実観察専用とした。

`events.js` と `ai.js` は変更前の保管用で、`game/index.html` からは読み込まない。分岐・創作事件・AI生成を再開する際は、このファイルを戻すだけでなく、`history-mode.js` の制限と保存互換性を合わせて検討する。旧保存データを勝手に変換しない。

旧版の検証は `tools/checks/legacy-offline.cjs` と `legacy-browser.cjs` に保管した。現在の検証入口は `offline.cjs` と `browser.cjs`。
