/* ============================================================
   AEROSCAN-3D — Real & Precision Motion Utilities
   Zero decorative clutter — purely numeric count-ups and
   tactical toast / scanline loading feedback.
   ============================================================ */

/**
 * Fast start, precision settle easing curve (Quart/Expo ease-out)
 */
function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Animate a numeric DOM counter from start to end value
 */
export function animateCounter(el, from, to = undefined, durationMs = 1500, opts = {}) {
  if (!el) return () => {};

  let startVal = from;
  let targetVal = to;

  if (targetVal === undefined) {
    targetVal = from;
    startVal = 0;
    if (typeof opts === 'number') {
      durationMs = opts;
      opts = {};
    }
  }

  const { decimals = 0, prefix = '', suffix = '' } = opts || {};
  let startTime = null;
  let rafId = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / durationMs, 1);
    const eased = easeOutExpo(progress);
    const current = startVal + (targetVal - startVal) * eased;

    const formatted = decimals > 0 
      ? current.toFixed(decimals)
      : Math.round(current).toLocaleString('en-US');

    el.textContent = `${prefix}${formatted}${suffix}`;

    if (progress < 1) {
      rafId = requestAnimationFrame(step);
    }
  }

  rafId = requestAnimationFrame(step);
  return () => {
    if (rafId) cancelAnimationFrame(rafId);
  };
}

/**
 * Show a tactical toast notification.
 * @param {string} message
 * @param {'info'|'success'|'warning'|'error'} type
 * @param {number} duration ms before auto-dismiss
 */
export function showToast(message, type = 'info', duration = 3500) {
  const existing = document.querySelector('.tactical-toast');
  if (existing) existing.remove();

  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
  const colors = { 
    info: 'var(--color-accent, #f2b705)', 
    success: 'var(--color-observed, #22c55e)', 
    warning: 'var(--color-inferred, #f2b705)', 
    error: '#ef4444' 
  };

  const toast = document.createElement('div');
  toast.className = 'tactical-toast';
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 18px;
    background: var(--color-bg-elevated, #1a1a21);
    border: 1px solid var(--color-border-subtle, #26262c);
    border-left: 3px solid ${colors[type] || colors.info};
    border-radius: 8px;
    box-shadow: 0 12px 36px rgba(0,0,0,0.7);
    color: var(--color-text-primary, #ffffff);
    font-size: 13px; font-weight: 500;
    font-family: var(--font-sans, Inter, sans-serif);
    animation: toast-in 0.3s ease;
    max-width: 380px;
  `;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

/**
 * Trigger a scan-line sweep effect across the screen.
 */
export function triggerScanLine() {
  const line = document.createElement('div');
  line.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--color-accent, #f2b705), transparent);
    z-index: 9999; pointer-events: none;
    animation: scan-line 0.7s ease-out forwards;
  `;
  document.body.appendChild(line);
  setTimeout(() => line.remove(), 700);
}

/**
 * Toggle shimmer loading skeleton class on an element
 */
export function shimmer(el, enable = true) {
  if (!el) return;
  if (enable) {
    el.classList.add('shimmer');
  } else {
    el.classList.remove('shimmer');
  }
}
