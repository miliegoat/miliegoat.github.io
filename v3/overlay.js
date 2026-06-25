export function initOverlay(onStart) {
  const overlay = document.getElementById("startOverlay");
  const clickLabel = document.getElementById("clickLabel");
  let hasStarted = false;

  function start() {
    if (hasStarted) return;
    hasStarted = true;
    overlay.classList.add("hidden");
    setTimeout(() => {
      overlay.style.display = "none";
      onStart();
    }, 800);
  }

  clickLabel.addEventListener("click", start);
  overlay.addEventListener("click", start);
  document.addEventListener("keydown", (e) => {
    if (!hasStarted) start();
  });
}
