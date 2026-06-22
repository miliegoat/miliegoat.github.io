const ID = "1125787079654260777";

function initOverlay() {
  const overlay = document.getElementById("startOverlay");
  const clickLabel = document.getElementById("clickLabel");
  let hasStarted = false;

  function start() {
    if (hasStarted) return;
    hasStarted = true;
    overlay.classList.add("hidden");
    setTimeout(() => {
      overlay.style.display = "none";
      initMainContent();
      playNext();
    }, 800);
  }

  clickLabel.addEventListener("click", start);
  overlay.addEventListener("click", start);
  document.addEventListener("keydown", function (e) {
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
  var count = window.innerWidth < 540 ? 50 : window.innerWidth < 768 ? 80 : 150;
  for (var i = 0; i < count; i++) {
    snowflakes.push({
      offsetX: random.nextFloat() * 1000,
      size: i % 5 === 0 ? 2 : 1,
    });
  }
}

function drawSnow() {
  if (window.stopSnowDraw) {
    requestAnimationFrame(drawSnow);
    return;
  }
  snowTime += 0.016;
  var existingSnow = document.querySelectorAll(".snowflake");
  existingSnow.forEach(function (s) {
    s.remove();
  });
  for (var i = 0; i < snowflakes.length; i++) {
    var snow = snowflakes[i];
    var s = snow.offsetX;
    var x =
      ((i / 150) * window.innerWidth + Math.sin(snowTime * 0.2 + s) * 50) %
      window.innerWidth;
    var y =
      ((snowTime * (20 + (s % 20)) + s * 5) % (window.innerHeight + 100)) - 100;
    if (x < 0) x += window.innerWidth;
    if (y < -10 || y > window.innerHeight + 10) continue;
    var alpha = 0.6;
    if (y < 50) alpha *= y / 50;
    else if (y > window.innerHeight - 50)
      alpha *= (window.innerHeight - y) / 50;
    var flake = document.createElement("div");
    flake.className = "snowflake";
    flake.style.cssText =
      "left:" +
      x +
      "px;top:" +
      y +
      "px;width:" +
      snow.size +
      "px;height:" +
      snow.size +
      "px;opacity:" +
      Math.max(0, alpha);
    document.body.appendChild(flake);
  }
  requestAnimationFrame(drawSnow);
}

let currentPeriod = null;
let lastBgIndex = -1;
var bgList = [];
var bgReady = false;
var bgVideoEl = null;

function preloadBackgrounds() {
  detectBgVideos();
}

function detectBgVideos() {
  var misses = 0;
  function tryNext(n) {
    if (n > 99 || misses >= 3) {
      bgReady = true;
      return;
    }
    var vid = document.createElement("video");
    vid.preload = "metadata";
    vid.muted = true;
    var timeout = setTimeout(function () {
      vid.removeEventListener("canplay", oncanplay);
      vid.removeEventListener("error", onerror);
      misses++;
      tryNext(n + 1);
    }, 4000);
    var oncanplay = function () {
      clearTimeout(timeout);
      vid.removeEventListener("canplay", oncanplay);
      vid.removeEventListener("error", onerror);
      misses = 0;
      var wasEmpty = bgList.length === 0;
      bgList.push({ type: "vid", path: "bgs/" + n + ".mp4" });
      if (wasEmpty) {
        var entry = getRandomBg();
        if (entry) applyBgEntry(entry);
      }
      tryNext(n + 1);
    };
    var onerror = function () {
      clearTimeout(timeout);
      vid.removeEventListener("canplay", oncanplay);
      vid.removeEventListener("error", onerror);
      misses++;
      tryNext(n + 1);
    };
    vid.addEventListener("canplay", oncanplay);
    vid.addEventListener("error", onerror);
    vid.src = "bgs/" + n + ".mp4";
    vid.load();
  }
  tryNext(1);
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
  "linear-gradient(135deg, #0b0b0b, #0c0c0c, #0a0f0b)",
  "linear-gradient(135deg, #0a0a0a, #0b0b0b, #0b0e0c)",
  "linear-gradient(135deg, #0b0b0b, #0c0c0c, #090d0b)",
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
  if (entry.type === "vid") {
    if (bgVideoEl) {
      bgVideoEl.pause();
      bgVideoEl.remove();
    }
    bgVideoEl = document.createElement("video");
    bgVideoEl.src = entry.path;
    bgVideoEl.muted = true;
    bgVideoEl.loop = false;
    bgVideoEl.playsInline = true;
    bgVideoEl.preload = "auto";
    var initialFilter = "brightness(0.35) blur(6px)";
    bgVideoEl.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;filter:" +
      initialFilter +
      ";";
    document.body.insertBefore(bgVideoEl, document.body.firstChild);
    bgVideoEl.addEventListener("loadedmetadata", function () {
      bgVideoEl.currentTime = 9;
      bgVideoEl.play().catch(function () {});
    });
    bgVideoEl.addEventListener("ended", function () {
      changeBackgroundRandomly();
    });
  } else {
    if (bgVideoEl) {
      bgVideoEl.pause();
      bgVideoEl.remove();
      bgVideoEl = null;
    }
    if (entry.path.indexOf("linear-gradient") === 0) {
      document.body.style.backgroundImage = entry.path;
    } else {
      document.body.style.backgroundImage = "url(" + entry.path + ")";
    }
  }
}

function changeBackgroundRandomly() {
  var entry = getRandomBg() || { type: "img", path: getFallbackBg() };
  if (!entry) return;
  var overlay = document.getElementById("timeOverlay");
  overlay.classList.remove("fade-out");
  overlay.classList.add("active");
  setTimeout(function () {
    applyBgEntry(entry);
    overlay.classList.remove("active");
    overlay.classList.add("fade-out");
  }, 1500);
}

function setBackground() {
  var now = new Date();
  var hours = now.getHours();
  var totalMinutes = hours * 60 + now.getMinutes();
  var period;
  if (totalMinutes >= 300 && totalMinutes <= 810) {
    period = "day";
  } else if (totalMinutes >= 811 && totalMinutes <= 1080) {
    period = "afternoon";
  } else {
    period = "night";
  }
  if (period !== currentPeriod) {
    var prevPeriod = currentPeriod;
    currentPeriod = period;
    var entry = getRandomBg() || { type: "img", path: getFallbackBg() };
    if (prevPeriod === null) {
      applyBgEntry(entry);
      return;
    }
    var overlay = document.getElementById("timeOverlay");
    overlay.classList.remove("fade-out");
    overlay.classList.add("active");
    setTimeout(function () {
      applyBgEntry(entry);
      overlay.classList.remove("active");
      overlay.classList.add("fade-out");
    }, 1500);
  }
}

function connectLanyard() {
  var ws = new WebSocket("wss://api.lanyard.rest/socket");
  var heartbeat;
  ws.addEventListener("message", function (e) {
    var msg = JSON.parse(e.data);
    if (msg.op === 1) {
      ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: ID } }));
      heartbeat = setInterval(function () {
        ws.send(JSON.stringify({ op: 3 }));
      }, msg.d.heartbeat_interval);
    }
    if (
      msg.op === 0 &&
      (msg.t === "INIT_STATE" || msg.t === "PRESENCE_UPDATE")
    ) {
      var d = msg.d;
      var user = d.discord_user;
      var profilePic = document.getElementById("profilePic");
      var username = document.getElementById("username");
      var status = document.getElementById("status");
      if (user.avatar) {
        profilePic.src =
          "https://cdn.discordapp.com/avatars/" +
          user.id +
          "/" +
          user.avatar +
          ".png?size=256";
      }
      username.textContent =
        user.display_name || user.global_name || user.username;
      var statusMap = {
        online: "Online",
        idle: "Idle",
        dnd: "Do Not Disturb",
        offline: "Offline",
      };
      var discordStatus = d.discord_status;
      status.textContent = statusMap[discordStatus] || "Unknown";
      var statusColors = {
        online: "#10b981",
        idle: "#f59e0b",
        dnd: "#ef4444",
        offline: "#4a4a4a",
      };
      if (statusColors[discordStatus]) {
        status.style.color = statusColors[discordStatus];
      }
      var customStatus = "";
      if (d.activities && d.activities.length > 0) {
        for (var a = 0; a < d.activities.length; a++) {
          var act = d.activities[a];
          if (act.type === 4 && act.state) {
            customStatus = act.state;
            if (act.emoji && act.emoji.name) {
              customStatus = act.emoji.name + " " + customStatus;
            }
            break;
          }
        }
      }
      document.getElementById("profileText").textContent = customStatus || "";
      document.getElementById("profileCredit").textContent =
        "- " + user.username;
      var bio = document.querySelector(".bio");
      var credit = document.querySelector(".credit");
      if (bio) bio.style.display = customStatus ? "block" : "none";
      if (credit) credit.style.display = customStatus ? "block" : "none";
    }
  });
  ws.addEventListener("close", function () {
    if (heartbeat) clearInterval(heartbeat);
    setTimeout(connectLanyard, 3000);
  });
}

