import {
  DISCORD_ID, STATUS_COLORS, STATUS_LABELS, STATUS_ICONS, BLOCKED_ACTIVITIES,
} from './constants.js';
import { fmtMs, fmtDuration } from './utils.js';
import {
  setCurrentSpotifyData, setCurrentTrackId, currentTrackId,
  lastProfileDataHash, setLastProfileDataHash, appIconCache,
  currentLyrics, setCurrentLyrics,
} from './state.js';
import { fetchLyrics, openLyricsPanel, closeLyricsPanel, highlightLyric } from './lyrics.js';
import { searchAndPlayYouTube, destroyYTPlayer } from './youtube.js';

const MARK_TV = '\uD83D\uDCFA';
const MARK_GAME = '\uD83C\uDFAE';
const MARK_HAMSTER = '\uD83D\uDC39';
const MARK_LEAF = '\uD83C\uDF41';
const MARK_PLAY = '\u25B6';
const MARK_NOTE = '\u266B';
const MARK_ERROR = '\u2715';

let profileUpdateTimeout = null;
let gameActivityInterval = null;
let spotifyProgressInterval = null;
let hideSpotifyTimer = null;

function q(s) { return '"' + s + '"'; }

function resolveActivityImage(game) {
  const assets = game.assets || {};
  const image = assets.large_image || assets.small_image || assets.largeImage || assets.smallImage;
  if (!image || typeof image !== 'string') return null;
  if (image.startsWith('mp:external/')) {
    return 'https://media.discordapp.net/' + image.slice(3) + '?size=64';
  }
  if (image.startsWith('mp:')) {
    const path = image.slice(3);
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return game.application_id
      ? 'https://cdn.discordapp.com/app-assets/' + game.application_id + '/' + path + '.png?size=64'
      : null;
  }
  if (image.startsWith('https://') || image.startsWith('http://')) return image;
  return game.application_id
    ? 'https://cdn.discordapp.com/app-assets/' + game.application_id + '/' + image + '.png?size=64'
    : null;
}

async function getApplicationIcon(appId) {
  if (!appId) return null;
  if (appIconCache.has(appId)) return appIconCache.get(appId);
  try {
    const res = await fetch('https://discord.com/api/v10/applications/' + appId + '/rpc');
    if (!res.ok) throw new Error();
    const data = await res.json();
    const url = data.icon
      ? 'https://cdn.discordapp.com/app-icons/' + appId + '/' + data.icon + '.png?size=512'
      : null;
    appIconCache.set(appId, url);
    return url;
  } catch {
    appIconCache.set(appId, null);
    return null;
  }
}

function updateGameElapsed() {
  document.querySelectorAll('.activity-sub.activity-elapsed').forEach(function(el) {
    const start = Number(el.dataset.start);
    const verb = el.dataset.verb || 'played';
    if (start) el.textContent = verb + ' ' + fmtDuration(Date.now() - start);
  });
}

