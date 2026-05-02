/* ===============================
   静的小説サイト 動作スクリプト
   =============================== */

const STORAGE_KEYS = {
  theme: "novel-theme",
  writing: "novel-writing",
  fontSize: "novel-font-size",
  scrollHorizontal: "novel-scroll-horizontal",
  scrollVertical: "novel-scroll-vertical",
};

const DEFAULT_FONT_SIZE = 1.12;
const MIN_FONT_SIZE = 0.86;
const MAX_FONT_SIZE = 1.55;
const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  bindControls();
  setupViewportSizing();
  applySavedFontSize();

  await loadMetadata();
  await loadNovel();

  updateLabels();
  updateViewportSizing();
  restoreScrollPosition();
  startProgressWatcher();
});

function cacheElements() {
  els.html = document.documentElement;
  els.siteTitle = document.getElementById("siteTitle");
  els.readerFrame = document.getElementById("readerFrame");
  els.novelBody = document.getElementById("novelBody");
  els.writingToggle = document.getElementById("writingToggle");
  els.themeToggle = document.getElementById("themeToggle");
  els.tocButton = document.getElementById("tocButton");
  els.tocDialog = document.getElementById("tocDialog");
  els.tocList = document.getElementById("tocList");
  els.fontSizeRange = document.getElementById("fontSizeRange");
  els.fontSizeLabel = document.getElementById("fontSizeLabel");
  els.readingModeLabel = document.getElementById("readingModeLabel");
  els.themeLabel = document.getElementById("themeLabel");
  els.progressLabel = document.getElementById("progressLabel");
}

function bindControls() {
  els.writingToggle.addEventListener("click", () => {
    const next = els.html.dataset.writing === "vertical" ? "horizontal" : "vertical";
    setWritingMode(next);
  });

  els.themeToggle.addEventListener("click", () => {
    const next = els.html.dataset.theme === "dark" ? "light" : "dark";
    setTheme(next);
  });

  els.tocButton.addEventListener("click", () => {
    if (typeof els.tocDialog.showModal === "function") {
      els.tocDialog.showModal();
    }
  });

  els.fontSizeRange.addEventListener("input", () => setFontSize(Number(els.fontSizeRange.value)));
  els.fontSizeRange.addEventListener("change", () => setFontSize(Number(els.fontSizeRange.value)));

  els.readerFrame.addEventListener("scroll", debounce(saveScrollPosition, 150), { passive: true });
  window.addEventListener("beforeunload", saveScrollPosition);
}


function setupViewportSizing() {
  updateViewportSizing();

  const onResize = debounce(updateViewportSizing, 80);
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("orientationchange", onResize, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", onResize, { passive: true });
    window.visualViewport.addEventListener("scroll", onResize, { passive: true });
  }
}

function updateViewportSizing() {
  if (!document.documentElement) return;

  const viewportHeight = Math.round(window.visualViewport?.height || window.innerHeight || 0);
  if (viewportHeight > 0) {
    document.documentElement.style.setProperty("--viewport-height", `${viewportHeight}px`);
  }

  requestAnimationFrame(() => {
    const header = document.querySelector(".site-header");
    const shell = document.querySelector(".reader-shell");
    const meta = document.querySelector(".reader-meta");

    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    const shellStyle = shell ? getComputedStyle(shell) : null;
    const shellPadding = shellStyle
      ? parseFloat(shellStyle.paddingTop) + parseFloat(shellStyle.paddingBottom)
      : 0;

    const metaStyle = meta ? getComputedStyle(meta) : null;
    const metaVisible = meta && metaStyle && metaStyle.display !== "none";
    const metaHeight = metaVisible ? meta.getBoundingClientRect().height : 0;
    const metaBottom = metaVisible ? parseFloat(metaStyle.marginBottom) || 0 : 0;

    // Mobile Safariでは表示領域が動的に変わりやすいため、実測値に少しだけ余裕を足します。
    const safety = els.html?.dataset.writing === "vertical" ? 10 : 14;
    const chromeHeight = Math.ceil(headerHeight + shellPadding + metaHeight + metaBottom + safety);

    if (chromeHeight > 0) {
      document.documentElement.style.setProperty("--reader-chrome-height", `${chromeHeight}px`);
    }
  });
}

async function loadMetadata() {
  try {
    const response = await fetch("data/metadata.json", { cache: "no-cache" });
    if (!response.ok) return;
    const metadata = await response.json();

    if (metadata.title) {
      document.title = metadata.title;
      els.siteTitle.textContent = metadata.title;
    }

    const description = document.querySelector('meta[name="description"]');
    if (description && metadata.description) {
      description.setAttribute("content", metadata.description);
    }
  } catch {
    // metadata.json がなくても本文表示は続行します。
  }
}

