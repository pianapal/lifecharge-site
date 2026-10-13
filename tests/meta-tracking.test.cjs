const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync('assets/js/meta-tracking.js', 'utf8');
const pixelId = '1513358932888069';

function harness(options = {}) {
  const scripts = [], events = [], cookies = [], listeners = {};
  let saved = options.saved ?? (options.choice ? JSON.stringify({ value: options.choice, at: Date.now() }) : null);
  const controls = {};
  function control(name) {
    return controls[name] ||= { addEventListener(type, fn) { this[type] = fn; }, focus() { this.focused = true; } };
  }
  const panel = { hidden: true, setAttribute() {}, querySelector: control };
  const document = {
    referrer: options.referrer || '',
    createElement: name => name === 'script' ? {} : panel,
    head: { appendChild(script) { scripts.push(script); } },
    body: { appendChild() {} },
    querySelectorAll: () => [control('settings')],
    set cookie(value) { cookies.push(value); }
  };
  const window = {
    location: { href: options.url || 'https://lifechargechiropractic.com/' },
    localStorage: {
      getItem() { if (options.blockedStorage) throw Error('blocked'); return saved; },
      setItem(key, value) { if (options.blockedStorage) throw Error('blocked'); saved = value; }
    },
    addEventListener(name, fn) { listeners[name] = fn; },
    doNotTrack: options.windowDnt
  };
  const context = { window, document, navigator: { globalPrivacyControl: options.gpc, doNotTrack: options.dnt }, URL, Date, Array };
  vm.runInNewContext(code, context);
  return {
    window, panel, scripts, controls, cookies, events, listeners,
    allow() { control('[data-meta-allow]').click(); },
    deny() { control('[data-meta-deny]').click(); },
    loaded() {
      if (!scripts[0]) throw Error('No SDK requested');
      events.push(...window.fbq.queue.map(x => Array.from(x)));
      window.fbq.callMethod = (...args) => events.push(args);
      scripts[0].onload();
    },
    storage(value) { saved = value; listeners.storage({ key: 'lc_meta_consent_v1' }); },
    rerun() { vm.runInNewContext(code, context); }
  };
}

test('no request or pixel before explicit consent; deny remains off', () => {
  const h = harness();
  assert.equal(h.scripts.length, 0);
  assert.equal(h.window.fbq, undefined);
  assert.equal(h.panel.hidden, false);
  h.deny();
  assert.equal(h.panel.hidden, true);
  assert.equal(h.scripts.length, 0);
});

test('opt-in sends exactly one bare PageView to the correct pixel after SDK load', () => {
  const h = harness();
  h.allow(); h.allow();
  assert.equal(h.scripts.length, 1);
  assert.equal(h.scripts[0].referrerPolicy, 'no-referrer');
  assert.deepEqual(h.events, []);
  h.loaded(); h.allow(); h.rerun();
  assert.deepEqual(h.events.filter(x => x[0].startsWith('track')), [['trackSingle', pixelId, 'PageView']]);
  assert.deepEqual(h.events.find(x => x[0] === 'init'), ['init', pixelId]);
  assert.deepEqual(h.events.find(x => x[0] === 'set'), ['set', 'autoConfig', false, pixelId]);
  assert.equal(h.window.fbq.disablePushState, true);
});

test('revocation before SDK readiness prevents initialization and PageView', () => {
  const h = harness(); h.allow(); h.deny(); h.loaded();
  assert.equal(h.events.some(x => x[0] === 'init' || x[0].startsWith('track')), false);
});

test('withdrawal revokes future tracking and expires first-party Meta cookies', () => {
  const h = harness({ choice: 'granted' }); h.loaded(); h.deny();
  assert.deepEqual(h.events.at(-1), ['consent', 'revoke']);
  assert.equal(h.cookies.length, 6);
  assert.ok(h.cookies.every(c => /^_fb[pc]=; Max-Age=0;/.test(c)));
  const other = harness({ choice: 'granted' }); other.loaded(); other.storage(null);
  assert.deepEqual(other.events.at(-1), ['consent', 'revoke']);
});

test('GPC and Do Not Track override even stored consent', () => {
  for (const options of [{gpc:true}, {dnt:'1'}, {windowDnt:'1'}]) {
    const h = harness({ choice:'granted', ...options }); h.allow();
    assert.equal(h.scripts.length, 0);
  }
});

test('never loads on forms, booking, conditions, blogs, policy, aliases or localhost', () => {
  for (const path of ['/new-patient-offer/', '/book-new-patient/', '/neck-pain/', '/blog/', '/blog/i-slept-wrong-neck-pain/', '/privacy-policy/', '/index.html', '/about/']) {
    const h = harness({choice:'granted',url:'https://lifechargechiropractic.com'+path}); h.allow();
    assert.equal(h.scripts.length, 0, path);
  }
  for (const url of ['http://lifechargechiropractic.com/', 'https://www.lifechargechiropractic.com/', 'http://localhost:8765/']) {
    assert.equal(harness({choice:'granted',url}).scripts.length,0,url);
  }
});

test('URL and referrer guards reject potentially sensitive context', () => {
  for (const suffix of ['?email=private', '?utm_campaign=neck-pain', '?fbclid=bad', '?fbclid=abcdefghijk&email=private', '?fbclid=abcdefghijk&fbclid=abcdefghijk', '#neck-pain']) {
    assert.equal(harness({choice:'granted',url:'https://lifechargechiropractic.com/'+suffix}).scripts.length,0,suffix);
  }
  for (const referrer of ['https://lifechargechiropractic.com/book-new-patient/', 'https://lifechargechiropractic.com/neck-pain/', 'https://example.com/?q=medical', 'https://example.com/private', 'invalid']) {
    assert.equal(harness({choice:'granted',referrer}).scripts.length,0,referrer);
  }
  assert.equal(harness({choice:'granted',url:'https://lifechargechiropractic.com/?fbclid=abcdefghijk',referrer:'https://l.facebook.com/'}).scripts.length,1);
});

test('malformed, expired, future or blocked storage never implies consent', () => {
  for (const saved of ['invalid','null','{}', JSON.stringify({value:'granted',at:Date.now()-91*86400000}), JSON.stringify({value:'granted',at:Date.now()+86400000})]) {
    assert.equal(harness({saved}).scripts.length,0);
  }
  const h = harness({blockedStorage:true}); assert.equal(h.scripts.length,0); h.allow();
  assert.equal(h.scripts.length,1);
});

test('privacy controls work on policy page without loading the pixel', () => {
  const h = harness({url:'https://lifechargechiropractic.com/privacy-policy/'});
  h.controls.settings.click({currentTarget:h.controls.settings});
  assert.equal(h.panel.hidden,false); h.allow();
  assert.equal(h.scripts.length,0);
  assert.equal(h.controls.settings.focused,true);
});

test('SDK failure leaves navigation and controls available', () => {
  const h = harness(); h.allow(); h.scripts[0].onerror(); h.deny();
  assert.equal(h.panel.hidden,true);
  assert.equal(h.events.length,0);
});

test('only home and privacy settings include the loader; no form Meta events remain', () => {
  for (const page of ['new-patient-offer/index.html', 'book-new-patient/index.html', 'neck-pain/index.html']) {
    assert.ok(!fs.readFileSync(page,'utf8').includes('/assets/js/meta-tracking.js'));
  }
  for (const page of ['index.html','privacy-policy/index.html']) {
    assert.ok(fs.readFileSync(page,'utf8').includes('/assets/js/meta-tracking.js'));
  }
  assert.ok(!fs.readFileSync('assets/js/new-patient-offer.js','utf8').includes('fbq('));
});
