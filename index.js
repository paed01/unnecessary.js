'use strict';

var Fs = require('fs');
var Path = require('path');

var internals = {};
var defaultOptions = {
  cwd: process.cwd(),
  filePattern: /.+?\.(js|json)$/i,
  excludeDirs: ['node_modules', '.git']
};

module.exports = internals = function(options) {
  var self = this || internals;
  self.options = applyOptions(options);
  self.files = internals.traverse([self.options.cwd], self.options);
  return self;
};

internals.untouched = internals.prototype.untouched = function() {
  var self = this || internals;
  var untouched = [];
  if (!self.files) return untouched;
  self.files.forEach(function(file) {
    if (!require.cache[file]) {
      untouched.push(relativePath(self.options.cwd, file));
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
      if (stat.isDirectory() && options.excludeDirs.indexOf(file) === -1) {
        files = files.concat(traverse(file, options));
        return;
      }

      if (stat.isFile() && options.filePattern.test(filename)) {
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
  appliedOptions.excludeDirs = applyOptionExludeDirs(appliedOptions.cwd, appliedOptions.excludeDirs);

  return appliedOptions;
}

function applyOptionExludeDirs(cwd, option) {
  var excludeDirs = option.map(function(dir) {
    dir = dir.replace(/\/$/, '');
    return Path.normalize(Path.join(cwd, dir));
  });

  return excludeDirs;
}

function relativePath(from, to) {
  var relative = Path.relative(from, to);
  if (Path.sep !== '/') {
    relative = relative.split(Path.sep).join('/');
  }
  return relative;
}
