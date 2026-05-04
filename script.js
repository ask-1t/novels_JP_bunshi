const SETTINGS_KEY = "novel-reader-settings-v2";

const DEFAULT_SETTINGS = {
  theme: "light",
  mode: "horizontal",
  fontSize: 19
};

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function applySettings(settings) {
  document.body.classList.toggle("dark-theme", settings.theme === "dark");
  document.body.classList.toggle("light-theme", settings.theme !== "dark");
  document.body.classList.toggle("vertical-mode", settings.mode === "vertical");
  document.body.classList.toggle("horizontal-mode", settings.mode !== "vertical");
  document.documentElement.style.setProperty("--font-size", `${settings.fontSize}px`);

  const themeToggle = document.getElementById("theme-toggle") || document.getElementById("home-theme-toggle");
  if (themeToggle) themeToggle.textContent = settings.theme === "dark" ? "ライト" : "ダーク";

  const modeToggle = document.getElementById("mode-toggle");
  if (modeToggle) modeToggle.textContent = settings.mode === "vertical" ? "横書き" : "縦書き";

  const fontSlider = document.getElementById("font-size");
  if (fontSlider) fontSlider.value = settings.fontSize;
}

async function fetchChapters() {
  const response = await fetch("chapters.json", { cache: "no-store" });
  if (!response.ok) throw new Error("chapters.json を読み込めませんでした。");
  return response.json();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInline(raw) {
  const tokens = [];
  let text = raw.replace(/\[tcy\]([\s\S]*?)\[\/tcy\]/g, (_, inner) => {
    const marker = `@@TCY${tokens.length}@@`;
    tokens.push(`<span class="tcy">${escapeHtml(inner)}</span>`);
    return marker;
  });

  text = text.replace(/｜([^《\n]+?)《([^》\n]+?)》/g, (_, base, ruby) => {
    const marker = `@@RUBY${tokens.length}@@`;
    tokens.push(`<ruby>${escapeHtml(base)}<rt>${escapeHtml(ruby)}</rt></ruby>`);
    return marker;
  });

  text = text.replace(/([一-龥々〆ヶヵァ-ヴー]{1,16})《([^》\n]+?)》/g, (_, base, ruby) => {
    const marker = `@@RUBY${tokens.length}@@`;
    tokens.push(`<ruby>${escapeHtml(base)}<rt>${escapeHtml(ruby)}</rt></ruby>`);
    return marker;
  });

  let html = escapeHtml(text);
  tokens.forEach((token, index) => {
    html = html.replaceAll(`@@TCY${index}@@`, token).replaceAll(`@@RUBY${index}@@`, token);
  });
  return html;
}

function renderNovelText(rawText) {
  const normalized = rawText.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const html = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^#{1,3}\s+/.test(trimmed)) {
      const level = Math.min((trimmed.match(/^#+/) || ["#"])[0].length, 2);
      html.push(`<h${level}>${renderInline(trimmed.replace(/^#{1,3}\s+/, ""))}</h${level}>`);
      continue;
    }

    if (trimmed === "†" || trimmed === "＊" || trimmed === "***") {
      html.push(`<div class="chapter-break" aria-hidden="true">${escapeHtml(trimmed)}</div>`);
      continue;
    }

    html.push(`<p>${renderInline(line)}</p>`);
  }

  return html.join("\n") || "<p>本文がまだ入っていません。</p>";
}

function chapterUrl(id) {
  return `reader.html?chapter=${encodeURIComponent(id)}`;
}

function getCurrentChapterId(chapters) {
  const params = new URLSearchParams(location.search);
  return params.get("chapter") || chapters[0]?.id || "01";
}

async function initHome() {
  const toc = document.getElementById("toc-list");
  if (!toc) return;

  try {
    const chapters = await fetchChapters();
    toc.innerHTML = chapters.map((chapter) => `
      <li><a href="${chapterUrl(chapter.id)}"><span>${chapter.id}</span>　${escapeHtml(chapter.title)}</a></li>
    `).join("");
  } catch (error) {
    toc.innerHTML = `<li class="error-box">目次を読み込めませんでした。GitHub Pages にアップロード後、またはローカルサーバー経由で確認してください。</li>`;
  }
}

async function initReader() {
  const novel = document.getElementById("novel");
  if (!novel) return;

  const chapterTitle = document.getElementById("chapter-title");
  const chapterNumber = document.getElementById("chapter-number");
  const chapterSelect = document.getElementById("chapter-select");
  const prevLink = document.getElementById("prev-link");
  const nextLink = document.getElementById("next-link");
  const articleScroll = document.getElementById("article-scroll");

  try {
    const chapters = await fetchChapters();
    const currentId = getCurrentChapterId(chapters);
    const currentIndex = Math.max(0, chapters.findIndex((chapter) => chapter.id === currentId));
    const chapter = chapters[currentIndex] || chapters[0];

    chapterSelect.innerHTML = chapters.map((item) => `
      <option value="${escapeHtml(item.id)}" ${item.id === chapter.id ? "selected" : ""}>${escapeHtml(item.id)} ${escapeHtml(item.title)}</option>
    `).join("");

    chapterSelect.addEventListener("change", () => {
      location.href = chapterUrl(chapterSelect.value);
    });

    document.title = `${chapter.id} ${chapter.title}`;
    chapterTitle.textContent = chapter.title;
    chapterNumber.textContent = `#${chapter.id}`;

    const textResponse = await fetch(chapter.file, { cache: "no-store" });
    if (!textResponse.ok) throw new Error(`${chapter.file} を読み込めませんでした。`);
    const rawText = await textResponse.text();
    novel.innerHTML = renderNovelText(rawText);
    articleScroll.scrollTop = 0;
    articleScroll.scrollLeft = 0;

    const prev = chapters[currentIndex - 1];
    const next = chapters[currentIndex + 1];
    updateNavLink(prevLink, prev, "前へ");
    updateNavLink(nextLink, next, "次へ");
  } catch (error) {
    novel.innerHTML = `
      <div class="error-box">
        <p><strong>本文を読み込めませんでした。</strong></p>
        <p>${escapeHtml(error.message || String(error))}</p>
        <p>ローカル確認では、ファイルを直接開くのではなく、フォルダ内で <code>python -m http.server</code> などの簡易サーバーを使ってください。GitHub Pages 上ではそのまま動きます。</p>
      </div>
    `;
  }
}

function updateNavLink(link, chapter, label) {
  if (!link) return;
  if (!chapter) {
    link.classList.add("disabled");
    link.setAttribute("aria-disabled", "true");
    link.href = "#";
    link.textContent = label;
    return;
  }
  link.classList.remove("disabled");
  link.removeAttribute("aria-disabled");
  link.href = chapterUrl(chapter.id);
  link.textContent = `${label}：${chapter.id}`;
}

function initControls() {
  const settings = loadSettings();
  applySettings(settings);

  const themeButtons = [document.getElementById("theme-toggle"), document.getElementById("home-theme-toggle")].filter(Boolean);
  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      settings.theme = settings.theme === "dark" ? "light" : "dark";
      saveSettings(settings);
      applySettings(settings);
    });
  });

  const modeToggle = document.getElementById("mode-toggle");
  if (modeToggle) {
    modeToggle.addEventListener("click", () => {
      settings.mode = settings.mode === "vertical" ? "horizontal" : "vertical";
      saveSettings(settings);
      applySettings(settings);
      const scroll = document.getElementById("article-scroll");
      if (scroll) {
        scroll.scrollTop = 0;
        scroll.scrollLeft = 0;
      }
    });
  }

  const fontSlider = document.getElementById("font-size");
  if (fontSlider) {
    fontSlider.addEventListener("input", () => {
      settings.fontSize = Number(fontSlider.value);
      saveSettings(settings);
      applySettings(settings);
    });
  }

  const articleScroll = document.getElementById("article-scroll");
  if (articleScroll) {
    articleScroll.addEventListener("wheel", (event) => {
      if (!document.body.classList.contains("vertical-mode")) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      articleScroll.scrollLeft += event.deltaY;
      event.preventDefault();
    }, { passive: false });
  }
}

initControls();
initHome();
initReader();