const musicTracks = [
  "media/music/lucille - breakdowns.mp3",
  "media/music/jaydes - vivienne.mp3",
  "media/music/jacari - imma jerk.mp3",
  "media/music/bunii - galore galore galore.mp3",
  "media/music/bunii - REGRET.mp3",
];

var player = document.getElementById("musicPlayer");
var audioContext, analyser, dataArray, source, canvas, ctx;
var lastTrackIndex = -1;
var firstPlay = true;

var playBtn = document.getElementById("playBtn");
var prevBtn = document.getElementById("prevBtn");
var nextBtn = document.getElementById("nextBtn");
var playIconPath = document.getElementById("playIconPath");
var PLAY_PATH = "M8 5v14l11-7z";
var PAUSE_PATH = "M7 5h4v14H7zM13 5h4v14h-4z";
function setPlayIcon(isPlaying) {
  playIconPath.setAttribute("d", isPlaying ? PAUSE_PATH : PLAY_PATH);
}
var volumeSlider = document.getElementById("volumeSlider");
var volumeValue = document.getElementById("volumeValue");
var timeDisplay = document.getElementById("timeDisplay");
var progressFill = document.getElementById("progressFill");
var progressBarBg = document.getElementById("progressBarBg");

function cleanName(path) {
  try {
    path = decodeURIComponent(path);
  } catch (e) {}
  return path.replace(/^.*[\\\/]/, "").replace(".mp3", "");
}

function parseLRC(lrc) {
  if (!lrc) return [];
  var lines = [];
  var parts = lrc.split("\n");
  for (var i = 0; i < parts.length; i++) {
    var match = parts[i].match(/^\[(\d+):(\d+\.\d+)\](.*)/);
    if (match) {
      var time = parseInt(match[1], 10) * 60 + parseFloat(match[2]);
      var text = match[3].trim();
      if (text) lines.push({ time: time, line: text });
    }
  }
  return lines;
}

