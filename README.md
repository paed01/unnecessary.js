unnecessary
===========

[![Build Status](https://travis-ci.org/paed01/unnecessary.js.svg?branch=master)][![Windows build status](https://ci.appveyor.com/api/projects/status/gnydnbvuuavfcj5l/branch/master?svg=true)](https://ci.appveyor.com/project/paed01/unnecessary-js/branch/master)(https://travis-ci.org/paed01/unnecessary.js)[![Coverage Status](https://coveralls.io/repos/github/paed01/unnecessary.js/badge.svg?branch=master)](https://coveralls.io/github/paed01/unnecessary.js?branch=master)

Ligthweight coverage for huge projects. Check for files never required troughout testing. Compares project tree with require cache.

# Description

Options:
- `cwd`: Project working directory, defaults to `process.cwd()`
- `filePattern`: Defaults to js and json extensions
- `excludeDirs`: Array with directories to exclude, use relative paths, e.g. `app/assets`. Default is `node_modules` and `.git`. Any additional directories are appended to default list.

```javascript
// Before testing, e.g. in mocha setup
var unnecessary = require('unnecessary')({
  filePattern: /\.js$/i
});

// When testing is completed run
var unusedScripts = unnecessary.untouched();
```

