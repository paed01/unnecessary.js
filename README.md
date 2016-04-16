unnecessary
===========

[![Build Status](https://travis-ci.org/paed01/unnecessary.js.svg?branch=master)](https://travis-ci.org/paed01/unnecessary.js)
[![Windows build status](https://ci.appveyor.com/api/projects/status/gnydnbvuuavfcj5l/branch/master?svg=true)](https://ci.appveyor.com/project/paed01/unnecessary-js/branch/master)
[![Coverage Status](https://coveralls.io/repos/github/paed01/unnecessary.js/badge.svg?branch=master)](https://coveralls.io/github/paed01/unnecessary.js?branch=master)

Keep track of your files. Ligthweight coverage for huge projects. Check for files never required troughout testing. Compares project tree with require cache.

# Description

Options:
- `cwd`: Project working directory, defaults to `process.cwd()`
- `filePattern`: Regex pattern, Defaults to js and json extensions
- `excludeDirs`: Array with directories to exclude, use relative paths, e.g. `app/assets`. Default is `node_modules` and `.git`. Option is appended to the default list
- `excludeFiles`: Array with files to exclude, use relative paths, e.g. `test/data/arbitrary.json`. Default is `package.json`. Option is appended to the default list

```javascript
// Before testing, e.g. in mocha setup
var unnecessary = require('unnecessary')({
  filePattern: /\.js$/i
});
```

When testing has completed run
```javascript
var unusedScriptsOrJsons = unnecessary.untouched();
```

The module can also be instantiated with new to get a standalone instance.

```javascript
var Unnecessary = require('unnecessary');
var unnecessaryCoffee = new Unnecessary({
  filePattern: /\.coffee$/i
});

var unnecessaryJs = new Unnecessary({
  filePattern: /\.js$/i
});

// Print watched files
console.log(unnecessaryCoffee.files)
console.log(unnecessaryJs.files)
```

# Report after test completion

To make the module report unused files after test completion - listen for process exit.

Example setup-file to be used with `mocha.opts` `--require` argument:
```javascript
'use strict';

var Unnecessary = require('unnecessary');
var unnecessary = new Unnecessary({
  excludeDirs: ['coverage']
});

process.on('exit', function(code, signal) {
  if (!signal && code === 0) {
    log();
  }
});

function log() {
  var untouched = unnecessary.untouched();
  if (!untouched.length) return;
  console.log('\n\x1b[31mFound %d potentially unused file%s:\x1b[0m', untouched.length, untouched.length > 1 ? 's' : '');
  unnecessary.untouched().forEach(function(file) {
    console.log('\x1b[33m  %s\x1b[0m', file);
  });
}
```

or more fancy es6:

```javascript
'use strict';

const Unnecessary = require('unnecessary');
const unnecessary = new Unnecessary({
  excludeDirs: ['coverage']
});

process.on('exit', (code, signal) => {
  if (!signal && code === 0) {
    log();
  }
});

function log() {
  /* eslint no-console:0 */
  let untouched = unnecessary.untouched();
  if (!untouched.length) return;
  console.log(`\n\x1b[31mFound ${untouched.length} potentially unused file${untouched.length > 1 ? 's' : ''}:\x1b[0m`);
  unnecessary.untouched().forEach((file) => {
    console.log(`  \x1b[33m${file}\x1b[0m`);
  });
}
```