var lyricsSource = {
  "lucille - breakdowns":
    "[00:02.05] Ha-ha-ha-ha, what's the matter?\n[00:05.04] Oh God\n[00:06.52] I hope that I'm on the right path\n[00:08.57] I tried to tell you, you're all that I wanted\n[00:10.68] You're my one and only, we're right back\n[00:13.00] I hate to tell you to ease on me\n[00:15.14] I'll never go unless I'm with you\n[00:17.30] How could you leave me so easily?\n[00:19.58] Bruised and I'm beating 'til black and blue\n[00:22.06] Think it was a sign of the times\n[00:24.27] Break me 'til I fall outta line\n[00:26.47] I can see desire inside you\n[00:28.33] But I'm so damn tired of lies\n[00:30.40] Breakdowns\n[00:32.53] Even when you're one call away\n[00:34.70] Breakdowns\n[00:36.82] I feel like I'm still stuck in chains\n[00:39.33] All I ever wanted was a bit of love\n[00:41.44] I'll hit 150 driving when I'm drunk\n[00:43.64] Kidnapped, now your body's in the trunk\n[00:45.71] If I can't have you, no one can and that's enough\n[00:47.66] Enough of this\n[00:50.38] Voices in my brain tell me that I'm not shit\n[00:54.66] I don't think I'll ever get her back\n[00:56.69] Tear it out my brain, I'm so attached\n[00:58.87] (Tear it out my brain, I'm so attached)\n[01:00.55] Whenever you needed, I thought it was easy\n[01:02.88] Who knew I could drown in a life raft?\n[01:04.84] When I finally caught you, I told you \"I want you\"\n[01:06.92] They pointed at me, and they all laughed\n[01:09.22] Oh Lord\n[01:10.38] God\n[01:11.47] I hope that I'm on the right path\n[01:13.54] I tried to tell you, you're all that I wanted\n[01:15.56] You're my one and only, we're right back\n[01:17.96] I hate to tell you to ease on me\n[01:20.24] I'll never go unless I'm with you\n[01:22.20] How could you leave me so easily?\n[01:24.56] Bruised and I'm beating 'til black and blue\n[01:26.81] Think it was a sign of the times\n[01:29.17] Break me 'til I fall outta line\n[01:31.33] I can see desire inside you\n[01:33.48] But I'm so damn tired of lies\n[01:35.41] Breakdowns\n[01:37.64] Even when you're one call away\n[01:39.72] Breakdowns\n[01:42.01] I feel like I'm still stuck in chains\n[01:44.46] All I ever wanted was a bit of love\n[01:46.66] I'll hit 150 driving when I'm drunk\n[01:48.85] Kidnapped, now your body's in the trunk\n[01:50.91] If I can't have you, no one can and that's enough\n[01:54.77] If I can't have you, no one can\n[01:56.22] I swear that that's enough",
  "jaydes - vivienne":
    "[00:00.05] (You have no heart) Yeah\n[00:01.14] Why you toying with my fucking brain? Woah\n[00:04.29] All these other girls, are not the same, woah\n[00:06.74] All these women borin' me\n[00:09.31] They can't love you like I do\n[00:10.99] Why are you ignoring me? Yeah\n[00:12.65] (Silo killed this shit)\n[00:14.92] I might spend my racks now\n[00:16.42] Just to fill the void, yeah\n[00:18.05] Everybody's watching\n[00:19.68] Gas got me exhausted\n[00:21.24] Thought I had your heart\n[00:22.38] But I guess I really lost it (Yeah, yeah, yeah, yeah)\n[00:25.24] I be in a brand new Benz (Uh-huh, yeah)\n[00:26.74] I be high like Peter Pan (Uh-huh, yeah)\n[00:28.29] She said since I'm on her playlist (Uh-huh, yeah)\n[00:29.99] Thought she might just bring her friend (Uh-huh, yeah)\n[00:31.55] Only hear my money counter\n[00:32.94] Don't really care about your comments\n[00:34.61] Got a problem with my clique?\n[00:35.93] Then best believe that we gon' solve it\n[00:38.16] Yeah, why you toying with my fucking brain? Woah\n[00:42.15] All these other girls are not the same, woah\n[00:44.65] All these women borin' me\n[00:47.20] They can't love you like I do\n[00:48.86] Why are you ignoring me? Yeah (Oh, woah)\n[00:52.80] I might spend my racks now\n[00:54.39] Just to fill the void, yeah\n[00:55.96] Everybody's watching\n[00:57.58] Gas got me exhausted\n[00:59.17] Thought I had your heart\n[01:00.22] But I guess I really lost it (Yeah, yeah, yeah, yeah)\n[01:03.72] Yeah, why you toying with my fucking brain? Woah\n[01:07.47] All these other girls are not the same, woah\n[01:09.86] All these women borin' me\n[01:12.54] They can't love you like I do\n[01:14.16] Why are you ignoring me? Yeah\n[01:16.01] Yeah, why you toying with my fucking brain? Woah\n[01:19.37] All these other girls are not the same, woah\n[01:22.58] All these women borin' me\n[01:25.16] They can't love you like I do, why are you ignoring me? Yeah\n[01:28.55] Yeah, yeah, yeah, yeah\n[01:32.63] Woah (Woah)",
  "bunii - REGRET":
    "[00:00.00] I tried to play it cool\n[00:01.58] Don't wanna hurt yourself, you ran into a different room\n[00:04.63] Jumped to conclusions; when you landed it left you with a bruise\n[00:07.79] You probably hate yourself 'cause, bae, I really hate you too\n[00:11.01] I guess I always did, it's never really nothing new\n[00:14.04] So I'll show all my statements\n[00:15.68] I'll run up all my numbers\n[00:17.21] I'll leave you lonely, hating\n[00:18.77] They'll see my name on billboards\n[00:20.36] They'll see your name in pages\n[00:21.74] Yearbooks no one is reading, posts that no one would favorite\n[00:25.79] I can see myself in your head\n[00:29.02] And I wrote the lyrics you read\n[00:31.98] Hope the melody that's between your ears is enough to make you regret\n[00:38.43] You can see me everywhere you're going (I can see you everywhere you're going)\n[00:41.75] You can see me everywhere you're going (I can see you everywhere you're going)\n[00:44.66] You can see me everywhere you're going (I can see you everywhere you're going)\n[00:47.62] Hope you see me, oh\n[00:50.02] I tried to play it cool\n[00:51.50] Don't wanna hurt yourself, you ran into a different room\n[00:54.66] Jumped to conclusions; when you landed it left you with a bruise\n[00:57.75] You probably hate yourself 'cause, bae, I really hate you too\n[01:00.82] I guess I always did, it's never really nothing new\n[01:03.94] So I'll show all my statements\n[01:05.42] I'll run up all my numbers\n[01:06.95] I'll leave you lonely, hating\n[01:08.54] They'll see my name on billboards\n[01:10.05] They'll see your name in pages\n[01:11.78] Yearbooks no one is reading, posts that no one would favorite",
  "bunii - galore galore galore":
    "[00:00.26] Baby, i'm a bastard\n[00:01.60] You know what you are too\n[00:04.20] Baby, i don't make the rules\n[00:06.65] Don't sing your song for me no more\n[00:09.48] 'cause i can't listen to you\n[00:11.39] Cut my wrists, don't hurt no more\n[00:13.75] Just leave me bleeding on the floor\n[00:16.34] You were the one that i adored\n[00:19.05] There's lovers galore, galore, yeah\n[00:21.15] Say my name, and i'ma pay attention 'cause you\n[00:23.74] Dull my days, yeah, i can never feel it when you\n[00:26.39] Bring me pain, i see you everywhere and i just\n[00:28.94] Can't escape the nightmare to my dreams\n[00:31.82] The love we had what used to be\n[00:34.48] I toss and turn, babe i can't sleep\n[00:37.03] I bit my tongue, i broke my teeth\n[00:39.53] 'cause your loves a drug and i need\n[00:41.64] Baby, i'm a bastard\n[00:43.06] You know what you are too\n[00:45.28] Baby, i don't make the rules\n[00:47.99] Don't sing your song for me no more\n[00:50.59] 'cause i can't listen to you\n[00:52.63] Cut my wrists, don't hurt no more\n[00:55.12] Just leave me bleeding on the floor\n[00:57.59] You were the one that i adored\n[01:00.39] There's lovers galore, galore, yeah\n[01:02.51] Say my name, and i'ma pay attention 'cause you\n[01:04.90] Dull my days, yeah, i can never feel it when you\n[01:07.66] Bring me pain, i see you everywhere and i just\n[01:10.13] Can't escape the nightmare to my dreams\n[01:12.86] The nightmares, i'm drowning, it's harder to breathe\n[01:17.82] Cut out my eyes, i can barely see you leave\n[01:23.05] The nightmares, i'm drowning, it's harder to breathe",
  "jacari - imma jerk":
    "[00:00.26] how imma jerk, but you still textin' me?\n[00:02.44] you say you like the way i sound, you wanna have sex wit me\n[00:04.87] compare yo nigga: imma lion, he a centipede\n[00:07.21] i would shoot yo nigga in the face, but you not lettin' me\n[00:10.49] like wtf goin' on witcha?\n[00:12.27] you ain't text me inna minute, smth wrong witcha?\n[00:14.58] i ain't speak to you in days, who else you talkin to?\n[00:17.04] bae why you tryna make me wait, like can you see that i've been:\n[00:19.22] waiting long?\n[00:21.36] why you taking off?\n[00:23.39] you don't wanna say you're wrong\n[00:26.09] i feel fine when im with you, oh girl, but now you're gone\n[00:29.57] i guess it's fine though!\n[00:30.90] cuz im delusional, i think that you're still mine though!\n[00:33.05] you be in my head, you in my dreams, you on my mind though!\n[00:35.56] we can never love thats what it seems cuz when we talk you always say that imma jerk\n[00:38.51] (jerk! jerk! jerk! jerk!\n[00:40.70] jerk! jerk! jerk! jerk!\n[00:43.17] you're a jerk! jerk! jerk! jerk!\n[00:45.56] jerk! jerk! jerk! jerk!) (x2)\n[00:57.66] how imma jerk, but you still textin' me?\n[01:00.05] you say you like the way i sound, you wanna have sex wit me\n[01:02.43] compare yo nigga: imma lion, he a centipede\n[01:04.81] i would shoot yo nigga in the face, but you not lettin' me\n[01:07.27] like wtf goin' on witcha?\n[01:09.82] you ain't text me inna minute, smth wrong witcha?\n[01:12.29] i ain't speak to you in days, who else you talkin to?\n[01:14.63] bae why you tryna make me wait, like can you see that i've been:\n[01:17.01] waiting long?\n[01:19.15] why you taking off?\n[01:21.01] you don't wanna say you're wrong\n[01:23.51] i feel fine when im with you, oh girl, but now you're gone\n[01:27.07] i guess it's fine though!\n[01:28.41] cuz im delusional, i think that you're still mine though!\n[01:30.60] you be in my head, you in my dreams, you on my mind though!\n[01:32.99] we can never love thats what it seems cuz when we talk you always say that imma jerk\n[01:37.47] always say imma jerk\n[01:39.86] and i know it won't work\n[01:45.60] (jerk! jerk! jerk! jerk!\n[01:47.94] jerk! jerk! jerk! jerk!\n[01:50.33] you're a jerk! jerk! jerk! jerk!\n[01:52.80] jerk! jerk! jerk! jerk!) (x2)",
};

