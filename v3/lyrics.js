const player = document.getElementById("musicPlayer");
const lyricTrack = document.getElementById("lyricTrack");
let currentLyricIndex = -1;

export function cleanName(path) {
  try {
    path = decodeURIComponent(path);
  } catch (e) {}
  return path.replace(/^.*[\\\/]/, "").replace(".mp3", "");
}

function parseLRC(lrc) {
  if (!lrc) return [];
  const lines = [];
  const parts = lrc.split("\n");
  for (let i = 0; i < parts.length; i++) {
    const match = parts[i].match(/^\[(\d+):(\d+\.\d+)\](.*)/);
    if (match) {
      const time = parseInt(match[1], 10) * 60 + parseFloat(match[2]);
      const text = match[3].trim();
      if (text) lines.push({ time, line: text });
    }
  }
  return lines;
}

const lyricsSource = {
  "lucille - breakdowns":
    "[00:02.05] Ha-ha-ha-ha, what's the matter?\n[00:05.04] Oh God\n[00:06.52] I hope that I'm on the right path\n[00:08.57] I tried to tell you, you're all that I wanted\n[00:10.68] You're my one and only, we're right back\n[00:13.00] I hate to tell you to ease on me\n[00:15.14] I'll never go unless I'm with you\n[00:17.30] How could you leave me so easily?\n[00:19.58] Bruised and I'm beating 'til black and blue\n[00:22.06] Think it was a sign of the times\n[00:24.27] Break me 'til I fall outta line\n[00:26.47] I can see desire inside you\n[00:28.33] But I'm so damn tired of lies\n[00:30.40] Breakdowns\n[00:32.53] Even when you're one call away\n[00:34.70] Breakdowns\n[00:36.82] I feel like I'm still stuck in chains\n[00:39.33] All I ever wanted was a bit of love\n[00:41.44] I'll hit 150 driving when I'm drunk\n[00:43.64] Kidnapped, now your body's in the trunk\n[00:45.71] If I can't have you, no one can and that's enough\n[00:47.66] Enough of this\n[00:50.38] Voices in my brain tell me that I'm not shit\n[00:54.66] I don't think I'll ever get her back\n[00:56.69] Tear it out my brain, I'm so attached\n[00:58.87] (Tear it out my brain, I'm so attached)\n[01:00.55] Whenever you needed, I thought it was easy\n[01:02.88] Who knew I could drown in a life raft?\n[01:04.84] When I finally caught you, I told you \"I want you\"\n[01:06.92] They pointed at me, and they all laughed\n[01:09.22] Oh Lord\n[01:10.38] God\n[01:11.47] I hope that I'm on the right path\n[01:13.54] I tried to tell you, you're all that I wanted\n[01:15.56] You're my one and only, we're right back\n[01:17.96] I hate to tell you to ease on me\n[01:20.24] I'll never go unless I'm with you\n[01:22.20] How could you leave me so easily?\n[01:24.56] Bruised and I'm beating 'til black and blue\n[01:26.81] Think it was a sign of the times\n[01:29.17] Break me 'til I fall outta line\n[01:31.33] I can see desire inside you\n[01:33.48] But I'm so damn tired of lies\n[01:35.41] Breakdowns\n[01:37.64] Even when you're one call away\n[01:39.62] Breakdowns\n[01:41.90] I feel like I'm still stuck in chains\n[01:44.46] All I ever wanted was a bit of love\n[01:46.45] I'll hit 150 driving when I'm drunk\n[01:48.54] Kidnapped, now your body's in the trunk\n[01:50.47] If I can't have you, no one can and that's enough\n[01:52.72] Enough of this\n[01:55.37] Voices in my brain tell me that I'm not shit\n[01:59.77] I don't think I'll ever get her back",
  "jaydes - vivienne":
    "[00:00.05] (You have no heart) Yeah\n[00:01.14] Why you toying with my fucking brain? Woah\n[00:04.29] All these other girls, are not the same, woah\n[00:06.74] All these women borin' me\n[00:09.31] They can't love you like I do\n[00:10.99] Why are you ignoring me? Yeah\n[00:12.65] (Silo killed this shit)\n[00:14.92] I might spend my racks now\n[00:16.42] Just to fill the void, yeah\n[00:18.05] Everybody's watching\n[00:19.68] Gas got me exhausted\n[00:21.24] Thought I had your heart\n[00:22.38] But I guess I really lost it (Yeah, yeah, yeah, yeah)\n[00:25.24] I be in a brand new Benz (Uh-huh, yeah)\n[00:26.74] I be high like Peter Pan (Uh-huh, yeah)\n[00:28.29] She said since I'm on her playlist (Uh-huh, yeah)\n[00:29.99] Thought she might just bring her friend (Uh-huh, yeah)\n[00:31.55] Only hear my money counter\n[00:32.94] Don't really care about your comments\n[00:34.61] Got a problem with my clique?\n[00:35.93] Then best believe that we gon' solve it\n[00:38.16] Yeah, why you toying with my fucking brain? Woah\n[00:42.15] All these other girls are not the same, woah\n[00:44.65] All these women borin' me\n[00:47.20] They can't love you like I do\n[00:48.86] Why are you ignoring me? Yeah (Oh, woah)\n[00:52.80] I might spend my racks now\n[00:54.39] Just to fill the void, yeah\n[00:55.96] Everybody's watching\n[00:57.58] Gas got me exhausted\n[00:59.17] Thought I had your heart\n[01:00.22] But I guess I really lost it (Yeah, yeah, yeah, yeah)\n[01:03.72] Yeah, why you toying with my fucking brain? Woah\n[01:07.47] All these other girls are not the same, woah\n[01:09.86] All these women borin' me\n[01:12.54] They can't love you like I do\n[01:14.16] Why are you ignoring me? Yeah\n[01:16.01] Yeah, why you toying with my fucking brain? Woah\n[01:19.37] All these other girls are not the same, woah\n[01:22.58] All these women borin' me\n[01:25.16] They can't love you like I do, why are you ignoring me? Yeah\n[01:28.55] Yeah, yeah, yeah, yeah\n[01:32.63] Woah (Woah)\n[01:35.79] Why you toying with my fucking brain? Woah\n[01:38.89] All these other girls are not the same, woah\n[01:41.38] All these women borin' me\n[01:43.18] They can't love you like I do, why are you ignoring me? Yeah",
  "bunii - REGRET":
    "[00:00.00] I tried to play it cool\n[00:01.58] Don't wanna hurt yourself, you ran into a different room\n[00:04.63] Jumped to conclusions; when you landed it left you with a bruise\n[00:07.79] You probably hate yourself 'cause, bae, I really hate you too\n[00:11.01] I guess I always did, it's never really nothing new\n[00:14.04] So I'll show all my statements\n[00:15.68] I'll run up all my numbers\n[00:17.21] I'll leave you lonely, hating\n[00:18.77] They'll see my name on billboards\n[00:20.36] They'll see your name in pages\n[00:21.74] Yearbooks no one is reading, posts that no one would favorite\n[00:25.79] I can see myself in your head\n[00:29.02] And I wrote the lyrics you read\n[00:31.98] Hope the melody that's between your ears is enough to make you regret\n[00:38.43] You can see me everywhere you're going (I can see you everywhere you're going)\n[00:41.75] You can see me everywhere you're going (I can see you everywhere you're going)\n[00:44.66] You can see me everywhere you're going (I can see you everywhere you're going)\n[00:47.62] Hope you see me, oh\n[00:50.02] I tried to play it cool\n[00:51.50] Don't wanna hurt yourself, you ran into a different room\n[00:54.66] Jumped to conclusions; when you landed it left you with a bruise\n[00:57.75] You probably hate yourself 'cause, bae, I really hate you too\n[01:00.82] I guess I always did, it's never really nothing new\n[01:03.94] So I'll show all my statements\n[01:05.42] I'll run up all my numbers\n[01:06.95] I'll leave you lonely, hating\n[01:08.54] They'll see my name on billboards\n[01:10.05] They'll see your name in pages\n[01:11.78] Yearbooks no one is reading, posts that no one would favorite",
  "bunii - galore galore galore":
    "[00:00.26] Baby, i'm a bastard\n[00:01.60] You know what you are too\n[00:04.20] Baby, i don't make the rules\n[00:06.65] Don't sing your song for me no more\n[00:09.48] 'cause i can't listen to you\n[00:11.39] Cut my wrists, don't hurt no more\n[00:13.75] Just leave me bleeding on the floor\n[00:16.34] You were the one that i adored\n[00:19.05] There's lovers galore, galore, yeah\n[00:21.15] Say my name, and i'ma pay attention 'cause you\n[00:23.74] Dull my days, yeah, i can never feel it when you\n[00:26.39] Bring me pain, i see you everywhere and i just\n[00:28.94] Can't escape the nightmare to my dreams\n[00:31.82] The love we had what used to be\n[00:34.48] I toss and turn, babe i can't sleep\n[00:37.03] I bit my tongue, i broke my teeth\n[00:39.53] 'cause your loves a drug and i need\n[00:41.64] Baby, i'm a bastard\n[00:43.06] You know what you are too\n[00:45.28] Baby, i don't make the rules\n[00:47.99] Don't sing your song for me no more\n[00:50.59] 'cause i can't listen to you\n[00:52.63] Cut my wrists, don't hurt no more\n[00:55.12] Just leave me bleeding on the floor\n[00:57.59] You were the one that i adored\n[01:00.39] There's lovers galore, galore, yeah\n[01:02.51] Say my name, and i'ma pay attention 'cause you\n[01:04.90] Dull my days, yeah, i can never feel it when you\n[01:07.66] Bring me pain, i see you everywhere and i just\n[01:10.13] Can't escape the nightmare to my dreams\n[01:12.86] The nightmares, i'm drowning, it's harder to breathe\n[01:17.82] Cut out my eyes, i can barely see you leave\n[01:23.05] The nightmares, i'm drowning, it's harder to breathe",
  "jacari - imma jerk":
    "[00:00.26] how imma jerk, but you still textin' me?\n[00:02.44] you say you like the way i sound, you wanna have sex wit me\n[00:04.87] compare yo nigga: imma lion, he a centipede\n[00:07.21] i would shoot yo nigga in the face, but you not lettin' me\n[00:10.49] like wtf goin' on witcha?\n[00:12.27] you ain't text me inna minute, smth wrong witcha?\n[00:14.58] i ain't speak to you in days, who else you talkin to?\n[00:17.04] bae why you tryna make me wait, like can you see that i've been:\n[00:19.22] waiting long?\n[00:21.36] why you taking off?\n[00:23.39] you don't wanna say you're wrong\n[00:26.09] i feel fine when im with you, oh girl, but now you're gone\n[00:29.57] i guess it's fine though!\n[00:30.90] cuz im delusional, i think that you're still mine though!\n[00:33.05] you be in my head, you in my dreams, you on my mind though!\n[00:35.56] we can never love thats what it seems cuz when we talk you always say that imma jerk\n[00:38.51] (jerk! jerk! jerk! jerk!\n[00:40.70] jerk! jerk! jerk! jerk!\n[00:43.17] you're a jerk! jerk! jerk! jerk!\n[00:45.56] jerk! jerk! jerk! jerk!) (x2)\n[00:57.66] how imma jerk, but you still textin' me?\n[01:00.05] you say you like the way i sound, you wanna have sex wit me\n[01:02.43] compare yo nigga: imma lion, he a centipede\n[01:04.81] i would shoot yo nigga in the face, but you not lettin' me\n[01:07.27] like wtf goin' on witcha?\n[01:09.82] you ain't text me inna minute, smth wrong witcha?\n[01:12.29] i ain't speak to you in days, who else you talkin to?\n[01:14.63] bae why you tryna make me wait, like can you see that i've been:\n[01:17.01] waiting long?\n[01:19.15] why you taking off?\n[01:21.01] you don't wanna say you're wrong\n[01:23.51] i feel fine when im with you, oh girl, but now you're gone\n[01:27.07] i guess it's fine though!\n[01:28.41] cuz im delusional, i think that you're still mine though!\n[01:30.60] you be in my head, you in my dreams, you on my mind though!\n[01:32.99] we can never love thats what it seems cuz when we talk you always say that imma jerk\n[01:36.05] (jerk! jerk! jerk! jerk!\n[01:38.24] jerk! jerk! jerk! jerk!\n[01:40.55] you're a jerk! jerk! jerk! jerk!\n[01:42.76] jerk! jerk! jerk! jerk!) (x2)",
};

