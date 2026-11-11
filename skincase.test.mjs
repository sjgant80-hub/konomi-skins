// skincase.test.mjs — Konomi Skins' cost case. Expected values are worked out by hand below from the sourced wage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import C, { DEFAULTS, figures, sourcesOf, skinCase } from './skincase.mjs';

const RAW = readFileSync(new URL('./vendor/sovereign-enterprise/data/basis.json', import.meta.url));
const BASIS = JSON.parse(RAW);
const r2 = (x) => Math.round(x * 100) / 100;

test('the vendored basis is the pinned file, and the wage is sourced', () => {
  assert.equal(createHash('sha256').update(RAW).digest('hex'), '83e9c2effa2f81596dcfa7110f030940032c1910cdf928d27d628ae59d73bb42');
  assert.deepEqual(figures(BASIS), { wage: 19.67 });
  const s = sourcesOf(BASIS);
  assert.equal(s.length, 1);
  assert.match(s[0].source, /^https:\/\/www\.ons\.gov\.uk\//);
  assert.equal(s[0].unit, 'GBP per hour');
  assert.deepEqual(sourcesOf(null), []);
  assert.deepEqual(sourcesOf({ wageMedianHourly: { what: 5, source: 'x' } }), []);
  assert.deepEqual(sourcesOf({ wageMedianHourly: { what: 'w', source: 5 } }), []);
  assert.deepEqual(sourcesOf({ wageMedianHourly: { what: 'w', source: 'x', value: 1 } }), [{ what: 'w', value: 1, unit: '', source: 'x' }]);
});

test('figures: null when the wage is missing, negative or not a number', () => {
  assert.equal(figures(null), null);
  assert.equal(figures({}), null);
  assert.equal(figures({ wageMedianHourly: { value: -1 } }), null);
  assert.equal(figures({ wageMedianHourly: { value: '19' } }), null);
  assert.deepEqual(figures({ wageMedianHourly: { value: 0 } }), { wage: 0 });
});

test('a case worked by hand: 4 brands a year, 40 hours each by hand, an hour per skin, 80 hours to split once', () => {
  assert.deepEqual(DEFAULTS, { brands: 4, hoursPerBrand: 40, skinMinutes: 60, splitHours: 80, years: 3 });
  const c = skinCase({}, BASIS);
  assert.equal(c.ok, true);
  // by hand: 4 x 40 x 19.67 = 3,147.20 a year; with skins: 4 x 1 x 19.67 = 78.68 a year, plus 80 x 19.67 = 1,573.60 in year one
  assert.deepEqual(c.rows[0], { year: 1, byHand: 3147.2, withSkins: r2(78.68 + 1573.6), saved: r2(3147.2 - 78.68 - 1573.6) });
  assert.deepEqual(c.rows[1], { year: 2, byHand: 3147.2, withSkins: 78.68, saved: r2(3147.2 - 78.68) });
  assert.deepEqual(c.rows[2], { ...c.rows[1], year: 3 });
  assert.deepEqual(c.total, { byHand: r2(3 * 3147.2), withSkins: r2(3 * 78.68 + 1573.6), saved: r2(3 * 3147.2 - 3 * 78.68 - 1573.6) });
});

test('it can come out against skins: one brand, a quick restyle, a big split', () => {
  const c = skinCase({ brands: 1, hoursPerBrand: 4, splitHours: 200, years: 1 }, BASIS);
  assert.ok(c.total.saved < 0);
  assert.equal(c.total.saved, r2(4 * 19.67 - 19.67 - 200 * 19.67));
});

test('the edges: no brands saves nothing but the split; 1 and 10 years both run', () => {
  const none = skinCase({ brands: 0 }, BASIS);
  assert.equal(none.rows[0].byHand, 0);
  assert.equal(none.rows[0].withSkins, r2(80 * 19.67));
  assert.equal(skinCase({ splitHours: 0 }, BASIS).rows[0].withSkins, 78.68);
  assert.equal(skinCase({ years: 1 }, BASIS).rows.length, 1);
  assert.equal(skinCase({ years: 10 }, BASIS).rows.length, 10);
});

test('garbage in gives a reason, never a throw', () => {
  const why = (input, b = BASIS) => skinCase(input, b).why;
  assert.equal(why({}, {}), 'the sourced wage could not be read');
  for (const k of ['brands', 'hoursPerBrand', 'skinMinutes', 'splitHours']) {
    assert.equal(why({ [k]: -1 }), k + ' must be a number, 0 or more');
    assert.equal(why({ [k]: '5' }), k + ' must be a number, 0 or more');
  }
  for (const y of [0, 11, 2.5, '3']) assert.equal(why({ years: y }), 'years must be a whole number from 1 to 10');
  assert.deepEqual(skinCase('ab', BASIS).inputs, DEFAULTS);
  assert.equal(skinCase(null, BASIS).ok, true);
  const toxic = { get brands() { throw new Error('boom'); } };
  assert.deepEqual(skinCase(toxic, BASIS), { ok: false, why: 'the inputs could not be read' });
  assert.equal(typeof C.skinCase, 'function');
});
