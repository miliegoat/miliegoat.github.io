export function initEffects() {
  initThemeToggle();
  initAgeDisplay();
  initParallax();
  initClickEffect();
  initCursorTrail();
  initPreventClicks();
  initSmoothScroll();
  initRevealAnimations();
}

function initThemeToggle() {
  var toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  var saved = localStorage.getItem("theme");
  if (saved) {
    document.documentElement.setAttribute("data-theme", saved);
  }

  toggle.addEventListener("click", function () {
    var current = document.documentElement.getAttribute("data-theme");
    var next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });
}

function initAgeDisplay() {
  var el = document.getElementById("ageDisplay");
  if (!el) return;

  var birthDate = new Date("2010-08-06T00:00:00");

  function update() {
    var now = new Date();
    var diff = now - birthDate;
    var years = diff / (365.25 * 24 * 60 * 60 * 1000);
    el.textContent = Math.floor(years);
    el.setAttribute("data-tooltip", years.toFixed(8));
  }

  update();
  setInterval(update, 50);
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

function initPreventClicks() {
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });
  document.addEventListener("dblclick", function (e) {
    e.preventDefault();
  });
}

function initSmoothScroll() {
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) return;

  var velocity = 0;
  var friction = 1.6;
  var running = false;
  var lastWheel = 0;

  function getScrollParent(el) {
    while (el && el !== document.body && el !== document.documentElement) {
      var style = getComputedStyle(el);
      if (
        style.overflowY === "auto" ||
        style.overflowY === "scroll"
      ) {
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
      if (sp) {
        var atTop = sp.scrollTop <= 0 && e.deltaY < 0;
        var atBottom =
          sp.scrollTop >= sp.scrollHeight - sp.clientHeight && e.deltaY > 0;
        if (!atTop && !atBottom) return;
      }

      e.preventDefault();
      lastWheel = Date.now();
      friction = 1.6;
      velocity += e.deltaY * 2.0;
      velocity = Math.max(-1000, Math.min(1000, velocity));
      if (!running) {
        running = true;
        requestAnimationFrame(frame);
      }
    },
    { passive: false },
  );

  function frame() {
    if (Date.now() - lastWheel > 120) friction = 0.92;
    velocity *= friction;
    var oldY = window.scrollY;
    window.scrollBy(0, velocity);

    if (Math.abs(velocity) < 0.3 || Math.abs(window.scrollY - oldY) < 0.3) {
      velocity = 0;
      running = false;
      friction = 1.6;
      return;
    }

    requestAnimationFrame(frame);
  }
}

function initRevealAnimations() {
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
        } else {
          entry.target.classList.remove("revealed");
        }
      });
    },
    { threshold: 0.1 },
  );

  document.querySelectorAll(".reveal").forEach(function (el) {
    observer.observe(el);
  });
}
