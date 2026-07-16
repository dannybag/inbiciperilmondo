// Traduce in inglese le voci del diario che non hanno ancora title_en/text_en.
// Usa l'API gratuita DeepL. Richiede la variabile d'ambiente DEEPL_API_KEY.

const fs = require('fs');
const path = require('path');

const DIARIO_PATH = path.join(__dirname, '..', 'diario.json');
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

if (!DEEPL_API_KEY) {
  console.error('✗ DEEPL_API_KEY mancante. Imposta il secret nel repository GitHub.');
  process.exit(1);
}

// Le chiavi free DeepL terminano con ":fx" e usano l'endpoint api-free.
const DEEPL_URL = DEEPL_API_KEY.endsWith(':fx')
  ? 'https://api-free.deepl.com/v2/translate'
  : 'https://api.deepl.com/v2/translate';

async function translateText(text) {
  if (!text || !text.trim()) return '';
  const res = await fetch(DEEPL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      source_lang: 'IT',
      target_lang: 'EN-GB',
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepL error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data.translations[0].text;
}

async function main() {
  const raw = JSON.parse(fs.readFileSync(DIARIO_PATH, 'utf8'));
  const entries = raw.entries || [];

  let translatedCount = 0;

  for (const entry of entries) {
    const needsTitle = !entry.title_en && entry.title;
    const needsText = !entry.text_en && entry.text;

    if (!needsTitle && !needsText) continue;

    console.log(`Traduco: "${entry.title}"...`);

    if (needsTitle) entry.title_en = await translateText(entry.title);
    if (needsText) entry.text_en = await translateText(entry.text);

    translatedCount++;
  }

  if (translatedCount === 0) {
    console.log('Nessuna nuova voce da tradurre.');
    return;
  }

  fs.writeFileSync(DIARIO_PATH, JSON.stringify(raw, null, 2));
  console.log(`✓ Tradotte ${translatedCount} voci.`);
}

main().catch(e => {
  console.error('✗ Errore:', e.message);
  process.exit(1);
});
