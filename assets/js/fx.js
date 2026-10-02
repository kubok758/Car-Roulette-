/*
 * CAR ROULETTE — эффекты: синтезированный звук, вибрация, конфетти.
 * Ничего не загружается из сети: все звуки генерируются Web Audio API.
 */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Звук                                                                */
  /* ------------------------------------------------------------------ */

  const Sound = {
    enabled: true,
    volume: 0.6,
    ctx: null,
    master: null,
    noiseBuffer: null,

    /** Создаёт AudioContext после первого жеста пользователя. */
    unlock() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return;
      }
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);
        const len = Math.floor(this.ctx.sampleRate * 0.25);
        this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      } catch {
        this.ctx = null;
      }
    },

    setVolume(v) {
      this.volume = v;
      if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
    },

    ready() {
      return this.enabled && this.volume > 0 && this.ctx && this.ctx.state === 'running';
    },

    tone(freq, dur, { type = 'sine', gain = 0.2, at = 0, slide = 0, attack = 0.005 } = {}) {
      if (!this.ready()) return;
      const t = this.ctx.currentTime + at;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },

    noise(dur, { gain = 0.2, at = 0, freq = 2000, q = 1, type = 'bandpass' } = {}) {
      if (!this.ready() || !this.noiseBuffer) return;
      const t = this.ctx.currentTime + at;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter).connect(g).connect(this.master);
      src.start(t);
      src.stop(t + dur + 0.02);
    },

    click() {
      this.tone(660, 0.05, { type: 'triangle', gain: 0.08 });
    },

    /** Щелчок барабана, когда очередной элемент проходит линию. */
    tick(reel) {
      this.noise(0.03, { gain: 0.16, freq: 2600 + reel * 500, q: 3 });
      this.tone(1300 + reel * 160, 0.025, { type: 'square', gain: 0.025 });
    },

    /** Остановка барабана. */
    stop(reel) {
      this.tone(190 - reel * 20, 0.22, { type: 'sine', gain: 0.35, slide: 0.5 });
      this.noise(0.08, { gain: 0.2, freq: 900, q: 0.8 });
    },

    win(rarity) {
      const scales = [
        [523.25, 659.25],
        [523.25, 659.25, 783.99],
        [523.25, 659.25, 783.99, 1046.5],
        [392, 523.25, 659.25, 783.99, 1046.5],
        [392, 523.25, 659.25, 783.99, 1046.5, 1318.5],
        [261.63, 392, 523.25, 659.25, 783.99, 1046.5, 1318.5, 1568],
      ];
      const notes = scales[rarity] || scales[0];
      const step = rarity >= 4 ? 0.09 : 0.075;
      notes.forEach((f, i) => {
        this.tone(f, 0.32 + rarity * 0.04, { type: 'triangle', gain: 0.16, at: i * step });
        if (rarity >= 3) this.tone(f * 2, 0.25, { type: 'sine', gain: 0.05, at: i * step + 0.01 });
      });
      if (rarity >= 4) {
        const end = notes.length * step;
        [1, 1.25, 1.5].forEach((m) => this.tone(notes[notes.length - 1] * m * 0.5, 1.4, { type: 'sawtooth', gain: 0.035, at: end, attack: 0.05 }));
        this.noise(1.2, { gain: 0.05, at: end, freq: 6000, q: 0.5, type: 'highpass' });
      }
    },

    achievement() {
      [880, 1108.73, 1318.51].forEach((f, i) => this.tone(f, 0.35, { type: 'sine', gain: 0.12, at: i * 0.07 }));
    },

    error() {
      this.tone(220, 0.18, { type: 'square', gain: 0.05, slide: 0.7 });
    },
  };

  /* ------------------------------------------------------------------ */
  /* Вибрация                                                            */
  /* ------------------------------------------------------------------ */

  const Haptics = {
    enabled: true,
    supported: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function',
    pulse(pattern) {
      if (!this.enabled || !this.supported) return;
      try {
        navigator.vibrate(pattern);
      } catch {
        /* браузер может запретить вибрацию — это не ошибка */
      }
    },
  };

  /* ------------------------------------------------------------------ */
  /* Конфетти                                                            */
  /* ------------------------------------------------------------------ */

  const Confetti = {
    canvas: null,
    ctx: null,
    parts: [],
    raf: 0,
    dpr: 1,

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      const resize = () => {
        this.dpr = Math.min(2, root.devicePixelRatio || 1);
        canvas.width = Math.floor(root.innerWidth * this.dpr);
        canvas.height = Math.floor(root.innerHeight * this.dpr);
      };
      resize();
      root.addEventListener('resize', resize);
    },

    /**
     * Запускает залп конфетти.
     * @param {number} x, y — точка в CSS-пикселях
     * @param {string[]} colors
     * @param {number} count
     */
    burst(x, y, colors, count) {
      if (!this.ctx) return;
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
        const speed = 6 + Math.random() * 11;
        this.parts.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          w: 5 + Math.random() * 6,
          h: 8 + Math.random() * 10,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.35,
          tilt: Math.random() * Math.PI,
          vt: 0.05 + Math.random() * 0.12,
          color: colors[i % colors.length],
          life: 0,
          ttl: 140 + Math.random() * 90,
          round: Math.random() < 0.25,
        });
      }
      if (!this.raf) this.raf = requestAnimationFrame(() => this.frame());
    },

    frame() {
      const { ctx, canvas, dpr } = this;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const h = canvas.height / dpr;
      this.parts = this.parts.filter((p) => p.life < p.ttl && p.y < h + 40);
      for (const p of this.parts) {
        p.life++;
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + 0.32;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.tilt += p.vt;
        const fade = p.life > p.ttl - 30 ? (p.ttl - p.life) / 30 : 1;
        ctx.save();
        ctx.globalAlpha = Math.max(0, fade);
        ctx.translate(p.x * dpr, p.y * dpr);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, (p.w / 2) * dpr, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.scale(1, Math.cos(p.tilt));
          ctx.fillRect((-p.w / 2) * dpr, (-p.h / 2) * dpr, p.w * dpr, p.h * dpr);
        }
        ctx.restore();
      }
      if (this.parts.length) this.raf = requestAnimationFrame(() => this.frame());
      else {
        this.raf = 0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    },
  };

  /* ------------------------------------------------------------------ */
  /* Кривая Безье для анимации барабанов                                 */
  /* ------------------------------------------------------------------ */

  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    const solve = (x) => {
      let t = x;
      for (let i = 0; i < 8; i++) {
        const err = sx(t) - x;
        const d = dx(t);
        if (Math.abs(err) < 1e-6) return t;
        if (Math.abs(d) < 1e-6) break;
        t -= err / d;
      }
      let lo = 0;
      let hi = 1;
      t = x;
      while (lo < hi) {
        const v = sx(t);
        if (Math.abs(v - x) < 1e-6) return t;
        if (x > v) lo = t;
        else hi = t;
        t = (lo + hi) / 2;
        if (hi - lo < 1e-7) break;
      }
      return t;
    };
    return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : sy(solve(x)));
  }

  root.CarFx = { Sound, Haptics, Confetti, bezier };
})(typeof window !== 'undefined' ? window : globalThis);
