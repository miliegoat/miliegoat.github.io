let snowflakes = [];
let snowTime = 0;
let stopDraw = false;

function Random() {
  this.seed = Math.random();
  this.nextFloat = function () {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  };
}

export function initSnow() {
  const random = new Random();
  snowflakes = [];
  const count = window.innerWidth < 540 ? 50 : window.innerWidth < 768 ? 80 : 150;
  for (let i = 0; i < count; i++) {
    snowflakes.push({
      offsetX: random.nextFloat() * 1000,
      size: i % 5 === 0 ? 2 : 1,
    });
  }
}

export function drawSnow() {
  if (stopDraw) {
    requestAnimationFrame(drawSnow);
    return;
  }
  snowTime += 0.016;
  document.querySelectorAll(".snowflake").forEach((s) => s.remove());

  for (let i = 0; i < snowflakes.length; i++) {
    const snow = snowflakes[i];
    const s = snow.offsetX;
    let x = ((i / 150) * window.innerWidth + Math.sin(snowTime * 0.2 + s) * 50) % window.innerWidth;
    let y = ((snowTime * (20 + (s % 20)) + s * 5) % (window.innerHeight + 100)) - 100;
    if (x < 0) x += window.innerWidth;
    if (y < -10 || y > window.innerHeight + 10) continue;

    let alpha = 0.6;
    if (y < 50) alpha *= y / 50;
    else if (y > window.innerHeight - 50) alpha *= (window.innerHeight - y) / 50;

    const flake = document.createElement("div");
    flake.className = "snowflake";
    flake.style.cssText = `left:${x}px;top:${y}px;width:${snow.size}px;height:${snow.size}px;opacity:${Math.max(0, alpha)}`;
    document.body.appendChild(flake);
  }
  requestAnimationFrame(drawSnow);
}

export function stopSnowDraw() {
  stopDraw = true;
}
