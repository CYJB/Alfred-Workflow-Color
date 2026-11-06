(function () {
  ObjC.import('Foundation');

  /** 被引用的模块 */
  const requiredModules = new Map();
  /**
   * 导入指定的模块。
   * @param {string} moduleName 要导入的模块名。
   */
  const require = function (moduleName) {
    // 要求所有模块都在 lib 目录下，因此移除 moduleName 的目录部分。
    const idx = moduleName.lastIndexOf('/');
    if (idx >= 0) {
      moduleName = moduleName.substring(idx + 1);
    }
    let module = requiredModules.get(moduleName);
    if (module) {
      return module.exports;
    }
    module = { exports: {} };
    requiredModules.set(moduleName, module);
    const path = `./lib/${moduleName}.js`;
    const content = ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, undefined));
    (function (__moduleName__, __content__, require, module, exports) {
      // 替换 content 内的 #! 指令。
      if (__content__.startsWith('#!')) {
        __content__ = '// ' + __content__;
      }
      try {
        const oldModule = globalThis.module;
        globalThis.module = module;
        new Function(__content__)();
        globalThis.module = oldModule;
      } catch (e) {
        console.log('load module', __moduleName__, 'failed:', e)
      }
    })(moduleName, content, require, module, module.exports);
    return module.exports;
  }
  return require;
});
