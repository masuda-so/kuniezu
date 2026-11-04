# 公式の推奨と運用の照合（2026-11-04、Claude）

利用者の方針「公式の推奨が大前提。ブランチだけでなく、その他も公式の推奨どおりに運用する」に合わせ、変更が生まれてから main に入り公開されるまでの流れを 12 の領域に分け、GitHub・Git・Claude Code・Codex の公式文書と現状を照らした。領域は「作業の単位 → 作業場所 → 記録 → 提案 → 検査 → 取り込み → 保護 → 依存と安全 → 置くもの → 公開 → 文書 → エージェント」で、互いに重ならず、変更の流れを漏れなく覆う。

調べた時点のリポジトリ：masuda-so/kuniezu（公開、MIT）、既定ブランチ main、ルールセット「Baseline ruleset」（main：削除と強制 push の禁止、PR 必須・承認 0、必須チェック Offline checks（最新化は不要）、署名必須、管理者は PR 経由のみ迂回可）、タグの削除禁止のルールセット。

| # | 領域 | 公式の推奨 | 現状 | 差 | 直し方（区分） |
|---|---|---|---|---|---|
| 1 | 作業の単位 | 作業は Issue で追い、PR は閉じるキーワード（Closes #n）で Issue と結ぶ。キーワードは既定ブランチ宛ての PR だけで効く（[Linking a pull request to an issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue)） | Issue は 0 件。要望と担当は `docs/work/` と `tools/work/tasks.cjs` で管理 | あり | 利用者の要望を Issue にし、PR は Closes #n で結ぶ。`docs/work` は Issue と二重にならないよう役割を絞る（**利用者の判断**） |
| 2 | 作業場所 | 変更ごとに既定ブランチから短く分かりやすい名前のブランチを切る（[GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow)）。並行するエージェントは worktree で分ける（[Claude Code：worktrees](https://code.claude.com/docs/en/worktrees)、[Codex：Worktrees](https://developers.openai.com/codex/app/worktrees)） | Claude と Codex が同じ作業ツリーで共有ブランチ `integration/2026-11-02` に直接コミット。他者の未コミット変更が何度も混ざりかけた | あり | 1 作業＝main からの 1 ブランチ＝1 worktree。共有ブランチと共有の作業ツリーへの直接の書き込みをやめる（AGENTS.md に明記） |
| 3 | 記録（コミット） | Git 公式の書式、署名（[About commit signature verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification)）。AI の関与は `Co-authored-by:` | 全コミットが署名済み（G）。ただし Claude の 4 コミット（258e47d・957ddfe・68a3cf2・3395a47）が AGENTS.md の指定と違う `Co-Authored-By:` の大文字。要約行の言語が Claude は英語、Codex は日本語で揃っていない | 小 | 以後 `Co-authored-by:` に揃える（公開済みの履歴は書き換えない）。要約行の言語を AGENTS.md で一つに決める（**利用者の判断**） |
| 4 | 提案（PR） | 小さく一つの目的に絞った PR。目的・概要・関連の説明、提出前の自己レビュー。大きな変更は分ける（[Helping others review your changes](https://docs.github.com/en/pull-requests/concepts/helping-others-review-your-changes)） | PR #6 は 11/02 から開いたまま、1,390 ファイル・25.8 万行・100 コミット超で、地図・DB・合戦図など無関係な変更が混在 | あり | PR #6 を区切る（下の「PR #6 の扱い」）。以後は作業ごとの小さな PR |
| 5 | 審査（レビュー） | 保護ブランチで承認を必須にできる。1 人の所有者は自分の PR を承認できないので、承認 0 は個人の公開リポジトリでは妥当 | 承認 0。AI レビューの `claude-review` は全 PR で失敗（`ANTHROPIC_API_KEY` か `CLAUDE_CODE_OAUTH_TOKEN` が未設定） | あり | 公式の手順（Claude Code の `/install-github-app`）で認証を設定するか、使わないならワークフローを外す。鍵の登録は利用者が行う（**利用者の作業**） |
| 6 | 検査（CI） | 必須チェックの名前は一意に。最新化を求める（strict）と古いブランチでの非互換を防げる（[About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)）。Actions は SHA 固定、GITHUB_TOKEN は読み取り既定（[Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)） | Offline checks が必須。SHA 固定・`contents: read` 済み。本日、正本から地図を作る段を追加。strict は無効 | 小 | 小さな PR に切り替えた後、strict を有効にする（**設定、承認が要る**） |
| 7 | 取り込み（マージ） | マージ後にブランチを消す（GitHub flow）。署名必須のブランチでは、GitHub は「rebase and merge」の新しいコミットに署名できない（[About merge methods](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/about-merge-methods-on-github)、[Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)） | マージ後の自動削除は有効。許可するマージ方式は merge・squash・rebase の 3 つ | 小 | 許可を squash（と必要なら merge）に絞り、rebase を外す。1 PR＝main の 1 コミット（**設定、承認が要る**） |
| 8 | 保護（ルールセット） | ルールセットで削除・強制 push の禁止、PR・チェック・署名を必須に（[Managing rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository)） | すべて設定済み | なし | 維持 |
| 9 | 依存と安全 | Dependabot、秘密情報の走査と push 保護、コード走査 | Dependabot（Actions）と脆弱性更新、秘密情報の走査と push 保護、CodeQL が有効。Dependabot の PR #4 は削除済みの `tools/play` 宛てで開いたまま | 小 | PR #4 を閉じる（**利用者の承認**） |
| 10 | 置くもの | リポジトリは小さく保つ（理想 1GB 未満）。大きな二進ファイルは LFS かリリースに置く。生成物を含めない（[Best practices for repositories](https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories)） | 本日、地図の配信物を追跡から外し、標高は LFS。ただし追跡中のファイルは計約 1.3GB で、うち `data/verification/` の証拠画像が 648MB・727 ファイル | あり | 実画面の証拠は PR への添付か Actions の成果物に置き、リポジトリには要約の README だけを残す方針を決める（**利用者の判断**。公開済みの履歴は書き換えない） |
| 11 | 公開（版） | 区切りの版はタグとリリースで示す（[About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)） | タグ・リリースは 0 | 小 | PR #6 を main に入れた時点を最初の版にする（**利用者の判断**） |
| 12 | 文書 | README・LICENSE・CONTRIBUTING・行動規範・セキュリティ方針・Issue と PR の雛形。エージェントの指示は AGENTS.md（Codex）と CLAUDE.md（Claude Code） | README（日英）と LICENSE はリポジトリに、CONTRIBUTING・行動規範・SECURITY・SUPPORT・Issue と PR の雛形は組織の `.github` にあり、健全性 100%。CLAUDE.md は AGENTS.md を読み込む | なし | 維持。1〜11 の決定を AGENTS.md に反映する |

## 利用者の決定と対応（2026-11-04）

| 項目 | 決定 | 対応 |
|---|---|---|
| PR #6 | 区切って main へ | 説明を書き直し、Offline checks と CodeQL の成功を確かめて squash で取り込んだ（c2e0a07）。main の内容は統合ブランチの最後（198e26e）と一致。Draft PR #9 の base は main に付け替わった。統合ブランチのリモートからの削除は、自動の権限判定で止められたので利用者に委ねる |
| 2 作業場所・4 提案・7 取り込みの運用 | 公式どおり | AGENTS.md と README（日英）に GitHub flow・worktree・小さな PR・squash を明記（この PR） |
| 10 証拠画像 | PR と CI の成果物へ | 新しい画像・動画を `.gitignore` に入れ、コミットするのは結果の要約 README だけにした。既に追跡中の画像は履歴として残す（書き換えない）。CI での実画面検査と成果物の保存は未整備 |
| 5・6・7・9 のリポジトリ設定、1 Issues への移行、11 版 | 利用者が持つほかのプロジェクトも含めて、上位のセッションでまとめて対応 | 下の依頼文を渡す。このリポジトリの設定はここでは変えていない |
| 3 要約行の言語 | 未定 | 上位のセッションの統一方針に合わせる |

## 上位のセッションへの依頼文（このリポジトリの分）

masuda-so/kuniezu（公開・MIT、既定ブランチ main）を、GitHub の公式の推奨に合わせて設定してほしい。現状と推奨の照合は `docs/reports/OFFICIAL_PRACTICES_AUDIT.md`。
- マージ方式：ルールセット「Baseline ruleset」の allowed_merge_methods とリポジトリ設定から rebase を外す（main は署名必須で、GitHub は rebase の新しいコミットに署名できない）。squash を標準にする。
- 必須チェック：`Offline checks` を strict（ブランチが main に追いついていること）にする。
- AI レビュー：`.github/workflows/claude-code-review.yml` が `ANTHROPIC_API_KEY`／`CLAUDE_CODE_OAUTH_TOKEN` 未設定で全 PR で失敗している。公式の手順で認証を設定するか、ワークフローを外す。
- Dependabot：削除済みの `tools/play` 宛ての PR #4 を閉じる。
- 統合ブランチ `integration/2026-11-02` は PR #6 で取り込み済み。リモートから削除する。
- 作業管理：利用者の要望を GitHub Issues にし、PR は `Closes #n` で結ぶ。`docs/work/` と `tools/work/tasks.cjs` は Issue と重ならない役割（担当ファイルの宣言など）に絞るか廃止する。
- 版：main の区切りにタグとリリースを付けるか決める。
- 秘密情報の走査の追加項目（非プロバイダーのパターン、有効性の確認）を有効にするか決める。