async function loadNovel() {
  try {
    const source = await loadChapterSources();
    const { html, toc } = renderNovel(source);

    els.novelBody.innerHTML = html || `<p class="error">本文が空です。<code>data/chapters/01.txt</code> などを編集してください。</p>`;
    renderToc(toc);
  } catch (error) {
    els.novelBody.innerHTML = `
      <div class="error">
        <p>本文を読み込めませんでした。</p>
        <p><code>data/chapters.json</code> と <code>data/chapters/01.txt</code> 〜 <code>09.txt</code> が同じ場所にあるか確認してください。</p>
        <p>ローカルで直接 <code>index.html</code> を開くと、ブラウザによっては本文ファイルの読み込みが制限されます。GitHub Pages上では通常どおり動きます。</p>
      </div>
    `;
    console.error(error);
  }
}

async function loadChapterSources() {
  try {
    const chapterResponse = await fetch("data/chapters.json", { cache: "no-cache" });
    if (chapterResponse.ok) {
      const rawChapters = await chapterResponse.json();
      const chapters = normalizeChapters(rawChapters);

      if (chapters.length) {
        const sources = await Promise.all(chapters.map(loadOneChapter));
        return sources.join("\n\n---\n\n");
      }
    }
  } catch (error) {
    console.warn("章分割版の読み込みに失敗しました。単一ファイル版を試します。", error);
  }

  const fallbackResponse = await fetch("data/novel.txt", { cache: "no-cache" });
  if (!fallbackResponse.ok) {
    throw new Error(`本文ファイルを読み込めませんでした: ${fallbackResponse.status}`);
  }
  return await fallbackResponse.text();
}

function normalizeChapters(rawChapters) {
  const list = Array.isArray(rawChapters) ? rawChapters : rawChapters?.chapters;
  if (!Array.isArray(list)) return [];

  return list
    .map((item, index) => {
      if (typeof item === "string") {
        return { title: `第${index + 1}章`, file: item };
      }
      return {
        title: item?.title || `第${index + 1}章`,
        file: item?.file || item?.path || "",
      };
    })
    .filter((item) => item.file);
}

async function loadOneChapter(chapter) {
  const filePath = chapter.file.startsWith("data/") ? chapter.file : `data/${chapter.file}`;
  const response = await fetch(filePath, { cache: "no-cache" });

  if (!response.ok) {
    throw new Error(`${filePath} を読み込めませんでした: ${response.status}`);
  }

  const source = (await response.text()).replace(/\r\n?/g, "\n").trim();
  const hasHeading = /^#{1,3}\s+.+/m.test(source);
  return hasHeading ? source : `# ${chapter.title}\n\n${source}`;
}

function renderNovel(source) {
  const normalized = source.replace(/\r\n?/g, "\n").trim();
  const lines = normalized.split("\n");
  const blocks = [];
  const toc = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = paragraph.join("\n");
    blocks.push(`<p>${parseInline(text).replace(/\n/g, "<br>")}</p>`);
    paragraph = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      return;
    }

    if (/^---+$/.test(trimmed)) {
      flushParagraph();
      blocks.push("<hr>");
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      const level = Math.min(headingMatch[1].length + 1, 4);
      const title = headingMatch[2].trim();
      const id = `section-${toc.length + 1}`;
      toc.push({ id, level, title });
      blocks.push(`<h${level} id="${id}">${parseInline(title)}</h${level}>`);
      return;
    }

    paragraph.push(line);
  });

  flushParagraph();
  return { html: blocks.join("\n"), toc };
}

function parseInline(input) {
  let result = "";
  let cursor = 0;

  while (cursor < input.length) {
    const start = input.indexOf("｜", cursor);

    if (start === -1) {
      result += parsePlain(input.slice(cursor));
      break;
    }

    result += parsePlain(input.slice(cursor, start));

    const open = input.indexOf("《", start + 1);
    const close = open === -1 ? -1 : input.indexOf("》", open + 1);

    if (open === -1 || close === -1) {
      result += parsePlain(input.slice(start, start + 1));
      cursor = start + 1;
      continue;
    }

    const base = input.slice(start + 1, open);
    const rt = input.slice(open + 1, close);

    if (!base || !rt || base.includes("\n") || rt.includes("\n")) {
      result += parsePlain(input.slice(start, close + 1));
      cursor = close + 1;
      continue;
    }

    result += `<ruby>${parsePlain(base)}<rt>${escapeHtml(rt)}</rt></ruby>`;
    cursor = close + 1;
  }

  return result;
}

