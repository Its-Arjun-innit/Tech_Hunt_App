import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseRoster } from "./csv";

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

test("skips a header row when it looks like one", () => {
  const { rows, errors } = parseRoster(
    "Team Name,Member Name,Member Code\nTeam Alpha,Player 1,A001\nTeam Beta,Player 2,B001",
  );
  assert.equal(errors.length, 0);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { teamName: "Team Alpha", memberName: "Player 1", memberCode: "A001" });
});

test("keeps the first row when there is no header", () => {
  const { rows } = parseRoster("Team Alpha,Player 1,A001");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].teamName, "Team Alpha");
});

test("allows a missing member code but rejects missing names", () => {
  const { rows, errors } = parseRoster("Team Alpha,Player 1\nTeam Beta,\n,Player 3");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].memberCode, "");
  assert.equal(errors.length, 2);
});

test("flags a duplicate member code inside one team", () => {
  const { rows, errors } = parseRoster("Team Alpha,P1,A001\nTeam Alpha,P2,A001");
  assert.equal(rows.length, 1);
  assert.match(errors[0], /repeated/);
});

test("the same code in different teams is fine", () => {
  const { rows, errors } = parseRoster("Team Alpha,P1,A001\nTeam Beta,P2,A001");
  assert.equal(rows.length, 2);
  assert.equal(errors.length, 0);
});
