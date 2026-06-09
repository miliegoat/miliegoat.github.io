import {
  DISCORD_ID,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ICONS,
  BLOCKED_ACTIVITIES,
} from "./constants.js";
import { fmtMs, fmtDuration } from "./utils.js";
import {
  setCurrentSpotifyData,
  setCurrentTrackId,
  currentTrackId,
  lastProfileDataHash,
  setLastProfileDataHash,
  appIconCache,
  currentLyrics,
  setCurrentLyrics,
} from "./state.js";
import {
  fetchLyrics,
  openLyricsPanel,
  closeLyricsPanel,
  highlightLyric,
} from "./lyrics.js";

const MARK_TV = "\uD83D\uDCFA";
const MARK_GAME = "\uD83C\uDFAE";

let profileUpdateTimeout = null;
let gameActivityInterval = null;
let spotifyProgressInterval = null;
let hideSpotifyTimer = null;

function q(s) {
  return '"' + s + '"';
}

function resolveActivityImage(game) {
  const assets = game.assets || {};
  const image =
    assets.large_image ||
    assets.small_image ||
    assets.largeImage ||
    assets.smallImage;
  if (!image || typeof image !== "string") return null;
  if (image.startsWith("mp:external/")) {
    return "https://media.discordapp.net/" + image.slice(3) + "?size=64";
  }
  if (image.startsWith("mp:")) {
    const path = image.slice(3);
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return game.application_id
      ? "https://cdn.discordapp.com/app-assets/" +
          game.application_id +
          "/" +
          path +
          ".png?size=64"
      : null;
  }
  if (image.startsWith("https://") || image.startsWith("http://")) return image;
  return game.application_id
    ? "https://cdn.discordapp.com/app-assets/" +
        game.application_id +
        "/" +
        image +
        ".png?size=64"
    : null;
}

async function getApplicationIcon(appId) {
  if (!appId) return null;
  if (appIconCache.has(appId)) return appIconCache.get(appId);
  try {
    const res = await fetch(
      "https://discord.com/api/v10/applications/" + appId + "/rpc",
    );
    if (!res.ok) throw new Error();
    const data = await res.json();
    const url = data.icon
      ? "https://cdn.discordapp.com/app-icons/" +
        appId +
        "/" +
        data.icon +
        ".png?size=512"
      : null;
    appIconCache.set(appId, url);
    return url;
  } catch {
    appIconCache.set(appId, null);
    return null;
  }
}

function updateGameElapsed() {
  document
    .querySelectorAll(".activity-sub.activity-elapsed")
    .forEach(function (el) {
      const start = Number(el.dataset.start);
      const verb = el.dataset.verb || "played";
      if (start) el.textContent = verb + " " + fmtDuration(Date.now() - start);
    });
}

function startGameActivityTimer(activities) {
  clearInterval(gameActivityInterval);
  if (
    !activities.some(function (a) {
      return Boolean(a.timestamps && a.timestamps.start);
    })
  )
    return;
  updateGameElapsed();
  gameActivityInterval = setInterval(updateGameElapsed, 1000);
}

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function renderGameActivities(activities) {
  const cards = await Promise.all(
    activities
      .filter(function (a) {
        return (
          !BLOCKED_ACTIVITIES.includes(a.application_id) &&
          (a.type === 0 ||
            (a.type === 3 && a.application_id === "1224777421941899285"))
        );
      })
      .map(async function (activity, index) {
        let iconUrl = resolveActivityImage(activity);
        if (!iconUrl && activity.application_id)
          iconUrl = await getApplicationIcon(activity.application_id);
        const elapsed =
          activity.timestamps && activity.timestamps.start
            ? fmtDuration(Date.now() - activity.timestamps.start)
            : null;
        const verb = activity.type === 3 ? "watched" : "played";
        const elapsedHtml =
          activity.timestamps && activity.timestamps.start
            ? '<div class="activity-sub activity-elapsed" data-start="' +
              activity.timestamps.start +
              '" data-verb="' +
              verb +
              '">' +
              verb +
              " " +
              elapsed +
              "</div>"
            : "";
        const activityId =
          activity.id || activity.application_id || "activity-" + index;
        const icon = activity.type === 3 ? MARK_TV : MARK_GAME;
        const iconHtml = iconUrl
          ? '<img src="' +
            iconUrl +
            '" class="activity-art" loading="lazy" onerror="this.outerHTML=' +
            "'<div class=&quot;activity-art-placeholder&quot;>" +
            icon +
            "</div>'" +
            '"/>'
          : '<div class="activity-art-placeholder">' + icon + "</div>";
        return (
          '<div class="discord-activity" data-activity-id="' +
          activityId +
          '">' +
          '<div class="activity-inner">' +
          iconHtml +
          '<div class="activity-info">' +
          '<div class="activity-name">' +
          escapeAttr(activity.name) +
          "</div>" +
          (activity.details
            ? '<div class="activity-sub">' +
              escapeAttr(activity.details) +
              "</div>"
            : "") +
          (activity.state
            ? '<div class="activity-sub">' +
              escapeAttr(activity.state) +
              "</div>"
            : "") +
          elapsedHtml +
          "</div></div></div>"
        );
      }),
  );
  document.getElementById("gameActivities").innerHTML = cards.length
    ? '<div class="slide-in">' + cards.join("") + "</div>"
    : "";
  startGameActivityTimer(activities);
}

