// Builds public/data/** from the app's own content in content/ (lessons/NN.json + appendix.json)
// Usage: node tools/build-data.mjs   (then build-furigana.mjs and build-audio.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'content');
const outDir = path.join(root, 'public', 'data');
const lessonsDir = path.join(outDir, 'lessons');
fs.mkdirSync(lessonsDir, { recursive: true });

const index = [];
for (const f of fs.readdirSync(path.join(srcDir, 'lessons')).filter((f) => /^\d+\.json$/.test(f)).sort()) {
  const lesson = JSON.parse(fs.readFileSync(path.join(srcDir, 'lessons', f), 'utf8'));
  fs.writeFileSync(path.join(lessonsDir, f), JSON.stringify(lesson));
  index.push({
    id: lesson.id,
    title: lesson.title,
    titleJp: lesson.titleJp,
    vocabCount: lesson.vocab.length,
    grammarCount: lesson.grammar.length,
    conversationCount: lesson.conversations.length,
  });
}
index.sort((a, b) => a.id - b.id);
fs.writeFileSync(path.join(lessonsDir, 'index.json'), JSON.stringify(index));
fs.writeFileSync(path.join(outDir, 'appendix.json'), JSON.stringify(JSON.parse(fs.readFileSync(path.join(srcDir, 'appendix.json'), 'utf8'))));

console.log(index.map((l) => `L${l.id}: ${l.vocabCount}v ${l.grammarCount}g ${l.conversationCount}c — ${l.title}`).join('\n'));
