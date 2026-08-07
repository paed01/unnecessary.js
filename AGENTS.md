# AGENTS.md

## What this is

`unnecessary` — a small, zero-dependency Node.js library that finds files never `require()`d during a test run. It walks the project tree, collects `.js`/`.cjs`/`.mjs`/`.json` files, and compares them against the CommonJS require cache when `untouched()` is called. Lightweight "coverage" for spotting dead files.

The entire library is `index.js` (~120 lines). It is published as a dual package: ESM source (`index.js`) plus a rollup-built CommonJS bundle (`main.cjs`).

## Key constraint: require cache only

`untouched()` detects touched files via `require.cache` (accessed with `createRequire` from the ESM source). Files loaded with ESM `import` live in node's internal ESM module map, which is **not exposed** — so import-loaded files always look untouched. That's why `.mocharc.cjs` excludes the repo's own ESM files (`index.js`, `test/index.js`) from the exit report. Keep this in mind for any feature work; there is currently no public API to inspect the ESM cache (`module.registerHooks` in node >=22.15 could track imports, but this repo targets node 20).

## Layout

- `index.js` — the whole module, ESM. Exports a default function callable directly or with `new`. Public API: `files` (watched files) and `untouched()`.
- `main.cjs` — rollup output, gitignored, built by `npm run build` (also via `prepare` and `pretest`). Never edit it.
- `rollup.config.js` — builds `index.js` → `main.cjs` (cjs, default export).
- `test/index.js` — mocha tests, ESM. Uses `createRequire` where tests need to populate/inspect the require cache, and a query-string dynamic import (`../index.js?uninitiated`) to get a fresh module instance.
- `test/data/arbitrary.{js,json}` — fixtures that are intentionally never loaded (they should appear untouched). `arbitrary.cjs` is required by one test to prove touched files are detected.
- `.mocharc.cjs` — doubles as mocha config **and** a live demo: it requires `main.cjs` (smoke-testing the build) and reports untouched files on process exit. Expected report after a clean run: the three `test/data/arbitrary.*` files only. New tooling/config files must be excluded here (`excludeDirs`/`excludeFiles`) or they'll show up in the report.

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
