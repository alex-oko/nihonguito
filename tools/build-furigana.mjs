// Computes furigana (reading of each kanji) for every Japanese string in public/data.
// Output: public/data/furigana.json = { t: { text: segments }, d: { kanjiRun: reading } }
//   segments: array of plain strings or [kanji, reading] pairs.
// Usage: node tools/build-furigana.mjs   (run after build-data.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const kuromoji = require('kuromoji');
const { toHiragana } = require('wanakana');

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'public', 'data');
const KANJI = /[一-鿿々〆ヵヶ]/;
const KANJI_RUN = /[一-鿿々〆ヵヶ]+/g;

const hira = (s) => toHiragana(s || '', { passRomaji: true });

/** Removes ［hints］ and (alternatives) like the app does (see cleanForm in questions.ts) */
function forms(s) {
  if (!s) return [];
  let t = s.replace(/[［\[][^\]］]*[\]］]/g, '').replace(/\*/g, '');
  const alts = [];
  t = t.replace(/[（(]([^)）]*)[)）]/g, (_, inner) => {
    alts.push(inner.trim());
    return '';
  });
  // Keep an empty main form ("（お手洗い）" pairs with the alternative of "トイレ（おてあらい）"),
  // and split "夫／主人" into its forms so each kanji word gets its own reading
  return [t.replace(/\s+/g, ' ').trim(), ...alts].flatMap((x) => x.split('／'));
}

/** Aligns a kanji+kana surface with its kana reading → segments */
function align(surface, reading) {
  if (!KANJI.test(surface)) return [surface];
  const chunks = surface.match(/[一-鿿々〆ヵヶ]+|[^一-鿿々〆ヵヶ]+/g);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^' + chunks.map((c) => (KANJI.test(c) ? '(.+?)' : esc(hira(c)))).join('') + '$');
  const m = hira(reading).match(re);
  if (!m) return [[surface, hira(reading)]];
  let g = 1;
  return chunks.map((c) => (KANJI.test(c) ? [c, m[g++]] : c));
}

function merge(segs) {
  const out = [];
  for (const s of segs) {
    if (typeof s === 'string' && typeof out[out.length - 1] === 'string') out[out.length - 1] += s;
    else if (s !== '') out.push(s);
  }
  return out;
}

const tokenizer = await new Promise((res, rej) =>
  kuromoji.builder({ dicPath: path.join(root, 'node_modules', 'kuromoji', 'dict') }).build((e, t) => (e ? rej(e) : res(t))),
);

/* ---------- Load data ---------- */
const index = JSON.parse(fs.readFileSync(path.join(dataDir, 'lessons', 'index.json'), 'utf8'));
const lessons = index.map((l) =>
  JSON.parse(fs.readFileSync(path.join(dataDir, 'lessons', `${String(l.id).padStart(2, '0')}.json`), 'utf8')),
);
const appendix = JSON.parse(fs.readFileSync(path.join(dataDir, 'appendix.json'), 'utf8'));

/* ---------- 1. Vocabulary = authoritative readings ---------- */
const texts = {}; // text → segments
const compounds = new Map(); // multi-kanji run → reading (from the book's vocabulary)
const runVotes = new Map(); // any kanji run → { reading: count }

function vote(run, reading) {
  const v = runVotes.get(run) ?? {};
  v[reading] = (v[reading] ?? 0) + 1;
  runVotes.set(run, v);
}

function addWord(kanji, kana) {
  const ks = forms(kanji);
  const rs = forms(kana);
  ks.forEach((k, i) => {
    const r = rs[i] ?? rs[0];
    if (!k || !r || !KANJI.test(k)) return;
    const segs = merge(align(k, r));
    texts[k] = segs;
    for (const s of segs) {
      if (Array.isArray(s)) {
        vote(s[0], s[1]);
        if (s[0].length >= 2) compounds.set(s[0], s[1]);
      }
    }
  });
}

for (const l of lessons) {
  for (const w of l.vocab) addWord(w.kanji, w.kana);
  for (const x of l.extraVocab) for (const it of x.items) addWord(it.kanji, it.kana);
}
for (const t of appendix.tables) for (const it of t.items) addWord(it.kanji, it.kana);
for (const v of appendix.verbs) addWord(v.kanji, v.masu);

/* ---------- 2. Sentences ---------- */
function kuromojiSegs(fragment) {
  const out = [];
  for (const tok of tokenizer.tokenize(fragment)) {
    const s = tok.surface_form;
    if (!KANJI.test(s)) {
      out.push(s);
      continue;
    }
    const reading = tok.reading && tok.reading !== '*' ? tok.reading : null;
    out.push(...(reading ? align(s, reading) : [s]));
  }
  return out;
}

const compoundList = [...compounds.keys()].sort((a, b) => b.length - a.length);

