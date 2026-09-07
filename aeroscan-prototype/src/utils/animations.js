/* ============================================================
   UNIPASS-3D — Animation Utilities
   Pure JS + requestAnimationFrame, zero dependencies
   ============================================================ */

/**
 * Easing functions
 */
const easings = {
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  linear: (t) => t,
};

/**
 * Format a number with commas and optional decimals
 */
function formatNumber(value, decimals = 0) {
  const fixed = value.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
}

/**
 * Animate a counter from `from` to `to` inside an element's textContent
 * 
 * @param {HTMLElement} el - The DOM element to update
 * @param {number} from - Starting value
 * @param {number} to - Ending value
 * @param {number} durationMs - Animation duration in milliseconds
 * @param {object} options
 * @param {number} options.decimals - Number of decimal places (default 0)
 * @param {string} options.easing - Easing function name (default 'easeOutExpo')
 * @param {string} options.prefix - Text prefix (e.g. '~')
 * @param {string} options.suffix - Text suffix (e.g. 'cm')
 */
export function animateCounter(el, from, to, durationMs, { decimals = 0, easing = 'easeOutExpo', prefix = '', suffix = '' } = {}) {
  const easeFn = easings[easing] || easings.easeOutExpo;
  let startTime = null;
  let animationId = null;

  function tick(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    const easedProgress = easeFn(progress);
    const currentValue = from + (to - from) * easedProgress;

    el.textContent = `${prefix}${formatNumber(currentValue, decimals)}${suffix}`;

    if (progress < 1) {
      animationId = requestAnimationFrame(tick);
    }
  }

  // Set initial value
  el.textContent = `${prefix}${formatNumber(from, decimals)}${suffix}`;
  animationId = requestAnimationFrame(tick);

  // Return cancel function
  return () => {
    if (animationId) cancelAnimationFrame(animationId);
  };
}

/**
 * Add or remove the shimmer loading class
 * 
 * @param {HTMLElement} el - The DOM element
 * @param {boolean} enable - Whether to enable (true) or disable (false) shimmer
 */
export function shimmer(el, enable = true) {
  if (enable) {
    el.classList.add('shimmer');
  } else {
    el.classList.remove('shimmer');
  }
}

/**
 * Create a staggered fade-in animation for child elements
 * 
 * @param {HTMLElement} container - Parent container
 * @param {string} selector - CSS selector for children to animate
 * @param {number} staggerMs - Delay between each child animation (default 80ms)
 */
export function staggerFadeIn(container, selector, staggerMs = 80) {
  const children = container.querySelectorAll(selector);
  children.forEach((child, i) => {
    child.style.opacity = '0';
    child.style.transform = 'translateY(16px)';
    child.style.transition = `opacity 0.5s ease ${i * staggerMs}ms, transform 0.5s ease ${i * staggerMs}ms`;
    // Trigger reflow then animate
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        child.style.opacity = '1';
        child.style.transform = 'translateY(0)';
      });
    });
  });
}
