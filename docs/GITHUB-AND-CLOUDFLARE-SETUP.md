# GitHub and Cloudflare setup

What manhwaindex.com learned the hard way. Copy it here and skip the pain.

Written 19 Sep 2026.

---

## Part 1 — GitHub

### 1.1 Make the repository PUBLIC

A private repository has a monthly limit on Actions minutes. A public one has
**no limit at all**. A site that rebuilds itself every day will run out of
minutes on a private repository.

manhwaindex.com went public for this reason and stays public.

**Do this:** GitHub > the repo > **Settings** > scroll to **Danger Zone** >
**Change repository visibility** > **Make public**.

### 1.2 Public means anybody can read the code. Add a licence FIRST.

Before you make it public, put a `LICENSE` file in the root that says nobody
may use the code. Without one, the law's default is unclear and people assume
they may copy it.

The licence covers **your code, your design and your writing**. It does not
cover the data, because the data is not yours.

Put a short copyright line in the README too.

**This repo has no LICENSE file yet. Add one before you flip it to public.**

### 1.3 SECRETS NEVER GO IN THE REPOSITORY

This is the rule that will cost you the most if you break it.

A public repository means a leaked key is public forever. GitHub history keeps
it even after you delete the file.

| Thing | Where it lives |
|---|---|
| Cloudflare API token | GitHub **Settings > Secrets and variables > Actions** |
| Turnstile secret key | A **Cloudflare Worker secret** |
| Any signing key | A **Cloudflare Worker secret** |
| Turnstile **site** key | The page. This one is public by design. |

A Worker secret survives `wrangler deploy`. A plain `var` in `wrangler.jsonc`
is replaced on every deploy, so never put a secret there.

### 1.4 Hide the repository from search

A public repo can rank in Google for your own brand words. You do not want
your own source code sitting next to your own site in the results.

- Repo **Settings** > **General** > untick **Wikis**, **Issues**, **Projects**.
- Give the repo a boring name that does not match the domain.
- Leave the **Description** and **Website** fields empty.
- Do not add topics.

### 1.5 Big data files do not belong in git

GitHub refuses any single file over **100 MB**. manhwaindex's catalog file is
141 MB, so it cannot be committed at all.

The answer is the **Actions cache**:

```yaml
- uses: actions/cache/restore@v4
  with:
    path: data/big.json
    key: site-data-${{ github.run_id }}
    restore-keys: site-data-
```

Two things to know, both of which caused a real outage:

1. **GitHub deletes a cache that is not used for 7 days.** If the site is
   quiet for a week, the data is gone and the next build starts from nothing.
   Keep a scheduled run so the cache is touched.
2. **The cache is the only copy.** Treat it as fragile. Keep a small seed file
   in the repo that can rebuild the rest.

### 1.6 Know what a push deploy actually runs

manhwaindex lost half a day to this.

The heavy steps (pull new data, fill in thin pages, save the catalog) are
gated like this:

```yaml
if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
```

So a **push** deploy skips them. Page and template changes go live. Data
changes do **not**.

To run everything:

```bash
gh workflow run deploy.yml --ref master
```

A push deploy takes about 2 to 3 minutes.

---

## Part 2 — Cloudflare

### 2.1 The free limits you will actually hit

| Thing | Free limit |
|---|---|
| Worker requests | **100,000 a day** |
| D1 row reads | 5,000,000 a day |
| D1 row writes | 100,000 a day |
| WAF custom rules | **5** |

An outbound `fetch()` from inside a Worker is a **subrequest**, not an
incoming request. It does not count against the 100,000.

### 2.2 Bots will eat the whole allowance. Plan for it on day one.

On 14 Sep 2026 GPTBot, AhrefsBot and YandexBot ate **89,000 of the 100,000**
requests in one day. The site started to fail for real people.

**Do this first:** a `robots.txt` that blocks the crawlers you gain nothing
from. Keep Google and Bing. Block the rest.

### 2.3 NEVER turn on "Block AI bots"

Cloudflare has a switch called **Block AI bots** (`crawler_protection`).
In Block mode it **also blocks Googlebot and Bingbot**. Your site leaves the
search results.