function sentenceSegs(text) {
  if (!KANJI.test(text)) return null;
  // Split out compounds whose reading we know from the book, analyze the rest with kuromoji
  let parts = [text];
  for (const c of compoundList) {
    if (!text.includes(c)) continue;
    parts = parts.flatMap((p) => {
      if (typeof p !== 'string' || !p.includes(c)) return [p];
      const pieces = p.split(c);
      return pieces.flatMap((piece, i) => (i < pieces.length - 1 ? [piece, [c, compounds.get(c)]] : [piece]));
    });
  }
  const segs = merge(parts.flatMap((p) => (typeof p === 'string' ? (p ? kuromojiSegs(p) : []) : [p])));
  // kuromoji reads 行った/行って as おこなった (行う); at this level it's always 行く
  segs.forEach((s, i) => {
    const next = segs[i + 1];
    if (Array.isArray(s) && s[0] === '行' && s[1] === 'おこな' && typeof next === 'string' && next.startsWith('っ')) s[1] = 'い';
    // 何ですか / 何の 本 → なん (kuromoji says なに)
    if (Array.isArray(s) && s[0] === '何' && s[1] === 'なに' && typeof next === 'string' && /^[でのとだ]/.test(next)) s[1] = 'なん';
    // 何語 / 何人 / 何階… (何 + counter) → なん
    if (Array.isArray(s) && s[0] === '何' && s[1] === 'なに' && Array.isArray(next) && /^[語時人歳階枚回本番曜年月日分]/.test(next[0])) s[1] = 'なん';
    // あの 方 / この 方 = polite "person" (かた); kuromoji says ほう (direction, side)
    const prev = segs[i - 1];
    if (Array.isArray(s) && s[0] === '方' && s[1] === 'ほう' && typeof prev === 'string' && /[こそあど]の[\s　]*$/.test(prev)) s[1] = 'かた';
    // ピアノを 弾く = ひく (kuromoji says はじく, "to flick")
    if (Array.isArray(s) && s[0] === '弾' && s[1] === 'はじ') s[1] = 'ひ';
    // 辛い in our texts is always "spicy" (からい), never つらい
    if (Array.isArray(s) && s[0] === '辛' && s[1] === 'つら') s[1] = 'から';
    // AとBの 間に = あいだ ("between"), not ま
    if (Array.isArray(s) && s[0] === '間' && s[1] === 'ま' && typeof prev === 'string' && /の[\s　]*$/.test(prev)) s[1] = 'あいだ';
    // "2、3日" as a single word block: the 2、3 stays outside the kanji run
    if (Array.isArray(s) && s[0] === '日' && typeof prev === 'string' && /2、3$/.test(prev)) {
      segs[i - 1] = prev.slice(0, -3);
      segs[i] = ['2、3日', 'にさんにち'];
    }
    // 牛どん = ぎゅうどん (kuromoji splits it and reads うし)
    if (Array.isArray(s) && s[0] === '牛' && typeof next === 'string' && next.startsWith('どん')) s[1] = 'ぎゅう';
    // 2、3日 = にさんにち ("two or three days"), not に、みっか
    if (Array.isArray(s) && s[0] === '3日' && typeof prev === 'string' && /2、$/.test(prev)) {
      segs[i - 1] = prev.slice(0, -2);
      segs[i] = ['2、3日', 'にさんにち'];
    }
  });
  return segs;
}

function addText(t) {
  if (!t || texts[t] || !KANJI.test(t)) return;
  const segs = sentenceSegs(t);
  if (segs) {
    texts[t] = segs;
    for (const s of segs) if (Array.isArray(s)) vote(s[0], s[1]);
  }
}

for (const l of lessons) {
  addText(l.titleJp);
  l.patterns.forEach((p) => addText(p.jp));
  l.examples.forEach((e) => (addText(e.qjp), addText(e.ajp)));
  l.grammar.forEach((g) => (addText(g.title), (g.examples ?? []).forEach((e) => addText(e.jp))));
  l.phrases.forEach((p) => addText(p.jp));
  l.conversations.forEach((c) => c.lines.forEach((x) => (addText(x.jp), addText(x.name))));
  // Space-separated tokens (used by "ordena la frase")
  const all = [
    ...l.patterns.map((p) => p.jp),
    ...l.examples.flatMap((e) => [e.qjp, e.ajp]),
    ...l.grammar.flatMap((g) => (g.examples ?? []).map((e) => e.jp)),
    ...l.phrases.map((p) => p.jp),
    ...l.conversations.flatMap((c) => c.lines.map((x) => x.jp)),
  ].filter(Boolean);
  all.forEach((s) => s.split(/[\s　]+/).forEach(addText));
}
appendix.grammar.forEach((g) => (addText(g.title), (g.examples ?? []).forEach((e) => addText(e.jp))));

// Word blocks used alone (by "Ordena la frase") lose the context the rules above need
if (texts['2、3日']) texts['2、3日'] = [['2、3日', 'にさんにち']];
for (const [t, segs] of Object.entries(texts)) {
  if (/^間に/.test(t) && Array.isArray(segs[0]) && segs[0][1] === 'ま') segs[0] = ['間', 'あいだ'];
}

/* ---------- 3. Fallback dictionary: most voted reading per kanji run ---------- */
const d = {};
for (const [run, v] of runVotes) {
  d[run] = Object.entries(v).sort((a, b) => b[1] - a[1])[0][0];
}

fs.writeFileSync(path.join(dataDir, 'furigana.json'), JSON.stringify({ t: texts, d }));
const size = fs.statSync(path.join(dataDir, 'furigana.json')).size;
console.log(`furigana: ${Object.keys(texts).length} texts, ${Object.keys(d).length} kanji runs, ${(size / 1024).toFixed(0)} KB`);

// A few samples to eyeball
for (const s of ['何時から 何時までですか。', '私は 会社員です。', '食べます', 'あの 人', '日本語', '山田さん']) {
  const segs = texts[s] ?? sentenceSegs(s);
  console.log(s, '→', JSON.stringify(segs));
}