function parsePlain(text) {
  return escapeHtml(text).replace(/([0-9A-Za-z]{1,4})/g, '<span class="tcy">$1</span>');
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderToc(toc) {
  if (!toc.length) {
    els.tocList.innerHTML = `<li>見出しがありません。本文内で <code># 第一章</code> のように書くと目次に出ます。</li>`;
    return;
  }

  els.tocList.innerHTML = toc
    .map((item) => {
      const className = item.level >= 3 ? "toc-level-3" : "toc-level-2";
      return `<li class="${className}"><a href="#${item.id}" data-target="${item.id}">${escapeHtml(item.title)}</a></li>`;
    })
    .join("");

  els.tocList.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const target = document.getElementById(link.dataset.target);
      if (!target) return;

      if (els.html.dataset.writing === "vertical") {
        target.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
      } else {
        target.scrollIntoView({ block: "start", behavior: "smooth" });
      }

      els.tocDialog.close();
    });
  });
}

function setWritingMode(mode) {
  saveScrollPosition();
  els.html.dataset.writing = mode;
  localStorage.setItem(STORAGE_KEYS.writing, mode);
  updateLabels();
  updateViewportSizing();

  requestAnimationFrame(() => {
    els.readerFrame.scrollTop = 0;
    if (mode === "vertical") {
      // 縦書きは右端から読み始めるブラウザが多いため、最大値側へ寄せます。
      els.readerFrame.scrollLeft = els.readerFrame.scrollWidth;
    } else {
      els.readerFrame.scrollLeft = 0;
    }
    saveScrollPosition();
  });
}

function setTheme(theme) {
  els.html.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEYS.theme, theme);
  updateLabels();
}

function applySavedFontSize() {
  const saved = Number(localStorage.getItem(STORAGE_KEYS.fontSize));
  setFontSize(Number.isFinite(saved) ? saved : DEFAULT_FONT_SIZE, false);
}

function setFontSize(size, persist = true) {
  const numeric = Number(size);
  const safeSize = Number.isFinite(numeric) ? numeric : DEFAULT_FONT_SIZE;
  const next = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Number(safeSize.toFixed(2))));

  document.documentElement.style.setProperty("--font-size", `${next}rem`);

  if (els.fontSizeRange) {
    els.fontSizeRange.value = String(next);
  }

  if (els.fontSizeLabel) {
    const percent = Math.round((next / DEFAULT_FONT_SIZE) * 100);
    els.fontSizeLabel.textContent = percent === 100 ? "標準" : `${percent}%`;
  }

  if (persist) localStorage.setItem(STORAGE_KEYS.fontSize, String(next));
  updateViewportSizing();
}

function updateLabels() {
  const isVertical = els.html.dataset.writing === "vertical";
  const isDark = els.html.dataset.theme === "dark";

  els.writingToggle.textContent = isVertical ? "横書き" : "縦書き";
  els.writingToggle.setAttribute("aria-pressed", String(isVertical));
  els.readingModeLabel.textContent = isVertical ? "縦書き表示" : "横書き表示";

  els.themeToggle.textContent = isDark ? "ライト" : "ダーク";
  els.themeToggle.setAttribute("aria-pressed", String(isDark));
  els.themeLabel.textContent = isDark ? "ダークモード" : "ライトモード";

  updateProgress();
}

function saveScrollPosition() {
  if (!els.readerFrame) return;

  if (els.html.dataset.writing === "vertical") {
    localStorage.setItem(STORAGE_KEYS.scrollHorizontal, String(els.readerFrame.scrollLeft));
  } else {
    localStorage.setItem(STORAGE_KEYS.scrollVertical, String(window.scrollY));
  }
}

function restoreScrollPosition() {
  requestAnimationFrame(() => {
    if (els.html.dataset.writing === "vertical") {
      const value = Number(localStorage.getItem(STORAGE_KEYS.scrollHorizontal));
      els.readerFrame.scrollLeft = Number.isFinite(value) ? value : els.readerFrame.scrollWidth;
    } else {
      const value = Number(localStorage.getItem(STORAGE_KEYS.scrollVertical));
      if (Number.isFinite(value)) window.scrollTo({ top: value });
    }
    updateProgress();
  });
}

function startProgressWatcher() {
  const update = debounce(() => {
    saveScrollPosition();
    updateProgress();
  }, 100);

  els.readerFrame.addEventListener("scroll", update, { passive: true });
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", debounce(() => {
    updateViewportSizing();
    updateProgress();
  }, 150));
  updateProgress();
}

function updateProgress() {
  let percent = 0;

  if (els.html.dataset.writing === "vertical") {
    const max = Math.max(1, els.readerFrame.scrollWidth - els.readerFrame.clientWidth);
    // vertical-rlはブラウザによりscrollLeftの符号差が出るため、絶対値で概算します。
    const current = Math.abs(els.readerFrame.scrollLeft);
    percent = Math.min(100, Math.max(0, (current / max) * 100));
  } else {
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    percent = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
  }

  els.progressLabel.textContent = `${Math.round(percent)}%`;
}

function debounce(callback, delay = 120) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => callback(...args), delay);
  };
}
