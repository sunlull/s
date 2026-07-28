"use strict";

const { contrastTextColor } = require("./color");
const { EMPTY_CELL } = require("./grid");

function displayCode(color, brand) {
  if (brand === "MARD") return color.code;
  const target = color.equivalents[brand] || [];
  return target.length ? target.join("/") : color.code;
}

function drawGrid(ctx, options) {
  const {
    cells,
    width,
    height,
    palette,
    brand,
    cellSize,
    offsetX,
    offsetY,
    showCodes
  } = options;

  const startX = offsetX || 0;
  const startY = offsetY || 0;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.max(7, Math.floor(cellSize * 0.28))}px sans-serif`;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cellIndex = y * width + x;
      const paletteIndex = cells[cellIndex];
      const px = startX + x * cellSize;
      const py = startY + y * cellSize;

      if (paletteIndex === EMPTY_CELL) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(px, py, cellSize, cellSize);
        continue;
      }

      const color = palette[paletteIndex];
      ctx.fillStyle = color.hex;
      ctx.fillRect(px, py, cellSize, cellSize);

      if (showCodes) {
        ctx.fillStyle = contrastTextColor(color.rgb);
        const code = displayCode(color, brand);
        ctx.fillText(code.length > 6 ? color.code : code, px + cellSize / 2, py + cellSize / 2);
      }
    }
  }

  for (let x = 0; x <= width; x += 1) {
    ctx.beginPath();
    ctx.lineWidth = x % 5 === 0 ? 1.4 : 0.45;
    ctx.strokeStyle = x % 5 === 0 ? "#52606d" : "#a8b0b7";
    ctx.moveTo(startX + x * cellSize, startY);
    ctx.lineTo(startX + x * cellSize, startY + height * cellSize);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += 1) {
    ctx.beginPath();
    ctx.lineWidth = y % 5 === 0 ? 1.4 : 0.45;
    ctx.strokeStyle = y % 5 === 0 ? "#52606d" : "#a8b0b7";
    ctx.moveTo(startX, startY + y * cellSize);
    ctx.lineTo(startX + width * cellSize, startY + y * cellSize);
    ctx.stroke();
  }
  ctx.restore();
}

function prepareCanvas(canvas, cssWidth, cssHeight, pixelRatio) {
  const ratio = pixelRatio || 1;
  canvas.width = Math.floor(cssWidth * ratio);
  canvas.height = Math.floor(cssHeight * ratio);
  const ctx = canvas.getContext("2d");
  if (typeof ctx.setTransform === "function") {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  } else {
    ctx.scale(ratio, ratio);
  }
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  return ctx;
}

function drawPatternCanvas(canvas, options) {
  const cssWidth = options.width * options.cellSize;
  const cssHeight = options.height * options.cellSize;
  const ctx = prepareCanvas(canvas, cssWidth, cssHeight, options.pixelRatio);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cssWidth, cssHeight);
  drawGrid(ctx, {
    ...options,
    offsetX: 0,
    offsetY: 0,
    showCodes: options.cellSize >= 14
  });
  return { cssWidth, cssHeight };
}

function drawExportCanvas(canvas, options) {
  const margin = 28;
  const headerHeight = 64;
  const legendColumns = 4;
  const legendRowHeight = 34;
  const legendRows = Math.ceil(options.materials.length / legendColumns);
  const gridWidth = options.width * options.cellSize;
  const gridHeight = options.height * options.cellSize;
  const legendHeight = legendRows * legendRowHeight + 30;
  const canvasWidth = margin * 2 + gridWidth;
  const canvasHeight = headerHeight + gridHeight + legendHeight + margin;
  const ctx = prepareCanvas(canvas, canvasWidth, canvasHeight, 1);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = "#17324d";
  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`拼豆图纸  ${options.width} × ${options.height}`, margin, 28);
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#536170";
  ctx.textAlign = "right";
  ctx.fillText(`${options.brand} 色号 · 每5格加粗`, canvasWidth - margin, 28);

  drawGrid(ctx, {
    ...options,
    offsetX: margin,
    offsetY: headerHeight,
    showCodes: true
  });

  const legendTop = headerHeight + gridHeight + 20;
  const columnWidth = gridWidth / legendColumns;
  options.materials.forEach((item, index) => {
    const column = index % legendColumns;
    const row = Math.floor(index / legendColumns);
    const x = margin + column * columnWidth;
    const y = legendTop + row * legendRowHeight;
    ctx.fillStyle = item.hex;
    ctx.fillRect(x, y, 22, 22);
    ctx.strokeStyle = "#a8b0b7";
    ctx.lineWidth = 0.6;
    ctx.strokeRect(x, y, 22, 22);
    ctx.fillStyle = "#172b3a";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const code = item.displayCode === "—" ? `MARD ${item.mardCode}` : item.displayCode;
    ctx.fillText(`${code} × ${item.count}`, x + 29, y + 11);
  });

  return { canvasWidth, canvasHeight };
}

module.exports = {
  displayCode,
  drawExportCanvas,
  drawGrid,
  drawPatternCanvas,
  prepareCanvas
};
