// Which entries in the catalog a run of text names.
//
// This is used to build internal links from a page that quotes other people's
// words to the entries this site has recorded itself. A name in a headline is
// not a claim about that entry, so the only thing this file decides is whether
// a link is worth offering the reader.
//
// The label rules live in scripts/robot/logic.mjs and are imported, not copied.
// The robot decides what counts as a mention when it reads an article, and the
// site has to agree with it, or the same headline would name one set of entries
// in the ledger and a different set on the page.

import { usableLabels } from '../../scripts/robot/logic.mjs'
import { pageEntities } from './entities.mjs'

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Built once for the whole build. A whole word match, case insensitive, so
// "Vapid" does not match "vapidly" and "Roxy" does not match "proxy".
const patterns = []
for (const entity of pageEntities) {
  if (!entity?.slug || !entity?.name) continue
  const labels = usableLabels(entity)
  if (!labels.length) continue
  const body = labels.map(escapeRegex).join('|')
  patterns.push({
    entity,
    pattern: new RegExp(`(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`, 'iu'),
  })
}

/**
 * Every catalog entry named in the text, in catalog order.
 * Returns entity records, so the caller can use urlFor() and the name.
 */
export function mentionedIn(text) {
  const haystack = String(text ?? '')
  if (!haystack) return []
  return patterns.filter((row) => row.pattern.test(haystack)).map((row) => row.entity)
}
