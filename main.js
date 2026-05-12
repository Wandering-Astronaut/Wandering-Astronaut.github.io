// ── CURSOR ──
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cursor.style.transform = `translate(${mx - 6}px, ${my - 6}px)`;
});

(function animateRing() {
  rx += (mx - rx) * 0.12;
  ry += (my - ry) * 0.12;
  ring.style.transform = `translate(${rx - 18}px, ${ry - 18}px)`;
  requestAnimationFrame(animateRing);
})();

// ── STARFIELD ──
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');
let W, H, stars = [];

function resizeCanvas() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

function initStars() {
  stars = [];
  const count = Math.floor((W * H) / 3000);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.4 + 0.2,
      alpha: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.015 + 0.005,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.9 ? '#22d3ee' : Math.random() > 0.85 ? '#f472b6' : '#f0f4ff'
    });
  }
}

let t = 0;
function drawStars() {
  ctx.clearRect(0, 0, W, H);
  t += 0.01;
  stars.forEach(s => {
    const a = s.alpha * (0.6 + 0.4 * Math.sin(t * s.speed * 50 + s.phase));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = s.color;
    ctx.globalAlpha = a;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  requestAnimationFrame(drawStars);
}

window.addEventListener('resize', () => { resizeCanvas(); initStars(); });
resizeCanvas();
initStars();
drawStars();

// ── SHOOTING STARS (canvas-based) ──
const ssCanvas = document.createElement('canvas');
ssCanvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;';
document.body.appendChild(ssCanvas);
const ssCtx = ssCanvas.getContext('2d');
let ssW, ssH;

function resizeSS() {
  ssW = ssCanvas.width = window.innerWidth;
  ssH = ssCanvas.height = window.innerHeight;
}
resizeSS();
window.addEventListener('resize', resizeSS);

// Active shooting star objects
const shootingStars = [];

const SS_COLORS = [
  { r:34,  g:211, b:238 },  // cosmic-cyan
  { r:244, g:114, b:182 },  // pulsar-pink
  { r:240, g:244, b:255 },  // star-white
  { r:251, g:191, b:36  },  // solar-gold
];

function spawnShootingStar(delay = 0) {
  // Pick random start from top-left quadrant area
  const startX = Math.random() * ssW * 0.85;
  const startY = Math.random() * ssH * 0.45;

  // Angle between 20–50 degrees (diagonal down-right)
  const angle = (20 + Math.random() * 30) * Math.PI / 180;
  const speed = 14 + Math.random() * 18;        // px per frame
  const length = 80 + Math.random() * 140;      // trail length
  const maxLife = Math.floor((length * 3.2) / speed);
  const col = SS_COLORS[Math.floor(Math.random() * SS_COLORS.length)];
  const thickness = 0.8 + Math.random() * 1.4;

  shootingStars.push({
    x: startX, y: startY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    length, thickness, col,
    life: 0, maxLife,
    delay,               // frames to wait before activating
    done: false,
    // trail history
    trail: []
  });
}

function spawnBurst(count = 1) {
  for (let i = 0; i < count; i++) {
    spawnShootingStar(i * 6); // slight stagger within burst
  }
}

// Interval pattern: single stars frequently, burst of 2–3 occasionally
let ssTimeout = null;

function scheduleNext() {
  const delay = 1800 + Math.random() * 2700;
  ssTimeout = setTimeout(() => {
    const isBurst = Math.random() < 0.28;
    spawnBurst(isBurst ? 2 + Math.floor(Math.random() * 2) : 1);
    scheduleNext();
  }, delay);
}

// Pause/clear when tab is hidden, resume cleanly when visible again
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Tab hidden — cancel pending timeout and wipe any queued stars
    clearTimeout(ssTimeout);
    shootingStars.length = 0;
  } else {
    // Tab visible again — clear the canvas and restart fresh after a short pause
    ssCtx.clearRect(0, 0, ssW, ssH);
    shootingStars.length = 0;
    ssTimeout = setTimeout(() => {
      spawnShootingStar(0);
      scheduleNext();
    }, 600);
  }
});

