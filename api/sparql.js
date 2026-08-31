module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Ei hakukyselyä' });

  try {
    const url = 'https://ldf.fi/warsa/sparql'
      + '?query=' + encodeURIComponent(query)
      + '&format=application%2Fsparql-results%2Bjson';

    const response = await fetch(url, {
      headers: { Accept: 'application/sparql-results+json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Sotasampo virhe: ' + response.status });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
