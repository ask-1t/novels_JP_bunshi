# 静的小説サイト

GitHub Pagesにそのまま置ける、日本語小説向けの静的サイトです。

## できること

- 縦書き / 横書き切替
- ルビ記法 `｜漢字《かんじ》` の表示
- 縦書き時の縦中横表示
- ライト / ダークモード切替
- 文字サイズスライダー
- 章分割された本文の読み込み
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
    ├── chapters.json
    ├── novel.txt        # 予備。通常は使いません
    └── chapters/
        ├── 01.txt
        ├── 02.txt
        ├── 03.txt
        ├── 04.txt
        ├── 05.txt
        ├── 06.txt
        ├── 07.txt
        ├── 08.txt
        └── 09.txt
```

## 9分割した本文の入れ方

9個の本文ファイルを、次の名前にそろえて `data/chapters/` に入れてください。

```txt
01.txt
02.txt
03.txt
04.txt
05.txt
06.txt
07.txt
08.txt
09.txt
```

章タイトルは `data/chapters.json` で管理できます。

```json
[
  { "title": "第一章　タイトル", "file": "chapters/01.txt" },
  { "title": "第二章　タイトル", "file": "chapters/02.txt" }
]
```

本文ファイルの先頭に `# 第一章　タイトル` のような見出しがある場合、その見出しが本文中と目次に表示されます。
本文ファイルに見出しがない場合は、`chapters.json` の `title` が自動的に見出しとして挿入されます。

## ルビ

```txt
｜漢字《かんじ》
```

のように書くと、ブラウザではルビとして表示されます。
