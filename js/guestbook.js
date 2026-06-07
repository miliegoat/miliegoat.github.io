import { WORKER_URL, GB_PAGE, GB_MAX } from './constants.js';
import { formatTimestamp, escapeHtml } from './utils.js';
import { authorToken, setAuthorToken } from './state.js';

let gbOffset = 0;
let gbTotal = 0;
let gbAllEntries = [];

let keyBuffer = '';

function renderGuestbookEntries(entries) {
  const container = document.getElementById('guestbookEntries');
  if (!container) return;

  if (!entries.length) {
    container.innerHTML = '<div class="guestbook-empty">no entries yet — be the first!</div>';
    updateLoadMore();
    return;
  }

  const liked = JSON.parse(localStorage.getItem('gb_liked') || '{}');

  container.innerHTML = entries.map(entry => {
    const userLiked = liked[entry.id];
    const likeIcon = userLiked ? '♥' : '♡';
    const authorBadge = entry.liked_by_author ? '<span class="author-like-badge">♥ liked by author</span>' : '';
    return '<div class="guestbook-entry" data-id="' + entry.id + '">'
      + '<div class="guestbook-entry-title">' + escapeHtml(entry.name || 'anonymous') + '</div>'
      + '<div class="guestbook-entry-body">' + escapeHtml(entry.message || '') + '</div>'
      + '<div class="guestbook-entry-footer">'
      + '<span class="guestbook-entry-meta">' + formatTimestamp(entry.created_at) + '</span>'
      + '<span class="guestbook-entry-actions">'
      + '<button class="like-btn ' + (userLiked ? 'liked' : '') + '" data-id="' + entry.id + '">' + likeIcon + '</button>'
      + '<span class="like-count">' + (entry.likes || 0) + '</span>'
      + authorBadge
      + '</span></div></div>';
  }).join('');

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
  if (status) status.textContent = 'loading...';

  try {
    const res = await fetch(WORKER_URL + '?limit=' + GB_PAGE + '&offset=0');
    if (!res.ok) throw new Error('failed');
    const data = await res.json();
    gbAllEntries = data.entries || [];
    gbTotal = data.total || 0;
    renderGuestbookEntries(gbAllEntries);
    const total = Math.min(gbTotal, GB_MAX);
    if (status) status.textContent = total + ' message' + (total === 1 ? '' : 's');
  } catch {
    if (status) status.textContent = 'could not load';
    document.getElementById('guestbookEntries').innerHTML = '<div class="guestbook-empty">guestbook is unavailable right now.</div>';
  }
}

async function loadMoreGuestbookEntries() {
  const newOffset = gbOffset + GB_PAGE;
  if (newOffset >= GB_MAX) return;

  const status = document.getElementById('guestbookStatus');
  if (status) status.textContent = 'loading more...';

  try {
    const res = await fetch(WORKER_URL + '?limit=' + GB_PAGE + '&offset=' + newOffset);
    if (!res.ok) throw new Error('failed');
    const data = await res.json();
    const more = data.entries || [];
    gbAllEntries = gbAllEntries.concat(more);
    gbOffset = newOffset;
    renderGuestbookEntries(gbAllEntries);
  } catch {
    if (status) status.textContent = 'could not load more';
  }
}

function toggleLike(entryId) {
  const liked = JSON.parse(localStorage.getItem('gb_liked') || '{}');
  const isLiked = liked[entryId];
  const action = isLiked ? 'unlike' : 'like';

  const body = { action, id: entryId };
  if (authorToken) body.token = authorToken;

  fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then(res => {
      if (!res.ok) throw new Error('request failed');
      return res.json();
    })
    .then(result => {
      if (!result.ok) return;
      if (action === 'like') liked[entryId] = true;
      else delete liked[entryId];
      localStorage.setItem('gb_liked', JSON.stringify(liked));

      const entry = gbAllEntries.find(e => String(e.id) === entryId);
      if (entry) {
        entry.likes = result.likes;
        if (result.liked_by_author) entry.liked_by_author = true;
        else if (authorToken && action === 'unlike') entry.liked_by_author = false;
      }
      renderGuestbookEntries(gbAllEntries);
    })
    .catch(() => {});
}

function authenticateAuthor() {
  if (authorToken) {
    setAuthorToken(null);
    sessionStorage.removeItem('author_token');
    return;
  }

  const password = prompt('enter author password:');
  if (!password) return;

  fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'auth', password }),
  })
    .then(res => res.json())
    .then(data => {
      if (data.ok && data.token) {
        setAuthorToken(data.token);
        sessionStorage.setItem('author_token', data.token);
      } else {
        alert('incorrect password');
      }
    })
    .catch(() => alert('authentication failed'));
}

export function initGuestbook() {
  const form = document.getElementById('guestbookForm');
  const panel = document.getElementById('guestbookCard');

  fetchGuestbookEntries();

  const entriesContainer = document.getElementById('guestbookEntries');
  if (entriesContainer) {
    entriesContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.like-btn');
      if (btn) toggleLike(btn.dataset.id);
    });
  }

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

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nameInput = document.getElementById('guestName');
    const messageInput = document.getElementById('guestMessage');
    const name = (nameInput ? nameInput.value : '').trim() || 'anonymous';
    const message = (messageInput ? messageInput.value : '').trim();
    const status = document.getElementById('guestbookStatus');

    if (!message) {
      if (status) status.textContent = 'type a message';
      return;
    }

    if (status) status.textContent = 'posting...';

    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message }),
      });
      if (!res.ok) throw new Error('failed');
      if (status) status.textContent = 'posted!';
      if (nameInput) nameInput.value = '';
      if (messageInput) messageInput.value = '';
      fetchGuestbookEntries();
    } catch {
      if (status) status.textContent = 'could not post, try again later.';
    }
  });
}
