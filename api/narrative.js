module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { person, unit, battles, diary } = req.body || {};
  if (!person) return res.status(400).json({ error: 'Ei henkilötietoja' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API-avain puuttuu' });

  const prompt = `Kirjoita lyhyt, asiallinen ja koskettava suomenkielinen kuvaus sotamiehen elämästä talvi- tai jatkosodassa. Käytä vain alla annettuja tietoja – älä keksi mitään lisää.

HENKILÖTIEDOT:
${JSON.stringify(person, null, 2)}

JOUKKO-OSASTO:
${unit || 'Ei tiedossa'}

TAISTELUTAPAHTUMAT:
${battles && battles.length ? battles.map(b => `- ${b.name}${b.place ? ' (' + b.place + ')' : ''}${b.date ? ', ' + b.date : ''}`).join('\n') : 'Ei taistelutietoja'}

SOTAPÄIVÄKIRJAMERKINTÄ:
${diary || 'Ei päiväkirjamerkintää'}

Kirjoita 2-4 kappaletta. Mainitse joukko-osasto, taistelupaikat ja kohtalo jos tiedossa. Älä spekuloi asioita joita ei ole annettu.`;

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
