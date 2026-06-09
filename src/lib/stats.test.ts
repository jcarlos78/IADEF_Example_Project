import { describe, expect, it } from "vitest";
import { summarize } from "./stats";

describe("summarize — AC5 (média/min/max)", () => {
  it("lista vazia: tudo null, counts vazio", () => {
    expect(summarize([])).toEqual({ average: null, min: null, max: null, counts: {} });
  });

  it("votos numéricos puros (Fibonacci)", () => {
    const r = summarize(["1", "2", "3", "5"]);
    expect(r.average).toBe(2.75);
    expect(r.min).toBe(1);
    expect(r.max).toBe(5);
    expect(r.counts).toEqual({ "1": 1, "2": 1, "3": 1, "5": 1 });
  });

  it("voto único", () => {
    expect(summarize(["8"])).toEqual({
      average: 8,
      min: 8,
      max: 8,
      counts: { "8": 1 },
    });
  });

  it("ignora ? e ☕ no cálculo numérico mas conta em counts", () => {
    const r = summarize(["3", "5", "?", "☕", "5"]);
    expect(r.average).toBeCloseTo((3 + 5 + 5) / 3, 5);
    expect(r.min).toBe(3);
    expect(r.max).toBe(5);
    expect(r.counts).toEqual({ "3": 1, "5": 2, "?": 1, "☕": 1 });
  });

  it("apenas cartas especiais: média/min/max null, counts mantido", () => {
    const r = summarize(["?", "☕", "?"]);
    expect(r.average).toBeNull();
    expect(r.min).toBeNull();
    expect(r.max).toBeNull();
    expect(r.counts).toEqual({ "?": 2, "☕": 1 });
  });

  it("escala T-shirt (todas não-numéricas): média/min/max null", () => {
    const r = summarize(["S", "M", "M", "L", "XL"]);
    expect(r.average).toBeNull();
    expect(r.min).toBeNull();
    expect(r.max).toBeNull();
    expect(r.counts).toEqual({ S: 1, M: 2, L: 1, XL: 1 });
  });

  it("½ é tratado como 0.5 no cálculo", () => {
    const r = summarize(["0", "½", "1"]);
    expect(r.average).toBeCloseTo((0 + 0.5 + 1) / 3, 5);
    expect(r.min).toBe(0);
    expect(r.max).toBe(1);
    expect(r.counts["½"]).toBe(1);
  });

  it("Fibonacci modificada com 100", () => {
    const r = summarize(["13", "20", "40", "100"]);
    expect(r.average).toBeCloseTo((13 + 20 + 40 + 100) / 4, 5);
    expect(r.min).toBe(13);
    expect(r.max).toBe(100);
  });

  it("duplicatas são agregadas em counts e contam para média", () => {
    const r = summarize(["5", "5", "5", "5"]);
    expect(r.average).toBe(5);
    expect(r.min).toBe(5);
    expect(r.max).toBe(5);
    expect(r.counts).toEqual({ "5": 4 });
  });

  it("mistura T-shirt + ? : média/min/max null", () => {
    const r = summarize(["M", "L", "?"]);
    expect(r.average).toBeNull();
    expect(r.min).toBeNull();
    expect(r.max).toBeNull();
    expect(r.counts).toEqual({ M: 1, L: 1, "?": 1 });
  });
});
