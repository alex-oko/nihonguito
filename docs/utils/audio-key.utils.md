# Utils de clave de audio (`audio-key.utils.ts`)

Cómo se calcula el nombre del mp3 pregrabado de un texto japonés. Lo comparten dos programas que tienen que llegar **exactamente** al mismo nombre: la app ([`SpeechService`](../services/speech.service.md)), que busca el audio de lo que va a decir, y `tools/build-audio.mjs`, que genera los audios. Por eso vive en un archivo propio, sin Angular: el script lo importa tal cual con esbuild.

## Conceptos

- **Clave de audio**: el nombre del archivo sin extensión. El mp3 está en `public/audio/<clave>.mp3` y la app lo pide como `audio/<clave>.mp3`.
- **Voz**: el primer carácter de la clave. `a` = voz general (femenina, VOICEVOX «No.7», estilo アナウンス); `b` = segundo hablante de las conversaciones (masculino, VOICEVOX «青山龍星»). El tipo `Voice` de [speech.interface.ts](../../src/app/interfaces/speech.interface.ts) es `string`.
- **Texto limpio**: el texto como se habla, sin espacios entre palabras ni marcas de hueco. Dos textos que solo se diferencian en eso comparten audio.
- **cyrb53**: una función hash de 53 bits, rápida y sin dependencias, que da el mismo resultado en el navegador y en Node.

## Constantes

No tiene constantes de módulo. Las semillas del hash (`0xdeadbeef`, `0x41c6ce57`) y los multiplicadores son los del algoritmo cyrb53 original.

---

## Funciones

#### `cleanSpeech(text)`

- **Qué hace**: deja el texto listo para hablarlo.
- **Cómo**:
  1. Quita `～` y `〜` (marcan el hueco en patrones como `～を たべます`).
  2. Quita los corchetes `［ ］` o `[ ]` y deja su contenido.
  3. Quita todos los espacios.
- **Quién la llama**: `audioKey`, `SpeechService.speakTts` (lo que lee la voz del sistema) y `tools/build-audio.mjs` (lo que lee VOICEVOX).
- **Ejemplo**: `'～を たべます'` → `'をたべます'`; `'［わたし］は がくせい です'` → `'わたしはがくせいです'`.

#### `cyrb53(text, seed = 0)` (privada)

- **Qué hace**: el hash cyrb53 del texto, en base 36.
- **Cómo**: dos acumuladores de 32 bits que mezclan cada carácter con `Math.imul`; al final se juntan los 21 bits bajos de uno con los 32 del otro (53 bits, el mayor entero exacto de JavaScript) y se pasa a base 36.
- **Quién la llama**: `audioKey`.

#### `audioKey(text, voice = 'a')`

- **Qué hace**: la clave del audio de un texto con una voz.
- **Cómo**: `voz + cyrb53(cleanSpeech(text))`.
- **Quién la llama**: `SpeechService.recordingFor` (con `'a'` o `'b'`) y `tools/build-audio.mjs`.
- **Ejemplo**: `audioKey('あ')` → `'azdsz9ub20o'`; `audioKey('あ', 'b')` → `'bzdsz9ub20o'` (mismo hash, otra voz). `'わたし は がくせい です'` y `'わたしはがくせいです'` dan la misma clave, `'aook6s4zasa'`.

---

## Relación con `tools/build-audio.mjs`

1. El script empaqueta con esbuild un módulo que hace `export * from './src/app/utils/audio-key.utils'` (junto con `kana.utils` y `cleanForm` de `questions.utils`) y lo importa. Así usa **el mismo código** que la app, sin copias.
2. Recorre todo lo que la app puede decir (kana, vocabulario, conversaciones, patrones, ejemplos, frases, gramática y el apéndice) y para cada texto calcula `audioKey(text, voz)`. En las conversaciones, el hablante B usa la voz `b`; todo lo demás, la `a`.
3. Si dos textos limpios distintos dan la misma clave, se para con `Hash collision`.
4. Genera con VOICEVOX los mp3 que falten (`public/audio/<clave>.mp3`). Los textos que VOICEVOX lee mal se hablan desde su kana verificado (`tools/speech-fixes.json`).
5. Escribe `public/audio/manifest.json` = `{ credits, keys }` con las claves que tienen mp3. La app lo lee al arrancar (`SpeechService.loadManifest`) y solo pide mp3 de esas claves.

**Si cambias `cleanSpeech`, `cyrb53` o `audioKey`**, las claves cambian: la app dejará de encontrar los mp3 existentes (caerá a la voz del sistema) hasta que se regeneren todos los audios con el script. Los exports `cleanSpeech` y `audioKey` tampoco se pueden renombrar sin cambiar el script.
