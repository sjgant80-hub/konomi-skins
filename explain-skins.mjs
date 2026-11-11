// explain-skins.mjs — wires the explainer: the gate counts come from receipts/witness.json and the cost case is computed
// by skincase.mjs from the sourced wage and the reader's own inputs. build.mjs embeds the receipt and the wage in the
// page (#skins-data), and CI checks they match the files, so the page still makes no network call. Nothing measured is
// typed; everything reaches the page through textContent.
import { skinCase, sourcesOf } from './skincase.mjs';

const $ = (id) => document.getElementById(id);
const el = (tag, text) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; return e; };
const money = (x) => (x < 0 ? '−£' : '£') + Math.round(Math.abs(x)).toLocaleString('en-GB');
const DATA = (() => { try { return JSON.parse(document.getElementById('skins-data').textContent); } catch { return null; } })();

function gate() {
  const out = $('ex-gate');
  if (!out) return;
  try {
    const r = DATA.receipt;
    const ign = Array.isArray(r.ignored) ? r.ignored.length : 0, surv = Array.isArray(r.survived) ? r.survived.length : 0;
    out.textContent = r.killed + ' of ' + r.total + ' deliberate changes to kernel.mjs were caught by its tests'
      + (ign ? ', ' + ign + ' reviewed as equivalent, ' + (ign === 1 ? 'with a written reason' : 'each with a written reason') : '') + ', ' + surv + ' survived'
      + (r.capped ? ' (CAPPED: not every change was tried)' : ', every change tried') + '. witness ' + (r.witness && r.witness.tag)
      + ', kernel SHA-256 ' + String(r.kernelSha256).slice(0, 12) + '…';
  } catch { out.textContent = 'The gate receipt could not be read; open receipts/witness.json directly.'; }
}

const FIELDS = [['sc-brands', 'brands'], ['sc-hours', 'hoursPerBrand'], ['sc-minutes', 'skinMinutes'], ['sc-split', 'splitHours'], ['sc-years', 'years']];
function run() {
  if (!DATA || !DATA.basis) return;
  const input = {};
  for (const [id, key] of FIELDS) { const v = $(id).value; input[key] = v === '' ? NaN : Number(v); }
  const r = skinCase(input, DATA.basis);
  if (!r.ok) { $('sc-why').textContent = 'Check the inputs: ' + r.why; $('sc-big').textContent = ''; $('sc-rows').replaceChildren(); return; }
  $('sc-why').textContent = '';
  const t = r.total, yrs = r.inputs.years + ' year' + (r.inputs.years === 1 ? '' : 's');
  $('sc-big').textContent = t.saved >= 0
    ? 'About ' + money(t.saved) + ' of staff time saved over ' + yrs + ', after the one-off split, at the UK median wage.'
    : 'On these numbers the split costs about ' + money(-t.saved) + ' more than restyling by hand over ' + yrs + '.';
  $('sc-rows').replaceChildren(...r.rows.map((y) => { const tr = el('tr'); for (const v of [String(y.year), money(y.byHand), money(y.withSkins), money(y.saved)]) tr.append(el('td', v)); return tr; }));
}
function costCase() {
  if (!$('sc-brands')) return;
  for (const [id] of FIELDS) $(id).addEventListener('input', run);
  if (!DATA || !DATA.basis) { $('sc-why').textContent = 'The sourced wage could not be read, so no figure is shown.'; return; }
  const p = $('sc-sources'); p.replaceChildren(document.createTextNode('Source: '));
  sourcesOf(DATA.basis).forEach((x) => {
    const a = el('a', String(x.what).split(' — ')[0]); a.href = x.source; p.append(a, document.createTextNode(' (' + x.value + (x.unit ? ' ' + x.unit : '') + ')'));
  });
  run();
}

const go = () => { gate(); costCase(); };
if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
