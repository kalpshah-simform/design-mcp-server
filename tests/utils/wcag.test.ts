import { describe, it, expect } from "vitest";
import {
  contrastRatio,
  WCAG_AA_NORMAL,
  WCAG_AA_LARGE,
  WCAG_AAA_NORMAL,
} from "../../src/utils/wcag.js";

describe("contrastRatio", () => {
  it("black on white = 21:1 (maximum)", () => {
    const ratio = contrastRatio("#000000", "#FFFFFF");
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeCloseTo(21, 0);
  });

  it("white on white = 1:1 (minimum)", () => {
    const ratio = contrastRatio("#FFFFFF", "#FFFFFF");
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeCloseTo(1, 1);
  });

  it("is symmetric — order of arguments does not matter", () => {
    const r1 = contrastRatio("#0052CC", "#FFFFFF");
    const r2 = contrastRatio("#FFFFFF", "#0052CC");
    expect(r1).toBeCloseTo(r2!, 5);
  });

  it("returns null for unparseable hex strings", () => {
    expect(contrastRatio("not-a-color", "#FFFFFF")).toBeNull();
    expect(contrastRatio("#FFFFFF", "rgb(0,0,0)")).toBeNull();
  });

  it("accepts 3-digit shorthand hex", () => {
    const full = contrastRatio("#000000", "#FFFFFF");
    const short = contrastRatio("#000", "#FFF");
    expect(short).toBeCloseTo(full!, 5);
  });

  it("primary blue #0052CC on white passes WCAG AA", () => {
    const ratio = contrastRatio("#0052CC", "#FFFFFF");
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it("light gray #61646C on white may not pass AAA", () => {
    const ratio = contrastRatio("#61646C", "#FFFFFF");
    expect(ratio).not.toBeNull();
    // AA large text threshold is 3:1 — just verify a real number is returned
    expect(ratio!).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
  });

  it("constants are in the right order", () => {
    expect(WCAG_AA_LARGE).toBeLessThan(WCAG_AA_NORMAL);
    expect(WCAG_AA_NORMAL).toBeLessThan(WCAG_AAA_NORMAL);
  });
});
