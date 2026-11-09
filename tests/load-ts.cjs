const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const ts = require("typescript");

// Use the project's existing compiler, without adding a test runtime dependency.
// Each loader has its own modules so action tests can replace external services.
function createLoader(overrides = {}) {
  const root = path.resolve(__dirname, "..");
  const cache = new Map();
  function load(file) {
    file = path.resolve(root, file);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const nativeRequire = createRequire(file);
    const localRequire = (id) => {
      if (Object.hasOwn(overrides, id)) return overrides[id];
      if (id.startsWith(".") || id.startsWith("@/")) {
        const base = id.startsWith("@/") ? path.join(root, id.slice(2)) : path.resolve(path.dirname(file), id);
        for (const candidate of [base, `${base}.ts`, `${base}.tsx`]) {
          if (/\.tsx?$/.test(candidate) && fs.existsSync(candidate)) return load(candidate);
        }
      }
      return nativeRequire(id);
    };
    const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: file,
    });
    new Function("require", "module", "exports", outputText)(localRequire, module, module.exports);
    return module.exports;
  }
  return load;
}

module.exports = { createLoader };
