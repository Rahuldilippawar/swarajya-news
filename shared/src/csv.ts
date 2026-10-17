export type CsvCell = string | number | boolean | null | undefined;

function escape(cell: CsvCell): string {
  if (cell === null || cell === undefined) return "";
  let s = String(cell);
  // Text starting with these is run as a formula by Excel/Sheets ("CSV injection"). Real numbers are left alone.
  if (typeof cell === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Builds a CSV file. Starts with a UTF-8 byte-order mark so Excel shows
 * Marathi text correctly, and neutralises cells that would run as formulas.
 */
export function toCsv(header: readonly string[], rows: readonly (readonly CsvCell[])[]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(escape).join(",")).join("\r\n") + "\r\n";
}
