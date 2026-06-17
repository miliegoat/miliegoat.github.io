const ID = '1125787079654260777';

function initOverlay() {
  const overlay = document.getElementById('startOverlay');
  const clickLabel = document.getElementById('clickLabel');
  let hasStarted = false;

  function start() {
    if (hasStarted) return;
    hasStarted = true;
    overlay.classList.add('hidden');
    setTimeout(() => {
      overlay.style.display = 'none';
      initMainContent();
      playRandom();
    }, 800);
  }

  clickLabel.addEventListener('click', start);
  overlay.addEventListener('click', start);
  document.addEventListener('keydown', function (e) {
    if (!hasStarted) start();
  });
}

function Random() {
  this.seed = Math.random();
  this.nextFloat = function () {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  };
}

let snowflakes = [];
let snowTime = 0;

function initSnow() {
  var random = new Random();
  snowflakes = [];
  for (var i = 0; i < 150; i++) {
    snowflakes.push({
      offsetX: random.nextFloat() * 1000,
      size: i % 4 === 0 ? 2 : 1
    });
  }
}

function drawSnow() {
  if (window.stopSnowDraw) {
    requestAnimationFrame(drawSnow);
    return;
  }
  snowTime += 0.016;
  var container = document.body;
  var existingSnow = container.querySelectorAll('.snowflake');
  existingSnow.forEach(function (s) { s.remove(); });

  for (var i = 0; i < snowflakes.length; i++) {
    var snow = snowflakes[i];
    var s = snow.offsetX;
    var x = ((i / 150 * window.innerWidth) + Math.sin(snowTime * 0.2 + s) * 50) % window.innerWidth;
    var y = ((snowTime * (20 + (s % 20)) + (s * 5)) % (window.innerHeight + 100)) - 100;

    if (x < 0) x += window.innerWidth;
    if (y < -10 || y > window.innerHeight + 10) continue;

    var alpha = 0.6;
    if (y < 50) alpha *= (y / 50);
    else if (y > window.innerHeight - 50) alpha *= (window.innerHeight - y) / 50;

    var flake = document.createElement('div');
    flake.className = 'snowflake';
    flake.style.left = x + 'px';
    flake.style.top = y + 'px';
    flake.style.width = snow.size + 'px';
    flake.style.height = snow.size + 'px';
    flake.style.opacity = Math.max(0, alpha);
    container.appendChild(flake);
  }
  requestAnimationFrame(drawSnow);
}

let currentPeriod = null;
let lastBgIndex = -1;
var bgList = [];
var bgReady = false;

var bgVideoEl = null;

function preloadBackgrounds() {
  var max = 50;
  var pending = 0;
  function done() {
    if (pending === 0) {
      bgReady = true;
      detectBgVideos();
    }
  }
  for (var i = 1; i <= max; i++) {
    (function (n) {
      pending++;
      var img = new Image();
      img.onload = function () {
        bgList.push({ type: 'img', path: 'bgs/' + n + '.jpg' });
        pending--;
        done();
      };
      img.onerror = function () {
        var img2 = new Image();
        img2.onload = function () {
          bgList.push({ type: 'img', path: 'bgs/' + n + '.png' });
          pending--;
          done();
        };
        img2.onerror = function () {
          pending--;
          done();
        };
        img2.src = 'bgs/' + n + '.png';
      };
      img.src = 'bgs/' + n + '.jpg';
    })(i);
  }
}

function detectBgVideos() {
  var max = 50;
  for (var i = 1; i <= max; i++) {
    (function (n) {
      var tryLoad = function (ext) {
        var vid = document.createElement('video');
        vid.preload = 'metadata';
        vid.muted = true;
        var oncanplay = function () {
          vid.removeEventListener('canplay', oncanplay);
          vid.removeEventListener('error', onerror);
          var wasEmpty = bgList.length === 0;
          bgList.push({ type: 'vid', path: 'bgs/' + n + ext });
          if (wasEmpty) {
            var entry = getRandomBg();
            if (entry) applyBgEntry(entry);
          }
        };
        var onerror = function () {
          vid.removeEventListener('canplay', oncanplay);
          vid.removeEventListener('error', onerror);
          if (ext === '.mp4') tryLoad('.webm');
        };
        vid.addEventListener('canplay', oncanplay);
        vid.addEventListener('error', onerror);
        vid.src = 'bgs/' + n + ext;
        vid.load();
      };
      tryLoad('.mp4');
    })(i);
  }
}

function getRandomBg() {
  if (bgList.length === 0) return null;
  var idx;
  do {
    idx = Math.floor(Math.random() * bgList.length);
  } while (idx === lastBgIndex && bgList.length > 1);
  lastBgIndex = idx;
  return bgList[idx];
}

