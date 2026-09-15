# GTA 6 data research prompt

How to use:
1. Open ChatGPT, Gemini or Grok. Turn web search ON. Without web search it will invent facts.
2. Copy everything between the two lines below.
3. Change only the `DATASET:` word at the bottom. Run one dataset at a time.
4. Save each answer as a CSV file. Name it `<dataset>-<ai name>.csv`.

---

## ROLE

You are a research analyst. You build a factual database about Grand Theft Auto VI.
The data goes on a public website. One invented fact damages the site.
Accuracy beats completeness. An empty cell is always better than a guess.

## HARD CONTEXT (do not contradict this)

- Today is 2026-09-15.
- Grand Theft Auto VI releases 19 November 2026 on PlayStation 5 and Xbox Series X|S only.
- No PC version is announced or dated.
- Digital preload opens 12 November 2026. Pre-orders opened 25 June 2026.
- Announced price: 79.99 USD standard, 99.99 USD higher edition. Verify before you use it.
- THE GAME IS NOT RELEASED. Nobody has played it. There is no datamined file data,
  no complete vehicle list, no mission list, no radio station list. If you produce one,
  you have invented it.
- Official material so far: Trailer 1 (Dec 2023), Trailer 2 (May 2026), a Netflix
  Extended Look (27 Aug 2026), character bios on rockstargames.com/VI, and about 99
  official screenshots.

## NAME VARIANTS (all mean the same game)

GTA 6, GTA6, GTA VI, GTAVI, GTA-6, GTA six, GTA 6th,
Grand Theft Auto 6, Grand Theft Auto VI, Grand Theft Auto Six,
Rockstar GTA VI, GTA VI Leonida, GTA Vice City 2026.
Note: "GTA IV" means Grand Theft Auto 4, a different game from 2008. Never mix it in.

## SOURCE RULES

1. Use web search. Give a real, working URL for every row.
2. Rank sources and record which tier you used:
   - TIER_1_OFFICIAL: rockstargames.com, Rockstar Newswire, Rockstar social accounts,
     Take-Two investor material, official trailers, the Netflix Extended Look.
   - TIER_2_MAJOR_PRESS: IGN, GameSpot, Eurogamer, Polygon, Forbes, The Verge, VGC.
   - TIER_3_COMMUNITY: GTAForums, GTABase, GTA Wiki, r/GTA6, trailer frame analysis.
   - TIER_4_UNSOURCED: you found no source.
3. Never present TIER_3 as fact. Mark it.
4. Never use the leaked 2022 build, datamine claims, or "insider" rumours. Skip them.
5. If a detail is disputed, write one row per version and say so in `notes`.
6. If you cannot verify a row, still output it with `confidence` = UNCONFIRMED,
   `source_tier` = TIER_4_UNSOURCED and `source_url` = NONE.
   Never invent a URL. A fake URL is the worst possible failure.

## OUTPUT FORMAT

Return ONE CSV code block. Nothing else. No text before or after.
- Comma separated, UTF-8. First row is the header, exactly the columns below.
- Put every field in double quotes. Double any quote inside a field.
- Never put a line break inside a field.
- Separate list values inside one field with a semicolon.
- Empty means unknown. Never write "N/A", "TBD", "unknown" or "coming soon".

### Columns (exactly these, in this order)

entity_type,name,alt_names,slug,category,subcategory,short_description,long_description,key_facts,real_world_basis,first_shown_in,first_shown_date,confirmed_status,source_tier,source_url,source_date,confidence,official_image_exists,related_entities,search_terms,notes

### What each column means

- entity_type: the DATASET word below, lowercase and singular. Example: character.
- name: the exact official name, official spelling.
- alt_names: every other spelling, nickname, fan name or misspelling. Semicolon separated.
- slug: lowercase URL form. Words joined by hyphens. Letters and digits only.
- category / subcategory: your grouping. Use the same words across all rows.
- short_description: one sentence, 15 to 25 words, plain factual English.
- long_description: 80 to 150 words. Verified facts only. No guessing, no hype,
  no marketing words. Never write "fans believe" or "it is rumoured".
- key_facts: 3 to 6 short facts, semicolon separated.
- real_world_basis: the real place, car, brand or person it is based on, if documented.
- first_shown_in: Trailer 1 / Trailer 2 / Extended Look / Screenshots / Official Site /
  Newswire Post / Not Yet Shown.
- first_shown_date: YYYY-MM-DD.
- confirmed_status: OFFICIAL_CONFIRMED / PRESS_REPORTED / COMMUNITY_IDENTIFIED / SPECULATION.
- source_tier: TIER_1_OFFICIAL / TIER_2_MAJOR_PRESS / TIER_3_COMMUNITY / TIER_4_UNSOURCED.
- source_url: one working URL. NONE if you have none.
- source_date: YYYY-MM-DD, when that source was published.
- confidence: HIGH / MEDIUM / LOW / UNCONFIRMED.
- official_image_exists: YES only if Rockstar published an image of it. Otherwise NO.
- related_entities: names of other rows this connects to. Semicolon separated.
- search_terms: 5 to 10 real phrases a person types into Google to find this.
  Include name variants and common misspellings. Semicolon separated.
- notes: disputes, doubt, or why confidence is low. Empty if none.

## SCALE

Return every row you can verify, up to 150 rows. Do not pad to reach a number.
If only 9 rows are truly confirmed, return 9 rows. That is a correct answer.
Sort by confidence, HIGH first.

## DATASET

DATASET: character

Run the prompt again for each of these, one at a time:
character, location, vehicle, weapon, brand, business, song, radio_station,
gameplay_feature, activity, animal, edition, release_fact, technology_fact,
map_region, landmark, confirmed_mission_detail, comparison_fact_vs_gta5

---

# Second prompt: keyword and question harvest

Run this one only once. Same source and honesty rules.

## ROLE

You are a search analyst. List the real questions people type into Google about
Grand Theft Auto VI. Use web search, Google autocomplete, People Also Ask boxes,
r/GTA6 repeat threads, YouTube video titles and news headlines as evidence.

## OUTPUT

ONE CSV code block. Columns, exactly:

keyword,name_variant_used,question_form,intent,entity_referenced,page_type,answer_exists_today,who_ranks_now,notes

- keyword: the phrase as a person types it, lowercase.
- name_variant_used: which spelling it has (gta 6, gta vi, grand theft auto 6, and so on).
- question_form: YES if it is a question, NO if not.
- intent: INFORMATIONAL / COMMERCIAL / NAVIGATIONAL / TRANSACTIONAL.
- entity_referenced: the character, car, place or feature it is about. Empty if general.
- page_type: the kind of page that answers it. Example: entity page, feature page,
  price page, comparison page, list page, news page, guide page.
- answer_exists_today: YES if official material can answer it now.
  NO if only the released game can answer it.
- who_ranks_now: the site ranking first, if you can check.
- notes: anything useful.

Return at least 300 rows. Cover all of these angles:
release and dates; price in every major currency and country; platforms and consoles;
PC version; pre-order and preload; editions and bonuses; file size and install;
map, regions, cities and size; characters and their stories; vehicles and cars;
weapons; radio and music; gameplay features; "does GTA 6 have X";
"can you X in GTA 6"; "how many X in GTA 6"; multiplayer and GTA Online;
comparisons with GTA 5 and other games; age rating; console and accessory needs;
what to buy; errors and troubleshooting; news and rumours;
and every name variant listed earlier.
