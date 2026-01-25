import fs from "fs";
import path from "path";
import zlib from "zlib";

const WIDTH = 64;
const HEIGHT = 64;
const PIXEL = 4; // 16x16 grid

const TRAITS = {
  "vitaleak-butterbean": {
    bg: "#131a2f",
    skin: "#f2d6c7",
    hair: "#4a4b6a",
    outfit: "#6a6a6f",
    accent: "#627EEA",
    hairStyle: "messy",
    expression: "intense",
    faceShape: "gaunt",
    accessories: ["hoodie"],
  },
  "chungus-zhao": {
    bg: "#1d1a0d",
    skin: "#f3c9a7",
    hair: "#1a1a1a",
    outfit: "#f0b90b",
    accent: "#f5d36b",
    hairStyle: "short",
    expression: "smug",
    faceShape: "round",
    accessories: ["chain"],
  },
  "scam-bankman-fraud": {
    bg: "#0e1f1a",
    skin: "#f1c7a6",
    hair: "#5b3a2b",
    outfit: "#ff7a1a",
    accent: "#00d4aa",
    hairStyle: "afro",
    expression: "nervous",
    faceShape: "square",
    accessories: ["sweat"],
  },
  "michael-staylor": {
    bg: "#1a1007",
    skin: "#e8c8a8",
    hair: "#f5d36b",
    outfit: "#ff9500",
    accent: "#ff9500",
    hairStyle: "bald",
    expression: "intense",
    faceShape: "square",
    accessories: ["laser"],
  },
  "arthur-haze": {
    bg: "#1a0812",
    skin: "#704c36",
    hair: "#1a1a1a",
    outfit: "#ff0066",
    accent: "#ff7abf",
    hairStyle: "short",
    expression: "cool",
    faceShape: "square",
    accessories: ["sunglasses"],
  },
  "do-kwong": {
    bg: "#0b1226",
    skin: "#f1c5a2",
    hair: "#1f1f1f",
    outfit: "#5493f7",
    accent: "#d9e4ff",
    hairStyle: "slick",
    expression: "nervous",
    faceShape: "square",
    accessories: ["glasses", "sweat"],
  },
  "ape-sem": {
    bg: "#120b1f",
    skin: "#f1b88c",
    hair: "#7a3cff",
    outfit: "#9945ff",
    accent: "#b388ff",
    hairStyle: "short",
    expression: "hype",
    faceShape: "square",
    accessories: ["cap-back"],
  },
  "banana-pal": {
    bg: "#1a1a0a",
    skin: "#e4b98c",
    hair: "#5b3a2b",
    outfit: "#f4c542",
    accent: "#ffd700",
    hairStyle: "messy",
    expression: "zen",
    faceShape: "square",
    accessories: ["banana", "sunglasses"],
  },
  "gary-guzzler": {
    bg: "#10121b",
    skin: "#d7b9a1",
    hair: "#8b8b8b",
    outfit: "#1a2b4c",
    accent: "#cc0000",
    hairStyle: "recede",
    expression: "stern",
    faceShape: "square",
    accessories: ["badge"],
  },
  "elongated-muskrat": {
    bg: "#0c1626",
    skin: "#f1c9a6",
    hair: "#5b3a2b",
    outfit: "#111111",
    accent: "#1da1f2",
    hairStyle: "recede",
    expression: "mischief",
    faceShape: "gaunt",
    accessories: ["phone", "rocket"],
  },
};

const hairMap = {
  messy: [
    [3, 1, 3, 1],
    [8, 1, 3, 1],
    [3, 2, 10, 1],
    [2, 3, 12, 1],
    [3, 4, 10, 1],
    [2, 4, 1, 1],
    [12, 4, 1, 1],
  ],
  short: [
    [4, 3, 8, 1],
    [4, 4, 8, 1],
  ],
  afro: [
    [3, 1, 10, 1],
    [2, 2, 12, 1],
    [1, 3, 14, 1],
    [1, 4, 14, 1],
    [2, 5, 12, 1],
  ],
  slick: [
    [4, 2, 8, 1],
    [5, 3, 7, 1],
    [6, 4, 6, 1],
  ],
  recede: [
    [4, 3, 2, 1],
    [10, 3, 2, 1],
    [5, 4, 6, 1],
  ],
  cap: [
    [3, 2, 10, 1],
    [2, 3, 12, 2],
  ],
  bald: [[6, 3, 4, 1]],
};

const accessoriesMap = {
  hoodie: [
    [2, 5, 12, 1],
    [2, 6, 2, 2],
    [12, 6, 2, 2],
    [3, 7, 10, 1],
  ],
  sunglasses: [
    [5, 6, 2, 1],
    [9, 6, 2, 1],
    [7, 6, 2, 1],
  ],
  glasses: [
    [5, 6, 2, 1],
    [9, 6, 2, 1],
    [7, 6, 2, 1],
    [4, 6, 1, 1],
    [11, 6, 1, 1],
  ],
  phone: [[12, 11, 2, 3]],
  banana: [[2, 12, 2, 1]],
  chain: [[5, 12, 6, 1]],
  badge: [[10, 13, 2, 2]],
  rocket: [
    [6, 13, 2, 2],
    [7, 12, 1, 1],
  ],
  "cap-back": [
    [12, 2, 2, 2],
    [2, 4, 12, 1],
  ],
  sweat: [[11, 7, 1, 2]],
};

