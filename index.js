'use strict';

var Fs = require('fs');
var Path = require('path');

var internals = {};
var defaultOptions = {
  filePattern: /.+?\.(js|json)$/i,
  excludeDirs: ['node_modules', '.git'],
  absolute: false
};

module.exports = internals.init = function(options) {
  internals.options = applyOptions(options);
  internals.cwd = process.cwd();
  internals.files = internals.traverse([internals.cwd], internals.options);
  return internals;
};

internals.untouched = function() {
  var untouched = [];
  internals.files.forEach(function(file) {
    if (!require.cache[file]) {
      untouched.push(getRelativePath(file, internals.cwd));
    }
  });
  return untouched;
};

internals.traverse = function(paths, options) {

  var traverse = function(path) {

    var files = [];

    var pathStat = Fs.statSync(path);
    if (pathStat.isFile()) {
      return path;
    }

    Fs.readdirSync(path).forEach(function(filename) {
      var file = Path.join(path, filename);

      var stat = Fs.statSync(file);
      if (stat.isDirectory() && options.excludeDirs.indexOf(filename) === -1) {
        files = files.concat(traverse(file, options));
        return;
      }

      if (stat.isFile() && options.filePattern.test(filename) && Path.basename(file)[0] !== '.') {
        files.push(file);
      }
    });

    return files;
  };

  var testFiles = [];
  paths.forEach(function(path) {
    testFiles = testFiles.concat(traverse(path));
  });

  testFiles = testFiles.map(function(path) {
    return Path.resolve(path);
  });

  return testFiles;
};

function applyOptions(options) {
  var appliedOptions = {};
  Object.keys(defaultOptions).forEach(function(key) {
    if (options && options[key]) {
      if (key === 'excludeDirs') appliedOptions[key] = defaultOptions.excludeDirs.concat(options[key]);
      else appliedOptions[key] = options[key];
    } else {
      appliedOptions[key] = defaultOptions[key];
    }
  });
  return appliedOptions;
}

function getRelativePath(file, cwd) {
  return Path.relative(cwd, file);
}
