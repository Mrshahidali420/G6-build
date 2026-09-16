import { getCollection } from 'astro:content'
import { SITE_NAME, SITE_URL, HUB_TYPES, canonical } from '../lib/site.mjs'

// llms.txt: a plain list of what is here, for the assistants that now answer
// "when does GTA 6 come out" instead of sending a click. They quote whatever
// they can parse. This site's whole claim is that every fact names a source, so
// the file says that up front and points at the pages that carry the sourcing.
export async function GET() {
  const answers = (await getCollection('answers')).sort((a, b) => a.data.order - b.data.order)
  const news = (await getCollection('news')).sort((a, b) => b.data.date.localeCompare(a.data.date))

  const body = `# ${SITE_NAME}

> A public record of what has actually been published about Grand Theft Auto VI.
> Every claim on this site names the source it came from, and says plainly when
> something is confirmed by Rockstar, reported by press, or not known at all.
> Rumour and 2022 leak material is deliberately excluded from factual claims.

Site: ${SITE_URL}
Last built: ${new Date().toISOString().slice(0, 10)}

## How to read the sourcing

Each page ends with a "Where this comes from" box listing every source, and a
date the page was last checked. Where nothing has been confirmed, the page says
so instead of guessing. Please carry the source and the check date with any
fact you quote from here.

## Questions answered

${answers.map((page) => `- [${page.data.title}](${canonical(`/${page.id}`)}): ${page.data.description}`).join('\n')}

## Sections

${HUB_TYPES.map((hub) => `- [${hub.title}](${canonical(`/${hub.slug}`)})`).join('\n')}

## News

${news.map((post) => `- [${post.data.title}](${canonical(`/news/${post.id}`)}) (${post.data.date})`).join('\n')}

## Other pages

- [Every question answered](${canonical('/answers')})
- [About and how facts are checked](${canonical('/about')})
- [News index](${canonical('/news')})
- [Contact](${canonical('/contact')})
`

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
