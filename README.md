# 静的小説サイト v9（入口ページつき）

GitHub Pagesにそのまま置ける、日本語小説向けの静的サイトです。

## v9で増えたもの

- `index.html`: 表紙・入口ページ
- `reader.html`: 本文表示ページ
- `assets/cover.js`: 入口ページ用スクリプト

本文表示ページの機能はv8を継承しています。

- 縦書き / 横書き切替
- ルビ記法 `｜漢字《かんじ》` の表示
- 縦中横記法 `[tcy]12[/tcy]` の表示
- ライト / ダークモード切替
- 文字サイズスライダー
- 章分割された本文の読み込み
- 見出しから自動目次生成
- 読書位置の簡易保存

## ファイル構成

```txt
.
├── index.html          # 入口ページ
├── reader.html         # 本文ページ
├── .nojekyll
├── assets/
│   ├── app.js          # 本文ページ用
│   ├── cover.js        # 入口ページ用
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

## 入口ページの編集

作品タイトル、著者名、紹介文は `data/metadata.json` を編集します。

```json
{
  "title": "小説タイトル",
  "author": "著者名",
  "description": "作品紹介文"
}
```

章タイトルは `data/chapters.json` を編集します。

```json
[
  { "title": "第一章　タイトル", "file": "chapters/01.txt" },
  { "title": "第二章　タイトル", "file": "chapters/02.txt" }
]
```

## 入口ページのボタン

- 「はじめから読む」: `reader.html?start=1` に移動し、保存済み読書位置を使わず先頭から開きます。
- 「前回の続きから読む」: `reader.html` に移動し、保存済み読書位置があれば復元します。
- 「目次を見る」: 入口ページ内の目次へ移動します。

## ルビ

```txt
｜漢字《かんじ》
```

## 縦中横

```txt
[tcy]12[/tcy]
[tcy]!?[/tcy]
[tcy]AI[/tcy]
```

例:

```txt
彼は[tcy]12[/tcy]時に戻ってきた。
```
