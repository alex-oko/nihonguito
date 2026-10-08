// Generates the app's Japanese audio with a local VOICEVOX engine (https://voicevox.hiroshiba.jp/).
// 1. Open VOICEVOX (the engine listens on http://127.0.0.1:50021)
// 2. node tools/build-audio.mjs            (resumable: existing files are skipped)
//    options: --limit=50  --dry  --rate=1.0
// Output: public/audio/<key>.mp3 + public/audio/manifest.json
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
// lamejs 1.2.1 breaks when required as a module; its bundled build works fine
const vm = require('node:vm');
const lameCtx = {};
vm.createContext(lameCtx);
vm.runInContext(fs.readFileSync(require.resolve('lamejs/lame.all.js'), 'utf8') + ';this.lamejs = lamejs;', lameCtx);
const lamejs = lameCtx.lamejs;

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'public', 'data');
const outDir = path.join(root, 'public', 'audio');
const ENGINE = process.env.VOICEVOX_URL || 'http://127.0.0.1:50021';
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const LIMIT = args.limit ? Number(args.limit) : Infinity;
const SPEED = args.rate ? Number(args.rate) : 0.95;

/** Voices: [speaker name, style name] — a = general/female, b = second speaker (male) */
// Chosen by the user on 2026-10-07 for clarity, a bit slower than VOICEVOX's default
const VOICES = {
  a: ['No.7', 'アナウンス', { speed: 0.9 }],
  b: ['青山龍星', 'ノーマル', { speed: 0.9 }],
};

/* ---------- Reuse the app's own code (kana tables, cleaning, audio keys) ---------- */
const cacheDir = path.join(root, 'tools', '.cache');
fs.mkdirSync(cacheDir, { recursive: true });
const bundle = path.join(cacheDir, 'app-shared.mjs');
await esbuild.build({
  stdin: {
    contents: `
      export * from './src/app/utils/kana.utils';
      export { cleanForm } from './src/app/utils/questions.utils';
      export * from './src/app/utils/audio-key.utils';`,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundle,
  logLevel: 'error',
});
const app = await import(pathToFileURL(bundle).href);
const { KANA_ROWS, LOANWORDS, KATAKANA_RULES, cleanForm, cleanSpeech, audioKey } = app;

/* ---------- Collect every text the app speaks ---------- */
const jobs = new Map(); // key → { text, voice }
function add(text, voice = 'a') {
  if (!text || !/[぀-ヿ一-鿿]/.test(text)) return;
  const clean = cleanSpeech(text);
  if (!clean) return;
  const key = audioKey(text, voice);
  const prev = jobs.get(key);
  if (prev && prev.text !== clean) throw new Error(`Hash collision: ${prev.text} / ${clean}`);
  jobs.set(key, { text: clean, voice, orig: text });
}
const addWord = (kana) => {
  const f = cleanForm(kana);
  add(f.main);
  f.alts.forEach((a) => add(a));
};

// Kana first (most used)
for (const script of ['hiragana', 'katakana']) {
  for (const row of KANA_ROWS[script]) for (const c of row.cells) if (c) add(c.char);
}
LOANWORDS.forEach(([k]) => add(k));
KATAKANA_RULES.forEach((r) => r.examples.forEach(([k]) => add(k)));
add('こんにちは。いっしょに にほんごを べんきょうしましょう。');

const index = JSON.parse(fs.readFileSync(path.join(dataDir, 'lessons', 'index.json'), 'utf8'));
for (const { id } of index) {
  const l = JSON.parse(fs.readFileSync(path.join(dataDir, 'lessons', `${String(id).padStart(2, '0')}.json`), 'utf8'));
  l.vocab.forEach((w) => addWord(w.kana));
  l.conversations.forEach((c) => c.lines.forEach((x) => add(x.jp, x.who === 'B' ? 'b' : 'a')));
  l.patterns.forEach((p) => add(p.jp));
  l.examples.forEach((e) => (add(e.qjp), add(e.ajp)));
  l.phrases.forEach((p) => add(p.jp));
  l.grammar.forEach((g) => (g.examples ?? []).forEach((e) => add(e.jp)));
  l.extraVocab.forEach((x) => x.items.forEach((it) => add(it.kana || it.kanji)));
}
const appendix = JSON.parse(fs.readFileSync(path.join(dataDir, 'appendix.json'), 'utf8'));
appendix.verbs.forEach((v) => ['masu', 'dict', 'te', 'nai', 'ta'].forEach((f) => add(v[f])));
appendix.tables.forEach((t) => t.items.forEach((it) => add(it.kana || it.kanji)));
appendix.grammar.forEach((g) => (g.examples ?? []).forEach((e) => add(e.jp)));

fs.mkdirSync(outDir, { recursive: true });
const all = [...jobs.entries()];
// --redo=misato,asuka regenerates those voices (e.g. after changing the speaker or tuning)
const REDO = args.redo ? String(args.redo).split(',') : [];
const redo = ([, j]) => REDO.some((v) => j.voice === v || j.voice.startsWith(v + '-'));
const todo = all.filter((e) => redo(e) || !fs.existsSync(path.join(outDir, `${e[0]}.mp3`))).slice(0, LIMIT);
console.log(`${all.length} texts · ${all.length - todo.length} already done · ${todo.length} to generate`);

function writeManifest() {
  const done = all.map(([k]) => k).filter((k) => fs.existsSync(path.join(outDir, `${k}.mp3`)));
  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    JSON.stringify({ credits: [...new Set(Object.values(VOICES).map(([n]) => `VOICEVOX:${n}`))], keys: done }),
  );
  return done.length;
}

