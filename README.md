unnecessary
===========

[![Build](https://github.com/paed01/unnecessary.js/actions/workflows/build.yaml/badge.svg)](https://github.com/paed01/unnecessary.js/actions/workflows/build.yaml)
[![Build (Windows)](https://github.com/paed01/unnecessary.js/actions/workflows/build-windows.yaml/badge.svg)](https://github.com/paed01/unnecessary.js/actions/workflows/build-windows.yaml)
[![Coverage Status](https://coveralls.io/repos/github/paed01/unnecessary.js/badge.svg?branch=default)](https://coveralls.io/github/paed01/unnecessary.js?branch=default)

Keep track of your files. Lightweight coverage for huge projects. Check for files never required or imported throughout testing. Compares the project tree with the require cache and, when available, V8 coverage.

Three ways to use it:

```sh
# wrap any test command, c8 style
npx unnecessary mocha

# mocha root hook plugin
mocha --require unnecessary/mocha
```

```javascript
// or the library api
import Unnecessary from 'unnecessary';

const unnecessary = Unnecessary();
await unnecessary.ready;
// ... run tests ...
console.log(unnecessary.untouched());
```

# Description

Requires node >= 20. Zero dependencies. Ships TypeScript type definitions for all entry points.

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

```js
var unnecessary = require('unnecessary')({
  filePattern: /\.js$/i,
});
```

The project tree is traversed asynchronously, starting at construction:

- `ready`: promise that resolves with the watched files once traversal has completed
- `files`: the watched files, `null` until `ready` has resolved
- `untouched()`: synchronous, returns the watched files that were never loaded - or an empty list if called before `ready` has resolved

When testing has completed run

```js
var unusedScriptsOrJsons = unnecessary.untouched();
```

Calling `untouched()` in a `process.on('exit')` handler works since traversal, kicked off at construction, has long since completed - see the report example below.

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
console.log(await unnecessaryCoffee.ready);
console.log(await unnecessaryJs.ready);
```

# ESM and the require cache

Touched files are detected by comparing the project tree with the CommonJS require cache (`require.cache`). Files loaded with `require()` register there, but files loaded with ESM `import` live in a separate internal module map that node does not expose. Consequently, ESM source files imported during testing cannot be detected through the require cache alone.

To detect imported files as well, run node with the [`NODE_V8_COVERAGE`](https://nodejs.org/api/cli.html#node_v8_coveragedir) environment variable set - which is exactly what [c8](https://github.com/bcoe/c8) does. When the variable is present, `untouched()` flushes V8 coverage to disk with `v8.takeCoverage()` and treats every script in the coverage reports as touched, regardless of how it was loaded.

```sh
NODE_V8_COVERAGE=coverage/tmp mocha
# or simply
c8 mocha
```

Caveats:

- The coverage directory is read as-is, so reports left over from previous runs count as touched. c8 cleans its directory per run; when setting the variable yourself, clean the directory before testing.
- Files with no executable code (e.g. empty modules) never enter V8 coverage and are reported as untouched even if imported.
- JSON files are parsed, not compiled, so they never enter V8 coverage either. They are only detected through the require cache of the reporting process. Both `require()` and ESM `import ... with { type: 'json' }` count - node caches JSON modules in the CommonJS cache regardless of how they were loaded, sharing one parsed copy.
- Without `NODE_V8_COVERAGE`, only `require()`d files are detected; add imported ESM sources to `excludeFiles`.

# CLI

The package installs an `unnecessary` executable that behaves like c8: it runs the given command with `NODE_V8_COVERAGE` pointing to a temporary directory and reports potentially unused files when the command exits, passing the exit code through.

```sh
unnecessary mocha
unnecessary --exclude-dir coverage --exclude-file data/known-good.json -- npm test
```

Arguments:

- `--exclude-dir <dir>`: forwarded to the `excludeDirs` option, may be repeated
- `--exclude-file <file>`: forwarded to the `excludeFiles` option, may be repeated
- `--cwd <dir>`: forwarded to the `cwd` option. Reported paths are rebased on the invoking directory (absolute when outside it) so they stay cmd+clickable in the terminal
- `--`: optional separator; parsing stops at the first unrecognized argument either way

If `NODE_V8_COVERAGE` is already set (e.g. when composed with c8), the existing directory is reused and left in place. Note that node re-injects `NODE_V8_COVERAGE` into child process environments whenever coverage is active in the parent - removing the variable from a child's env has no effect, it can only be redirected by overriding it with another value. Since the report is produced in a separate process, require-cache detection does not apply here — everything is coverage based, so the JSON caveat above applies to all JSON files.

# Mocha root hooks

The package ships a [root hook plugin](https://mochajs.org/#root-hook-plugins) that traverses the project tree in `beforeAll` and reports potentially unused files in `afterAll`. Mocha 11 and 12 are supported:

```sh
mocha --require unnecessary/mocha
```

or in `.mocharc`:

```js
module.exports = {
  require: ['unnecessary/mocha'],
};
```

Options are read from an `unnecessary` field in `package.json`. `filePattern` may be passed as a string and is compiled to a case insensitive regex:

```json
{
  "unnecessary": {
    "filePattern": "\\.([cm]?js|json)$",
    "excludeDirs": ["coverage"],
    "excludeFiles": ["rollup.config.js"]
  }
}
```

Remember that ESM sources loaded with `import` are only detected under `NODE_V8_COVERAGE`/c8 - exclude them or combine with the coverage mechanism above. In mocha `--parallel` mode root hooks run per worker process; prefer the cli or c8 composition there.

# Node test runner

A custom [test reporter](https://nodejs.org/api/test.html#custom-reporters) for `node:test` that reports potentially unused files once the run has completed. Since a custom reporter replaces the default one, combine it with a regular reporter and give each a destination:

```sh
node --test --test-reporter spec --test-reporter-destination stdout --test-reporter unnecessary/node-test --test-reporter-destination stdout
```

Options are read from the same `unnecessary` field in `package.json` as the mocha plugin.

Keep in mind that `node --test` runs each test file in a child process, invisible to the reporter's require cache. Set `NODE_V8_COVERAGE` (or run through c8) so files loaded by the children are detected through coverage, or let the cli do it for you:

```sh
unnecessary node --test
```

Running a test file directly (`node --test-reporter unnecessary/node-test test/some-test.js`) keeps everything in one process, where plain require-cache detection works for CommonJS.

# Lab reporter

For [@hapi/lab](https://github.com/hapijs/lab) the package ships a custom reporter - lab has no root hook equivalent, but reporters are constructed in the main process and `end()` is awaited on completion, which serves the same purpose:

```sh
lab -r console -r unnecessary/lab -o stdout -o stdout
# or as the only reporter
lab -r unnecessary/lab
```

Options are read from the same `unnecessary` field in `package.json` as the mocha plugin. Since lab runs everything in a single process, plain require-cache detection works well for CommonJS projects - no coverage setup needed. Combine with `NODE_V8_COVERAGE`/the cli for ESM projects.

# Report after test completion

To roll the report by hand instead - for other frameworks, or to customize output - listen for process exit. This is roughly what `unnecessary/mocha` does for you, minus the hooks.

Example `.mocharc.cjs` that doubles as reporter setup:

```js
'use strict';

const Unnecessary = require('unnecessary');
const unnecessary = new Unnecessary({
  excludeDirs: ['coverage'],
});

process.on('exit', (code, signal) => {
  if (!signal && code === 0) {
    log();
  }
});

module.exports = {
  reporter: 'spec',
};

function log() {
  const untouched = unnecessary.untouched();
  if (!untouched.length) return;
  console.log('\n\x1b[31mFound %d potentially unused file%s:\x1b[0m', untouched.length, untouched.length > 1 ? 's' : '');
  untouched.forEach((file) => {
    console.log('\x1b[33m  %s\x1b[0m', file);
  });
}
```

The exit handler cannot await anything, which is why `untouched()` is synchronous - traversal was kicked off at construction and has long since completed by the time the process exits.
