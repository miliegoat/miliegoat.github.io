export function initWebring() {
  var host = location.hostname.replace(/^www\./, '');
  var container = document.getElementById('webringContainer');
  if (!container) return;

  fetch('https://lanyard.cafe/api/ring?url=' + encodeURIComponent(host))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var prev = data.prev, next = data.next, random = data.random;
      var isMember = data.current !== null;
      var currentUrl = isMember ? data.current.url : '';

      function render() {
        container.innerHTML = ''
          + '<span class="wr-label">lanyard.cafe webring</span>'
          + '<div class="wr-nav">'
          + '<a href="' + prev.url + '" class="wr-link" title="previous site">'
          + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>'
          + 'prev</a>'
          + '<a href="' + random.url + '" class="wr-link" title="random site">random</a>'
          + '<a href="' + next.url + '" class="wr-link" title="next site">next'
          + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>'
          + '</a>'
          + '</div>'
          + (isMember
            ? '<span class="wr-current">you are at <strong>' + currentUrl + '</strong></span>'
            : '');
      }

      render();
    })
    .catch(function() {});
}
