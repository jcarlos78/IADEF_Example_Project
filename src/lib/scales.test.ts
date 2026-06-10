import { describe, expect, it } from "vitest";
import { getScale, isScaleId, SCALES, SCALE_IDS, type ScaleId } from "./scales";

describe("getScale", () => {
  it.each(SCALE_IDS)("returns the '%s' scale with a consistent id", (id) => {
    const scale = getScale(id);
    expect(scale.id).toBe(id);
    expect(scale.cards.length).toBeGreaterThan(0);
    expect(scale.label).toBeTypeOf("string");
  });

  it("throws with a message that includes the unknown id", () => {
    expect(() => getScale("foo")).toThrow(/Unknown scale: "foo"/);
  });

  it("lists the available scales in the error message", () => {
    expect(() => getScale("nope")).toThrow(/fibonacci.*fibonacci-mod.*tshirt/);
  });

  it("rejects an empty string", () => {
    expect(() => getScale("")).toThrow(/Unknown scale/);
  });
});

describe("isScaleId", () => {
  it.each(SCALE_IDS)("accepts '%s'", (id) => {
    expect(isScaleId(id)).toBe(true);
  });

  it.each(["", "foo", "FIBONACCI", " fibonacci ", "tshirt-xl"])("rejects '%s'", (id) => {
    expect(isScaleId(id)).toBe(false);
  });
});

describe("SCALES — shape defined by the spec", () => {
  it("Fibonacci: 10 cards (AC7)", () => {
    expect(SCALES.fibonacci.cards).toEqual(["0", "1", "2", "3", "5", "8", "13", "21", "?", "☕"]);
  });

  it("Modified Fibonacci: includes ½, 20, 40, 100", () => {
    expect(SCALES["fibonacci-mod"].cards).toEqual([
      "0",
      "½",
      "1",
      "2",
      "3",
      "5",
      "8",
      "13",
      "20",
      "40",
      "100",
      "?",
      "☕",
    ]);
  });

  it("T-shirt: XS..XXL + special cards", () => {
    expect(SCALES.tshirt.cards).toEqual(["XS", "S", "M", "L", "XL", "XXL", "?", "☕"]);
  });

  it("every scale ends with ? and ☕ as special cards", () => {
    for (const scale of Object.values(SCALES)) {
      const last2 = scale.cards.slice(-2);
      expect(last2).toEqual(["?", "☕"]);
    }
  });

  it("no scale has duplicate cards", () => {
    for (const scale of Object.values(SCALES)) {
      expect(new Set(scale.cards).size).toBe(scale.cards.length);
    }
  });
});

describe("SCALE_IDS", () => {
  it("exposes exactly the 3 declared scales", () => {
    expect(SCALE_IDS.sort()).toEqual(
      (["fibonacci", "fibonacci-mod", "tshirt"] as ScaleId[]).sort(),
    );
  });
});
