import { initOverlay } from "./overlay.js";
import { preloadBackgrounds, setBackground } from "./background.js";
import { initSnow, drawSnow } from "./snow.js";
import { connectLanyard } from "./discord.js";
import { playNext } from "./music.js";
import { initAgeDisplay } from "./age.js";
import { initEasterEgg } from "./easteregg.js";
import { getAudioContext } from "./visualizer.js";
import { initGuestbook } from "./guestbook.js";

function initMainContent() {
  preloadBackgrounds();
  setBackground();
  setInterval(setBackground, 60000);
  initSnow();
  drawSnow();
  connectLanyard();
  initAgeDisplay();
  document.getElementById("volumeValue").textContent = "25";
  document.getElementById("volumeSlider").value = "25";
}

document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("mousedown", (e) => {
  if (e.button === 1) e.preventDefault();
});
document.addEventListener("dblclick", (e) => e.preventDefault());

window.addEventListener("pageshow", () => {
  document.getElementById("player").classList.remove("hidden");
  const ac = getAudioContext();
  if (ac && ac.state === "suspended") ac.resume();
});


initOverlay(() => {
  initMainContent();
  playNext();
});
initGuestbook();
initEasterEgg();
