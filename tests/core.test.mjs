import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Core = require('../assets/js/core.js');

/** Tiny hand-made database in the compact build format. */
const RAW = {
  version: 'test',
  brands: [
    ['Toyota', 'JP', 'Тойота'],
    ['Ferrari', 'IT'],
    ['ГАЗ', 'RU', 'GAZ'],
  ],
  models: [
    [0, 'Camry', 'sedan', 'D', 'F', 'P/H', 'Факт о Camry.'],
    [1, 'F40', 'coupe', 'HC', 'R', 'P'],
    [2, '21 «Волга»', 'sedan/wagon', 'D', 'R', 'P', 0, 'Волга'],
    [0, 'Land Cruiser', 'suv', 'E', '4', 'P/D'],
  ],
  cars: [
    [0, 'XV10', 1991, 1996, 120, 188, 0, 0, { f: 'P' }],
    [0, 'XV70', 2017, 2024, 150, 305, 0],
    [0, 'XV80', 2024, 0, 225, 232, 0, 0, { f: 'H' }],
    [1, 'I', 1987, 1992, 478, 0, 4, 'Факт о F40.'],
    [2, 'I', 1956, 1970, 65, 80, 1],
    [3, 'J40', 1960, 1984, 70, 135, 0, 0, { k: 'C' }],
  ],
};

const db = Core.expandDb(RAW);
const byGen = (gen) => db.cars.find((c) => c.gen === gen);

test('slugify keeps compatibility with ids of the previous version', () => {
  assert.equal(Core.carId('ГАЗ', '13 «Чайка»', 'Mk1', 1959), 'газ-13-чаика-mk1-1959');
  assert.equal(Core.carId('Citroën', 'Berlingo', 'MK1', 1996), 'citroen-berlingo-mk1-1996');
  assert.equal(Core.carId('Lynk & Co', '01', 'First generation', 2017), 'lynk-co-01-first-generation-2017');
});

test('expandDb builds full car objects', () => {
  assert.equal(db.cars.length, 6);
  const xv80 = byGen('XV80');
  assert.equal(xv80.id, 'toyota-camry-xv80-2024');
  assert.equal(xv80.y1, null);
  assert.deepEqual(xv80.fuels, ['H']);
  assert.equal(xv80.fact, 'Факт о Camry.');
  assert.equal(xv80.genNo, 3);
  assert.equal(xv80.genTotal, 3);
  assert.equal(byGen('J40').cls, 'C');
  assert.equal(byGen('I').hp1, 478);
  assert.ok(db.byId.has('toyota-camry-xv10-1991'));
});

test('labels', () => {
  assert.equal(Core.yearsLabel(byGen('XV10')), '1991–1996');
  assert.equal(Core.yearsLabel(byGen('XV80')), '2024 — н. в.');
  assert.equal(Core.powerLabel(byGen('XV10')), '120–188 л.с.');
  assert.equal(Core.powerLabel(db.cars[3]), '478 л.с.');
  assert.equal(Core.drivesLabel(byGen('J40')), 'Полный (4×4)');
  assert.equal(Core.fuelsLabel(byGen('XV70')), 'Бензин, гибрид');
});

test('search understands aliases, ё/е and word order', () => {
  assert.equal(Core.searchCars(db.cars, 'тойота camry').length, 3);
  assert.equal(Core.searchCars(db.cars, 'xv70 camry').length, 1);
  assert.equal(Core.searchCars(db.cars, 'волга').length, 1);
  assert.equal(Core.searchCars(db.cars, 'gaz').length, 1);
  assert.equal(Core.searchCars(db.cars, 'лэнд крузер').length, 0);
  assert.equal(Core.searchCars(db.cars, 'ленд круисер').length, 0);
  assert.equal(Core.searchCars(db.cars, 'ланд').length, 1);
  assert.equal(Core.searchCars(db.cars, 'камри').length, 0);
  assert.equal(Core.searchCars(db.cars, 'кamry').length, 3);
  assert.equal(Core.searchCars(db.cars, '  ').length, db.cars.length);
});

