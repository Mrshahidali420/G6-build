import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

// Answer pages: one page, one question, one primary keyword.
// These are hand-written. They carry the search traffic.
const answers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/answers' }),
  schema: z.object({
    title: z.string(),
    // Unique per page. The build fails if two pages share one.
    description: z.string().min(70).max(160),
    keyword: z.string(),
    order: z.number().default(50),
    updated: z.string(),
    // Shown in the "Where this comes from" box at the foot of every answer page.
    sources: z.array(z.object({ label: z.string(), url: z.string().url() })).min(1),
    // Becomes FAQPage structured data. Two to four questions per page.
    faq: z
      .array(z.object({ q: z.string(), a: z.string() }))
      .min(2)
      .max(6),
    // Entity pages this answer links to, by slug. Enforces the linking rule.
    related: z.array(z.string()).default([]),
    // Shopping pages only. Rendered as a card per product, each link carrying
    // the Amazon tag from src/lib/site.mjs. Deliberately no price and no ASIN:
    // a stale price is worse than no price, and a dead ASIN is a dead link.
    products: z
      .array(
        z.object({
          name: z.string(),
          search: z.string(),
          bestFor: z.string(),
          why: z.string(),
          watchOut: z.string().optional(),
        }),
      )
      .default([]),
  }),
})

// Hub intro copy. One file per hub slug in src/lib/site.mjs HUB_TYPES.
// The entity grid is generated from the CSV data; this is the human part
// above it, so a hub is a real page and not just a list of links.
const hubs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/hubs' }),
  schema: z.object({
    description: z.string().min(70).max(160),
    keyword: z.string(),
    updated: z.string(),
  }),
})

// News posts. One post per dated, sourced event, newest first.
// Deliberately strict: a post needs a real date and a real source, so the
// section can never drift into rumour reposting like every other GTA site.
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    description: z.string().min(70).max(160),
    // The day the thing actually happened, not the day we wrote it up.
    date: z.string(),
    updated: z.string(),
    tier: z.enum(['TIER_1_OFFICIAL', 'TIER_2_MAJOR_PRESS']),
    sources: z.array(z.object({ label: z.string(), url: z.string().url() })).min(1),
    related: z.array(z.string()).default([]),
  }),
})

export const collections = { answers, hubs, news }
