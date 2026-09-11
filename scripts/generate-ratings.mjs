import { readFile, writeFile } from 'node:fs/promises';
import { analyzeRatings } from '../lib/blackjack/rating-analysis.mjs';
const catalog = JSON.parse(await readFile(new URL('../lib/blackjack/catalog.json',import.meta.url),'utf8'));
const file = new URL('../lib/blackjack/ratings.json',import.meta.url);
const ratings = JSON.parse(await readFile(file,'utf8'));
// Existing ratings stay fixed. Only newly scheduled dates are calculated.
for (const [date,entry] of Object.entries(catalog)) {
  if (ratings[date]) continue;
  ratings[date] = {oneLoss:analyzeRatings(entry.deck,false),threeStrikes:analyzeRatings(entry.deck,true)};
}
await writeFile(file,JSON.stringify(ratings,null,2) + '\n');
console.log('Added missing date ratings without changing decks or existing ratings.');
