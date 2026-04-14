/**
 * app.js — 読書アプリロジック
 *
 * 依存: content.js（NOVEL_META, NOVEL_CHAPTERS をグローバルに公開）
 *
 * 機能:
 *  - ルビ記法変換（｜漢字《かんじ》→ <ruby>）
 *  - テーマ切替（ライト / ダーク / セピア）
 *  - 文字サイズ / 行間 / 本文幅 スライダー
 *  - ルビオン・オフ
 *  - しおり（localStorage）
 *  - 章ナビゲーション・目次
 */

(function () {
  "use strict";

  /* ================================================================
     定数・初期値
     ================================================================ */
  const STORAGE_KEY = "novel_reader_state";

  const DEFAULTS = {
    theme: "light",
    fontSize: 1.1,   // rem
    lineHeight: 2.1,
    maxWidth: 640,   // px
    rubyOn: true,
    chapterIndex: 0,
    scrollY: 0,
  };

  /* ================================================================
     状態管理
     ================================================================ */
  let state = loadState();
  const chapters = window.NOVEL_CHAPTERS || [];
  const meta = window.NOVEL_META || {};

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        return Object.assign({}, DEFAULTS, saved);
      }
    } catch (_) {}
    return Object.assign({}, DEFAULTS);
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  /* ================================================================
     ルビ記法変換
     ｜漢字《かんじ》 → <ruby>漢字<rt>かんじ</rt></ruby>
     ================================================================ */
  function convertRuby(text) {
    return text.replace(/｜([^《]+)《([^》]+)》/g, function (_, base, ruby) {
      return "<ruby>" + escapeHtml(base) + "<rt>" + escapeHtml(ruby) + "</rt></ruby>";
    });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ================================================================
     本文テキスト → HTML 変換
     空行で段落分割、区切り記号処理
     ================================================================ */
  function parseContent(rawText) {
    // 前後空白除去
    const text = rawText.trim();

    // 改行で分割してブロック処理
    const blocks = text.split(/\n{2,}/);

    return blocks.map(function (block) {
      const trimmed = block.trim();
      if (!trimmed) return "";

      // 区切り記号
      if (/^[＊*]{1,3}(\s*[＊*])*$/.test(trimmed) || trimmed === "＊　＊　＊" || trimmed === "* * *") {
        return '<span class="scene-break" aria-hidden="true">＊　＊　＊</span>';
      }

      // 段落（内部の単一改行は保持しつつ、ルビ変換）
      const lines = trimmed.split(/\n/).map(function (line) {
        return convertRuby(escapeHtml(line));
      });

      return "<p>" + lines.join("<br>") + "</p>";
    }).join("\n");
  }

  /* ================================================================
     DOM 取得
     ================================================================ */
  let els = {};

  function queryEls() {
    els = {
      html: document.documentElement,
      siteTitle: document.getElementById("site-title"),
      chapterTitle: document.getElementById("chapter-title"),
      chapterNumber: document.getElementById("chapter-number"),
      chapterBody: document.getElementById("chapter-body"),
      prevBtn: document.getElementById("prev-chapter"),
      nextBtn: document.getElementById("next-chapter"),
      prevLabel: document.getElementById("prev-label"),
      nextLabel: document.getElementById("next-label"),
      tocOverlay: document.getElementById("toc-overlay"),
      tocPanel: document.getElementById("toc-panel"),
      tocList: document.getElementById("toc-list"),
      tocToggleBtn: document.getElementById("toc-toggle"),
      tocCloseBtn: document.getElementById("toc-close"),
      settingsPanel: document.getElementById("settings-panel"),
      settingsToggleBtn: document.getElementById("settings-toggle"),
      themeLight: document.getElementById("theme-light"),
      themeDark: document.getElementById("theme-dark"),
      themeSepia: document.getElementById("theme-sepia"),
      fontSizeSlider: document.getElementById("font-size-slider"),
      fontSizeVal: document.getElementById("font-size-val"),
      lineHeightSlider: document.getElementById("line-height-slider"),
      lineHeightVal: document.getElementById("line-height-val"),
      maxWidthSlider: document.getElementById("max-width-slider"),
      maxWidthVal: document.getElementById("max-width-val"),
      rubyToggle: document.getElementById("ruby-toggle"),
      bookmarkBtn: document.getElementById("bookmark-btn"),
      bookmarkToast: document.getElementById("bookmark-toast"),
    };
  }

  /* ================================================================
     テーマ
     ================================================================ */
  function applyTheme(theme) {
    state.theme = theme;
    els.html.setAttribute("data-theme", theme);

    // ボタンのアクティブ状態
    [els.themeLight, els.themeDark, els.themeSepia].forEach(function (btn) {
      if (!btn) return;
      btn.classList.toggle("active", btn.dataset.theme === theme);
    });

    saveState();
  }

  /* ================================================================
     読書設定（フォントサイズ・行間・幅）
     ================================================================ */
  function applyReadingSettings() {
    const root = document.documentElement;
    root.style.setProperty("--reading-font-size", state.fontSize + "rem");
    root.style.setProperty("--reading-line-height", state.lineHeight);
    root.style.setProperty("--reading-max-width", state.maxWidth + "px");
  }

  function updateSliderUI() {
    if (els.fontSizeSlider) {
      els.fontSizeSlider.value = state.fontSize;
      els.fontSizeVal.textContent = state.fontSize.toFixed(1);
    }
    if (els.lineHeightSlider) {
      els.lineHeightSlider.value = state.lineHeight;
      els.lineHeightVal.textContent = state.lineHeight.toFixed(1);
    }
    if (els.maxWidthSlider) {
      els.maxWidthSlider.value = state.maxWidth;
      els.maxWidthVal.textContent = state.maxWidth + "px";
    }
  }

  /* ================================================================
     ルビ
     ================================================================ */
  function applyRuby() {
    if (!els.chapterBody) return;
    els.chapterBody.classList.toggle("no-ruby", !state.rubyOn);
    if (els.rubyToggle) {
      els.rubyToggle.checked = state.rubyOn;
    }
  }

  /* ================================================================
     章レンダリング
     ================================================================ */
  function renderChapter(index, restoreScroll) {
    if (!chapters.length) return;
    const idx = Math.max(0, Math.min(index, chapters.length - 1));
    const chapter = chapters[idx];
    state.chapterIndex = idx;

    // タイトル更新
    if (els.siteTitle) {
      els.siteTitle.textContent = meta.title || "読書";
    }
    if (els.chapterNumber) {
      els.chapterNumber.textContent = "第 " + (idx + 1) + " 章 / 全 " + chapters.length + " 章";
    }
    if (els.chapterTitle) {
      els.chapterTitle.textContent = chapter.title;
    }

    // 本文
    if (els.chapterBody) {
      els.chapterBody.innerHTML = parseContent(chapter.content);
      applyRuby();
    }

    // ナビゲーション
    updateChapterNav(idx);

    // 目次アクティブ
    document.querySelectorAll(".toc-link").forEach(function (link) {
      link.classList.toggle("active", link.dataset.index === String(idx));
    });

    // スクロール
    if (restoreScroll && state.scrollY > 0) {
      // 少し遅延させてDOM描画後に復元
      requestAnimationFrame(function () {
        window.scrollTo(0, state.scrollY);
      });
    } else {
      window.scrollTo(0, 0);
    }

    // ページタイトル
    document.title = chapter.title + " — " + (meta.title || "読書");

    saveState();
  }

  function updateChapterNav(idx) {
    const hasPrev = idx > 0;
    const hasNext = idx < chapters.length - 1;

    if (els.prevBtn) {
      els.prevBtn.setAttribute("aria-disabled", !hasPrev);
      if (!hasPrev) els.prevBtn.setAttribute("disabled", "");
      else els.prevBtn.removeAttribute("disabled");
    }
    if (els.nextBtn) {
      els.nextBtn.setAttribute("aria-disabled", !hasNext);
      if (!hasNext) els.nextBtn.setAttribute("disabled", "");
      else els.nextBtn.removeAttribute("disabled");
    }
    if (els.prevLabel && hasPrev) {
      els.prevLabel.textContent = chapters[idx - 1].title;
    }
    if (els.nextLabel && hasNext) {
      els.nextLabel.textContent = chapters[idx + 1].title;
    }
  }

  /* ================================================================
     目次生成
     ================================================================ */
  function buildTOC() {
    if (!els.tocList) return;
    els.tocList.innerHTML = "";
    chapters.forEach(function (ch, i) {
      const li = document.createElement("li");
      li.className = "toc-item";
      const a = document.createElement("a");
      a.href = "#";
      a.className = "toc-link";
      a.textContent = ch.title;
      a.dataset.index = i;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        state.scrollY = 0;
        renderChapter(i, false);
        closeTOC();
      });
      li.appendChild(a);
      els.tocList.appendChild(li);
    });
  }

  /* ================================================================
     目次パネル開閉
     ================================================================ */
  function openTOC() {
    if (!els.tocOverlay) return;
    els.tocOverlay.classList.add("open");
    // 目次アクティブ更新
    document.querySelectorAll(".toc-link").forEach(function (link) {
      link.classList.toggle("active", link.dataset.index === String(state.chapterIndex));
    });
  }

  function closeTOC() {
    if (!els.tocOverlay) return;
    els.tocOverlay.classList.remove("open");
  }

  /* ================================================================
     設定パネル開閉
     ================================================================ */
  function toggleSettings() {
    if (!els.settingsPanel) return;
    els.settingsPanel.classList.toggle("open");
  }

  function closeSettings() {
    if (!els.settingsPanel) return;
    els.settingsPanel.classList.remove("open");
  }

  /* ================================================================
     しおり
     ================================================================ */
  let toastTimer = null;

  function saveBookmark() {
    state.scrollY = window.scrollY;
    saveState();
    showToast("しおりを挟みました");
  }

  function showToast(msg) {
    if (!els.bookmarkToast) return;
    els.bookmarkToast.textContent = msg;
    els.bookmarkToast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.bookmarkToast.classList.remove("show");
    }, 2000);
  }

  /* ================================================================
     イベントバインド
     ================================================================ */
  function bindEvents() {
    // 目次
    if (els.tocToggleBtn) {
      els.tocToggleBtn.addEventListener("click", function () {
        closeSettings();
        openTOC();
      });
    }
    if (els.tocCloseBtn) {
      els.tocCloseBtn.addEventListener("click", closeTOC);
    }
    if (els.tocOverlay) {
      els.tocOverlay.addEventListener("click", function (e) {
        if (e.target === els.tocOverlay || e.target.classList.contains("toc-overlay")) {
          closeTOC();
        }
      });
    }

    // 設定
    if (els.settingsToggleBtn) {
      els.settingsToggleBtn.addEventListener("click", function () {
        closeTOC();
        toggleSettings();
      });
    }

    // 設定パネル外クリックで閉じる
    document.addEventListener("click", function (e) {
      if (
        els.settingsPanel &&
        els.settingsPanel.classList.contains("open") &&
        !els.settingsPanel.contains(e.target) &&
        e.target !== els.settingsToggleBtn &&
        !els.settingsToggleBtn.contains(e.target)
      ) {
        closeSettings();
      }
    });

    // テーマ
    [els.themeLight, els.themeDark, els.themeSepia].forEach(function (btn) {
      if (!btn) return;
      btn.addEventListener("click", function () {
        applyTheme(btn.dataset.theme);
      });
    });

    // フォントサイズ
    if (els.fontSizeSlider) {
      els.fontSizeSlider.addEventListener("input", function () {
        state.fontSize = parseFloat(this.value);
        els.fontSizeVal.textContent = state.fontSize.toFixed(1);
        applyReadingSettings();
        saveState();
      });
    }

    // 行間
    if (els.lineHeightSlider) {
      els.lineHeightSlider.addEventListener("input", function () {
        state.lineHeight = parseFloat(this.value);
        els.lineHeightVal.textContent = state.lineHeight.toFixed(1);
        applyReadingSettings();
        saveState();
      });
    }

    // 本文幅
    if (els.maxWidthSlider) {
      els.maxWidthSlider.addEventListener("input", function () {
        state.maxWidth = parseInt(this.value, 10);
        els.maxWidthVal.textContent = state.maxWidth + "px";
        applyReadingSettings();
        saveState();
      });
    }

    // ルビトグル
    if (els.rubyToggle) {
      els.rubyToggle.addEventListener("change", function () {
        state.rubyOn = this.checked;
        applyRuby();
        saveState();
      });
    }

    // しおり
    if (els.bookmarkBtn) {
      els.bookmarkBtn.addEventListener("click", saveBookmark);
    }

    // 章ナビ
    if (els.prevBtn) {
      els.prevBtn.addEventListener("click", function () {
        if (state.chapterIndex > 0) {
          state.scrollY = 0;
          renderChapter(state.chapterIndex - 1, false);
        }
      });
    }
    if (els.nextBtn) {
      els.nextBtn.addEventListener("click", function () {
        if (state.chapterIndex < chapters.length - 1) {
          state.scrollY = 0;
          renderChapter(state.chapterIndex + 1, false);
        }
      });
    }

    // キーボードショートカット
    document.addEventListener("keydown", function (e) {
      // ESC で各パネルを閉じる
      if (e.key === "Escape") {
        closeTOC();
        closeSettings();
      }
      // 左矢印キー: 前の章
      if (e.key === "ArrowLeft" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const tag = document.activeElement.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          if (state.chapterIndex > 0) {
            state.scrollY = 0;
            renderChapter(state.chapterIndex - 1, false);
          }
        }
      }
      // 右矢印キー: 次の章
      if (e.key === "ArrowRight" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const tag = document.activeElement.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          if (state.chapterIndex < chapters.length - 1) {
            state.scrollY = 0;
            renderChapter(state.chapterIndex + 1, false);
          }
        }
      }
    });
  }

  /* ================================================================
     初期化
     ================================================================ */
  function init() {
    queryEls();

    // タイトル
    if (els.siteTitle) {
      els.siteTitle.textContent = meta.title || "読書";
    }
    document.title = meta.title || "読書";

    // テーマ
    applyTheme(state.theme);

    // 読書設定
    applyReadingSettings();
    updateSliderUI();

    // 目次ビルド
    buildTOC();

    // 章レンダリング（しおりから復元）
    renderChapter(state.chapterIndex, true);

    // しおり復元通知
    if (state.scrollY > 0) {
      setTimeout(function () {
        showToast("しおりの続きから読んでいます");
      }, 500);
    }

    // イベント
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
