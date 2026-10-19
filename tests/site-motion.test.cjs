const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const code = fs.readFileSync(require('node:path').join(__dirname, '../assets/js/site-motion.js'), 'utf8');
function setup({reduce = false, supported = true} = {}) {
  const preference = {matches: reduce, addEventListener(type, fn) {this.change = fn;}};
  const listeners = {}, observed = [], removed = [], played = [];
  let callback, disconnected = false;
  function Element() {}
  if (supported) Element.prototype.animate = function (frames, options) {
    const animation = {cancel() {this.cancelled = true; if (this.oncancel) this.oncancel();}};
    played.push({element: this, frames, options, animation}); return animation;
  };
  function element(top) {const e = new Element(); e.getBoundingClientRect = () => ({top}); return e;}
  const above = element(100), below = element(1100);
  function IntersectionObserver(fn) { callback = fn; this.observe = e => observed.push(e); this.unobserve = e => removed.push(e); this.disconnect = () => disconnected = true; }
  const window = {innerHeight: 800, matchMedia: () => preference, IntersectionObserver, addEventListener: (type, fn) => listeners[type] = fn};
  const document = {visibilityState: 'visible', querySelectorAll: () => [above, below]};
  vm.runInNewContext(code, {window, document, Element, IntersectionObserver, Set, WeakSet});
  return {preference, listeners, observed, removed, played, above, below, document, enter: () => callback([{target: below, isIntersecting: true}]), disconnected: () => disconnected};
}
test('enhances below-fold elements only, once, without a persistent fill style', () => {
  const x = setup(); assert.deepEqual(x.observed, [x.below]); x.enter(); x.enter();
  assert.equal(x.played.length, 1); assert.deepEqual(x.removed, [x.below]);
  assert.equal(x.played[0].options.duration, 420); assert.equal(x.played[0].options.fill, undefined); assert.ok(x.played[0].frames[0].opacity > 0);
});
test('reduced motion and unsupported animation leave content alone', () => {
  for (const options of [{reduce:true}, {supported:false}]) {const x=setup(options);assert.equal(x.observed.length,0);assert.equal(x.played.length,0);}
});
test('a change to reduced motion cancels active animations and stops observation', () => {
  const x=setup();x.enter();x.preference.matches=true;x.preference.change();assert.ok(x.disconnected());assert.ok(x.played[0].animation.cancelled);
});
test('printing and page exit cancel decoration', () => {
  for(const event of ['beforeprint','pagehide']) {const x=setup();x.enter();x.listeners[event]();assert.ok(x.disconnected());assert.ok(x.played[0].animation.cancelled);}
});
test('hidden tabs do not animate', () => {const x=setup();x.document.visibilityState='hidden';x.enter();assert.equal(x.played.length,0);});