var plainLyrics = {};

var lyricsData = {};
(function initLyrics() {
  for (var key in lyricsSource) {
    if (lyricsSource.hasOwnProperty(key)) {
      lyricsData[key] = parseLRC(lyricsSource[key]);
    }
  }
})();

var lyricTrack = document.getElementById("lyricTrack");
var lyricsContainer = document.getElementById("lyricsContainer");
var currentLyricIndex = -1;

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

  for (var i = 0; i < lines.length; i++) {
    var el = document.createElement("span");
    el.className = "lyric-line";
    el.textContent = lines[i].line;
    lyricTrack.appendChild(el);
  }
}

function updateLyrics() {
  var name = cleanName(player.src);
  var lines = lyricsData[name];

  if (plainLyrics[name] && (!lines || lines.length === 0)) {
    if (lyricTrack) {
      lyricTrack.textContent = plainLyrics[name];
      lyricTrack.style.whiteSpace = "pre-line";
      lyricTrack.style.display = "";
    }
    return;
  }

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

  var current = player.currentTime;
  var idx = -1;
  for (var i = 0; i < lines.length; i++) {
    if (current >= lines[i].time) {
      idx = i;
    }
  }

  if (idx === currentLyricIndex) return;
  currentLyricIndex = idx;

  var els = lyricTrack.children;
  for (var j = 0; j < els.length; j++) {
    els[j].className = "lyric-line";
  }

  if (idx >= 0 && idx < lines.length) {
    els[idx].classList.add("current");

    var container = lyricTrack.parentElement;
    var containerH = container.clientHeight;
    var elTop = els[idx].offsetTop;
    var elH = els[idx].offsetHeight;
    var target = -(elTop - (containerH - elH) / 2);
    var max = 0;
    var min = -(lyricTrack.scrollHeight - containerH);
    if (target > max) target = max;
    if (target < min) target = min;
    lyricTrack.style.transform = "translateY(" + target + "px)";
  } else {
    lyricTrack.style.transform = "translateY(0)";
  }
}

