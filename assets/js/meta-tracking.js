(function () {
  'use strict';

  if (window.LifeChargeMetaPrivacy) return;
  var PIXEL_ID = '1513358932888069';
  var STORAGE_KEY = 'lc_meta_consent_v1';
  var MAX_AGE = 90 * 24 * 60 * 60 * 1000;
  var choice = readChoice();
  var loading = false;
  var ready = false;
  var initialized = false;
  var measured = false;
  var panel;
  var opener;

  function browserOptOut() {
    return navigator.globalPrivacyControl === true ||
      navigator.doNotTrack === '1' || window.doNotTrack === '1';
  }

  function readChoice() {
    try {
      var saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      if (saved && (saved.value === 'granted' || saved.value === 'denied') &&
          typeof saved.at === 'number' && saved.at <= Date.now() &&
          Date.now() - saved.at < MAX_AGE) return saved.value;
    } catch (error) { /* A blocked storage area never implies consent. */ }
    return 'unknown';
  }

  function eligiblePage() {
    try {
      var page = new URL(window.location.href);
      if (page.origin !== 'https://lifechargechiropractic.com' ||
          page.pathname !== '/' || page.hash) return false;
      // Never send arbitrary URL text, campaign labels or personal query values.
      var entries = Array.from(page.searchParams.entries());
      if (entries.length > 1 || entries.some(function (entry) {
        return entry[0] !== 'fbclid' || !/^[A-Za-z0-9_-]{10,500}$/.test(entry[1]);
      })) return false;
      // Do not report a return from a health article, form or booking page.
      if (document.referrer) {
        var referrer = new URL(document.referrer);
        if (referrer.pathname !== '/' || referrer.search || referrer.hash) return false;
      }
      return true;
    } catch (error) { return false; }
  }

  function permitted() {
    return choice === 'granted' && !browserOptOut() && eligiblePage();
  }

  function measureVisit() {
    if (!ready || !permitted()) return;
    if (!initialized) {
      // Manual-only configuration. No customer data, automatic events or CAPI.
      window.fbq.disablePushState = true;
      window.fbq('set', 'autoConfig', false, PIXEL_ID);
      window.fbq('init', PIXEL_ID);
      initialized = true;
    }
    window.fbq('consent', 'grant');
    if (!measured) {
      window.fbq('trackSingle', PIXEL_ID, 'PageView');
      measured = true;
    }
  }

  function loadPixel() {
    if (!permitted()) return;
    if (ready) { measureVisit(); return; }
    if (loading || window.fbq) return;
    loading = true;
    var queue = function () {
      if (queue.callMethod) queue.callMethod.apply(queue, arguments);
      else queue.queue.push(arguments);
    };
    queue.queue = [];
    queue.push = queue;
    queue.loaded = true;
    queue.version = '2.0';
    queue.disablePushState = true;
    window.fbq = queue;
    window._fbq = window._fbq || queue;
    queue('consent', 'revoke');
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    script.referrerPolicy = 'no-referrer';
    script.onload = function () { ready = true; measureVisit(); };
    script.onerror = function () { /* Blocked pixels must never affect the site. */ };
    document.head.appendChild(script);
  }

  function revoke() {
    if (typeof window.fbq === 'function') window.fbq('consent', 'revoke');
    ['_fbp', '_fbc'].forEach(function (name) {
      ['', '; domain=lifechargechiropractic.com', '; domain=.lifechargechiropractic.com'].forEach(function (domain) {
        document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax; Secure' + domain;
      });
    });
  }

  function saveChoice(value) {
    choice = browserOptOut() ? 'denied' : value;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ value: choice, at: Date.now() })); }
    catch (error) { /* The choice still applies for this page. */ }
    if (choice === 'granted') loadPixel();
    else revoke();
    panel.hidden = true;
    if (opener) opener.focus();
  }

  function showChoices(event) {
    opener = event && event.currentTarget;
    panel.hidden = false;
    var status = panel.querySelector('[data-meta-status]');
    status.textContent = browserOptOut() ? 'Your browser privacy signal keeps Meta tracking off.' :
      (choice === 'granted' ? 'Your saved choice: allow on eligible homepage visits.' :
        choice === 'denied' ? 'Your saved choice: Meta tracking off.' : 'Meta tracking is off until you choose Allow.');
    panel.querySelector('[data-meta-allow]').disabled = browserOptOut();
    if (opener) panel.querySelector('[data-meta-deny]').focus();
  }

  panel = document.createElement('section');
  panel.className = 'meta-consent';
  panel.hidden = true;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Optional Facebook measurement');
  panel.innerHTML = '<div class="meta-consent-copy"><h2>Optional Facebook measurement</h2>' +
    '<p>Allow Meta (Facebook and Instagram) to receive a homepage visit event, browser identifiers and your IP address to help measure our ads? This pixel stays off patient forms, booking pages and health articles. This choice controls Meta only.</p>' +
    '<p class="meta-consent-status" data-meta-status aria-live="polite"></p>' +
    '<a href="/privacy-policy/">Privacy details</a></div><div class="meta-consent-actions">' +
    '<button type="button" data-meta-deny>No thanks / turn off</button>' +
    '<button type="button" data-meta-allow>Allow Meta</button></div>';
  document.body.appendChild(panel);
  panel.querySelector('[data-meta-deny]').addEventListener('click', function () { saveChoice('denied'); });
  panel.querySelector('[data-meta-allow]').addEventListener('click', function () { saveChoice('granted'); });
  document.querySelectorAll('[data-meta-privacy]').forEach(function (button) {
    button.hidden = false;
    button.addEventListener('click', showChoices);
  });
  window.addEventListener('storage', function (event) {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    choice = readChoice();
    if (permitted()) loadPixel();
    else revoke();
  });
  window.addEventListener('pageshow', function () {
    choice = readChoice();
    if (!permitted()) revoke();
  });
  window.LifeChargeMetaPrivacy = { open: showChoices };
  if (browserOptOut()) revoke();
  else if (choice === 'unknown' && eligiblePage()) showChoices();
  else loadPixel();
})();
