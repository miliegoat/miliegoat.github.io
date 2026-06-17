import { WORKER_URL, GB_PAGE, GB_MAX, TURNSTILE_SITE_KEY } from "./constants.js";
import { formatTimestamp, escapeHtml } from "./utils.js";
import { authorToken, setAuthorToken } from "./state.js";

let gbOffset = 0;
let gbTotal = 0;
let gbAllEntries = [];

let keyBuffer = "";

function renderGuestbookEntries(entries) {
  const container = document.getElementById("guestbookEntries");
  if (!container) return;

  if (!entries.length) {
    container.innerHTML =
      '<div class="guestbook-empty">no entries yet — be the first!</div>';
    updateLoadMore();
    return;
  }

  const liked = JSON.parse(localStorage.getItem("gb_liked") || "{}");

  container.innerHTML = entries
    .map(function (entry, i) {
      const userLiked = liked[entry.id];
      const likeIcon = userLiked ? "♥" : "♡";
      const authorBadge = entry.liked_by_author
        ? '<span class="author-like-badge">♥ liked by author</span>'
        : "";
      const animDelay = (i * 0.06).toFixed(2);
      return (
        '<div class="guestbook-entry gb-entry" data-id="' +
        entry.id +
        '" style="animation-delay:' +
        animDelay +
        's">' +
        '<div class="guestbook-entry-title">' +
        escapeHtml(entry.name || "anonymous") +
        "</div>" +
        '<div class="guestbook-entry-body">' +
        escapeHtml(entry.message || "") +
        "</div>" +
        '<div class="guestbook-entry-footer">' +
        '<span class="guestbook-entry-meta">' +
        formatTimestamp(entry.created_at) +
        "</span>" +
        '<span class="guestbook-entry-actions">' +
        '<button class="like-btn ' +
        (userLiked ? "liked" : "") +
        '" data-id="' +
        entry.id +
        '">' +
        likeIcon +
        "</button>" +
        '<span class="like-count">' +
        (entry.likes || 0) +
        "</span>" +
        authorBadge +
        "</span></div></div>"
      );
    })
    .join("");

  updateLoadMore();
}

function showScrollHint() {
  const container = document.getElementById("guestbookEntries");
  if (!container) return;
  if (container.scrollHeight <= container.clientHeight) return;
  if (container.parentElement.querySelector(".guestbook-scroll-hint")) return;

  const hint = document.createElement("div");
  hint.className = "guestbook-scroll-hint";
  hint.textContent = "↓ scroll to see new entries";
  container.appendChild(hint);
  setTimeout(function () {
    hint.classList.add("guestbook-scroll-hint--fade");
    setTimeout(function () {
      hint.remove();
    }, 600);
  }, 2500);
}

function updateLoadMore() {
  const container = document.getElementById("guestbookEntries");
  const hasMore = gbOffset + GB_PAGE < Math.min(gbTotal, GB_MAX);

  let loadMoreBtn = document.getElementById("gbLoadMore");
  if (hasMore) {
    if (!loadMoreBtn) {
      loadMoreBtn = document.createElement("button");
      loadMoreBtn.id = "gbLoadMore";
      loadMoreBtn.className = "guestbook-load-more";
      loadMoreBtn.textContent = "load more";
      loadMoreBtn.addEventListener("click", loadMoreGuestbookEntries);
      container.after(loadMoreBtn);
    }
  } else if (loadMoreBtn) {
    loadMoreBtn.remove();
  }
}

async function fetchGuestbookEntries() {
  gbOffset = 0;
  gbAllEntries = [];
  const status = document.getElementById("guestbookStatus");
  if (status) status.textContent = "loading...";

  const container = document.getElementById("guestbookEntries");
  if (container)
    container.innerHTML =
      '<div class="guestbook-loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';

  try {
    const res = await fetch(WORKER_URL + "?limit=" + GB_PAGE + "&offset=0");
    if (!res.ok) throw new Error("failed");
    const data = await res.json();
    gbAllEntries = data.entries || [];
    gbTotal = data.total || 0;
    renderGuestbookEntries(gbAllEntries);
    const total = Math.min(gbTotal, GB_MAX);
    if (status)
      status.textContent = total + " message" + (total === 1 ? "" : "s");
  } catch {
    if (status) status.textContent = "could not load";
    document.getElementById("guestbookEntries").innerHTML =
      '<div class="guestbook-empty">guestbook is unavailable right now.</div>';
  }
}

