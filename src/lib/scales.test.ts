import { describe, expect, it } from "vitest";
import { getScale, isScaleId, SCALES, SCALE_IDS, type ScaleId } from "./scales";

describe("getScale", () => {
  it.each(SCALE_IDS)("retorna a escala '%s' com id consistente", (id) => {
    const scale = getScale(id);
    expect(scale.id).toBe(id);
    expect(scale.cards.length).toBeGreaterThan(0);
    expect(scale.label).toBeTypeOf("string");
  });

  it("lança erro com mensagem que inclui o id desconhecido", () => {
    expect(() => getScale("foo")).toThrow(/Escala desconhecida: "foo"/);
  });

  it("lista as escalas disponíveis na mensagem de erro", () => {
    expect(() => getScale("nope")).toThrow(/fibonacci.*fibonacci-mod.*tshirt/);
  });

  it("rejeita string vazia", () => {
    expect(() => getScale("")).toThrow(/Escala desconhecida/);
  });
});

describe("isScaleId", () => {
  it.each(SCALE_IDS)("aceita '%s'", (id) => {
    expect(isScaleId(id)).toBe(true);
  });

  it.each(["", "foo", "FIBONACCI", " fibonacci ", "tshirt-xl"])("rejeita '%s'", (id) => {
    expect(isScaleId(id)).toBe(false);
  });
});

describe("SCALES — formato definido no spec", () => {
  it("Fibonacci: 10 cartas (AC7)", () => {
    expect(SCALES.fibonacci.cards).toEqual(["0", "1", "2", "3", "5", "8", "13", "21", "?", "☕"]);
  });

  it("Fibonacci modificada: inclui ½, 20, 40, 100", () => {
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

  it("T-shirt: XS..XXL + cartas especiais", () => {
    expect(SCALES.tshirt.cards).toEqual(["XS", "S", "M", "L", "XL", "XXL", "?", "☕"]);
  });

  it("toda escala termina com ? e ☕ como cartas especiais", () => {
    for (const scale of Object.values(SCALES)) {
      const last2 = scale.cards.slice(-2);
      expect(last2).toEqual(["?", "☕"]);
    }
  });

  it("nenhuma escala tem cartas duplicadas", () => {
    for (const scale of Object.values(SCALES)) {
      expect(new Set(scale.cards).size).toBe(scale.cards.length);
    }
  });
});

describe("SCALE_IDS", () => {
  it("expõe exatamente as 3 escalas declaradas", () => {
    expect(SCALE_IDS.sort()).toEqual(
      (["fibonacci", "fibonacci-mod", "tshirt"] as ScaleId[]).sort(),
    );
  });
});
