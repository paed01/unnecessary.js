import Fs from 'node:fs';
import Path from 'node:path';
import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);

const defaultOptions = {
  cwd: process.cwd(),
  filePattern: /.+?\.([cm]?js|json)$/i,
  excludeDirs: ['node_modules', '.git'],
  excludeFiles: ['package.json'],
};

const internals = function init(options) {
  const self = typeof this === 'object' ? this : internals;
  self.options = applyOptions(options);
  self.files = internals.traverse([self.options.cwd], self.options);
  return self;
};

export default internals;

internals.untouched = internals.prototype.untouched = function untouchedFiles() {
  const self = typeof this === 'object' ? this : internals;
  const untouched = [];
  if (!self.files) return untouched;
  self.files.forEach((file) => {
    if (!nodeRequire.cache[file]) {
      untouched.push(relativePath(self.options.cwd, file));
    }
  });
  return untouched;
};

internals.traverse = function traversePaths(paths, options) {
  function traverse(path) {
    let files = [];

    const pathStat = Fs.statSync(path);
    if (pathStat.isFile()) {
      const pathDir = Path.dirname(options.cwd);
      if (keepFile(options, relativePath(pathDir, path))) {
        return path;
      }
      return null;
    }

    Fs.readdirSync(path).forEach((filename) => {
      const file = Path.join(path, filename);

      const stat = Fs.statSync(file);
      if (stat.isDirectory() && options.excludeDirs.indexOf(file) === -1) {
        files = files.concat(traverse(file, options));
        return;
      }

      if (stat.isFile() && keepFile(options, relativePath(options.cwd, file))) {
        files.push(file);
      }
    });

    return files;
  }

  let testFiles = [];
  paths.forEach((path) => {
    testFiles = testFiles.concat(traverse(path)).filter((file) => {
      return file;
    });
  });

  testFiles = testFiles.map((path) => {
    return Path.resolve(path);
  });

  return testFiles;
};

function applyOptions(options) {
  const appliedOptions = {};
  Object.keys(defaultOptions).forEach((key) => {
    if (options && options[key]) {
      if (key === 'excludeDirs') appliedOptions[key] = defaultOptions.excludeDirs.concat(options[key]);
      else if (key === 'excludeFiles') appliedOptions[key] = defaultOptions.excludeFiles.concat(options[key]);
      else appliedOptions[key] = options[key];
    } else {
      appliedOptions[key] = defaultOptions[key];
    }
  });
  appliedOptions.excludeDirs = applyOptionExludeDirs(appliedOptions.cwd, appliedOptions.excludeDirs);

  return appliedOptions;
}

function applyOptionExludeDirs(cwd, option) {
  const excludeDirs = option.map((dir) => {
    dir = dir.replace(/\/$/, '');
    return Path.normalize(Path.join(cwd, dir));
  });

  return excludeDirs;
}

function relativePath(from, to) {
  let relative = Path.relative(from, to);
  if (Path.sep !== '/') {
    relative = relative.split(Path.sep).join('/');
  }
  return relative;
}

function keepFile(options, file) {
  return options.filePattern.test(file) && options.excludeFiles.indexOf(file) === -1;
}
