#!/usr/bin/env node
/*
 * Compiles the human-readable car database (data/*.txt) into the compact
 * assets/data/cars.js that the app loads.
 *
 *   node scripts/build-data.mjs           build
 *   node scripts/build-data.mjs --check   fail if assets/data/cars.js is stale
 *   node scripts/build-data.mjs --stats   build and print detailed statistics
 *
 * File format (see data/README.md for the full description):
 *
 *   @Brand | CC | aka=Другие названия для поиска | floor=rare
 *   Model | bodies | class | drive | fuel | r=rarity | aka=Другое название
 *   > Fact about the model.
 *   - Generation | 1991-1996 | 120-188 | b=wagon | k=E | d=R/A | f=P/D | r=epic
 *   > Fact about this generation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const Core = require(path.join(root, 'assets/js/core.js'));

const DATA_DIR = path.join(root, 'data');
const OUT_FILE = path.join(root, 'assets/data/cars.js');
const MAX_YEAR = 2027;

const BASE_RARITY = { A: 0, B: 0, C: 0, D: 0, LCV: 0, E: 1, S: 1, F: 2, SC: 3, HC: 4 };

export function parseSources(files) {
  const errors = [];
  const brands = [];
  let brand = null;
  let model = null;
  let gen = null;

  const fail = (where, msg) => errors.push(`${where}: ${msg}`);

  const parseKv = (fields, where, allowed) => {
    const kv = {};
    for (const f of fields) {
      const m = /^([a-z]+)=(.*)$/.exec(f);
      if (!m) {
        fail(where, `ожидалось key=value, а не «${f}»`);
        continue;
      }
      if (!allowed.includes(m[1])) fail(where, `неизвестный ключ «${m[1]}»`);
      kv[m[1]] = m[2].trim();
    }
    return kv;
  };

  const checkList = (value, dict, where, what) => {
    const items = Core.splitList(value);
    if (!items.length) fail(where, `пустое поле «${what}»`);
    for (const x of items) if (!(x in dict)) fail(where, `неизвестное значение ${what}: «${x}»`);
    if (new Set(items).size !== items.length) fail(where, `повтор в поле ${what}: «${value}»`);
  };

  const checkRarity = (r, where) => {
    if (r !== undefined && !(r in Core.RARITY_INDEX)) fail(where, `неизвестная редкость «${r}»`);
  };

  for (const file of files) {
    const name = path.basename(file.path);
    file.text.split(/\r?\n/).forEach((rawLine, i) => {
      const where = `${name}:${i + 1}`;
      if (/\s$/.test(rawLine)) fail(where, 'пробелы в конце строки');
      const mixed = rawLine.match(/[a-z]+[а-яё]+[a-zа-яё]*|[а-яё]+[a-z]+[a-zа-яё]*/gi);
      if (mixed) fail(where, `слово из смеси латиницы и кириллицы: «${mixed[0]}»`);
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) return;

      if (line.startsWith('@')) {
        const [nameField, country, ...rest] = line.slice(1).split('|').map((s) => s.trim());
        const kv = parseKv(rest, where, ['aka', 'floor']);
        if (!nameField) fail(where, 'пустое название марки');
        if (!(country in Core.COUNTRIES)) fail(where, `неизвестная страна «${country}»`);
        checkRarity(kv.floor, where);
        brand = { name: nameField, country, aka: kv.aka || '', floor: kv.floor, models: [], where };
        brands.push(brand);
        model = null;
        gen = null;
        return;
      }

      if (line.startsWith('>')) {
        const fact = line.slice(1).trim();
        const target = gen || model;
        if (!target) return fail(where, 'факт без модели');
        if (target.fact) fail(where, 'второй факт для одной записи');
        if (fact.length < 20 || fact.length > 320) fail(where, `длина факта ${fact.length} (нужно 20–320)`);
        if (!/[.!?»)]$/.test(fact)) fail(where, 'факт должен заканчиваться точкой');
        target.fact = fact;
        return;
      }

      if (line.startsWith('-')) {
        if (!model) return fail(where, 'поколение без модели');
        const fields = line.slice(1).split('|').map((s) => s.trim());
        const [genName, years] = fields;
        let rest = fields.slice(2);
        let power = '';
        if (rest.length && !rest[0].includes('=')) power = rest.shift();
        const kv = parseKv(rest, where, ['b', 'k', 'd', 'f', 'c', 'r']);
        if (!genName) fail(where, 'пустое название поколения');
        const ym = /^(\d{4})(?:-(\d{4})?)?$/.exec(years || '');
        let y0 = 0;
        let y1 = 0;
        if (!ym) fail(where, `некорректные годы «${years}»`);
        else {
          y0 = Number(ym[1]);
          y1 = ym[2] ? Number(ym[2]) : years.endsWith('-') ? 0 : y0;
          if (y0 < 1885 || y0 > MAX_YEAR) fail(where, `год начала вне диапазона: ${y0}`);
          if (y1 && (y1 < y0 || y1 > MAX_YEAR)) fail(where, `некорректный год окончания: ${y1}`);
        }
        let hp0 = 0;
        let hp1 = 0;
        if (power && power !== '?') {
          const pm = /^(\d{1,4})(?:-(\d{1,4}))?$/.exec(power);
          if (!pm) fail(where, `некорректная мощность «${power}»`);
          else {
            hp0 = Number(pm[1]);
            hp1 = pm[2] ? Number(pm[2]) : hp0;
            if (hp0 < 1 || hp1 > 2500 || hp1 < hp0) fail(where, `странная мощность «${power}»`);
          }
        }
        if (kv.b) checkList(kv.b, Core.BODIES, where, 'кузов');
        if (kv.k && !(kv.k in Core.CLASSES)) fail(where, `неизвестный класс «${kv.k}»`);
        if (kv.d) checkList(kv.d, Core.DRIVES, where, 'привод');
        if (kv.f) checkList(kv.f, Core.FUELS, where, 'топливо');
        if (kv.c && !(kv.c in Core.COUNTRIES)) fail(where, `неизвестная страна «${kv.c}»`);
        checkRarity(kv.r, where);
        gen = { name: genName, y0, y1, hp0, hp1, kv, fact: '', where };
        model.gens.push(gen);
        return;
      }

      if (!brand) return fail(where, 'модель без марки');
      const fields = line.split('|').map((s) => s.trim());
      if (fields.length < 5) return fail(where, 'строка модели: нужно минимум 5 полей');
      const [modelName, bodies, cls, drive, fuel, ...rest] = fields;
      const kv = parseKv(rest, where, ['r', 'c', 'aka']);
      if (!modelName) fail(where, 'пустое название модели');
      checkList(bodies, Core.BODIES, where, 'кузов');
      if (!(cls in Core.CLASSES)) fail(where, `неизвестный класс «${cls}»`);
      checkList(drive, Core.DRIVES, where, 'привод');
      checkList(fuel, Core.FUELS, where, 'топливо');
      if (kv.c && !(kv.c in Core.COUNTRIES)) fail(where, `неизвестная страна «${kv.c}»`);
      checkRarity(kv.r, where);
      model = { name: modelName, bodies, cls, drive, fuel, kv, fact: '', gens: [], where };
      brand.models.push(model);
      gen = null;
    });
  }
  return { brands, errors };
}

