export function initSmoothScroll() {
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) return;

  var target = window.scrollY;
  var current = window.scrollY;
  var running = false;

  function getScrollParent(el) {
    while (el && el !== document.body && el !== document.documentElement) {
      var style = getComputedStyle(el);
      if (style.overflowY === "auto" || style.overflowY === "scroll") {
        if (el.scrollHeight > el.clientHeight) return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  document.addEventListener(
    "wheel",
    function (e) {
      var sp = getScrollParent(e.target);
      if (sp) return;
      e.preventDefault();
      target += e.deltaY;
      target = Math.max(
        0,
        Math.min(
          document.documentElement.scrollHeight - window.innerHeight,
          target,
        ),
      );
      if (!running) {
        current = window.scrollY;
        running = true;
        requestAnimationFrame(frame);
      }
    },
    { passive: false },
  );

  function frame() {
    current += (target - current) * 0.25;
    window.scrollTo(0, Math.round(current));
    if (Math.abs(current - target) < 0.5) {
      window.scrollTo(0, target);
      running = false;
      return;
    }
    requestAnimationFrame(frame);
  }
}
