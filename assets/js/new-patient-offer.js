(function () {
  'use strict';

  var WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/7gE4vBVcRffrJnXyvGmu/webhook-trigger/81c6a464-264f-4573-b771-956bf2bd5b23';
  var BOOKING_URL = 'https://lifechargechiropractic.com/book-new-patient/';
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

  var form = document.getElementById('offerForm');
  var preferencePanel = document.getElementById('preferencePanel');
  var detailsPanel = document.getElementById('detailsPanel');
  var continueButton = document.getElementById('continueButton');
  var backButton = document.getElementById('backButton');
  var submitButton = document.getElementById('submitButton');
  var selectedTimeText = document.getElementById('selectedTimeText');
  var stagePreference = document.getElementById('stagePreference');
  var stageDetails = document.getElementById('stageDetails');
  var formSuccess = document.getElementById('formSuccess');
  var formError = document.getElementById('formError');
  var calendarHandoff = document.getElementById('calendarHandoff');
  var errorCalendarLink = document.getElementById('errorCalendarLink');
  var mobileReserve = document.getElementById('mobileReserve');
  var reserveCard = document.getElementById('reserve');
  var startedAt = Date.now();
  var isSubmitting = false;

  if (!form || !preferencePanel || !detailsPanel) return;

  function track(eventName, parameters) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, parameters || {});
    }
  }

  function readAttribution() {
    if (window.LifeChargeAnalytics &&
        typeof window.LifeChargeAnalytics.getAttribution === 'function') {
      return window.LifeChargeAnalytics.getAttribution();
    }

    try {
      var stored = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }

  function bookingUrl() {
    var destination = new URL(BOOKING_URL);
    var attribution = readAttribution();

    ATTRIBUTION_KEYS.forEach(function (key) {
      var currentValue = new URLSearchParams(window.location.search).get(key);
      var value = currentValue || attribution[key];
      if (value) destination.searchParams.set(key, String(value).slice(0, 300));
    });

    destination.searchParams.set('utm_content',
      destination.searchParams.get('utm_content') || 'onsite_lead_handoff');

    return destination.toString();
  }

  function prepareCalendarLinks() {
    var destination = bookingUrl();
    calendarHandoff.href = destination;
    errorCalendarLink.href = destination;
  }

  function selectedTime() {
    var selected = form.querySelector('input[name="preferred_time"]:checked');
    return selected ? selected.value : '';
  }

  function showDetails() {
    var time = selectedTime();
    if (!time) return;

    selectedTimeText.textContent = time;
    preferencePanel.hidden = true;
    detailsPanel.hidden = false;
    stagePreference.classList.remove('active');
    stageDetails.classList.add('active');
    formError.classList.remove('is-visible');

    var firstName = document.getElementById('first_name');
    if (firstName) firstName.focus({ preventScroll: true });

    ['https://api.leadconnectorhq.com', 'https://link.msgsndr.com'].forEach(function (origin) {
      if (document.querySelector('link[rel="preconnect"][href="' + origin + '"]')) return;
      var preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = origin;
      preconnect.crossOrigin = 'anonymous';
      document.head.appendChild(preconnect);
    });

    track('offer_details_started', {
      form_name: 'new_patient_offer',
      preferred_time: time
    });
  }

  function showPreference() {
    detailsPanel.hidden = true;
    preferencePanel.hidden = false;
    stageDetails.classList.remove('active');
    stagePreference.classList.add('active');
    var selected = form.querySelector('input[name="preferred_time"]:checked');
    if (selected) selected.focus({ preventScroll: true });
  }

  function validateDetails() {
    var required = detailsPanel.querySelectorAll('input[required], select[required]');

    for (var index = 0; index < required.length; index += 1) {
      var field = required[index];
      field.value = field.value.trim();

      if (!field.checkValidity()) {
        field.reportValidity();
        field.focus();
        return false;
      }
    }

    return true;
  }

  function formPayload() {
    var data = new FormData(form);
    var payload = {};

    data.forEach(function (value, key) {
      payload[key] = typeof value === 'string' ? value.trim() : value;
    });

    var attribution = readAttribution();
    Object.keys(attribution).forEach(function (key) {
      if (attribution[key]) payload[key] = String(attribution[key]).slice(0, 500);
    });

    payload.full_name = (payload.first_name + ' ' + payload.last_name).trim();
    payload.preferred_contact = 'Phone';
    payload.source = 'New Patient Offer - lifechargechiropractic.com/new-patient-offer/';
    payload.page_url = window.location.href;
    payload.referrer = document.referrer || attribution.first_referrer || '';
    payload.submitted_at = new Date().toISOString();
    payload.fill_time_seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    payload.tag = 'new-patient-offer';
    payload.offer_name = '$49 New Patient Visit';
    payload.offer_value = '49';
    delete payload.website;
    delete payload.company;

    return payload;
  }

  function handoffToCalendar() {
    prepareCalendarLinks();
    calendarHandoff.click();
  }

  form.querySelectorAll('input[name="preferred_time"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      continueButton.disabled = false;
      selectedTimeText.textContent = radio.value;
      track('offer_time_selected', {
        form_name: 'new_patient_offer',
        preferred_time: radio.value
      });
    });
  });

  continueButton.addEventListener('click', showDetails);
  backButton.addEventListener('click', showPreference);

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (isSubmitting || !validateDetails()) return;

    var website = document.getElementById('website');
    var company = document.getElementById('company');
    if ((website && website.value) || (company && company.value)) return;

    isSubmitting = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Saving Your Visit...';
    formError.classList.remove('is-visible');

    var payload = formPayload();

    fetch(WEBHOOK_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (response) {
      if (!response.ok) throw new Error('Lead capture failed');

      form.hidden = true;
      formSuccess.classList.add('is-visible');
      track('generate_lead', {
        form_name: 'new_patient_offer',
        currency: 'USD',
        value: 49,
        preferred_time: payload.preferred_time
      });
      track('schedule_handoff', {
        form_name: 'new_patient_offer',
        destination_host: 'schedule.lifechargechiropractic.com'
      });

      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', { value: 49, currency: 'USD' });
      }

      window.setTimeout(handoffToCalendar, 850);
    }).catch(function () {
      isSubmitting = false;
      submitButton.disabled = false;
      submitButton.textContent = 'Claim My $49 Visit & See Times';
      formError.classList.add('is-visible');
      track('lead_form_error', { form_name: 'new_patient_offer' });
    });
  });

  document.querySelectorAll('a[href="#reserve"]').forEach(function (link) {
    link.addEventListener('click', function () {
      window.setTimeout(function () {
        var selected = form.querySelector('input[name="preferred_time"]:checked');
        if (detailsPanel.hidden && selected) {
          continueButton.focus({ preventScroll: true });
        }
      }, 450);
    });
  });

  document.querySelectorAll('a[data-track="directions"]').forEach(function (link) {
    link.addEventListener('click', function () {
      track('directions_click', {
        link_text: (link.textContent || link.getAttribute('aria-label') || '').trim().slice(0, 100),
        destination_host: 'www.google.com',
        page_path: window.location.pathname
      });
    });
  });

  if (mobileReserve && reserveCard && 'IntersectionObserver' in window) {
    var reserveVisible = true;
    var reserveObserver = new IntersectionObserver(function (entries) {
      reserveVisible = entries[0].isIntersecting;
      mobileReserve.classList.toggle('show', window.scrollY > 240 && !reserveVisible);
    }, { threshold: 0.08 });

    reserveObserver.observe(reserveCard);
    window.addEventListener('scroll', function () {
      mobileReserve.classList.toggle('show', window.scrollY > 240 && !reserveVisible);
    }, { passive: true });
  }

  prepareCalendarLinks();
  track('view_promotion', {
    promotion_id: 'new_patient_49',
    promotion_name: '$49 New Patient Visit'
  });
})();
