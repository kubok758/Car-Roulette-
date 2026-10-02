/*
 * CAR ROULETTE — core logic.
 *
 * Pure functions with no DOM access. The same file is used by the browser app,
 * by the data build script (scripts/build-data.mjs) and by the unit tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CarCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Dictionaries                                                        */
  /* ------------------------------------------------------------------ */

  const RARITIES = [
    { key: 'common', name: 'Обычная', plural: 'Обычные', weight: 52 },
    { key: 'uncommon', name: 'Необычная', plural: 'Необычные', weight: 26 },
    { key: 'rare', name: 'Редкая', plural: 'Редкие', weight: 13 },
    { key: 'epic', name: 'Эпическая', plural: 'Эпические', weight: 6 },
    { key: 'legendary', name: 'Легендарная', plural: 'Легендарные', weight: 2.5 },
    { key: 'mythic', name: 'Мифическая', plural: 'Мифические', weight: 0.5 },
  ];
  const RARITY_INDEX = Object.fromEntries(RARITIES.map((r, i) => [r.key, i]));

  const COUNTRIES = {
    JP: 'Япония',
    DE: 'Германия',
    US: 'США',
    UK: 'Великобритания',
    IT: 'Италия',
    FR: 'Франция',
    KR: 'Южная Корея',
    CN: 'Китай',
    RU: 'Россия / СССР',
    SE: 'Швеция',
    CZ: 'Чехия',
    ES: 'Испания',
    RO: 'Румыния',
    NL: 'Нидерланды',
    HR: 'Хорватия',
    DK: 'Дания',
    AT: 'Австрия',
    PL: 'Польша',
    RS: 'Сербия',
    UA: 'Украина',
    UZ: 'Узбекистан',
    LV: 'Латвия',
    BY: 'Беларусь',
    TR: 'Турция',
    IN: 'Индия',
    MY: 'Малайзия',
    VN: 'Вьетнам',
    AU: 'Австралия',
    AE: 'ОАЭ',
  };

  const BODIES = {
    sedan: 'Седан',
    hatch: 'Хэтчбек',
    lift: 'Лифтбек',
    wagon: 'Универсал',
    coupe: 'Купе',
    cabrio: 'Кабриолет',
    roadster: 'Родстер',
    xover: 'Кроссовер',
    suv: 'Внедорожник',
    pickup: 'Пикап',
    minivan: 'Минивэн',
    van: 'Фургон / микроавтобус',
  };

  const CLASSES = {
    A: 'Городской (A)',
    B: 'Малый (B)',
    C: 'Компактный (C)',
    D: 'Средний (D)',
    E: 'Бизнес (E)',
    F: 'Представительский (F)',
    S: 'Спорткар',
    SC: 'Суперкар',
    HC: 'Гиперкар',
    LCV: 'Коммерческий',
  };

  const DRIVES = { F: 'передний', R: 'задний', A: 'полный', 4: 'полный (4×4)' };
  const FUELS = {
    P: 'бензин',
    D: 'дизель',
    H: 'гибрид',
    PH: 'плагин-гибрид',
    E: 'электро',
    FC: 'водород',
  };

  /** Filter groups shown in the UI. Each option maps to a predicate over a car. */
  const DRIVE_FILTERS = [
    { key: 'F', name: 'Передний', test: (c) => c.drives.includes('F') },
    { key: 'R', name: 'Задний', test: (c) => c.drives.includes('R') },
    { key: 'AWD', name: 'Полный', test: (c) => c.drives.includes('A') || c.drives.includes('4') },
  ];
  const FUEL_FILTERS = [
    { key: 'P', name: 'Бензин', test: (c) => c.fuels.includes('P') },
    { key: 'D', name: 'Дизель', test: (c) => c.fuels.includes('D') },
    { key: 'H', name: 'Гибрид', test: (c) => c.fuels.includes('H') || c.fuels.includes('PH') },
    { key: 'E', name: 'Электро', test: (c) => c.fuels.includes('E') },
    { key: 'FC', name: 'Водород', test: (c) => c.fuels.includes('FC') },
  ];
  const ERAS = [
    { key: 'pre50', name: 'До 1950', from: 0, to: 1949 },
    { key: '50s', name: '50-е', from: 1950, to: 1959 },
    { key: '60s', name: '60-е', from: 1960, to: 1969 },
    { key: '70s', name: '70-е', from: 1970, to: 1979 },
    { key: '80s', name: '80-е', from: 1980, to: 1989 },
    { key: '90s', name: '90-е', from: 1990, to: 1999 },
    { key: '00s', name: '2000-е', from: 2000, to: 2009 },
    { key: '10s', name: '2010-е', from: 2010, to: 2019 },
    { key: '20s', name: '2020-е', from: 2020, to: 9999 },
  ];

  const EMPTY_FILTERS = Object.freeze({
    countries: [],
    bodies: [],
    classes: [],
    drives: [],
    fuels: [],
    eras: [],
    rarities: [],
    brands: [],
    hpMin: null,
    hpMax: null,
  });

  /* ------------------------------------------------------------------ */
  /* Text helpers                                                        */
  /* ------------------------------------------------------------------ */

  /** Same slug algorithm as v3 of the app, so old saved ids keep matching. */
  function slugify(s) {
    return String(s)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9а-я]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /** Normalises text for search: case, ё/е, diacritics and punctuation. */
  function normalizeSearch(s) {
    return String(s)
      .toLowerCase()
      .replace(/ё/g, 'е')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[«»"'’`]/g, '')
      .replace(/[\s\-_/.,]+/g, ' ')
      .trim();
  }

  function carId(brand, model, gen, y0) {
    return [brand, model, gen, y0].map(slugify).join('-');
  }

  function splitList(s) {
    return String(s || '')
      .split('/')
      .map((x) => x.trim())
      .filter(Boolean);
  }

  /* ------------------------------------------------------------------ */
  /* Database expansion                                                  */
  /* ------------------------------------------------------------------ */

  /**
   * Expands the compact database produced by scripts/build-data.mjs into
   * plain objects that are convenient to work with.
   *
   * raw.brands: [name, country, aka?]
   * raw.models: [brandIdx, name, bodies, cls, drives, fuels, fact?, aka?]
   * raw.cars:   [modelIdx, gen, y0, y1|0, hp0|0, hp1|0, rarity, fact?, overrides?]
   */
  function expandDb(raw) {
    const brands = raw.brands.map(([name, country, aka], i) => ({
      idx: i,
      name,
      country,
      aka: aka || '',
      count: 0,
    }));
    const models = raw.models.map(([b, name, bodies, cls, drives, fuels, fact, aka], i) => ({
      idx: i,
      brand: brands[b],
      name,
      aka: aka || '',
      bodies: splitList(bodies),
      cls,
      drives: splitList(drives),
      fuels: splitList(fuels),
      fact: fact || '',
      cars: [],
    }));

    const cars = raw.cars.map((row, idx) => {
      const [m, gen, y0, y1, hp0, hp1, rarity, fact, o] = row;
      const model = models[m];
      const brand = model.brand;
      const ov = o || {};
      const car = {
        idx,
        id: carId(brand.name, model.name, gen, y0),
        brand: brand.name,
        brandIdx: brand.idx,
        modelIdx: model.idx,
        model: model.name,
        gen: String(gen),
        y0,
        y1: y1 || null,
        hp0: hp0 || null,
        hp1: hp1 || hp0 || null,
        rarity,
        bodies: ov.b ? splitList(ov.b) : model.bodies,
        cls: ov.k || model.cls,
        drives: ov.d ? splitList(ov.d) : model.drives,
        fuels: ov.f ? splitList(ov.f) : model.fuels,
        country: ov.c || brand.country,
        fact: fact || model.fact || '',
        genNo: 0,
        genTotal: 0,
        search: '',
      };
      car.search = normalizeSearch(
        [brand.name, brand.aka, model.name, model.aka, car.gen, y0, COUNTRIES[car.country] || ''].join(' ')
      );
      model.cars.push(car);
      brand.count++;
      return car;
    });

    for (const model of models) {
      const sorted = model.cars.slice().sort((a, b) => a.y0 - b.y0 || a.idx - b.idx);
      sorted.forEach((c, i) => {
        c.genNo = i + 1;
        c.genTotal = sorted.length;
      });
    }

    const byId = new Map(cars.map((c) => [c.id, c]));
    return { version: raw.version || '', brands, models, cars, byId };
  }

  /* ------------------------------------------------------------------ */
  /* Labels                                                              */
  /* ------------------------------------------------------------------ */

  function yearsLabel(car) {
    if (!car.y1) return `${car.y0} — н. в.`;
    if (car.y1 === car.y0) return String(car.y0);
    return `${car.y0}–${car.y1}`;
  }

  function powerLabel(car) {
    if (!car.hp0) return '';
    if (car.hp1 && car.hp1 !== car.hp0) return `${car.hp0}–${car.hp1} л.с.`;
    return `${car.hp0} л.с.`;
  }

  function capitalize(s) {
    return s ? s[0].toUpperCase() + s.slice(1) : s;
  }

  function listLabel(codes, dict) {
    return capitalize(codes.map((c) => dict[c] || c).join(', ').toLowerCase());
  }

  function drivesLabel(car) {
    return capitalize(car.drives.map((d) => DRIVES[d] || d).join(' / '));
  }

  function fuelsLabel(car) {
    return capitalize(car.fuels.map((f) => FUELS[f] || f).join(', '));
  }

  function fullName(car) {
    return `${car.brand} ${car.model} ${car.gen}`;
  }

  /* ------------------------------------------------------------------ */
  /* Randomness                                                          */
  /* ------------------------------------------------------------------ */

  /** Uniform float in [0, 1) with 53 bits of entropy from the CSPRNG. */
  function cryptoRandom() {
    const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
    if (c && typeof c.getRandomValues === 'function') {
      const a = new Uint32Array(2);
      c.getRandomValues(a);
      return (a[0] * 2097152 + (a[1] >>> 11)) / 9007199254740992;
    }
    return Math.random();
  }

  function randInt(n, rnd) {
    return Math.floor((rnd || cryptoRandom)() * n);
  }

  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /** Small deterministic PRNG for reproducible picks (e.g. «машина дня»). */
  function seededRandom(seed) {
    let a = typeof seed === 'number' ? seed >>> 0 : hashString(String(seed));
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(i + 1, rnd);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ------------------------------------------------------------------ */
  /* Filtering and picking                                               */
  /* ------------------------------------------------------------------ */

  function normalizeFilters(f) {
    const out = {};
    const src = f && typeof f === 'object' ? f : {};
    for (const key of Object.keys(EMPTY_FILTERS)) {
      if (Array.isArray(EMPTY_FILTERS[key])) {
        out[key] = Array.isArray(src[key]) ? src[key].map(String) : [];
      } else {
        const n = Number(src[key]);
        out[key] = src[key] === null || src[key] === '' || src[key] === undefined || !Number.isFinite(n) ? null : n;
      }
    }
    return out;
  }

  function activeFilterCount(f) {
    const n = normalizeFilters(f);
    let count = 0;
    for (const key of Object.keys(EMPTY_FILTERS)) {
      if (Array.isArray(n[key])) count += n[key].length ? 1 : 0;
    }
    if (n.hpMin !== null || n.hpMax !== null) count++;
    return count;
  }

  function overlapsEra(car, era, nowYear) {
    const end = car.y1 || nowYear;
    return car.y0 <= era.to && end >= era.from;
  }

  function makePredicate(filters, nowYear) {
    const f = normalizeFilters(filters);
    const year = nowYear || new Date().getFullYear();
    const tests = [];
    const anyOf = (values, fn) => {
      if (values.length) tests.push((c) => values.some((v) => fn(c, v)));
    };
    anyOf(f.countries, (c, v) => c.country === v);
    anyOf(f.bodies, (c, v) => c.bodies.includes(v));
    anyOf(f.classes, (c, v) => c.cls === v);
    anyOf(f.brands, (c, v) => c.brand === v);
    anyOf(f.rarities, (c, v) => RARITIES[c.rarity].key === v);
    anyOf(f.drives, (c, v) => {
      const opt = DRIVE_FILTERS.find((o) => o.key === v);
      return !!opt && opt.test(c);
    });
    anyOf(f.fuels, (c, v) => {
      const opt = FUEL_FILTERS.find((o) => o.key === v);
      return !!opt && opt.test(c);
    });
    anyOf(f.eras, (c, v) => {
      const era = ERAS.find((e) => e.key === v);
      return !!era && overlapsEra(c, era, year);
    });
    if (f.hpMin !== null) tests.push((c) => !!c.hp1 && c.hp1 >= f.hpMin);
    if (f.hpMax !== null) tests.push((c) => !!c.hp0 && c.hp0 <= f.hpMax);
    return (c) => tests.every((t) => t(c));
  }

  function filterCars(cars, filters, nowYear) {
    const pred = makePredicate(filters, nowYear);
    return cars.filter(pred);
  }

  const TRANSLIT = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
    н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };

  /** Варианты слова запроса: как есть и в латинской транслитерации («супра» → «supra»). */
  function wordVariants(word) {
    if (!/[а-я]/.test(word)) return [word];
    const latin = word.replace(/[а-я]/g, (ch) => TRANSLIT[ch] ?? ch);
    return [word, latin, latin.replace(/k/g, 'c'), latin.replace(/s/g, 'c')];
  }

  function searchCars(cars, query) {
    const words = normalizeSearch(query).split(' ').filter(Boolean).map(wordVariants);
    if (!words.length) return cars;
    return cars.filter((c) => words.every((variants) => variants.some((w) => c.search.includes(w))));
  }

  function tierCounts(pool) {
    const counts = RARITIES.map(() => 0);
    for (const c of pool) counts[c.rarity]++;
    return counts;
  }

  /** Probability of each rarity tier for the given pool and mode. */
  function tierOdds(pool, mode) {
    const counts = tierCounts(pool);
    if (!pool.length) return counts.map(() => 0);
    if (mode === 'equal') return counts.map((n) => n / pool.length);
    const weights = counts.map((n, i) => (n ? RARITIES[i].weight : 0));
    const total = weights.reduce((a, b) => a + b, 0);
    return weights.map((w) => w / total);
  }

  /** Probability that one spin lands on exactly this car. */
  function carOdds(car, pool, mode) {
    if (!pool.length || !pool.includes(car)) return 0;
    if (mode === 'equal') return 1 / pool.length;
    const counts = tierCounts(pool);
    return tierOdds(pool, mode)[car.rarity] / counts[car.rarity];
  }

  /**
   * Picks a car. In "weighted" mode a rarity tier is drawn first (only among
   * tiers present in the pool), then a car uniformly inside that tier.
   * In "equal" mode every car in the pool has the same chance.
   */
  function pickCar(pool, mode, rnd) {
    if (!pool.length) return null;
    const r = rnd || cryptoRandom;
    if (mode === 'equal') return pool[randInt(pool.length, r)];
    const tiers = RARITIES.map(() => []);
    for (const c of pool) tiers[c.rarity].push(c);
    const odds = tierOdds(pool, mode);
    let x = r();
    let tier = -1;
    for (let i = 0; i < odds.length; i++) {
      if (!odds[i]) continue;
      tier = i;
      x -= odds[i];
      if (x < 0) break;
    }
    const list = tiers[tier];
    return list[randInt(list.length, r)];
  }

  function dailyCar(cars, key) {
    const candidates = cars.filter((c) => c.rarity >= 1);
    const list = candidates.length ? candidates : cars;
    if (!list.length) return null;
    return list[Math.floor(seededRandom('daily:' + key)() * list.length)];
  }

  /* ------------------------------------------------------------------ */
  /* Dates                                                               */
  /* ------------------------------------------------------------------ */

  function dayKey(d) {
    const date = d || new Date();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${m}-${dd}`;
  }

  function shiftDayKey(key, delta) {
    const [y, m, d] = key.split('-').map(Number);
    return dayKey(new Date(y, m - 1, d + delta));
  }

  /* ------------------------------------------------------------------ */
  /* Persistent state                                                    */
  /* ------------------------------------------------------------------ */

  const STATE_VERSION = 4;
  const HISTORY_LIMIT = 1000;

  const DEFAULT_SETTINGS = Object.freeze({
    sound: true,
    volume: 0.6,
    haptics: true,
    confetti: true,
    speed: 'normal', // fast | normal | slow
    motion: 'auto', // auto | reduced | full
    mode: 'weighted', // weighted | equal
    noRepeat: false,
    search: 'google', // google | yandex
  });

  function defaultState() {
    return {
      v: STATE_VERSION,
      history: [],
      favorites: [],
      seen: {},
      achievements: {},
      stats: { spins: 0, days: {}, streak: 0, bestStreak: 0, lastDay: '', lastId: '', flags: {} },
      settings: Object.assign({}, DEFAULT_SETTINGS),
      filters: normalizeFilters(EMPTY_FILTERS),
    };
  }

  const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  const toInt = (x, d) => (Number.isFinite(Number(x)) ? Math.max(0, Math.floor(Number(x))) : d);

  /** Validates and repairs a state object (used on load and on import). */
  function sanitizeState(input, db) {
    const s = defaultState();
    if (!isObj(input)) return s;
    const known = (id) => typeof id === 'string' && (!db || db.byId.has(id));

    if (Array.isArray(input.history)) {
      s.history = input.history
        .filter((h) => isObj(h) && known(h.id) && Number.isFinite(Number(h.t)))
        .map((h) => ({ id: h.id, t: Number(h.t) }))
        .slice(0, HISTORY_LIMIT);
    }
    if (Array.isArray(input.favorites)) {
      s.favorites = [...new Set(input.favorites.filter(known))];
    }
    if (isObj(input.seen)) {
      for (const [id, v] of Object.entries(input.seen)) {
        if (!known(id) || !Array.isArray(v)) continue;
        s.seen[id] = [Math.max(1, toInt(v[0], 1)), toInt(v[1], Date.now())];
      }
    }
    if (isObj(input.achievements)) {
      for (const [id, t] of Object.entries(input.achievements)) {
        if (Number.isFinite(Number(t))) s.achievements[id] = Number(t);
      }
    }
    if (isObj(input.stats)) {
      const st = input.stats;
      s.stats.spins = toInt(st.spins, 0);
      s.stats.streak = toInt(st.streak, 0);
      s.stats.bestStreak = Math.max(toInt(st.bestStreak, 0), s.stats.streak);
      s.stats.lastDay = typeof st.lastDay === 'string' ? st.lastDay : '';
      s.stats.lastId = typeof st.lastId === 'string' ? st.lastId : '';
      if (isObj(st.days)) {
        for (const [k, n] of Object.entries(st.days)) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(k)) s.stats.days[k] = toInt(n, 0);
        }
      }
      if (isObj(st.flags)) {
        for (const [k, v] of Object.entries(st.flags)) if (v) s.stats.flags[k] = true;
      }
    }
    if (isObj(input.settings)) {
      const src = input.settings;
      const st = s.settings;
      for (const key of ['sound', 'haptics', 'confetti', 'noRepeat']) {
        if (typeof src[key] === 'boolean') st[key] = src[key];
      }
      if (Number.isFinite(Number(src.volume))) st.volume = Math.min(1, Math.max(0, Number(src.volume)));
      if (['fast', 'normal', 'slow'].includes(src.speed)) st.speed = src.speed;
      if (['auto', 'reduced', 'full'].includes(src.motion)) st.motion = src.motion;
      if (['weighted', 'equal'].includes(src.mode)) st.mode = src.mode;
      if (['google', 'yandex'].includes(src.search)) st.search = src.search;
    }
    s.filters = normalizeFilters(input.filters);
    if (db) {
      const brandNames = new Set(db.brands.map((b) => b.name));
      s.filters.brands = s.filters.brands.filter((b) => brandNames.has(b));
    }
    return s;
  }

  /**
   * Maps an id from the old (v3) database to the current one. Exact ids are
   * kept; otherwise a car of the same brand+model with the same start year is
   * looked up (generation names were renamed in the new database).
   */
  function resolveLegacyId(oldId, db, index) {
    if (db.byId.has(oldId)) return oldId;
    const m = /^(.*)-(\d{4})$/.exec(String(oldId));
    if (!m) return null;
    const idx = index || legacyIndex(db);
    const list = idx.get(Number(m[2])) || [];
    let best = null;
    for (const { prefix, id } of list) {
      if (m[1].startsWith(prefix) && (!best || prefix.length > best.prefix.length)) best = { prefix, id };
    }
    return best ? best.id : null;
  }

  function legacyIndex(db) {
    const idx = new Map();
    for (const c of db.cars) {
      const prefix = `${slugify(c.brand)}-${slugify(c.model)}-`;
      if (!idx.has(c.y0)) idx.set(c.y0, []);
      idx.get(c.y0).push({ prefix, id: c.id });
    }
    return idx;
  }

  /** Converts the localStorage contents of v3 (carRoulette.v3.*) into a v4 state. */
  function migrateV3(old, db) {
    const s = defaultState();
    if (!isObj(old)) return s;
    const index = legacyIndex(db);
    const map = (id) => resolveLegacyId(id, db, index);

    const history = Array.isArray(old.history) ? old.history : [];
    for (const h of history) {
      const id = isObj(h) && map(h.id);
      if (id) s.history.push({ id, t: Number(h.ts) || Date.now() });
    }
    s.history = s.history.slice(0, HISTORY_LIMIT);

    const counts = {};
    const first = {};
    for (const h of s.history) {
      counts[h.id] = (counts[h.id] || 0) + 1;
      first[h.id] = Math.min(first[h.id] || Infinity, h.t);
    }
    for (const oldId of Array.isArray(old.discovered) ? old.discovered : []) {
      const id = map(oldId);
      if (id) s.seen[id] = [counts[id] || 1, first[id] || Date.now()];
    }
    for (const id of Object.keys(counts)) {
      if (!s.seen[id]) s.seen[id] = [counts[id], first[id]];
    }

    s.favorites = [...new Set((Array.isArray(old.favorites) ? old.favorites : []).map(map).filter(Boolean))];

    if (isObj(old.stats)) {
      s.stats.spins = Math.max(toInt(old.stats.spins, 0), s.history.length);
      s.stats.streak = toInt(old.stats.streak, 0);
      s.stats.bestStreak = s.stats.streak;
      s.stats.lastDay = typeof old.stats.lastDay === 'string' ? old.stats.lastDay : '';
      if (isObj(old.stats.daily)) {
        for (const [k, n] of Object.entries(old.stats.daily)) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(k)) s.stats.days[k] = toInt(n, 0);
        }
      }
    }
    if (isObj(old.settings)) {
      if (typeof old.settings.sound === 'boolean') s.settings.sound = old.settings.sound;
      if (typeof old.settings.confetti === 'boolean') s.settings.confetti = old.settings.confetti;
      if (Number.isFinite(Number(old.settings.volume))) {
        s.settings.volume = Math.min(1, Math.max(0, Number(old.settings.volume)));
      }
      if (old.settings.reduced === true) s.settings.motion = 'reduced';
    }
    return s;
  }

  /**
   * Records a spin result in the state (mutates it).
   * Returns { isNew } — whether the car was seen for the first time.
   */
  function recordSpin(state, car, now) {
    const date = now || new Date();
    const t = date.getTime();
    const today = dayKey(date);
    const st = state.stats;
    const isNew = !state.seen[car.id];

    if (st.lastId === car.id) st.flags.double = true;
    if (date.getHours() < 5) st.flags.night = true;

    state.history.unshift({ id: car.id, t });
    if (state.history.length > HISTORY_LIMIT) state.history.length = HISTORY_LIMIT;
    state.seen[car.id] = isNew ? [1, t] : [state.seen[car.id][0] + 1, state.seen[car.id][1]];

    st.spins++;
    st.lastId = car.id;
    st.days[today] = (st.days[today] || 0) + 1;
    if (st.lastDay !== today) {
      st.streak = st.lastDay === shiftDayKey(today, -1) ? st.streak + 1 : 1;
      st.lastDay = today;
    }
    st.bestStreak = Math.max(st.bestStreak, st.streak);
    return { isNew };
  }

  /** Current streak, taking into account that a missed day breaks it. */
  function currentStreak(state, now) {
    const today = dayKey(now || new Date());
    const st = state.stats;
    if (st.lastDay === today || st.lastDay === shiftDayKey(today, -1)) return st.streak;
    return 0;
  }

  /* ------------------------------------------------------------------ */
  /* Collection profile and achievements                                 */
  /* ------------------------------------------------------------------ */

  function buildProfile(state, db) {
    const cars = Object.keys(state.seen)
      .map((id) => db.byId.get(id))
      .filter(Boolean);
    const brands = new Set();
    const countries = new Set();
    const models = new Set();
    const rarity = RARITIES.map(() => 0);
    const perBrand = new Map();
    let ev = 0;
    let offroad = 0;
    let classic = 0;
    let prewar = 0;
    let hyper = 0;
    let russian = 0;
    for (const c of cars) {
      brands.add(c.brand);
      countries.add(c.country);
      models.add(`${c.brand}|${c.model}`);
      rarity[c.rarity]++;
      perBrand.set(c.brand, (perBrand.get(c.brand) || 0) + 1);
      if (c.fuels.includes('E')) ev++;
      if (c.bodies.includes('suv')) offroad++;
      if (c.y0 < 1970) classic++;
      if (c.y0 < 1946) prewar++;
      if (c.cls === 'HC') hyper++;
      if (c.country === 'RU') russian++;
    }
    let completeBrands = 0;
    for (const b of db.brands) {
      if (b.count >= 5 && perBrand.get(b.name) === b.count) completeBrands++;
    }
    const rarityAtLeast = (n) => rarity.slice(n).reduce((a, b) => a + b, 0);
    return {
      spins: state.stats.spins,
      unique: cars.length,
      total: db.cars.length,
      brands,
      countries,
      models,
      rarity,
      rarityAtLeast,
      ev,
      offroad,
      classic,
      prewar,
      hyper,
      russian,
      completeBrands,
      favorites: state.favorites.length,
      bestStreak: Math.max(state.stats.bestStreak, state.stats.streak),
      flags: state.stats.flags,
      hasModel: (brand, re) => cars.some((c) => c.brand === brand && re.test(c.model)),
    };
  }

  const countOf = (list) => (p) => list.filter((b) => p.brands.has(b)).length;

  const ACHIEVEMENTS = [
    { id: 'spin1', icon: '🔑', title: 'Ключ на старт', desc: 'Сделай первый прокрут', goal: 1, value: (p) => p.spins },
    { id: 'spin10', icon: '🔥', title: 'Разогрев', desc: '10 прокрутов', goal: 10, value: (p) => p.spins },
    { id: 'spin50', icon: '🏁', title: 'В потоке', desc: '50 прокрутов', goal: 50, value: (p) => p.spins },
    { id: 'spin100', icon: '💯', title: 'Сотня', desc: '100 прокрутов', goal: 100, value: (p) => p.spins },
    { id: 'spin500', icon: '🎰', title: 'Завсегдатай', desc: '500 прокрутов', goal: 500, value: (p) => p.spins },
    { id: 'spin1000', icon: '🏆', title: 'Тысячник', desc: '1000 прокрутов', goal: 1000, value: (p) => p.spins },
    { id: 'uniq25', icon: '🚗', title: 'Автосалон', desc: '25 разных машин', goal: 25, value: (p) => p.unique },
    { id: 'uniq100', icon: '🅿️', title: 'Автопарк', desc: '100 разных машин', goal: 100, value: (p) => p.unique },
    { id: 'uniq500', icon: '🏛️', title: 'Автомузей', desc: '500 разных машин', goal: 500, value: (p) => p.unique },
    { id: 'uniq1000', icon: '📚', title: 'Энциклопедист', desc: '1000 разных машин', goal: 1000, value: (p) => p.unique },
    { id: 'rare', icon: '💎', title: 'Редкий экземпляр', desc: 'Выбей редкую машину или круче', goal: 1, value: (p) => p.rarityAtLeast(2) },
    { id: 'epic', icon: '🔮', title: 'Эпик!', desc: 'Выбей эпическую машину или круче', goal: 1, value: (p) => p.rarityAtLeast(3) },
    { id: 'legend', icon: '👑', title: 'Легенда', desc: 'Выбей легендарную машину', goal: 1, value: (p) => p.rarityAtLeast(4) },
    { id: 'mythic', icon: '🐉', title: 'Миф', desc: 'Выбей мифическую машину', goal: 1, value: (p) => p.rarity[5] },
    { id: 'hyper3', icon: '⚡', title: 'Клуб гиперкаров', desc: 'Открой 3 гиперкара', goal: 3, value: (p) => p.hyper },
    { id: 'brands25', icon: '🏷️', title: 'Знаток марок', desc: 'Машины 25 разных марок', goal: 25, value: (p) => p.brands.size },
    { id: 'brands60', icon: '🎖️', title: 'Марочник', desc: 'Машины 60 разных марок', goal: 60, value: (p) => p.brands.size },
    { id: 'brands100', icon: '🌟', title: 'Автоэксперт', desc: 'Машины 100 разных марок', goal: 100, value: (p) => p.brands.size },
    { id: 'world10', icon: '🌍', title: 'Кругосветка', desc: 'Машины из 10 стран', goal: 10, value: (p) => p.countries.size },
    { id: 'world20', icon: '🛫', title: 'Гражданин мира', desc: 'Машины из 20 стран', goal: 20, value: (p) => p.countries.size },
    { id: 'russia10', icon: '🪆', title: 'Отечественный автопром', desc: '10 машин из России и СССР', goal: 10, value: (p) => p.russian },
    { id: 'ev10', icon: '🔋', title: 'На электричестве', desc: '10 электромобилей', goal: 10, value: (p) => p.ev },
    { id: 'offroad10', icon: '⛰️', title: 'Покоритель бездорожья', desc: '10 внедорожников', goal: 10, value: (p) => p.offroad },
    { id: 'classic10', icon: '📻', title: 'Ретро', desc: '10 машин, выпуск которых начался до 1970 года', goal: 10, value: (p) => p.classic },
    { id: 'prewar', icon: '🎩', title: 'Довоенный раритет', desc: 'Машина, выпуск которой начался до 1946 года', goal: 1, value: (p) => p.prewar },
    {
      id: 'italy',
      icon: '🇮🇹',
      title: 'Итальянская страсть',
      desc: 'Ferrari, Lamborghini, Maserati и Alfa Romeo',
      goal: 4,
      value: countOf(['Ferrari', 'Lamborghini', 'Maserati', 'Alfa Romeo']),
    },
    {
      id: 'german3',
      icon: '🇩🇪',
      title: 'Немецкая тройка',
      desc: 'BMW, Mercedes-Benz и Audi',
      goal: 3,
      value: countOf(['BMW', 'Mercedes-Benz', 'Audi']),
    },
    {
      id: 'jdm',
      icon: '🗾',
      title: 'Легенды JDM',
      desc: 'Toyota Supra, Nissan Skyline или GT-R, Mazda RX-7 и Honda NSX',
      goal: 4,
      value: (p) =>
        [
          p.hasModel('Toyota', /Supra/),
          p.hasModel('Nissan', /Skyline|GT-R/),
          p.hasModel('Mazda', /RX-7/),
          p.hasModel('Honda', /NSX/) || p.hasModel('Acura', /NSX/),
        ].filter(Boolean).length,
    },
    { id: 'complete', icon: '🧩', title: 'Полный комплект', desc: 'Открой все машины марки, у которой их хотя бы 5', goal: 1, value: (p) => p.completeBrands },
    { id: 'streak3', icon: '📅', title: 'Привычка', desc: 'Крути 3 дня подряд', goal: 3, value: (p) => p.bestStreak },
    { id: 'streak7', icon: '🗓️', title: 'Неделя за рулём', desc: 'Крути 7 дней подряд', goal: 7, value: (p) => p.bestStreak },
    { id: 'streak30', icon: '🔥', title: 'Месяц без пропусков', desc: 'Крути 30 дней подряд', goal: 30, value: (p) => p.bestStreak },
    { id: 'garage10', icon: '⭐', title: 'Гараж мечты', desc: 'Добавь 10 машин в гараж', goal: 10, value: (p) => p.favorites },
    { id: 'night', icon: '🌙', title: 'Ночной гонщик', desc: 'Крутани рулетку между полуночью и 5 утра', goal: 1, value: (p) => (p.flags.night ? 1 : 0) },
    { id: 'double', icon: '🔁', title: 'Дежавю', desc: 'Выбей одну и ту же машину два раза подряд', goal: 1, value: (p) => (p.flags.double ? 1 : 0) },
  ];

  /** Unlocks achievements that are now complete. Returns the new ones. */
  function checkAchievements(state, db, now) {
    const p = buildProfile(state, db);
    const t = (now || new Date()).getTime();
    const unlocked = [];
    for (const a of ACHIEVEMENTS) {
      if (state.achievements[a.id]) continue;
      if (a.value(p) >= a.goal) {
        state.achievements[a.id] = t;
        unlocked.push(a);
      }
    }
    return unlocked;
  }

  function achievementProgress(state, db) {
    const p = buildProfile(state, db);
    return ACHIEVEMENTS.map((a) => {
      const value = Math.min(a.goal, a.value(p));
      return { ...a, value, done: !!state.achievements[a.id], unlockedAt: state.achievements[a.id] || 0 };
    });
  }

  return {
    RARITIES,
    RARITY_INDEX,
    COUNTRIES,
    BODIES,
    CLASSES,
    DRIVES,
    FUELS,
    DRIVE_FILTERS,
    FUEL_FILTERS,
    ERAS,
    EMPTY_FILTERS,
    DEFAULT_SETTINGS,
    STATE_VERSION,
    HISTORY_LIMIT,
    ACHIEVEMENTS,
    slugify,
    normalizeSearch,
    carId,
    splitList,
    expandDb,
    yearsLabel,
    powerLabel,
    listLabel,
    drivesLabel,
    fuelsLabel,
    fullName,
    cryptoRandom,
    randInt,
    hashString,
    seededRandom,
    shuffle,
    normalizeFilters,
    activeFilterCount,
    makePredicate,
    filterCars,
    searchCars,
    tierCounts,
    tierOdds,
    carOdds,
    pickCar,
    dailyCar,
    dayKey,
    shiftDayKey,
    defaultState,
    sanitizeState,
    resolveLegacyId,
    migrateV3,
    recordSpin,
    currentStreak,
    buildProfile,
    checkAchievements,
    achievementProgress,
  };
});
