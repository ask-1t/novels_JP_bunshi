/* 表紙ページの「前回開いた章から」表示。本文データには触れません。 */
(() => {
  const STORAGE_KEY = "bunshi-last-opened-chapter-v1";
  const link = document.getElementById("continue-reading");
  if (!link) return;
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    if (!/^(0[1-9]|1[0-9]|2[0-6])$/.test(id || "")) return;
    link.href = `reader.html?chapter=${encodeURIComponent(id)}`;
    link.textContent = `前回開いた章から（第${Number(id)}章）`;
    link.hidden = false;
  } catch (_) {
    // localStorageが無効でも、ほかの機能は正常に使えます。
  }
})();
