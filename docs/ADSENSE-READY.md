# AdSense readiness, checked 19 September 2026

Checked against Google's own two pages, not a blog list:

- Eligibility requirements: https://support.google.com/adsense/answer/9724
- Make sure your site's pages are ready: https://support.google.com/adsense/answer/7299563

Everything below was measured on the live site, not on the local build.

## Passing

| Item | Evidence |
|---|---|
| Own, original content | 161 pages in the sitemap, median 597 words of body text |
| Clear navigation | Section bar, phone menu, search box, full footer index |
| Privacy policy | /privacy returns 200 and names cookies, advertising, Google, third parties and opting out |
| About page | /about returns 200 and names every source the site uses |
| Contact page | /contact returns 200 |
| HTTPS everywhere | Whole site, plus a locked-down Content-Security-Policy |
| AdSense crawlers allowed | robots.txt has `Allow: /` for Mediapartners-Google and AdsBot-Google. Blocking these is the most common self-inflicted rejection |
| Site is live and crawled | 144 impressions and 1 click in Search Console over the 28 days to 18 Sep |
| Sitemap submitted | Index plus 12 sub-sitemaps, all accepted |
| No policy-breaking material | The site describes leaks in writing only. It hosts no leaked files, video or imagery |

## Was to fix before applying

### 1. Seven pages were under 300 words. Fixed 19 September 2026

Thin pages are the single most common reason a games site is refused for
"low value content". Every one of them was a weapon.

The cause was not the weapon rows themselves. It was that none of the seven had
a `data/extras/<slug>.json` file, while 101 of the other entries did. That file
is what supplies the questions and answers, the open questions and the
provenance note on an entity page. The `/weapons` hub was thin for the matching
reason: every other hub has an intro in `src/content/hubs/`, and `weapons.md`
did not exist.

| Page | Before | After |
|---|---|---|
| /weapons | 209 | 850 |
| /weapons/capo-pistol | 254 | 566 |
| /weapons/nipper-38 | 264 | 566 |
| /weapons/duke-556-assault-rifle | 280 | 595 |
| /weapons/moreland-850 | 281 | 589 |
| /weapons/girardi-es9 | 282 | 602 |
| /weapons/klose-k17 | 282 | 596 |

No new claim was invented to do it. Every added sentence is either a restatement
of what the source already said, an honest statement that Rockstar has not said
something, or a note about where the entry came from.

No page on the site is now under 300 words except `/search`, `/404` and
`/contact`, which are utility pages, and three daily coverage log entries
between 267 and 291 words.

A further 33 pages sit between 300 and 500 words. Those are acceptable but not
comfortable.

### 2. There is no cookie consent banner

The home page HTML contains no consent code of any kind.

This does not block the application. It does block serving ads to anyone in the
EU or the UK, because Google requires a certified consent platform for that
traffic. Build it before the ads switch on, not after.

The privacy page also never uses the word "consent". Add a short section.

## ads.txt, live since 19 September 2026

`ads.txt` is served at https://gta6record.com/ads.txt and holds exactly one line:

    google.com, pub-2789392733984505, DIRECT, f08c47fec0942fa0

No code was needed for it. `scripts/after-build.mjs` writes the file by itself
as soon as `ADSENSE_CLIENT` in `src/lib/site.mjs` holds a real ID, and strips
the leading `ca-` to get the publisher part. The build log now says:

    [after-build] wrote ads.txt for pub-2789392733984505

Setting that same constant also turns on the AdSense script tag in
`BaseLayout.astro`, so every page loads `adsbygoogle.js` for this publisher.

The ad slot IDs in `ADSENSE_SLOTS` are still empty and get filled from the
dashboard after approval. Nothing renders while a slot ID is empty, which is
deliberate: an `<ins>` tag with no slot is a policy breach, not a placeholder.

## The honest risk

The domain is new and the traffic is close to nothing. Google publishes no
minimum traffic figure, and there is not one, but a brand new site with a
handful of impressions is judged harder on content depth because there is no
audience signal to lean on.

Fixing the seven thin pages first costs little and removes the clearest reason
a reviewer would have to refuse.
