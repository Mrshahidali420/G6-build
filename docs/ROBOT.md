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
does it commit `data/robot/`, `src/content/updates/` and `src/content/news/`
and push. A page that does not build never reaches the site.

A commit from a person can land on `main` while a run is in flight, and the
push is then rejected with `fetch first`, so the commit step rebases on
`origin/main` before pushing and, if the push still fails, pulls and pushes
once more.

## Lane 2: turning sourced articles into catalog work

Lane 2 has two readers, and the one that needs no key is the floor.

**The logic reader always runs.** `scripts/robot/logic.mjs` matches the names
and alt names of entries already in the catalog against the sentences of the
saved article, and keeps the whole sentence as both the fact and the quote. It
cannot invent anything, because it never writes a word: every claim it makes is
a run of characters lifted out of the article. A label under four characters is
ignored, and so is a label that is an ordinary English word before it is
anything in this game, because a catalog entry called "Beach" would otherwise
claim every sentence that mentions a beach. A sentence has to be 8 to 60 words
and carry no em dash. There is no count cap. Logic can only ever name an entry
the catalog already holds: deciding that a name deserves a page is a judgement,
and code does not make those.

**The model reader is a bonus.** When a key is configured the saved text also
goes to a model, and its claims are merged on top of the logic claims, matched
by name and alt name so the same quote is never stored twice. Only the model can
propose a thing that has no catalog entry yet. If the model fails, times out or
runs out of quota, the run says so and keeps what logic found, and the article
still counts as read.

Everything the model says is still built on the assumption that it will
eventually lie. Nothing it says reaches a page until code has compared it
against the saved article.

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

With no key at all, appending to an entry that already exists still runs, and
candidates for a new entry are held with a line in the log. They are not
refused, so no issue is opened, and the next run with a working key picks them
up unchanged.

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

Subscription first. `scripts/robot/ai.mjs` picks a provider by which key is
set, in this order:

1. `CLAUDE_CODE_OAUTH_TOKEN`, the Claude Code CLI signed in with a Claude Pro
   or Max subscription, model `sonnet`. This is the default. The workflow
   installs the CLI and each call runs `claude -p` with one turn, no tools,
   the system prompt in a file and the article on stdin. Make the token once
   with `claude setup-token` on a machine that is logged in, then paste it
   into the repository secrets page on the GitHub website. It costs nothing
   per call; the calls count against the subscription's usage window.
2. `ANTHROPIC_API_KEY`, the Anthropic Messages API, pay per call.
3. `OPENROUTER_API_KEY`, OpenRouter, default model `google/gemma-4-31b-it:free`.
   Its free tier allows roughly 50 requests a day, and about 1000 a day once an
   account has bought 10 USD of credit one time.
4. `GITHUB_TOKEN`, GitHub Models, `openai/gpt-4.1-mini`. Being retired: from
   September 2026 it answers 410 "retirement brownout" for hours at a time.
5. `GEMINI_API_KEY`, Google Gemini, `gemini-3.6-flash`. Last on purpose: its
   free tier stops at 20 requests a day, fewer than one run needs. Run 3 on
   16 September 2026 spent 14 minutes collecting 429 errors on it.

The robot leaves 6.5 seconds between calls (`ROBOT_CALL_GAP_MS` changes that).
When a provider says the day's quota is spent, or answers 410, every later
call in that run fails at once with no wait, and the unread items wait for
the next run. `ROBOT_AI=<id>` (`claude`, `anthropic`, `openrouter`, `github`,
`gemini`) forces one provider when several keys are set.

To switch provider, set that provider's key and leave the ones above it unset.
`ROBOT_MODEL_EXTRACT` and `ROBOT_MODEL_WRITE` override the model for whichever
provider is in use.

**No key is not a stopped robot.** Every free provider has failed at some point,
and a record that stops recording when a key expires is not a record. So the
model is never the floor. With no key the run prints one line saying so, logic
reads every saved article, facts are still appended to the entries that exist,
and lane 3 still writes quote digest news pages. What a working key adds is
extra claims, candidates for new catalog entries, and a written article in place
of a digest. Because the free models are the weaker writers, the checks above
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

