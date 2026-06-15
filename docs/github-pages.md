# GitHub Pages 公開手順

## 前提

- GitHub リポジトリ名: `RiseofGethering`（推奨）
- 公開 URL 例: `https://<ユーザー名>.github.io/RiseofGethering/`

## 1. リポジトリ設定

1. GitHub でリポジトリを作成（名前: `RiseofGethering`）
2. Settings → Pages → Build and deployment
3. Source: **GitHub Actions** を選択

## 2. Secrets 登録

Settings → Secrets and variables → Actions で以下を登録:

| Secret 名 | 内容 |
|-----------|------|
| `VITE_FIREBASE_API_KEY` | Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |

`.env.local` の値をそのままコピーしてください。

## 3. デプロイ

`main` ブランチに push すると `.github/workflows/deploy.yml` が自動実行されます。

```bash
git push origin main
```

Actions タブでビルドが成功すれば公開完了です。

## 4. vite.config.ts について

GitHub Actions ビルド時は **リポジトリ名から自動で base パスを設定** します。

例: リポジトリ名が `RiseofGethering` なら  
公開 URL は `https://<ユーザー名>.github.io/RiseofGethering/`

**URL の大文字小文字はリポジトリ名と完全一致が必要です。**

## 5. 404 / 画面が真っ黒になる場合

1. 正しい URL で開く（末尾の `/` 付き）  
   `https://<ユーザー名>.github.io/<リポジトリ名>/`
2. ブラウザの開発者ツール（F12）→ Network で 404 のファイルを確認
3. Actions の **Verify build output** ログで `index.html` のパスを確認
4. リポジトリ名を変えたあと、**もう一度 push** して Actions を再実行

## 6. ローカルで Pages 相当を確認

```bash
npm run build
npm run preview
```

## 6. README.md だけ表示される場合

**原因:** Pages の Source が「Deploy from a branch」になっている。

リポジトリのソース（README など）がそのまま公開され、React アプリは表示されません。

**対処:**

1. Settings → Pages → Build and deployment
2. Source を **GitHub Actions** に変更
3. `main` に push して Actions が成功するか確認
4. 公開 URL: `https://<ユーザー名>.github.io/RiseofGethering/`

リポジトリ名を変えた場合は `vite.config.ts` の `base` も同じ名前にしてください（現在: `/RiseofGethering/`）。
