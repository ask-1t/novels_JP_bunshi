/* ===============================
   入口ページ 動作スクリプト
   =============================== */

const COVER_STORAGE_KEYS = {
  theme: "novel-theme",
};

const coverEls = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheCoverElements();
  bindCoverControls();
  updateCoverThemeButton();
  await loadCoverMetadata();
  await loadCoverChapters();
});

function cacheCoverElements() {
  coverEls.html = document.documentElement;
  coverEls.title = document.getElementById("coverTitle");
  coverEls.author = document.getElementById("coverAuthor");
  coverEls.description = document.getElementById("coverDescription");
  coverEls.chapterList = document.getElementById("chapterList");
  coverEls.chapterCount = document.getElementById("chapterCount");
  coverEls.themeToggle = document.getElementById("coverThemeToggle");
}

function bindCoverControls() {
  coverEls.themeToggle?.addEventListener("click", () => {
    const next = coverEls.html.dataset.theme === "dark" ? "light" : "dark";
    coverEls.html.dataset.theme = next;
    localStorage.setItem(COVER_STORAGE_KEYS.theme, next);
    updateCoverThemeButton();
  });
}

function updateCoverThemeButton() {
  if (!coverEls.themeToggle) return;
  const isDark = coverEls.html.dataset.theme === "dark";
  coverEls.themeToggle.textContent = isDark ? "ライト" : "ダーク";
  coverEls.themeToggle.setAttribute("aria-pressed", String(isDark));
}

async function loadCoverMetadata() {
  try {
    const response = await fetch("data/metadata.json", { cache: "no-cache" });
    if (!response.ok) return;

    const metadata = await response.json();
    if (metadata.title) {
      document.title = metadata.title;
      coverEls.title.textContent = metadata.title;
    }
    if (metadata.author) coverEls.author.textContent = metadata.author;
    if (metadata.description) {
      coverEls.description.textContent = metadata.description;
      const description = document.querySelector('meta[name="description"]');
      description?.setAttribute("content", metadata.description);
    }
  } catch (error) {
    console.warn("metadata.json を読み込めませんでした。", error);
  }
}

async function loadCoverChapters() {
  try {
    const response = await fetch("data/chapters.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`chapters.json を読み込めませんでした: ${response.status}`);

    const raw = await response.json();
    const chapters = normalizeCoverChapters(raw);

    if (!chapters.length) {
      coverEls.chapterList.innerHTML = "<li>章情報がありません。</li>";
      coverEls.chapterCount.textContent = "0章";
      return;
    }

    coverEls.chapterList.innerHTML = chapters
      .map((chapter, index) => {
        const sectionId = `section-${index + 1}`;
        return `<li><a href="reader.html?start=1#${sectionId}">${escapeCoverHtml(chapter.title)}</a></li>`;
      })
      .join("");
    coverEls.chapterCount.textContent = `${chapters.length}章`;
  } catch (error) {
    console.warn(error);
    coverEls.chapterList.innerHTML = "<li>目次を読み込めませんでした。<code>data/chapters.json</code> を確認してください。</li>";
    coverEls.chapterCount.textContent = "読み込み失敗";
  }
}

function normalizeCoverChapters(rawChapters) {
  const list = Array.isArray(rawChapters) ? rawChapters : rawChapters?.chapters;
  if (!Array.isArray(list)) return [];

  return list.map((item, index) => {
    if (typeof item === "string") return { title: `第${index + 1}章` };
    return { title: item?.title || `第${index + 1}章` };
  });
}

function escapeCoverHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
