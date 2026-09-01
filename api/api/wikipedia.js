module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const { yksikko } = req.query;
  if (!yksikko) return res.status(400).json({ error: 'Yksikön nimi puuttuu' });

  try {
    // Hae Wikipedia-artikkelin otsikko hakusanalla
    const searchUrl = 'https://fi.wikipedia.org/w/api.php?action=query&list=search&srsearch=' +
      encodeURIComponent(yksikko) + '&format=json&srlimit=1&origin=*';
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const hits = searchData.query && searchData.query.search;
    if (!hits || !hits.length) return res.status(200).json({ teksti: '' });

    // Hae artikkelin sisältö
    const title = hits[0].title;
    const contentUrl = 'https://fi.wikipedia.org/w/api.php?action=query&titles=' +
      encodeURIComponent(title) + '&prop=extracts&exintro=true&explaintext=true&format=json&origin=*';
    const contentRes = await fetch(contentUrl);
    const contentData = await contentRes.json();
    const pages = contentData.query && contentData.query.pages;
    const page = pages && Object.values(pages)[0];
    const teksti = page && page.extract ? page.extract.substring(0, 1500) : '';
    return res.status(200).json({ teksti, otsikko: title });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