const lyricsData = {};
for (const key in lyricsSource) {
  if (lyricsSource.hasOwnProperty(key)) {
    lyricsData[key] = parseLRC(lyricsSource[key]);
  }
}

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

  for (let i = 0; i < lines.length; i++) {
    const el = document.createElement("span");
    el.className = "lyric-line";
    el.textContent = lines[i].line;
    lyricTrack.appendChild(el);
  }
}

export function updateLyrics() {
  const name = cleanName(player.src);
  const lines = lyricsData[name];

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

  const current = player.currentTime;
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (current >= lines[i].time) {
      idx = i;
    }
  }

  if (idx === currentLyricIndex) return;
  currentLyricIndex = idx;

  const els = lyricTrack.children;
  for (let j = 0; j < els.length; j++) {
    els[j].className = "lyric-line";
  }

  if (idx >= 0 && idx < lines.length) {
    els[idx].classList.add("current");

    const container = lyricTrack.parentElement;
    const containerH = container.clientHeight;
    const elTop = els[idx].offsetTop;
    const elH = els[idx].offsetHeight;
    let target = -(elTop - (containerH - elH) / 2);
    const max = 0;
    const min = -(lyricTrack.scrollHeight - containerH);
    if (target > max) target = max;
    if (target < min) target = min;
    lyricTrack.style.transform = "translateY(" + target + "px)";
  } else {
    lyricTrack.style.transform = "translateY(0)";
  }
}
