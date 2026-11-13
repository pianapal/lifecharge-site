const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pages = ['about/index.html', 'neck-pain/index.html'];
const visibleMarkup = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<!--[\s\S]*?-->/g, '');

test('premium pilot is opt-in and every added CSS selector is page-scoped', () => {
  const css = read('shared.src.css').split('/* Premium UI pilot.')[1];
  assert.ok(css);
  const rules = css.slice(css.indexOf('*/') + 2);
  for (const match of rules.matchAll(/([^{}]+)\{/g)) {
    const selector = match[1].trim();
    if (selector.startsWith('@media')) continue;
    for (const part of selector.split(',')) {
      assert.match(part.trim(), /^\.(premium-page|about-premium|condition-premium)\b/);
    }
  }
  for (const page of pages) assert.match(read(page), /<body class="premium-page /);
});

test('pilot markup has one h1, unique IDs, balanced containers and valid JSON-LD', () => {
  for (const page of pages) {
    const html = read(page), markup = visibleMarkup(html);
    assert.equal((markup.match(/<h1\b/g) || []).length, 1, page);
    const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length, page + ' duplicate IDs');
    for (const tag of ['div', 'a', 'span', 'svg', 'section', 'main', 'figure', 'figcaption', 'ul', 'li', 'details']) {
      assert.equal((markup.match(new RegExp('<' + tag + '\\b', 'g')) || []).length,
        (markup.match(new RegExp('</' + tag + '>', 'g')) || []).length, page + ': ' + tag);
    }
    for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(block[1]);
    for (const anchor of markup.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(anchor[1]), page + ': ' + anchor[1]);
    for (const image of markup.matchAll(/<img\b[^>]*>/g)) {
      assert.match(image[0], /\bwidth="\d+"/);
      assert.match(image[0], /\bheight="\d+"/);
      assert.match(image[0], /\balt="/);
    }
  }
});

test('both doctors are introduced before the long background content', () => {
  const about = read('about/index.html');
  const intro = about.split('<!-- TEAM INTRODUCTION -->')[1].split('<!-- DR. PALMER -->')[0];
  assert.ok(intro.includes('href="#palmer-piana"'));
  assert.ok(intro.includes('href="#pierce-piana"'));
  assert.ok(intro.includes('staff-pierce.webp'));
  assert.ok(intro.includes('dr-adjusting-02.webp'));
  assert.ok(about.indexOf('id="pierce-piana"') < about.indexOf('<!-- THEME BANNER -->'));
  assert.ok(!about.includes('class="ac-num"'));
  assert.ok(!about.includes('class="why-check"'));
});

test('condition pilot keeps actual visit steps and removes decorative benefit numbers', () => {
  const neck = read('neck-pain/index.html');
  assert.equal((neck.match(/class="num-circle"/g) || []).length, 4);
  assert.ok(!neck.includes('class="sym-icon"'));
  assert.equal((neck.match(/class="editorial-topic"/g) || []).length, 8);
  assert.ok(neck.includes('<a href="../conditions/">Conditions</a><span class="breadcrumb-sep">'));
  const intro = neck.split('<!-- HERO -->')[1].split('<!-- INTRO -->')[0];
  assert.ok(intro.includes('fetchpriority="high"'));
  assert.ok(!intro.includes('loading="lazy"'));
});

test('each opening offers the existing booking destination and a direct phone link', () => {
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /class="editorial-call" href="tel:\+16152199912">Call us/);
    assert.match(html, /class="btn-primary" href="\/new-patient-offer\/">Schedule First Visit<\/a>/);
    assert.ok(html.includes('../shared.css?v=20261112-premium1'));
  }
});
