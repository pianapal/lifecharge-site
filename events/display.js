(() => {
  'use strict';
  const slides = Array.from(document.querySelectorAll('.slide'));
  const controls = document.getElementById('controls');
  const play = document.getElementById('play');
  const pace = document.getElementById('pace');
  const fullscreen = document.getElementById('fullscreen');
  const progress = document.querySelector('.timeline i');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const status = document.getElementById('screen-status');
  let current = 0, playing = !reducedMotion.matches, timer, hideTimer, wakeLock;
  let duration = Number(pace.value) * 1000, remaining = duration, startedAt = 0;
  function announce(text) { document.getElementById('announcement').textContent = text; }
  function resetProgress() {
    progress.classList.remove('running');
    void progress.offsetWidth;
    progress.classList.add('running');
  }
  function schedule() {
    clearTimeout(timer);
    if (playing && !document.hidden) {
      startedAt = performance.now();
      timer = setTimeout(() => show(current + 1), remaining);
    }
  }
  function show(index, manual = false) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const active = i === current;
      slide.classList.toggle('active', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.inert = !active;
    });
    const name = `${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')} · ${slides[current].dataset.name}`;
    document.getElementById('slide-name').textContent = name;
    if (manual) announce(name);
    remaining = duration;
    resetProgress();
    schedule();
  }
  function setPlaying(value) {
    if (playing && !value && !document.hidden) remaining = Math.max(0, remaining - (performance.now() - startedAt));
    playing = value;
    document.body.classList.toggle('paused', !playing || document.hidden);
    play.textContent = playing ? 'Pause' : 'Play';
    play.setAttribute('aria-label', playing ? 'Pause slideshow' : 'Play slideshow');
    schedule();
  }
  function reveal() {
    controls.classList.add('visible');
    document.body.classList.remove('idle');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!controls.contains(document.activeElement) && !controls.matches(':hover')) {
        controls.classList.remove('visible');
        if (playing) document.body.classList.add('idle');
      }
    }, 5000);
  }
  async function keepAwake() {
    if ('wakeLock' in navigator && document.fullscreenElement && !document.hidden && !wakeLock) {
      try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
      catch { status.textContent = 'Keep this device awake in its display settings.'; }
    }
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else { status.textContent = 'Use your browser’s full-screen command.'; announce(status.textContent); }
      await keepAwake();
    } catch { status.textContent = 'Use your browser’s full-screen command.'; announce(status.textContent); }
    reveal();
  }
  document.getElementById('previous').addEventListener('click', () => show(current - 1, true));
  document.getElementById('next').addEventListener('click', () => show(current + 1, true));
  play.addEventListener('click', () => { setPlaying(!playing); announce(playing ? 'Playing' : 'Paused'); reveal(); });
  pace.addEventListener('change', () => {
    duration = Number(pace.value) * 1000;
    document.documentElement.style.setProperty('--slide-duration', `${duration / 1000}s`);
    show(current);
  });
  fullscreen.addEventListener('click', toggleFullscreen);
  // Pointer-operated controls can fade; keyboard focus remains visible.
  controls.addEventListener('click', e => {
    if (e.detail > 0 && e.target.closest('button,a')) { e.target.closest('button,a').blur(); reveal(); }
  });
  document.getElementById('show-controls').addEventListener('click', () => { reveal(); play.focus(); });
  document.addEventListener('pointermove', reveal, {passive:true});
  document.addEventListener('pointerdown', reveal, {passive:true});
  document.addEventListener('focusin', reveal);
  controls.addEventListener('focusout', reveal);
  controls.addEventListener('pointerleave', reveal);
  document.addEventListener('keydown', e => {
    reveal();
    if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1, true); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1, true); }
    else if (e.key.toLowerCase() === 'f') { e.preventDefault(); toggleFullscreen(); }
    else if (e.key === 'Home') { e.preventDefault(); show(0, true); }
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreen.textContent = document.fullscreenElement ? 'Exit full screen ↙' : 'Full screen ↗';
    if (!document.fullscreenElement && wakeLock) wakeLock.release().catch(() => {});
    keepAwake();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (playing) remaining = Math.max(0, remaining - (performance.now() - startedAt));
      clearTimeout(timer); document.body.classList.add('paused');
    } else { document.body.classList.toggle('paused', !playing); schedule(); keepAwake(); }
  });
  reducedMotion.addEventListener('change', e => { if (e.matches) setPlaying(false); });
  document.body.classList.toggle('paused', !playing);
  play.textContent = playing ? 'Pause' : 'Play';
  play.setAttribute('aria-label', playing ? 'Pause slideshow' : 'Play slideshow');
  show(0); reveal();
})();
