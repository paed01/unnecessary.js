import Path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';

import { expect } from 'chai';

import Unnecessary from '../index.js';

const nodeRequire = createRequire(import.meta.url);

const pathSep = Path.sep;

describe('#untouched', () => {
  afterEach(() => {
    Path.sep = pathSep;
  });

  it('returns nothing if ctor not called', async () => {
    const { default: Uninitiated } = await import('../index.js?uninitiated');
    expect(Uninitiated.untouched()).to.have.length(0);
  });

  it('returns nothing before traversal has completed', () => {
    const unnecessary = new Unnecessary();
    expect(unnecessary.untouched()).to.have.length(0);
  });

  it('compares project tree with require.cache', async () => {
    const unnecessary = Unnecessary();
    await unnecessary.ready;
    const untouched = unnecessary.untouched();
    expect(untouched).to.have.length.above(0);
  });

  it('returns list with files relative to cwd', async () => {
    const unnecessary = Unnecessary();
    await unnecessary.ready;
    const untouched = unnecessary.untouched();

    expect(untouched).to.include('test/data/arbitrary.json');
    expect(untouched).to.include('test/data/arbitrary.js');
  });

  it('works with statics of imported module', async () => {
    await Unnecessary().ready;
    const untouched = Unnecessary.untouched();

    expect(untouched).to.have.length.above(0);
    expect(untouched).to.include('test/data/arbitrary.json');
    expect(untouched).to.include('test/data/arbitrary.js');
  });

  it('untouched files are always reported with path separator /', async () => {
    await Unnecessary().ready;
    Path.sep = '\\';
    const untouched = Unnecessary.untouched();

    expect(untouched).to.have.length.above(0);
    expect(untouched).to.include('test/data/arbitrary.json');
    expect(untouched).to.include('test/data/arbitrary.js');
  });

  it('files loaded with require are considered touched', async () => {
    nodeRequire('./data/arbitrary.cjs');

    const unnecessary = Unnecessary();
    await unnecessary.ready;
    const untouched = unnecessary.untouched();
    expect(untouched).to.not.include('test/data/arbitrary.cjs');
    expect(untouched).to.include('test/data/arbitrary.js');
    expect(untouched).to.include('test/data/arbitrary.json');

    delete nodeRequire.cache[nodeRequire.resolve('./data/arbitrary.cjs')];
  });

  it('files loaded with import are considered touched when NODE_V8_COVERAGE is set', () => {
    const coverageDir = mkdtempSync(Path.join(tmpdir(), 'unnecessary-v8-coverage-'));
    try {
      const script = [
        "import './test/data/arbitrary.js';",
        "import Unnecessary from './index.js';",
        'const unnecessary = Unnecessary();',
        'await unnecessary.ready;',
        'console.log(JSON.stringify(unnecessary.untouched()));',
      ].join('\n');

      const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
        cwd: Path.resolve('.'),
        env: { ...process.env, NODE_V8_COVERAGE: coverageDir },
        encoding: 'utf8',
      });

      const untouched = JSON.parse(stdout.trim().split('\n').pop());
      expect(untouched).to.not.include('test/data/arbitrary.js');
      expect(untouched).to.include('test/data/arbitrary.json');
    } finally {
      rmSync(coverageDir, { recursive: true, force: true });
    }
  }).timeout(5000);

  describe('instance', () => {
    it('returns instance specific files', async () => {
      const unnecessaryJs = new Unnecessary({
        filePattern: /\.js$/i,
      });
      const unnecessaryJson = new Unnecessary({
        filePattern: /\.json$/i,
        cwd: Path.resolve('./test'),
      });
      await Promise.all([unnecessaryJs.ready, unnecessaryJson.ready]);

      const untouchedJs = unnecessaryJs.untouched();
      expect(untouchedJs).to.have.length.above(0);
      expect(untouchedJs).to.not.include('test/data/arbitrary.json');
      expect(untouchedJs).to.include('test/data/arbitrary.js');

      const untouchedJson = unnecessaryJson.untouched();
      expect(untouchedJson).to.have.length.above(0);
      expect(untouchedJson).to.include('data/arbitrary.json');
      expect(untouchedJson).to.not.include('data/arbitrary.js');
    });
  });
});
