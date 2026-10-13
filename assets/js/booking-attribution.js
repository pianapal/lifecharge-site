(function () {
  'use strict';

  var calendar = document.getElementById('lifecharge-booking-calendar');
  var directLink = document.getElementById('directCalendarLink');
  if (!calendar) return;

  var destination = new URL(calendar.getAttribute('data-calendar-src'));
  var attribution = {};
  try {
    attribution = JSON.parse(window.sessionStorage.getItem('lc_attribution_v1') || '{}') || {};
  } catch (error) {
    // A blocked storage API must not stop the calendar from loading.
  }

  var query = new URLSearchParams(window.location.search);
  // Forward campaign attribution only, never names, contact details or health fields.
  var keys = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'gclid', 'dclid', 'wbraid', 'gbraid', 'fbclid', 'msclkid'
  ];
  keys.forEach(function (key) {
    var value = query.get(key) || attribution[key];
    if (typeof value !== 'string') return;
    value = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 300);
    if (value) destination.searchParams.set(key, value);
  });

  if (directLink) directLink.href = destination.toString();
  calendar.addEventListener('load', function () {
    if (typeof window.lifeChargeCalendarReady === 'function') {
      window.lifeChargeCalendarReady();
    }
  }, { once: true });
  // Assign once with attribution included, avoiding a second calendar load.
  calendar.src = destination.toString();
})();
