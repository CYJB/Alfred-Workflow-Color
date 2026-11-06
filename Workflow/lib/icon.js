ObjC.import('AppKit');

const { fileExistsSync } = require('./file');

const ICON_SIZE = 128;
const MAX_ICONS = 1000;

/** 图标缓存目录，优先使用 Alfred 的 workflow cache。 */
function cacheDir() {
  ObjC.import('stdlib');
  let dir = $.getenv('alfred_workflow_cache');
  if (!dir) { dir = $.getenv('alfred_workflow_data'); }
  if (!dir) { dir = ObjC.unwrap($.NSTemporaryDirectory()); }
  dir = dir + '/color-icons';
  const fm = $.NSFileManager.defaultManager;
  if (!fm.fileExistsAtPath(dir)) {
    fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(dir, true, undefined, undefined);
  }
  return dir;
}

/** 清理过多的图标缓存。 */
function cleanup(dir) {
  const fm = $.NSFileManager.defaultManager;
  const files = ObjC.unwrap(fm.contentsOfDirectoryAtPathError(dir, undefined));
  if (!files || files.count <= MAX_ICONS) { return; }
  for (let i = 0; i < files.count; i++) {
    fm.removeItemAtPathError(dir + '/' + ObjC.unwrap(files.objectAtIndex(i)), undefined);
  }
}

/**
 * 绘制指定颜色的色块图标。
 * @param {string} path 输出的 PNG 路径。
 * @param {number[]} rgba 0~255 的 RGB 通道与 0~1 的 alpha。
 */
function drawSwatch(path, rgba) {
  const size = ICON_SIZE;
  const rep = $.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(
    $(), size, size, 8, 4, true, false, $.NSDeviceRGBColorSpace, 0, 0);
  const ctx = $.NSGraphicsContext.graphicsContextWithBitmapImageRep(rep);
  $.NSGraphicsContext.saveGraphicsState;
  $.NSGraphicsContext.setCurrentContext(ctx);

  const rect = $.NSMakeRect(0, 0, size, size);
  const swatch = $.NSBezierPath.bezierPathWithRoundedRectXRadiusYRadius(rect, size * 0.22, size * 0.22);
  if (rgba[3] < 1) {
    // 半透明颜色使用棋盘格作为衬底，便于观察透明度。
    $.NSColor.colorWithSRGBRedGreenBlueAlpha(1, 1, 1, 1).setFill;
    swatch.fill;
    // 棋盘格限制在圆角范围内。
    swatch.addClip;
    const cell = size / 8;
    $.NSColor.colorWithSRGBRedGreenBlueAlpha(0.8, 0.8, 0.8, 1).setFill;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if ((x + y) % 2 === 0) {
          $.NSBezierPath.fillRect($.NSMakeRect(x * cell, y * cell, cell, cell));
        }
      }
    }
  }
  $.NSColor.colorWithSRGBRedGreenBlueAlpha(rgba[0] / 255, rgba[1] / 255, rgba[2] / 255, rgba[3]).setFill;
  swatch.fill;

  $.NSGraphicsContext.restoreGraphicsState;
  const png = rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $());
  png.writeToFileAtomically(path, true);
}

/**
 * 返回指定颜色的图标路径，图标不存在时生成并缓存。
 * @param {number[]} rgba 0~255 的 RGB 通道与 0~1 的 alpha。
 * @returns {string} 图标 PNG 的绝对路径。
 */
function iconPath(rgba) {
  const key = rgba.slice(0, 3).map(v => {
    const s = Math.round(v).toString(16);
    return s.length === 1 ? '0' + s : s;
  }).join('') + '-' + Math.round(rgba[3] * 100);
  const dir = cacheDir();
  const path = dir + '/' + key + '.png';
  if (!fileExistsSync(path)) {
    cleanup(dir);
    drawSwatch(path, rgba);
  }
  return path;
}

module.exports = { iconPath };