## Lane 3: writing the news article

Lane 3 groups the checked claims into stories and writes one page per story. It
has a floor and a bonus, like lane 2.

**The quote digest is the floor.** With no key, or when a model draft fails any
check, `logicDraft` in `scripts/robot/logic.mjs` builds the page from the data
alone: the outlet's own headline as the title, a template description holding
outlet names, entity names and a date, then one `##` section per report carrying
that outlet's headline as a link, its own summary, and every claim quote as a
blockquote. Blockquotes are the only place a fact may appear. Everything outside
them is template text holding names, outlets, dates and links that came from the
data. A headline is never rewritten: when the first one does not fit the title
bars, the next outlet's own headline is used, and if none fits the story is held
for a later run.

**A written article is the bonus.** When a key works, a model is given the list
of claims, never an article, and writes the prose instead. It is given the least
and checked the most: every sentence it wrote goes back to the model with the
quotes and nothing else, and is deleted unless it is marked supported. If the
model fails, or its draft fails a check, the run falls back to the digest for
that story and says so, rather than refusing the story or leaving it unwritten.

### What it reads

`data/robot/claims/<rawId>.json` beside its `data/robot/raw/<rawId>.json`. A
claims file whose raw article is gone is skipped, so every quote stays
checkable. `data/robot/news.json` is the ledger: a raw id in it is done, written
or refused, and is never looked at again.

### Grouping, in code

Two items are the same story when they were published within 3 days of each
other and share at least 2 signals. A signal is a catalog entry both reports are
about (named in the headline or the outlet's summary, not only in the body) or a
telling headline word both use (four letters or more, not the game's or the
publisher's name). Two reports on "Stephen Root" share two words and group. Two
reports that both mention Vice City in passing share nothing and stay apart.
Union find over the items, so the same input groups the same way every time.
No model is near it.

Lane 2 keeps the same line. A logic claim is appended to an entry only when the
article is about that entry. A mention in passing is background, not a fact.

### The two eligibility rules

A story is written only when it carries a `TIER_1_OFFICIAL` item, or items from
at least 2 different outlets, and only when it holds at least 4 distinct
verified claims, counted by unique quote. A story that fails either is left
alone rather than refused: an outlet may join it tomorrow. The run logs why.

### The bars

Both drafts go through the same code gates. A model draft that fails any of them
falls back to the digest. A digest that fails one of the thin bars, the title
length, the description length or the 250 words, is held for a later run,
because another outlet may join the story tomorrow. A digest that fails one of
the hard bars is refused:

1. The title is 20 to 90 characters, the description 70 to 160.
2. No em dash, no emoji, no table in the title, description or body.
3. The support pass, for a model draft only: every sentence goes back with the
   quotes and nothing else, every sentence not marked supported is deleted, and
   a heading whose section loses everything is deleted with it. Headings, blank
   lines and list markers are structure and are not sentences. A digest skips
   this pass, because there is no written sentence in it to check.
4. At least 250 words survive.
5. Every digit run in the title, description and body appears in some quote.
   For a digest the haystack is every quote plus every item's headline, summary
   and published date, all of which are the outlet's words or the saved data.
6. The slug, `gta-6-` prefixed unless the title already starts with GTA 6, is
   free in `src/content/news/` and in the ledger. It never overwrites a file.
7. Every source url is on the allowed host list in `sources.mjs`.

`tier` is `TIER_1_OFFICIAL` when any item is official. `date` is the earliest
published day in the story, `updated` is the day of the run. `sources` is one
entry per item, labelled `Outlet: headline`. `related` holds catalog slugs whose
name or alt name matches exactly; an unknown name is dropped silently.

### Where the output lands

`src/content/news/<slug>.md`, in the same shape as the hand written pages. The
day page in `/updates` shows a "Read our article" link next to any item a news
page cites as a source.

A refusal writes `data/robot/refused/news-<slug>.json` with its reason and every
claim and quote it had, which the workflow turns into one GitHub issue labelled
`robot`. The story's raw ids go into the ledger with the reason, so a refused
story is not re-asked every six hours. A person finishes it from that file.
