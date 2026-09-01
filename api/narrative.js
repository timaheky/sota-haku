module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { person, unit, battles, diary } = req.body || {};
  if (!person) return res.status(400).json({ error: 'Ei henkilötietoja' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API-avain puuttuu' });

  const personName = req.body.nimi || req.body.personName || person.nimi || '';
  const prompt = `Kirjoita lyhyt suomenkielinen kuvaus sotamiehen elämästä sodan aikana. 

TÄRKEÄÄ: Käytä AINOASTAAN alla annettuja tietoja. Älä keksi mitään. Älä laske ikiä itse. Älä mainitse vuosilukuja tai tapahtumia joita ei ole annettu. Jos tieto puuttuu, jätä se mainitsematta.

HENKILÖTIEDOT:
Nimi: ${personName}
Sotilasarvo: ${person.arvo || ''}
Syntynyt: ${person.syntyma || ''}${person.syntymakunta ? ', ' + person.syntymakunta : ''}
Kaatunut: ${person.kuolema || ''}${person.kuolinpaikka2 ? ', ' + person.kuolinpaikka2 : ''}${person.kuolinpaikka ? ' (' + person.kuolinpaikka + ')' : ''}
Kotikunta: ${person.kotikunta || ''}
Ammatti: ${person.ammatti || ''}
Kuolinsyy: ${person.kuolinsyy || ''}

JOUKKO-OSASTO:
${unit || 'Ei tiedossa'}

TAISTELUTAPAHTUMAT (yksikön tiedot Sotasammosta):
${battles && battles.length ? battles.map(b => '- ' + b.name + (b.place ? ' (' + b.place + ')' : '') + (b.date ? ', ' + b.date : '')).join('\n') : 'Ei taistelutietoja'}

Kirjoita 2-3 kappaletta. Kerro vain annetuista faktoista. Älä spekuloi, älä laske ikiä, älä lisää tietoja joita ei ole annettu.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    const text = data.content && data.content[0] ? data.content[0].text : '';
    return res.status(200).json({ narrative: text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
