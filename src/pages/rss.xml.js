import { getCollection } from 'astro:content'
import { SITE_NAME, SITE_URL, canonical } from '../lib/site.mjs'

// Hand written rather than pulled from a package, because the feed is three
// fields per item and a dependency for that is a dependency to keep updated.
// Anything a reader or an aggregator pulls from here is already on the news
// page with the same source list.
const escape = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export async function GET() {
  const posts = (await getCollection('news')).sort((a, b) => b.data.date.localeCompare(a.data.date))

  const items = posts
    .map((post) => {
      const url = canonical(`/news/${post.id}`)
      return `    <item>
      <title>${escape(post.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(`${post.data.date}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${escape(post.data.description)}</description>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(SITE_NAME)}: news</title>
    <link>${SITE_URL}</link>
    <atom:link href="${canonical('/rss.xml')}" rel="self" type="application/rss+xml" />
    <description>Every dated Grand Theft Auto VI announcement, each one with the source it came from.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
