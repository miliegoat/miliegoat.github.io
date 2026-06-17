export let authorToken = sessionStorage.getItem("author_token") || null;
export function setAuthorToken(token) {
  authorToken = token;
}

export let currentSpotifyData = null;
export function setCurrentSpotifyData(data) {
  currentSpotifyData = data;
}

export let currentTrackId = null;
export function setCurrentTrackId(id) {
  currentTrackId = id;
}

export let currentLyrics = [];
export function setCurrentLyrics(lyrics) {
  currentLyrics = lyrics;
}

export let lastProfileDataHash = null;
export function setLastProfileDataHash(hash) {
  lastProfileDataHash = hash;
}

export const appIconCache = new Map();
