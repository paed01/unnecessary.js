'use strict';

var expect = require('chai').expect;
var Path = require('path');

var pathSep = Path.sep;

require('../')();

describe('unnecessary', function() {
  afterEach(function() {
    Path.sep = pathSep;
  });

  describe('require', function() {
    it('traverses the project tree', function() {
      var unnecessary = require('../')();
      expect(unnecessary.files).to.have.length.above(0);
    });

    it('excludes node_modules and .git by default', function() {
      var unnecessary = require('../')();
      unnecessary.files.forEach(function(file) {
        expect(file, file).to.not.include(Path.normalize(unnecessary.options.cwd + '/node_modules/'));
        expect(file, file).to.not.include(Path.normalize(unnecessary.options.cwd + '/.git/'));
      });
    });

    it('excludeDirs option excludes directory from project tree', function() {
      var unnecessary = require('../')({
        excludeDirs: ['test']
      });
      expect(unnecessary.files).to.have.length.above(0);
      unnecessary.files.forEach(function(file) {
        expect(file, file).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/'));
      });
    });

    it('excludeDirs option works with relative path', function() {
      var unnecessary = require('../')({
        excludeDirs: ['test/data']
      });

      expect(unnecessary.files).to.have.length.above(0);
      expect(unnecessary.files).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.json'));
      expect(unnecessary.files).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.js'));
    });

    it('excludeDirs option is trimmed of trailing slash (/)', function() {
      var unnecessary = require('../')({
        excludeDirs: ['test/data/']
      });

      expect(unnecessary.files).to.have.length.above(0);
      expect(unnecessary.files).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.json'));
      expect(unnecessary.files).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.js'));
    });

    it('excludeFiles option works with relative path', function() {
      var unnecessary = require('../')({
        excludeFiles: ['test/data/arbitrary.json']
      });

      expect(unnecessary.files).to.have.length.above(0);
      expect(unnecessary.files).to.not.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.json'));
      expect(unnecessary.files).to.include(Path.normalize(unnecessary.options.cwd + '/test/data/arbitrary.js'));
    });

    it('default filePattern option includes js and json extensions', function() {
      var unnecessary = require('../')();

      unnecessary.files.forEach(function(file) {
        expect(file, file).to.match(/\.(js|json)$/i);
      });

      var json = unnecessary.files.filter(function(file) {
        return /\.json$/i.test(file);
      });
      var js = unnecessary.files.filter(function(file) {
        return /\.js$/i.test(file);
      });

      expect(json).to.have.length.above(0);
      expect(js).to.have.length.above(0);
    });

    it('filePattern option includes filenames that match', function() {
      var pattern = /\.eslint.*/i;
      var unnecessary = require('../')({
        filePattern: pattern
      });
      expect(unnecessary.files).to.have.length.above(0);
      unnecessary.files.forEach(function(file) {
        expect(file, file).to.match(pattern);
      });
    });

    it('cwd option traverses directory only', function() {
      var unnecessary = require('../')({
        cwd: Path.resolve('./test')
      });

      expect(unnecessary.files).to.have.length.above(0);
      unnecessary.files.forEach(function(file) {
        expect(file, file).to.include(unnecessary.options.cwd);
      });
    });

    it('cwd option as file traverses nothing', function() {
      var unnecessary = require('../')({
        cwd: __filename
      });

      expect(unnecessary.files).to.deep.equal([__filename]);
    });

    it('cwd option as file included in excludeFiles returns empty array', function() {
      var unnecessary = require('../')({
        cwd: Path.resolve('./package.json')
      });

      expect(unnecessary.files).to.have.length(0);
    });

    describe('instance', function() {
      var Unnecessary = require('../');

      it('can be used with new', function() {
        var unnecessary = new Unnecessary({
          filePattern: /\.js$/i
        });
        expect(unnecessary.files).to.have.length.above(0);
        unnecessary.files.forEach(function(file) {
          expect(file, file).to.match(/\.(js|json)$/i);
        });
      });

      it('keeps instance variables', function() {
        var unnecessaryJs = new Unnecessary({
          filePattern: /\.js$/i
        });
        var unnecessaryJson = new Unnecessary({
          filePattern: /\.json$/i
        });
        expect(unnecessaryJs.files).to.have.length.above(0);
        unnecessaryJs.files.forEach(function(file) {
          expect(file, file).to.match(/\.js$/i);
        });
        expect(unnecessaryJson.files).to.have.length.above(0);
        unnecessaryJson.files.forEach(function(file) {
          expect(file, file).to.match(/\.json$/i);
        });
      });
    });
  });

  describe('#untouched', function() {
    it('returns nothing if ctor not called', function() {
      delete require.cache[require.resolve('../')];
      var untouched = require('../').untouched();
      expect(untouched).to.have.length(0);
    });

    it('compares project tree with require.cache', function() {
      var unnecessary = require('../')();
      var untouched = unnecessary.untouched();
      expect(untouched).to.have.length.above(0);
    });

    it('returns list with files relative to cwd', function() {
      var unnecessary = require('../')();
      var untouched = unnecessary.untouched();

      expect(untouched).to.include('test/data/arbitrary.json');
      expect(untouched).to.include('test/data/arbitrary.js');
    });

    it('works with require cached instance of module', function() {
      var untouched = require('../').untouched();

      expect(untouched).to.have.length.above(0);
      expect(untouched).to.include('test/data/arbitrary.json');
      expect(untouched).to.include('test/data/arbitrary.js');
    });

    it('untouched files are always reported with path separator /', function() {
      Path.sep = '\\';
      var untouched = require('../').untouched();

      expect(untouched).to.have.length.above(0);
      expect(untouched).to.include('test/data/arbitrary.json');
      expect(untouched).to.include('test/data/arbitrary.js');
    });

    describe('instance', function() {
      var Unnecessary = require('../');

      it('returns instance specific files', function() {
        var unnecessaryJs = new Unnecessary({
          filePattern: /\.js$/i
        });
        var unnecessaryJson = new Unnecessary({
          filePattern: /\.json$/i,
          cwd: Path.resolve('./test')
        });

        var untouchedJs = unnecessaryJs.untouched();
        expect(untouchedJs).to.have.length.above(0);
        expect(untouchedJs).to.not.include('test/data/arbitrary.json');
        expect(untouchedJs).to.include('test/data/arbitrary.js');

        var untouchedJson = unnecessaryJson.untouched();
        expect(untouchedJson).to.have.length.above(0);
        expect(untouchedJson).to.include('data/arbitrary.json');
        expect(untouchedJson).to.not.include('data/arbitrary.js');
      });
    });
  });
});
