// Builds the JSON-LD block for one entity page.
// This is the part no competing GTA site does, so it is worth getting right.

import { SITE_NAME, SITE_URL, canonical } from './site.mjs'
import { TAKES_ADDITIONAL_PROPERTY } from './entities.mjs'

const GAME = {
  '@type': 'VideoGame',
  name: 'Grand Theft Auto VI',
  alternateName: ['GTA 6', 'GTA VI', 'Grand Theft Auto 6'],
  publisher: { '@type': 'Organization', name: 'Rockstar Games' },
  gamePlatform: ['PlayStation 5', 'Xbox Series X', 'Xbox Series S'],
  datePublished: '2026-11-19',
}

const TYPE_MAP = {
  character: 'Person',
  vehicle: 'Product',
  location: 'Place',
  landmark: 'LandmarksOrHistoricalBuildings',
  song: 'MusicRecording',
  business: 'LocalBusiness',
  brand: 'Brand',
  weapon: 'Product',
  gameplay_feature: 'Thing',
  edition: 'Product',
}

// The real-world counterpart as a labelled property of the game thing. It is
// never put in address or geo: those would claim the fictional place stands at
// the real one. Only node types that take additionalProperty get it, and the
// label says the link is community-identified, as the page does.
function realWorldProperties(entity) {
  const rows = []
  if (entity.realLife?.basedOn) {
    rows.push({ name: 'Real-life basis (community-identified)', value: entity.realLife.basedOn })
  }
  if (entity.realPlace?.address) {
    rows.push({ name: 'Real-world place (community-identified)', value: entity.realPlace.address })
  }
  return rows.map((row) => ({ '@type': 'PropertyValue', ...row }))
}

export function entitySchema(entity, path) {
  const schemaType = TYPE_MAP[entity.entityType] ?? 'Thing'
  const realWorld = TAKES_ADDITIONAL_PROPERTY.includes(schemaType) ? realWorldProperties(entity) : []

  const node = {
    '@type': schemaType,
    '@id': `${canonical(path)}#entity`,
    name: entity.name,
    description: entity.shortDescription,
    url: canonical(path),
    ...(entity.altNames.length ? { alternateName: entity.altNames } : {}),
    ...(entity.sources.length ? { subjectOf: entity.sources.map((url) => ({ '@type': 'WebPage', url })) } : {}),
    isPartOf: GAME,
    ...(realWorld.length ? { additionalProperty: realWorld } : {}),
  }

  // Only entries that carry a hand written question set get a FAQPage node.
  // An empty or invented FAQ is worse than none, so this stays conditional.
  const faqNode = entity.faq?.length
    ? {
        '@type': 'FAQPage',
        '@id': `${canonical(path)}#faq`,
        mainEntity: entity.faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      }
    : null

  return {
    '@context': 'https://schema.org',
    '@graph': [
      node,
      ...(faqNode ? [faqNode] : []),
      {
        '@type': 'WebPage',
        '@id': canonical(path),
        url: canonical(path),
        name: entity.name,
        description: entity.shortDescription,
        about: { '@id': `${canonical(path)}#entity` },
        isPartOf: { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL },
        ...(entity.sourceDate ? { dateModified: entity.sourceDate } : {}),
      },
    ],
  }
}

export function collectionSchema({ title, description, path, items, urlFor }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': canonical(path),
    url: canonical(path),
    name: title,
    description,
    isPartOf: { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL },
    about: GAME,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: canonical(urlFor(item)),
      })),
    },
  }
}

export { GAME }
