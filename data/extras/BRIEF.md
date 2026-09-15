# Brief — entity extras

You are adding three things to an existing GTA 6 catalog entry. You are not
writing an article. You are not researching. You may not open a browser.

## The one rule

**Every sentence you write must be supported by the entity record you were
given.** The record holds `longDescription`, `keyFacts`, `firstShownIn`,
`firstShownDate`, `sourceTier`, `sources`, `sourceDate`, `subcategory`,
`relatedEntities` and `searchTerms`. That is the whole world of facts you have.

If a question cannot be answered from the record, the honest answer is that
Rockstar has not said, and that belongs in `notKnown`, not in `faq`.

Never invent a date, a price, a mission name, a voice actor, a map location, a
stat, a radio station, or a gameplay mechanic. Inventing one fact destroys the
only thing this site sells, which is that everything on it is sourced.

## Output

One file per entity at `data/extras/<slug>.json`. Exactly this shape:

```json
{
  "slug": "jason-duval",
  "faq": [
    { "q": "Is Jason Duval a playable character in GTA 6?", "a": "Yes. ..." }
  ],
  "notKnown": [
    "Whether Jason can be played from the start of the story."
  ],
  "howWeKnow": "One short paragraph. Plain prose."
}
```

### `faq` — 4 to 6 pairs

- Build each question out of the entry's `searchTerms` and the way a real
  person types. Natural language, not a keyword glued into a sentence.
  Good: "Where does Jason Duval live in GTA 6?"
  Bad: "Jason Duval GTA 6 character info?"
- One question per pair. No compound questions.
- Answers are 25 to 60 words. Lead with the direct answer in the first
  sentence, then the supporting detail from the record.
- At least one pair must be a question the record cannot fully answer. Answer
  it honestly: say what is known, then say plainly what Rockstar has not said.
- Do not repeat the same sentence across two answers.
- Do not start every answer with the entity name.

### `notKnown` — 2 to 4 items

Short noun phrases or single sentences. Real open questions about this entry,
not filler. If the record already answers something, it does not go here.

Bad, because it is filler: "More details will be revealed in future."
Good: "Whether the Leonida Keys property is enterable in the finished game."

### `howWeKnow` — one paragraph, 40 to 70 words

Say where this entry came from and when. Use `firstShownIn`,
`firstShownDate`, `sourceTier` and `sourceDate` from the record. Say what
kind of source it is in plain words: an official Rockstar page, a press
report, or a community sighting. If the entry has no source, say that.

Write it fresh per entity. Do not use the same sentence shape 10 times in a
row. Vary the opening.

## House style, all of it mandatory

- **No em dashes anywhere. None.** Use a comma, a full stop, or a colon.
- British spelling is not required, but be consistent inside one file.
- Plain words. Short sentences. No hype, no "iconic", no "highly anticipated",
  no "fans are excited", no "stunning", no "beloved".
- No second person sales voice. This is a record, not a blog post.
- Never claim the site has played the game or seen anything first hand.
- No emoji.
- Write "Grand Theft Auto VI" on first mention in a file, "GTA 6" after.

## Before you finish

Re-read each file you wrote and check:
1. Is every factual claim traceable to the record? Delete it if not.
2. Any em dash? Remove it.
3. Is the JSON valid? Parse it.
4. Does `slug` match the file name?
