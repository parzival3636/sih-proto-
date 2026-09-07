/* ============================================================
   UNIPASS-3D — Landing Page (Screen 1)
   Hero + Stats + Pipeline + Comparison + Trust Tags + Footer
   ============================================================ */

import { BRAND, PIPELINE_PHASES, TECH_STACK } from '../utils/constants.js';
import { animateCounter, staggerFadeIn } from '../utils/animations.js';
import { navigate } from '../utils/router.js';

/**
 * Helper: create a DOM element from an HTML string
 */
function el(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstChild;
}

/**
 * Create the animated particle/grid canvas background for the hero
 */
function createHeroBackground(container) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let animId = null;
  let particles = [];
  const PARTICLE_COUNT = 60;

  function resize() {
    canvas.width = container.offsetWidth * window.devicePixelRatio;
    canvas.height = container.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  function initParticles() {
    particles = [];
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.3 + 0.1,
      });
    }
  }

  function draw() {
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    ctx.clearRect(0, 0, w, h);

    // Draw faint grid
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.03)';
    ctx.lineWidth = 0.5;
    const gridSize = 60;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw & update particles
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 229, 255, ${p.alpha})`;
      ctx.fill();
    });

    // Draw connections between nearby particles
    ctx.lineWidth = 0.5;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const alpha = (1 - dist / 120) * 0.08;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
          ctx.stroke();
        }
      }
    }

    animId = requestAnimationFrame(draw);
  }

  resize();
  initParticles();
  draw();

  window.addEventListener('resize', () => {
    resize();
    initParticles();
  });

  // Cleanup function
  return () => {
    if (animId) cancelAnimationFrame(animId);
  };
}

/**
 * Phase icons using inline SVGs (lightweight, no external deps)
 */
const phaseIcons = {
  1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
  2: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  3: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
  4: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
  5: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
  6: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-2-2H5L3 8"/><rect x="3" y="8" width="18" height="12" rx="1"/><path d="M10 12h4"/></svg>`,
};

/**
 * Render the landing page
 * @returns {HTMLElement}
 */
