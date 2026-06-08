var FISH_COLORS = [
  "#ff6b6b", "#2dd4bf", "#3b82f6", "#34d399",
  "#f59e0b", "#60a5fa", "#f472b6", "#a78bfa",
];

export function initFish() {
  var page = document.querySelector(".page");
  if (!page) return { start: function () {}, stop: function () {} };

  var canvas = document.createElement("canvas");
  canvas.className = "fish-canvas";
  canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;pointer-events:none;z-index:0;";
  page.style.position = "relative";
  page.insertBefore(canvas, page.firstChild);
  var ctx = canvas.getContext("2d");

  var mouseX = -999, mouseY = -999;
  var lastMouseMove = 0;
  var idle = false;
  var noms = [];
  var bubbles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = document.documentElement.scrollHeight;
    MAX_FISH = getMaxFish();
  }
  resize();
  window.addEventListener("resize", resize);

  document.addEventListener("mousemove", function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY + window.scrollY;
    lastMouseMove = Date.now();
    idle = false;
  });

  var fishes = [];
  var running = false;
  var animId;
  var MAX_FISH = 12;

  function getMaxFish() {
    var w = window.innerWidth;
    if (w < 480) return 4;
    if (w < 768) return 6;
    if (w < 1024) return 8;
    return 12;
  }

  function spawnFish() {
    if (fishes.length >= MAX_FISH) return;
    var fromRight = Math.random() > 0.5;
    var spd = 0.15 + Math.random() * 0.25;
    fishes.push({
      x: fromRight ? canvas.width + 20 : -20,
      y: 30 + Math.random() * (canvas.height - 80),
      size: 8 + Math.random() * 14,
      speed: spd,
      vx: fromRight ? -spd : spd,
      vy: (Math.random() - 0.5) * 0.1,
      phase: Math.random() * Math.PI * 2,
      tailPhase: Math.random() * Math.PI * 2,
      color: FISH_COLORS[Math.floor(Math.random() * FISH_COLORS.length)],
      alpha: 0.45 + Math.random() * 0.3,
      panic: false,
      panicVx: 0,
      panicVy: 0,
      targetVx: 0,
      targetVy: 0,
      nomCooldown: 0,
      bites: 0,
    });
  }

  function drawFish(f) {
    var s = f.size;
    var bl = s * 1.5;
    var angle = Math.atan2(f.vy, f.vx);
    var wag = Math.sin(f.tailPhase) * 0.25;

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(angle);
    ctx.globalAlpha = f.alpha;

    ctx.beginPath();
    ctx.ellipse(0, 0, bl / 2, s / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = f.color;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-bl / 2, 0);
    ctx.lineTo(-bl / 2 - s * 0.6, -s * 0.3 + wag * s * 0.3);
    ctx.lineTo(-bl / 2 - s * 0.6, s * 0.3 + wag * s * 0.3);
    ctx.closePath();
    ctx.fillStyle = f.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(bl / 3, -s * 0.15, s * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = "#222";
    ctx.fill();

    ctx.restore();
  }

  function scareFish(f, cx, cy) {
    var dx = f.x - cx;
    var dy = f.y - cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 200) {
      var angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.6;
      var power = 4 + Math.random() * 3;
      f.panicVx += Math.cos(angle) * power;
      f.panicVy += Math.sin(angle) * power;
      f.panic = true;
    }
  }

  document.addEventListener("click", function (e) {
    if (!running) return;
    var cx = e.clientX;
    var cy = e.clientY + window.scrollY;
    for (var i = 0; i < fishes.length; i++) {
      scareFish(fishes[i], cx, cy);
    }
  });

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var now = Date.now();
    idle = now - lastMouseMove > 3000;

    if (Math.random() < 0.05) {
      bubbles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 5,
        size: 2 + Math.random() * 5,
        speed: 0.2 + Math.random() * 0.4,
        wobble: Math.random() * Math.PI * 2,
      });
    }
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      b.y -= b.speed;
      b.wobble += 0.03;
      b.x += Math.sin(b.wobble) * 0.3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fill();
      if (b.y < -10) bubbles.splice(i, 1);
    }

    for (var i = noms.length - 1; i >= 0; i--) {
      noms[i].life--;
      if (noms[i].life <= 0) { noms.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.min(1, noms[i].life / 30);
      ctx.fillStyle = noms[i].color;
      ctx.font = "bold " + (11 + noms[i].size * 0.4) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("*nom*", noms[i].x, noms[i].y - (60 - noms[i].life) * 0.4);
      ctx.restore();
    }

    var nibbleCount = 0;
    var targetingCount = 0;

    for (var i = fishes.length - 1; i >= 0; i--) {
      var f = fishes[i];

      if (f.nomCooldown > 0) f.nomCooldown--;

      for (var j = 0; j < fishes.length; j++) {
        if (i === j) continue;
        var o = fishes[j];
        var adx = f.x - o.x;
        var ady = f.y - o.y;
        var ad = Math.sqrt(adx * adx + ady * ady);
        if (ad < f.size * 2 && ad > 0.1) {
          f.targetVx += (adx / ad) * 0.003;
          f.targetVy += (ady / ad) * 0.003;
        }
      }

      if (f.bites >= 3) {
        var edgeX = f.x < canvas.width * 0.5 ? -200 : canvas.width + 200;
        var targetSpd = f.speed * 4;
        f.targetVx = (edgeX - f.x) > 0 ? targetSpd : -targetSpd;
        f.targetVy = 0;
      } else if (f.panic) {
        f.vx += (f.panicVx - f.vx) * 0.03;
        f.vy += (f.panicVy - f.vy) * 0.03;
        f.panicVx *= 0.96;
        f.panicVy *= 0.96;
        f.targetVx = f.vx;
        f.targetVy = f.vy;
        var ps = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
        if (ps < f.speed && Math.abs(f.panicVx) < f.speed * 0.5) {
          f.panic = false;
          var spd = 0.15 + Math.random() * 0.25;
          var a = Math.random() * Math.PI * 2;
          f.targetVx = Math.cos(a) * spd;
          f.targetVy = Math.sin(a) * spd * 0.5;
        }
      } else if (idle) {
        var dx = mouseX - f.x;
        var dy = mouseY - f.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 600 && targetingCount < 2 && f.nomCooldown === 0) {
          targetingCount++;
          var a = Math.atan2(dy, dx);
          f.targetVx = Math.cos(a) * f.speed * 1.5;
          f.targetVy = Math.sin(a) * f.speed * 1.5;
        } else {
          var spd = Math.sqrt(f.targetVx * f.targetVx + f.targetVy * f.targetVy);
          if (spd < f.speed * 0.7) {
            var dir = f.x > canvas.width * 0.5 ? -1 : 1;
            f.targetVx = dir * f.speed;
            f.targetVy = (Math.random() - 0.5) * f.speed * 0.3;
          }
          f.targetVx += (Math.random() - 0.5) * 0.005;
          f.targetVy += (Math.random() - 0.5) * 0.005;
          var ns = Math.sqrt(f.targetVx * f.targetVx + f.targetVy * f.targetVy);
          if (ns > f.speed * 1.3) {
            f.targetVx = (f.targetVx / ns) * f.speed * 1.3;
            f.targetVy = (f.targetVy / ns) * f.speed * 1.3;
          }
        }
        var ang = Math.atan2(f.vy, f.vx);
        var bl = f.size * 1.5;
        var mouthX = f.x + Math.cos(ang) * bl / 2;
        var mouthY = f.y + Math.sin(ang) * bl / 2;
        var mouthDist = Math.sqrt((mouthX - mouseX) * (mouthX - mouseX) + (mouthY - mouseY) * (mouthY - mouseY));
        if (mouthDist < 15 && f.nomCooldown === 0 && nibbleCount < 2 && f.bites < 3) {
          noms.push({
            x: mouseX + (Math.random() - 0.5) * 8,
            y: mouseY - f.size * 0.5,
            life: 60,
            color: f.color,
            size: f.size,
          });
          f.nomCooldown = 120;
          f.bites++;
          nibbleCount++;
          f.vx = -(dx / dist) * f.speed * 5;
          f.vy = -(dy / dist) * f.speed * 5;
          f.targetVx = f.vx;
          f.targetVy = f.vy;
        }
      } else {
        var spd = Math.sqrt(f.targetVx * f.targetVx + f.targetVy * f.targetVy);
        if (spd < f.speed * 0.7) {
          var dir = f.x > canvas.width * 0.5 ? -1 : 1;
          f.targetVx = dir * f.speed;
          f.targetVy = (Math.random() - 0.5) * f.speed * 0.3;
        }
        f.targetVx += (Math.random() - 0.5) * 0.005;
        f.targetVy += (Math.random() - 0.5) * 0.005;
        var ns = Math.sqrt(f.targetVx * f.targetVx + f.targetVy * f.targetVy);
        if (ns > f.speed * 1.3) {
          f.targetVx = (f.targetVx / ns) * f.speed * 1.3;
          f.targetVy = (f.targetVy / ns) * f.speed * 1.3;
        }
      }

      if (f.bites < 3) {
        if (f.x < 100) f.targetVx += (1 - f.x / 100) * 0.04;
        if (f.x > canvas.width - 100) f.targetVx -= (1 - (canvas.width - f.x) / 100) * 0.04;
      }

      f.vx += (f.targetVx - f.vx) * 0.04;
      f.vy += (f.targetVy - f.vy) * 0.04;
      f.x += f.vx;
      f.y += f.vy;
      f.tailPhase += 0.08 + Math.sqrt(f.vx * f.vx + f.vy * f.vy) * 0.08;

      if (f.y < 10) { f.y = 10; f.vy = Math.abs(f.vy) * 0.5; }
      if (f.y > canvas.height - 10) { f.y = canvas.height - 10; f.vy = -Math.abs(f.vy) * 0.5; }

      if (f.x < -100 || f.x > canvas.width + 100) {
        fishes.splice(i, 1);
        spawnFish();
        continue;
      }

      drawFish(f);
    }

    if (fishes.length < MAX_FISH && Math.random() < 0.02) spawnFish();

    if (running) animId = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    fishes = [];
    noms = [];
    bubbles = [];
    resize();
    var w = window.innerWidth;
    var initial = w < 480 ? 2 : w < 768 ? 3 : w < 1024 ? 4 : 6;
    for (var i = 0; i < initial; i++) spawnFish();
    frame();
  }

  function stop() {
    running = false;
    cancelAnimationFrame(animId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return { start: start, stop: stop };
}
