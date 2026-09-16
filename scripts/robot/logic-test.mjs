// The floor has to be provable, because on a day with no working key it is the
// only thing standing between the saved articles and the site. Run:
//   npm test

import assert from 'node:assert/strict'
import test from 'node:test'

import { EM_DASH } from './checks.mjs'
import { digestDescription, headlineWords, logicClaims, logicDraft, longDate, usableLabels } from './logic.mjs'

const CATALOG = [
  { slug: 'jason-duval', name: 'Jason Duval', altNames: ['Jason'], entityType: 'character' },
  { slug: 'leonida-keys', name: 'Leonida Keys', altNames: ['Keys'], entityType: 'location' },
  { slug: 'vic', name: 'Vic', altNames: [], entityType: 'character' },
]

const article = (text, title = 'Grand Theft Auto VI news') => ({
  id: 'test-1',
  outlet: 'IGN',
  title,
  text,
})

test('a sentence naming a catalog entry becomes a claim carrying that sentence', () => {
  const sentence =
    'Rockstar said that Jason Duval appears in the second trailer alongside the other lead character.'
  const result = logicClaims(article(`GTA 6 arrives later. ${sentence}`), CATALOG)
  assert.equal(result.aboutGta6, true)
  const jason = result.entities.find((entity) => entity.slug === 'jason-duval')
  assert.ok(jason, 'the catalog entry was found')
  assert.equal(jason.viaLogic, true)
  assert.equal(jason.entityType, 'character')
  assert.deepEqual(jason.claims, [{ fact: sentence, quote: sentence }])
})

test('an entry named in the headline or summary is salient, one only in the body is not', () => {
  const body =
    'GTA 6 is coming. Jason Duval was shown once more in the footage. The Leonida Keys sit south of the city on the map.'
  const result = logicClaims(
    { id: 'test-2', outlet: 'IGN', title: 'Rockstar shows more of Jason Duval', summary: '', text: body },
    CATALOG,
  )
  const jason = result.entities.find((entity) => entity.slug === 'jason-duval')
  const keys = result.entities.find((entity) => entity.slug === 'leonida-keys')
  assert.equal(jason.salient, true)
  assert.equal(keys.salient, false)
})

test('an entry named only in the summary is salient too', () => {
  const body = 'GTA 6 is coming. The Leonida Keys sit south of the city on the map, the outlet reported.'
  const result = logicClaims(
    { id: 'test-3', outlet: 'IGN', title: 'A new report', summary: 'A look at the Leonida Keys.', text: body },
    CATALOG,
  )
  assert.equal(result.entities.find((entity) => entity.slug === 'leonida-keys').salient, true)
})

test('headline words keep what tells one story from another and drop the rest', () => {
  const words = headlineWords("GTA 6's Stephen Root Is The Franchise's Second-Ever Emmy Winning Actor")
  assert.deepEqual([...words].sort(), ['actor', 'emmy', 'franchise', 'root', 'second', 'stephen', 'winning'])
  const other = headlineWords('Rockstar Games says GTA 6 will have 2 trailers in 2026')
  assert.deepEqual([...other], [])
})

test('a label under four characters is never matched', () => {
  assert.deepEqual(usableLabels({ name: 'Vic', altNames: [] }), [])
  const sentence = 'The publisher said Vic will return in a way that the studio has not described yet.'
  const result = logicClaims(article(`GTA 6 is coming. ${sentence}`), CATALOG)
  assert.equal(result.entities.some((entity) => entity.slug === 'vic'), false)
})

test('a label that is an ordinary English word is never matched', () => {
  assert.deepEqual(usableLabels({ name: 'Keys', altNames: [] }), [])
  const sentence = 'The reporter lost the keys to the rental car on the way to the GTA 6 preview event.'
  const result = logicClaims(article(`GTA 6 preview. ${sentence}`), CATALOG)
  assert.equal(result.entities.some((entity) => entity.slug === 'leonida-keys'), false)
})

test('a sentence holding an em dash is skipped', () => {
  const sentence = `Rockstar said that Jason Duval ${EM_DASH} the lead character ${EM_DASH} returns in the second trailer.`
  const clean = 'Jason Duval was also named in the press release that the publisher sent out that morning.'
  const result = logicClaims(article(`GTA 6 news. ${sentence} ${clean}`), CATALOG)
  const jason = result.entities.find((entity) => entity.slug === 'jason-duval')
  assert.deepEqual(jason.claims.map((claim) => claim.quote), [clean])
})

test('a text that is not about this game returns nothing at all', () => {
  const sentence = 'Rockstar said that Jason Duval appears in the second trailer alongside the other lead.'
  const result = logicClaims(article(sentence, 'A different game entirely'), CATALOG)
  assert.equal(result.aboutGta6, false)
  assert.deepEqual(result.entities, [])
})

test('logic never proposes an entity the catalog does not already hold', () => {
  const sentence =
    'The report says that Lucia Caminos drives a Declasse Vigero through the streets of Vice City at night.'
  const result = logicClaims(article(`GTA 6 report. ${sentence}`), CATALOG)
  const slugs = result.entities.map((entity) => entity.slug)
  for (const slug of slugs) {
    assert.ok(CATALOG.some((entity) => entity.slug === slug), `${slug} is in the catalog`)
  }
})

