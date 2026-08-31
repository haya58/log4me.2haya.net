# log4me.2haya.net

Discord Bot から記事を投稿する個人静的サイト。

## ローカル開発

```bash
cd site
npm install
npm run dev
```

`npm run dev` でビルド後に `npx serve dist` が起動し、`http://localhost:3000` で確認できる。

## ビルド

```bash
cd site
npm run build
```

`site/dist` に静的ファイルが生成される。

## 型チェック

```bash
cd site
npm run check
```

## デプロイ

GitHub Actions により Cloudflare Pages に自動デプロイされる。

- PR 作成時: Preview Deploy
- main push 時: Production Deploy

## CSS

[Sakura](https://oxal.org/projects/sakura/) を使用している（classless CSS フレームワーク）。
