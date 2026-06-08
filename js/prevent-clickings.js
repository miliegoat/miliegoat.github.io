export function initPreventClicks() {
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });
  document.addEventListener("dblclick", function (e) {
    e.preventDefault();
  });
  document.addEventListener("mousedown", function (e) {
    if (e.button === 1) e.preventDefault();
  });
}
