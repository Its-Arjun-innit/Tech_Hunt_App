import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseTable } from "./csv";

test("parses quoted fields, escaped quotes and embedded commas", () => {
  const rows = parseCsv('a,"b,c","say ""hi"""\n1,2,3');
  assert.deepEqual(rows, [
    ["a", "b,c", 'say "hi"'],
    ["1", "2", "3"],
  ]);
});

test("handles CRLF, trailing newline and a byte-order mark", () => {
  const rows = parseCsv("﻿a,b\r\nc,d\r\n");
  assert.deepEqual(rows, [
    ["a", "b"],
    ["c", "d"],
  ]);
});

test("maps loosely named headers to keys, in any column order", () => {
  const { rows, errors } = parseTable("Name,Roll No,SECTION\nAsha,23CSA001,CSE-A", ["rollNo", "name", "section"]);
  assert.deepEqual(errors, []);
  assert.deepEqual(rows, [{ rollNo: "23CSA001", name: "Asha", section: "CSE-A" }]);
});

test("reports a missing column instead of guessing", () => {
  const { rows, errors } = parseTable("Name,Section\nAsha,CSE-A", ["rollNo", "name"]);
  assert.equal(rows.length, 0);
  assert.match(errors[0], /rollNo/);
});

test("rows with an empty required cell are reported by line and skipped", () => {
  const { rows, errors } = parseTable("roll no,name\n1,Asha\n2,\n3,Ravi", ["rollNo", "name"]);
  assert.equal(rows.length, 2);
  assert.deepEqual(errors, ["Line 3: name is empty."]);
});