export function computeRarity(brand, model, gen) {
  const explicit = gen.kv.r || model.kv.r;
  if (explicit) return Core.RARITY_INDEX[explicit];
  const cls = gen.kv.k || model.cls;
  let r = BASE_RARITY[cls] ?? 0;
  const end = gen.y1 || MAX_YEAR;
  if (end < 1970) r += 1;
  if (brand.floor) r = Math.max(r, Core.RARITY_INDEX[brand.floor]);
  return Math.min(r, Core.RARITIES.length - 1);
}

export function compile(parsed) {
  const errors = parsed.errors.slice();
  const out = { brands: [], models: [], cars: [] };
  const ids = new Map();
  const brandNames = new Map();
  const sortedBrands = parsed.brands.slice().sort((a, b) => a.name.localeCompare(b.name, 'en'));

  for (const brand of sortedBrands) {
    const key = brand.name.toLowerCase();
    if (brandNames.has(key)) errors.push(`${brand.where}: марка «${brand.name}» уже есть (${brandNames.get(key)})`);
    brandNames.set(key, brand.where);
    if (!brand.models.length) errors.push(`${brand.where}: у марки нет моделей`);
    const bIdx = out.brands.length;
    out.brands.push(brand.aka ? [brand.name, brand.country, brand.aka] : [brand.name, brand.country]);

    const modelNames = new Map();
    for (const model of brand.models) {
      const mKey = model.name.toLowerCase();
      if (modelNames.has(mKey)) errors.push(`${model.where}: модель «${model.name}» уже есть (${modelNames.get(mKey)})`);
      modelNames.set(mKey, model.where);
      if (!model.gens.length) errors.push(`${model.where}: у модели нет поколений`);
      const mIdx = out.models.length;
      const mRow = [bIdx, model.name, model.bodies, model.cls, model.drive, model.fuel];
      if (model.fact || model.kv.aka) mRow.push(model.fact || 0);
      if (model.kv.aka) mRow.push(model.kv.aka);
      out.models.push(mRow);

      const genNames = new Set();
      for (const gen of model.gens) {
        if (genNames.has(gen.name.toLowerCase())) errors.push(`${gen.where}: поколение «${gen.name}» повторяется`);
        if (gen.name.toLowerCase() === model.name.toLowerCase()) {
          errors.push(`${gen.where}: поколение называется так же, как модель («${gen.name}») — используйте I, II…`);
        }
        genNames.add(gen.name.toLowerCase());
        const id = Core.carId(brand.name, model.name, gen.name, gen.y0);
        if (ids.has(id)) errors.push(`${gen.where}: id «${id}» совпадает с ${ids.get(id)}`);
        ids.set(id, gen.where);

        const ov = {};
        if (gen.kv.b && gen.kv.b !== model.bodies) ov.b = gen.kv.b;
        if (gen.kv.k && gen.kv.k !== model.cls) ov.k = gen.kv.k;
        if (gen.kv.d && gen.kv.d !== model.drive) ov.d = gen.kv.d;
        if (gen.kv.f && gen.kv.f !== model.fuel) ov.f = gen.kv.f;
        const country = gen.kv.c || model.kv.c;
        if (country && country !== brand.country) ov.c = country;

        const row = [mIdx, gen.name, gen.y0, gen.y1, gen.hp0, gen.hp1 === gen.hp0 ? 0 : gen.hp1, computeRarity(brand, model, gen)];
        if (gen.fact || Object.keys(ov).length) row.push(gen.fact || 0);
        if (Object.keys(ov).length) row.push(ov);
        while (row.length > 7 && row[row.length - 1] === 0) row.pop();
        out.cars.push(row);
      }
    }
  }
  const json = JSON.stringify(out);
  out.version = Core.hashString(json).toString(36);
  return { db: out, errors };
}

