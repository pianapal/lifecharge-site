# AGENTS.md — Life Charge Chiropractic

Instructions for any AI coding agent (Codex, Claude Code, Cursor, etc.) working in this repo.
**Read this file completely before making changes.** Following it is what keeps the site
visually and editorially consistent no matter which tool made the edit.

---

## 1. What this repo is

A **static HTML site** for Life Charge Chiropractic, a chiropractic office in Gallatin, TN.
No build step, no framework, no npm install. Plain HTML + one shared stylesheet.

- **Live site:** https://lifechargechiropractic.com
- **Hosting:** cPanel (Namecheap), LiteSpeed, Apache-style `.htaccess`
- **Blog:** WordPress lives separately at `/blog/` and is **excluded from deploys.** Never edit it here.

---

## 2. Deploying (important: you do NOT need SSH)

```
edit files  ->  git add  ->  git commit  ->  git push origin main  ->  DONE
```

Pushing to `main` triggers `.github/workflows/deploy.yml`, which SSHes into the cPanel box
and rsyncs the repo to the web root. The SSH key lives only in GitHub Actions secrets.
**No agent has or needs server credentials.**

Deploy takes about 30 to 60 seconds. Verify with:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://lifechargechiropractic.com/some-page/
```

Do not commit `wordpress-theme/`, `blog/`, `*.bak`, or `assets/photos/.original-fullsize/`.

---

## 3. CRITICAL GOTCHAS (read these or you will break something)

### 3.1 Every page exists TWICE. Edit the subdirectory copy.

There are 25 pages with both a top-level `slug.html` **and** a `slug/index.html`.
Apache `DirectoryIndex` serves **`slug/index.html`**. That is the live page.

> **Rule: edit `slug/index.html`. The top-level `slug.html` is legacy and mostly dead.**

If you edit only `about.html` your change will not appear on the site. Verify with
`curl` after deploying, never assume.

### 3.2 CSS: edit the SOURCE, then rebuild

- `shared.src.css` — **the source of truth. Edit this.**
- `shared.css` — minified build output. **Never hand-edit.**

Rebuild after any CSS change:

```bash
cat shared.src.css | npx --yes esbuild --minify --loader=css > shared.css.tmp && mv shared.css.tmp shared.css
```

Commit **both** files.

### 3.3 Images need `height: auto` alongside `aspect-ratio`

Every `<img>` has explicit `width`/`height` HTML attributes (added for Core Web Vitals).
Those attributes **override** a CSS `aspect-ratio` rule unless you also set `height: auto`.

```css
/* WRONG - renders at the raw pixel height, e.g. 1536px tall */
.card img { width: 100%; aspect-ratio: 4/3; object-fit: cover; }

/* RIGHT */
.card img { width: 100%; height: auto; aspect-ratio: 4/3; object-fit: cover; }
```

This bug has shipped to production twice. Check for it whenever you touch image CSS.

### 3.4 Do not regex-inject HTML with a lazy `(.*?)</div>`

A non-greedy match grabs the **first** inner `</div>`, not the container's closing tag.
This once injected a card inside another card's label and broke 18 pages.
Balance the tags properly or use an HTML parser.

---

## 4. BRAND VOICE (non-negotiable)

### 4.1 No em dashes. Ever.

Use commas, periods, semicolons, or "and". This applies to visible copy, alt text, meta
descriptions, JSON-LD, and code comments. Verify before committing:

```bash
grep -c '—' path/to/file.html   # must be 0 for new content
```

### 4.2 Tone

Clear, confident, educational, warm. Sound like **Dr. Palmer Piana explaining something
plainly to a smart, non-technical patient.**

| Sound like | Never sound like |
|---|---|
| Clear but not cold | Generic wellness brand |
| Confident but not arrogant | Mystical or fear-based |
| Educational but not overwhelming | Salesy, buzzword-heavy |
| Warm but not fluffy | Obviously AI-generated |

### 4.3 Vocabulary

**Use freely:** whole-system, spine, nervous system, full-body function, specific care,
corrective care, root cause, beneath the surface, connected system, structural, neurological,
objective findings

**Avoid as anchors:** thrive, journey, transform, unlock, optimal, holistic, wellness

### 4.4 Never do this

- **No fear-based framing.** Never imply doom if they don't book.
- **No bashing other providers or chiropractors.** Ever.
- **No guaranteed outcomes.** Use "may help", "commonly", "in many cases", "we evaluate".
- **No lead-with-the-negative.** Say what care *can* do before caveats.
  (Bad: "Chiropractic cannot fix scoliosis." Good: "Yes, in clear and meaningful ways...")
- **No emoji** in professional copy.

### 4.5 Reference voice lines

> "Pain matters, but pain does not always tell the full story."
> "Better care starts with a clearer picture."
> "Your body does not function in separate pieces."

---

## 5. DESIGN SYSTEM

All tokens live in `shared.src.css` under `:root`. **Always use the variable, never a hex literal.**

### 5.1 Color

| Token | Value | Use |
|---|---|---|
| `--red` | `#ED3237` | CTAs, accents, eyebrows |
| `--yellow` | `#FFCC29` | Highlights on dark backgrounds, awards |
| `--charcoal` | `#606062` | Body text |
| `--deep` | `#2D2D2F` | Dark sections, footers, hero backgrounds |
| `--cream` | `#FFF7E8` | Soft section backgrounds |
| `--sand` | `#EADDC8` | Testimonials |
| `--border` | `#E5E5E5` | Hairlines, card borders |
| `--grad` | red to orange to yellow, 135deg | Primary buttons, accent bars |

