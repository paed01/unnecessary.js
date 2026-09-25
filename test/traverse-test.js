import Path from 'node:path';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { expect } from 'chai';

import Unnecessary from 'unnecessary';

const testFilename = fileURLToPath(import.meta.url);

describe('traverse', () => {
  it('traverses the project tree', async () => {
    const files = await Unnecessary().ready;
    expect(files).to.have.length.above(0);
  });

  it('resolves files property when ready', async () => {
    const unnecessary = Unnecessary();
    expect(unnecessary.files).to.be.null;
    const files = await unnecessary.ready;
    expect(unnecessary.files).to.equal(files);
  });

  it('excludes node_modules and .git by default', async () => {
    const unnecessary = Unnecessary();
    const files = await unnecessary.ready;
    files.forEach((file) => {
      expect(file, file).to.not.include(Path.normalize(unnecessary.options.cwd + '/node_modules/'));
      expect(file, file).to.not.include(Path.normalize(unnecessary.options.cwd + '/.git/'));
    });
  });

  it('excludeDirs option excludes directory from project tree', async () => {
    const unnecessary = Unnecessary({
      excludeDirs: ['test'],
    });
    const files = await unnecessary.ready;
    expect(files).to.have.length.above(0);
    files.forEach((file) => {
      expect(file, file).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/'));
    });
  });

  it('excludeDirs option works with relative path', async () => {
    const unnecessary = Unnecessary({
      excludeDirs: ['test/data'],
    });

    const files = await unnecessary.ready;
    expect(files).to.have.length.above(0);
    expect(files).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.json'));
    expect(files).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.js'));
  });

  it('excludeDirs option is trimmed of trailing slash (/)', async () => {
    const unnecessary = Unnecessary({
      excludeDirs: ['test/data/'],
    });

    const files = await unnecessary.ready;
    expect(files).to.have.length.above(0);
    expect(files).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.json'));
    expect(files).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.js'));
  });

  it('excludeFiles option works with relative path', async () => {
    const unnecessary = Unnecessary({
      excludeFiles: ['test/data/arbitrary.json'],
    });

    const files = await unnecessary.ready;
    expect(files).to.have.length.above(0);
    expect(files).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.json'));
    expect(files).to.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.js'));
  });

  const globSupported = typeof Path.matchesGlob === 'function';
  const itGlob = globSupported ? it : it.skip;
  const itNoGlob = globSupported ? it.skip : it;

  itNoGlob('excludeDirs and excludeFiles glob patterns are ignored if unsupported by node', async () => {
    const unnecessary = Unnecessary({
      excludeDirs: ['**/data'],
      excludeFiles: ['test/**/*.js'],
    });

    const files = await unnecessary.ready;
    expect(files).to.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.js'));
    expect(files).to.include(Path.normalize(unnecessary.options.cwd + '/test/traverse-test.js'));
  });

  itGlob('excludeDirs option accepts glob patterns', async () => {
    const unnecessary = Unnecessary({
      excludeDirs: ['**/data'],
    });

    const files = await unnecessary.ready;
    expect(files).to.have.length.above(0);
    expect(files).to.include(Path.normalize(unnecessary.options.cwd + '/test/traverse-test.js'));
    files.forEach((file) => {
      expect(file, file).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/data/'));
    });
  });

  itGlob('excludeFiles option accepts glob patterns', async () => {
    const unnecessary = Unnecessary({
      excludeFiles: ['test/**/*.json', '**/arbitrary.cjs'],
    });

    const files = await unnecessary.ready;
    expect(files).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.json'));
    expect(files).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.cjs'));
    expect(files).to.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.js'));
    expect(files).to.include(Path.normalize(unnecessary.options.cwd + '/package-lock.json'));
  });

  it('default filePattern option includes js, cjs, mjs, and json extensions', async () => {
    const files = await Unnecessary().ready;

    files.forEach((file) => {
      expect(file, file).to.match(/\.([cm]?js|json)$/i);
    });

    const json = files.filter((file) => {
      return /\.json$/i.test(file);
    });
    const js = files.filter((file) => {
      return /\.js$/i.test(file);
    });
    const cjs = files.filter((file) => {
      return /\.cjs$/i.test(file);
    });

    expect(json).to.have.length.above(0);
    expect(js).to.have.length.above(0);
    expect(cjs).to.have.length.above(0);
  });

  it('filePattern option includes filenames that match', async () => {
    const pattern = /\.prettier.*/i;
    const files = await Unnecessary({
      filePattern: pattern,
    }).ready;
    expect(files).to.have.length.above(0);
    files.forEach((file) => {
      expect(file, file).to.match(pattern);
    });
  });

  it('cwd option traverses directory only', async () => {
    const unnecessary = Unnecessary({
      cwd: Path.resolve('./test'),
    });

    const files = await unnecessary.ready;
    expect(files).to.have.length.above(0);
    files.forEach((file) => {
      expect(file, file).to.include(unnecessary.options.cwd);
    });
  });

  it('cwd option as file traverses nothing', async () => {
    const files = await Unnecessary({
      cwd: testFilename,
    }).ready;

    expect(files).to.deep.equal([testFilename]);
  });

  it('cwd option as file included in excludeFiles returns empty array', async () => {
    const files = await Unnecessary({
      cwd: Path.resolve('./package.json'),
    }).ready;

    expect(files).to.have.length(0);
  });

  // creating symlinks on windows requires developer mode or elevation
  const itPosix = process.platform === 'win32' ? it.skip : it;

  itPosix('follows symlinks to their real path and ignores broken ones', async () => {
    const dir = realpathSync(mkdtempSync(Path.join(tmpdir(), 'unnecessary-symlink-')));
    try {
      mkdirSync(Path.join(dir, 'target-dir'));
      writeFileSync(Path.join(dir, 'target-dir', 'inside.js'), 'export default 1;\n');
      writeFileSync(Path.join(dir, 'target.js'), 'export default 1;\n');
      symlinkSync(Path.join(dir, 'target-dir'), Path.join(dir, 'link-dir'));
      symlinkSync(Path.join(dir, 'target.js'), Path.join(dir, 'link.js'));
      symlinkSync(Path.join(dir, 'missing.js'), Path.join(dir, 'broken.js'));

      const files = await Unnecessary({ cwd: dir }).ready;

      expect(files.sort()).to.deep.equal([Path.join(dir, 'target-dir', 'inside.js'), Path.join(dir, 'target.js')]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  itPosix('traverses symlink loops once', async () => {
    const dir = realpathSync(mkdtempSync(Path.join(tmpdir(), 'unnecessary-symlink-')));
    try {
      mkdirSync(Path.join(dir, 'a'));
      writeFileSync(Path.join(dir, 'a', 'inside.js'), 'export default 1;\n');
      symlinkSync(dir, Path.join(dir, 'a', 'up'));
      symlinkSync(Path.join(dir, 'a'), Path.join(dir, 'a', 'self'));
      symlinkSync(dir, Path.join(dir, 'root'));

      const files = await Unnecessary({ cwd: dir }).ready;

      expect(files).to.deep.equal([Path.join(dir, 'a', 'inside.js')]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  itPosix('follows symlinks out of cwd', async () => {
    const dir = realpathSync(mkdtempSync(Path.join(tmpdir(), 'unnecessary-symlink-')));
    try {
      mkdirSync(Path.join(dir, 'project'));
      mkdirSync(Path.join(dir, 'shared'));
      writeFileSync(Path.join(dir, 'shared', 'outside.js'), 'export default 1;\n');
      symlinkSync(Path.join(dir, 'shared'), Path.join(dir, 'project', 'shared'));

      const files = await Unnecessary({ cwd: Path.join(dir, 'project') }).ready;

      expect(files).to.deep.equal([Path.join(dir, 'shared', 'outside.js')]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  itPosix('resolves symlinked cwd', async () => {
    const dir = realpathSync(mkdtempSync(Path.join(tmpdir(), 'unnecessary-symlink-')));
    try {
      mkdirSync(Path.join(dir, 'project'));
      writeFileSync(Path.join(dir, 'project', 'inside.js'), 'export default 1;\n');
      symlinkSync(Path.join(dir, 'project'), Path.join(dir, 'link'));

      const unnecessary = Unnecessary({ cwd: Path.join(dir, 'link') });

      expect(unnecessary.options.cwd).to.equal(Path.join(dir, 'project'));
      expect(await unnecessary.ready).to.deep.equal([Path.join(dir, 'project', 'inside.js')]);
      expect(unnecessary.untouched()).to.deep.equal(['inside.js']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  describe('instance', () => {
    it('can be used with new', async () => {
      const files = await new Unnecessary({
        filePattern: /\.js$/i,
      }).ready;
      expect(files).to.have.length.above(0);
      files.forEach((file) => {
        expect(file, file).to.match(/\.js$/i);
      });
    });

    it('keeps instance variables', async () => {
      const unnecessaryJs = new Unnecessary({
        filePattern: /\.js$/i,
      });
      const unnecessaryJson = new Unnecessary({
        filePattern: /\.json$/i,
      });
      const [jsFiles, jsonFiles] = await Promise.all([unnecessaryJs.ready, unnecessaryJson.ready]);
      expect(jsFiles).to.have.length.above(0);
      jsFiles.forEach((file) => {
        expect(file, file).to.match(/\.js$/i);
      });
      expect(jsonFiles).to.have.length.above(0);
      jsonFiles.forEach((file) => {
        expect(file, file).to.match(/\.json$/i);
      });
    });
  });
});
