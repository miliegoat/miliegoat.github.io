const ID = "1125787079654260777";
const appIconCache = new Map();

let gameTimer = null;
let spotifyTimer = null;

export function connectLanyard() {
  const ws = new WebSocket("wss://api.lanyard.rest/socket");
  let heartbeat;
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    if (msg.op === 1) {
      ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: ID } }));
      heartbeat = setInterval(() => {
        ws.send(JSON.stringify({ op: 3 }));
      }, msg.d.heartbeat_interval);
    }
    if (msg.op === 0 && (msg.t === "INIT_STATE" || msg.t === "PRESENCE_UPDATE")) {
      const d = msg.d;
      updateProfile(d);
      renderActivities(d);
    }
  });
  ws.addEventListener("close", () => {
    if (heartbeat) clearInterval(heartbeat);
    if (gameTimer) clearInterval(gameTimer);
    if (spotifyTimer) clearInterval(spotifyTimer);
    setTimeout(connectLanyard, 3000);
  });
}

function updateProfile(d) {
  const user = d.discord_user;
  document.getElementById("profilePic").src = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;
  document.getElementById("username").textContent = user.display_name || user.global_name || user.username;
  const statusMap = { online: "Online", idle: "Idle", dnd: "Do Not Disturb", offline: "Offline" };
  const statusEl = document.getElementById("status");
  statusEl.textContent = statusMap[d.discord_status] || "Unknown";
  const statusColors = { online: "#10b981", idle: "#f59e0b", dnd: "#ef4444", offline: "#4a4a4a" };
  statusEl.style.color = statusColors[d.discord_status] || "#4a4a4a";

  let customStatus = "";
  for (const act of d.activities || []) {
    if (act.type === 4 && act.state) {
      customStatus = act.state;
      if (act.emoji && act.emoji.name) customStatus = act.emoji.name + " " + customStatus;
      break;
    }
  }
  document.getElementById("profileText").textContent = customStatus || "";
  document.getElementById("profileCredit").textContent = "- " + user.username;
  const bio = document.querySelector(".bio");
  const credit = document.querySelector(".credit");
  if (bio) bio.style.display = customStatus ? "block" : "none";
  if (credit) credit.style.display = customStatus ? "block" : "none";
}

function fmtDuration(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  return m + ":" + String(s).padStart(2, "0");
}

