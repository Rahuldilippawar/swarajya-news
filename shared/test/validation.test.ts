import { describe, expect, it } from "vitest";
import { hasErrors, isAllowedImageUrl, validateNews, type NewsFormInput } from "../src/validation";

const complete: NewsFormInput = {
  headline: "जिल्ह्यात नवीन पूल वाहतुकीसाठी खुला",
  summary: "बहुप्रतिक्षित पूल आज नागरिकांसाठी खुला करण्यात आला.",
  content: "x".repeat(60),
  categoryId: "local",
  districtId: "pune",
  youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
};

describe("validateNews", () => {
  it("accepts a complete submission", () => {
    expect(validateNews(complete, "submit")).toEqual({});
  });

  it("lets a draft omit everything except the headline", () => {
    expect(validateNews({ ...complete, summary: "", content: "", categoryId: "", districtId: "" }, "draft")).toEqual({});
  });

  it("requires category, district, summary and content on submit", () => {
    const errors = validateNews({ ...complete, summary: "", content: "", categoryId: "", districtId: "" }, "submit");
    expect(Object.keys(errors).sort()).toEqual(["categoryId", "content", "districtId", "summary"]);
  });

  it("rejects a non-YouTube video link even on drafts", () => {
    expect(hasErrors(validateNews({ ...complete, youtubeUrl: "https://vimeo.com/123" }, "draft"))).toBe(true);
  });
});

describe("isAllowedImageUrl", () => {
  it("accepts https and the local emulator only", () => {
    expect(isAllowedImageUrl("https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg")).toBe(true);
    expect(isAllowedImageUrl("http://127.0.0.1:9199/v0/b/x/o/a.jpg")).toBe(true);
    expect(isAllowedImageUrl("http://evil.example/a.jpg")).toBe(false);
    expect(isAllowedImageUrl("http://127.0.0.1.evil.example/a.jpg")).toBe(false);
    expect(isAllowedImageUrl("javascript:alert(1)")).toBe(false);
  });
});
