import { initAgeDisplay } from "./age.js";
import { initRevealAnimations } from "./revealing.js";
import { initPreventClicks } from "./prevent-clickings.js";
import { initFish } from "./fish.js";

export function initEffects() {
  initThemeToggle();
  initAgeDisplay();
  initParallax();
  initClickEffect();
  initCursorTrail();
  initPreventClicks();
  initRevealAnimations();
}

function initThemeToggle() {
  var toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  var fish = initFish();

  var saved = localStorage.getItem("theme");
  if (saved) {
    document.documentElement.setAttribute("data-theme", saved);
  }
  if (saved === "light") fish.start();

  toggle.addEventListener("click", function () {
    var current = document.documentElement.getAttribute("data-theme");
    var next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    if (next === "light") fish.start();
    else fish.stop();
  });
}

function initParallax() {
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) return;

  var page = document.querySelector(".page");
  if (!page) return;

  var mouseX = 0,
    mouseY = 0;
  var currentX = 0,
    currentY = 0;
  var maxOffset = 6;

  document.addEventListener("mousemove", function (e) {
    var cx = window.innerWidth / 2;
    var cy = window.innerHeight / 2;
    mouseX = (e.clientX - cx) / cx;
    mouseY = (e.clientY - cy) / cy;
  });

  function animate() {
    currentX += (mouseX - currentX) * 0.06;
    currentY += (mouseY - currentY) * 0.06;
    page.style.transform =
      "translate(" +
      (currentX * maxOffset).toFixed(2) +
      "px, " +
      (currentY * maxOffset).toFixed(2) +
      "px)";
    requestAnimationFrame(animate);
  }

  animate();
}

function initClickEffect() {
  document.addEventListener("click", function (e) {
    var container = document.createElement("div");
    container.className = "click-ripple";
    container.style.left = e.clientX + "px";
    container.style.top = e.clientY + "px";

    var flash = document.createElement("div");
    flash.className = "click-flash";
    container.appendChild(flash);

    var ring = document.createElement("div");
    ring.className = "click-ripple-ring";
    container.appendChild(ring);

    var count = 8;
    for (var i = 0; i < count; i++) {
      var p = document.createElement("div");
      p.className = "click-particle";
      var size = (2 + Math.random() * 3).toFixed(1);
      p.style.width = size + "px";
      p.style.height = size + "px";

      var angle = (i / count) * 2 * Math.PI + (Math.random() - 0.5) * 0.5;
      var dist = 16 + Math.random() * 20;
      var dx = Math.cos(angle) * dist;
      var dy = Math.sin(angle) * dist;

      p.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          {
            transform:
              "translate(" +
              dx.toFixed(1) +
              "px," +
              dy.toFixed(1) +
              "px) scale(0)",
            opacity: 0,
          },
        ],
        {
          duration: 400 + Math.random() * 300,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        },
      );

      container.appendChild(p);
    }

    document.body.appendChild(container);

    setTimeout(function () {
      if (container.parentNode) container.remove();
    }, 900);
  });
}

function initCursorTrail() {
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) return;

  var canvas = document.createElement("canvas");
  canvas.className = "cursor-trail";
  document.body.appendChild(canvas);
  var ctx = canvas.getContext("2d");

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  var points = [];
  var mouseX = -100,
    mouseY = -100;
  var fadeTimer;
  var visible = false;

  document.addEventListener("mousemove", function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    visible = true;
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(function () {
      visible = false;
    }, 150);
  });

  function animate() {
    if (mouseX >= 0 && mouseY >= 0) {
      points.push({ x: mouseX, y: mouseY });
    }

    if (points.length > 18) points.splice(0, points.length - 18);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (points.length > 1 && visible) {
      var style = getComputedStyle(document.documentElement);
      var accent = style.getPropertyValue("--accent").trim();
      var len = points.length;

      for (var end = 1; end < len; end++) {
        var t = end / len;
        ctx.beginPath();
        for (var i = len - 1; i >= len - 1 - end; i--) {
          if (i === len - 1) ctx.moveTo(points[i].x, points[i].y);
          else ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = accent;
        ctx.globalAlpha = (1 - t) * 0.5;
        ctx.lineWidth = (1 - t) * 5 + 0.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(animate);
  }

  animate();
}