function renderProfileCard(discord_user, discord_status, activities) {
  const avatarUrl = discord_user.avatar
    ? "https://cdn.discordapp.com/avatars/" +
      discord_user.id +
      "/" +
      discord_user.avatar +
      "." +
      (discord_user.avatar.startsWith("a_") ? "gif" : "png") +
      "?size=128"
    : "https://cdn.discordapp.com/embed/avatars/" +
      (Number(discord_user.discriminator || 0) % 5) +
      ".png";
  const displayName = discord_user.global_name || discord_user.username;
  const statusColor = STATUS_COLORS[discord_status] || STATUS_COLORS.offline;
  const statusLabel = STATUS_LABELS[discord_status] || "offline";
  const customStatus = activities.find(function (a) {
    return a.type === 4;
  });
  const customStatusText = customStatus
    ? customStatus.state ||
      (customStatus.emoji ? customStatus.emoji.name : "") ||
      ""
    : "";
  document.getElementById("discordProfile").innerHTML =
    "" +
    '<div class="avatar-wrap">' +
    '<img src="' +
    avatarUrl +
    '" style="width:40px;height:40px;border-radius:50%;object-fit:cover;display:block;" onerror="this.style.display=' +
    q("none") +
    ";this.nextElementSibling.style.display=" +
    q("flex") +
    '" loading="lazy"/>' +
    '<div class="avatar-placeholder" style="display:none;"></div>' +
    '<div class="status-icon" title="' +
    statusLabel +
    '">' +
    (STATUS_ICONS[discord_status] || STATUS_ICONS.offline) +
    "</div>" +
    "</div>" +
    '<div class="profile-info">' +
    '<div class="profile-name">' +
    escapeAttr(displayName) +
    "</div>" +
    '<div class="profile-status">' +
    (customStatusText ? escapeAttr(customStatusText) : statusLabel) +
    "</div>" +
    "</div>";
}

function startSpotifyTicker(spotify) {
  clearInterval(spotifyProgressInterval);
  const duration = spotify.timestamps
    ? spotify.timestamps.end - spotify.timestamps.start
    : 0;
  if (duration <= 0) return;
  const start = spotify.timestamps.start;
  function tick() {
    const elapsed = Date.now() - start;
    const pct = Math.min(100, (elapsed / duration) * 100);
    const fill = document.getElementById("spotifyFill");
    const elapsedEl = document.getElementById("spotifyElapsed");
    if (fill) fill.style.width = pct + "%";
    if (elapsedEl) elapsedEl.textContent = fmtMs(Math.min(elapsed, duration));
    if (currentLyrics.length) highlightLyric(elapsed);
    if (pct >= 100) clearInterval(spotifyProgressInterval);
  }
  tick();
  spotifyProgressInterval = setInterval(tick, 500);
}

