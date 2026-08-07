import Path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

import { expect } from 'chai';

import Unnecessary from 'unnecessary';

import data from './data/data.json' with { type: 'json' };

const nodeRequire = createRequire(import.meta.url);

const pathSep = Path.sep;

describe('#untouched', () => {
  afterEach(() => {
    Path.sep = pathSep;
  });

  it('just check imported json', () => {
    expect(data).to.deep.equal({ foo: 'bar' });
  });

  it('returns nothing if ctor not called', async () => {
    const { default: Uninitiated } = await import('../lib/index.js?uninitiated');
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
        "import Unnecessary from 'unnecessary';",
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

  it('detects through require cache only when NODE_V8_COVERAGE is not set', async () => {
    const unnecessary = Unnecessary();
    await unnecessary.ready;

    const original = process.env.NODE_V8_COVERAGE;
    delete process.env.NODE_V8_COVERAGE;
    try {
      const untouched = unnecessary.untouched();
      expect(untouched).to.include('test/data/arbitrary.json');
      expect(untouched).to.include('test/data/arbitrary.js');
    } finally {
      if (original !== undefined) process.env.NODE_V8_COVERAGE = original;
    }
  });

  it('ignores a NODE_V8_COVERAGE dir that does not exist', async () => {
    const unnecessary = Unnecessary();
    await unnecessary.ready;

    const original = process.env.NODE_V8_COVERAGE;
    process.env.NODE_V8_COVERAGE = Path.join(tmpdir(), 'unnecessary-does-not-exist');
    try {
      const untouched = unnecessary.untouched();
      expect(untouched).to.include('test/data/arbitrary.json');
      expect(untouched).to.include('test/data/arbitrary.js');
    } finally {
      if (original === undefined) delete process.env.NODE_V8_COVERAGE;
      else process.env.NODE_V8_COVERAGE = original;
    }
  });

  it('skips unreadable coverage reports and honors valid ones', async () => {
    const unnecessary = Unnecessary();
    await unnecessary.ready;

    const coverageDir = mkdtempSync(Path.join(tmpdir(), 'unnecessary-reports-'));
    const original = process.env.NODE_V8_COVERAGE;
    try {
      writeFileSync(Path.join(coverageDir, 'coverage-truncated.json'), '{"result": [{"url"');
      writeFileSync(Path.join(coverageDir, 'coverage-noresult.json'), JSON.stringify({ result: 'not an array' }));
      writeFileSync(Path.join(coverageDir, 'notes.txt'), 'no coverage report');
      writeFileSync(
        Path.join(coverageDir, 'coverage-good.json'),
        JSON.stringify({
          result: [
            { url: pathToFileURL(Path.resolve('test/data/arbitrary.js')).href },
            { url: Path.resolve('test/data/arbitrary.cjs') },
            { url: 42 },
            { url: 'node:internal/bootstrap' },
          ],
        }),
      );

      process.env.NODE_V8_COVERAGE = coverageDir;
      const untouched = unnecessary.untouched();
      expect(untouched).to.not.include('test/data/arbitrary.js');
      expect(untouched).to.not.include('test/data/arbitrary.cjs');
      expect(untouched).to.include('test/data/arbitrary.json');
    } finally {
      if (original === undefined) delete process.env.NODE_V8_COVERAGE;
      else process.env.NODE_V8_COVERAGE = original;
      rmSync(coverageDir, { recursive: true, force: true });
    }
  });

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
