// kernel.test.mjs — Konomi Skins' fitting rules (the KERNEL block of index.html, generated into kernel.mjs).
// Expected values are worked out from the rules; witness v0.6 checks that every test bites (receipts/witness.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clone, clamp, has, get, baseColorTokens, BASE_SKIN, VARIANTS, DENSITIES, TOKEN_RULES, LOADS, tokenOk, fitSkin, effectiveSkin,
  resolveVariant, densityScale, collectComponents, orderContent, findFlow, appendMessageTo,
} from './kernel.mjs';

const BASE_TOKENS = BASE_SKIN.tokens;
const ALL_FELL = (() => {   // every token path, for a skin that gives none
  const out = [];
  for (const m of ['light', 'dark']) for (const k of Object.keys(BASE_TOKENS.color[m])) out.push('color.' + m + '.' + k);
  return out;
})();

test('clone, clamp and has', () => {
  const o = { a: [1, { b: 2 }] };
  const c = clone(o);
  assert.deepEqual(c, o);
  assert.notEqual(c.a, o.a);
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(11, 0, 10), 10);
  assert.equal(has({ a: 1 }, 'a'), true);
  assert.equal(has({ a: 1 }, 'toString'), false);   // inherited is not own
  assert.equal(has(null, 'a'), false);
  assert.equal(has('ab', 'length'), false);         // only objects
});

test('the base skin, the variants and the densities are what the renderer has', () => {
  assert.equal(BASE_SKIN.id, 'base');
  assert.equal(BASE_SKIN.isBase, true);
  assert.deepEqual(BASE_TOKENS.color, baseColorTokens());
  assert.deepEqual(VARIANTS, {
    navigation: ['sidebar', 'topbar', 'dock', 'command-k'], conversation: ['bubbles', 'terminal', 'cards'],
    'data-view': ['list', 'bars', 'radial', 'tree'], 'panel-grid': ['grid', 'bento', 'masonry', 'stack'], form: ['stacked', 'inline', 'card'],
  });
  assert.deepEqual(DENSITIES, ['compact', 'comfortable', 'spacious']);
  for (const type of Object.keys(VARIANTS)) assert.ok(VARIANTS[type].includes(BASE_SKIN.componentMap[type]), type);   // the base can always draw
});

test('token rules: what each kind of token may look like', () => {
  const ok = (v, r) => assert.equal(tokenOk(v, r), true, r + ' ' + v);
  const no = (v, r) => assert.equal(tokenOk(v, r), false, r + ' ' + v);
  for (const v of ['#fff', '#a1b2c3', '#a1b2c3d4', 'rgb(1, 2, 3)', 'rgba(1,2,3,0.5)', 'hsl(10 20% 30%)', 'hsla(10,20%,30%,.5)', 'transparent', 'red']) ok(v, 'color');
  for (const v of ['#ff', '#abcdefabc', 'rgb(1,2,3);color:red', 'red blue', 'ab', 'a'.repeat(21), '']) no(v, 'color');
  for (const v of ['4px', '0.5rem', '1.25em', '50%', '0px']) ok(v, 'length');
  for (const v of ['4', 'px', '-4px', '4 px', '4pt']) no(v, 'length');
  for (const v of ['none', '0 1px 2px rgba(20,20,20,0.08)', '0 0 0 1px #000']) ok(v, 'shadow');
  for (const v of ["-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", 'Georgia, "Times New Roman", serif']) ok(v, 'family');
  for (const v of ['Georgia;', 'a{b}']) no(v, 'family');
  for (const v of ['150ms', '0.2s', '1s']) ok(v, 'time');
  for (const v of ['fast', '-1s', '1 s']) no(v, 'time');
  for (const v of ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'cubic-bezier(0.2, 0, 0, 1)']) ok(v, 'easing');
  for (const v of ['bounce', 'steps(4)']) no(v, 'easing');
  assert.deepEqual(Object.keys(TOKEN_RULES), ['color', 'length', 'shadow', 'family', 'time', 'easing']);
});

