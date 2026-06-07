export async function initViewCounter() {
  try {
    const counted = sessionStorage.getItem('mil_counted');
    const url = counted
      ? 'https://api.counterapi.dev/v2/miliegoat/viewsmiliegoat'
      : 'https://api.counterapi.dev/v2/miliegoat/viewsmiliegoat/up';
    const res = await fetch(url);
    const data = await res.json();
    document.getElementById('viewCount').textContent = Number(data.data.up_count).toLocaleString();
    if (!counted) sessionStorage.setItem('mil_counted', '1');
  } catch {
    document.getElementById('viewCount').textContent = '—';
  }
}
