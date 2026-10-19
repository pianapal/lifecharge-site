(function () {
  'use strict';
  if (!window.matchMedia || !window.IntersectionObserver || !Element.prototype.animate) return;
  var preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches) return;
  var animations = new Set();
  var seen = new WeakSet();
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting || seen.has(entry.target)) return;
      seen.add(entry.target);
      observer.unobserve(entry.target);
      if (preference.matches || document.visibilityState === 'hidden') return;
      // Content stays visible in HTML/CSS; animation is only a brief enhancement.
      var animation = entry.target.animate([
        { opacity: 0.72, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 420, easing: 'cubic-bezier(0.2, 0.65, 0.3, 1)', iterations: 1 });
      animations.add(animation);
      animation.onfinish = animation.oncancel = function () { animations.delete(animation); };
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -24px 0px' });
  document.querySelectorAll('main .h2, main .section-h2, main .process-step-img, main .two-col > .col-photo').forEach(function (element) {
    // Do not animate content already visible at load, the hero, or form controls.
    if (element.getBoundingClientRect().top >= window.innerHeight) observer.observe(element);
  });
  function stop() {
    observer.disconnect();
    animations.forEach(function (animation) { animation.cancel(); });
    animations.clear();
  }
  if (preference.addEventListener) preference.addEventListener('change', function () { if (preference.matches) stop(); });
  window.addEventListener('pagehide', stop);
  window.addEventListener('beforeprint', stop);
})();