Only **Disallow AI training** (`ai_training`) is safe. That one is fine.

### 2.4 Bot Fight Mode does not stop a serious crawler

manhwaindex ran Bot Fight Mode for two days. The crawler carried on.

The crawler that beat it:

- runs a **real browser** on home internet lines in **46 countries**
- holds the page open for **8 to 38 seconds**
- has **patched `navigator.webdriver`** so it does not say it is a robot
- **scrolls the page**

Three attempts to catch it from inside the page all failed: a time gate, a
`navigator.webdriver` check, and a movement check. From inside the page it
looks exactly like a reader.

### 2.5 The thing that worked: Cloudflare Turnstile

The question has to be asked from **outside** the page. That is Turnstile.
It is free and invisible.

How it is wired on manhwaindex:

1. The reader moves (scroll, tap, mouse, key).
2. The page asks Turnstile for a ticket. The reader sees nothing.
3. The page sends the ticket to our own Worker path.
4. The Worker checks the ticket with Cloudflare, then hands back a **pass** of
   its own: an expiry time plus a signature, good for 30 minutes.
5. Every later beacon carries the pass. No pass, nothing is written.

Why the extra pass step: **a Turnstile ticket works once and dies after five
minutes**. The page cannot keep re-sending it.

Result: the fake visits went to **zero** in one deploy.

### 2.6 Two traps in that wiring

**Trap 1 — the Content Security Policy.** If your CSP does not allow
`https://challenges.cloudflare.com` in `script-src`, `connect-src` AND
`frame-src`, Turnstile silently never loads. No error. You just count nobody.

**Trap 2 — Google Analytics must wait for the pass too.** I tried loading
Google's script on the first scroll, so a reader with Turnstile blocked would
still count. The crawler scrolls, so Google started to count the crawler
again within minutes. Movement is not proof that a person is there.

### 2.7 The firewall rule, for when the crawler still costs too much

Turnstile stops the crawler being **counted**. It does not stop it
**arriving**, and every arrival costs a request.

When the daily count nears 100,000, add this custom rule with the action
**Managed Challenge**:

```
(not cf.client.bot)
and (not starts_with(http.request.uri.path, "/_"))
and (not starts_with(http.request.uri.path, "/cdn-cgi/"))
and (not http.request.uri.path contains "/sitemap")
and (http.request.uri.path ne "/robots.txt")
and (http.request.uri.path ne "/ads.txt")
```

`cf.client.bot` is Cloudflare's verified list. Googlebot, Bingbot and the
AdSense crawler skip the check, so search is not harmed.

**Do not turn this on while AdSense is reviewing the site.**

The full step-by-step is in the manhwaindex repo at
`docs/blocking-the-crawler.md`.

### 2.8 Your own analytics, if you build them

manhwaindex writes to a D1 database from the Worker. Two facts that cost real
debugging time:

1. Store the time stamp in **milliseconds**, and remember it. A filter like
   `ts > strftime('%s','now') - 600` is in **seconds** and silently returns
   nothing.
2. One visit used to cost three requests: open, click, leave. That was 82% of
   the whole daily allowance. Hold the rows in the tab and send them **all in
   one request**.

Mark your own browser so you never count yourself. Set a flag in
`localStorage` when the admin page is opened, and skip every row while the
flag is set. Then write that down, or you will spend an hour wondering why
your own test visits never show up.

### 2.9 The edge cache needs a build stamp

Put the build time into the cache key. Without it a deploy can stay invisible
for a day, because the old page is still served from the edge.

---

## The short list

1. Repo public, `LICENSE` in place first.
2. Secrets in GitHub Actions secrets or Cloudflare Worker secrets. Never in a file.
3. `robots.txt` blocking the crawlers you gain nothing from, on day one.
4. Never touch **Block AI bots**.
5. Turnstile plus a 30 minute pass, and allow `challenges.cloudflare.com` in the CSP.
6. Batch your analytics into one request per visit.
7. Keep the firewall rule ready, but off until AdSense has decided.
