const player = document.getElementById("musicPlayer");
const lyricTrack = document.getElementById("lyricTrack");
let currentLyricIndex = -1;
let lyricsData = {};

export function cleanName(path) {
  try {
    path = decodeURIComponent(path);
  } catch (e) {}
  return path.replace(/^.*[\\\/]/, "").replace(".mp3", "");
}

function parseLRC(lrc) {
  if (!lrc) return [];
  const lines = [];
  const parts = lrc.split("\n");
  for (let i = 0; i < parts.length; i++) {
    const match = parts[i].match(/^\[(\d+):(\d+\.\d+)\](.*)/);
    if (match) {
      const time = parseInt(match[1], 10) * 60 + parseFloat(match[2]);
      const text = match[3].trim();
      if (text) lines.push({ time, line: text });
    }
  }
  return lines;
}

fetch("v3/lyrics.json")
  .then((r) => r.json())
  .then((data) => {
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        lyricsData[key] = parseLRC(data[key]);
      }
    }
  })
  .catch(() => {});

function buildLyricLines(lines) {
  if (!lyricTrack) return;
  lyricTrack.innerHTML = "";
  lyricTrack.style.transform = "translateY(0)";
  currentLyricIndex = -1;
  if (!lines || lines.length === 0) {
    lyricTrack.style.display = "none";
    return;
  }
  lyricTrack.style.display = "";

  for (let i = 0; i < lines.length; i++) {
    const el = document.createElement("span");
    el.className = "lyric-line";
    el.textContent = lines[i].line;
    lyricTrack.appendChild(el);
  }
}

export function updateLyrics() {
  const name = cleanName(player.src);
  const lines = lyricsData[name];

  if (!lines || lines.length === 0) {
    if (lyricTrack) {
      lyricTrack.textContent = "";
      lyricTrack.style.display = "none";
    }
    return;
  }

  if (
    lyricTrack.children.length !== lines.length ||
    lyricTrack.dataset.track !== name
  ) {
    buildLyricLines(lines);
    lyricTrack.dataset.track = name;
  }

  const current = player.currentTime;
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (current >= lines[i].time) {
      idx = i;
    }
  }

  if (idx === currentLyricIndex) return;
  currentLyricIndex = idx;

  const els = lyricTrack.children;
  for (let j = 0; j < els.length; j++) {
    els[j].className = "lyric-line";
  }

  if (idx >= 0 && idx < lines.length) {
    els[idx].classList.add("current");

    const container = lyricTrack.parentElement;
    const containerH = container.clientHeight;
    const elTop = els[idx].offsetTop;
    const elH = els[idx].offsetHeight;
    let target = -(elTop - (containerH - elH) / 2);
    const max = 0;
    const min = -(lyricTrack.scrollHeight - containerH);
    if (target > max) target = max;
    if (target < min) target = min;
    lyricTrack.style.transform = "translateY(" + target + "px)";
  } else {
    lyricTrack.style.transform = "translateY(0)";
  }
}