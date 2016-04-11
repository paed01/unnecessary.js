'use strict';

var expect = require('chai').expect;
var Path = require('path');

require('../')();

describe('unnecessary', function() {
  describe('require', function() {
    it('traverses the project tree', function() {
      var unnecessary = require('../')();
      expect(unnecessary.files).to.have.length.above(0);
    });

    it('excludes node_modules and .git by default', function() {
      var unnecessary = require('../')();
      unnecessary.files.forEach(function(file) {
        expect(file, file).to.not.match(/^node_modules\//i);
        expect(file, file).to.not.match(/^\.git\//i);
      });
    });

    it('excludeDirs option excludes directory from project tree', function() {
      var unnecessary = require('../')({
        excludeDirs: ['test']
      });
      expect(unnecessary.files).to.have.length.above(0);
      unnecessary.files.forEach(function(file) {
        expect(file, file).to.not.match(/^test\//i);
      });
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
  });

  describe('#unused', function() {
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
  });
});
