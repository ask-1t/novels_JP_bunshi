/* 現在開いている章の番号だけを保存（スクロール位置は変更しない）。 */
(() => {
  try {
    const id = new URLSearchParams(window.location.search).get("chapter") || "01";
    if (/^(0[1-9]|1[0-9]|2[0-6])$/.test(id)) {
      localStorage.setItem("bunshi-last-opened-chapter-v1", id);
    }
  } catch (_) {
    // プライベート閲覧などで保存できない場合は、保存を省略します。
  }
})();
