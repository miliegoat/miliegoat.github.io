(async function() {
  try {
    const counted = sessionStorage.getItem('mil_counted');
    const url = counted
      ? 'https://api.counterapi.dev/v2/miliegoat/viewsmiliegoat'
      : 'https://api.counterapi.dev/v2/miliegoat/viewsmiliegoat/up';
    const res = await fetch(url);
    const data = await res.json();
    document.getElementById('viewCount').textContent = Number(data.data.up_count).toLocaleString();
    if (!counted) sessionStorage.setItem('mil_counted', '1');
  } catch {
    document.getElementById('viewCount').textContent = '—';
  }
})();

const WORKER_URL = 'https://snowy-dust-17c3.asdwaawdawd81.workers.dev/';
let authorToken = sessionStorage.getItem('author_token') || null;

const DISCORD_ID = '1125787079654260777';
const STATUS_COLORS = { online: '#4ade80', idle: '#facc15', dnd: '#f87171', offline: '#6b7280' };
const STATUS_LABELS = { online: 'online', idle: 'idle', dnd: 'do not disturb', offline: 'offline' };
const BLOCKED_ACTIVITIES = ['1126057621254852678', '1307468756590792704'];

let spotifyProgressInterval = null;
let currentLyrics = [];
let lyricsOpen = false;
let lyricsWasOpen = false;
let guestbookOpen = false;
let currentTrackId = null;
let currentSpotifyData = null;
let gameActivityInterval = null;
let lastProfileDataHash = null;
let profileUpdateTimeout = null;
const appIconCache = new Map();

let ytPlayer = null;
let ytReady = false;
let ytPendingVideo = null;
let ytCurrentVideoId = null;
let ytUnlocked = false;
let ytSearchCache = new Map();

const YT_API_KEY = 'AIzaSyB4t18EPL0XTE7nqbu9OcHZnv4NiyvhsjE';

function loadYouTubeAPI() {
  if (document.getElementById('yt-api-script')) return;
  const tag = document.createElement('script');
  tag.id = 'yt-api-script';
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = function() {
  ytReady = true;
  if (ytPendingVideo && ytUnlocked) {
    const { videoId, seekSec } = ytPendingVideo;
    ytPendingVideo = null;
    createYTPlayer(videoId, seekSec);
  }
};

function createYTPlayer(videoId, seekSec) {
  if (!ytReady) {
    ytPendingVideo = { videoId, seekSec };
    return;
  }

  let container = document.getElementById('yt-player-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'yt-player-container';
    document.body.appendChild(container);
  }

  container.style.cssText = 'position:fixed;bottom:0;right:0;width:320px;height:180px;z-index:-1;opacity:0.01;pointer-events:none;';

  if (ytPlayer) {
    try { ytPlayer.destroy(); } catch {}
    ytPlayer = null;
  }

  const div = document.createElement('div');
  div.id = 'yt-iframe';
  container.innerHTML = '';
  container.appendChild(div);

  ytCurrentVideoId = videoId;

  ytPlayer = new YT.Player('yt-iframe', {
    height: '180',
    width: '320',
    videoId,
    playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, rel: 0, start: Math.max(0, Math.floor(seekSec)) },
    events: {
      onReady(e) {
        console.log('[YT] onReady fired');
        e.target.setVolume(70);
        e.target.seekTo(seekSec, true);
        e.target.playVideo();
      },
      onStateChange(e) {
        console.log('[YT] state:', e.data);
        if (e.data === YT.PlayerState.PLAYING) {
          updatePlayAlongBtn('playing');
          container.style.cssText = 'position:fixed;width:1px;height:1px;top:-9999px;left:-9999px;pointer-events:none;opacity:0;';
        }
        if (e.data === YT.PlayerState.PAUSED) updatePlayAlongBtn('paused');
      },
      onError(e) {
        console.log('[YT] error:', e.data);
        updatePlayAlongBtn('error');
      },
    },
  });
}

function destroyYTPlayer() {
  if (ytPlayer) { try { ytPlayer.destroy(); } catch {} ytPlayer = null; }
  ytCurrentVideoId = null;
  ytPendingVideo = null;
  const container = document.getElementById('yt-player-container');
  if (container) container.remove();
  updatePlayAlongBtn('idle');
}

function updatePlayAlongBtn(state) {
  const btn = document.getElementById('playAlongBtn');
  if (!btn) return;
  const states = {
    idle:    { text: '▶ play along', color: '#777', spin: false },
    loading: { text: 'finding song…', color: '#777', spin: true },
    playing: { text: '♫ playing', color: '#1db954', spin: false },
    paused:  { text: '▶ play along', color: '#777', spin: false },
    error:   { text: '✕ not found', color: '#f87171', spin: false },
  };
  const s = states[state] || states.idle;
  btn.textContent = s.text;
  btn.style.color = s.color;
  btn.style.borderColor = state === 'playing' ? 'rgba(29,185,84,0.4)' : '';
  btn.dataset.state = state;
}