export function render(db) {
  const body = JSON.stringify(db);
  return (
    '/* CAR ROULETTE — база автомобилей.\n' +
    ' * Сгенерировано scripts/build-data.mjs из data/*.txt — не редактируйте вручную. */\n' +
    `window.CAR_DB=${body};\n`
  );
}

export function loadSources(dir = DATA_DIR) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.txt'))
    .sort()
    .map((f) => ({ path: path.join(dir, f), text: fs.readFileSync(path.join(dir, f), 'utf8') }));
}

export function build() {
  const parsed = parseSources(loadSources());
  return compile(parsed);
}

function printStats(db) {
  const exp = Core.expandDb(db);
  const tiers = Core.tierCounts(exp.cars);
  const byCountry = {};
  for (const c of exp.cars) byCountry[c.country] = (byCountry[c.country] || 0) + 1;
  console.log(`Марок: ${exp.brands.length}, моделей: ${exp.models.length}, поколений: ${exp.cars.length}`);
  console.log('Редкость: ' + Core.RARITIES.map((r, i) => `${r.key} ${tiers[i]}`).join(', '));
  console.log(
    'Страны: ' +
      Object.entries(byCountry)
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => `${k} ${n}`)
        .join(', ')
  );
  const noHp = exp.cars.filter((c) => !c.hp0).length;
  const facts = exp.cars.filter((c) => c.fact).length;
  console.log(`Без мощности: ${noHp}, с фактом: ${facts}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { db, errors } = build();
  if (errors.length) {
    console.error(`Ошибки в данных (${errors.length}):\n` + errors.slice(0, 200).join('\n'));
    process.exit(1);
  }
  const text = render(db);
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : '';
    if (current !== text) {
      console.error('assets/data/cars.js устарел — выполните: npm run build');
      process.exit(1);
    }
    console.log('assets/data/cars.js актуален.');
  } else {
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, text);
    console.log(`Записано ${path.relative(root, OUT_FILE)} (${(text.length / 1024).toFixed(0)} КБ).`);
  }
  printStats(db);
}
