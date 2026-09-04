# Changelog

## 3.1.0 - 2026-09-04

### Added

- Declares an optional peer dependency on mocha `^11 || ^12`; the root hook plugin is tested against both
- Node test runner custom reporter `unnecessary/node-test`, use with `--test-reporter unnecessary/node-test`
- TypeScript type definitions for `unnecessary`, `unnecessary/mocha`, `unnecessary/lab`, and `unnecessary/node-test`

## 3.0.0 - 2026-08-07

### Breaking

- Requires node >= 20
- Published as a dual package: ESM with a CommonJS bundle
- Project tree traversal is asynchronous: await new `ready` promise, `files` is `null` until it resolves
- Default file pattern now also matches `.cjs` and `.mjs`

### Added

- Files loaded with ESM `import` are detected as touched when running under `NODE_V8_COVERAGE`, e.g. with c8
- `unnecessary <command>` cli that runs any test command with coverage enabled and reports potentially unused files, c8 style
- Mocha root hook plugin `unnecessary/mocha`, configured through an `unnecessary` field in package.json
- @hapi/lab reporter `unnecessary/lab`
