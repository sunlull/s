"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const paletteData = require("../miniprogram/data/palette");

test("MARD small reference palette has 149 unique colors", () => {
  assert.equal(paletteData.colors.length, 149);
  assert.equal(
    new Set(paletteData.colors.map((color) => color.code)).size,
    149
  );
});

test("every palette row contains all six brand mapping arrays", () => {
  for (const color of paletteData.colors) {
    for (const brand of paletteData.brands) {
      assert.ok(Array.isArray(color.equivalents[brand]), `${color.code} / ${brand}`);
    }
  }
});

test("known F1 cross-brand row is retained", () => {
  const f1 = paletteData.colors.find((color) => color.code === "F1");
  assert.deepEqual(f1.equivalents.MARD, ["F1"]);
  assert.deepEqual(f1.equivalents["盼盼"], ["35"]);
  assert.deepEqual(f1.equivalents["咪小窝"], ["35"]);
  assert.deepEqual(f1.equivalents["漫漫"], ["A1"]);
  assert.deepEqual(f1.equivalents.babypinkin, ["A26"]);
  assert.deepEqual(f1.equivalents.VV, []);
});
