"use strict";

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const defaultSource = path.resolve(
  projectRoot,
  "../outputs/perler_palette_design/mard_291_reference_palette_v1.json"
);
const sourcePath = process.argv[2] ? path.resolve(process.argv[2]) : defaultSource;
const outputPath = path.resolve(projectRoot, "miniprogram/data/palette.js");

if (!fs.existsSync(sourcePath)) {
  throw new Error(
    `找不到源色卡：${sourcePath}\n` +
    "首次生成时请传入完整色卡 JSON，例如：node scripts/build-palette.js /path/to/palette.json"
  );
}

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const smallSeries = source.series_definitions.small_reference_image34;
if (!smallSeries || !Array.isArray(smallSeries.codes)) {
  throw new Error("源数据缺少 small_reference_image34 系列定义");
}

const colorByCode = new Map(source.colors.map((color) => [color.code, color]));
const mappingByCode = new Map();

for (const row of source.normalized_mappings || []) {
  if (row.source_brand !== "MARD" || row.source_series !== "small_reference_image34") continue;
  if (!mappingByCode.has(row.source_code)) mappingByCode.set(row.source_code, new Map());
  const brandMap = mappingByCode.get(row.source_code);
  if (!brandMap.has(row.target_brand)) brandMap.set(row.target_brand, new Set());
  brandMap.get(row.target_brand).add(row.target_code);
}

const brands = ["MARD", "盼盼", "咪小窝", "漫漫", "babypinkin", "VV"];
const palette = smallSeries.codes.map((code) => {
  const sourceColor = colorByCode.get(code);
  if (!sourceColor) throw new Error(`小豆系列色号 ${code} 缺少 RGB`);
  const brandMap = mappingByCode.get(code) || new Map();
  const equivalents = { MARD: [code] };
  for (const brand of brands.slice(1)) {
    equivalents[brand] = brandMap.has(brand) ? [...brandMap.get(brand)] : [];
  }

  return {
    code,
    hex: sourceColor.hex_display,
    rgb: sourceColor.rgb_srgb_8bit,
    oklab: sourceColor.oklab,
    family: sourceColor.image34_family,
    equivalents
  };
});

if (palette.length !== 149) {
  throw new Error(`预期149色，实际${palette.length}色`);
}
if (new Set(palette.map((color) => color.code)).size !== palette.length) {
  throw new Error("小豆色板存在重复色号");
}

const payload = {
  schemaVersion: "1.0.0",
  paletteId: "mard-small-reference-image34",
  sizeClass: "small",
  diameterMm: null,
  verificationStatus: "unverified",
  sourceNote: "MARD屏幕RGB来自Pixelbead 291色页面；小豆范围来自用户提供的跨品牌对照图。两者均未明确标注2.6mm，色值未做实物测量。",
  brands,
  colors: palette
};

const output = [
  '"use strict";',
  "",
  "// 由 scripts/build-palette.js 生成，请勿手工修改。",
  `module.exports = ${JSON.stringify(payload, null, 2)};`,
  ""
].join("\n");

fs.writeFileSync(outputPath, output, "utf8");
console.log(`已生成 ${palette.length} 色：${outputPath}`);
