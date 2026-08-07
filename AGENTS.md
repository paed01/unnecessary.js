# AGENTS.md

## What this is

`unnecessary` — a small, zero-dependency Node.js library that finds files never loaded during a test run. It walks the project tree, collects `.js`/`.cjs`/`.mjs`/`.json` files, and compares them against what was actually loaded when `untouched()` is called. Lightweight "coverage" for spotting dead files.

Published as a dual package: ESM sources in `lib/`, rollup-built CommonJS bundles in `dist/` (gitignored). Subpath exports: `unnecessary` (the library), `unnecessary/mocha` (root hook plugin), plus an `unnecessary` bin (c8-style CLI wrapper).

## Key constraint: how "touched" is detected

`untouched()` detects touched files two ways:

1. `require.cache` (accessed with `createRequire` from the ESM source) — covers `require()`d files.
2. V8 coverage reports, but only when `NODE_V8_COVERAGE` is set (c8 sets it automatically): `coveredFiles()` in lib/index.js calls `v8.takeCoverage()` to flush reports, then collects script URLs from the coverage JSON. This is the only way ESM `import`s are detected — node's internal ESM module map is not exposed (`module.registerHooks` in node >=22.15 could track imports, but this repo targets node 20).

Gotcha: when coverage is active, node **re-injects `NODE_V8_COVERAGE` into spawned children's env even if the caller deleted it** — only an explicit override redirects it. The cli tests rely on this (they override with a throwaway dir); a plain `delete env.NODE_V8_COVERAGE` silently pollutes the parent's coverage dir under c8.

Consequences: under plain `npm test` (no coverage), import-loaded files look untouched — that's why the repo's own ESM sources and test files are excluded from the self-report (via the `unnecessary` field in package.json), and why the report legitimately differs between `npm test` (3 fixtures listed) and `npm run test:lcov` (2 — coverage sees the `require()`d-then-cache-evicted `arbitrary.cjs`). Files with no executable code never appear in V8 coverage, so `test/data/arbitrary.js` must keep at least one statement for the coverage test to work. JSON files never enter V8 coverage at all (parsed, not compiled) — they are only detectable through the require cache of the reporting process. That covers ESM `import ... with { type: 'json' }` too: node's ESM JSON translator caches into the CommonJS cache so both loaders share one parsed copy, making JSON the one file type where in-process import detection works without coverage.

## Layout

- `lib/index.js` — the library, ESM. Exports a default function callable directly or with `new`. Public API: `ready` (promise resolving to the watched files — traversal is async via `fs/promises`, parallel per directory), `files` (populated once `ready` resolves, `null` before), and `untouched()` (deliberately **sync** so it works in `process.on('exit')` handlers, where async is impossible; returns `[]` if traversal hasn't finished).
- `lib/mocha.js` — mocha root hook plugin (`unnecessary/mocha`): `beforeAll` constructs and awaits `ready`, `afterAll` prints the report.
- `lib/lab.js` — @hapi/lab custom reporter (`unnecessary/lab`), a class because lab's reporter contract is newable with `start`/`test`/`end` methods; lab attaches `this.report(text)` after construction and awaits `end()`, so `end` awaits `ready` before reporting. Usage: `lab -r unnecessary/lab` (lab's `-o` is a file path — `-o stdout` writes a literal file named "stdout", omit it for process.stdout).
- `lib/report.js` — shared `loadOptions()` (reads the `unnecessary` field from the consumer's package.json; `filePattern` accepted as string, compiled case-insensitive) and `formatReport()` used by the mocha plugin, lab reporter, and cli. Inlined into each dist bundle by rollup.
- `bin/cli.js` — c8-style wrapper (`unnecessary <command>`): spawns the command with `NODE_V8_COVERAGE` set to a temp dir (reusing an inherited dir if already set), reports untouched files on exit rebased on the invoking directory (cmd+clickable), passes the exit code through. Coverage-only detection — the child's `require.cache` is invisible cross-process, so JSON files always need excluding here.
- `dist/main.cjs`, `dist/mocha.cjs` — rollup output, gitignored, built by `npm run build` (also via `prepare` and `pretest`). Never edit them. `mocha.cjs` externalizes `lib/index.js` and rewrites the import to `./main.cjs` (paths _function_ in rollup config — a plain paths object fails because rollup resolves relative externals to absolute ids).
- `rollup.config.js` — builds `lib/index.js` → `dist/main.cjs` (cjs, default export) and `lib/mocha.js` → `dist/mocha.cjs` (cjs, named exports).
- `test/*-test.js` — mocha tests, ESM, one file per area: `traverse-test.js` (tree walking and options), `untouched-test.js` (detection), `cli-test.js` (spawns `bin/cli.js`), `mocha-test.js` (root hooks). Tests import the package by name (`unnecessary`, `unnecessary/mocha` — self-reference through the exports map); only the fresh-module-instance tests use relative query-string imports (`../lib/index.js?uninitiated`), since query strings don't work on bare specifiers. The spec glob lives in `.mocharc.cjs`; new test files must match `test/*-test.js` and be added to the package.json `unnecessary.excludeFiles`.
- `test/data/arbitrary.{js,json}` — fixtures that are never loaded in the main test process (they should appear untouched there). `arbitrary.cjs` is required by one test to prove require-cache detection; `arbitrary.js` is imported by a spawned child process (with `NODE_V8_COVERAGE` pointing at a temp dir) to prove coverage-based detection.
- `.mocharc.cjs` — mocha config; dogfoods the root hook plugin via `require: ['./dist/mocha.cjs']` (which smoke-tests both builds, since `mocha.cjs` requires `main.cjs`). Expected report after a clean `npm test`: the three `test/data/arbitrary.*` files only (two under c8, where coverage sees `arbitrary.cjs`). New tooling/config/test files must be added to the package.json `unnecessary` field or they'll show up in the report.

## Commands

- `npm test` — builds `dist/`, runs mocha, then `eslint . --cache` via `posttest`.
- `npm run build` — rollup build of `dist/main.cjs` and `dist/mocha.cjs`.
- `npm run test:lcov` / `npm run cov:html` — c8 coverage.
- `npm run format` — prettier over the repo.
- Node: 20 (`.nvmrc`); `engines` >=20. CI matrix: 20/22/24/latest on ubuntu + windows (`.github/workflows/`).

## Conventions and constraints

- ESM source, modern-but-plain style: `const`, `function` expressions (no classes), prettier-formatted (140 print width, single quotes). Prettier owns formatting — `formatOnSave` is configured in `.vscode/`.
- Lint is eslint flat config (`eslint.config.js`). Note `space-before-function-paren` is set to `anonymous: 'always'` to match prettier's non-configurable output.
- Zero runtime dependencies. Keep it that way; devDependencies only (mocha, chai, eslint, prettier, rollup, c8).
- Windows support matters: paths are normalized to `/` separators (`relativePath()` in lib/index.js) and CI runs a windows job. Preserve that when touching path logic.

## Git

- Default branch is `default` (not master/main).
- Releases: push a `v*` tag → `.github/workflows/release.yaml` publishes to npm.
