(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-EJ93DS5ESH';
  var GOOGLE_ADS_ID = 'AW-16473892179';
  var OPENAI_PIXEL_ID = '4jGoU3ZqHRPhPmKs7JG5xJ';

  if (!window.oaiq) {
    var openAIQueue = function () {
      openAIQueue.q.push(arguments);
    };
    openAIQueue.q = [];
    window.oaiq = openAIQueue;

    var openAIPixel = document.createElement('script');
    openAIPixel.async = true;
    openAIPixel.src = 'https://bzrcdn.openai.com/sdk/oaiq.min.js';
    var firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(openAIPixel, firstScript);
  }

  function openAIMeasurementAllowed() {
    if (window.navigator && window.navigator.globalPrivacyControl === true) return false;
    try {
      var choice = JSON.parse(window.localStorage.getItem('lc_meta_consent_v1') || 'null');
      if (choice && choice.value === 'denied') return false;
    } catch (error) { /* Storage restrictions must not break booking. */ }
    return true;
  }

  window.oaiq('consent', openAIMeasurementAllowed());
  window.oaiq('init', {
    pixelId: OPENAI_PIXEL_ID,
    debug: true
  });

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('set', 'linker', {
    domains: [
      'lifechargechiropractic.com',
      'schedule.lifechargechiropractic.com'
    ],
    decorate_forms: true
  });
  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID);
  window.gtag('config', GOOGLE_ADS_ID);

  var googleTag = document.createElement('script');
  googleTag.async = true;
  googleTag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
  document.head.appendChild(googleTag);

  function cleanText(value) {
    return (value || '').replace(/\s+/g, ' ').trim().slice(0, 100);
  }

  var ATTRIBUTION_STORAGE_KEY = 'lc_attribution_v1';
  var ATTRIBUTION_KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'gclid',
    'dclid',
    'wbraid',
    'gbraid',
    'fbclid',
    'msclkid'
  ];

  function cleanAttributionValue(value) {
    return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 300);
  }

  function readAttribution() {
    try {
      var stored = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }

  function captureAttribution() {
    var attribution = readAttribution();
    var query = new URLSearchParams(window.location.search);
    var isFirstCapture = !attribution.first_landing_page;

    if (isFirstCapture) {
      attribution.first_landing_page = cleanAttributionValue(
        window.location.pathname + window.location.search
      );
      attribution.first_referrer = cleanAttributionValue(document.referrer);
    }

    ATTRIBUTION_KEYS.forEach(function (key) {
      if (query.has(key)) {
        attribution[key] = cleanAttributionValue(query.get(key));
      }
    });

    attribution.lc_ads_measurement = openAIMeasurementAllowed() ? 'allowed' : 'denied';
    if (attribution.lc_ads_measurement === 'allowed') {
      // Opaque references must not be trimmed, normalized, or truncated.
      if (query.has('oppref')) attribution.oppref = query.get('oppref');
    } else {
      delete attribution.oppref;
    }

    attribution.latest_page = cleanAttributionValue(
      window.location.pathname + window.location.search
    );

    try {
      window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));
    } catch (error) {
      // Keep navigation and analytics working when storage is unavailable.
    }

    return attribution;
  }

  window.LifeChargeAnalytics = window.LifeChargeAnalytics || {};
  window.LifeChargeAnalytics.getAttribution = captureAttribution;
  window.LifeChargeAnalytics.openAIMeasurementAllowed = openAIMeasurementAllowed;
  window.LifeChargeAnalytics.attribution = captureAttribution();
  window.LifeChargeAnalytics.measureOpenAI = function (eventName, parameters) {
    window.oaiq('consent', openAIMeasurementAllowed());
    if (!openAIMeasurementAllowed()) return;
    if (typeof window.oaiq === 'function') {
      window.oaiq('measure', eventName, parameters || {});
    }
  };

  function decorateBookingLink(link) {
    try {
      var destination = new URL(link.href, window.location.href);
      var path = destination.pathname.replace(/\/+$/, '');
      if (destination.protocol !== 'https:' ||
          !['lifechargechiropractic.com', 'schedule.lifechargechiropractic.com'].includes(destination.hostname) ||
          !['/new-patient-offer', '/book-new-patient'].includes(path)) return;
      var attribution = captureAttribution();
      ATTRIBUTION_KEYS.forEach(function (key) {
        if (attribution[key] && !destination.searchParams.has(key)) {
          destination.searchParams.set(key, attribution[key]);
        }
      });
      destination.searchParams.set('lc_ads_measurement', attribution.lc_ads_measurement);
      if (attribution.lc_ads_measurement === 'denied') destination.searchParams.delete('oppref');
      else if (attribution.oppref) destination.searchParams.set('oppref', attribution.oppref);
      link.href = destination.href;
    } catch (error) { /* Invalid links must not interrupt navigation. */ }
  }

  // Decorate existing links for normal, new-tab, and context-menu navigation.
  document.querySelectorAll('a[href]').forEach(decorateBookingLink);
  document.addEventListener('pointerdown', function (event) {
    var link = event.target && event.target.closest && event.target.closest('a[href]');
    if (link) decorateBookingLink(link);
  }, true);

  function ctaLocation(link) {
    if (link.closest('.sticky-cta')) return 'sticky_cta';
    if (link.closest('nav')) return 'navigation';
    if (link.closest('footer')) return 'footer';
    if (link.closest('.page-hero, header')) return 'hero';
    if (link.closest('.page-cta')) return 'page_cta';
    return 'content';
  }

  function track(eventName, link, extraParameters) {
    var parameters = {
      cta_location: ctaLocation(link),
      link_text: cleanText(link.textContent),
      link_url: link.href,
      page_path: window.location.pathname,
      page_language: document.documentElement.lang || 'en'
    };

    Object.keys(extraParameters || {}).forEach(function (key) {
      parameters[key] = extraParameters[key];
    });

    window.gtag('event', eventName, parameters);
  }

  document.addEventListener('click', function (event) {
    if (!event.target || typeof event.target.closest !== 'function') return;
    var link = event.target.closest('a[href]');
    if (!link) return;

    decorateBookingLink(link);

    var href = link.getAttribute('href') || '';

    if (href.indexOf('tel:') === 0) {
      track('phone_call_click', link);
      return;
    }

    if (href.indexOf('mailto:') === 0) {
      track('email_click', link);
      return;
    }

    try {
      var destination = new URL(link.href, window.location.href);

      if (destination.hostname === 'wa.me' ||
          destination.hostname === 'api.whatsapp.com') {
        track('whatsapp_click', link, {
          destination_host: destination.hostname
        });
        return;
      }

      if (destination.hostname === 'schedule.lifechargechiropractic.com') {
        track('schedule_click', link, {
          destination_host: destination.hostname,
          destination_path: destination.pathname
        });
        return;
      }

      if (destination.origin === window.location.origin &&
          destination.pathname.replace(/\/+$/, '') === '/new-patient-offer') {
        track('offer_click', link);
        return;
      }

      if (destination.origin === window.location.origin &&
          destination.pathname.replace(/\/+$/, '') === '/auto-accident-consultation') {
        track('consultation_click', link);
      }
    } catch (error) {
      // Ignore malformed links and allow normal navigation to continue.
    }
  }, true);
})();
