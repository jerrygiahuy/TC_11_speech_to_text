export type SpeakerWord = { text: string; start_ms: number; end_ms: number; speaker: number | null; overlap: boolean };
export type SpeakerTurn = { speaker: number | null; text: string; start_ms: number; end_ms: number; overlap: boolean };

export function reviseWords(previous: SpeakerWord[], update: { replace_from_ms: number; words: SpeakerWord[] }): SpeakerWord[] {
  return [...previous.filter((word) => word.start_ms < update.replace_from_ms), ...update.words];
}

export function speakerTurns(words: SpeakerWord[]): SpeakerTurn[] {
  const turns: SpeakerTurn[] = [];
  for (const word of words) {
    const last = turns.at(-1);
    if (last && last.speaker === word.speaker && last.overlap === word.overlap && word.start_ms - last.end_ms < 2000) {
      last.text += ` ${word.text}`;
      last.end_ms = word.end_ms;
    } else turns.push({ ...word });
  }
  return turns;
}