test('token rules: nothing that could load a resource, and nothing too long or of an unknown kind', () => {
  for (const v of ['url(https://example.com/x.png)', 'URL(x)', 'image(red)', 'image-set(a 1x)', '@import "x"', 'expression(alert(1))', 'red\\9'])
    assert.equal(LOADS.test(v), true, v);
  assert.equal(LOADS.test('0 1px 2px rgba(0,0,0,.1)'), false);
  assert.equal(tokenOk('url(x)', 'shadow'), false);           // shadow's own pattern would let url( through: the load check stops it
  assert.equal(tokenOk('image(red)', 'shadow'), false);
  assert.equal(tokenOk('  #fff  ', 'color'), true);            // surrounding spaces are fine
  const long = 'a, ' + 'b'.repeat(117);                         // exactly 120 characters
  assert.equal(long.length, 120);
  assert.equal(tokenOk(long, 'family'), true);
  assert.equal(tokenOk(long + 'b', 'family'), false);           // 121
  for (const r of ['nope', 'constructor', '__proto__', undefined]) assert.equal(tokenOk('#fff', r), false, String(r));
  for (const v of [null, undefined, 5, {}, ['#fff']]) assert.equal(tokenOk(v, 'color'), false);
});

test('fitSkin: a skin that gives nothing gets the whole base, and says so', () => {
  for (const s of [null, undefined, 5, 'x', [], {}]) {
    const f = fitSkin(s);
    assert.deepEqual(f.tokens, BASE_TOKENS, JSON.stringify(s));
    assert.deepEqual(f.layout, { ...BASE_SKIN.layout, panelOrder: [] });
    assert.deepEqual(f.componentMap, {});
    assert.equal(f.id, null);
    assert.equal(f.name, 'Unnamed skin');
    assert.equal(f.description, '');
    assert.equal(f.isBase, false);
    // the weight and spacing are checked first, then the colours, then the rest in the order the renderer reads them
    assert.deepEqual(f.fellBack, ['font.headingWeight', 'spacing.unit', ...ALL_FELL, 'font.family', 'font.size', 'radius.sm', 'radius.md', 'radius.lg', 'elevation.sm', 'elevation.md', 'motion.speed', 'motion.easing']);
  }
});

test('fitSkin: the base fits onto itself unchanged', () => {
  const f = fitSkin(BASE_SKIN);
  assert.deepEqual(f.tokens, BASE_TOKENS);
  assert.deepEqual(f.fellBack, []);
  assert.equal(f.isBase, true);
  assert.equal(f.id, 'base');
  assert.deepEqual(f.componentMap, BASE_SKIN.componentMap);
});

test('fitSkin: what a skin gives is used; what is missing or would load comes from the base', () => {
  const f = fitSkin({ tokens: { color: { light: { bg: 'url(https://example.com/t.png)', accent: '#123456' } }, radius: { sm: '2px', md: 'big' } } });
  assert.equal(f.tokens.color.light.bg, BASE_TOKENS.color.light.bg);
  assert.equal(f.tokens.color.light.accent, '#123456');
  assert.equal(f.tokens.color.dark.accent, '#123456');                  // only light given: dark draws from it
  assert.equal(f.tokens.color.dark.bg, BASE_TOKENS.color.dark.bg);
  assert.equal(f.tokens.radius.sm, '2px');
  assert.equal(f.tokens.radius.md, BASE_TOKENS.radius.md);
  assert.ok(f.fellBack.includes('color.light.bg'));
  assert.ok(!f.fellBack.includes('color.light.accent'));
  assert.ok(f.fellBack.includes('radius.md'));
  assert.ok(!f.fellBack.includes('radius.sm'));
  // a dark set alone serves both modes too; a colour group that is not an object is ignored
  assert.equal(fitSkin({ tokens: { color: { dark: { text: '#eee' } } } }).tokens.color.light.text, '#eee');
  assert.equal(fitSkin({ tokens: { color: { light: { text: '#111' }, dark: { text: '#eee' } } } }).tokens.color.dark.text, '#eee');
  assert.deepEqual(fitSkin({ tokens: { color: 'red' } }).tokens.color, BASE_TOKENS.color);
  assert.deepEqual(fitSkin({ tokens: { color: { light: 'red' } } }).tokens.color, BASE_TOKENS.color);
  assert.deepEqual(fitSkin({ tokens: { radius: 'big' } }).tokens.radius, BASE_TOKENS.radius);
  assert.equal(fitSkin({ tokens: { font: { family: '  Georgia  ' } } }).tokens.font.family, 'Georgia');   // trimmed
});