function renderSpotifyCard(spotify, trackChanged) {
  const spotifyEl = document.getElementById("spotifyActivity");
  const duration = spotify.timestamps
    ? spotify.timestamps.end - spotify.timestamps.start
    : 0;
  const trackUrl = "https://open.spotify.com/track/" + spotify.track_id;

  if (trackChanged) {
    if (hideSpotifyTimer) {
      clearTimeout(hideSpotifyTimer);
      hideSpotifyTimer = null;
    }
    spotifyEl.style.cssText = "";
    spotifyEl.className = "";
    spotifyEl.innerHTML =
      '<div class="slide-in">' +
      '<div class="discord-activity" style="border-bottom:none;">' +
      '<div class="activity-inner">' +
      '<img src="' +
      spotify.album_art_url +
      '" class="activity-art" loading="lazy" onerror="this.style.display=' +
      q("none") +
      '"/>' +
      '<div class="activity-info">' +
      '<a href="' +
      trackUrl +
      '" target="_blank" class="activity-name">' +
      escapeAttr(spotify.song) +
      "</a>" +
      '<div class="activity-sub">' +
      escapeAttr(spotify.artist) +
      " \u00B7 " +
      escapeAttr(spotify.album) +
      "</div>" +
      '<div class="spotify-progress-row">' +
      '<span class="spotify-time" id="spotifyElapsed"></span>' +
      '<div class="progress-bar disabled" style="flex:1;">' +
      '<div class="progress-fill" id="spotifyFill" style="width:0%;transition:none;"></div>' +
      "</div>" +
      '<span class="spotify-time">' +
      fmtMs(duration) +
      "</span>" +
      "</div>" +
      "</div></div></div>" +
      "</div>";
  }
  startSpotifyTicker(spotify);
  if (trackChanged) {
    setCurrentLyrics([]);
    document.getElementById("lyricsContent").innerHTML =
      '<div class="lyrics-loading">loading lyrics...</div>';
    fetchLyrics(spotify);
  }
}

function hideSpotify() {
  clearInterval(spotifyProgressInterval);
  spotifyProgressInterval = null;
  if (hideSpotifyTimer) {
    clearTimeout(hideSpotifyTimer);
    hideSpotifyTimer = null;
  }
  var spotifyEl = document.getElementById("spotifyActivity");
  if (spotifyEl && spotifyEl.children.length) {
    spotifyEl.className = "slide-out";
    hideSpotifyTimer = setTimeout(function () {
      var h = spotifyEl.scrollHeight;
      spotifyEl.style.transition = "max-height 0.3s ease, margin 0.3s ease";
      spotifyEl.style.maxHeight = h + "px";
      spotifyEl.style.overflow = "hidden";
      spotifyEl.getBoundingClientRect();
      spotifyEl.style.maxHeight = "0";
      spotifyEl.style.marginTop = "0";
      spotifyEl.style.marginBottom = "0";
      hideSpotifyTimer = setTimeout(function () {
        spotifyEl.innerHTML = "";
        spotifyEl.className = "";
        spotifyEl.style.cssText = "";
        hideSpotifyTimer = null;
      }, 320);
    }, 260);
  }
  setCurrentTrackId(null);
  setCurrentSpotifyData(null);
  setCurrentLyrics([]);
  closeLyricsPanel();
}

function getAvatarUrl(user) {
  return user.avatar
    ? "https://cdn.discordapp.com/avatars/" +
      user.id +
      "/" +
      user.avatar +
      "." +
      (user.avatar.startsWith("a_") ? "gif" : "png") +
      "?size=128"
    : "https://cdn.discordapp.com/embed/avatars/" +
      (Number(user.discriminator || 0) % 5) +
      ".png";
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(function (c) { return c.toString(16).padStart(2, "0"); }).join("");
}

function boostSaturation(r, g, b, amount) {
  var gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
  r = Math.round(r + (r - gray) * amount);
  g = Math.round(g + (g - gray) * amount);
  b = Math.round(b + (b - gray) * amount);
  return [
    Math.max(0, Math.min(255, r)),
    Math.max(0, Math.min(255, g)),
    Math.max(0, Math.min(255, b))
  ];
}

function extractColor(url) {
  return new Promise(function (resolve) {
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      var canvas = document.createElement("canvas");
      var ctx = canvas.getContext("2d");
      var size = 5;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);
      var data = ctx.getImageData(0, 0, size, size).data;
      var totalR = 0, totalG = 0, totalB = 0, count = 0;
      for (var i = 0; i < data.length; i += 4) {
        totalR += data[i];
        totalG += data[i + 1];
        totalB += data[i + 2];
        count++;
      }
      var r = Math.round(totalR / count);
      var g = Math.round(totalG / count);
      var b = Math.round(totalB / count);
      var boosted = boostSaturation(r, g, b, 0.8);
      var hex = rgbToHex(boosted[0], boosted[1], boosted[2]);
      localStorage.setItem("accentColor", hex);
      resolve(hex);
    };
    img.onerror = function () { resolve(null); };
    var staticUrl = url.includes("?") ? url.replace(/size=\d+/, "size=32") : url + "?size=32";
    if (url.includes("gif")) {
      staticUrl = url.replace(/\.gif\?/, ".png?").replace(/\?size=\d+/, "?size=32");
    }
    img.src = staticUrl;
  });
}