test('longDate writes a day without asking the machine what locale it is', () => {
  assert.equal(longDate('2026-09-11'), '11 September 2026')
  assert.equal(longDate(''), '')
})

test('the description template fits the bars and drops names until it does', () => {
  const text = digestDescription(['IGN', 'Eurogamer'], ['Jason Duval'], '2026-09-11')
  assert.ok(text.length >= 70 && text.length <= 160, `${text.length} characters`)
  assert.ok(text.includes('11 September 2026'))
})

// --- the digest --------------------------------------------------------------

const QUOTE_A = 'Rockstar said that Jason Duval returns as one of the two lead characters in the game.'
const QUOTE_B = 'The publisher confirmed that the release date has not moved since the last announcement.'
const QUOTE_C = 'Both leads were shown driving through the state of Leonida in the footage released today.'
const QUOTE_D = 'The studio did not answer any question about the price of the game at that event.'

const ITEM_OFFICIAL = {
  rawId: 'rockstar-1',
  outlet: 'Rockstar Newswire',
  tier: 'TIER_1_OFFICIAL',
  url: 'https://www.rockstargames.com/newswire/article/one',
  title: 'Grand Theft Auto VI second trailer is out now',
  summary: 'The second trailer for Grand Theft Auto VI is available to watch now.',
  published: '2026-09-11',
  names: new Set(['jason duval']),
  displayNames: ['Jason Duval'],
  claims: [],
}

const ITEM_PRESS = {
  rawId: 'ign-1',
  outlet: 'IGN',
  tier: 'TIER_2_MAJOR_PRESS',
  url: 'https://www.ign.com/articles/two',
  title: 'What the second Grand Theft Auto VI trailer showed',
  summary: 'A breakdown of everything in the new trailer.',
  published: '2026-09-12',
  names: new Set(['jason duval']),
  displayNames: ['Jason Duval'],
  claims: [],
}

const STORY = [ITEM_PRESS, ITEM_OFFICIAL]
const CLAIMS = [
  { fact: QUOTE_A, quote: QUOTE_A, outlet: 'Rockstar Newswire', url: ITEM_OFFICIAL.url, published: '2026-09-11' },
  { fact: QUOTE_B, quote: QUOTE_B, outlet: 'Rockstar Newswire', url: ITEM_OFFICIAL.url, published: '2026-09-11' },
  { fact: QUOTE_C, quote: QUOTE_C, outlet: 'IGN', url: ITEM_PRESS.url, published: '2026-09-12' },
  { fact: QUOTE_D, quote: QUOTE_D, outlet: 'IGN', url: ITEM_PRESS.url, published: '2026-09-12' },
]

test('a story with no catalog entry in it describes itself by its headline', () => {
  const headline = "GTA 6's Stephen Root Is The Franchise's Second-Ever Emmy Winning Actor"
  const text = digestDescription(['Eurogamer', 'GameSpot'], [], '2026-09-14', headline)
  assert.ok(text, 'a description was built')
  assert.ok(text.length >= 70 && text.length <= 160, `${text.length} characters`)
  assert.ok(text.includes(headline))
  assert.equal(digestDescription(['Eurogamer', 'GameSpot'], [], '2026-09-14'), null)
})

test('the digest takes its title from the official report, unchanged', () => {
  const draft = logicDraft(STORY, CLAIMS, STORY)
  assert.equal(draft.held, null)
  assert.equal(draft.title, ITEM_OFFICIAL.title)
})

test('the digest description fits 70 to 160 characters', () => {
  const draft = logicDraft(STORY, CLAIMS, STORY)
  assert.ok(
    draft.description.length >= 70 && draft.description.length <= 160,
    `${draft.description.length} characters: ${draft.description}`,
  )
})

test('the digest body holds one section per report, in date order', () => {
  const draft = logicDraft(STORY, CLAIMS, STORY)
  const headings = draft.body.split('\n').filter((line) => line.startsWith('## '))
  assert.equal(headings.length, STORY.length)
  assert.equal(headings[0], '## Rockstar Newswire, 11 September 2026')
  assert.equal(headings[1], '## IGN, 12 September 2026')
  for (const item of STORY) assert.ok(draft.body.includes(`](${item.url})`), `${item.outlet} is linked`)
})

test('every quote in the digest sits inside a blockquote and nowhere else', () => {
  const draft = logicDraft(STORY, CLAIMS, STORY)
  const lines = draft.body.split('\n')
  for (const quote of [QUOTE_A, QUOTE_B, QUOTE_C, QUOTE_D]) {
    const holders = lines.filter((line) => line.includes(quote))
    assert.equal(holders.length, 1, `${quote} appears once`)
    assert.ok(holders[0].startsWith('> '), 'it is a blockquote')
  }
})

test('the digest carries no em dash', () => {
  const draft = logicDraft(STORY, CLAIMS, STORY)
  for (const field of [draft.title, draft.description, draft.body]) {
    assert.equal(field.includes(EM_DASH), false)
  }
})

test('a headline outside the title bars holds the story instead of refusing it', () => {
  const short = { ...ITEM_OFFICIAL, title: 'Trailer out' }
  const draft = logicDraft([short], CLAIMS, [short])
  assert.match(draft.held, /the outlet headline is 11 characters/)
})
