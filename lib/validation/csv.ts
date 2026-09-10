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

export type RosterRow = { teamName: string; memberName: string; memberCode: string };

/**
 * Reads a roster of Team Name / Member Name / Member Code. A header row is
 * detected and skipped; member codes are generated when a row omits one.
 */
export function parseRoster(input: string): { rows: RosterRow[]; errors: string[] } {
  const table = parseCsv(input);
  const errors: string[] = [];
  const rows: RosterRow[] = [];

  if (table.length === 0) return { rows, errors: ["The file is empty."] };

  const first = table[0].map((c) => c.toLowerCase());
  const hasHeader = first.some((c) => c.includes("team")) && first.some((c) => c.includes("member") || c.includes("name"));
  const body = hasHeader ? table.slice(1) : table;

  const seen = new Set<string>();
  body.forEach((cells, i) => {
    const line = i + (hasHeader ? 2 : 1);
    const [teamName, memberName, memberCode = ""] = cells;

    if (!teamName || !memberName) {
      errors.push(`Line ${line}: team name and member name are both required.`);
      return;
    }
    const key = `${teamName.toLowerCase()}|${memberCode.toLowerCase()}`;
    if (memberCode && seen.has(key)) {
      errors.push(`Line ${line}: member code ${memberCode} is repeated for ${teamName}.`);
      return;
    }
    if (memberCode) seen.add(key);

    rows.push({ teamName, memberName, memberCode });
  });

  return { rows, errors };
}