function togglePlayAlong() {
  const btn = document.getElementById('playAlongBtn');
  if (!btn) return;
  const state = btn.dataset.state || 'idle';

  if (state === 'playing' && ytPlayer) {
    ytPlayer.pauseVideo();
    return;
  }
  if (state === 'paused' && ytPlayer) {
    ytPlayer.playVideo();
    updatePlayAlongBtn('playing');
    return;
  }

  ytUnlocked = true;
  updatePlayAlongBtn('loading');

  if (ytPendingVideo) {
    const { videoId, seekSec } = ytPendingVideo;
    ytPendingVideo = null;
    loadYouTubeAPI();
    createYTPlayer(videoId, seekSec);
  } else if (currentSpotifyData) {
    searchYouTube(currentSpotifyData).then(videoId => {
      if (!videoId) { updatePlayAlongBtn('error'); return; }
      const seekSec = currentSpotifyData.timestamps ? (Date.now() - currentSpotifyData.timestamps.start) / 1000 + 1.5 : 0;
      loadYouTubeAPI();
      createYTPlayer(videoId, seekSec);
    });
  }
}

async function searchYouTube(spotify) {
  const key = `${spotify.track_id}`;
  if (ytSearchCache.has(key)) return ytSearchCache.get(key);

  const artist = spotify.artist.split(';')[0].trim();
  const queries = [
    `${artist} - ${spotify.song} official audio`,
    `${artist} ${spotify.song}`,
    `${spotify.song} ${artist}`,
  ];

  for (const query of queries) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${YT_API_KEY}`;
      console.log('[YT] searching:', query);
      const res = await fetch(url, {
        signal: AbortSignal.timeout(6000),
        headers: { 'Referer': location.origin },
      });
      const data = await res.json();
      console.log('[YT] response:', res.status, JSON.stringify(data).slice(0, 300));
      if (!res.ok) continue;
      const videoId = data.items?.[0]?.id?.videoId || null;
      if (videoId) {
        console.log('[YT] found:', videoId);
        ytSearchCache.set(key, videoId);
        return videoId;
      }
    } catch (e) {
      console.log('[YT] fetch error:', e);
      continue;
    }
  }
  console.log('[YT] no results found');
  return null;
}

window.togglePlayAlong = togglePlayAlong;

async function searchAndPlayYouTube(spotify) {
  loadYouTubeAPI();
  updatePlayAlongBtn('loading');
  const videoId = await searchYouTube(spotify);
  if (!videoId) { updatePlayAlongBtn('error'); return; }

  const seekSec = spotify.timestamps ? (Date.now() - spotify.timestamps.start) / 1000 + 1 : 0;

  if (ytUnlocked) {
    createYTPlayer(videoId, seekSec);
  } else {
    ytPendingVideo = { videoId, seekSec };
    updatePlayAlongBtn('idle');
  }
}

function fmtMs(ms) {
  const s = Math.floor(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function fmtDuration(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTimestamp(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

async function getApplicationIcon(appId) {
  if (!appId) return null;
  if (appIconCache.has(appId)) return appIconCache.get(appId);
  try {
    const res = await fetch(`https://discord.com/api/v10/applications/${appId}/rpc`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const url = data.icon
      ? `https://cdn.discordapp.com/app-icons/${appId}/${data.icon}.png?size=512`
      : null;
    appIconCache.set(appId, url);
    return url;
  } catch {
    appIconCache.set(appId, null);
    return null;
  }
}

function resolveActivityImage(game) {
  const assets = game.assets || {};
  const image = assets.large_image || assets.small_image || assets.largeImage || assets.smallImage;
  if (!image || typeof image !== 'string') return null;

  if (image.startsWith('mp:external/')) {
    return `https://media.discordapp.net/${image.slice('mp:'.length)}?size=64`;
  }
  if (image.startsWith('mp:')) {
    const path = image.slice('mp:'.length);
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return game.application_id
      ? `https://cdn.discordapp.com/app-assets/${game.application_id}/${path}.png?size=64`
      : null;
  }
  if (image.startsWith('https://') || image.startsWith('http://')) return image;

  return game.application_id
    ? `https://cdn.discordapp.com/app-assets/${game.application_id}/${image}.png?size=64`
    : null;
}

function updateGameElapsed() {
  document.querySelectorAll('.activity-sub.activity-elapsed').forEach(el => {
    const start = Number(el.dataset.start);
    const verb = el.dataset.verb || 'played';
    if (start) el.textContent = `${verb} ${fmtDuration(Date.now() - start)}`;
  });
}

function startGameActivityTimer(activities) {
  clearInterval(gameActivityInterval);
  if (!activities.some(a => Boolean(a.timestamps?.start))) return;
  updateGameElapsed();
  gameActivityInterval = setInterval(updateGameElapsed, 1000);
}

