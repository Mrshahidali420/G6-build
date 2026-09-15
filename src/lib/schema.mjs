// Builds the JSON-LD block for one entity page.
// This is the part no competing GTA site does, so it is worth getting right.

import { SITE_NAME, SITE_URL, canonical } from './site.mjs'

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
  gameplay_feature: 'Thing',
  edition: 'Product',
}

export function entitySchema(entity, path) {
  const schemaType = TYPE_MAP[entity.entityType] ?? 'Thing'

  const node = {
    '@type': schemaType,
    '@id': `${canonical(path)}#entity`,
    name: entity.name,
    description: entity.shortDescription,
    url: canonical(path),
    ...(entity.altNames.length ? { alternateName: entity.altNames } : {}),
    ...(entity.sources.length ? { subjectOf: entity.sources.map((url) => ({ '@type': 'WebPage', url })) } : {}),
    isPartOf: GAME,
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      node,
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