Section backgrounds alternate: `var(--white)` -> `var(--cream)` -> `var(--deep)`.

### 5.2 Type

- **Montserrat** for everything (self-hosted WOFF2, subset to Latin, in `/fonts/`)
- **Lora** for testimonial and pull-quote serif only (async loaded)
- Headlines: title case. Body: sentence case.
- Numbers in lists render as `01 02 03` via CSS counter, red, tabular-nums.

### 5.3 Shape and motion

- Buttons `border-radius: 6px`, cards `10px` to `16px`
- Card hover: `translateY(-2px)` plus a slightly larger shadow
- Easing `ease-out`. No bounce, no elastic.

### 5.4 Reusable components (already in `shared.css`)

Prefer these over inventing new CSS:

| Class | What it is |
|---|---|
| `.btn-primary` | Gradient CTA button |
| `.btn-ghost` / `.btn-ghost-light` | Outline button |
| `.page-hero` + `.page-hero-bg` + `.page-hero-overlay` + `.page-hero-inner` | Standard page hero with photo background |
| `.sw` / `.sw-sm` | Section wrapper (padding) |
| `.inner` | Max-width content container |
| `.two-col` (`.reverse`) | Text + photo split |
| `.eyebrow` (`.eyebrow-y` on dark) | Small uppercase label above an h2 |
| `.h2` | Section headline |
| `.body-text` | Paragraph |
| `.symptom-grid` + `.symptom-card` | Auto-numbered symptom cards |
| `.numbered-list` + `.num-item` + `.num-circle` + `.num-title` + `.num-body` | Auto-numbered process steps |
| `.faq-grid` + `<details class="faq-item">` | FAQ accordion |
| `.pull-quote` | Serif quote block |
| `.page-cta` | Full-width dark CTA band |
| `.related-grid` + `.rel-card` | 3 to 4 related-page cards |
| `.sticky-cta` | Mobile bottom bar |

---

## 6. STANDARD PAGE TEMPLATE

Copy an existing page rather than starting blank. Good references:

- **Condition page:** `low-back-pain/index.html`
- **Local landing page:** `chiropractor-near-hendersonville-tn/index.html`
- **Long-form guide:** `what-to-do-after-a-car-accident-in-tennessee/index.html`

Order of sections:

```
<head>   meta, canonical, og:, twitter:, favicons, shared.css, JSON-LD
nav      (identical across site, adjust ../ depth)
breadcrumb
page-hero
intro two-col
"What we look for" 6-8 cards on --deep background
symptom-grid
numbered-list process (4 steps)
pull-quote
FAQ (5-7 questions)
page-cta
related-grid
footer   (identical across site)
scripts  nav toggle + sticky CTA
JSON-LD  FAQPage
```

### 6.1 Required `<head>` on every new page

- `<title>` **60 characters or fewer**
- `<meta name="description">` about 150 to 160 characters
- `<link rel="canonical">` absolute URL, trailing slash
- `og:` and `twitter:` tags
- Favicons, manifest, `shared.css` (mind the `../` depth)
- **`BreadcrumbList` JSON-LD** (every page has this)
- **`FAQPage` JSON-LD** if the page has a visible FAQ. Schema text must match the visible text.

### 6.2 After creating a page, always

