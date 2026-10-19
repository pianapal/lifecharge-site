(function () {
  'use strict';
  var toggle = document.querySelector('.nav-toggle');
  if (!toggle) return;
  var links = document.getElementById(toggle.getAttribute('aria-controls'));
  if (!links) return;

  function setOpen(open) {
    toggle.classList.toggle('open', open);
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', toggle.getAttribute(open ? 'data-close-label' : 'data-open-label'));
  }
  toggle.addEventListener('click', function () {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });
  links.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { setOpen(false); });
  });
  document.addEventListener('click', function (event) {
    if (!toggle.contains(event.target) && !links.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
})();
