// skincase.mjs — Konomi Skins' cost case: restyling one product for each brand or client by hand, against writing a
// skin for it once the product is split into structure and skins. The only sourced figure is the UK median hourly
// wage (ONS, vendored byte for byte from sjgant80-hub/sovereign-enterprise); every count and hour is the reader's.
// Floors, never top ends: staff time at the median wage with on-costs left out. The one-off work of splitting the
// product into structure and skins is counted, in year one. No price of ours appears: Konomi Skins is MIT.
export const DEFAULTS = Object.freeze({ brands: 4, hoursPerBrand: 40, skinMinutes: 60, splitHours: 80, years: 3 });

const isNum = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const r2 = (x) => Math.round(x * 100) / 100;

// the wage, or null when it is missing, negative or not a number
export function figures(basis) {
  try {
    const wage = basis.wageMedianHourly.value;
    return isNum(wage) ? { wage } : null;
  } catch {
    return null;
  }
}

export function sourcesOf(basis) {
  const x = basis && basis.wageMedianHourly;
  return x && typeof x === 'object' && typeof x.what === 'string' && typeof x.source === 'string'
    ? [{ what: x.what, value: x.value, unit: x.unit || '', source: x.source }] : [];
}

/**
 * skinCase(input, basis) -> { ok: true, inputs, basis, rows, total } or { ok: false, why }
 * input: { brands (a year), hoursPerBrand (restyling by hand), skinMinutes (writing one skin), splitHours (once), years }
 * It never throws: garbage in gives a reason.
 */
export function skinCase(input, basis) {
  try {
    const f = figures(basis);
    if (!f) return { ok: false, why: 'the sourced wage could not be read' };
    const x = { ...DEFAULTS, ...(input && typeof input === 'object' ? input : {}) };
    for (const k of ['brands', 'hoursPerBrand', 'skinMinutes', 'splitHours']) {
      if (!isNum(x[k])) return { ok: false, why: k + ' must be a number, 0 or more' };
    }
    if (!Number.isInteger(x.years) || x.years < 1 || x.years > 10) return { ok: false, why: 'years must be a whole number from 1 to 10' };
    const byHand = x.brands * x.hoursPerBrand * f.wage;
    const perYear = x.brands * x.skinMinutes / 60 * f.wage;
    const rows = [];
    let handTotal = 0, skinTotal = 0;
    for (let y = 1; y <= x.years; y++) {
      const withSkins = perYear + (y === 1 ? x.splitHours * f.wage : 0);
      handTotal += byHand;
      skinTotal += withSkins;
      rows.push({ year: y, byHand: r2(byHand), withSkins: r2(withSkins), saved: r2(byHand - withSkins) });
    }
    return { ok: true, inputs: x, basis: f, rows, total: { byHand: r2(handTotal), withSkins: r2(skinTotal), saved: r2(handTotal - skinTotal) } };
  } catch {
    return { ok: false, why: 'the inputs could not be read' };
  }
}

export default { DEFAULTS, figures, sourcesOf, skinCase };