const fallbackGradients = [
  'linear-gradient(135deg, #0a0a0f, #0f0f1a, #1a0a2e)',
  'linear-gradient(135deg, #050510, #0a0a1a, #150a25)',
  'linear-gradient(135deg, #0a0a15, #000010, #1a0a30)'
];
var lastFallbackIdx = -1;

function getFallbackBg() {
  var idx;
  do {
    idx = Math.floor(Math.random() * fallbackGradients.length);
  } while (idx === lastFallbackIdx && fallbackGradients.length > 1);
  lastFallbackIdx = idx;
  return fallbackGradients[idx];
}

function applyBgEntry(entry) {
  if (!entry) return;
  if (entry.type === 'vid') {
    if (bgVideoEl) { bgVideoEl.pause(); bgVideoEl.remove(); }
    bgVideoEl = document.createElement('video');
    bgVideoEl.src = entry.path;
    bgVideoEl.muted = true;
    bgVideoEl.loop = false;
    bgVideoEl.playsInline = true;
    bgVideoEl.preload = 'auto';
    bgVideoEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;filter:brightness(0.5);';
    document.body.insertBefore(bgVideoEl, document.body.firstChild);
    bgVideoEl.addEventListener('loadedmetadata', function () {
      bgVideoEl.currentTime = 9;
      bgVideoEl.play().catch(function () {});
    });
    bgVideoEl.addEventListener('ended', function () {
      changeBackgroundRandomly();
    });
  } else {
    if (bgVideoEl) { bgVideoEl.pause(); bgVideoEl.remove(); bgVideoEl = null; }
    if (entry.path.indexOf('linear-gradient') === 0) {
      document.body.style.backgroundImage = entry.path;
    } else {
      document.body.style.backgroundImage = 'url(' + entry.path + ')';
    }
  }
}

function changeBackgroundRandomly() {
  var entry = getRandomBg() || { type: 'img', path: getFallbackBg() };
  if (!entry) return;

  var overlay = document.getElementById('timeOverlay');
  overlay.classList.remove('fade-out');
  overlay.classList.add('active');

  setTimeout(function () {
    applyBgEntry(entry);
    overlay.classList.remove('active');
    overlay.classList.add('fade-out');
  }, 1500);
}

function setBackground() {
  var now = new Date();
  var hours = now.getHours();
  var totalMinutes = hours * 60 + now.getMinutes();

  var period;
  if (totalMinutes >= 300 && totalMinutes <= 810) {
    period = 'day';
  } else if (totalMinutes >= 811 && totalMinutes <= 1080) {
    period = 'afternoon';
  } else {
    period = 'night';
  }

  if (period !== currentPeriod) {
    var prevPeriod = currentPeriod;
    currentPeriod = period;
    var entry = getRandomBg() || { type: 'img', path: getFallbackBg() };
    if (prevPeriod === null) {
      applyBgEntry(entry);
      if (period === 'night') applyGlow();
      else removeGlow();
      return;
    }
    applyTimeTransition(entry, period);
  }
}

function applyTimeTransition(entry, period) {
  var overlay = document.getElementById('timeOverlay');

  overlay.classList.remove('fade-out');
  overlay.classList.add('active');

  setTimeout(function () {
    applyBgEntry(entry);
    if (period === 'night') {
      applyGlow();
    } else {
      removeGlow();
    }
    overlay.classList.remove('active');
    overlay.classList.add('fade-out');
  }, 1500);
}

function applyGlow() {
  var selectors = [
    '.logo-m', '#logoDivider', '.sidebar', '#sidebarProfile',
    '.profile-pic', '#username', '.profile-divider', '.profile-text',
    '.profile-credit', '.sidebar-btn', '.control-btn',
    '#progressBarBg', '#timeDisplay', '#nowPlaying',
    '#volumeSlider', '.volume-label', '#volumeValue', '#visualizerCanvas'
  ];

  selectors.forEach(function (sel) {
    if (sel === '.sidebar-btn' || sel === '.control-btn') {
      document.querySelectorAll(sel).forEach(function (el) { el.classList.add('night-glow'); });
      return;
    }
    var el = document.querySelector(sel);
    if (el) el.classList.add('night-glow');
  });
}

function removeGlow() {
  var selectors = [
    '.logo-m', '#logoDivider', '.sidebar', '#sidebarProfile',
    '.profile-pic', '#username', '.profile-divider', '.profile-text',
    '.profile-credit', '.sidebar-btn', '.control-btn',
    '#progressBarBg', '#timeDisplay', '#nowPlaying',
    '#volumeSlider', '.volume-label', '#volumeValue', '#visualizerCanvas'
  ];

  selectors.forEach(function (sel) {
    if (sel === '.sidebar-btn' || sel === '.control-btn') {
      document.querySelectorAll(sel).forEach(function (el) { el.classList.remove('night-glow'); });
      return;
    }
    var el = document.querySelector(sel);
    if (el) el.classList.remove('night-glow');
  });
}