test('fitSkin: heading weight 100 to 900 in hundreds, spacing 1 to 64', () => {
  const w = (x) => fitSkin({ tokens: { font: { headingWeight: x } } }).tokens.font.headingWeight;
  assert.equal(w(100), 100);
  assert.equal(w(900), 900);
  for (const bad of [0, 99, 950, 1000, 550, '700', NaN]) assert.equal(w(bad), BASE_TOKENS.font.headingWeight, String(bad));
  const u = (x) => fitSkin({ tokens: { spacing: { unit: x } } }).tokens.spacing.unit;
  assert.equal(u(1), 1);
  assert.equal(u(64), 64);
  assert.equal(u(4.5), 4.5);
  for (const bad of [0, 0.5, 65, '8', NaN, Infinity]) assert.equal(u(bad), BASE_TOKENS.spacing.unit, String(bad));
  assert.ok(!fitSkin({ tokens: { font: { headingWeight: 600 }, spacing: { unit: 4 } } }).fellBack.includes('font.headingWeight'));
  assert.ok(!fitSkin({ tokens: { spacing: { unit: 4 } } }).fellBack.includes('spacing.unit'));
});

test('fitSkin: layout, component map and the skin\'s own name', () => {
  const f = fitSkin({ layout: { mode: 'dark', density: 'compact', navStyle: 'dock', panelOrder: ['a', 5, 'b'] } });
  assert.deepEqual(f.layout, { mode: 'dark', density: 'compact', navStyle: 'dock', panelOrder: ['a', 'b'] });
  assert.deepEqual(fitSkin({ layout: { mode: 'dark' } }).layout.mode, 'dark');
  assert.deepEqual(fitSkin({ layout: { mode: 'sepia', density: 'roomy', navStyle: 'floating', panelOrder: 'a' } }).layout,
    { mode: BASE_SKIN.layout.mode, density: BASE_SKIN.layout.density, navStyle: BASE_SKIN.layout.navStyle, panelOrder: [] });
  assert.equal(fitSkin({ layout: { navStyle: 'command-k' } }).layout.navStyle, 'command-k');
  assert.equal(fitSkin({ layout: { density: 'spacious' } }).layout.density, 'spacious');
  assert.equal(fitSkin({ layout: 'x' }).layout.mode, BASE_SKIN.layout.mode);
  assert.deepEqual(fitSkin({ componentMap: { form: 'inline', 'data-view': 7, widget: 'x', conversation: 'made-up' } }).componentMap, { conversation: 'made-up', form: 'inline' });
  assert.deepEqual(fitSkin({ componentMap: 'x' }).componentMap, {});
  assert.equal(fitSkin({ id: 'my-skin-2' }).id, 'my-skin-2');
  assert.equal(fitSkin({ id: 'a'.repeat(40) }).id, 'a'.repeat(40));
  for (const bad of ['a'.repeat(41), 'my skin', '', 'x<y', 5]) assert.equal(fitSkin({ id: bad }).id, null, String(bad));
  assert.equal(fitSkin({ name: '  Cozy  ' }).name, 'Cozy');
  assert.equal(fitSkin({ name: 'n'.repeat(60) }).name, 'n'.repeat(60));
  for (const bad of ['n'.repeat(61), '   ', '', 5]) assert.equal(fitSkin({ name: bad }).name, 'Unnamed skin', String(bad));
  assert.equal(fitSkin({ description: 'd'.repeat(300) }).description, 'd'.repeat(300));
  assert.equal(fitSkin({ description: 'd'.repeat(301) }).description, '');
  assert.equal(fitSkin({ isBase: 'yes' }).isBase, false);
});

