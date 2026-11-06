const { NAMES } = require('./names');

const DEG = 180 / Math.PI;

function clamp(v, min, max) {
  return v < min ? min : (v > max ? max : v);
}

function channel(v) {
  return clamp(Math.round(v), 0, 255);
}

/*
 * 各色彩空间的互转算法参考 chroma-js。
 */

function hsl2rgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l * 255;
  } else {
    const t2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const t1 = 2 * l - t2;
    const t3 = [h / 360 + 1 / 3, h / 360, h / 360 - 1 / 3];
    const c = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      if (t3[i] < 0) { t3[i] += 1; }
      if (t3[i] > 1) { t3[i] -= 1; }
      if (6 * t3[i] < 1) { c[i] = t1 + (t2 - t1) * 6 * t3[i]; }
      else if (2 * t3[i] < 1) { c[i] = t2; }
      else if (3 * t3[i] < 2) { c[i] = t1 + (t2 - t1) * (2 / 3 - t3[i]) * 6; }
      else { c[i] = t1; }
    }
    r = c[0] * 255;
    g = c[1] * 255;
    b = c[2] * 255;
  }
  return [r, g, b];
}

function rgb2hsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const minRgb = Math.min(r, g, b);
  const maxRgb = Math.max(r, g, b);
  const l = (maxRgb + minRgb) / 2;
  let s = 0;
  let h = Number.NaN;
  if (maxRgb !== minRgb) {
    s = l < 0.5
      ? (maxRgb - minRgb) / (maxRgb + minRgb)
      : (maxRgb - minRgb) / (2 - maxRgb - minRgb);
    if (r === maxRgb) { h = (g - b) / (maxRgb - minRgb); }
    else if (g === maxRgb) { h = 2 + (b - r) / (maxRgb - minRgb); }
    else { h = 4 + (r - g) / (maxRgb - minRgb); }
    h *= 60;
    if (h < 0) { h += 360; }
  }
  return [h, s, l];
}

function hsv2rgb(h, s, v) {
  let r, g, b;
  v *= 255;
  if (s === 0) {
    r = g = b = v;
  } else {
    if (h === 360) { h = 0; }
    if (h > 360) { h -= 360; }
    if (h < 0) { h += 360; }
    h /= 60;
    const i = Math.floor(h);
    const f = h - i;
    const p = v * (1 - s);
    const q = v * (1 - s * f);
    const t = v * (1 - s * (1 - f));
    switch (i) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      default: r = v; g = p; b = q; break;
    }
  }
  return [r, g, b];
}

function rgb2hsv(r, g, b) {
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  const delta = max - min;
  const v = max / 255;
  let h = Number.NaN;
  let s = 0;
  if (max !== 0) {
    s = delta / max;
    if (delta !== 0) {
      if (r === max) { h = (g - b) / delta; }
      else if (g === max) { h = 2 + (b - r) / delta; }
      else { h = 4 + (r - g) / delta; }
      h *= 60;
      if (h < 0) { h += 360; }
    }
  }
  return [h, s, v];
}

function cmyk2rgb(c, m, y, k) {
  if (k >= 1) { return [0, 0, 0]; }
  return [
    c >= 1 ? 0 : 255 * (1 - c) * (1 - k),
    m >= 1 ? 0 : 255 * (1 - m) * (1 - k),
    y >= 1 ? 0 : 255 * (1 - y) * (1 - k),
  ];
}

function rgb2cmyk(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const k = 1 - Math.max(r, Math.max(g, b));
  const f = k < 1 ? 1 / (1 - k) : 0;
  return [(1 - r - k) * f, (1 - g - k) * f, (1 - b - k) * f, k];
}

function rgb2lrgb(c) {
  c /= 255;
  const abs = Math.abs(c);
  if (abs < 0.04045) { return c / 12.92; }
  return (Math.sign(c) || 1) * Math.pow((abs + 0.055) / 1.055, 2.4);
}

function lrgb2rgb(c) {
  const abs = Math.abs(c);
  if (abs > 0.0031308) {
    return 255 * (Math.sign(c) || 1) * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
  }
  return 255 * c * 12.92;
}

