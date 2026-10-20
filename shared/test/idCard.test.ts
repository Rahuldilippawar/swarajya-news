import { describe, expect, it } from "vitest";
import { defaultDesignation, idCardVerifyUrl, isValidCardId } from "../src/idCard";

describe("ID card helpers", () => {
  it("gives each role its printed designation", () => {
    expect(defaultDesignation("REPORTER", "धुळे")).toBe("प्रतिनिधी धुळे जिल्हा");
    expect(defaultDesignation("REPORTER")).toBe("प्रतिनिधी");
    expect(defaultDesignation("EDITOR")).toBe("संपादक");
    expect(defaultDesignation("OWNER")).toBe("संचालक");
  });

  it("builds the verify URL and validates card IDs", () => {
    expect(idCardVerifyUrl("https://site.example/", "abcDEF1234567890ghij")).toBe("https://site.example/verify/abcDEF1234567890ghij");
    expect(isValidCardId("abcDEF1234567890ghij")).toBe(true);
    expect(isValidCardId("../x")).toBe(false);
    expect(isValidCardId("short")).toBe(false);
  });
});
