import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build, render } from '../scripts/build-data.mjs';

const require = createRequire(import.meta.url);
const Core = require('../assets/js/core.js');
const OUT = new URL('../assets/data/cars.js', import.meta.url);

const { db: raw, errors } = build();

test('source data has no validation errors', () => {
  assert.deepEqual(errors, []);
});

test('assets/data/cars.js is up to date (run `npm run build`)', () => {
  assert.equal(fs.readFileSync(OUT, 'utf8'), render(raw));
});

test('generated file defines window.CAR_DB', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(OUT, 'utf8'), sandbox);
  assert.equal(sandbox.window.CAR_DB.version, raw.version);
});

test('database is large and well-formed', () => {
  const db = Core.expandDb(raw);
  assert.ok(db.cars.length >= 2000, `cars: ${db.cars.length}`);
  assert.ok(db.brands.length >= 140, `brands: ${db.brands.length}`);
  assert.equal(db.byId.size, db.cars.length, 'ids must be unique');

  const tiers = Core.tierCounts(db.cars);
  tiers.forEach((n, i) => assert.ok(n >= 10, `rarity ${Core.RARITIES[i].key}: ${n}`));

  const year = new Date().getFullYear();
  for (const c of db.cars) {
    assert.ok(c.country in Core.COUNTRIES, c.id);
    assert.ok(c.bodies.length && c.bodies.every((b) => b in Core.BODIES), c.id);
    assert.ok(c.cls in Core.CLASSES, c.id);
    assert.ok(c.drives.every((d) => d in Core.DRIVES), c.id);
    assert.ok(c.fuels.every((f) => f in Core.FUELS), c.id);
    assert.ok(c.y0 <= year + 1 && (!c.y1 || c.y1 >= c.y0), c.id);
    assert.ok(!c.hp0 || c.hp1 >= c.hp0, c.id);
  }
});

test('every filter option matches at least one car', () => {
  const db = Core.expandDb(raw);
  const check = (key, values) => {
    for (const v of values) {
      assert.ok(Core.filterCars(db.cars, { [key]: [v] }).length > 0, `${key}=${v}`);
    }
  };
  check('countries', Object.keys(Core.COUNTRIES));
  check('bodies', Object.keys(Core.BODIES));
  check('classes', Object.keys(Core.CLASSES));
  check('drives', Core.DRIVE_FILTERS.map((d) => d.key));
  check('fuels', Core.FUEL_FILTERS.map((f) => f.key));
  check('eras', Core.ERAS.map((e) => e.key));
  check('rarities', Core.RARITIES.map((r) => r.key));
});

test('achievements reference brands and models that exist', () => {
  const db = Core.expandDb(raw);
  const brands = new Set(db.brands.map((b) => b.name));
  for (const b of ['Ferrari', 'Lamborghini', 'Maserati', 'Alfa Romeo', 'BMW', 'Mercedes-Benz', 'Audi']) {
    assert.ok(brands.has(b), b);
  }
  const all = Object.fromEntries(db.cars.map((c) => [c.id, [1, 0]]));
  const s = Core.sanitizeState({ seen: all }, db);
  const progress = Core.achievementProgress(s, db);
  for (const a of progress) {
    if (['spin1', 'spin10', 'spin50', 'spin100', 'spin500', 'spin1000', 'streak3', 'streak7', 'streak30', 'garage10', 'night', 'double'].includes(a.id)) {
      continue;
    }
    assert.equal(a.value, a.goal, `${a.id} is reachable`);
  }
});
