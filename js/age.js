export function initAgeDisplay() {
  var el = document.getElementById("ageDisplay");
  if (!el) return;

  var birthDate = new Date("2010-08-06T00:00:00");

  function update() {
    var now = new Date();
    var diff = now - birthDate;
    var years = diff / (365.25 * 24 * 60 * 60 * 1000);
    el.textContent = Math.floor(years);
    el.setAttribute("data-tooltip", years.toFixed(8));
  }

  update();
  setInterval(update, 50);
}
