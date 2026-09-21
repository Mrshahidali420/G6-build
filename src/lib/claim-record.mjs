/**
 * The four claim statuses, and what each one actually means.
 *
 * These words are not this site's provenance marks. The provenance marks in
 * src/lib/entities.mjs say how sure THIS site is about a fact. These say what
 * status a claim carried on the day somebody made it. A claim can sit here as
 * a rumour for eight months and turn out to be true, and the record of it
 * being a rumour at the time is the point.
 *
 * Every string here is written for a reader who has never seen the section
 * before, because most people arrive on one claim page from a search and
 * never see the index.
 */
export const STATUSES = [
  {
    key: 'CONFIRMED',
    slug: 'confirmed',
    label: 'Confirmed',
    short: 'Confirmed',
    /** Used on a claim page, under the badge. */
    means:
      'Somebody with the standing to know said this, and it can be checked. That is usually Rockstar itself, or a major outlet reporting a thing that already happened. It is not a promise about the finished game.',
    /** Used as the lede of the status hub page. */
    blurb:
      'Claims that could be checked when they were made. Most are Rockstar saying something itself, or a number that anybody can go and look at.',
  },
  {
    key: 'RUMOR',
    slug: 'rumors',
    label: 'Rumour',
    short: 'Rumour',
    means:
      'Somebody said this and nobody has backed it up. It is the most common status by a wide margin, and most of what people believe about this game started here. Treat it as a thing that was said, not a thing that is true.',
    blurb:
      'Claims nobody backed up. This is the biggest group in the record, and it is the one worth reading carefully: a rumour repeated often enough starts to sound like a fact.',
  },
  {
    key: 'LEAK',
    slug: 'leaks',
    label: 'Leak',
    short: 'Leak',
    means:
      'The claim rests on material Rockstar did not publish. This site records that a leak was reported and what was said about it. It does not host, link to, or describe the leaked material itself.',
    blurb:
      'Claims that rest on material Rockstar never published. The record says a leak was reported and what people said about it. No leaked file, image or recreation is stored or linked anywhere on this site.',
  },
  {
    key: 'UNKNOWN',
    slug: 'unconfirmed',
    label: 'Unclear',
    short: 'Unclear',
    means:
      'The claim could not be sorted into the other three. That is usually because it is community talk, a question, or a thread about the wait rather than about the game.',
    blurb:
      'Claims that did not sort into the other three. A lot of this is the community talking to itself: countdowns, questions, and the long wait.',
  },
]

export const STATUS_BY_KEY = new Map(STATUSES.map((status) => [status.key, status]))
export const STATUS_BY_SLUG = new Map(STATUSES.map((status) => [status.slug, status]))

/** The CSS modifier each status uses, so colour never carries meaning alone. */
export const STATUS_CLASS = {
  CONFIRMED: 'confirmed',
  RUMOR: 'rumor',
  LEAK: 'leak',
  UNKNOWN: 'unclear',
}

/** Where a claim came from, in words rather than a hostname. */
export const SOURCE_KIND = {
  official: 'Rockstar itself',
  press: 'A games outlet',
  reddit: 'A Reddit thread',
  other: 'Another site',
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** "2026-02-14" as "14 February 2026". */
export function longDate(iso) {
  const [year, month, day] = String(iso || '').split('-')
  if (!year || !month || !day) return iso
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`
}

/** "2026-02" as "February 2026". */
export function longMonth(iso) {
  const [year, month] = String(iso || '').split('-')
  if (!year || !month) return iso
  return `${MONTHS[Number(month) - 1]} ${year}`
}

/** A claim's page. */
export const trackerUrl = (id) => `/tracker/${id}`
