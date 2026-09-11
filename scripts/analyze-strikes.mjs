import { readFile } from 'node:fs/promises';
import { compare } from '../lib/blackjack/strike-study.mjs';
const catalog = JSON.parse(await readFile(new URL('../lib/blackjack/catalog.json',import.meta.url),'utf8'));
// Prints only. No seed generation, catalog updates, or statistics writes.
console.log(JSON.stringify(compare(catalog,process.argv.includes('--oracle')),null,2));
