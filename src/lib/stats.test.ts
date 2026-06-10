import { describe, expect, it } from "vitest";
import { summarize } from "./stats";

describe("summarize — AC5 (mean/min/max)", () => {
  it("empty list: everything null, counts empty", () => {
    expect(summarize([])).toEqual({ average: null, min: null, max: null, counts: {} });
  });

  it("purely numeric votes (Fibonacci)", () => {
    const r = summarize(["1", "2", "3", "5"]);
    expect(r.average).toBe(2.75);
    expect(r.min).toBe(1);
    expect(r.max).toBe(5);
    expect(r.counts).toEqual({ "1": 1, "2": 1, "3": 1, "5": 1 });
  });

  it("single vote", () => {
    expect(summarize(["8"])).toEqual({
      average: 8,
      min: 8,
      max: 8,
      counts: { "8": 1 },
    });
  });

  it("ignores ? and ☕ in the numeric calculation but counts them in counts", () => {
    const r = summarize(["3", "5", "?", "☕", "5"]);
    expect(r.average).toBeCloseTo((3 + 5 + 5) / 3, 5);
    expect(r.min).toBe(3);
    expect(r.max).toBe(5);
    expect(r.counts).toEqual({ "3": 1, "5": 2, "?": 1, "☕": 1 });
  });

  it("only special cards: mean/min/max null, counts preserved", () => {
    const r = summarize(["?", "☕", "?"]);
    expect(r.average).toBeNull();
    expect(r.min).toBeNull();
    expect(r.max).toBeNull();
    expect(r.counts).toEqual({ "?": 2, "☕": 1 });
  });

  it("T-shirt scale (all non-numeric): mean/min/max null", () => {
    const r = summarize(["S", "M", "M", "L", "XL"]);
    expect(r.average).toBeNull();
    expect(r.min).toBeNull();
    expect(r.max).toBeNull();
    expect(r.counts).toEqual({ S: 1, M: 2, L: 1, XL: 1 });
  });

  it("½ is treated as 0.5 in the calculation", () => {
    const r = summarize(["0", "½", "1"]);
    expect(r.average).toBeCloseTo((0 + 0.5 + 1) / 3, 5);
    expect(r.min).toBe(0);
    expect(r.max).toBe(1);
    expect(r.counts["½"]).toBe(1);
  });

  it("Modified Fibonacci with 100", () => {
    const r = summarize(["13", "20", "40", "100"]);
    expect(r.average).toBeCloseTo((13 + 20 + 40 + 100) / 4, 5);
    expect(r.min).toBe(13);
    expect(r.max).toBe(100);
  });

  it("duplicates are aggregated in counts and contribute to the mean", () => {
    const r = summarize(["5", "5", "5", "5"]);
    expect(r.average).toBe(5);
    expect(r.min).toBe(5);
    expect(r.max).toBe(5);
    expect(r.counts).toEqual({ "5": 4 });
  });

  it("T-shirt + ? mix: mean/min/max null", () => {
    const r = summarize(["M", "L", "?"]);
    expect(r.average).toBeNull();
    expect(r.min).toBeNull();
    expect(r.max).toBeNull();
    expect(r.counts).toEqual({ M: 1, L: 1, "?": 1 });
  });
});
