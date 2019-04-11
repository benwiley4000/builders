'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = _interopDefault(require('path'));
var fs = _interopDefault(require('fs'));
var types = require('@pika/types');

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }

  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
        args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);

      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }

      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }

      _next(undefined);
    });
  };
}

const BIN_FILENAME = "dist-node/index.bin.js";
function beforeBuild({
  options
}) {
  if (!options.bin) {
    return new types.MessageError('option "bin" must be defined. Example: {"bin": "example-cli"}');
  }
}
function beforeJob(_x) {
  return _beforeJob.apply(this, arguments);
}

function _beforeJob() {
  _beforeJob = _asyncToGenerator(function* ({
    out
  }) {
    const nodeDirectory = path.join(out, "dist-node");

    if (!fs.existsSync(nodeDirectory)) {
      throw new types.MessageError('"dist-node/" does not exist, or was not yet created in the pipeline.');
    }

    const nodeEntrypoint = path.join(out, "dist-node/index.js");

    if (!fs.existsSync(nodeEntrypoint)) {
      throw new types.MessageError('"dist-node/index.js" is the expected standard entrypoint, but it does not exist.');
    }

    const testModuleInterface = yield Promise.resolve().then(() => require(`${nodeEntrypoint}`));

    if (!(testModuleInterface.run || testModuleInterface.cli || testModuleInterface.default)) {
      throw new types.MessageError('"dist-node/index.js" must export a "run", "cli", or "default" function for the CLI to run.');
    }
  });
  return _beforeJob.apply(this, arguments);
}

function manifest(newManifest, {
  options
}) {
  const bin = options.bin;
  newManifest.bin = newManifest.bin || {};
  newManifest.bin[bin] = BIN_FILENAME;
  return newManifest;
}
function build({
  out,
  cwd,
  options,
  reporter
}) {
  const minNodeVersion = options.minNodeVersion,
        v8CompileCache = options.v8CompileCache;
  const binFilename = path.join(out, BIN_FILENAME);

  if (v8CompileCache) {
    const v8CompileCacheRead = path.join(cwd, "node_modules/v8-compile-cache/v8-compile-cache.js");
    const v8CompileCacheWrite = path.join(out, "dist-node/v8-compile-cache.js");
    fs.copyFileSync(v8CompileCacheRead, v8CompileCacheWrite);
  }

  fs.writeFileSync(binFilename, `#!/usr/bin/env node
'use strict';
${minNodeVersion ? `
const ver = process.versions.node;
const majorVer = parseInt(ver.split('.')[0], 10);

if (majorVer < ${minNodeVersion}) {
  console.error('Node version ' + ver + ' is not supported, please use Node.js ${minNodeVersion}.0 or higher.');
  process.exit(1);
}
` : ``}${v8CompileCache ? `
try {
  require('./v8-compile-cache.js');
} catch (err) {
  // We don't have/need this on legacy builds and dev builds
}
` : ``}
let hasBundled = true    

try {
  require.resolve('./index.bundled.js');
} catch(err) {
  // We don't have/need this on legacy builds and dev builds
  // If an error happens here, throw it, that means no Node.js distribution exists at all.
  hasBundled = false;
}

const cli = !hasBundled ? require('../') : require('./index.bundled.js');

if (cli.autoRun) {
  return;
}

const run = cli.run || cli.cli || cli.default;
run(process.argv).catch(function (error) {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
`);
  fs.chmodSync(binFilename, "755");
  reporter.created(path.join(out, BIN_FILENAME), `bin.${options.bin}`);
}

exports.beforeBuild = beforeBuild;
exports.beforeJob = beforeJob;
exports.build = build;
exports.manifest = manifest;