test('effectiveSkin: the page\'s tweaks on top of the fitted skin, and the input is never changed', () => {
  const skin = { layout: { mode: 'light', density: 'compact' }, tokens: { color: { light: { accent: '#111111' }, dark: { accent: '#eeeeee' } } } };
  const before = clone(skin);
  const e = effectiveSkin(skin, { mode: 'dark', density: 'spacious', accent: '#ff0000' });
  assert.equal(e.layout.mode, 'dark');
  assert.equal(e.layout.density, 'spacious');
  assert.equal(e.resolvedColor.accent, '#ff0000');
  assert.equal(e.resolvedColor.bg, BASE_TOKENS.color.dark.bg);
  assert.deepEqual(skin, before);
  const plain = effectiveSkin(skin, null);
  assert.equal(plain.layout.mode, 'light');
  assert.equal(plain.layout.density, 'compact');
  assert.equal(plain.resolvedColor.accent, '#111111');
  const bad = effectiveSkin(skin, { mode: 'sepia', density: 'roomy', accent: 'url(https://example.com/x)' });
  assert.equal(bad.layout.mode, 'light');
  assert.equal(bad.layout.density, 'compact');
  assert.equal(bad.resolvedColor.accent, '#111111');            // an accent tweak that would load is ignored
  assert.equal(effectiveSkin(skin, { mode: 'light' }).resolvedColor.accent, '#111111');
  assert.equal(effectiveSkin(skin, { accent: ' #00ff00 ' }).resolvedColor.accent, '#00ff00');
  assert.equal(effectiveSkin(skin, { density: 'comfortable' }).layout.density, 'comfortable');
  assert.notEqual(effectiveSkin(skin, {}).resolvedColor, effectiveSkin(skin, {}).tokens.color.light);   // a copy, not the skin's own
});

test('resolveVariant: the skin\'s variant when the renderer has it, otherwise the base\'s', () => {
  assert.deepEqual(resolveVariant('form', { componentMap: { form: 'inline' } }), { variant: 'inline', fallback: false, requested: 'inline' });
  assert.deepEqual(resolveVariant('form', { componentMap: { form: 'made-up' } }), { variant: BASE_SKIN.componentMap.form, fallback: true, requested: 'made-up' });
  assert.deepEqual(resolveVariant('form', { componentMap: {} }), { variant: BASE_SKIN.componentMap.form, fallback: true, requested: null });
  assert.deepEqual(resolveVariant('form', null), { variant: BASE_SKIN.componentMap.form, fallback: true, requested: null });
  assert.deepEqual(resolveVariant('widget', { componentMap: { widget: 'x' } }), { variant: null, fallback: true, requested: 'x' });
  for (const t of ['constructor', '__proto__', 'toString']) assert.equal(resolveVariant(t, { componentMap: {} }).variant, null, t);
  assert.equal(resolveVariant('form', { componentMap: { form: 5 } }).requested, null);
});

test('densityScale', () => {
  assert.equal(densityScale('compact'), 0.7);
  assert.equal(densityScale('spacious'), 1.5);
  assert.equal(densityScale('comfortable'), 1);
  assert.equal(densityScale(undefined), 1);
});

