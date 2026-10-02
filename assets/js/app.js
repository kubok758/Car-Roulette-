/*
 * CAR ROULETTE — интерфейс.
 * Работает без сборки и без сети: можно открыть index.html прямо с диска.
 */
(function () {
  'use strict';

  const Core = window.CarCore;
  const Fx = window.CarFx;
  const RAW = window.CAR_DB;

  if (!Core || !Fx || !RAW) {
    document.getElementById('app-error').hidden = false;
    return;
  }

  const db = Core.expandDb(RAW);
  const STORAGE_KEY = 'carRoulette.v4';
  const LEGACY_PREFIX = 'carRoulette.v3.';
  const REPO_URL = 'https://github.com/kubok758/Car-Roulette-';
  const RARITY_SHOUT = ['', '', 'Редкая!', 'Эпическая!', 'Легендарная!', 'Мифическая!'];
  const RARITY_COLORS = ['#b9bccb', '#4ade80', '#38bdf8', '#c084fc', '#fbbf24', '#fb7185'];

  /* ------------------------------------------------------------------ */
  /* Утилиты                                                             */
  /* ------------------------------------------------------------------ */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  const fmt = (n) => Number(n).toLocaleString('ru-RU');
  const collator = new Intl.Collator(['en', 'ru'], { numeric: true, sensitivity: 'base' });
  const byName = (a, b) => collator.compare(a, b);

  function plural(n, forms) {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  }

  const countLabel = (n, forms) => `${fmt(n)} ${plural(n, forms)}`;
  const CARS = ['машина', 'машины', 'машин'];
  const TIMES = ['раз', 'раза', 'раз'];
  const DAYS = ['день', 'дня', 'дней'];

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function oddsLabel(p) {
    if (!p) return '—';
    if (p >= 0.5) return `${Math.round(p * 100)}%`;
    return `1 из ${fmt(Math.max(1, Math.round(1 / p)))}`;
  }

  function percent(p, digits = 1) {
    if (!p) return '0%';
    const v = p * 100;
    if (v < 0.1) return '<0,1%';
    return `${v.toFixed(v >= 10 ? 0 : digits).replace('.', ',')}%`;
  }

  /* ------------------------------------------------------------------ */
  /* Иконки и силуэты                                                     */
  /* ------------------------------------------------------------------ */

  const ICONS = {
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    filter: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    play: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/>',
    wiki: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 8h.01M16 16h.01M12 12h.01M16 8h.01M8 16h.01"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    body: '<path d="M3 16v-3l2.5-5h13L21 13v3"/><path d="M3 16h18"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    wheel: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 14.5V21M9.6 11.2 3.4 9.8M14.4 11.2l6.2-1.4"/>',
    fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16"/><path d="M3 21h13M15 9h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3"/><path d="M7 7h5"/>',
    gauge: '<path d="M4 18a9 9 0 1 1 16 0"/><path d="m12 13 4-4"/><circle cx="12" cy="13" r="1"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
    soundOn: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
    soundOff: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m23 9-6 6M17 9l6 6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  };

  const icon = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  /* Силуэты в профиль, вид слева направо (нос справа). viewBox 0 0 160 60 */
  const LOW = [
    [38, 46, 8],
    [122, 46, 8],
  ];
  const TALL = [
    [40, 45, 9],
    [122, 45, 9],
  ];
  const SILHOUETTES = {
    sedan: {
      body: 'M10 46V38Q10 33 16 32L40 30 56 18Q60 16 66 16H92Q98 16 103 20L114 30 140 32Q150 33 150 39V46H132A10 10 0 0 0 112 46H48A10 10 0 0 0 28 46Z',
      glass: 'M45 30 58 20H98L109 30ZM78 20V30',
      wheels: LOW,
    },
    lift: {
      body: 'M10 46V38Q10 34 16 33L28 31 50 19Q56 16 64 16H92Q98 16 103 20L114 30 140 32Q150 33 150 39V46H132A10 10 0 0 0 112 46H48A10 10 0 0 0 28 46Z',
      glass: 'M34 30 52 20H98L109 30ZM76 20V30',
      wheels: LOW,
    },
    hatch: {
      body: 'M16 46V35Q16 31 20 29L36 17Q39 16 44 16H88Q94 16 99 20L112 30 140 32Q150 33 150 39V46H132A10 10 0 0 0 112 46H52A10 10 0 0 0 32 46Z',
      glass: 'M27 29 39 20H94L106 30ZM67 20V30',
      wheels: [
        [42, 46, 8],
        [122, 46, 8],
      ],
    },
    wagon: {
      body: 'M10 46V35Q10 29 13 25L17 18Q19 16 25 16H92Q98 16 103 20L114 30 140 32Q150 33 150 39V46H132A10 10 0 0 0 112 46H48A10 10 0 0 0 28 46Z',
      glass: 'M15 29 20 20H98L109 30ZM52 20V29M80 20V30',
      wheels: LOW,
    },
    coupe: {
      body: 'M10 46V39Q10 34 16 33L38 31Q50 20 62 18Q68 17 76 17H86Q94 18 102 24L112 31 142 33Q150 34 150 40V46H132A10 10 0 0 0 112 46H48A10 10 0 0 0 28 46Z',
      glass: 'M44 31Q54 22 64 21H86Q92 22 98 26L104 31Z',
      wheels: LOW,
    },
    super: {
      body: 'M8 46V41Q8 37 14 36L44 33Q60 22 74 21H86Q96 21 106 27L118 33 146 36Q152 37 152 42V46H134A10 10 0 0 0 114 46H50A10 10 0 0 0 30 46Z',
      glass: 'M52 32Q64 24 76 24H86Q94 24 102 29L106 32Z',
      wheels: [
        [40, 46, 8],
        [124, 46, 8],
      ],
    },
    cabrio: {
      body: 'M10 46V38Q10 32 18 31H96L104 20H107L102 31 140 33Q150 34 150 40V46H132A10 10 0 0 0 112 46H48A10 10 0 0 0 28 46Z',
      glass: 'M58 31Q58 24 65 24Q71 24 71 31M76 31Q76 25 82 25Q87 25 87 31',
      wheels: LOW,
    },
    xover: {
      body: 'M12 44V32Q12 26 18 24L24 14Q26 12 32 12H96Q102 12 107 17L116 27 140 29Q150 30 150 37V44H133A11 11 0 0 0 111 44H51A11 11 0 0 0 29 44Z',
      glass: 'M21 25 28 16H102L112 26ZM58 16V26M84 16V26',
      wheels: TALL,
    },
    suv: {
      body: 'M12 44V16Q12 12 16 12H98Q102 12 104 15L112 26 142 28Q150 29 150 36V44H133A11 11 0 0 0 111 44H51A11 11 0 0 0 29 44Z',
      glass: 'M18 25V17H96L104 26ZM50 17V25M76 17V25',
      wheels: TALL,
    },
    pickup: {
      body: 'M10 44V28H70V15Q70 12 74 12H98Q102 12 104 15L112 26 142 28Q150 29 150 36V44H133A11 11 0 0 0 111 44H51A11 11 0 0 0 29 44Z',
      glass: 'M76 25V17H96L104 26Z',
      wheels: TALL,
    },
    minivan: {
      body: 'M10 44V18Q10 12 18 12H100Q108 12 116 20L128 28 142 30Q150 31 150 37V44H133A11 11 0 0 0 111 44H51A11 11 0 0 0 29 44Z',
      glass: 'M16 25V17H101L113 27ZM46 17V25M76 17V26',
      wheels: TALL,
    },
    van: {
      body: 'M10 44V10Q10 6 16 6H112Q118 6 122 12L130 24 144 27Q150 28 150 35V44H133A11 11 0 0 0 111 44H51A11 11 0 0 0 29 44Z',
      glass: 'M113 11H118L126 24H113ZM10 30H112',
      wheels: TALL,
    },
  };
  const BODY_SHAPE = {
    sedan: 'sedan',
    lift: 'lift',
    hatch: 'hatch',
    wagon: 'wagon',
    coupe: 'coupe',
    cabrio: 'cabrio',
    roadster: 'cabrio',
    xover: 'xover',
    suv: 'suv',
    pickup: 'pickup',
    minivan: 'minivan',
    van: 'van',
  };

  function shapeOf(car) {
    const body = car.bodies[0];
    if ((car.cls === 'SC' || car.cls === 'HC') && (body === 'coupe' || body === 'roadster' || body === 'cabrio')) {
      return body === 'coupe' ? 'super' : 'cabrio';
    }
    return BODY_SHAPE[body] || 'sedan';
  }

  function silhouette(car, extraClass = '') {
    const s = SILHOUETTES[shapeOf(car)];
    const wheels = s.wheels
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/><circle cx="${x}" cy="${y}" r="${(r * 0.3).toFixed(1)}"/>`)
      .join('');
    return `<svg class="silhouette ${extraClass}" viewBox="0 0 160 60" aria-hidden="true"><path class="ground" d="M2 54.5H158"/><path d="${s.body}"/><path class="glass" d="${s.glass}"/>${wheels}</svg>`;
  }

  /* ------------------------------------------------------------------ */
  /* Хранилище                                                           */
  /* ------------------------------------------------------------------ */

  const storage = {
    ok: true,
    read(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        this.ok = false;
        return null;
      }
    },
    write(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        this.ok = false;
        return false;
      }
    },
  };

  function loadState() {
    const saved = storage.read(STORAGE_KEY);
    if (saved) {
      try {
        return Core.sanitizeState(JSON.parse(saved), db);
      } catch {
        /* повреждённые данные — начнём заново, но не затираем их до первого сохранения */
      }
    }
    const legacy = {};
    let hasLegacy = false;
    for (const k of ['history', 'favorites', 'discovered', 'stats', 'settings']) {
      const v = storage.read(LEGACY_PREFIX + k);
      if (v) {
        try {
          legacy[k] = JSON.parse(v);
          hasLegacy = true;
        } catch {
          /* пропускаем повреждённый ключ */
        }
      }
    }
    if (hasLegacy) {
      const migrated = Core.migrateV3(legacy, db);
      Core.checkAchievements(migrated, db);
      migrated.migrated = true;
      return migrated;
    }
    return Core.defaultState();
  }

  let state = loadState();
  const wasMigrated = !!state.migrated;
  delete state.migrated;

  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 120);
  }
  function saveNow() {
    clearTimeout(saveTimer);
    if (!storage.write(STORAGE_KEY, JSON.stringify(state)) && !save.warned) {
      save.warned = true;
      toast('Прогресс не сохраняется', { icon: '⚠️', sub: 'Браузер запретил локальное хранилище (например, в приватном режиме).' });
    }
  }
  window.addEventListener('pagehide', saveNow);

  /* ------------------------------------------------------------------ */
  /* Настройки, движение, пул                                            */
  /* ------------------------------------------------------------------ */

  const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function reducedMotion() {
    const m = state.settings.motion;
    return m === 'reduced' || (m === 'auto' && motionQuery.matches);
  }

  function applySettings() {
    Fx.Sound.enabled = state.settings.sound;
    Fx.Sound.setVolume(state.settings.volume);
    Fx.Haptics.enabled = state.settings.haptics;
    document.documentElement.classList.toggle('reduce-motion', reducedMotion());
  }

  let pool = [];
  function refreshPool() {
    pool = Core.filterCars(db.cars, state.filters);
    renderPoolBar();
  }

  /** Кандидаты для прокрута с учётом режима «без повторов». */
  function spinCandidates() {
    if (!state.settings.noRepeat) return { list: pool, exhausted: false };
    const unseen = pool.filter((c) => !state.seen[c.id]);
    return unseen.length ? { list: unseen, exhausted: false } : { list: pool, exhausted: pool.length > 0 };
  }

  /* ------------------------------------------------------------------ */
  /* Уведомления                                                         */
  /* ------------------------------------------------------------------ */

  function toast(text, opts = {}) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast' + (opts.type ? ' ' + opts.type : '');
    el.setAttribute('role', 'status');
    el.innerHTML = `${opts.icon ? `<span class="t-icon" aria-hidden="true">${esc(opts.icon)}</span>` : ''}<div class="t-main">${esc(text)}${
      opts.sub ? `<small>${esc(opts.sub)}</small>` : ''
    }</div>`;
    if (opts.action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = opts.action.label;
      b.addEventListener('click', () => {
        opts.action.fn();
        dismiss();
      });
      el.append(b);
    }
    box.append(el);
    while (box.children.length > 3) box.firstElementChild.remove();
    let gone = false;
    function dismiss() {
      if (gone) return;
      gone = true;
      el.classList.add('out');
      setTimeout(() => el.remove(), 260);
    }
    setTimeout(dismiss, opts.duration || (opts.action ? 6000 : 3200));
    return dismiss;
  }

  /* ------------------------------------------------------------------ */
  /* Барабаны                                                            */
  /* ------------------------------------------------------------------ */

  const ease = Fx.bezier(0.3, 0.12, 0.12, 1);
  const easeTail = Fx.bezier(0.2, 0.6, 0.3, 1);

  class Reel {
    constructor(root, index) {
      this.root = root;
      this.index = index;
      this.window = $('.reel-window', root);
      this.strip = $('.reel-strip', root);
      this.values = [];
      this.offset = 0;
      this.skipRequested = false;
    }

    metrics() {
      const first = this.strip.firstElementChild;
      const itemH = first ? first.getBoundingClientRect().height : 64;
      return { itemH: itemH || 64, winH: this.window.clientHeight || 176 };
    }

    render(values, targetIndex) {
      this.values = values;
      this.strip.innerHTML = values
        .map((v, i) => `<div class="reel-item${i === targetIndex ? ' is-target' : ''}"><span>${esc(v)}</span></div>`)
        .join('');
    }

    yFor(index) {
      const { itemH, winH } = this.metrics();
      return -(index * itemH) + (winH - itemH) / 2;
    }

    setY(y, blur = 0) {
      this.offset = y;
      this.strip.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
      this.strip.style.filter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : '';
    }

    /** Статичный вид: значение по центру и соседи сверху и снизу. */
    show(above, value, below) {
      this.render([above[0], above[1], value, below[0], below[1]], 2);
      this.setY(this.yFor(2));
    }

    recenter() {
      const i = this.values.length ? Math.max(0, $$('.reel-item', this.strip).findIndex((el) => el.classList.contains('is-target'))) : 0;
      this.setY(this.yFor(i));
    }

    /**
     * Прокрутка вниз: цель стоит в ленте выше текущего значения.
     * strip = [x2, x1, ЦЕЛЬ, …наполнитель…, p2, p1, ТЕКУЩЕЕ, n1, n2]
     */
    spin(fillers, target, after, duration, onTick) {
      const current = this.values.slice();
      const ti = current.findIndex((_, i) => this.strip.children[i] && this.strip.children[i].classList.contains('is-target'));
      const ci = ti >= 0 ? ti : 2;
      const p1 = current[ci - 1] ?? fillers[0];
      const p2 = current[ci - 2] ?? fillers[1];
      const cur = current[ci] ?? fillers[2];
      const n1 = current[ci + 1] ?? fillers[3];
      const n2 = current[ci + 2] ?? fillers[4];
      const strip = [after[1], after[0], target, ...fillers, p2, p1, cur, n1, n2];
      const startIndex = strip.length - 3;
      this.render(strip, 2);
      const from = this.yFor(startIndex);
      const to = this.yFor(2);
      const { itemH, winH } = this.metrics();
      const center = (winH - itemH) / 2;
      this.setY(from);
      this.root.classList.remove('stopped');
      this.skipRequested = false;

      return new Promise((resolve) => {
        let t0 = performance.now();
        let start = from;
        let dur = duration;
        let curve = ease;
        let lastIdx = Math.round((center - from) / itemH);
        let lastY = from;
        let lastT = t0;
        let lastTick = 0;
        const frame = (now) => {
          if (this.skipRequested && now - t0 < dur - 280) {
            this.skipRequested = false;
            start = this.offset;
            t0 = now;
            dur = 280;
            curve = easeTail;
          }
          const p = Math.min(1, (now - t0) / dur);
          const y = start + (to - start) * curve(p);
          const dt = Math.max(1, now - lastT);
          const velocity = Math.abs(y - lastY) / dt;
          this.setY(y, Math.min(2.2, velocity * 0.09));
          lastY = y;
          lastT = now;
          const idx = Math.round((center - y) / itemH);
          if (idx !== lastIdx) {
            lastIdx = idx;
            if (now - lastTick > 28) {
              lastTick = now;
              onTick();
            }
          }
          if (p < 1) requestAnimationFrame(frame);
          else {
            this.setY(to);
            // Оставляем в DOM только видимые элементы.
            this.render([strip[0], strip[1], strip[2], strip[3], strip[4]], 2);
            this.setY(this.yFor(2));
            resolve();
          }
        };
        requestAnimationFrame(frame);
      });
    }
  }

  const reels = $$('.reel').map((el, i) => new Reel(el, i));
  const REEL_FIELDS = ['brand', 'model', 'gen'];

  function sample(list, n, rnd = Core.cryptoRandom) {
    const out = [];
    if (!list.length) return out;
    for (let i = 0; i < n; i++) {
      let v = list[Core.randInt(list.length, rnd)];
      if (list.length > 2 && out.length && v === out[out.length - 1]) v = list[Core.randInt(list.length, rnd)];
      out.push(v);
    }
    return out;
  }

  /** Наполнитель для барабанов: сначала случайные значения, ближе к цели — правдоподобные. */
  function reelFillers(car, source) {
    const src = source.length ? source : db.cars;
    const brands = [...new Set(src.map((c) => c.brand))];
    const models = [...new Set(src.map((c) => c.model))];
    const gens = [...new Set(src.map((c) => c.gen))];
    const sameBrandModels = [...new Set(db.cars.filter((c) => c.brand === car.brand && c.model !== car.model).map((c) => c.model))];
    const sameModelGens = db.cars.filter((c) => c.modelIdx === car.modelIdx && c.id !== car.id).map((c) => c.gen);
    const sameBrandGens = [...new Set(db.cars.filter((c) => c.brand === car.brand && c.id !== car.id).map((c) => c.gen))];
    const near = (pref, fallback, n) => {
      const list = pref.length ? pref : fallback;
      return sample(list.length ? list : fallback, n);
    };
    return [
      [...near(brands.filter((b) => b !== car.brand), brands, 4), ...sample(brands, 14)],
      [...near(sameBrandModels, models, 6), ...sample(models, 20)],
      [...near(sameModelGens.length ? sameModelGens : sameBrandGens, gens, 5), ...sample(gens, 27)],
    ];
  }

  function showCarOnReels(car) {
    const f = reelFillers(car, pool);
    reels.forEach((r, i) => r.show([f[i][3], f[i][2]], car[REEL_FIELDS[i]], [f[i][0], f[i][1]]));
  }

  function showIdleReels() {
    const f = reelFillers(db.cars[Core.randInt(db.cars.length)], db.cars);
    const words = ['ГОТОВ?', 'ЖМИ', 'КРУТИТЬ'];
    reels.forEach((r, i) => r.show([f[i][3], f[i][2]], words[i], [f[i][0], f[i][1]]));
  }

  /* ------------------------------------------------------------------ */
  /* Прокрут                                                             */
  /* ------------------------------------------------------------------ */

  let spinning = false;
  let current = null; // { car, odds, isNew, poolSize }
  const machine = $('#machine');
  const spinBtn = $('#spinBtn');

  function setSpinButton() {
    const label = $('.label', spinBtn);
    spinBtn.classList.toggle('is-stop', spinning);
    if (spinning) {
      label.textContent = 'СТОП';
      spinBtn.disabled = false;
      spinBtn.setAttribute('aria-label', 'Остановить барабаны');
      return;
    }
    spinBtn.removeAttribute('aria-label');
    if (!pool.length) {
      label.textContent = 'НЕТ МАШИН';
      spinBtn.disabled = true;
    } else {
      label.textContent = current ? 'КРУТИТЬ ЕЩЁ' : 'КРУТИТЬ';
      spinBtn.disabled = false;
    }
  }

  async function spin() {
    if (spinning) {
      reels.forEach((r) => (r.skipRequested = true));
      return;
    }
    Fx.Sound.unlock();
    if (!pool.length) {
      Fx.Sound.error();
      toast('Под фильтры не подходит ни одна машина', { icon: '🔍', action: { label: 'Фильтры', fn: () => openSheet('filters') } });
      return;
    }
    const { list, exhausted } = spinCandidates();
    if (exhausted) toast('Все машины этого пула уже открыты', { icon: '🏆', sub: 'Крутим среди всех — повторы возможны.' });

    const mode = state.settings.mode;
    const car = Core.pickCar(list, mode);
    const odds = Core.carOdds(car, list, mode);

    spinning = true;
    setSpinButton();
    machine.classList.remove('win-glow', 'shake');
    machine.classList.add('spinning');
    machine.style.setProperty('--win', RARITY_COLORS[car.rarity]);
    reels.forEach((r) => r.root.classList.remove('stopped'));
    $('#result').classList.add('dimmed');
    Fx.Sound.click();
    Fx.Haptics.pulse(8);

    const fillers = reelFillers(car, list);
    if (reducedMotion()) {
      await wait(150);
      showCarOnReels(car);
      reels.forEach((r) => r.root.classList.add('stopped'));
      Fx.Sound.stop(2);
    } else {
      const k = { fast: 0.6, normal: 1, slow: 1.45 }[state.settings.speed] || 1;
      await Promise.all(
        reels.map((r, i) => {
          const f = fillers[i];
          const target = car[REEL_FIELDS[i]];
          const pool2 = f.filter((v) => v !== target && v !== f[0]);
          const after = sample(pool2.length >= 2 ? pool2 : f, 2);
          return r
            .spin(f, target, after, (1350 + i * 520) * k, () => Fx.Sound.tick(i))
            .then(() => {
              r.root.classList.add('stopped');
              Fx.Sound.stop(i);
              Fx.Haptics.pulse(i === 2 ? 18 : 10);
            });
        })
      );
    }

    const { isNew } = Core.recordSpin(state, car);
    const unlocked = Core.checkAchievements(state, db);
    save();

    spinning = false;
    machine.classList.remove('spinning');
    current = { car, odds, isNew, poolSize: list.length, mode };
    setSpinButton();
    renderResult();
    renderHeader();
    renderPoolBar();
    renderRecent();
    celebrate(car, isNew);
    if (unlocked.length) {
      setTimeout(() => announceAchievements(unlocked), 900);
      markCollectionDot(true);
    }
  }

  function announceAchievements(list) {
    if (list.length === 1) return achievementToast(list[0]);
    Fx.Sound.achievement();
    toast(`Новые достижения: ${list.length}`, {
      icon: list[list.length - 1].icon,
      sub: list.map((a) => a.title).join(' · '),
      type: 'achievement',
      duration: 5000,
    });
  }

  function celebrate(car, isNew) {
    const r = car.rarity;
    const reduced = reducedMotion();
    machine.classList.add('win-glow');
    Fx.Sound.win(r);
    if (r >= 3) Fx.Haptics.pulse(r >= 4 ? [30, 60, 30, 60, 80] : [20, 40, 30]);
    if (!reduced && r >= 2) {
      void machine.offsetWidth;
      machine.classList.add('shake');
    }
    if (r >= 3 && !reduced) {
      const flash = document.createElement('div');
      flash.className = 'edge-flash';
      flash.style.setProperty('--bc', RARITY_COLORS[r]);
      document.body.append(flash);
      setTimeout(() => flash.remove(), 1500);

      const burst = document.createElement('div');
      burst.className = 'burst' + (r === 5 ? ' mythic' : '');
      burst.style.setProperty('--bc', RARITY_COLORS[r]);
      burst.textContent = RARITY_SHOUT[r];
      document.body.append(burst);
      setTimeout(() => burst.remove(), 2400);
    }
    if (state.settings.confetti && !reduced && (r >= 1 || isNew)) {
      const rect = machine.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = Math.min(window.innerHeight * 0.7, rect.top + rect.height * 0.55);
      const palette = r >= 4 ? [RARITY_COLORS[r], '#ffffff', '#ff3358', '#8b5cf6', '#38bdf8'] : [RARITY_COLORS[r], '#ffffff', '#ff3358', '#8b5cf6'];
      const count = [0, 26, 60, 110, 170, 240][r] || 18;
      Fx.Confetti.burst(x, y, palette, count);
      if (r >= 4) setTimeout(() => Fx.Confetti.burst(x - rect.width * 0.3, y, palette, count / 2), 280);
      if (r >= 4) setTimeout(() => Fx.Confetti.burst(x + rect.width * 0.3, y, palette, count / 2), 520);
    }
  }

  function achievementToast(a) {
    Fx.Sound.achievement();
    toast(`Достижение: ${a.title}`, { icon: a.icon, sub: a.desc, type: 'achievement', duration: 4200 });
  }

  /* ------------------------------------------------------------------ */
  /* Карточка автомобиля                                                 */
  /* ------------------------------------------------------------------ */

  const isRoman = (s) => /^[IVXL]+$/.test(s);

  function searchQuery(car) {
    return [car.brand, car.model, isRoman(car.gen) ? '' : car.gen, car.y0].filter(Boolean).join(' ');
  }

  function links(car) {
    const q = encodeURIComponent(searchQuery(car));
    const yandex = state.settings.search === 'yandex';
    return {
      photo: yandex ? `https://yandex.ru/images/search?text=${q}` : `https://www.google.com/search?tbm=isch&q=${q}`,
      video: yandex
        ? `https://yandex.ru/video/search?text=${q}%20${encodeURIComponent('обзор')}`
        : `https://www.youtube.com/results?search_query=${q}%20${encodeURIComponent('обзор')}`,
      wiki: `https://ru.wikipedia.org/w/index.php?search=${encodeURIComponent(`${car.brand} ${car.model}`)}`,
    };
  }

  function shareUrl(car) {
    const base = location.href.split('#')[0];
    return `${base}#car=${encodeURIComponent(car.id)}`;
  }

  function specsHtml(car) {
    const seen = state.seen[car.id];
    const specs = [
      ['calendar', 'Годы выпуска', Core.yearsLabel(car)],
      ['globe', 'Страна', Core.COUNTRIES[car.country]],
      ['body', 'Кузов', Core.listLabel(car.bodies, Core.BODIES)],
      ['layers', 'Класс', Core.CLASSES[car.cls]],
      ['wheel', 'Привод', Core.drivesLabel(car)],
      ['fuel', 'Силовая установка', Core.fuelsLabel(car)],
      ['gauge', 'Мощность', Core.powerLabel(car) || 'нет данных'],
      ['repeat', 'Выпадала', seen ? countLabel(seen[0], TIMES) : 'ещё ни разу'],
    ];
    return specs.map(([ic, k, v]) => `<div class="spec"><small>${icon(ic)}${k}</small><b>${esc(v)}</b></div>`).join('');
  }

  function carCardHtml(car, ctx) {
    const r = car.rarity;
    const fav = state.favorites.includes(car.id);
    const l = links(car);
    const tags = [
      `<span class="tag rarity r${r}">${Core.RARITIES[r].name}</span>`,
      ctx.isNew ? '<span class="tag new">Новая в коллекции</span>' : '',
      car.genTotal > 1 ? `<span class="tag">Поколение ${car.genNo} из ${car.genTotal}</span>` : '',
    ].join('');
    const inPool = pool.includes(car);
    const odds =
      ctx.odds !== undefined
        ? `<div class="odds"><strong>${oddsLabel(ctx.odds)}</strong>шанс выпадения</div>`
        : inPool
          ? `<div class="odds"><strong>${oddsLabel(Core.carOdds(car, pool, state.settings.mode))}</strong>шанс в текущем пуле</div>`
          : '<div class="odds"><strong>—</strong>не входит в текущий пул</div>';
    const genLine = `${esc(car.gen)} · ${esc(Core.yearsLabel(car))}`;
    return `<article class="card car-card r${r}" style="--rc: var(--r${r})">
      <span class="holo" aria-hidden="true"></span>
      <div class="car-head">
        <div>
          <div class="car-tags">${tags}</div>
          <h2 class="car-title"><span class="brand-name">${esc(car.brand)}</span>${esc(car.model)}</h2>
          <div class="car-sub">${genLine}</div>
        </div>
        <button class="fav-btn" type="button" data-action="fav" data-id="${esc(car.id)}" aria-pressed="${fav}">${icon('star')}<span>${fav ? 'В гараже' : 'В гараж'}</span></button>
      </div>
      <div class="car-stage">
        <span class="stage-brand" aria-hidden="true">${esc(car.brand)}</span>
        <div class="stage-car">${silhouette(car)}<div class="reflection" aria-hidden="true">${silhouette(car)}</div></div>
        ${odds}
      </div>
      <div class="specs">${specsHtml(car)}</div>
      ${car.fact ? `<p class="fact">${esc(car.fact)}</p>` : ''}
      <div class="car-actions">
        <a class="btn light" href="${l.photo}" target="_blank" rel="noopener noreferrer">${icon('image')}Фото</a>
        <a class="btn" href="${l.video}" target="_blank" rel="noopener noreferrer">${icon('play')}Видео</a>
        <a class="btn" href="${l.wiki}" target="_blank" rel="noopener noreferrer">${icon('wiki')}Википедия</a>
        <button class="btn" type="button" data-action="share" data-id="${esc(car.id)}">${icon('share')}Поделиться</button>
        <button class="btn" type="button" data-action="copy" data-id="${esc(car.id)}">${icon('copy')}Копировать</button>
        ${ctx.dialog ? `<button class="btn" type="button" data-action="spin-brand" data-id="${esc(car.id)}">${icon('target')}Крутить ${esc(car.brand)}</button>` : ''}
      </div>
    </article>`;
  }

  function renderResult() {
    const box = $('#result');
    box.classList.remove('dimmed');
    if (!current) {
      box.innerHTML = welcomeHtml();
      return;
    }
    box.innerHTML = carCardHtml(current.car, { odds: current.odds, isNew: current.isNew });
    const rect = box.getBoundingClientRect();
    if (rect.top > window.innerHeight - 120) {
      box.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
    }
  }

  function welcomeHtml() {
    const odds = Core.tierOdds(db.cars, state.settings.mode);
    const steps = [
      ['🎰', 'Крути барабаны', 'Кнопка «Крутить», Пробел или Enter. Марка, модель и поколение останавливаются по очереди.'],
      ['💎', 'Лови редкие машины', 'Шесть редкостей — от обычных до мифических, выпущенных единицами экземпляров.'],
      ['🏆', 'Собирай коллекцию', `${countLabel(db.cars.length, CARS)}, ${db.brands.length} марок и ${Core.ACHIEVEMENTS.length} достижений. Прогресс хранится в браузере.`],
      ['🎯', 'Настрой пул', 'Фильтры по стране, марке, эпохе, кузову и мощности — крути только то, что интересно.'],
    ];
    return `<article class="card welcome">
      <h2>Как играть</h2>
      <ol class="steps">${steps
        .map(([e, t, d]) => `<li><span class="step-ico" aria-hidden="true">${e}</span><div><b>${t}</b><small>${esc(d)}</small></div></li>`)
        .join('')}</ol>
      <div class="legend" aria-label="Редкости и шансы">${Core.RARITIES.map(
        (rr, i) => `<span class="legend-item" style="--rc: var(--r${i})"><i></i>${rr.name}<small>${percent(odds[i])}</small></span>`
      ).join('')}</div>
      <button class="btn block" type="button" data-action="open" data-view="odds">${icon('info')}Как работают шансы</button>
    </article>`;
  }

  function renderRecent() {
    const box = $('#recent');
    const seen = new Set();
    const cars = [];
    for (const h of state.history) {
      if (seen.has(h.id)) continue;
      seen.add(h.id);
      const car = db.byId.get(h.id);
      if (car) cars.push(car);
      if (cars.length >= 12) break;
    }
    box.hidden = !cars.length;
    if (!cars.length) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = `<div class="block-head"><h3>Последние находки</h3><button class="link-btn" type="button" data-action="open" data-view="history">Вся история${icon('arrow')}</button></div>
      <div class="recent-list">${cars
        .map(
          (c) => `<button class="recent-item" type="button" data-action="open-car" data-id="${esc(c.id)}" style="--rc: var(--r${c.rarity})" title="${esc(Core.fullName(c))}">
            ${silhouette(c)}<b>${esc(c.brand)}</b><span>${esc(c.model)}</span></button>`
        )
        .join('')}</div>`;
  }

  /* 3D-наклон карточки за курсором */
  const tiltQuery = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };
  let tiltFrame = 0;
  function onTiltMove(e) {
    const card = e.target.closest && e.target.closest('#result .car-card');
    if (!card || !tiltQuery.matches || reducedMotion()) return;
    cancelAnimationFrame(tiltFrame);
    tiltFrame = requestAnimationFrame(() => {
      const r = card.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      card.classList.add('tilting');
      card.style.setProperty('--ry', `${((px - 0.5) * 7).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${((0.5 - py) * 5).toFixed(2)}deg`);
      card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    });
  }
  function onTiltLeave() {
    cancelAnimationFrame(tiltFrame);
    const card = $('#result .car-card');
    if (!card) return;
    card.classList.remove('tilting');
    ['--rx', '--ry', '--mx', '--my'].forEach((v) => card.style.removeProperty(v));
  }

  function refreshCardsFor(id) {
    if (current && current.car.id === id) {
      const box = $('#result');
      box.innerHTML = carCardHtml(current.car, { odds: current.odds, isNew: current.isNew });
      const card = $('.car-card', box);
      if (card) card.style.animation = 'none';
    }
    const dlg = $('#carDialog');
    if (dlg.open && dlg.dataset.id === id) renderCarDialog(db.byId.get(id));
  }

  /* ------------------------------------------------------------------ */
  /* Действия с машиной                                                   */
  /* ------------------------------------------------------------------ */

  function toggleFav(id) {
    const i = state.favorites.indexOf(id);
    if (i >= 0) state.favorites.splice(i, 1);
    else state.favorites.unshift(id);
    const unlocked = Core.checkAchievements(state, db);
    save();
    Fx.Sound.click();
    toast(i >= 0 ? 'Убрано из гаража' : 'Добавлено в гараж', { icon: i >= 0 ? '🗑️' : '⭐' });
    if (unlocked.length) {
      announceAchievements(unlocked);
      markCollectionDot(true);
    }
    refreshCardsFor(id);
    if (sheetView === 'garage') renderSheet();
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.append(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      ta.remove();
      return ok;
    }
  }

  async function shareCar(car) {
    const url = shareUrl(car);
    const text = `Мне выпал ${Core.fullName(car)} (${Core.yearsLabel(car)}) в CAR ROULETTE!`;
    if (navigator.share && /^https?:/.test(location.protocol)) {
      try {
        await navigator.share({ title: 'CAR ROULETTE', text, url });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    const ok = await copyText(`${text} ${url}`);
    toast(ok ? 'Ссылка скопирована' : 'Не удалось скопировать ссылку', { icon: ok ? '🔗' : '⚠️' });
  }

  function spinBrand(car) {
    state.filters = Core.normalizeFilters({ brands: [car.brand] });
    save();
    refreshPool();
    closeDialogs();
    scrollToMachine();
    toast(`Фильтр: только ${car.brand}`, { icon: '🎯', action: { label: 'Сбросить', fn: resetFilters } });
  }

  /* ------------------------------------------------------------------ */
  /* Шапка, пул, машина дня                                              */
  /* ------------------------------------------------------------------ */

  function renderHeader() {
    $('#brandMeta').textContent = `${countLabel(db.cars.length, CARS)} · ${db.brands.length} марок`;
    const unique = Object.keys(state.seen).length;
    const pct = unique / db.cars.length;
    $('#collectCount').textContent = `${fmt(unique)} / ${fmt(db.cars.length)}`;
    $('#collectRing').setAttribute('stroke-dasharray', `${unique ? Math.max(3, pct * 100).toFixed(2) : 0} 100`);
    $('.collect-chip').setAttribute('aria-label', `Коллекция: открыто ${fmt(unique)} из ${fmt(db.cars.length)}`);
    renderSoundButton();
    const streak = Core.currentStreak(state);
    $('#statLine').textContent = unique
      ? `Открыто ${fmt(unique)} из ${fmt(db.cars.length)}${streak > 1 ? ` · серия ${countLabel(streak, DAYS)}` : ''}`
      : `${db.brands.length} марок · ${fmt(db.models.length)} моделей · честный рандом`;
  }

  function renderSoundButton() {
    const btn = $('#soundBtn');
    const on = state.settings.sound && state.settings.volume > 0;
    btn.innerHTML = icon(on ? 'soundOn' : 'soundOff');
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Выключить звук' : 'Включить звук');
    btn.title = on ? 'Выключить звук' : 'Включить звук';
  }

  function filterChips() {
    const f = state.filters;
    const chips = [];
    const add = (key, value, label) => chips.push({ key, value, label });
    f.countries.forEach((v) => add('countries', v, Core.COUNTRIES[v] || v));
    f.brands.forEach((v) => add('brands', v, v));
    f.bodies.forEach((v) => add('bodies', v, Core.BODIES[v] || v));
    f.classes.forEach((v) => add('classes', v, Core.CLASSES[v] || v));
    f.drives.forEach((v) => add('drives', v, (Core.DRIVE_FILTERS.find((d) => d.key === v) || {}).name || v));
    f.fuels.forEach((v) => add('fuels', v, (Core.FUEL_FILTERS.find((d) => d.key === v) || {}).name || v));
    f.eras.forEach((v) => add('eras', v, (Core.ERAS.find((d) => d.key === v) || {}).name || v));
    f.rarities.forEach((v) => add('rarities', v, (Core.RARITIES.find((d) => d.key === v) || {}).plural || v));
    if (f.hpMin !== null || f.hpMax !== null) {
      add('hp', '', f.hpMin !== null && f.hpMax !== null ? `${f.hpMin}–${f.hpMax} л.с.` : f.hpMin !== null ? `от ${f.hpMin} л.с.` : `до ${f.hpMax} л.с.`);
    }
    return chips;
  }

  function renderPoolBar() {
    const box = $('#pool');
    const chips = filterChips();
    const unseen = state.settings.noRepeat ? pool.filter((c) => !state.seen[c.id]).length : null;
    const parts = [
      `<span>В пуле <strong>${fmt(pool.length)}</strong>${pool.length !== db.cars.length ? ` из ${fmt(db.cars.length)}` : ''}${
        unseen !== null ? ` · <strong>${fmt(unseen)}</strong> не открыто` : ''
      }</span>`,
    ];
    chips.slice(0, 6).forEach((c) =>
      parts.push(
        `<button class="chip removable" type="button" data-action="remove-filter" data-key="${c.key}" data-value="${esc(c.value)}" aria-label="Убрать фильтр ${esc(c.label)}">${esc(c.label)}${icon('x')}</button>`
      )
    );
    if (chips.length > 6) parts.push(`<button class="chip" type="button" data-action="open" data-view="filters">+${chips.length - 6}</button>`);
    if (chips.length) parts.push('<button class="chip link" type="button" data-action="reset-filters">Сбросить</button>');
    else parts.push(`<button class="chip link" type="button" data-action="open" data-view="filters">${icon('filter')}Настроить пул</button>`);
    box.innerHTML = parts.join('');

    const badge = $('#filterBadge');
    const n = Core.activeFilterCount(state.filters);
    badge.hidden = !n;
    badge.textContent = n;
    setSpinButton();
  }

  function resetFilters() {
    state.filters = Core.normalizeFilters({});
    save();
    refreshPool();
    toast('Фильтры сброшены', { icon: '🧹' });
  }

  function removeFilter(key, value) {
    if (key === 'hp') {
      state.filters.hpMin = null;
      state.filters.hpMax = null;
    } else {
      state.filters[key] = state.filters[key].filter((v) => v !== value);
    }
    save();
    refreshPool();
  }

  function renderDaily() {
    const car = Core.dailyCar(db.cars, Core.dayKey());
    if (!car) return;
    $('#daily').innerHTML = `<button class="daily-card" type="button" data-action="open-car" data-id="${esc(car.id)}" style="--rc: var(--r${car.rarity})">
      ${silhouette(car)}
      <div><small>Машина дня</small><b>${esc(car.brand)} ${esc(car.model)}</b><span>${esc(car.gen)} · ${esc(Core.yearsLabel(car))} · ${Core.RARITIES[car.rarity].name}</span></div>
    </button>`;
  }

  function markCollectionDot(on) {
    $('#collectionDot').hidden = !on;
  }

  /* ------------------------------------------------------------------ */
  /* Окна                                                                */
  /* ------------------------------------------------------------------ */

  const sheet = $('#sheet');
  const carDialog = $('#carDialog');
  const confirmDialog = $('#confirmDialog');
  let sheetView = null;
  let sheetParams = {};

  function syncBodyLock() {
    const anyOpen = [sheet, carDialog, confirmDialog].some((d) => d.open);
    document.body.classList.toggle('modal-open', anyOpen);
  }

  function showDialog(dlg) {
    if (!dlg.open) {
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
      // Фокус на само окно, а не на первую кнопку: так нет лишней рамки фокуса при открытии.
      dlg.focus({ preventScroll: true });
    }
    syncBodyLock();
  }

  function closeDialog(dlg) {
    if (dlg.open) {
      if (typeof dlg.close === 'function') dlg.close();
      else dlg.removeAttribute('open');
    }
    syncBodyLock();
  }

  function closeDialogs() {
    [confirmDialog, carDialog, sheet].forEach(closeDialog);
  }

  [sheet, carDialog, confirmDialog].forEach((dlg) => {
    dlg.addEventListener('close', () => {
      syncBodyLock();
      if (dlg === sheet) {
        sheetView = null;
        markDock();
      }
      if (dlg === carDialog && location.hash.startsWith('#car=')) {
        history.replaceState(null, '', location.pathname + location.search);
      }
    });
    // Закрытие по клику на подложку
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) closeDialog(dlg);
    });
  });

  const VIEWS = {
    history: { title: 'История', render: renderHistory },
    garage: { title: 'Гараж', render: renderGarage },
    collection: { title: 'Коллекция', render: renderCollection },
    catalog: { title: 'Каталог', render: renderCatalog },
    stats: { title: 'Статистика', render: renderStats },
    settings: { title: 'Настройки', render: renderSettings },
    filters: { title: 'Фильтры', render: renderFilters },
    odds: { title: 'Как работают шансы', render: renderOddsInfo },
  };

  function openSheet(view, params = {}) {
    Fx.Sound.unlock();
    if (sheetView !== view) sheetParams = {};
    Object.assign(sheetParams, params);
    sheetView = view;
    showDialog(sheet);
    markDock();
    renderSheet();
    $('.sheet-body', sheet).scrollTop = 0;
  }

  function markDock() {
    $$('.dock-nav button').forEach((b) => {
      if (b.dataset.view === sheetView) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }

  function renderSheet() {
    const view = VIEWS[sheetView];
    if (!view) return;
    $('#sheetTitle').textContent = view.title;
    $('#sheetSub').textContent = '';
    $('#sheetFoot').hidden = true;
    $('#sheetFoot').innerHTML = '';
    view.render($('#sheetBody'));
  }

  function setSub(text) {
    $('#sheetSub').textContent = text;
  }

  function setFoot(html) {
    const foot = $('#sheetFoot');
    foot.innerHTML = html;
    foot.hidden = !html;
  }

  function openCar(id) {
    const car = db.byId.get(id);
    if (!car) {
      toast('Такой машины нет в базе', { icon: '🤷' });
      return;
    }
    renderCarDialog(car);
    showDialog(carDialog);
    $('.sheet-body', carDialog).scrollTop = 0;
  }

  function renderCarDialog(car) {
    carDialog.dataset.id = car.id;
    $('#carDialogBody').innerHTML = carCardHtml(car, { dialog: true });
  }

  function confirmAction(title, text, okLabel = 'Удалить') {
    return new Promise((resolve) => {
      $('#confirmTitle').textContent = title;
      $('#confirmText').textContent = text;
      const ok = $('#confirmOk');
      ok.textContent = okLabel;
      let result = false;
      const onOk = () => {
        result = true;
        closeDialog(confirmDialog);
      };
      ok.addEventListener('click', onOk, { once: true });
      confirmDialog.addEventListener(
        'close',
        () => {
          ok.removeEventListener('click', onOk);
          resolve(result);
        },
        { once: true }
      );
      showDialog(confirmDialog);
    });
  }

  /* ---------- Строки списков ---------- */

  function carRow(car, { meta, side = '', locked = false, hideName = false } = {}) {
    const title = hideName ? `${esc(car.brand)} ${esc(car.model)} · ???` : `${esc(car.brand)} ${esc(car.model)} <span style="color:var(--muted)">${esc(car.gen)}</span>`;
    const m = meta ?? `${esc(Core.yearsLabel(car))} · ${Core.RARITIES[car.rarity].name}`;
    const attrs = locked ? 'disabled aria-disabled="true"' : `data-action="open-car" data-id="${esc(car.id)}"`;
    return `<button class="row${locked ? ' locked' : ''}" type="button" ${attrs} style="--rc: var(--r${car.rarity})">
      ${silhouette(car)}
      <div class="row-main"><div class="row-title">${title}</div><div class="row-meta"><span class="rdot"></span>${m}</div></div>
      ${side ? `<div class="row-side">${side}</div>` : ''}
    </button>`;
  }

  function emptyHtml(emoji, text, sub = '') {
    return `<div class="empty"><span class="big" aria-hidden="true">${emoji}</span>${esc(text)}${sub ? `<br><small>${esc(sub)}</small>` : ''}</div>`;
  }

  function raritySelect(id, value) {
    return `<select class="select" id="${id}" aria-label="Редкость"><option value="">Любая редкость</option>${Core.RARITIES.map(
      (r) => `<option value="${r.key}"${value === r.key ? ' selected' : ''}>${r.plural}</option>`
    ).join('')}</select>`;
  }

  /* ---------- История ---------- */

  function dayTitle(t) {
    const d = new Date(t);
    const key = Core.dayKey(d);
    const today = Core.dayKey();
    if (key === today) return 'Сегодня';
    if (key === Core.shiftDayKey(today, -1)) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  }

  function renderHistory(body) {
    const p = sheetParams;
    p.limit = p.limit || 100;
    setSub(state.history.length ? `${countLabel(state.history.length, ['прокрут', 'прокрута', 'прокрутов'])} в истории` : '');
    if (!state.history.length) {
      body.innerHTML = emptyHtml('🎰', 'История пока пуста', 'Крутани рулетку — здесь появятся все выпавшие машины.');
      return;
    }
    body.innerHTML = `<div class="toolbar">
        <input class="input search" id="histSearch" type="search" placeholder="Поиск по истории" value="${esc(p.q || '')}" autocomplete="off">
        ${raritySelect('histRarity', p.rarity || '')}
        <button class="btn danger" type="button" data-action="clear-history">${icon('trash')}Очистить</button>
      </div><div id="histList"></div>`;
    const draw = () => {
      const q = p.q || '';
      const rows = Core.searchCars(
        state.history.map((h) => db.byId.get(h.id)).filter(Boolean),
        q
      );
      const allowed = new Set(rows.map((c) => c.id));
      const items = state.history
        .map((h, index) => ({ h, index, car: db.byId.get(h.id) }))
        .filter((x) => x.car && allowed.has(x.car.id) && (!p.rarity || Core.RARITIES[x.car.rarity].key === p.rarity));
      if (!items.length) {
        $('#histList').innerHTML = emptyHtml('🔍', 'Ничего не найдено');
        return;
      }
      let html = '';
      let lastDay = '';
      for (const { h, index, car } of items.slice(0, p.limit)) {
        const day = dayTitle(h.t);
        if (day !== lastDay) {
          html += `<div class="day-label">${esc(day)}</div>`;
          lastDay = day;
        }
        const time = new Date(h.t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        html += `<div class="row-wrap">${carRow(car, { side: time })}<button class="row-del" type="button" data-action="del-history" data-index="${index}" aria-label="Удалить из истории">${icon('x')}</button></div>`;
      }
      html = `<div class="list">${html}</div>`;
      if (items.length > p.limit) html += `<button class="btn block more" type="button" data-action="more">Показать ещё (${fmt(items.length - p.limit)})</button>`;
      $('#histList').innerHTML = html;
    };
    $('#histSearch').addEventListener(
      'input',
      debounce((e) => {
        p.q = e.target.value;
        p.limit = 100;
        draw();
      }, 120)
    );
    $('#histRarity').addEventListener('change', (e) => {
      p.rarity = e.target.value;
      draw();
    });
    draw();
  }

  /* ---------- Гараж ---------- */

  function renderGarage(body) {
    const p = sheetParams;
    setSub(state.favorites.length ? countLabel(state.favorites.length, CARS) : '');
    if (!state.favorites.length) {
      body.innerHTML = emptyHtml('⭐', 'Гараж пока пуст', 'Добавляй понравившиеся машины кнопкой «В гараж» на карточке.');
      return;
    }
    body.innerHTML = `<div class="toolbar">
      <input class="input search" id="favSearch" type="search" placeholder="Поиск в гараже" value="${esc(p.q || '')}" autocomplete="off">
      <select class="select" id="favSort" aria-label="Сортировка">
        <option value="recent">Недавно добавленные</option>
        <option value="name">По названию</option>
        <option value="rarity">Сначала редкие</option>
        <option value="year">По году</option>
      </select></div><div id="favList"></div>`;
    $('#favSort').value = p.sort || 'recent';
    const draw = () => {
      let cars = Core.searchCars(state.favorites.map((id) => db.byId.get(id)).filter(Boolean), p.q || '');
      const sort = p.sort || 'recent';
      if (sort === 'name') cars.sort((a, b) => byName(Core.fullName(a), Core.fullName(b)));
      if (sort === 'rarity') cars.sort((a, b) => b.rarity - a.rarity || a.y0 - b.y0);
      if (sort === 'year') cars.sort((a, b) => a.y0 - b.y0);
      $('#favList').innerHTML = cars.length
        ? `<div class="list">${cars
            .map(
              (car) =>
                `<div class="row-wrap">${carRow(car)}<button class="row-del" type="button" data-action="fav" data-id="${esc(car.id)}" aria-label="Убрать из гаража">${icon('x')}</button></div>`
            )
            .join('')}</div>`
        : emptyHtml('🔍', 'Ничего не найдено');
    };
    $('#favSearch').addEventListener(
      'input',
      debounce((e) => {
        p.q = e.target.value;
        draw();
      }, 120)
    );
    $('#favSort').addEventListener('change', (e) => {
      p.sort = e.target.value;
      draw();
    });
    draw();
  }

  /* ---------- Коллекция ---------- */

  function renderCollection(body) {
    const p = sheetParams;
    p.tab = p.tab || 'brands';
    const unique = Object.keys(state.seen).length;
    const pct = unique / db.cars.length;
    const tiers = Core.tierCounts(db.cars);
    const open = Core.RARITIES.map(() => 0);
    for (const id of Object.keys(state.seen)) {
      const c = db.byId.get(id);
      if (c) open[c.rarity]++;
    }
    const ach = Core.achievementProgress(state, db);
    const achDone = ach.filter((a) => a.done).length;
    setSub(`${fmt(unique)} из ${fmt(db.cars.length)} · ${percent(pct)}`);

    if (p.brand) return renderBrandDetail(body, p.brand);

    body.innerHTML = `
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${db.cars.length}" aria-valuenow="${unique}" aria-label="Прогресс коллекции"><i style="width:${(pct * 100).toFixed(2)}%"></i></div>
      <div class="rarity-chips">${Core.RARITIES.map(
        (r, i) => `<div class="rchip" style="--rc: var(--r${i})"><b>${fmt(open[i])} / ${fmt(tiers[i])}</b>${r.plural}</div>`
      ).join('')}</div>
      <div class="tabs" role="tablist" style="margin-top:18px">
        <button type="button" role="tab" data-action="tab" data-tab="brands" aria-selected="${p.tab === 'brands'}">Марки</button>
        <button type="button" role="tab" data-action="tab" data-tab="achievements" aria-selected="${p.tab === 'achievements'}">Достижения · ${achDone}/${ach.length}</button>
      </div>
      <div id="collTab"></div>`;

    if (p.tab === 'achievements') {
      markCollectionDot(false);
      $('#collTab').innerHTML = `<div class="ach-grid">${ach
        .slice()
        .sort((a, b) => Number(b.done) - Number(a.done) || b.value / b.goal - a.value / a.goal)
        .map(
          (a) => `<div class="ach${a.done ? ' done' : ''}">
            <div class="ach-icon" aria-hidden="true">${esc(a.icon)}</div>
            <div class="ach-main"><b>${esc(a.title)}</b><small>${esc(a.desc)}${
              a.done ? ` · ${new Date(a.unlockedAt).toLocaleDateString('ru-RU')}` : ` · ${fmt(a.value)} / ${fmt(a.goal)}`
            }</small>
            <div class="progress"><i style="width:${((a.value / a.goal) * 100).toFixed(1)}%"></i></div></div>
          </div>`
        )
        .join('')}</div>`;
      return;
    }

    const perBrand = new Map();
    for (const id of Object.keys(state.seen)) {
      const c = db.byId.get(id);
      if (c) perBrand.set(c.brand, (perBrand.get(c.brand) || 0) + 1);
    }
    $('#collTab').innerHTML = `<div class="toolbar">
        <input class="input search" id="collSearch" type="search" placeholder="Найти марку" value="${esc(p.q || '')}" autocomplete="off">
        <select class="select" id="collSort" aria-label="Сортировка">
          <option value="progress">По прогрессу</option>
          <option value="name">По алфавиту</option>
          <option value="size">По размеру</option>
          <option value="country">По стране</option>
        </select>
      </div><div class="brand-grid" id="brandGrid"></div>`;
    $('#collSort').value = p.sort || 'progress';
    const draw = () => {
      const q = Core.normalizeSearch(p.q || '');
      let brands = db.brands.filter((b) => !q || Core.normalizeSearch(`${b.name} ${b.aka}`).includes(q));
      const sort = p.sort || 'progress';
      const got = (b) => perBrand.get(b.name) || 0;
      brands.sort((a, b) => {
        if (sort === 'name') return byName(a.name, b.name);
        if (sort === 'size') return b.count - a.count || byName(a.name, b.name);
        if (sort === 'country') return byName(Core.COUNTRIES[a.country], Core.COUNTRIES[b.country]) || byName(a.name, b.name);
        return got(b) / b.count - got(a) / a.count || got(b) - got(a) || byName(a.name, b.name);
      });
      $('#brandGrid').innerHTML = brands.length
        ? brands
            .map((b) => {
              const n = got(b);
              return `<button class="brand-card${n === b.count ? ' complete' : ''}" type="button" data-action="brand" data-brand="${esc(b.name)}">
                <b>${esc(b.name)}</b><small>${esc(Core.COUNTRIES[b.country])} · ${fmt(n)} / ${fmt(b.count)}</small>
                <div class="progress"><i style="width:${((n / b.count) * 100).toFixed(1)}%"></i></div></button>`;
            })
            .join('')
        : emptyHtml('🔍', 'Марка не найдена');
    };
    $('#collSearch').addEventListener(
      'input',
      debounce((e) => {
        p.q = e.target.value;
        draw();
      }, 100)
    );
    $('#collSort').addEventListener('change', (e) => {
      p.sort = e.target.value;
      draw();
    });
    draw();
  }

  function renderBrandDetail(body, brandName) {
    const cars = db.cars.filter((c) => c.brand === brandName).sort((a, b) => byName(a.model, b.model) || a.y0 - b.y0);
    const got = cars.filter((c) => state.seen[c.id]).length;
    setSub(`${brandName} · ${fmt(got)} из ${fmt(cars.length)}`);
    let html = `<div class="toolbar"><button class="btn" type="button" data-action="brand-back">${icon('back')}Все марки</button></div><div class="list">`;
    let model = '';
    for (const c of cars) {
      if (c.model !== model) {
        model = c.model;
        html += `<div class="day-label">${esc(model)}</div>`;
      }
      const seen = state.seen[c.id];
      html += seen
        ? carRow(c, { side: countLabel(seen[0], TIMES) })
        : carRow(c, { locked: true, hideName: c.rarity >= 2, meta: c.rarity >= 2 ? `${Core.RARITIES[c.rarity].name} · ещё не выпадала` : `${esc(Core.yearsLabel(c))} · ещё не выпадала` });
    }
    body.innerHTML = html + '</div>';
  }

  /* ---------- Каталог ---------- */

  function renderCatalog(body) {
    const p = sheetParams;
    p.limit = p.limit || 60;
    setSub(`${countLabel(db.cars.length, CARS)} в базе`);
    const countries = Object.keys(Core.COUNTRIES).filter((k) => db.cars.some((c) => c.country === k));
    body.innerHTML = `<div class="toolbar">
        <input class="input search" id="catSearch" type="search" placeholder="Марка, модель, поколение, год, страна…" value="${esc(p.q || '')}" autocomplete="off">
      </div>
      <div class="toolbar">
        <select class="select" id="catCountry" aria-label="Страна"><option value="">Все страны</option>${countries
          .map((k) => `<option value="${k}">${esc(Core.COUNTRIES[k])}</option>`)
          .join('')}</select>
        ${raritySelect('catRarity', p.rarity || '')}
        <select class="select" id="catSort" aria-label="Сортировка">
          <option value="name">По названию</option>
          <option value="new">Сначала новые</option>
          <option value="old">Сначала старые</option>
          <option value="rarity">Сначала редкие</option>
          <option value="power">По мощности</option>
        </select>
        <label class="switch"><input type="checkbox" id="catLocked"${p.locked ? ' checked' : ''}> Только неоткрытые</label>
      </div>
      <div class="match-count" id="catCount" style="margin-bottom:10px"></div>
      <div id="catList"></div>`;
    $('#catCountry').value = p.country || '';
    $('#catSort').value = p.sort || 'name';
    const draw = () => {
      let cars = Core.searchCars(db.cars, p.q || '');
      if (p.country) cars = cars.filter((c) => c.country === p.country);
      if (p.rarity) cars = cars.filter((c) => Core.RARITIES[c.rarity].key === p.rarity);
      if (p.locked) cars = cars.filter((c) => !state.seen[c.id]);
      cars = cars.slice();
      const sort = p.sort || 'name';
      if (sort === 'name') cars.sort((a, b) => byName(a.brand, b.brand) || byName(a.model, b.model) || a.y0 - b.y0);
      if (sort === 'new') cars.sort((a, b) => b.y0 - a.y0);
      if (sort === 'old') cars.sort((a, b) => a.y0 - b.y0);
      if (sort === 'rarity') cars.sort((a, b) => b.rarity - a.rarity || byName(a.brand, b.brand));
      if (sort === 'power') cars.sort((a, b) => (b.hp1 || 0) - (a.hp1 || 0));
      $('#catCount').innerHTML = `Найдено: <strong>${fmt(cars.length)}</strong>`;
      let html = cars.length
        ? `<div class="list">${cars
            .slice(0, p.limit)
            .map((c) => {
              const seen = state.seen[c.id];
              const meta = `${esc(Core.yearsLabel(c))} · ${esc(Core.COUNTRIES[c.country])}${Core.powerLabel(c) ? ` · ${esc(Core.powerLabel(c))}` : ''}`;
              return carRow(c, { meta, side: seen ? '✓' : '' });
            })
            .join('')}</div>`
        : emptyHtml('🔍', 'Ничего не найдено', 'Попробуй написать иначе — поиск понимает и латиницу, и кириллицу.');
      if (cars.length > p.limit) html += `<button class="btn block more" type="button" data-action="more">Показать ещё (${fmt(cars.length - p.limit)})</button>`;
      $('#catList').innerHTML = html;
    };
    const reset = () => {
      p.limit = 60;
      draw();
    };
    $('#catSearch').addEventListener(
      'input',
      debounce((e) => {
        p.q = e.target.value;
        reset();
      }, 140)
    );
    $('#catCountry').addEventListener('change', (e) => {
      p.country = e.target.value;
      reset();
    });
    $('#catRarity').addEventListener('change', (e) => {
      p.rarity = e.target.value;
      reset();
    });
    $('#catSort').addEventListener('change', (e) => {
      p.sort = e.target.value;
      reset();
    });
    $('#catLocked').addEventListener('change', (e) => {
      p.locked = e.target.checked;
      reset();
    });
    draw();
    if (window.matchMedia('(pointer: fine)').matches) $('#catSearch').focus();
  }

  /* ---------- Статистика ---------- */

  function barList(rows, { colorOf, max } = {}) {
    const top = max || Math.max(1, ...rows.map((r) => r.value));
    return `<div class="bars">${rows
      .map(
        (r, i) => `<div class="bar-row">
          <span class="label">${colorOf ? `<span class="key" style="background:${colorOf(r, i)}"></span>` : ''}${esc(r.label)}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${((r.value / top) * 100).toFixed(1)}%;${colorOf ? `background:${colorOf(r, i)}` : ''}"></div></div>
          <span class="value">${r.text ?? fmt(r.value)}</span>
        </div>`
      )
      .join('')}</div>`;
  }

  function renderStats(body) {
    const s = state.stats;
    const seenCars = Object.entries(state.seen)
      .map(([id, v]) => ({ car: db.byId.get(id), n: v[0], t: v[1] }))
      .filter((x) => x.car);
    if (!s.spins && !seenCars.length) {
      setSub('');
      body.innerHTML = emptyHtml('📊', 'Статистики пока нет', 'Она появится после первого прокрута.');
      return;
    }
    const totalSpins = seenCars.reduce((a, x) => a + x.n, 0) || 1;
    const by = (keyFn) => {
      const m = new Map();
      for (const x of seenCars) {
        const k = keyFn(x.car);
        m.set(k, (m.get(k) || 0) + x.n);
      }
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    const brandsSeen = new Set(seenCars.map((x) => x.car.brand)).size;
    const countriesSeen = new Set(seenCars.map((x) => x.car.country)).size;
    const today = Core.dayKey();
    const kpis = [
      ['Прокрутов', fmt(s.spins)],
      ['Разных машин', fmt(seenCars.length)],
      ['Марок', `${fmt(brandsSeen)} / ${fmt(db.brands.length)}`],
      ['Стран', `${fmt(countriesSeen)}`],
      ['Сегодня', fmt(s.days[today] || 0)],
      ['Серия', countLabel(Core.currentStreak(state), DAYS)],
      ['Лучшая серия', countLabel(Math.max(s.bestStreak, s.streak), DAYS)],
      ['В гараже', fmt(state.favorites.length)],
    ];
    setSub(`Коллекция: ${percent(seenCars.length / db.cars.length)}`);

    // Активность за 14 дней
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const key = Core.shiftDayKey(today, -i);
      days.push({ key, n: s.days[key] || 0 });
    }
    const maxDay = Math.max(1, ...days.map((d) => d.n));
    const maxIdx = days.findIndex((d) => d.n === maxDay);
    const cols = days
      .map((d, i) => {
        const h = Math.round((d.n / maxDay) * 100);
        const date = new Date(d.key + 'T12:00:00');
        const label = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        const showCap = d.n > 0 && (i === maxIdx || i === 13);
        return `<button class="col" type="button" data-tip="${esc(label)}" data-tip-value="${countLabel(d.n, ['прокрут', 'прокрута', 'прокрутов'])}" aria-label="${esc(label)}: ${d.n}" style="--h:${h}%">
          ${showCap ? `<span class="cap">${d.n}</span>` : ''}<i style="height:${h}%"></i></button>`;
      })
      .join('');
    const axis = days.map((d, i) => `<span>${i % 2 === 1 ? new Date(d.key + 'T12:00:00').getDate() : ''}</span>`).join('');

    // Редкость: факт против ожидания в текущем режиме для всей базы
    const rarityCounts = Core.RARITIES.map(() => 0);
    for (const x of seenCars) rarityCounts[x.car.rarity] += x.n;
    const expected = Core.tierOdds(db.cars, state.settings.mode);
    const rarityRows = Core.RARITIES.map((r, i) => ({
      label: r.plural,
      value: rarityCounts[i],
      text: `${fmt(rarityCounts[i])} <small>· ${percent(rarityCounts[i] / totalSpins)} (ожид. ${percent(expected[i])})</small>`,
    }));

    const rarest = seenCars.slice().sort((a, b) => b.car.rarity - a.car.rarity || a.t - b.t)[0];
    const favorite = seenCars.slice().sort((a, b) => b.n - a.n)[0];

    const topBrands = by((c) => c.brand)
      .slice(0, 8)
      .map(([k, v]) => ({ label: k, value: v }));
    const topCountries = by((c) => c.country)
      .slice(0, 8)
      .map(([k, v]) => ({ label: Core.COUNTRIES[k], value: v }));
    const decades = by((c) => Math.floor(c.y0 / 10) * 10)
      .sort((a, b) => a[0] - b[0])
      .map(([k, v]) => ({ label: k < 1950 ? `${k}-е` : `${String(k).slice(2)}-е (${k})`, value: v }));

    body.innerHTML = `
      <div class="kpis">${kpis.map(([k, v]) => `<div class="kpi"><strong>${v}</strong><span>${k}</span></div>`).join('')}</div>
      <h3 class="section-title">Прокруты за 14 дней</h3>
      <div class="cols" id="dayCols">${cols}</div><div class="cols-axis" aria-hidden="true">${axis}</div>
      <h3 class="section-title">Редкость выпадений</h3>
      ${barList(rarityRows, { colorOf: (_, i) => RARITY_COLORS[i] })}
      <h3 class="section-title">Находки</h3>
      <div class="list">
        ${rarest ? carRow(rarest.car, { meta: `Самая редкая · ${Core.RARITIES[rarest.car.rarity].name}` }) : ''}
        ${favorite && favorite.n > 1 ? carRow(favorite.car, { meta: `Выпадала чаще всех · ${countLabel(favorite.n, TIMES)}` }) : ''}
      </div>
      <h3 class="section-title">Любимые марки</h3>
      ${barList(topBrands)}
      <h3 class="section-title">Страны</h3>
      ${barList(topCountries)}
      <h3 class="section-title">Эпохи</h3>
      ${barList(decades)}
    `;
    bindTooltips($('#dayCols'));
  }

  let tipEl = null;
  function bindTooltips(root) {
    const show = (target) => {
      if (!tipEl) {
        tipEl = document.createElement('div');
        tipEl.className = 'tooltip';
        document.body.append(tipEl);
      }
      tipEl.textContent = '';
      const b = document.createElement('b');
      b.textContent = target.dataset.tipValue;
      tipEl.append(b, document.createTextNode(target.dataset.tip));
      const r = target.getBoundingClientRect();
      tipEl.style.left = `${r.left + r.width / 2}px`;
      tipEl.style.top = `${r.top}px`;
      tipEl.hidden = false;
    };
    const hide = () => {
      if (tipEl) tipEl.hidden = true;
    };
    root.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-tip]');
      if (t) show(t);
    });
    root.addEventListener('pointerleave', hide);
    root.addEventListener('focusin', (e) => {
      const t = e.target.closest('[data-tip]');
      if (t) show(t);
    });
    root.addEventListener('focusout', hide);
    sheet.addEventListener('close', hide, { once: true });
  }

  /* ---------- Фильтры ---------- */

  const PRESETS = [
    { label: '🇯🇵 Японская классика', f: { countries: ['JP'], eras: ['70s', '80s', '90s'] } },
    { label: '🏎️ Суперкары', f: { classes: ['SC', 'HC'] } },
    { label: '⚡ Электро', f: { fuels: ['E'] } },
    { label: '⛰️ Внедорожники', f: { bodies: ['suv'] } },
    { label: '🪆 СССР и Россия', f: { countries: ['RU', 'UA', 'LV'] } },
    { label: '🇩🇪 Немецкий премиум', f: { brands: ['Audi', 'BMW', 'Mercedes-Benz', 'Porsche'] } },
    { label: '🇺🇸 Маслкары', f: { countries: ['US'], classes: ['S'] } },
    { label: '📻 Ретро до 1970', f: { eras: ['pre50', '50s', '60s'] } },
    { label: '🏁 Спорткары', f: { classes: ['S'] } },
  ];

  function renderFilters(body) {
    const p = sheetParams;
    if (!p.draft) p.draft = Core.normalizeFilters(state.filters);
    const d = p.draft;

    const groups = [
      { key: 'countries', title: 'Страна', options: Object.keys(Core.COUNTRIES).map((k) => ({ key: k, name: Core.COUNTRIES[k] })), sortByCount: true },
      { key: 'bodies', title: 'Кузов', options: Object.entries(Core.BODIES).map(([k, n]) => ({ key: k, name: n })) },
      { key: 'classes', title: 'Класс', options: Object.entries(Core.CLASSES).map(([k, n]) => ({ key: k, name: n })) },
      { key: 'eras', title: 'Эпоха', options: Core.ERAS.map((e) => ({ key: e.key, name: e.name })) },
      { key: 'drives', title: 'Привод', options: Core.DRIVE_FILTERS.map((e) => ({ key: e.key, name: e.name })) },
      { key: 'fuels', title: 'Силовая установка', options: Core.FUEL_FILTERS.map((e) => ({ key: e.key, name: e.name })) },
      { key: 'rarities', title: 'Редкость', options: Core.RARITIES.map((r, i) => ({ key: r.key, name: r.plural, rarity: i })) },
    ];

    const countFor = (key, values) => {
      const base = Core.filterCars(db.cars, { ...d, [key]: [] });
      const counts = new Map(values.map((v) => [v, 0]));
      const single = (v) => Core.makePredicate({ [key]: [v] });
      for (const v of values) {
        const pred = single(v);
        let n = 0;
        for (const c of base) if (pred(c)) n++;
        counts.set(v, n);
      }
      return counts;
    };

    const groupHtml = (g) => {
      const counts = countFor(
        g.key,
        g.options.map((o) => o.key)
      );
      let opts = g.options.filter((o) => counts.get(o.key) > 0 || d[g.key].includes(o.key));
      if (g.sortByCount) opts = opts.sort((a, b) => counts.get(b.key) - counts.get(a.key));
      const hidden = g.options.length - opts.length;
      return `<section class="fgroup" data-group="${g.key}">
        <div class="fgroup-head"><h3>${g.title}</h3>${d[g.key].length ? `<button type="button" data-action="fclear" data-key="${g.key}">сбросить</button>` : ''}</div>
        <div class="choices">${opts
          .map(
            (o) =>
              `<button class="choice" type="button" data-action="ftoggle" data-key="${g.key}" data-value="${o.key}" aria-pressed="${d[g.key].includes(o.key)}">${
                o.rarity !== undefined ? `<span class="rdot" style="--rc: var(--r${o.rarity})"></span>` : ''
              }${esc(o.name)} <small>${fmt(counts.get(o.key))}</small></button>`
          )
          .join('')}${hidden ? `<span class="chip link" style="cursor:default">ещё ${hidden} — нет машин при текущих фильтрах</span>` : ''}</div>
      </section>`;
    };

    const brandCounts = countFor(
      'brands',
      db.brands.map((b) => b.name)
    );
    const bq = Core.normalizeSearch(p.brandQ || '');
    const brandOpts = db.brands
      .filter((b) => d.brands.includes(b.name) || ((brandCounts.get(b.name) || 0) > 0 && (!bq || Core.normalizeSearch(`${b.name} ${b.aka}`).includes(bq))))
      .sort((a, b) => Number(d.brands.includes(b.name)) - Number(d.brands.includes(a.name)) || byName(a.name, b.name));

    const matched = Core.filterCars(db.cars, d).length;
    setSub(`Выбери, из чего крутить`);
    body.innerHTML = `
      <div class="presets">${PRESETS.map((pr, i) => `<button class="preset" type="button" data-action="fpreset" data-index="${i}">${esc(pr.label)}</button>`).join('')}</div>
      ${groupHtml(groups[0])}
      <section class="fgroup">
        <div class="fgroup-head"><h3>Марка</h3>${d.brands.length ? '<button type="button" data-action="fclear" data-key="brands">сбросить</button>' : ''}</div>
        <div class="toolbar" style="margin-bottom:8px"><input class="input search" id="brandQ" type="search" placeholder="Найти марку" value="${esc(p.brandQ || '')}" autocomplete="off"></div>
        <div class="choices brand-choices" id="brandChoices">${
          brandOpts.length
            ? brandOpts
                .map(
                  (b) =>
                    `<button class="choice" type="button" data-action="ftoggle" data-key="brands" data-value="${esc(b.name)}" aria-pressed="${d.brands.includes(b.name)}">${esc(b.name)} <small>${fmt(
                      brandCounts.get(b.name) || 0
                    )}</small></button>`
                )
                .join('')
            : '<span class="chip link" style="cursor:default">Ничего не найдено</span>'
        }</div>
      </section>
      ${groups.slice(1).map(groupHtml).join('')}
      <section class="fgroup">
        <div class="fgroup-head"><h3>Мощность, л.с.</h3>${d.hpMin !== null || d.hpMax !== null ? '<button type="button" data-action="fclear" data-key="hp">сбросить</button>' : ''}</div>
        <div class="range-row">
          <input class="input" id="hpMin" type="number" inputmode="numeric" min="0" max="3000" placeholder="от" value="${d.hpMin ?? ''}" aria-label="Мощность от">
          <span>—</span>
          <input class="input" id="hpMax" type="number" inputmode="numeric" min="0" max="3000" placeholder="до" value="${d.hpMax ?? ''}" aria-label="Мощность до">
        </div>
        <div class="choices" style="margin-top:8px">
          ${[
            ['до 100', null, 100],
            ['100–200', 100, 200],
            ['200–400', 200, 400],
            ['400–700', 400, 700],
            ['700+', 700, null],
          ]
            .map(([l, a, b]) => `<button class="choice" type="button" data-action="fhp" data-min="${a ?? ''}" data-max="${b ?? ''}" aria-pressed="${d.hpMin === a && d.hpMax === b}">${l}</button>`)
            .join('')}
        </div>
      </section>`;

    setFoot(`<button class="btn" type="button" data-action="freset">Сбросить всё</button>
      <span class="grow match-count">Подходит: <strong>${fmt(matched)}</strong></span>
      <button class="btn primary" type="button" data-action="fapply"${matched ? '' : ' disabled'}>Показать ${countLabel(matched, CARS)}</button>`);

    const brandInput = $('#brandQ');
    brandInput.addEventListener(
      'input',
      debounce((e) => {
        p.brandQ = e.target.value;
        const pos = e.target.selectionStart;
        rerenderFilters();
        const again = $('#brandQ');
        if (again) {
          again.focus();
          try {
            again.setSelectionRange(pos, pos);
          } catch {
            /* поле type=search может не поддерживать выделение */
          }
        }
      }, 150)
    );
    const hpChange = () => {
      const a = $('#hpMin').value.trim();
      const b = $('#hpMax').value.trim();
      d.hpMin = a === '' ? null : Math.max(0, Number(a));
      d.hpMax = b === '' ? null : Math.max(0, Number(b));
      rerenderFilters();
    };
    $('#hpMin').addEventListener('change', hpChange);
    $('#hpMax').addEventListener('change', hpChange);
  }

  function rerenderFilters() {
    const bodyEl = $('#sheetBody');
    const top = bodyEl.scrollTop;
    const brandScroll = $('#brandChoices') ? $('#brandChoices').scrollTop : 0;
    renderSheet();
    bodyEl.scrollTop = top;
    if ($('#brandChoices')) $('#brandChoices').scrollTop = brandScroll;
  }

  function applyFilters() {
    state.filters = Core.normalizeFilters(sheetParams.draft);
    save();
    refreshPool();
    closeDialog(sheet);
    if (current && !pool.includes(current.car)) {
      /* текущий результат остаётся, просто он вне нового пула */
    }
    toast(`В пуле ${countLabel(pool.length, CARS)}`, { icon: '🎯' });
  }

  /* ---------- Шансы ---------- */

  function renderOddsInfo(body) {
    const counts = Core.tierCounts(pool);
    const w = Core.tierOdds(pool, 'weighted');
    const e = Core.tierOdds(pool, 'equal');
    body.innerHTML = `<div class="prose">
      <p>Случайные числа берутся из криптографического генератора браузера (<code>crypto.getRandomValues</code>) — результат нельзя предсказать или подкрутить.</p>
      <p><b>По редкости</b> — сначала разыгрывается редкость с весами из таблицы (только среди редкостей, которые есть в пуле), затем машина внутри неё. Так легенды и мифические машины ощущаются настоящей удачей.</p>
      <p><b>Равные шансы</b> — у каждой машины пула одинаковая вероятность. Обычных машин в базе больше всего, поэтому редкие выпадают ещё реже.</p>
      <p><b>Без повторов</b> — крутим только среди ещё не открытых машин пула. Когда откроешь всё, рулетка снова будет выбирать из всего пула.</p>
    </div>
    <h3 class="section-title">Шанс одного прокрута в текущем пуле (${fmt(pool.length)})</h3>
    <table class="odds-table">
      <thead><tr><th>Редкость</th><th>Машин</th><th>По редкости</th><th>Равные</th></tr></thead>
      <tbody>${Core.RARITIES.map(
        (r, i) => `<tr><td><span class="rdot" style="--rc: var(--r${i})"></span>${r.name}</td><td>${fmt(counts[i])}</td><td>${percent(w[i], 2)}</td><td>${percent(e[i], 2)}</td></tr>`
      ).join('')}</tbody>
    </table>`;
  }

  /* ---------- Настройки ---------- */

  function renderSettings(body) {
    const s = state.settings;
    const seg = (name, value, options) =>
      `<div class="segmented" role="radiogroup">${options
        .map(([v, l]) => `<button type="button" role="radio" data-action="set" data-name="${name}" data-value="${v}" aria-checked="${value === v}">${l}</button>`)
        .join('')}</div>`;
    const sw = (name, label, sub, on, disabled = false) => `<label class="set-row">
        <span class="txt"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span>
        <span class="switch"><input type="checkbox" data-setting="${name}"${on ? ' checked' : ''}${disabled ? ' disabled' : ''}></span>
      </label>`;
    setSub(`База: ${countLabel(db.cars.length, CARS)} · версия ${db.version}`);
    body.innerHTML = `<div class="settings">
      ${sw('sound', 'Звук', 'Щелчки барабанов и фанфары синтезируются прямо в браузере', s.sound)}
      <div class="set-row"><span class="txt"><b>Громкость</b></span><input type="range" min="0" max="1" step="0.05" value="${s.volume}" data-setting="volume" aria-label="Громкость"></div>
      ${sw('haptics', 'Вибрация', Fx.Haptics.supported ? 'На остановке барабанов и редких выпадениях' : 'Не поддерживается этим устройством', s.haptics && Fx.Haptics.supported, !Fx.Haptics.supported)}
      ${sw('confetti', 'Конфетти', 'Залп при редких машинах и новых находках', s.confetti)}
      <div class="set-row"><span class="txt"><b>Скорость барабанов</b></span>${seg('speed', s.speed, [
        ['fast', 'Быстро'],
        ['normal', 'Обычно'],
        ['slow', 'Медленно'],
      ])}</div>
      <div class="set-row"><span class="txt"><b>Анимации</b><small>«Как в системе» учитывает настройку «Уменьшить движение»</small></span>${seg('motion', s.motion, [
        ['auto', 'Как в системе'],
        ['reduced', 'Меньше'],
        ['full', 'Все'],
      ])}</div>
      <div class="set-row"><span class="txt"><b>Поиск фото и видео</b></span>${seg('search', s.search, [
        ['google', 'Google · YouTube'],
        ['yandex', 'Яндекс'],
      ])}</div>
      <h3 class="section-title" style="margin-top:14px">Данные</h3>
      <div class="set-row"><span class="txt"><b>Резервная копия</b><small>История, гараж, коллекция, достижения и настройки в одном файле</small></span>
        <span style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" data-action="export">${icon('download')}Сохранить</button>
        <label class="btn" style="cursor:pointer">${icon('upload')}Загрузить<input type="file" accept="application/json,.json" id="importFile" hidden></label></span></div>
      <div class="set-row"><span class="txt"><b>Сброс</b><small>Это действие нельзя отменить</small></span>
        <span style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn danger" type="button" data-action="reset" data-what="history">История</button>
          <button class="btn danger" type="button" data-action="reset" data-what="favorites">Гараж</button>
          <button class="btn danger" type="button" data-action="reset" data-what="collection">Коллекция</button>
          <button class="btn danger" type="button" data-action="reset" data-what="all">Всё</button>
        </span></div>
      <h3 class="section-title" style="margin-top:14px">О проекте</h3>
      <div class="prose" style="font-size:14px">
        <p>В базе ${countLabel(db.cars.length, CARS)}: ${db.brands.length} марок и ${fmt(db.models.length)} моделей — от Benz Patent-Motorwagen 1886 года до новинок ${new Date().getFullYear()}-го. Каждая запись — отдельное поколение модели.</p>
        <p>Характеристики справочные: мощность указана диапазоном от базовой до самой мощной версии поколения. Нашёл ошибку? Исходники базы лежат в папке <code>data/</code> <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">репозитория</a>.</p>
        <p>Всё работает локально: прогресс хранится только в этом браузере.</p>
      </div>
    </div>`;

    $$('input[data-setting]', body).forEach((el) => {
      el.addEventListener(el.type === 'range' ? 'input' : 'change', () => {
        const name = el.dataset.setting;
        s[name] = el.type === 'range' ? Number(el.value) : el.checked;
        applySettings();
        save();
        renderSoundButton();
        if (name === 'sound' && s.sound) {
          Fx.Sound.unlock();
          Fx.Sound.click();
        }
        if (name === 'haptics' && s.haptics) Fx.Haptics.pulse(20);
      });
    });
    $('#importFile').addEventListener('change', importBackup);
  }

  function setSetting(name, value) {
    state.settings[name] = value;
    applySettings();
    save();
    if (name === 'mode' || name === 'noRepeat') renderMachineControls();
    if (sheetView === 'settings') renderSheet();
    if (current) refreshCardsFor(current.car.id);
  }

  function exportBackup() {
    const data = JSON.stringify({ app: 'car-roulette', exportedAt: new Date().toISOString(), state }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `car-roulette-${Core.dayKey()}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Резервная копия сохранена', { icon: '💾' });
  }

  async function importBackup(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const incoming = Core.sanitizeState(json && json.state ? json.state : json, db);
      const n = Object.keys(incoming.seen).length;
      const ok = await confirmAction('Загрузить копию?', `В файле ${countLabel(n, CARS)} в коллекции и ${countLabel(incoming.history.length, ['запись', 'записи', 'записей'])} в истории. Текущий прогресс будет заменён.`, 'Загрузить');
      if (!ok) return;
      state = incoming;
      Core.checkAchievements(state, db);
      saveNow();
      afterStateChange();
      toast('Данные загружены', { icon: '✅' });
    } catch {
      toast('Не удалось прочитать файл', { icon: '⚠️', sub: 'Нужен JSON, сохранённый кнопкой «Сохранить».' });
    }
  }

  async function resetData(what) {
    const names = { history: 'историю', favorites: 'гараж', collection: 'коллекцию и достижения', all: 'все данные' };
    const ok = await confirmAction(`Сбросить ${names[what]}?`, 'Это действие нельзя отменить. Если сомневаешься — сначала сохрани резервную копию.', 'Сбросить');
    if (!ok) return;
    if (what === 'history') state.history = [];
    if (what === 'favorites') state.favorites = [];
    if (what === 'collection') {
      state.seen = {};
      state.achievements = {};
    }
    if (what === 'all') {
      const settings = state.settings;
      state = Core.defaultState();
      state.settings = settings;
      current = null;
    }
    saveNow();
    afterStateChange();
    toast('Готово', { icon: '🧹' });
  }

  function afterStateChange() {
    applySettings();
    refreshPool();
    renderHeader();
    renderMachineControls();
    if (current && !db.byId.has(current.car.id)) current = null;
    renderResult();
    renderRecent();
    if (!current) showIdleReels();
    if (sheetView) renderSheet();
  }

  /* ------------------------------------------------------------------ */
  /* Управление автоматом                                                 */
  /* ------------------------------------------------------------------ */

  function renderMachineControls() {
    $$('#modeSwitch button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.value === state.settings.mode)));
    $('#noRepeat').checked = state.settings.noRepeat;
    renderPoolBar();
  }

  function scrollToMachine() {
    const top = machine.getBoundingClientRect().top + window.scrollY - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  /* ------------------------------------------------------------------ */
  /* События                                                             */
  /* ------------------------------------------------------------------ */

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const a = el.dataset.action;
    const id = el.dataset.id;
    switch (a) {
      case 'open':
        openSheet(el.dataset.view);
        break;
      case 'close':
        closeDialog(el.closest('dialog'));
        break;
      case 'open-car':
        openCar(id);
        break;
      case 'fav':
        toggleFav(id);
        break;
      case 'share':
        shareCar(db.byId.get(id));
        break;
      case 'copy':
        copyText(Core.fullName(db.byId.get(id))).then((ok) => toast(ok ? 'Название скопировано' : 'Не удалось скопировать', { icon: ok ? '📋' : '⚠️' }));
        break;
      case 'spin-brand':
        spinBrand(db.byId.get(id));
        break;
      case 'remove-filter':
        removeFilter(el.dataset.key, el.dataset.value);
        break;
      case 'reset-filters':
        resetFilters();
        break;
      case 'mode':
        setSetting('mode', el.dataset.value);
        break;
      case 'toggle-sound': {
        const on = !(state.settings.sound && state.settings.volume > 0);
        state.settings.sound = on;
        if (on && state.settings.volume === 0) state.settings.volume = 0.6;
        applySettings();
        save();
        renderSoundButton();
        if (on) {
          Fx.Sound.unlock();
          Fx.Sound.click();
        }
        if (sheetView === 'settings') renderSheet();
        break;
      }
      case 'set':
        setSetting(el.dataset.name, el.dataset.value);
        break;
      case 'more':
        sheetParams.limit = (sheetParams.limit || 60) + 100;
        {
          const top = $('#sheetBody').scrollTop;
          renderSheet();
          $('#sheetBody').scrollTop = top;
        }
        break;
      case 'del-history': {
        const index = Number(el.dataset.index);
        const [removed] = state.history.splice(index, 1);
        save();
        renderSheet();
        renderRecent();
        toast('Запись удалена', {
          icon: '🗑️',
          action: {
            label: 'Вернуть',
            fn: () => {
              state.history.splice(index, 0, removed);
              save();
              renderRecent();
              if (sheetView === 'history') renderSheet();
            },
          },
        });
        break;
      }
      case 'clear-history':
        confirmAction('Очистить историю?', 'Коллекция и достижения останутся — удалится только список прокрутов.', 'Очистить').then((ok) => {
          if (!ok) return;
          const backup = state.history.slice();
          state.history = [];
          save();
          renderSheet();
          renderRecent();
          toast('История очищена', {
            icon: '🧹',
            action: {
              label: 'Вернуть',
              fn: () => {
                state.history = backup;
                save();
                renderRecent();
                if (sheetView === 'history') renderSheet();
              },
            },
          });
        });
        break;
      case 'tab':
        sheetParams.tab = el.dataset.tab;
        renderSheet();
        break;
      case 'brand':
        sheetParams.brand = el.dataset.brand;
        renderSheet();
        $('#sheetBody').scrollTop = 0;
        break;
      case 'brand-back':
        sheetParams.brand = null;
        renderSheet();
        break;
      case 'ftoggle': {
        const d = sheetParams.draft;
        const key = el.dataset.key;
        const v = el.dataset.value;
        d[key] = d[key].includes(v) ? d[key].filter((x) => x !== v) : [...d[key], v];
        rerenderFilters();
        break;
      }
      case 'fclear': {
        const d = sheetParams.draft;
        if (el.dataset.key === 'hp') {
          d.hpMin = null;
          d.hpMax = null;
        } else d[el.dataset.key] = [];
        rerenderFilters();
        break;
      }
      case 'fhp': {
        const d = sheetParams.draft;
        const mn = el.dataset.min === '' ? null : Number(el.dataset.min);
        const mx = el.dataset.max === '' ? null : Number(el.dataset.max);
        const same = d.hpMin === mn && d.hpMax === mx;
        d.hpMin = same ? null : mn;
        d.hpMax = same ? null : mx;
        rerenderFilters();
        break;
      }
      case 'fpreset':
        sheetParams.draft = Core.normalizeFilters(PRESETS[Number(el.dataset.index)].f);
        rerenderFilters();
        break;
      case 'freset':
        sheetParams.draft = Core.normalizeFilters({});
        sheetParams.brandQ = '';
        rerenderFilters();
        break;
      case 'fapply':
        applyFilters();
        break;
      case 'export':
        exportBackup();
        break;
      case 'reset':
        resetData(el.dataset.what);
        break;
      default:
        break;
    }
  });

  spinBtn.addEventListener('click', spin);
  $('#noRepeat').addEventListener('change', (e) => {
    setSetting('noRepeat', e.target.checked);
    if (e.target.checked) {
      const left = pool.filter((c) => !state.seen[c.id]).length;
      toast(left ? `Осталось открыть: ${countLabel(left, CARS)}` : 'В этом пуле всё уже открыто', { icon: '🧭' });
    }
  });

  $('#result').addEventListener('pointermove', onTiltMove);
  $('#result').addEventListener('pointerleave', onTiltLeave);

  const quickSpin = $('#quickSpin');
  quickSpin.addEventListener('click', async () => {
    if (spinning) return;
    scrollToMachine();
    await wait(reducedMotion() ? 0 : 420);
    spin();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => {
        quickSpin.classList.toggle('show', !entry.isIntersecting && !!current);
      },
      { threshold: 0.2 }
    ).observe(spinBtn);
  }

  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if ([sheet, carDialog, confirmDialog].some((d) => d.open)) return;
    if (e.target.closest && e.target.closest('input, select, textarea, button, a, [contenteditable]')) return;
    if (e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      spin();
    } else if ((e.key === 'f' || e.key === 'а' || e.key === 'F' || e.key === 'А') && current && !spinning) {
      toggleFav(current.car.id);
    }
  });

  // Звук можно включить только после жеста пользователя.
  ['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, () => Fx.Sound.unlock(), { once: true, passive: true }));

  if (motionQuery.addEventListener) motionQuery.addEventListener('change', applySettings);

  window.addEventListener(
    'resize',
    debounce(() => reels.forEach((r) => r.recenter()), 120)
  );

  function handleHash() {
    const m = /^#car=(.+)$/.exec(location.hash);
    if (m) openCar(decodeURIComponent(m[1]));
  }
  window.addEventListener('hashchange', handleHash);

  /* ------------------------------------------------------------------ */
  /* Запуск                                                              */
  /* ------------------------------------------------------------------ */

  function init() {
    applySettings();
    Fx.Confetti.init($('#fx'));
    $('#lights').innerHTML = Array.from({ length: 22 }, (_, i) => `<i style="--i:${i}"></i>`).join('');
    refreshPool();
    renderHeader();
    renderMachineControls();
    renderDaily();

    const last = state.history[0] && db.byId.get(state.history[0].id);
    if (last) {
      current = { car: last, odds: undefined, isNew: false };
      showCarOnReels(last);
      $('#result').innerHTML = carCardHtml(last, {});
      machine.style.setProperty('--win', RARITY_COLORS[last.rarity]);
    } else {
      showIdleReels();
      renderResult();
    }
    renderRecent();
    setSpinButton();
    // Шрифт может догрузиться позже и поменять высоту строк.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => reels.forEach((r) => r.recenter()));

    if (wasMigrated) {
      saveNow();
      toast('Прогресс перенесён из прошлой версии', { icon: '📦', sub: `В коллекции ${countLabel(Object.keys(state.seen).length, CARS)} из новой базы.` });
    }
    handleHash();

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    }
  }

  init();
})();