/* ---------- Reading fixes: texts VOICEVOX misreads are spoken from their verified kana ---------- */
const fixesFile = path.join(root, 'tools', 'speech-fixes.json');
const FIXES = fs.existsSync(fixesFile) ? JSON.parse(fs.readFileSync(fixesFile, 'utf8')) : {};
// --redo-fixed regenerates every text that has a reading fix
if (args['redo-fixed']) for (const e of all) if (FIXES[e[1].text] && !todo.includes(e)) todo.push(e);

// --prune=DIR moves recordings no text uses anymore into DIR (kept, not deleted)
if (args.prune) {
  const keep = new Set(all.map(([k]) => k));
  const dir = path.resolve(root, String(args.prune));
  fs.mkdirSync(dir, { recursive: true });
  const old = fs.readdirSync(outDir).filter((f) => f.endsWith('.mp3') && !keep.has(f.slice(0, -4)));
  for (const f of old) fs.renameSync(path.join(outDir, f), path.join(dir, f));
  writeManifest();
  console.log(`${old.length} audios sin uso movidos a ${dir}`);
  process.exit(0);
}

if (args.dry) {
  console.log(todo.slice(0, 10).map(([k, j]) => `${k} ${j.voice} ${j.text}`).join('\n'));
  process.exit(0);
}

/* ---------- VOICEVOX ---------- */
async function speakerId(name, style) {
  const speakers = await fetch(`${ENGINE}/speakers`).then((r) => r.json());
  const sp = speakers.find((s) => s.name === name) ?? speakers[0];
  const st = sp.styles.find((s) => s.name === style) ?? sp.styles[0];
  console.log(`voice: ${sp.name} (${st.name}) → id ${st.id}`);
  return st.id;
}

try {
  await fetch(`${ENGINE}/version`);
} catch {
  console.error(`No se encontró VOICEVOX en ${ENGINE}. Abre VOICEVOX y vuelve a ejecutar.`);
  process.exit(1);
}
if (args['check-readings']) {
  await checkReadings();
  process.exit(0);
}

/**
 * Compares how VOICEVOX reads each text with kanji against our verified furigana
 * (public/data/furigana.json) and writes the differences to tools/speech-fixes.json.
 */
