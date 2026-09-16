const UA = "gta6record-robot (+https://gta6record.com)";
const TIMEOUT = 15000;
const GTA_RE = /grand theft auto vi|gta ?6|gta ?vi/i;

const feeds = [
  ["Take-Two IR (news-releases)", "https://ir.take2games.com/rss/news-releases.xml"],
  ["Take-Two IR (pr)", "https://ir.take2games.com/rss/pr.xml"],
  ["PlayStation Blog", "https://blog.playstation.com/feed/"],
  ["Xbox Wire", "https://news.xbox.com/en-us/feed/"],
  ["Rockstar YouTube", "https://www.youtube.com/feeds/videos.xml?channel_id=UC5T3ePzXGIQNH5T8hu2p0kw"],
  ["GameSpot", "https://www.gamespot.com/feeds/news/"],
  ["Polygon", "https://www.polygon.com/rss/index.xml"],
  ["Kotaku", "https://kotaku.com/rss"],
  ["The Verge", "https://www.theverge.com/rss/index.xml"],
  ["VGC", "https://www.videogameschronicle.com/feed/"],
  ["Push Square", "https://www.pushsquare.com/feeds/latest"],
  ["Pure Xbox", "https://www.purexbox.com/feeds/latest"],
  ["Game Informer", "https://www.gameinformer.com/rss.xml"],
  ["Insider Gaming", "https://insider-gaming.com/feed/"],
  ["Rockstar Intel", "https://rockstarintel.com/feed/"],
  ["GTABase (feed)", "https://www.gtabase.com/feed"],
  ["GTABase (rss)", "https://www.gtabase.com/rss"],
  ["Dexerto", "https://www.dexerto.com/feed/"],
  ["GamesIndustry.biz", "https://www.gamesindustry.biz/feed"],
  ["Rock Paper Shotgun", "https://www.rockpapershotgun.com/feed"],
  ["Reddit r/GTA6", "https://www.reddit.com/r/GTA6/.rss"],
  ["Bloomberg tech", "https://feeds.bloomberg.com/technology/news.rss"],
];

async function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    const text = await res.text();
    return { status: res.status, text, finalUrl: res.url };
  } catch (e) {
    return { status: null, error: e.message };
  } finally {
    clearTimeout(t);
  }
}

function extractAll(re, str) {
  const out = [];
  let m;
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  while ((m = g.exec(str))) out.push(m[1]);
  return out;
}

function parseFeed(xml) {
  const isAtom = /<feed[\s>]/i.test(xml) && /<entry[\s>]/i.test(xml);
  const isRss = /<rss[\s>]/i.test(xml) || /<channel[\s>]/i.test(xml);
  if (!isAtom && !isRss) return null;

  let items = [];
  if (isAtom) {
    const entries = xml.split(/<entry[\s>]/i).slice(1).map(s => "<entry " + s.split(/<\/entry>/i)[0]);
    items = entries.map(e => {
      const title = (e.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [,""])[1];
      const summary = (e.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) || e.match(/<content[^>]*>([\s\S]*?)<\/content>/i) || [,""])[1];
      const linkMatch = e.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/i);
      const link = linkMatch ? linkMatch[1] : "";
      const published = (e.match(/<published[^>]*>([\s\S]*?)<\/published>/i) || e.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i) || [,""])[1];
      return { title, desc: summary, link, date: published };
    });
  } else {
    const rawItems = xml.split(/<item[\s>]/i).slice(1).map(s => "<item " + s.split(/<\/item>/i)[0]);
    items = rawItems.map(e => {
      const title = (e.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [,""])[1];
      const desc = (e.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [,""])[1];
      const link = (e.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [,""])[1];
      const date = (e.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [,""])[1];
      return { title, desc, link: link.trim(), date };
    });
  }
  return { type: isAtom ? "Atom" : "RSS", items };
}

function stripCdata(s) {
  if (!s) return "";
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function hostOf(url) {
  try { return new URL(url.trim()).host; } catch { return "?"; }
}

function newestDate(items) {
  let best = null;
  for (const it of items) {
    const d = new Date(it.date);
    if (!isNaN(d) && (!best || d > best)) best = d;
  }
  return best ? best.toISOString().slice(0, 10) : "none";
}

async function probe(name, url) {
  const r = await fetchWithTimeout(url);
  if (r.status === null) {
    console.log(`${name} | ${url} | STATUS=ERR(${r.error}) | parse=NO`);
    return;
  }
  if (r.status >= 400) {
    console.log(`${name} | ${url} | STATUS=${r.status} | parse=NO`);
    return;
  }
  const parsed = parseFeed(r.text);
  if (!parsed) {
    console.log(`${name} | ${url} | STATUS=${r.status} | parse=NO (not RSS/Atom, len=${r.text.length})`);
    return;
  }
  const items = parsed.items.map(it => ({ ...it, title: stripCdata(it.title), desc: stripCdata(it.desc) }));
  const gtaMatches = items.filter(it => GTA_RE.test(it.title + " " + it.desc)).length;
  const hosts = [...new Set(items.slice(0, 10).map(it => hostOf(it.link)).filter(h => h !== "?"))];
  const newest = newestDate(items);
  console.log(`${name} | ${url} | STATUS=${r.status} | parse=${parsed.type} | items=${items.length} | gta_matches=${gtaMatches} | link_hosts=${hosts.join(",") || "none"} | newest=${newest}`);
}

for (const [name, url] of feeds) {
  await probe(name, url);
}
