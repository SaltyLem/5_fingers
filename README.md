# 5 Fingers

チームの今日の調子を指の数（1〜5）で共有するリアルタイムチェックインツール。

## 機能

- ルームの作成・参加（URLで共有）
- 1〜5の指で今日の調子を回答
- 複数行コメント（画像・リンク対応）
- 画像はドラッグ&ドロップ / ペーストで追加
- リアルタイムポーリング（2秒間隔）
- 30分でデータ自動削除
- ルームの手動クローズ
- 名前はブラウザに永続保存（localStorage）

## 技術スタック

- [Next.js](https://nextjs.org/) (App Router)
- [Tailwind CSS](https://tailwindcss.com/)
- [Upstash Redis](https://upstash.com/) (データストア)
- [Vercel](https://vercel.com/) (ホスティング)

## セットアップ

```bash
npm install
```

`.env.local` に以下を設定：

```
UPSTASH_REDIS_REST_URL=your_url
UPSTASH_REDIS_REST_TOKEN=your_token
```

```bash
npm run dev
```

## デプロイ

Vercelにデプロイし、環境変数に `UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` を設定する。
