"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  EMPTY_CELL,
  limitPalette,
  matchImageData,
  materialList,
  replaceCell,
  rgbaFromRgbCells
} = require("../miniprogram/utils/grid");

const palette = [
  {
    code: "BLACK",
    hex: "#000000",
    rgb: { r: 0, g: 0, b: 0 },
    oklab: { l: 0, a: 0, b: 0 },
    equivalents: { MARD: ["BLACK"], 盼盼: ["1"] }
  },
  {
    code: "WHITE",
    hex: "#ffffff",
    rgb: { r: 255, g: 255, b: 255 },
    oklab: { l: 1, a: 0, b: 0 },
    equivalents: { MARD: ["WHITE"], 盼盼: [] }
  },
  {
    code: "GRAY",
    hex: "#777777",
    rgb: { r: 119, g: 119, b: 119 },
    oklab: { l: 0.57, a: 0, b: 0 },
    equivalents: { MARD: ["GRAY"], 盼盼: ["9"] }
  }
];

test("image data matching preserves transparent cells", () => {
  const data = rgbaFromRgbCells([
    { r: 0, g: 0, b: 0, a: 255 },
    { r: 255, g: 255, b: 255, a: 255 },
    { r: 255, g: 0, b: 0, a: 0 }
  ]);
  const cells = matchImageData(data, 3, 1, palette, { alphaThreshold: 128 });
  assert.deepEqual([...cells], [0, 1, EMPTY_CELL]);
});

test("palette limiting keeps the most frequently used colors", () => {
  const cells = Int16Array.from([0, 0, 0, 1, 1, 2]);
  const limited = limitPalette(cells, palette, 2);
  assert.equal(new Set([...limited]).size, 2);
  assert.ok([...limited].every((value) => value === 0 || value === 1));
});

test("material list exposes brand equivalents without changing color", () => {
  const cells = Int16Array.from([0, 0, 1]);
  const list = materialList(cells, palette, "盼盼");
  assert.equal(list[0].displayCode, "1");
  assert.equal(list[0].count, 2);
  const missing = list.find((item) => item.mardCode === "WHITE");
  assert.equal(missing.displayCode, "—");
  assert.equal(missing.hasEquivalent, false);
});

test("manual edit can paint and erase one cell", () => {
  const original = Int16Array.from([0, 1]);
  const painted = replaceCell(original, 1, 2);
  const erased = replaceCell(painted, 0, EMPTY_CELL);
  assert.deepEqual([...original], [0, 1]);
  assert.deepEqual([...painted], [0, 2]);
  assert.deepEqual([...erased], [EMPTY_CELL, 2]);
});
