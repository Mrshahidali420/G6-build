# In-game facts (after launch)

GTA 6 comes out on 19 November 2026. After that, people search "where is the
[car]", "can you buy [business]", "which station plays [song]". Every entry
page has an empty slot for that answer. You fill it in one file:
`data/ingame.json`.

While the file is `{}` nothing shows. The pages look exactly as they do now.

## How to fill a slot

1. Find the entry's slug. It is the last part of its URL.
   `/vehicles/95-grotti-cheetah` has the slug `95-grotti-cheetah`.
2. Add a block for it to `data/ingame.json` with the facts and a source.
3. Run `npm run build`. If an entry is wrong, the build stops and says which
   one and why.

```json
{
  "95-grotti-cheetah": {
    "location": "...",
    "price": "...",
    "source": { "label": "Rockstar Newswire", "url": "https://www.rockstargames.com/..." }
  }
}
```

Separate blocks with a comma. Leave out any field you do not know yet.

## Fields each kind of entry takes

| Entry kind | Fields |
|---|---|
| vehicle | `location`, `price`, `class`, `how_to_get` |
| business | `location`, `buyable`, `price` |
| song | `radio_station` |
| weapon | `location`, `price` |
| landmark, location | `how_to_get_there` |

- Every field is text in quotes, except `buyable`, which is `true` or `false`
  with no quotes.
- `source` is required on every entry, with a `label` and a web address `url`.
- An entry needs at least one fact besides the source.

## What it changes on the page

- A block near the top, under the main paragraph, headed "Where to find [name]
  in GTA 6" (or "Which radio station plays [name]" for songs), with the facts
  and the source link.
- The search snippet gets the main fact added, only if the whole snippet stays
  within 160 characters.
- The page's structured data gets the facts, for cars, weapons, businesses and
  places. Songs do not, because their schema type has no field for it.

Only write what a source says. No guesses.