test('filters combine with AND between groups and OR inside a group', () => {
  const f = (filters) => Core.filterCars(db.cars, filters, 2026).map((c) => c.gen);
  assert.deepEqual(f({ countries: ['IT', 'RU'] }), ['I', 'I']);
  assert.deepEqual(f({ bodies: ['wagon'] }), ['I']);
  assert.deepEqual(f({ countries: ['JP'], eras: ['20s'] }), ['XV70', 'XV80']);
  assert.deepEqual(f({ eras: ['pre50'] }), []);
  assert.deepEqual(f({ drives: ['AWD'] }), ['J40']);
  assert.deepEqual(f({ fuels: ['H'] }), ['XV70', 'XV80']);
  assert.deepEqual(f({ hpMin: 300 }), ['XV70', 'I']);
  assert.deepEqual(f({ hpMax: 80 }), ['I', 'J40']);
  assert.deepEqual(f({ rarities: ['legendary'] }), ['I']);
  assert.equal(f({}).length, db.cars.length);
});

test('normalizeFilters drops garbage', () => {
  const n = Core.normalizeFilters({ countries: 'JP', bodies: ['sedan', 5], hpMin: 'abc', hpMax: '200', junk: 1 });
  assert.deepEqual(n.countries, []);
  assert.deepEqual(n.bodies, ['sedan', '5']);
  assert.equal(n.hpMin, null);
  assert.equal(n.hpMax, 200);
  assert.equal('junk' in n, false);
  assert.equal(Core.activeFilterCount({ countries: ['JP'], hpMin: 100, hpMax: 200 }), 2);
});

test('odds sum to one in both modes', () => {
  for (const mode of ['weighted', 'equal']) {
    const tiers = Core.tierOdds(db.cars, mode).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(tiers - 1) < 1e-9);
    const cars = db.cars.reduce((a, c) => a + Core.carOdds(c, db.cars, mode), 0);
    assert.ok(Math.abs(cars - 1) < 1e-9);
  }
  assert.equal(Core.carOdds(db.cars[0], [], 'equal'), 0);
});

test('weighted pick follows rarity weights', () => {
  const rnd = Core.seededRandom(42);
  const n = 60000;
  const counts = new Map();
  for (let i = 0; i < n; i++) {
    const c = Core.pickCar(db.cars, 'weighted', rnd);
    counts.set(c.rarity, (counts.get(c.rarity) || 0) + 1);
  }
  const odds = Core.tierOdds(db.cars, 'weighted');
  for (const [tier, count] of counts) {
    assert.ok(Math.abs(count / n - odds[tier]) < 0.01, `tier ${tier}: ${count / n} vs ${odds[tier]}`);
  }
  assert.equal([...counts.keys()].every((t) => odds[t] > 0), true);
});

test('equal pick is uniform', () => {
  const rnd = Core.seededRandom('equal');
  const n = 60000;
  const counts = new Map();
  for (let i = 0; i < n; i++) {
    const c = Core.pickCar(db.cars, 'equal', rnd);
    counts.set(c.id, (counts.get(c.id) || 0) + 1);
  }
  for (const count of counts.values()) assert.ok(Math.abs(count / n - 1 / db.cars.length) < 0.01);
  assert.equal(Core.pickCar([], 'equal'), null);
});

test('cryptoRandom stays in [0, 1)', () => {
  for (let i = 0; i < 1000; i++) {
    const x = Core.cryptoRandom();
    assert.ok(x >= 0 && x < 1);
  }
});

test('dailyCar is deterministic per day', () => {
  const a = Core.dailyCar(db.cars, '2026-10-02');
  assert.equal(Core.dailyCar(db.cars, '2026-10-02'), a);
  assert.ok(a.rarity >= 1);
});

test('recordSpin updates history, counters and streaks', () => {
  const s = Core.defaultState();
  const car = db.cars[0];
  const day1 = new Date(2026, 0, 31, 12);
  const day2 = new Date(2026, 1, 1, 3);
  const day4 = new Date(2026, 1, 3, 12);

  assert.equal(Core.recordSpin(s, car, day1).isNew, true);
  assert.equal(s.stats.streak, 1);
  assert.equal(Core.recordSpin(s, car, day2).isNew, false);
  assert.equal(s.stats.streak, 2);
  assert.equal(s.stats.flags.double, true);
  assert.equal(s.stats.flags.night, true);
  assert.deepEqual(s.seen[car.id], [2, day1.getTime()]);
  Core.recordSpin(s, db.cars[1], day4);
  assert.equal(s.stats.streak, 1);
  assert.equal(s.stats.bestStreak, 2);
  assert.equal(s.stats.spins, 3);
  assert.equal(s.history[0].id, db.cars[1].id);
  assert.equal(s.stats.days['2026-02-01'], 1);
  assert.equal(Core.currentStreak(s, new Date(2026, 1, 4, 9)), 1);
  assert.equal(Core.currentStreak(s, new Date(2026, 1, 6, 9)), 0);
});

