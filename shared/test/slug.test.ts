import { describe, expect, it } from "vitest";
import { slugify, slugWithSuffix } from "../src/slug";

describe("slugify", () => {
  it("handles English headlines", () => {
    expect(slugify("  Heavy Rain in Pune: Schools Closed!  ")).toBe("heavy-rain-in-pune-schools-closed");
  });

  it("keeps Marathi text with its vowel signs", () => {
    expect(slugify("पुण्यात मुसळधार पाऊस; शाळांना सुट्टी")).toBe("पुण्यात-मुसळधार-पाऊस-शाळांना-सुट्टी");
  });

  it("truncates on a word boundary", () => {
    const slug = slugify("शेतकरी ".repeat(30), 40);
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug.split("-").every((w) => w === "शेतकरी")).toBe(true);
  });

  it("adds a suffix within the length limit", () => {
    const slug = slugWithSuffix("a ".repeat(100), "k3x9");
    expect(slug.endsWith("-k3x9")).toBe(true);
    expect(slug.length).toBeLessThanOrEqual(80);
  });
});