function fmtMs(ms) {
  const s = Math.floor(ms / 1000);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

function resolveActivityImage(activity) {
  const assets = activity.assets || {};
  const image = assets.large_image || assets.small_image || assets.largeImage || assets.smallImage;
  if (!image || typeof image !== "string") return null;
  if (image.startsWith("mp:external/")) {
    return "https://media.discordapp.net/" + image.slice(3) + "?size=128";
  }
  if (image.startsWith("mp:")) {
    const path = image.slice(3);
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    if (activity.application_id) {
      return "https://cdn.discordapp.com/app-assets/" + activity.application_id + "/" + path + ".png?size=128";
    }
    return null;
  }
  if (image.startsWith("https://") || image.startsWith("http://")) return image;
  if (activity.application_id) {
    return "https://cdn.discordapp.com/app-assets/" + activity.application_id + "/" + image + ".png?size=128";
  }
  return null;
}

async function getApplicationIcon(appId) {
  if (!appId) return null;
  if (appIconCache.has(appId)) return appIconCache.get(appId);
  try {
    const res = await fetch("https://discord.com/api/v10/applications/" + appId + "/rpc");
    if (!res.ok) throw new Error();
    const data = await res.json();
    const url = data.icon
      ? "https://cdn.discordapp.com/app-icons/" + appId + "/" + data.icon + ".png?size=128"
      : null;
    appIconCache.set(appId, url);
    return url;
  } catch {
    appIconCache.set(appId, null);
    return null;
  }
}

function extractSpotify(d) {
  if (d.spotify && d.spotify.song) return d.spotify;
  for (const act of d.activities || []) {
    if (act.type === 2 && act.name === "Spotify" && act.details) {
      const assets = act.assets || {};
      let albumArt = "";
      if (assets.large_image && assets.large_image.startsWith("spotify:")) {
        albumArt = "https://i.scdn.co/image/" + assets.large_image.slice(8);
      }
      return {
        song: act.details,
        artist: act.state || "",
        album_art_url: albumArt,
        album: assets.large_text || "",
        timestamps: act.timestamps || null,
      };
    }
  }
  return null;
}

async function renderActivities(d) {
  const container = document.getElementById("activities");
  if (!container) return;
  const activities = d.activities || [];
  const spotify = extractSpotify(d);

  clearInterval(gameTimer);
  clearInterval(spotifyTimer);
  gameTimer = null;
  spotifyTimer = null;

  const parts = [];

  if (spotify) {
    parts.push(renderSpotify(spotify));
  }

  const gameActs = activities.filter((a) => a.type === 0 || a.type === 1 || a.type === 3 || a.type === 5);
  for (const act of gameActs) {
    let iconUrl = resolveActivityImage(act);
    if (!iconUrl && act.application_id) {
      iconUrl = await getApplicationIcon(act.application_id);
    }
    parts.push(renderGameActivity(act, iconUrl));
  }

  const hasSpotify = !!spotify;
  const hasTimedGames = activities.some((a) => a.timestamps && a.timestamps.start && (a.type === 0 || a.type === 1 || a.type === 3 || a.type === 5));

  if (parts.length > 0 && (hasSpotify || hasTimedGames)) {
    const updateTimers = () => {
      container.querySelectorAll(".activity-elapsed").forEach((el) => {
        const start = Number(el.dataset.start);
        if (start) el.textContent = el.dataset.verb + " " + fmtDuration(Date.now() - start);
      });
      container.querySelectorAll(".spotify-progress").forEach((el) => {
        const start = Number(el.dataset.start);
        const end = Number(el.dataset.end);
        if (start && end) {
          const now = Date.now();
          const total = end - start;
          const elapsed = Math.min(now - start, total);
          const pct = total > 0 ? (elapsed / total) * 100 : 0;
          el.querySelector(".sp-progress-fill").style.width = pct + "%";
          el.querySelector(".sp-time-current").textContent = fmtMs(elapsed);
          el.querySelector(".sp-time-total").textContent = fmtMs(total);
        }
      });
    };
    if (hasSpotify) spotifyTimer = setInterval(updateTimers, 1000);
    if (hasTimedGames) gameTimer = setInterval(updateTimers, 1000);
    updateTimers();
  }

  container.innerHTML = parts.join("");
  container.style.display = parts.length > 0 ? "block" : "none";
}

function renderSpotify(spotify) {
  const now = Date.now();
  const start = spotify.timestamps ? spotify.timestamps.start : now;
  const end = spotify.timestamps ? spotify.timestamps.end : now;
  const total = end - start;
  const elapsed = total > 0 ? Math.min(now - start, total) : 0;
  const pct = total > 0 ? (elapsed / total) * 100 : 0;

  return '<div class="activity">' +
    '<div class="activity-header">spotify</div>' +
    '<div class="activity-body">' +
    (spotify.album_art_url
      ? '<img class="activity-art" src="' + escapeAttr(spotify.album_art_url) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
      : '<div class="activity-art-placeholder">🎵</div>') +
    '<div class="activity-info">' +
    '<div class="activity-title">' + escapeHtml(spotify.song || "") + '</div>' +
    '<div class="activity-sub">' + escapeHtml(spotify.artist || "") + '</div>' +
    '<div class="spotify-progress" data-start="' + start + '" data-end="' + end + '">' +
    '<div class="sp-progress-bg"><div class="sp-progress-fill" style="width:' + pct + '%"></div></div>' +
    '<div class="sp-times">' +
    '<span class="sp-time-current">' + fmtMs(elapsed) + '</span>' +
    '<span class="sp-time-total">' + fmtMs(total) + '</span>' +
    '</div></div></div></div></div>';
}

function renderGameActivity(activity, iconUrl) {
  const start = activity.timestamps ? activity.timestamps.start : null;
  const elapsed = start ? fmtDuration(Date.now() - start) : null;
  const icon = activity.type === 3 ? "📺" : activity.type === 1 ? "🔴" : "🎮";
  const verb = activity.type === 3 ? "watching" : activity.type === 1 ? "streaming" : "playing";

  let iconHtml;
  if (iconUrl) {
    iconHtml = '<img class="activity-art" src="' + escapeAttr(iconUrl) + '" alt="" loading="lazy" onerror="this.outerHTML=\'<div class=&quot;activity-art-placeholder&quot;>' + icon + '</div>\'">';
  } else {
    iconHtml = '<div class="activity-art-placeholder">' + icon + '</div>';
  }

  let html = '<div class="activity">' +
    '<div class="activity-header">' + escapeHtml(activity.name.toLowerCase()) + '</div>' +
    '<div class="activity-body">' +
    iconHtml +
    (start ? '<span class="activity-elapsed" data-start="' + start + '" data-verb="' + verb + '">' + verb + " " + elapsed + '</span>' : '') +
    '<div class="activity-info">';

  if (activity.details) {
    html += '<div class="activity-sub">' + escapeHtml(activity.details) + '</div>';
  }
  if (activity.state) {
    html += '<div class="activity-sub">' + escapeHtml(activity.state) + '</div>';
  }

  html += '</div></div></div>';
  return html;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
