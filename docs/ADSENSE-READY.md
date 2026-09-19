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

## To fix before applying

### 1. Seven pages are under 300 words

Thin pages are the single most common reason a games site is refused for
"low value content". Every one of them is a weapon.

| Words | Page |
|---|---|
| 209 | /weapons |
| 254 | /weapons/capo-pistol |
| 264 | /weapons/nipper-38 |
| 280 | /weapons/duke-556-assault-rifle |
| 281 | /weapons/moreland-850 |
| 282 | /weapons/girardi-es9 |
| 282 | /weapons/klose-k17 |

The /weapons hub is the worst of them and it is a section landing page, so a
reviewer is likely to open it.

Three of these, Girardi ES9, Moreland 850 and Nipper .38, are the IGN-sourced
rows already flagged as questionable. Deciding those either way fixes three of
the seven at once.

A further 33 pages sit between 300 and 500 words. Those are acceptable but not
comfortable.

### 2. There is no cookie consent banner

The home page HTML contains no consent code of any kind.

This does not block the application. It does block serving ads to anyone in the
EU or the UK, because Google requires a certified consent platform for that
traffic. Build it before the ads switch on, not after.

The privacy page also never uses the word "consent". Add a short section.

## After approval, not before

`ads.txt` returns 404 today. That is correct and expected: the file needs the
publisher ID, which does not exist until the account is approved.

Nothing needs coding for it. `scripts/after-build.mjs` already writes ads.txt on
its own as soon as `ADSENSE_CLIENT` in `src/lib/site.mjs` holds a real ID. The
current build log says so plainly:

    [after-build] no ADSENSE_CLIENT set, so no ads.txt was written

The ad slot IDs in `ADSENSE_SLOTS` get filled from the dashboard at the same
time. Nothing renders while a slot ID is empty, which is deliberate: an `<ins>`
tag with no slot is a policy breach, not a placeholder.

## The honest risk

The domain is new and the traffic is close to nothing. Google publishes no
minimum traffic figure, and there is not one, but a brand new site with a
handful of impressions is judged harder on content depth because there is no
audience signal to lean on.

Fixing the seven thin pages first costs little and removes the clearest reason
a reviewer would have to refuse.