function startGameActivityTimer(activities) {
  clearInterval(gameActivityInterval);
  if (!activities.some(function(a) { return Boolean(a.timestamps && a.timestamps.start); })) return;
  updateGameElapsed();
  gameActivityInterval = setInterval(updateGameElapsed, 1000);
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function renderGameActivities(activities) {
  const cards = await Promise.all(
    activities.filter(function(a) {
      return !BLOCKED_ACTIVITIES.includes(a.application_id)
        && (a.type === 0 || (a.type === 3 && a.application_id === '1224777421941899285'));
    }).map(async function(activity, index) {
      let iconUrl = resolveActivityImage(activity);
      if (!iconUrl && activity.application_id) iconUrl = await getApplicationIcon(activity.application_id);
      const elapsed = activity.timestamps && activity.timestamps.start
        ? fmtDuration(Date.now() - activity.timestamps.start) : null;
      const verb = activity.type === 3 ? 'watched' : 'played';
      const elapsedHtml = activity.timestamps && activity.timestamps.start
        ? '<div class="activity-sub activity-elapsed" data-start="' + activity.timestamps.start + '" data-verb="' + verb + '">' + verb + ' ' + elapsed + '</div>'
        : '';
      const activityId = activity.id || activity.application_id || 'activity-' + index;
      const icon = activity.type === 3 ? MARK_TV : MARK_GAME;
      const iconHtml = iconUrl
        ? '<img src="' + iconUrl + '" class="activity-art" loading="lazy" onerror="this.outerHTML=' + q('<div class=&quot;activity-art-placeholder&quot;>' + icon + '</div>') + '"/>'
        : '<div class="activity-art-placeholder">' + icon + '</div>';
      return '<div class="discord-activity" data-activity-id="' + activityId + '">'
        + '<div class="activity-inner">'
        + iconHtml
        + '<div class="activity-info">'
        + '<div class="activity-type">' + (activity.type === 3 ? 'watching' : 'playing') + '</div>'
        + '<div class="activity-name">' + escapeAttr(activity.name) + '</div>'
        + (activity.details ? '<div class="activity-sub">' + escapeAttr(activity.details) + '</div>' : '')
        + (activity.state ? '<div class="activity-sub">' + escapeAttr(activity.state) + '</div>' : '')
        + elapsedHtml
        + '</div></div></div>';
    })
  );
  document.getElementById('gameActivities').innerHTML = cards.length ? '<div class="slide-in">' + cards.join('') + '</div>' : '';
  startGameActivityTimer(activities);
}

function renderProfileCard(discord_user, discord_status, activities) {
  const avatarUrl = discord_user.avatar
    ? 'https://cdn.discordapp.com/avatars/' + discord_user.id + '/' + discord_user.avatar + '.' + (discord_user.avatar.startsWith('a_') ? 'gif' : 'png') + '?size=128'
    : 'https://cdn.discordapp.com/embed/avatars/' + (Number(discord_user.discriminator || 0) % 5) + '.png';
  const displayName = discord_user.global_name || discord_user.username;
  const statusColor = STATUS_COLORS[discord_status] || STATUS_COLORS.offline;
  const statusLabel = STATUS_LABELS[discord_status] || 'offline';
  const customStatus = activities.find(function(a) { return a.type === 4; });
  const customStatusText = customStatus
    ? (customStatus.state || (customStatus.emoji ? customStatus.emoji.name : '') || '') : '';
  document.getElementById('discordProfile').innerHTML = ''
    + '<div class="avatar-wrap">'
    + '<img src="' + avatarUrl + '" style="width:40px;height:40px;border-radius:50%;object-fit:cover;display:block;" onerror="this.style.display=' + q('none') + ';this.nextElementSibling.style.display=' + q('flex') + '" loading="lazy"/>'
    + '<div class="avatar-placeholder" style="display:none;">' + MARK_HAMSTER + '</div>'
    + '<div class="status-icon" title="' + statusLabel + '">' + (STATUS_ICONS[discord_status] || STATUS_ICONS.offline) + '</div>'
    + '</div>'
    + '<div class="profile-info">'
    + '<div class="profile-name">' + escapeAttr(displayName) + '</div>'
    + '<div class="profile-status">' + (customStatusText ? escapeAttr(customStatusText) : statusLabel) + '</div>'
    + '</div>';
}

function startSpotifyTicker(spotify) {
  clearInterval(spotifyProgressInterval);
  const duration = spotify.timestamps ? spotify.timestamps.end - spotify.timestamps.start : 0;
  if (duration <= 0) return;
  const start = spotify.timestamps.start;
  function tick() {
    const elapsed = Date.now() - start;
    const pct = Math.min(100, (elapsed / duration) * 100);
    const fill = document.getElementById('spotifyFill');
    const elapsedEl = document.getElementById('spotifyElapsed');
    if (fill) fill.style.width = pct + '%';
    if (elapsedEl) elapsedEl.textContent = fmtMs(Math.min(elapsed, duration));
    if (currentLyrics.length) highlightLyric(elapsed);
    if (pct >= 100) clearInterval(spotifyProgressInterval);
  }
  tick();
  spotifyProgressInterval = setInterval(tick, 500);
}

function renderSpotifyCard(spotify, trackChanged) {
  const spotifyEl = document.getElementById('spotifyActivity');
  const duration = spotify.timestamps ? spotify.timestamps.end - spotify.timestamps.start : 0;
  const trackUrl = 'https://open.spotify.com/track/' + spotify.track_id;

  if (trackChanged) {
    if (hideSpotifyTimer) { clearTimeout(hideSpotifyTimer); hideSpotifyTimer = null; }
    spotifyEl.className = '';
    spotifyEl.innerHTML = '<div class="slide-in">'
      + '<div class="discord-activity" style="border-bottom:none;">'
      + '<div class="activity-inner">'
      + '<img src="' + spotify.album_art_url + '" class="activity-art" loading="lazy" onerror="this.style.display=' + q('none') + '"/>'
      + '<div class="activity-info">'
      + '<div class="activity-type" style="display:flex;justify-content:space-between;align-items:center;">'
      + '<span style="display:flex;align-items:center;gap:4px;">'
      + '<svg width="11" height="11" viewBox="0 0 24 24" fill="#1db954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>'
      + 'listening to spotify'
      + '</span>'
      + '<button id="playAlongBtn" onclick="window.togglePlayAlong()" data-state="idle" style="background:var(--bg-surface);border:1px solid var(--border);border-radius:999px;color:var(--text-muted);font-size:10px;font-weight:700;font-family:var(--font);padding:4px 10px;cursor:pointer;transition:all 0.2s ease;letter-spacing:0.03em;">' + MARK_PLAY + ' play along</button>'
      + '</div>'
      + '<a href="' + trackUrl + '" target="_blank" class="activity-name">' + escapeAttr(spotify.song) + '</a>'
      + '<div class="activity-sub">' + escapeAttr(spotify.artist) + ' \u00B7 ' + escapeAttr(spotify.album) + '</div>'
      + '<div class="spotify-progress-row">'
      + '<span class="spotify-time" id="spotifyElapsed"></span>'
      + '<div class="progress-bar disabled" style="flex:1;">'
      + '<div class="progress-fill" id="spotifyFill" style="width:0%;transition:none;"></div>'
      + '</div>'
      + '<span class="spotify-time">' + fmtMs(duration) + '</span>'
      + '</div>'
      + '</div></div></div>'
      + '</div>';
  }
  startSpotifyTicker(spotify);
  if (trackChanged) {
    setCurrentLyrics([]);
    document.getElementById('lyricsContent').innerHTML = '<div class="lyrics-loading">loading lyrics...</div>';
    fetchLyrics(spotify);
    searchAndPlayYouTube(spotify);
  }
}

function hideSpotify() {
  clearInterval(spotifyProgressInterval);
  spotifyProgressInterval = null;
  if (hideSpotifyTimer) { clearTimeout(hideSpotifyTimer); hideSpotifyTimer = null; }
  var spotifyEl = document.getElementById('spotifyActivity');
  if (spotifyEl && spotifyEl.children.length) {
    spotifyEl.className = 'slide-out';
    hideSpotifyTimer = setTimeout(function() {
      spotifyEl.className = '';
      spotifyEl.innerHTML = '';
      hideSpotifyTimer = null;
    }, 260);
  }
  document.getElementById('localPlayer').style.display = 'block';
  setCurrentTrackId(null);
  setCurrentSpotifyData(null);
  setCurrentLyrics([]);
  destroyYTPlayer();
  closeLyricsPanel();
}

export async function updateProfile(data) {
  renderProfileCard(data.discord_user, data.discord_status, data.activities);
  clearInterval(spotifyProgressInterval);
  await renderGameActivities(data.activities);

  const localPlayer = document.getElementById('localPlayer');

  if (data.listening_to_spotify && data.spotify) {
    localPlayer.style.display = 'none';
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
  const ws = new WebSocket('wss://api.lanyard.rest/socket');
  let heartbeat;

  ws.addEventListener('message', async function(e) {
    const msg = JSON.parse(e.data);
    if (msg.op === 1) {
      ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
      heartbeat = setInterval(function() { ws.send(JSON.stringify({ op: 3 })); }, msg.d.heartbeat_interval);
    }
    if (msg.op === 0 && (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE')) {
      if (msg.d.activities) {
        msg.d.activities = msg.d.activities.filter(function(a) { return !BLOCKED_ACTIVITIES.includes(a.application_id); });
      }
      const dataHash = JSON.stringify({
        spotify: msg.d.listening_to_spotify ? {
          track_id: msg.d.spotify ? msg.d.spotify.track_id : null,
          song: msg.d.spotify ? msg.d.spotify.song : null,
          artist: msg.d.spotify ? msg.d.spotify.artist : null,
          album: msg.d.spotify ? msg.d.spotify.album : null,
        } : null,
        activities: msg.d.activities ? msg.d.activities.map(function(a) { return { id: a.id, type: a.type, name: a.name }; }) : [],
        status: msg.d.discord_status,
      });
      if (dataHash === lastProfileDataHash) return;
      setLastProfileDataHash(dataHash);
      clearTimeout(profileUpdateTimeout);
      profileUpdateTimeout = setTimeout(function() { updateProfile(msg.d); }, 100);
    }
  });

  ws.addEventListener('close', function() {
    if (heartbeat) clearInterval(heartbeat);
    setTimeout(connectLanyard, 3000);
  });

  ws.addEventListener('error', function() { ws.close(); });
}