export function renderLanding() {
  const page = document.createElement('div');
  page.className = 'landing-page';

  page.innerHTML = `
    <!-- ========== HERO ========== -->
    <section class="landing-hero" id="landing-hero">
      <div class="landing-hero-bg" id="hero-bg"></div>
      <div class="landing-hero-content">
        <div class="landing-hero-badge">
          <span class="badge badge-cyan">${BRAND.event}</span>
        </div>
        <h1 class="landing-hero-title">${BRAND.systemName}</h1>
        <p class="landing-hero-tagline">${BRAND.tagline}</p>
        <p class="landing-hero-problem">"One pass, real-world chaos, and a deadline that can't wait."</p>
        <div class="landing-hero-cta">
          <button class="btn btn-primary btn-lg" id="hero-cta">
            Launch Mission Console
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
          <button class="btn btn-secondary btn-lg" id="hero-learn-more">
            Explore Pipeline
          </button>
        </div>
      </div>
    </section>

    <!-- ========== STATS ========== -->
    <section class="landing-stats" id="landing-stats">
      <div class="glass-card landing-stat-card">
        <div class="stat-counter">
          <span class="stat-value" id="stat-time">0</span>
          <span class="stat-label">Minutes Processing</span>
        </div>
      </div>
      <div class="glass-card landing-stat-card">
        <div class="stat-counter">
          <span class="stat-value" id="stat-rmse">0</span>
          <span class="stat-label">RMSE Accuracy (cm)</span>
        </div>
      </div>
      <div class="glass-card landing-stat-card">
        <div class="stat-counter">
          <span class="stat-value" id="stat-gaussians">0</span>
          <span class="stat-label">Gaussians Reconstructed</span>
        </div>
      </div>
      <div class="glass-card landing-stat-card">
        <div class="stat-counter">
          <span class="stat-value" id="stat-flights">0</span>
          <span class="stat-label">Repeat Flights Required</span>
        </div>
      </div>
    </section>

    <!-- ========== PIPELINE FEATURES ========== -->
    <section class="landing-features" id="landing-features">
      <h2 class="landing-features-title">End-to-End Pipeline</h2>
      <p class="landing-features-subtitle">From a single drone pass to a fully georeferenced, trust-tagged 3D model — no repeat flights, no cloud dependency.</p>
      <div class="landing-features-grid">
        ${PIPELINE_PHASES.map(phase => `
          <div class="glass-card landing-feature-card" data-phase>
            <div class="landing-feature-icon">${phaseIcons[phase.id] || ''}</div>
            <span class="landing-feature-phase">Phase ${phase.id}</span>
            <h3 class="landing-feature-name">${phase.name}</h3>
            <p class="landing-feature-desc">${phase.desc}</p>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- ========== COMPARISON ========== -->
    <section class="landing-comparison" id="landing-comparison">
      <h2 class="landing-comparison-title">Why UNIPASS-3D?</h2>
      <div class="landing-comparison-grid">
        <div class="glass-card landing-comparison-card old-way">
          <div class="landing-comparison-label">Traditional Photogrammetry</div>
          <ul class="landing-comparison-list">
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              80%+ image overlap, dozens of parallel passes
            </li>
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Hours of flight time and battery swaps
            </li>
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Ground control points and survey markers required
            </li>
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Cloud processing, hours to days turnaround
            </li>
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              No confidence metadata on reconstructed surfaces
            </li>
          </ul>
        </div>

        <div class="landing-comparison-vs">VS</div>

        <div class="glass-card landing-comparison-card new-way">
          <div class="landing-comparison-label">UNIPASS-3D</div>
          <ul class="landing-comparison-list">
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              One low pass — single flight, no repeat missions
            </li>
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ~15–20 minutes from landing to 3D model
            </li>
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Fully offline — no cloud, no connectivity needed
            </li>
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              GPS/IMU fusion — no ground markers required
            </li>
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Every surface trust-tagged: Observed, Inferred, or AI-Completed
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ========== TRUST TAGS ========== -->
    <section class="landing-trust" id="landing-trust">
      <h2 class="landing-trust-title">Built-In Confidence Transparency</h2>
      <p class="landing-trust-subtitle">Every surface in the reconstructed model carries a trust tag — no black-box outputs, no hidden assumptions.</p>
      <div class="landing-trust-grid">
        <div class="glass-card landing-trust-card" data-trust>
          <span class="badge badge-observed">● Observed</span>
          <p>Directly captured by the camera and geometrically verified. This surface exists in the raw sensor data — highest confidence.</p>
        </div>
        <div class="glass-card landing-trust-card" data-trust>
          <span class="badge badge-inferred">● Inferred</span>
          <p>Estimated through multi-view geometry, depth fusion, or sensor interpolation. Structurally plausible, but not directly observed.</p>
        </div>
        <div class="glass-card landing-trust-card" data-trust>
          <span class="badge badge-ai-completed">● AI-Completed</span>
          <p>Gap-filled by AI models (LaMa, diffusion inpainting). Visually coherent, but flagged as synthetic — lowest confidence.</p>
        </div>
      </div>
    </section>

    <!-- ========== FOOTER ========== -->
    <footer class="landing-footer" id="landing-footer">
      <div class="landing-footer-brand">${BRAND.systemName}</div>
      <div class="landing-footer-event">${BRAND.teamName} · ${BRAND.event}</div>
      <div class="landing-footer-tech">
        ${TECH_STACK.map(t => `<span class="landing-footer-tech-item">${t}</span>`).join('')}
      </div>
    </footer>
  `;

  // --- Event Listeners ---

  // Hero CTA → Dashboard
  page.querySelector('#hero-cta').addEventListener('click', () => {
    navigate('/dashboard');
  });

  // "Explore Pipeline" → scroll to features section
  page.querySelector('#hero-learn-more').addEventListener('click', () => {
    page.querySelector('#landing-features').scrollIntoView({ behavior: 'smooth' });
  });

  // --- Hero Background Animation ---
  requestAnimationFrame(() => {
    const heroBg = page.querySelector('#hero-bg');
    if (heroBg) createHeroBackground(heroBg);
  });

  // --- Intersection Observer for Stat Counters ---
  let statsAnimated = false;
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !statsAnimated) {
        statsAnimated = true;

        animateCounter(page.querySelector('#stat-time'), 0, 17, 2000, {
          decimals: 0, prefix: '~', suffix: ' min'
        });
        animateCounter(page.querySelector('#stat-rmse'), 0, 2.3, 2000, {
          decimals: 1, suffix: ' cm'
        });
        animateCounter(page.querySelector('#stat-gaussians'), 0, 8300000, 2500, {
          decimals: 0, suffix: '+'
        });
        // "Zero" stays at 0
        page.querySelector('#stat-flights').textContent = 'Zero';

        statsObserver.disconnect();
      }
    });
  }, { threshold: 0.3 });

  // Observe after mount
  requestAnimationFrame(() => {
    const statsSection = page.querySelector('#landing-stats');
    if (statsSection) statsObserver.observe(statsSection);
  });

  // --- Stagger fade-in for feature cards ---
  requestAnimationFrame(() => {
    const featuresSection = page.querySelector('#landing-features');
    if (featuresSection) {
      const featureObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            staggerFadeIn(featuresSection, '[data-phase]', 100);
            featureObserver.disconnect();
          }
        });
      }, { threshold: 0.15 });
      featureObserver.observe(featuresSection);
    }

    // Trust cards stagger
    const trustSection = page.querySelector('#landing-trust');
    if (trustSection) {
      const trustObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            staggerFadeIn(trustSection, '[data-trust]', 120);
            trustObserver.disconnect();
          }
        });
      }, { threshold: 0.15 });
      trustObserver.observe(trustSection);
    }
  });

  return page;
}
