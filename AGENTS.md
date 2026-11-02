# リポジトリの作業指示

## 文書・PR・レビューの言語

- PRのタイトル・説明、レビュー、IssueやPRへのコメント、作業報告は日本語を基本とする。利用者が別の言語を指定した場合はその指定を優先する。
- コード識別子、ファイル名、コマンド、API名、ログやエラーの引用は原文を保持し、説明を日本語で添える。
- `README.md`は日本語、`README.en.md`は英語とし、冒頭に相互リンクを置く。仕様・手順・制約を更新するときは両方を同じ変更で同期する。
- READMEの大見出しは「概要・主な機能と制約・導入と使い方・サポートと関連資料・開発と貢献」の順に揃え、英語版も対応する5項目にする。
- READMEの概要、特徴、開始手順、問い合わせ先、貢献方法は実装と既存文書に基づいて記載する。未実装・未検証の機能を利用可能と説明しない。
- 言語の統一を理由に既存のコミット履歴や他者のコメントを書き換えない。投稿・コミット・pushの許可は別途の作業指示に従う。

## コミット

原則は「公式の仕様・ガイドに最大限従う」こと。独自の決まりは作らない。根拠は git の `git-commit` マニュアル（DISCUSSION）、`git-interpret-trailers`、GitHub Docs「Creating a commit with multiple authors」。

- 作者は `masudaso <258961222+masuda-so@users.noreply.github.com>`（GitHub の noreply アドレス）、SSH署名あり（グローバル設定 `commit.gpgsign=true`）。
- メッセージの形は git の公式ガイドどおり：1行目は要約で50文字以内を目安、空行、本文（何を・なぜ）、空行、トレーラー。本文は72桁前後で折り返す。文字コードは UTF-8。
- 日時をそろえるのは初回コミットだけ（本人の指定）。初回コミットはその日の `00:00:00 +0900` を `GIT_AUTHOR_DATE` と `GIT_COMMITTER_DATE` の両方に指定する。2回目以降は実際の日時のままでよい。
- AI が内容を書いた場合は、GitHub 公式の書式で関わったエージェントごとに1行ずつ付ける。`git commit --trailer` で付けると書式が崩れない。大文字小文字は公式どおり `Co-authored-by:`。
  - `Co-authored-by: Codex <noreply@openai.com>`
  - `Co-authored-by: Claude Fable 5.1 <noreply@anthropic.com>`（モデル名は作業したものに合わせる）
  - 実際に関わったものだけを付ける。両方なら両方、どちらもなければ付けない。
- 公開済みの履歴は書き換えない（`git-commit` マニュアルの注意どおり）。やむを得ず書き換えるときは本人が判断し、`--force-with-lease` を使う。
- ライセンスは MIT（`LICENSE`、著作権表記は `So Masuda`）。新しいファイルもこれに従う。

## このリポジトリ固有の取り決め

- 1560〜1615年の日本・朝鮮を舞台にした地図ゲーム。`game/` はビルド不要の素のHTML/JavaScriptで、読込順は `game/index.html` に従う。
- 作業の前に [HANDOFF.md](HANDOFF.md) を読む。文書の入口は [docs/README.md](docs/README.md)、残要望と分担は [docs/work/README.md](docs/work/README.md)。
- サーバーの起動・停止は利用者のみが行う。実画面の検証は起動済みの `http://localhost:8000/index.html` に専用の一時ブラウザで接続する。
- 変更に応じた検査を [tools/checks/README.md](tools/checks/README.md) の手順で実行する。サーバー不要の基本確認は `node tools/checks/offline.cjs`。
- 史実観察を優先し、自由攻城・非史実ルートは保留のまま扱う。根拠のない動きや文章をプレイ画面へ出さない。