async function renderGameActivities(activities) {
  const cards = await Promise.all(
    activities.filter(a => !BLOCKED_ACTIVITIES.includes(a.application_id) && (a.type === 0 || (a.type === 3 && a.application_id === '1224777421941899285'))).map(async (activity, index) => {
      let iconUrl = resolveActivityImage(activity);
      if (!iconUrl && activity.application_id) iconUrl = await getApplicationIcon(activity.application_id);

      const elapsed = activity.timestamps?.start ? fmtDuration(Date.now() - activity.timestamps.start) : null;
      const elapsedHtml = activity.timestamps?.start
        ? `<div class="activity-sub activity-elapsed" data-start="${activity.timestamps.start}" data-verb="${activity.type === 3 ? 'watched' : 'played'}">${activity.type === 3 ? 'watched' : 'played'} ${elapsed}</div>`
        : '';
      const activityId = activity.id || activity.application_id || `activity-${index}`;

      return `
        <div class="discord-activity" data-activity-id="${activityId}">
          <div class="activity-inner">
            ${iconUrl
              ? `<img src="${iconUrl}" class="activity-art" loading="lazy" onerror="this.outerHTML='<div class=&quot;activity-art-placeholder&quot;>${activity.type === 3 ? '📺' : '🎮'}</div>'"/>`
              : `<div class="activity-art-placeholder">${activity.type === 3 ? '📺' : '🎮'}</div>`}
            <div class="activity-info">
              <div class="activity-type">${activity.type === 3 ? 'watching' : 'playing'}</div>
              <div class="activity-name">${activity.name}</div>
              ${activity.details ? `<div class="activity-sub">${activity.details}</div>` : ''}
              ${activity.state ? `<div class="activity-sub">${activity.state}</div>` : ''}
              ${elapsedHtml}
            </div>
          </div>
        </div>
      `;
    })
  );
  document.getElementById('gameActivities').innerHTML = cards.join('');
  startGameActivityTimer(activities);
}

