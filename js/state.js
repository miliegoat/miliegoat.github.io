export let authorToken = sessionStorage.getItem('author_token') || null;
export function setAuthorToken(token) { authorToken = token; }

export let currentSpotifyData = null;
export function setCurrentSpotifyData(data) { currentSpotifyData = data; }

export let currentTrackId = null;
export function setCurrentTrackId(id) { currentTrackId = id; }

export let currentLyrics = [];
export function setCurrentLyrics(lyrics) { currentLyrics = lyrics; }

export let ytPlayer = null;
export function setYtPlayer(player) { ytPlayer = player; }

export let ytReady = false;
export function setYtReady(v) { ytReady = v; }

export let ytPendingVideo = null;
export function setYtPendingVideo(v) { ytPendingVideo = v; }

export let ytUnlocked = false;
export function setYtUnlocked(v) { ytUnlocked = v; }

export let ytCurrentVideoId = null;
export function setYtCurrentVideoId(v) { ytCurrentVideoId = v; }

export let lastProfileDataHash = null;
export function setLastProfileDataHash(hash) { lastProfileDataHash = hash; }

export const appIconCache = new Map();
export const ytSearchCache = new Map();
