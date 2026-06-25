import { player } from "./music.js";
import { stopSnowDraw } from "./snow.js";

let didTrigger = false;
let keyBuffer = "";

export function initEasterEgg() {
  document.addEventListener("keydown", (e) => {
    keyBuffer += e.key.toLowerCase();
    if (keyBuffer.length > 9) keyBuffer = keyBuffer.slice(-9);
    if (keyBuffer === "stupidcat") {
      keyBuffer = "";
      trigger();
    }
  });
}

function trigger() {
  if (didTrigger) return;
  didTrigger = true;
  stopSnowDraw();

  const speedUpSnow = setInterval(() => {
    document.querySelectorAll(".snowflake").forEach((snow) => {
      const t = parseFloat(snow.style.top);
      if (!isNaN(t)) {
        snow.style.top = t + 25 + "px";
      }
    });
  }, 16);

  const fadeInterval = setInterval(() => {
    if (player.volume > 0.01) {
      player.volume = Math.max(0, player.volume - 0.02);
    } else {
      player.pause();
      clearInterval(fadeInterval);
    }
  }, 50);

  const blackOverlay = document.createElement("div");
  blackOverlay.style.cssText =
    "position:fixed;inset:0;background:#000;z-index:9998;opacity:0;transition:opacity 1s ease;pointer-events:none;";
  document.body.appendChild(blackOverlay);
  setTimeout(() => { blackOverlay.style.opacity = "1"; }, 50);

  const els = document.querySelectorAll(".name, .tagline, .profile, .links, .player");
  els.forEach((el) => {
    el.style.transition = "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)";
    el.style.opacity = "0";
    el.style.transform = "translateY(-10px)";
  });

  setTimeout(() => {
    const cd = document.createElement("div");
    cd.style.cssText =
      "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:Inter,sans-serif;font-weight:700;font-size:0;color:#10b981;opacity:0;transition:all 1s cubic-bezier(0.2,0.9,0.4,1.1);z-index:10000;text-align:center;pointer-events:none;";
    document.body.appendChild(cd);
    setTimeout(() => {
      cd.style.fontSize = "clamp(3rem, 12vw, 7rem)";
      cd.style.opacity = "1";
    }, 100);

    let count = 1.0;
    const update = setInterval(() => {
      if (count <= 0.01) {
        clearInterval(update);
        cd.style.transition = "all 0.5s cubic-bezier(0.4, 0, 1, 1)";
        cd.style.transform = "translate(-50%, -50%) scale(0)";
        cd.style.opacity = "0";
        setTimeout(() => {
          cd.remove();
          const img = document.createElement("img");
          img.src = "cats/funny.png";
          img.style.cssText =
            "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:90%;max-width:800px;z-index:10002;border-radius:10px;box-shadow:0 0 80px rgba(16,185,129,0.2);pointer-events:none;";
          document.body.appendChild(img);
          new Audio("cats/meow.mp3").play();
          clearInterval(speedUpSnow);
          setTimeout(() => {
            document.querySelectorAll(".snowflake").forEach((s) => s.remove());
          }, 500);
        }, 1500);
      } else {
        count -= 0.05;
        cd.textContent = count <= 0 ? "0.00" : count.toFixed(2);
      }
    }, 50);
  }, 1000);
}