function ensureContrast(hex) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  var lum = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
  var isLight = document.documentElement.getAttribute("data-theme") === "light";
  var threshold = isLight ? 0.45 : 0.08;
  if (isLight ? lum > threshold : lum < threshold) {
    var factor = isLight ? threshold / Math.max(lum, 0.01) : (1 - threshold) / Math.max(1 - lum, 0.01);
    r = Math.round(r + (r - 128) * (factor - 1));
    g = Math.round(g + (g - 128) * (factor - 1));
    b = Math.round(b + (b - 128) * (factor - 1));
    return rgbToHex(Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b)));
  }
  return hex;
}

function darkenHex(hex, amount) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  r = Math.round(r * (1 - amount));
  g = Math.round(g * (1 - amount));
  b = Math.round(b * (1 - amount));
  return rgbToHex(Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b)));
}

var currentAccentHex = localStorage.getItem("accentColor") || null;
if (currentAccentHex) applyProfileColor(currentAccentHex);

function applyProfileColor(hex) {
  if (!hex) return;
  currentAccentHex = hex;
  hex = ensureContrast(hex);
  document.documentElement.style.setProperty("--accent", hex);
  document.documentElement.style.setProperty("--accent-dim", darkenHex(hex, 0.25));
  document.documentElement.style.setProperty("--green", hex);
}

var themeObserver = new MutationObserver(function () {
  if (currentAccentHex) applyProfileColor(currentAccentHex);
});
themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

export async function updateProfile(data) {
  renderProfileCard(data.discord_user, data.discord_status, data.activities);
  clearInterval(spotifyProgressInterval);
  extractColor(getAvatarUrl(data.discord_user)).then(applyProfileColor);
  await renderGameActivities(data.activities);

  if (data.listening_to_spotify && data.spotify) {
    const trackChanged = data.spotify.track_id !== currentTrackId;
    setCurrentTrackId(data.spotify.track_id);
    setCurrentSpotifyData(data.spotify);
    renderSpotifyCard(data.spotify, trackChanged);
    openLyricsPanel();
  } else {
    hideSpotify();
  }
}

export function connectLanyard() {
  const ws = new WebSocket("wss://api.lanyard.rest/socket");
  let heartbeat;

  ws.addEventListener("message", async function (e) {
    const msg = JSON.parse(e.data);
    if (msg.op === 1) {
      ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
      heartbeat = setInterval(function () {
        ws.send(JSON.stringify({ op: 3 }));
      }, msg.d.heartbeat_interval);
    }
    if (
      msg.op === 0 &&
      (msg.t === "INIT_STATE" || msg.t === "PRESENCE_UPDATE")
    ) {
      if (msg.d.activities) {
        msg.d.activities = msg.d.activities.filter(function (a) {
          return !BLOCKED_ACTIVITIES.includes(a.application_id);
        });
      }
      const dataHash = JSON.stringify({
        spotify: msg.d.listening_to_spotify
          ? {
              track_id: msg.d.spotify ? msg.d.spotify.track_id : null,
              song: msg.d.spotify ? msg.d.spotify.song : null,
              artist: msg.d.spotify ? msg.d.spotify.artist : null,
              album: msg.d.spotify ? msg.d.spotify.album : null,
            }
          : null,
        activities: msg.d.activities
          ? msg.d.activities.map(function (a) {
              return { id: a.id, type: a.type, name: a.name };
            })
          : [],
        status: msg.d.discord_status,
      });
      if (dataHash === lastProfileDataHash) return;
      setLastProfileDataHash(dataHash);
      clearTimeout(profileUpdateTimeout);
      profileUpdateTimeout = setTimeout(function () {
        updateProfile(msg.d);
      }, 100);
    }
  });

  ws.addEventListener("close", function () {
    if (heartbeat) clearInterval(heartbeat);
    setTimeout(connectLanyard, 3000);
  });

  ws.addEventListener("error", function () {
    ws.close();
  });
}
