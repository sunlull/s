"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  MAX_CELL_SIZE,
  MIN_CELL_SIZE,
  fitCellSize,
  nextZoomSize,
  zoomPercent
} = require("../miniprogram/utils/zoom");

test("fit zoom keeps a wide pattern inside the preview width", () => {
  assert.equal(fitCellSize(322, 32), 10);
  assert.equal(fitCellSize(322, 64), MIN_CELL_SIZE);
});

test("step zoom moves in both directions and respects limits", () => {
  assert.equal(nextZoomSize(27, 1), 32);
  assert.equal(nextZoomSize(27, -1), 24);
  assert.equal(nextZoomSize(MAX_CELL_SIZE, 1), MAX_CELL_SIZE);
  assert.equal(nextZoomSize(MIN_CELL_SIZE, -1), MIN_CELL_SIZE);
});

test("default cell size is represented as 100 percent", () => {
  assert.equal(zoomPercent(27), 100);
});