async function updateProfile(data) {
  const { discord_user, discord_status, activities, listening_to_spotify, spotify } = data;

  const avatarUrl = discord_user.avatar
    ? `https://cdn.discordapp.com/avatars/${discord_user.id}/${discord_user.avatar}.${discord_user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${Number(discord_user.discriminator || 0) % 5}.png`;

  const displayName = discord_user.global_name || discord_user.username;
  const statusColor = STATUS_COLORS[discord_status] || STATUS_COLORS.offline;
  const statusLabel = STATUS_LABELS[discord_status] || 'offline';
  const customStatus = activities.find(a => a.type === 4);
  const customStatusText = customStatus ? (customStatus.state || customStatus.emoji?.name || '') : '';

  const statusIcons = {
    online: '<svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#31a24c"/></svg>',
    idle: '<svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#faa61a"/><circle cx="8" cy="8" r="6" fill="#0a0a0a"/></svg>',
    dnd: '<svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ed4245"/><rect x="7" y="11" width="10" height="2" fill="black"/></svg>',
    offline: '<svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="#747f8d" stroke-width="5"/></svg>'
  };

  document.getElementById('discordProfile').innerHTML = `
    <div class="avatar-wrap">
      <img
        src="${avatarUrl}"
        style="width:52px;height:52px;border-radius:50%;object-fit:cover;display:block;"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
        loading="lazy"
      />
      <div class="avatar-placeholder" style="display:none;">🐹</div>
      <div class="status-icon" title="${statusLabel}">${statusIcons[discord_status] || statusIcons.offline}</div>
    </div>
    <div class="profile-info">
      <div class="profile-name">${displayName}</div>
      ${customStatusText ? `<div style="font-size:12px;color:#666;margin-top:3px;">${customStatusText}</div>` : ''}
      <div style="font-size:11px;color:${statusColor};margin-top:2px;font-weight:500;">${statusLabel}</div>
    </div>
    <div class="badge">🍁 lnyd</div>
  `;

  clearInterval(spotifyProgressInterval);
  await renderGameActivities(activities);

  const localPlayer = document.getElementById('localPlayer');
  const spotifyEl = document.getElementById('spotifyActivity');

  if (listening_to_spotify && spotify) {
    localPlayer.style.display = 'none';
    const trackUrl = `https://open.spotify.com/track/${spotify.track_id}`;
    const duration = spotify.timestamps ? spotify.timestamps.end - spotify.timestamps.start : 0;
    const trackChanged = spotify.track_id !== currentTrackId;
    currentTrackId = spotify.track_id;
    currentSpotifyData = spotify;

    if (trackChanged) {
      spotifyEl.innerHTML = `
        <div class="discord-activity">
          <div class="activity-inner">
            <img src="${spotify.album_art_url}" class="activity-art" loading="lazy" onerror="this.style.display='none'"/>
            <div class="activity-info">
              <div class="activity-type" style="display:flex;justify-content:space-between;align-items:center;">
                <span style="display:flex;align-items:center;gap:4px;">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="#1db954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                  listening to spotify
                </span>
                <button id="playAlongBtn" onclick="togglePlayAlong()" data-state="idle" style="background:#1a1a1a;border:1px solid #2e2e2e;border-radius:999px;color:#777;font-size:10px;font-weight:700;font-family:inherit;padding:4px 10px;cursor:pointer;transition:all 0.2s ease;letter-spacing:0.03em;">▶ play along</button>
              </div>
              <a href="${trackUrl}" target="_blank" class="activity-name">${spotify.song}</a>
              <div class="activity-sub">${spotify.artist} · ${spotify.album}</div>
              <div class="spotify-progress-row">
                <span class="spotify-time" id="spotifyElapsed"></span>
                <div class="progress-bar disabled" style="flex:1;">
                  <div class="progress-fill" id="spotifyFill" style="width:0%;transition:none;"></div>
                </div>
                <span class="spotify-time">${fmtMs(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (duration > 0) {
      const start = spotify.timestamps.start;
      const tick = () => {
        const elapsed = Date.now() - start;
        const pct = Math.min(100, (elapsed / duration) * 100);
        const fill = document.getElementById('spotifyFill');
        const elapsedEl = document.getElementById('spotifyElapsed');
        if (fill) fill.style.width = pct + '%';
        if (elapsedEl) elapsedEl.textContent = fmtMs(Math.min(elapsed, duration));
        if (currentLyrics.length) highlightLyric(elapsed);
        if (pct >= 100) clearInterval(spotifyProgressInterval);
      };
      tick();
      spotifyProgressInterval = setInterval(tick, 500);
    }

    if (trackChanged) {
      currentLyrics = [];
      document.getElementById('lyricsContent').innerHTML = '<div class="lyrics-loading">loading lyrics...</div>';
      fetchLyrics(spotify);
      searchAndPlayYouTube(spotify);
    }

    lyricsOpen = true;
    lyricsWasOpen = true;
    document.getElementById('lyricsLayout').classList.add('spotify-active');
    openLyricsPanel();

  } else {
    localPlayer.style.display = 'block';
    spotifyEl.innerHTML = '';
    currentTrackId = null;
    currentSpotifyData = null;
    currentLyrics = [];
    document.getElementById('lyricsLayout').classList.remove('spotify-active');
    destroyYTPlayer();
    if (lyricsOpen) {
      lyricsWasOpen = true;
      lyricsOpen = false;
      closeLyricsPanel();
    }
  }
}

async function fetchLyrics(spotify) {
  const content = document.getElementById('lyricsContent');
  try {
    const artist = spotify.artist.split(';')[0].trim();
    const duration = Math.round((spotify.timestamps.end - spotify.timestamps.start) / 1000);
    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(spotify.song)}&duration=${duration}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.syncedLyrics) {
      currentLyrics = parseLrc(data.syncedLyrics);
      renderLyrics(content);
    } else if (data.plainLyrics) {
      content.innerHTML = `<div class="lyrics-plain">${data.plainLyrics.replace(/\n/g, '<br>')}</div>`;
      currentLyrics = [];
    } else {
      content.innerHTML = '<div class="lyrics-loading">no lyrics found</div>';
      currentLyrics = [];
    }
    updateLyricsPanel();
  } catch {
    content.innerHTML = '<div class="lyrics-loading">couldn\'t load lyrics</div>';
    currentLyrics = [];
  }
}

function parseLrc(lrc) {
  return lrc.split('\n')
    .map(line => {
      const m = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
      if (!m) return null;
      return { ms: (parseInt(m[1]) * 60 + parseFloat(m[2])) * 1000, text: m[3].trim() };
    })
    .filter(l => l && l.text);
}

function renderLyrics(container) {
  container.innerHTML = currentLyrics.map((l, i) =>
    `<div class="lyric-line" id="lyric-${i}">${l.text}</div>`
  ).join('');
}

function highlightLyric(elapsedMs) {
  let active = 0;
  for (let i = 0; i < currentLyrics.length; i++) {
    if (elapsedMs >= currentLyrics[i].ms) active = i;
  }
  const lyricsEl = document.getElementById('lwLyrics');
  if (!lyricsEl) return;
  document.querySelectorAll('#lwLyrics .lw-lyric-line').forEach((el, i) => {
    el.classList.toggle('lw-lyric-active', i === active);
    el.classList.toggle('lw-lyric-past', i < active);
  });
  const activeEl = document.getElementById(`wlyric-${active}`);
  if (activeEl) {
    const target = activeEl.offsetTop - (lyricsEl.clientHeight / 2) + (activeEl.clientHeight / 2);
    lyricsEl.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }
}

function openLyricsPanel() {
  let panel = document.getElementById('lyricsPanel');
  const layout = document.getElementById('lyricsLayout');

  if (panel) {
    panel.style.display = 'flex';
    updateLyricsPanel();
    return;
  }

  panel = document.createElement('div');
  panel.id = 'lyricsPanel';
  panel.className = 'lyrics-side-panel';
  panel.style.cssText = 'opacity:0; transform:translateX(20px) scale(0.98); transition:none;';
  panel.innerHTML = `
    <div class="lw-titlebar">
      <div class="lw-title-info">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#1db954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
        <span id="lwSong">${currentSpotifyData ? currentSpotifyData.song : 'lyrics'}</span>
      </div>
      <div class="lw-controls"></div>
    </div>
    <div class="lw-body">
      <div class="lw-lyrics" id="lwLyrics">
        <div class="lyrics-loading">loading lyrics...</div>
      </div>
    </div>
  `;

  layout.appendChild(panel);
  panel.getBoundingClientRect();

  panel.style.transition = 'opacity 480ms cubic-bezier(0.16, 1, 0.3, 1), transform 480ms cubic-bezier(0.34, 1.2, 0.64, 1)';
  panel.style.opacity = '1';
  panel.style.transform = 'translateX(0) scale(1)';

  updateLyricsPanel();

  if (currentSpotifyData && currentLyrics.length) {
    setTimeout(() => highlightLyric(Date.now() - currentSpotifyData.timestamps.start), 150);
  }
}

function closeLyricsPanel() {
  const panel = document.getElementById('lyricsPanel');
  if (!panel) return;
  panel.style.transition = 'opacity 380ms cubic-bezier(0.4, 0, 1, 1), transform 380ms cubic-bezier(0.4, 0, 0.2, 1)';
  panel.style.opacity = '0';
  panel.style.transform = 'translateX(20px) scale(0.98)';
  setTimeout(() => panel.remove(), 390);
}

function updateLyricsPanel() {
  const songEl = document.getElementById('lwSong');
  const lyricsEl = document.getElementById('lwLyrics');
  if (!songEl || !lyricsEl) return;

  songEl.textContent = currentSpotifyData ? currentSpotifyData.song : 'lyrics';

    if (currentLyrics.length > 0) {
      lyricsEl.innerHTML = currentLyrics.map((l, i) =>
        `<div class="lw-lyric-line" id="wlyric-${i}">${l.text}</div>`
      ).join('');
    } else {
      lyricsEl.innerHTML = document.getElementById('lyricsContent').innerHTML;
    }
    lyricsEl.classList.toggle('is-plain', currentLyrics.length === 0);
}

function toggleLyrics() {
  lyricsOpen = !lyricsOpen;
  lyricsWasOpen = lyricsOpen;
  const btn = document.getElementById('lyricsBtn');

  if (lyricsOpen) {
    if (btn) btn.classList.add('active');
    if (currentSpotifyData && currentLyrics.length === 0) {
      document.getElementById('lyricsContent').innerHTML = '<div class="lyrics-loading">loading lyrics...</div>';
      fetchLyrics(currentSpotifyData);
    }
    openLyricsPanel();
  } else {
    if (btn) btn.classList.remove('active');
    closeLyricsPanel();
  }
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let gbOffset = 0;
let gbTotal = 0;
let gbAllEntries = [];
const GB_PAGE = 10;
const GB_MAX = 500;

function renderGuestbookEntries(entries) {
  const container = document.getElementById('guestbookEntries');
  const status = document.getElementById('guestbookStatus');
  if (!container || !status) return;

  if (!entries.length) {
    status.textContent = 'no guestbook entries yet — be the first!';
    container.innerHTML = '<div class="guestbook-empty">No public messages yet. Submit one with the form above.</div>';
    updateLoadMore();
    return;
  }

  const liked = JSON.parse(localStorage.getItem('gb_liked') || '{}');

  container.innerHTML = entries.map(entry => {
    const userLiked = liked[entry.id];
    const likeIcon = userLiked ? '♥' : '♡';
    const authorBadge = entry.liked_by_author ? '<span class="author-like-badge">♥ liked by author</span>' : '';
    return `
      <div class="guestbook-entry" data-id="${entry.id}">
        <div class="guestbook-entry-title">${escapeHtml(entry.name || 'anonymous')}</div>
        <div class="guestbook-entry-body">${escapeHtml(entry.message || '')}</div>
        <div class="guestbook-entry-footer">
          <span class="guestbook-entry-meta">${formatTimestamp(entry.created_at)}</span>
          <span class="guestbook-entry-actions">
            <button class="like-btn ${userLiked ? 'liked' : ''}" data-id="${entry.id}">${likeIcon}</button>
            <span class="like-count">${entry.likes || 0}</span>
            ${authorBadge}
          </span>
        </div>
      </div>
    `;
  }).join('');

  const shown = entries.length;
  const total = Math.min(gbTotal, GB_MAX);
  status.textContent = `${shown} of ${total} saved message${total === 1 ? '' : 's'}`;

  updateLoadMore();
}

function updateLoadMore() {
  const container = document.getElementById('guestbookEntries');
  const hasMore = gbOffset + GB_PAGE < Math.min(gbTotal, GB_MAX);

  let loadMoreBtn = document.getElementById('gbLoadMore');
  if (hasMore) {
    if (!loadMoreBtn) {
      loadMoreBtn = document.createElement('button');
      loadMoreBtn.id = 'gbLoadMore';
      loadMoreBtn.className = 'guestbook-load-more';
      loadMoreBtn.textContent = 'load more';
      loadMoreBtn.addEventListener('click', loadMoreGuestbookEntries);
      container.after(loadMoreBtn);
    }
  } else if (loadMoreBtn) {
    loadMoreBtn.remove();
  }
}

async function fetchGuestbookEntries() {
  gbOffset = 0;
  gbAllEntries = [];
  const status = document.getElementById('guestbookStatus');
  if (status) status.textContent = 'loading guestbook entries…';

  try {
    const res = await fetch(`${WORKER_URL}?limit=${GB_PAGE}&offset=0`);
    if (!res.ok) throw new Error('failed');
    const data = await res.json();
    gbAllEntries = data.entries || [];
    gbTotal = data.total || 0;
    renderGuestbookEntries(gbAllEntries);
  } catch (err) {
    if (status) status.textContent = 'could not load guestbook entries';
    document.getElementById('guestbookEntries').innerHTML = '<div class="guestbook-empty">guestbook is unavailable right now.</div>';
    console.error('guestbook load failed', err);
  }
}

async function loadMoreGuestbookEntries() {
  const newOffset = gbOffset + GB_PAGE;
  if (newOffset >= GB_MAX) return;

  const status = document.getElementById('guestbookStatus');
  if (status) status.textContent = 'loading more…';

  try {
    const res = await fetch(`${WORKER_URL}?limit=${GB_PAGE}&offset=${newOffset}`);
    if (!res.ok) throw new Error('failed');
    const data = await res.json();
    const more = data.entries || [];
    gbAllEntries = [...gbAllEntries, ...more];
    gbOffset = newOffset;
    renderGuestbookEntries(gbAllEntries);
  } catch (err) {
    if (status) status.textContent = 'could not load more entries';
    console.error('load more failed', err);
  }
}

function handleLike(entryId) {
  const liked = JSON.parse(localStorage.getItem('gb_liked') || '{}');
  if (liked[entryId]) return;

  const body = { action: 'like', id: entryId };
  if (authorToken) body.token = authorToken;

  fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then(res => {
      if (!res.ok) throw new Error('failed');
      return res.json();
    })
    .then(result => {
      liked[entryId] = true;
      localStorage.setItem('gb_liked', JSON.stringify(liked));

      const entry = gbAllEntries.find(e => String(e.id) === entryId);
      if (entry) {
        entry.likes = result.likes;
        if (result.liked_by_author) entry.liked_by_author = true;
      }
      renderGuestbookEntries(gbAllEntries);
    })
    .catch(err => console.error('like failed', err));
}

async function authenticateAuthor() {
  if (authorToken) {
    authorToken = null;
    sessionStorage.removeItem('author_token');
    return;
  }

  const password = prompt('enter author password:');
  if (!password) return;

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'auth', password }),
    });
    const data = await res.json();
    if (data.ok && data.token) {
      authorToken = data.token;
      sessionStorage.setItem('author_token', data.token);
    } else {
      alert('incorrect password');
    }
  } catch {
    alert('authentication failed');
  }
}

let keyBuffer = '';
document.addEventListener('keydown', (e) => {
  if (e.key.length === 1) {
    keyBuffer += e.key.toLowerCase();
    if (keyBuffer.length > 9) keyBuffer = keyBuffer.slice(-9);
    if (keyBuffer === 'iamauthor') {
      keyBuffer = '';
      authenticateAuthor();
    }
  }
});

async function initGuestbook() {
  const form = document.getElementById('guestbookForm');
  const toggle = document.getElementById('guestbookToggle');
  const card = document.getElementById('guestbookCard');
  const layout = document.getElementById('lyricsLayout');

  const updateToggle = () => {
    if (!toggle || !card || !layout) return;
    toggle.textContent = guestbookOpen ? 'close' : 'guestbook';
  };

  const hint = document.getElementById('guestbookScrollHint');
  let hintTimeout = null;

  const showScrollHint = () => {
    if (!hint || window.innerWidth >= 1040) return;
    clearTimeout(hintTimeout);
    hint.classList.remove('hiding');
    hint.classList.add('visible');
    hintTimeout = setTimeout(hideScrollHint, 3500);
  };

  const hideScrollHint = () => {
    if (!hint) return;
    clearTimeout(hintTimeout);
    hint.classList.remove('visible');
    hint.classList.remove('hiding');
  };

  window.addEventListener('scroll', () => {
    if (hint && hint.classList.contains('visible') && !hint.classList.contains('hiding')) hideScrollHint();
  }, { passive: true });

  const openGuestbook = () => {
    if (!card || !layout) return;
    card.classList.remove('guestbook-hidden');
    card.classList.add('guestbook-collapsed');
    void card.offsetHeight;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        layout.style.transition = 'max-width 480ms cubic-bezier(0.16, 1, 0.3, 1)';
        layout.classList.add('guestbook-active');
        card.classList.remove('guestbook-collapsed');
      });
    });
    guestbookOpen = true;
    updateToggle();
    fetchGuestbookEntries();
    showScrollHint();
  };

  const closeGuestbook = () => {
    if (!card) return;
    hideScrollHint();
    card.classList.add('guestbook-collapsed');
    guestbookOpen = false;
    updateToggle();
    layout.style.transition = 'max-width 280ms cubic-bezier(0.4, 0, 1, 1)';
    layout.classList.remove('guestbook-active');
    setTimeout(() => {
      card.classList.add('guestbook-hidden');
      card.classList.remove('guestbook-collapsed');
      layout.style.transition = '';
    }, 300);
  };

  if (toggle && card) {
    toggle.addEventListener('click', () => {
      if (guestbookOpen) {
        closeGuestbook();
      } else {
        openGuestbook();
      }
    });
    updateToggle();
  }

  const entriesContainer = document.getElementById('guestbookEntries');
  if (entriesContainer) {
    entriesContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.like-btn');
      if (btn) handleLike(btn.dataset.id);
    });
  }

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nameInput = document.getElementById('guestName');
    const messageInput = document.getElementById('guestMessage');
    const name = nameInput?.value.trim() || 'anonymous';
    const message = messageInput?.value.trim();
    const status = document.getElementById('guestbookStatus');

    if (!message) {
      if (status) status.textContent = 'please enter a message before submitting';
      return;
    }

    if (status) status.textContent = 'saving your message…';

    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message }),
      });
      if (!res.ok) throw new Error('failed');
      if (status) status.textContent = 'message saved! refreshing entries…';
      if (nameInput) nameInput.value = '';
      if (messageInput) messageInput.value = '';
      fetchGuestbookEntries();
    } catch (err) {
      if (status) status.textContent = 'could not save your message, try again later, you might be rate limited.';
      console.error('guestbook submit failed', err);
    }
  });

  fetchGuestbookEntries();
}

function connectLanyard() {
  const ws = new WebSocket('wss://api.lanyard.rest/socket');
  let heartbeat;

  ws.addEventListener('message', async (e) => {
    const msg = JSON.parse(e.data);
    if (msg.op === 1) {
      ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
      heartbeat = setInterval(() => ws.send(JSON.stringify({ op: 3 })), msg.d.heartbeat_interval);
    }
    if (msg.op === 0 && (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE')) {
      if (msg.d.activities) {
        msg.d.activities = msg.d.activities.filter(a => !BLOCKED_ACTIVITIES.includes(a.application_id));
      }
      
      const dataHash = JSON.stringify({
        spotify: msg.d.listening_to_spotify ? {
          track_id: msg.d.spotify?.track_id,
          song: msg.d.spotify?.song,
          artist: msg.d.spotify?.artist,
          album: msg.d.spotify?.album,
        } : null,
        activities: msg.d.activities?.map(a => ({ id: a.id, type: a.type, name: a.name })) || [],
        status: msg.d.discord_status,
      });
      
      if (dataHash === lastProfileDataHash) {
        return; 
      }
      lastProfileDataHash = dataHash;
      
      clearTimeout(profileUpdateTimeout);
      profileUpdateTimeout = setTimeout(() => {
        updateProfile(msg.d);
      }, 100);
    }
  });

  ws.addEventListener('close', () => {
    clearInterval(heartbeat);
    setTimeout(connectLanyard, 3000);
  });

  ws.addEventListener('error', () => ws.close());
}

connectLanyard();
initGuestbook();

const audio = document.getElementById('audio');

function fmt(s) {
  return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
}

function initSlider() {
  document.getElementById('volSlider').style.background = `linear-gradient(to right, #e07830 100%, #2a2a2a 100%)`;
  if (audio.duration) document.getElementById('durationEl').textContent = fmt(audio.duration);
}
initSlider();

function togglePlay() {
  if (!audio) return;
  if (audio.paused) {
    audio.play().catch(() => {});
    document.getElementById('playIcon').innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
  } else {
    audio.pause();
    document.getElementById('playIcon').innerHTML = '<path d="M8 5v14l11-7z"/>';
  }
}

audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  document.getElementById('progressFill').style.width = (audio.currentTime / audio.duration * 100) + '%';
  document.getElementById('currentTime').textContent = fmt(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
  document.getElementById('durationEl').textContent = fmt(audio.duration);
  const slider = document.getElementById('volSlider');
  slider.style.background = `linear-gradient(to right, #e07830 ${slider.value * 100}%, #2a2a2a ${slider.value * 100}%)`;
});

audio.addEventListener('ended', () => {
  document.getElementById('playIcon').innerHTML = '<path d="M8 5v14l11-7z"/>';
  document.getElementById('progressFill').style.width = '0%';
  document.getElementById('currentTime').textContent = '0:00';
});

function setVolume(v) {
  audio.volume = v;
  audio.muted = false;
  updateVolIcon(v);
  document.getElementById('volSlider').style.background = `linear-gradient(to right, #e07830 ${v * 100}%, #2a2a2a ${v * 100}%)`;
}

function toggleMute() {
  audio.muted = !audio.muted;
  updateVolIcon(audio.muted ? 0 : audio.volume);
}

function updateVolIcon(v) {
  const path = v == 0
    ? 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z'
    : v < 0.5
    ? 'M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z'
    : 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z';
  document.getElementById('volIcon').innerHTML = `<path d="${path}"/>`;
}

function seek(e) {
  if (!audio.duration) return;
  audio.currentTime = (e.offsetX / e.currentTarget.clientWidth) * audio.duration;
}

const canvas = document.getElementById('snow');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const snowLayers = [
  { count: 25, minR: 1.2, maxR: 2.8, minSpeed: 0.4, maxSpeed: 0.9, minOpacity: 0.25, maxOpacity: 0.5, drift: 0.35 },
  { count: 40, minR: 0.6, maxR: 1.4, minSpeed: 0.25, maxSpeed: 0.55, minOpacity: 0.12, maxOpacity: 0.28, drift: 0.25 },
  { count: 50, minR: 0.3, maxR: 0.7, minSpeed: 0.15, maxSpeed: 0.35, minOpacity: 0.06, maxOpacity: 0.15, drift: 0.18 },
];

const flakes = snowLayers.flatMap(layer =>
  Array.from({ length: layer.count }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * (layer.maxR - layer.minR) + layer.minR,
    speed: Math.random() * (layer.maxSpeed - layer.minSpeed) + layer.minSpeed,
    drift: (Math.random() - 0.5) * layer.drift,
    opacity: Math.random() * (layer.maxOpacity - layer.minOpacity) + layer.minOpacity,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: Math.random() * 0.008 + 0.002,
    layer: layer,
  }))
);