const STRUCT = {
  root: 'shell',
  components: [
    { id: 'shell', type: 'shell', children: ['nav', 'area'] },
    { id: 'nav', type: 'navigation', children: [] },
    { id: 'area', type: 'container', children: ['a', 'b', 'nav2', 'w'] },
    { id: 'a', type: 'form' }, { id: 'b', type: 'data-view', children: ['c'] }, { id: 'c', type: 'conversation' },
    { id: 'nav2', type: 'navigation' }, { id: 'w', type: 'widget' },
  ],
};

test('collectComponents: reading order from the root; the first navigation is the nav, unknown types are skipped', () => {
  const r = collectComponents(STRUCT);
  assert.equal(r.navComponent.id, 'nav');
  // pre-order (b, then its child c); a second navigation is drawn as a panel, as before; the widget is skipped
  assert.deepEqual(r.contentComponents.map((c) => c.id), ['a', 'b', 'c', 'nav2']);
  assert.equal(r.byId.w.type, 'widget');
  assert.equal(Object.getPrototypeOf(r.byId), null);
});

test('collectComponents: a cycle cannot loop, a very deep structure cannot overflow, garbage gives nothing', () => {
  const cyc = { root: 'x', components: [{ id: 'x', type: 'form', children: ['y'] }, { id: 'y', type: 'form', children: ['x', 'y'] }] };
  assert.deepEqual(collectComponents(cyc).contentComponents.map((c) => c.id), ['x', 'y']);
  const N = 100000, comps = [];
  for (let i = 0; i < N; i++) comps.push({ id: 'n' + i, type: 'form', children: i + 1 < N ? ['n' + (i + 1)] : [] });
  assert.equal(collectComponents({ root: 'n0', components: comps }).contentComponents.length, N);
  for (const s of [null, {}, { root: 'a' }, { root: 'a', components: 'x' }, { root: 5, components: [] }]) {
    const r = collectComponents(s);
    assert.equal(r.navComponent, null);
    assert.deepEqual(r.contentComponents, []);
  }
  const odd = { root: '__proto__', components: [{ id: '__proto__', type: 'form', children: 'notarray' }, null, { id: 7, type: 'form' }] };
  assert.deepEqual(collectComponents(odd).contentComponents.map((c) => c.id), ['__proto__']);
  assert.deepEqual(collectComponents({ root: 'a', components: [{ id: 'a', type: 'constructor' }] }).contentComponents, []);
});

test('orderContent: the skin\'s order first, then the rest in their own order', () => {
  const cs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const ids = (l) => l.map((c) => c.id);
  assert.deepEqual(ids(orderContent(cs, ['c', 'a'])), ['c', 'a', 'b', 'd']);
  assert.deepEqual(ids(orderContent(cs, ['c', 'c', 'zz', 5])), ['c', 'a', 'b', 'd']);   // repeats and unknowns are skipped
  assert.equal(orderContent(cs, []), cs);
  assert.equal(orderContent(cs, 'c'), cs);
  assert.deepEqual(orderContent(null, ['a']), []);
  const numeric = [{ id: '2' }, { id: '1' }];
  assert.deepEqual(ids(orderContent(numeric, ['zz'])), ['2', '1']);                     // own order, even for number-like ids
  assert.deepEqual(orderContent([null, { id: 'a' }], ['a']), [{ id: 'a' }, null]);
});