// Kick off: fire one immediately, then start scheduler
spawnShootingStar(0);
setTimeout(scheduleNext, 1200);

function drawShootingStars() {
  ssCtx.clearRect(0, 0, ssW, ssH);

  for (let s of shootingStars) {
    if (s.done) continue;

    // Honor delay
    if (s.delay > 0) { s.delay--; continue; }

    // Advance position
    s.x += s.vx;
    s.y += s.vy;
    s.life++;

    // Record trail point
    s.trail.push({ x: s.x, y: s.y });
    if (s.trail.length > 32) s.trail.shift();

    // Life-based opacity: fade in fast, hold, fade out
    let alpha;
    const fadeIn  = s.maxLife * 0.15;
    const fadeOut = s.maxLife * 0.55;
    if (s.life < fadeIn) {
      alpha = s.life / fadeIn;
    } else if (s.life < fadeOut) {
      alpha = 1;
    } else {
      alpha = 1 - (s.life - fadeOut) / (s.maxLife - fadeOut);
    }
    alpha = Math.max(0, Math.min(1, alpha));

    if (s.life >= s.maxLife) { s.done = true; continue; }

    const { r, g, b } = s.col;

    // ── Draw glowing trail ──
    if (s.trail.length > 1) {
      for (let i = 1; i < s.trail.length; i++) {
        const t = i / s.trail.length;              // 0=oldest, 1=newest
        const trailAlpha = alpha * t * t;          // quadratic fade toward tail
        const w = s.thickness * t;

        // Outer glow pass
        ssCtx.beginPath();
        ssCtx.moveTo(s.trail[i-1].x, s.trail[i-1].y);
        ssCtx.lineTo(s.trail[i].x, s.trail[i].y);
        ssCtx.strokeStyle = `rgba(${r},${g},${b},${trailAlpha * 0.35})`;
        ssCtx.lineWidth = w + 4;
        ssCtx.lineCap = 'round';
        ssCtx.shadowBlur = 0;
        ssCtx.stroke();

        // Core bright line
        ssCtx.beginPath();
        ssCtx.moveTo(s.trail[i-1].x, s.trail[i-1].y);
        ssCtx.lineTo(s.trail[i].x, s.trail[i].y);
        ssCtx.strokeStyle = `rgba(${r},${g},${b},${trailAlpha})`;
        ssCtx.lineWidth = w;
        ssCtx.stroke();
      }
    }

    // ── Draw bright head ──
    const headGlow = ssCtx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.thickness * 5);
    headGlow.addColorStop(0, `rgba(255,255,255,${alpha * 0.95})`);
    headGlow.addColorStop(0.3, `rgba(${r},${g},${b},${alpha * 0.8})`);
    headGlow.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ssCtx.beginPath();
    ssCtx.arc(s.x, s.y, s.thickness * 5, 0, Math.PI * 2);
    ssCtx.fillStyle = headGlow;
    ssCtx.fill();

    // Tiny bright core dot
    ssCtx.beginPath();
    ssCtx.arc(s.x, s.y, s.thickness * 1.2, 0, Math.PI * 2);
    ssCtx.fillStyle = `rgba(255,255,255,${alpha})`;
    ssCtx.fill();
  }

  // Cleanup done stars
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    if (shootingStars[i].done) shootingStars.splice(i, 1);
  }

  requestAnimationFrame(drawShootingStars);
}
drawShootingStars();