function rgb2oklab(r, g, b) {
  const lr = rgb2lrgb(r);
  const lg = rgb2lrgb(g);
  const lb = rgb2lrgb(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklab2rgb(L, a, b) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    lrgb2rgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    lrgb2rgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    lrgb2rgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function lab2lch(l, a, b) {
  const c = Math.sqrt(a * a + b * b);
  let h = Math.atan2(b, a) * DEG;
  if (h < 0) { h += 360; }
  return [l, c, h];
}

function lch2lab(l, c, h) {
  const rad = h / DEG;
  return [l, Math.cos(rad) * c, Math.sin(rad) * c];
}

function hexBody2rgb(body) {
  if (body.length === 3 || body.length === 4) {
    body = body.split('').map(ch => ch + ch).join('');
  }
  const u = parseInt(body, 16);
  if (body.length === 8) {
    return [(u >> 24) & 0xff, (u >> 16) & 0xff, (u >> 8) & 0xff, (u & 0xff) / 255];
  }
  return [(u >> 16) & 0xff, (u >> 8) & 0xff, u & 0xff, 1];
}

function toHex2(v) {
  const s = channel(v).toString(16);
  return s.length === 1 ? '0' + s : s;
}

/*
 * 函数式语法的参数解析。
 */

function parseAlphaToken(token) {
  if (!token) { return null; }
  let v;
  if (token.endsWith('%')) {
    v = Number.parseFloat(token) / 100;
  } else {
    v = Number.parseFloat(token);
  }
  return Number.isFinite(v) ? clamp(v, 0, 1) : null;
}

function parseHueToken(token) {
  if (token.endsWith('deg')) { return Number.parseFloat(token); }
  if (token.endsWith('rad')) { return Number.parseFloat(token) * DEG; }
  if (token.endsWith('grad')) { return Number.parseFloat(token) * 0.9; }
  if (token.endsWith('turn')) { return Number.parseFloat(token) * 360; }
  return Number.parseFloat(token);
}

/** 解析 0~1 的比例值：支持 `50%` 百分比或 0~1 小数，大于 1 的裸数值按百分制处理。 */
function parseRatioToken(token) {
  if (token.endsWith('%')) {
    const v = Number.parseFloat(token) / 100;
    return Number.isFinite(v) ? clamp(v, 0, 1) : null;
  }
  const v = Number.parseFloat(token);
  if (!Number.isFinite(v)) { return null; }
  return clamp(v > 1 ? v / 100 : v, 0, 1);
}

function parseNumberToken(token) {
  const v = Number.parseFloat(token);
  return Number.isFinite(v) ? v : null;
}

function parseChannelToken(token) {
  if (token.endsWith('%')) {
    const v = Number.parseFloat(token) * 2.55;
    return Number.isFinite(v) ? clamp(v, 0, 255) : null;
  }
  const v = Number.parseFloat(token);
  return Number.isFinite(v) ? clamp(v, 0, 255) : null;
}

/** 拆分函数体：`/` 之后为 alpha，其余按逗号或空格分隔。 */
function splitBody(body) {
  let alpha = null;
  let main = body;
  const slash = body.indexOf('/');
  if (slash >= 0) {
    alpha = parseAlphaToken(body.slice(slash + 1).trim());
    if (alpha === null) { return null; }
    main = body.slice(0, slash);
  }
  const tokens = main.trim().split(/[\s,]+/).filter(t => t.length > 0);
  return { tokens, alpha };
}

function parseFunction(name, body) {
  const split = splitBody(body);
  if (!split) { return null; }
  const { tokens, alpha } = split;
  // 旧式逗号语法将 alpha 作为最后一个参数。
  let tailAlpha = alpha;
  let args = tokens;
  const withTail = (count) => {
    if (tokens.length === count + 1) {
      tailAlpha = parseAlphaToken(tokens[count]);
      if (tailAlpha === null) { return false; }
      args = tokens.slice(0, count);
    } else if (tokens.length !== count) {
      return false;
    }
    return true;
  };
  const a = () => (tailAlpha === null ? 1 : tailAlpha);

  switch (name) {
    case 'rgb':
    case 'rgba': {
      if (!withTail(3)) { return null; }
      const c = args.map(parseChannelToken);
      if (c.some(v => v === null)) { return null; }
      return [c[0], c[1], c[2], a()];
    }
    case 'hsl':
    case 'hsla': {
      if (!withTail(3)) { return null; }
      const h = parseHueToken(args[0]);
      const s = parseRatioToken(args[1]);
      const l = parseRatioToken(args[2]);
      if ([h, s, l].some(v => v === null)) { return null; }
      const rgb = hsl2rgb(h, s, l);
      return [rgb[0], rgb[1], rgb[2], a()];
    }
    case 'hsv':
    case 'hsva':
    case 'hsb':
    case 'hsba': {
      if (!withTail(3)) { return null; }
      const h = parseHueToken(args[0]);
      const s = parseRatioToken(args[1]);
      const v = parseRatioToken(args[2]);
      if ([h, s, v].some(vv => vv === null)) { return null; }
      const rgb = hsv2rgb(h, s, v);
      return [rgb[0], rgb[1], rgb[2], a()];
    }
    case 'cmyk':
    case 'cmyka': {
      if (!withTail(4)) { return null; }
      const c = args.map(parseRatioToken);
      if (c.some(v => v === null)) { return null; }
      const rgb = cmyk2rgb(c[0], c[1], c[2], c[3]);
      return [rgb[0], rgb[1], rgb[2], a()];
    }
    case 'oklch': {
      if (!withTail(3)) { return null; }
      const l = parseRatioToken(args[0]);
      const c = parseNumberToken(args[1]);
      const h = parseHueToken(args[2]);
      if ([l, c, h].some(v => v === null)) { return null; }
      const lab = lch2lab(l, c, h);
      const rgb = oklab2rgb(lab[0], lab[1], lab[2]);
      return [rgb[0], rgb[1], rgb[2], a()];
    }
    case 'oklab': {
      if (!withTail(3)) { return null; }
      const l = parseRatioToken(args[0]);
      const oa = parseNumberToken(args[1]);
      const ob = parseNumberToken(args[2]);
      if ([l, oa, ob].some(v => v === null)) { return null; }
      const rgb = oklab2rgb(l, oa, ob);
      return [rgb[0], rgb[1], rgb[2], a()];
    }
    default:
      return null;
  }
}

/**
 * 表示一个颜色，内部以 sRGB 的 [r, g, b, a] 保存，r/g/b 为 0~255，a 为 0~1。
 */
class Color {
  /**
   * @param {number[]} rgba 0~255 的 RGB 通道与 0~1 的 alpha。
   */
  constructor(rgba) {
    this._rgba = [
      clamp(rgba[0], 0, 255),
      clamp(rgba[1], 0, 255),
      clamp(rgba[2], 0, 255),
      clamp(rgba[3] === undefined ? 1 : rgba[3], 0, 1),
    ];
  }

  /**
   * 解析用户输入的颜色文本。
   * @param {string} text 颜色文本，支持 #FF00FF、0xFF00FF、FF00FF、rgb()/hsl()/oklch() 等函数式写法、CSS 颜色名以及裸数值。
   * @returns {Color | null} 解析结果，无法解析时返回 null。
   */
  static parse(text) {
    if (typeof text !== 'string') { return null; }
    let t = text.trim().toLowerCase();
    if (!t) { return null; }
    if (t === 'transparent') { return new Color([0, 0, 0, 0]); }
    if (NAMES[t]) { return new Color(hexBody2rgb(NAMES[t].slice(1))); }

    // 0x 前缀的十六进制。
    let m = t.match(/^0x([0-9a-f]+)$/);
    if (m) { t = m[1]; }
    // 十六进制，# 可省略。
    m = t.match(/^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
    if (m) { return new Color(hexBody2rgb(m[1])); }
    // 函数式写法。
    m = t.match(/^([a-z]+)\(([^()]*)\)$/);
    if (m) {
      const rgba = parseFunction(m[1], m[2]);
      return rgba ? new Color(rgba) : null;
    }
    // 裸数值：`255,0,255`、`255 0 255 / 0.5` 等。
    let alpha = 1;
    let main = t;
    const slash = t.lastIndexOf('/');
    if (slash >= 0) {
      alpha = parseAlphaToken(t.slice(slash + 1).trim());
      if (alpha === null) { return null; }
      main = t.slice(0, slash);
    }
    const parts = main.trim().split(/[\s,]+/).filter(p => p.length > 0);
    if (parts.length === 4) {
      alpha = parseAlphaToken(parts[3]);
      if (alpha === null) { return null; }
      parts.length = 3;
    }
    if (parts.length === 3) {
      const c = parts.map(parseChannelToken);
      if (c.some(v => v === null)) { return null; }
      return new Color([c[0], c[1], c[2], alpha]);
    }
    return null;
  }

  /** @returns {number[]} 0~255 的 RGB 与 0~1 的 alpha。 */
  rgba() {
    return this._rgba.slice();
  }

  /** @returns {number[]} 0~255 的 RGB 通道。 */
  rgb() {
    return this._rgba.slice(0, 3);
  }

  /** @returns {number} 0~1 的 alpha。 */
  alpha() {
    return this._rgba[3];
  }

  /**
   * 返回十六进制表示。
   * @param {boolean} includeAlpha 是否包含 alpha 通道。
   * @param {boolean} upper 是否使用大写字母。
   */
  hex(includeAlpha, upper) {
    let s = toHex2(this._rgba[0]) + toHex2(this._rgba[1]) + toHex2(this._rgba[2]);
    if (includeAlpha) {
      s += toHex2(this._rgba[3] * 255);
    }
    return upper ? s.toUpperCase() : s.toLowerCase();
  }

  /** @returns {number[]} HSL，h 为角度(无色相时为 NaN)，s/l 为 0~1。 */
  hsl() {
    const r = this.rgb();
    return rgb2hsl(r[0], r[1], r[2]);
  }

  /** @returns {number[]} HSV，h 为角度(无色相时为 NaN)，s/v 为 0~1。 */
  hsv() {
    const r = this.rgb();
    return rgb2hsv(r[0], r[1], r[2]);
  }

  /** @returns {number[]} CMYK，各通道为 0~1。 */
  cmyk() {
    const r = this.rgb();
    return rgb2cmyk(r[0], r[1], r[2]);
  }

  /** @returns {number[]} OKLab，L 为 0~1。 */
  oklab() {
    const r = this.rgb();
    return rgb2oklab(r[0], r[1], r[2]);
  }

  /** @returns {number[]} OKLCH，L 为 0~1，h 为角度。 */
  oklch() {
    const lab = this.oklab();
    return lab2lch(lab[0], lab[1], lab[2]);
  }

  /** @returns {string | null} 精确匹配的 CSS 颜色名。 */
  name() {
    if (this._rgba[3] === 0 && this._rgba[0] === 0 && this._rgba[1] === 0 && this._rgba[2] === 0) {
      return 'transparent';
    }
    if (this._rgba[3] < 1) { return null; }
    const hex = this.hex(false, false);
    for (const name in NAMES) {
      if (NAMES[name].slice(1) === hex) { return name; }
    }
    return null;
  }

  /**
   * 返回感知上最接近的 CSS 颜色名(基于 OKLab 距离)。
   * @returns {{ name: string, exact: boolean }} 最接近的颜色名与是否精确匹配。
   */
  nearestName() {
    const exact = this.name();
    if (exact) { return { name: exact, exact: true }; }
    const lab = this.oklab();
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const name in NAMES) {
      const other = new Color(hexBody2rgb(NAMES[name].slice(1))).oklab();
      const dl = lab[0] - other[0];
      const da = lab[1] - other[1];
      const db = lab[2] - other[2];
      const distance = dl * dl + da * da + db * db;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = name;
      }
    }
    return { name: best, exact: false };
  }
}

module.exports = { Color };
