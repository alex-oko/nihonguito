# Content guide for Nihonguito

All lesson content is **original** and about **everyday life**. It must not copy sentences, dialogues, characters or fictional places from any textbook, nor reference anime, songs, series or other copyrighted works by name. The learner speaks Spanish, so every translation (`es`) and explanation is in natural, neutral Latin American Spanish.

The source of truth is `content/lessons/NN.json`. `tools/build-data.mjs` copies it to `public/data/`. Check every lesson with `node tools/validate-content.mjs NN`.

## Cast (use these characters in dialogues and examples)

| Name (in Japanese) | Who they are |
|---|---|
| ルシア (Lucía García) | Mexican, 24. Has just arrived in Tokyo to work as a designer at Aoba Shōji. Curious, likes cooking and traveling. Main protagonist. |
| なかむら ゆい (中村) | Japanese, 26. Lucía's coworker. Kind, organized, plays tennis and likes music (piano). |
| きのした けんた (木下) | Japanese, 21. Student at Hikari University, lives in Lucía's building. Fan of anime and video games, works part-time in a café. |
| もり さん (森) | Lucía's boss at Aoba Shōji (a man). Formal, around 50, likes golf and old movies. |
| カルロス (Carlos Ruiz) | Spanish, 30. Lucía's classmate at the Japanese school. Cook, loves food and soccer. |
| アンナ (Anna Weber) | German, 28. Engineer, Carlos's friend. Likes mountains, trains and photography. |
| たなか さん (田中) | Owner of the café where Kenta works. Friendly, around 60. |

Generic roles (`name` in kana): てんいん, えきいん, うけつけ, いしゃ, うんてんしゅ, ふどうさんや, etc.

**Voices:** `who: "A"` = female voice (ルシア, なかむら, アンナ), `who: "B"` = male voice (きのした, もり, カルロス, たなか). Generic roles: choose according to the character.

## Original places

- あおばしょうじ (あおば商事 / Aoba Shōji): the company where Lucía, Yui and Mrs. Mori work.
- ひかりだいがく (ひかり大学): Kenta's university.
- ことのは日本語学校 (ことのはにほんごがっこう): the language school of Lucía and Carlos.
- カフェ「こもれび」: Mr. Tanaka's café, where Kenta works.
- あさひびょういん (あさひ病院): hospital.
- Real cities and places (東京, 大阪, 京都, 富士山, 北海道, 沖縄…) are allowed.
- Use generic stores (コンビニ, スーパー, デパート, ほんや…), never real brands.

## Learner interests (tags)

`viajes`, `comida`, `trabajo`, `estudios`, `anime`, `videojuegos`, `deporte`, `musica`.

- `anime`, `videojuegos` and `musica` are generic hobbies: アニメを 見ます, ゲームを します, ピアノを ひきます. **Never** use titles, characters, studios, bands or real songs.
- Any sentence may have `"tags": ["comida"]` when it clearly fits an interest. Sentences without tags are general.

## Lesson file format

Keep exactly the same structure as the current file. These are the rules for each field:

- `id`, `vocab`: **do not change ids, order or number of words.** Only `type: "name"` entries that are textbook places or companies (fictional universities, companies, hospitals, stores, TV, products) are replaced, keeping their `id`, with our places or with real, generic ones. Real countries, cities and famous people stay.
- `title` (Spanish) and `titleJp`: a new short title for the lesson that matches the new dialogues.
- `summary`: 1–2 sentences describing the situation in the new dialogues.
- `patterns`: 4 key sentences of the lesson (the grammar in its simplest form).
- `examples`: 7–8 question–answer pairs `{qjp, qes, ajp, aes}` from daily life.
- `grammar`: keep `title` and the content of `explain` (they are our own explanations). **Rewrite every `examples` entry** (1–2 per point) with new sentences, using exactly the construction of that point (it must literally appear, e.g. ～てください).
- `phrases`: 4–5 useful expressions taken from the new dialogues.
- `conversations`: 2 new dialogues `{id: "LNN-c1", lesson: N, title, situation, lines}`, 8–10 lines, between our characters (`who` according to the voice above, `name` in kana: ルシア, なかむら, きのした, もり, カルロス, アンナ, たなか). Natural everyday situations: work, a café, the station, shopping, plans with friends, the doctor…
- `extraVocab`: keep it (generic word lists). Fix a topic only if it mentions something from the textbook.
- `culture`: 1–2 short notes about real life in Japan, written in your own words.
- `extras`: **16 extra sentences, 2 per interest** (each with exactly one tag), `{jp, es, tags: ["viajes"]}`. Short, useful sentences that the learner would say about their own life.