// ── TABS (About) ──
function switchTab(mode) {
  document.querySelectorAll('#about .tab-btn').forEach((b, i) => {
    b.classList.toggle('active', (i === 0 && mode === 'app') || (i === 1 && mode === 'web'));
  });
  document.getElementById('tab-app-text').classList.toggle('active', mode === 'app');
  document.getElementById('tab-web-text').classList.toggle('active', mode === 'web');
  document.getElementById('tab-app-skills').classList.toggle('active', mode === 'app');
  document.getElementById('tab-web-skills').classList.toggle('active', mode === 'web');

  const cvBtn = document.getElementById('about-cv-btn');
  if (cvBtn) {
    cvBtn.href = mode === 'app' ? cvBtn.dataset.appHref : cvBtn.dataset.webHref;
  }

  const heroCvBtn = document.getElementById('hero-cv-btn');
  if (heroCvBtn) {
    heroCvBtn.href = mode === 'app' ? heroCvBtn.dataset.appHref : heroCvBtn.dataset.webHref;
  }
}

// ── TABS (Projects) ──
function switchProjectTab(type) {
  document.querySelectorAll('#projects .tab-btn').forEach((b, i) => {
    const types = ['all', 'mobile', 'web'];
    b.classList.toggle('active', types[i] === type);
  });
  document.querySelectorAll('#project-grid .project-card').forEach(card => {
    const show = type === 'all' || card.dataset.type === type;
    card.style.display = show ? '' : 'none';
  });
}

// ── SCROLL REVEAL ──
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ── GITHUB CONTRIBUTION CHART (dark empty cells + rounded day squares) ──
// ghchart.rshah.org serves sharp rects; fetch SVG via CORS proxy, patch fills + rx/ry, then blob URL.
(function patchGhContributionChart() {
  const img = document.querySelector('img.gh-contrib-chart');
  if (!img) return;

  const remoteUrl = img.dataset.ghchartSrc || img.src;
  const emptyFill = img.dataset.ghEmptyFill || '#161b22';
  const labelFill = '#94a3b8';
  const proxy = 'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(remoteUrl);

  fetch(proxy)
    .then(r => {
      if (!r.ok) throw new Error('chart proxy');
      return r.text();
    })
    .then(svg => {
      if (typeof svg !== 'string' || !svg.includes('<svg')) return;
      // Rounded day cells (API uses sharp rects + crispedges; legend was never the target)
      const cellR = 2.5;
      const patched = svg
        .replace(/#EEEEEE/gi, emptyFill)
        .replace(/fill:#767676/gi, 'fill:' + labelFill)
        .replace(/shape-rendering:crispedges;?/gi, '')
        .replace(/<rect\s/g, `<rect rx="${cellR}" ry="${cellR}" `);
      const blob = new Blob([patched], { type: 'image/svg+xml;charset=utf-8' });
      img.src = URL.createObjectURL(blob);
    })
    .catch(() => {
      /* keep original <img src> (light empty cells) */
    });
})();

// ── GITHUB README STATS (embed fallback) ──
document.querySelectorAll('.gh-stats-remote').forEach(img => {
  img.addEventListener('error', function onGhStatImgError() {
    const media = this.closest('.gh-card-media');
    if (!media || media.dataset.ghFallback) return;
    media.dataset.ghFallback = '1';
    this.remove();
    const div = document.createElement('div');
    div.className = 'gh-fallback';
    div.innerHTML =
      'Stats image did not load (rate limits or browser blocking). ' +
      '<a href="https://github.com/Wandering-Astronaut" target="_blank" rel="noopener">View profile on GitHub</a>. ' +
      'For a reliable fix on GitHub Pages, deploy your own ' +
      '<a href="https://github.com/anuraghazra/github-readme-stats#deploy-on-your-own" target="_blank" rel="noopener">github-readme-stats</a> and point these images to your deployment.';
    media.appendChild(div);
  }, { once: true });
});

// ── PARALLAX PLANETS ──
window.addEventListener('mousemove', e => {
  const cx = e.clientX / window.innerWidth - 0.5;
  const cy = e.clientY / window.innerHeight - 0.5;
  document.querySelector('.planet-1').style.transform = `translate(${cx * -18}px, ${cy * -12}px)`;
  document.querySelector('.planet-2').style.transform = `translate(${cx * 14}px, ${cy * 10}px)`;
  document.querySelector('.planet-3').style.transform = `translate(${cx * 22}px, ${cy * 16}px)`;
});