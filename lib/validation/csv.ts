/**
 * Minimal RFC 4180 CSV reader: quoted fields, escaped quotes ("") and
 * embedded newlines. Enough for a roster paste or export from Excel.
 *
 * ponytail: no dependency; add one only if organizers hit real-world CSV
 * dialects this cannot read.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const text = input.replace(/^﻿/, ""); // strip Excel byte-order mark

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c.length > 0));
}

/**
 * Reads a CSV whose first row names the columns, into objects keyed by the
 * lower-cased header. Headers are matched loosely ("Roll No", "roll_no" and
 * "rollno" are the same column), so an export straight from a college ERP
 * usually imports without editing.
 */
export function parseTable<K extends string>(
  input: string,
  required: readonly K[],
): { rows: Record<K, string>[]; errors: string[] } {
  const table = parseCsv(input);
  if (table.length < 2) return { rows: [], errors: ["Add a header row and at least one data row."] };

  const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");
  const header = table[0].map(norm);
  const index = Object.fromEntries(required.map((k) => [k, header.indexOf(norm(k))])) as Record<K, number>;

  const missing = required.filter((k) => index[k] === -1);
  if (missing.length) return { rows: [], errors: [`Missing column: ${missing.join(", ")}.`] };

  const rows: Record<K, string>[] = [];
  const errors: string[] = [];
  table.slice(1).forEach((cells, i) => {
    const row = Object.fromEntries(required.map((k) => [k, cells[index[k]] ?? ""])) as Record<K, string>;
    const empty = required.filter((k) => !row[k]);
    if (empty.length) errors.push(`Line ${i + 2}: ${empty.join(", ")} is empty.`);
    else rows.push(row);
  });
  return { rows, errors };
}