function resizeCanvas() {
  canvas = canvas || document.getElementById("visualizerCanvas");
  if (!canvas) return;
  var wrap = canvas.parentElement;
  if (!wrap) return;
  var w = wrap.clientWidth;
  var h = canvas.clientHeight || 36;
  if (h < 10) h = 36;
  var dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx = ctx || canvas.getContext("2d");
  if (dpr !== 1 && ctx) {
    ctx.scale(dpr, dpr);
  }
}

function initAudioContext() {
  if (!audioContext) {
    resizeCanvas();
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    source = audioContext.createMediaElementSource(player);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    visualize();
    window.addEventListener("resize", resizeCanvas);
  }
}

function visualize() {
  requestAnimationFrame(visualize);
  if (!analyser || !ctx || !canvas) return;
  analyser.getByteFrequencyData(dataArray);
  var dpr = window.devicePixelRatio || 1;
  var w = canvas.width / dpr;
  var h = canvas.height / dpr;
  if (h < 10) h = 36;
  ctx.clearRect(0, 0, w, h);

  var barCount = 32;
  var gap = 1.5;
  var totalGap = gap * (barCount - 1);
  var barW = (w - totalGap) / barCount;
  var maxH = h * 0.8;

  for (var i = 0; i < barCount; i++) {
    var relIndex = Math.floor((i * dataArray.length) / barCount);
    var val = dataArray[relIndex] || 0;
    var barH = (val / 255) * maxH;
    if (barH < 1) barH = 0;
    var x = i * (barW + gap);
    var y = h - barH;
    var t = i / barCount;
    var g = Math.round(185 - t * 40);
    ctx.fillStyle = "rgba(16, " + g + ", 129, " + (0.3 + t * 0.4) + ")";
    ctx.fillRect(x, y, barW, barH);
  }
}

function playNext() {
  if (musicTracks.length === 0) {
    document.getElementById("nowPlaying").textContent = "no tracks loaded";
    return;
  }
  var idx;
  if (firstPlay) {
    firstPlay = false;
    idx = 0;
  } else {
    idx = (lastTrackIndex + 1) % musicTracks.length;
  }
  lastTrackIndex = idx;
  var track = musicTracks[idx];
  player.src = track;
  player.volume = volumeSlider.value / 500;
  var startPlay = function () {
    initAudioContext();
    player
      .play()
      .then(function () {
        document.getElementById("nowPlaying").textContent = cleanName(track);
      })
      .catch(function () {
        document.addEventListener("click", startPlay, { once: true });
      });
  };
  startPlay();
}

player.addEventListener("ended", playNext);
player.addEventListener("play", function () {
  setPlayIcon(true);
});
player.addEventListener("pause", function () {
  setPlayIcon(false);
});

