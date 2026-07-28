"use strict";

const MIN_CELL_SIZE = 6;
const MAX_CELL_SIZE = 44;
const DEFAULT_CELL_SIZE = 27;
const ZOOM_LEVELS = [6, 9, 12, 18, 24, 27, 32, 38, 44];

function clampCellSize(value) {
  return Math.min(MAX_CELL_SIZE, Math.max(MIN_CELL_SIZE, Math.round(value)));
}

function fitCellSize(viewportWidth, gridWidth) {
  if (!Number.isFinite(viewportWidth) || !Number.isFinite(gridWidth) || gridWidth <= 0) {
    return DEFAULT_CELL_SIZE;
  }
  return clampCellSize(Math.floor((viewportWidth - 2) / gridWidth));
}

function nextZoomSize(currentSize, direction) {
  const current = clampCellSize(currentSize);
  if (direction > 0) {
    return ZOOM_LEVELS.find((size) => size > current) || MAX_CELL_SIZE;
  }

  for (let index = ZOOM_LEVELS.length - 1; index >= 0; index -= 1) {
    if (ZOOM_LEVELS[index] < current) return ZOOM_LEVELS[index];
  }
  return MIN_CELL_SIZE;
}

function zoomPercent(cellSize) {
  return Math.round((clampCellSize(cellSize) / DEFAULT_CELL_SIZE) * 100);
}

module.exports = {
  DEFAULT_CELL_SIZE,
  MAX_CELL_SIZE,
  MIN_CELL_SIZE,
  ZOOM_LEVELS,
  clampCellSize,
  fitCellSize,
  nextZoomSize,
  zoomPercent
};