let snowTime = 0;
function drawFlakes() {
  snowTime += 0.01;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const sortedFlakes = [...flakes].sort((a, b) => a.r - b.r);
  
  for (const f of sortedFlakes) {
    ctx.globalAlpha = f.opacity;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
    
    f.wobble += f.wobbleSpeed;
    const wind = Math.sin(snowTime + f.y * 0.002) * 0.15;
    f.x += f.drift + wind + Math.sin(f.wobble) * 0.2;
    f.y += f.speed;
    
    if (f.y > canvas.height + 10) {
      f.y = -10;
      f.x = Math.random() * canvas.width;
    }
    if (f.x > canvas.width + 5) f.x = -5;
    if (f.x < -5) f.x = canvas.width + 5;
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(drawFlakes);
}
drawFlakes();

const layer1 = document.getElementById('layer1');
const layer2 = document.getElementById('layer2');
let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
let rafId = null;

function animateParallax() {
  const ease = 0.035;
  const dx = targetX - currentX;
  const dy = targetY - currentY;
  
  currentX += dx * ease;
  currentY += dy * ease;
  
  if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
    layer1.style.transform = `translate(${currentX * 22}px, ${currentY * 14}px)`;
    layer2.style.transform = `translate(${currentX * -12}px, ${currentY * -8}px)`;
  }
  
  rafId = requestAnimationFrame(animateParallax);
}

