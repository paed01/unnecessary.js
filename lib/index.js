import Fs from 'node:fs';
import Path from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import v8 from 'node:v8';

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
  self.files = null;
  self.ready = internals.traverse([self.options.cwd], self.options).then((files) => (self.files = files));
  return self;
};

export default internals;

internals.untouched = internals.prototype.untouched = function untouchedFiles() {
  const self = typeof this === 'object' ? this : internals;
  const untouched = [];
  if (!self.files) return untouched;
  const covered = coveredFiles();
  self.files.forEach((file) => {
    if (!nodeRequire.cache[file] && !covered.has(file)) {
      untouched.push(relativePath(self.options.cwd, file));
    }
  });
  return untouched;
};

internals.traverse = async function traversePaths(paths, options) {
  const traversed = await Promise.all(paths.map((path) => traverse(Path.resolve(path))));
  return traversed.flat();

  async function traverse(path) {
    const pathStat = await stat(path);
    if (pathStat.isFile()) {
      const pathDir = Path.dirname(options.cwd);
      return keepFile(options, relativePath(pathDir, path)) ? [path] : [];
    }

    const entries = await readdir(path, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const file = Path.join(path, entry.name);
        switch (await entryType(entry, file)) {
          case 'directory':
            return options.excludeDirs.includes(file) ? [] : traverse(file);
          case 'file':
            return keepFile(options, relativePath(options.cwd, file)) ? [file] : [];
          default:
            return [];
        }
      }),
    );

    return files.flat();
  }
};

async function entryType(entry, file) {
  if (entry.isDirectory()) return 'directory';
  if (entry.isFile()) return 'file';
  if (entry.isSymbolicLink()) {
    const linkStat = await stat(file).catch(() => null);
    if (linkStat?.isDirectory()) return 'directory';
    if (linkStat?.isFile()) return 'file';
  }
  return null;
}

function applyOptions(options) {
  const appliedOptions = { ...defaultOptions };
  for (const key of Object.keys(defaultOptions)) {
    if (!options || !options[key]) continue;
    if (key === 'excludeDirs' || key === 'excludeFiles') appliedOptions[key] = defaultOptions[key].concat(options[key]);
    else appliedOptions[key] = options[key];
  }
  appliedOptions.excludeDirs = applyOptionExcludeDirs(appliedOptions.cwd, appliedOptions.excludeDirs);

  return appliedOptions;
}

function applyOptionExcludeDirs(cwd, option) {
  return option.map((dir) => {
    return Path.normalize(Path.join(cwd, dir.replace(/\/$/, '')));
  });
}

function coveredFiles() {
  const covered = new Set();
  if (!process.env.NODE_V8_COVERAGE) return covered;

  const coverageDir = Path.resolve(process.env.NODE_V8_COVERAGE);
  v8.takeCoverage();

  let reports;
  try {
    reports = Fs.readdirSync(coverageDir);
  } catch {
    return covered;
  }

  reports.forEach((name) => {
    if (!/^coverage-.+\.json$/i.test(name)) return;

    let result;
    try {
      result = JSON.parse(Fs.readFileSync(Path.join(coverageDir, name), 'utf8')).result;
    } catch {
      return;
    }
    if (!Array.isArray(result)) return;

    result.forEach((script) => {
      const url = script.url;
      if (typeof url !== 'string') return;
      // ESM scripts are reported as file URLs, CommonJS scripts as absolute paths
      if (url.startsWith('file://')) covered.add(fileURLToPath(new URL(url.split('?')[0])));
      else if (Path.isAbsolute(url)) covered.add(url);
    });
  });

  return covered;
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
