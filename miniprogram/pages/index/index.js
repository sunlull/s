"use strict";

const paletteData = require("../../data/palette");
const {
  EMPTY_CELL,
  matchImageData,
  materialList,
  replaceCell
} = require("../../utils/grid");
const {
  drawExportCanvas,
  drawPatternCanvas
} = require("../../utils/draw");
const {
  DEFAULT_CELL_SIZE,
  MAX_CELL_SIZE,
  MIN_CELL_SIZE,
  fitCellSize,
  nextZoomSize,
  zoomPercent
} = require("../../utils/zoom");

const BRANDS = paletteData.brands;
const BRAND_LABELS = [
  "MARD（匹配色）",
  "盼盼（参考换号）",
  "咪小窝（参考换号）",
  "漫漫（参考换号）",
  "babypinkin（参考换号）",
  "VV（参考换号）"
];

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getPixelRatio() {
  if (wx.getWindowInfo) return wx.getWindowInfo().pixelRatio || 1;
  return wx.getSystemInfoSync().pixelRatio || 1;
}

Page({
  data: {
    selectedImage: "",
    originalSizeText: "",
    gridWidth: 32,
    gridHeight: 32,
    maxColors: 24,
    sampleMode: "photo",
    generating: false,
    hasPattern: false,
    cellSize: DEFAULT_CELL_SIZE,
    canvasCssWidth: 0,
    canvasCssHeight: 0,
    zoomPercent: 100,
    canZoomOut: true,
    canZoomIn: true,
    compactPreview: false,
    brandIndex: 0,
    brandOptions: BRAND_LABELS,
    selectedBrand: BRANDS[0],
    materials: [],
    materialTotal: 0,
    usedColorCount: 0,
    pickerVisible: false,
    pickerSearch: "",
    pickerTitle: "",
    filteredColors: [],
    selectedCellIndex: -1,
    selectedCellText: "",
    paletteNote: paletteData.sourceNote
  },

  onLoad() {
    this.palette = paletteData.colors;
    this.cells = null;
    this.sourceImageInfo = null;
    this.patternCanvasNode = null;
    this.exportCanvasNode = null;
    this.setData({
      filteredColors: this.buildPickerColors("")
    });
  },

  chooseImage() {
    const success = (path) => {
      wx.getImageInfo({
        src: path,
        success: (info) => {
          this.sourceImageInfo = info;
          const nextHeight = clamp(
            Math.round(this.data.gridWidth * info.height / info.width),
            8,
            64
          );
          this.setData({
            selectedImage: path,
            originalSizeText: `${info.width} × ${info.height}`,
            gridHeight: nextHeight,
            hasPattern: false,
            materials: []
          });
          this.cells = null;
        },
        fail: () => {
          wx.showToast({ title: "图片读取失败", icon: "none" });
        }
      });
    };

    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 1,
        mediaType: ["image"],
        sourceType: ["album", "camera"],
        sizeType: ["compressed"],
        success: (result) => success(result.tempFiles[0].tempFilePath)
      });
      return;
    }

    wx.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (result) => success(result.tempFilePaths[0])
    });
  },

  onGridWidthChange(event) {
    const width = Number(event.detail.value);
    const next = { gridWidth: width };
    if (this.sourceImageInfo) {
      next.gridHeight = clamp(
        Math.round(width * this.sourceImageInfo.height / this.sourceImageInfo.width),
        8,
        64
      );
    }
    this.setData(next);
  },

  onGridHeightChange(event) {
    this.setData({ gridHeight: Number(event.detail.value) });
  },

  onMaxColorsChange(event) {
    this.setData({ maxColors: Number(event.detail.value) });
  },

  onSampleModeChange(event) {
    this.setData({ sampleMode: event.detail.value });
  },

  generatePattern() {
    if (!this.data.selectedImage) {
      wx.showToast({ title: "请先选择图片", icon: "none" });
      return;
    }
    this.setData({ generating: true });

    this.readGridPixels()
      .then((pixelData) => {
        this.cells = matchImageData(
          pixelData,
          this.data.gridWidth,
          this.data.gridHeight,
          this.palette,
          {
            alphaThreshold: 128,
            maxColors: this.data.maxColors
          }
        );
        this.setData({
          hasPattern: true,
          canvasCssWidth: this.data.gridWidth * this.data.cellSize,
          canvasCssHeight: this.data.gridHeight * this.data.cellSize
        });
        this.refreshMaterials();
        wx.nextTick(() => this.drawPattern());
      })
      .catch((error) => {
        console.error(error);
        wx.showToast({ title: "生成失败，请更换图片", icon: "none" });
      })
      .then(() => {
        this.setData({ generating: false });
      }, () => {
        this.setData({ generating: false });
      });
  },

  readGridPixels() {
    return new Promise((resolve, reject) => {
      this.createSelectorQuery()
        .select("#sourceCanvas")
        .fields({ node: true, size: true })
        .exec((result) => {
          if (!result[0] || !result[0].node) {
            reject(new Error("sourceCanvas unavailable"));
            return;
          }

          const canvas = result[0].node;
          const width = this.data.gridWidth;
          const height = this.data.gridHeight;
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          const image = canvas.createImage();

          image.onload = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.imageSmoothingEnabled = this.data.sampleMode === "photo";
            if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";

            const imageRatio = image.width / image.height;
            const targetRatio = width / height;
            let sx = 0;
            let sy = 0;
            let sourceWidth = image.width;
            let sourceHeight = image.height;

            if (imageRatio > targetRatio) {
              sourceWidth = image.height * targetRatio;
              sx = (image.width - sourceWidth) / 2;
            } else {
              sourceHeight = image.width / targetRatio;
              sy = (image.height - sourceHeight) / 2;
            }

            ctx.drawImage(
              image,
              sx,
              sy,
              sourceWidth,
              sourceHeight,
              0,
              0,
              width,
              height
            );
            resolve(ctx.getImageData(0, 0, width, height).data);
          };
          image.onerror = reject;
          image.src = this.data.selectedImage;
        });
    });
  },

  drawPattern() {
    if (!this.cells) return;
    this.createSelectorQuery()
      .select("#patternCanvas")
      .fields({ node: true, size: true })
      .exec((result) => {
        if (!result[0] || !result[0].node) return;
        this.patternCanvasNode = result[0].node;
        drawPatternCanvas(this.patternCanvasNode, {
          cells: this.cells,
          width: this.data.gridWidth,
          height: this.data.gridHeight,
          palette: this.palette,
          brand: BRANDS[this.data.brandIndex],
          cellSize: this.data.cellSize,
          pixelRatio: Math.min(getPixelRatio(), 2)
        });
      });
  },

  applyCellSize(cellSize) {
    const nextSize = Math.min(MAX_CELL_SIZE, Math.max(MIN_CELL_SIZE, cellSize));
    this.setData({
      cellSize: nextSize,
      canvasCssWidth: this.data.gridWidth * nextSize,
      canvasCssHeight: this.data.gridHeight * nextSize,
      zoomPercent: zoomPercent(nextSize),
      canZoomOut: nextSize > MIN_CELL_SIZE,
      canZoomIn: nextSize < MAX_CELL_SIZE,
      compactPreview: nextSize < 14
    });
    wx.nextTick(() => this.drawPattern());
  },

  zoomOut() {
    this.applyCellSize(nextZoomSize(this.data.cellSize, -1));
  },

  zoomIn() {
    this.applyCellSize(nextZoomSize(this.data.cellSize, 1));
  },

  fitPatternWidth() {
    this.createSelectorQuery()
      .select("#canvasViewport")
      .boundingClientRect()
      .exec((result) => {
        if (!result[0] || !result[0].width) return;
        this.applyCellSize(
          fitCellSize(result[0].width, this.data.gridWidth)
        );
      });
  },

  refreshMaterials() {
    if (!this.cells) return;
    const brand = BRANDS[this.data.brandIndex];
    const materials = materialList(this.cells, this.palette, brand);
    const materialTotal = materials.reduce((sum, item) => sum + item.count, 0);
    this.setData({
      materials,
      materialTotal,
      usedColorCount: materials.length,
      selectedBrand: brand
    });
  },

  onBrandChange(event) {
    const brandIndex = Number(event.detail.value);
    this.setData({
      brandIndex,
      selectedBrand: BRANDS[brandIndex],
      filteredColors: this.buildPickerColors(this.data.pickerSearch, brandIndex)
    });
    this.refreshMaterials();
    wx.nextTick(() => this.drawPattern());

    if (brandIndex !== 0) {
      wx.showToast({
        title: "当前为参考换号，颜色仍按MARD匹配",
        icon: "none",
        duration: 2500
      });
    }
  },

  onPatternTap(event) {
    if (!this.cells) return;
    const point = event.detail || {};
    const touch = event.touches && event.touches[0];
    const px = Number.isFinite(point.x) ? point.x : touch && touch.x;
    const py = Number.isFinite(point.y) ? point.y : touch && touch.y;
    if (!Number.isFinite(px) || !Number.isFinite(py)) return;

    const x = Math.floor(px / this.data.cellSize);
    const y = Math.floor(py / this.data.cellSize);
    if (x < 0 || x >= this.data.gridWidth || y < 0 || y >= this.data.gridHeight) return;

    const cellIndex = y * this.data.gridWidth + x;
    const paletteIndex = this.cells[cellIndex];
    const currentCode = paletteIndex === EMPTY_CELL
      ? "空白"
      : this.palette[paletteIndex].code;
    this.setData({
      pickerVisible: true,
      selectedCellIndex: cellIndex,
      selectedCellText: `第${y + 1}行 · 第${x + 1}列`,
      pickerTitle: `修改 ${currentCode}`,
      pickerSearch: "",
      filteredColors: this.buildPickerColors("")
    });
  },

  buildPickerColors(searchText, brandIndex) {
    const brand = BRANDS[Number.isFinite(brandIndex) ? brandIndex : this.data.brandIndex];
    const query = String(searchText || "").trim().toUpperCase();
    return this.palette
      .map((color, index) => {
        const target = color.equivalents[brand] || [];
        return {
          index,
          code: color.code,
          hex: color.hex,
          targetCode: brand === "MARD" ? color.code : target.join("/") || "—",
          searchable: [color.code, ...target].join(" ").toUpperCase()
        };
      })
      .filter((item) => !query || item.searchable.includes(query));
  },

  onPickerSearch(event) {
    const search = event.detail.value;
    this.setData({
      pickerSearch: search,
      filteredColors: this.buildPickerColors(search)
    });
  },

  choosePickerColor(event) {
    const paletteIndex = Number(event.currentTarget.dataset.index);
    this.cells = replaceCell(
      this.cells,
      this.data.selectedCellIndex,
      paletteIndex
    );
    this.closePicker();
    this.refreshMaterials();
    wx.nextTick(() => this.drawPattern());
  },

  clearSelectedCell() {
    this.cells = replaceCell(
      this.cells,
      this.data.selectedCellIndex,
      EMPTY_CELL
    );
    this.closePicker();
    this.refreshMaterials();
    wx.nextTick(() => this.drawPattern());
  },

  closePicker() {
    this.setData({
      pickerVisible: false,
      selectedCellIndex: -1,
      pickerSearch: ""
    });
  },

  noop() {},

  exportPattern() {
    if (!this.cells) return;
    wx.showLoading({ title: "正在导出" });
    this.createSelectorQuery()
      .select("#exportCanvas")
      .fields({ node: true, size: true })
      .exec((result) => {
        if (!result[0] || !result[0].node) {
          wx.hideLoading();
          wx.showToast({ title: "导出画布不可用", icon: "none" });
          return;
        }

        const canvas = result[0].node;
        this.exportCanvasNode = canvas;
        const exportCellSize = this.data.gridWidth > 48 || this.data.gridHeight > 48
          ? 32
          : 40;
        drawExportCanvas(canvas, {
          cells: this.cells,
          width: this.data.gridWidth,
          height: this.data.gridHeight,
          palette: this.palette,
          brand: BRANDS[this.data.brandIndex],
          cellSize: exportCellSize,
          materials: this.data.materials
        });

        wx.canvasToTempFilePath({
          canvas,
          fileType: "png",
          quality: 1,
          destWidth: canvas.width,
          destHeight: canvas.height,
          success: (tempResult) => {
            wx.saveImageToPhotosAlbum({
              filePath: tempResult.tempFilePath,
              success: () => {
                wx.hideLoading();
                wx.showToast({ title: "已保存到相册", icon: "success" });
              },
              fail: (error) => {
                wx.hideLoading();
                console.warn(error);
                wx.previewImage({
                  current: tempResult.tempFilePath,
                  urls: [tempResult.tempFilePath]
                });
                wx.showToast({ title: "已打开预览，可长按保存", icon: "none" });
              }
            });
          },
          fail: (error) => {
            wx.hideLoading();
            console.error(error);
            wx.showToast({ title: "PNG导出失败", icon: "none" });
          }
        });
      });
  }
});
