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

本番ビルド時のみ `base: '/RiseofGethering/'` が適用されます。ローカル開発（`npm run dev`）では `/` です。

リポジトリ名を変える場合は `vite.config.ts` の `base` も変更してください。

## 5. ローカルで Pages 相当を確認

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