test('history is capped', () => {
  const s = Core.defaultState();
  for (let i = 0; i < Core.HISTORY_LIMIT + 5; i++) Core.recordSpin(s, db.cars[i % db.cars.length]);
  assert.equal(s.history.length, Core.HISTORY_LIMIT);
});

test('sanitizeState repairs foreign or broken data', () => {
  const s = Core.sanitizeState(
    {
      history: [{ id: 'toyota-camry-xv10-1991', t: 5 }, { id: 'nope', t: 1 }, 'junk'],
      favorites: ['toyota-camry-xv10-1991', 'toyota-camry-xv10-1991', 'nope'],
      seen: { 'toyota-camry-xv10-1991': [3, 10], nope: [1, 1], 'toyota-camry-xv70-2017': 'x' },
      settings: { sound: 'yes', volume: 7, speed: 'warp', mode: 'equal', haptics: false },
      stats: { spins: -4, streak: 2, days: { bad: 1, '2026-01-01': 3 } },
      filters: { brands: ['Toyota', 'Lada'] },
    },
    db
  );
  assert.equal(s.history.length, 1);
  assert.deepEqual(s.favorites, ['toyota-camry-xv10-1991']);
  assert.deepEqual(Object.keys(s.seen), ['toyota-camry-xv10-1991']);
  assert.equal(s.settings.sound, true);
  assert.equal(s.settings.volume, 1);
  assert.equal(s.settings.speed, 'normal');
  assert.equal(s.settings.mode, 'equal');
  assert.equal(s.settings.haptics, false);
  assert.equal(s.stats.spins, 0);
  assert.equal(s.stats.bestStreak, 2);
  assert.deepEqual(s.stats.days, { '2026-01-01': 3 });
  assert.deepEqual(s.filters.brands, ['Toyota']);
  assert.deepEqual(Core.sanitizeState(null, db), Core.defaultState());
});

test('migrateV3 maps old ids to the new database', () => {
  const old = {
    history: [
      { id: 'toyota-camry-xv10-1991', ts: 2000 },
      { id: 'toyota-camry-mk-old-name-2017', ts: 1000 },
      { id: 'krone-ax-forage-wagon-ax-series-2010', ts: 500 },
    ],
    favorites: ['toyota-camry-mk-old-name-2017', 'missing-1999'],
    discovered: ['toyota-camry-xv10-1991', 'toyota-camry-mk-old-name-2017', 'krone-ax-forage-wagon-ax-series-2010'],
    stats: { spins: 10, streak: 3, lastDay: '2026-01-01', daily: { '2026-01-01': 10 } },
    settings: { sound: false, volume: 0.3, reduced: true },
  };
  const s = Core.migrateV3(old, db);
  assert.deepEqual(
    s.history.map((h) => h.id),
    ['toyota-camry-xv10-1991', 'toyota-camry-xv70-2017']
  );
  assert.deepEqual(s.favorites, ['toyota-camry-xv70-2017']);
  assert.deepEqual(Object.keys(s.seen).sort(), ['toyota-camry-xv10-1991', 'toyota-camry-xv70-2017']);
  assert.equal(s.stats.spins, 10);
  assert.equal(s.settings.sound, false);
  assert.equal(s.settings.motion, 'reduced');
});

test('achievements unlock once and report progress', () => {
  const s = Core.defaultState();
  Core.recordSpin(s, db.cars[3]);
  const unlocked = Core.checkAchievements(s, db).map((a) => a.id);
  assert.ok(unlocked.includes('spin1'));
  assert.ok(unlocked.includes('legend'));
  assert.ok(unlocked.includes('rare'));
  assert.equal(Core.checkAchievements(s, db).length, 0);
  const progress = Core.achievementProgress(s, db);
  assert.equal(progress.length, Core.ACHIEVEMENTS.length);
  const spin10 = progress.find((a) => a.id === 'spin10');
  assert.equal(spin10.value, 1);
  assert.equal(spin10.done, false);
  assert.equal(new Set(Core.ACHIEVEMENTS.map((a) => a.id)).size, Core.ACHIEVEMENTS.length);
});

test('dayKey uses local dates', () => {
  assert.equal(Core.dayKey(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
  assert.equal(Core.shiftDayKey('2026-03-01', -1), '2026-02-28');
  assert.equal(Core.shiftDayKey('2024-03-01', -1), '2024-02-29');
});
