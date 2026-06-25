const player = document.getElementById("musicPlayer");
let audioContext, analyser, dataArray, source, canvas, ctx;

function resizeCanvas() {
  canvas = canvas || document.getElementById("visualizerCanvas");
  if (!canvas) return;
  const wrap = canvas.parentElement;
  if (!wrap) return;
  const w = wrap.clientWidth;
  let h = canvas.clientHeight || 36;
  if (h < 10) h = 36;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx = ctx || canvas.getContext("2d");
  if (dpr !== 1 && ctx) {
    ctx.scale(dpr, dpr);
  }
}

function visualize() {
  requestAnimationFrame(visualize);
  if (!analyser || !ctx || !canvas) return;
  analyser.getByteFrequencyData(dataArray);
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr;
  let h = canvas.height / dpr;
  if (h < 10) h = 36;
  ctx.clearRect(0, 0, w, h);

  const barCount = 32;
  const gap = 1.5;
  const totalGap = gap * (barCount - 1);
  const barW = (w - totalGap) / barCount;
  const maxH = h * 0.8;

  for (let i = 0; i < barCount; i++) {
    const relIndex = Math.floor((i * dataArray.length) / barCount);
    const val = dataArray[relIndex] || 0;
    let barH = (val / 255) * maxH;
    if (barH < 1) barH = 0;
    const x = i * (barW + gap);
    const y = h - barH;
    const t = i / barCount;
    const g = Math.round(185 - t * 40);
    ctx.fillStyle = `rgba(16, ${g}, 129, ${0.3 + t * 0.4})`;
    ctx.fillRect(x, y, barW, barH);
  }
}

export function initAudioContext() {
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

export function getAudioContext() {
  return audioContext;
}
