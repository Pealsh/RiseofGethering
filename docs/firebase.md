# Firebase 設定

## 1. プロジェクト作成

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. Firestore Database を有効化（本番モード推奨）
3. Web アプリを追加して設定値を取得

## 2. 環境変数

`.env.local` に設定:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## 3. セキュリティルール

Firestore → ルール に `firestore.rules` の内容を貼り付けて公開してください。

## 4. データ構造

```
users / {username}
schedules / {username} / dates / {YYYY-MM-DD}
```

```json
{
  "userId": "username",
  "date": "2026-06-15",
  "timetable": [0, 0, 1, 1, 0, ...]
}
```

`timetable` は 0〜23時の24要素（0=不参加, 1=参加）。

## 5. トラブルシューティング

### Missing or insufficient permissions

→ セキュリティルールが未設定です。`firestore.rules` を公開してください。

### 登録しているのに集結で0人

1. ブラウザのコンソール（F12）でエラー確認
2. Firestore に `schedules/{username}/dates/{date}` が存在するか確認
3. 画面下部の「同期済み」表示を確認
