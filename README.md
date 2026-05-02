# 静的小説サイト

GitHub Pagesにそのまま置ける、日本語小説向けの静的サイトです。

## できること

- 縦書き / 横書き切替
- ルビ記法 `｜漢字《かんじ》` の表示
- 縦書き時の縦中横表示
- ライト / ダークモード切替
- 文字サイズ変更
- 見出しから自動目次生成
- 読書位置の簡易保存

## ファイル構成

```txt
.
├── index.html
├── .nojekyll
├── assets/
│   ├── app.js
│   └── styles.css
└── data/
    ├── metadata.json
    └── novel.txt
```

## まず編集するファイル

### `data/metadata.json`

タイトル、著者名、説明文を入れます。

```json
{
  "title": "小説タイトル",
  "author": "著者名",
  "description": "作品紹介文"
}
```

### `data/novel.txt`

本文を入れます。

```txt
# 第一章　タイトル

ここに本文を書きます。
｜漢字《かんじ》 のように書くとルビになります。

---

# 第二章　タイトル
```

- `# 見出し` は目次に出ます。
- 空行で段落が分かれます。
- `---` だけの行は区切り線になります。
- ルビは `｜漢字《かんじ》` の形式です。

## GitHub Pagesで公開する手順

1. このフォルダの中身をGitHubの新しいリポジトリにアップロードします。
2. GitHubでリポジトリを開きます。
3. `Settings` → `Pages` を開きます。
4. `Build and deployment` の `Source` を `Deploy from a branch` にします。
5. `Branch` を `main`、フォルダを `/ (root)` にして保存します。
6. 少し待つと、GitHub PagesのURLが表示されます。

## 注意

- PCで `index.html` を直接開くと、ブラウザの制限で `data/novel.txt` を読み込めない場合があります。
- GitHub Pages上では通常どおり動きます。
- 8万〜9万字程度なら、1つの `novel.txt` で問題なく扱える想定です。
- 章ごとにファイル分割したい場合は、`app.js` を少し変更すると対応できます。