async function fetchProfile() {
  try {
    var res = await fetch('https://api.lanyard.rest/v1/users/' + ID);
    var data = await res.json();
    if (!data.success) return;

    var user = data.data.discord_user;
    var profilePic = document.getElementById('profilePic');
    var username = document.getElementById('username');
    var status = document.getElementById('status');

    if (user.avatar) {
      var avatarUrl = 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.png?size=256';
      profilePic.src = avatarUrl;
    }
    username.textContent = user.display_name || user.global_name || user.username;

    var statusMap = { online: 'Online', idle: 'Idle', dnd: 'Do Not Disturb', offline: 'Offline' };
    var discordStatus = data.data.discord_status;
    status.textContent = statusMap[discordStatus] || 'Unknown';

    var statusColors = { online: '#43b581', idle: '#faa61a', dnd: '#f04747', offline: '#747f8d' };
    if (statusColors[discordStatus]) {
      status.style.backgroundColor = statusColors[discordStatus] + '33';
      status.style.color = statusColors[discordStatus];
    }

    var customStatus = '';
    if (data.data.activities && data.data.activities.length > 0) {
      for (var a = 0; a < data.data.activities.length; a++) {
        var act = data.data.activities[a];
        if (act.type === 4 && act.state) {
          customStatus = act.state;
          if (act.emoji && act.emoji.name) {
            customStatus = act.emoji.name + ' ' + customStatus;
          }
          break;
        }
      }
    }
    document.getElementById('profileText').textContent = customStatus || '';
    document.getElementById('profileCredit').textContent = '- ' + user.username;
    document.querySelector('.profile-footer').style.display = customStatus ? 'flex' : 'none';
  } catch (e) { console.error(e); }
}

const musicTracks = [
  'media/music/lucille - breakdowns.mp3',
  'media/music/jaydes - vivienne.mp3',
  'media/music/jacari - imma jerk.mp3',
  'media/music/bunni - galore galore galore.mp3',
  'media/music/bunii - REGRET.mp3',
];

var player = document.getElementById('musicPlayer');
var audioContext, analyser, dataArray, source, canvas, ctx;
var rotation = 0;
var lastCatIndex = -1;
var lastTrackIndex = -1;

function cleanName(path) {
  return path.replace(/^.*[\\\/]/, '').replace('.mp3', '');
}

function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source = audioContext.createMediaElementSource(player);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    canvas = document.getElementById('visualizerCanvas');
    ctx = canvas.getContext('2d');
    visualize();
  }
}

function visualize() {
  requestAnimationFrame(visualize);
  if (!analyser || !ctx) return;
  analyser.getByteFrequencyData(dataArray);

  rotation += 0.5;
  var circle = document.getElementById('spinningCircle');
  circle.style.transform = 'rotate(' + rotation + 'deg)';

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  var centerX = canvas.width / 2;
  var centerY = canvas.height / 2;
  var radius = 90;
  var points = [];
  var totalPoints = 67;

  for (var i = 0; i < totalPoints; i++) {
    var relIndex = Math.floor(i * (dataArray.length / 2) / totalPoints);
    var val = dataArray[relIndex];
    var amplitude = (val / 255) * 80;
    var angle = (i / totalPoints) * Math.PI * 2 + (rotation * Math.PI / 180);
    var r = radius + amplitude;
    points.push({
      x: centerX + Math.cos(angle) * r,
      y: centerY + Math.sin(angle) * r
    });
  }

  ctx.beginPath();
  var mid0X = (points[points.length - 1].x + points[0].x) / 2;
  var mid0Y = (points[points.length - 1].y + points[0].y) / 2;
  ctx.moveTo(mid0X, mid0Y);

  for (var i = 0; i < points.length; i++) {
    var p1 = points[i];
    var p2 = points[(i + 1) % points.length];
    var midX = (p1.x + p2.x) / 2;
    var midY = (p1.y + p2.y) / 2;
    ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
  }

  ctx.closePath();

  var time = Date.now() / 1000;
  var colorShift = (Math.sin(time) + 1) / 2;
  var r = Math.floor(107 + colorShift * 40);
  var b = Math.floor(193 + colorShift * 60);

  var gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius + 80);
  gradient.addColorStop(0, 'rgba(40, 20, 80, 0.6)');
  gradient.addColorStop(1, 'rgba(' + r + ', 70, ' + b + ', 0.5)');

  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = 'rgba(' + r + ', 120, ' + b + ', 0.8)';
  ctx.lineWidth = 4;
  ctx.stroke();
}

