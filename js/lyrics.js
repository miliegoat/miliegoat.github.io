import {
  currentSpotifyData,
  currentLyrics,
  setCurrentLyrics,
} from "./state.js";

function parseLrc(lrc) {
  return lrc
    .split("\n")
    .map((line) => {
      var m = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
      if (!m) return null;
      return {
        ms: (parseInt(m[1], 10) * 60 + parseFloat(m[2])) * 1000,
        text: m[3].trim(),
      };
    })
    .filter(function (l) {
      return l && l.text;
    });
}

function renderLyricsInPanel() {
  var lyricsEl = document.getElementById("lwLyrics");
  if (!lyricsEl) return;

  if (currentLyrics.length > 0) {
    lyricsEl.innerHTML = currentLyrics
      .map(function (l, i) {
        return (
          '<div class="lw-lyric-line" id="wlyric-' +
          i +
          '">' +
          l.text +
          "</div>"
        );
      })
      .join("");
    lyricsEl.classList.remove("is-plain");
  } else {
    lyricsEl.innerHTML = document.getElementById("lyricsContent").innerHTML;
    lyricsEl.classList.add("is-plain");
  }
}

export function highlightLyric(elapsedMs) {
  var active = 0;
  for (var i = 0; i < currentLyrics.length; i++) {
    if (elapsedMs >= currentLyrics[i].ms) active = i;
  }
  var lyricsEl = document.getElementById("lwLyrics");
  if (!lyricsEl) return;

  var lines = lyricsEl.querySelectorAll(".lw-lyric-line");
  lines.forEach(function (el, idx) {
    el.classList.toggle("lw-lyric-active", idx === active);
    el.classList.toggle("lw-lyric-past", idx < active);
  });

  var activeEl = document.getElementById("wlyric-" + active);
  if (activeEl) {
    var target =
      activeEl.offsetTop -
      lyricsEl.clientHeight / 2 +
      activeEl.clientHeight / 2;
    lyricsEl.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }
}

export function openLyricsPanel() {
  var panel = document.getElementById("lyricsPanel");
  var main = document.querySelector(".main");
  var bottom = document.getElementById("bottomSection");

  if (panel) {
    panel.removeAttribute("style");
    updateLyricsPanel();
    return;
  }

  panel = document.createElement("div");
  panel.id = "lyricsPanel";
  panel.className = "lyrics-side-panel";
  panel.style.cssText =
    "opacity:0; transform:translateX(20px) scale(0.98); transition:none;";
  panel.innerHTML =
    "" +
    '<div class="lw-titlebar">' +
    '<div class="lw-title-info">' +
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="#1db954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>' +
    '<span id="lwSong">' +
    (currentSpotifyData ? currentSpotifyData.song : "lyrics") +
    "</span>" +
    "</div>" +
    '<div class="lw-controls"></div>' +
    "</div>" +
    '<div class="lw-body">' +
    '<div class="lw-lyrics" id="lwLyrics">' +
    '<div class="lyrics-loading">loading lyrics...</div>' +
    "</div></div>";

  if (bottom) main.insertBefore(panel, bottom);
  else main.appendChild(panel);
  panel.getBoundingClientRect();

  panel.style.transition =
    "opacity 480ms cubic-bezier(0.16, 1, 0.3, 1), transform 480ms cubic-bezier(0.34, 1.2, 0.64, 1)";
  panel.style.opacity = "1";
  panel.style.transform = "translateX(0) scale(1)";

  updateLyricsPanel();

  if (currentSpotifyData && currentLyrics.length) {
    setTimeout(function () {
      highlightLyric(Date.now() - currentSpotifyData.timestamps.start);
    }, 150);
  }
}

export function closeLyricsPanel() {
  var panel = document.getElementById("lyricsPanel");
  if (!panel) return;
  panel.style.transition =
    "opacity 380ms cubic-bezier(0.4, 0, 1, 1), transform 380ms cubic-bezier(0.4, 0, 0.2, 1)";
  panel.style.opacity = "0";
  panel.style.transform = "translateX(20px) scale(0.98)";
  setTimeout(function () {
    panel.remove();
  }, 390);
}

function updateLyricsPanel() {
  var songEl = document.getElementById("lwSong");
  var lyricsEl = document.getElementById("lwLyrics");
  if (!songEl || !lyricsEl) return;

  songEl.textContent = currentSpotifyData ? currentSpotifyData.song : "lyrics";
  renderLyricsInPanel();
}

export function fetchLyrics(spotify) {
  var content = document.getElementById("lyricsContent");
  try {
    var artist = spotify.artist.split(";")[0].trim();
    var duration = Math.round(
      (spotify.timestamps.end - spotify.timestamps.start) / 1000,
    );
    var url =
      "https://lrclib.net/api/get?artist_name=" +
      encodeURIComponent(artist) +
      "&track_name=" +
      encodeURIComponent(spotify.song) +
      "&duration=" +
      duration;
    fetch(url)
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data.syncedLyrics) {
          setCurrentLyrics(parseLrc(data.syncedLyrics));
          renderLyricsInPanel();
        } else if (data.plainLyrics) {
          content.innerHTML =
            '<div class="lyrics-plain">' +
            data.plainLyrics.replace(/\n/g, "<br>") +
            "</div>";
          setCurrentLyrics([]);
        } else {
          content.innerHTML =
            '<div class="lyrics-loading">no lyrics found</div>';
          setCurrentLyrics([]);
        }
        updateLyricsPanel();
      })
      .catch(function () {
        content.innerHTML =
          '<div class="lyrics-loading">couldn\'t load lyrics</div>';
        setCurrentLyrics([]);
      });
  } catch {
    content.innerHTML =
      '<div class="lyrics-loading">couldn\'t load lyrics</div>';
    setCurrentLyrics([]);
  }
}

export function toggleLyrics() {
  var lyricsOpen =
    !document.getElementById("lyricsPanel") ||
    document.getElementById("lyricsPanel").style.display === "none";
  if (lyricsOpen) {
    if (currentSpotifyData && currentLyrics.length === 0) {
      document.getElementById("lyricsContent").innerHTML =
        '<div class="lyrics-loading">loading lyrics...</div>';
      fetchLyrics(currentSpotifyData);
    }
    openLyricsPanel();
  } else {
    closeLyricsPanel();
  }
}
