"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const paletteData = require("../miniprogram/data/palette");
const {
  nearestPaletteIndex,
  oklabDistanceSquared,
  rgbToOklab
} = require("../miniprogram/utils/color");

test("black and white have stable Oklab anchors", () => {
  const black = rgbToOklab(0, 0, 0);
  const white = rgbToOklab(255, 255, 255);
  assert.equal(black.l, 0);
  assert.equal(black.a, 0);
  assert.equal(black.b, 0);
  assert.ok(Math.abs(white.l - 1) < 1e-7);
  assert.ok(Math.abs(white.a) < 1e-6);
  assert.ok(Math.abs(white.b) < 1e-6);
});

test("an exact palette RGB matches its own stable index", () => {
  const expectedIndex = paletteData.colors.findIndex((color) => color.code === "F1");
  const color = paletteData.colors[expectedIndex];
  const actualIndex = nearestPaletteIndex(color.rgb, paletteData.colors);
  assert.equal(actualIndex, expectedIndex);
});

test("Oklab distance is symmetric", () => {
  const left = rgbToOklab(255, 0, 0);
  const right = rgbToOklab(0, 0, 255);
  assert.equal(
    oklabDistanceSquared(left, right),
    oklabDistanceSquared(right, left)
  );
});
