const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const code = fs.readFileSync(require('node:path').join(__dirname, '../assets/js/navigation.js'), 'utf8');
function setup(spanish = false) {
  const handlers = {};
  function element(attrs = {}) {
    const classes = new Set();
    return { attrs, handlers: {}, classList: { toggle(c, on) { on ? classes.add(c) : classes.delete(c); }, contains: c => classes.has(c) },
      getAttribute(k) { return this.attrs[k]; }, setAttribute(k, v) { this.attrs[k] = v; },
      addEventListener(k, fn) { this.handlers[k] = fn; }, contains(t) { return t === this; }, focus() { this.focused = true; } };
  }
  const toggle = element({ 'aria-controls': 'primary-navigation', 'aria-expanded': 'false', 'data-open-label': spanish ? 'Abrir menú' : 'Open menu', 'data-close-label': spanish ? 'Cerrar menú' : 'Close menu' });
  const link = element(), links = element(); links.querySelectorAll = () => [link];
  vm.runInNewContext(code, { document: { querySelector: () => toggle, getElementById: id => id === 'primary-navigation' ? links : null, addEventListener: (k, fn) => handlers[k] = fn } });
  return { toggle, links, link, handlers };
}
test('menu exposes expanded state and action label when opened and closed', () => {
  const {toggle, links} = setup(); toggle.handlers.click();
  assert.equal(toggle.attrs['aria-expanded'], 'true'); assert.equal(toggle.attrs['aria-label'], 'Close menu'); assert.ok(links.classList.contains('open'));
  toggle.handlers.click(); assert.equal(toggle.attrs['aria-expanded'], 'false'); assert.equal(toggle.attrs['aria-label'], 'Open menu'); assert.ok(!links.classList.contains('open'));
});
test('Escape closes the menu and returns keyboard focus', () => {
  const {toggle, handlers} = setup(); toggle.handlers.click(); handlers.keydown({key: 'Escape'});
  assert.equal(toggle.attrs['aria-expanded'], 'false'); assert.equal(toggle.focused, true);
});
test('clicking a destination or outside the menu closes it', () => {
  const {toggle, link, handlers} = setup(); toggle.handlers.click(); link.handlers.click(); assert.equal(toggle.attrs['aria-expanded'], 'false');
  toggle.handlers.click(); handlers.click({target: {}}); assert.equal(toggle.attrs['aria-expanded'], 'false');
});
test('click inside the toggle does not immediately close the menu', () => {
  const {toggle, handlers} = setup(); toggle.handlers.click(); handlers.click({target: toggle}); assert.equal(toggle.attrs['aria-expanded'], 'true');
});
test('Spanish menu uses its supplied labels', () => {
  const {toggle} = setup(true); toggle.handlers.click(); assert.equal(toggle.attrs['aria-label'], 'Cerrar menú'); toggle.handlers.click(); assert.equal(toggle.attrs['aria-label'], 'Abrir menú');
});
test('pages without the component do not throw', () => {
  assert.doesNotThrow(() => vm.runInNewContext(code, {document: {querySelector: () => null}}));
});
