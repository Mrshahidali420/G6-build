# DESIGN.md — GTA 6 Record

The durable visual world. Read this before changing anything visual.

Seed key `766292e9`. Assigned index 7 of 7 on the ordered direction list.
The concept roll ran degraded: the roll service was unreachable, so there were
no challenger directions and no quality-bar boards. The assignment still binds.

## Thesis

This is a public record of what has actually been published about Grand Theft
Auto VI. It refuses the category arrangement: neon-night hero art over an
unsourced rumour list.

## The world

Miami civic material in daylight. Terrazzo stone ground, deep glazed tile
fields owning whole page regions, brass rules and marks, fired clay for doubt.
Light, not dark. Read it as a city records office in Vice City, not a fan blog.

Color strategy: **Committed**. One saturated color (`--glaze`) carries whole
page regions, not accents on a neutral page.

Refused on purpose:
- the category rut: neon pink and cyan on black, Miami Vice at night
- the AI default: cream background, serif display face, terracotta accent

## Tokens

All tokens live in `src/styles/world.css` on `:root`. Never hardcode a color
in a component.

| Token | Value | Job |
|---|---|---|
| `--stone` | `#e9e7e0` | page ground, terrazzo speckle painted over it |
| `--plaster` | `#f5f3ed` | lifted band, tile and plaque fill |
| `--glaze` | `#0f5d53` | the committed color, owns whole bands |
| `--glaze-deep` | `#0a453e` | glaze band edge, logo inner tile |
| `--brass` | `#b08637` | rules and marks only, **never text** |
| `--brass-ink` | `#7a5a1c` | brass as readable text |
| `--clay` | `#a8492f` | doubt, warnings, unconfirmed |
| `--ink` / `--ink-2` | `#1b2320` / `#4e5b55` | body text, secondary text |
| `--on-glaze` / `--on-glaze-2` | `#eef5f2` / `#b9d6cd` | text on a glaze band |

Contrast, hand checked: `--ink-2` on stone 5.0:1, `--on-glaze-2` on glaze
4.8:1, `--brass-ink` on stone 4.7:1, `--clay` on stone 5.0:1. All pass AA for
body text. `--brass` itself fails as text, which is why `--brass-ink` exists.

## Type

- Display and UI: **Archivo** (variable width 100..125, weight 400..800)
- Body: **Source Serif 4** (optical size 8..60, weight 400..600)
- Headings run wide (`font-stretch` 112% to 125%), tight letter spacing.
- Numbers are `tabular-nums` everywhere so dates and counts line up.

Fonts come from Google Fonts. `public/_headers` must keep
`fonts.googleapis.com` in `style-src` and `fonts.gstatic.com` in `font-src`,
or the whole type system silently falls back.

## Structure

`main` has no max width and no padding. **Every page supplies its own bands.**

```
<section class="band band--glaze">  full-bleed glaze region, page header
<section class="band">             stone, the default
<section class="band band--plaster"> lifted, for a second kind of content
  <div class="shell">              1120px wrapper
  <div class="shell prose">        68ch reading column
```

A page that puts content straight into `main` will render edge to edge. That
is a bug, not a style choice.

Every page gets at least two different band forms. Card sameness is the failure
mode this structure exists to prevent: the home page uses five bands and five
different forms (spec list, ruled directory, tile grid, two-column directory,
prose).

## Provenance marks

`src/components/Mark.astro` is the only way to show how sure a fact is.

| Status | Words | Icon |
|---|---|---|
| `OFFICIAL_CONFIRMED` | Confirmed by Rockstar | seal and tick |
| `PRESS_REPORTED` | Reported by the press | newspaper |
| `COMMUNITY_IDENTIFIED` | Spotted by the community | eye |
| `UNCONFIRMED` | Not confirmed | question |

Shape and words carry the meaning. Color only reinforces it, so the system
survives color blindness and a greyscale print. Never add a status that is
color only.

`as="stamp"` is the large form for a page header. It carries the one authored
motion moment in the whole site: a 640ms blur and rotate press-in, behind
`prefers-reduced-motion: no-preference`. Do not add a second animation
somewhere else to match it. Everything else is hover and shadow.

## Images

The site has almost no photographs it may publish. The answer is not a grey box.

`src/components/Plate.astro`:
1. If `public/img/entities/<slug>.jpg` exists, it renders that photo.
2. Otherwise it draws a terrazzo plate: the section's own glaze ground,
   deterministic scattered chips, and the entry's initials in Archivo 800.

`src/lib/plate.mjs` holds the per-type palettes and the hash. The same slug
always draws the same plate, so a page never changes shape between builds.

To add a real image: drop `<slug>.jpg` into `public/img/entities/` and add a
credit line to `credits.json` in that folder. No code change. The plate is
replaced automatically and the figcaption switches from the plate explanation
to the credit.

Official Rockstar press images are approved for entity pages. Every shipping
raster must carry its provenance in `credits.json`.

## Logo

`src/components/Logo.astro`, drawn SVG, no font dependency. A brass frame
around a glaze-deep tile, three terrazzo chips, a deco V and I. Same mark in
`public/favicon.svg`. It is a tile in a wall, which is the whole world in one
object.

## Rules that are not negotiable

1. No em dashes anywhere in published copy. The build checks `dist/`.
2. `--brass` is never text.
3. One animation in the whole site.
4. No emoji. Icons come from `src/components/Icon.astro`.
5. Every page wraps its own content in a band and a shell.
6. Every entity page states where its facts came from and when it was checked.
7. No horizontal scroll at 400px. Tables and code go inside `.scroller`.
