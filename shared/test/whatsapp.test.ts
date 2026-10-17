import { describe, expect, it } from "vitest";
import { bulletinJobId, bulletinParams, normalizePhone, optKeyword, renderBulletin, subscriberId } from "../src/whatsapp";

describe("normalizePhone", () => {
  it.each([
    ["9876543210", "+919876543210"],
    ["098765 43210", "+919876543210"],
    ["+91 98765-43210", "+919876543210"],
    ["919876543210", "+919876543210"],
    ["0091 9876543210", "+919876543210"],
    ["+44 7911 123456", "+447911123456"],
  ])("normalises %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "12345", "5876543210", "+91 12345 67890", "98765432101", "phone", "+1"])("rejects %j", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });

  it("uses the bare number as document ID", () => {
    expect(subscriberId("+919876543210")).toBe("919876543210");
  });
});

describe("bulletin", () => {
  const params = bulletinParams({
    headline: "पुण्यात   मुसळधार\nपाऊस",
    summary: "शाळांना\tसुट्टी",
    isBreaking: true,
    url: "https://example.com/news/x",
  });

  it("makes template-safe parameters", () => {
    expect(params).toEqual(["ब्रेकिंग न्यूज", "पुण्यात मुसळधार पाऊस", "शाळांना सुट्टी", "https://example.com/news/x"]);
    expect(params.join("")).not.toMatch(/[\n\t]| {2,}/);
  });

  it("truncates long text", () => {
    const p = bulletinParams({ headline: "क".repeat(300), summary: "", isBreaking: false, url: "u" });
    expect(p[1].length).toBe(200);
    expect(p[2]).toBe("क".repeat(300)); // no summary: the full headline, within its own 600 limit
  });

  it("renders the preview in the spec's format", () => {
    const text = renderBulletin(params);
    expect(text.startsWith("स्वराज्य न्यूज — ब्रेकिंग न्यूज\n\nपुण्यात मुसळधार पाऊस\n\nशाळांना सुट्टी")).toBe(true);
    expect(text).toContain("https://example.com/news/x");
    expect(text).toContain("STOP");
  });

  it("gives one job per article and group", () => {
    expect(bulletinJobId("n1", "ALL")).toBe("n1__ALL");
    expect(bulletinJobId("n1", "district-pune")).toBe("n1__district-pune");
  });

  it("recognises opt-out and opt-in replies", () => {
    expect(optKeyword(" STOP ")).toBe("OUT");
    expect(optKeyword("बंद")).toBe("OUT");
    expect(optKeyword("Start")).toBe("IN");
    expect(optKeyword("stop sending politics")).toBeNull();
  });
});
