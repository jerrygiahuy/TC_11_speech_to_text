import assert from "node:assert/strict";
import { test } from "node:test";
import { reviseWords, speakerTurns, type SpeakerWord } from "./speakers";

const word = (text: string, start: number, speaker: number | null = 1): SpeakerWord => ({ text, start_ms: start, end_ms: start + 500, speaker, overlap: false });

test("5s + 3s revision replaces old text and forms one complete speaker turn", () => {
  const first = [word("tôi", 0), word("bị", 1000), word("đau", 3000)];
  const final = reviseWords(first, { replace_from_ms: 0, words: [...first, word("họng", 5000), word("ba", 6000), word("ngày", 7000)] });
  const turns = speakerTurns(final);
  assert.equal(turns.length, 1);
  assert.equal(turns[0].text, "tôi bị đau họng ba ngày");
  assert.equal(turns[0].speaker, 1);
});

test("A B A changes are preserved; repeats are not removed as overlap text", () => {
  const words = [word("đau", 0, 1), word("đau", 600, 1), word("ở", 1200, 2), word("đâu", 1800, 2), word("họng", 2400, 1)];
  assert.deepEqual(speakerTurns(words).map((turn) => [turn.speaker, turn.text]), [[1,"đau đau"], [2,"ở đâu"], [1,"họng"]]);
  const revised = reviseWords(words, { replace_from_ms: 1200, words: [word("ở",1200,2), word("đâu",1800,2), word("cổ",2400,1)] });
  assert.equal(speakerTurns(revised)[0].text, "đau đau");
  assert.equal(speakerTurns(revised)[2].text, "cổ");
});