function changeImage() {
  var totalCats = 5;
  var idx;
  do {
    idx = Math.floor(Math.random() * totalCats) + 1;
  } while (idx === lastCatIndex);
  lastCatIndex = idx;
  var circle = document.getElementById('spinningCircle');
  circle.style.backgroundImage = 'url(cats/cat' + idx + '.jpg)';
  circle.style.backgroundSize = 'cover';
}

var firstPlay = true;
var trackHistory = [];

function playRandom() {
  if (player.src && player.src !== '') {
    var currentSrc = player.src.replace(/^.*[\\\/]/, '');
    if (currentSrc) trackHistory.push(currentSrc);
  }
  changeImage();
  if (musicTracks.length === 0) {
    document.getElementById('nowPlaying').textContent = 'no tracks loaded';
    return;
  }
  var idx;
  if (firstPlay) {
    firstPlay = false;
    idx = 2;
  } else {
    do {
      idx = Math.floor(Math.random() * musicTracks.length);
    } while (idx === lastTrackIndex);
  }
  lastTrackIndex = idx;
  var track = musicTracks[idx];
  player.src = track;
  player.volume = volumeSlider.value / 500;

  var startPlay = function () {
    initAudioContext();
    player.play().then(function () {
      document.getElementById('nowPlaying').textContent = 'now playing: ' + cleanName(track);
    }).catch(function () {
      document.addEventListener('click', startPlay, { once: true });
    });
  };
  startPlay();
}

player.addEventListener('ended', playRandom);
player.addEventListener('play', function () { playBtn.textContent = '\u23F8'; });
player.addEventListener('pause', function () { playBtn.textContent = '\u25B6'; });

var playBtn = document.getElementById('playBtn');
var prevBtn = document.getElementById('prevBtn');
var nextBtn = document.getElementById('nextBtn');
var volumeSlider = document.getElementById('volumeSlider');
var volumeValue = document.getElementById('volumeValue');
var timeDisplay = document.getElementById('timeDisplay');
var progressFill = document.getElementById('progressFill');
var progressBarBg = document.getElementById('progressBarBg');

playBtn.addEventListener('click', function () {
  if (musicTracks.length === 0) return;
  if (player.paused) {
    player.play();
    playBtn.textContent = '\u23F8';
  } else {
    player.pause();
    playBtn.textContent = '\u25B6';
  }
});

nextBtn.addEventListener('click', playRandom);

prevBtn.addEventListener('click', function () {
  if (musicTracks.length === 0 || trackHistory.length === 0) return;
  var prevFile = trackHistory.pop();
  for (var i = 0; i < musicTracks.length; i++) {
    if (musicTracks[i].indexOf(prevFile) !== -1) {
      lastTrackIndex = i;
      var track = musicTracks[i];
      player.src = track;
      player.volume = volumeSlider.value / 500;
      var startPlay = function () {
        initAudioContext();
        player.play().then(function () {
          document.getElementById('nowPlaying').textContent = 'now playing: ' + cleanName(track);
        }).catch(function () {});
      };
      startPlay();
      break;
    }
  }
});

volumeSlider.addEventListener('input', function (e) {
  var value = e.target.value;
  player.volume = value / 500;
  volumeValue.textContent = value;
  volumeSlider.style.setProperty('--value', value + '%');
});

player.addEventListener('timeupdate', function () {
  var current = player.currentTime;
  var duration = player.duration;
  if (duration > 0) {
    var minutes = Math.floor(current / 60);
    var seconds = Math.floor(current % 60);
    timeDisplay.textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    var progress = (current / duration) * 100;
    progressFill.style.width = progress + '%';
  }
});

progressBarBg.addEventListener('click', function (e) {
  if (player.duration > 0) {
    var rect = progressBarBg.getBoundingClientRect();
    var percentage = (e.clientX - rect.left) / rect.width;
    player.currentTime = percentage * player.duration;
  }
});

function initMainContent() {
  preloadBackgrounds();
  setBackground();
  setInterval(setBackground, 60000);
  initSnow();
  drawSnow();
  fetchProfile();
    setInterval(fetchProfile, 1000);

  volumeSlider.style.setProperty('--value', '25%');
  volumeValue.textContent = '25';
  volumeSlider.value = '25';
}

