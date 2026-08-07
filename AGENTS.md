# AGENTS.md

## What this is

`unnecessary` — a small, zero-dependency Node.js library that finds files never `require()`d during a test run. It walks the project tree, collects `.js`/`.cjs`/`.mjs`/`.json` files, and compares them against the CommonJS require cache when `untouched()` is called. Lightweight "coverage" for spotting dead files.

The entire library is `index.js` (~120 lines). It is published as a dual package: ESM source (`index.js`) plus a rollup-built CommonJS bundle (`main.cjs`).

## Key constraint: how "touched" is detected

`untouched()` detects touched files two ways:

1. `require.cache` (accessed with `createRequire` from the ESM source) — covers `require()`d files.
2. V8 coverage reports, but only when `NODE_V8_COVERAGE` is set (c8 sets it automatically): `coveredFiles()` in index.js calls `v8.takeCoverage()` to flush reports, then collects script URLs from the coverage JSON. This is the only way ESM `import`s are detected — node's internal ESM module map is not exposed (`module.registerHooks` in node >=22.15 could track imports, but this repo targets node 20).

Gotcha: when coverage is active, node **re-injects `NODE_V8_COVERAGE` into spawned children's env even if the caller deleted it** — only an explicit override redirects it. The cli tests rely on this (they override with a throwaway dir); a plain `delete env.NODE_V8_COVERAGE` silently pollutes the parent's coverage dir under c8.

Consequences: under plain `npm test` (no coverage), import-loaded files look untouched — that's why `.mocharc.cjs` excludes the repo's own ESM files (`index.js`, `test/index.js`) from the exit report, and why the report legitimately differs between `npm test` (3 fixtures listed) and `npm run test:lcov` (2 — coverage sees the `require()`d-then-cache-evicted `arbitrary.cjs`). Files with no executable code never appear in V8 coverage, so `test/data/arbitrary.js` must keep at least one statement for the coverage test to work.

## Layout

- `index.js` — the whole module, ESM. Exports a default function callable directly or with `new`. Public API: `ready` (promise resolving to the watched files — traversal is async via `fs/promises`, parallel per directory), `files` (populated once `ready` resolves, `null` before), and `untouched()` (deliberately **sync** so it works in `process.on('exit')` handlers, where async is impossible; returns `[]` if traversal hasn't finished).
- `bin/cli.js` — c8-style wrapper (`unnecessary <command>`): spawns the command with `NODE_V8_COVERAGE` set to a temp dir (reusing an inherited dir if already set), reports untouched files on exit, passes the exit code through. Coverage-only detection — the child's `require.cache` is invisible cross-process, so JSON files (which never enter V8 coverage) always need excluding here.
- `mocha.js` — mocha root hook plugin (`unnecessary/mocha` subpath export): `beforeAll` constructs and awaits `ready`, `afterAll` prints the report. Options come from the `unnecessary` field in the consumer's package.json (`filePattern` accepted as string, compiled case-insensitive).
- `main.cjs`, `mocha.cjs` — rollup output, gitignored, built by `npm run build` (also via `prepare` and `pretest`). Never edit them. `mocha.cjs` externalizes `index.js` and rewrites the import to `main.cjs` (paths function in rollup config — a plain paths object fails because rollup resolves relative externals to absolute ids).
- `rollup.config.js` — builds `index.js` → `main.cjs` (cjs, default export) and `mocha.js` → `mocha.cjs` (cjs, named exports).
- `test/*-test.js` — mocha tests, ESM, one file per area: `traverse-test.js` (tree walking and options), `untouched-test.js` (detection; uses `createRequire` to populate/inspect the require cache and a query-string dynamic import `../index.js?uninitiated` to get a fresh module instance), `cli-test.js` (spawns `bin/cli.js`). The spec glob lives in `.mocharc.cjs`; new test files must match `test/*-test.js` and be added to its exit-report `excludeFiles`.
- `test/data/arbitrary.{js,json}` — fixtures that are never loaded in the main test process (they should appear untouched there). `arbitrary.cjs` is required by one test to prove require-cache detection; `arbitrary.js` is imported by a spawned child process (with `NODE_V8_COVERAGE` pointing at a temp dir) to prove coverage-based detection.
- `.mocharc.cjs` — mocha config; dogfoods the root hook plugin via `require: ['./mocha.cjs']` (which smoke-tests both builds, since `mocha.cjs` requires `main.cjs`). The plugin reads exclusions from the `unnecessary` field in this repo's package.json. Expected report after a clean `npm test`: the three `test/data/arbitrary.*` files only (two under c8, where coverage sees `arbitrary.cjs`). New tooling/config/test files must be added to that package.json field or they'll show up in the report.

## Commands

- `npm test` — builds `main.cjs`, runs mocha, then `eslint . --cache` via `posttest`.
- `npm run build` — rollup build of `main.cjs`.
- `npm run test:lcov` / `npm run cov:html` — c8 coverage.
- `npm run format` — prettier over the repo.
- Node: 20 (`.nvmrc`); `engines` >=20. CI matrix: 20/22/24/latest on ubuntu + windows (`.github/workflows/`).

## Conventions and constraints

- ESM source, modern-but-plain style: `const`, `function` expressions (no classes), prettier-formatted (140 print width, single quotes). Prettier owns formatting — `formatOnSave` is configured in `.vscode/`.
- Lint is eslint 9 flat config (`eslint.config.js`). Note `space-before-function-paren` is set to `anonymous: 'always'` to match prettier's non-configurable output.
- Zero runtime dependencies. Keep it that way; devDependencies only (mocha, chai, eslint, prettier, rollup, c8).
- Windows support matters: paths are normalized to `/` separators (`relativePath()` in index.js) and CI runs a windows job. Preserve that when touching path logic.

## Git

- Default branch is `default` (not master/main).
- Releases: push a `v*` tag → `.github/workflows/release.yaml` publishes to npm.
