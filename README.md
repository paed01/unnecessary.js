unnecessary
===========

Ligthweight coverage for huge projects. Check for files never required troughout testing. Compares project tree with require cache.

# Description

Options:
- `cwd`: Project working directory, defaults to `process.cwd()`
- `filePattern`: Defaults to js and json extensions
- `excludeDirs`: Array with directories to exclude. Default is node_modules and .git. Any additional directories are appended to default list

```javascript
var unnecessary = require('unnecessary')({
  filePattern: /\.js$/i
});

// When testing is completed run
var unusedScripts = unnecessary.unused();
```
