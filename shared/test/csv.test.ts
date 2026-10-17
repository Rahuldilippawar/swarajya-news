import { describe, expect, it } from "vitest";
import { toCsv } from "../src/csv";

describe("toCsv", () => {
  it("starts with a BOM and uses CRLF", () => {
    expect(toCsv(["a", "b"], [[1, "x"]])).toBe("﻿a,b\r\n1,x\r\n");
  });

  it("quotes commas, quotes and new lines and keeps Marathi", () => {
    const csv = toCsv(["headline"], [['पुण्यात "पाऊस", शाळा\nबंद']]);
    expect(csv).toContain('"पुण्यात ""पाऊस"", शाळा\nबंद"');
  });

  it("neutralises formula injection", () => {
    expect(toCsv(["h"], [["=HYPERLINK(\"x\")"], ["-1"], ["@cmd"]])).toContain("'=HYPERLINK");
    expect(toCsv(["h"], [["-1"]])).toContain("'-1");
    expect(toCsv(["h"], [[-1]])).toBe("\uFEFFh\r\n-1\r\n");
  });

  it("writes empty cells for null and undefined", () => {
    expect(toCsv(["a", "b", "c"], [[null, undefined, 0]])).toBe("﻿a,b,c\r\n,,0\r\n");
  });
});