playBtn.addEventListener("click", function () {
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

prevBtn.addEventListener("click", function () {
  if (musicTracks.length === 0) return;
  var idx = (lastTrackIndex - 1 + musicTracks.length) % musicTracks.length;
  lastTrackIndex = idx;
  var track = musicTracks[idx];
  player.src = track;
  player.volume = volumeSlider.value / 500;
  var startPlay = function () {
    initAudioContext();
    player
      .play()
      .then(function () {
        document.getElementById("nowPlaying").textContent = cleanName(track);
      })
      .catch(function () {});
  };
  startPlay();
});

volumeSlider.addEventListener("input", function (e) {
  var value = e.target.value;
  player.volume = value / 500;
  volumeValue.textContent = value;
});

player.addEventListener("timeupdate", function () {
  var current = player.currentTime;
  var duration = player.duration;
  if (duration > 0) {
    var minutes = Math.floor(current / 60);
    var seconds = Math.floor(current % 60);
    timeDisplay.textContent =
      minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
    progressFill.style.width = (current / duration) * 100 + "%";
  }
  updateLyrics();
});

progressBarBg.addEventListener("click", function (e) {
  if (player.duration > 0) {
    var rect = progressBarBg.getBoundingClientRect();
    player.currentTime =
      ((e.clientX - rect.left) / rect.width) * player.duration;
  }
});

function initAgeDisplay() {
  var el = document.getElementById("ageDisplay");
  if (!el) return;
  var birthDate = new Date("2010-08-06T00:00:00");
  function update() {
    var now = new Date();
    var diff = now - birthDate;
    var years = diff / (365.25 * 24 * 60 * 60 * 1000);
    el.textContent = Math.floor(years);
    el.setAttribute("data-tooltip", years.toFixed(8));
  }
  update();
  setInterval(update, 100);
}

function initMainContent() {
  preloadBackgrounds();
  setBackground();
  setInterval(setBackground, 60000);
  initSnow();
  drawSnow();
  connectLanyard();
  initAgeDisplay();
  volumeValue.textContent = "25";
  volumeSlider.value = "25";
}

var input = "";
var thing = "stupidcat";

document.addEventListener("keydown", function (e) {
  input += e.key.toLowerCase();
  if (input.length > thing.length) {
    input = input.slice(-thing.length);
  }
  if (input === thing) {
    doesThing();
    input = "";
  }
});

function doesThing() {
  if (window.doesThingTriggered) return;
  window.doesThingTriggered = true;
  window.stopSnowDraw = true;

  var speedUpSnow = setInterval(function () {
    document.querySelectorAll(".snowflake").forEach(function (snow) {
      var t = parseFloat(snow.style.top);
      if (!isNaN(t)) {
        snow.style.top = t + 25 + "px";
      }
    });
  }, 16);

  var fadeInterval = setInterval(function () {
    if (player.volume > 0.01) {
      player.volume = Math.max(0, player.volume - 0.02);
    } else {
      player.pause();
      clearInterval(fadeInterval);
    }
  }, 50);

  var blackOverlay = document.createElement("div");
  blackOverlay.style.cssText =
    "position:fixed;inset:0;background:#000;z-index:9998;opacity:0;transition:opacity 1s ease;pointer-events:none;";
  document.body.appendChild(blackOverlay);
  setTimeout(function () {
    blackOverlay.style.opacity = "1";
  }, 50);

  var els = document.querySelectorAll(
    ".name, .tagline, .profile, .links, .player",
  );
  els.forEach(function (el) {
    el.style.transition = "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)";
    el.style.opacity = "0";
    el.style.transform = "translateY(-10px)";
  });

  setTimeout(function () {
    var cd = document.createElement("div");
    cd.style.cssText =
      "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:Inter,sans-serif;font-weight:700;font-size:0;color:#10b981;opacity:0;transition:all 1s cubic-bezier(0.2,0.9,0.4,1.1);z-index:10000;text-align:center;pointer-events:none;";
    document.body.appendChild(cd);
    setTimeout(function () {
      cd.style.fontSize = "clamp(3rem, 12vw, 7rem)";
      cd.style.opacity = "1";
    }, 100);

    var count = 1.0;
    var update = setInterval(function () {
      if (count <= 0.01) {
        clearInterval(update);
        cd.style.transition = "all 0.5s cubic-bezier(0.4, 0, 1, 1)";
        cd.style.transform = "translate(-50%, -50%) scale(0)";
        cd.style.opacity = "0";
        setTimeout(function () {
          cd.remove();
          var img = document.createElement("img");
          img.src = "cats/funny.png";
          img.style.cssText =
            "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:90%;max-width:800px;z-index:10002;border-radius:10px;box-shadow:0 0 80px rgba(16,185,129,0.2);pointer-events:none;";
          document.body.appendChild(img);
          new Audio("cats/meow.mp3").play();
          clearInterval(speedUpSnow);
          setTimeout(function () {
            document.querySelectorAll(".snowflake").forEach(function (s) {
              s.remove();
            });
          }, 500);
        }, 1500);
      } else {
        count -= 0.05;
        cd.textContent = count <= 0 ? "0.00" : count.toFixed(2);
      }
    }, 50);
  }, 1000);
}

var gbOffset = 0;
var gbTotal = 0;
var gbAllEntries = [];
var GB_PAGE = 8;
var GB_MAX = 500;
var WORKER_URL = "https://snowy-dust-17c3.asdwaawdawd81.workers.dev/";
var TURNSTILE_SITE_KEY = "0x4AAAAAADg6LkYattvc_Fqe";
var turnstileWidgetId = null;
var authorToken = null;
var gbKeyBuffer = "";
var scrollHintShown = false;

function escapeHtml(str) {
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function formatTimestamp(ts) {
  if (!ts) return "";
  var d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderGuestbookEntries(entries) {
  var container = document.getElementById("guestbookEntries");
  if (!container) return;
  if (!entries.length) {
    container.innerHTML =
      '<div class="gb-empty">no entries yet — be the first!</div>';
    updateLoadMore();
    return;
  }
  var liked = JSON.parse(localStorage.getItem("gb_liked") || "{}");
  container.innerHTML = entries
    .map(function (entry, i) {
      var userLiked = liked[entry.id];
      return (
        '<div class="gb-entry">' +
        '<div class="gb-entry-title">' +
        escapeHtml(entry.name || "anonymous") +
        "</div>" +
        '<div class="gb-entry-body">' +
        escapeHtml(entry.message || "") +
        "</div>" +
        '<div class="gb-entry-footer">' +
        '<span class="gb-entry-meta">' +
        formatTimestamp(entry.created_at) +
        "</span>" +
        '<span class="gb-entry-actions">' +
        '<button class="gb-like-btn ' +
        (userLiked ? "liked" : "") +
        '" data-id="' +
        entry.id +
        '">' +
        (userLiked ? "\u2665" : "\u2661") +
        "</button>" +
        '<span class="gb-like-count">' +
        (entry.likes || 0) +
        "</span>" +
        (entry.liked_by_author
          ? '<span class="author-like-badge">\u2665 liked by author</span>'
          : "") +
        "</span></div></div>"
      );
    })
    .join("");
  updateLoadMore();
}

function updateLoadMore() {
  var footer = document.getElementById("gbFooter");
  if (!footer) return;
  var hasMore = gbOffset + GB_PAGE < Math.min(gbTotal, GB_MAX);
  var btn = document.getElementById("gbLoadMore");
  if (hasMore) {
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "gbLoadMore";
      btn.className = "guestbook-load-more";
      btn.textContent = "load more";
      btn.addEventListener("click", loadMoreGuestbookEntries);
      footer.appendChild(btn);
    }
  } else if (btn) {
    btn.remove();
  }
}

async function fetchGuestbookEntries() {
  gbOffset = 0;
  gbAllEntries = [];
  var status = document.getElementById("guestbookStatus");
  if (status) status.textContent = "loading...";
  var container = document.getElementById("guestbookEntries");
  if (container)
    container.innerHTML =
      '<div class="gb-loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
  try {
    var res = await fetch(WORKER_URL + "?limit=" + GB_PAGE + "&offset=0");
    if (!res.ok) throw new Error("failed");
    var data = await res.json();
    gbAllEntries = data.entries || [];
    gbTotal = data.total || 0;
    renderGuestbookEntries(gbAllEntries);
    if (status)
      status.textContent =
        Math.min(gbTotal, GB_MAX) +
        " message" +
        (Math.min(gbTotal, GB_MAX) === 1 ? "" : "s");
  } catch {
    if (status) status.textContent = "could not load";
    if (container)
      container.innerHTML =
        '<div class="gb-empty">guestbook is unavailable right now.</div>';
  }
}

async function loadMoreGuestbookEntries() {
  var newOffset = gbOffset + GB_PAGE;
  if (newOffset >= GB_MAX) return;
  var loadMoreBtn = document.getElementById("gbLoadMore");
  if (loadMoreBtn) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "loading...";
  }
  try {
    var res = await fetch(
      WORKER_URL + "?limit=" + GB_PAGE + "&offset=" + newOffset,
    );
    if (!res.ok) throw new Error("failed");
    var data = await res.json();
    var more = data.entries || [];
    gbAllEntries = gbAllEntries.concat(more);
    gbOffset = newOffset;
    var container = document.getElementById("guestbookEntries");
    var liked = JSON.parse(localStorage.getItem("gb_liked") || "{}");
    var startIdx = gbAllEntries.length - more.length;
    var html = more
      .map(function (entry, i) {
        var userLiked = liked[entry.id];
        return (
          '<div class="gb-entry">' +
          '<div class="gb-entry-title">' +
          escapeHtml(entry.name || "anonymous") +
          "</div>" +
          '<div class="gb-entry-body">' +
          escapeHtml(entry.message || "") +
          "</div>" +
          '<div class="gb-entry-footer">' +
          '<span class="gb-entry-meta">' +
          formatTimestamp(entry.created_at) +
          "</span>" +
          '<span class="gb-entry-actions">' +
          '<button class="gb-like-btn ' +
          (userLiked ? "liked" : "") +
          '" data-id="' +
          entry.id +
          '">' +
          (userLiked ? "\u2665" : "\u2661") +
          "</button>" +
          '<span class="gb-like-count">' +
          (entry.likes || 0) +
          "</span>" +
          (entry.liked_by_author
            ? '<span class="author-like-badge">\u2665 liked by author</span>'
            : "") +
          "</span></div></div>"
        );
      })
      .join("");
    container.insertAdjacentHTML("beforeend", html);
    updateLoadMore();
    if (!scrollHintShown && container.scrollHeight > container.clientHeight) {
      scrollHintShown = true;
      var hint = document.createElement("div");
      hint.className = "gb-scroll-hint";
      hint.textContent = "\u2193 scroll to see new entries";
      var footer = document.getElementById("gbFooter");
      var existingBtn = document.getElementById("gbLoadMore");
      if (existingBtn) {
        footer.insertBefore(hint, existingBtn);
      } else {
        footer.appendChild(hint);
      }
      setTimeout(function () {
        hint.classList.add("gb-scroll-hint--fade");
      }, 2500);
      setTimeout(function () {
        hint.remove();
      }, 3100);
    }
    var doneBtn = document.getElementById("gbLoadMore");
    if (doneBtn) {
      doneBtn.disabled = false;
      doneBtn.textContent = "load more";
    }
    var status = document.getElementById("guestbookStatus");
    if (status)
      status.textContent =
        Math.min(gbTotal, GB_MAX) +
        " message" +
        (Math.min(gbTotal, GB_MAX) === 1 ? "" : "s");
  } catch {
    var status = document.getElementById("guestbookStatus");
    if (status) status.textContent = "could not load more";
    var errBtn = document.getElementById("gbLoadMore");
    if (errBtn) {
      errBtn.disabled = false;
      errBtn.textContent = "load more";
    }
  }
}

function toggleLike(entryId) {
  var liked = JSON.parse(localStorage.getItem("gb_liked") || "{}");
  var isLiked = liked[entryId];
  var body = { action: isLiked ? "unlike" : "like", id: entryId };
  if (authorToken) body.token = authorToken;
  fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then(function (res) {
      if (!res.ok) throw new Error("failed");
      return res.json();
    })
    .then(function (result) {
      if (!result.ok) return;
      if (isLiked) delete liked[entryId];
      else liked[entryId] = true;
      localStorage.setItem("gb_liked", JSON.stringify(liked));
      for (var i = 0; i < gbAllEntries.length; i++) {
        if (String(gbAllEntries[i].id) === entryId) {
          gbAllEntries[i].likes = result.likes;
          if (result.liked_by_author) gbAllEntries[i].liked_by_author = true;
          else if (authorToken) gbAllEntries[i].liked_by_author = false;
          break;
        }
      }
      renderGuestbookEntries(gbAllEntries);
    })
    .catch(function () {});
}

function authenticateAuthor() {
  if (authorToken) {
    authorToken = null;
    sessionStorage.removeItem("author_token");
    return;
  }
  var password = prompt("enter author password:");
  if (!password) return;
  fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "auth", password: password }),
  })
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      if (data.ok && data.token) {
        authorToken = data.token;
        sessionStorage.setItem("author_token", data.token);
      } else {
        alert("incorrect password");
      }
    })
    .catch(function () {
      alert("authentication failed");
    });
}

