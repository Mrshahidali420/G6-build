# Lessons carried over from manhwaindex.com

Mined from the 255K-page Astro build. 17 problems found there.
9 do not apply at this size. The 8 below are build rules for this site.

---

## 1. Thin pages are the whole risk. CRITICAL.

**There:** ~79% of pages were templated character pages with missing bios and
duplicate meta descriptions. The site's own audit flagged it CRITICAL for both
AdSense and SEO.

**Why it is worse here:** a 255K-page site gets some forgiveness. A 130-page site
gets none. If our 93 entity pages read like filled-in blanks, AdSense rejects the
site and Google ignores it.

**Rule for this build:**
- Every entity page has a hand-written `long_description` of 80-150 words. We
  already have that in the CSVs.
- Every page gets a UNIQUE meta description. No template string with the name
  swapped in.
- No page ships with fewer than 250 words of real body text.
- A page with only a name and a source URL does not get built. Cut it instead.

---

## 2. Sitemap must be generated from the SAME source as the routes.

**There:** the sitemap advertised paginated pages the site never built, because
the page cap lived in the route file and the sitemap loop had its own number.
Crawlers hit mass 404s. (commit `2480fc8`)

**Rule:** one exported constant for the page list. Routes read it. Sitemap reads
it. Never two lists.

---

## 3. AdSense: add the script and fix CSP BEFORE review.

**There:** the Content Security Policy blocked every Google ad host by default.
It would have killed AdSense silently the moment it was switched on.
(commit `ab446f1`) The tag was then added to every page during the review window
with no ad slots rendering yet, so the reviewer sees it already wired.
(commit `e3d2c3d`)

**Rule:**
- Put the AdSense script in the base layout from day one.
- Allowlist the Google ad, frame and reporting hosts in CSP at the same time.
- Do not render ad slots until approved.
- Verify with the browser, not a static HTML fetch.

---

## 4. IndexNow after deploy, never before.

**There:** IndexNow pings Bing, Yandex, Seznam and Naver the moment a deploy
finishes. Google ignores it and uses the sitemap. It runs only AFTER the deploy
completes, because announcing a page that is not live yet teaches crawlers to
distrust the site. (commit `09ca283`)

**Rule:** same setup here. Cheap, and this site publishes often around launch.

---

## 5. Cloudflare `_redirects` rejects absolute URLs.

**There:** the www to apex redirect failed because the rule used a full URL.
It had to move to a Cloudflare dashboard redirect rule. (commit `65daafc`)

**Rule:** keep `_redirects` relative. Do domain-level redirects in the Cloudflare
dashboard.

---

## 6. On Windows, use `npm install`, not `npm ci`, with Cloudflare tooling.

**There:** `npm ci` failed in CI because two copies of `workerd` exist in the tree
and npm on Windows cannot record the Linux binary variant in the lock file. Every
workflow stopped. (commit `d300233`)

**Rule:** if we add `@astrojs/cloudflare` or Wrangler, CI uses
`npm install --no-audit --no-fund`. Only matters if we go past plain static.

---

## 7. Assert file sizes in an after-build step.

**There:** a 28MB search index blew Cloudflare's 25MB single-asset limit and
failed the deploy only after a full build had already run. (commit `fe5199c`)
A guard was added in `scripts/after-build.mjs`. (commit `e6a0804`)

**Rule:** copy the guard. It is ten lines and it turns a late deploy failure into
an early build failure. Nothing here should get near 25MB, which is exactly why
we will not notice if something does.

---

## 8. Print build-phase timings.

**There:** an O(n squared) similar-titles pass silently hung CI for 57 minutes
with zero output before being killed. (commit `db67a36`)

**Rule:** log a timestamp per build phase. At 130 pages nothing will be slow, but
a silent hang with no output is unfixable at any size.

---

## Deliberately NOT copied

These were real problems there and would be wrong answers here:

- **SSR on a Worker.** They moved to `output: 'server'` only because 18,046 files
  approached Cloudflare's 20,000-asset ceiling. We build 130 pages. Stay fully
  static. Every SSR bug in their list then cannot happen to us.
- **Sitemap index split into 5,000-URL blocks.** Needed at 17,900 URLs. One plain
  `sitemap.xml` is correct under a few thousand.
- **Sliced search index.** One small JSON file is fine. Pagefind is fine.
- **`readFileSync` instead of ESM import for data.** Their catalog was 147MB and
  Vite choked on it. Our CSVs are tiny. Normal content collections are correct.
- **Data outside git.** Their catalog broke GitHub's 100MB file limit. Ours is
  kilobytes. Commit it.
- **Edge cache build stamps, `not_found_handling`, Worker bundle limits.** All SSR
  concerns. Not applicable to static output.

---

## Economics, carried straight over

Gaming and entertainment AdSense pays on volume, not click value. Median CPC in
the manhwa niche was $0.81 with most title keywords at $0.00, and RPM $2-6.
Expect the same shape here. That is why Group D (the 7 Amazon shopping pages) is
not optional. It is the only part of this site where money changes hands.
