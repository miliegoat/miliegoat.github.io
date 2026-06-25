const GB_PAGE = 8;
const GB_MAX = 500;
const WORKER_URL = "https://snowy-dust-17c3.asdwaawdawd81.workers.dev/";
const TURNSTILE_SITE_KEY = "0x4AAAAAADg6LkYattvc_Fqe";

let gbOffset = 0;
let gbTotal = 0;
let gbAllEntries = [];
let turnstileWidgetId = null;
let authorToken = null;
let gbKeyBuffer = "";
let scrollHintShown = false;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function formatTimestamp(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderGuestbookEntries(entries) {
  const container = document.getElementById("guestbookEntries");
  if (!container) return;
  if (!entries.length) {
    container.innerHTML = '<div class="gb-empty">no entries yet — be the first!</div>';
    updateLoadMore();
    return;
  }
  const liked = JSON.parse(localStorage.getItem("gb_liked") || "{}");
  container.innerHTML = entries
    .map((entry) => {
      const userLiked = liked[entry.id];
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
  const footer = document.getElementById("gbFooter");
  if (!footer) return;
  const hasMore = gbOffset + GB_PAGE < Math.min(gbTotal, GB_MAX);
  let btn = document.getElementById("gbLoadMore");
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
  const status = document.getElementById("guestbookStatus");
  if (status) status.textContent = "loading...";
  const container = document.getElementById("guestbookEntries");
  if (container)
    container.innerHTML = '<div class="gb-loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
  try {
    const res = await fetch(WORKER_URL + "?limit=" + GB_PAGE + "&offset=0");
    if (!res.ok) throw new Error("failed");
    const data = await res.json();
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
      container.innerHTML = '<div class="gb-empty">guestbook is unavailable right now.</div>';
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
    const res = await fetch(WORKER_URL + "?limit=" + GB_PAGE + "&offset=" + newOffset);
    if (!res.ok) throw new Error("failed");
    const data = await res.json();
    const more = data.entries || [];
    gbAllEntries = gbAllEntries.concat(more);
    gbOffset = newOffset;
    const container = document.getElementById("guestbookEntries");
    const liked = JSON.parse(localStorage.getItem("gb_liked") || "{}");
    const html = more
      .map((entry) => {
        const userLiked = liked[entry.id];
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
      const hint = document.createElement("div");
      hint.className = "gb-scroll-hint";
      hint.textContent = "\u2193 scroll to see new entries";
      const footer = document.getElementById("gbFooter");
      const existingBtn = document.getElementById("gbLoadMore");
      if (existingBtn) {
        footer.insertBefore(hint, existingBtn);
      } else {
        footer.appendChild(hint);
      }
      setTimeout(() => hint.classList.add("gb-scroll-hint--fade"), 2500);
      setTimeout(() => hint.remove(), 3100);
    }
    const doneBtn = document.getElementById("gbLoadMore");
    if (doneBtn) {
      doneBtn.disabled = false;
      doneBtn.textContent = "load more";
    }
    const status = document.getElementById("guestbookStatus");
    if (status)
      status.textContent =
        Math.min(gbTotal, GB_MAX) +
        " message" +
        (Math.min(gbTotal, GB_MAX) === 1 ? "" : "s");
  } catch {
    const status = document.getElementById("guestbookStatus");
    if (status) status.textContent = "could not load more";
    const errBtn = document.getElementById("gbLoadMore");
    if (errBtn) {
      errBtn.disabled = false;
      errBtn.textContent = "load more";
    }
  }
}

function toggleLike(entryId) {
  const liked = JSON.parse(localStorage.getItem("gb_liked") || "{}");
  const isLiked = liked[entryId];
  const body = { action: isLiked ? "unlike" : "like", id: entryId };
  if (authorToken) body.token = authorToken;
  fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then((res) => {
      if (!res.ok) throw new Error("failed");
      return res.json();
    })
    .then((result) => {
      if (!result.ok) return;
      if (isLiked) delete liked[entryId];
      else liked[entryId] = true;
      localStorage.setItem("gb_liked", JSON.stringify(liked));
      for (let i = 0; i < gbAllEntries.length; i++) {
        if (String(gbAllEntries[i].id) === entryId) {
          gbAllEntries[i].likes = result.likes;
          if (result.liked_by_author) gbAllEntries[i].liked_by_author = true;
          else if (authorToken) gbAllEntries[i].liked_by_author = false;
          break;
        }
      }
      renderGuestbookEntries(gbAllEntries);
    })
    .catch(() => {});
}

function authenticateAuthor() {
  if (authorToken) {
    authorToken = null;
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
        authorToken = data.token;
        sessionStorage.setItem("author_token", data.token);
      } else {
        alert("incorrect password");
      }
    })
    .catch(() => alert("authentication failed"));
}

export function initGuestbook() {
  const overlay = document.getElementById("guestbookOverlay");
  document.getElementById("guestbookBtn").addEventListener("click", () => {
    overlay.classList.remove("hidden");
    if (!overlay.dataset.loaded) {
      overlay.dataset.loaded = "true";
      fetchGuestbookEntries();
      const tw = document.getElementById("turnstileWidget");
      if (tw && typeof turnstile !== "undefined") {
        turnstileWidgetId = turnstile.render(tw, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
        });
      }
    }
  });
  document.getElementById("gbClose").addEventListener("click", () => {
    overlay.classList.add("hidden");
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.add("hidden");
  });
  const entriesContainer = document.getElementById("guestbookEntries");
  if (entriesContainer) {
    entriesContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".gb-like-btn");
      if (btn) {
        btn.classList.add("like-pop");
        setTimeout(() => btn.classList.remove("like-pop"), 400);
        toggleLike(btn.dataset.id);
      }
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key.length === 1) {
      gbKeyBuffer += e.key.toLowerCase();
      if (gbKeyBuffer.length > 9) gbKeyBuffer = gbKeyBuffer.slice(-9);
      if (gbKeyBuffer === "iamauthor") {
        gbKeyBuffer = "";
        authenticateAuthor();
      }
    }
  });
  const form = document.getElementById("guestbookForm");
  if (!form) return;
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
    if (message.length > 200) {
      if (status) status.textContent = "message too long (max 200 characters)";
      return;
    }
    const token = turnstileWidgetId ? turnstile.getResponse(turnstileWidgetId) : "";
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
        let errMsg = "could not post, try again later.";
        if (res.status === 403) {
          try {
            const errBody = await res.json();
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
