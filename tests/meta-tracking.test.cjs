const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync('assets/js/meta-tracking.js', 'utf8');
const pixelId = '1513358932888069';

function harness(options = {}) {
  const scripts = [], cookies = [], events = [];
  let saved = options.saved ?? (options.choice ? JSON.stringify({ value: options.choice, at: Date.now() }) : null);
  const controls = {};
  function control(name) {
    return controls[name] ||= { addEventListener(type, fn) { this[type] = fn; }, focus() { this.focused = true; } };
  }
  const panel = { hidden: true, setAttribute() {}, querySelector: control };
  const document = {
    createElement: name => name === 'script' ? {} : panel,
    head: { appendChild(script) { scripts.push(script); } },
    body: { appendChild() {} },
    addEventListener() {},
    querySelectorAll: () => [control('settings')],
    set cookie(value) { cookies.push(value); }
  };
  const window = {
    location: { href: options.url || 'https://lifechargechiropractic.com/' },
    localStorage: {
      getItem() { if (options.blockedStorage) throw Error('blocked'); return saved; },
      setItem(key, value) { saved = value; },
      removeItem() { saved = null; }
    }
  };
  const context = { window, document, navigator: { globalPrivacyControl: options.gpc }, URL, Date, JSON };
  vm.runInNewContext(code, context);
  const queued = () => (window.fbq ? JSON.parse(JSON.stringify(window.fbq.queue.map(x => Array.from(x)))) : []);
  return {
    window, panel, scripts, controls, cookies, events, queued,
    allow() { control('[data-meta-allow]').click(); },
    deny() { control('[data-meta-deny]').click(); },
    stored() { return saved; }
  };
}

test('loads once on every page with a single PageView to the correct pixel', () => {
  for (const path of ['/', '/neck-pain/', '/new-patient-offer/', '/book-new-patient/', '/booking-confirmed/', '/es/']) {
    const h = harness({ url: 'https://lifechargechiropractic.com' + path });
    assert.equal(h.scripts.length, 1, path);
    const q = h.queued();
    assert.deepEqual(q.find(x => x[0] === 'init'), ['init', pixelId]);
    assert.deepEqual(q.find(x => x[0] === 'set'), ['set', 'autoConfig', false, pixelId]);
    assert.deepEqual(q.filter(x => x[0].startsWith('track')), [['trackSingle', pixelId, 'PageView']]);
  }
});

test('custom events go only to the Life Charge pixel and carry no form data', () => {
  const h = harness();
  assert.equal(h.window.lifeChargeMeta.track('Lead', { value: 49, currency: 'USD' }), true);
  assert.equal(h.window.lifeChargeMeta.track('Schedule'), true);
  const tracked = h.queued().filter(x => x[0] === 'trackSingle');
  assert.deepEqual(tracked.map(x => x.slice(0, 3)), [
    ['trackSingle', pixelId, 'PageView'],
    ['trackSingle', pixelId, 'Lead'],
    ['trackSingle', pixelId, 'Schedule']
  ]);
  assert.deepEqual(tracked[1][3], { value: 49, currency: 'USD' });
});

test('saved opt-out and Global Privacy Control keep the pixel off', () => {
  for (const options of [{ choice: 'denied' }, { gpc: true }]) {
    const h = harness(options);
    assert.equal(h.scripts.length, 0);
    assert.equal(h.window.fbq, undefined);
    assert.equal(h.window.lifeChargeMeta.track('Lead'), false);
  }
});

test('turning off revokes consent, clears Meta cookies and is remembered', () => {
  const h = harness();
  h.deny();
  assert.deepEqual(h.queued().at(-1), ['consent', 'revoke']);
  assert.equal(h.cookies.length, 6);
  assert.equal(JSON.parse(h.stored()).value, 'denied');
  h.allow();
  assert.deepEqual(h.queued().at(-1), ['consent', 'grant']);
  assert.equal(h.stored(), null);
});

test('expired opt-out, blocked storage and other hosts behave safely', () => {
  const expired = JSON.stringify({ value: 'denied', at: Date.now() - 400 * 86400000 });
  assert.equal(harness({ saved: expired }).scripts.length, 1);
  assert.equal(harness({ blockedStorage: true }).scripts.length, 1);
  for (const url of ['http://localhost:8765/', 'https://www.lifechargechiropractic.com/', 'http://lifechargechiropractic.com/']) {
    assert.equal(harness({ url }).scripts.length, 0, url);
  }
});

test('every live page loads the pixel; offer form sends Lead; confirmation sends Schedule', () => {
  const pages = fs.readdirSync('.', { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(d.name + '/index.html') && !['wordpress-theme', 'tests'].includes(d.name))
    .map(d => d.name + '/index.html').concat('index.html');
  for (const page of pages) {
    const html = fs.readFileSync(page, 'utf8');
    if (!html.includes('/assets/js/analytics.js')) continue;
    assert.ok(html.includes('/assets/js/meta-tracking.js?v=20261015a'), page);
  }
  assert.ok(fs.readFileSync('booking-confirmed/index.html', 'utf8').includes("lifeChargeMeta.track('Schedule')"));
  const offer = fs.readFileSync('assets/js/new-patient-offer.js', 'utf8');
  assert.ok(offer.includes("lifeChargeMeta.track('Lead', { value: 49, currency: 'USD' })"));
  assert.ok(!offer.includes('fbq('));
});

test('homepage carries the Meta domain verification tag in its HTML head', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  assert.ok(head.includes('<meta name="facebook-domain-verification" content="7sicp9g8hqzom0h51x2uuhl06g9z49" />'));
});
