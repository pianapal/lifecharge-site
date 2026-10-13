const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const calendarBase = 'https://api.leadconnectorhq.com/widget/booking/uiad6ZBD9FlTcCf5M9ed';
const calendarCode = fs.readFileSync(path.join(root, 'assets/js/booking-attribution.js'), 'utf8');
const formCode = fs.readFileSync(path.join(root, 'assets/js/new-patient-offer.js'), 'utf8');

function storage(value, blocked) {
  return { getItem() { if (blocked) throw new Error('Storage blocked'); return value; } };
}

function calendarHarness(search = '', saved = '{}', blocked = false) {
  const assigned = [];
  let readyCalls = 0;
  let load;
  const calendar = {
    getAttribute: () => calendarBase,
    addEventListener(name, callback) { assert.equal(name, 'load'); load = callback; },
    set src(value) { assigned.push(value); }
  };
  const link = {};
  vm.runInNewContext(calendarCode, {
    URL, URLSearchParams,
    window: {
      location: { search }, sessionStorage: storage(saved, blocked),
      lifeChargeCalendarReady() { readyCalls++; }
    },
    document: { getElementById: id => id === 'directCalendarLink' ? link : calendar }
  });
  return { url: new URL(assigned[0]), assigned, link, load, readyCalls: () => readyCalls };
}

test('calendar forwards allowlisted attribution, prefers URL, and loads once', () => {
  const result = calendarHarness('?gclid=current&utm_source=google&email=private&main_concern=private',
    JSON.stringify({ gclid: 'old', utm_campaign: 'clinic', phone: 'private', full_name: 'private' }));
  assert.equal(result.url.searchParams.get('gclid'), 'current');
  assert.equal(result.url.searchParams.get('utm_campaign'), 'clinic');
  assert.deepEqual([...result.url.searchParams.keys()].sort(), ['gclid', 'utm_campaign', 'utm_source']);
  assert.equal(result.assigned.length, 1);
  assert.equal(result.link.href, result.url.href);
  assert.equal(result.readyCalls(), 0);
  result.load();
  assert.equal(result.readyCalls(), 1);
});

test('calendar works with blocked, malformed, null, or empty storage', () => {
  for (const [saved, blocked] of [['{}', true], ['invalid', false], ['null', false], ['{}', false]]) {
    const result = calendarHarness('?wbraid=campaign', saved, blocked);
    assert.equal(result.url.searchParams.get('wbraid'), 'campaign');
    assert.equal(result.url.origin + result.url.pathname, calendarBase);
  }
  assert.equal(calendarHarness().url.href, calendarBase);
});

test('calendar bounds parameter length and removes control characters', () => {
  const result = calendarHarness('?utm_campaign=%00%0Atest%0D&gbraid=' + 'a'.repeat(400));
  assert.equal(result.url.searchParams.get('utm_campaign'), 'test');
  assert.equal(result.url.searchParams.get('gbraid').length, 300);
});

test('offer webhook preserves current URL attribution even when storage is blocked', () => {
  let submit;
  let payload;
  const elements = {};
  function element(id) {
    if (!elements[id]) elements[id] = {
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener(name, callback) { if (id === 'offerForm' && name === 'submit') submit = callback; },
      querySelectorAll: () => [], querySelector: () => null
    };
    return elements[id];
  }
  vm.runInNewContext(formCode, {
    URL, URLSearchParams, Date,
    FormData: class { forEach(callback) { callback('Test', 'first_name'); callback('Only', 'last_name'); } },
    fetch(url, options) { payload = JSON.parse(options.body); return new Promise(() => {}); },
    window: {
      location: { search: '?gclid=current&utm_source=google', href: 'https://lifechargechiropractic.com/new-patient-offer/?gclid=current&utm_source=google' },
      sessionStorage: storage('{}', true), setTimeout() {}, addEventListener() {}
    },
    document: { getElementById: element, querySelectorAll: () => [], referrer: '' }
  });
  submit({ preventDefault() {} });
  assert.equal(payload.gclid, 'current');
  assert.equal(payload.utm_source, 'google');
  assert.equal(payload.full_name, 'Test Only');
  assert.equal(payload.lc_check_a, undefined);
});
