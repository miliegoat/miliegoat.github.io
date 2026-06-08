import { fmtSeconds } from "./utils.js";

export function initAudioPlayer() {
  const audio = document.getElementById("audio");
  if (!audio) return;

  function togglePlay() {
    if (audio.paused) {
      audio.play().catch(() => {});
      document.getElementById("playIcon").innerHTML =
        '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    } else {
      audio.pause();
      document.getElementById("playIcon").innerHTML =
        '<path d="M8 5v14l11-7z"/>';
    }
  }

  function setVolume(v) {
    audio.volume = v;
    audio.muted = false;
    updateVolIcon(v);
    if (volSlider) {
      const computedStyle = getComputedStyle(document.documentElement);
      const accent = computedStyle.getPropertyValue("--accent").trim();
      const border = computedStyle.getPropertyValue("--border").trim();
      volSlider.style.background =
        "linear-gradient(to right, " +
        accent +
        " " +
        v * 100 +
        "%, " +
        border +
        " " +
        v * 100 +
        "%)";
    }
  }

  function toggleMute() {
    audio.muted = !audio.muted;
    updateVolIcon(audio.muted ? 0 : audio.volume);
  }

  function updateVolIcon(v) {
    let path;
    if (v == 0) {
      path =
        "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z";
    } else if (v < 0.5) {
      path =
        "M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z";
    } else {
      path =
        "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z";
    }
    const volIcon = document.getElementById("volIcon");
    if (volIcon) volIcon.innerHTML = '<path d="' + path + '"/>';
  }

  function seek(e) {
    if (!audio.duration) return;
    audio.currentTime =
      (e.offsetX / e.currentTarget.clientWidth) * audio.duration;
  }

  const playBtn = document.getElementById("playBtn");
  const muteBtn = document.getElementById("muteBtn");
  const volSlider = document.getElementById("volSlider");
  const progressBar = document.getElementById("progressBar");

  if (playBtn) playBtn.addEventListener("click", togglePlay);
  if (muteBtn) muteBtn.addEventListener("click", toggleMute);
  if (volSlider)
    volSlider.addEventListener("input", (e) =>
      setVolume(parseFloat(e.target.value)),
    );
  if (progressBar) progressBar.addEventListener("click", seek);

  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    const progressFill = document.getElementById("progressFill");
    const currentTimeEl = document.getElementById("currentTime");
    if (progressFill)
      progressFill.style.width =
        (audio.currentTime / audio.duration) * 100 + "%";
    if (currentTimeEl)
      currentTimeEl.textContent = fmtSeconds(audio.currentTime);
  });

  audio.addEventListener("loadedmetadata", () => {
    const durationEl = document.getElementById("durationEl");
    if (durationEl) durationEl.textContent = fmtSeconds(audio.duration);
    if (volSlider) {
      const computedStyle = getComputedStyle(document.documentElement);
      const accent = computedStyle.getPropertyValue("--accent").trim();
      const border = computedStyle.getPropertyValue("--border").trim();
      volSlider.style.background =
        "linear-gradient(to right, " +
        accent +
        " " +
        volSlider.value * 100 +
        "%, " +
        border +
        " " +
        volSlider.value * 100 +
        "%)";
    }
  });

  audio.addEventListener("ended", () => {
    const playIcon = document.getElementById("playIcon");
    const progressFill = document.getElementById("progressFill");
    const currentTimeEl = document.getElementById("currentTime");
    if (playIcon) playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    if (progressFill) progressFill.style.width = "0%";
    if (currentTimeEl) currentTimeEl.textContent = "0:00";
  });

  if (volSlider) {
    const initStyle = getComputedStyle(document.documentElement);
    const initAccent = initStyle.getPropertyValue("--accent").trim();
    const initBorder = initStyle.getPropertyValue("--border").trim();
    volSlider.style.background =
      "linear-gradient(to right, " +
      initAccent +
      " 100%, " +
      initBorder +
      " 100%)";
  }
  if (audio.duration) {
    const durationEl = document.getElementById("durationEl");
    if (durationEl) durationEl.textContent = fmtSeconds(audio.duration);
  }
}
