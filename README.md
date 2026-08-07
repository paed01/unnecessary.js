unnecessary
===========

[![Build](https://github.com/paed01/unnecessary.js/actions/workflows/build.yaml/badge.svg)](https://github.com/paed01/unnecessary.js/actions/workflows/build.yaml)
[![Build (Windows)](https://github.com/paed01/unnecessary.js/actions/workflows/build-windows.yaml/badge.svg)](https://github.com/paed01/unnecessary.js/actions/workflows/build-windows.yaml)
[![Coverage Status](https://coveralls.io/repos/github/paed01/unnecessary.js/badge.svg?branch=default)](https://coveralls.io/github/paed01/unnecessary.js?branch=default)

Keep track of your files. Lightweight coverage for huge projects. Check for files never required throughout testing. Compares project tree with the require cache.

# Description

Options:

- `cwd`: Project working directory, defaults to `process.cwd()`
- `filePattern`: Regex pattern, defaults to js, cjs, mjs, and json extensions
- `excludeDirs`: Array with directories to exclude, use relative paths, e.g. `app/assets`. Default is `node_modules` and `.git`. Option is appended to the default list
- `excludeFiles`: Array with files to exclude, use relative paths, e.g. `test/data/arbitrary.json`. Default is `package.json`. Option is appended to the default list

The module is published as a dual package. Import it from ESM:

```javascript
// Before testing, e.g. in mocha setup
import Unnecessary from 'unnecessary';

const unnecessary = Unnecessary({
  filePattern: /\.js$/i,
});
```

or require it from CommonJS:

```javascript
var unnecessary = require('unnecessary')({
  filePattern: /\.js$/i,
});
```

When testing has completed run

```javascript
var unusedScriptsOrJsons = unnecessary.untouched();
```

The module can also be instantiated with new to get a standalone instance.

```javascript
import Unnecessary from 'unnecessary';

const unnecessaryCoffee = new Unnecessary({
  filePattern: /\.coffee$/i,
});

const unnecessaryJs = new Unnecessary({
  filePattern: /\.js$/i,
});

// Print watched files
console.log(unnecessaryCoffee.files);
console.log(unnecessaryJs.files);
```

# ESM and the require cache

Touched files are detected by comparing the project tree with the CommonJS require cache (`require.cache`). Files loaded with `require()` register there, but files loaded with ESM `import` live in a separate internal module map that node does not expose. Consequently, ESM source files imported during testing cannot be detected as touched and will turn up as unused. Add them to `excludeFiles`, or use the module in projects where test subjects are loaded through `require()`.

# Report after test completion

To make the module report unused files after test completion - listen for process exit.

Example `.mocharc.cjs` that doubles as reporter setup:

```javascript
'use strict';

var Unnecessary = require('unnecessary');
var unnecessary = new Unnecessary({
  excludeDirs: ['coverage'],
});

process.on('exit', function (code, signal) {
  if (!signal && code === 0) {
    log();
  }
});

module.exports = {
  reporter: 'spec',
};

function log() {
  var untouched = unnecessary.untouched();
  if (!untouched.length) return;
  console.log('\n\x1b[31mFound %d potentially unused file%s:\x1b[0m', untouched.length, untouched.length > 1 ? 's' : '');
  untouched.forEach(function (file) {
    console.log('\x1b[33m  %s\x1b[0m', file);
  });
}
```
