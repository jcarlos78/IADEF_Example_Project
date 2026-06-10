export type ScaleId = "fibonacci" | "fibonacci-mod" | "tshirt";

export interface Scale {
  id: ScaleId;
  label: string;
  cards: readonly string[];
}

export const SCALES: Record<ScaleId, Scale> = {
  fibonacci: {
    id: "fibonacci",
    label: "Fibonacci",
    cards: ["0", "1", "2", "3", "5", "8", "13", "21", "?", "☕"],
  },
  "fibonacci-mod": {
    id: "fibonacci-mod",
    label: "Modified Fibonacci",
    cards: ["0", "½", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?", "☕"],
  },
  tshirt: {
    id: "tshirt",
    label: "T-shirt",
    cards: ["XS", "S", "M", "L", "XL", "XXL", "?", "☕"],
  },
};

export const SCALE_IDS = Object.keys(SCALES) as ScaleId[];

export function isScaleId(id: string): id is ScaleId {
  return id in SCALES;
}

export function getScale(id: string): Scale {
  if (isScaleId(id)) {
    return SCALES[id];
  }
  throw new Error(`Unknown scale: "${id}". Use one of: ${SCALE_IDS.join(", ")}.`);
}
