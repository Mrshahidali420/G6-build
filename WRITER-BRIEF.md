# Writer brief — GTA 6 answer pages

Read this whole file before writing. Do not research. Do not invent facts.
Every fact you may state is in the VERIFIED FACTS table below. If a fact is not
in the table, the page must say plainly that it is not known yet.

## Where files go

`C:\Users\SHAHID ALI\Desktop\gta6-site\src\content\answers\<slug>.md`

## Frontmatter schema (zod-validated, the build FAILS if wrong)

```yaml
---
title: "string"
description: "string, MUST be 70 to 160 characters, unique to this page"
keyword: "the one primary keyword"
order: <number>
updated: "2026-09-15"
sources:
  - label: "string"
    url: "https://..."      # must be a real URL from the table below
faq:
  - q: "question"
    a: "answer"
  # minimum 2, maximum 6
related:
  - "entity-slug"           # optional, may be an empty list
---
```

## Writing rules (hard)

- **NO em dashes anywhere.** Use a comma, a full stop, or "and".
- Plain language. A 15-year-old must understand every sentence.
- Short sentences. Short paragraphs.
- Body must be MORE than the word target given for the page. Never padding.
- Start with an `## The short answer` section that answers in the first 2 lines.
- Use `##` for sections. Never `#` (the H1 comes from `title`).
- Markdown tables are fine and encouraged for prices and dates.
- Say plainly when something is NOT confirmed. That honesty is the site's product.
- Never claim to have played the game. Nobody has.
- Never copy sentences from the source articles. Write fresh.
- British-neutral spelling, dates as "19 November 2026".

## VERIFIED FACTS — this is all you may state as fact

| Fact | Tier | Source URL |
|---|---|---|
| Release date 19 November 2026, PS5 and Xbox Series X\|S | TIER 1 official | https://www.rockstargames.com/newswire/article/5171972o3ak5oa/pre-order-grand-theft-auto-vi-on-june-25 |
| Standard Edition 79.99 USD | TIER 1 official | same Newswire URL |
| Ultimate Edition 99.99 USD | TIER 1 official | same Newswire URL |
| Ultimate adds exclusive vehicles, weapons, apparel and businesses, plus two extra side missions | TIER 1 official | https://store.playstation.com/en-us/product/EP1004-PPSA01547_00-GTAVIULTIMATE001/ |
| UK: GBP 69.99 standard / GBP 89.99 ultimate | TIER 2 press | https://www.techradar.com/gaming/ps5/gta-6-uk-pre-orders-are-live-and-we-finally-have-a-price-heres-where-you-can-order-it-and-what-it-costs |
| India: Rs 5,999 standard / Rs 7,499 ultimate. MEDIUM confidence, press only | TIER 3 press | https://www.91mobiles.com/gaming/gta-6-pre-orders-begin-india-official-pricing/ |
| Europe: EUR 79.99 / EUR 99.99 | TIER 3 press | https://beebom.com/gta-6-global-prices-list/ |
| Canada: CAD 109.99 / 139.99. Australia: AUD 129.95 / 159.95 | TIER 3 press | https://stevivor.com/features/in-depth/grand-theft-auto-6-pricing-physical-digital-only-pre-order-bonus-pricing-australia-pricing-new-zealand/ |
| Pre-orders opened 25 June 2026 worldwide | TIER 1 official | Newswire URL |
| Preload starts 12 November 2026, one week before launch | TIER 2 press | https://www.gamespot.com/articles/gta-6-preloading-start-date-and-what-to-know-about-digital-and-physical-copies/ |
| Physical copies ship with a download code, not a full disc | TIER 2 press | same GameSpot URL |
| No PC version announced or dated. Consoles only | TIER 2 press | same GameSpot URL |
| Delays: original autumn 2025 to 26 May 2026 to 19 November 2026. Second delay announced around 6 November 2025 | TIER 2 press | https://www.bloomberg.com/news/articles/2025-11-06/-grand-theft-auto-vi-is-postponed-again-to-november-2026 |
| GTA+ : one free month with a digital pre-order of either edition | TIER 1 official | Newswire URL |
| Vintage Vice City Pack: free with any pre-order placed before 20 November 2026. Contains a 1955 Vapid Stanier sedan and a garage, access to Ocean Beach, outfits and hairstyles for Jason and Lucia, and a themed weapon pattern | TIER 1 official | https://support.rockstargames.com/articles/4QfG4FmZCf5W1gS8jy4UVT/grand-theft-auto-vi-platform-editions-and-versions |
| Take-Two CEO Strauss Zelnick reaffirmed 19 November 2026 and said no further delay is expected | TIER 2 press | https://www.vice.com/en/article/take-two-ceo-confirms-gta-6-wont-be-delayed-again-and-teases-next-trailer-date/ |
| The game is set in the state of Leonida, with Vice City as its main city | TIER 1 official | https://www.rockstargames.com/VI |
| The two lead characters are Jason Duval and Lucia Caminos | TIER 1 official | https://www.rockstargames.com/VI |

## NOT KNOWN — say so plainly, never guess

- Age rating. No ESRB or PEGI rating has been published.
- File size or install size. No number published.
- Map size in square kilometres. No number published.
- Unlock time on release day.
- Any PC release date, PC price, or PC system requirement.
- Whether GTA Online continues, changes, or closes after GTA 6 launches.
- Review dates, preview dates, or any third trailer date.
- Any mission, weapon, cheat, or car list beyond the edition bonus vehicles.
- Anything about a GTA 6 online mode. Rockstar has not detailed one.

## Entity slugs you may use in `related` (these pages exist)

55-vapid-stanier-sedan, 95-grotti-cheetah, 67-vapid-dominator-buggy,
dinka-enduro-motorcycle, crest-kayak, vapid-ganado, ganado-retro-build,
shitzu-squalo, leonida, vice-city, leonida-keys, port-gellhorn, grassrivers,
ambrosia, mount-kalaga-national-park

If you are not sure a slug exists, leave `related` as an empty list `[]`.
