export function initRevealAnimations() {
  var els = document.querySelectorAll(".reveal");
  if (!els.length) return;

  function check() {
    var h = window.innerHeight;
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < h - 40 && r.bottom > 40) {
        el.classList.add("revealed");
      } else if (r.bottom < -40 || r.top > h + 40) {
        el.classList.remove("revealed");
      }
    });
  }

  window.addEventListener("scroll", check, { passive: true });
  check();
}
