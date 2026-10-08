// Checks content/lessons/NN.json against the rules in content/GUIA.md
// Usage: node tools/validate-content.mjs [lessonIds...]   (no ids = all lessons)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'content', 'lessons');
const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'tools', '.vocab-snapshot.json'), 'utf8'));

export const INTERESTS = ['viajes', 'comida', 'trabajo', 'estudios', 'anime', 'videojuegos', 'deporte', 'musica'];

// Characters, companies and places of the textbook the old content came from
const BANNED = [
  'ミラー', 'サントス', 'カリナ', 'ワット', 'グプタ', 'シュミット', 'タワポン', 'テレーザ', 'マリア', 'ワンさん', 'イーさん',
  'さとうさん', '佐藤', 'やまださん', '山田', 'きむら', '木村', 'まつもと', '松本', 'こばやし', '小林', 'たろう', '太郎',
  'IMC', 'パワー電気', 'パワーでんき', 'さくら大学', 'さくらだいがく', '富士大学', 'ふじだいがく', 'AKC', '神戸病院', 'こうべびょういん',
  'ブラジルエアー', 'やまと美術館', 'やまとびじゅつかん', 'みどり図書館', 'みどりとしょかん', 'アップル銀行', '大阪デパート',
  'ユニューヤ', '毎日屋', 'ABCストア', 'つるや', 'おはようテレビ', '余暇開発', 'レジャー白書', '元気茶', '本田駅', 'ヨーネン', 'アキックス',
  'Miller', 'Santos', 'Karina', 'Watt', 'Gupta', 'Schmidt', 'Thawaphon', 'Teresa', 'Yamada', 'Sato', 'Kimura', 'Matsumoto',
  'Minna', 'みんなの日本語', 'Evangelion', 'エヴァ', 'NERV', 'ネルフ',
];

const ids = process.argv.slice(2).map(Number);
const files = fs.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)).filter((f) => !ids.length || ids.includes(Number(f.slice(0, 2))));

let errors = 0;
let warnings = 0;
for (const f of files) {
  const err = (m) => (errors++, console.log(`✗ ${f}: ${m}`));
  const warn = (m) => (warnings++, console.log(`! ${f}: ${m}`));
  let l;
  try {
    l = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  } catch (e) {
    err(`JSON inválido: ${e.message}`);
    continue;
  }
  const id = l.id;
  for (const k of ['title', 'titleJp', 'summary']) if (id !== 0 && !l[k]) err(`falta ${k}`);

  // Vocabulary: same ids in the same order; only proper names may change their text
  const snap = snapshot[id] ?? [];
  if (l.vocab.length !== snap.length) err(`vocab: ${l.vocab.length} palabras, deben ser ${snap.length}`);
  l.vocab.forEach((w, i) => {
    const s = snap[i];
    if (!s) return;
    if (w.id !== s.id) err(`vocab[${i}] id ${w.id} ≠ ${s.id}`);
    if (s.type !== 'name' && (w.kana !== s.kana || (w.kanji ?? '') !== s.kanji)) err(`vocab ${w.id} cambió (solo los nombres propios pueden cambiar)`);
  });

  const sentences = [];
  const S = (s, where) => {
    if (!s?.jp || !s?.es) return err(`${where}: falta jp/es`);
    for (const t of s.tags ?? []) if (!INTERESTS.includes(t)) err(`${where}: etiqueta desconocida «${t}»`);
    sentences.push([s.jp, where]);
    sentences.push([s.es, where]);
  };
  if (id !== 0) {
    if (l.patterns.length < 3) err(`patterns: ${l.patterns.length} (mínimo 3)`);
    if (l.examples.length < 6) err(`examples: ${l.examples.length} (mínimo 6)`);
    if (l.phrases.length < 4) err(`phrases: ${l.phrases.length} (mínimo 4)`);
    if (l.conversations.length < 2) err(`conversations: ${l.conversations.length} (mínimo 2)`);
  }
  l.patterns.forEach((s, i) => S(s, `patterns[${i}]`));
  l.examples.forEach((e, i) => {
    S({ jp: e.qjp, es: e.qes, tags: e.tags }, `examples[${i}].q`);
    S({ jp: e.ajp, es: e.aes }, `examples[${i}].a`);
  });
  l.grammar.forEach((g, i) => {
    if (!g.title || !g.explain) err(`grammar[${i}]: falta title/explain`);
    if (!(g.examples ?? []).length) err(`grammar[${i}] «${g.title}»: sin ejemplos`);
    (g.examples ?? []).forEach((s, j) => S(s, `grammar[${i}].examples[${j}]`));
    sentences.push([g.title, `grammar[${i}].title`], [g.explain, `grammar[${i}].explain`]);
  });
  l.phrases.forEach((s, i) => S(s, `phrases[${i}]`));
  l.conversations.forEach((c, i) => {
    if (!c.id || !c.title || !c.situation) err(`conversations[${i}]: falta id/title/situation`);
    if (c.lesson !== id) err(`conversations[${i}]: lesson debe ser ${id}`);
    if (c.lines.length < 8) warn(`conversations[${i}]: solo ${c.lines.length} líneas`);
    c.lines.forEach((x, j) => {
      if (x.who !== 'A' && x.who !== 'B') err(`conversations[${i}].lines[${j}]: who debe ser A o B`);
      if (!x.name) err(`conversations[${i}].lines[${j}]: falta name`);
      S(x, `conversations[${i}].lines[${j}]`);
    });
    sentences.push([c.title, 'conv'], [c.situation, 'conv']);
  });
  (l.culture ?? []).forEach((c, i) => sentences.push([c, `culture[${i}]`]));
  sentences.push([l.title ?? '', 'title'], [l.titleJp ?? '', 'titleJp'], [l.summary ?? '', 'summary']);
  l.vocab.forEach((w) => sentences.push([`${w.kana} ${w.kanji ?? ''} ${w.es}`, `vocab ${w.id}`]));

  // Sentences for the learner's interests: 2 per interest
  if (id !== 0) {
    const ex = l.extras ?? [];
    ex.forEach((s, i) => {
      S(s, `extras[${i}]`);
      if ((s.tags ?? []).length !== 1) err(`extras[${i}]: debe tener exactamente 1 etiqueta`);
    });
    for (const t of INTERESTS) {
      const n = ex.filter((s) => s.tags?.[0] === t).length;
      if (n < 2) err(`extras: «${t}» tiene ${n} frases (mínimo 2)`);
    }
  }

  // Banned names and copyrighted references
  for (const [text, where] of sentences) {
    for (const b of BANNED) if (text.includes(b)) err(`${where}: contiene «${b}»`);
  }

  // Minna-style spacing: words separated by spaces (needed by "Ordena la frase")
  const jpOnly = [
    ...l.patterns.map((s) => s.jp),
    ...l.examples.flatMap((e) => [e.qjp, e.ajp]),
    ...l.grammar.flatMap((g) => (g.examples ?? []).map((s) => s.jp)),
    ...(l.extras ?? []).map((s) => s.jp),
  ];
  for (const jp of jpOnly) {
    const t = jp.trim().split(/[\s　]+/);
    if (jp.replace(/[\s　]/g, '').length > 10 && t.length < 2) warn(`sin espacios entre palabras: ${jp}`);
    if (/[a-zA-Z]{3,}/.test(jp)) warn(`letras latinas en japonés: ${jp}`);
  }
}
console.log(`\n${files.length} lecciones · ${errors} errores · ${warnings} avisos`);
process.exit(errors ? 1 : 0);