## Japanese rules

1. **Level:** use only the grammar of this lesson and earlier ones (the order of the current file's `grammar` points). Vocabulary: preferably words from this and previous lessons; very basic everyday words are allowed (ごはん, ともだち, コーヒー…) if they don't add new grammar.
2. **Spacing:** separate words with a space as the current content does: each word + its particle forms one block. Example: `わたしは まいにち コーヒーを のみます。` / `ルシアさんは メキシコから 来ました。` The "Ordena la frase" exercise uses those blocks; a sentence should have between 2 and 8 blocks.
3. **Kanji:** use kanji only for words whose vocabulary entry has kanji (in this or an earlier lesson) and for very common names (日本, 東京, 中村). Everything else goes in hiragana. Everyday katakana as usual.
4. **Punctuation:** end with 。 (or ？ only in casual speech). The `、` comma is allowed. Use `…` to separate question and answer within one example sentence.
5. **Politeness:** です／ます up to lesson 19; from lesson 20 on, plain style is used where the lesson's grammar calls for it (between friends).
6. **Correctness above all:** natural Japanese that a native speaker would say. If in doubt, choose the simpler sentence.
7. **Spanish:** a natural translation (not word for word), for example 「おさきに しつれいします」→ "Me voy primero, con permiso".

## Story thread (one situation per lesson)

The lessons follow Lucía's first months in Japan. Each lesson's dialogues happen in this situation; the examples can be about any character or everyday life.

| L | Situation of the dialogues |
|---|---|
| 1 | (done, it is the model) Lucía's first day at Aoba; she meets Yui and her neighbor Kenta. |
| 2 | Lucía gives Yui a little Mexican chocolate; at the office they look for the owner of an umbrella and a notebook (これ／それ／あれ). |
| 3 | Yui shows Lucía around the company building (cafeteria, restroom, meeting room); Lucía buys a bag at a department store. |
| 4 | Lucía calls the Kotonoha school to ask about the schedule; she talks with Yui about her daily routine. |
| 5 | At the station, Lucía asks which platform the train to Yokohama leaves from; on Monday Carlos and Lucía talk about where they went on the weekend. |
| 6 | Kenta invites Lucía to eat ramen; Lucía invites Yui to the movies on Saturday. |
| 7 | Lucía visits Yui's house (slippers, tea); birthday presents (Carlos turns 30). |
| 8 | Lucía describes her new apartment and Tokyo; first visit to Mr. Tanaka's café. |
| 9 | At the café they talk about hobbies (Kenta anime and games, Carlos soccer); Yui invites Lucía to a concert, but Lucía can't (because she has work). |
| 10 | Lucía looks for things in the supermarket (where is the soy sauce?); Anna looks for the café in the big station. |
| 11 | At the post office Lucía sends a package to Mexico; they talk about their families (how many siblings). |
| 12 | Lucía is back from a trip to Kyoto with Anna (how was it); a comparison of coffee vs. tea and seasons in the café. |
| 13 | Weekend plans (they want to go to Hokkaido); ordering at a restaurant with Carlos and Anna. |
| 14 | Mr. Mori asks Lucía for help at the office (copies, documents); a taxi ride with Yui. |
| 15 | Asking for permission (taking photos at a museum, using the meeting room); Lucía meets Anna's friends at a party (where do you live, what do you do). |
| 16 | Kenta explains how to use the ticket machine / the bank ATM; a weekend in Kamakura. |
| 17 | Lucía has a cold and goes to the doctor at Asahi Hospital; an urgent task at the office before Friday. |
| 18 | Hobbies and abilities (Yui plays the piano, Anna can drive); booking a tea ceremony class. |
| 19 | Experiences in Japan (have you climbed Mount Fuji?); Carlos's diet "starting tomorrow". |
| 20 | Casual chat between Kenta and Lucía about summer plans; the same topic in polite style with Mr. Mori. |
| 21 | Opinions about life in Japan; tonight's soccer match on TV (Carlos and Kenta). |
| 22 | Carlos looks for an apartment with a real estate agent; at a party: who is the person wearing glasses? |
| 23 | Lucía asks for directions to Anna's house; how to use the convenience store copier. |
| 24 | Lucía's mother sends her a package; they help Kenta with his move. |
| 25 | Farewell party: Anna goes back to Germany; plans for the future (if I have money, I'll travel…). |

## Notes on existing text

- `grammar[].explain` and `culture` sometimes mention textbook names (for example 'Miller-san', 'IMC'): replace those mentions with our characters or places, without changing the explanation.
