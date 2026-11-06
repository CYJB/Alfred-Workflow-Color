#! /usr/bin/osascript -l JavaScript

const app = Application.currentApplication();
app.includeStandardAdditions = true;

// 引入 require 方法。
let require;
{
  const requirePath = './lib/require.js';
  const handle = app.openForAccess(requirePath);
  require = eval(app.read(handle))();
  app.closeAccess(requirePath);
}

const { Result } = require('./lib/alfred');
const { Color } = require('./lib/color');
const { NAMES } = require('./lib/names');
const { iconPath } = require('./lib/icon');

/**
 * 格式化数字，移除多余的小数位。
 * @param {number} value 要格式化的数字。
 * @param {number} digits 保留的小数位数。
 */
function num(value, digits) {
  if (!Number.isFinite(value)) {
    // 无色相(灰度)时按 0 处理。
    return '0';
  }
  let s = value.toFixed(digits);
  if (s.indexOf('.') >= 0) {
    s = s.replace(/0+$/, '').replace(/\.$/, '');
  }
  return s === '-0' ? '0' : s;
}

/** 格式化百分比。 */
function pct(value, digits) {
  return num(value * 100, digits) + '%';
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** 移除所有空白，用于比较两个写法是否一致。 */
function normalize(text) {
  return text.replace(/\s+/g, '');
}

/**
 * 返回指定颜色在指定格式下默认写法的结果项值。
 * @param {Color} color 要格式化的颜色。
 * @param {string} key 格式名。
 */
function defaultValue(color, key) {
  const [r, g, b] = color.rgb().map(v => Math.round(v));
  const aN = num(color.alpha(), 2);
  switch (key) {
    case 'hex':
      return '#' + color.hex(false, true);
    case 'rgb':
      return `rgb(${r}, ${g}, ${b})`;
    case 'rgba':
      return `rgba(${r}, ${g}, ${b}, ${aN})`;
    case 'hsl': {
      const hsl = color.hsl();
      return `hsl(${num(hsl[0], 1)}, ${pct(hsl[1], 1)}, ${pct(hsl[2], 1)})`;
    }
    case 'hsla': {
      const hsl = color.hsl();
      return `hsla(${num(hsl[0], 1)}, ${pct(hsl[1], 1)}, ${pct(hsl[2], 1)}, ${aN})`;
    }
    case 'hsv': {
      const hsv = color.hsv();
      return `hsv(${num(hsv[0], 1)}, ${pct(hsv[1], 1)}, ${pct(hsv[2], 1)})`;
    }
    case 'cmyk': {
      const cmyk = color.cmyk();
      return `cmyk(${cmyk.map(v => pct(v, 1)).join(', ')})`;
    }
    case 'oklch': {
      const oklch = color.oklch();
      return `oklch(${num(oklch[0], 4)} ${num(oklch[1], 4)} ${num(oklch[2], 2)})`;
    }
    case 'oklab': {
      const oklab = color.oklab();
      return `oklab(${num(oklab[0], 4)} ${num(oklab[1], 4)} ${num(oklab[2], 4)})`;
    }
    default:
      return color.nearestName().name;
  }
}

/**
 * 识别用户输入使用的格式，用于展示颜色名对应的实际值。
 * @param {string} query 用户输入。
 */
function detectFormat(query) {
  const t = query.trim().toLowerCase();
  const m = t.match(/^([a-z]+)\(/);
  if (m) {
    switch (m[1]) {
      case 'rgba': return 'rgba';
      case 'hsla': return 'hsla';
      case 'hsv': case 'hsva': case 'hsb': case 'hsba': return 'hsv';
      case 'cmyk': case 'cmyka': return 'cmyk';
      case 'oklch': return 'oklch';
      case 'oklab': return 'oklab';
      case 'hsl': return 'hsl';
      default: return 'rgb';
    }
  }
  if (t === 'transparent' || NAMES[t]) { return 'name'; }
  if (!t.startsWith('0x') && /^[0-9]/.test(t)) { return 'rgb'; }
  return 'hex';
}

/**
 * 构建所有颜色格式的展示项，每个细节格式变体都是一个独立的结果项。
 * @param {Color} color 要展示的颜色。
 * @param {string} inputFormat 用户输入使用的格式。
 */
function buildFormats(color, inputFormat) {
  const [r, g, b] = color.rgb().map(v => Math.round(v));
  const a = color.alpha();
  const aN = num(a, 2);
  const aP = pct(a, 0);

  const hexU = color.hex(false, true);
  const hexL = color.hex(false, false);
  const hexAU = color.hex(true, true);

  const hsl = color.hsl();
  const h = num(hsl[0], 1);
  const s = pct(hsl[1], 1);
  const l = pct(hsl[2], 1);
  const hsv = color.hsv();
  const hv = num(hsv[0], 1);
  const hs = pct(hsv[1], 1);
  const vv = pct(hsv[2], 1);

  const cmyk = color.cmyk();
  const cP = cmyk.map(v => pct(v, 1));
  const cN = cmyk.map(v => num(v * 100, 1));
  const cF = cmyk.map(v => num(v, 3));
  const oklch = color.oklch();
  const oL = num(oklch[0], 4);
  const oC = num(oklch[1], 4);
  const oH = num(oklch[2], 2);
  const oklab = color.oklab();
  const bL = num(oklab[0], 4);
  const bA = num(oklab[1], 4);
  const bB = num(oklab[2], 4);

  const named = color.nearestName();
  const namedColor = named.name === 'transparent'
    ? new Color([0, 0, 0, 0])
    : new Color(hexBody(NAMES[named.name]));
  // 颜色名对应的实际值按用户输入的格式展示，便于确认与输入颜色的差异。
  const namedValue = named.exact ? '' : ` · 实际值 ${defaultValue(namedColor, inputFormat)}`;

  return [
    {
      key: 'hex',
      variants: [
        { value: '#' + hexU, caseAlt: '#' + hexL, desc: '十六进制' },
        { value: hexU, caseAlt: hexL, desc: '十六进制 无 #' },
        { value: '0x' + hexU, caseAlt: '0x' + hexL, desc: '十六进制 0x 前缀' },
        { value: '#' + hexAU, caseAlt: '#' + hexAU.toLowerCase(), desc: '十六进制 含 alpha' },
      ],
    },
    {
      key: 'rgb',
      variants: [
        { value: defaultValue(color, 'rgb'), desc: 'RGB' },
        { value: `rgb(${r} ${g} ${b})`, desc: 'RGB CSS4 空格' },
        { value: `${r}, ${g}, ${b}`, desc: 'RGB 纯数值' },
        { value: `${r} ${g} ${b}`, desc: 'RGB 纯数值 空格' },
        { value: `rgb(${pct(r / 255, 1)}, ${pct(g / 255, 1)}, ${pct(b / 255, 1)})`, desc: 'RGB 百分比' },
        { value: `rgb(${r},${g},${b})`, desc: 'RGB 无空格' },
      ],
    },
    {
      key: 'rgba',
      variants: [
        { value: defaultValue(color, 'rgba'), desc: 'RGBA' },
        { value: `rgb(${r} ${g} ${b} / ${aN})`, desc: 'RGBA CSS4' },
        { value: `rgb(${r} ${g} ${b} / ${aP})`, desc: 'RGBA CSS4 百分比 alpha' },
        { value: `${r}, ${g}, ${b}, ${aN}`, desc: 'RGBA 纯数值' },
        { value: `rgba(${r}, ${g}, ${b}, ${aP})`, desc: 'RGBA 百分比 alpha' },
        { value: '#' + hexAU, caseAlt: '#' + hexAU.toLowerCase(), desc: 'RGBA 十六进制' },
      ],
    },
    {
      key: 'hsl',
      variants: [
        { value: defaultValue(color, 'hsl'), desc: 'HSL' },
        { value: `hsl(${h}deg ${s} ${l})`, desc: 'HSL CSS4 deg' },
        { value: `${h}, ${s}, ${l}`, desc: 'HSL 纯数值' },
        { value: `hsl(${h} ${s} ${l})`, desc: 'HSL CSS4 空格' },
        { value: `hsl(${h},${s},${l})`, desc: 'HSL 无空格' },
      ],
    },
    {
      key: 'hsla',
      variants: [
        { value: defaultValue(color, 'hsla'), desc: 'HSLA' },
        { value: `hsl(${h} ${s} ${l} / ${aN})`, desc: 'HSLA CSS4' },
        { value: `hsl(${h} ${s} ${l} / ${aP})`, desc: 'HSLA CSS4 百分比 alpha' },
        { value: `${h}, ${s}, ${l}, ${aN}`, desc: 'HSLA 纯数值' },
        { value: `hsla(${h}, ${s}, ${l}, ${aP})`, desc: 'HSLA 百分比 alpha' },
      ],
    },
    {
      key: 'hsv',
      variants: [
        { value: defaultValue(color, 'hsv'), desc: 'HSV' },
        { value: `hsb(${hv}, ${hs}, ${vv})`, desc: 'HSV hsb 别名' },
        { value: `${hv}, ${hs}, ${vv}`, desc: 'HSV 纯数值' },
        { value: `hsv(${hv}, ${num(hsv[1], 3)}, ${num(hsv[2], 3)})`, desc: 'HSV 0~1 小数' },
      ],
    },
    {
      key: 'cmyk',
      variants: [
        { value: defaultValue(color, 'cmyk'), desc: 'CMYK' },
        { value: `cmyk(${cN[0]}, ${cN[1]}, ${cN[2]}, ${cN[3]})`, desc: 'CMYK 0~100 数值' },
        { value: `${cN[0]}, ${cN[1]}, ${cN[2]}, ${cN[3]}`, desc: 'CMYK 纯数值' },
        { value: `cmyk(${cF[0]}, ${cF[1]}, ${cF[2]}, ${cF[3]})`, desc: 'CMYK 0~1 小数' },
      ],
    },
    {
      key: 'oklch',
      variants: [
        { value: defaultValue(color, 'oklch'), desc: 'OKLCH' },
        { value: `oklch(${pct(oklch[0], 2)} ${oC} ${oH}deg)`, desc: 'OKLCH 百分比+deg' },
        { value: `oklch(${oL}, ${oC}, ${oH})`, desc: 'OKLCH 逗号' },
        { value: `${oL}, ${oC}, ${oH}`, desc: 'OKLCH 纯数值' },
        { value: `oklch(${oL} ${oC} ${oH} / ${aN})`, desc: 'OKLCH 含 alpha' },
      ],
    },
    {
      key: 'oklab',
      variants: [
        { value: defaultValue(color, 'oklab'), desc: 'OKLAB' },
        { value: `oklab(${pct(oklab[0], 2)} ${bA} ${bB})`, desc: 'OKLAB 百分比 L' },
        { value: `${bL}, ${bA}, ${bB}`, desc: 'OKLAB 纯数值' },
      ],
    },
    {
      key: 'name',
      variants: [
        {
          value: named.name,
          caseAlt: capitalize(named.name),
          desc: (named.exact ? 'CSS 颜色名' : '最接近的 CSS 颜色名') + namedValue,
        },
      ],
    },
  ];
}

/** 将 `#rrggbb` 转换为 RGB 数组。 */
function hexBody(hex) {
  const u = parseInt(hex.slice(1), 16);
  return [(u >> 16) & 0xff, (u >> 8) & 0xff, u & 0xff, 1];
}

function run(argv) {
  const query = (argv[0] || '').trim();
  const color = Color.parse(query);
  if (!color) {
    if (!query) {
      return Result.error('颜色转换', '请输入颜色，例如 #FF00FF、0xFF00FF、rgba(255, 0, 255, 0.5)、rebeccapurple');
    }
    return Result.error('颜色转换', `无法解析颜色 "${query}"`);
  }
  const result = new Result();
  const icon = { path: iconPath(color.rgba()) };
  const inputNorm = normalize(query);
  for (const format of buildFormats(color, detectFormat(query))) {
    for (let i = 0; i < format.variants.length; i++) {
      const variant = format.variants[i];
      // 与输入一致的写法不再重复列出。
      const forms = [variant.value, variant.caseAlt].filter(v => v && normalize(v) !== inputNorm);
      if (forms.length === 0) {
        continue;
      }
      const item = {
        uid: `${format.key}-${i}`,
        title: forms[0],
        subtitle: variant.desc,
        arg: forms[0],
        icon,
        text: { copy: forms[0], largetype: forms[0] },
      };
      if (forms.length > 1) {
        // 大小写通过 shift 切换。
        item.mods = {
          shift: {
            valid: true,
            arg: forms[1],
            subtitle: `⇧ ${forms[1]}`,
            text: { copy: forms[1], largetype: forms[1] },
          },
        };
      }
      result.add(item);
    }
  }
  return result.toString();
}
