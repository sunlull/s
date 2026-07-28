"use strict";

function srgbChannelToLinear(value) {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function rgbToOklab(r8, g8, b8) {
  const r = srgbChannelToLinear(r8);
  const g = srgbChannelToLinear(g8);
  const b = srgbChannelToLinear(b8);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  };
}

function oklabDistanceSquared(left, right) {
  const dl = left.l - right.l;
  const da = left.a - right.a;
  const db = left.b - right.b;
  return dl * dl + da * da + db * db;
}

function nearestPaletteIndex(rgb, palette, allowedIndices) {
  const source = rgbToOklab(rgb.r, rgb.g, rgb.b);
  const candidates = allowedIndices || palette.map((_, index) => index);
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < candidates.length; i += 1) {
    const paletteIndex = candidates[i];
    const candidate = palette[paletteIndex];
    const distance = oklabDistanceSquared(source, candidate.oklab);
    if (
      distance < bestDistance ||
      (distance === bestDistance && paletteIndex < bestIndex)
    ) {
      bestIndex = paletteIndex;
      bestDistance = distance;
    }
  }

  return bestIndex;
}

function contrastTextColor(rgb) {
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.63 ? "#172b3a" : "#ffffff";
}

module.exports = {
  contrastTextColor,
  nearestPaletteIndex,
  oklabDistanceSquared,
  rgbToOklab,
  srgbChannelToLinear
};