function toggleSidebar() {
  var sidebar = document.getElementById('sidebar');
  var toggleBtn = document.getElementById('toggleBtn');
  var mainContent = document.getElementById('mainContent');
  var toggleIcon = document.getElementById('toggleIcon');
  var circleContainer = document.getElementById('circleContainer');
  var controlButtons = document.getElementById('controlButtons');
  var volumeContainer = document.getElementById('volumeContainer');

  sidebar.classList.toggle('hidden');
  toggleBtn.classList.toggle('sidebar-hidden');
  mainContent.classList.toggle('expanded');
  circleContainer.classList.toggle('centered');
  controlButtons.classList.toggle('sidebar-hidden');
  volumeContainer.classList.toggle('sidebar-hidden');
  toggleIcon.textContent = sidebar.classList.contains('hidden') ? '>' : '<';
}

var input = '';
var thing = 'fuckyou';

document.addEventListener('keydown', function (e) {
  input += e.key.toLowerCase();
  if (input.length > thing.length) {
    input = input.slice(-thing.length);
  }
  if (input === thing) {
    doesThing();
    input = '';
  }
});

function doesThing() {
  if (window.doesThingTriggered) return;
  window.doesThingTriggered = true;
  window.stopSnowDraw = true;

  var speedUpSnow = setInterval(function () {
    var existingSnow = document.querySelectorAll('.snowflake');
    existingSnow.forEach(function (snow) {
      var currentTop = parseFloat(snow.style.top);
      if (!isNaN(currentTop)) {
        snow.style.top = (currentTop + 25) + 'px';
      }
    });
  }, 16);

  var originalVolume = player.volume;
  var volumeFade = originalVolume;
  var fadeInterval = setInterval(function () {
    if (volumeFade > 0.01) {
      volumeFade -= 0.02;
      player.volume = Math.max(0, volumeFade);
    } else {
      player.pause();
      clearInterval(fadeInterval);
    }
  }, 50);

  var blackOverlay = document.createElement('div');
  blackOverlay.style.position = 'fixed';
  blackOverlay.style.top = '0';
  blackOverlay.style.left = '0';
  blackOverlay.style.width = '100%';
  blackOverlay.style.height = '100%';
  blackOverlay.style.backgroundColor = 'black';
  blackOverlay.style.zIndex = '9998';
  blackOverlay.style.opacity = '0';
  blackOverlay.style.transition = 'opacity 1s ease';
  blackOverlay.style.pointerEvents = 'none';
  document.body.appendChild(blackOverlay);

  setTimeout(function () { blackOverlay.style.opacity = '1'; }, 50);

  if (currentPeriod === 'night') {
    removeGlow();
  }

  var sidebar = document.getElementById('sidebar');
  var tbtn = document.getElementById('toggleBtn');
  var ctrlBtns = document.getElementById('controlButtons');
  var volContainer = document.getElementById('volumeContainer');
  var circleContainer = document.getElementById('circleContainer');
  var mainContent = document.getElementById('mainContent');
  var nowPlaying = document.getElementById('nowPlaying');
  var songProgress = document.querySelector('.song-progress-container');

  if (sidebar) { sidebar.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)'; sidebar.style.transform = 'translateX(-100%)'; }
  if (tbtn) { tbtn.style.transition = 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1)'; tbtn.style.left = '-50px'; }
  if (ctrlBtns) { ctrlBtns.style.transition = 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1)'; ctrlBtns.style.left = '-200px'; }
  if (volContainer) { volContainer.style.transition = 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1)'; volContainer.style.left = '-200px'; }
  if (circleContainer) {
    circleContainer.style.transition = 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    circleContainer.style.left = 'calc(100% + 100px)';
    circleContainer.style.transform = 'translate(0, -50%)';
  }
  if (nowPlaying) {
    nowPlaying.style.transition = 'all 0.6s ease-out';
    nowPlaying.style.transform = 'translateY(-100px)';
    nowPlaying.style.opacity = '0';
  }
  if (songProgress) {
    songProgress.style.transition = 'all 0.6s ease-out 0.1s';
    songProgress.style.transform = 'translateY(-100px)';
    songProgress.style.opacity = '0';
  }
  if (mainContent) {
    mainContent.style.transition = 'margin-left 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    mainContent.style.marginLeft = '0';
  }

  setTimeout(function () {
    var countdownDiv = document.createElement('div');
    countdownDiv.id = 'secretCountdown';
    countdownDiv.style.position = 'fixed';
    countdownDiv.style.top = '50%';
    countdownDiv.style.left = '50%';
    countdownDiv.style.transform = 'translate(-50%, -50%)';
    countdownDiv.style.fontFamily = "'Minecraft', 'Courier New', monospace";
    countdownDiv.style.fontSize = '0px';
    countdownDiv.style.color = '#888';
    countdownDiv.style.opacity = '0';
    countdownDiv.style.transition = 'all 1s cubic-bezier(0.2, 0.9, 0.4, 1.1)';
    countdownDiv.style.zIndex = '10000';
    countdownDiv.style.textAlign = 'center';
    countdownDiv.style.pointerEvents = 'none';
    document.body.appendChild(countdownDiv);

    setTimeout(function () {
      countdownDiv.style.fontSize = '80px';
      countdownDiv.style.opacity = '1';
    }, 100);

    var count = 10.00;
    var updateCountdown = setInterval(function () {
      if (count <= 0.01) {
        clearInterval(updateCountdown);
        countdownDiv.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 1, 1)';
        countdownDiv.style.transform = 'translate(-50%, -50%) scale(0)';
        countdownDiv.style.opacity = '0';

        setTimeout(function () {
          countdownDiv.remove();

          var jumpscary = document.createElement('img');
          jumpscary.src = 'cats/funny.png';
          jumpscary.style.position = 'fixed';
          jumpscary.style.top = '50%';
          jumpscary.style.left = '50%';
          jumpscary.style.transform = 'translate(-50%, -50%)';
          jumpscary.style.width = '90%';
          jumpscary.style.maxWidth = '800px';
          jumpscary.style.height = 'auto';
          jumpscary.style.zIndex = '10002';
          jumpscary.style.borderRadius = '10px';
          jumpscary.style.boxShadow = '0 0 50px rgba(0,0,0,0.5)';
          jumpscary.style.pointerEvents = 'none';
          document.body.appendChild(jumpscary);

          var meow = new Audio('cats/meow.mp3');
          meow.volume = 1.0;
          meow.play();

          clearInterval(speedUpSnow);
          setTimeout(function () {
            var remainingSnow = document.querySelectorAll('.snowflake');
            remainingSnow.forEach(function (s) { s.remove(); });
          }, 500);
        }, 1500);
      } else {
        count -= 0.05;
        countdownDiv.textContent = count <= 0 ? '0.00' : count.toFixed(2);
      }
    }, 50);
  }, 1000);
}