1. Add it to `sitemap.xml`
2. Add it to the footer nav if it belongs in a column
3. Add a `.rel-card` to it from related pages, and from it back to the hub
4. Add it to `conditions/index.html` if it is a condition or service

Internal linking is deliberate here. Do not create orphan pages.

---

## 7. SEO CONVENTIONS

- **Local keyword first** in titles: "Gallatin Chiropractor for Back Pain, Sciatica & Headaches"
- One `<h1>` per page, containing the primary keyword
- Business entity is `@id: https://lifechargechiropractic.com/#chiropractor`
- Dr. Palmer is `@id: https://lifechargechiropractic.com/about/#palmer-piana`
- Dr. Pierce is `@id: https://lifechargechiropractic.com/about/#pierce-piana`
- Reference those `@id`s rather than redefining the entity
- Only put **verified live URLs** in `sameAs`. A 404 in `sameAs` hurts.
- English and Spanish pairs need reciprocal `hreflang` (`en-US`, `es-US`, `x-default`)

### 7.1 CTA routing

- **Auto accident cluster pages** route to `/auto-accident-consultation/` (free consult)
- **Everything else** routes to `https://schedule.lifechargechiropractic.com/new-patient-offer` ($49 special)

Do not send crash patients to the $49 offer. Their care is typically MedPay covered.

---

## 8. FACTS (get these right)

| Field | Value |
|---|---|
| Practice | Life Charge Chiropractic |
| Address | 1921 Nashville Pike, Suite 500, Gallatin, TN 37066 |
| Phone | (615) 219-9912 |
| Email | office@lifechargechiropractic.com |
| Doctors | Dr. Palmer Piana, DC (founder) and Dr. Pierce Piana, DC (brothers) |
| Dr. Palmer credentials | Palmer College of Chiropractic, Board-Certified Thermologist, Blair Upper Cervical certified, bilingual English/Spanish, author of *The Day the Animals Found Their Wiggle* (ISBN 9798993409108), **2026 TCA Rising Chiropractor of the Year** |
| Dr. Pierce credentials | Palmer College of Chiropractic, Pi Kappa Chi |
| Both | Brothers, rugby players and athletes, Pi Kappa Chi (the professional chiropractic fraternity) |
| Reviews | 4.9 average, 105 Google reviews |
| Service area | Gallatin, Hendersonville, Goodlettsville, Portland, White House, Sumner County |

**Always write "Dr. Pierce", never bare "Pierce".** Same for Dr. Palmer.
Do not call Pi Kappa Chi "the oldest" anything. It is "the professional chiropractic fraternity".

**Never invent credentials, awards, study citations, or statistics.** If a fact is not
already on the site or verifiable, ask the user instead of guessing.

---

## 9. PRE-COMMIT CHECKLIST

```bash
# 1. No em dashes in changed files
grep -c '—' <changed files>

# 2. Tag balance
python3 -c "
import re,sys
h=open('PAGE.html').read().split('<body',1)[1]
for t in ['div','a','span','svg']:
    o=len(re.findall(r'<%s\b'%t,h)); c=len(re.findall(r'</%s>'%t,h))
    print(t,o,c,'OK' if o==c else 'MISMATCH')
"

# 3. JSON-LD parses
python3 -c "
import re,json
h=open('PAGE.html').read()
for b in re.findall(r'<script type=\"application/ld\+json\">(.*?)</script>',h,re.DOTALL):
    json.loads(b)
print('JSON-LD OK')
"

# 4. Rebuild CSS if shared.src.css changed
# 5. Deploy, then curl to confirm the change is actually live
```

---

## 10. IMAGE WORKFLOW

Images are WebP, sized for their real display size (roughly 1200px wide max).

```bash
# Resize + convert
ffmpeg -y -i input.jpg -vf "scale=1200:-2" /tmp/out.png
cwebp -q 85 -m 6 /tmp/out.png -o assets/photos/name.webp

# Portrait crop (3:4) from a square source
ffmpeg -y -i input.jpg -vf "crop=ih*3/4:ih:(iw-ih*3/4)/2:0,scale=900:1200" /tmp/out.png
```

Always add real `width`/`height` attributes and descriptive `alt` text (see gotcha 3.3).

---

## 11. WHEN IN DOUBT

1. Find the closest existing page and copy its structure.
2. Match the surrounding voice exactly.
3. If a fact is uncertain, ask rather than invent.
4. Prefer editing `shared.src.css` over adding page-local `<style>` blocks,
   unless the styling truly is unique to one page.
