// Audits public/data/furigana.json: a sentence must read the same as its space-separated words.
// Prints every disagreement so it can be fixed in build-furigana.mjs (READING_FIXES).
// Usage: node tools/check-readings.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'public', 'data');
const { t: texts, d: runs } = JSON.parse(fs.readFileSync(path.join(dataDir, 'furigana.json'), 'utf8'));
const KANJI = /[一-鿿々〆ヵヶ]/;

const kana = (s) => {
  if (!KANJI.test(s)) return s;
  const segs = texts[s];
  if (!segs) return null;
  return segs.map((x) => (Array.isArray(x) ? x[1] : x)).join('');
};

const sentences = new Set();
const index = JSON.parse(fs.readFileSync(path.join(dataDir, 'lessons', 'index.json'), 'utf8'));
for (const { id } of index) {
  const l = JSON.parse(fs.readFileSync(path.join(dataDir, 'lessons', `${String(id).padStart(2, '0')}.json`), 'utf8'));
  const add = (s, where) => s && KANJI.test(s) && sentences.add(`${where}\t${s}`);
  l.patterns.forEach((p) => add(p.jp, `L${id} patrón`));
  l.examples.forEach((e) => (add(e.qjp, `L${id} ejemplo`), add(e.ajp, `L${id} ejemplo`)));
  l.grammar.forEach((g) => (g.examples ?? []).forEach((e) => add(e.jp, `L${id} gramática`)));
  l.phrases.forEach((p) => add(p.jp, `L${id} frase`));
  l.conversations.forEach((c) => c.lines.forEach((x) => add(x.jp, `L${id} diálogo`)));
}

let bad = 0;
const seen = new Set();
for (const entry of sentences) {
  const [where, s] = entry.split('\t');
  if (seen.has(s)) continue;
  seen.add(s);
  const full = kana(s);
  const words = s.split(/[\s　]+/).filter(Boolean);
  if (words.length < 2) continue;
  const parts = words.map(kana);
  if (parts.some((p) => p == null) || full == null) continue;
  const joined = parts.join('');
  if (joined !== full.replace(/[\s　]+/g, '')) {
    bad++;
    console.log(`${where}\t${s}\n\tfrase:    ${full}\n\tpalabras: ${parts.join(' ')}`);
  }
}
console.log(`\n${seen.size} frases revisadas · ${bad} con lecturas distintas`);

/* ---------- 2. Kanji read differently from their usual reading (review by eye) ---------- */
const odd = new Map(); // "run:reading" → examples
for (const s of seen) {
  for (const seg of texts[s] ?? []) {
    if (!Array.isArray(seg)) continue;
    const [run, reading] = seg;
    if (runs[run] && runs[run] !== reading) {
      const k = `${run} → ${reading} (normal: ${runs[run]})`;
      if (!odd.has(k)) odd.set(k, []);
      odd.get(k).push(s);
    }
  }
}
console.log(`\nLecturas poco habituales (${odd.size}):`);
for (const [k, ex] of [...odd].sort()) console.log(`${k}\t× ${ex.length}\t${ex[0]}`);
