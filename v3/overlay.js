export function initOverlay(onStartWithMusic, onStartWithoutMusic) {
  const overlay = document.getElementById("startOverlay");
  const clickLabel = document.getElementById("clickLabel");
  const noMusicLabel = document.getElementById("enterWithoutMusic");
  let hasStarted = false;

  function start(withMusic) {
    if (hasStarted) return;
    hasStarted = true;
    overlay.classList.add("hidden");
    setTimeout(() => {
      overlay.style.display = "none";
      if (withMusic) onStartWithMusic();
      else onStartWithoutMusic();
    }, 800);
  }

  clickLabel.addEventListener("click", () => start(true));
  noMusicLabel.addEventListener("click", () => start(false));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) start(true);
  });
  document.addEventListener("keydown", (e) => {
    if (!hasStarted) start(true);
  });
}
