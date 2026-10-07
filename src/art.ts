export const palette = [
  "#c7a2ff",
  "#ff9bc9",
  "#73e1ed",
  "#ba9bff",
  "#ffc68c",
  "#ff8cab",
];
export function round(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 2;
    c.stroke();
  }
}
export function text(
  c: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size = 16,
  color = "#fff",
  align: CanvasTextAlign = "left",
  weight = "600",
) {
  c.font = `${weight} ${size}px "Trebuchet MS",sans-serif`;
  c.textAlign = align;
  c.fillStyle = color;
  c.fillText(s, x, y);
}
function ellipse(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, 7);
  c.fillStyle = fill;
  c.fill();
}
function path(
  c: CanvasRenderingContext2D,
  points: number[][],
  fill: string,
  stroke?: string,
) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 2;
    c.stroke();
  }
}
export function angel(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  c.save();
  c.translate(x, y);
  c.scale(size / 100, size / 100);
  const g = c.createLinearGradient(0, -60, 0, 60);
  g.addColorStop(0, "#c9b1fa");
  g.addColorStop(1, "#f6b6cf");
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(4, -26);
  c.bezierCurveTo(-24, -24, -20, -60, -42, -49);
  c.bezierCurveTo(-65, -43, -33, -7, -49, 32);
  c.bezierCurveTo(-34, 24, -29, 13, -27, 0);
  c.bezierCurveTo(-24, 17, -19, 22, -15, 24);
  c.bezierCurveTo(-19, 8, -8, -11, 4, -15);
  c.fill();
  c.beginPath();
  c.moveTo(3, -24);
  c.bezierCurveTo(-4, -41, 10, -57, 25, -48);
  c.bezierCurveTo(39, -47, 33, -32, 39, -27);
  c.lineTo(31, -25);
  c.bezierCurveTo(35, -15, 23, -13, 24, -6);
  c.bezierCurveTo(49, 4, 47, 20, 32, 19);
  c.lineTo(32, 47);
  c.lineTo(-4, 47);
  c.bezierCurveTo(-10, 18, -8, -5, 3, -24);
  c.fill();
  c.restore();
}
export function stas(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  vx: number,
  vy: number,
  face: number,
  mode = "idle",
  scale = 1,
) {
  c.save();
  c.translate(x, y);
  c.scale(face * scale, scale);
  const run = Math.min(1, Math.abs(vx) / 230),
    a = Math.sin(t * 14) * run,
    air = Math.abs(vy) > 35;
  const squash =
    mode === "land" ? 0.88 : air ? 1.06 : 1 + Math.sin(t * 3) * 0.012;
  c.scale(1 / squash, squash);
  ellipse(c, 0, 1, 24, 5, "#0005");
  // Shoes and articulated trousers.
  for (const side of [-1, 1]) {
    const step = air ? side * 7 : a * side * 12;
    round(c, -14 + side * 7, -37, 15, 24, 6, "#282836");
    c.save();
    c.translate(side * 8, -20);
    c.rotate(step * 0.035);
    round(c, -7, -4, 14, 23, 5, "#262633");
    round(c, -8, 14, 23, 10, 4, "#d8d7e3");
    round(c, -8, 21, 23, 3, 1, "#9094b0");
    c.restore();
  }
  // Hoodie, black tee, and denim panels.
  round(c, -24, -83, 46, 51, 12, "#a9aeb3", "#555964");
  round(c, -12, -77, 25, 44, 5, "#16151e");
  path(
    c,
    [
      [-23, -80],
      [-11, -72],
      [-9, -35],
      [-28, -37],
    ],
    "#92b0bb",
    "#c6d3d7",
  );
  path(
    c,
    [
      [10, -76],
      [23, -80],
      [29, -39],
      [10, -34],
    ],
    "#9eb8c2",
    "#cfdbdc",
  );
  path(
    c,
    [
      [-18, -85],
      [-8, -70],
      [-16, -62],
      [-24, -78],
    ],
    "#d3d0c7",
  );
  path(
    c,
    [
      [13, -85],
      [23, -79],
      [15, -62],
      [8, -73],
    ],
    "#c4c2bc",
  );
  round(c, -24, -62, 12, 13, 2, "#7d9faa", "#cad4d6");
  round(c, 13, -62, 11, 13, 2, "#8ca9b3", "#d7dddc");
  // Arms swing from shoulders.
  for (const side of [-1, 1]) {
    c.save();
    c.translate(side * 23, -73);
    c.rotate(
      (air ? side * 0.42 : a * side * 0.65) +
        (mode === "fine" && side === 1 ? -1.25 : 0),
    );
    round(c, -8, -1, 16, 31, 7, "#93afbb", "#bccbd1");
    round(c, -7, 22, 15, 7, 2, "#c3c6c0");
    ellipse(c, 1, 34, 8, 10, "#d99d80");
    if (side === 1) {
      path(
        c,
        [
          [-5, 29],
          [5, 33],
          [-4, 39],
          [4, 27],
          [6, 39],
        ],
        "#39414a",
      );
    }
    if (mode === "phone" && side === 1) {
      round(c, -7, 27, 15, 23, 3, "#191b24", "#606676");
      ellipse(c, -3, 31, 2, 2, "#bcbcd5");
    }
    c.restore();
  }
  // Oversized head, close-cut sides, dark textured crown and beard.
  round(c, -7, -90, 17, 14, 4, "#ce8e71");
  ellipse(c, 1, -104, 25, 29, "#e4ad8e");
  ellipse(c, -22, -104, 5, 8, "#d99b7d");
  ellipse(c, 24, -104, 4, 7, "#d89b7d");
  path(
    c,
    [
      [-22, -107],
      [-25, -123],
      [-17, -135],
      [0, -140],
      [21, -132],
      [26, -118],
      [23, -107],
      [16, -122],
      [-13, -124],
    ],
    "#252630",
  );
  path(
    c,
    [
      [-20, -123],
      [-15, -137],
      [-10, -133],
      [-3, -142],
      [3, -137],
      [10, -139],
      [15, -132],
      [21, -133],
      [24, -119],
    ],
    "#30303a",
  );
  path(
    c,
    [
      [-22, -103],
      [-15, -97],
      [-8, -95],
      [1, -98],
      [12, -96],
      [22, -102],
      [20, -84],
      [9, -77],
      [-4, -77],
      [-17, -87],
    ],
    "#303039",
  );
  ellipse(c, 6, -91, 9, 4, "#ca8b74");
  c.strokeStyle = "#372f31";
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(-13, -113);
  c.lineTo(-4, -113);
  c.moveTo(8, -113);
  c.lineTo(18, -111);
  c.stroke();
  const blink = Math.sin(t * 0.7) > 0.995;
  ellipse(c, -8, -108, 2, blink ? 0.5 : 2.4, "#252635");
  ellipse(c, 14, -107, 2, blink ? 0.5 : 2.4, "#252635");
  path(
    c,
    [
      [5, -106],
      [3, -98],
      [10, -99],
    ],
    "#ca8c70",
  );
  c.strokeStyle = "#e0e2ea";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(15, -119);
  c.lineTo(18, -115);
  c.stroke();
  ellipse(c, 18, -115, 1.5, 1.5, "#fff");
  c.restore();
}
export function teammate(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  id: string,
  t: number,
  scale = 1,
) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  const colors: Record<string, string> = {
    marat: "#b6b9ff",
    roxy: "#ff96ca",
    artem: "#75e4dd",
    max: "#d4a4ff",
  };
  const color = colors[id];
  ellipse(c, 0, 0, 24, 5, "#0005");
  round(c, -18, -38, 14, 37, 5, "#303044");
  round(c, 5, -38, 14, 37, 5, "#303044");
  round(c, -23, -75, 46, 45, 12, color);
  ellipse(c, 0, -97, 25, 28, "#e8b699");
  if (id === "roxy") {
    ellipse(c, -23, -88, 12, 37, "#b85086");
    ellipse(c, 22, -90, 10, 36, "#b85086");
    path(
      c,
      [
        [-24, -103],
        [-18, -129],
        [6, -134],
        [25, -118],
        [24, -99],
        [10, -119],
      ],
      "#cf6297",
    );
  } else {
    round(
      c,
      -25,
      -125,
      49,
      17,
      9,
      id === "marat" ? "#8c88c2" : id === "max" ? "#4c376c" : "#654c3e",
    );
  }
  text(c, id === "marat" ? "− −" : "• •", 0, -96, 16, "#34303c", "center");
  if (id === "artem") {
    round(c, -22, -109, 19, 15, 4, "#1239", "#294851");
    round(c, 3, -109, 19, 15, 4, "#1239", "#294851");
    round(c, -15, -61, 30, 20, 3, "#172c39", "#b8fff9");
  }
  if (id === "max") {
    c.strokeStyle = "#201b2f";
    c.lineWidth = 6;
    c.beginPath();
    c.arc(0, -107, 28, Math.PI, 0);
    c.stroke();
    round(c, -31, -107, 9, 21, 4, "#34304c");
    round(c, 22, -107, 9, 21, 4, "#34304c");
  }
  if (id === "marat") text(c, "z Z", 28 + Math.sin(t) * 3, -130, 18, "#d3ceff");
  round(c, -27, -67, 10, 34, 5, color);
  round(c, 18, -67, 10, 34, 5, color);
  c.restore();
}
export function background(
  c: CanvasRenderingContext2D,
  camera: number,
  t: number,
  chapter: number,
) {
  const accent = palette[chapter];
  const g = c.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, "#121320");
  g.addColorStop(1, chapter === 1 ? "#302036" : "#272339");
  c.fillStyle = g;
  c.fillRect(0, 0, 1280, 720);
  c.fillStyle = "#c5b6e9";
  c.globalAlpha = 0.3;
  for (let i = 0; i < 35; i++) {
    const x = (((i * 137 - camera * 0.08) % 1400) + 1400) % 1400;
    c.fillRect(x, 85 + ((i * 73) % 270), 2, 2);
  }
  c.globalAlpha = 1;
  for (let i = -1; i < 9; i++) {
    const x = i * 220 - ((camera * 0.18) % 220);
    round(c, x, 160, 182, 355, 4, "#0d1324", "#393249");
    c.fillStyle = "#171b31";
    c.fillRect(x + 5, 166, 172, 338);
    for (let j = 0; j < 6; j++) {
      const bx = x + 8 + j * 29,
        by = 300 - (((i + j + 50) * 37) % 150);
      c.fillStyle = ["#20223c", "#26243e", "#2d2943"][j % 3];
      c.fillRect(bx, by, 27, 510 - by);
      for (let k = 0; k < 8; k++) {
        c.fillStyle = (k + j) % 3 === 0 ? "#bd8bbc55" : "#74719a22";
        c.fillRect(bx + 8, by + 15 + k * 27, 7, 11);
      }
    }
    c.fillStyle = "#343043";
    c.fillRect(x + 88, 164, 5, 345);
    c.fillRect(x, 330, 182, 6);
  }
  // Ceiling fixtures and office desks provide three layers of depth.
  for (let i = -1; i < 7; i++) {
    const x = i * 290 - ((camera * 0.4) % 290);
    c.strokeStyle = "#665777";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x + 90, 0);
    c.lineTo(x + 90, 75);
    c.stroke();
    round(c, x + 25, 74, 135, 7, 4, "#cfb5e4");
    const glow = c.createRadialGradient(x + 90, 84, 4, x + 90, 84, 150);
    glow.addColorStop(0, "#d4a7ed15");
    glow.addColorStop(1, "#d4a7ed00");
    c.fillStyle = glow;
    c.fillRect(x - 60, 80, 300, 210);
  }
  for (let i = -1; i < 8; i++) {
    const x = i * 260 - ((camera * 0.6) % 260);
    round(c, x + 15, 460, 192, 10, 4, "#514459");
    round(c, x + 24, 470, 8, 104, 2, "#332f43");
    round(c, x + 187, 470, 8, 104, 2, "#332f43");
    round(c, x + 53, 382, 105, 65, 5, "#101521", "#5d4b6c");
    round(c, x + 59, 389, 93, 50, 2, chapter === 1 ? "#412746" : "#253049");
    if (chapter === 2) {
      for (let b = 0; b < 6; b++)
        round(c, x + 67 + b * 13, 421 - b * 4, 7, 12 + b * 4, 1, accent + "99");
    } else {
      for (let b = 0; b < 4; b++)
        round(
          c,
          x + 67,
          398 + b * 9,
          40 + ((b * 17) % 30),
          3,
          1,
          accent + "66",
        );
    }
    round(c, x + 99, 445, 12, 14, 1, "#5d4b6c");
    round(c, x + 84, 457, 43, 3, 1, "#786782");
    round(c, x + 172, 436, 17, 24, 3, "#b195b6");
    if (chapter === 4) {
      round(c, x + 30, 417, 50, 41, 3, "#88849b");
      text(c, "▤", x + 55, 444, 25, "#e3dfe9", "center");
    }
  }
  if (chapter === 3) {
    c.fillStyle = "#0c112088";
    c.fillRect(0, 345, 1280, 250);
    for (let i = 0; i < 7; i++) {
      c.save();
      c.translate(i * 210 - ((camera * 0.3) % 210), 540);
      c.rotate(Math.sin(t * 2 + i) * 0.35);
      const beam = c.createLinearGradient(0, 0, 0, -500);
      beam.addColorStop(0, accent + "33");
      beam.addColorStop(1, accent + "00");
      path(
        c,
        [
          [-15, 0],
          [-110, -500],
          [110, -500],
          [15, 0],
        ],
        beam as unknown as string,
      );
      c.restore();
    }
  }
  c.fillStyle = "#0d0d1780";
  c.fillRect(0, 590, 1280, 130);
}
