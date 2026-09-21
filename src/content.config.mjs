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
    // The one page that gets the live launch counter, rendered before the
    // article band. Kept as a flag rather than inferring it from the slug so
    // a second countdown page (a demo unlock, a beta) can opt in later
    // without touching the render logic.
    countdown: z.boolean().default(false),
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
    // Video pages only. Each entry becomes a click to load YouTube facade.
    // The id must be a video on Rockstar's own channel, checked through the
    // YouTube oEmbed endpoint before it is added: mirrors and fan reuploads
    // carry the same footage under a different owner and must not be used.
    videos: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          date: z.string(),
          runtime: z.string().optional(),
          channel: z.string().default('Rockstar Games'),
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

// The daily coverage log, written by scripts/robot/publish.mjs and by nothing
// else. One file per calendar day. The body is always empty on purpose: every
// string a reader sees is either quoted verbatim from the outlet that published
// it or built from a template holding only a date, an outlet name and a count.
// Putting the items in typed frontmatter is what makes it impossible for the
// robot to write a sentence of its own.
const updates = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/updates' }),
  schema: z.object({
    title: z.string(),
    description: z.string().min(70).max(160),
    // The calendar day the outlets published on, not the day the robot ran.
    date: z.string(),
    updated: z.string(),
    // Two is the floor. One stray article is not a day of news, and a page
    // built from a single link is a reprint of that link.
    items: z
      .array(
        z.object({
          outlet: z.string(),
          headline: z.string(),
          summary: z.string().optional(),
          url: z.string().url(),
          published: z.string(),
        }),
      )
      .min(2),
  }),
})

// The claim tracker. One file per dated GTA 6 claim, imported from the
// AaronShenny/gta6-news archive by scripts/import/tracker.mjs and written by
// nothing else.
//
// The body is always empty on purpose. Every string a reader sees comes out of
// typed frontmatter below, so the archive's machine written prose cannot land
// on this site dressed as ours. The one paragraph kept is `summary`, and the
// page renders it under a heading naming whose summary it is.
//
// `status` is the archive's own word for the claim on the day it was logged.
// It is a record of what was said, not a ruling by this site. That is the
// whole value of the section: a claim with the status it carried at the time.
const tracker = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tracker' }),
  schema: z.object({
    title: z.string(),
    description: z.string().min(40).max(200),
    // The day the claim was logged by the archive.
    date: z.string(),
    status: z.enum(['CONFIRMED', 'RUMOR', 'LEAK', 'UNKNOWN']),
    source: z.object({
      label: z.string(),
      url: z.string().url(),
      kind: z.enum(['reddit', 'press', 'official', 'other']),
    }),
    summary: z.string().min(60),
    // Three is the floor. Fewer than that and the page says nothing the
    // headline did not.
    points: z.array(z.string()).min(3),
    // Becomes FAQPage structured data when present. Not every claim has one.
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    topics: z.array(z.string()).default([]),
    // Entity pages this claim mentions, by slug. Matched by the importer.
    related: z.array(z.string()).default([]),
  }),
})

export const collections = { answers, hubs, news, tracker, updates }

