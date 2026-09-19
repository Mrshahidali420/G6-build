import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import { SITE_URL, HUB_TYPES } from './src/lib/site.mjs'

// A page belongs to a hub sitemap when its path is the hub itself
// (/characters) or something under it (/characters/franklin-clinton).
// Matching on the path this way means a new entity page never needs a
// second place to be registered: it already lives under its hub's URL.
function hubChunk(slug) {
  return (item) => {
    const path = new URL(item.url).pathname
    return path === `/${slug}` || path.startsWith(`/${slug}/`) ? item : undefined
  }
}

function newsChunk(item) {
  const path = new URL(item.url).pathname
  return path === '/news' || path.startsWith('/news/') ? item : undefined
}

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  integrations: [
    sitemap({
      // Utility pages carry no search value and should not be crawl budget.
      // A sitemap is a list of pages asking to be indexed, so a page that
      // carries noindex must never appear in one. Google reports that pair as
      // an error against the whole site. /search is noindex, and so is every
      // dated page of the coverage log: those are a provenance record made of
      // other outlets' quoted words, not pages this site wants ranked.
      filter: (page) =>
        !/\/(privacy|contact|404|search)$/.test(page) &&
        !/\/updates\/\d{4}-\d{2}-\d{2}$/.test(page),
      // One flat sitemap with 150+ URLs mixes characters, vehicles, news and
      // one-off answer pages together, so there is no way to tell a crawl
      // problem in one topic from a healthy one in another. @astrojs/sitemap
      // has no built-in "group by section" setting, but it does ship a
      // `chunks` option: a map of name -> function that claims a URL for
      // that sitemap file. That is the plugin's own supported way to shard
      // by section, so it is used instead of writing a custom
      // `astro:build:done` script that would have to reimplement sitemap
      // XML writing and index writing by hand. Every page a chunk function
      // does not claim still lands somewhere: the plugin collects whatever
      // is left over into its own default sitemap-pages file, which is where
      // the standalone answer pages and the handful of top-level pages
      // (home, about, confirmed, answers, updates) end up. Each chunk here
      // writes its own file (sitemap-characters-0.xml and so on), and the
      // plugin rewrites sitemap-index.xml to list every file it wrote, so
      // nothing extra has to be done to keep the index in sync.
      chunks: {
        ...Object.fromEntries(HUB_TYPES.map(({ slug }) => [slug, hubChunk(slug)])),
        news: newsChunk,
      },
    }),
  ],
})