async function loadMoreGuestbookEntries() {
  const newOffset = gbOffset + GB_PAGE;
  if (newOffset >= GB_MAX) return;

  const loadMoreBtn = document.getElementById("gbLoadMore");
  if (loadMoreBtn) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "loading...";
  }

  try {
    const res = await fetch(
      WORKER_URL + "?limit=" + GB_PAGE + "&offset=" + newOffset,
    );
    if (!res.ok) throw new Error("failed");
    const data = await res.json();
    const more = data.entries || [];
    gbAllEntries = gbAllEntries.concat(more);
    gbOffset = newOffset;

    const container = document.getElementById("guestbookEntries");
    const liked = JSON.parse(localStorage.getItem("gb_liked") || "{}");
    var startIdx = gbAllEntries.length - more.length;
    var html = more
      .map(function (entry, i) {
        const userLiked = liked[entry.id];
        const likeIcon = userLiked ? "♥" : "♡";
        const authorBadge = entry.liked_by_author
          ? '<span class="author-like-badge">♥ liked by author</span>'
          : "";
        const animDelay = ((startIdx + i) * 0.06).toFixed(2);
        return (
          '<div class="guestbook-entry gb-entry" data-id="' +
          entry.id +
          '" style="animation-delay:' +
          animDelay +
          's">' +
          '<div class="guestbook-entry-title">' +
          escapeHtml(entry.name || "anonymous") +
          "</div>" +
          '<div class="guestbook-entry-body">' +
          escapeHtml(entry.message || "") +
          "</div>" +
          '<div class="guestbook-entry-footer">' +
          '<span class="guestbook-entry-meta">' +
          formatTimestamp(entry.created_at) +
          "</span>" +
          '<span class="guestbook-entry-actions">' +
          '<button class="like-btn ' +
          (userLiked ? "liked" : "") +
          '" data-id="' +
          entry.id +
          '">' +
          likeIcon +
          "</button>" +
          '<span class="like-count">' +
          (entry.likes || 0) +
          "</span>" +
          authorBadge +
          "</span></div></div>"
        );
      })
      .join("");
    container.insertAdjacentHTML("beforeend", html);
    updateLoadMore();
    showScrollHint();
    const loadMoreBtnDone = document.getElementById("gbLoadMore");
    if (loadMoreBtnDone) {
      loadMoreBtnDone.disabled = false;
      loadMoreBtnDone.textContent = "load more";
    }
    const status = document.getElementById("guestbookStatus");
    const total = Math.min(gbTotal, GB_MAX);
    if (status)
      status.textContent = total + " message" + (total === 1 ? "" : "s");
  } catch {
    const status = document.getElementById("guestbookStatus");
    if (status) status.textContent = "could not load more";
    const loadMoreBtnErr = document.getElementById("gbLoadMore");
    if (loadMoreBtnErr) {
      loadMoreBtnErr.disabled = false;
      loadMoreBtnErr.textContent = "load more";
    }
  }
}

function toggleLike(entryId) {
  const liked = JSON.parse(localStorage.getItem("gb_liked") || "{}");
  const isLiked = liked[entryId];
  const action = isLiked ? "unlike" : "like";

  const body = { action, id: entryId };
  if (authorToken) body.token = authorToken;

  fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then((res) => {
      if (!res.ok) throw new Error("request failed");
      return res.json();
    })
    .then((result) => {
      if (!result.ok) return;
      if (action === "like") liked[entryId] = true;
      else delete liked[entryId];
      localStorage.setItem("gb_liked", JSON.stringify(liked));

      const entry = gbAllEntries.find((e) => String(e.id) === entryId);
      if (entry) {
        entry.likes = result.likes;
        if (result.liked_by_author) entry.liked_by_author = true;
        else if (authorToken && action === "unlike")
          entry.liked_by_author = false;
      }
      renderGuestbookEntries(gbAllEntries);
    })
    .catch(() => {});
}

function authenticateAuthor() {
  if (authorToken) {
    setAuthorToken(null);
    sessionStorage.removeItem("author_token");
    return;
  }

  const password = prompt("enter author password:");
  if (!password) return;

  fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "auth", password }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.ok && data.token) {
        setAuthorToken(data.token);
        sessionStorage.setItem("author_token", data.token);
      } else {
        alert("incorrect password");
      }
    })
    .catch(() => alert("authentication failed"));
}

export function initGuestbook() {
  const form = document.getElementById("guestbookForm");
  const panel = document.getElementById("guestbookCard");

  fetchGuestbookEntries();

  const entriesContainer = document.getElementById("guestbookEntries");
  if (entriesContainer) {
    entriesContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".like-btn");
      if (btn) {
        btn.classList.add("like-pop");
        setTimeout(function () {
          btn.classList.remove("like-pop");
        }, 400);
        toggleLike(btn.dataset.id);
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key.length === 1) {
      keyBuffer += e.key.toLowerCase();
      if (keyBuffer.length > 9) keyBuffer = keyBuffer.slice(-9);
      if (keyBuffer === "iamauthor") {
        keyBuffer = "";
        authenticateAuthor();
      }
    }
  });

  if (!form) return;

  var turnstileWidgetDiv = document.getElementById("turnstileWidget");
  var turnstileWidgetId = null;
  if (turnstileWidgetDiv && typeof turnstile !== "undefined") {
    turnstileWidgetId = turnstile.render(turnstileWidgetDiv, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "auto",
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nameInput = document.getElementById("guestName");
    const messageInput = document.getElementById("guestMessage");
    const name = (nameInput ? nameInput.value : "").trim() || "anonymous";
    const message = (messageInput ? messageInput.value : "").trim();
    const status = document.getElementById("guestbookStatus");

    if (!message) {
      if (status) status.textContent = "type a message";
      return;
    }

    var token = turnstileWidgetId ? turnstile.getResponse(turnstileWidgetId) : "";
    if (!token) {
      if (status) status.textContent = "complete the captcha";
      return;
    }

    if (status) status.textContent = "posting...";

    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message, turnstileToken: token }),
      });
      if (!res.ok) {
        var errMsg = "could not post, try again later.";
        if (res.status === 403) {
          try {
            var errBody = await res.json();
            if (errBody.error === "captcha verification failed") {
              errMsg = "captcha failed — turn off your vpn or try again later";
            }
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