var gbOffset = 0;
var gbTotal = 0;
var gbAllEntries = [];
var GB_PAGE = 8;
var GB_MAX = 500;
var WORKER_URL = 'https://snowy-dust-17c3.asdwaawdawd81.workers.dev/';
var TURNSTILE_SITE_KEY = '0x4AAAAAADg6LkYattvc_Fqe';
var turnstileWidgetId = null;
var authorToken = null;
var gbKeyBuffer = '';
var scrollHintShown = false;

function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function formatTimestamp(ts) {
  if (!ts) return '';
  var d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function renderGuestbookEntries(entries) {
  var container = document.getElementById('guestbookEntries');
  if (!container) return;
  if (!entries.length) {
    container.innerHTML = '<div class="gb-empty">no entries yet — be the first!</div>';
    updateLoadMore();
    return;
  }
  var liked = JSON.parse(localStorage.getItem('gb_liked') || '{}');
  container.innerHTML = entries.map(function (entry, i) {
    var userLiked = liked[entry.id];
    var likeIcon = userLiked ? '\u2665' : '\u2661';
    var authorBadge = entry.liked_by_author ? '<span class="author-like-badge">\u2665 liked by author</span>' : '';
    var animDelay = (i * 0.06).toFixed(2);
    return '<div class="gb-entry" style="animation-delay:' + animDelay + 's">' +
      '<div class="gb-entry-title">' + escapeHtml(entry.name || 'anonymous') + '</div>' +
      '<div class="gb-entry-body">' + escapeHtml(entry.message || '') + '</div>' +
      '<div class="gb-entry-footer">' +
      '<span class="gb-entry-meta">' + formatTimestamp(entry.created_at) + '</span>' +
      '<span class="gb-entry-actions">' +
      '<button class="gb-like-btn ' + (userLiked ? 'liked' : '') + '" data-id="' + entry.id + '">' + likeIcon + '</button>' +
      '<span class="gb-like-count">' + (entry.likes || 0) + '</span>' +
      authorBadge +
      '</span></div></div>';
  }).join('');
  updateLoadMore();
  if (!scrollHintShown && container.scrollHeight > container.clientHeight) {
    scrollHintShown = true;
    var hint = document.createElement('div');
    hint.className = 'gb-scroll-hint';
    hint.textContent = '\u2193 scroll to see more entries';
    document.getElementById('gbFooter').appendChild(hint);
    setTimeout(function () { hint.classList.add('gb-scroll-hint--fade'); }, 2500);
    setTimeout(function () { hint.remove(); }, 3100);
  }
}

function updateLoadMore() {
  var footer = document.getElementById('gbFooter');
  if (!footer) return;
  var hasMore = gbOffset + GB_PAGE < Math.min(gbTotal, GB_MAX);
  var loadMoreBtn = document.getElementById('gbLoadMore');
  if (hasMore) {
    if (!loadMoreBtn) {
      loadMoreBtn = document.createElement('button');
      loadMoreBtn.id = 'gbLoadMore';
      loadMoreBtn.className = 'guestbook-load-more';
      loadMoreBtn.textContent = 'load more';
      loadMoreBtn.addEventListener('click', loadMoreGuestbookEntries);
      footer.appendChild(loadMoreBtn);
    }
  } else if (loadMoreBtn) {
    loadMoreBtn.remove();
  }
}

async function fetchGuestbookEntries() {
  gbOffset = 0;
  gbAllEntries = [];
  var status = document.getElementById('guestbookStatus');
  if (status) status.textContent = 'loading...';
  var container = document.getElementById('guestbookEntries');
  if (container) container.innerHTML = '<div class="gb-loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
  try {
    var res = await fetch(WORKER_URL + '?limit=' + GB_PAGE + '&offset=0');
    if (!res.ok) throw new Error('failed');
    var data = await res.json();
    gbAllEntries = data.entries || [];
    gbTotal = data.total || 0;
    renderGuestbookEntries(gbAllEntries);
    var total = Math.min(gbTotal, GB_MAX);
    if (status) status.textContent = total + ' message' + (total === 1 ? '' : 's');
  } catch {
    if (status) status.textContent = 'could not load';
    if (container) container.innerHTML = '<div class="gb-empty">guestbook is unavailable right now.</div>';
  }
}

async function loadMoreGuestbookEntries() {
  var newOffset = gbOffset + GB_PAGE;
  if (newOffset >= GB_MAX) return;
  var loadMoreBtn = document.getElementById('gbLoadMore');
  if (loadMoreBtn) { loadMoreBtn.disabled = true; loadMoreBtn.textContent = 'loading...'; }
  try {
    var res = await fetch(WORKER_URL + '?limit=' + GB_PAGE + '&offset=' + newOffset);
    if (!res.ok) throw new Error('failed');
    var data = await res.json();
    var more = data.entries || [];
    gbAllEntries = gbAllEntries.concat(more);
    gbOffset = newOffset;
    var container = document.getElementById('guestbookEntries');
    var liked = JSON.parse(localStorage.getItem('gb_liked') || '{}');
    var startIdx = gbAllEntries.length - more.length;
    var html = more.map(function (entry, i) {
      var userLiked = liked[entry.id];
      var likeIcon = userLiked ? '\u2665' : '\u2661';
      var authorBadge = entry.liked_by_author ? '<span class="author-like-badge">\u2665 liked by author</span>' : '';
      var animDelay = ((startIdx + i) * 0.06).toFixed(2);
      return '<div class="gb-entry" style="animation-delay:' + animDelay + 's">' +
        '<div class="gb-entry-title">' + escapeHtml(entry.name || 'anonymous') + '</div>' +
        '<div class="gb-entry-body">' + escapeHtml(entry.message || '') + '</div>' +
        '<div class="gb-entry-footer">' +
        '<span class="gb-entry-meta">' + formatTimestamp(entry.created_at) + '</span>' +
        '<span class="gb-entry-actions">' +
        '<button class="gb-like-btn ' + (userLiked ? 'liked' : '') + '" data-id="' + entry.id + '">' + likeIcon + '</button>' +
        '<span class="gb-like-count">' + (entry.likes || 0) + '</span>' +
        authorBadge +
        '</span></div></div>';
    }).join('');
    container.insertAdjacentHTML('beforeend', html);
    updateLoadMore();
    if (!scrollHintShown && container.scrollHeight > container.clientHeight) {
      scrollHintShown = true;
      var hint = document.createElement('div');
      hint.className = 'gb-scroll-hint';
      hint.textContent = '\u2193 scroll to see new entries';
      document.getElementById('gbFooter').appendChild(hint);
      setTimeout(function () { hint.classList.add('gb-scroll-hint--fade'); }, 2500);
      setTimeout(function () { hint.remove(); }, 3100);
    }
    var doneBtn = document.getElementById('gbLoadMore');
    if (doneBtn) { doneBtn.disabled = false; doneBtn.textContent = 'load more'; }
    var status = document.getElementById('guestbookStatus');
    var total = Math.min(gbTotal, GB_MAX);
    if (status) status.textContent = total + ' message' + (total === 1 ? '' : 's');
  } catch {
    var status = document.getElementById('guestbookStatus');
    if (status) status.textContent = 'could not load more';
    var errBtn = document.getElementById('gbLoadMore');
    if (errBtn) { errBtn.disabled = false; errBtn.textContent = 'load more'; }
  }
}

function toggleLike(entryId) {
  var liked = JSON.parse(localStorage.getItem('gb_liked') || '{}');
  var isLiked = liked[entryId];
  var action = isLiked ? 'unlike' : 'like';
  var body = { action: action, id: entryId };
  if (authorToken) body.token = authorToken;
  fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(function (res) {
    if (!res.ok) throw new Error('failed');
    return res.json();
  }).then(function (result) {
    if (!result.ok) return;
    if (action === 'like') liked[entryId] = true;
    else delete liked[entryId];
    localStorage.setItem('gb_liked', JSON.stringify(liked));
    for (var i = 0; i < gbAllEntries.length; i++) {
      if (String(gbAllEntries[i].id) === entryId) {
        gbAllEntries[i].likes = result.likes;
        if (result.liked_by_author) gbAllEntries[i].liked_by_author = true;
        else if (authorToken && action === 'unlike') gbAllEntries[i].liked_by_author = false;
        break;
      }
    }
    renderGuestbookEntries(gbAllEntries);
  }).catch(function () {});
}

function authenticateAuthor() {
  if (authorToken) {
    authorToken = null;
    sessionStorage.removeItem('author_token');
    return;
  }
  var password = prompt('enter author password:');
  if (!password) return;
  fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'auth', password: password }),
  }).then(function (res) { return res.json(); }).then(function (data) {
    if (data.ok && data.token) {
      authorToken = data.token;
      sessionStorage.setItem('author_token', data.token);
    } else {
      alert('incorrect password');
    }
  }).catch(function () { alert('authentication failed'); });
}

