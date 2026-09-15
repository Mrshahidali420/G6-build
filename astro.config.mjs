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
      filter: (page) => !/\/(privacy|contact|404)$/.test(page),
    }),
  ],
})