test('findFlow and appendMessageTo', () => {
  const s = { flows: [null, { from: 'f', event: 'submit', to: 'c' }, { from: 'f', event: 'select', to: 'x' }], components: [{ id: 'c', type: 'conversation' }, { id: 'd', type: 'form' }] };
  assert.equal(findFlow(s, 'f', 'select').to, 'x');
  assert.equal(findFlow(s, 'f', 'submit').to, 'c');
  assert.equal(findFlow(s, 'f', 'hover'), null);
  assert.equal(findFlow(s, 'g', 'submit'), null);
  assert.equal(findFlow(null, 'f', 'submit'), null);
  assert.equal(appendMessageTo(s, 'c', { text: 'hi' }), true);
  assert.deepEqual(s.components[0].props.messages, [{ text: 'hi' }]);
  assert.equal(appendMessageTo(s, 'c', { text: 'again' }), true);
  assert.equal(s.components[0].props.messages.length, 2);
  assert.equal(appendMessageTo(s, 'd', { text: 'x' }), false);                           // a form is not a conversation
  assert.equal(appendMessageTo(s, 'zz', {}), false);
  assert.equal(appendMessageTo(null, 'c', {}), false);
  const t = { components: [null, { id: 'c', type: 'conversation', props: { messages: 'x' } }] };
  assert.equal(appendMessageTo(t, 'c', { text: 'y' }), true);
  assert.deepEqual(t.components[1].props.messages, [{ text: 'y' }]);
  const u = { components: [{ id: 'c', type: 'conversation', props: 'x' }] };
  assert.equal(appendMessageTo(u, 'c', { text: 'z' }), true);
  assert.deepEqual(u.components[0].props, { messages: [{ text: 'z' }] });
});

test('the guards: clone, clamp, has and get never throw, and give their "nothing" answer', () => {
  const circular = {}; circular.self = circular;
  for (const bad of [undefined, 10n, () => {}, circular]) assert.equal(clone(bad), null);
  assert.equal(clamp('5', 0, 10), NaN);
  assert.equal(clamp(5, '0', 10), NaN);
  assert.equal(clamp(5, 0, '10'), NaN);
  assert.equal(clamp(10n, 0, 10), NaN);
  assert.equal(get({ a: 1 }, 'a'), 1);
  assert.equal(get({ a: 1 }, 'b'), undefined);
  assert.equal(get(null, 'a'), undefined);
  assert.equal(get({}, 'toString'), undefined);       // only own values
});

test('fitSkin: a skin whose reading throws fits like one that gives nothing', () => {
  const toxic = { get tokens() { throw new Error('toxic'); } };
  assert.deepEqual(fitSkin(toxic), fitSkin({}));
  assert.deepEqual(fitSkin({ get id() { throw new Error('toxic'); } }).tokens, BASE_TOKENS);
  const e = effectiveSkin({ layout: { mode: 'dark', density: 'compact' } }, { get mode() { throw new Error('x'); }, density: 'spacious' });
  assert.equal(e.layout.mode, 'dark');                                  // a tweak whose reading throws: no tweaks at all
  assert.equal(e.layout.density, 'compact');
});

test('the first variant, the first density and the first navigation style count like any other', () => {
  // each is at index 0 of its list, and the base would pick the same one: the fallback flag tells them apart
  assert.deepEqual(resolveVariant('navigation', { componentMap: { navigation: 'sidebar' } }), { variant: 'sidebar', fallback: false, requested: 'sidebar' });
  assert.equal(fitSkin({ layout: { navStyle: 'sidebar' } }).layout.navStyle, 'sidebar');
  assert.equal(effectiveSkin({ layout: { density: 'spacious' } }, { density: 'compact' }).layout.density, 'compact');
  assert.equal(fitSkin({ layout: { density: 'compact' } }).layout.density, 'compact');
});

test('resolveVariant: a type that is not a string is no type at all', () => {
  const toxic = { toString() { throw new Error('toxic'); } };
  for (const t of [5, null, toxic, ['form']]) assert.deepEqual(resolveVariant(t, { componentMap: { form: 'inline' } }), { variant: null, fallback: true, requested: null });
});

test('collectComponents: only components with a text id count', () => {
  assert.deepEqual(collectComponents({ root: '7', components: [{ id: 7, type: 'form' }] }).contentComponents, []);
  assert.deepEqual(collectComponents({ root: 'a', components: ['a', { id: 'a', type: 'form' }] }).contentComponents.map((c) => c.id), ['a']);
  assert.deepEqual(findFlow({ flows: [{ from: 'f', event: 'e', to: 1 }, { from: 'f', event: 'e', to: 2 }] }, 'f', 'e').to, 1);   // the first that matches
});

