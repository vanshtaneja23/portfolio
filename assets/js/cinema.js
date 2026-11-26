/* Cinema: scroll-scrubbed scenes + a 3D particle field that morphs into a
   different shape for every section. No dependencies. */
(() => {
  "use strict";

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const root = document.documentElement;

  /* ---------- DOM prep ---------- */
  document.querySelectorAll(".scene").forEach((s) => s.style.setProperty("--len", s.dataset.len || 2));

  const manifesto = document.querySelector('[data-fx="words"]');
  const words = [];
  if (manifesto) {
    const parts = manifesto.textContent.trim().split(/\s+/);
    manifesto.textContent = "";
    parts.forEach((w, i) => {
      const s = document.createElement("span");
      s.className = "w";
      s.textContent = w;
      manifesto.appendChild(s);
      if (i < parts.length - 1) manifesto.appendChild(document.createTextNode(" "));
      words.push(s);
    });
  }

  // Generic reveal-on-enter
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
    { rootMargin: "0px 0px -12% 0px" }
  );
  document.querySelectorAll('[data-fx="rise"]').forEach((el) => io.observe(el));

  if (reduce) {
    document.getElementById("field").style.display = "none";
    return;
  }

  // Headlines decode out of random glyphs the first time they appear
  const glyphs = "!<>-_/[]{}=+*^?#01ABXZ";
  const scramble = (el) => {
    const final = el.textContent, t0 = performance.now(), dur = 700;
    const tick = () => {
      const f = (performance.now() - t0) / dur;
      if (f >= 1) { el.textContent = final; return; }
      el.textContent = [...final].map((ch, i) =>
        ch === " " || i < final.length * f ? ch : glyphs[(Math.random() * glyphs.length) | 0]
      ).join("");
      requestAnimationFrame(tick);
    };
    tick();
  };
  const sio = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { sio.unobserve(e.target); scramble(e.target); }
  }), { threshold: 0.3 });
  document.querySelectorAll(".project h3, .giant, .chapter-title").forEach((el) => sio.observe(el));

  /* ---------- scroll effects ---------- */
  const scenes = [...document.querySelectorAll(".scene")].map((el) => ({
    el,
    q: (sel) => [...el.querySelectorAll(sel)],
  }));
  const shapeEls = [...document.querySelectorAll("[data-shape]")];
  const rows = [...document.querySelectorAll(".row")];
  const timeline = document.querySelector(".timeline");

  const sceneProgress = (el) => {
    const r = el.getBoundingClientRect();
    const total = r.height - innerHeight;
    return total > 0 ? clamp(-r.top / total) : r.top < 0 ? 1 : 0;
  };
  const set = (el, o, t, blur) => {
    el.style.opacity = o;
    el.style.transform = t;
    el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
  };

  let flashG = 0; // pulsar flash strength, shared with the hero name
  // Pulsar readout: live rotation count, period, pulses and a scrolling pulse trace
  const SPIN = 2.1; // rad/s
  const psr = {
    rot: document.querySelector('[data-psr="rot"]'),
    pulses: document.querySelector('[data-psr="pulses"]'),
    trace: document.querySelector(".psr-trace"),
    angle: 0, shownRot: -1, pulseCount: 0, wasHigh: false, acc: 0, samples: new Float32Array(120),
  };
  const period = document.querySelector('[data-psr="period"]');
  if (period) period.textContent = `${((Math.PI * 2) / SPIN).toFixed(2)} s`;
  const tctx = psr.trace && psr.trace.getContext("2d");
  function updatePsr(dt) {
    psr.angle += dt * SPIN;
    const r = Math.floor(psr.angle / (Math.PI * 2));
    if (r !== psr.shownRot) { psr.shownRot = r; psr.rot.textContent = r.toLocaleString(); }
    const high = flashG > 0.6;
    if (high && !psr.wasHigh) psr.pulses.textContent = (++psr.pulseCount).toLocaleString();
    psr.wasHigh = high;
    root.style.setProperty("--flash", flashG.toFixed(2));
    if (!tctx) return;
    // push samples at ~60 per second, then redraw the whole trace as a line
    psr.acc += dt * 60;
    while (psr.acc >= 1) {
      psr.acc -= 1;
      psr.samples.copyWithin(0, 1);
      psr.samples[psr.samples.length - 1] = flashG;
    }
    const w = psr.trace.width, h = psr.trace.height, n = psr.samples.length;
    tctx.clearRect(0, 0, w, h);
    tctx.lineWidth = 1.5;
    tctx.strokeStyle = "hsl(228,100%,76%)";
    tctx.shadowColor = "hsl(228,100%,70%)";
    tctx.shadowBlur = 6;
    tctx.beginPath();
    for (let k = 0; k < n; k++) {
      const v = psr.samples[k];
      const y = h - 4 - v * v * (h - 10);
      const x = (k / (n - 1)) * w;
      k ? tctx.lineTo(x, y) : tctx.moveTo(x, y);
    }
    tctx.stroke();
  }
  function applyScene(s, p) {
    s.q('[data-fx="fade-out"]').forEach((el) => (el.style.opacity = 1 - range(p, 0, 0.12)));

    s.q('[data-fx="hero-name"]').forEach((el) => {
      const t = ease(range(p, 0, 0.5));
      set(el, 1 - range(p, 0.18, 0.45), `scale(${1 + t * 5}) translateZ(0)`, t * 18);
      if (flashG > 0.02) {
        const blur = t * 18 > 0.05 ? `blur(${(t * 18).toFixed(2)}px) ` : "";
        el.style.filter = `${blur}drop-shadow(0 0 ${(flashG * 36).toFixed(1)}px hsla(228,100%,78%,${(flashG * 0.85).toFixed(2)}))`;
      }
    });
    s.q('[data-fx="hero-after"]').forEach((el) => {
      const t = ease(range(p, 0.42, 0.68));
      set(el, t, `translateY(calc(-50% + ${(1 - t) * 60}px)) scale(${0.92 + t * 0.08})`, (1 - t) * 10);
    });

    if (words.length && s.el.contains(manifesto)) {
      const lit = Math.floor(range(p, 0.08, 0.85) * words.length);
      words.forEach((w, i) => w.classList.toggle("on", i < lit));
    }

    s.q('[data-fx="stats"] .stat').forEach((el, i, all) => {
      const t = p * all.length - i;
      if (t < 0 || t > 1) {
        const keep = i === all.length - 1 && t > 1;
        el.style.opacity = keep ? 1 : 0;
        if (!keep) return;
      }
      const tt = clamp(t);
      const inO = range(tt, 0, 0.22);
      const outO = i === all.length - 1 ? 1 : 1 - range(tt, 0.78, 1);
      const o = Math.min(inO, outO);
      set(el, o, `scale(${lerp(0.55, 1.18, ease(tt))})`, (1 - o) * 14);
    });

    s.q('[data-fx="htrack"]').forEach((el) => {
      const max = el.scrollWidth - innerWidth;
      el.style.transform = `translate3d(${-ease(range(p, 0.06, 0.94)) * max}px,0,0)`;
    });

    s.q('[data-fx="project"]').forEach((el) => {
      const a = ease(range(p, 0, 0.28));
      const b = ease(range(p, 0.78, 1));
      set(el, a * (1 - b), `translateY(${(1 - a) * 90 - b * 70}px) scale(${0.96 + a * 0.04})`, (1 - a) * 12 + b * 10);
    });

    s.q('[data-fx="giant"]').forEach((el) => {
      const t = ease(range(p, 0, 0.38));
      set(el, range(p, 0, 0.15), `scale(${2.6 - t * 1.6}) translateY(${(1 - t) * -4}vh)`, (1 - t) * 16);
    });
    s.q('[data-fx="prs"]').forEach((el) => {
      const t = ease(range(p, 0.36, 0.6));
      set(el, t, `translateY(${(1 - t) * 60}px)`, (1 - t) * 8);
    });

    s.q('[data-fx="contact"]').forEach((el) => {
      const t = ease(range(p, 0, 0.55));
      set(el, t, `scale(${0.5 + t * 0.5})`, (1 - t) * 14);
    });
  }

  /* ---------- particle shapes (unit scale) ---------- */
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d");
  const N = innerWidth < 760 ? 1400 : 2600;
  const rnd = Math.random;
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;

  const makeShape = (fn) => {
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const [x, y, z] = fn(i);
      a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
    }
    return a;
  };
  const onSphere = (r = 1) => {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    return [r * s * Math.cos(th), r * u, r * s * Math.sin(th)];
  };
  const onSegment = (a, b, j = 0.015) => {
    const t = rnd();
    return [lerp(a[0], b[0], t) + gauss() * j, lerp(a[1], b[1], t) + gauss() * j, lerp(a[2], b[2], t) + gauss() * j];
  };
  const onBox = (cx, cy, cz, w, h, d) => {
    // random point on the surface of an axis-aligned box
    const areas = [w * h, w * h, w * d, w * d, h * d, h * d];
    let k = rnd() * areas.reduce((a, b) => a + b), f = 0;
    while (f < 5 && k > areas[f]) k -= areas[f++];
    const u = rnd() - 0.5, v = rnd() - 0.5;
    switch (f) {
      case 0: return [cx + u * w, cy + v * h, cz + d / 2];
      case 1: return [cx + u * w, cy + v * h, cz - d / 2];
      case 2: return [cx + u * w, cy + h / 2, cz + v * d];
      case 3: return [cx + u * w, cy - h / 2, cz + v * d];
      case 4: return [cx + w / 2, cy + u * h, cz + v * d];
      default: return [cx - w / 2, cy + u * h, cz + v * d];
    }
  };
  const graph = (nodes, edges, nodeR, nodeShare) => (i) => {
    if (rnd() < nodeShare) {
      const n = nodes[i % nodes.length];
      const [x, y, z] = onSphere(nodeR);
      return [n[0] + x, n[1] + y, n[2] + z];
    }
    const [a, b] = edges[i % edges.length];
    return onSegment(nodes[a], nodes[b], 0.008);
  };

  const shapes = {};
  let constNodes = [];
  shapes.sphere = makeShape((i) => {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / N), th = Math.PI * (1 + Math.sqrt(5)) * i;
    return [Math.cos(th) * Math.sin(phi), Math.cos(phi), Math.sin(th) * Math.sin(phi)];
  });
  // Pulsar: 60% of points form a dense neutron-star core, the rest stream along two polar beams
  const isBeam = (i) => i % 20 >= 12;
  const isField = (i) => i % 20 >= 10 && i % 20 < 12;
  shapes.pulsar = makeShape((i) => {
    if (isBeam(i)) return [0, 0, 0];
    if (isField(i)) {
      // dipole field line r = L sin^2(theta), in the magnetic frame (axis = y), tilted later
      const loop = i % 6, L = 1.05 + (loop % 3) * 0.32, th = 0.25 + rnd() * (Math.PI - 0.5);
      const r = L * Math.sin(th) ** 2, ph = (loop / 6) * Math.PI * 2;
      const lx = r * Math.sin(th) * Math.cos(ph), ly = r * Math.cos(th), lz = r * Math.sin(th) * Math.sin(ph);
      // tilt the loop so it wraps the magnetic axis, not the spin axis
      const A = 0.42;
      return [lx * Math.cos(A) + ly * Math.sin(A), -lx * Math.sin(A) + ly * Math.cos(A), lz];
    }
    const r = 0.36 * (i % 3 ? 1 : Math.cbrt(rnd()));
    return onSphere(r);
  });
  // ---- space objects ----
  // Spiral galaxy: bulge + log-spiral arms (static; the scene's tilt shows it at an angle)
  const spiral = (arms, R, bulge, twist, bar = 0) => () => {
    if (rnd() < bulge) {
      const [x, y, z] = onSphere(0.16 + rnd() * 0.08);
      return [x * (1 + bar * 2.2), y * 0.45, z];
    }
    const arm = (rnd() * arms) | 0, r = 0.22 + Math.pow(rnd(), 0.75) * R;
    const a = (arm * Math.PI * 2) / arms + Math.log(r + 0.3) * twist + gauss() * (0.32 - r * 0.06);
    return [Math.cos(a) * r, gauss() * 0.04 * (R - r + 0.3), Math.sin(a) * r];
  };
  shapes.andromeda = makeShape(spiral(2, 1.5, 0.22, 3.2));
  shapes.milkyway = makeShape(spiral(4, 1.45, 0.18, 2.6, 1));
  // Merger: each point belongs to one of two smaller spirals; offsets applied over time
  shapes.merger = makeShape(spiral(2, 0.75, 0.25, 3.0));

  // Constellation: the ION work-area tree drawn as linked stars
  {
    const nodes = [[0, 1.15, 0]], edges = [];
    [-1, 0, 1].forEach((x, a) => {
      nodes.push([x * 1.05, 0.3, 0]); edges.push([0, nodes.length - 1]);
      const p = nodes.length - 1;
      [-1, 0, 1].forEach((d) => {
        nodes.push([x * 1.05 + d * 0.32, -0.6, (a - 1) * 0.15]); edges.push([p, nodes.length - 1]);
      });
    });
    constNodes = nodes;
    shapes.constellation = makeShape((i) => {
      const g = i % 10;
      if (g < 3) return [(rnd() - 0.5) * 5.5, (rnd() - 0.5) * 3.2, (rnd() - 0.5) * 0.6]; // faint background stars
      if (g < 5) { const n = nodes[i % nodes.length]; return [n[0] + gauss() * 0.018, n[1] + gauss() * 0.018, n[2]]; } // star cores
      const [a, b] = edges[i % edges.length];
      return onSegment(nodes[a], nodes[b], 0.003); // thin connecting lines
    });
  }

  // Orion Nebula: soft overlapping gas clouds around a tight cluster of young stars (Trapezium)
  {
    const clouds = [[0, 0, 0, 0.55], [-0.6, 0.35, 0.1, 0.4], [0.55, -0.25, -0.1, 0.45], [0.2, 0.6, -0.2, 0.3], [-0.35, -0.55, 0.2, 0.35]];
    shapes.nebula = makeShape((i) => {
      if (i % 12 === 0) return [gauss() * 0.06, gauss() * 0.06, gauss() * 0.06];
      const c = clouds[i % clouds.length];
      return [c[0] + gauss() * c[3] * 1.3, c[1] + gauss() * c[3] * 0.8, c[2] + gauss() * c[3] * 0.5];
    });
  }

  // Saturn: planet + ring system with the Cassini division, tilted ~27 degrees
  shapes.saturn = makeShape((i) => {
    if (i % 10 < 4) return onSphere(0.46);
    let r;
    do r = 0.62 + rnd() * 0.62; while (r > 0.95 && r < 1.0); // Cassini division
    const a = rnd() * Math.PI * 2, T = 0.47;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = gauss() * 0.006;
    return [x, y * Math.cos(T) - z * Math.sin(T), y * Math.sin(T) + z * Math.cos(T)];
  });

  // Observable universe: the cosmic web, clusters joined by filaments
  {
    const nodes = Array.from({ length: 34 }, () => { const [x, y, z] = onSphere(0.4 + Math.cbrt(rnd()) * 1.0); return [x, y, z]; });
    const edges = [];
    nodes.forEach((n, a) => {
      nodes.map((m, b) => [b, Math.hypot(n[0] - m[0], n[1] - m[1], n[2] - m[2])])
        .filter(([b]) => b !== a).sort((u, v) => u[1] - v[1]).slice(0, 2)
        .forEach(([b]) => edges.push([a, b]));
    });
    shapes.universe = makeShape(graph(nodes, edges, 0.07, 0.35));
  }

  // Einstein ring: a background galaxy's light bent into a ring around a foreground lens
  shapes.einstein = makeShape((i) => {
    if (i % 8 === 0) return [gauss() * 0.07, gauss() * 0.07, gauss() * 0.03];
    const a = rnd() * Math.PI * 2, r = 1 + gauss() * 0.025 * (1 + Math.sin(a * 3) * 0.6);
    return [Math.cos(a) * r, Math.sin(a) * r, gauss() * 0.02];
  });

  // Dynamic objects: base positions are placeholders, real targets come from shapeT()
  shapes.solar = makeShape((i) => (i % 20 < 5 ? onSphere(0.18 * Math.cbrt(rnd())) : [0, 0, 0]));
  shapes.sgra = makeShape(() => [0, 0, 0]);
  shapes.ton618 = shapes.sgra;

  // Shapes that should stay facing the viewer (they sway instead of spinning)
  const flat = new Set(["constellation", "einstein", "sgra", "ton618", "nebula"]);
  // Extra tilt per object so discs read at a nice angle
  const tiltX = { andromeda: 0.95, milkyway: 0.55, merger: 0.45, solar: 0.3, sgra: 0.1, ton618: 0.1, saturn: 0.05, universe: 0 };

  // Per-particle randomness, used for organic morph speed and explosions
  const seed = new Float32Array(N).map(() => rnd());
  const pos = new Float32Array(shapes.pulsar);
  const locked = new Uint8Array(N); // beam points that ride their target exactly
  const AX = 0.42, ax = [Math.sin(AX), Math.cos(AX), 0], au = [Math.cos(AX), -Math.sin(AX), 0];

  // Dynamic transforms that depend on the active scene's progress
  const tx = [0, 0, 0];
  let burst = 0;
  function dynamic(shape, i, x, y, z, p, time) {
    shapeT(shape, i, x, y, z, p, time);
    if (burst > 0.01) {
      const f = 1 + burst * (0.5 + seed[i] * 2.2);
      tx[0] *= f; tx[1] *= f; tx[2] *= f;
    }
  }
  function shapeT(shape, i, x, y, z, p, time) {
    switch (shape) {
      case "sphere": {
        const k = 1 + ease(range(p, 0.05, 0.7)) * (1.2 + seed[i] * 3.5);
        tx[0] = x * k; tx[1] = y * k; tx[2] = z * k; return;
      }
      case "pulsar": {
        const k = 1 + ease(range(p, 0.05, 0.7)) * (1.2 + seed[i] * 3.5);
        if (!isBeam(i)) {
          const pulse = 1 + 0.04 * Math.sin(time * 9 + seed[i] * 3);
          tx[0] = x * k * pulse; tx[1] = y * k * pulse; tx[2] = z * k * pulse; return;
        }
        // flow outward along the beam; each beam widens slightly with distance
        const side = i % 2 ? 1 : -1;
        const t = (seed[i] + time * 0.45) % 1;
        const d = 0.36 + t * 3.4;
        const w = (0.01 + t * t * 0.16) * Math.sqrt(seed[(i * 13) % N]);
        const ph = seed[(i * 7) % N] * Math.PI * 2, c = Math.cos(ph) * w, s2 = Math.sin(ph) * w;
        tx[0] = (ax[0] * side * d + au[0] * c) * k;
        tx[1] = (ax[1] * side * d + au[1] * c) * k;
        tx[2] = s2 * k;
        return;
      }
      case "solar": {
        const g = i % 20;
        if (g < 5) { tx[0] = x; tx[1] = y; tx[2] = z; return; }
        const k = i % 8, a = 0.36 + k * 0.16;
        if (g < 12) { // orbit paths
          const t = seed[i] * Math.PI * 2;
          tx[0] = Math.cos(t) * a; tx[1] = 0; tx[2] = Math.sin(t) * a; return;
        }
        // planets move with Kepler-like speeds (inner ones faster)
        const sizes = [0.02, 0.03, 0.035, 0.028, 0.09, 0.075, 0.05, 0.05];
        const ang = k * 2.1 + time * 0.9 * Math.pow(0.36 / a, 1.5);
        const s1 = seed[(i * 7) % N], s2 = seed[(i * 13) % N];
        const th = s1 * Math.PI * 2, ph = Math.acos(2 * s2 - 1);
        const ring = k === 5 && s1 < 0.45; // Saturn's rings
        const rr = ring ? 0.12 + s2 * 0.05 : sizes[k];
        tx[0] = Math.cos(ang) * a + (ring ? Math.cos(th) * rr : Math.sin(ph) * Math.cos(th) * rr);
        tx[1] = ring ? Math.sin(th) * rr * 0.25 : Math.cos(ph) * rr;
        tx[2] = Math.sin(ang) * a + (ring ? Math.sin(th) * rr * 0.9 : Math.sin(ph) * Math.sin(th) * rr);
        return;
      }
      case "sgra":
      case "ton618": {
        // accretion disc spinning faster near the hole, plus the lensed far side and photon ring
        const big = shape === "ton618" ? 1.25 : 1;
        const s1 = seed[i], s2 = seed[(i * 7) % N], s3 = seed[(i * 17) % N];
        const g = i % 10;
        if (g < 7) {
          const r = (0.46 + Math.pow(s1, 1.6) * (shape === "ton618" ? 1.35 : 1.05)) * big;
          const a = s2 * Math.PI * 2 + time * 1.4 * Math.pow(0.46 / r, 1.5);
          tx[0] = Math.cos(a) * r; tx[1] = (s3 - 0.5) * 0.025 * r; tx[2] = Math.sin(a) * r; return;
        }
        const r = (g === 9 ? 0.4 + (s3 - 0.5) * 0.01 : 0.5 + s1 * 0.28) * big;
        const a = s2 * Math.PI * 2 + time * 0.5;
        tx[0] = Math.cos(a) * r; tx[1] = Math.sin(a) * r * 0.92; tx[2] = -0.02; return;
      }
      case "merger": {
        // two spirals fall together and merge as the scene progresses
        const d = 1.05 * (1 - ease(range(p, 0.05, 0.6))), side = i % 2 ? 1 : -1;
        let X = x, Y = y, Z = z;
        if (side < 0) { const T = 0.9 * (1 - ease(range(p, 0.3, 0.8))); const y1 = Y * Math.cos(T) - Z * Math.sin(T); Z = Y * Math.sin(T) + Z * Math.cos(T); Y = y1; }
        const sp = 1 + (1 - d / 1.05) * 0.35;
        tx[0] = X * sp + side * d; tx[1] = Y * sp + side * d * 0.22; tx[2] = Z * sp; return;
      }
      case "einstein": {
        const k = 0.55 + ease(range(p, 0, 0.6)) * 0.75;
        tx[0] = x * k; tx[1] = y * k; tx[2] = z * k; return;
      }
      case "saturn":
      case "andromeda":
      case "milkyway": {
        // slow self-rotation about the disc axis
        const a = time * (shape === "saturn" ? 0.25 : 0.08);
        const c = Math.cos(a), sn = Math.sin(a);
        if (shape === "saturn" && i % 10 < 4) { tx[0] = x; tx[1] = y; tx[2] = z; return; }
        if (shape === "saturn") { // ring plane is tilted, spin within it
          const T = 0.47, yy = y * Math.cos(T) + z * Math.sin(T), zz = -y * Math.sin(T) + z * Math.cos(T);
          const x2 = x * c - zz * sn, z2 = x * sn + zz * c;
          tx[0] = x2; tx[1] = yy * Math.cos(T) - z2 * Math.sin(T); tx[2] = yy * Math.sin(T) + z2 * Math.cos(T); return;
        }
        tx[0] = x * c - z * sn; tx[1] = y; tx[2] = x * sn + z * c; return;
      }
      default:
        tx[0] = x; tx[1] = y; tx[2] = z;
    }
  }

  /* ---------- render loop ---------- */
  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener("resize", resize);

  let mx = 0, my = 0, px0 = -9999, py0 = -9999;
  addEventListener("pointermove", (e) => {
    mx = e.clientX / W - 0.5; my = e.clientY / H - 0.5;
    px0 = e.clientX; py0 = e.clientY;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { px0 = py0 = -9999; });
  addEventListener("pointerdown", (e) => { if (!e.target.closest("a, button")) burst = 1.3; });

  const view = { cx: W / 2, cy: H / 2, R: Math.min(W, H) * 0.3, hue: 210 };
  let rotY = 0, lastY = scrollY, vel = 0, last = performance.now();
  let active = shapeEls[0], activeP = 0, lastShape = "";
  const objHud = document.querySelector(".obj");

  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000);
    const fr = dt * 60; // frames' worth of time, so easing is frame-rate independent
    const ez = (k) => 1 - Math.pow(1 - k, fr);
    last = now;
    const time = now / 1000;

    // scroll state
    const sy = scrollY;
    vel = lerp(vel, (sy - lastY) / Math.max(fr, 0.5), ez(0.2));
    lastY = sy;
    root.style.setProperty("--doc", clamp(sy / (root.scrollHeight - H)));

    for (const s of scenes) {
      const r = s.el.getBoundingClientRect();
      if (r.bottom > -H * 0.2 && r.top < H * 1.2) applyScene(s, sceneProgress(s.el));
    }

    for (const el of shapeEls) {
      const r = el.getBoundingClientRect();
      if (r.top <= H * 0.5 && r.bottom > H * 0.5) { active = el; break; }
    }
    activeP = active.classList.contains("scene") ? sceneProgress(active) : 0;
    const shape = active.dataset.shape;
    const target = shapes[shape] || shapes.pulsar;
    if (shape !== lastShape) {
      if (lastShape) burst = Math.max(burst, 0.9);
      lastShape = shape; locked.fill(0);
      // swap the object label: fade out, change text, fade in
      const [name, dist, fact, why] = (active.dataset.obj || "").split("|");
      objHud.classList.remove("on");
      clearTimeout(objHud._t);
      if (name) objHud._t = setTimeout(() => {
        objHud.querySelector(".obj-name").textContent = name;
        objHud.querySelector(".obj-dist").textContent = dist || "";
        objHud.querySelector(".obj-fact").textContent = fact || "";
        objHud.querySelector(".obj-why").textContent = why || "";
        objHud.classList.add("on");
      }, 350);
    }
    burst *= Math.pow(0.9, fr);

    // skills rows and timeline progress
    if (rows.length) {
      const r = rows[0].closest("section").getBoundingClientRect();
      const t = (H - r.top) / (H + r.height);
      rows.forEach((row) => (row.style.transform = `translate3d(${(+row.dataset.dir * (t - 0.5) * -40).toFixed(2)}vw,0,0)`));
    }
    if (timeline) {
      const r = timeline.getBoundingClientRect();
      timeline.style.setProperty("--draw", clamp((H * 0.65 - r.top) / r.height));
    }

    // layout: project scenes push the object right on wide screens
    const wide = W > 760;
    const isProject = active.classList.contains("scene-project");
    let tcx = isProject && wide ? W * 0.72 : W * 0.5;
    // the constellation drifts with ION's sideways scroll, like looking across the sky
    if (shape === "constellation") tcx = W * 0.5 - (activeP - 0.5) * W * 0.35;
    const tcy = isProject && !wide ? H * 0.2 : H * 0.5;
    let tR = Math.min(W, H) * (isProject ? (wide ? 0.3 : 0.2) : 0.34);
    if (shape === "constellation") tR = Math.min(W * 0.32, H * 0.42);
    if (shape === "universe" || shape === "milkyway") tR = Math.min(W, H) * 0.4;
    view.cx = lerp(view.cx, tcx, ez(0.06));
    view.cy = lerp(view.cy, tcy, ez(0.06));
    view.R = lerp(view.R, tR, ez(0.06));
    const th = +active.dataset.hue || 210;
    const dh = ((th - view.hue + 540) % 360) - 180;
    view.hue = (view.hue + dh * ez(0.05) + 360) % 360;
    root.style.setProperty("--hue", view.hue.toFixed(1));

    rotY += vel * 0.0012;
    if (flat.has(shape)) {
      const want = Math.sin(time * 0.6) * 0.45;
      const diff = Math.atan2(Math.sin(want - rotY), Math.cos(want - rotY));
      rotY += diff * ez(0.05);
    } else rotY += dt * (shape === "pulsar" ? SPIN : 0.22);
    const rotX = 0.32 + my * 0.5 + (tiltX[shape] || 0) - (flat.has(shape) ? 0.3 : 0);
    const ry = rotY + mx * 0.8;
    const cY = Math.cos(ry), sY = Math.sin(ry), cX = Math.cos(rotX), sX = Math.sin(rotX);

    // trails: a translucent wipe instead of a clear; faster scroll = longer streaks
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(0,0,0,${ez(clamp(0.42 - Math.abs(vel) * 0.004, 0.14, 0.42))})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    const kz = Array.from({ length: 16 }, (_, b) => ez(0.035 + (b / 15) * 0.07));
    const buckets = Array.from({ length: 12 }, () => []);
    const RR = Math.min(170, W * 0.2), RR2 = RR * RR;
    const dist = 3.4, fov = 3.0;
    for (let i = 0; i < N; i++) {
      const j = i * 3;
      dynamic(shape, i, target[j], target[j + 1], target[j + 2], activeP, time);
      const k = kz[(seed[i] * 15.99) | 0];
      if (shape === "pulsar" && isBeam(i)) {
        if (!locked[i] && Math.abs(tx[0] - pos[j]) + Math.abs(tx[1] - pos[j + 1]) + Math.abs(tx[2] - pos[j + 2]) < 0.12) locked[i] = 1;
        if (locked[i]) { pos[j] = tx[0]; pos[j + 1] = tx[1]; pos[j + 2] = tx[2]; }
      }
      pos[j] += (tx[0] - pos[j]) * k;
      pos[j + 1] += (tx[1] - pos[j + 1]) * k;
      pos[j + 2] += (tx[2] - pos[j + 2]) * k;

      const x = pos[j], y = pos[j + 1], z = pos[j + 2];
      const x1 = x * cY - z * sY, z1 = x * sY + z * cY;
      const y2 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
      const s = fov / (dist + z2);
      if (s <= 0) continue;
      let px = view.cx + x1 * view.R * s * 0.9, py = view.cy - y2 * view.R * s * 0.9;
      const dx = px - px0, dy = py - py0, d2 = dx * dx + dy * dy;
      if (d2 < RR2 && d2 > 0.01) {
        const d = Math.sqrt(d2), f = (1 - d / RR) ** 2 * 90 * (0.5 + seed[i]);
        px += (dx / d) * f; py += (dy / d) * f;
      }
      if (px < -10 || px > W + 10 || py < -10 || py > H + 10) continue;
      const b = shape === "pulsar" && isBeam(i) ? 3 : shape === "pulsar" && isField(i) ? 0 : clamp(Math.floor((s - 0.65) * 4.5), 0, 3);
      buckets[b * 3 + (i % 3)].push(px, py, s);
    }
    if (shape !== "pulsar") flashG = 0;
    if (shape === "pulsar") {
      const fade = 1 - range(activeP, 0.05, 0.5);
      if (fade > 0) {
        // magnetic axis after the same spin + tilt as the particles
        const ax1 = ax[0] * cY - ax[2] * sY, az1 = ax[0] * sY + ax[2] * cY;
        const ay2 = ax[1] * cX - az1 * sX, az2 = ax[1] * sX + az1 * cX;
        // lighthouse: flash when a beam swings toward the viewer
        const flash = Math.pow(clamp(Math.abs(az2) / 0.6), 4);
        flashG = flash * fade;
        const h = view.hue.toFixed(0), sc = view.R * 0.9;
        for (const side of [1, -1]) {
          const len = 3.4 * sc * fade;
          const s0 = fov / (dist + side * az2 * 3.4);
          const ex = view.cx + side * ax1 * len * s0, ey = view.cy - side * ay2 * len * s0;
          const lg = ctx.createLinearGradient(view.cx, view.cy, ex, ey);
          lg.addColorStop(0, `hsla(${h},100%,94%,${Math.min(1, 0.85 + flash * 0.15) * fade})`);
          lg.addColorStop(0.35, `hsla(${h},100%,74%,${(0.35 + flash * 0.35) * fade})`);
          lg.addColorStop(1, `hsla(${h},100%,60%,0)`);
          ctx.strokeStyle = lg;
          ctx.lineCap = "round";
          for (const [wd, a] of [[view.R * 0.16, 0.25], [view.R * 0.05, 0.7], [1.5, 1]]) {
            ctx.globalAlpha = a;
            ctx.lineWidth = wd * (1 + flash * 0.8);
            ctx.beginPath(); ctx.moveTo(view.cx, view.cy); ctx.lineTo(ex, ey); ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
        const g = ctx.createRadialGradient(view.cx, view.cy, 0, view.cx, view.cy, view.R * (0.75 + flash * 0.5));
        g.addColorStop(0, `hsla(${h},100%,95%,${(0.6 + flash * 0.3) * fade})`);
        g.addColorStop(0.18, `hsla(${h},100%,72%,${(0.2 + flash * 0.14) * fade})`);
        g.addColorStop(1, "hsla(0,0%,0%,0)");
        ctx.fillStyle = g;
        const gr = view.R * 1.7;
        ctx.fillRect(view.cx - gr, view.cy - gr, gr * 2, gr * 2);
      }
    }
    if (psr.rot && shape === "pulsar") updatePsr(dt);
    const lights = [30, 44, 58, 72], alphas = [0.28, 0.45, 0.7, 0.95];
    for (let q = 0; q < 12; q++) {
      const arr = buckets[q], b = (q / 3) | 0, h = view.hue + ((q % 3) - 1) * 40;
      ctx.fillStyle = `hsla(${h.toFixed(0)},95%,${lights[b]}%,${alphas[b]})`;
      for (let n = 0; n < arr.length; n += 3) {
        const sz = 0.7 + arr[n + 2] * 1.1;
        ctx.fillRect(arr[n], arr[n + 1], sz, sz);
      }
    }

    // constellation stars: glow + cross-shaped glints that twinkle
    if (shape === "constellation" && constNodes.length) {
      const h = view.hue.toFixed(0);
      constNodes.forEach(([x, y, z], k) => {
        const x1 = x * cY - z * sY, z1 = x * sY + z * cY;
        const y2 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
        const s = fov / (dist + z2);
        const px = view.cx + x1 * view.R * s * 0.9, py = view.cy - y2 * view.R * s * 0.9;
        const tw = 0.65 + 0.35 * Math.sin(time * 2.3 + k * 1.7);
        const big = k === 0 ? 1.5 : k < 4 ? 1.15 : 0.85; // root and branch stars are brighter
        const r = 16 * big * tw;
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, `hsla(${h},100%,96%,${0.95 * tw})`);
        g.addColorStop(0.25, `hsla(${h},100%,75%,${0.4 * tw})`);
        g.addColorStop(1, `hsla(${h},100%,60%,0)`);
        ctx.fillStyle = g;
        ctx.fillRect(px - r, py - r, r * 2, r * 2);
        ctx.strokeStyle = `hsla(${h},100%,90%,${0.55 * tw})`;
        ctx.lineWidth = 1;
        const L = r * 1.6;
        ctx.beginPath();
        ctx.moveTo(px - L, py); ctx.lineTo(px + L, py);
        ctx.moveTo(px, py - L); ctx.lineTo(px, py + L);
        ctx.stroke();
      });
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
