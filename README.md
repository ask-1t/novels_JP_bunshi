# GitHub Pages 小説サイト一式

## これは何？

日本語小説を GitHub Pages で公開するための静的サイトです。

- 入口ページ：`index.html`
- 本文ビューア：`reader.html`
- 表示設定：`style.css`
- 本文読み込み・ルビ変換：`script.js`
- 章リスト：`chapters.json`
- 本文ファイル：`chapters/01.txt` ～ `chapters/26.txt`

## 使い方

1. `chapters/01.txt` ～ `chapters/26.txt` の中身を、自分の本文に置き換えます。
2. 章タイトルを変える場合は、`chapters.json` の `title` を編集します。
3. GitHub のリポジトリに、このフォルダの中身をアップロードします。
4. GitHub Pages を有効化します。

## 本文記法

### ルビ

```txt
｜漢字《かんじ》
```

縦棒なしの簡易形も一応対応しています。

```txt
漢字《かんじ》
```

ただし、意図しない変換を避けるなら、基本は `｜漢字《かんじ》` を推奨します。

### 縦中横

```txt
[tcy]12[/tcy]
[tcy]!?[/tcy]
```

縦書き時に、囲んだ部分を縦中横で表示します。

### 区切り

```txt
†
```

単独行に置くと、中央寄せの区切りになります。

## ローカルで確認する場合

ブラウザで `index.html` を直接開くと、本文ファイルの読み込みがブロックされることがあります。

フォルダの中で、以下のように簡易サーバーを起動してください。

```bash
python -m http.server
```

その後、ブラウザで以下を開きます。

```txt
http://localhost:8000/
```

## カスタマイズする場所

### 作品タイトル

`index.html` の以下を編集します。

```html
<title>仮定義：ジャガー未満</title>
<h1 id="site-title">仮定義：ジャガー未満</h1>
```

### 入口ページの紹介文

`index.html` の以下を編集します。

```html
<p class="cover-copy">
  猫を拾ったところから始まる、猫と人間と街の話。
</p>
```

### 色・余白・文字サイズ

`style.css` の冒頭にある `:root` を編集します。

## 注意

本文ファイル名は、初期設定では以下の形式です。

```txt
chapters/01.txt
chapters/02.txt
...
chapters/26.txt
```

ファイル名を変えた場合は、必ず `chapters.json` の `file` も合わせて変更してください。
