export function initAgeDisplay() {
  const el = document.getElementById("ageDisplay");
  if (!el) return;
  const birthDate = new Date("2010-08-06T00:00:00");
  function update() {
    const now = new Date();
    const diff = now - birthDate;
    const years = diff / (365.25 * 24 * 60 * 60 * 1000);
    el.textContent = Math.floor(years);
    el.setAttribute("data-tooltip", years.toFixed(8));
  }
  update();
  setInterval(update, 100);
}
