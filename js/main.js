import { initViewCounter } from './view-counter.js';
import { connectLanyard } from './discord.js';
import { initGuestbook } from './guestbook.js';
import { initAudioPlayer } from './audio.js';
import { initWebring } from './webring.js';
import { initEffects } from './effects.js';

initViewCounter();
connectLanyard();
initGuestbook();
initAudioPlayer();
initWebring();
initEffects();
