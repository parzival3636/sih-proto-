/* ============================================================
   AEROSCAN-3D — Real & Precision Motion Utilities
   Zero decorative clutter — purely numeric count-ups and
   tactical skeleton loading states.
   ============================================================ */

/**
 * Fast start, precision settle easing curve (Quart/Expo ease-out)
 */
function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Animate a numeric DOM counter from start to end value
 * 
 * @param {HTMLElement} el - Target DOM node
 * @param {number} from - Initial numeric value
 * @param {number} to - Final numeric value
 * @param {number} durationMs - Duration in milliseconds
 * @param {object} [options]
 * @param {number} [options.decimals=0] - Decimal places
 * @param {string} [options.prefix=''] - Leading prefix (e.g. '~')
 * @param {string} [options.suffix=''] - Trailing suffix (e.g. ' min', ' cm')
 * @returns {() => void} Cancel animation function
 */
export function animateCounter(el, from, to, durationMs = 1500, { decimals = 0, prefix = '', suffix = '' } = {}) {
  if (!el) return () => {};

  let startTime = null;
  let rafId = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / durationMs, 1);
    const eased = easeOutExpo(progress);
    const current = from + (to - from) * eased;

    const formatted = current.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    el.textContent = `${prefix}${formatted}${suffix}`;

    if (progress < 1) {
      rafId = requestAnimationFrame(step);
    }
  }

  el.textContent = `${prefix}${from.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  rafId = requestAnimationFrame(step);

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
  };
}

/**
 * Toggle shimmer loading skeleton class on an element
 * @param {HTMLElement} el 
 * @param {boolean} [enable=true] 
 */
export function shimmer(el, enable = true) {
  if (!el) return;
  if (enable) {
    el.classList.add('shimmer');
  } else {
    el.classList.remove('shimmer');
  }
}
