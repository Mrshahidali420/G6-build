import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import { SITE_URL } from './src/lib/site.mjs'

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
    }),
  ],
})