function initGuestbook() {
  var overlay = document.getElementById("guestbookOverlay");
  document
    .getElementById("guestbookBtn")
    .addEventListener("click", function () {
      overlay.classList.remove("hidden");
      if (!overlay.dataset.loaded) {
        overlay.dataset.loaded = "true";
        fetchGuestbookEntries();
        var tw = document.getElementById("turnstileWidget");
        if (tw && typeof turnstile !== "undefined") {
          turnstileWidgetId = turnstile.render(tw, {
            sitekey: TURNSTILE_SITE_KEY,
            theme: "dark",
          });
        }
      }
    });
  document.getElementById("gbClose").addEventListener("click", function () {
    overlay.classList.add("hidden");
  });
  overlay.addEventListener("click", function (e) {
    if (e.target === this) this.classList.add("hidden");
  });
  var entriesContainer = document.getElementById("guestbookEntries");
  if (entriesContainer)
    entriesContainer.addEventListener("click", function (e) {
      var btn = e.target.closest(".gb-like-btn");
      if (btn) {
        btn.classList.add("like-pop");
        setTimeout(function () {
          btn.classList.remove("like-pop");
        }, 400);
        toggleLike(btn.dataset.id);
      }
    });
  document.addEventListener("keydown", function (e) {
    if (e.key.length === 1) {
      gbKeyBuffer += e.key.toLowerCase();
      if (gbKeyBuffer.length > 9) gbKeyBuffer = gbKeyBuffer.slice(-9);
      if (gbKeyBuffer === "iamauthor") {
        gbKeyBuffer = "";
        authenticateAuthor();
      }
    }
  });
  var form = document.getElementById("guestbookForm");
  if (!form) return;
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var nameInput = document.getElementById("guestName");
    var messageInput = document.getElementById("guestMessage");
    var name = (nameInput ? nameInput.value : "").trim() || "anonymous";
    var message = (messageInput ? messageInput.value : "").trim();
    var status = document.getElementById("guestbookStatus");
    if (!message) {
      if (status) status.textContent = "type a message";
      return;
    }
    var token = turnstileWidgetId
      ? turnstile.getResponse(turnstileWidgetId)
      : "";
    if (!token) {
      if (status) status.textContent = "complete the captcha";
      return;
    }
    if (status) status.textContent = "posting...";
    try {
      var res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          message: message,
          turnstileToken: token,
        }),
      });
      if (!res.ok) {
        var errMsg = "could not post, try again later.";
        if (res.status === 403) {
          try {
            var errBody = await res.json();
            if (errBody.error === "captcha verification failed")
              errMsg = "captcha failed — turn off your vpn or try again later";
          } catch {}
        }
        if (status) status.textContent = errMsg;
        return;
      }
      if (status) status.textContent = "posted!";
      if (nameInput) nameInput.value = "";
      if (messageInput) messageInput.value = "";
      fetchGuestbookEntries();
    } catch {
      if (status) status.textContent = "could not post, try again later.";
    }
  });
}

document.addEventListener("contextmenu", function (e) {
  e.preventDefault();
});
document.addEventListener("mousedown", function (e) {
  if (e.button === 1) e.preventDefault();
});
document.addEventListener("dblclick", function (e) {
  e.preventDefault();
});

window.addEventListener("pageshow", function () {
  document.getElementById("player").classList.remove("hidden");
  if (audioContext && audioContext.state === "suspended") audioContext.resume();
});

document.addEventListener("visibilitychange", function () {
  if (!document.hidden && audioContext && audioContext.state === "suspended")
    audioContext.resume();
});

window.addEventListener("load", function () {
  initOverlay();
  initGuestbook();
});
