(function () {
  'use strict';

  if (window.lifeChargeMeta) return;
  var PIXEL_ID = '1513358932888069';
  var STORAGE_KEY = 'lc_meta_consent_v1';
  var MAX_AGE = 365 * 24 * 60 * 60 * 1000;
  var choice = readChoice();
  var started = false;
  var panel;
  var opener;

  function browserOptOut() {
    return navigator.globalPrivacyControl === true;
  }

  function readChoice() {
    try {
      var saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      if (saved && saved.value === 'denied' && typeof saved.at === 'number' &&
          saved.at <= Date.now() && Date.now() - saved.at < MAX_AGE) return 'denied';
    } catch (error) { /* A blocked storage area keeps the default. */ }
    return 'allowed';
  }

  function permitted() {
    try {
      if (new URL(window.location.href).origin !== 'https://lifechargechiropractic.com') return false;
    } catch (error) { return false; }
    return choice !== 'denied' && !browserOptOut();
  }

  function start() {
    if (started || !permitted()) return;
    started = true;
    if (!window.fbq) {
      var queue = function () {
        if (queue.callMethod) queue.callMethod.apply(queue, arguments);
        else queue.queue.push(arguments);
      };
      queue.queue = [];
      queue.push = queue;
      queue.loaded = true;
      queue.version = '2.0';
      window.fbq = queue;
      window._fbq = window._fbq || queue;
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      script.onerror = function () { /* Blocked pixels must never affect the site. */ };
      document.head.appendChild(script);
    }
    // Manual events only. Automatic button and form scanning stays off, so no form details are sent.
    window.fbq('set', 'autoConfig', false, PIXEL_ID);
    window.fbq('init', PIXEL_ID);
    window.fbq('trackSingle', PIXEL_ID, 'PageView');
  }

  function track(eventName, parameters, options) {
    if (!started) return false;
    window.fbq('trackSingle', PIXEL_ID, eventName, parameters || {}, options || {});
    return true;
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
    try {
      if (choice === 'denied') window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ value: 'denied', at: Date.now() }));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) { /* The choice still applies for this page. */ }
    if (choice === 'denied') revoke();
    else if (started) window.fbq('consent', 'grant');
    else start();
    panel.hidden = true;
    if (opener) opener.focus();
  }

  function showChoices(event) {
    opener = event && event.currentTarget;
    panel.hidden = false;
    var status = panel.querySelector('[data-meta-status]');
    status.textContent = browserOptOut() ? 'Your browser privacy signal keeps Meta measurement off.' :
      (choice === 'denied' ? 'Your saved choice: Meta measurement off.' : 'Meta measurement is on.');
    panel.querySelector('[data-meta-allow]').disabled = browserOptOut();
    if (opener) panel.querySelector('[data-meta-deny]').focus();
  }

  function buildControls() {
    panel = document.createElement('section');
    panel.className = 'meta-consent';
    panel.hidden = true;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Facebook measurement choices');
    panel.innerHTML = '<div class="meta-consent-copy"><h2>Facebook measurement</h2>' +
      '<p>We use the Meta (Facebook and Instagram) pixel to measure our ads. It records the pages you visit on this site and when you request or book a visit. It never receives what you type into our forms. You can turn it off for this browser.</p>' +
      '<p class="meta-consent-status" data-meta-status aria-live="polite"></p>' +
      '<a href="/privacy-policy/">Privacy details</a></div><div class="meta-consent-actions">' +
      '<button type="button" data-meta-deny>Turn off</button>' +
      '<button type="button" data-meta-allow>Keep on</button></div>';
    document.body.appendChild(panel);
    panel.querySelector('[data-meta-deny]').addEventListener('click', function () { saveChoice('denied'); });
    panel.querySelector('[data-meta-allow]').addEventListener('click', function () { saveChoice('allowed'); });
    document.querySelectorAll('[data-meta-privacy]').forEach(function (button) {
      button.hidden = false;
      button.addEventListener('click', showChoices);
    });
  }

  window.lifeChargeMeta = { track: track, open: function (event) { showChoices(event); } };
  start();
  if (document.body) buildControls();
  else document.addEventListener('DOMContentLoaded', buildControls);
})();
