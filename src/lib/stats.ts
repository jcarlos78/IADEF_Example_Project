export interface VoteSummary {
  average: number | null;
  min: number | null;
  max: number | null;
  counts: Record<string, number>;
}

const SPECIAL_CARDS = new Set(["?", "☕"]);

function cardToNumber(card: string): number | null {
  if (SPECIAL_CARDS.has(card)) return null;
  if (card === "½") return 0.5;
  const n = Number(card);
  return Number.isFinite(n) ? n : null;
}

export function summarize(votes: readonly string[]): VoteSummary {
  const counts: Record<string, number> = {};
  const numbers: number[] = [];

  for (const v of votes) {
    counts[v] = (counts[v] ?? 0) + 1;
    const n = cardToNumber(v);
    if (n !== null) numbers.push(n);
  }

  if (numbers.length === 0) {
    return { average: null, min: null, max: null, counts };
  }

  const sum = numbers.reduce((a, b) => a + b, 0);
  return {
    average: sum / numbers.length,
    min: Math.min(...numbers),
    max: Math.max(...numbers),
    counts,
  };
}
