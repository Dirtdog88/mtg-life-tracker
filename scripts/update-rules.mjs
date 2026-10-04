// Downloads the latest Magic: The Gathering Comprehensive Rules from Wizards of the Coast
// and converts them to rules.json for the app's offline rules search.
// Run by .github/workflows/update-rules.yml (monthly), or locally: node scripts/update-rules.mjs [path-to-rules.txt]
import { readFile, writeFile } from 'node:fs/promises';

const RULES_PAGE = 'https://magic.wizards.com/en/rules';
const OUT = new URL('../rules.json', import.meta.url);

async function download() {
  const page = await (await fetch(RULES_PAGE, { headers: { 'User-Agent': 'mtg-life-tracker rules updater' } })).text();
  const m = page.match(/https:\/\/media\.wizards\.com\/[^"'\s]+\.txt/i);
  if (!m) throw new Error('No .txt link found on ' + RULES_PAGE);
  const url = m[0].replace(/ /g, '%20');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  return { buf: Buffer.from(await res.arrayBuffer()), url };
}

// Wizards has shipped the file as UTF-8 and as Windows-1252 over the years
function decode(buf) {
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { text = new TextDecoder('windows-1252').decode(buf); }
  return text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

export function parse(text) {
  const lines = text.split('\n').map(l => l.replace(/\s+$/, ''));
  const effective = (text.match(/effective as of ([A-Z][a-z]+ \d{1,2}, \d{4})/) || [])[1] || '';
  const lastIndex = re => { let k = -1; lines.forEach((l, n) => { if (re.test(l.trim())) k = n; }); return k; };
  const start = lastIndex(/^1\.\s+Game Concepts$/);      // the first match is the table of contents
  const gloss = lastIndex(/^Glossary$/);
  const credits = lastIndex(/^Credits$/);
  if (start < 0 || gloss < start || credits < gloss) throw new Error('Unexpected rules file layout');

  const chapters = [], sections = [], rules = [];
  let last = null;
  for (const raw of lines.slice(start, gloss)) {
    const l = raw.trim();
    if (!l) continue;
    let m;
    if ((m = l.match(/^(\d)\.\s+(.+)$/))) { chapters.push({ n: m[1], title: m[2] }); last = null; continue; }
    if ((m = l.match(/^(\d{3})\.\s+(.+)$/))) { sections.push({ n: m[1], title: m[2] }); last = null; continue; }
    if ((m = l.match(/^(\d{3}\.\d+[a-z]?)\.?\s+(.+)$/))) { last = { id: m[1], text: m[2] }; rules.push(last); continue; }
    if ((m = l.match(/^Example:\s*(.*)$/)) && last) { (last.ex = last.ex || []).push(m[1]); continue; }
    if (last) { if (last.ex) last.ex[last.ex.length - 1] += '\n' + l; else last.text += '\n' + l; }
  }

  const glossary = [];
  let block = [];
  const flush = () => { if (block.length > 1) glossary.push({ term: block[0], text: block.slice(1).join('\n') }); block = []; };
  for (const raw of lines.slice(gloss + 1, credits)) { if (raw.trim()) block.push(raw.trim()); else flush(); }
  flush();

  if (rules.length < 1000 || glossary.length < 100) throw new Error(`Parsed too little (${rules.length} rules, ${glossary.length} glossary terms)`);
  return { effective, chapters, sections, rules, glossary };
}

async function main() {
  const local = process.argv[2];
  const { buf, url } = local ? { buf: await readFile(local), url: 'local file' } : await download();
  const data = parse(decode(buf));
  let old = null;
  try { old = JSON.parse(await readFile(OUT, 'utf8')); } catch { /* first run */ }
  if (old && old.effective === data.effective && old.rules.length === data.rules.length) {
    console.log(`Rules unchanged (effective ${data.effective}).`);
    return;
  }
  const out = { effective: data.effective, source: url, updated: new Date().toISOString().slice(0, 10), ...data };
  await writeFile(OUT, JSON.stringify(out));
  console.log(`Wrote rules.json: effective ${data.effective}, ${data.rules.length} rules, ${data.sections.length} sections, ${data.glossary.length} glossary terms.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e.message); process.exit(1); });