function initGuestbook() {
  var overlay = document.getElementById('guestbookOverlay');
  document.getElementById('guestbookBtn').addEventListener('click', function () {
    overlay.classList.remove('hidden');
    if (!overlay.dataset.loaded) {
      overlay.dataset.loaded = 'true';
      fetchGuestbookEntries();
      var turnstileWidgetDiv = document.getElementById('turnstileWidget');
      if (turnstileWidgetDiv && typeof turnstile !== 'undefined') {
        turnstileWidgetId = turnstile.render(turnstileWidgetDiv, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'auto',
        });
      }
    }
  });
  document.getElementById('gbClose').addEventListener('click', function () {
    overlay.classList.add('hidden');
  });
  overlay.addEventListener('click', function (e) {
    if (e.target === this) this.classList.add('hidden');
  });
  var entriesContainer = document.getElementById('guestbookEntries');
  if (entriesContainer) {
    entriesContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('.gb-like-btn');
      if (btn) {
        btn.classList.add('like-pop');
        setTimeout(function () { btn.classList.remove('like-pop'); }, 400);
        toggleLike(btn.dataset.id);
      }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key.length === 1) {
      gbKeyBuffer += e.key.toLowerCase();
      if (gbKeyBuffer.length > 9) gbKeyBuffer = gbKeyBuffer.slice(-9);
      if (gbKeyBuffer === 'iamauthor') {
        gbKeyBuffer = '';
        authenticateAuthor();
      }
    }
  });
  var form = document.getElementById('guestbookForm');
  if (!form) return;
  var turnstileWidgetDiv = document.getElementById('turnstileWidget');
  if (turnstileWidgetDiv && typeof turnstile !== 'undefined') {
    turnstileWidgetId = turnstile.render(turnstileWidgetDiv, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: 'auto',
    });
  }
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    var nameInput = document.getElementById('guestName');
    var messageInput = document.getElementById('guestMessage');
    var name = (nameInput ? nameInput.value : '').trim() || 'anonymous';
    var message = (messageInput ? messageInput.value : '').trim();
    var status = document.getElementById('guestbookStatus');
    if (!message) {
      if (status) status.textContent = 'type a message';
      return;
    }
    var token = turnstileWidgetId ? turnstile.getResponse(turnstileWidgetId) : '';
    if (!token) {
      if (status) status.textContent = 'complete the captcha';
      return;
    }
    if (status) status.textContent = 'posting...';
    try {
      var res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, message: message, turnstileToken: token }),
      });
      if (!res.ok) {
        var errMsg = 'could not post, try again later.';
        if (res.status === 403) {
          try {
            var errBody = await res.json();
            if (errBody.error === 'captcha verification failed') errMsg = 'captcha failed — turn off your vpn or try again later';
          } catch {}
        }
        if (status) status.textContent = errMsg;
        return;
      }
      if (status) status.textContent = 'posted!';
      if (nameInput) nameInput.value = '';
      if (messageInput) messageInput.value = '';
      fetchGuestbookEntries();
    } catch {
      if (status) status.textContent = 'could not post, try again later.';
    }
  });
}

window.addEventListener('load', function () {
  initOverlay();
  initGuestbook();
});
