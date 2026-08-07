import Path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { expect } from 'chai';

import Unnecessary from '../index.js';

const nodeRequire = createRequire(import.meta.url);
const testFilename = fileURLToPath(import.meta.url);

const pathSep = Path.sep;

Unnecessary();

describe('unnecessary', () => {
  afterEach(() => {
    Path.sep = pathSep;
  });

  describe('traverse', () => {
    it('traverses the project tree', () => {
      const unnecessary = Unnecessary();
      expect(unnecessary.files).to.have.length.above(0);
    });

    it('excludes node_modules and .git by default', () => {
      const unnecessary = Unnecessary();
      unnecessary.files.forEach((file) => {
        expect(file, file).to.not.include(Path.normalize(unnecessary.options.cwd + '/node_modules/'));
        expect(file, file).to.not.include(Path.normalize(unnecessary.options.cwd + '/.git/'));
      });
    });

    it('excludeDirs option excludes directory from project tree', () => {
      const unnecessary = Unnecessary({
        excludeDirs: ['test'],
      });
      expect(unnecessary.files).to.have.length.above(0);
      unnecessary.files.forEach((file) => {
        expect(file, file).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/'));
      });
    });

    it('excludeDirs option works with relative path', () => {
      const unnecessary = Unnecessary({
        excludeDirs: ['test/data'],
      });

      expect(unnecessary.files).to.have.length.above(0);
      expect(unnecessary.files).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.json'));
      expect(unnecessary.files).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.js'));
    });

    it('excludeDirs option is trimmed of trailing slash (/)', () => {
      const unnecessary = Unnecessary({
        excludeDirs: ['test/data/'],
      });

      expect(unnecessary.files).to.have.length.above(0);
      expect(unnecessary.files).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.json'));
      expect(unnecessary.files).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.js'));
    });

    it('excludeFiles option works with relative path', () => {
      const unnecessary = Unnecessary({
        excludeFiles: ['test/data/arbitrary.json'],
      });

      expect(unnecessary.files).to.have.length.above(0);
      expect(unnecessary.files).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.json'));
      expect(unnecessary.files).to.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.js'));
    });

    it('default filePattern option includes js, cjs, mjs, and json extensions', () => {
      const unnecessary = Unnecessary();

      unnecessary.files.forEach((file) => {
        expect(file, file).to.match(/\.([cm]?js|json)$/i);
      });

      const json = unnecessary.files.filter((file) => {
        return /\.json$/i.test(file);
      });
      const js = unnecessary.files.filter((file) => {
        return /\.js$/i.test(file);
      });
      const cjs = unnecessary.files.filter((file) => {
        return /\.cjs$/i.test(file);
      });

      expect(json).to.have.length.above(0);
      expect(js).to.have.length.above(0);
      expect(cjs).to.have.length.above(0);
    });

    it('filePattern option includes filenames that match', () => {
      const pattern = /\.prettier.*/i;
      const unnecessary = Unnecessary({
        filePattern: pattern,
      });
      expect(unnecessary.files).to.have.length.above(0);
      unnecessary.files.forEach((file) => {
        expect(file, file).to.match(pattern);
      });
    });

    it('cwd option traverses directory only', () => {
      const unnecessary = Unnecessary({
        cwd: Path.resolve('./test'),
      });

      expect(unnecessary.files).to.have.length.above(0);
      unnecessary.files.forEach((file) => {
        expect(file, file).to.include(unnecessary.options.cwd);
      });
    });

    it('cwd option as file traverses nothing', () => {
      const unnecessary = Unnecessary({
        cwd: testFilename,
      });

      expect(unnecessary.files).to.deep.equal([testFilename]);
    });

    it('cwd option as file included in excludeFiles returns empty array', () => {
      const unnecessary = Unnecessary({
        cwd: Path.resolve('./package.json'),
      });

      expect(unnecessary.files).to.have.length(0);
    });

    describe('instance', () => {
      it('can be used with new', () => {
        const unnecessary = new Unnecessary({
          filePattern: /\.js$/i,
        });
        expect(unnecessary.files).to.have.length.above(0);
        unnecessary.files.forEach((file) => {
          expect(file, file).to.match(/\.js$/i);
        });
      });

      it('keeps instance variables', () => {
        const unnecessaryJs = new Unnecessary({
          filePattern: /\.js$/i,
        });
        const unnecessaryJson = new Unnecessary({
          filePattern: /\.json$/i,
        });
        expect(unnecessaryJs.files).to.have.length.above(0);
        unnecessaryJs.files.forEach((file) => {
          expect(file, file).to.match(/\.js$/i);
        });
        expect(unnecessaryJson.files).to.have.length.above(0);
        unnecessaryJson.files.forEach((file) => {
          expect(file, file).to.match(/\.json$/i);
        });
      });
    });
  });

  describe('#untouched', () => {
    it('returns nothing if ctor not called', async () => {
      const { default: Uninitiated } = await import('../index.js?uninitiated');
      expect(Uninitiated.untouched()).to.have.length(0);
    });

    it('compares project tree with require.cache', () => {
      const unnecessary = Unnecessary();
      const untouched = unnecessary.untouched();
      expect(untouched).to.have.length.above(0);
    });

    it('returns list with files relative to cwd', () => {
      const unnecessary = Unnecessary();
      const untouched = unnecessary.untouched();

      expect(untouched).to.include('test/data/arbitrary.json');
      expect(untouched).to.include('test/data/arbitrary.js');
    });

    it('works with statics of imported module', () => {
      const untouched = Unnecessary.untouched();

      expect(untouched).to.have.length.above(0);
      expect(untouched).to.include('test/data/arbitrary.json');
      expect(untouched).to.include('test/data/arbitrary.js');
    });

    it('untouched files are always reported with path separator /', () => {
      Path.sep = '\\';
      const untouched = Unnecessary.untouched();

      expect(untouched).to.have.length.above(0);
      expect(untouched).to.include('test/data/arbitrary.json');
      expect(untouched).to.include('test/data/arbitrary.js');
    });

    it('files loaded with require are considered touched', () => {
      nodeRequire('./data/arbitrary.cjs');

      const untouched = Unnecessary().untouched();
      expect(untouched).to.not.include('test/data/arbitrary.cjs');
      expect(untouched).to.include('test/data/arbitrary.js');
      expect(untouched).to.include('test/data/arbitrary.json');

      delete nodeRequire.cache[nodeRequire.resolve('./data/arbitrary.cjs')];
    });

    describe('instance', () => {
      it('returns instance specific files', () => {
        const unnecessaryJs = new Unnecessary({
          filePattern: /\.js$/i,
        });
        const unnecessaryJson = new Unnecessary({
          filePattern: /\.json$/i,
          cwd: Path.resolve('./test'),
        });

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
});
