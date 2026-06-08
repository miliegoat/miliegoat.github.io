import { YT_API_KEY } from "./constants.js";
import { currentSpotifyData } from "./state.js";
import {
  setYtPlayer,
  setYtReady,
  setYtPendingVideo,
  setYtCurrentVideoId,
  setYtUnlocked,
  ytSearchCache,
  ytPlayer,
  ytReady,
  ytPendingVideo,
  ytCurrentVideoId,
  ytUnlocked,
} from "./state.js";

function loadYouTubeAPI() {
  if (document.getElementById("yt-api-script")) return;
  var tag = document.createElement("script");
  tag.id = "yt-api-script";
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = function () {
  setYtReady(true);
  if (ytPendingVideo && ytUnlocked) {
    var videoInfo = ytPendingVideo;
    setYtPendingVideo(null);
    createYTPlayer(videoInfo.videoId, videoInfo.seekSec);
  }
};

function createYTPlayer(videoId, seekSec) {
  if (!ytReady) {
    setYtPendingVideo({ videoId, seekSec });
    return;
  }

  var container = document.getElementById("yt-player-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "yt-player-container";
    document.body.appendChild(container);
  }

  container.style.cssText =
    "position:fixed;bottom:0;right:0;width:320px;height:180px;z-index:-1;opacity:0.01;pointer-events:none;";

  if (ytPlayer) {
    try {
      ytPlayer.destroy();
    } catch (e) {}
    setYtPlayer(null);
  }

  var div = document.createElement("div");
  div.id = "yt-iframe";
  container.innerHTML = "";
  container.appendChild(div);

  setYtCurrentVideoId(videoId);

  var player = new YT.Player("yt-iframe", {
    height: "180",
    width: "320",
    videoId: videoId,
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      rel: 0,
      start: Math.max(0, Math.floor(seekSec)),
    },
    events: {
      onReady: function (e) {
        e.target.setVolume(70);
        e.target.seekTo(seekSec, true);
        e.target.playVideo();
      },
      onStateChange: function (e) {
        if (e.data === YT.PlayerState.PLAYING) {
          updatePlayAlongBtn("playing");
          container.style.cssText =
            "position:fixed;width:1px;height:1px;top:-9999px;left:-9999px;pointer-events:none;opacity:0;";
        }
        if (e.data === YT.PlayerState.PAUSED) updatePlayAlongBtn("paused");
      },
      onError: function () {
        updatePlayAlongBtn("error");
      },
    },
  });
  setYtPlayer(player);
}

export function destroyYTPlayer() {
  if (ytPlayer) {
    try {
      ytPlayer.destroy();
    } catch (e) {}
    setYtPlayer(null);
  }
  setYtCurrentVideoId(null);
  setYtPendingVideo(null);
  var container = document.getElementById("yt-player-container");
  if (container) container.remove();
  updatePlayAlongBtn("idle");
}

function updatePlayAlongBtn(state) {
  var btn = document.getElementById("playAlongBtn");
  if (!btn) return;

  var text, color, borderColor;
  switch (state) {
    case "playing":
      text = "\u266B playing";
      color = "#1db954";
      borderColor = "rgba(29,185,84,0.4)";
      break;
    case "loading":
      text = "finding song\u2026";
      color = "#777";
      break;
    case "paused":
      text = "\u25B6 play along";
      color = "#777";
      break;
    case "error":
      text = "\u2715 not found";
      color = "#f87171";
      break;
    default:
      text = "\u25B6 play along";
      color = "#777";
  }

  btn.textContent = text;
  btn.style.color = color;
  btn.style.borderColor = borderColor || "";
  btn.dataset.state = state;
}

window.togglePlayAlong = function () {
  var btn = document.getElementById("playAlongBtn");
  if (!btn) return;
  var state = btn.dataset.state || "idle";

  if (state === "playing" && ytPlayer) {
    ytPlayer.pauseVideo();
    return;
  }
  if (state === "paused" && ytPlayer) {
    ytPlayer.playVideo();
    updatePlayAlongBtn("playing");
    return;
  }

  setYtUnlocked(true);
  updatePlayAlongBtn("loading");

  if (ytPendingVideo) {
    var videoInfo = ytPendingVideo;
    setYtPendingVideo(null);
    loadYouTubeAPI();
    createYTPlayer(videoInfo.videoId, videoInfo.seekSec);
  } else if (currentSpotifyData) {
    searchYouTube(currentSpotifyData).then(function (videoId) {
      if (!videoId) {
        updatePlayAlongBtn("error");
        return;
      }
      var seekSec = currentSpotifyData.timestamps
        ? (Date.now() - currentSpotifyData.timestamps.start) / 1000 + 1.5
        : 0;
      loadYouTubeAPI();
      createYTPlayer(videoId, seekSec);
    });
  }
};

async function searchYouTube(spotify) {
  var key = "" + spotify.track_id;
  if (ytSearchCache.has(key)) return ytSearchCache.get(key);

  var artist = spotify.artist.split(";")[0].trim();
  var queries = [
    artist + " - " + spotify.song + " official audio",
    artist + " " + spotify.song,
    spotify.song + " " + artist,
  ];

  for (var i = 0; i < queries.length; i++) {
    var query = queries[i];
    try {
      var url =
        "https://www.googleapis.com/youtube/v3/search?part=snippet&q=" +
        encodeURIComponent(query) +
        "&type=video&maxResults=1&key=" +
        YT_API_KEY;
      var res = await fetch(url, {
        signal: AbortSignal.timeout(6000),
        headers: { Referer: location.origin },
      });
      var data = await res.json();
      if (!res.ok) continue;
      var videoId =
        data.items && data.items[0] && data.items[0].id
          ? data.items[0].id.videoId
          : null;
      if (videoId) {
        ytSearchCache.set(key, videoId);
        return videoId;
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

export function searchAndPlayYouTube(spotify) {
  loadYouTubeAPI();
  updatePlayAlongBtn("loading");
  searchYouTube(spotify).then(function (videoId) {
    if (!videoId) {
      updatePlayAlongBtn("error");
      return;
    }
    var seekSec = spotify.timestamps
      ? (Date.now() - spotify.timestamps.start) / 1000 + 1
      : 0;
    if (ytUnlocked) {
      createYTPlayer(videoId, seekSec);
    } else {
      setYtPendingVideo({ videoId, seekSec });
      updatePlayAlongBtn("idle");
    }
  });
}
