import { initAudioContext } from "./visualizer.js";
import { updateLyrics, cleanName } from "./lyrics.js";

const musicTracks = [
  "media/music/lucille - breakdowns.mp3",
  "media/music/jaydes - vivienne.mp3",
  "media/music/jacari - imma jerk.mp3",
  "media/music/bunii - galore galore galore.mp3",
  "media/music/bunii - REGRET.mp3",
];

export const player = document.getElementById("musicPlayer");
let lastTrackIndex = -1;
let firstPlay = true;

const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const playIconPath = document.getElementById("playIconPath");
const PLAY_PATH = "M8 5v14l11-7z";
const PAUSE_PATH = "M7 5h4v14H7zM13 5h4v14h-4z";
const volumeSlider = document.getElementById("volumeSlider");
const volumeValue = document.getElementById("volumeValue");
const timeDisplay = document.getElementById("timeDisplay");
const progressFill = document.getElementById("progressFill");
const progressBarBg = document.getElementById("progressBarBg");

function setPlayIcon(isPlaying) {
  playIconPath.setAttribute("d", isPlaying ? PAUSE_PATH : PLAY_PATH);
}

function playTrack(track) {
  player.src = track;
  player.volume = volumeSlider.value / 500;
  const startPlay = () => {
    initAudioContext();
    player.play()
      .then(() => {
        document.getElementById("nowPlaying").textContent = cleanName(track);
      })
      .catch(() => {});
  };
  startPlay();
}

export function playNext() {
  if (musicTracks.length === 0) {
    document.getElementById("nowPlaying").textContent = "no tracks loaded";
    return;
  }
  let idx;
  if (firstPlay) {
    firstPlay = false;
    idx = 0;
  } else {
    idx = (lastTrackIndex + 1) % musicTracks.length;
  }
  lastTrackIndex = idx;
  playTrack(musicTracks[idx]);
}

function playPrev() {
  if (musicTracks.length === 0) return;
  const idx = (lastTrackIndex - 1 + musicTracks.length) % musicTracks.length;
  lastTrackIndex = idx;
  playTrack(musicTracks[idx]);
}

player.addEventListener("ended", playNext);
player.addEventListener("play", () => setPlayIcon(true));
player.addEventListener("pause", () => setPlayIcon(false));

playBtn.addEventListener("click", () => {
  if (musicTracks.length === 0) return;
  if (player.paused) {
    player.play();
    setPlayIcon(true);
  } else {
    player.pause();
    setPlayIcon(false);
  }
});

nextBtn.addEventListener("click", playNext);

prevBtn.addEventListener("click", playPrev);

volumeSlider.addEventListener("input", (e) => {
  const value = e.target.value;
  player.volume = value / 500;
  volumeValue.textContent = value;
});

player.addEventListener("timeupdate", () => {
  const current = player.currentTime;
  const duration = player.duration;
  if (duration > 0) {
    const minutes = Math.floor(current / 60);
    const seconds = Math.floor(current % 60);
    timeDisplay.textContent = minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
    progressFill.style.width = (current / duration) * 100 + "%";
  }
  updateLyrics();
});

progressBarBg.addEventListener("click", (e) => {
  if (player.duration > 0) {
    const rect = progressBarBg.getBoundingClientRect();
    player.currentTime = ((e.clientX - rect.left) / rect.width) * player.duration;
  }
});
