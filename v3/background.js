let currentPeriod = null;
let lastBgIndex = -1;
const bgList = [];
let bgReady = false;
let bgVideoEl = null;
let lastFallbackIdx = -1;

const fallbackGradients = [
  "linear-gradient(135deg, #0b0b0b, #0c0c0c, #0a0f0b)",
  "linear-gradient(135deg, #0a0a0a, #0b0b0b, #0b0e0c)",
  "linear-gradient(135deg, #0b0b0b, #0c0c0c, #090d0b)",
];

function detectBgVideos() {
  let misses = 0;
  function tryNext(n) {
    if (n > 99 || misses >= 3) {
      bgReady = true;
      return;
    }
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.muted = true;
    const timeout = setTimeout(() => {
      vid.removeEventListener("canplay", oncanplay);
      vid.removeEventListener("error", onerror);
      misses++;
      tryNext(n + 1);
    }, 4000);
    function oncanplay() {
      clearTimeout(timeout);
      vid.removeEventListener("canplay", oncanplay);
      vid.removeEventListener("error", onerror);
      misses = 0;
      const wasEmpty = bgList.length === 0;
      bgList.push({ type: "vid", path: "bgs/" + n + ".mp4" });
      if (wasEmpty) {
        const entry = getRandomBg();
        if (entry) applyBgEntry(entry);
      }
      tryNext(n + 1);
    }
    function onerror() {
      clearTimeout(timeout);
      vid.removeEventListener("canplay", oncanplay);
      vid.removeEventListener("error", onerror);
      misses++;
      tryNext(n + 1);
    }
    vid.addEventListener("canplay", oncanplay);
    vid.addEventListener("error", onerror);
    vid.src = "bgs/" + n + ".mp4";
    vid.load();
  }
  tryNext(1);
}

function getRandomBg() {
  if (bgList.length === 0) return null;
  let idx;
  do {
    idx = Math.floor(Math.random() * bgList.length);
  } while (idx === lastBgIndex && bgList.length > 1);
  lastBgIndex = idx;
  return bgList[idx];
}

function getFallbackBg() {
  let idx;
  do {
    idx = Math.floor(Math.random() * fallbackGradients.length);
  } while (idx === lastFallbackIdx && fallbackGradients.length > 1);
  lastFallbackIdx = idx;
  return fallbackGradients[idx];
}

function applyBgEntry(entry) {
  if (!entry) return;
  if (entry.type === "vid") {
    if (bgVideoEl) {
      bgVideoEl.pause();
      bgVideoEl.remove();
    }
    bgVideoEl = document.createElement("video");
    bgVideoEl.src = entry.path;
    bgVideoEl.muted = true;
    bgVideoEl.loop = false;
    bgVideoEl.playsInline = true;
    bgVideoEl.preload = "auto";
    bgVideoEl.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;filter:brightness(0.35) blur(6px);";
    document.body.insertBefore(bgVideoEl, document.body.firstChild);
    bgVideoEl.addEventListener("loadedmetadata", () => {
      bgVideoEl.currentTime = 9;
      bgVideoEl.play().catch(() => {});
    });
    bgVideoEl.addEventListener("ended", changeBackgroundRandomly);
  } else {
    if (bgVideoEl) {
      bgVideoEl.pause();
      bgVideoEl.remove();
      bgVideoEl = null;
    }
    document.body.style.backgroundImage = entry.path.indexOf("linear-gradient") === 0 ? entry.path : "url(" + entry.path + ")";
  }
}

function changeBackgroundWithOverlay(entry) {
  const overlay = document.getElementById("timeOverlay");
  overlay.classList.remove("fade-out");
  overlay.classList.add("active");
  setTimeout(() => {
    applyBgEntry(entry);
    overlay.classList.remove("active");
    overlay.classList.add("fade-out");
  }, 1500);
}

function changeBackgroundRandomly() {
  const entry = getRandomBg() || { type: "img", path: getFallbackBg() };
  if (!entry) return;
  changeBackgroundWithOverlay(entry);
}

export function preloadBackgrounds() {
  detectBgVideos();
}

export function setBackground() {
  const now = new Date();
  const hours = now.getHours();
  const totalMinutes = hours * 60 + now.getMinutes();
  let period;
  if (totalMinutes >= 300 && totalMinutes <= 810) {
    period = "day";
  } else if (totalMinutes >= 811 && totalMinutes <= 1080) {
    period = "afternoon";
  } else {
    period = "night";
  }
  if (period !== currentPeriod) {
    const prevPeriod = currentPeriod;
    currentPeriod = period;
    const entry = getRandomBg() || { type: "img", path: getFallbackBg() };
    if (prevPeriod === null) {
      applyBgEntry(entry);
      return;
    }
    changeBackgroundWithOverlay(entry);
  }
}
