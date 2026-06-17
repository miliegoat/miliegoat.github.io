var FISH_COLORS = [
  "#4a8ba8", "#6abf8a", "#d4875e", "#8ba4b8",
  "#c46a4a", "#5a8a7a", "#7a9ac4", "#c4a84a",
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
  var seaBubbles = [];
  var plankton = [];

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
  var creatures = [];
  var running = false;
  var animId;
  var MAX_FISH = 12;
  var MAX_CREATURES = 3;

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
      tailPhase: Math.random() * Math.PI * 2,
      color: FISH_COLORS[Math.floor(Math.random() * FISH_COLORS.length)],
      alpha: 0.45 + Math.random() * 0.3,
      type: Math.floor(Math.random() * 3),
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
    var t = f.type || 0;

    ctx.save();
    ctx.translate(f.x, f.y);
    if (f.vx < 0) {
      ctx.scale(-1, 1);
      ctx.rotate(Math.atan2(f.vy, -f.vx));
    } else {
      ctx.rotate(angle);
    }
    ctx.globalAlpha = f.alpha;

    if (t === 1) {
      ctx.beginPath();
      ctx.ellipse(0, 0, bl / 2, s / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = f.color;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-bl / 2, 0);
      ctx.lineTo(-bl / 2 - s * 0.4, -s * 0.25 + wag * s * 0.2);
      ctx.lineTo(-bl / 2 - s * 0.4, s * 0.25 + wag * s * 0.2);
      ctx.closePath();
      ctx.fillStyle = f.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(bl / 3, -s * 0.15, s * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bl / 3 + s * 0.03, -s * 0.15, s * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = "#111";
      ctx.fill();
    } else if (t === 2) {
      ctx.beginPath();
      ctx.ellipse(0, 0, bl / 2, s * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = f.color;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-bl / 2, 0);
      ctx.lineTo(-bl / 2 - s * 0.45, -s * 0.15 + wag * s * 0.15);
      ctx.lineTo(-bl / 2 - s * 0.45, s * 0.15 + wag * s * 0.15);
      ctx.closePath();
      ctx.fillStyle = f.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(bl / 3, -s * 0.1, s * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bl / 3 + s * 0.02, -s * 0.1, s * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = "#111";
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 0, bl / 2, s / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = f.color;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-bl / 2, 0);
      ctx.lineTo(-bl / 2 - s * 0.65, -s * 0.35 + wag * s * 0.35);
      ctx.lineTo(-bl / 2 - s * 0.4, 0);
      ctx.lineTo(-bl / 2 - s * 0.65, s * 0.35 + wag * s * 0.35);
      ctx.closePath();
      ctx.fillStyle = f.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(bl / 3, -s * 0.15, s * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bl / 3 + s * 0.04, -s * 0.15, s * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = "#111";
      ctx.fill();
    }

    ctx.restore();
  }

  function spawnCreature(forceType) {
    if (creatures.length >= MAX_CREATURES) return;
    if (fishes.length < 2 && !forceType) return;

    var pool = [];
    if (fishes.length >= 2) pool.push("shark");
    if (fishes.length >= 3) pool.push("squid");
    if (fishes.length >= 4) pool.push("whale");

    var type = forceType || pool[Math.floor(Math.random() * pool.length)];
    var fromRight = Math.random() > 0.5;
    var size, speed, color;

    if (type === "shark") {
      size = 28 + Math.random() * 12;
      speed = 0.35 + Math.random() * 0.25;
      color = "#5a6a7a";
    } else if (type === "whale") {
      size = 45 + Math.random() * 25;
      speed = 0.3 + Math.random() * 0.15;
      color = "#4a6a8a";
    } else {
      size = 18 + Math.random() * 10;
      speed = 0.25 + Math.random() * 0.2;
      color = "#8a5a8a";
    }

    creatures.push({
      x: fromRight ? canvas.width + 50 : -50,
      y: 30 + Math.random() * (canvas.height - 80),
      size: size,
      speed: speed,
      vx: fromRight ? -speed : speed,
      vy: (Math.random() - 0.5) * 0.1,
      tailPhase: Math.random() * Math.PI * 2,
      color: color,
      alpha: 0.5 + Math.random() * 0.25,
      type: type,
      targetVx: 0,
      targetVy: 0,
      panic: false,
      panicVx: 0,
      panicVy: 0,
      huntCooldown: 300 + Math.random() * 300,
      eaten: 0,
      maxEats: type === "shark" ? 5 : type === "whale" ? 3 : 3,
      huntTarget: null,
      leaving: false,
    });
  }

  function drawCreature(c) {
    var s = c.size;
    ctx.save();
    ctx.translate(c.x, c.y);
    if (c.vx < 0) {
      ctx.scale(-1, 1);
      ctx.rotate(Math.atan2(c.vy, -c.vx));
    } else {
      ctx.rotate(Math.atan2(c.vy, c.vx));
    }
    ctx.globalAlpha = c.alpha;

    if (c.type === "shark") {
      ctx.beginPath();
      ctx.moveTo(s * 1.2, 0);
      ctx.quadraticCurveTo(s * 0.8, -s * 0.4, -s * 0.5, -s * 0.35);
      ctx.quadraticCurveTo(-s * 0.85, -s * 0.2, -s * 0.9, 0);
      ctx.quadraticCurveTo(-s * 0.85, s * 0.2, -s * 0.5, s * 0.35);
      ctx.quadraticCurveTo(s * 0.8, s * 0.4, s * 1.2, 0);
      ctx.closePath();
      ctx.fillStyle = c.color;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -s * 0.35);
      ctx.lineTo(s * 0.15, -s * 0.7);
      ctx.lineTo(s * 0.3, -s * 0.35);
      ctx.closePath();
      ctx.fill();

      var wag = Math.sin(c.tailPhase) * 0.3;
      ctx.beginPath();
      ctx.moveTo(-s * 0.9, 0);
      ctx.lineTo(-s * 1.3, -s * 0.4 + wag * s * 0.2);
      ctx.lineTo(-s * 0.7, 0);
      ctx.lineTo(-s * 1.3, s * 0.4 + wag * s * 0.2);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(s * 0.4, -s * 0.15, s * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.44, -s * 0.15, s * 0.04, 0, Math.PI * 2);
      ctx.fillStyle = "#111";
      ctx.fill();
    } else if (c.type === "whale") {
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.8, s * 0.45, 0, 0, Math.PI * 2);
      ctx.fillStyle = c.color;
      ctx.fill();

      var wag = Math.sin(c.tailPhase) * 0.25;
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, 0);
      ctx.lineTo(-s * 1.2, -s * 0.35 + wag * s * 0.2);
      ctx.lineTo(-s * 0.6, 0);
      ctx.lineTo(-s * 1.2, s * 0.35 + wag * s * 0.2);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(s * 0.4, -s * 0.15, s * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.44, -s * 0.15, s * 0.035, 0, Math.PI * 2);
      ctx.fillStyle = "#111";
      ctx.fill();
    } else if (c.type === "squid") {
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.6, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = c.color;
      ctx.fill();

      for (var t = 0; t < 6; t++) {
        var ta = (t / 6) * Math.PI - Math.PI / 2;
        var tx = -s * 0.6 + Math.cos(ta) * s * 0.05;
        var ty = Math.sin(ta) * s * 0.05;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(-s * 0.8 + Math.sin(c.tailPhase + t) * s * 0.08, ta * s * 0.12, -s * 1.0, 0);
        ctx.strokeStyle = c.color;
        ctx.lineWidth = s * 0.04;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(s * 0.3, -s * 0.1, s * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.3, -s * 0.1, s * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = "#111";
      ctx.fill();
    }

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

    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      var dx = cx - b.x;
      var dy = cy - b.y;
      if (Math.sqrt(dx * dx + dy * dy) < b.size + 4) {
        bubbles.splice(i, 1);
        for (var p = 0; p < 4; p++) {
          noms.push({
            x: b.x + (Math.random() - 0.5) * 6,
            y: b.y + (Math.random() - 0.5) * 6,
            life: 20,
            color: "#fff",
            size: b.size * 0.3,
            text: "pop",
          });
        }
      }
    }

    for (var i = 0; i < fishes.length; i++) {
      scareFish(fishes[i], cx, cy);
    }
    for (var i = 0; i < creatures.length; i++) {
      scareFish(creatures[i], cx, cy);
    }
  });

  var pressedKeys = {};
  document.addEventListener("keydown", function (e) {
    pressedKeys[e.key.toLowerCase()] = true;
    if (pressedKeys["g"] && pressedKeys["x"] && pressedKeys["j"]) {
      if (running) {
        spawnCreature("squid");
        setTimeout(function () {
          spawnCreature("squid");
        }, 100);
      }
    }
  });
  document.addEventListener("keyup", function (e) {
    pressedKeys[e.key.toLowerCase()] = false;
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
        speed: 0.3 + Math.random() * 0.3,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.01 + Math.random() * 0.01,
      });
    }
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      b.y -= b.speed;
      b.wobble += b.wobbleSpeed;
      b.x += Math.sin(b.wobble) * 0.08;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fill();
      if (b.y < -10) bubbles.splice(i, 1);
    }

    for (var i = 0; i < plankton.length; i++) {
      var p = plankton[i];
      p.y -= p.speed;
      p.x += Math.sin(p.wobble) * 0.1;
      p.wobble += 0.02;
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      if (p.y < -10) {
        p.y = canvas.height + 10;
        p.x = Math.random() * canvas.width;
      }
    }

    for (var i = noms.length - 1; i >= 0; i--) {
      noms[i].life--;
      if (noms[i].life <= 0) { noms.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.min(1, noms[i].life / 30);
      ctx.fillStyle = noms[i].color;
      ctx.font = "bold " + (11 + noms[i].size * 0.4) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(noms[i].text || "*nom*", noms[i].x, noms[i].y - (60 - noms[i].life) * 0.4);
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

      for (var k = 0; k < creatures.length; k++) {
        var cr = creatures[k];
        var fdx = f.x - cr.x;
        var fdy = f.y - cr.y;
        var fd = Math.sqrt(fdx * fdx + fdy * fdy);
        if (fd < 250 && fd > 0.1) {
          var fleeStr = cr.type === "shark" ? 0.02 : cr.type === "squid" ? 0.015 : 0.01;
          f.targetVx += (fdx / fd) * fleeStr;
          f.targetVy += (fdy / fd) * fleeStr;
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
        if (f.x < 150) f.targetVx += (1 - f.x / 150) * 0.06;
        if (f.x > canvas.width - 150) f.targetVx -= (1 - (canvas.width - f.x) / 150) * 0.06;
      }
      if (f.y < 120) f.targetVy += (1 - f.y / 120) * 0.06;
      if (f.y > canvas.height - 120) f.targetVy -= (1 - (canvas.height - f.y) / 120) * 0.06;

      f.vx += (f.targetVx - f.vx) * 0.04;
      f.vy += (f.targetVy - f.vy) * 0.04;
      f.x += f.vx;
      f.y += f.vy;
      f.tailPhase += 0.08 + Math.sqrt(f.vx * f.vx + f.vy * f.vy) * 0.08;

      if (f.y < 5) { f.y = 5; f.vy = Math.abs(f.vy) * 0.6; f.targetVy = Math.abs(f.targetVy) * 0.6; }
      if (f.y > canvas.height - 5) { f.y = canvas.height - 5; f.vy = -Math.abs(f.vy) * 0.6; f.targetVy = -Math.abs(f.targetVy) * 0.6; }

      if (f.x < -150 || f.x > canvas.width + 150) {
        if (f.bites >= 3) {
          fishes.splice(i, 1);
          spawnFish();
          continue;
        }
        var dir = f.x < 0 ? 1 : -1;
        f.targetVx = dir * f.speed * 2;
        f.targetVy = (Math.random() - 0.5) * f.speed * 0.5;
        f.vx = f.targetVx;
        f.vy = f.targetVy;
        f.x = f.x < 0 ? -20 : canvas.width + 20;
      }

      drawFish(f);
    }

    if (fishes.length < MAX_FISH && Math.random() < 0.02) spawnFish();

    if (fishes.length >= 2 && Math.random() < 0.004) spawnCreature();

    for (var i = creatures.length - 1; i >= 0; i--) {
      var c = creatures[i];

      if (c.leaving) {
        var spd = c.speed * 3;
        var ex = c.x < canvas.width * 0.5 ? -200 : canvas.width + 200;
        c.targetVx = (ex - c.x) > 0 ? spd : -spd;
        c.targetVy = 0;
      } else {
        c.huntCooldown--;
        if (c.huntCooldown <= 0) {
          c.huntCooldown = 120 + Math.random() * 180;
          var nearest = null;
          var nearDist = c.type === "whale" ? 500 : c.type === "shark" ? 400 : 350;

          if (c.type === "whale") {
            for (var j = 0; j < creatures.length; j++) {
              if (creatures[j] === c || creatures[j].type !== "shark") continue;
              if (creatures[j].size >= c.size * 0.5) continue;
              var dx = creatures[j].x - c.x;
              var dy = creatures[j].y - c.y;
              var dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < nearDist) { nearDist = dist; nearest = creatures[j]; }
            }
          } else {
            var preyArr = fishes;
            for (var j = 0; j < preyArr.length; j++) {
              if (preyArr[j].size >= c.size * 0.55) continue;
              var dx = preyArr[j].x - c.x;
              var dy = preyArr[j].y - c.y;
              var dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < nearDist) { nearDist = dist; nearest = preyArr[j]; }
            }
          }
          c.huntTarget = nearest;
        }

        if (c.huntTarget) {
          var dx = c.huntTarget.x - c.x;
          var dy = c.huntTarget.y - c.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 5) {
            c.targetVx = (dx / dist) * c.speed * 1.5;
            c.targetVy = (dy / dist) * c.speed * 1.5;
          }
          if (dist < c.size * 1.0) {
            var isCreature = creatures.indexOf(c.huntTarget) !== -1;
            var preyArr2 = isCreature ? creatures : fishes;
            var idx = preyArr2.indexOf(c.huntTarget);
            if (idx !== -1) {
              var eatText = c.type === "shark" ? "*chomp*" : c.type === "whale" ? "*gulp*" : "*squish*";
              noms.push({
                x: c.x + (Math.random() - 0.5) * 20,
                y: c.y - c.size * 0.5,
                life: 60,
                color: c.color,
                size: c.size * 0.5,
                text: eatText,
              });
              preyArr2.splice(idx, 1);
              c.eaten++;
              c.huntCooldown = 1200;
              c.huntTarget = null;
              if (c.eaten >= c.maxEats) c.leaving = true;
            }
          }
          if (!c.huntTarget || dist > 600) c.huntTarget = null;
        } else {
          var spd = Math.sqrt(c.targetVx * c.targetVx + c.targetVy * c.targetVy);
          if (spd < c.speed * 0.5) {
            var dir = c.x > canvas.width * 0.5 ? -1 : 1;
            c.targetVx = dir * c.speed;
            c.targetVy = (Math.random() - 0.5) * c.speed * 0.3;
          }
          c.targetVx += (Math.random() - 0.5) * 0.003;
          c.targetVy += (Math.random() - 0.5) * 0.003;
        }
      }

      if (c.panic) {
        c.vx += (c.panicVx - c.vx) * 0.03;
        c.vy += (c.panicVy - c.vy) * 0.03;
        c.panicVx *= 0.96;
        c.panicVy *= 0.96;
        c.targetVx = c.vx;
        c.targetVy = c.vy;
        var ps = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
        if (ps < c.speed && Math.abs(c.panicVx) < c.speed * 0.5) {
          c.panic = false;
        }
      } else {
        c.vx += (c.targetVx - c.vx) * 0.03;
        c.vy += (c.targetVy - c.vy) * 0.03;
      }
      c.x += c.vx;
      c.y += c.vy;
      c.tailPhase += 0.06 + Math.sqrt(c.vx * c.vx + c.vy * c.vy) * 0.06;

      if (c.y < 10) { c.y = 10; c.vy = Math.abs(c.vy) * 0.5; }
      if (c.y > canvas.height - 10) { c.y = canvas.height - 10; c.vy = -Math.abs(c.vy) * 0.5; }

      if (c.x < -150 || c.x > canvas.width + 150) {
        creatures.splice(i, 1);
        continue;
      }

      drawCreature(c);
    }

    if (running) animId = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    fishes = [];
    creatures = [];
    noms = [];
    bubbles = [];
    resize();
    var w = window.innerWidth;
    var initial = w < 480 ? 2 : w < 768 ? 3 : w < 1024 ? 4 : 6;
    for (var i = 0; i < initial; i++) spawnFish();

    for (var i = 0; i < 8; i++) {
      var el = document.createElement("div");
      el.className = "sea-bubble";
      var size = 6 + Math.random() * 18;
      el.style.width = size + "px";
      el.style.height = size + "px";
      el.style.left = (5 + Math.random() * 90) + "%";
      el.style.bottom = (5 + Math.random() * 40) + "%";
      el.style.setProperty("--dur", (5 + Math.random() * 5) + "s");
      el.style.setProperty("--delay", (Math.random() * 8) + "s");
      page.appendChild(el);
      seaBubbles.push(el);
    }

    var sl = document.createElement("div");
    sl.className = "seaweed-left";
    page.appendChild(sl);
    seaBubbles.push(sl);

    var sr = document.createElement("div");
    sr.className = "seaweed-right";
    page.appendChild(sr);
    seaBubbles.push(sr);

    var scl = document.createElement("div");
    scl.className = "seaweed-center-left";
    page.appendChild(scl);
    seaBubbles.push(scl);

    var scr = document.createElement("div");
    scr.className = "seaweed-center-right";
    page.appendChild(scr);
    seaBubbles.push(scr);

    plankton = [];
    for (var i = 0; i < 20; i++) {
      plankton.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 0.5 + Math.random() * 1,
        speed: 0.05 + Math.random() * 0.1,
        wobble: Math.random() * Math.PI * 2,
      });
    }

    frame();
  }

  function stop() {
    running = false;
    cancelAnimationFrame(animId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < seaBubbles.length; i++) {
      if (seaBubbles[i].parentNode) seaBubbles[i].remove();
    }
    seaBubbles = [];
    creatures = [];
  }

  return { start: start, stop: stop };
}
