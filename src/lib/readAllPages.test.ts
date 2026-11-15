import { describe, it } from "node:test";
import { deepStrictEqual, rejects, strictEqual } from "node:assert";
import { readAllPages } from "./readAllPages";

describe("complete financial reads", () => {
  it("includes future installments beyond the 1000-row limit in totals", async () => {
    const source = Array.from({ length: 1117 }, (_, index) => ({
      id: index,
      month: index < 1000 ? "2026-11-01" : "2027-11-01",
      value: 10,
    }));
    const ranges: number[][] = [];
    const result = await readAllPages(async (from, to) => {
      ranges.push([from, to]);
      return { data: source.slice(from, to + 1), error: null };
    });
    deepStrictEqual(ranges, [[0, 499], [500, 999], [1000, 1499]]);
    strictEqual(result.length, 1117);
    strictEqual(result.filter((row) => row.month === "2027-11-01").reduce((sum, row) => sum + row.value, 0), 1170);
  });
  it("reads an exact page boundary without missing or duplicating rows", async () => {
    const source = Array.from({ length: 1000 }, (_, id) => ({ id }));
    deepStrictEqual(await readAllPages(async (from, to) => ({ data: source.slice(from, to + 1), error: null })), source);
  });
  it("rejects a later-page failure rather than returning partial totals", async () => {
    await rejects(readAllPages(async (from) => from === 0
      ? { data: Array.from({ length: 500 }, (_, id) => id), error: null }
      : { data: null, error: { message: "Falha de leitura" } }), /Falha de leitura/);
  });
});