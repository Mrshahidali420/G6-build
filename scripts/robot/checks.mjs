// The checks that do not trust the model.
//
// Lane 2 asks a language model to read a saved article and propose facts. The
// model is allowed to be wrong, because nothing it says reaches a page until
// these functions have compared it against the saved text. Every function here
// is pure string work. There is no model call in this file and there never
// should be: a check that asks the model whether the model was honest is not a
// check.

export const EM_DASH = String.fromCharCode(8212)

// Outlets use curly quotes, non breaking spaces and soft hyphens in body text,
// and a model retyping a quote will usually straighten them. Comparing raw
// would then reject a quote that is word for word correct, so both sides are
// flattened the same way before the substring test.
const PUNCTUATION = new Map([
  ['‘', "'"],
  ['’', "'"],
  ['‚', "'"],
  ['‛', "'"],
  ['“', '"'],
  ['”', '"'],
  ['„', '"'],
  ['′', "'"],
  ['″', '"'],
  ['‐', '-'],
  ['‑', '-'],
  ['‒', '-'],
  ['–', '-'],
  [EM_DASH, '-'],
  ['―', '-'],
  ['−', '-'],
  ['­', ''],
  [' ', ' '],
  [' ', ' '],
  [' ', ' '],
  ['​', ''],
  ['…', '...'],
])

export function normalise(value) {
  let out = ''
  for (const ch of String(value ?? '')) out += PUNCTUATION.has(ch) ? PUNCTUATION.get(ch) : ch
  return out.replace(/\s+/g, ' ').trim().toLowerCase()
}

/** True only when the quote really is a run of characters from the article. */
export function isVerbatim(quote, articleText) {
  const needle = normalise(quote)
  if (needle.length < 12) return false
  return normalise(articleText).includes(needle)
}

/**
 * Every digit run in a written string, as written. "1997" and "97" are two
 * different numbers here on purpose: a model that turns a model year into a
 * price has changed the number, and this is meant to catch that.
 */
export const numbersIn = (value) => String(value ?? '').match(/\d+/g) ?? []

/** True when every digit run in `value` also appears somewhere in `haystack`. */
export function numbersBacked(value, haystack) {
  const source = normalise(haystack)
  return numbersIn(value).every((number) => source.includes(number))
}

export const hasEmDash = (value) => String(value ?? '').includes(EM_DASH)

export const countWords = (value) =>
  String(value ?? '').trim().split(/\s+/).filter(Boolean).length

/**
 * Split written prose into sentences for the support pass. Crude on purpose:
 * over splitting costs one extra sentence to check, under splitting would let
 * an unsupported clause ride along with a supported one.
 */
export function sentencesIn(value) {
  return String(value ?? '')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export const slugify = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
