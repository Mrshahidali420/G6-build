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
