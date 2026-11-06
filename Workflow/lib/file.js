ObjC.import('Foundation');

/**
 * 检查是否存在指定路径的文件。
 * @param {string} path 文件的路径。
 * @returns {boolean} 文件是否存在。
 */
function fileExistsSync(path) {
  return $.NSFileManager.defaultManager.fileExistsAtPath(path);
}

/**
 * 移除指定路径的文件。
 * @param {string} path 文件的路径。
 */
function removeFileSync(path) {
  $.NSFileManager.defaultManager.removeItemAtPathError(path, undefined);
}

/**
 * 移动指定路径的文件。
 * @param {string} srcPath 源文件的路径。
 * @param {string} dstPath 目标文件的路径。
 */
function moveFileSync(srcPath, dstPath) {
  var dir = ObjC.unwrap($(dstPath).stringByDeletingLastPathComponent);
  var fm = $.NSFileManager.defaultManager;
  if (!fm.fileExistsAtPath(dir)) {
    fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(dir, true, undefined, undefined);
  }
  fm.moveItemAtPathToPathError(srcPath, dstPath, undefined);
}

/**
 * 读取指定路径的文件。
 * @param {string} path 文件的路径。
 * @returns {string | undefined} 文件的数据。
 */
function readFileSync(path) {
  return ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, undefined));
}

/**
 * 写入指定路径的文件。
 * @param {string} path 文件的路径。
 * @param {string} data 文件的数据。
 */
function writeFileSync(path, data) {
  ObjC.wrap(data).writeToFileAtomicallyEncodingError(path, true, $.NSUTF8StringEncoding, undefined);
}

module.exports = { fileExistsSync, removeFileSync, moveFileSync, readFileSync, writeFileSync };
