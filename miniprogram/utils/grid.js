"use strict";

const { nearestPaletteIndex, rgbToOklab, oklabDistanceSquared } = require("./color");

const EMPTY_CELL = -1;

function matchImageData(imageData, width, height, palette, options) {
  const alphaThreshold = options && Number.isFinite(options.alphaThreshold)
    ? options.alphaThreshold
    : 128;
  const cells = new Int16Array(width * height);

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const alpha = imageData[offset + 3];
    if (alpha < alphaThreshold) {
      cells[index] = EMPTY_CELL;
      continue;
    }

    cells[index] = nearestPaletteIndex(
      {
        r: imageData[offset],
        g: imageData[offset + 1],
        b: imageData[offset + 2]
      },
      palette
    );
  }

  const maxColors = options && options.maxColors;
  return Number.isFinite(maxColors) && maxColors > 0
    ? limitPalette(cells, palette, maxColors)
    : cells;
}

function countPaletteUsage(cells) {
  const counts = new Map();
  for (let i = 0; i < cells.length; i += 1) {
    const paletteIndex = cells[i];
    if (paletteIndex === EMPTY_CELL) continue;
    counts.set(paletteIndex, (counts.get(paletteIndex) || 0) + 1);
  }
  return counts;
}

function limitPalette(cells, palette, maxColors) {
  const counts = countPaletteUsage(cells);
  if (counts.size <= maxColors) return new Int16Array(cells);

  const allowed = [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0] - right[0];
    })
    .slice(0, maxColors)
    .map(([paletteIndex]) => paletteIndex);

  const allowedSet = new Set(allowed);
  const result = new Int16Array(cells.length);
  const replacementCache = new Map();

  for (let i = 0; i < cells.length; i += 1) {
    const current = cells[i];
    if (current === EMPTY_CELL || allowedSet.has(current)) {
      result[i] = current;
      continue;
    }

    if (!replacementCache.has(current)) {
      const sourceLab = palette[current].oklab;
      let best = allowed[0];
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let j = 0; j < allowed.length; j += 1) {
        const candidate = allowed[j];
        const distance = oklabDistanceSquared(sourceLab, palette[candidate].oklab);
        if (distance < bestDistance || (distance === bestDistance && candidate < best)) {
          best = candidate;
          bestDistance = distance;
        }
      }
      replacementCache.set(current, best);
    }
    result[i] = replacementCache.get(current);
  }

  return result;
}

function materialList(cells, palette, brand) {
  const counts = countPaletteUsage(cells);
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);

  return [...counts.entries()]
    .map(([paletteIndex, count]) => {
      const color = palette[paletteIndex];
      const targetCodes = color.equivalents[brand] || [];
      return {
        paletteIndex,
        mardCode: color.code,
        displayCode: brand === "MARD"
          ? color.code
          : targetCodes.length
            ? targetCodes.join("/")
            : "—",
        hex: color.hex,
        rgb: color.rgb,
        count,
        percent: total ? Math.round((count / total) * 1000) / 10 : 0,
        hasEquivalent: brand === "MARD" || targetCodes.length > 0
      };
    })
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return left.mardCode.localeCompare(right.mardCode, "en", { numeric: true });
    });
}

function replaceCell(cells, cellIndex, paletteIndex) {
  const result = new Int16Array(cells);
  if (cellIndex < 0 || cellIndex >= result.length) return result;
  result[cellIndex] = paletteIndex;
  return result;
}

function rgbaFromRgbCells(rgbCells) {
  const data = new Uint8ClampedArray(rgbCells.length * 4);
  rgbCells.forEach((rgb, index) => {
    const offset = index * 4;
    data[offset] = rgb.r;
    data[offset + 1] = rgb.g;
    data[offset + 2] = rgb.b;
    data[offset + 3] = Number.isFinite(rgb.a) ? rgb.a : 255;
  });
  return data;
}

module.exports = {
  EMPTY_CELL,
  countPaletteUsage,
  limitPalette,
  matchImageData,
  materialList,
  replaceCell,
  rgbaFromRgbCells,
  rgbToOklab
};
