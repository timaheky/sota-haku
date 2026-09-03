// Hakee henkilötietoja Sotapolku.fi -palvelusta (www.sotapolku.fi) sukunimen perusteella.
// Palvelulla ei ole julkista API:a, joten tulokset kaavitaan (scrape) haku- ja henkilösivujen HTML:stä.

const BASE_URL = 'https://www.sotapolku.fi';
const USER_AGENT = 'Mozilla/5.0 (compatible; sota-haku/1.0; +https://github.com/)';

function decodeEntities(str) {
  return (str || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function stripTags(html) {
  const withBreaks = (html || '').replace(/<\/(div|li|tr|p)>|<br\s*\/?>/gi, '\n');
  return decodeEntities(withBreaks.replace(/<[^>]*>/g, '')).replace(/\n+/g, '\n').trim();
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error('Sotapolku.fi vastasi virheellä: ' + response.status);
  }
  return response.text();
}

function parseResultsTable(html) {
  const tableMatch = html.match(/<table class=["']results["']>([\s\S]*?)<\/table>/);
  if (!tableMatch) return [];

  const rows = tableMatch[1].split('</tr>').slice(0, -1);
  const results = [];

  for (const row of rows) {
    const linkMatch = row.match(/<a href=['"]([^'"]+)['"]>([^<]*)<\/a>/);
    if (!linkMatch) continue; // otsikkorivi tai muu ei-tulosrivi

    const cellMatches = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => stripTags(m[1]));
    const [, slug, sukunimiLinkText] = linkMatch;

    results.push({
      url: BASE_URL + slug,
      slug: slug.replace(/^\/henkilot\//, '').replace(/\/$/, ''),
      sukunimi: sukunimiLinkText || cellMatches[1] || '',
      etunimet: cellMatches[2] || '',
      syntymaaika: cellMatches[3] || '',
      syntymakunta: cellMatches[4] || '',
      kotikunta: cellMatches[5] || '',
      sotilasarvo: cellMatches[6] || '',
      joukkoOsasto: cellMatches[7] || ''
    });
  }

  return results;
}

function parsePageCount(html) {
  const lastPageMatch = html.match(/MarkupPagerNavLastNum['"][^>]*><a href=['"][^'"]*sivu(\d+)/);
  if (lastPageMatch) return parseInt(lastPageMatch[1], 10);
  const anyPageMatch = html.match(/sivu(\d+)\?/g);
  if (!anyPageMatch) return 1;
  const max = Math.max(...anyPageMatch.map(s => parseInt(s.match(/\d+/)[0], 10)));
  return max || 1;
}

function parsePersonDetail(html) {
  const nameMatch = html.match(/<h1>([^<]*)<\/h1>/);
  const infoTableMatch = html.match(/<table class=["']info["'][^>]*>([\s\S]*?)<\/table>/);

  const tiedot = {};
  if (infoTableMatch) {
    const rowMatches = infoTableMatch[1].matchAll(/<th>([\s\S]*?)<\/th>\s*<td>([\s\S]*?)<\/td>/g);
    for (const m of rowMatches) {
      const key = stripTags(m[1]);
      const value = stripTags(m[2]);
      if (key) tiedot[key] = value;
    }
  }

  return {
    nimi: nameMatch ? decodeEntities(nameMatch[1]) : '',
    tiedot
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sukunimi, etunimet, sivu, henkilo } = req.query || {};

  try {
    if (henkilo) {
      const slug = String(henkilo).replace(/^\/+|\/+$/g, '');
      const detailUrl = `${BASE_URL}/henkilot/${slug}/`;
      const html = await fetchHtml(detailUrl);
      const person = parsePersonDetail(html);
      return res.status(200).json({ url: detailUrl, ...person });
    }

    if (!sukunimi) {
      return res.status(400).json({ error: 'Anna hakuparametri "sukunimi"' });
    }

    const page = Math.max(1, parseInt(sivu, 10) || 1);
    const path = page > 1 ? `/henkilot/sivu${page}` : '/henkilot/';
    const params = new URLSearchParams({ sukunimi: String(sukunimi) });
    if (etunimet) params.set('etunimet', String(etunimet));

    const searchUrl = `${BASE_URL}${path}?${params.toString()}`;
    const html = await fetchHtml(searchUrl);

    const tulokset = parseResultsTable(html);
    const sivuja = parsePageCount(html);

    return res.status(200).json({
      haku: { sukunimi, etunimet: etunimet || '', sivu: page },
      sivuja,
      maara: tulokset.length,
      tulokset
    });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
};
