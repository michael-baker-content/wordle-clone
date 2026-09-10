import { mkdir, writeFile } from 'node:fs/promises';

// Vendor CC0 SVG assets locally; gameplay does not depend on a third-party CDN.
// Review and commit these files once. This is deliberately not a build hook.
const base = 'https://raw.githubusercontent.com/letele/playing-cards/main/';
const directory = new URL('../public/cards/', import.meta.url);
const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const names = ['C','D','H','S'].flatMap(suit => ranks.map(rank => `${suit}-${rank}.svg`));
names.push('B-1.svg', 'J-1.svg');
const files = [];
for (const name of [...names,'LICENSE']) {
  const url = base + (name === 'LICENSE' ? name : `assets/${name}`);
  const response = await fetch(url, { signal:AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Download failed for ${name}: ${response.status}. No files written.`);
  const text = await response.text();
  if (name !== 'LICENSE' && (!text.includes('<svg') || /<script|<foreignObject|\son\w+\s*=/i.test(text))) throw new Error(`Unexpected SVG content in ${name}. No files written.`);
  files.push([name,text]);
}
await mkdir(directory,{recursive:true});
for (const [name,text] of files) await writeFile(new URL(name,directory),text);
console.log('Saved 54 CC0 card images and their license in public/cards. Commit this folder with the game.');
