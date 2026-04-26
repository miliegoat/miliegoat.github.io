(async function() {
  try {
    const alreadyCounted = sessionStorage.getItem('mil_counted');
    const url = alreadyCounted
      ? 'https://api.counterapi.dev/v2/miliegoat/viewsmiliegoat'
      : 'https://api.counterapi.dev/v2/miliegoat/viewsmiliegoat/up';
    const res = await fetch(url);
    const data = await res.json();
    document.getElementById('viewCount').textContent = Number(data.data.up_count).toLocaleString();
    if (!alreadyCounted) sessionStorage.setItem('mil_counted', '1');
  } catch {
    document.getElementById('viewCount').textContent = '—';
  }
})();

const DISCORD_ID = '1125787079654260777';
const STATUS_COLORS = { online: '#4ade80', idle: '#facc15', dnd: '#f87171', offline: '#6b7280' };
const STATUS_LABELS = { online: 'online', idle: 'idle', dnd: 'do not disturb', offline: 'offline' };

let spotifyProgressInterval = null;
let currentLyrics = [];
let lyricsOpen = false;
let lyricsWasOpen = false;
let currentTrackId = null;
let currentSpotifyData = null;

function fmtMs(ms) {
  const s = Math.floor(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function updateProfile(data) {
  const { discord_user, discord_status, activities, listening_to_spotify, spotify } = data;

  const avatarUrl = discord_user.avatar
    ? `https://cdn.discordapp.com/avatars/${discord_user.id}/${discord_user.avatar}.${discord_user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${Number(discord_user.discriminator || 0) % 5}.png`;

  const displayName = discord_user.global_name || discord_user.username;
  const statusColor = STATUS_COLORS[discord_status] || STATUS_COLORS.offline;
  const statusLabel = STATUS_LABELS[discord_status] || 'offline';
  const customStatus = activities.find(a => a.type === 4);
  const customStatusText = customStatus ? (customStatus.state || customStatus.emoji?.name || '') : '';

  document.getElementById('discordProfile').innerHTML = `
    <div class="avatar-wrap">
      <img
        src="${avatarUrl}"
        style="width:52px;height:52px;border-radius:50%;object-fit:cover;display:block;"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
        loading="lazy"
      />
      <div class="avatar-placeholder" style="display:none;">🐹</div>
      <div class="status-dot" style="background:${statusColor};" title="${statusLabel}"></div>
    </div>
    <div class="profile-info">
      <div class="profile-name">${displayName}</div>
      ${customStatusText ? `<div style="font-size:12px;color:#666;margin-top:3px;">${customStatusText}</div>` : ''}
      <div style="font-size:11px;color:${statusColor};margin-top:2px;font-weight:500;">${statusLabel}</div>
    </div>
    <div class="badge">🦌 noko</div>
  `;

  clearInterval(spotifyProgressInterval);

  document.getElementById('gameActivities').innerHTML = activities.filter(a => a.type === 0).map(game => {
    const largeImage = game.assets?.large_image;
    const iconUrl = largeImage && game.application_id && !largeImage.startsWith('mp:')
      ? `https://cdn.discordapp.com/app-assets/${game.application_id}/${largeImage}.png?size=64`
      : null;
    return `
      <div class="discord-activity">
        <div class="activity-inner">
          ${iconUrl
            ? `<img src="${iconUrl}" class="activity-art" loading="lazy" onerror="this.outerHTML='<div class=&quot;activity-art-placeholder&quot;>🎮</div>'"/>`
            : `<div class="activity-art-placeholder">🎮</div>`}
          <div class="activity-info">
            <div class="activity-type">playing</div>
            <div class="activity-name">${game.name}</div>
            ${game.details ? `<div class="activity-sub">${game.details}</div>` : ''}
            ${game.state ? `<div class="activity-sub">${game.state}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  const localPlayer = document.getElementById('localPlayer');
  const spotifyEl = document.getElementById('spotifyActivity');

  if (listening_to_spotify && spotify) {
    localPlayer.style.display = 'none';
    const trackUrl = `https://open.spotify.com/track/${spotify.track_id}`;
    const duration = spotify.timestamps ? spotify.timestamps.end - spotify.timestamps.start : 0;
    const trackChanged = spotify.track_id !== currentTrackId;
    currentTrackId = spotify.track_id;
    currentSpotifyData = spotify;

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

    // Lyrics panel is always open when Spotify is active

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
    }

    // Always open lyrics panel when listening to Spotify
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
    const artistFirst = spotify.artist.split(';')[0].trim();
    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artistFirst)}&track_name=${encodeURIComponent(spotify.song)}&duration=${Math.round((spotify.timestamps.end - spotify.timestamps.start) / 1000)}`;
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
  panel.getBoundingClientRect(); // flush so initial state is painted

  panel.style.transition = 'opacity 480ms cubic-bezier(0.16, 1, 0.3, 1), transform 480ms cubic-bezier(0.34, 1.2, 0.64, 1)';
  panel.style.opacity = '1';
  panel.style.transform = 'translateX(0) scale(1)';

  // Close button is removed — panel stays open while Spotify is active

  updateLyricsPanel();

  if (currentSpotifyData && currentLyrics.length) {
    setTimeout(() => {
      highlightLyric(Date.now() - currentSpotifyData.timestamps.start);
    }, 150);
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

function connectLanyard() {
  const ws = new WebSocket('wss://api.lanyard.rest/socket');
  let heartbeat;

  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.op === 1) {
      ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
      heartbeat = setInterval(() => ws.send(JSON.stringify({ op: 3 })), msg.d.heartbeat_interval);
    }
    if (msg.op === 0 && (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE')) {
      updateProfile(msg.d);
    }
  });

  ws.addEventListener('close', () => {
    clearInterval(heartbeat);
    setTimeout(connectLanyard, 3000);
  });

  ws.addEventListener('error', () => ws.close());
}

connectLanyard();

const audio = document.getElementById('audio');
let playing = false;

function initSlider() {
  const slider = document.getElementById('volSlider');
  slider.style.background = `linear-gradient(to right, #e07830 100%, #2a2a2a 100%)`;
  if (audio.duration) document.getElementById('durationEl').textContent = fmt(audio.duration);
}
initSlider();

function togglePlay() {
  if (!audio) return;
  if (playing) {
    audio.pause();
    document.getElementById('playIcon').innerHTML = '<path d="M8 5v14l11-7z"/>';
  } else {
    audio.play().catch(() => {});
    document.getElementById('playIcon').innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
  }
  playing = !playing;
}

function fmt(s) {
  const m = Math.floor(s / 60);
  return m + ':' + String(Math.floor(s % 60)).padStart(2, '0');
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
  playing = false;
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

const flakes = Array.from({ length: 80 }, () => ({
  x: Math.random() * window.innerWidth,
  y: Math.random() * window.innerHeight,
  r: Math.random() * 2.5 + 0.5,
  speed: Math.random() * 0.6 + 0.2,
  drift: (Math.random() - 0.5) * 0.3,
  opacity: Math.random() * 0.5 + 0.15,
  wobble: Math.random() * Math.PI * 2,
  wobbleSpeed: Math.random() * 0.01 + 0.003,
}));

function drawFlakes() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < flakes.length; i++) {
    const f = flakes[i];
    ctx.globalAlpha = f.opacity;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
    f.wobble += f.wobbleSpeed;
    f.x += f.drift + Math.sin(f.wobble) * 0.3;
    f.y += f.speed;
    if (f.y > canvas.height + 5) { f.y = -5; f.x = Math.random() * canvas.width; }
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

window.addEventListener('mousemove', (e) => {
  targetX = (e.clientX / window.innerWidth - 0.5) * 2;
  targetY = (e.clientY / window.innerHeight - 0.5) * 2;
});

function animateParallax() {
  currentX += (targetX - currentX) * 0.04;
  currentY += (targetY - currentY) * 0.04;
  layer1.style.transform = `translate(${currentX * 18}px, ${currentY * 12}px)`;
  layer2.style.transform = `translate(${currentX * -10}px, ${currentY * -7}px)`;
  requestAnimationFrame(animateParallax);
}
animateParallax();