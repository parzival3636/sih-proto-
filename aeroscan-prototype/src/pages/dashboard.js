/* Stub — Dashboard (Dev 2) */
function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
export function renderDashboard() { return el('<div class="page-placeholder">Dashboard — Dev 2</div>'); }