window.addEventListener('mousemove', (e) => {
  targetX = (e.clientX / window.innerWidth - 0.5) * 2;
  targetY = (e.clientY / window.innerHeight - 0.5) * 2;
});

document.addEventListener('mouseleave', () => {
  targetX = 0;
  targetY = 0;
});

animateParallax();


document.getElementById('playBtn').addEventListener('click', togglePlay);
document.getElementById('muteBtn').addEventListener('click', toggleMute);
document.getElementById('volSlider').addEventListener('input', (e) => setVolume(parseFloat(e.target.value)));

(function() {
  var host = location.hostname.replace(/^www\./, '');
  var container = document.createElement('div');
  container.id = 'lc-embed';
  container.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:99999;font-family:Inter,system-ui,sans-serif;';
  document.body.appendChild(container);

  var style = document.createElement('style');
  style.textContent = '@media (max-width: 640px) { #lc-embed { left: 50% !important; transform: translateX(-50%); bottom: 16px !important; } }';
  document.head.appendChild(style);

  var bg = '#161616';
  var border = '#252525';
  var text = '#ccc';
  var accentBg = 'rgba(224, 120, 48, 0.1)';
  var accentBorder = 'rgba(224, 120, 48, 0.4)';
  var accentText = '#e07830';

  fetch("https://lanyard.cafe" + '/api/ring?url=' + encodeURIComponent(host))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var prev = data.prev, next = data.next, random = data.random;
      var isMember = data.current !== null;
      var currentLine = isMember ? '<p style="margin:0;font-size:11px;color:' + text + ';margin-top:8px;">you are at <span style="font-weight:600;color:' + accentText + ';">' + data.current.url + '</span></p>' : '';
      container.innerHTML =
        '<div style="background:' + bg + ';border:1px solid ' + border + ';border-radius:12px;padding:12px;display:inline-block;font-size:12px;">' +
        '<div style="display:flex;gap:8px;' + (isMember ? 'margin-bottom:8px;' : '') + '">' +
        '<a href="' + prev.url + '" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:8px;background:' + accentBg + ';color:' + accentText + ';border:1px solid ' + accentBorder + ';font-weight:600;font-size:11px;text-decoration:none;white-space:nowrap;transition:all 200ms;cursor:pointer;">\u25C0</a>' +
        '<a href="' + random.url + '" style="display:inline-flex;align-items:center;padding:6px 12px;border-radius:8px;background:' + accentBg + ';color:' + accentText + ';border:1px solid ' + accentBorder + ';font-weight:600;font-size:11px;text-decoration:none;white-space:nowrap;transition:all 200ms;cursor:pointer;">random</a>' +
        '<a href="' + next.url + '" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:8px;background:' + accentBg + ';color:' + accentText + ';border:1px solid ' + accentBorder + ';font-weight:600;font-size:11px;text-decoration:none;white-space:nowrap;transition:all 200ms;cursor:pointer;">\u25B6</a>' +
        '</div>' +
        currentLine +
        '</div>';
    })
    .catch(function() {});
})();
document.getElementById('progressBar').addEventListener('click', seek);
