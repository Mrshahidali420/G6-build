# The robot

A scheduled job that keeps a dated log of what other sites published about
Grand Theft Auto VI. It runs twice a day from `.github/workflows/robot.yml`.

## What it may do

It may record an act of publication. An outlet put out a piece, under this
headline, with this summary, at this link, on this date. That is a fact about
publishing and a reader can check it by clicking the link.

Every string it puts on a page is one of two things:

1. Copied verbatim from the feed or the article page, shown in quotation marks
   with the outlet named next to it.
2. Built from a fixed template that holds nothing but a date, an outlet name
   and a count.

## What it may not do

It may not write a sentence. There is no prose generation anywhere in
`scripts/robot/`, and the pages it writes have an empty markdown body: the
items live in typed frontmatter and the template renders them. That is the
point. A robot that cannot form a sentence cannot invent a fact.

It may not say that anything is true. A quoted headline on the log proves the
outlet published it, nothing more. The page says so before the first quote.
Claims that survive checking get written up by a person in `src/content/news/`.

It may not fetch anything outside `scripts/robot/sources.mjs`, and it may not
link to a host that is not on that list.

## The eight guards in publish.mjs

Checked in this order. Each one prints why it fired.

1. An item is dropped unless it has a url, a title, an outlet and a valid ISO
   published date.
2. An item is dropped unless its url host is exactly one of the allowed hosts.
3. An item is dropped unless its raw file is still on disk. A page may only be
   built from saved text, so every quote stays checkable.
4. A day is skipped unless at least 2 items survive. One stray article is not
   a day of news.
5. A day is skipped if its page already exists. The robot never overwrites.
6. At most 1 new page per run.
7. The templated description must be 70 to 160 characters. If no form of the
   template fits, the day is skipped.
8. No em dashes. An item whose headline or summary carries one is dropped
   before the day is grouped, so the day keeps going without it. Trimming the
   quote is not an option because it would stop being the outlet's exact
   words. The whole file is checked once more before it is written.

## The gate

The workflow runs `npm run build` after publishing. Only if the build passes
does it commit `data/robot/` and `src/content/updates/` and push. A page that
does not build never reaches the site.

## Lane 2: turning sourced articles into catalog work

Lane 1 above cannot form a sentence. Lane 2 can, because it calls a language
model, so everything in it is built on the assumption that the model will
eventually lie. Nothing the model says reaches a page until code has compared
it against a saved article.

### What it may do

Two things, and the difference between them matters.

**Append to an entry that already exists.** New claims are written to
`data/robot/facts/<slug>.json` and the entity page renders them under
"Reported since this entry was written": the fact, the outlet's exact words in
quotation marks, the provenance mark, the outlet as a link, the date. Nothing a
person wrote is edited. A robot that can only append cannot damage a page.

**Write a new entry.** A row in `data/robot-entities.csv` plus a
`data/extras/<slug>.json`, in the shape `data/extras/BRIEF.md` describes.

### The two eligibility rules

A new entry is only attempted when the claims behind it come from a
`TIER_1_OFFICIAL` source, or from two different outlets. One press outlet
repeating itself is a report, not a catalog entry.

### The code checks

`scripts/robot/extract.mjs`, per claim:

1. The quote must be a real run of characters from the saved article text, after
   both sides are flattened for whitespace and curly punctuation. Everything
   else is dropped and counted.
2. Every digit run in the written fact must appear in the article. A model that
   turns a model year into a price is caught here even when its quote is real.

`scripts/robot/entities.mjs`, per new entry, each one a refusal:

3. `long_description` is at least 120 words. The site minimum is 60, so the
   robot never ships the thinnest page the build would accept.
4. `key_facts` holds at least 4 items.
5. Every digit run in every written field appears in at least one quote.
6. No em dash anywhere.
7. The slug is not already used.
8. A second model pass is given every sentence of the descriptions, every key
   fact and every FAQ answer together with the quotes, and marks each one
   supported or not. Every unsupported sentence is deleted, and a sentence the
   checker did not rule on counts as unsupported. If the deletions drop the
   entry under the 120 word or 4 fact bar, the entry is refused.

### Refusals

A refused entry is written to `data/robot/refused/<slug>.json` with its reason
and every claim and quote it had. The workflow opens one GitHub issue per
refusal, labelled `robot`, tracked in `data/robot/issued.json` so the same
refusal never opens a second issue. A person finishes the entry from that file.

### Images

A new entry takes the `og:image` from its best source, Rockstar first. It is
accepted only if it downloads, is at least 800px wide, and its URL is not
already used by another saved article from the same outlet, which is how an
outlet's share card is told apart from a picture of the thing. It lands in
`public/img/entities/<slug>.jpg` with a `credits.json` entry. If nothing
passes, the entry keeps its terrazzo plate, which is a fine outcome.

### Which model

Free tier first. `scripts/robot/ai.mjs` picks a provider by which key is set,
in this order:

1. `GEMINI_API_KEY`, Google Gemini through its OpenAI compatible endpoint,
   `gemini-2.5-flash`. This is the default and the free tier the robot expects.
2. `ANTHROPIC_API_KEY`, the Anthropic Messages API.
3. `OPENROUTER_API_KEY`, OpenRouter, default model `google/gemini-2.5-flash`.
   Its free tier allows roughly 50 requests a day, and about 1000 a day once an
   account has bought 10 USD of credit one time.
4. `GITHUB_TOKEN` with `ROBOT_AI=github`, GitHub Models.

To switch provider, set that provider's key and leave the ones above it unset.
`ROBOT_MODEL_EXTRACT` and `ROBOT_MODEL_WRITE` override the model for whichever
provider is in use. With no key at all, every lane 2 script prints one line and
exits 0, and lane 1 carries on. Because the free models are the weaker writers, the checks above
are what protect the site, and none of them is relaxed for any provider.

### No count caps

There is no per run limit on items read, entries written or pages published.
On a reveal day there may be fifty new things and covering three of them makes
the site late. The quality guards do the refusing. The one thing that slows a
run is a rate limit: a 429 waits 30 seconds and retries once, and if it still
fails that item is left unread so the next run continues where this one
stopped. A missed day can be re-run by hand with the `since` input on
`workflow_dispatch`, which re-reads the feeds ignoring the seen list for
anything published on or after that date.
