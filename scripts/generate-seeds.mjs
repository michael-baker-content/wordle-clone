import { readFile, writeFile, rename } from 'node:fs/promises';
import { analyze, shuffledDeck, isPublishable, RULES_VERSION } from '../lib/blackjack/engine.mjs';

// Append only: never change a published date, deck, or rating threshold.
const file = new URL('../lib/blackjack/catalog.json', import.meta.url);
const catalog = JSON.parse(await readFile(file, 'utf8'));
const days = Number(process.argv[2] ?? 30);
if (!Number.isInteger(days) || days < 1 || days > 365) throw new Error('Specify 1–365 days to append.');
const lastDate = Object.keys(catalog).sort().at(-1);
if (!lastDate) throw new Error('Expected the existing approved catalog.');
const date = new Date(`${lastDate}T12:00:00Z`);
let seed = Math.max(...Object.values(catalog).map(entry => entry.seed)) + 1;
let accepted = 0, candidates = 0;
while (accepted < days && candidates++ < 100000) {
  const candidate = seed++;
  const deck = shuffledDeck(candidate);
  let analysis;
  try { analysis = analyze(deck); }
  catch (err) { if (err.message === 'Analysis state limit exceeded.') continue; throw err; }
  if (!isPublishable(analysis)) continue;
  date.setUTCDate(date.getUTCDate() + 1);
  const id = date.toISOString().slice(0,10);
  if (catalog[id]) throw new Error(`Refusing to overwrite ${id}`);
  catalog[id] = { rulesVersion:RULES_VERSION, seed:candidate, deck, ...analysis };
  accepted++;
  console.log(`${id}: approved seed ${candidate}, scores ${analysis.minimum}–${analysis.maximum}, ${analysis.states} analyzed states`);
}
if (accepted !== days) throw new Error('Candidate limit reached. Catalog unchanged.');
const temporary = new URL('../lib/blackjack/catalog.json.tmp', import.meta.url);
await writeFile(temporary, JSON.stringify(catalog,null,2) + '\n');
await rename(temporary,file);
console.log(`Appended ${accepted} days. Run npm test, then commit and deploy the updated catalog.`);