const expressionBrows = {
  intense: [
    [5, 5, 2, 1],
    [9, 5, 2, 1],
  ],
  smug: [
    [5, 5, 2, 1],
    [9, 4, 2, 1],
  ],
  nervous: [
    [5, 5, 2, 1],
    [9, 5, 2, 1],
  ],
  cool: [
    [5, 5, 2, 1],
    [9, 5, 2, 1],
  ],
  hype: [
    [5, 4, 2, 1],
    [9, 4, 2, 1],
  ],
  zen: [
    [5, 5, 2, 1],
    [9, 5, 2, 1],
  ],
  stern: [
    [5, 4, 2, 1],
    [9, 4, 2, 1],
  ],
  mischief: [
    [5, 4, 2, 1],
    [9, 5, 2, 1],
  ],
};

const expressionMouth = {
  intense: [[6, 9, 4, 1]],
  smug: [
    [6, 9, 1, 1],
    [7, 8, 2, 1],
    [9, 9, 1, 1],
  ],
  nervous: [[7, 9, 2, 1]],
  cool: [[7, 9, 2, 1]],
  hype: [[7, 9, 2, 2]],
  zen: [
    [6, 9, 4, 1],
    [7, 8, 2, 1],
  ],
  stern: [[6, 9, 4, 1]],
  mischief: [
    [6, 8, 3, 1],
    [9, 9, 1, 1],
  ],
};

const faceShapes = {
  gaunt: { x: 5, y: 4, w: 6, h: 7 },
  round: { x: 3, y: 4, w: 10, h: 7 },
  square: { x: 4, y: 4, w: 8, h: 7 },
};

const hexToRgba = (hex) => {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return [r, g, b, 255];
};

const createCanvas = () => new Uint8Array(WIDTH * HEIGHT * 4);

const setPixel = (data, x, y, color) => {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  const idx = (y * WIDTH + x) * 4;
  data[idx] = color[0];
  data[idx + 1] = color[1];
  data[idx + 2] = color[2];
  data[idx + 3] = color[3];
};

const drawRect = (data, x, y, w, h, color) => {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      setPixel(data, xx, yy, color);
    }
  }
};

const drawBlocks = (data, blocks, color) => {
  blocks.forEach(([x, y, w, h]) => {
    drawRect(data, x * PIXEL, y * PIXEL, w * PIXEL, h * PIXEL, color);
  });
};

const renderPortrait = (traits) => {
  const data = createCanvas();
  const bg = hexToRgba(traits.bg);
  drawRect(data, 0, 0, WIDTH, HEIGHT, bg);

  drawBlocks(data, [[3, 12, 10, 4]], hexToRgba(traits.outfit));
  drawBlocks(data, [[4, 12, 8, 1]], hexToRgba(traits.outfit));

  const face = faceShapes[traits.faceShape] || faceShapes.square;
  drawBlocks(data, [[face.x, face.y, face.w, face.h]], hexToRgba(traits.skin));
  drawBlocks(data, [[7, 11, 2, 2]], hexToRgba(traits.skin));

  drawBlocks(data, hairMap[traits.hairStyle] || hairMap.bald, hexToRgba(traits.hair));

  drawBlocks(data, expressionBrows[traits.expression], hexToRgba("#111111"));

  if (traits.accessories?.includes("laser")) {
    drawBlocks(data, [[0, 6, 5, 1], [11, 6, 5, 1]], hexToRgba(traits.accent));
  }

  drawBlocks(data, [[6, 6, 1, 1], [9, 6, 1, 1]], hexToRgba("#111111"));
  drawBlocks(data, expressionMouth[traits.expression], hexToRgba("#111111"));

  (traits.accessories || []).forEach((item) => {
    if (item === "laser") return;
    const blocks = accessoriesMap[item];
    if (!blocks) return;
    const color = item === "phone" ? "#111111" : item === "banana" ? "#ffd166" : traits.accent;
    drawBlocks(data, blocks, hexToRgba(color));
  });

  return data;
};

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (buf) => {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const writeChunk = (type, data) => {
  const typeBuf = Buffer.from(type);
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf]);
};

const writePng = (data, outputPath) => {
  const raw = Buffer.alloc((WIDTH * 4 + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) {
    const rowStart = y * (WIDTH * 4 + 1);
    raw[rowStart] = 0;
    const rowDataStart = rowStart + 1;
    data.copy(raw, rowDataStart, y * WIDTH * 4, (y + 1) * WIDTH * 4);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(WIDTH, 0);
  header.writeUInt32BE(HEIGHT, 4);
  header.writeUInt8(8, 8);
  header.writeUInt8(6, 9);
  header.writeUInt8(0, 10);
  header.writeUInt8(0, 11);
  header.writeUInt8(0, 12);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = writeChunk("IHDR", header);
  const idat = writeChunk("IDAT", zlib.deflateSync(raw));
  const iend = writeChunk("IEND", Buffer.alloc(0));
  const png = Buffer.concat([signature, ihdr, idat, iend]);

  fs.writeFileSync(outputPath, png);
};

const outputDir = path.join(process.cwd(), "public", "portraits");
fs.mkdirSync(outputDir, { recursive: true });

Object.entries(TRAITS).forEach(([id, traits]) => {
  const data = renderPortrait(traits);
  const outputPath = path.join(outputDir, `${id}.png`);
  writePng(Buffer.from(data), outputPath);
  console.log(`Wrote ${outputPath}`);
});
