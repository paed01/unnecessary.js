unnecessary
===========

[![Build Status](https://travis-ci.org/paed01/unnecessary.js.svg?branch=master)](https://travis-ci.org/paed01/unnecessary.js)
[![Windows build status](https://ci.appveyor.com/api/projects/status/gnydnbvuuavfcj5l/branch/master?svg=true)](https://ci.appveyor.com/project/paed01/unnecessary-js/branch/master)
[![Coverage Status](https://coveralls.io/repos/github/paed01/unnecessary.js/badge.svg?branch=master)](https://coveralls.io/github/paed01/unnecessary.js?branch=master)

Ligthweight coverage for huge projects. Check for files never required troughout testing. Compares project tree with require cache.

# Description

Options:
- `cwd`: Project working directory, defaults to `process.cwd()`
- `filePattern`: Regex pattern, Defaults to js and json extensions
- `excludeDirs`: Array with directories to exclude, use relative paths, e.g. `app/assets`. Default is `node_modules` and `.git`. Any additional directories are appended to default list.

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

Since test frameworks (mocha or lab) don´t have a easy way to know if the test has completed it is possible to listen for process exit.

Example setup-file to be used with `mocha.opts` `--require` property:
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
