"use strict";

const paletteData = require("../miniprogram/data/palette");

const errors = [];
const codes = new Set();

if (paletteData.colors.length !== 149) {
  errors.push(`色板数量应为149，实际为${paletteData.colors.length}`);
}

paletteData.colors.forEach((color, index) => {
  if (!color.code) errors.push(`第${index + 1}行缺少色号`);
  if (codes.has(color.code)) errors.push(`重复色号：${color.code}`);
  codes.add(color.code);
  if (!/^#[0-9a-f]{6}$/i.test(color.hex)) errors.push(`HEX错误：${color.code} ${color.hex}`);
  for (const channel of ["r", "g", "b"]) {
    const value = color.rgb[channel];
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      errors.push(`RGB错误：${color.code}.${channel}=${value}`);
    }
  }
  for (const channel of ["l", "a", "b"]) {
    if (!Number.isFinite(color.oklab[channel])) {
      errors.push(`Oklab错误：${color.code}.${channel}`);
    }
  }
  for (const brand of paletteData.brands) {
    if (!Array.isArray(color.equivalents[brand])) {
      errors.push(`缺少品牌映射数组：${color.code} / ${brand}`);
    }
  }
});

const f1 = paletteData.colors.find((color) => color.code === "F1");
if (!f1) {
  errors.push("缺少测试色号F1");
} else {
  const expected = {
    盼盼: "35",
    咪小窝: "35",
    漫漫: "A1",
    babypinkin: "A26"
  };
  for (const [brand, code] of Object.entries(expected)) {
    if (!f1.equivalents[brand].includes(code)) {
      errors.push(`F1的${brand}映射应包含${code}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`数据校验通过：${paletteData.colors.length}色，${paletteData.brands.length}个品牌入口`);
}