async function checkReadings() {
  const { toKatakana } = require('wanakana');
  const { t: furi } = JSON.parse(fs.readFileSync(path.join(dataDir, 'furigana.json'), 'utf8'));
  const id = await speakerId(...VOICES.a);
  const cache = new Map();
  // Long vowels are written differently for kanji and kana input (セエ / セイ): compare the sound
  const E = 'エケセテネヘメレゲゼデベペ';
  const O = 'オコソトノホモヨロゴゾドボポョ';
  const sound = (k) => k.replace(new RegExp(`([${E}])イ`, 'g'), '$1エ').replace(new RegExp(`([${O}])ウ`, 'g'), '$1オ');
  const kanaOf = async (text) => {
    if (!cache.has(text)) {
      const q = await fetch(`${ENGINE}/audio_query?text=${encodeURIComponent(text)}&speaker=${id}`, { method: 'POST' });
      cache.set(text, sound((await q.json()).kana.replace(/['/_、？]/g, '')));
    }
    return cache.get(text);
  };
  // Words VOICEVOX was checked to misread (2026-10-07). Other differences found by the test are
  // artifacts of the katakana swap (売り場, 新しい…) or errors of our own furigana (牛どん).
  const MISREAD = new Set(['何', '日本', '日本人', '方', '暇', '会社', '2、3日', '何階', '今', '薬', '手', '君', '所', '山', '店', '川']);
  // Phone numbers are read digit by digit
  const DIGITS = ['ゼロ', 'イチ', 'ニイ', 'サン', 'ヨン', 'ゴオ', 'ロク', 'ナナ', 'ハチ', 'キュウ'];
  const phone = (t) =>
    t.replace(/\d{2,4}(?:の|-)\d{3,4}(?:-\d{4})?/g, (m) => m.replace(/\d/g, (d) => DIGITS[+d]).replace(/-/g, '、'));
  const fixes = {};
  const runs = new Map(); // "kanji: ours ← voicevox" → count
  const seen = new Set();
  let checked = 0;
  for (const [, j] of all) {
    if (seen.has(j.text) || !/[一-鿿々]/.test(j.text) || !furi[j.orig]) continue;
    seen.add(j.text);
    checked++;
    const segs = furi[j.orig].map((x) => (typeof x === 'string' ? cleanSpeech(x) : x));
    const join = (replace) =>
      segs.map((x, i) => (typeof x === 'string' ? x : replace.has(i) ? toKatakana(x[1]) : x[0])).join('');
    const original = await kanaOf(j.text);
    // Replace one kanji word at a time by its katakana reading: if the sound changes, VOICEVOX disagrees
    const wrong = new Set();
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (typeof s === 'string' || (!args.all && !MISREAD.has(s[0]))) continue;
      // Counters after a number (1週間, 3階, 4時) are read better by VOICEVOX itself
      if (/[0-9０-９]$/.test(typeof segs[i - 1] === 'string' ? segs[i - 1] : '')) continue;
      if ((await kanaOf(join(new Set([i])))) !== original) wrong.add(i);
    }
    const fixed = phone(join(wrong));
    if (fixed === j.text) continue;
    fixes[j.text] = fixed;
    for (const i of wrong) {
      const k = `${segs[i][0]} → ${segs[i][1]}`;
      runs.set(k, [...(runs.get(k) ?? []), j.text]);
    }
  }
  for (const [k, ex] of [...runs].sort((a, b) => b[1].length - a[1].length)) console.log(`${k}  × ${ex.length}  ${ex[0]}`);
  fs.writeFileSync(fixesFile, JSON.stringify(fixes, null, 1) + '\n');
  console.log(`\n${checked} textos revisados · ${Object.keys(fixes).length} con lectura corregida → tools/speech-fixes.json`);
}


const ids = {};
for (const v of new Set(todo.map(([, j]) => j.voice))) ids[v] = await speakerId(...VOICES[v]);

function wavToMp3(buf) {
  // Find the "data" chunk of the PCM16 mono WAV returned by VOICEVOX
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const rate = view.getUint32(24, true);
  let p = 12;
  while (p < buf.length - 8) {
    const id = buf.toString('ascii', p, p + 4);
    const size = view.getUint32(p + 4, true);
    if (id === 'data') {
      const samples = new Int16Array(buf.buffer.slice(buf.byteOffset + p + 8, buf.byteOffset + p + 8 + size));
      const enc = new lamejs.Mp3Encoder(1, rate, 40);
      const parts = [];
      for (let i = 0; i < samples.length; i += 1152) {
        const out = enc.encodeBuffer(samples.subarray(i, i + 1152));
        if (out.length) parts.push(Buffer.from(out));
      }
      parts.push(Buffer.from(enc.flush()));
      return Buffer.concat(parts);
    }
    p += 8 + size;
  }
  throw new Error('invalid wav');
}

async function synth(text, voice) {
  text = FIXES[text] ?? text;
  const id = ids[voice];
  const tune = VOICES[voice][2];
  const q = await fetch(`${ENGINE}/audio_query?text=${encodeURIComponent(text)}&speaker=${id}`, { method: 'POST' }).then(
    (r) => r.json(),
  );
  q.speedScale = SPEED * (tune?.speed ?? 1);
  if (tune?.pitch) q.pitchScale = tune.pitch;
  q.prePhonemeLength = 0.05;
  q.postPhonemeLength = 0.1;
  q.outputSamplingRate = 24000;
  q.outputStereo = false;
  const wav = await fetch(`${ENGINE}/synthesis?speaker=${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(q),
  });
  if (!wav.ok) throw new Error(`synthesis ${wav.status}`);
  return wavToMp3(Buffer.from(await wav.arrayBuffer()));
}

const t0 = Date.now();
let done = 0;
let failed = 0;
const CONCURRENCY = 2;
async function worker() {
  while (todo.length) {
    const [key, job] = todo.shift();
    try {
      fs.writeFileSync(path.join(outDir, `${key}.mp3`), await synth(job.text, job.voice));
    } catch (e) {
      failed++;
      console.error(`✗ ${job.text}: ${e.message}`);
    }
    done++;
    if (done % 50 === 0) {
      const rate = done / ((Date.now() - t0) / 1000);
      console.log(`${done} hechos · ${todo.length} restantes · ~${Math.round(todo.length / rate / 60)} min`);
      writeManifest();
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
const total = writeManifest();
const size = fs.readdirSync(outDir).reduce((s, f) => s + fs.statSync(path.join(outDir, f)).size, 0);
console.log(`Listo: ${total}/${all.length} audios (${(size / 1048576).toFixed(1)} MB), ${failed} errores`);
