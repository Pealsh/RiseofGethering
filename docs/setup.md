# ローカル開発

## 必要環境

- Node.js 20 以上
- npm

## 手順

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` に Firebase の設定値を入れてください。詳細は [firebase.md](./firebase.md) を参照。

## ビルド

```bash
npm run build
npm run preview
```

## カレンダー表示について

アプリは **今日から60日分** の日付を表示します。横スクロールで確認できます。

開きっぱなしでも **0時を過ぎると自動で日付が1日進み**、常に「今日から60日分」が表示されます。
