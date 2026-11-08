const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const code = fs.readFileSync(require('node:path').join(__dirname, '../assets/js/analytics.js'), 'utf8');

function run({href, denied = false, gpc = false}) {
  const opaque = ' Abc+/= ' + 'x'.repeat(900);
  const link = {href};
  const handlers = {};
  const window = {
    location: {href: 'https://lifechargechiropractic.com/', origin: 'https://lifechargechiropractic.com', pathname: '/', search: '?' + new URLSearchParams({oppref: opaque, utm_source: 'openai'})},
    navigator: {globalPrivacyControl: gpc},
    localStorage: {getItem: () => denied ? JSON.stringify({value:'denied'}) : null},
    sessionStorage: {getItem: () => null, setItem() {}},
    oaiq() {}
  };
  vm.runInNewContext(code, {window, URL, URLSearchParams,
    document: {referrer: '', createElement: () => ({}), head: {appendChild() {}},
      querySelectorAll: () => [link], addEventListener: (name, cb) => handlers[name] = cb}
  });
  return {url: new URL(link.href), opaque};
}

test('cross-domain booking links preserve opaque reference and existing UTMs', () => {
  const {url, opaque} = run({href:'https://schedule.lifechargechiropractic.com/new-patient-offer?utm_campaign=existing'});
  assert.equal(url.searchParams.get('oppref'), opaque);
  assert.equal(url.searchParams.get('utm_source'), 'openai');
  assert.equal(url.searchParams.get('utm_campaign'), 'existing');
  assert.equal(url.searchParams.get('lc_ads_measurement'), 'allowed');
});
test('opt-out and GPC remove reference from booking destination', () => {
  for (const mode of [{denied:true}, {gpc:true}]) {
    const {url} = run({href:'https://schedule.lifechargechiropractic.com/new-patient-offer?oppref=old', ...mode});
    assert.equal(url.searchParams.has('oppref'), false);
    assert.equal(url.searchParams.get('lc_ads_measurement'), 'denied');
  }
});
test('unrelated and external links are never decorated', () => {
  for (const href of ['https://example.com/new-patient-offer','https://lifechargechiropractic.com/about/','https://schedule.lifechargechiropractic.com/thankyoupagegoogle']) {
    assert.equal(run({href}).url.href, href);
  }
});
